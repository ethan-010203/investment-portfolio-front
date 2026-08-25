export type DateRangeValue = {
  from: string;
  to: string;
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeAvailableDates(dates: readonly string[]): string[] {
  return [...new Set(dates.filter((date) => ISO_DATE_PATTERN.test(date)))].sort();
}

/**
 * 将用户保存的日期范围吸附到当前实际存在的净值日期，避免周末或缺失数据形成空区间。
 */
export function resolveDateRange(
  availableDates: readonly string[],
  requestedRange: DateRangeValue | null,
): DateRangeValue | null {
  const dates = normalizeAvailableDates(availableDates);
  if (dates.length === 0) return null;

  const fullRange = { from: dates[0], to: dates.at(-1)! };
  if (!requestedRange) return fullRange;

  const from = dates.find((date) => date >= requestedRange.from);
  const to = dates.findLast((date) => date <= requestedRange.to);
  if (!from || !to || from > to) return fullRange;
  return { from, to };
}

export function filterRowsByDateRange<T extends { date: string }>(
  rows: readonly T[],
  range: DateRangeValue | null,
): T[] {
  if (!range) return [...rows];
  return rows.filter((row) => row.date >= range.from && row.date <= range.to);
}

export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
