import { shiftDateKey } from './date.ts';
import type {
  CatMood,
  CatyStoreData,
  DayPhoto,
  FinanceCategory,
  FinanceMoodTag,
} from '@/types/catyboard';

export const DAILY_PROMPTS_VI: string[] = [
  'Hôm nay điều nhỏ xíu nào khiến bạn mỉm cười?',
  'Nếu đặt tên cho ngày hôm nay như một bản nhạc, nó sẽ tên là gì?',
  'Khoảnh khắc dễ chịu nhất trong ngày của bạn diễn ra lúc mấy giờ?',
  'Hôm nay bạn muốn khen bản thân (hoặc người ấy) vì điều gì?',
  'Món ăn hay thức uống ngon nhất hôm nay là gì nhỉ?',
  'Cuối tuần này bạn muốn dành thời gian làm điều gì thật chill?',
  'Có một điều gì nhỏ bé bạn muốn làm tốt hơn vào ngày mai không?',
  'Bầu trời hôm nay trông như thế nào trong mắt bạn?',
  'Điều gì làm bạn thấy biết ơn nhất trong ngày hôm nay?',
  'Nếu ngay lúc này được đi trốn 1 ngày, bạn muốn đi biển hay lên núi?',
  'Một bài hát bạn nghe đi nghe lại gần đây là gì?',
  'Hôm nay năng lượng của bạn ở mức mấy trên 10?',
  'Có câu nói hay suy nghĩ nào đọng lại trong đầu bạn hôm nay không?',
  'Bạn muốn chú mèo trên bàn nhắc bạn điều gì vào sáng mai?',
  'Một món đồ nhỏ hoặc trải nghiệm bạn đang muốn tiết kiệm để mua?',
  'Khoảnh khắc bình yên nhất tuần này là khi nào?',
  'Nếu viết 1 dòng ngắn lên tấm Polaroid hôm nay, bạn sẽ viết gì?',
  'Hôm nay có chuyện gì hơi mệt muốn bỏ lại phía sau trước khi ngủ không?',
  'Mùi hương nào làm bạn thấy ấm áp và dễ chịu nhất?',
  'Một thói quen nhỏ bạn đang tự hào vì giữ được gần đây?',
  'Nếu hai đứa / bạn có 2 tiếng hoàn toàn rảnh tối nay, làm gì sẽ vui nhất?',
  'Kỷ niệm cũ nào tự nhiên hiện về trong đầu bạn dạo gần đây?',
  'Hôm nay bạn đã chăm sóc cơ thể và giấc ngủ của mình tốt chưa?',
  'Một nơi có không gian lofi bạn muốn ghé thử sắp tới?',
];

export function getDailyPrompt(entryDate: string): string {
  // Deterministic hash from YYYY-MM-DD so both Him & Her see the exact same prompt
  let hash = 0;
  for (let i = 0; i < entryDate.length; i += 1) {
    hash = (hash * 31 + entryDate.charCodeAt(i)) >>> 0;
  }
  return DAILY_PROMPTS_VI[hash % DAILY_PROMPTS_VI.length];
}

export function formatFilmDateStamp(entryDate: string): string {
  // '26 11 20 classic retro film camera stamp
  const [yyyy, mm, dd] = entryDate.split('-');
  const yy = (yyyy || '2026').slice(-2);
  return `'${yy} ${mm || '01'} ${dd || '01'}`;
}

export function hasActivityOnDate(store: CatyStoreData, dateKey: string): boolean {
  if (store.photos.some((p) => p.entryDate === dateKey)) return true;
  if (store.notes.some((n) => n.entryDate === dateKey)) return true;
  if (store.reminders.some((r) => r.entryDate === dateKey && r.completed)) return true;
  if (store.finance.some((f) => f.entryDate === dateKey)) return true;
  const entry = store.dayEntries[dateKey];
  if (
    entry?.dailyQuote?.trim() ||
    entry?.promptAnswers?.ownerAnswer?.trim() ||
    entry?.promptAnswers?.partnerAnswer?.trim()
  ) {
    return true;
  }
  return false;
}

