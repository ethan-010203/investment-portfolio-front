import type { Metadata } from "next";

import { CachedRebalanceCalculator } from "@/components/portfolio-data-cache";

export const metadata: Metadata = {
  title: "调仓计算",
};

export default function RebalancePage() {
  return <CachedRebalanceCalculator />;
}
