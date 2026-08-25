import type { Metadata } from "next";

import { CachedNavDashboard } from "@/components/portfolio-data-cache";

export const metadata: Metadata = {
  title: "每日净值",
};

export default function NetValuePage() {
  return (
    <div className="net-value-page">
      <CachedNavDashboard />
    </div>
  );
}
