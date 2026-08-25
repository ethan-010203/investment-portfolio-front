"use client";

import * as echarts from "echarts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

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

function emptyHoldingInputs(): Record<AssetKey, string> {
  return ASSETS.reduce(
    (values, asset) => {
      values[asset.key] = "";
      return values;
    },
    {} as Record<AssetKey, string>,
  );
}

function riskEventsForDate(events: RebalanceEventSummary[], date: string): RebalanceEventSummary[] {
  return events.filter((event) => event.executionDate <= date);
}

export function RebalanceCalculator({ dataset }: { dataset: PortfolioDataset }) {
  const [mode, setMode] = useState<Mode>("current");
  const [holdingInputs, setHoldingInputs] = useState<Record<AssetKey, string>>(emptyHoldingInputs);

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
  const allocations = useMemo(
    () => allocateCapital(totalCapital, snapshot.weights),
    [totalCapital, snapshot],
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

  const donutOption = useMemo<echarts.EChartsCoreOption>(
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
          radius: ["60%", "80%"],
          center: ["50%", "50%"],
          avoidLabelOverlap: true,
          padAngle: 2,
          itemStyle: { borderColor: "#e8f3f7", borderWidth: 4 },
          label: { show: false },
          emphasis: { scale: true, scaleSize: 6 },
          data: allocations
            .filter((row) => row.weight > 0)
            .map((row) => ({
              name: ASSET_BY_KEY[row.key].label,
              value: Number((row.weight * 100).toFixed(6)),
              itemStyle: { color: ASSET_BY_KEY[row.key].color },
            })),
        },
      ],
    }),
    [allocations],
  );

  function updateHolding(key: AssetKey, value: string) {
    setHoldingInputs((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="rebalance-page">
      <div className="rebalance-workspace">
        {mode === "history" ? (
          <HistoryRebalanceTable events={dataset.events} mode={mode} onModeChange={setMode} />
        ) : (
          <section className="panel calculator-card rebalance-calculator-panel overflow-hidden">
          <RebalanceModeBar mode={mode} onModeChange={setMode} totalCapital={totalCapital} />
          <div className="rebalance-table-scroll overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--line)] text-xs text-[var(--muted)]">
                  <th className="px-6 py-3 font-medium">资产</th>
                  <th className="px-4 py-3 text-right font-medium">持有金额</th>
                  <th className="px-4 py-3 text-right font-medium">当前策略占比</th>
                  <th className="px-6 py-3 text-right font-medium">调仓建议</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((row) => {
                  const asset = ASSET_BY_KEY[row.key];
                  const holdingAmount = holdingAmounts[row.key];
                  const difference = row.amount - holdingAmount;
                  const action = totalCapital <= 0
                    ? "待输入"
                    : Math.abs(difference) <= tradeThreshold
                      ? "持有"
                      : difference > 0
                        ? `买入 ${formatCurrency(difference)}`
                        : `卖出 ${formatCurrency(Math.abs(difference))}`;
                  return (
                    <tr key={row.key} className="table-row border-b border-[var(--line)] last:border-0">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: asset.color }} />
                          <div>
                            <div className="font-mono text-xs text-[var(--muted)]">{asset.code}</div>
                            <div className="mt-1 text-sm font-semibold">{asset.key === "cash" ? asset.label : asset.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="relative ml-auto w-[150px]">
                          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-[var(--muted)]">¥</span>
                          <input
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
                      <td className="px-4 py-4 text-right font-mono text-sm font-medium tabular-nums">{formatPercent(row.weight)}</td>
                      <td className={`px-6 py-4 text-right font-mono text-sm font-semibold tabular-nums ${difference > tradeThreshold ? "positive" : difference < -tradeThreshold ? "negative" : "neutral"}`}>
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
          <section className="panel rebalance-pie-card overflow-hidden">
            <div className="rebalance-pie-chart">
              <EChart option={donutOption} className="size-full" label="资产配置占比图" />
            </div>
            <div className="rebalance-pie-legend">
              {allocations.map((row) => {
                const asset = ASSET_BY_KEY[row.key];
                return (
                  <div key={row.key} className="rebalance-pie-legend-item">
                    <span className="asset-dot" style={{ backgroundColor: asset.color }} />
                    <span className="rebalance-pie-legend-name">{asset.label}</span>
                    <span className="rebalance-pie-legend-value">{formatPercent(row.weight, 1)}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="panel risk-card h-fit overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-5">
            <h2 className="text-lg font-semibold">本期事件</h2>
          </div>
          <div className="px-5 py-5">
            <div className="mt-4">
              {orderedCycleEvents.map((event, index) => (
                <div key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < orderedCycleEvents.length - 1 && <span className="absolute top-4 bottom-0 left-[5px] w-px bg-[var(--line)]" />}
                  <span className={`relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-[var(--surface-strong)] ${event.type === "正式调仓" ? "bg-[var(--blue)]" : "bg-[#b58a3a]"}`} />
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{event.type}</span>
                      <span className="shrink-0 text-xs text-[var(--muted)]">{formatDate(event.executionDate)}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{event.asset} · {event.reason}</p>
                  </div>
                </div>
              ))}
              {orderedCycleEvents.length === 0 && <div className="text-sm text-[var(--muted)]">暂无本期事件</div>}
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
}: {
  mode: Mode;
  onModeChange: (value: Mode) => void;
  totalCapital?: number;
}) {
  return (
    <div className="rebalance-mode-bar">
      <SegmentedControl value={mode} options={MODE_OPTIONS} onChange={onModeChange} label="调仓周期" />
      {totalCapital !== undefined && (
        <div className="rebalance-total">
          <span>总资金</span>
          <strong>{formatCurrency(totalCapital)}</strong>
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
