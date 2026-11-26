import {
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';
import {
  DEFAULT_BOARD_TITLE,
  DEFAULT_OWNER_NICKNAME,
  DEFAULT_PARTNER_NICKNAME,
  generateInviteCode,
  isUuid,
} from '@/lib/sharing';
import {
  isAllowedAudioDataUrl,
  isAllowedPhotoDataUrl,
  isLikelyServiceRoleKey,
  sanitizeText,
  validateSafeHttpUrl,
} from '@/lib/security';
import { loadOutbox, saveOutbox, type OutboxOp } from '@/lib/outbox';
import type {
  BoardInvitation,
  BoardMember,
  CatyStoreData,
  CloudConfig,
  DayEntry,
  DayPhoto,
  FinanceEntry,
  MemberRole,
  MusicTrack,
  NoteItem,
  PolaroidFrameColor,
  ReminderItem,
  VoiceMemo,
  WashiStyle,
} from '@/types/catyboard';

function encodeWashiAndFrame(
  washiStyle: WashiStyle,
  frameColor?: PolaroidFrameColor
): string {
  if (!frameColor || frameColor === 'classic-white') return washiStyle;
  return `${washiStyle}|${frameColor}`;
}

function decodeWashiAndFrame(raw?: string | null): {
  washiStyle: WashiStyle;
  frameColor?: PolaroidFrameColor;
} {
  if (!raw) return { washiStyle: 'mint-gingham' };
  const [washi, frame] = String(raw).split('|');
  return {
    washiStyle: (washi || 'mint-gingham') as WashiStyle,
    frameColor: frame ? (frame as PolaroidFrameColor) : undefined,
  };
}

let cachedKey = '';
let cachedClient: SupabaseClient | null = null;
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export function getSupabaseClient(config: CloudConfig): SupabaseClient | null {
  const rawUrl = validateSafeHttpUrl(config.supabaseUrl, {
    allowLocalhostHttp: true,
  });
  const safeUrl = rawUrl
    ? rawUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')
    : null;
  if (!safeUrl || !config.supabaseAnonKey) return null;
  // Never allow a secret service_role key to run inside the browser
  if (isLikelyServiceRoleKey(config.supabaseAnonKey)) return null;

  const key = `${safeUrl}::${config.supabaseAnonKey}`;
  if (cachedClient && cachedKey === key) return cachedClient;
  cachedKey = key;
  cachedClient = createClient(safeUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return cachedClient;
}

const MAX_UPLOAD_BLOB_BYTES = 5 * 1024 * 1024;
const CLOUD_ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function dataUrlToSafeImageBlob(dataUrl: string): { blob: Blob; ext: string } | null {
  if (!isAllowedPhotoDataUrl(dataUrl) || !dataUrl.startsWith('data:')) return null;
  const [header, data] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?)(;|$)/);
  const mime = (mimeMatch?.[1] || '').toLowerCase();
  if (!CLOUD_ALLOWED_MIMES.has(mime) || !header.includes(';base64')) return null;

  const bin = atob(data);
  if (bin.length === 0 || bin.length > MAX_UPLOAD_BLOB_BYTES) return null;
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  return { blob: new Blob([bytes], { type: mime }), ext };
}

export async function ensureCloudBoard(
  client: SupabaseClient,
  store: CatyStoreData
): Promise<string> {
  const owner = store.sharing.members.find((m) => m.role === 'owner');
  const defaultNick = owner?.nickname || DEFAULT_OWNER_NICKNAME;
  const boardTitle = store.profile.boardTitle || DEFAULT_BOARD_TITLE;

  const { data, error } = await client.rpc('ensure_personal_board', {
    p_default_nickname: defaultNick,
    p_board_title: boardTitle,
  });
  if (!error && data) {
    return String(data);
  }

  // Fallback if RPC is unavailable: query or create board directly via PostgREST
  const { data: authData } = await client.auth.getUser();
  const user = authData?.user;
  if (!user) {
    throw error || new Error('Không thể khởi tạo bảng đồng bộ.');
  }

  const existingMember = await client
    .from('board_members')
    .select('board_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (existingMember.data?.board_id) {
    return String(existingMember.data.board_id);
  }

  const existingBoard = await client
    .from('boards')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle();
  if (existingBoard.data?.id) {
    return String(existingBoard.data.id);
  }

  const createdBoard = await client
    .from('boards')
    .insert({
      owner_id: user.id,
      board_title: boardTitle,
    })
    .select('id')
    .single();

  if (createdBoard.error || !createdBoard.data?.id) {
    throw createdBoard.error || error || new Error('Không thể khởi tạo bảng đồng bộ.');
  }

  const newBoardId = String(createdBoard.data.id);
  await client.from('board_members').upsert({
    board_id: newBoardId,
    user_id: user.id,
    role: 'owner',
    email: (user.email || '').toLowerCase(),
    nickname: defaultNick,
    heart_color: 'sky',
  });
  return newBoardId;
}

export async function fetchPendingInvitesForMe(
  client: SupabaseClient
): Promise<BoardInvitation[]> {
  const { data, error } = await client.rpc('get_my_pending_invitations');
  if (error || !Array.isArray(data)) return [];
  return data.map((row) => ({
    id: String(row.id),
    boardId: String(row.board_id),
    boardTitle: row.board_title ? String(row.board_title) : DEFAULT_BOARD_TITLE,
    inviterNickname: String(row.inviter_nickname || DEFAULT_OWNER_NICKNAME),
    inviteeEmail: String(row.invitee_email || ''),
    inviteeNickname: String(row.invitee_nickname || DEFAULT_PARTNER_NICKNAME),
    inviteCode: String(row.invite_code || ''),
    status: 'pending' as const,
    createdAt: String(row.created_at || new Date().toISOString()),
  }));
}

