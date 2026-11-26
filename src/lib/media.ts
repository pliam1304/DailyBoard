export interface ParsedMusicLink {
  source: 'youtube' | 'spotify';
  embedId: string;
  isPlaylist: boolean;
  spotifyKind?: 'track' | 'playlist' | 'album' | 'episode';
  cleanUrl: string;
  embedUrl: string;
}

export function parseMusicUrl(rawUrl: string): ParsedMusicLink | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();

  // YouTube parsing (youtube.com, youtu.be, music.youtube.com)
  if (
    host.includes('youtube.com') ||
    host === 'youtu.be' ||
    host.endsWith('.youtu.be')
  ) {
    const listId = url.searchParams.get('list');
    let videoId = url.searchParams.get('v');

    if (!videoId && host.includes('youtu.be')) {
      videoId = url.pathname.split('/').filter(Boolean)[0] || null;
    }
    if (!videoId && url.pathname.startsWith('/live/')) {
      videoId = url.pathname.split('/')[2] || null;
    }
    if (!videoId && url.pathname.startsWith('/shorts/')) {
      videoId = url.pathname.split('/')[2] || null;
    }
    if (!videoId && url.pathname.startsWith('/embed/')) {
      videoId = url.pathname.split('/')[2] || null;
    }

    if (listId && !videoId) {
      return {
        source: 'youtube',
        embedId: listId,
        isPlaylist: true,
        cleanUrl: trimmed,
        embedUrl: `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(listId)}&autoplay=1&enablejsapi=1`,
      };
    }

    if (videoId) {
      const listQuery = listId ? `&list=${encodeURIComponent(listId)}` : '';
      return {
        source: 'youtube',
        embedId: videoId,
        isPlaylist: Boolean(listId),
        cleanUrl: trimmed,
        embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&loop=1&playlist=${encodeURIComponent(videoId)}${listQuery}&enablejsapi=1`,
      };
    }
  }

  // Spotify parsing (open.spotify.com/track|playlist|album|episode/...)
  if (host.includes('spotify.com')) {
    const parts = url.pathname.split('/').filter(Boolean);
    // Optional locale prefix like /intl-vi/track/...
    const cleaned = parts[0]?.startsWith('intl-') ? parts.slice(1) : parts;
    const kind = cleaned[0];
    const id = cleaned[1];
    if (
      id &&
      (kind === 'track' || kind === 'playlist' || kind === 'album' || kind === 'episode')
    ) {
      return {
        source: 'spotify',
        embedId: id,
        isPlaylist: kind === 'playlist' || kind === 'album',
        spotifyKind: kind,
        cleanUrl: `https://open.spotify.com/${kind}/${id}`,
        embedUrl: `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&theme=0`,
      };
    }
  }

  return null;
}

export async function fetchYouTubeTitle(videoUrl: string): Promise<{
  title: string;
  author: string;
} | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; author_name?: string };
    return {
      title: data.title || 'YouTube Lofi Track',
      author: data.author_name || 'YouTube',
    };
  } catch {
    return null;
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Không thể đọc dữ liệu ảnh'));
      }
    };
    reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Không thể giải mã ảnh trên thiết bị này'));
    el.src = src;
  });
}

function encodeCanvasOptimal(canvas: HTMLCanvasElement, quality: number): string {
  const tryEncode = (q: number): string => {
    const webp = canvas.toDataURL('image/webp', q);
    if (webp.startsWith('data:image/webp;base64,')) {
      return webp;
    }
    return canvas.toDataURL('image/jpeg', q);
  };

  let out = tryEncode(quality);
  if (out.length > 650_000) {
    out = tryEncode(0.65);
  }
  return out;
}

export async function compressImageToDataUrl(
  file: File,
  maxWidth = 960,
  quality = 0.78
): Promise<string> {
  // 1. Try modern createImageBitmap first (best mobile iOS/Android EXIF orientation & memory handling)
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      try {
        const scale =
          bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
        const targetW = Math.max(1, Math.round(bitmap.width * scale));
        const targetH = Math.max(1, Math.round(bitmap.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0, targetW, targetH);
          return encodeCanvasOptimal(canvas, quality);
        }
      } finally {
        bitmap.close?.();
      }
    } catch {
      // Fall through to HTMLImageElement decoding
    }
  }

  // 2. Fallback: Object URL -> HTMLImageElement, then FileReader DataURL -> HTMLImageElement (for mobile WebViews)
  let img: HTMLImageElement | null = null;
  const imageUrl =
    typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(file)
      : '';
  try {
    if (imageUrl) {
      try {
        img = await loadImageElement(imageUrl);
      } catch {
        img = null;
      }
    }
    if (!img) {
      const rawDataUrl = await readFileAsDataUrl(file);
      img = await loadImageElement(rawDataUrl);
    }

    const naturalW = img.naturalWidth || img.width || 800;
    const naturalH = img.naturalHeight || img.height || 600;
    const scale = naturalW > maxWidth ? maxWidth / naturalW : 1;
    const targetW = Math.max(1, Math.round(naturalW * scale));
    const targetH = Math.max(1, Math.round(naturalH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas không khả dụng');
    ctx.drawImage(img, 0, 0, targetW, targetH);

    return encodeCanvasOptimal(canvas, quality);
  } finally {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
  }
}
