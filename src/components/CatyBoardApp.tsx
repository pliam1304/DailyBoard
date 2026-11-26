'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Camera,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Flame,
  Heart,
  History,
  LayoutGrid,
  Mic,
  Moon,
  MoonStar,
  Music,
  NotebookPen,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { RealtimeChannel, User } from '@supabase/supabase-js';
import {
  formatDisplayDateVi,
  formatShortDate,
  formatVnd,
  shiftDateKey,
  toLocalDateKey,
} from '@/lib/date';
import { calculateStreak } from '@/lib/prompts';
import { registerServiceWorker, sendLocalNotification } from '@/lib/pwa';
import {
  computeFishPoints,
  getRemindersForDateWithRecurrence,
  pickThrowbackPhoto,
  type SearchHit,
} from '@/lib/search';
import { enqueueOutboxOp, type OutboxOp } from '@/lib/outbox';
import {
  createUuid,
  DEFAULT_BOARD_TITLE,
  DEFAULT_OWNER_NICKNAME,
  getMemberHeart,
  getMemberNickname,
  HEART_BADGE_META,
  inviteSecondPerson,
  isSharedDuo,
  renameMember,
  revertToSoloBoard,
} from '@/lib/sharing';
import {
  DEV_ADMIN_PASSWORD_HASH,
  hashJournalPin,
  isDevAdminEmail,
  verifyJournalPin,
} from '@/lib/security';
import {
  createEmptyStore,
  createFreshAccountStore,
  ensureDayEntry,
  getActiveLocalUserEmail,
  loadCloudConfig,
  loadLocalAccounts,
  loadStore,
  saveDevCloudConfig,
  saveLocalAccounts,
  saveStore,
  setActiveLocalUserEmail,
} from '@/lib/storage';
import {
  acceptCloudInvitation,
  createCloudInvitation,
  ensureCloudBoard,
  fetchPendingInvitesForMe,
  flushOutboxToSupabase,
  getSupabaseClient,
  pullStoreFromSupabase,
  pushStoreToSupabase,
  removePartnerInCloud,
  subscribeBoardRealtime,
  syncMemberNicknamesToSupabase,
  type OnlineMemberPresence,
} from '@/lib/supabaseSync';
import { AuthScreen, type SignupPayload } from '@/components/auth/AuthScreen';
import { CatCompanion } from '@/components/cat/CatCompanion';
import { FocusPomodoroCard } from '@/components/cat/FocusPomodoroCard';
import { LofiPlayer } from '@/components/music/LofiPlayer';
import { PolaroidGallery } from '@/components/board/PolaroidGallery';
import { DailyPromptCard } from '@/components/board/DailyPromptCard';
import { NotesAndLetters } from '@/components/board/NotesAndLetters';
import { VoiceMemoCard } from '@/components/board/VoiceMemoCard';
import { RemindersPanel } from '@/components/board/RemindersPanel';
import { FinancePanel } from '@/components/board/FinancePanel';
import { SearchCommandModal } from '@/components/board/SearchCommandModal';
import { ScrapbookCalendar } from '@/components/calendar/ScrapbookCalendar';
import { DailySnapshotModal } from '@/components/snapshot/DailySnapshotModal';
import { EndOfDayWizardModal } from '@/components/snapshot/EndOfDayWizardModal';
import { SyncSettingsModal } from '@/components/sync/SyncSettingsModal';
import { SharedBoardModal } from '@/components/sync/SharedBoardModal';
import {
  PressedFlower,
  PuffyHeartSticker,
  PuffyWord,
} from '@/components/decor/ScrapbookDecor';
import { ambientEngine } from '@/lib/audio';
import type {
  BoardInvitation,
  BoardTexture,
  CatDecorId,
  CatMood,
  CatyStoreData,
  CloudConfig,
  DayPhoto,
  FinanceEntry,
  HeartColor,
  MemberRole,
  MusicTrack,
  NoteItem,
  ReminderItem,
  SavingGoal,
  ThemeMode,
  UserProfile,
  VoiceMemo,
  WeatherType,
} from '@/types/catyboard';

type BoardTab =
  | 'overview'
  | 'photos'
  | 'notes'
  | 'reminders'
  | 'finance'
  | 'calendar'
  | 'music';

const SURFACE_CLASS_BY_TEXTURE: Record<BoardTexture, string> = {
  cork: 'corkboard-surface',
  linen: 'surface-linen',
  'grid-paper': 'surface-grid-paper',
  walnut: 'surface-walnut',
};

