import { describe, it, expect } from 'vitest';
import { DownloadService } from '@/lib/services/download.service';

describe('DownloadService', () => {
  it('getFilenameFromHeaders extracts filename from Content-Disposition', () => {
    const headers = new Headers();
    headers.set('content-disposition', 'attachment; filename="report.pdf"');
    const filename = DownloadService.getFilenameFromHeaders(headers, 'https://example.com/file');
    expect(filename).toBe('report.pdf');
  });

  it('getFilenameFromHeaders extracts filename from URL when no header', () => {
    const headers = new Headers();
    const filename = DownloadService.getFilenameFromHeaders(headers, 'https://example.com/documents/report.pdf');
    expect(filename).toBe('report.pdf');
  });

  it('getFilenameFromHeaders handles encoded filenames', () => {
    const headers = new Headers();
    headers.set('content-disposition', "attachment; filename*=UTF-8''my%20file.pdf");
    const filename = DownloadService.getFilenameFromHeaders(headers, 'https://example.com/x');
    expect(filename).toBe('my file.pdf');
  });

  it('getFilenameFromHeaders returns default for no info', () => {
    const headers = new Headers();
    const filename = DownloadService.getFilenameFromHeaders(headers, '');
    expect(filename).toBe('download');
  });
});
