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
