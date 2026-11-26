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

const OUTBOX_STORAGE_KEY = 'catyboard_sync_outbox_v1';

export function loadOutbox(): OutboxOp[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OUTBOX_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OutboxOp[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOutbox(ops: OutboxOp[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(ops));
  } catch {
    // Ignore quota errors; full sync handles recovery
  }
}

export function enqueueOutboxOp(op: OutboxOp): OutboxOp[] {
  const existing = loadOutbox();
  // Coalesce repeated upserts of the same entity to keep the queue compact
  const filtered = existing.filter((item) => item.id !== op.id);
  const next = [...filtered, op];
  saveOutbox(next);
  return next;
}
