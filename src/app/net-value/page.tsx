import type { Metadata } from "next";

import { NavDashboard } from "@/components/nav-dashboard";
import { loadNavHistory } from "@/lib/queries";

export const metadata: Metadata = {
  title: "每日净值",
};

export const dynamic = "force-dynamic";

export default async function NetValuePage() {
  const rows = await loadNavHistory();

  return (
    <div className="net-value-page">
      <NavDashboard rows={rows} />
    </div>
  );
}
