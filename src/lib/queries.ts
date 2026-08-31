import "server-only";

import { queryRows } from "@/lib/turso";
import type {
  AssetReturnMap,
  EventWeightAdjustment,
  NavRecord,
  NavSeriesRecord,
  PortfolioDataset,
  RebalanceEventSummary,
  WeightMap,
} from "@/lib/types";

function text(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string" || !value) throw new Error(`数据字段无效：${key}`);
  return value;
}

function nullableText(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !value) throw new Error(`数据字段无效：${key}`);
  return value;
}

function number(row: Record<string, unknown>, key: string): number {
  const value = Number(row[key]);
  if (!Number.isFinite(value)) throw new Error(`数值字段无效：${key}`);
  return value;
}

function parseWeights(row: Record<string, unknown>): WeightMap {
  const weights: WeightMap = {
    dividend: number(row, "dividend_weight"),
    sp500: number(row, "sp500_weight"),
    nasdaq: number(row, "nasdaq_weight"),
    policyBankBond: number(row, "policy_bond_weight"),
    gold: number(row, "gold_weight"),
    soymeal: number(row, "soymeal_weight"),
    cash: number(row, "cash_weight"),
  };
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (Math.abs(totalWeight - 1) > 1e-8) throw new Error("组合权重合计不为100%");
  return weights;
}

function parseAssetReturns(row: Record<string, unknown>): AssetReturnMap {
  return {
    dividend: number(row, "dividend_return"),
    sp500: number(row, "sp500_return"),
    nasdaq: number(row, "nasdaq_return"),
    policyBankBond: number(row, "policy_bond_return"),
    gold: number(row, "gold_return"),
    soymeal: number(row, "soymeal_return"),
  };
}

async function latestStrategyVersion(): Promise<string> {
  const rows = await queryRows(
    `SELECT "策略版本" AS strategy_version
     FROM "策略每日净值"
     ORDER BY "日期" DESC, "计算时间" DESC
     LIMIT 1`,
  );
  if (!rows[0]) throw new Error("策略每日净值暂无数据");
  return text(rows[0], "strategy_version");
}

function parseNav(row: Record<string, unknown>): NavRecord {
  const weights = parseWeights(row);
  const assetReturns = parseAssetReturns(row);
  return {
    strategyVersion: text(row, "strategy_version"),
    date: text(row, "date"),
    dataThrough: text(row, "data_through"),
    assetReturns,
    weights,
    grossReturn: number(row, "gross_return"),
    costRate: number(row, "cost_rate"),
    netReturn: number(row, "net_return"),
    cumulativeNav: number(row, "cumulative_nav"),
    calculatedAt: text(row, "calculated_at"),
  };
}

function parseNavSeries(row: Record<string, unknown>): NavSeriesRecord {
  return {
    date: text(row, "date"),
    dataThrough: text(row, "data_through"),
    assetReturns: parseAssetReturns(row),
    weights: parseWeights(row),
    grossReturn: number(row, "gross_return"),
    costRate: number(row, "cost_rate"),
    netReturn: number(row, "net_return"),
    cumulativeNav: number(row, "cumulative_nav"),
  };
}

function parseEventSummary(row: Record<string, unknown>): RebalanceEventSummary {
  const type = text(row, "event_type");
  if (!["正式调仓", "组合止损", "单品种止盈"].includes(type)) {
    throw new Error(`未知调仓事件：${type}`);
  }
  const status = text(row, "event_status");
  if (!["待执行", "已执行"].includes(status)) {
    throw new Error(`未知调仓事件状态：${status}`);
  }
  return {
    id: text(row, "event_id"),
    strategyVersion: text(row, "strategy_version"),
    type: type as RebalanceEventSummary["type"],
    cycleDate: text(row, "cycle_date"),
    signalDate: text(row, "signal_date"),
    executionDate: nullableText(row, "execution_date"),
    status: status as RebalanceEventSummary["status"],
    sequence: number(row, "sequence"),
    asset: text(row, "asset"),
    reason: text(row, "reason"),
    adjustments: parseEventAdjustments(row["adjustments"]),
  };
}

function parseEventAdjustments(value: unknown): EventWeightAdjustment[] {
  if (typeof value !== "string" || !value) throw new Error("调仓事件缺少调整明细");
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("调仓事件调整明细不是有效 JSON");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("调仓事件调整明细结构无效");
  }
  return Object.entries(parsed).map(([asset, raw]) => {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error(`调仓事件的${asset}调整明细无效`);
    }
    const details = raw as Record<string, unknown>;
    const beforeWeight = Number(details["调整前实际权重"]);
    const afterWeight = Number(details["调整后目标权重"]);
    if (!Number.isFinite(beforeWeight) || !Number.isFinite(afterWeight)) {
      throw new Error(`调仓事件的${asset}权重无效`);
    }
    return { asset, beforeWeight, afterWeight };
  });
}

