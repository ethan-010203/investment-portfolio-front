import type { AssetKey } from "@/lib/assets";

export type WeightMap = Record<AssetKey, number>;

export type AssetReturnMap = Omit<WeightMap, "cash">;

export type NavRecord = {
  strategyVersion: string;
  date: string;
  dataThrough: string;
  assetReturns: AssetReturnMap;
  weights: WeightMap;
  grossReturn: number;
  costRate: number;
  netReturn: number;
  cumulativeNav: number;
  calculatedAt: string;
};

export type NavSeriesRecord = Pick<
  NavRecord,
  "date" | "dataThrough" | "grossReturn" | "costRate" | "netReturn" | "cumulativeNav"
>;

export type RebalanceEventSummary = {
  id: string;
  strategyVersion: string;
  type: "正式调仓" | "组合止损" | "单品种止盈";
  cycleDate: string;
  signalDate: string;
  executionDate: string;
  sequence: number;
  asset: string;
  reason: string;
};

export type PortfolioDataset = {
  strategyVersion: string;
  nav: NavRecord[];
  events: RebalanceEventSummary[];
};

export type PortfolioMetrics = {
  cumulativeNav: number;
  latestReturn: number;
  annualizedReturn: number;
  maximumDrawdown: number;
  latestDate: string;
};

export type AllocationRow = {
  key: AssetKey;
  weight: number;
  amount: number;
};
