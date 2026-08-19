/**
 * Document to AI Markdown Ingestion Engine
 *
 * Implements client-side document conversion inspired by MDFlux / MarkItDown.
 * Converts structured and raw file formats (CSV, TSV, JSON, XML, HTML, Code, Logs)
 * into clean, token-efficient Markdown tables and formatted text blocks.
 */

import { FS, LocalFile } from '@/lib/fs';
import { episodicMemory } from '@/lib/ai-memory/episodic-memory';

export class DocParser {
  /**
   * Converts a given text/tabular file content into clean AI-ready Markdown
   */
  static toMarkdown(content: string, filename: string): string {
    const ext = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : '';

    switch (ext) {
      case 'csv':
      case 'tsv':
        return DocParser.csvToMarkdown(content, ext === 'tsv' ? '\t' : ',');

      case 'json':
        return DocParser.jsonToMarkdown(content, filename);

      case 'xml':
      case 'html':
      case 'svg':
        return DocParser.markupToMarkdown(content, ext);

      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
      case 'py':
      case 'rs':
      case 'go':
      case 'css':
      case 'sql':
      case 'sh':
        return DocParser.codeToMarkdown(content, filename, ext);

      case 'log':
      case 'txt':
      default:
        return DocParser.plainTextToMarkdown(content, filename);
    }
  }

  /**
   * Converts CSV / TSV to formatted GitHub Flavored Markdown Table
   */
  private static csvToMarkdown(content: string, delimiter = ','): string {
    const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return '_Empty Tabular Document_';

    const parseLine = (line: string): string[] => {
      if (delimiter === '\t') return line.split('\t').map((c) => c.trim());
      // Handle comma-separated with quoted cells
      const cells: string[] = [];
      let inQuotes = false;
      let current = '';

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          cells.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      cells.push(current.trim().replace(/^"|"$/g, ''));
      return cells;
    };

    const rows = lines.map(parseLine);
    const maxCols = Math.max(...rows.map((r) => r.length));
    if (maxCols === 0) return '_Empty Tabular Document_';

    const headers = rows[0] || [];
    while (headers.length < maxCols) headers.push(`Col ${headers.length + 1}`);

    const headerLine = `| ${headers.join(' | ')} |`;
    const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;

    const dataRows = rows.slice(1).map((row) => {
      while (row.length < maxCols) row.push('');
      return `| ${row.join(' | ')} |`;
    });

    return [
      `### Tabular Dataset (${rows.length - 1} rows, ${maxCols} columns)`,
      '',
      headerLine,
      separatorLine,
      ...dataRows,
    ].join('\n');
  }

  /**
   * Converts JSON documents into structured Markdown with schema and code fence
   */
  private static jsonToMarkdown(content: string, filename: string): string {
    try {
      const parsed = JSON.parse(content);
      const isArray = Array.isArray(parsed);
      const keys = isArray && parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null
        ? Object.keys(parsed[0])
        : typeof parsed === 'object' && parsed !== null
        ? Object.keys(parsed)
        : [];

      return [
        `### JSON Document: \`${filename}\``,
        isArray ? `- **Type**: Array (${parsed.length} items)` : `- **Type**: Object`,
        keys.length > 0 ? `- **Root Keys**: ${keys.map((k) => `\`${k}\``).join(', ')}` : '',
        '',
        '```json',
        JSON.stringify(parsed, null, 2),
        '```',
      ].filter(Boolean).join('\n');
    } catch {
      return [
        `### JSON Document: \`${filename}\``,
        '```json',
        content,
        '```',
      ].join('\n');
    }
  }

  /**
   * Strips scripts/styles and formats HTML/XML
   */
  private static markupToMarkdown(content: string, type: string): string {
    if (type === 'html') {
      // Extract headings and text content
      const cleaned = content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

      return cleaned.trim() || `\`\`\`html\n${content}\n\`\`\``;
    }

    return `\`\`\`${type}\n${content}\n\`\`\``;
  }

  /**
   * Formats source code with language fences and AST outline summary
   */
  private static codeToMarkdown(content: string, filename: string, ext: string): string {
    const lines = content.split('\n');
    const exports = lines.filter((l) => /^\s*(export|public|fn|def|function|class|interface|type)\s+/.test(l));

    return [
      `### Source Code: \`${filename}\` (${lines.length} lines)`,
      exports.length > 0 ? `**Exported Symbols:**\n${exports.slice(0, 10).map((e) => `- \`${e.trim()}\``).join('\n')}` : '',
      '',
      `\`\`\`${ext}`,
      content,
      '```',
    ].filter(Boolean).join('\n');
  }

  private static plainTextToMarkdown(content: string, filename: string): string {
    return [
      `### Text Document: \`${filename}\``,
      '',
      content,
    ].join('\n');
  }

  /**
   * Reads a file from Continua VFS, converts it to clean Markdown, and writes it as [name].md
   */
  static async convertAndSave(filePath: string): Promise<string> {
    const file = await FS.read(filePath);
    if (!file || typeof file.content !== 'string') {
      throw new Error(`File not found or unreadable: ${filePath}`);
    }

    const mdContent = DocParser.toMarkdown(file.content, file.name);
    const destPath = filePath.replace(/\.[^.]+$/, '') + '.md';
    await FS.write(destPath, mdContent, 'text/markdown');
    return destPath;
  }

  /**
   * Reads a file and directly ingests its structured Markdown into Episodic Memory
   */
  static async ingestToMemory(filePath: string): Promise<void> {
    const file = await FS.read(filePath);
    if (!file || typeof file.content !== 'string') return;

    const mdContent = DocParser.toMarkdown(file.content, file.name);
    await episodicMemory.recordTurn('system', `Ingested Document: ${file.name}\n\n${mdContent.slice(0, 1200)}`, {
      appContext: 'file-manager',
      referencedFiles: [filePath],
      tags: ['doc-ingestion', file.name],
    });
  }
}
