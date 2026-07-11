/**
 * Moodboard Export Service — export boards as JSON or generate printable views.
 * PDF export uses canvas rendering for maximum compatibility.
 */

export type ExportFormat = 'json' | 'png' | 'print';

export type ExportOptions = {
  format: ExportFormat;
  filename?: string;
  includeComments?: boolean;
  includeReactions?: boolean;
  scale?: number;            // for PNG: pixel scale (default 2)
  backgroundColor?: string;
};

export type ExportableNode = {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content: string;
  label?: string;
  backgroundColor?: string;
  tags?: string[];
  reactions?: Record<string, string[]>;
};

export const MoodboardExportService = {
  /**
   * Export board as JSON (full data).
   */
  exportJSON(
    nodes: ExportableNode[],
    connections: { fromId: string; toId: string; label?: string }[],
    options: ExportOptions,
  ): void {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      nodes,
      connections,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = options.filename || 'moodboard-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Export board as PNG using Canvas API.
   * Renders all nodes onto a canvas and triggers download.
   */
  async exportPNG(
    nodes: ExportableNode[],
    options: ExportOptions,
  ): Promise<void> {
    const scale = options.scale || 2;
    const padding = 80;

    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + (n.width || 300));
      maxY = Math.max(maxY, n.y + (n.height || 200));
    });

    const width = (maxX - minX + padding * 2) * scale;
    const height = (maxY - minY + padding * 2) * scale;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = options.backgroundColor || '#f8f8f8';
    ctx.fillRect(0, 0, width, height);

    // Render nodes
    for (const node of nodes) {
      const x = (node.x - minX + padding) * scale;
      const y = (node.y - minY + padding) * scale;
      const w = (node.width || 300) * scale;
      const h = (node.height || 200) * scale;

      // Node background
      ctx.fillStyle = node.backgroundColor || '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 8 * scale;
      ctx.shadowOffsetY = 2 * scale;
      roundRect(ctx, x, y, w, h, 8 * scale);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      // Border
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = scale;
      roundRect(ctx, x, y, w, h, 8 * scale);
      ctx.stroke();

      // Label
      if (node.label) {
        ctx.fillStyle = '#374151';
        ctx.font = `${12 * scale}px -apple-system, system-ui, sans-serif`;
        ctx.fillText(node.label, x + 12 * scale, y + h - 10 * scale);
      }

      // Content preview (text only for canvas)
      if (node.type === 'text') {
        ctx.fillStyle = '#1f2937';
        ctx.font = `${14 * scale}px -apple-system, system-ui, sans-serif`;
        const lines = wrapText(ctx, node.content, w - 24 * scale);
        lines.forEach((line, i) => {
          ctx.fillText(line, x + 12 * scale, y + 24 * scale + i * 18 * scale);
        });
      }

      // Image indicator
      if (node.type === 'image' && node.content) {
        ctx.fillStyle = '#e5e7eb';
        roundRect(ctx, x + 8 * scale, y + 8 * scale, w - 16 * scale, h - 40 * scale, 4 * scale);
        ctx.fill();
        ctx.fillStyle = '#9ca3af';
        ctx.font = `${10 * scale}px -apple-system, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('[Image]', x + w / 2, y + h / 2);
        ctx.textAlign = 'left';
      }

      // Reactions badge
      if (node.reactions && Object.keys(node.reactions).length > 0) {
        const total = Object.values(node.reactions).reduce((sum, arr) => sum + arr.length, 0);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(x + w - 16 * scale, y + 16 * scale, 10 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${9 * scale}px -apple-system, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(total), x + w - 16 * scale, y + 16 * scale);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      }
    }

    // Trigger download
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = options.filename || 'moodboard-export.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Open print dialog for the board (generates a printable HTML page).
   */
  exportPrint(
    nodes: ExportableNode[],
    connections: { fromId: string; toId: string; label?: string }[],
    boardName: string,
  ): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + (n.width || 300));
      maxY = Math.max(maxY, n.y + (n.height || 200));
    });

    const html = `<!DOCTYPE html>
<html><head><title>${boardName} - Print</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, system-ui, sans-serif; background: #fff; padding: 20px; }
  h1 { font-size: 24px; margin-bottom: 20px; color: #1f2937; }
  .board { position: relative; width: ${maxX - minX + 200}px; height: ${maxY - minY + 200}px; margin: 0 auto; }
  .node { position: absolute; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .node-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
  .node-content { font-size: 14px; color: #1f2937; }
  .node-reactions { position: absolute; top: -8px; right: -8px; background: #ef4444; color: #fff; border-radius: 50%; width: 20px; height: 20px; font-size: 10px; display: flex; align-items: center; justify-content: center; }
  @media print { .board { page-break-inside: avoid; } }
</style></head><body>
<h1>${boardName}</h1>
<div class="board">
${nodes.map(n => {
  const x = n.x - minX + 100;
  const y = n.y - minY + 100;
  const reactions = n.reactions ? Object.values(n.reactions).reduce((s, a) => s + a.length, 0) : 0;
  return `<div class="node" style="left:${x}px;top:${y}px;width:${n.width || 300}px;${n.backgroundColor ? `background:${n.backgroundColor}` : ''}">
    <div class="node-content">${n.type === 'text' ? n.content : `[${n.type}] ${n.content.slice(0, 50)}`}</div>
    ${n.label ? `<div class="node-label">${n.label}</div>` : ''}
    ${reactions > 0 ? `<div class="node-reactions">${reactions}</div>` : ''}
  </div>`;
}).join('\n')}
</div>
</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  },
};

// ─── Helpers ────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 6); // max 6 lines
}
