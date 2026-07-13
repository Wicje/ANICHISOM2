export const isImageUrl = (url: string) => /\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i.test(url);

export function getEmbedDetails(url: string) {
  try {
    if (url.includes('youtube.com/watch') || url.includes('youtube.com/shorts/')) {
      const urlObj = new URL(url);
      const v = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
      return { url: `https://www.youtube.com/embed/${v}`, w: 400, h: 225 };
    }
    if (url.includes('youtu.be/')) {
      const urlObj = new URL(url);
      return { url: `https://www.youtube.com/embed${urlObj.pathname}`, w: 400, h: 225 };
    }
    if (url.includes('instagram.com/')) {
      const cleanUrl = url.split('?')[0]!.replace(/\/$/, '');
      return { url: `${cleanUrl}/embed`, w: 340, h: 440 };
    }
    if (url.includes('pinterest.com/pin/')) {
      const parts = url.split('/');
      const pinIndex = parts.indexOf('pin');
      if (pinIndex !== -1 && parts[pinIndex + 1]) {
        return { url: `https://assets.pinterest.com/ext/embed.html?id=${parts[pinIndex + 1]}`, w: 236, h: 420 };
      }
    }
  } catch (_) {}
  return { url, w: 400, h: 300 };
}

export function snapToGrid(val: number, grid: number): number {
  return Math.round(val / grid) * grid;
}
