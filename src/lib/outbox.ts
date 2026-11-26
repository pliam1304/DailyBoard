import { getActiveLocalUserEmail } from './storage.ts';
import type {
  DayEntry,
  DayPhoto,
  FinanceEntry,
  MusicTrack,
  NoteItem,
  ReminderItem,
  UserProfile,
  VoiceMemo,
} from '@/types/catyboard';

export type OutboxOp =
  | { id: string; kind: 'upsert_board'; profile: UserProfile; syncedTrack?: MusicTrack | null }
  | { id: string; kind: 'upsert_day'; entry: DayEntry }
  | { id: string; kind: 'upsert_photo'; photo: DayPhoto }
  | { id: string; kind: 'delete_photo'; itemId: string; storagePath?: string }
  | { id: string; kind: 'upsert_note'; note: NoteItem }
  | { id: string; kind: 'delete_note'; itemId: string }
  | { id: string; kind: 'upsert_reminder'; reminder: ReminderItem }
  | { id: string; kind: 'delete_reminder'; itemId: string }
  | { id: string; kind: 'upsert_finance'; finance: FinanceEntry }
  | { id: string; kind: 'delete_finance'; itemId: string }
  | { id: string; kind: 'upsert_voice'; voice: VoiceMemo }
  | { id: string; kind: 'delete_voice'; itemId: string }
  | { id: string; kind: 'upsert_track'; track: MusicTrack }
  | { id: string; kind: 'delete_track'; itemId: string };

const OUTBOX_KEY_PREFIX = 'nameboard_sync_outbox_v2_';

export function resolveOutboxKey(userIdentifier?: string | null): string {
  const raw =
    userIdentifier ||
    (typeof window !== 'undefined' ? getActiveLocalUserEmail() : null) ||
    'guest';
  const safe = raw.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '_') || 'guest';
  return `${OUTBOX_KEY_PREFIX}${safe}`;
}

export function loadOutbox(userIdentifier?: string | null): OutboxOp[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(resolveOutboxKey(userIdentifier));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OutboxOp[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOutbox(ops: OutboxOp[], userIdentifier?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      resolveOutboxKey(userIdentifier),
      JSON.stringify(ops)
    );
  } catch {
    // Ignore quota errors; full sync handles recovery
  }
}

export function enqueueOutboxOp(
  op: OutboxOp,
  userIdentifier?: string | null
): OutboxOp[] {
  const existing = loadOutbox(userIdentifier);
  // Coalesce repeated upserts of the same entity, and drop pending upserts if deleting that same item
  let filtered = existing.filter((item) => item.id !== op.id);
  if (op.kind === 'delete_photo') {
    filtered = filtered.filter(
      (item) => !(item.kind === 'upsert_photo' && item.photo.id === op.itemId)
    );
  } else if (op.kind === 'delete_note') {
    filtered = filtered.filter(
      (item) => !(item.kind === 'upsert_note' && item.note.id === op.itemId)
    );
  } else if (op.kind === 'delete_reminder') {
    filtered = filtered.filter(
      (item) =>
        !(item.kind === 'upsert_reminder' && item.reminder.id === op.itemId)
    );
  } else if (op.kind === 'delete_finance') {
    filtered = filtered.filter(
      (item) =>
        !(item.kind === 'upsert_finance' && item.finance.id === op.itemId)
    );
  } else if (op.kind === 'delete_voice') {
    filtered = filtered.filter(
      (item) => !(item.kind === 'upsert_voice' && item.voice.id === op.itemId)
    );
  }
  const next = [...filtered, op];
  saveOutbox(next, userIdentifier);
  return next;
}
