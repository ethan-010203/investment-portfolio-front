import type { AssetKey } from "@/lib/assets";
import type { NavSeriesRecord } from "@/lib/types";

const EPSILON = 1e-12;

/**
 * 按原策略每日权重，计算选中资产对组合的实际贡献曲线。
 * 不会把剩余资产重新归一化，因此取消资产后，未选部分自然表现为未计入的贡献。
 */
export function buildSelectedCurve(
  rows: readonly NavSeriesRecord[],
  selectedFactors: readonly AssetKey[],
): NavSeriesRecord[] {
  if (rows.length === 0) return [];
  if (selectedFactors.length === 0) throw new Error("至少选择一个因子");

  let cumulativeNav = 1;

  return rows.map((row, index) => {
    const previousWeights = index === 0 ? null : rows[index - 1].weights;
    const selectedWeight = previousWeights
      ? selectedFactors.reduce((sum, key) => sum + previousWeights[key], 0)
      : 0;
    const grossReturn = previousWeights
      ? selectedFactors.reduce((sum, key) => {
          const assetReturn = key === "cash" ? 0 : row.assetReturns[key];
          return sum + previousWeights[key] * assetReturn;
        }, 0)
      : 0;
    const costRate = row.costRate * selectedWeight;
    const netReturn = grossReturn - costRate;
    cumulativeNav *= 1 + netReturn;

    return {
      ...row,
      grossReturn: Math.abs(grossReturn) < EPSILON ? 0 : grossReturn,
      costRate,
      netReturn: Math.abs(netReturn) < EPSILON ? 0 : netReturn,
      cumulativeNav,
    };
  });
}
