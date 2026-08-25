"use client";

import * as echarts from "echarts";
import { Check, ChevronLeft, ChevronRight, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EChart } from "@/components/echart";
import { SegmentedControl } from "@/components/segmented-control";
import { allocateCapital, normalizeCapital } from "@/lib/allocation";
import { ASSETS, ASSET_BY_KEY, type AssetKey } from "@/lib/assets";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import type { PortfolioDataset, RebalanceEventSummary } from "@/lib/types";

type Mode = "current" | "history";

const MODE_OPTIONS = [
  { value: "current", label: "本次调仓" },
  { value: "history", label: "往期事件" },
] as const;

const HISTORY_PAGE_SIZE = 10;
const HOLDINGS_STORAGE_KEY = "investment-portfolio:rebalance-holdings:v1";
const EVENT_ASSET_COLORS = Object.fromEntries(
  ASSETS.map((asset) => [asset.label, asset.color]),
) as Record<string, string>;

const PIE_COLORS: Record<AssetKey, string> = {
  dividend: "#D95F59",
  sp500: "#356D93",
  nasdaq: "#63A5C5",
  policyBankBond: "#6F9A7D",
  gold: "#D4A536",
  soymeal: "#B87951",
  cash: "#A7AAA3",
};

const PIE_TEXTURES = Object.fromEntries(
  ASSETS.map((asset) => [
    asset.key,
    {
      symbol: "rect",
      symbolSize: 1,
      color: "rgba(255, 255, 255, 0.34)",
      backgroundColor: PIE_COLORS[asset.key],
      dashArrayX: [1, 0],
      dashArrayY: [3, 2],
      rotation: -Math.PI / 4,
      maxTileWidth: 48,
      maxTileHeight: 48,
    },
  ]),
);

function emptyHoldingInputs(): Record<AssetKey, string> {
  return ASSETS.reduce(
    (values, asset) => {
      values[asset.key] = "";
      return values;
    },
    {} as Record<AssetKey, string>,
  );
}

function parseHoldingInputs(value: string): Record<AssetKey, string> | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    const stored = parsed as Record<string, unknown>;
    const holdings = emptyHoldingInputs();
    for (const asset of ASSETS) {
      const input = stored[asset.key];
      if (input !== undefined && typeof input !== "string") return null;
      holdings[asset.key] = input ?? "";
    }
    return holdings;
  } catch {
    return null;
  }
}

function riskEventsForDate(events: RebalanceEventSummary[], date: string): RebalanceEventSummary[] {
  return events.filter((event) => event.executionDate <= date);
}

