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

export async function compressImageToDataUrl(
  file: File,
  maxWidth = 1100,
  quality = 0.82
): Promise<string> {
  const imageUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Không thể đọc file ảnh'));
      el.src = imageUrl;
    });

    const scale = img.width > maxWidth ? maxWidth / img.width : 1;
    const targetW = Math.round(img.width * scale);
    const targetH = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas không khả dụng');
    ctx.drawImage(img, 0, 0, targetW, targetH);

    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
