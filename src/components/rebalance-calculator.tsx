"use client";

import * as echarts from "echarts";
import { CalendarDays, Check, ChevronDown, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { EChart } from "@/components/echart";
import { SegmentedControl } from "@/components/segmented-control";
import { allocateCapital, normalizeCapital } from "@/lib/allocation";
import { ASSETS, ASSET_BY_KEY, type AssetKey } from "@/lib/assets";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "@/lib/format";
import type { NavRecord, PortfolioDataset, RebalanceEventSummary } from "@/lib/types";

type Mode = "current" | "history";

const MODE_OPTIONS = [
  { value: "current", label: "本期调仓" },
  { value: "history", label: "往期调仓" },
] as const;

function emptyHoldingInputs(): Record<AssetKey, string> {
  return ASSETS.reduce(
    (values, asset) => {
      values[asset.key] = "";
      return values;
    },
    {} as Record<AssetKey, string>,
  );
}

function eventLabel(event: RebalanceEventSummary): string {
  return `${formatDate(event.executionDate)} · ${event.type} · ${event.asset}`;
}

function riskEventsForDate(events: RebalanceEventSummary[], date: string): RebalanceEventSummary[] {
  return events.filter((event) => event.executionDate <= date);
}

function snapshotForEvent(nav: NavRecord[], event: RebalanceEventSummary): NavRecord | undefined {
  return nav.find((row) => row.date === event.executionDate);
}

export function RebalanceCalculator({ dataset }: { dataset: PortfolioDataset }) {
  const availableEvents = useMemo(
    () => [...dataset.events].reverse().filter((event) => snapshotForEvent(dataset.nav, event)),
    [dataset.events, dataset.nav],
  );
  const [mode, setMode] = useState<Mode>("current");
  const [selectedEventId, setSelectedEventId] = useState(availableEvents[0]?.id ?? "");
  const [holdingInputs, setHoldingInputs] = useState<Record<AssetKey, string>>(emptyHoldingInputs);

  const selectedEvent = availableEvents.find((event) => event.id === selectedEventId);
  const latest = dataset.nav.at(-1)!;
  const snapshot = mode === "history" && selectedEvent
    ? snapshotForEvent(dataset.nav, selectedEvent) ?? latest
    : latest;
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
  const totalTrade = allocations.reduce((total, row) => {
    const difference = row.amount - holdingAmounts[row.key];
    return total + (Math.abs(difference) > tradeThreshold ? Math.abs(difference) : 0);
  }, 0);
  const eventsThroughSnapshot = useMemo(
    () => riskEventsForDate(dataset.events, snapshot.date),
    [dataset.events, snapshot.date],
  );
  const formalEvent = [...eventsThroughSnapshot].reverse().find((event) => event.type === "正式调仓");
  const cycleEvents = formalEvent
    ? eventsThroughSnapshot.filter((event) => event.cycleDate === formalEvent.cycleDate)
    : [];
  const riskEvents = cycleEvents.filter((event) => event.type !== "正式调仓");
  const latestRiskEvent = riskEvents.at(-1);

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
    <>
      <div className="page-title-row">
        <h1 className="page-title">调仓计算</h1>
        <SegmentedControl value={mode} options={MODE_OPTIONS} onChange={setMode} label="调仓周期" />
      </div>

      {mode === "history" && (
        <div className="panel history-card mb-5 flex items-center gap-4 px-5 py-4 max-[680px]:items-stretch max-[680px]:flex-col">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays size={16} className="text-[var(--muted)]" />
            <span>历史事件</span>
          </div>
          <div className="relative min-w-0 flex-1">
            <select
              value={selectedEventId}
              onChange={(event) => setSelectedEventId(event.target.value)}
              className="soft-input h-11 w-full appearance-none px-4 pr-9 text-sm"
              aria-label="选择历史调仓事件"
            >
              {availableEvents.map((event) => (
                <option key={event.id} value={event.id}>{eventLabel(event)}</option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[var(--muted)]" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-5 max-[940px]:grid-cols-1">
        <section className="panel calculator-card overflow-hidden">
          <div className="rebalance-input-summary border-b border-[var(--line)]">
            <div>
              <div className="text-sm font-semibold">当前持仓</div>
              <div className="mt-1 text-xs text-[var(--muted)]">逐项填写当前持有金额，调仓建议会实时更新</div>
            </div>
            <div className="rebalance-total">
              <span>总资金</span>
              <strong>{formatCurrency(totalCapital)}</strong>
            </div>
          </div>

          <div className="grid grid-cols-[280px_1fr] border-b border-[var(--line)] max-[680px]:grid-cols-1">
            <div className="bg-[var(--sky-card)] p-6 max-[680px]:border-r-0 max-[680px]:border-b">
              <div className="relative mx-auto size-[224px]">
                <EChart option={donutOption} className="size-full" label="资产配置占比图" />
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <div className="text-xs text-[var(--muted)]">最新净值</div>
                    <div className="mt-1 font-mono text-lg font-semibold">{formatNumber(snapshot.cumulativeNav, 4)}</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                {allocations.map((row) => {
                  const asset = ASSET_BY_KEY[row.key];
                  return (
                    <div key={row.key} className="flex min-w-0 items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: asset.color }} />
                        <span className="truncate text-[var(--muted)]">{asset.label}</span>
                      </span>
                      <span className="font-mono tabular-nums">{formatPercent(row.weight, 1)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2">
              <SummaryItem label="配置日期" value={formatDate(snapshot.date)} />
              <SummaryItem label="总资金" value={formatCurrency(totalCapital)} />
              <SummaryItem label="持有资产" value={`${allocations.filter((row) => holdingAmounts[row.key] > 0 && row.key !== "cash").length} 项`} />
              <SummaryItem label="当前现金比例" value={formatPercent(totalCapital > 0 ? holdingAmounts.cash / totalCapital : 0)} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--line)] text-xs text-[var(--muted)]">
                  <th className="px-6 py-3 font-medium">资产</th>
                  <th className="px-4 py-3 text-right font-medium">持有金额</th>
                  <th className="px-4 py-3 text-right font-medium">实际占比</th>
                  <th className="px-4 py-3 text-right font-medium">策略占比</th>
                  <th className="px-6 py-3 text-right font-medium">配置金额</th>
                  <th className="px-6 py-3 text-right font-medium">调仓建议</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((row) => {
                  const asset = ASSET_BY_KEY[row.key];
                  const holdingAmount = holdingAmounts[row.key];
                  const actualWeight = totalCapital > 0 ? holdingAmount / totalCapital : 0;
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
                      <td className="px-4 py-4 text-right font-mono text-sm font-medium tabular-nums">{formatPercent(actualWeight)}</td>
                      <td className="px-4 py-4 text-right font-mono text-sm font-medium tabular-nums">{formatPercent(row.weight)}</td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-semibold tabular-nums">{formatCurrency(row.amount)}</td>
                      <td className={`px-6 py-4 text-right font-mono text-sm font-semibold tabular-nums ${difference > tradeThreshold ? "positive" : difference < -tradeThreshold ? "negative" : "neutral"}`}>
                        {action}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[rgb(231_238_244_/_28%)]">
                  <td className="px-6 py-4 text-sm font-semibold">合计</td>
                  <td className="px-4 py-4 text-right font-mono text-sm font-semibold">{formatCurrency(totalCapital)}</td>
                  <td className="px-4 py-4 text-right font-mono text-sm font-semibold">100.00%</td>
                  <td className="px-4 py-4 text-right font-mono text-sm font-semibold">100.00%</td>
                  <td className="px-6 py-4 text-right font-mono text-sm font-semibold">{formatCurrency(totalCapital)}</td>
                  <td className="px-6 py-4 text-right font-mono text-sm font-semibold">{formatCurrency(totalTrade)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <aside className="panel risk-card h-fit overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-5">
            <span className="grid size-10 place-items-center rounded-full bg-[var(--blue-soft)] text-[var(--blue)]">
              <ShieldCheck size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold">风控状态</h2>
              <div className="mt-1 text-xs text-[var(--muted)]">{formatDate(snapshot.date)}</div>
            </div>
          </div>

          <div className="border-b border-[var(--line)] px-5 py-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="grid size-5 place-items-center rounded-full bg-[#dcebe1] text-[var(--negative)]">
                <Check size={12} strokeWidth={3} />
              </span>
              {latestRiskEvent ? "已执行风险调整" : "本周期正常运行"}
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              <RiskRow label="正式调仓日" value={formalEvent ? formatDate(formalEvent.cycleDate) : "暂无"} />
              <RiskRow label="组合止损" value={`${riskEvents.filter((event) => event.type === "组合止损").length} 次`} />
              <RiskRow label="单品种止盈" value={`${riskEvents.filter((event) => event.type === "单品种止盈").length} 次`} />
              <RiskRow label="数据截至" value={formatDate(snapshot.dataThrough)} />
            </dl>
          </div>

          <div className="px-5 py-5">
            <div className="eyebrow">近期事件</div>
            <div className="mt-4">
              {[...eventsThroughSnapshot].reverse().slice(0, 4).map((event, index) => (
                <div key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < Math.min(3, eventsThroughSnapshot.length - 1) && <span className="absolute top-4 bottom-0 left-[5px] w-px bg-[var(--line)]" />}
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
              {eventsThroughSnapshot.length === 0 && <div className="text-sm text-[var(--muted)]">暂无调仓事件</div>}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-item border-r border-b border-[var(--line)] p-5 even:border-r-0 nth-[n+3]:border-b-0 max-[420px]:p-4">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-2 truncate font-mono text-sm font-semibold tabular-nums" title={value}>{value}</div>
    </div>
  );
}

function RiskRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