const NAV_SELECT = `
  SELECT
    "策略版本" AS strategy_version,
    "日期" AS date,
    "输入数据截至日期" AS data_through,
    "红利收益率" AS dividend_return,
    "标普收益率" AS sp500_return,
    "纳指收益率" AS nasdaq_return,
    "政金债收益率" AS policy_bond_return,
    "黄金收益率" AS gold_return,
    "豆粕收益率" AS soymeal_return,
    "红利当日目标权重" AS dividend_weight,
    "标普当日目标权重" AS sp500_weight,
    "纳指当日目标权重" AS nasdaq_weight,
    "政金债当日目标权重" AS policy_bond_weight,
    "黄金当日目标权重" AS gold_weight,
    "豆粕当日目标权重" AS soymeal_weight,
    "现金当日目标权重" AS cash_weight,
    "组合毛收益率" AS gross_return,
    "交易成本率" AS cost_rate,
    "组合净收益率" AS net_return,
    "累计净值" AS cumulative_nav,
    "计算时间" AS calculated_at
  FROM "策略每日净值"`;

const NAV_SERIES_SQL = `
  SELECT
    "日期" AS date,
    "输入数据截至日期" AS data_through,
    "红利收益率" AS dividend_return,
    "标普收益率" AS sp500_return,
    "纳指收益率" AS nasdaq_return,
    "政金债收益率" AS policy_bond_return,
    "黄金收益率" AS gold_return,
    "豆粕收益率" AS soymeal_return,
    "红利最终权重" AS dividend_weight,
    "标普最终权重" AS sp500_weight,
    "纳指最终权重" AS nasdaq_weight,
    "政金债最终权重" AS policy_bond_weight,
    "黄金最终权重" AS gold_weight,
    "豆粕最终权重" AS soymeal_weight,
    "现金最终权重" AS cash_weight,
    "组合毛收益率" AS gross_return,
    "交易成本率" AS cost_rate,
    "组合净收益率" AS net_return,
    "累计净值" AS cumulative_nav
  FROM "策略每日净值"
  WHERE "策略版本" = ?
  ORDER BY "日期"`;

const NAV_SNAPSHOT_SQL = `${NAV_SELECT}
  WHERE "策略版本" = ?
    AND (
      "日期" = (
        SELECT MAX("日期")
        FROM "策略每日净值"
        WHERE "策略版本" = ?
      )
      OR "日期" IN (
        SELECT "执行日期"
        FROM "策略调仓事件"
        WHERE "策略版本" = ?
          AND "事件状态" = '已执行'
      )
    )
  ORDER BY "日期"`;

const EVENT_SUMMARY_SQL = `
  SELECT
    "策略版本" AS strategy_version,
    "事件编号" AS event_id,
    "事件类型" AS event_type,
    "所属正式调仓日" AS cycle_date,
    "信号日期" AS signal_date,
    "执行日期" AS execution_date,
    "事件状态" AS event_status,
    "执行顺序" AS sequence,
    "事件资产" AS asset,
    "触发原因" AS reason,
    "调整明细" AS adjustments
  FROM "策略调仓事件"
  WHERE "策略版本" = ?
  ORDER BY "信号日期", "执行顺序"`;

export async function loadNavHistory(): Promise<NavSeriesRecord[]> {
  const version = await latestStrategyVersion();
  const rows = await queryRows(NAV_SERIES_SQL, [version]);
  if (rows.length === 0) throw new Error("当前策略版本没有净值记录");
  return rows.map(parseNavSeries);
}

export async function loadPortfolioDataset(): Promise<PortfolioDataset> {
  const strategyVersion = await latestStrategyVersion();
  const [navRows, eventRows] = await Promise.all([
    queryRows(NAV_SNAPSHOT_SQL, [strategyVersion, strategyVersion, strategyVersion]),
    queryRows(EVENT_SUMMARY_SQL, [strategyVersion]),
  ]);
  if (navRows.length === 0) throw new Error("当前策略版本没有净值记录");
  return {
    strategyVersion,
    nav: navRows.map(parseNav),
    events: eventRows.map(parseEventSummary),
  };
}
