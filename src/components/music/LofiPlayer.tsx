'use client';

import React, { useEffect, useState } from 'react';
import {
  CloudRain,
  Disc3,
  ExternalLink,
  Flame,
  Heart,
  Link2,
  Music2,
  Pin,
  Plus,
  Trash2,
  Volume2,
} from 'lucide-react';
import { ambientEngine } from '@/lib/audio';
import { fetchYouTubeTitle, parseMusicUrl } from '@/lib/media';
import { createUuid, isSharedDuo } from '@/lib/sharing';
import { sanitizeText, validateSafeHttpUrl } from '@/lib/security';
import type {
  AmbientLevels,
  BoardSharingState,
  MusicTrack,
  ThemeMode,
} from '@/types/catyboard';

interface LofiPlayerProps {
  tracks: MusicTrack[];
  activeTrack: MusicTrack | null;
  sharing: BoardSharingState;
  onSelectTrack: (track: MusicTrack) => void;
  onAddTrack: (track: MusicTrack) => void;
  onRemoveTrack: (id: string) => void;
  onPinSongToDay: (track: MusicTrack) => void;
  theme: ThemeMode;
  spotifyClientId?: string;
}

export function LofiPlayer({
  tracks,
  activeTrack,
  sharing,
  onSelectTrack,
  onAddTrack,
  onRemoveTrack,
  onPinSongToDay,
  theme,
  spotifyClientId,
}: LofiPlayerProps) {
  const [urlInput, setUrlInput] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [adding, setAdding] = useState(false);
  const [pinnedNotice, setPinnedNotice] = useState(false);
  const [ambient, setAmbient] = useState<AmbientLevels>({
    rain: 0,
    purr: 0,
    fire: 0,
  });
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<
    { id: string; name: string; url: string }[]
  >([]);

  const isNight = theme === 'cozy-night';

  useEffect(() => {
    ambientEngine.updateLevels(ambient);
  }, [ambient]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let token = window.sessionStorage.getItem('caty_spotify_token') || '';
    if (window.location.hash.includes('access_token=')) {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const hashToken = params.get('access_token');
      const returnedState = params.get('state');
      const expectedState = window.sessionStorage.getItem('caty_spotify_state');
      if (hashToken && expectedState && returnedState === expectedState) {
        token = hashToken;
        window.sessionStorage.setItem('caty_spotify_token', hashToken);
        window.sessionStorage.removeItem('caty_spotify_state');
      }
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (!token) return;
    void fetch('https://api.spotify.com/v1/me/playlists?limit=12', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: {
          items?: { id: string; name: string; external_urls?: { spotify?: string } }[];
        } | null) => {
          if (!data?.items) return;
          setSpotifyPlaylists(
            data.items.map((item) => ({
              id: item.id,
              name: item.name,
              url:
                item.external_urls?.spotify ||
                `https://open.spotify.com/playlist/${item.id}`,
            }))
          );
        }
      )
      .catch(() => {});
  }, []);

  const activeParsed = activeTrack ? parseMusicUrl(activeTrack.url) : null;

  const handlePasteLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const parsed = parseMusicUrl(urlInput);
    if (!parsed || !validateSafeHttpUrl(parsed.cleanUrl)) {
      setErrorMsg('Link phải là URL https:// hợp lệ của YouTube hoặc Spotify!');
      return;
    }

    setAdding(true);
    let title = sanitizeText(customTitle, 140);
    let author = parsed.source === 'youtube' ? 'YouTube' : 'Spotify';

    if (!title && parsed.source === 'youtube') {
      const meta = await fetchYouTubeTitle(parsed.cleanUrl);
      if (meta) {
        title = meta.title;
        author = meta.author;
      }
    }

    if (!title) {
      title =
        parsed.source === 'youtube'
          ? 'YouTube Lofi Stream'
          : `Spotify ${parsed.spotifyKind || 'Track'}`;
    }

    const newTrack: MusicTrack = {
      id: createUuid(),
      source: parsed.source,
      url: parsed.cleanUrl,
      embedId: parsed.embedId,
      isPlaylist: parsed.isPlaylist,
      spotifyKind: parsed.spotifyKind,
      title,
      artistOrChannel: author,
      vibeTag: 'chill',
      isFavorite: true,
      authorRole: sharing.activeRole,
      createdAt: new Date().toISOString(),
    };

    onAddTrack(newTrack);
    onSelectTrack(newTrack);
    setUrlInput('');
    setCustomTitle('');
    setAdding(false);
  };

  const handlePinSong = () => {
    if (!activeTrack) return;
    onPinSongToDay(activeTrack);
    setPinnedNotice(true);
    setTimeout(() => setPinnedNotice(false), 2000);
  };

  const startSpotifyOAuth = async () => {
    if (!spotifyClientId) return;
    const stateNonce = createUuid();
    window.sessionStorage.setItem('caty_spotify_state', stateNonce);
    const redirectUri = `${window.location.origin}/`;
    const scopes = 'user-read-private playlist-read-private user-read-currently-playing';
    const url = `https://accounts.spotify.com/authorize?client_id=${encodeURIComponent(
      spotifyClientId
    )}&response_type=token&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(stateNonce)}`;
    window.location.href = url;
  };

  return (
    <div
      className={`rounded-3xl border-2 p-4 shadow-md transition-colors ${
        isNight
          ? 'border-[#6f523b] bg-[#2c2119]/95 text-[#f4e8d6]'
          : 'border-[#c69d70] bg-[#fbf5e9] text-[#382619]'
      }`}
    >
      {/* Retro Cassette Header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#3a75a8] text-white shadow-sm">
            <Disc3
              className={`h-5 w-5 ${activeTrack ? 'animate-spin' : ''}`}
              style={{ animationDuration: '5s' }}
            />
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight">
              Góc Nhạc Lofi & Spotify
            </h2>
            <p
              className={`text-[11px] ${
                isNight ? 'text-[#cbb7a1]' : 'text-[#6b5340]'
              }`}
            >
              {isSharedDuo(sharing)
                ? 'Nghe chung YouTube / Spotify — đổi bài sẽ đồng bộ 2 máy'
                : 'Dán link YouTube tự chạy hoặc link Spotify (Free/Premium)'}
            </p>
          </div>
        </div>

        {activeTrack && (
          <button
            type="button"
            onClick={handlePinSong}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#3d7c57] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#316647]"
          >
            <Pin className="h-3 w-3" />
            {pinnedNotice ? 'Đã ghim!' : 'Lưu nhạc ngày'}
          </button>
        )}
      </div>

      {/* Pixel LED Track Bar */}
      <div className="mb-3 rounded-2xl border-2 border-[#4e3b2b] bg-[#221913] px-3 py-2 text-[#cbf5d5] shadow-inner">
        <div className="flex items-center justify-between gap-2">
          <div className="pixel-led truncate text-xs font-bold">
            {activeTrack
              ? `▶ ${activeTrack.title}`
              : '♪ Chọn playlist hoặc dán link YouTube bên dưới'}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {activeTrack && (
              <a
                href={activeTrack.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Mở trực tiếp ở tab mới"
                className="rounded bg-[#344939] p-1 text-[#b4f2c2] hover:bg-[#415c48]"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <span className="rounded bg-[#344939] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#a8f2b8]">
              {activeTrack ? activeTrack.source : 'IDLE'}
            </span>
          </div>
        </div>
      </div>

      {/* Embedded Auto-Play Player */}
      {activeTrack && activeParsed && (
        <div className="mb-3 overflow-hidden rounded-2xl border border-[#cfb590] bg-[#1e1713] shadow-sm">
          {activeParsed.source === 'youtube' ? (
            <iframe
              key={activeTrack.id}
              src={activeParsed.embedUrl}
              title={activeTrack.title}
              className="h-44 w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <iframe
              key={activeTrack.id}
              src={activeParsed.embedUrl}
              title={activeTrack.title}
              className="h-[152px] w-full bg-transparent"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          )}
        </div>
      )}

      {/* Paste YouTube / Spotify link form */}
      <form onSubmit={handlePasteLink} className="space-y-2">
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 opacity-55" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Dán link YouTube hoặc Spotify tại đây..."
              className={`w-full rounded-xl border py-2 pl-8 pr-3 text-xs outline-none transition ${
                isNight
                  ? 'border-[#5e4635] bg-[#3a2c22] text-[#f4e8d6] placeholder:text-[#baa58f]'
                  : 'border-[#d9c2a2] bg-white text-[#382619] placeholder:text-[#8f755e]'
              }`}
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#3a75a8] px-3.5 py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-[#2f6390] disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" />
            {adding ? 'Đang tải...' : 'Phát ngay'}
          </button>
        </div>

        <input
          type="text"
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          placeholder="Tên gợi nhớ (tùy chọn, YouTube sẽ tự lấy tên)"
          className={`w-full rounded-xl border px-3 py-1.5 text-[11px] outline-none ${
            isNight
              ? 'border-[#57402f] bg-[#362920] text-[#f4e8d6] placeholder:text-[#ad967d]'
              : 'border-[#e0ccb0] bg-white text-[#382619] placeholder:text-[#947b64]'
          }`}
        />

        {errorMsg && <p className="text-[11px] font-semibold text-[#c54650]">{errorMsg}</p>}
      </form>

      {/* Saved Tracks Shelf */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold opacity-80">
          <span>DANH SÁCH ĐÃ LƯU ({tracks.length})</span>
          {spotifyClientId && spotifyPlaylists.length === 0 && (
            <button
              type="button"
              onClick={startSpotifyOAuth}
              className="font-extrabold text-[#3d7c57] underline hover:opacity-80"
            >
              Đăng nhập Spotify
            </button>
          )}
        </div>
        {spotifyPlaylists.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {spotifyPlaylists.map((pl) => (
              <button
                key={pl.id}
                type="button"
                onClick={() =>
                  onSelectTrack({
                    id: `sp-pl-${pl.id}`,
                    source: 'spotify',
                    url: pl.url,
                    embedId: pl.id,
                    isPlaylist: true,
                    spotifyKind: 'playlist',
                    title: pl.name,
                    artistOrChannel: 'Spotify của bạn',
                    vibeTag: 'spotify',
                    isFavorite: true,
                    createdAt: new Date().toISOString(),
                  })
                }
                className="rounded-full bg-[#3d7c57] px-2.5 py-0.5 text-[10px] font-bold text-white hover:bg-[#316647]"
              >
                🎧 {pl.name}
              </button>
            ))}
          </div>
        )}
        <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
          {tracks.map((trk) => {
            const selected = activeTrack?.id === trk.id;
            return (
              <div
                key={trk.id}
                className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-xs transition ${
                  selected
                    ? isNight
                      ? 'border-[#5a946a] bg-[#2a4232] font-bold text-[#e7f7ec]'
                      : 'border-[#6da87d] bg-[#e2f2e6] font-bold text-[#1e482b]'
                    : isNight
                      ? 'border-transparent bg-[#382a20] text-[#efe2cf] hover:bg-[#443327]'
                      : 'border-[#eadbc4] bg-white text-[#382619] hover:bg-[#f7efe0]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectTrack(trk)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <Music2 className="h-3.5 w-3.5 shrink-0 opacity-75" />
                  <span className="truncate">{trk.title}</span>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                      isNight
                        ? 'bg-white/15 text-[#f4e8d6]'
                        : 'bg-[#ede1cd] text-[#4d3726]'
                    }`}
                  >
                    {trk.source === 'youtube' ? 'YT' : 'SP'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveTrack(trk.id)}
                  aria-label="Xóa bài"
                  className="rounded p-1 opacity-55 hover:bg-black/10 hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Built-in Lofi Ambient Mixer */}
      <div
        className={`mt-3 rounded-2xl border p-2.5 ${
          isNight
            ? 'border-[#5a4230] bg-[#241b14] text-[#f2e5d2]'
            : 'border-[#e0ccb0] bg-[#f5ecdc] text-[#382619]'
        }`}
      >
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold">
          <Volume2 className="h-3.5 w-3.5" />
          <span>Trộn âm thanh Lofi (nghe cùng nhạc)</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <label className="flex flex-col gap-1">
            <span className="flex items-center gap-1 font-semibold">
              <CloudRain className="h-3 w-3 text-[#3a75a8]" /> Mưa rơi
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={ambient.rain}
              onChange={(e) =>
                setAmbient((prev) => ({ ...prev, rain: Number(e.target.value) }))
              }
              className="accent-[#3a75a8]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center gap-1 font-semibold">
              <Heart className="h-3 w-3 text-[#c45b6d]" /> Mèo gừ
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={ambient.purr}
              onChange={(e) =>
                setAmbient((prev) => ({ ...prev, purr: Number(e.target.value) }))
              }
              className="accent-[#c45b6d]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center gap-1 font-semibold">
              <Flame className="h-3 w-3 text-[#c87d32]" /> Lửa ấm
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={ambient.fire}
              onChange={(e) =>
                setAmbient((prev) => ({ ...prev, fire: Number(e.target.value) }))
              }
              className="accent-[#c87d32]"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
