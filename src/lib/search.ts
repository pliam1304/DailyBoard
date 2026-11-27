import { parseDateKey, toLocalDateKey } from './date.ts';
import { calculateStreak } from './prompts.ts';
import type {
  CatDecorId,
  CatyStoreData,
  DayPhoto,
  ReminderItem,
} from '@/types/catyboard';

export interface SearchHit {
  id: string;
  kind: 'photo' | 'note' | 'reminder' | 'finance' | 'voice';
  entryDate: string;
  title: string;
  snippet: string;
}

export function searchAcrossBoard(
  store: CatyStoreData,
  rawQuery: string
): SearchHit[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];

  const hits: SearchHit[] = [];

  for (const photo of store.photos) {
    const commentMatch = (photo.comments ?? []).some(
      (c) =>
        c.id !== '__polaroid_back_voice__' && c.text.toLowerCase().includes(q)
    );
    if (photo.caption.toLowerCase().includes(q) || commentMatch) {
      hits.push({
        id: `hit-photo-${photo.id}`,
        kind: 'photo',
        entryDate: photo.entryDate,
        title: photo.caption || 'Ảnh Polaroid',
        snippet: commentMatch
          ? 'Khớp bình luận trên ảnh Polaroid'
          : 'Ảnh Polaroid kỷ niệm',
      });
    }
  }

  const todayKey = toLocalDateKey();

  for (const note of store.notes) {
    const isLockedCapsule = Boolean(note.unlockDate && note.unlockDate > todayKey);
    const isHiddenContent =
      note.isPrivate || isLockedCapsule || note.content.startsWith('enc:v1:');
    const titleMatch = note.title.toLowerCase().includes(q);
    const contentMatch = !isHiddenContent && note.content.toLowerCase().includes(q);
    if (titleMatch || contentMatch) {
      hits.push({
        id: `hit-note-${note.id}`,
        kind: 'note',
        entryDate: note.entryDate,
        title: note.title || 'Ghi chú',
        snippet: isLockedCapsule
          ? `⏳ Niêm phong đến ngày ${note.unlockDate}`
          : isHiddenContent
            ? '🔒 Nội dung riêng tư đang khóa'
            : note.content.slice(0, 90),
      });
    }
  }

  for (const rem of store.reminders) {
    if (rem.title.toLowerCase().includes(q)) {
      hits.push({
        id: `hit-rem-${rem.id}`,
        kind: 'reminder',
        entryDate: rem.entryDate,
        title: rem.title,
        snippet: rem.completed ? 'Đã hoàn thành 🐾' : 'Lời nhắc cần làm',
      });
    }
  }

  for (const fin of store.finance) {
    if (
      fin.note.toLowerCase().includes(q) ||
      fin.category.toLowerCase().includes(q)
    ) {
      hits.push({
        id: `hit-fin-${fin.id}`,
        kind: 'finance',
        entryDate: fin.entryDate,
        title: fin.note,
        snippet: `${fin.type === 'expense' ? '-' : '+'}${Math.round(fin.amount).toLocaleString('vi-VN')}đ`,
      });
    }
  }

  for (const voice of store.voiceMemos ?? []) {
    if (voice.title.toLowerCase().includes(q)) {
      hits.push({
        id: `hit-voice-${voice.id}`,
        kind: 'voice',
        entryDate: voice.entryDate,
        title: voice.title,
        snippet: `Băng thu âm ${voice.durationSec}s`,
      });
    }
  }

  return hits.sort((a, b) => b.entryDate.localeCompare(a.entryDate)).slice(0, 30);
}

export function pickThrowbackPhoto(
  store: CatyStoreData,
  currentDate: string
): DayPhoto | null {
  const older = store.photos.filter((p) => p.entryDate < currentDate);
  if (older.length === 0) return null;

  let hash = 0;
  for (let i = 0; i < currentDate.length; i += 1) {
    hash = (hash * 31 + currentDate.charCodeAt(i)) >>> 0;
  }
  return older[hash % older.length];
}

export interface CatDecorItem {
  id: CatDecorId;
  label: string;
  emoji: string;
  fishCost: number;
}

export const CAT_DECOR_CATALOG: CatDecorItem[] = [
  { id: 'steaming-mug', label: 'Ly cà phê ấm', emoji: '☕', fishCost: 0 },
  { id: 'cactus', label: 'Chậu xương rồng', emoji: '🌵', fishCost: 5 },
  { id: 'fairy-lights', label: 'Đèn dây vàng', emoji: '✨', fishCost: 10 },
  { id: 'books', label: 'Chồng sách lofi', emoji: '📚', fishCost: 15 },
  { id: 'cozy-beanie', label: 'Mũ len cho mèo', emoji: '🧶', fishCost: 20 },
];

export function computeFishPoints(
  store: CatyStoreData,
  todayKey: string
): number {
  const photoPts = store.photos.length * 3;
  const donePts = store.reminders.filter((r) => r.completed).length * 2;
  const notePts = store.notes.length * 1;
  const voicePts = (store.voiceMemos ?? []).length * 2;
  const streakPts = calculateStreak(store, todayKey) * 5;
  return photoPts + donePts + notePts + voicePts + streakPts;
}

/**
 * Expands daily and weekly recurring reminders onto `targetDate`
 * without duplicating entries that already exist on `targetDate`.
 */
export function getRemindersForDateWithRecurrence(
  allReminders: ReminderItem[],
  targetDate: string
): ReminderItem[] {
  const direct = allReminders.filter((r) => r.entryDate === targetDate);
  const directKeySet = new Set(
    direct.map((r) => `${r.title.trim().toLowerCase()}::${r.dueTime || ''}`)
  );

  const targetDow = parseDateKey(targetDate).getDay();
  const virtuals: ReminderItem[] = [];
  const seenTemplateKey = new Set<string>();

  for (const r of allReminders) {
    if (!r.recurrence || r.recurrence === 'none') continue;
    if (r.entryDate >= targetDate) continue;

    const key = `${r.title.trim().toLowerCase()}::${r.dueTime || ''}`;
    if (directKeySet.has(key) || seenTemplateKey.has(key)) continue;

    if (r.recurrence === 'daily') {
      seenTemplateKey.add(key);
      virtuals.push({
        ...r,
        id: `rec-${r.id}-${targetDate}`,
        entryDate: targetDate,
        completed: false,
        completedAt: undefined,
        completedByRole: undefined,
      });
    } else if (
      r.recurrence === 'weekly' &&
      parseDateKey(r.entryDate).getDay() === targetDow
    ) {
      seenTemplateKey.add(key);
      virtuals.push({
        ...r,
        id: `rec-${r.id}-${targetDate}`,
        entryDate: targetDate,
        completed: false,
        completedAt: undefined,
        completedByRole: undefined,
      });
    }
  }

  return [...direct, ...virtuals];
}
