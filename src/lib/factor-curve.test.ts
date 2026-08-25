import { describe, expect, it } from "vitest";

import { ASSETS, type AssetKey } from "@/lib/assets";
import { buildSelectedCurve } from "@/lib/factor-curve";
import type { NavSeriesRecord, WeightMap } from "@/lib/types";

const fullWeights: WeightMap = {
  dividend: 0.1,
  sp500: 0.1,
  nasdaq: 0.1,
  policyBankBond: 0.2,
  gold: 0.2,
  soymeal: 0.2,
  cash: 0.1,
};

function makeRows(): NavSeriesRecord[] {
  const first: NavSeriesRecord = {
    date: "2025-01-01",
    dataThrough: "2024-12-31",
    assetReturns: {
      dividend: 0,
      sp500: 0,
      nasdaq: 0,
      policyBankBond: 0,
      gold: 0,
      soymeal: 0,
    },
    weights: fullWeights,
    grossReturn: 0,
    costRate: 0,
    netReturn: 0,
    cumulativeNav: 1,
  };
  const second: NavSeriesRecord = {
    ...first,
    date: "2025-01-02",
    dataThrough: "2025-01-02",
    assetReturns: {
      dividend: 0.1,
      sp500: -0.05,
      nasdaq: 0.02,
      policyBankBond: 0.01,
      gold: 0.05,
      soymeal: -0.1,
    },
    weights: { ...fullWeights, cash: 0.2, soymeal: 0.1 },
    grossReturn: 0.012,
    costRate: 0.001,
    netReturn: 0.011,
    cumulativeNav: 1.011,
  };
  return [first, second];
}

describe("选中因子组合曲线", () => {
  it("全选时按完整策略权重计算并从1开始", () => {
    const rows = makeRows();
    const selected = ASSETS.map((asset) => asset.key);
    const curve = buildSelectedCurve(rows, selected);
    const expectedGross =
      0.1 * 0.1 +
      0.1 * -0.05 +
      0.1 * 0.02 +
      0.2 * 0.01 +
      0.2 * 0.05 +
      0.2 * -0.1;
    const expectedNet = expectedGross - 0.001;

    expect(curve[0].cumulativeNav).toBe(1);
    expect(curve[1].grossReturn).toBeCloseTo(expectedGross);
    expect(curve[1].netReturn).toBeCloseTo(expectedNet);
    expect(curve[1].cumulativeNav).toBeCloseTo(1 + expectedNet);
  });

  it("只选一个资产时只保留该资产的原策略权重贡献", () => {
    const curve = buildSelectedCurve(makeRows(), ["gold"]);

    expect(curve[1].grossReturn).toBeCloseTo(0.2 * 0.05);
    expect(curve[1].costRate).toBeCloseTo(0.2 * 0.001);
    expect(curve[1].netReturn).toBeCloseTo(0.2 * 0.05 - 0.2 * 0.001);
  });

  it("现金收益按零处理", () => {
    const curve = buildSelectedCurve(makeRows(), ["cash"]);

    expect(curve[1].grossReturn).toBe(0);
    expect(curve[1].netReturn).toBeCloseTo(-0.1 * 0.001);
    expect(curve[1].cumulativeNav).toBeCloseTo(1 - 0.1 * 0.001);
  });

  it("不允许空选，并且不会自动归一化剩余资产", () => {
    expect(() => buildSelectedCurve(makeRows(), [] as AssetKey[])).toThrow("至少选择一个因子");

    const curve = buildSelectedCurve(makeRows(), ["gold"]);
    expect(curve[1].grossReturn).toBeCloseTo(0.01);
    expect(curve[1].grossReturn).not.toBeCloseTo(0.05);
  });
});
