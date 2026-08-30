import { describe, expect, it } from "vitest";

import {
  allocateCapital,
  allocateCapitalInputs,
  formatRebalanceAction,
  normalizeCapital,
} from "@/lib/allocation";
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

  it("总资金输入可以直接生成全部持仓输入值", () => {
    const inputs = allocateCapitalInputs(10_000, weights);

    expect(inputs).toEqual({
      dividend: "500.00",
      sp500: "200.00",
      nasdaq: "100.00",
      policyBankBond: "5600.00",
      gold: "1000.00",
      soymeal: "800.00",
      cash: "1800.00",
    });
  });

  it("拒绝权重合计错误", () => {
    expect(() => allocateCapital(100_000, { ...weights, cash: 0.1 })).toThrow(
      "权重合计必须为100%",
    );
  });

  it("现金增加使用转入，现金减少使用转出", () => {
    expect(formatRebalanceAction("cash", 16_496.46, 100)).toBe("转入 ¥16,496.46");
    expect(formatRebalanceAction("cash", -16_496.46, 100)).toBe("转出 ¥16,496.46");
  });

  it("非现金资产继续使用买入和卖出", () => {
    expect(formatRebalanceAction("gold", 1_000, 100)).toBe("买入 ¥1,000");
    expect(formatRebalanceAction("gold", -1_000, 100)).toBe("卖出 ¥1,000");
  });
});
