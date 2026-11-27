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

export interface CatFortuneSlip {
  quote: string;
  microHint: string;
}

export const DAILY_CAT_FORTUNES_VI: CatFortuneSlip[] = [
  {
    quote: 'Mọi thứ không cần hoàn hảo ngay hôm nay, chỉ cần ấm áp là đủ.',
    microHint: 'Thử chụp lại góc bàn hoặc ly nước trước mặt bạn lúc này nhé ☕',
  },
  {
    quote: 'Uống một ngụm nước mát, thả lỏng hai vai xuống một chút nào.',
    microHint: 'Bật một bản nhạc nhẹ và nghỉ mắt 2 phút nha 🐾',
  },
  {
    quote: 'Một bước nhỏ xíu hôm nay vẫn tốt hơn đứng yên tại chỗ.',
    microHint: 'Chọn ra đúng 1 việc nhỏ nhất để làm xong hôm nay ✅',
  },
  {
    quote: 'Hôm nay bầu trời có màu rất riêng, nhớ ngẩng lên nhìn thử một lát.',
    microHint: 'Chụp nhanh một tấm bầu trời ghim vào bảng ngày hôm nay 🌤️',
  },
  {
    quote: 'Những ngày bình thường êm ả thực ra lại là những ngày đáng nhớ nhất.',
    microHint: 'Ghi lại 1 dòng ngắn về điều làm bạn thấy dễ chịu hôm nay 📝',
  },
  {
    quote: 'Đừng quên tự thưởng cho mình một món ngon sau giờ làm mệt nhé.',
    microHint: 'Ghi nhẹ khoản tự thưởng hôm nay vào sổ ví 🍰',
  },
  {
    quote: 'Có người đang âm thầm quý mến sự dịu dàng của bạn đấy.',
    microHint: 'Gửi một lời nhắn nhỏ hoặc trái tim cho người bạn thương 💌',
  },
  {
    quote: 'Chậm lại một nhịp không phải là trễ, mà là để đi đường dài đỡ mệt.',
    microHint: 'Thử bật tiếng mưa rơi nho nhỏ khi ngồi học hoặc làm việc 🌧️',
  },
  {
    quote: 'Giấc ngủ ngon tối nay quan trọng hơn những chuyện chưa kịp nghĩ xong.',
    microHint: 'Tối nay thử hẹn giờ tắt nhạc 15 phút trước khi đi ngủ nhé 🌙',
  },
  {
    quote: 'Niềm vui nhỏ nhặt gom lại mỗi ngày sẽ thành một mùa thật đẹp.',
    microHint: 'Ghim bài hát bạn đang thích nhất hôm nay lên bảng 🎧',
  },
  {
    quote: 'Bạn đã cố gắng nhiều hơn bạn tự nghĩ về mình rồi đó.',
    microHint: 'Viết 1 câu tự khen bản thân vào mẩu giấy nhớ hôm nay.',
  },
  {
    quote: 'Một tách trà ấm và một bản piano đủ làm dịu cả buổi chiều bận rộn.',
    microHint: 'Mở kệ nhạc Piano & Chill nghe thử 1 bài mới nhé 🎹',
  },
];

export function getDailyCatFortune(entryDate: string): CatFortuneSlip {
  let hash = 7;
  for (let i = 0; i < entryDate.length; i += 1) {
    hash = (hash * 37 + entryDate.charCodeAt(i)) >>> 0;
  }
  return DAILY_CAT_FORTUNES_VI[hash % DAILY_CAT_FORTUNES_VI.length];
}

export function hasActivityOnDate(store: CatyStoreData, dateKey: string): boolean {
  if (store.photos.some((p) => p.entryDate === dateKey)) return true;
  if (store.notes.some((n) => n.entryDate === dateKey)) return true;
  if ((store.voiceMemos ?? []).some((v) => v.entryDate === dateKey)) return true;
  if (store.reminders.some((r) => r.entryDate === dateKey && r.completed)) return true;
  if (store.finance.some((f) => f.entryDate === dateKey)) return true;
  const entry = store.dayEntries[dateKey];
  if (
    entry?.checkedIn ||
    entry?.songTitle?.trim() ||
    entry?.dailyQuote?.trim() ||
    entry?.promptAnswers?.ownerAnswer?.trim() ||
    entry?.promptAnswers?.partnerAnswer?.trim()
  ) {
    return true;
  }
  return false;
}

export function countTotalActiveDays(store: CatyStoreData): number {
  const activeSet = new Set<string>();
  for (const p of store.photos) activeSet.add(p.entryDate);
  for (const n of store.notes) activeSet.add(n.entryDate);
  for (const v of store.voiceMemos ?? []) activeSet.add(v.entryDate);
  for (const r of store.reminders) {
    if (r.completed) activeSet.add(r.entryDate);
  }
  for (const f of store.finance) activeSet.add(f.entryDate);
  for (const [dk, entry] of Object.entries(store.dayEntries)) {
    if (
      entry?.checkedIn ||
      entry?.songTitle?.trim() ||
      entry?.dailyQuote?.trim() ||
      entry?.promptAnswers?.ownerAnswer?.trim() ||
      entry?.promptAnswers?.partnerAnswer?.trim()
    ) {
      activeSet.add(dk);
    }
  }
  return activeSet.size;
}

export function calculateStreakDetails(
  store: CatyStoreData,
  todayKey: string
): { streak: number; shieldsAvailable: number; usedShield: boolean } {
  const earnedShields = Math.min(3, Math.floor(countTotalActiveDays(store) / 7));
  let shieldsLeft = earnedShields;
  let shieldsUsed = 0;

  let cursor = todayKey;
  if (!hasActivityOnDate(store, cursor)) {
    cursor = shiftDateKey(todayKey, -1);
    if (!hasActivityOnDate(store, cursor)) {
      // Check if a Cat Nap Shield can bridge 1 missed day
      const twoDaysAgo = shiftDateKey(todayKey, -2);
      if (shieldsLeft > 0 && hasActivityOnDate(store, twoDaysAgo)) {
        shieldsLeft -= 1;
        shieldsUsed += 1;
        cursor = twoDaysAgo;
      } else {
        return { streak: 0, shieldsAvailable: earnedShields, usedShield: false };
      }
    }
  }

  let streak = 0;
  for (let i = 0; i < 365; i += 1) {
    if (hasActivityOnDate(store, cursor)) {
      streak += 1;
      cursor = shiftDateKey(cursor, -1);
      continue;
    }
    const prevDay = shiftDateKey(cursor, -1);
    if (shieldsLeft > 0 && hasActivityOnDate(store, prevDay)) {
      shieldsLeft -= 1;
      shieldsUsed += 1;
      cursor = prevDay;
      continue;
    }
    break;
  }

  return {
    streak,
    shieldsAvailable: shieldsLeft,
    usedShield: shieldsUsed > 0,
  };
}

export function calculateStreak(store: CatyStoreData, todayKey: string): number {
  return calculateStreakDetails(store, todayKey).streak;
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
