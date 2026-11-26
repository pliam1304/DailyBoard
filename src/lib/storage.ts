import { toLocalDateKey } from '@/lib/date';
import {
  DEV_ADMIN_EMAIL,
  DEV_ADMIN_PASSWORD_HASH,
  isDevAdminEmail,
} from '@/lib/security';
import {
  createDefaultSharing,
  DEFAULT_BOARD_TITLE,
  DEFAULT_OWNER_NICKNAME,
  normalizeStoreData,
} from '@/lib/sharing';
import type {
  CatyStoreData,
  CloudConfig,
  DayEntry,
  MusicTrack,
} from '@/types/catyboard';

const LOCAL_META_PREFIX = 'nameboard_store_v2_';
const ACTIVE_LOCAL_USER_KEY = 'nameboard_active_user_v1';
const LOCAL_ACCOUNTS_KEY = 'nameboard_local_accounts_v1';
const DEV_CLOUD_OVERRIDE_KEY = 'nameboard_dev_cloud_config_v1';
const IDB_NAME = 'catyboard_idb';
const IDB_STORE = 'snapshots';

export interface LocalUserAccount {
  email: string;
  passwordHash: string;
  boardTitle: string;
  nickname: string;
  verified: boolean;
  pendingOtp?: string;
  createdAt: string;
}

export function getStarterMusicTracks(): MusicTrack[] {
  const nowIso = new Date().toISOString();
  return [
    {
      id: 'preset-yt-lofi',
      source: 'youtube',
      url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
      embedId: 'jfKfPfyJRdk',
      isPlaylist: false,
      title: 'lofi hip hop radio 📚 beats to relax/study to',
      artistOrChannel: 'Lofi Girl',
      vibeTag: 'focus',
      isFavorite: true,
      authorRole: 'owner',
      createdAt: nowIso,
    },
    {
      id: 'preset-yt-rain',
      source: 'youtube',
      url: 'https://www.youtube.com/watch?v=rUxyKA_-grg',
      embedId: 'rUxyKA_-grg',
      isPlaylist: false,
      title: 'lofi hip hop radio 🌙 beats to sleep/chill to',
      artistOrChannel: 'Lofi Girl',
      vibeTag: 'rainy',
      isFavorite: true,
      authorRole: 'owner',
      createdAt: nowIso,
    },
    {
      id: 'preset-sp-lofi',
      source: 'spotify',
      url: 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn',
      embedId: '37i9dQZF1DWWQRwui0ExPn',
      isPlaylist: true,
      spotifyKind: 'playlist',
      title: 'Lofi Beats (Spotify Playlist)',
      artistOrChannel: 'Spotify',
      vibeTag: 'chill',
      isFavorite: true,
      authorRole: 'owner',
      createdAt: nowIso,
    },
  ];
}

/**
 * Every newly registered email account gets a completely fresh, empty board
 * with the default title 'Name'.
 */
export function createFreshAccountStore(options?: {
  email?: string;
  boardTitle?: string;
  nickname?: string;
}): CatyStoreData {
  const today = toLocalDateKey();
  const nowIso = new Date().toISOString();
  const sharing = createDefaultSharing(options?.email || '');
  if (options?.nickname?.trim()) {
    sharing.members[0].nickname = options.nickname.trim();
  }

  return {
    version: 3,
    hasSampleData: false,
    profile: {
      boardTitle: options?.boardTitle?.trim() || DEFAULT_BOARD_TITLE,
      catName: 'Mochi',
      partnerCatName: 'Latte',
      catStyle: 'hybrid',
      defaultTheme: 'sunlit',
      boardTexture: 'cork',
      fontStyle: 'rounded',
      monthlyBudget: 8000000,
      savingGoal: {
        title: 'Hũ tiết kiệm mục tiêu',
        targetAmount: 5000000,
        emoji: '🐷',
      },
      activeDecor: ['steaming-mug'],
      currency: 'VND',
    },
    sharing,
    syncedTrack: null,
    dayEntries: {
      [today]: {
        entryDate: today,
        mood: 'chill',
        weather: 'sunny',
        updatedAt: nowIso,
      },
    },
    photos: [],
    notes: [],
    reminders: [],
    finance: [],
    voiceMemos: [],
    tracks: getStarterMusicTracks(),
  };
}

