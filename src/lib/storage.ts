import { toLocalDateKey } from './date.ts';
import {
  DEV_ADMIN_EMAIL,
  DEV_ADMIN_PASSWORD_HASH,
  isDevAdminEmail,
} from './security.ts';
import {
  createDefaultSharing,
  DEFAULT_BOARD_TITLE,
  DEFAULT_OWNER_NICKNAME,
  normalizeStoreData,
} from './sharing.ts';
import type {
  CatyStoreData,
  CloudConfig,
  DayEntry,
  DayPhoto,
  MusicTrack,
  VoiceMemo,
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

interface StoredEnvelope {
  __catyEnvelopeV1: true;
  savedAt: number;
  data: CatyStoreData;
}

function unwrapStoredRecord(raw: unknown): {
  data: CatyStoreData;
  savedAt: number;
} | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<StoredEnvelope> & Partial<CatyStoreData>;
  if (candidate.__catyEnvelopeV1 && candidate.data && candidate.data.version) {
    return {
      data: normalizeStoreData(candidate.data),
      savedAt: typeof candidate.savedAt === 'number' ? candidate.savedAt : 0,
    };
  }
  if (typeof candidate.version === 'number') {
    return {
      data: normalizeStoreData(candidate),
      savedAt: 0,
    };
  }
  return null;
}

/**
 * Strips multi-megabyte base64 image/audio payloads before writing to `localStorage`
 * when IndexedDB already holds the full binary payloads. Reduces main-thread JSON
 * serialization from megabytes to ~15 KB and prevents 5MB localStorage quota overflow.
 */
export function stripHeavyMediaForLocalStorage(
  data: CatyStoreData
): CatyStoreData {
  return {
    ...data,
    photos: data.photos.map((p) => ({
      ...p,
      dataUrl: p.dataUrl.startsWith('data:') ? '' : p.dataUrl,
      comments: p.comments?.map((c) =>
        c.id === '__polaroid_back_voice__' && c.text.startsWith('data:')
          ? { ...c, text: '__idb_audio__' }
          : c
      ),
    })),
    voiceMemos: (data.voiceMemos ?? []).map((v) => ({
      ...v,
      dataUrl: v.dataUrl.startsWith('data:') ? '' : v.dataUrl,
    })),
  };
}

/**
 * Re-hydrates full binary `dataUrl`s from IndexedDB (`mediaStore`) onto a newer
 * metadata snapshot (`metaStore`), preserving latest captions, reactions, deletions,
 * notes, reminders, and finance entries without losing heavy media blobs.
 */
export function mergeStoresPreservingMedia(
  metaStore: CatyStoreData,
  mediaStore: CatyStoreData
): CatyStoreData {
  const mediaPhotosById = new Map<string, DayPhoto>();
  for (const p of mediaStore.photos) {
    if (p?.id) mediaPhotosById.set(p.id, p);
  }

  const mediaVoicesById = new Map<string, VoiceMemo>();
  for (const v of mediaStore.voiceMemos ?? []) {
    if (v?.id) mediaVoicesById.set(v.id, v);
  }

  const hydratedPhotos: DayPhoto[] = metaStore.photos
    .map((p) => {
      const mediaMatch = mediaPhotosById.get(p.id);
      const restoredUrl = p.dataUrl || mediaMatch?.dataUrl || '';
      const mediaBackVoice = mediaMatch?.comments?.find(
        (c) => c.id === '__polaroid_back_voice__'
      )?.text;
      const restoredComments = p.comments?.map((c) =>
        c.id === '__polaroid_back_voice__' &&
        (c.text === '__idb_audio__' || !c.text) &&
        mediaBackVoice
          ? { ...c, text: mediaBackVoice }
          : c
      );
      return {
        ...p,
        dataUrl: restoredUrl,
        comments: restoredComments,
      };
    })
    .filter((p) => Boolean(p.dataUrl));

  const hydratedVoices: VoiceMemo[] = (metaStore.voiceMemos ?? [])
    .map((v) => ({
      ...v,
      dataUrl: v.dataUrl || mediaVoicesById.get(v.id)?.dataUrl || '',
    }))
    .filter((v) => Boolean(v.dataUrl));

  return {
    ...metaStore,
    dayEntries: { ...mediaStore.dayEntries, ...metaStore.dayEntries },
    photos: hydratedPhotos,
    voiceMemos: hydratedVoices,
  };
}