export function RebalanceCalculator({ dataset }: { dataset: PortfolioDataset }) {
  const [mode, setMode] = useState<Mode>("current");
  const [holdingInputs, setHoldingInputs] = useState<Record<AssetKey, string>>(emptyHoldingInputs);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const stored = window.localStorage.getItem(HOLDINGS_STORAGE_KEY);
        if (!stored) return;
        const restored = parseHoldingInputs(stored);
        if (!restored) {
          window.localStorage.removeItem(HOLDINGS_STORAGE_KEY);
          return;
        }
        setHoldingInputs(restored);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const latest = dataset.nav.at(-1)!;
  const snapshot = latest;
  const holdingAmounts = useMemo(
    () => ASSETS.reduce(
      (amounts, asset) => {
        amounts[asset.key] = normalizeCapital(holdingInputs[asset.key]);
        return amounts;
      },
      {} as Record<AssetKey, number>,
    ),
    [holdingInputs],
  );
  const totalCapital = useMemo(
    () => ASSETS.reduce((total, asset) => total + holdingAmounts[asset.key], 0),
    [holdingAmounts],
  );
  const hasHoldingInputs = ASSETS.some((asset) => holdingInputs[asset.key].trim() !== "");
  const strategyRows = useMemo(
    () => ASSETS.map((asset) => ({ key: asset.key, weight: snapshot.weights[asset.key] })),
    [snapshot.weights],
  );
  const targetAmounts = useMemo(
    () => allocateCapital(totalCapital, snapshot.weights).reduce(
      (amounts, row) => {
        amounts[row.key] = row.amount;
        return amounts;
      },
      {} as Record<AssetKey, number>,
    ),
    [totalCapital, snapshot.weights],
  );
  const tradeThreshold = totalCapital * 0.003;
  const eventsThroughSnapshot = useMemo(
    () => riskEventsForDate(dataset.events, snapshot.date),
    [dataset.events, snapshot.date],
  );
  const formalEvent = [...eventsThroughSnapshot].reverse().find((event) => event.type === "正式调仓");
  const cycleEvents = formalEvent
    ? eventsThroughSnapshot.filter((event) => event.cycleDate === formalEvent.cycleDate)
    : [];
  const orderedCycleEvents = [...cycleEvents].sort((left, right) => {
    const dateOrder = left.executionDate.localeCompare(right.executionDate);
    if (dateOrder !== 0) return dateOrder;
    const typeOrder = { 正式调仓: 0, 组合止损: 1, 单品种止盈: 2 } as const;
    return typeOrder[left.type] - typeOrder[right.type] || left.sequence - right.sequence;
  });

  const allocationPieOption = useMemo<echarts.EChartsCoreOption>(
    () => ({
      animationDuration: 450,
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(32, 33, 36, 0.94)",
        borderWidth: 0,
        borderRadius: 14,
        padding: [10, 12],
        textStyle: { color: "#fffdf8", fontSize: 12 },
        formatter: "{b}<br/>{d}%",
      },
      series: [
        {
          type: "pie",
          radius: "58%",
          center: ["50%", "50%"],
          avoidLabelOverlap: true,
          selectedMode: "single",
          selectedOffset: 5,
          itemStyle: { borderColor: "#fff8eb", borderWidth: 2 },
          label: {
            show: true,
            position: "outside",
            alignTo: "edge",
            edgeDistance: 8,
            bleedMargin: 0,
            distanceToLabelLine: 4,
            color: "#454844",
            fontSize: 13,
            fontWeight: 650,
            formatter: "{b}",
          },
          labelLine: {
            show: true,
            length: 15,
            length2: 10,
            lineStyle: { width: 1.4, opacity: 0.9 },
          },
          labelLayout: { hideOverlap: false, moveOverlap: "shiftY" },
          emphasis: {
            scale: true,
            scaleSize: 4,
            itemStyle: { shadowBlur: 12, shadowColor: "rgba(54, 63, 69, 0.18)" },
          },
          data: strategyRows
            .filter((row) => row.weight > 0)
            .map((row) => ({
              name: ASSET_BY_KEY[row.key].label,
              value: Number((row.weight * 100).toFixed(6)),
              itemStyle: { color: PIE_COLORS[row.key], decal: PIE_TEXTURES[row.key] },
              labelLine: { lineStyle: { color: PIE_COLORS[row.key] } },
            })),
        },
      ],
    }),
    [strategyRows],
  );

  function updateHolding(key: AssetKey, value: string) {
    setHoldingInputs((current) => ({ ...current, [key]: value }));
    setSaveStatus("idle");
  }

  function saveHoldings() {
    try {
      window.localStorage.setItem(HOLDINGS_STORAGE_KEY, JSON.stringify(holdingInputs));
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }

  function clearHoldings() {
    setHoldingInputs(emptyHoldingInputs());
    setSaveStatus("idle");
    try {
      window.localStorage.removeItem(HOLDINGS_STORAGE_KEY);
    } catch {
      // 页面数据仍可正常清空，本地存储不可用时无需阻塞计算器。
    }
  }

  return (
    <div className="rebalance-page">
      <div className="rebalance-workspace">
        {mode === "history" ? (
          <HistoryRebalanceTable events={dataset.events} mode={mode} onModeChange={setMode} />
        ) : (
          <section className="panel calculator-card rebalance-calculator-panel overflow-hidden">
            <RebalanceModeBar
              mode={mode}
              onModeChange={setMode}
              totalCapital={totalCapital}
              canClear={hasHoldingInputs}
              canSave={hasHoldingInputs}
              saveStatus={saveStatus}
              onSave={saveHoldings}
              onClear={clearHoldings}
            />
            <div className="rebalance-table-scroll overflow-x-auto">
            <table className="rebalance-calculation-table w-full min-w-[720px] border-collapse">
              <colgroup>
                <col className="rebalance-asset-column" />
                <col className="rebalance-holding-column" />
                <col className="rebalance-weight-column" />
                <col className="rebalance-advice-column" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                  <th className="px-4 py-3 text-center font-medium">资产</th>
                  <th className="px-4 py-3 text-center font-medium">持有金额</th>
                  <th className="px-4 py-3 text-center font-medium">当前策略占比</th>
                  <th className="px-4 py-3 text-center font-medium">调仓建议</th>
                </tr>
              </thead>
              <tbody>
                {strategyRows.map((row) => {
                  const asset = ASSET_BY_KEY[row.key];
                  const holdingAmount = holdingAmounts[row.key];
                  const difference = targetAmounts[row.key] - holdingAmount;
                  const action = Math.abs(difference) <= tradeThreshold
                    ? "持有"
                    : difference > 0
                      ? `买入 ${formatCurrency(difference)}`
                      : `卖出 ${formatCurrency(Math.abs(difference))}`;
                  return (
                    <tr key={row.key} className="table-row border-b border-[var(--line)] last:border-0">
                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex items-center justify-center gap-3 text-left">
                          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: asset.color }} />
                          <div>
                            <div className="rebalance-asset-code font-mono text-[var(--muted)]">{asset.code}</div>
                            <div className="rebalance-asset-name mt-1 font-semibold">{asset.key === "cash" ? asset.label : asset.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="relative mx-auto w-full max-w-[172px]">
                          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-[var(--muted)]">¥</span>
                          <input
                            type="text"
                            value={holdingInputs[row.key]}
                            onChange={(event) => updateHolding(row.key, event.target.value)}
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="0"
                            className="holding-amount-input w-full pl-7"
                            aria-label={`${asset.name}当前持有金额`}
                          />
                        </div>
                      </td>
                      <td className="rebalance-strategy-weight px-4 py-4 text-center font-mono font-medium tabular-nums">{formatPercent(row.weight)}</td>
                      <td aria-live="polite" className={`rebalance-advice px-4 py-4 text-center font-mono font-semibold tabular-nums ${difference > tradeThreshold ? "positive" : difference < -tradeThreshold ? "negative" : "neutral"}`}>
                        {action}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </section>
        )}

        <div className="rebalance-side-column">
          <section className="rebalance-pie-card overflow-hidden">
            <div className="rebalance-pie-hero">
              <h2 className="rebalance-pie-title">最新持仓比例</h2>
              <div className="rebalance-pie-chart">
                <EChart option={allocationPieOption} className="size-full" label="资产配置占比图" />
              </div>
            </div>
          </section>

          <aside className="risk-card">
            <div className="risk-card-body">
              <div className="risk-card-header">
                <h2>本期事件</h2>
              </div>
              <div className="event-timeline-scroll">
                <div className="event-timeline">
                  {orderedCycleEvents.map((event, index) => (
                    <article key={event.id} className="event-timeline-item">
                      <div className="event-timeline-axis" aria-hidden="true">
                        <span className={`event-timeline-node ${event.type === "正式调仓" ? "event-timeline-node-formal" : "event-timeline-node-risk"}`} />
                        {index < orderedCycleEvents.length - 1 && <span className="event-timeline-line" />}
                      </div>
                      <div className="event-timeline-content">
                        <div className="event-timeline-heading">
                          <span>{event.type}</span>
                          <time dateTime={event.executionDate}>{formatDate(event.executionDate)}</time>
                        </div>
                        <p className="event-timeline-description">{event.asset} · {event.reason}</p>
                        <div className="event-adjustment-list">
                          {event.adjustments.map((adjustment) => (
                            <div key={adjustment.asset} className="event-adjustment-row">
                              <span
                                className="event-adjustment-dot"
                                style={{ backgroundColor: EVENT_ASSET_COLORS[adjustment.asset] ?? "#8b918c" }}
                              />
                              <span>
                                {adjustment.asset}由 <strong>{formatPercent(adjustment.beforeWeight)}</strong> 调至 <strong>{formatPercent(adjustment.afterWeight)}</strong>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </article>
                  ))}
                  {orderedCycleEvents.length === 0 && <div className="text-sm text-[var(--muted)]">暂无本期事件</div>}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function RebalanceModeBar({
  mode,
  onModeChange,
  totalCapital,
  canClear,
  canSave,
  saveStatus = "idle",
  onSave,
  onClear,
}: {
  mode: Mode;
  onModeChange: (value: Mode) => void;
  totalCapital?: number;
  canClear?: boolean;
  canSave?: boolean;
  saveStatus?: "idle" | "saved" | "error";
  onSave?: () => void;
  onClear?: () => void;
}) {
  return (
    <div className="rebalance-mode-bar">
      <SegmentedControl value={mode} options={MODE_OPTIONS} onChange={onModeChange} label="调仓周期" />
      {(totalCapital !== undefined || onSave || onClear) && (
        <div className="rebalance-mode-actions">
          {totalCapital !== undefined && (
            <div className="rebalance-total">
              <span>总资金</span>
              <strong>{formatCurrency(totalCapital)}</strong>
            </div>
          )}
          <div className="rebalance-data-buttons">
            {onSave && (
              <button
                type="button"
                className={`save-data-button ${saveStatus === "error" ? "save-data-button-error" : ""}`}
                onClick={onSave}
                disabled={!canSave || saveStatus === "saved"}
              >
                {saveStatus === "saved" ? <Check size={15} strokeWidth={2} /> : <Save size={15} strokeWidth={1.8} />}
                <span aria-live="polite">
                  {saveStatus === "saved" ? "已保存" : saveStatus === "error" ? "保存失败" : "保存数据"}
                </span>
              </button>
            )}
            {onClear && (
              <button
                type="button"
                className="clear-data-button"
                onClick={onClear}
                disabled={!canClear}
              >
                <Trash2 size={15} strokeWidth={1.8} />
                <span>清空数据</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryRebalanceTable({
  events,
  mode,
  onModeChange,
}: {
  events: RebalanceEventSummary[];
  mode: Mode;
  onModeChange: (value: Mode) => void;
}) {
  const [page, setPage] = useState(1);
  const orderedEvents = useMemo(
    () => [...events].sort((left, right) => {
      const dateOrder = right.executionDate.localeCompare(left.executionDate);
      return dateOrder || right.sequence - left.sequence;
    }),
    [events],
  );
  const totalPages = Math.max(1, Math.ceil(orderedEvents.length / HISTORY_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleEvents = orderedEvents.slice(
    (currentPage - 1) * HISTORY_PAGE_SIZE,
    currentPage * HISTORY_PAGE_SIZE,
  );

  return (
    <section className="panel history-table-card overflow-hidden">
      <RebalanceModeBar mode={mode} onModeChange={onModeChange} />
      <div className="history-table-scroll overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--line)] text-xs text-[var(--muted)]">
              <th className="px-6 py-4 font-medium">执行日期</th>
              <th className="px-5 py-4 font-medium">事件</th>
              <th className="px-5 py-4 font-medium">资产</th>
              <th className="px-6 py-4 font-medium">说明</th>
            </tr>
          </thead>
          <tbody>
            {visibleEvents.map((event) => (
              <tr key={event.id} className="table-row border-b border-[var(--line)] last:border-0">
                <td className="px-6 py-5 font-mono text-sm tabular-nums">{formatDate(event.executionDate)}</td>
                <td className="px-5 py-5 text-sm font-semibold">{event.type}</td>
                <td className="px-5 py-5 text-sm">{event.asset || "组合"}</td>
                <td className="px-6 py-5 text-sm text-[var(--muted)]">{event.reason}</td>
              </tr>
            ))}
            {visibleEvents.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center text-sm text-[var(--muted)]">暂无历史调仓事件</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="history-table-footer">
        <span>共 {orderedEvents.length} 条</span>
        <div className="history-pagination">
          <button
            type="button"
            className="icon-button history-page-button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={currentPage === 1}
            aria-label="上一页"
          >
            <ChevronLeft size={17} />
          </button>
          <span>{currentPage} / {totalPages}</span>
          <button
            type="button"
            className="icon-button history-page-button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={currentPage === totalPages}
            aria-label="下一页"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}
