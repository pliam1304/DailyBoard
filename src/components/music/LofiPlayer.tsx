'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CloudRain,
  Disc3,
  ExternalLink,
  Flame,
  FolderPlus,
  Heart,
  Moon,
  Music2,
  Pin,
  Play,
  Plus,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Square,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { ambientEngine } from '@/lib/audio';
import {
  CURATED_MOOD_TABS,
  CURATED_STATIONS,
  stationToTrack,
  type CuratedMoodId,
} from '@/lib/curatedTracks';
import { fetchYouTubeTitle, parseMusicUrl } from '@/lib/media';
import { createUuid, isSharedDuo } from '@/lib/sharing';
import { sanitizeText, validateSafeHttpUrl } from '@/lib/security';
import type { MusicSearchHit } from '@/app/api/music-search/route';
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
  onSelectTrack: (track: MusicTrack | null) => void;
  onAddTrack: (track: MusicTrack) => void;
  onUpdateTrack?: (track: MusicTrack) => void;
  onRemoveTrack: (id: string) => void;
  onPinSongToDay: (track: MusicTrack) => void;
  theme: ThemeMode;
  spotifyClientId?: string;
}

const SLEEP_OPTIONS = [0, 15, 30, 60] as const;

export function LofiPlayer({
  tracks,
  activeTrack,
  sharing,
  onSelectTrack,
  onAddTrack,
  onUpdateTrack,
  onRemoveTrack,
  onPinSongToDay,
  theme,
  spotifyClientId,
}: LofiPlayerProps) {
  const [shelfTab, setShelfTab] = useState<'my_list' | 'curated'>('curated');
  const [curatedMood, setCuratedMood] = useState<CuratedMoodId>('focus');
  const [playlistFilter, setPlaylistFilter] = useState<string>('all');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderInput, setNewFolderInput] = useState('');
  const [customFolders, setCustomFolders] = useState<string[]>([]);

  const [queryOrUrl, setQueryOrUrl] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MusicSearchHit[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [pinnedNotice, setPinnedNotice] = useState(false);
  const [shuffleOn, setShuffleOn] = useState(false);

  const [sleepRemainingSec, setSleepRemainingSec] = useState<number>(0);

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

  // Sleep timer countdown
  useEffect(() => {
    if (sleepRemainingSec <= 0) return;
    const timer = setInterval(() => {
      setSleepRemainingSec((prev) => {
        if (prev <= 1) {
          onSelectTrack(null);
          setAmbient({ rain: 0, purr: 0, fire: 0 });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sleepRemainingSec, onSelectTrack]);

  // Optional Spotify OAuth token reader
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

  // Collect all user playlist folders from saved tracks + newly created ones
  const playlistNames = useMemo(() => {
    const names = new Set<string>(customFolders);
    for (const t of tracks) {
      const tag = (t.vibeTag || '').trim();
      if (
        tag &&
        !['chill', 'focus', 'rainy', 'cafe', 'piano', 'indie', 'spotify'].includes(
          tag.toLowerCase()
        )
      ) {
        names.add(tag);
      }
    }
    return Array.from(names);
  }, [tracks, customFolders]);

  const filteredUserTracks = useMemo(() => {
    if (playlistFilter === 'all') return tracks;
    if (playlistFilter === 'fav') return tracks.filter((t) => t.isFavorite);
    return tracks.filter((t) => t.vibeTag === playlistFilter);
  }, [tracks, playlistFilter]);

  const activeParsed = activeTrack ? parseMusicUrl(activeTrack.url) : null;

  const targetFolderTag =
    playlistFilter !== 'all' && playlistFilter !== 'fav'
      ? playlistFilter
      : 'chill';

  const handleStepTrack = (dir: 1 | -1) => {
    const pool =
      filteredUserTracks.length > 0
        ? filteredUserTracks
        : CURATED_STATIONS.map(stationToTrack);
    if (pool.length === 0) return;

    if (shuffleOn && pool.length > 1) {
      const candidates = pool.filter((t) => t.id !== activeTrack?.id);
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      if (pick) onSelectTrack(pick);
      return;
    }

    const idx = pool.findIndex((t) => t.id === activeTrack?.id);
    const nextIdx =
      idx === -1
        ? 0
        : (idx + dir + pool.length) % pool.length;
    onSelectTrack(pool[nextIdx]);
  };

  const handleSearchOrPaste = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const raw = queryOrUrl.trim();
    if (!raw) return;

    // 1. Check if input is a direct YouTube or Spotify link
    const parsedLink = parseMusicUrl(raw);
    if (parsedLink && validateSafeHttpUrl(parsedLink.cleanUrl)) {
      setSearching(true);
      let title = '';
      let author = parsedLink.source === 'youtube' ? 'YouTube' : 'Spotify';
      if (parsedLink.source === 'youtube') {
        const meta = await fetchYouTubeTitle(parsedLink.cleanUrl);
        if (meta) {
          title = meta.title;
          author = meta.author;
        }
      }
      if (!title) {
        title =
          parsedLink.source === 'youtube'
            ? 'YouTube Lofi'
            : `Spotify ${parsedLink.spotifyKind || 'Playlist'}`;
      }
      const newTrack: MusicTrack = {
        id: createUuid(),
        source: parsedLink.source,
        url: parsedLink.cleanUrl,
        embedId: parsedLink.embedId,
        isPlaylist: parsedLink.isPlaylist,
        spotifyKind: parsedLink.spotifyKind,
        title,
        artistOrChannel: author,
        vibeTag: targetFolderTag,
        isFavorite: true,
        authorRole: sharing.activeRole,
        createdAt: new Date().toISOString(),
      };
      onAddTrack(newTrack);
      onSelectTrack(newTrack);
      setShelfTab('my_list');
      setQueryOrUrl('');
      setSearchResults([]);
      setSearching(false);
      return;
    }

    // 2. Otherwise search songs directly inside the app!
    setSearching(true);
    try {
      const res = await fetch(
        `/api/music-search?q=${encodeURIComponent(raw)}`
      );
      const data = (await res.json()) as { hits?: MusicSearchHit[] };
      const hits = data.hits ?? [];
      setSearchResults(hits);
      if (hits.length === 0) {
        setErrorMsg('Không tìm thấy bài phù hợp. Bạn thử từ khóa khác hoặc dán link nhé!');
      }
    } catch {
      setErrorMsg('Không thể tìm nhạc lúc này. Bạn có thể dán trực tiếp link YouTube/Spotify.');
    } finally {
      setSearching(false);
    }
  };

  const buildTrackFromSearchHit = (hit: MusicSearchHit): MusicTrack => ({
    id: createUuid(),
    source: 'youtube',
    url: hit.url,
    embedId: hit.videoId,
    isPlaylist: false,
    title: sanitizeText(hit.title, 140),
    artistOrChannel: sanitizeText(hit.author, 80),
    vibeTag: targetFolderTag,
    isFavorite: true,
    authorRole: sharing.activeRole,
    createdAt: new Date().toISOString(),
  });

  const handleSaveSearchHit = (hit: MusicSearchHit, alsoPlay: boolean) => {
    const existing = tracks.find((t) => t.embedId === hit.videoId);
    if (existing) {
      if (alsoPlay) onSelectTrack(existing);
      return;
    }
    const created = buildTrackFromSearchHit(hit);
    onAddTrack(created);
    if (alsoPlay) onSelectTrack(created);
  };

  const handleSaveCuratedStation = (station: (typeof CURATED_STATIONS)[number]) => {
    const exists = tracks.some((t) => t.embedId === station.embedId);
    if (exists) {
      setShelfTab('my_list');
      return;
    }
    const newTrack: MusicTrack = {
      ...stationToTrack(station),
      id: createUuid(),
      vibeTag: targetFolderTag,
      isFavorite: true,
      authorRole: sharing.activeRole,
    };
    onAddTrack(newTrack);
  };

  const handleCreatePlaylistFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeText(newFolderInput, 24);
    if (!clean) return;
    if (!customFolders.includes(clean)) {
      setCustomFolders((prev) => [...prev, clean]);
    }
    setPlaylistFilter(clean);
    setNewFolderInput('');
    setCreatingFolder(false);
  };

  const handlePinSong = () => {
    if (!activeTrack) return;
    onPinSongToDay(activeTrack);
    setPinnedNotice(true);
    setTimeout(() => setPinnedNotice(false), 2000);
  };

  const startSpotifyOAuth = () => {
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

  const cycleSleepTimer = () => {
    const currentMin = Math.ceil(sleepRemainingSec / 60);
    const nextOption =
      SLEEP_OPTIONS.find((m) => m > currentMin) ?? 0;
    setSleepRemainingSec(nextOption * 60);
  };

  const visibleCurated = CURATED_STATIONS.filter((s) => s.mood === curatedMood);

  return (
    <div
      className={`rounded-3xl border-2 p-4 shadow-md transition-colors ${
        isNight
          ? 'border-[#6f523b] bg-[#2c2119]/95 text-[#f4e8d6]'
          : 'border-[#c69d70] bg-[#fbf5e9] text-[#382619]'
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#3a75a8] text-white shadow-sm">
            <Disc3
              className={`h-5 w-5 ${activeTrack ? 'animate-spin' : ''}`}
              style={{ animationDuration: '5s' }}
            />
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight">
              Phòng Nhạc
            </h2>
            {isSharedDuo(sharing) && (
              <p
                className={`text-[11px] ${
                  isNight ? 'text-[#cbb7a1]' : 'text-[#6b5340]'
                }`}
              >
                Đồng bộ bài phát cùng nhau
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={cycleSleepTimer}
            title="Hẹn giờ tự động tắt nhạc"
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
              sleepRemainingSec > 0
                ? 'bg-[#b57a29] text-white'
                : isNight
                  ? 'bg-[#3b2d22] text-[#e6d6c3]'
                  : 'bg-[#ede1cd] text-[#4b3525]'
            }`}
          >
            <Moon className="h-3 w-3" />
            {sleepRemainingSec > 0
              ? `${Math.ceil(sleepRemainingSec / 60)}p`
              : 'Hẹn tắt'}
          </button>

          {activeTrack && (
            <button
              type="button"
              onClick={handlePinSong}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#3d7c57] px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#316647]"
            >
              <Pin className="h-3 w-3" />
              {pinnedNotice ? 'Đã ghim!' : 'Ghim ngày'}
            </button>
          )}
        </div>
      </div>

      {/* Pixel LED Track Bar + Transport Controls */}
      <div className="mb-3 rounded-2xl border-2 border-[#4e3b2b] bg-[#221913] px-3 py-2 text-[#cbf5d5] shadow-inner">
        <div className="flex items-center justify-between gap-2">
          <div className="pixel-led truncate text-xs font-bold">
            {activeTrack ? `▶ ${activeTrack.title}` : '♪ Chưa chọn bài phát'}
          </div>
          {activeTrack && (
            <a
              href={activeTrack.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Mở tab gốc"
              className="shrink-0 rounded bg-[#344939] p-1 text-[#b4f2c2] hover:bg-[#415c48]"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Transport Bar */}
        <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-1.5 text-[11px]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleStepTrack(-1)}
              title="Bài trước"
              className="rounded-lg bg-white/10 px-2 py-1 hover:bg-white/20"
            >
              <SkipBack className="h-3.5 w-3.5" />
            </button>
            {activeTrack ? (
              <button
                type="button"
                onClick={() => onSelectTrack(null)}
                title="Dừng phát"
                className="inline-flex items-center gap-1 rounded-lg bg-[#b95567] px-2.5 py-1 font-bold text-white hover:opacity-90"
              >
                <Square className="h-3 w-3 fill-current" /> Dừng
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleStepTrack(1)}
                className="inline-flex items-center gap-1 rounded-lg bg-[#3d7c57] px-2.5 py-1 font-bold text-white hover:opacity-90"
              >
                <Play className="h-3 w-3 fill-current" /> Phát ngay
              </button>
            )}
            <button
              type="button"
              onClick={() => handleStepTrack(1)}
              title="Bài tiếp theo"
              className="rounded-lg bg-white/10 px-2 py-1 hover:bg-white/20"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShuffleOn((v) => !v)}
              title="Phát ngẫu nhiên"
              className={`rounded-lg px-2 py-1 transition ${
                shuffleOn ? 'bg-[#3a75a8] text-white' : 'bg-white/10 opacity-70 hover:opacity-100'
              }`}
            >
              <Shuffle className="h-3.5 w-3.5" />
            </button>
          </div>

          <span className="rounded bg-[#344939] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#a8f2b8]">
            {activeTrack ? activeTrack.source : 'SẴN SÀNG'}
          </span>
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
              className="h-40 w-full"
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

      {/* Unified Song Search OR Link Paste Box */}
      <form onSubmit={(e) => void handleSearchOrPaste(e)} className="mb-3 space-y-2">
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 opacity-55" />
            <input
              type="text"
              value={queryOrUrl}
              onChange={(e) => setQueryOrUrl(e.target.value)}
              placeholder="Tìm tên bài hát, ca sĩ hoặc dán link..."
              className={`w-full rounded-xl border py-2 pl-8 pr-7 text-xs outline-none transition ${
                isNight
                  ? 'border-[#5e4635] bg-[#3a2c22] text-[#f4e8d6] placeholder:text-[#baa58f]'
                  : 'border-[#d9c2a2] bg-white text-[#382619] placeholder:text-[#8f755e]'
              }`}
            />
            {queryOrUrl && (
              <button
                type="button"
                onClick={() => {
                  setQueryOrUrl('');
                  setSearchResults([]);
                  setErrorMsg('');
                }}
                className="absolute right-2 top-2 rounded-full p-0.5 opacity-60 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={searching}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#3a75a8] px-3 py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-[#2f6390] disabled:opacity-60"
          >
            {searching ? 'Đang tìm...' : 'Tìm / Phát'}
          </button>
        </div>

        {errorMsg && (
          <p className="text-[11px] font-semibold text-[#c54650]">{errorMsg}</p>
        )}

        {/* Instant In-App Search Results */}
        {searchResults.length > 0 && (
          <div
            className={`rounded-2xl border p-2 space-y-1.5 ${
              isNight
                ? 'border-[#5e4635] bg-[#221913]'
                : 'border-[#dfcba9] bg-white'
            }`}
          >
            <div className="flex items-center justify-between px-1 text-[10px] font-bold opacity-75">
              <span>KẾT QUẢ TÌM NHẠC ({searchResults.length})</span>
              <button
                type="button"
                onClick={() => setSearchResults([])}
                className="underline"
              >
                Đóng
              </button>
            </div>
            <div className="max-h-48 space-y-1.5 overflow-y-auto pr-0.5">
              {searchResults.map((hit) => {
                const alreadySaved = tracks.some((t) => t.embedId === hit.videoId);
                return (
                  <div
                    key={hit.videoId}
                    className={`flex items-center gap-2 rounded-xl p-1.5 text-xs ${
                      isNight ? 'bg-[#33261d]' : 'bg-[#fbf5e9]'
                    }`}
                  >
                    <img
                      src={hit.thumbnail}
                      alt={hit.title}
                      loading="lazy"
                      className="h-10 w-14 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold">{hit.title}</div>
                      <div className="truncate text-[10px] opacity-70">
                        {hit.author} • {hit.duration}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onSelectTrack(buildTrackFromSearchHit(hit))
                      }
                      title="Phát thử ngay"
                      className="rounded-lg bg-[#3a75a8] px-2 py-1 text-[10px] font-extrabold text-white hover:bg-[#2f6390]"
                    >
                      Phát
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleSaveSearchHit(hit, true);
                      }}
                      title="Lưu vào Playlist của tôi"
                      className={`rounded-lg px-2 py-1 text-[10px] font-extrabold text-white ${
                        alreadySaved
                          ? 'bg-[#6b5340]'
                          : 'bg-[#3d7c57] hover:bg-[#316647]'
                      }`}
                    >
                      {alreadySaved ? 'Đã lưu' : '+ Lưu'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </form>

      {/* Dual Shelf Switcher: Kệ đĩa có sẵn vs Playlist của tôi */}
      <div className="mb-2.5 grid grid-cols-2 gap-1 rounded-2xl bg-black/5 p-1">
        <button
          type="button"
          onClick={() => setShelfTab('curated')}
          className={`rounded-xl py-1.5 text-xs font-extrabold transition ${
            shelfTab === 'curated'
              ? 'bg-[#3a75a8] text-white shadow-2xs'
              : 'opacity-75 hover:opacity-100'
          }`}
        >
          Kệ nhạc gợi ý
        </button>
        <button
          type="button"
          onClick={() => setShelfTab('my_list')}
          className={`rounded-xl py-1.5 text-xs font-extrabold transition ${
            shelfTab === 'my_list'
              ? 'bg-[#3d7c57] text-white shadow-2xs'
              : 'opacity-75 hover:opacity-100'
          }`}
        >
          Danh sách ({tracks.length})
        </button>
      </div>

      {/* TAB 1: Curated Mood Shelf (1-Tap Play) */}
      {shelfTab === 'curated' && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {CURATED_MOOD_TABS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setCuratedMood(m.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                  curatedMood === m.id
                    ? 'bg-[#b57a29] text-white shadow-2xs'
                    : isNight
                      ? 'bg-[#382a20] text-[#efe2cf] hover:bg-[#463428]'
                      : 'bg-white text-[#4b3525] hover:bg-[#f2e6d3]'
                }`}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>

          <div className="max-h-48 space-y-1.5 overflow-y-auto pr-0.5">
            {visibleCurated.map((station) => {
              const isPlaying = activeTrack?.embedId === station.embedId;
              const isSaved = tracks.some((t) => t.embedId === station.embedId);
              return (
                <div
                  key={station.id}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-xs transition ${
                    isPlaying
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
                    onClick={() => onSelectTrack(stationToTrack(station))}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    {station.source === 'youtube' ? (
                      <img
                        src={`https://i.ytimg.com/vi/${station.embedId}/default.jpg`}
                        alt={station.title}
                        loading="lazy"
                        className="h-8 w-11 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-11 shrink-0 items-center justify-center rounded-md bg-[#1db954]/20 text-[10px] font-black text-[#1db954]">
                        SP
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold">{station.title}</div>
                      <div className="truncate text-[10px] opacity-70">
                        {station.artistOrChannel}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveCuratedStation(station)}
                    title="Lưu vào List của tôi"
                    className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-extrabold transition ${
                      isSaved
                        ? 'bg-black/10 opacity-65'
                        : 'bg-[#3d7c57] text-white hover:bg-[#316647]'
                    }`}
                  >
                    {isSaved ? 'Đã lưu' : '+ Lưu'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: User's Personal Playlists */}
      {shelfTab === 'my_list' && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setPlaylistFilter('all')}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                playlistFilter === 'all'
                  ? 'bg-[#3d7c57] text-white'
                  : isNight
                    ? 'bg-[#382a20] text-[#efe2cf]'
                    : 'bg-white text-[#4b3525]'
              }`}
            >
              Tất cả ({tracks.length})
            </button>
            <button
              type="button"
              onClick={() => setPlaylistFilter('fav')}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                playlistFilter === 'fav'
                  ? 'bg-[#b95567] text-white'
                  : isNight
                    ? 'bg-[#382a20] text-[#efe2cf]'
                    : 'bg-white text-[#4b3525]'
              }`}
            >
              ❤️ Yêu thích
            </button>
            {playlistNames.map((folder) => (
              <button
                key={folder}
                type="button"
                onClick={() => setPlaylistFilter(folder)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  playlistFilter === folder
                    ? 'bg-[#3a75a8] text-white'
                    : isNight
                      ? 'bg-[#382a20] text-[#efe2cf]'
                      : 'bg-white text-[#4b3525]'
                }`}
              >
                🎵 {folder}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCreatingFolder((v) => !v)}
              className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-[#b68655] px-2 py-0.5 text-[11px] font-bold opacity-85 hover:opacity-100"
            >
              <FolderPlus className="h-3 w-3" /> Tạo list
            </button>

            {spotifyClientId && spotifyPlaylists.length === 0 && (
              <button
                type="button"
                onClick={startSpotifyOAuth}
                className="ml-auto text-[11px] font-extrabold text-[#3d7c57] underline"
              >
                Spotify
              </button>
            )}
          </div>

          {creatingFolder && (
            <form onSubmit={handleCreatePlaylistFolder} className="flex gap-1.5">
              <input
                type="text"
                autoFocus
                value={newFolderInput}
                onChange={(e) => setNewFolderInput(e.target.value)}
                placeholder="Tên playlist (vd: Nhạc ngủ, Học bài...)"
                className="flex-1 rounded-xl border border-[#d6c09d] bg-white px-2.5 py-1 text-xs text-[#382619] outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#3a75a8] px-3 py-1 text-xs font-extrabold text-white"
              >
                Tạo
              </button>
            </form>
          )}

          {spotifyPlaylists.length > 0 && (
            <div className="flex flex-wrap gap-1">
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
                  className="rounded-full bg-[#3d7c57] px-2.5 py-0.5 text-[10px] font-bold text-white"
                >
                  🎧 {pl.name}
                </button>
              ))}
            </div>
          )}

          <div className="max-h-48 space-y-1.5 overflow-y-auto pr-0.5">
            {filteredUserTracks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#cfa97e] p-4 text-center text-xs opacity-80">
                Chưa có bài hát nào trong mục này.
              </div>
            ) : (
              filteredUserTracks.map((trk) => {
                const selected = activeTrack?.id === trk.id;
                return (
                  <div
                    key={trk.id}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-2 py-1.5 text-xs transition ${
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
                      {trk.source === 'youtube' && !trk.isPlaylist ? (
                        <img
                          src={`https://i.ytimg.com/vi/${trk.embedId}/default.jpg`}
                          alt={trk.title}
                          loading="lazy"
                          className="h-8 w-11 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <Music2 className="h-4 w-4 shrink-0 opacity-75" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{trk.title}</div>
                        <div className="truncate text-[10px] opacity-65">
                          {trk.artistOrChannel}
                        </div>
                      </div>
                    </button>

                    <div className="flex shrink-0 items-center gap-0.5">
                      {onUpdateTrack && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateTrack({ ...trk, isFavorite: !trk.isFavorite })
                          }
                          title="Yêu thích"
                          className="rounded p-1 hover:bg-black/10"
                        >
                          <Heart
                            className={`h-3.5 w-3.5 ${
                              trk.isFavorite
                                ? 'fill-[#e05d72] text-[#e05d72]'
                                : 'opacity-45'
                            }`}
                          />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemoveTrack(trk.id)}
                        aria-label="Xóa bài"
                        className="rounded p-1 opacity-55 hover:bg-black/10 hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

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
          <span>Âm thanh nền</span>
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