export function createDefaultStore(): CatyStoreData {
  return createFreshAccountStore({
    boardTitle: DEFAULT_BOARD_TITLE,
    nickname: DEFAULT_OWNER_NICKNAME,
  });
}

export function createEmptyStore(
  baseProfile?: CatyStoreData['profile'],
  baseSharing?: CatyStoreData['sharing']
): CatyStoreData {
  const fresh = createFreshAccountStore();
  return {
    ...fresh,
    profile: baseProfile ?? fresh.profile,
    sharing: baseSharing ?? fresh.sharing,
  };
}

function normalizeUserKey(userIdentifier?: string | null): string {
  const effective =
    userIdentifier ||
    (typeof window !== 'undefined' ? getActiveLocalUserEmail() : null) ||
    'guest';
  const clean = effective.trim().toLowerCase();
  return clean.replace(/[^a-z0-9@._-]/g, '_') || 'guest';
}

function mergeById<T extends { id: string }>(primary: T[], secondary: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of secondary) {
    if (item?.id) map.set(item.id, item);
  }
  for (const item of primary) {
    if (item?.id) map.set(item.id, item);
  }
  return Array.from(map.values());
}

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function loadStore(
  userIdentifier?: string | null,
  initialAccountMeta?: { email?: string; boardTitle?: string; nickname?: string }
): Promise<CatyStoreData> {
  const userKey = normalizeUserKey(userIdentifier);
  const idbRecordKey = `store_${userKey}`;
  const localKey = `${LOCAL_META_PREFIX}${userKey}`;

  if (typeof window === 'undefined') {
    return createFreshAccountStore(initialAccountMeta);
  }

  let idbStore: CatyStoreData | null = null;
  const db = await openIdb();
  if (db) {
    const idbData = await new Promise<CatyStoreData | null>((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(idbRecordKey);
        req.onsuccess = () => resolve((req.result as CatyStoreData) ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    if (idbData && idbData.version) {
      idbStore = normalizeStoreData(idbData);
    }
  }

  let localStore: CatyStoreData | null = null;
  try {
    const raw = window.localStorage.getItem(localKey);
    if (raw) {
      const parsed = JSON.parse(raw) as CatyStoreData;
      if (parsed && parsed.version) {
        localStore = normalizeStoreData(parsed);
      }
    }
  } catch {
    // ignore parse errors
  }

  if (idbStore && localStore) {
    const base =
      localStore.photos.length >= idbStore.photos.length ? localStore : idbStore;
    return {
      ...base,
      dayEntries: { ...idbStore.dayEntries, ...localStore.dayEntries },
      photos: mergeById(
        localStore.photos.filter((p) => Boolean(p.dataUrl)),
        idbStore.photos.filter((p) => Boolean(p.dataUrl))
      ),
      notes: mergeById(localStore.notes, idbStore.notes),
      reminders: mergeById(localStore.reminders, idbStore.reminders),
      finance: mergeById(localStore.finance, idbStore.finance),
      voiceMemos: mergeById(
        localStore.voiceMemos ?? [],
        idbStore.voiceMemos ?? []
      ),
    };
  }

  if (idbStore) return idbStore;
  if (localStore) return localStore;

  const fresh = createFreshAccountStore({
    email: initialAccountMeta?.email || (userIdentifier ?? ''),
    boardTitle: initialAccountMeta?.boardTitle || DEFAULT_BOARD_TITLE,
    nickname: initialAccountMeta?.nickname || DEFAULT_OWNER_NICKNAME,
  });
  await saveStore(fresh, userIdentifier);
  return fresh;
}

export async function saveStore(
  data: CatyStoreData,
  userIdentifier?: string | null
): Promise<void> {
  if (typeof window === 'undefined') return;
  const userKey = normalizeUserKey(userIdentifier);
  const idbRecordKey = `store_${userKey}`;
  const localKey = `${LOCAL_META_PREFIX}${userKey}`;

  const db = await openIdb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(data, idbRecordKey);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  try {
    window.localStorage.setItem(localKey, JSON.stringify(data));
  } catch {
    try {
      const slim: CatyStoreData = {
        ...data,
        photos: data.photos.slice(0, 6),
      };
      window.localStorage.setItem(localKey, JSON.stringify(slim));
    } catch {
      // Ignore quota errors
    }
  }
}

export function ensureDayEntry(
  store: CatyStoreData,
  dateKey: string
): DayEntry {
  return (
    store.dayEntries[dateKey] ?? {
      entryDate: dateKey,
      mood: 'chill',
      weather: 'sunny',
      updatedAt: new Date().toISOString(),
    }
  );
}

const DEFAULT_PUBLIC_SUPABASE_URL = 'https://uzrhwosbjcmuybttdxdh.supabase.co';
const DEFAULT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_I5ERlQtXKiNvCd7beRjT9Q_bpoSN2K9';

/**
 * Infrastructure configuration comes from environment variables (.env.local / Vercel),
 * falling back to the project's public Supabase publishable endpoint so Vercel builds
 * always connect even if env vars were not manually pasted before the first deploy.
 */
export function loadCloudConfig(): CloudConfig {
  const envUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_PUBLIC_SUPABASE_URL;
  const envAnon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const envSpotify = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '';

  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(DEV_CLOUD_OVERRIDE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CloudConfig;
        return {
          supabaseUrl: parsed.supabaseUrl || envUrl,
          supabaseAnonKey: parsed.supabaseAnonKey || envAnon,
          spotifyClientId: parsed.spotifyClientId || envSpotify,
        };
      }
    } catch {
      // ignore
    }
  }

  return {
    supabaseUrl: envUrl,
    supabaseAnonKey: envAnon,
    spotifyClientId: envSpotify,
  };
}

export function saveDevCloudConfig(
  actorEmail: string | null | undefined,
  config: CloudConfig
): void {
  if (typeof window === 'undefined' || !isDevAdminEmail(actorEmail)) return;
  window.localStorage.setItem(DEV_CLOUD_OVERRIDE_KEY, JSON.stringify(config));
}

// --- Local Multi-Account Registry (pre-seeded with Dev Admin account) ---

function ensureDevAccountSeeded(
  accounts: Record<string, LocalUserAccount>
): Record<string, LocalUserAccount> {
  if (!accounts[DEV_ADMIN_EMAIL]) {
    accounts[DEV_ADMIN_EMAIL] = {
      email: DEV_ADMIN_EMAIL,
      passwordHash: DEV_ADMIN_PASSWORD_HASH,
      boardTitle: DEFAULT_BOARD_TITLE,
      nickname: DEFAULT_OWNER_NICKNAME,
      verified: true,
      createdAt: '2026-11-20T00:00:00.000Z',
    };
  }
  return accounts;
}

export function loadLocalAccounts(): Record<string, LocalUserAccount> {
  if (typeof window === 'undefined') {
    return ensureDevAccountSeeded({});
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, LocalUserAccount>) : {};
    return ensureDevAccountSeeded(parsed);
  } catch {
    return ensureDevAccountSeeded({});
  }
}

export function saveLocalAccounts(accounts: Record<string, LocalUserAccount>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // ignore
  }
}

export function getActiveLocalUserEmail(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return (
      window.localStorage.getItem(ACTIVE_LOCAL_USER_KEY) ||
      window.sessionStorage.getItem(ACTIVE_LOCAL_USER_KEY)
    );
  } catch {
    return null;
  }
}

export function setActiveLocalUserEmail(
  email: string | null,
  remember = true
): void {
  if (typeof window === 'undefined') return;
  try {
    if (!email) {
      window.localStorage.removeItem(ACTIVE_LOCAL_USER_KEY);
      window.sessionStorage.removeItem(ACTIVE_LOCAL_USER_KEY);
      return;
    }
    const clean = email.trim().toLowerCase();
    window.sessionStorage.setItem(ACTIVE_LOCAL_USER_KEY, clean);
    if (remember) {
      window.localStorage.setItem(ACTIVE_LOCAL_USER_KEY, clean);
    } else {
      window.localStorage.removeItem(ACTIVE_LOCAL_USER_KEY);
    }
  } catch {
    // ignore storage errors
  }
}
