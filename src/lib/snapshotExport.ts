import { toPng } from 'html-to-image';

const inlinedUrlCache = new Map<string, string>();

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to encode blob'));
      }
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

async function fetchRemoteImageAsDataUrl(url: string): Promise<string | null> {
  const cached = inlinedUrlCache.get(url);
  if (cached) return cached;

  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await blobToDataUrl(blob);
    if (inlinedUrlCache.size > 48) {
      const oldestKey = inlinedUrlCache.keys().next().value;
      if (oldestKey) inlinedUrlCache.delete(oldestKey);
    }
    inlinedUrlCache.set(url, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

/**
 * Safely renders a Scrapbook DOM node to a high-DPI PNG data URL across iOS Safari,
 * Android Chrome, macOS, and Windows.
 *
 * Pre-inlines any cloud `https://` `<img>` sources (such as Supabase Storage Signed URLs)
 * into local `data:image/...` URLs before invoking `toPng`, preventing blank Polaroid frames
 * caused by WebKit `<foreignObject>` CORS restrictions and signed-URL query cache-busting.
 */
export async function exportScrapbookNodeToPng(
  node: HTMLElement,
  pixelRatio = 2
): Promise<string> {
  const imgElements = Array.from(node.querySelectorAll('img'));
  const restoreList: { el: HTMLImageElement; originalSrc: string }[] = [];

  try {
    await Promise.all(
      imgElements.map(async (img) => {
        const currentSrc = img.getAttribute('src') || img.src || '';
        if (
          currentSrc.startsWith('https://') ||
          currentSrc.startsWith('http://')
        ) {
          const inlined = await fetchRemoteImageAsDataUrl(currentSrc);
          if (inlined) {
            restoreList.push({ el: img, originalSrc: currentSrc });
            img.src = inlined;
          }
        }
        try {
          if (typeof img.decode === 'function') {
            await img.decode();
          }
        } catch {
          // Ignore decode warnings on already loaded images
        }
      })
    );

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      await document.fonts.ready.catch(() => {});
    }

    // Warm-up pass ensures WebKit / iOS Safari paints embedded bitmaps inside <foreignObject>
    const isAppleWebKit =
      typeof navigator !== 'undefined' &&
      /AppleWebKit/i.test(navigator.userAgent) &&
      !/Chrome|Chromium|Edg/i.test(navigator.userAgent);

    if (isAppleWebKit) {
      await toPng(node, {
        cacheBust: false,
        pixelRatio: 1,
      }).catch(() => {});
    }

    return await toPng(node, {
      cacheBust: false,
      pixelRatio,
    });
  } finally {
    for (const item of restoreList) {
      item.el.src = item.originalSrc;
    }
  }
}
