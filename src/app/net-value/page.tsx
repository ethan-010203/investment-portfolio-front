import type { Metadata } from "next";

import { NavDashboard } from "@/components/nav-dashboard";
import { formatDate } from "@/lib/format";
import { loadNavHistory } from "@/lib/queries";

export const metadata: Metadata = {
  title: "每日净值",
};

export const dynamic = "force-dynamic";

export default async function NetValuePage() {
  const rows = await loadNavHistory();
  const latest = rows.at(-1)!;

  return (
    <div>
      <div className="page-title-row">
        <h1 className="page-title">每日净值</h1>
        <span className="eyebrow">数据截至 {formatDate(latest.dataThrough)}</span>
      </div>
      <NavDashboard rows={rows} />
    </div>
  );
}
