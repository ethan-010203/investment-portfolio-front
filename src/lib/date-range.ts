import { subDays, subMonths, subYears } from "date-fns";

export type DateRangeValue = {
  from: string;
  to: string;
};

export type DateRangePreset = "year" | "month" | "week";

export type DateRangeSelectionStep = {
  pendingFrom: string | null;
  completedRange: DateRangeValue | null;
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

/**
 * 快捷范围始终以最新净值日期为终点，并将起点吸附到其后的首个实际净值日期。
 */
export function resolvePresetDateRange(
  availableDates: readonly string[],
  preset: DateRangePreset,
): DateRangeValue | null {
  const dates = normalizeAvailableDates(availableDates);
  if (dates.length === 0) return null;

  const to = dates.at(-1)!;
  const latestDate = parseIsoDate(to);
  const boundary = preset === "year"
    ? subYears(latestDate, 1)
    : preset === "month"
      ? subMonths(latestDate, 1)
      : subDays(latestDate, 6);
  const requestedFrom = formatIsoDate(boundary);
  const from = dates.find((date) => date >= requestedFrom) ?? dates[0];

  return { from, to };
}

/**
 * 第一次选择起点；第二次选择终点。若第二次日期更早，则将其重置为新的起点。
 */
export function advanceDateRangeSelection(
  pendingFrom: string | null,
  selectedDate: string,
): DateRangeSelectionStep {
  if (!pendingFrom || selectedDate < pendingFrom) {
    return { pendingFrom: selectedDate, completedRange: null };
  }

  return {
    pendingFrom: null,
    completedRange: { from: pendingFrom, to: selectedDate },
  };
}