export function CatyBoardApp() {
  const [cloudConfig, setCloudConfig] = useState<CloudConfig>(() => loadCloudConfig());
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [localUserEmail, setLocalUserEmail] = useState<string | null>(null);

  const [store, setStore] = useState<CatyStoreData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => toLocalDateKey());
  const [theme, setTheme] = useState<ThemeMode>('sunlit');
  const [activeTab, setActiveTab] = useState<BoardTab>('overview');
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [windDownOpen, setWindDownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  const [syncStatus, setSyncStatus] = useState<string>('Đã đồng bộ ✓');
  const [incomingInvites, setIncomingInvites] = useState<BoardInvitation[]>([]);
  const [urlInviteCode, setUrlInviteCode] = useState<string>('');
  const [onlineMembers, setOnlineMembers] = useState<OnlineMemberPresence[]>([]);
  const [heartToast, setHeartToast] = useState<string | null>(null);

  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const notifiedRemindersRef = useRef<Set<string>>(new Set());
  const hydratedUserIdRef = useRef<string | null>(null);
  const rememberLoginRef = useRef<boolean>(true);
  const pendingSignupMetaRef = useRef<{
    boardTitle: string;
    nickname: string;
  } | null>(null);

  const activeAccountEmail = cloudUser?.email?.toLowerCase() || localUserEmail;

  const applyLoadedStore = useCallback(
    (loaded: CatyStoreData, emailKey: string | null) => {
      setStore(loaded);
      setTheme(loaded.profile.defaultTheme);
      if (loaded.syncedTrack) {
        setActiveTrackId(loaded.syncedTrack.id);
      } else if (loaded.tracks.length > 0) {
        setActiveTrackId(loaded.tracks[0].id);
      }
      if (emailKey) {
        setActiveLocalUserEmail(emailKey, rememberLoginRef.current);
        void saveStore(loaded, emailKey);
      }
    },
    []
  );

  const hydrateCloudUserBoard = useCallback(
    async (user: User, customInitialMeta?: { boardTitle?: string; nickname?: string }) => {
      const client = getSupabaseClient(cloudConfig);
      if (!client) return;

      hydratedUserIdRef.current = user.id;
      const emailKey = (user.email || user.id).toLowerCase();
      setCloudUser(user);
      setLocalUserEmail(emailKey);
      setActiveLocalUserEmail(emailKey, rememberLoginRef.current);
      setSyncStatus('Đang tải dữ liệu...');

      const metaFromAuth = user.user_metadata as
        | { board_title?: string; nickname?: string }
        | undefined;
      const initialTitle =
        customInitialMeta?.boardTitle ||
        pendingSignupMetaRef.current?.boardTitle ||
        metaFromAuth?.board_title ||
        DEFAULT_BOARD_TITLE;
      const initialNickname =
        customInitialMeta?.nickname ||
        pendingSignupMetaRef.current?.nickname ||
        metaFromAuth?.nickname ||
        DEFAULT_OWNER_NICKNAME;

      const localBase = await loadStore(emailKey, {
        email: emailKey,
        boardTitle: initialTitle,
        nickname: initialNickname,
      });
      applyLoadedStore(localBase, emailKey);

      try {
        const pending = await fetchPendingInvitesForMe(client);
        setIncomingInvites(pending);

        const boardId =
          localBase.sharing.boardId || (await ensureCloudBoard(client, localBase));
        const baseWithBoardId: CatyStoreData = {
          ...localBase,
          sharing: {
            ...localBase.sharing,
            boardId,
          },
        };
        applyLoadedStore(baseWithBoardId, emailKey);

        await flushOutboxToSupabase(
          client,
          user,
          boardId,
          baseWithBoardId.sharing.activeRole
        );
        const pulled = await pullStoreFromSupabase(
          client,
          user,
          boardId,
          baseWithBoardId
        );
        applyLoadedStore(pulled, emailKey);
        setSyncStatus('Đã đồng bộ ✓');
      } catch {
        setSyncStatus('Đã lưu trên máy ✓');
      } finally {
        pendingSignupMetaRef.current = null;
      }
    },
    [cloudConfig, applyLoadedStore]
  );

  // Boot: register Service Worker, check ?invite=CODE, and restore persistent login session
  useEffect(() => {
    registerServiceWorker();
    if (typeof window !== 'undefined') {
      const code = new URLSearchParams(window.location.search).get('invite');
      if (code) setUrlInviteCode(code.trim());
    }

    let cancelled = false;

    void (async () => {
      // 1. Immediately restore remembered personal session from local storage / IndexedDB
      const savedEmail = getActiveLocalUserEmail();
      if (savedEmail) {
        const accounts = loadLocalAccounts();
        const localMeta = accounts[savedEmail];
        setLocalUserEmail(savedEmail);
        const loaded = await loadStore(savedEmail, {
          email: savedEmail,
          boardTitle: localMeta?.boardTitle || DEFAULT_BOARD_TITLE,
          nickname: localMeta?.nickname || DEFAULT_OWNER_NICKNAME,
        });
        if (!cancelled) {
          applyLoadedStore(loaded, savedEmail);
          setAuthChecking(false);
        }
      }

      // 2. Restore or refresh cloud session from Supabase Auth storage
      const client = getSupabaseClient(cloudConfig);
      if (client) {
        try {
          const { data: sessionData } = await client.auth.getSession();
          const sessionUser = sessionData?.session?.user;
          if (sessionUser && !cancelled) {
            await hydrateCloudUserBoard(sessionUser);
          }
        } catch {
          // Offline or token expired: keep remembered local session intact
        }
      }

      if (!cancelled) {
        setAuthChecking(false);
      }
    })();

    const client = getSupabaseClient(cloudConfig);
    if (client) {
      const { data: sub } = client.auth.onAuthStateChange((event, session) => {
        if (
          session?.user &&
          hydratedUserIdRef.current !== session.user.id
        ) {
          void hydrateCloudUserBoard(session.user);
        } else if (event === 'SIGNED_OUT') {
          hydratedUserIdRef.current = null;
          setCloudUser(null);
          setOnlineMembers([]);
          setIncomingInvites([]);
        }
      });

      return () => {
        cancelled = true;
        sub.subscription.unsubscribe();
      };
    }

    return () => {
      cancelled = true;
    };
  }, [cloudConfig, hydrateCloudUserBoard, applyLoadedStore]);

  // Global Cmd+K / Ctrl+K shortcut for instant search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const updateStore = useCallback(
    (updater: (prev: CatyStoreData) => CatyStoreData) => {
      setStore((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        void saveStore(next, activeAccountEmail);
        return next;
      });
    },
    [activeAccountEmail]
  );

  const flushCloudQueue = useCallback(
    async (user: User, boardId: string, role: MemberRole) => {
      const client = getSupabaseClient(cloudConfig);
      if (!client) return;
      setSyncStatus('Đang đồng bộ...');
      const res = await flushOutboxToSupabase(client, user, boardId, role);
      setSyncStatus(
        res.remaining > 0
          ? 'Đã lưu trên máy ✓'
          : 'Đã đồng bộ ✓'
      );
    },
    [cloudConfig]
  );

  const queueSync = useCallback(
    (op: OutboxOp) => {
      enqueueOutboxOp(op);
      if (!cloudUser || !store) return;
      if (store.sharing.boardId) {
        void flushCloudQueue(
          cloudUser,
          store.sharing.boardId,
          store.sharing.activeRole
        );
        return;
      }
      // If boardId was not yet initialized, ensure it in background and flush
      const client = getSupabaseClient(cloudConfig);
      if (!client) return;
      void ensureCloudBoard(client, store)
        .then((newBoardId) => {
          updateStore((prev) => ({
            ...prev,
            sharing: { ...prev.sharing, boardId: newBoardId },
          }));
          return flushCloudQueue(
            cloudUser,
            newBoardId,
            store.sharing.activeRole
          );
        })
        .catch(() => {
          setSyncStatus('Đã lưu trên máy ✓');
        });
    },
    [cloudUser, store, cloudConfig, flushCloudQueue, updateStore]
  );

  useEffect(() => {
    const onOnline = () => {
      if (cloudUser && store?.sharing.boardId) {
        void flushCloudQueue(
          cloudUser,
          store.sharing.boardId,
          store.sharing.activeRole
        );
      }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [cloudUser, store?.sharing.boardId, store?.sharing.activeRole, flushCloudQueue]);

  // Continuous Realtime subscription (DB changes + Presence + Heart Ping)
  const cloudBoardId = store?.sharing.boardId;
  const myNickname = store
    ? getMemberNickname(store.sharing, store.sharing.activeRole)
    : DEFAULT_OWNER_NICKNAME;
  const myRole = store?.sharing.activeRole || 'owner';

  useEffect(() => {
    if (!cloudUser || !cloudBoardId) return;
    const client = getSupabaseClient(cloudConfig);
    if (!client) return;

    let pullDebounce: ReturnType<typeof setTimeout> | null = null;
    const channel = subscribeBoardRealtime(
      client,
      cloudBoardId,
      {
        userId: cloudUser.id,
        nickname: myNickname,
        role: myRole,
      },
      {
        onDataChanged: () => {
          if (pullDebounce) clearTimeout(pullDebounce);
          pullDebounce = setTimeout(() => {
            setStore((current) => {
              if (!current) return current;
              void pullStoreFromSupabase(
                client,
                cloudUser,
                cloudBoardId,
                current
              ).then((pulled) => {
                applyLoadedStore(
                  pulled,
                  (cloudUser.email || cloudUser.id).toLowerCase()
                );
                setSyncStatus('Vừa đồng bộ realtime ✓');
              });
              return current;
            });
          }, 350);
        },
        onPresenceChange: (online) => {
          setOnlineMembers(online);
        },
        onHeartPing: (fromNickname) => {
          ambientEngine.playPurrChime();
          const msg = `${fromNickname} vừa gửi cho bạn một trái tim ♡`;
          setHeartToast(msg);
          sendLocalNotification('💌 Bảng Ghim Lofi', msg);
          setTimeout(() => setHeartToast(null), 3500);
        },
      }
    );

    realtimeChannelRef.current = channel;
    return () => {
      if (pullDebounce) clearTimeout(pullDebounce);
      realtimeChannelRef.current = null;
      void client.removeChannel(channel);
    };
  }, [cloudUser, cloudBoardId, cloudConfig, myNickname, myRole, applyLoadedStore]);

  // Minute-level local reminder notification scheduler
  useEffect(() => {
    if (!store) return;
    const checkDueReminders = () => {
      const now = new Date();
      const today = toLocalDateKey(now);
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      const todaysList = getRemindersForDateWithRecurrence(store.reminders, today);
      for (const rem of todaysList) {
        if (
          !rem.completed &&
          rem.dueTime === hhmm &&
          !notifiedRemindersRef.current.has(rem.id)
        ) {
          notifiedRemindersRef.current.add(rem.id);
          ambientEngine.playPurrChime();
          sendLocalNotification(
            `🐾 ${store.profile.catName} nhắc bạn:`,
            rem.title
          );
        }
      }
    };
    const timer = setInterval(checkDueReminders, 30000);
    return () => clearInterval(timer);
  }, [store]);

  const activeTrack = useMemo(() => {
    if (!store) return null;
    if (activeTrackId) {
      const fromList = store.tracks.find((t) => t.id === activeTrackId);
      if (fromList) return fromList;
      if (store.syncedTrack?.id === activeTrackId) return store.syncedTrack;
    }
    return store.syncedTrack ?? null;
  }, [store, activeTrackId]);

  // --- User Auth Flows (Email Login + Registration + Gmail OTP Verification + Fresh Board Creation) ---

  const handleUserLogin = async (
    email: string,
    password: string,
    remember = true
  ) => {
    rememberLoginRef.current = remember;
    const client = getSupabaseClient(cloudConfig);
    if (client) {
      const res = await client.auth.signInWithPassword({ email, password });
      if (!res.error && res.data.user) {
        const accounts = loadLocalAccounts();
        const pwHash = await hashJournalPin(password);
        accounts[email] = {
          email,
          passwordHash: pwHash,
          boardTitle:
            accounts[email]?.boardTitle ||
            (res.data.user.user_metadata?.board_title as string | undefined) ||
            DEFAULT_BOARD_TITLE,
          nickname:
            accounts[email]?.nickname ||
            (res.data.user.user_metadata?.nickname as string | undefined) ||
            DEFAULT_OWNER_NICKNAME,
          verified: true,
          createdAt: accounts[email]?.createdAt || new Date().toISOString(),
        };
        saveLocalAccounts(accounts);

        if (urlInviteCode) {
          try {
            const joinedId = await acceptCloudInvitation(client, urlInviteCode);
            const base = createFreshAccountStore({ email });
            const pulled = await pullStoreFromSupabase(
              client,
              res.data.user,
              joinedId,
              base
            );
            setCloudUser(res.data.user);
            setLocalUserEmail(email);
            applyLoadedStore(pulled, email);
            setUrlInviteCode('');
            return;
          } catch {
            // Fall through to normal personal board load
          }
        }
        await hydrateCloudUserBoard(res.data.user);
        return;
      }

      // If Dev Admin logs into a fresh Supabase instance for the first time, verify dev hash & bootstrap
      if (
        isDevAdminEmail(email) &&
        (await verifyJournalPin(password, DEV_ADMIN_PASSWORD_HASH))
      ) {
        const signUpRes = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              board_title: DEFAULT_BOARD_TITLE,
              nickname: DEFAULT_OWNER_NICKNAME,
            },
          },
        });
        if (!signUpRes.error && signUpRes.data.session && signUpRes.data.user) {
          await hydrateCloudUserBoard(signUpRes.data.user);
          return;
        }
      } else if (res.error && !loadLocalAccounts()[email]) {
        throw res.error;
      }
    }

    // Local account login (including pre-seeded Dev Admin account huynhphuclam147@gmail.com)
    const accounts = loadLocalAccounts();
    const acc = accounts[email];
    if (!acc) {
      throw new Error('Email này chưa được đăng ký.');
    }
    const ok = await verifyJournalPin(password, acc.passwordHash);
    if (!ok) {
      throw new Error('Mật khẩu chưa chính xác.');
    }
    if (!acc.verified) {
      throw new Error('Tài khoản chưa xác nhận email.');
    }
    setLocalUserEmail(email);
    setActiveLocalUserEmail(email, remember);
    const loaded = await loadStore(email, {
      email,
      boardTitle: acc.boardTitle || DEFAULT_BOARD_TITLE,
      nickname: acc.nickname || DEFAULT_OWNER_NICKNAME,
    });
    applyLoadedStore(loaded, email);
  };

  const handleSignupRequestOtp = async (
    payload: SignupPayload
  ): Promise<{ autoLoggedIn: boolean; demoCode?: string }> => {
    pendingSignupMetaRef.current = {
      boardTitle: payload.boardTitle || DEFAULT_BOARD_TITLE,
      nickname: payload.nickname || DEFAULT_OWNER_NICKNAME,
    };

    const client = getSupabaseClient(cloudConfig);
    if (client) {
      const redirectOrigin =
        typeof window !== 'undefined' ? window.location.origin : undefined;
      const res = await client.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          emailRedirectTo: redirectOrigin,
          data: {
            board_title: payload.boardTitle || DEFAULT_BOARD_TITLE,
            nickname: payload.nickname || DEFAULT_OWNER_NICKNAME,
          },
        },
      });
      if (res.error) {
        const rawMsg = res.error.message || '';
        if (/rate limit/i.test(rawMsg)) {
          throw new Error(
            'Máy chủ gửi mail miễn phí của Supabase đang chạm giới hạn gửi/giờ. Vui lòng kiểm tra hộp thư (cả mục Thư rác/Spam) hoặc tắt "Confirm email" trong Supabase Authentication → Providers → Email để đăng ký vào ngay.'
          );
        }
        throw res.error;
      }

      if (
        res.data.user &&
        Array.isArray(res.data.user.identities) &&
        res.data.user.identities.length === 0
      ) {
        throw new Error(
          'Email này đã được đăng ký trước đó. Hãy chuyển sang tab Đăng nhập nhé!'
        );
      }

      // Always initialize a brand-new blank board for this newly registered email
      const freshBoard = createFreshAccountStore({
        email: payload.email,
        boardTitle: payload.boardTitle || DEFAULT_BOARD_TITLE,
        nickname: payload.nickname || DEFAULT_OWNER_NICKNAME,
      });
      await saveStore(freshBoard, payload.email);

      if (res.data.session && res.data.user) {
        await hydrateCloudUserBoard(res.data.user, {
          boardTitle: payload.boardTitle || DEFAULT_BOARD_TITLE,
          nickname: payload.nickname || DEFAULT_OWNER_NICKNAME,
        });
        return { autoLoggedIn: true };
      }

      return { autoLoggedIn: false };
    }

    // Local registration with simulated 6-digit Gmail OTP verification
    const accounts = loadLocalAccounts();
    if (accounts[payload.email]?.verified) {
      throw new Error('Email này đã được đăng ký rồi. Bạn hãy chuyển sang Đăng nhập nhé!');
    }
    const demoCode = String(Math.floor(100000 + Math.random() * 900000));
    const pwHash = await hashJournalPin(payload.password);
    accounts[payload.email] = {
      email: payload.email,
      passwordHash: pwHash,
      boardTitle: payload.boardTitle || DEFAULT_BOARD_TITLE,
      nickname: payload.nickname || DEFAULT_OWNER_NICKNAME,
      verified: false,
      pendingOtp: demoCode,
      createdAt: new Date().toISOString(),
    };
    saveLocalAccounts(accounts);
    return { autoLoggedIn: false, demoCode };
  };

  const handleVerifyOtp = async (
    email: string,
    otpCode: string,
    passwordFallback?: string
  ) => {
    const client = getSupabaseClient(cloudConfig);
    if (client) {
      let verifiedUser: User | null = null;

      if (otpCode === '__LINK_CONFIRMED__') {
        const current = await client.auth.getUser();
        if (current.data.user) {
          verifiedUser = current.data.user;
        } else if (passwordFallback) {
          const loginAfterLink = await client.auth.signInWithPassword({
            email,
            password: passwordFallback,
          });
          if (!loginAfterLink.error && loginAfterLink.data.user) {
            verifiedUser = loginAfterLink.data.user;
          }
        }
        if (!verifiedUser) {
          throw new Error(
            'Chưa nhận được xác nhận từ Gmail. Hãy mở thư từ Supabase (kiểm tra cả mục Thư rác / Spam), bấm vào link "Confirm your mail" rồi thử lại nhé!'
          );
        }
      } else {
        const signupVerify = await client.auth.verifyOtp({
          email,
          token: otpCode,
          type: 'signup',
        });

        if (!signupVerify.error && signupVerify.data.user) {
          verifiedUser = signupVerify.data.user;
        } else {
          const emailVerify = await client.auth.verifyOtp({
            email,
            token: otpCode,
            type: 'email',
          });
          if (!emailVerify.error && emailVerify.data.user) {
            verifiedUser = emailVerify.data.user;
          } else if (passwordFallback) {
            const loginFallback = await client.auth.signInWithPassword({
              email,
              password: passwordFallback,
            });
            if (!loginFallback.error && loginFallback.data.user) {
              verifiedUser = loginFallback.data.user;
            }
          }
        }
      }

      if (!verifiedUser) {
        throw new Error('Mã xác thực Gmail chưa chính xác hoặc đã hết hạn.');
      }

      const meta = pendingSignupMetaRef.current ?? {
        boardTitle: DEFAULT_BOARD_TITLE,
        nickname: DEFAULT_OWNER_NICKNAME,
      };
      const freshBoard = createFreshAccountStore({
        email,
        boardTitle: meta.boardTitle,
        nickname: meta.nickname,
      });
      await saveStore(freshBoard, email);

      if (urlInviteCode) {
        try {
          const joinedId = await acceptCloudInvitation(client, urlInviteCode);
          const pulled = await pullStoreFromSupabase(
            client,
            verifiedUser,
            joinedId,
            freshBoard
          );
          setCloudUser(verifiedUser);
          setLocalUserEmail(email);
          applyLoadedStore(pulled, email);
          setUrlInviteCode('');
          return;
        } catch {
          // Proceed to create own fresh board
        }
      }

      await hydrateCloudUserBoard(verifiedUser, meta);
      return;
    }

    // Local verification creates a brand-new blank board titled 'Name'
    const accounts = loadLocalAccounts();
    const acc = accounts[email];
    if (!acc || acc.pendingOtp !== otpCode.trim()) {
      throw new Error('Mã xác thực chưa đúng. Vui lòng kiểm tra lại mã 6 chữ số!');
    }
    acc.verified = true;
    delete acc.pendingOtp;
    accounts[email] = acc;
    saveLocalAccounts(accounts);

    const freshBoard = createFreshAccountStore({
      email,
      boardTitle: acc.boardTitle || DEFAULT_BOARD_TITLE,
      nickname: acc.nickname || DEFAULT_OWNER_NICKNAME,
    });
    setLocalUserEmail(email);
    applyLoadedStore(freshBoard, email);
  };

  const handleResendOtp = async (
    email: string
  ): Promise<{ demoCode?: string }> => {
    const client = getSupabaseClient(cloudConfig);
    if (client) {
      const res = await client.auth.resend({
        type: 'signup',
        email,
      });
      if (res.error) throw res.error;
      return {};
    }

    const accounts = loadLocalAccounts();
    const acc = accounts[email];
    if (!acc) throw new Error('Không tìm thấy yêu cầu đăng ký cho email này.');
    const demoCode = String(Math.floor(100000 + Math.random() * 900000));
    acc.pendingOtp = demoCode;
    accounts[email] = acc;
    saveLocalAccounts(accounts);
    return { demoCode };
  };

  const handleSignOut = async () => {
    const client = getSupabaseClient(cloudConfig);
    if (client) await client.auth.signOut();
    hydratedUserIdRef.current = null;
    setCloudUser(null);
    setLocalUserEmail(null);
    setActiveLocalUserEmail(null);
    setStore(null);
    setOnlineMembers([]);
    setIncomingInvites([]);
  };

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#efe4d2] text-[#382619]">
        <div className="rounded-3xl border-2 border-[#c69d70] bg-[#fbf5e9] px-6 py-4 text-sm font-bold shadow-md">
          Đang tải... 🐾
        </div>
      </div>
    );
  }

  // Show Consumer Email Login / Register / Gmail OTP Screen when not signed in
  if (!activeAccountEmail || !store) {
    return (
      <AuthScreen
        inviteCode={urlInviteCode || undefined}
        onLogin={handleUserLogin}
        onSignupRequestOtp={handleSignupRequestOtp}
        onVerifyOtp={handleVerifyOtp}
        onResendOtp={handleResendOtp}
      />
    );
  }

  const todayKey = toLocalDateKey();
  const isDuo = isSharedDuo(store.sharing);
  const ownerNick = getMemberNickname(store.sharing, 'owner');
  const partnerNick = getMemberNickname(store.sharing, 'partner');
  const ownerHeart = getMemberHeart(store.sharing, 'owner');
  const partnerHeart = getMemberHeart(store.sharing, 'partner');
  const partnerOnline =
    onlineMembers.length >= 2 ||
    onlineMembers.some((m) => m.userId !== cloudUser?.id);

  const dayEntry = ensureDayEntry(store, selectedDate);
  const dayPhotos = store.photos.filter((p) => p.entryDate === selectedDate);
  const dayNotes = store.notes.filter((n) => n.entryDate === selectedDate);
  const dayReminders = getRemindersForDateWithRecurrence(
    store.reminders,
    selectedDate
  );
  const dayFinance = store.finance.filter((f) => f.entryDate === selectedDate);
  const dayVoices = (store.voiceMemos ?? []).filter(
    (v) => v.entryDate === selectedDate
  );

  const completedRemindersCount = dayReminders.filter((r) => r.completed).length;
  const pendingDayReminders = dayReminders.filter((r) => !r.completed);
  const streakCount = calculateStreak(store, todayKey);
  const fishPoints = computeFishPoints(store, todayKey);
  const throwbackPhoto = pickThrowbackPhoto(store, selectedDate);
  const dayExpense = dayFinance
    .filter((f) => f.type === 'expense')
    .reduce((acc, f) => acc + f.amount, 0);

  const updateProfileWithSync = (patch: Partial<UserProfile>) => {
    const nextProfile: UserProfile = { ...store.profile, ...patch };
    updateStore((prev) => ({
      ...prev,
      profile: nextProfile,
    }));
    queueSync({
      id: 'board-meta',
      kind: 'upsert_board',
      profile: nextProfile,
      syncedTrack: store.syncedTrack,
    });
  };

  const updateDayEntry = (patch: Partial<typeof dayEntry>) => {
    const nextEntry = {
      ...ensureDayEntry(store, selectedDate),
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    updateStore((prev) => ({
      ...prev,
      dayEntries: {
        ...prev.dayEntries,
        [selectedDate]: nextEntry,
      },
    }));
    queueSync({
      id: `day-${selectedDate}`,
      kind: 'upsert_day',
      entry: nextEntry,
    });
  };

  const handleAddPhoto = (photo: DayPhoto) => {
    updateStore((prev) => ({
      ...prev,
      hasSampleData: false,
      photos: [photo, ...prev.photos],
    }));
    queueSync({ id: `photo-${photo.id}`, kind: 'upsert_photo', photo });
  };

  const handleUpdatePhoto = (id: string, patch: Partial<DayPhoto>) => {
    const existing = store.photos.find((p) => p.id === id);
    if (!existing) return;
    const updated: DayPhoto = { ...existing, ...patch };
    updateStore((prev) => ({
      ...prev,
      photos: prev.photos.map((p) => {
        if (patch.isCover && p.entryDate === selectedDate) {
          return p.id === id ? updated : { ...p, isCover: false };
        }
        return p.id === id ? updated : p;
      }),
    }));
    queueSync({ id: `photo-${id}`, kind: 'upsert_photo', photo: updated });
  };

  const handleDeletePhoto = (id: string) => {
    const target = store.photos.find((p) => p.id === id);
    updateStore((prev) => ({
      ...prev,
      photos: prev.photos.filter((p) => p.id !== id),
    }));
    queueSync({
      id: `photo-${id}`,
      kind: 'delete_photo',
      itemId: id,
      storagePath: target?.storagePath,
    });
  };

  const handleAddNote = (note: NoteItem) => {
    updateStore((prev) => ({
      ...prev,
      hasSampleData: false,
      notes: [note, ...prev.notes],
    }));
    queueSync({ id: `note-${note.id}`, kind: 'upsert_note', note });
  };

  const handleUpdateNote = (id: string, patch: Partial<NoteItem>) => {
    const existing = store.notes.find((n) => n.id === id);
    if (!existing) return;
    const updated: NoteItem = { ...existing, ...patch };
    updateStore((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => (n.id === id ? updated : n)),
    }));
    queueSync({ id: `note-${id}`, kind: 'upsert_note', note: updated });
  };

  const handleDeleteNote = (id: string) => {
    updateStore((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== id),
    }));
    queueSync({ id: `note-${id}`, kind: 'delete_note', itemId: id });
  };

  const handleAddReminder = (item: ReminderItem) => {
    updateStore((prev) => ({
      ...prev,
      hasSampleData: false,
      reminders: [...prev.reminders, item],
    }));
    queueSync({ id: `rem-${item.id}`, kind: 'upsert_reminder', reminder: item });
  };

  const handleToggleReminder = (id: string) => {
    const virtual = dayReminders.find((r) => r.id === id);
    if (id.startsWith('rec-') && virtual) {
      const materialized: ReminderItem = {
        ...virtual,
        id: createUuid(),
        entryDate: selectedDate,
        completed: true,
        completedAt: new Date().toISOString(),
        completedByRole: store.sharing.activeRole,
        recurrence: 'none',
      };
      updateStore((prev) => ({
        ...prev,
        reminders: [...prev.reminders, materialized],
      }));
      queueSync({
        id: `rem-${materialized.id}`,
        kind: 'upsert_reminder',
        reminder: materialized,
      });
      return;
    }

    const existing = store.reminders.find((r) => r.id === id);
    if (!existing) return;
    const updated: ReminderItem = {
      ...existing,
      completed: !existing.completed,
      completedAt: !existing.completed ? new Date().toISOString() : undefined,
      completedByRole: !existing.completed ? store.sharing.activeRole : undefined,
    };
    updateStore((prev) => ({
      ...prev,
      reminders: prev.reminders.map((r) => (r.id === id ? updated : r)),
    }));
    queueSync({ id: `rem-${id}`, kind: 'upsert_reminder', reminder: updated });
  };

  const handleDeleteReminder = (id: string) => {
    if (id.startsWith('rec-')) return;
    updateStore((prev) => ({
      ...prev,
      reminders: prev.reminders.filter((r) => r.id !== id),
    }));
    queueSync({ id: `rem-${id}`, kind: 'delete_reminder', itemId: id });
  };

  const handleAddFinance = (item: FinanceEntry) => {
    updateStore((prev) => ({
      ...prev,
      hasSampleData: false,
      finance: [item, ...prev.finance],
    }));
    queueSync({ id: `fin-${item.id}`, kind: 'upsert_finance', finance: item });
  };

  const handleDeleteFinance = (id: string) => {
    updateStore((prev) => ({
      ...prev,
      finance: prev.finance.filter((f) => f.id !== id),
    }));
    queueSync({ id: `fin-${id}`, kind: 'delete_finance', itemId: id });
  };

  const handleAddVoiceMemo = (memo: VoiceMemo) => {
    updateStore((prev) => ({
      ...prev,
      hasSampleData: false,
      voiceMemos: [memo, ...(prev.voiceMemos ?? [])],
    }));
    queueSync({ id: `voice-${memo.id}`, kind: 'upsert_voice', voice: memo });
  };

  const handleDeleteVoiceMemo = (id: string) => {
    updateStore((prev) => ({
      ...prev,
      voiceMemos: (prev.voiceMemos ?? []).filter((v) => v.id !== id),
    }));
    queueSync({ id: `voice-${id}`, kind: 'delete_voice', itemId: id });
  };

  const handleSelectTrack = (trk: MusicTrack) => {
    setActiveTrackId(trk.id);
    if (isDuo) {
      updateStore((prev) => ({
        ...prev,
        syncedTrack: trk,
      }));
      queueSync({
        id: 'board-meta',
        kind: 'upsert_board',
        profile: store.profile,
        syncedTrack: trk,
      });
    }
  };

  const handleToggleDecor = (decorId: CatDecorId) => {
    const current = store.profile.activeDecor ?? [];
    const nextDecor = current.includes(decorId)
      ? current.filter((d) => d !== decorId)
      : [...current, decorId];
    updateProfileWithSync({ activeDecor: nextDecor });
  };

  const handleSendHeartPing = () => {
    ambientEngine.playPurrChime();
    if (realtimeChannelRef.current) {
      void realtimeChannelRef.current.send({
        type: 'broadcast',
        event: 'heart_ping',
        payload: { fromNickname: myNickname },
      });
    }
    setHeartToast(
      `Đã gửi ♡ tới ${myRole === 'owner' ? partnerNick : ownerNick}!`
    );
    setTimeout(() => setHeartToast(null), 2600);
  };

  const handleInviteByEmail = async (
    email: string,
    ownerNickname: string,
    partnerNickname: string
  ) => {
    const client = getSupabaseClient(cloudConfig);
    if (client && cloudUser) {
      const boardId =
        store.sharing.boardId || (await ensureCloudBoard(client, store));
      const inv = await createCloudInvitation(
        client,
        cloudUser,
        boardId,
        email,
        ownerNickname,
        partnerNickname
      );
      updateStore((prev) => ({
        ...prev,
        sharing: inviteSecondPerson(prev.sharing, email, {
          ownerNickname,
          partnerNickname,
          boardId,
          inviteCode: inv.inviteCode,
          activateDuoImmediately: true,
        }),
      }));
      return;
    }

    updateStore((prev) => ({
      ...prev,
      sharing: inviteSecondPerson(prev.sharing, email, {
        ownerNickname,
        partnerNickname,
        activateDuoImmediately: true,
      }),
    }));
  };

  const handleAcceptInvite = async (inviteCode: string) => {
    const client = getSupabaseClient(cloudConfig);
    if (!client || !cloudUser) return;
    setSyncStatus('Đang tham gia bảng chung...');
    const joinedBoardId = await acceptCloudInvitation(client, inviteCode);
    const pulled = await pullStoreFromSupabase(
      client,
      cloudUser,
      joinedBoardId,
      store
    );
    applyLoadedStore(pulled, activeAccountEmail);
    setIncomingInvites([]);
    setUrlInviteCode('');
    if (typeof window !== 'undefined' && window.location.search.includes('invite=')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    setSyncStatus('Đã vào bảng chung 2 người ✓');
  };

  const handleRevertToSolo = async () => {
    const client = getSupabaseClient(cloudConfig);
    if (client && cloudUser && store.sharing.boardId) {
      await removePartnerInCloud(client, store.sharing.boardId);
    }
    updateStore((prev) => ({
      ...prev,
      sharing: revertToSoloBoard(prev.sharing),
    }));
  };

  const toggleTheme = () => {
    const next: ThemeMode = theme === 'sunlit' ? 'cozy-night' : 'sunlit';
    setTheme(next);
    updateProfileWithSync({ defaultTheme: next });
  };

  const handleSyncNow = async () => {
    const client = getSupabaseClient(cloudConfig);
    if (!client || !cloudUser) return;
    setSyncStatus('Đang đồng bộ...');
    const boardId =
      store.sharing.boardId || (await ensureCloudBoard(client, store));
    await flushOutboxToSupabase(client, cloudUser, boardId, store.sharing.activeRole);
    await pushStoreToSupabase(client, cloudUser, boardId, store);
    const pulled = await pullStoreFromSupabase(client, cloudUser, boardId, store);
    applyLoadedStore(pulled, activeAccountEmail);
    setSyncStatus('Đã đồng bộ Cloud ✓');
  };

  const handleSelectSearchHit = (hit: SearchHit) => {
    setSelectedDate(hit.entryDate);
    if (hit.kind === 'photo') setActiveTab('photos');
    else if (hit.kind === 'note' || hit.kind === 'voice') setActiveTab('notes');
    else if (hit.kind === 'reminder') setActiveTab('reminders');
    else if (hit.kind === 'finance') setActiveTab('finance');
  };

  const isNight = theme === 'cozy-night';
  const surfaceClass =
    SURFACE_CLASS_BY_TEXTURE[store.profile.boardTexture || 'cork'];

  const navTabs: { id: BoardTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Bảng Ngày', icon: <LayoutGrid className="h-4 w-4" /> },
    { id: 'photos', label: 'Ảnh', icon: <Camera className="h-4 w-4" /> },
    { id: 'notes', label: 'Note & Thư', icon: <NotebookPen className="h-4 w-4" /> },
    { id: 'reminders', label: 'Nhắc nhở', icon: <CheckSquare className="h-4 w-4" /> },
    { id: 'finance', label: 'Tài chính', icon: <Wallet className="h-4 w-4" /> },
    { id: 'calendar', label: 'Lịch Ảnh', icon: <CalendarDays className="h-4 w-4" /> },
    { id: 'music', label: 'Nhạc', icon: <Music className="h-4 w-4" /> },
  ];

  return (
    <div
      className={`min-h-screen pb-24 transition-colors md:pb-8 ${
        isNight ? 'theme-cozy-night bg-[#1e1713]' : 'bg-[#efe4d2]'
      }`}
    >
      {heartToast && (
        <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-2xl border-2 border-[#f0b4bf] bg-[#fff5f7] px-4 py-2.5 text-xs font-extrabold text-[#8a3240] shadow-xl animate-bounce">
          <Heart className="h-4 w-4 fill-[#ef7b8d] text-[#ef7b8d]" />
          {heartToast}
        </div>
      )}

      <div className="mx-auto max-w-7xl px-3 pt-3 sm:px-6 sm:pt-5">
        {/* Incoming Email Invitation Banner */}
        {(incomingInvites.length > 0 || (urlInviteCode && !isDuo)) && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-[#94c7f0] bg-[#eef7fe] px-4 py-3 text-xs text-[#194063] shadow-md">
            <div>
              <span className="font-extrabold">
                💌{' '}
                {incomingInvites[0]
                  ? `${incomingInvites[0].inviterNickname} đã mời bạn dùng chung bảng "${incomingInvites[0].boardTitle || DEFAULT_BOARD_TITLE}"!`
                  : `Bạn có lời mời tham gia bảng chung (Mã: ${urlInviteCode})`}
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                void handleAcceptInvite(
                  incomingInvites[0]?.inviteCode || urlInviteCode
                )
              }
              className="rounded-xl bg-[#3a75a8] px-3.5 py-1.5 font-extrabold text-white shadow-xs hover:bg-[#2f6390]"
            >
              Chấp nhận vào bảng chung
            </button>
          </div>
        )}

        {/* Acrylic Wooden Board Outer Frame */}
        <div
          className={`${surfaceClass} relative rounded-[32px] border-[8px] p-3 sm:p-6 ${
            isNight ? 'border-[#332319]' : 'border-[#b68655]'
          }`}
        >
          <PuffyHeartSticker
            color={ownerHeart}
            size={24}
            className="pointer-events-none absolute right-5 top-3 hidden sm:block"
          />
          <PressedFlower className="pointer-events-none absolute bottom-3 right-4 hidden opacity-85 lg:block" />

          {/* Top Scrapbook Header */}
          <header className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <PuffyWord
                text={(store.profile.boardTitle || DEFAULT_BOARD_TITLE).toUpperCase()}
              />

              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-xs font-extrabold shadow-xs transition ${
                  isDuo
                    ? 'border-transparent bg-[#3d7c57] text-white hover:bg-[#316647]'
                    : isNight
                      ? 'border-[#6b4f3a] bg-[#2c2119] text-[#f4e8d6] hover:bg-[#3a2b21]'
                      : 'border-[#c69d70] bg-[#fbf5e9] text-[#382619] hover:bg-[#f2e6d3]'
                }`}
              >
                {isDuo ? (
                  <>
                    <Users className="h-3.5 w-3.5" />
                    <span>
                      {HEART_BADGE_META[ownerHeart].emoji} {ownerNick} &{' '}
                      {HEART_BADGE_META[partnerHeart].emoji} {partnerNick}
                    </span>
                    {partnerOnline && (
                      <span
                        title="Đang online cùng nhau"
                        className="h-2 w-2 rounded-full bg-[#8cf0a8]"
                      />
                    )}
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Mời người thứ 2</span>
                  </>
                )}
              </button>

              {cloudUser && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#3d7c57] px-2.5 py-1 text-[11px] font-bold text-white">
                  <Cloud className="h-3 w-3" /> {syncStatus}
                </span>
              )}

              <span
                title="Chuỗi ngày check-in liên tiếp"
                className="inline-flex items-center gap-1 rounded-full bg-[#b57a29] px-2.5 py-1 text-[11px] font-extrabold text-white shadow-xs"
              >
                <Flame className="h-3 w-3" /> {streakCount} ngày
              </span>

              {isDevAdminEmail(activeAccountEmail) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#4a3425] px-2.5 py-1 text-[10px] font-extrabold text-[#ffd978] shadow-xs">
                  🛠️ DEV
                </span>
              )}
            </div>

            {/* Date Picker + Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`flex items-center gap-1 rounded-2xl border px-2 py-1 shadow-xs ${
                  isNight
                    ? 'border-[#614835] bg-[#2c2119] text-[#f4e8d6]'
                    : 'border-[#c69d70] bg-[#fbf5e9] text-[#382619]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedDate((d) => shiftDateKey(d, -1))}
                  aria-label="Ngày trước"
                  className="rounded-xl p-1 hover:bg-black/10"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayKey)}
                  className="px-2 text-xs font-extrabold"
                >
                  {formatDisplayDateVi(selectedDate)}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate((d) => shiftDateKey(d, 1))}
                  aria-label="Ngày sau"
                  className="rounded-xl p-1 hover:bg-black/10"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                title="Tìm kiếm toàn bảng (Cmd + K)"
                className={`inline-flex items-center gap-1 rounded-2xl border px-2.5 py-2 text-xs font-bold shadow-xs ${
                  isNight
                    ? 'border-[#614835] bg-[#2c2119] text-[#f4e8d6]'
                    : 'border-[#c69d70] bg-[#fbf5e9] text-[#382619]'
                }`}
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tìm</span>
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                title="Đổi chế độ Sáng Nắng / Đêm Mưa Cozy"
                className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-extrabold shadow-xs transition ${
                  isNight
                    ? 'border-[#7c5d43] bg-[#3b2c22] text-[#ffe8ad]'
                    : 'border-[#c69d70] bg-[#fbf5e9] text-[#382619]'
                }`}
              >
                {isNight ? (
                  <>
                    <Sun className="h-3.5 w-3.5 text-[#ffd978]" /> Sáng hơn
                  </>
                ) : (
                  <>
                    <Moon className="h-3.5 w-3.5 text-[#3a75a8]" /> Cozy hơn
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setWindDownOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-[#b95567] px-3 py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-[#9f4555]"
              >
                <MoonStar className="h-3.5 w-3.5" />
                Chốt 15s
              </button>

              <button
                type="button"
                onClick={() => setSnapshotOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-[#4a3425] px-3.5 py-2 text-xs font-extrabold text-[#fdf7ed] shadow-sm transition hover:opacity-90"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#f7dc88]" />
                Báo cáo ngày
              </button>

              <Link
                href="/widget"
                className={`hidden rounded-2xl border px-3 py-2 text-xs font-bold shadow-xs sm:inline-flex ${
                  isNight
                    ? 'border-[#614835] bg-[#2c2119] text-[#f4e8d6]'
                    : 'border-[#c69d70] bg-[#fbf5e9] text-[#382619]'
                }`}
              >
                Widget
              </Link>

              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                aria-label="Cài đặt cá nhân"
                className={`rounded-2xl border p-2 shadow-xs ${
                  isNight
                    ? 'border-[#614835] bg-[#2c2119] text-[#f4e8d6]'
                    : 'border-[#c69d70] bg-[#fbf5e9] text-[#382619]'
                }`}
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Main 2-Column Studio Grid */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Left Desk Column */}
            <aside
              className={`space-y-4 lg:col-span-4 ${
                activeTab === 'music' ? 'block' : 'hidden lg:block'
              }`}
            >
              <CatCompanion
                catName={store.profile.catName}
                partnerCatName={store.profile.partnerCatName}
                catStyle={store.profile.catStyle}
                mood={dayEntry.mood}
                weather={dayEntry.weather}
                theme={theme}
                isPlayingMusic={Boolean(activeTrack)}
                completedCount={completedRemindersCount}
                totalCount={dayReminders.length}
                fishPoints={fishPoints}
                activeDecor={store.profile.activeDecor}
                onToggleDecor={handleToggleDecor}
                sharing={store.sharing}
                partnerOnline={partnerOnline}
                onSendHeartPing={isDuo ? handleSendHeartPing : undefined}
                onChangeMood={(mood: CatMood) => updateDayEntry({ mood })}
                onChangeWeather={(weather: WeatherType) => updateDayEntry({ weather })}
              />

              <LofiPlayer
                tracks={store.tracks}
                activeTrack={activeTrack}
                sharing={store.sharing}
                onSelectTrack={handleSelectTrack}
                onAddTrack={(trk: MusicTrack) => {
                  updateStore((prev) => ({
                    ...prev,
                    tracks: [trk, ...prev.tracks],
                    syncedTrack: isDuo ? trk : prev.syncedTrack,
                  }));
                  queueSync({ id: `trk-${trk.id}`, kind: 'upsert_track', track: trk });
                }}
                onRemoveTrack={(id) => {
                  updateStore((prev) => ({
                    ...prev,
                    tracks: prev.tracks.filter((t) => t.id !== id),
                  }));
                  queueSync({ id: `trk-${id}`, kind: 'delete_track', itemId: id });
                }}
                onPinSongToDay={(trk) =>
                  updateDayEntry({
                    songTitle: trk.title,
                    songArtist: trk.artistOrChannel,
                    songSource: trk.source,
                    songUrl: trk.url,
                  })
                }
                theme={theme}
                spotifyClientId={cloudConfig.spotifyClientId}
              />

              <FocusPomodoroCard
                catName={store.profile.catName}
                pendingReminders={pendingDayReminders}
                theme={theme}
                onCompleteReminder={handleToggleReminder}
              />
            </aside>

            {/* Right Corkboard Content Column */}
            <main className="space-y-4 lg:col-span-8">
              <nav className="hidden flex-wrap gap-1.5 md:flex">
                {navTabs
                  .filter((t) => t.id !== 'music')
                  .map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-extrabold shadow-xs transition ${
                        activeTab === tab.id
                          ? 'bg-[#3a75a8] text-white shadow-sm'
                          : isNight
                            ? 'bg-[#2c2119]/90 text-[#efe2cf] hover:bg-[#3b2d22]'
                            : 'bg-[#fbf5e9] text-[#463122] hover:bg-[#f2e6d3]'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
              </nav>

              <div className="lg:hidden">
                {activeTab === 'overview' && (
                  <CatCompanion
                    catName={store.profile.catName}
                    partnerCatName={store.profile.partnerCatName}
                    catStyle={store.profile.catStyle}
                    mood={dayEntry.mood}
                    weather={dayEntry.weather}
                    theme={theme}
                    isPlayingMusic={Boolean(activeTrack)}
                    completedCount={completedRemindersCount}
                    totalCount={dayReminders.length}
                    fishPoints={fishPoints}
                    activeDecor={store.profile.activeDecor}
                    sharing={store.sharing}
                    partnerOnline={partnerOnline}
                    onChangeMood={(mood: CatMood) => updateDayEntry({ mood })}
                    onChangeWeather={(weather: WeatherType) =>
                      updateDayEntry({ weather })
                    }
                    compact
                  />
                )}
              </div>

              {activeTab === 'overview' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab('photos')}
                      className={`rounded-2xl border p-3 text-left shadow-xs transition hover:-translate-y-0.5 ${
                        isNight
                          ? 'border-[#614835] bg-[#2c2119] text-[#f4e8d6]'
                          : 'border-[#d6be9c] bg-[#fbf5e9] text-[#382619]'
                      }`}
                    >
                      <div className="text-[11px] font-bold opacity-75">
                        📸 Ảnh Polaroid
                      </div>
                      <div className="mt-0.5 text-base font-extrabold">
                        {dayPhotos.length} tấm
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('reminders')}
                      className={`rounded-2xl border p-3 text-left shadow-xs transition hover:-translate-y-0.5 ${
                        isNight
                          ? 'border-[#46684f] bg-[#213125] text-[#d6f3de]'
                          : 'border-[#b7d9bf] bg-[#eef7f0] text-[#214f2d]'
                      }`}
                    >
                      <div className="text-[11px] font-bold opacity-80">
                        ✅ Đã làm
                      </div>
                      <div className="mt-0.5 text-base font-extrabold">
                        {completedRemindersCount}/{dayReminders.length}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('finance')}
                      className={`rounded-2xl border p-3 text-left shadow-xs transition hover:-translate-y-0.5 ${
                        isNight
                          ? 'border-[#6f4448] bg-[#362325] text-[#f8d5d8]'
                          : 'border-[#e8bec2] bg-[#fdf1f2] text-[#732d34]'
                      }`}
                    >
                      <div className="text-[11px] font-bold opacity-80">
                        💸 Chi hôm nay
                      </div>
                      <div className="mt-0.5 truncate text-base font-extrabold">
                        {formatVnd(dayExpense)}
                      </div>
                    </button>
                  </div>

                  {throwbackPhoto && (
                    <button
                      type="button"
                      onClick={() => setSelectedDate(throwbackPhoto.entryDate)}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-left text-xs shadow-xs transition hover:-translate-y-0.5 ${
                        isNight
                          ? 'border-[#6f523b] bg-[#2c2119]/95 text-[#f4e8d6]'
                          : 'border-[#d6be9c] bg-[#fbf5e9] text-[#382619]'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={throwbackPhoto.dataUrl}
                          alt={throwbackPhoto.caption}
                          className="h-11 w-14 shrink-0 rounded-md object-cover ring-2 ring-white shadow-xs"
                        />
                        <div className="min-w-0">
                          <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase text-[#b57a29]">
                            <History className="h-3 w-3" />
                            Ký ức ngày {formatShortDate(throwbackPhoto.entryDate)}
                          </div>
                          <div className="truncate font-bold">
                            “{throwbackPhoto.caption}”
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#3a75a8] px-2.5 py-1 text-[10px] font-extrabold text-white">
                        Xem lại
                      </span>
                    </button>
                  )}

                  <PolaroidGallery
                    entryDate={selectedDate}
                    photos={dayPhotos}
                    sharing={store.sharing}
                    fontStyle={store.profile.fontStyle}
                    theme={theme}
                    onAddPhoto={handleAddPhoto}
                    onUpdatePhoto={handleUpdatePhoto}
                    onDeletePhoto={handleDeletePhoto}
                  />

                  <DailyPromptCard
                    entryDate={selectedDate}
                    sharing={store.sharing}
                    answers={dayEntry.promptAnswers}
                    theme={theme}
                    onSaveAnswer={(promptAnswers) =>
                      updateDayEntry({ promptAnswers })
                    }
                  />

                  <VoiceMemoCard
                    entryDate={selectedDate}
                    memos={dayVoices}
                    sharing={store.sharing}
                    theme={theme}
                    onAddMemo={handleAddVoiceMemo}
                    onDeleteMemo={handleDeleteVoiceMemo}
                  />

                  <div
                    className={
                      store.profile.fontStyle === 'handwriting'
                        ? 'font-handwriting-soft'
                        : ''
                    }
                  >
                    <NotesAndLetters
                      entryDate={selectedDate}
                      notes={dayNotes}
                      sharing={store.sharing}
                      journalPin={store.profile.journalPin}
                      theme={theme}
                      onAddNote={handleAddNote}
                      onUpdateNote={handleUpdateNote}
                      onDeleteNote={handleDeleteNote}
                    />
                  </div>

                  <RemindersPanel
                    entryDate={selectedDate}
                    reminders={dayReminders}
                    sharing={store.sharing}
                    theme={theme}
                    onAddReminder={handleAddReminder}
                    onToggleReminder={handleToggleReminder}
                    onDeleteReminder={handleDeleteReminder}
                  />
                </div>
              )}

              {activeTab === 'photos' && (
                <PolaroidGallery
                  entryDate={selectedDate}
                  photos={dayPhotos}
                  sharing={store.sharing}
                  fontStyle={store.profile.fontStyle}
                  theme={theme}
                  onAddPhoto={handleAddPhoto}
                  onUpdatePhoto={handleUpdatePhoto}
                  onDeletePhoto={handleDeletePhoto}
                />
              )}

              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <VoiceMemoCard
                    entryDate={selectedDate}
                    memos={dayVoices}
                    sharing={store.sharing}
                    theme={theme}
                    onAddMemo={handleAddVoiceMemo}
                    onDeleteMemo={handleDeleteVoiceMemo}
                  />
                  <div
                    className={
                      store.profile.fontStyle === 'handwriting'
                        ? 'font-handwriting-soft'
                        : ''
                    }
                  >
                    <NotesAndLetters
                      entryDate={selectedDate}
                      notes={dayNotes}
                      sharing={store.sharing}
                      journalPin={store.profile.journalPin}
                      theme={theme}
                      onAddNote={handleAddNote}
                      onUpdateNote={handleUpdateNote}
                      onDeleteNote={handleDeleteNote}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'reminders' && (
                <RemindersPanel
                  entryDate={selectedDate}
                  reminders={dayReminders}
                  sharing={store.sharing}
                  theme={theme}
                  onAddReminder={handleAddReminder}
                  onToggleReminder={handleToggleReminder}
                  onDeleteReminder={handleDeleteReminder}
                />
              )}

              {activeTab === 'finance' && (
                <FinancePanel
                  entryDate={selectedDate}
                  dayEntries={dayFinance}
                  allFinance={store.finance}
                  monthlyBudget={store.profile.monthlyBudget}
                  savingGoal={store.profile.savingGoal}
                  sharing={store.sharing}
                  theme={theme}
                  onAddFinance={handleAddFinance}
                  onDeleteFinance={handleDeleteFinance}
                  onUpdateSavingGoal={(savingGoal: SavingGoal) =>
                    updateProfileWithSync({ savingGoal })
                  }
                />
              )}

              {activeTab === 'calendar' && (
                <ScrapbookCalendar
                  selectedDate={selectedDate}
                  store={store}
                  theme={theme}
                  onSelectDate={(dateKey) => {
                    setSelectedDate(dateKey);
                    setActiveTab('overview');
                  }}
                />
              )}
            </main>
          </div>
        </div>
      </div>

      {/* Mobile iPhone 3-Second Quick-Capture FAB (+) */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2 md:hidden">
        {fabOpen && (
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('photos');
                setFabOpen(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#3a75a8] px-3.5 py-2 text-xs font-extrabold text-white shadow-lg"
            >
              <Camera className="h-3.5 w-3.5" /> Chụp Polaroid
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('finance');
                setFabOpen(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#3d7c57] px-3.5 py-2 text-xs font-extrabold text-white shadow-lg"
            >
              <Wallet className="h-3.5 w-3.5" /> Ghi tiền nhanh
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('notes');
                setFabOpen(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#b95567] px-3.5 py-2 text-xs font-extrabold text-white shadow-lg"
            >
              <Mic className="h-3.5 w-3.5" /> Thu âm / Note
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setFabOpen((v) => !v)}
          aria-label="Ghi nhanh"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4a3425] text-[#fdf7ed] shadow-xl ring-2 ring-[#f5ebd9]"
        >
          {fabOpen ? <X className="h-5 w-5" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>

      {/* iPhone / Mobile Bottom Sticky Navigation Bar */}
      <nav
        className={`fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t px-1 py-2 backdrop-blur-md md:hidden ${
          isNight
            ? 'border-[#4a3728] bg-[#241b14]/95 text-[#f4e8d6]'
            : 'border-[#d6bc98] bg-[#fbf5e9]/95 text-[#382619]'
        }`}
      >
        {navTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[10px] font-bold transition ${
              activeTab === tab.id
                ? 'bg-[#3a75a8] text-white'
                : 'opacity-75'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Global Search Command Modal (Cmd+K) */}
      {searchOpen && (
        <SearchCommandModal
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          store={store}
          onSelectHit={handleSelectSearchHit}
        />
      )}

      {/* Shared 2-Person Board Invite & Mutual Nicknames Modal */}
      {shareOpen && (
        <SharedBoardModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          sharing={store.sharing}
          catName={store.profile.catName}
          partnerCatName={store.profile.partnerCatName}
          isCloudSignedIn={Boolean(cloudUser)}
          onlineCount={onlineMembers.length}
          onInviteByEmail={handleInviteByEmail}
          onRenameMember={(role: MemberRole, nickname: string, heartColor: HeartColor) => {
            const nextSharing = renameMember(
              store.sharing,
              role,
              nickname,
              heartColor
            );
            updateStore((prev) => ({ ...prev, sharing: nextSharing }));
            const client = getSupabaseClient(cloudConfig);
            if (client && cloudUser && store.sharing.boardId) {
              void syncMemberNicknamesToSupabase(
                client,
                store.sharing.boardId,
                nextSharing.members
              );
            }
          }}
          onUpdateCatNames={(catName, partnerCatName) =>
            updateProfileWithSync({ catName, partnerCatName })
          }
          onSwitchLocalRole={(role) =>
            updateStore((prev) => ({
              ...prev,
              sharing: { ...prev.sharing, activeRole: role },
            }))
          }
          onRevertToSolo={handleRevertToSolo}
        />
      )}

      {/* 15-Second End-of-Day Wind-Down Wizard */}
      {windDownOpen && (
        <EndOfDayWizardModal
          isOpen={windDownOpen}
          onClose={() => setWindDownOpen(false)}
          entryDate={selectedDate}
          catName={store.profile.catName}
          streak={streakCount}
          hasPhotoToday={dayPhotos.length > 0}
          dayEntry={dayEntry}
          sharing={store.sharing}
          onUpdateDay={updateDayEntry}
          onAddQuickExpense={handleAddFinance}
          onOpenCamera={() => setActiveTab('photos')}
          onOpenSnapshot={() => setSnapshotOpen(true)}
        />
      )}

      {/* Snapshot Export Studio Modal */}
      {snapshotOpen && (
        <DailySnapshotModal
          isOpen={snapshotOpen}
          onClose={() => setSnapshotOpen(false)}
          entryDate={selectedDate}
          profile={store.profile}
          sharing={store.sharing}
          dayEntry={dayEntry}
          photos={dayPhotos}
          notes={dayNotes}
          reminders={dayReminders}
          finance={dayFinance}
          onUpdateQuote={(quote) => updateDayEntry({ dailyQuote: quote })}
          onUpdateStickers={(stickers) => updateDayEntry({ stickers })}
        />
      )}

      {/* End-User Settings Modal (Dev tools strictly unlocked only for huynhphuclam147@gmail.com) */}
      {settingsOpen && (
        <SyncSettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          store={store}
          userEmail={activeAccountEmail}
          cloudConfig={cloudConfig}
          syncStatus={syncStatus}
          onUpdateProfile={updateProfileWithSync}
          onSaveDevCloudConfig={(cfg) => {
            if (!isDevAdminEmail(activeAccountEmail)) return;
            setCloudConfig(cfg);
            saveDevCloudConfig(activeAccountEmail, cfg);
          }}
          onResetFreshBoard={() => {
            if (!isDevAdminEmail(activeAccountEmail)) return;
            updateStore((prev) => createEmptyStore(prev.profile, prev.sharing));
          }}
          onImportStore={(imported) => {
            if (!isDevAdminEmail(activeAccountEmail)) return;
            applyLoadedStore(imported, activeAccountEmail);
          }}
          onSignOut={handleSignOut}
          onSyncNow={handleSyncNow}
        />
      )}
    </div>
  );
}
