import type { Metadata } from "next";

import { RebalanceCalculator } from "@/components/rebalance-calculator";
import { loadPortfolioDataset } from "@/lib/queries";

export const metadata: Metadata = {
  title: "调仓计算",
};

export const dynamic = "force-dynamic";

export default async function RebalancePage() {
  const dataset = await loadPortfolioDataset();
  return <RebalanceCalculator dataset={dataset} />;
}
