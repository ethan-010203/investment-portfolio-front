import { describe, expect, it } from "vitest";

import { calculateDrawdownDurationSeries, calculateMetrics } from "@/lib/metrics";
import type { NavSeriesRecord, WeightMap } from "@/lib/types";

const weights: WeightMap = {
  dividend: 0.1,
  sp500: 0.1,
  nasdaq: 0.1,
  policyBankBond: 0.2,
  gold: 0.2,
  soymeal: 0.2,
  cash: 0.1,
};

function row(date: string, cumulativeNav: number, netReturn: number): NavSeriesRecord {
  return {
    date,
    dataThrough: date,
    assetReturns: {
      dividend: 0,
      sp500: 0,
      nasdaq: 0,
      policyBankBond: 0,
      gold: 0,
      soymeal: 0,
    },
    weights,
    grossReturn: netReturn,
    costRate: 0,
    netReturn,
    cumulativeNav,
  };
}

describe("净值风险指标", () => {
  it("计算每个日期距离最近历史高点的回撤自然日数", () => {
    const rows = [
      row("2025-01-01", 1, 0),
      row("2025-01-02", 1.1, 0.1),
      row("2025-01-03", 1, -0.09090909),
      row("2025-01-05", 1.05, 0.05),
      row("2025-01-08", 1.1, 0.04761905),
      row("2025-01-09", 1.08, -0.01818182),
    ];

    expect(calculateDrawdownDurationSeries(rows)).toEqual([0, 0, 1, 3, 0, 1]);
    expect(calculateDrawdownDurationSeries([])).toEqual([]);
  });

  it("计算波动率、夏普、卡玛和最大回撤日期区间", () => {
    const metrics = calculateMetrics([
      row("2025-01-01", 1, 0),
      row("2025-01-02", 1.1, 0.1),
      row("2025-01-03", 1, -0.09090909),
      row("2025-01-04", 1.05, 0.05),
      row("2025-01-05", 1.1, 0.04761905),
    ]);

    expect(metrics.cumulativeNav).toBe(1.1);
    expect(metrics.annualizedVolatility).toBeGreaterThan(0);
    expect(metrics.sharpeRatio).toBeGreaterThan(0);
    expect(metrics.calmarRatio).toBeGreaterThan(0);
    expect(metrics.maximumDrawdown).toBeCloseTo(-1 / 11, 6);
    expect(metrics.maximumDrawdownDurationDays).toBe(3);
    expect(metrics.maximumDrawdownStartDate).toBe("2025-01-02");
    expect(metrics.maximumDrawdownEndDate).toBe("2025-01-05");
  });
});