let cachedDbPromise: Promise<IDBDatabase | null> | null = null;

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  if (cachedDbPromise) return cachedDbPromise;

  cachedDbPromise = new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onclose = () => {
          cachedDbPromise = null;
        };
        db.onversionchange = () => {
          db.close();
          cachedDbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        cachedDbPromise = null;
        resolve(null);
      };
    } catch {
      cachedDbPromise = null;
      resolve(null);
    }
  });
  return cachedDbPromise;
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

  let idbUnwrapped: { data: CatyStoreData; savedAt: number } | null = null;
  const db = await openIdb();
  if (db) {
    const idbRaw = await new Promise<unknown>((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(idbRecordKey);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    idbUnwrapped = unwrapStoredRecord(idbRaw);
  }

  let localUnwrapped: { data: CatyStoreData; savedAt: number } | null = null;
  try {
    const raw = window.localStorage.getItem(localKey);
    if (raw) {
      localUnwrapped = unwrapStoredRecord(JSON.parse(raw));
    }
  } catch {
    // ignore parse errors
  }

  if (idbUnwrapped && localUnwrapped) {
    // If IndexedDB is at least as fresh as localStorage, return IndexedDB directly (full media intact)
    if (
      idbUnwrapped.savedAt > 0 &&
      idbUnwrapped.savedAt >= localUnwrapped.savedAt
    ) {
      return idbUnwrapped.data;
    }
    // Otherwise merge newer metadata from localStorage while preserving binary media from IndexedDB
    return mergeStoresPreservingMedia(localUnwrapped.data, idbUnwrapped.data);
  }

  if (idbUnwrapped) return idbUnwrapped.data;
  if (localUnwrapped) {
    return {
      ...localUnwrapped.data,
      photos: localUnwrapped.data.photos.filter((p) => Boolean(p.dataUrl)),
      voiceMemos: (localUnwrapped.data.voiceMemos ?? []).filter((v) =>
        Boolean(v.dataUrl)
      ),
    };
  }

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
  const savedAt = Date.now();

  // Clear any pending debounced save for this same user since we are saving now
  const existingPending = pendingSaves.get(userKey);
  if (existingPending) {
    clearTimeout(existingPending.timer);
    pendingSaves.delete(userKey);
  }

  let idbSavedOk = false;
  const db = await openIdb();
  if (db) {
    idbSavedOk = await new Promise<boolean>((resolve) => {
      try {
        const envelope: StoredEnvelope = {
          __catyEnvelopeV1: true,
          savedAt,
          data,
        };
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(envelope, idbRecordKey);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  try {
    const localPayload: StoredEnvelope = {
      __catyEnvelopeV1: true,
      savedAt,
      data: idbSavedOk ? stripHeavyMediaForLocalStorage(data) : data,
    };
    window.localStorage.setItem(localKey, JSON.stringify(localPayload));
  } catch {
    try {
      const slimPayload: StoredEnvelope = {
        __catyEnvelopeV1: true,
        savedAt,
        data: stripHeavyMediaForLocalStorage({
          ...data,
          photos: data.photos.slice(0, 20),
        }),
      };
      window.localStorage.setItem(localKey, JSON.stringify(slimPayload));
    } catch {
      // Ignore quota errors; IndexedDB holds full store
    }
  }
}

interface PendingSaveEntry {
  timer: ReturnType<typeof setTimeout>;
  data: CatyStoreData;
  userIdentifier?: string | null;
}

const pendingSaves = new Map<string, PendingSaveEntry>();
let lifecycleFlushBound = false;

function ensureLifecycleFlushListener() {
  if (lifecycleFlushBound || typeof window === 'undefined') return;
  lifecycleFlushBound = true;

  const flushSyncMetadataAndAsyncIdb = () => {
    for (const [userKey, entry] of pendingSaves.entries()) {
      clearTimeout(entry.timer);
      pendingSaves.delete(userKey);
      const localKey = `${LOCAL_META_PREFIX}${userKey}`;
      const savedAt = Date.now();
      try {
        const fastEnvelope: StoredEnvelope = {
          __catyEnvelopeV1: true,
          savedAt,
          data: stripHeavyMediaForLocalStorage(entry.data),
        };
        window.localStorage.setItem(localKey, JSON.stringify(fastEnvelope));
      } catch {
        // ignore
      }
      void saveStore(entry.data, entry.userIdentifier);
    }
  };

  window.addEventListener('pagehide', flushSyncMetadataAndAsyncIdb);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushSyncMetadataAndAsyncIdb();
    }
  });
}

/**
 * Coalesces rapid consecutive state updates (e.g. typing, checking items) into a single
 * non-blocking background persistence write, with automatic flush on tab hide/close.
 */
export function scheduleSaveStore(
  data: CatyStoreData,
  userIdentifier?: string | null,
  delayMs = 360
): void {
  if (typeof window === 'undefined') return;
  ensureLifecycleFlushListener();
  const userKey = normalizeUserKey(userIdentifier);
  const prev = pendingSaves.get(userKey);
  if (prev) {
    clearTimeout(prev.timer);
  }
  const timer = setTimeout(() => {
    pendingSaves.delete(userKey);
    void saveStore(data, userIdentifier);
  }, delayMs);
  pendingSaves.set(userKey, { timer, data, userIdentifier });
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
