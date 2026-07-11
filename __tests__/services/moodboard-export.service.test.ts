/**
 * Tests for Moodboard Export Service — JSON export, print export.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MoodboardExportService } from '@/lib/services/moodboard-export.service';

describe('MoodboardExportService', () => {
  const sampleNodes = [
    { id: '1', type: 'text', x: 0, y: 0, width: 300, height: 200, content: 'Hello' },
    { id: '2', type: 'image', x: 320, y: 0, width: 300, height: 200, content: 'img.png', label: 'Photo' },
    { id: '3', type: 'text', x: 0, y: 220, width: 300, height: 200, content: 'World', reactions: { '👍': ['u1', 'u2'] } },
  ];

  const sampleConnections = [
    { fromId: '1', toId: '2', label: 'inspired by' },
  ];

  describe('exportJSON', () => {
    it('should create a blob and trigger download', () => {
      const clicks: string[] = [];
      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = vi.fn(() => 'blob:mock-url');

      const origCreateElement = document.createElement.bind(document);
      const mockA = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') return mockA as any;
        return origCreateElement(tag);
      });
      vi.spyOn(document.body, 'appendChild').mockImplementation(((child: Node) => child) as any);
      vi.spyOn(document.body, 'removeChild').mockImplementation(((child: Node) => child) as any);
      URL.revokeObjectURL = vi.fn();

      MoodboardExportService.exportJSON(sampleNodes, sampleConnections, {
        format: 'json',
        filename: 'test-board.json',
      });

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockA.download).toBe('test-board.json');
      expect(mockA.click).toHaveBeenCalled();

      URL.createObjectURL = originalCreateObjectURL;
    });
  });

  describe('exportPrint', () => {
    it('should open a print window', () => {
      const mockPrintWindow = {
        document: {
          write: vi.fn(),
          close: vi.fn(),
        },
        print: vi.fn(),
      };
      vi.spyOn(window, 'open').mockReturnValue(mockPrintWindow as any);

      MoodboardExportService.exportPrint(sampleNodes, sampleConnections, 'My Board');

      expect(window.open).toHaveBeenCalled();
      expect(mockPrintWindow.document.write).toHaveBeenCalled();
      expect(mockPrintWindow.document.close).toHaveBeenCalled();
    });

    it('should handle blocked popup gracefully', () => {
      vi.spyOn(window, 'open').mockReturnValue(null);

      // Should not throw
      MoodboardExportService.exportPrint(sampleNodes, sampleConnections, 'My Board');
      expect(window.open).toHaveBeenCalledWith('', '_blank');
    });
  });
});
