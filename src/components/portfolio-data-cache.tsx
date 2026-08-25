"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";

import { NavDashboard } from "@/components/nav-dashboard";
import { RebalanceCalculator } from "@/components/rebalance-calculator";
import { useBrowserResource } from "@/lib/browser-cache";
import { NAV_HISTORY_RESOURCE, REBALANCE_RESOURCE } from "@/lib/browser-resources";

export function CachedNavDashboard() {
  const resource = useBrowserResource(NAV_HISTORY_RESOURCE);
  if (resource.data) return <NavDashboard rows={resource.data} />;
  if (resource.error) return <DataLoadError onRetry={resource.refresh} />;
  return <NetValueSkeleton />;
}

export function CachedRebalanceCalculator() {
  const resource = useBrowserResource(REBALANCE_RESOURCE);
  if (resource.data) return <RebalanceCalculator dataset={resource.data} />;
  if (resource.error) return <DataLoadError onRetry={resource.refresh} />;
  return <RebalanceSkeleton />;
}

function DataLoadError({ onRetry }: { onRetry: () => Promise<void> }) {
  return (
    <section className="panel mx-auto grid min-h-[360px] max-w-2xl place-items-center p-8 text-center">
      <div>
        <TriangleAlert className="mx-auto text-[var(--muted)]" size={26} />
        <h1 className="mt-5 text-2xl font-semibold">数据暂时无法读取</h1>
        <button
          type="button"
          onClick={() => void onRetry()}
          className="primary-button mx-auto mt-6 flex h-11 items-center gap-2 px-5 text-sm font-medium text-[#f9fcfb]"
        >
          <RefreshCw size={15} />
          重新加载
        </button>
      </div>
    </section>
  );
}

function NetValueSkeleton() {
  return (
    <div className="net-value-layout" aria-label="正在载入每日净值">
      <div className="grid min-h-0 grid-rows-2 gap-[18px]">
        <div className="skeleton rounded-2xl" />
        <div className="skeleton rounded-2xl" />
      </div>
      <div className="grid min-h-0 grid-rows-2 gap-[18px]">
        <div className="skeleton rounded-[30px]" />
        <div className="skeleton rounded-[30px]" />
      </div>
    </div>
  );
}

function RebalanceSkeleton() {
  return (
    <div className="rebalance-page" aria-label="正在载入调仓数据">
      <div className="rebalance-workspace">
        <div className="skeleton rounded-[30px]" />
        <div className="grid min-h-0 grid-rows-2 gap-[18px]">
          <div className="skeleton rounded-2xl" />
          <div className="skeleton rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
