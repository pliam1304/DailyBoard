import type {
  BoardInvitation,
  BoardMember,
  BoardSharingState,
  CatyStoreData,
  HeartColor,
  MemberRole,
} from '@/types/catyboard';

export const DEFAULT_BOARD_TITLE = 'Name';
export const DEFAULT_OWNER_NICKNAME = 'Him';
export const DEFAULT_PARTNER_NICKNAME = 'Her';
export const OPEN_INVITE_EMAIL = 'open@invite.local';

const PENDING_INVITE_CODE_KEY = 'nameboard_pending_invite_code_v1';
const PENDING_INVITE_AUTOJOIN_KEY = 'nameboard_pending_invite_autojoin_v1';

export function isOpenInviteEmail(email?: string | null): boolean {
  return !email || email.trim().toLowerCase() === OPEN_INVITE_EMAIL;
}

export const HEART_BADGE_META: Record<
  HeartColor,
  { label: string; emoji: string; pillClass: string; hex: string }
> = {
  sky: {
    label: 'Xanh trời',
    emoji: '💙',
    pillClass: 'bg-[#3a75a8] text-white border-[#2e608b]',
    hex: '#5794ca',
  },
  sage: {
    label: 'Xanh mint',
    emoji: '💚',
    pillClass: 'bg-[#3d7c57] text-white border-[#2f6445]',
    hex: '#5f9f74',
  },
  blush: {
    label: 'Hồng phấn',
    emoji: '🩷',
    pillClass: 'bg-[#b95567] text-white border-[#994151]',
    hex: '#cf7585',
  },
  cream: {
    label: 'Kem ấm',
    emoji: '💛',
    pillClass: 'bg-[#b57a29] text-white border-[#93601d]',
    hex: '#d29843',
  },
};

export function createDefaultSharing(ownerEmail = ''): BoardSharingState {
  return {
    members: [
      {
        role: 'owner',
        email: ownerEmail.toLowerCase(),
        nickname: DEFAULT_OWNER_NICKNAME,
        heartColor: 'sky',
        joinedAt: new Date().toISOString(),
      },
    ],
    pendingInvite: null,
    activeRole: 'owner',
  };
}

export function isSharedDuo(sharing: BoardSharingState): boolean {
  return sharing.members.length >= 2;
}

export function getMemberByRole(
  sharing: BoardSharingState,
  role: MemberRole
): BoardMember | undefined {
  return sharing.members.find((m) => m.role === role);
}

export function getMemberNickname(
  sharing: BoardSharingState,
  role: MemberRole = 'owner'
): string {
  const member = getMemberByRole(sharing, role);
  if (member?.nickname) return member.nickname;
  return role === 'owner' ? DEFAULT_OWNER_NICKNAME : DEFAULT_PARTNER_NICKNAME;
}

export function getMemberHeart(
  sharing: BoardSharingState,
  role: MemberRole = 'owner'
): HeartColor {
  const member = getMemberByRole(sharing, role);
  if (member?.heartColor) return member.heartColor;
  return role === 'owner' ? 'sky' : 'sage';
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'DIARY-';
  for (let i = 0; i < 8; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/**
 * Extracts a clean uppercase invite code from either a pasted full URL
 * (`https://.../?invite=DIARY-AB12CD34`) or a raw code (`diary-ab12cd34`).
 */
export function extractInviteCodeFromInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    if (trimmed.includes('invite=')) {
      const url = new URL(
        trimmed.startsWith('http')
          ? trimmed
          : `https://placeholder.local/${trimmed.replace(/^\/+/, '')}`
      );
      const fromParam = url.searchParams.get('invite');
      if (fromParam) {
        return fromParam.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase().slice(0, 32);
      }
    }
  } catch {
    // Fall back to direct regex extraction
  }
  const paramMatch = trimmed.match(/[?&]invite=([a-zA-Z0-9_-]{4,32})/i);
  if (paramMatch?.[1]) {
    return paramMatch[1].toUpperCase();
  }
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase().slice(0, 32);
}

export function savePendingInviteCode(
  code: string | null,
  options?: { autoJoin?: boolean }
): void {
  if (typeof window === 'undefined') return;
  try {
    const cleaned = code ? extractInviteCodeFromInput(code) : '';
    if (!cleaned) {
      window.localStorage.removeItem(PENDING_INVITE_CODE_KEY);
      window.sessionStorage.removeItem(PENDING_INVITE_CODE_KEY);
      window.localStorage.removeItem(PENDING_INVITE_AUTOJOIN_KEY);
      window.sessionStorage.removeItem(PENDING_INVITE_AUTOJOIN_KEY);
      return;
    }
    window.localStorage.setItem(PENDING_INVITE_CODE_KEY, cleaned);
    window.sessionStorage.setItem(PENDING_INVITE_CODE_KEY, cleaned);
    if (options?.autoJoin !== undefined) {
      const flag = options.autoJoin ? '1' : '0';
      window.localStorage.setItem(PENDING_INVITE_AUTOJOIN_KEY, flag);
      window.sessionStorage.setItem(PENDING_INVITE_AUTOJOIN_KEY, flag);
    }
  } catch {
    // ignore storage errors
  }
}

export function loadPendingInviteCode(): string {
  if (typeof window === 'undefined') return '';
  try {
    return (
      window.sessionStorage.getItem(PENDING_INVITE_CODE_KEY) ||
      window.localStorage.getItem(PENDING_INVITE_CODE_KEY) ||
      ''
    );
  } catch {
    return '';
  }
}

