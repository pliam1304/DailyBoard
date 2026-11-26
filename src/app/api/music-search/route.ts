import { NextResponse, type NextRequest } from 'next/server';

export interface MusicSearchHit {
  videoId: string;
  title: string;
  author: string;
  duration: string;
  thumbnail: string;
  url: string;
}

const YT_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

function parseYtInitialData(html: string): MusicSearchHit[] {
  const marker = 'var ytInitialData = ';
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) return [];

  const jsonStart = startIdx + marker.length;
  const scriptEnd = html.indexOf(';</script>', jsonStart);
  if (scriptEnd === -1) return [];

  const rawJson = html.slice(jsonStart, scriptEnd).trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return [];
  }

  const hits: MusicSearchHit[] = [];
  const seen = new Set<string>();

  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object' || hits.length >= 8) return;
    if (Array.isArray(node)) {
      for (const child of node) {
        if (hits.length >= 8) break;
        walk(child);
      }
      return;
    }

    const obj = node as Record<string, unknown>;
    if (obj.videoRenderer && typeof obj.videoRenderer === 'object') {
      const vr = obj.videoRenderer as {
        videoId?: string;
        title?: { runs?: { text?: string }[]; simpleText?: string };
        ownerText?: { runs?: { text?: string }[] };
        longBylineText?: { runs?: { text?: string }[] };
        lengthText?: { simpleText?: string };
      };
      const videoId = String(vr.videoId || '');
      if (YT_ID_RE.test(videoId) && !seen.has(videoId)) {
        const title =
          vr.title?.runs?.map((r) => r.text || '').join('') ||
          vr.title?.simpleText ||
          '';
        const author =
          vr.ownerText?.runs?.[0]?.text ||
          vr.longBylineText?.runs?.[0]?.text ||
          'YouTube';
        const duration = vr.lengthText?.simpleText || 'LIVE';
        if (title) {
          seen.add(videoId);
          hits.push({
            videoId,
            title: title.slice(0, 140),
            author: author.slice(0, 80),
            duration,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${videoId}`,
          });
        }
      }
      return;
    }

    for (const val of Object.values(obj)) {
      if (hits.length >= 8) break;
      walk(val);
    }
  };

  walk(parsed);
  return hits;
}

export async function GET(req: NextRequest) {
  const rawQuery = (req.nextUrl.searchParams.get('q') || '').trim().slice(0, 100);
  if (!rawQuery) {
    return NextResponse.json({ hits: [] });
  }

  try {
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      rawQuery
    )}&sp=EgIQAQ%253D%253D`;
    const res = await fetch(ytUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      next: { revalidate: 300 },
    });

    if (res.ok) {
      const html = await res.text();
      const hits = parseYtInitialData(html);
      if (hits.length > 0) {
        return NextResponse.json({ hits });
      }
    }
  } catch {
    // Fall through to empty response
  }

  return NextResponse.json({ hits: [] });
}
