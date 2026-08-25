"use client";

import { useEffect } from "react";

import { warmBrowserResource } from "@/lib/browser-cache";
import { NAV_HISTORY_RESOURCE, REBALANCE_RESOURCE } from "@/lib/browser-resources";

export function PortfolioDataCacheWarmer() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.allSettled([
        warmBrowserResource(NAV_HISTORY_RESOURCE),
        warmBrowserResource(REBALANCE_RESOURCE),
      ]);
    }, 500);

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
