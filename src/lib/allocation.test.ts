import { describe, expect, it } from "vitest";

import { allocateCapital, normalizeCapital } from "@/lib/allocation";
import type { WeightMap } from "@/lib/types";

const weights: WeightMap = {
  dividend: 0.05,
  sp500: 0.02,
  nasdaq: 0.01,
  policyBankBond: 0.56,
  gold: 0.1,
  soymeal: 0.08,
  cash: 0.18,
};

describe("本金分配", () => {
  it("允许带千分位的单一金额输入", () => {
    expect(normalizeCapital("1,000,000")).toBe(1_000_000);
  });

  it("所有资产金额与本金严格一致", () => {
    const rows = allocateCapital(123_456.78, weights);
    expect(rows.reduce((sum, row) => sum + row.amount, 0)).toBeCloseTo(123_456.78, 2);
  });

  it("拒绝权重合计错误", () => {
    expect(() => allocateCapital(100_000, { ...weights, cash: 0.1 })).toThrow(
      "权重合计必须为100%",
    );
  });
});