export async function createCloudInvitation(
  client: SupabaseClient,
  user: User,
  boardId: string,
  inviteeEmail: string,
  inviterNickname: string,
  inviteeNickname: string
): Promise<BoardInvitation> {
  const cleanEmail = inviteeEmail.trim().toLowerCase();
  const inviteCode = generateInviteCode();

  await client
    .from('board_invitations')
    .update({ status: 'revoked' })
    .eq('board_id', boardId)
    .eq('status', 'pending');

  const { data, error } = await client
    .from('board_invitations')
    .insert({
      board_id: boardId,
      inviter_user_id: user.id,
      inviter_nickname: inviterNickname || DEFAULT_OWNER_NICKNAME,
      invitee_email: cleanEmail,
      invitee_nickname: inviteeNickname || DEFAULT_PARTNER_NICKNAME,
      invite_code: inviteCode,
      status: 'pending',
    })
    .select('id, board_id, inviter_nickname, invitee_email, invitee_nickname, invite_code, status, created_at')
    .single();

  if (error || !data) {
    throw error || new Error('Không thể tạo lời mời qua email.');
  }

  return {
    id: data.id,
    boardId: data.board_id,
    inviterNickname: data.inviter_nickname,
    inviteeEmail: data.invitee_email,
    inviteeNickname: data.invitee_nickname,
    inviteCode: data.invite_code,
    status: data.status,
    createdAt: data.created_at,
  };
}

export async function acceptCloudInvitation(
  client: SupabaseClient,
  inviteCode: string
): Promise<string> {
  const { data, error } = await client.rpc('accept_board_invitation', {
    p_invite_code: inviteCode.trim(),
  });
  if (error || !data) {
    throw error || new Error('Không thể chấp nhận lời mời.');
  }
  return String(data);
}

export async function removePartnerInCloud(
  client: SupabaseClient,
  boardId: string
): Promise<void> {
  await client
    .from('board_members')
    .delete()
    .eq('board_id', boardId)
    .eq('role', 'partner');

  await client
    .from('board_invitations')
    .update({ status: 'revoked' })
    .eq('board_id', boardId)
    .eq('status', 'pending');
}

export async function deleteCloudItem(
  client: SupabaseClient,
  table:
    | 'day_photos'
    | 'notes'
    | 'reminders'
    | 'finance_entries'
    | 'voice_memos'
    | 'music_tracks',
  id: string,
  storagePath?: string
): Promise<void> {
  if (!isUuid(id)) return;
  const { error } = await client.from(table).delete().eq('id', id);
  if (error) throw error;
  if (
    table === 'day_photos' &&
    storagePath &&
    !storagePath.startsWith('data:') &&
    !storagePath.startsWith('https://')
  ) {
    await client.storage.from('daily-photos').remove([storagePath]);
  }
}

async function upsertSinglePhoto(
  client: SupabaseClient,
  user: User,
  boardId: string,
  activeRole: MemberRole,
  photo: DayPhoto
): Promise<void> {
  if (!isUuid(photo.id)) return;
  let storagePath = photo.storagePath;
  if (!storagePath && photo.dataUrl.startsWith('data:')) {
    const parsed = dataUrlToSafeImageBlob(photo.dataUrl);
    if (parsed) {
      const bucketPath = `${boardId}/${photo.entryDate}/${photo.id}.${parsed.ext}`;
      const uploadRes = await client.storage
        .from('daily-photos')
        .upload(bucketPath, parsed.blob, {
          upsert: true,
          contentType: parsed.blob.type,
        });
      if (!uploadRes.error) {
        storagePath = bucketPath;
      } else {
        // Fallback: store compressed dataUrl directly in Postgres day_photos.storage_path
        storagePath = photo.dataUrl;
      }
    } else if (isAllowedPhotoDataUrl(photo.dataUrl)) {
      storagePath = photo.dataUrl;
    }
  }
  if (!storagePath) return;

  const { error } = await client.from('day_photos').upsert({
    id: photo.id,
    board_id: boardId,
    author_id: user.id,
    author_role: photo.authorRole || activeRole,
    entry_date: photo.entryDate,
    storage_path: storagePath,
    caption: sanitizeText(photo.caption, 180),
    washi_style: encodeWashiAndFrame(photo.washiStyle, photo.frameColor),
    rotation_deg: photo.rotationDeg,
    is_cover: photo.isCover,
    reactions: (photo.reactions ?? []).slice(0, 10),
    comments: (photo.comments ?? []).slice(0, 50),
    created_at: photo.createdAt,
  });
  if (error) throw error;
}

