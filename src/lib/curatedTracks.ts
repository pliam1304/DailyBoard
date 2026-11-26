import type { MusicTrack } from '@/types/catyboard';

export type CuratedMoodId = 'focus' | 'cafe' | 'rainy' | 'piano' | 'indie';

export const CURATED_MOOD_TABS: {
  id: CuratedMoodId;
  label: string;
  emoji: string;
}[] = [
  { id: 'focus', label: 'Tập trung', emoji: '📚' },
  { id: 'cafe', label: 'Cà phê', emoji: '☕' },
  { id: 'rainy', label: 'Đêm mưa', emoji: '🌧️' },
  { id: 'piano', label: 'Piano', emoji: '🎹' },
  { id: 'indie', label: 'Indie & Việt', emoji: '🌿' },
];

export interface CuratedStation {
  id: string;
  mood: CuratedMoodId;
  source: 'youtube' | 'spotify';
  url: string;
  embedId: string;
  isPlaylist: boolean;
  spotifyKind?: 'track' | 'playlist' | 'album';
  title: string;
  artistOrChannel: string;
}

export const CURATED_STATIONS: CuratedStation[] = [
  // Tập trung (Focus)
  {
    id: 'cur-yt-lofigirl',
    mood: 'focus',
    source: 'youtube',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    embedId: 'jfKfPfyJRdk',
    isPlaylist: false,
    title: 'lofi hip hop radio — beats to relax/study to',
    artistOrChannel: 'Lofi Girl',
  },
  {
    id: 'cur-yt-synthwave',
    mood: 'focus',
    source: 'youtube',
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
    embedId: '4xDzrJKXOOY',
    isPlaylist: false,
    title: 'synthwave radio — chill retro beats',
    artistOrChannel: 'Lofi Girl',
  },
  {
    id: 'cur-sp-lofibeats',
    mood: 'focus',
    source: 'spotify',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn',
    embedId: '37i9dQZF1DWWQRwui0ExPn',
    isPlaylist: true,
    spotifyKind: 'playlist',
    title: 'Lofi Beats',
    artistOrChannel: 'Spotify',
  },
  {
    id: 'cur-sp-deepfocus',
    mood: 'focus',
    source: 'spotify',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ',
    embedId: '37i9dQZF1DWZeKCadgRdKQ',
    isPlaylist: true,
    spotifyKind: 'playlist',
    title: 'Deep Focus',
    artistOrChannel: 'Spotify',
  },

  // Cà phê (Cafe)
  {
    id: 'cur-yt-jazzcafe',
    mood: 'cafe',
    source: 'youtube',
    url: 'https://www.youtube.com/watch?v=DSGyEsJ17cI',
    embedId: 'DSGyEsJ17cI',
    isPlaylist: false,
    title: 'Relaxing Jazz Piano — Cozy Coffee Shop',
    artistOrChannel: 'Cafe Music BGM',
  },
  {
    id: 'cur-sp-coffeetable',
    mood: 'cafe',
    source: 'spotify',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DWVqfgj8NZEp1',
    embedId: '37i9dQZF1DWVqfgj8NZEp1',
    isPlaylist: true,
    spotifyKind: 'playlist',
    title: 'Coffee Table Jazz',
    artistOrChannel: 'Spotify',
  },
  {
    id: 'cur-sp-lofilounge',
    mood: 'cafe',
    source: 'spotify',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX0SM0LYsmbMT',
    embedId: '37i9dQZF1DX0SM0LYsmbMT',
    isPlaylist: true,
    spotifyKind: 'playlist',
    title: 'Jazz Vibes',
    artistOrChannel: 'Spotify',
  },

  // Đêm mưa (Rainy)
  {
    id: 'cur-yt-sleepylofi',
    mood: 'rainy',
    source: 'youtube',
    url: 'https://www.youtube.com/watch?v=rUxyKA_-grg',
    embedId: 'rUxyKA_-grg',
    isPlaylist: false,
    title: 'lofi hip hop radio — beats to sleep/chill to',
    artistOrChannel: 'Lofi Girl',
  },
  {
    id: 'cur-sp-lushlofi',
    mood: 'rainy',
    source: 'spotify',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DXc8kgYqQLMfH',
    embedId: '37i9dQZF1DXc8kgYqQLMfH',
    isPlaylist: true,
    spotifyKind: 'playlist',
    title: 'Lush Lofi',
    artistOrChannel: 'Spotify',
  },
  {
    id: 'cur-sp-nightrain',
    mood: 'rainy',
    source: 'spotify',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DXbcPC6Vvqudd',
    embedId: '37i9dQZF1DXbcPC6Vvqudd',
    isPlaylist: true,
    spotifyKind: 'playlist',
    title: 'Night Rain & Chill',
    artistOrChannel: 'Spotify',
  },

  // Piano & Ghibli
  {
    id: 'cur-yt-ghibli',
    mood: 'piano',
    source: 'youtube',
    url: 'https://www.youtube.com/watch?v=3jWRrafhO7M',
    embedId: '3jWRrafhO7M',
    isPlaylist: false,
    title: 'Studio Ghibli Relaxing Piano Collection',
    artistOrChannel: 'Ghibli Piano',
  },
  {
    id: 'cur-sp-peacefulpiano',
    mood: 'piano',
    source: 'spotify',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO',
    embedId: '37i9dQZF1DX4sWSpwq3LiO',
    isPlaylist: true,
    spotifyKind: 'playlist',
    title: 'Peaceful Piano',
    artistOrChannel: 'Spotify',
  },

  // Indie & Việt
  {
    id: 'cur-sp-indieviet',
    mood: 'indie',
    source: 'spotify',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX4g8Gs5nUhpp',
    embedId: '37i9dQZF1DX4g8Gs5nUhpp',
    isPlaylist: true,
    spotifyKind: 'playlist',
    title: 'Indie Việt Tuyển Chọn',
    artistOrChannel: 'Spotify Vietnam',
  },
  {
    id: 'cur-sp-vpopkhongvova',
    mood: 'indie',
    source: 'spotify',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DWVOaOWiVD1Lf',
    embedId: '37i9dQZF1DWVOaOWiVD1Lf',
    isPlaylist: true,
    spotifyKind: 'playlist',
    title: 'Gác Nhỏ Acoustic & Chill',
    artistOrChannel: 'Spotify',
  },
  {
    id: 'cur-sp-chillhits',
    mood: 'indie',
    source: 'spotify',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6',
    embedId: '37i9dQZF1DX4WYpdgoIcn6',
    isPlaylist: true,
    spotifyKind: 'playlist',
    title: 'Chill Hits',
    artistOrChannel: 'Spotify',
  },
];

export function stationToTrack(station: CuratedStation): MusicTrack {
  return {
    id: station.id,
    source: station.source,
    url: station.url,
    embedId: station.embedId,
    isPlaylist: station.isPlaylist,
    spotifyKind: station.spotifyKind,
    title: station.title,
    artistOrChannel: station.artistOrChannel,
    vibeTag: station.mood,
    isFavorite: false,
    createdAt: new Date().toISOString(),
  };
}
