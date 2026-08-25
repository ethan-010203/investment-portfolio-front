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
  | "date"
  | "dataThrough"
  | "assetReturns"
  | "weights"
  | "grossReturn"
  | "costRate"
  | "netReturn"
  | "cumulativeNav"
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
  adjustments: EventWeightAdjustment[];
};

export type EventWeightAdjustment = {
  asset: string;
  beforeWeight: number;
  afterWeight: number;
};

export type PortfolioDataset = {
  strategyVersion: string;
  nav: NavRecord[];
  events: RebalanceEventSummary[];
};

export type PortfolioMetrics = {
  cumulativeNav: number;
  annualizedReturn: number;
  annualizedVolatility: number;
  sharpeRatio: number;
  calmarRatio: number;
  maximumDrawdown: number;
  maximumDrawdownDurationDays: number;
  maximumDrawdownStartDate: string;
  maximumDrawdownEndDate: string;
  latestDate: string;
};

export type AllocationRow = {
  key: AssetKey;
  weight: number;
  amount: number;
};
