import { NextResponse } from 'next/server';

const FALLBACK_SUPABASE_URL = 'https://uzrhwosbjcmuybttdxdh.supabase.co';
const FALLBACK_PUBLISHABLE_KEY =
  'sb_publishable_I5ERlQtXKiNvCd7beRjT9Q_bpoSN2K9';

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL
  )
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
  const apiKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_PUBLISHABLE_KEY;

  try {
    const [authRes, dbRes] = await Promise.all([
      fetch(`${baseUrl}/auth/v1/settings`, {
        headers: { apikey: apiKey },
        cache: 'no-store',
      }),
      fetch(`${baseUrl}/rest/v1/boards?select=id&limit=1`, {
        headers: { apikey: apiKey },
        cache: 'no-store',
      }),
    ]);

    return NextResponse.json({
      ok: true,
      authReachable: authRes.ok,
      dbReachable: dbRes.status > 0 && dbRes.status < 500,
      checkedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, checkedAt: new Date().toISOString() },
      { status: 503 }
    );
  }
}