export function shouldAutoJoinPendingInvite(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.sessionStorage.getItem(PENDING_INVITE_AUTOJOIN_KEY) === '1' ||
      window.localStorage.getItem(PENDING_INVITE_AUTOJOIN_KEY) === '1'
    );
  } catch {
    return false;
  }
}

export function createUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function buildInviteUrl(origin: string, inviteCode: string): string {
  return `${origin.replace(/\/$/, '')}/?invite=${encodeURIComponent(inviteCode)}`;
}

export function inviteSecondPerson(
  sharing: BoardSharingState,
  inviteeEmail = '',
  options?: {
    ownerNickname?: string;
    partnerNickname?: string;
    boardId?: string;
    inviteCode?: string;
    activateDuoImmediately?: boolean;
  }
): BoardSharingState {
  const normalizedEmail = inviteeEmail.trim().toLowerCase() || OPEN_INVITE_EMAIL;
  const now = new Date().toISOString();
  const existingOwner = getMemberByRole(sharing, 'owner') ?? {
    role: 'owner' as const,
    email: '',
    nickname: DEFAULT_OWNER_NICKNAME,
    heartColor: 'sky' as const,
    joinedAt: now,
  };

  const ownerNickname =
    options?.ownerNickname?.trim() || existingOwner.nickname || DEFAULT_OWNER_NICKNAME;
  const partnerNickname =
    options?.partnerNickname?.trim() || DEFAULT_PARTNER_NICKNAME;
  const inviteCode = options?.inviteCode || generateInviteCode();

  const updatedOwner: BoardMember = {
    ...existingOwner,
    nickname: ownerNickname,
  };

  const invitation: BoardInvitation = {
    id: `inv-${Date.now()}`,
    boardId: options?.boardId || sharing.boardId || 'local-board',
    inviterNickname: ownerNickname,
    inviteeEmail: normalizedEmail,
    inviteeNickname: partnerNickname,
    inviteCode,
    status: 'pending',
    createdAt: now,
  };

  const members: BoardMember[] = [updatedOwner];
  if (options?.activateDuoImmediately !== false) {
    members.push({
      role: 'partner',
      email: normalizedEmail,
      nickname: partnerNickname,
      heartColor: 'sage',
      joinedAt: now,
    });
  }

  return {
    ...sharing,
    boardId: options?.boardId || sharing.boardId,
    members,
    pendingInvite: invitation,
    activeRole: sharing.activeRole,
  };
}

export function renameMember(
  sharing: BoardSharingState,
  role: MemberRole,
  nickname: string,
  heartColor?: HeartColor
): BoardSharingState {
  const cleanName =
    nickname.trim() ||
    (role === 'owner' ? DEFAULT_OWNER_NICKNAME : DEFAULT_PARTNER_NICKNAME);

  const members = sharing.members.map((m) =>
    m.role === role
      ? {
          ...m,
          nickname: cleanName,
          heartColor: heartColor ?? m.heartColor,
        }
      : m
  );

  const pendingInvite = sharing.pendingInvite
    ? {
        ...sharing.pendingInvite,
        inviterNickname:
          role === 'owner' ? cleanName : sharing.pendingInvite.inviterNickname,
        inviteeNickname:
          role === 'partner' ? cleanName : sharing.pendingInvite.inviteeNickname,
      }
    : null;

  return {
    ...sharing,
    members,
    pendingInvite,
  };
}

export function revertToSoloBoard(sharing: BoardSharingState): BoardSharingState {
  const owner = getMemberByRole(sharing, 'owner') ?? createDefaultSharing().members[0];
  return {
    ...sharing,
    members: [owner],
    pendingInvite: null,
    activeRole: 'owner',
  };
}

export function normalizeStoreData(raw: Partial<CatyStoreData>): CatyStoreData {
  const defaultSharing = createDefaultSharing();
  return {
    version: 3,
    hasSampleData: Boolean(raw.hasSampleData),
    profile: {
      boardTitle: raw.profile?.boardTitle || DEFAULT_BOARD_TITLE,
      catName: raw.profile?.catName || 'Mochi',
      partnerCatName: raw.profile?.partnerCatName || 'Latte',
      catStyle: raw.profile?.catStyle || 'hybrid',
      defaultTheme: raw.profile?.defaultTheme || 'sunlit',
      boardTexture: raw.profile?.boardTexture || 'cork',
      fontStyle: raw.profile?.fontStyle || 'rounded',
      monthlyBudget: raw.profile?.monthlyBudget ?? 8000000,
      savingGoal: raw.profile?.savingGoal ?? {
        title: 'Quỹ đi Đà Lạt cùng Mochi',
        targetAmount: 5000000,
        emoji: '🏔️',
      },
      activeDecor: Array.isArray(raw.profile?.activeDecor)
        ? raw.profile.activeDecor
        : ['steaming-mug'],
      currency: raw.profile?.currency || 'VND',
      journalPin: raw.profile?.journalPin,
    },
    sharing: raw.sharing?.members?.length
      ? {
          boardId: raw.sharing.boardId,
          members: raw.sharing.members,
          pendingInvite: raw.sharing.pendingInvite ?? null,
          activeRole: raw.sharing.activeRole || 'owner',
        }
      : defaultSharing,
    syncedTrack: raw.syncedTrack ?? null,
    dayEntries: raw.dayEntries ?? {},
    photos: raw.photos ?? [],
    notes: raw.notes ?? [],
    reminders: raw.reminders ?? [],
    finance: raw.finance ?? [],
    voiceMemos: raw.voiceMemos ?? [],
    tracks: raw.tracks ?? [],
  };
}