export function calculateStreak(store: CatyStoreData, todayKey: string): number {
  let cursor = todayKey;
  if (!hasActivityOnDate(store, cursor)) {
    // Allow streak to continue if user hasn't checked in yet today but did yesterday
    cursor = shiftDateKey(todayKey, -1);
    if (!hasActivityOnDate(store, cursor)) return 0;
  }

  let streak = 0;
  for (let i = 0; i < 365; i += 1) {
    if (!hasActivityOnDate(store, cursor)) break;
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
}

export interface MonthlyWrappedStats {
  yearMonth: string; // YYYY-MM
  photos: DayPhoto[];
  activeDays: number;
  totalDoneReminders: number;
  totalNotes: number;
  totalExpense: number;
  totalSaving: number;
  totalIncome: number;
  topExpenseCategory: { category: FinanceCategory; amount: number } | null;
  topMoodTag: { tag: FinanceMoodTag; count: number; percent: number } | null;
  topMood: { mood: CatMood; count: number } | null;
}

export function computeMonthlyWrapped(
  store: CatyStoreData,
  yearMonth: string
): MonthlyWrappedStats {
  const photos = store.photos.filter((p) => p.entryDate.startsWith(yearMonth));
  const notes = store.notes.filter((n) => n.entryDate.startsWith(yearMonth));
  const doneReminders = store.reminders.filter(
    (r) => r.entryDate.startsWith(yearMonth) && r.completed
  );
  const finance = store.finance.filter((f) => f.entryDate.startsWith(yearMonth));

  const activeDaySet = new Set<string>();
  photos.forEach((p) => activeDaySet.add(p.entryDate));
  notes.forEach((n) => activeDaySet.add(n.entryDate));
  doneReminders.forEach((r) => activeDaySet.add(r.entryDate));
  finance.forEach((f) => activeDaySet.add(f.entryDate));

  const expenses = finance.filter((f) => f.type === 'expense');
  const totalExpense = expenses.reduce((s, f) => s + f.amount, 0);
  const totalSaving = finance
    .filter((f) => f.type === 'saving')
    .reduce((s, f) => s + f.amount, 0);
  const totalIncome = finance
    .filter((f) => f.type === 'income')
    .reduce((s, f) => s + f.amount, 0);

  const catTotals = new Map<FinanceCategory, number>();
  const tagCounts = new Map<FinanceMoodTag, number>();
  for (const item of expenses) {
    catTotals.set(item.category, (catTotals.get(item.category) ?? 0) + item.amount);
    tagCounts.set(item.moodTag, (tagCounts.get(item.moodTag) ?? 0) + 1);
  }

  let topExpenseCategory: MonthlyWrappedStats['topExpenseCategory'] = null;
  for (const [category, amount] of catTotals.entries()) {
    if (!topExpenseCategory || amount > topExpenseCategory.amount) {
      topExpenseCategory = { category, amount };
    }
  }

  let topMoodTag: MonthlyWrappedStats['topMoodTag'] = null;
  for (const [tag, count] of tagCounts.entries()) {
    if (!topMoodTag || count > topMoodTag.count) {
      topMoodTag = {
        tag,
        count,
        percent: expenses.length > 0 ? Math.round((count / expenses.length) * 100) : 0,
      };
    }
  }

  const moodCounts = new Map<CatMood, number>();
  for (const entry of Object.values(store.dayEntries)) {
    if (!entry.entryDate.startsWith(yearMonth)) continue;
    moodCounts.set(entry.mood, (moodCounts.get(entry.mood) ?? 0) + 1);
  }
  let topMood: MonthlyWrappedStats['topMood'] = null;
  for (const [mood, count] of moodCounts.entries()) {
    if (!topMood || count > topMood.count) {
      topMood = { mood, count };
    }
  }

  return {
    yearMonth,
    photos,
    activeDays: activeDaySet.size,
    totalDoneReminders: doneReminders.length,
    totalNotes: notes.length,
    totalExpense,
    totalSaving,
    totalIncome,
    topExpenseCategory,
    topMoodTag,
    topMood,
  };
}
