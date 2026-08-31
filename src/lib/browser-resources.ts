import { ASSETS, RISK_ASSET_KEYS } from "@/lib/assets";
import type { BrowserResourceConfig } from "@/lib/browser-cache";
import type { NavRecord, NavSeriesRecord, PortfolioDataset } from "@/lib/types";

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasFiniteKeys(value: unknown, keys: readonly string[]): boolean {
  return isObject(value) && keys.every((key) => isFiniteNumber(value[key]));
}

function isNavSeriesRecord(value: unknown): value is NavSeriesRecord {
  if (!isObject(value)) return false;
  return (
    typeof value.date === "string"
    && typeof value.dataThrough === "string"
    && hasFiniteKeys(value.assetReturns, RISK_ASSET_KEYS)
    && hasFiniteKeys(value.weights, ASSETS.map((asset) => asset.key))
    && isFiniteNumber(value.grossReturn)
    && isFiniteNumber(value.costRate)
    && isFiniteNumber(value.netReturn)
    && isFiniteNumber(value.cumulativeNav)
  );
}

function isNavHistory(value: unknown): value is NavSeriesRecord[] {
  return Array.isArray(value) && value.length > 0 && value.every(isNavSeriesRecord);
}

function isNavRecord(value: unknown): value is NavRecord {
  if (!isObject(value) || !isNavSeriesRecord(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.strategyVersion === "string" && typeof candidate.calculatedAt === "string";
}

function isPortfolioDataset(value: unknown): value is PortfolioDataset {
  if (!isObject(value) || typeof value.strategyVersion !== "string" || !Array.isArray(value.nav) || !Array.isArray(value.events)) {
    return false;
  }

  const validNav = value.nav.length > 0 && value.nav.every(isNavRecord);
  const validEvents = value.events.every((event) => (
    isObject(event)
    && typeof event.id === "string"
    && typeof event.strategyVersion === "string"
    && ["正式调仓", "组合止损", "单品种止盈"].includes(String(event.type))
    && typeof event.cycleDate === "string"
    && typeof event.signalDate === "string"
    && (event.executionDate === null || typeof event.executionDate === "string")
    && ["待执行", "已执行"].includes(String(event.status))
    && isFiniteNumber(event.sequence)
    && typeof event.asset === "string"
    && typeof event.reason === "string"
    && Array.isArray(event.adjustments)
    && event.adjustments.every((adjustment) => (
      isObject(adjustment)
      && typeof adjustment.asset === "string"
      && isFiniteNumber(adjustment.beforeWeight)
      && isFiniteNumber(adjustment.afterWeight)
    ))
  ));

  return validNav && validEvents;
}

export const NAV_HISTORY_RESOURCE: BrowserResourceConfig<NavSeriesRecord[]> = {
  key: "net-value-history",
  url: "/api/net-value",
  validate: isNavHistory,
};

export const REBALANCE_RESOURCE: BrowserResourceConfig<PortfolioDataset> = {
  key: "rebalance-dataset",
  url: "/api/rebalance",
  validate: isPortfolioDataset,
};
