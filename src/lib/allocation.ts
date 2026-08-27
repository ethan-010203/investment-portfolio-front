import { ASSETS, type AssetKey } from "@/lib/assets";
import { formatCurrency } from "@/lib/format";
import type { AllocationRow, WeightMap } from "@/lib/types";

export function normalizeCapital(value: string): number {
  const normalized = value.replaceAll(",", "").trim();
  if (!normalized) return 0;
  const capital = Number(normalized);
  return Number.isFinite(capital) && capital >= 0 ? capital : 0;
}

export function allocateCapital(capital: number, weights: WeightMap): AllocationRow[] {
  if (!Number.isFinite(capital) || capital < 0) throw new Error("本金必须是非负有限数值");
  const weightTotal = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (Math.abs(weightTotal - 1) > 1e-8) throw new Error("权重合计必须为100%");

  const amounts = new Map<AssetKey, number>();
  let invested = 0;
  for (const asset of ASSETS) {
    if (asset.key === "cash") continue;
    const amount = Math.round(capital * weights[asset.key] * 100) / 100;
    amounts.set(asset.key, amount);
    invested += amount;
  }
  amounts.set("cash", Math.round((capital - invested) * 100) / 100);
  return ASSETS.map((asset) => ({
    key: asset.key,
    weight: weights[asset.key],
    amount: amounts.get(asset.key) ?? 0,
  }));
}

export function allocateCapitalInputs(
  capital: number,
  weights: WeightMap,
): Record<AssetKey, string> {
  return allocateCapital(capital, weights).reduce(
    (values, row) => {
      values[row.key] = row.amount.toFixed(2);
      return values;
    },
    {} as Record<AssetKey, string>,
  );
}

export function formatRebalanceAction(
  assetKey: AssetKey,
  difference: number,
  threshold: number,
): string {
  if (Math.abs(difference) <= threshold) return "持有";

  const amount = formatCurrency(Math.abs(difference));
  if (assetKey === "cash") return `${difference > 0 ? "转入" : "转出"} ${amount}`;
  return `${difference > 0 ? "买入" : "卖出"} ${amount}`;
}
