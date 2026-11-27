export function toLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + deltaDays);
  return toLocalDateKey(d);
}

export function formatDisplayDateVi(dateKey: string): string {
  const today = toLocalDateKey();
  const yesterday = shiftDateKey(today, -1);
  const d = parseDateKey(dateKey);

  const weekdays = [
    'Chủ Nhật',
    'Thứ Hai',
    'Thứ Ba',
    'Thứ Tư',
    'Thứ Năm',
    'Thứ Sáu',
    'Thứ Bảy',
  ];
  const dayLabel = weekdays[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();

  if (dateKey === today) return `Hôm nay • ${dayLabel}, ${dd}/${mm}/${yyyy}`;
  if (dateKey === yesterday) return `Hôm qua • ${dayLabel}, ${dd}/${mm}/${yyyy}`;
  return `${dayLabel}, ${dd}/${mm}/${yyyy}`;
}

export function formatShortDate(dateKey: string): string {
  const [, m, d] = dateKey.split('-');
  return `${d}/${m}`;
}

export function getMonthMatrix(year: number, monthIndex: number): (string | null)[] {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  // Monday = 0 ... Sunday = 6
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: (string | null)[] = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    cells.push(toLocalDateKey(new Date(year, monthIndex, day)));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

export function formatMonthTitleVi(year: number, monthIndex: number): string {
  return `Tháng ${monthIndex + 1}, ${year}`;
}

export function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
}

/**
 * Formats a numeric input string with Vietnamese dot thousand separators while typing
 * (e.g. "45000" -> "45.000", "1250000" -> "1.250.000").
 */
export function formatVndInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '').replace(/^0+/, '').slice(0, 12);
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parseVndInput(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '').slice(0, 12);
  if (!digits) return 0;
  const num = Number(digits);
  return Number.isFinite(num) ? Math.min(100_000_000_000, num) : 0;
}
