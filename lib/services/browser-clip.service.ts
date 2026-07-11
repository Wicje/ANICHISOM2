/**
 * Browser Clip Service — sends content from Power Browser to Moodboard.
 * Dispatches 'os:clip-to-moodboard' custom event that the Moodboard listens for.
 */

export type ClipData = {
  url?: string;
  title?: string;
  image?: string;
  description?: string;
  source?: string;
};

export const BrowserClipService = {
  /**
   * Clip the current page to a moodboard.
   * Dispatches a custom event that the Moodboard component listens for.
   */
  clipPage(data: ClipData): void {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(
      new CustomEvent('os:clip-to-moodboard', {
        detail: {
          url: data.url,
          title: data.title,
          image: data.image,
          description: data.description,
          source: data.source || 'browser',
        },
      })
    );
  },

  /**
   * Clip a specific image URL to a moodboard.
   */
  clipImage(imageUrl: string, title?: string, source?: string): void {
    this.clipPage({ image: imageUrl, title: title || 'Clipped Image', source });
  },

  /**
   * Clip a link (bookmark) to a moodboard.
   */
  clipLink(url: string, title?: string, source?: string): void {
    this.clipPage({ url, title: title || url, source });
  },

  /**
   * Extract Open Graph metadata from a page (best-effort).
   * Returns og:image, og:title, og:description if available.
   */
  async extractMeta(url: string): Promise<Partial<ClipData>> {
    try {
      // For cross-origin URLs, we can't fetch directly due to CORS.
      // Return basic metadata from the URL itself.
      const urlObj = new URL(url);
      return {
        url,
        title: urlObj.pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || urlObj.hostname,
        source: urlObj.hostname,
      };
    } catch {
      return { url, title: url };
    }
  },

  /**
   * Clip with automatic metadata extraction.
   */
  async clipWithMeta(url: string, title?: string): Promise<void> {
    const meta = await this.extractMeta(url);
    this.clipPage({
      url: meta.url || url,
      title: title || meta.title,
      source: meta.source,
    });
  },
};
