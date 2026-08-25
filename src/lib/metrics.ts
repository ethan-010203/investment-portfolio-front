import type { NavSeriesRecord, PortfolioMetrics } from "@/lib/types";

const DAY_MS = 86_400_000;

function calendarDaysBetween(startDate: string, endDate: string): number {
  return Math.max(
    0,
    (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / DAY_MS,
  );
}

export function calculateMetrics(rows: readonly NavSeriesRecord[]): PortfolioMetrics {
  if (rows.length === 0) throw new Error("净值序列不能为空");
  const first = rows[0];
  const latest = rows.at(-1)!;
  let peak = first.cumulativeNav;
  let peakDate = first.date;
  let maximumDrawdown = 0;
  let underwaterStartDate: string | null = null;
  let maximumDrawdownDurationDays = 0;
  let maximumDrawdownStartDate = first.date;
  let maximumDrawdownEndDate = first.date;

  for (const row of rows) {
    if (row.cumulativeNav >= peak) {
      if (underwaterStartDate) {
        const durationDays = calendarDaysBetween(underwaterStartDate, row.date);
        if (durationDays > maximumDrawdownDurationDays) {
          maximumDrawdownDurationDays = durationDays;
          maximumDrawdownStartDate = underwaterStartDate;
          maximumDrawdownEndDate = row.date;
        }
        underwaterStartDate = null;
      }
      peak = row.cumulativeNav;
      peakDate = row.date;
      continue;
    }

    const drawdown = row.cumulativeNav / peak - 1;
    maximumDrawdown = Math.min(maximumDrawdown, drawdown);
    underwaterStartDate ??= peakDate;
    const durationDays = calendarDaysBetween(underwaterStartDate, row.date);
    if (durationDays > maximumDrawdownDurationDays) {
      maximumDrawdownDurationDays = durationDays;
      maximumDrawdownStartDate = underwaterStartDate;
      maximumDrawdownEndDate = row.date;
    }
  }

  if (underwaterStartDate) {
    const durationDays = calendarDaysBetween(underwaterStartDate, latest.date);
    if (durationDays > maximumDrawdownDurationDays) {
      maximumDrawdownDurationDays = durationDays;
      maximumDrawdownStartDate = underwaterStartDate;
      maximumDrawdownEndDate = latest.date;
    }
  }

  const elapsedDays = Math.max(
    1,
    (Date.parse(`${latest.date}T00:00:00Z`) - Date.parse(`${first.date}T00:00:00Z`)) /
      DAY_MS,
  );
  const annualizedReturn =
    Math.pow(latest.cumulativeNav / first.cumulativeNav, 365 / elapsedDays) - 1;

  const dailyReturns = rows.slice(1).map((row) => row.netReturn);
  const averageDailyReturn = dailyReturns.length === 0
    ? 0
    : dailyReturns.reduce((sum, value) => sum + value, 0) / dailyReturns.length;
  const dailyVariance = dailyReturns.length <= 1
    ? 0
    : dailyReturns.reduce((sum, value) => sum + (value - averageDailyReturn) ** 2, 0) /
      (dailyReturns.length - 1);
  const dailyVolatility = Math.sqrt(Math.max(0, dailyVariance));
  const annualizedVolatility = dailyVolatility * Math.sqrt(252);
  const sharpeRatio = dailyVolatility === 0
    ? 0
    : (averageDailyReturn / dailyVolatility) * Math.sqrt(252);
  const calmarRatio = maximumDrawdown === 0
    ? 0
    : annualizedReturn / Math.abs(maximumDrawdown);

  return {
    cumulativeNav: latest.cumulativeNav,
    annualizedReturn,
    annualizedVolatility,
    sharpeRatio,
    calmarRatio,
    maximumDrawdown,
    maximumDrawdownDurationDays,
    maximumDrawdownStartDate,
    maximumDrawdownEndDate,
    latestDate: latest.date,
  };
}
