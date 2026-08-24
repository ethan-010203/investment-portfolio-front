import type { NavSeriesRecord, PortfolioMetrics } from "@/lib/types";

const DAY_MS = 86_400_000;

export function calculateMetrics(rows: readonly NavSeriesRecord[]): PortfolioMetrics {
  if (rows.length === 0) throw new Error("净值序列不能为空");
  const first = rows[0];
  const latest = rows.at(-1)!;
  let peak = first.cumulativeNav;
  let maximumDrawdown = 0;
  for (const row of rows) {
    peak = Math.max(peak, row.cumulativeNav);
    maximumDrawdown = Math.min(maximumDrawdown, row.cumulativeNav / peak - 1);
  }
  const elapsedDays = Math.max(
    1,
    (Date.parse(`${latest.date}T00:00:00Z`) - Date.parse(`${first.date}T00:00:00Z`)) /
      DAY_MS,
  );
  const annualizedReturn =
    Math.pow(latest.cumulativeNav / first.cumulativeNav, 365 / elapsedDays) - 1;
  return {
    cumulativeNav: latest.cumulativeNav,
    latestReturn: latest.netReturn,
    annualizedReturn,
    maximumDrawdown,
    latestDate: latest.date,
  };
}