async function executeOutboxOp(
  client: SupabaseClient,
  user: User,
  boardId: string,
  activeRole: MemberRole,
  op: OutboxOp
): Promise<void> {
  switch (op.kind) {
    case 'upsert_board': {
      const { error } = await client
        .from('boards')
        .update({
          board_title: op.profile.boardTitle,
          cat_name: op.profile.catName,
          partner_cat_name: op.profile.partnerCatName,
          cat_style: op.profile.catStyle,
          default_theme: op.profile.defaultTheme,
          board_texture: op.profile.boardTexture,
          font_style: op.profile.fontStyle,
          monthly_budget: op.profile.monthlyBudget,
          saving_goal: op.profile.savingGoal,
          active_decor: op.profile.activeDecor,
          currency: op.profile.currency,
          journal_pin_hash: op.profile.journalPin || null,
          active_track: op.syncedTrack ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', boardId);
      if (error) throw error;
      return;
    }

    case 'upsert_day': {
      const { error } = await client.from('day_entries').upsert(
        {
          board_id: boardId,
          entry_date: op.entry.entryDate,
          mood: op.entry.mood,
          partner_mood: op.entry.partnerMood ?? null,
          weather: op.entry.weather,
          song_title: op.entry.songTitle ?? null,
          song_artist: op.entry.songArtist ?? null,
          song_source: op.entry.songSource ?? null,
          song_url: op.entry.songUrl ?? null,
          daily_quote: op.entry.dailyQuote ?? null,
          prompt_answers: op.entry.promptAnswers ?? null,
          stickers: op.entry.stickers ?? null,
          updated_at: op.entry.updatedAt,
        },
        { onConflict: 'board_id,entry_date' }
      );
      if (error) throw error;
      return;
    }

    case 'upsert_photo':
      await upsertSinglePhoto(client, user, boardId, activeRole, op.photo);
      return;

    case 'delete_photo':
      await deleteCloudItem(client, 'day_photos', op.itemId, op.storagePath);
      return;

    case 'upsert_note': {
      if (!isUuid(op.note.id)) return;
      const { error } = await client.from('notes').upsert({
        id: op.note.id,
        board_id: boardId,
        author_id: user.id,
        author_role: op.note.authorRole || activeRole,
        entry_date: op.note.entryDate,
        kind: op.note.kind,
        title: op.note.title,
        content: op.note.content,
        paper_style: op.note.paperStyle,
        is_private: op.note.isPrivate,
        unlock_date: op.note.unlockDate || null,
        pinned: op.note.pinned,
        created_at: op.note.createdAt,
        updated_at: op.note.updatedAt,
      });
      if (error) throw error;
      return;
    }

    case 'delete_note':
      await deleteCloudItem(client, 'notes', op.itemId);
      return;

    case 'upsert_reminder': {
      if (!isUuid(op.reminder.id)) return;
      const { error } = await client.from('reminders').upsert({
        id: op.reminder.id,
        board_id: boardId,
        author_id: user.id,
        author_role: op.reminder.authorRole || activeRole,
        entry_date: op.reminder.entryDate,
        title: op.reminder.title,
        due_time: op.reminder.dueTime || null,
        completed: op.reminder.completed,
        completed_at: op.reminder.completedAt || null,
        completed_by_role: op.reminder.completedByRole || null,
        recurrence: op.reminder.recurrence || 'none',
        category: op.reminder.category,
        created_at: op.reminder.createdAt,
      });
      if (error) throw error;
      return;
    }

    case 'delete_reminder':
      await deleteCloudItem(client, 'reminders', op.itemId);
      return;

    case 'upsert_finance': {
      if (!isUuid(op.finance.id)) return;
      const { error } = await client.from('finance_entries').upsert({
        id: op.finance.id,
        board_id: boardId,
        author_id: user.id,
        author_role: op.finance.authorRole || activeRole,
        entry_date: op.finance.entryDate,
        type: op.finance.type,
        amount: op.finance.amount,
        category: op.finance.category,
        mood_tag: op.finance.moodTag,
        note: op.finance.note,
        created_at: op.finance.createdAt,
      });
      if (error) throw error;
      return;
    }

    case 'delete_finance':
      await deleteCloudItem(client, 'finance_entries', op.itemId);
      return;

    case 'upsert_voice': {
      if (!isUuid(op.voice.id) || !isAllowedAudioDataUrl(op.voice.dataUrl)) return;
      const { error } = await client.from('voice_memos').upsert({
        id: op.voice.id,
        board_id: boardId,
        author_id: user.id,
        author_role: op.voice.authorRole || activeRole,
        entry_date: op.voice.entryDate,
        title: sanitizeText(op.voice.title, 120),
        audio_data_url: op.voice.dataUrl,
        duration_sec: Math.min(45, Math.max(0, op.voice.durationSec)),
        created_at: op.voice.createdAt,
      });
      if (error) throw error;
      return;
    }

    case 'delete_voice':
      await deleteCloudItem(client, 'voice_memos', op.itemId);
      return;

    case 'upsert_track': {
      if (!isUuid(op.track.id)) return;
      const { error } = await client.from('music_tracks').upsert({
        id: op.track.id,
        board_id: boardId,
        author_id: user.id,
        author_role: op.track.authorRole || activeRole,
        source: op.track.source,
        url: op.track.url,
        embed_id: op.track.embedId,
        is_playlist: op.track.isPlaylist,
        spotify_kind: op.track.spotifyKind || null,
        title: op.track.title,
        artist_or_channel: op.track.artistOrChannel,
        vibe_tag: op.track.vibeTag,
        is_favorite: op.track.isFavorite,
        created_at: op.track.createdAt,
      });
      if (error) throw error;
      return;
    }

    case 'delete_track':
      await deleteCloudItem(client, 'music_tracks', op.itemId);
      return;
  }
}

/**
 * Granular anti-overwrite flush: sends only queued mutations one-by-one.
 * Keeps failed ops in the account-scoped offline queue for automatic retry on reconnect.
 */
export async function flushOutboxToSupabase(
  client: SupabaseClient,
  user: User,
  boardId: string,
  activeRole: MemberRole
): Promise<{ synced: number; remaining: number; syncedPhotoIds: string[] }> {
  const userKey = (user.email || user.id).toLowerCase();
  const ops = loadOutbox(userKey);
  if (ops.length === 0) return { synced: 0, remaining: 0, syncedPhotoIds: [] };

  const remaining: OutboxOp[] = [];
  const syncedPhotoIds: string[] = [];
  let synced = 0;

  for (const op of ops) {
    try {
      await executeOutboxOp(client, user, boardId, activeRole, op);
      synced += 1;
      if (op.kind === 'upsert_photo') {
        syncedPhotoIds.push(op.photo.id);
      }
    } catch {
      remaining.push(op);
    }
  }

  saveOutbox(remaining, userKey);
  return { synced, remaining: remaining.length, syncedPhotoIds };
}

export async function syncMemberNicknamesToSupabase(
  client: SupabaseClient,
  boardId: string,
  members: BoardMember[]
): Promise<void> {
  for (const member of members) {
    if (member.userId) {
      await client
        .from('board_members')
        .update({
          nickname: member.nickname,
          heart_color: member.heartColor,
        })
        .eq('board_id', boardId)
        .eq('user_id', member.userId);
    }
  }
}

export async function pushStoreToSupabase(
  client: SupabaseClient,
  user: User,
  boardId: string,
  store: CatyStoreData
): Promise<void> {
  await executeOutboxOp(client, user, boardId, store.sharing.activeRole, {
    id: 'full-board',
    kind: 'upsert_board',
    profile: store.profile,
    syncedTrack: store.syncedTrack,
  });

  await syncMemberNicknamesToSupabase(client, boardId, store.sharing.members);

  for (const entry of Object.values(store.dayEntries)) {
    await executeOutboxOp(client, user, boardId, store.sharing.activeRole, {
      id: `day-${entry.entryDate}`,
      kind: 'upsert_day',
      entry,
    });
  }

  for (const photo of store.photos) {
    await upsertSinglePhoto(client, user, boardId, store.sharing.activeRole, photo);
  }

  for (const note of store.notes) {
    await executeOutboxOp(client, user, boardId, store.sharing.activeRole, {
      id: `note-${note.id}`,
      kind: 'upsert_note',
      note,
    });
  }

  for (const reminder of store.reminders) {
    await executeOutboxOp(client, user, boardId, store.sharing.activeRole, {
      id: `rem-${reminder.id}`,
      kind: 'upsert_reminder',
      reminder,
    });
  }

  for (const finance of store.finance) {
    await executeOutboxOp(client, user, boardId, store.sharing.activeRole, {
      id: `fin-${finance.id}`,
      kind: 'upsert_finance',
      finance,
    });
  }

  for (const voice of store.voiceMemos ?? []) {
    await executeOutboxOp(client, user, boardId, store.sharing.activeRole, {
      id: `voice-${voice.id}`,
      kind: 'upsert_voice',
      voice,
    });
  }

  for (const track of store.tracks) {
    await executeOutboxOp(client, user, boardId, store.sharing.activeRole, {
      id: `trk-${track.id}`,
      kind: 'upsert_track',
      track,
    });
  }
}

export async function pullStoreFromSupabase(
  client: SupabaseClient,
  user: User,
  boardId: string,
  fallbackStore: CatyStoreData
): Promise<CatyStoreData> {
  const [
    boardRes,
    membersRes,
    invitesRes,
    daysRes,
    photosRes,
    notesRes,
    remindersRes,
    financeRes,
    voicesRes,
    tracksRes,
  ] = await Promise.all([
    client
      .from('boards')
      .select(
        'board_title, cat_name, partner_cat_name, cat_style, default_theme, board_texture, font_style, monthly_budget, saving_goal, active_decor, currency, journal_pin_hash, active_track'
      )
      .eq('id', boardId)
      .maybeSingle(),
    client
      .from('board_members')
      .select('user_id, role, email, nickname, heart_color, joined_at')
      .eq('board_id', boardId)
      .order('joined_at', { ascending: true }),
    client
      .from('board_invitations')
      .select(
        'id, board_id, inviter_nickname, invitee_email, invitee_nickname, invite_code, status, created_at'
      )
      .eq('board_id', boardId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1),
    client
      .from('day_entries')
      .select(
        'entry_date, mood, partner_mood, weather, song_title, song_artist, song_source, song_url, daily_quote, prompt_answers, stickers, updated_at'
      )
      .eq('board_id', boardId),
    client
      .from('day_photos')
      .select(
        'id, entry_date, storage_path, caption, washi_style, rotation_deg, is_cover, author_role, reactions, comments, created_at'
      )
      .eq('board_id', boardId)
      .order('created_at', { ascending: false }),
    client
      .from('notes')
      .select(
        'id, entry_date, kind, title, content, paper_style, is_private, unlock_date, pinned, author_role, created_at, updated_at'
      )
      .eq('board_id', boardId)
      .order('created_at', { ascending: false }),
    client
      .from('reminders')
      .select(
        'id, entry_date, title, due_time, completed, completed_at, author_role, completed_by_role, recurrence, category, created_at'
      )
      .eq('board_id', boardId)
      .order('created_at', { ascending: true }),
    client
      .from('finance_entries')
      .select(
        'id, entry_date, type, amount, category, mood_tag, note, author_role, created_at'
      )
      .eq('board_id', boardId)
      .order('created_at', { ascending: false }),
    client
      .from('voice_memos')
      .select(
        'id, entry_date, title, audio_data_url, duration_sec, author_role, created_at'
      )
      .eq('board_id', boardId)
      .order('created_at', { ascending: false }),
    client
      .from('music_tracks')
      .select(
        'id, source, url, embed_id, is_playlist, spotify_kind, title, artist_or_channel, vibe_tag, is_favorite, author_role, created_at'
      )
      .eq('board_id', boardId)
      .order('created_at', { ascending: false }),
  ]);

  const members: BoardMember[] = (membersRes.data ?? []).map((m) => ({
    userId: m.user_id,
    role: m.role as MemberRole,
    email: m.email || '',
    nickname:
      m.nickname ||
      (m.role === 'owner' ? DEFAULT_OWNER_NICKNAME : DEFAULT_PARTNER_NICKNAME),
    heartColor: m.heart_color || (m.role === 'owner' ? 'sky' : 'sage'),
    joinedAt: m.joined_at,
  }));

  const myMember = members.find((m) => m.userId === user.id);
  const pendingRow = invitesRes.data?.[0];
  const pendingInvite: BoardInvitation | null = pendingRow
    ? {
        id: pendingRow.id,
        boardId: pendingRow.board_id,
        inviterNickname: pendingRow.inviter_nickname,
        inviteeEmail: pendingRow.invitee_email,
        inviteeNickname: pendingRow.invitee_nickname,
        inviteCode: pendingRow.invite_code,
        status: pendingRow.status,
        createdAt: pendingRow.created_at,
      }
    : null;

  const dayEntries: Record<string, DayEntry> = {};
  for (const row of daysRes.data ?? []) {
    dayEntries[row.entry_date] = {
      entryDate: row.entry_date,
      mood: row.mood,
      partnerMood: row.partner_mood ?? undefined,
      weather: row.weather,
      songTitle: row.song_title ?? undefined,
      songArtist: row.song_artist ?? undefined,
      songSource: row.song_source ?? undefined,
      songUrl: row.song_url ?? undefined,
      dailyQuote: row.daily_quote ?? undefined,
      promptAnswers: row.prompt_answers ?? undefined,
      stickers: Array.isArray(row.stickers) ? row.stickers : undefined,
      updatedAt: row.updated_at,
    };
  }

  const userKey = (user.email || user.id).toLowerCase();
  const pendingOps = loadOutbox(userKey);
  const pendingDeletedPhotoIds = new Set(
    pendingOps
      .filter((op) => op.kind === 'delete_photo')
      .map((op) => (op as { itemId: string }).itemId)
  );
  const pendingUpsertPhotoIds = new Set(
    pendingOps
      .filter((op) => op.kind === 'upsert_photo')
      .map((op) => (op as { photo: DayPhoto }).photo.id)
  );
  const pendingUpsertNoteIds = new Set(
    pendingOps
      .filter((op) => op.kind === 'upsert_note')
      .map((op) => (op as { note: NoteItem }).note.id)
  );
  const pendingUpsertReminderIds = new Set(
    pendingOps
      .filter((op) => op.kind === 'upsert_reminder')
      .map((op) => (op as { reminder: ReminderItem }).reminder.id)
  );
  const pendingUpsertFinanceIds = new Set(
    pendingOps
      .filter((op) => op.kind === 'upsert_finance')
      .map((op) => (op as { finance: FinanceEntry }).finance.id)
  );
  const pendingUpsertVoiceIds = new Set(
    pendingOps
      .filter((op) => op.kind === 'upsert_voice')
      .map((op) => (op as { voice: VoiceMemo }).voice.id)
  );

  // Batch-sign all uncached Storage bucket paths in ONE HTTP call instead of N sequential calls
  const photoRows = photosRes.data ?? [];
  const nowMs = Date.now();
  const uncachedBucketPaths = Array.from(
    new Set(
      photoRows
        .map((r) => r.storage_path)
        .filter(
          (p): p is string =>
            typeof p === 'string' &&
            Boolean(p) &&
            !p.startsWith('data:image/') &&
            !p.startsWith('https://') &&
            (signedUrlCache.get(p)?.expiresAt ?? 0) <= nowMs
        )
    )
  );

  if (uncachedBucketPaths.length > 0) {
    const batchSigned = await client.storage
      .from('daily-photos')
      .createSignedUrls(uncachedBucketPaths, 60 * 60 * 24);
    const ttlExpires = nowMs + 20 * 60 * 60 * 1000;
    for (const entry of batchSigned.data ?? []) {
      if (entry.path && entry.signedUrl) {
        signedUrlCache.set(entry.path, {
          url: entry.signedUrl,
          expiresAt: ttlExpires,
        });
      }
    }
  }

  const cloudPhotos: DayPhoto[] = [];
  for (const row of photoRows) {
    if (pendingDeletedPhotoIds.has(row.id)) continue;
    const localMatch = fallbackStore.photos.find((p) => p.id === row.id);
    let resolvedUrl = '';
    if (
      typeof row.storage_path === 'string' &&
      (row.storage_path.startsWith('data:image/') ||
        row.storage_path.startsWith('https://'))
    ) {
      resolvedUrl = row.storage_path;
    } else if (row.storage_path) {
      resolvedUrl =
        signedUrlCache.get(row.storage_path)?.url || localMatch?.dataUrl || '';
    } else if (localMatch?.dataUrl) {
      resolvedUrl = localMatch.dataUrl;
    }

    if (!resolvedUrl) continue;

    const parsedFrame = decodeWashiAndFrame(row.washi_style);
    cloudPhotos.push({
      id: row.id,
      entryDate: row.entry_date,
      dataUrl: resolvedUrl,
      storagePath: row.storage_path,
      syncState: 'synced',
      frameColor: parsedFrame.frameColor ?? localMatch?.frameColor,
      caption: row.caption,
      washiStyle: parsedFrame.washiStyle,
      rotationDeg: Number(row.rotation_deg ?? -2),
      isCover: Boolean(row.is_cover),
      authorRole: (row.author_role as MemberRole) || 'owner',
      reactions: Array.isArray(row.reactions) ? row.reactions : [],
      comments: Array.isArray(row.comments) ? row.comments : [],
      createdAt: row.created_at,
    });
  }

  // Keep unsynced local photos while allowing cloud-deleted ('synced') photos to stay deleted
  const cloudPhotoIds = new Set(cloudPhotos.map((p) => p.id));
  const localOnlyPhotos = fallbackStore.photos.filter(
    (p) =>
      Boolean(p.dataUrl) &&
      !cloudPhotoIds.has(p.id) &&
      !pendingDeletedPhotoIds.has(p.id) &&
      (Boolean(photosRes.error) ||
        pendingUpsertPhotoIds.has(p.id) ||
        p.syncState !== 'synced')
  );
  const photos: DayPhoto[] = [...localOnlyPhotos, ...cloudPhotos];

  const cloudNotes: NoteItem[] = (notesRes.data ?? []).map((n) => ({
    id: n.id,
    entryDate: n.entry_date,
    kind: n.kind,
    title: n.title,
    content: n.content,
    paperStyle: n.paper_style,
    isPrivate: Boolean(n.is_private),
    unlockDate: n.unlock_date ?? undefined,
    pinned: Boolean(n.pinned),
    authorRole: (n.author_role as MemberRole) || 'owner',
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  }));
  const cloudNoteIds = new Set(cloudNotes.map((n) => n.id));
  const notes: NoteItem[] = notesRes.error
    ? fallbackStore.notes
    : [
        ...fallbackStore.notes.filter(
          (n) => !cloudNoteIds.has(n.id) && pendingUpsertNoteIds.has(n.id)
        ),
        ...cloudNotes,
      ];

  const cloudReminders: ReminderItem[] = (remindersRes.data ?? []).map((r) => ({
    id: r.id,
    entryDate: r.entry_date,
    title: r.title,
    dueTime: r.due_time ?? undefined,
    completed: Boolean(r.completed),
    completedAt: r.completed_at ?? undefined,
    authorRole: (r.author_role as MemberRole) || 'owner',
    completedByRole: (r.completed_by_role as MemberRole) ?? undefined,
    recurrence: r.recurrence || 'none',
    category: r.category,
    createdAt: r.created_at,
  }));
  const cloudReminderIds = new Set(cloudReminders.map((r) => r.id));
  const reminders: ReminderItem[] = remindersRes.error
    ? fallbackStore.reminders
    : [
        ...cloudReminders,
        ...fallbackStore.reminders.filter(
          (r) => !cloudReminderIds.has(r.id) && pendingUpsertReminderIds.has(r.id)
        ),
      ];

  const cloudFinance: FinanceEntry[] = (financeRes.data ?? []).map((f) => ({
    id: f.id,
    entryDate: f.entry_date,
    type: f.type,
    amount: Number(f.amount),
    category: f.category,
    moodTag: f.mood_tag,
    note: f.note,
    authorRole: (f.author_role as MemberRole) || 'owner',
    createdAt: f.created_at,
  }));
  const cloudFinanceIds = new Set(cloudFinance.map((f) => f.id));
  const finance: FinanceEntry[] = financeRes.error
    ? fallbackStore.finance
    : [
        ...fallbackStore.finance.filter(
          (f) => !cloudFinanceIds.has(f.id) && pendingUpsertFinanceIds.has(f.id)
        ),
        ...cloudFinance,
      ];

  const cloudVoices: VoiceMemo[] = (voicesRes.data ?? []).map((v) => ({
    id: v.id,
    entryDate: v.entry_date,
    title: v.title,
    dataUrl: v.audio_data_url,
    durationSec: Number(v.duration_sec ?? 0),
    authorRole: (v.author_role as MemberRole) || 'owner',
    createdAt: v.created_at,
  }));
  const cloudVoiceIds = new Set(cloudVoices.map((v) => v.id));
  const voiceMemos: VoiceMemo[] = voicesRes.error
    ? fallbackStore.voiceMemos ?? []
    : [
        ...(fallbackStore.voiceMemos ?? []).filter(
          (v) => !cloudVoiceIds.has(v.id) && pendingUpsertVoiceIds.has(v.id)
        ),
        ...cloudVoices,
      ];

  const cloudTracks: MusicTrack[] = (tracksRes.data ?? []).map((t) => ({
    id: t.id,
    source: t.source,
    url: t.url,
    embedId: t.embed_id,
    isPlaylist: Boolean(t.is_playlist),
    spotifyKind: t.spotify_kind ?? undefined,
    title: t.title,
    artistOrChannel: t.artist_or_channel,
    vibeTag: t.vibe_tag,
    isFavorite: Boolean(t.is_favorite),
    authorRole: (t.author_role as MemberRole) || 'owner',
    createdAt: t.created_at,
  }));

  return {
    version: 3,
    hasSampleData: false,
    profile: boardRes.data
      ? {
          boardTitle: boardRes.data.board_title || DEFAULT_BOARD_TITLE,
          catName: boardRes.data.cat_name || 'Mochi',
          partnerCatName: boardRes.data.partner_cat_name || 'Latte',
          catStyle: boardRes.data.cat_style || 'hybrid',
          defaultTheme: boardRes.data.default_theme || 'sunlit',
          boardTexture: boardRes.data.board_texture || 'cork',
          fontStyle: boardRes.data.font_style || 'rounded',
          monthlyBudget: Number(boardRes.data.monthly_budget ?? 8000000),
          savingGoal: boardRes.data.saving_goal || fallbackStore.profile.savingGoal,
          activeDecor: Array.isArray(boardRes.data.active_decor)
            ? boardRes.data.active_decor
            : fallbackStore.profile.activeDecor,
          currency: boardRes.data.currency ?? 'VND',
          journalPin: boardRes.data.journal_pin_hash ?? undefined,
        }
      : fallbackStore.profile,
    sharing: {
      boardId,
      members: members.length > 0 ? members : fallbackStore.sharing.members,
      pendingInvite,
      activeRole: myMember?.role || fallbackStore.sharing.activeRole,
    },
    syncedTrack: (boardRes.data?.active_track as MusicTrack | null) ?? null,
    dayEntries: {
      ...fallbackStore.dayEntries,
      ...dayEntries,
    },
    photos,
    notes,
    reminders,
    finance,
    voiceMemos,
    tracks: cloudTracks.length > 0 ? cloudTracks : fallbackStore.tracks,
  };
}

export interface OnlineMemberPresence {
  userId: string;
  nickname: string;
  role: MemberRole;
}

export interface RealtimeDeltaEvent {
  table: string;
  eventType: string;
  newRow: Record<string, unknown>;
  oldRow: Record<string, unknown>;
}

/**
 * Applies a WebSocket row event directly in memory (<20ms) without re-querying all 10 tables.
 * Returns needsFullPull=true only when signed storage URLs or board membership require a pull.
 */
export function applyRealtimeDelta(
  current: CatyStoreData,
  evt: RealtimeDeltaEvent
): { next: CatyStoreData; needsFullPull: boolean } {
  const { table, eventType, newRow, oldRow } = evt;
  const targetId = String(oldRow?.id || newRow?.id || '');

  if (table === 'board_members' || table === 'board_invitations') {
    return { next: current, needsFullPull: true };
  }

  if (eventType === 'DELETE' && targetId) {
    switch (table) {
      case 'day_photos':
        return {
          next: { ...current, photos: current.photos.filter((p) => p.id !== targetId) },
          needsFullPull: false,
        };
      case 'notes':
        return {
          next: { ...current, notes: current.notes.filter((n) => n.id !== targetId) },
          needsFullPull: false,
        };
      case 'reminders':
        return {
          next: {
            ...current,
            reminders: current.reminders.filter((r) => r.id !== targetId),
          },
          needsFullPull: false,
        };
      case 'finance_entries':
        return {
          next: { ...current, finance: current.finance.filter((f) => f.id !== targetId) },
          needsFullPull: false,
        };
      case 'voice_memos':
        return {
          next: {
            ...current,
            voiceMemos: (current.voiceMemos ?? []).filter((v) => v.id !== targetId),
          },
          needsFullPull: false,
        };
      case 'music_tracks':
        return {
          next: { ...current, tracks: current.tracks.filter((t) => t.id !== targetId) },
          needsFullPull: false,
        };
    }
  }

  if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRow) {
    if (table === 'reminders' && typeof newRow.id === 'string') {
      const updated: ReminderItem = {
        id: newRow.id,
        entryDate: String(newRow.entry_date || ''),
        title: String(newRow.title || ''),
        dueTime: newRow.due_time ? String(newRow.due_time) : undefined,
        completed: Boolean(newRow.completed),
        completedAt: newRow.completed_at ? String(newRow.completed_at) : undefined,
        authorRole: ((newRow.author_role as MemberRole) || 'owner'),
        completedByRole: (newRow.completed_by_role as MemberRole) ?? undefined,
        recurrence: (newRow.recurrence as ReminderItem['recurrence']) || 'none',
        category: (newRow.category as ReminderItem['category']) || 'life',
        createdAt: String(newRow.created_at || new Date().toISOString()),
      };
      const exists = current.reminders.some((r) => r.id === updated.id);
      return {
        next: {
          ...current,
          reminders: exists
            ? current.reminders.map((r) => (r.id === updated.id ? updated : r))
            : [...current.reminders, updated],
        },
        needsFullPull: false,
      };
    }

    if (table === 'notes' && typeof newRow.id === 'string') {
      const updated: NoteItem = {
        id: newRow.id,
        entryDate: String(newRow.entry_date || ''),
        kind: (newRow.kind as NoteItem['kind']) || 'sticky',
        title: String(newRow.title || ''),
        content: String(newRow.content || ''),
        paperStyle: (newRow.paper_style as NoteItem['paperStyle']) || 'cream-torn',
        isPrivate: Boolean(newRow.is_private),
        unlockDate: newRow.unlock_date ? String(newRow.unlock_date) : undefined,
        pinned: Boolean(newRow.pinned),
        authorRole: (newRow.author_role as MemberRole) || 'owner',
        createdAt: String(newRow.created_at || new Date().toISOString()),
        updatedAt: String(newRow.updated_at || new Date().toISOString()),
      };
      const exists = current.notes.some((n) => n.id === updated.id);
      return {
        next: {
          ...current,
          notes: exists
            ? current.notes.map((n) => (n.id === updated.id ? updated : n))
            : [updated, ...current.notes],
        },
        needsFullPull: false,
      };
    }

    if (table === 'finance_entries' && typeof newRow.id === 'string') {
      const updated: FinanceEntry = {
        id: newRow.id,
        entryDate: String(newRow.entry_date || ''),
        type: (newRow.type as FinanceEntry['type']) || 'expense',
        amount: Number(newRow.amount ?? 0),
        category: (newRow.category as FinanceEntry['category']) || 'food',
        moodTag: (newRow.mood_tag as FinanceEntry['moodTag']) || 'essential',
        note: String(newRow.note || ''),
        authorRole: (newRow.author_role as MemberRole) || 'owner',
        createdAt: String(newRow.created_at || new Date().toISOString()),
      };
      const exists = current.finance.some((f) => f.id === updated.id);
      return {
        next: {
          ...current,
          finance: exists
            ? current.finance.map((f) => (f.id === updated.id ? updated : f))
            : [updated, ...current.finance],
        },
        needsFullPull: false,
      };
    }

    if (table === 'day_photos' && typeof newRow.id === 'string') {
      const sp = String(newRow.storage_path || '');
      const existingPhoto = current.photos.find((p) => p.id === newRow.id);
      const cachedSigned = signedUrlCache.get(sp)?.url;
      const directUrl =
        sp.startsWith('data:image/') || sp.startsWith('https://')
          ? sp
          : cachedSigned || existingPhoto?.dataUrl || '';
      if (!directUrl) {
        return { next: current, needsFullPull: true };
      }
      const parsedFrame = decodeWashiAndFrame(
        typeof newRow.washi_style === 'string' ? newRow.washi_style : undefined
      );
      const updatedPhoto: DayPhoto = {
        id: newRow.id,
        entryDate: String(newRow.entry_date || ''),
        dataUrl: directUrl,
        storagePath: sp,
        syncState: 'synced',
        frameColor: parsedFrame.frameColor ?? existingPhoto?.frameColor,
        caption: String(newRow.caption || ''),
        washiStyle: parsedFrame.washiStyle,
        rotationDeg: Number(newRow.rotation_deg ?? -2),
        isCover: Boolean(newRow.is_cover),
        authorRole: (newRow.author_role as MemberRole) || 'owner',
        reactions: Array.isArray(newRow.reactions) ? (newRow.reactions as string[]) : [],
        comments: Array.isArray(newRow.comments)
          ? (newRow.comments as DayPhoto['comments'])
          : [],
        createdAt: String(newRow.created_at || new Date().toISOString()),
      };
      return {
        next: {
          ...current,
          photos: existingPhoto
            ? current.photos.map((p) => (p.id === updatedPhoto.id ? updatedPhoto : p))
            : [updatedPhoto, ...current.photos],
        },
        needsFullPull: false,
      };
    }
  }

  return { next: current, needsFullPull: true };
}

export function subscribeBoardRealtime(
  client: SupabaseClient,
  boardId: string,
  me: OnlineMemberPresence,
  handlers: {
    onDataChanged: (delta?: RealtimeDeltaEvent) => void;
    onPresenceChange: (online: OnlineMemberPresence[]) => void;
    onHeartPing: (fromNickname: string) => void;
    onDeskTreat?: (treat: {
      fromNickname: string;
      emoji: string;
      label: string;
    }) => void;
  }
): RealtimeChannel {
  const channel = client.channel(`catyboard-room-${boardId}`, {
    config: {
      presence: { key: me.userId },
      broadcast: { self: false },
    },
  });

  const tables = [
    'boards',
    'board_members',
    'board_invitations',
    'day_entries',
    'day_photos',
    'notes',
    'reminders',
    'finance_entries',
    'voice_memos',
    'music_tracks',
  ];

  for (const table of tables) {
    const filter = table === 'boards' ? `id=eq.${boardId}` : `board_id=eq.${boardId}`;
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter },
      (payload) => {
        handlers.onDataChanged({
          table,
          eventType: payload.eventType,
          newRow: (payload.new as Record<string, unknown>) || {},
          oldRow: (payload.old as Record<string, unknown>) || {},
        });
      }
    );
  }

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<OnlineMemberPresence>();
      const online: OnlineMemberPresence[] = [];
      for (const entries of Object.values(state)) {
        if (entries[0]) online.push(entries[0]);
      }
      handlers.onPresenceChange(online);
    })
    .on('broadcast', { event: 'heart_ping' }, ({ payload }) => {
      const from = (payload as { fromNickname?: string })?.fromNickname;
      if (from) handlers.onHeartPing(from);
    })
    .on('broadcast', { event: 'desk_treat' }, ({ payload }) => {
      const p = payload as {
        fromNickname?: string;
        emoji?: string;
        label?: string;
      };
      if (p?.fromNickname && p?.emoji && handlers.onDeskTreat) {
        handlers.onDeskTreat({
          fromNickname: p.fromNickname,
          emoji: p.emoji,
          label: p.label || 'món quà nhỏ',
        });
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        void channel.track(me);
      }
    });

  return channel;
}
