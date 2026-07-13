/**
 * Tests for Browser Clip Service — dispatching clip events to moodboard.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { BrowserClipService } from '@/lib/services/browser-clip.service';

describe('BrowserClipService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should dispatch a clip event with metadata', () => {
    const handler = vi.fn();
    window.addEventListener('os:clip-to-moodboard', handler);

    BrowserClipService.clipPage({
      url: 'https://example.com/article',
      title: 'Test Article',
      source: 'power-browser',
    });

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0]![0] as CustomEvent;
    expect(event!.detail.url).toBe('https://example.com/article');
    expect(event!.detail.title).toBe('Test Article');
    expect(event!.detail.source).toBe('power-browser');

    window.removeEventListener('os:clip-to-moodboard', handler);
  });

  it('should include image if provided', () => {
    const handler = vi.fn();
    window.addEventListener('os:clip-to-moodboard', handler);

    BrowserClipService.clipPage({
      url: 'https://example.com',
      title: 'Page',
      image: 'https://example.com/thumb.png',
      source: 'power-browser',
    });

    expect(handler.mock.calls[0]![0]!.detail.image).toBe('https://example.com/thumb.png');
    window.removeEventListener('os:clip-to-moodboard', handler);
  });

  it('should include description if provided', () => {
    const handler = vi.fn();
    window.addEventListener('os:clip-to-moodboard', handler);

    BrowserClipService.clipPage({
      url: 'https://example.com',
      title: 'Page',
      description: 'A great article',
      source: 'power-browser',
    });

    expect(handler.mock.calls[0]![0]!.detail.description).toBe('A great article');
    window.removeEventListener('os:clip-to-moodboard', handler);
  });

  it('should default source to browser', () => {
    const handler = vi.fn();
    window.addEventListener('os:clip-to-moodboard', handler);

    BrowserClipService.clipPage({
      url: 'https://example.com',
      title: 'Page',
    });

    expect(handler.mock.calls[0]![0]!.detail.source).toBe('browser');
    window.removeEventListener('os:clip-to-moodboard', handler);
  });

  it('should clip an image', () => {
    const handler = vi.fn();
    window.addEventListener('os:clip-to-moodboard', handler);

    BrowserClipService.clipImage('https://example.com/image.png', 'Cool image', 'browser');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0]!.detail.image).toBe('https://example.com/image.png');
    expect(handler.mock.calls[0]![0]!.detail.title).toBe('Cool image');
    window.removeEventListener('os:clip-to-moodboard', handler);
  });

  it('should clip a link', () => {
    const handler = vi.fn();
    window.addEventListener('os:clip-to-moodboard', handler);

    BrowserClipService.clipLink('https://example.com', 'Example', 'browser');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0]!.detail.url).toBe('https://example.com');
    expect(handler.mock.calls[0]![0]!.detail.title).toBe('Example');
    window.removeEventListener('os:clip-to-moodboard', handler);
  });

  it('should extract metadata from URL', async () => {
    const meta = await BrowserClipService.extractMeta('https://example.com/blog/my-post');
    expect(meta.url).toBe('https://example.com/blog/my-post');
    expect(meta.title).toBe('my post');
    expect(meta.source).toBe('example.com');
  });

  it('should clip with metadata', async () => {
    const handler = vi.fn();
    window.addEventListener('os:clip-to-moodboard', handler);

    await BrowserClipService.clipWithMeta('https://example.com/blog/test-article');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0]!.detail.url).toBe('https://example.com/blog/test-article');
    window.removeEventListener('os:clip-to-moodboard', handler);
  });
});
