"use client";

import * as echarts from "echarts";
import { Check, ChevronLeft, ChevronRight, CircleHelp, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EChart } from "@/components/echart";
import { SegmentedControl } from "@/components/segmented-control";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-query";
import { allocateCapital, formatRebalanceAction, normalizeCapital } from "@/lib/allocation";
import { ASSETS, ASSET_BY_KEY, type AssetKey } from "@/lib/assets";
import {
  compareEventTriggersDescending,
  triggeredEventsThrough,
} from "@/lib/event-display";
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

export function RebalanceCalculator({ dataset }: { dataset: PortfolioDataset }) {
  const [mode, setMode] = useState<Mode>("current");
  const [holdingInputs, setHoldingInputs] = useState<Record<AssetKey, string>>(emptyHoldingInputs);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [rulesOpen, setRulesOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 720px)");

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
    () => triggeredEventsThrough(dataset.events, snapshot.date),
    [dataset.events, snapshot.date],
  );
  const formalEvent = [...eventsThroughSnapshot]
    .sort(compareEventTriggersDescending)
    .find((event) => event.type === "正式调仓");
  const cycleEvents = formalEvent
    ? eventsThroughSnapshot.filter((event) => event.cycleDate === formalEvent.cycleDate)
    : [];
  const orderedCycleEvents = [...cycleEvents].sort(compareEventTriggersDescending);

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
          radius: isMobile ? "52%" : "58%",
          center: ["50%", isMobile ? "52%" : "50%"],
          avoidLabelOverlap: true,
          selectedMode: "single",
          selectedOffset: 5,
          itemStyle: { borderColor: "#fff8eb", borderWidth: 2 },
          label: {
            show: true,
            position: "outside",
            alignTo: "edge",
            edgeDistance: isMobile ? 5 : 8,
            bleedMargin: 0,
            distanceToLabelLine: 4,
            color: "#454844",
            fontSize: isMobile ? 12 : 13,
            fontWeight: 650,
            formatter: "{b}",
          },
          labelLine: {
            show: true,
            length: isMobile ? 10 : 15,
            length2: isMobile ? 6 : 10,
            lineStyle: { width: 1.4, opacity: 0.9 },
          },
          labelLayout: { hideOverlap: false, moveOverlap: "shiftY" },
          emphasis: {
            scale: true,
            scaleSize: 4,
            itemStyle: { shadowBlur: 0, shadowColor: "transparent" },
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
    [isMobile, strategyRows],
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
                    <th className="px-6 py-3 text-left font-bold">资产</th>
                    <th className="px-4 py-3 text-center font-bold">持有金额</th>
                    <th className="px-4 py-3 text-center font-bold">当前策略占比</th>
                    <th className="px-4 py-3 text-center font-bold">调仓建议</th>
                  </tr>
                </thead>
                <tbody>
                  {strategyRows.map((row) => {
                    const asset = ASSET_BY_KEY[row.key];
                    const holdingAmount = holdingAmounts[row.key];
                    const difference = targetAmounts[row.key] - holdingAmount;
                    const action = formatRebalanceAction(row.key, difference, tradeThreshold);
                    return (
                      <tr key={row.key} className="table-row border-b border-[var(--line)] last:border-0">
                        <td className="px-6 py-4 text-left">
                          <div className="flex items-center gap-3">
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
            <div className="rebalance-mobile-assets">
              {strategyRows.map((row) => {
                const asset = ASSET_BY_KEY[row.key];
                const holdingAmount = holdingAmounts[row.key];
                const difference = targetAmounts[row.key] - holdingAmount;
                const action = formatRebalanceAction(row.key, difference, tradeThreshold);
                const tone = difference > tradeThreshold
                  ? "positive"
                  : difference < -tradeThreshold
                    ? "negative"
                    : "neutral";

                return (
                  <article key={row.key} className="rebalance-mobile-asset">
                    <div className="rebalance-mobile-asset-heading">
                      <div className="rebalance-mobile-asset-identity">
                        <span className="asset-dot" style={{ backgroundColor: asset.color }} />
                        <div>
                          <div className="rebalance-mobile-asset-name">{asset.key === "cash" ? asset.label : asset.name}</div>
                          <div className="rebalance-mobile-asset-code">{asset.code}</div>
                        </div>
                      </div>
                      <div className="rebalance-mobile-weight">
                        <span>当前策略占比</span>
                        <strong>{formatPercent(row.weight)}</strong>
                      </div>
                    </div>
                    <div className="rebalance-mobile-asset-controls">
                      <label className="rebalance-mobile-input-field">
                        <span>持有金额</span>
                        <div className="relative w-full">
                          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-[var(--muted)]">¥</span>
                          <input
                            type="text"
                            value={holdingInputs[row.key]}
                            onChange={(event) => updateHolding(row.key, event.target.value)}
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="0"
                            className="holding-amount-input w-full pl-7"
                          />
                        </div>
                      </label>
                      <div className="rebalance-mobile-advice">
                        <span>调仓建议</span>
                        <strong aria-live="polite" className={tone}>{action}</strong>
                      </div>
                    </div>
                  </article>
                );
              })}
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
                <TooltipProvider delayDuration={180}>
                  <Tooltip open={rulesOpen} onOpenChange={setRulesOpen}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="event-rules-trigger"
                        aria-label="查看调仓规则"
                        onClick={() => setRulesOpen(true)}
                      >
                        <CircleHelp size={17} strokeWidth={1.9} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      align="end"
                      sideOffset={8}
                      arrowClassName="fill-[#fffdf8]"
                      className="event-rules-tooltip max-w-[min(320px,calc(100vw-24px))] flex-col items-start gap-2 rounded-2xl bg-[#fffdf8] p-4 text-[#202124] shadow-[0_18px_46px_rgb(54_59_54_/_15%)] ring-1 ring-[#dedfd9]"
                    >
                      <strong className="text-sm">调仓规则</strong>
                      <p>策略在交易日收盘后确认信号，本页日期为信号触发日；用户在下一交易日按最新策略比例调仓。</p>
                      <p><strong>例：</strong>8月24日收盘触发组合止损，本期事件显示8月24日，用户在8月25日交易时完成调仓。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
                          <time dateTime={event.signalDate}>{formatDate(event.signalDate)}</time>
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
    () => [...events].sort(compareEventTriggersDescending),
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
              <th className="px-6 py-4 font-medium">触发日期</th>
              <th className="px-5 py-4 font-medium">事件</th>
              <th className="px-5 py-4 font-medium">资产</th>
              <th className="px-6 py-4 font-medium">说明</th>
            </tr>
          </thead>
          <tbody>
            {visibleEvents.map((event) => (
              <tr key={event.id} className="table-row border-b border-[var(--line)] last:border-0">
                <td className="px-6 py-5 font-mono text-sm tabular-nums">{formatDate(event.signalDate)}</td>
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
      <div className="history-mobile-list">
        {visibleEvents.map((event) => (
          <article key={event.id} className="history-mobile-event">
            <div className="history-mobile-event-heading">
              <strong>{event.type}</strong>
              <time dateTime={event.signalDate}>{formatDate(event.signalDate)}</time>
            </div>
            <div className="history-mobile-event-asset">{event.asset || "组合"}</div>
            <p>{event.reason}</p>
          </article>
        ))}
        {visibleEvents.length === 0 && (
          <div className="history-mobile-empty">暂无历史调仓事件</div>
        )}
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
