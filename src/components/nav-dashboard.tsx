"use client";

import * as echarts from "echarts";
import { ChevronDown, ChevronLeft, ChevronRight, ListFilter } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { EChart } from "@/components/echart";
import { SegmentedControl } from "@/components/segmented-control";
import { ASSETS, type AssetKey } from "@/lib/assets";
import { buildSelectedCurve } from "@/lib/factor-curve";
import { formatDate, formatNumber, formatPercent, returnTone } from "@/lib/format";
import { calculateMetrics } from "@/lib/metrics";
import type { NavSeriesRecord } from "@/lib/types";

type RangeKey = "1y" | "3y" | "5y" | "all";

const RANGE_OPTIONS = [
  { value: "1y", label: "近1年" },
  { value: "3y", label: "近3年" },
  { value: "5y", label: "近5年" },
  { value: "all", label: "全部" },
] as const;

const PAGE_SIZE = 12;

function startDateForRange(latestDate: string, range: RangeKey): string {
  if (range === "all") return "0000-01-01";
  const years = Number(range[0]);
  const date = new Date(`${latestDate}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date.toISOString().slice(0, 10);
}

export function NavDashboard({ rows }: { rows: NavSeriesRecord[] }) {
  const [range, setRange] = useState<RangeKey>("all");
  const [page, setPage] = useState(1);
  const [selectedFactors, setSelectedFactors] = useState<AssetKey[]>(() =>
    ASSETS.map((asset) => asset.key),
  );
  const [factorMenuOpen, setFactorMenuOpen] = useState(false);
  const factorSelectorRef = useRef<HTMLDivElement>(null);

  const filteredRows = useMemo(() => {
    const latestDate = rows.at(-1)!.date;
    const startDate = startDateForRange(latestDate, range);
    return rows.filter((row) => row.date >= startDate);
  }, [range, rows]);

  const selectedCurveRows = useMemo(
    () => buildSelectedCurve(filteredRows, selectedFactors),
    [filteredRows, selectedFactors],
  );
  const metrics = useMemo(() => calculateMetrics(selectedCurveRows), [selectedCurveRows]);
  const selectedWeight = useMemo(() => {
    const latestWeights = filteredRows.at(-1)?.weights;
    if (!latestWeights) return 0;
    return selectedFactors.reduce((sum, key) => sum + latestWeights[key], 0);
  }, [filteredRows, selectedFactors]);
  const descendingRows = useMemo(() => [...filteredRows].reverse(), [filteredRows]);
  const totalPages = Math.max(1, Math.ceil(descendingRows.length / PAGE_SIZE));
  const visiblePage = Math.min(page, totalPages);
  const tableRows = descendingRows.slice((visiblePage - 1) * PAGE_SIZE, visiblePage * PAGE_SIZE);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (factorSelectorRef.current && !factorSelectorRef.current.contains(event.target as Node)) {
        setFactorMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const chartOption = useMemo<echarts.EChartsCoreOption>(
    () => ({
      animationDuration: 500,
      grid: { left: 18, right: 22, top: 24, bottom: 18, containLabel: true },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(32, 33, 36, 0.94)",
        borderWidth: 0,
        padding: [11, 13],
        borderRadius: 14,
        textStyle: { color: "#fffdf8", fontSize: 12 },
        valueFormatter: (value: unknown) => formatNumber(Number(value), 4),
        axisPointer: {
          type: "line",
          lineStyle: { color: "#9db8c9", width: 1, type: "dashed" },
        },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: selectedCurveRows.map((row) => row.date),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#85847e",
          margin: 15,
          hideOverlap: true,
          formatter: (value: string) => value.slice(0, 7).replace("-", "."),
        },
      },
      yAxis: {
        type: "value",
        scale: true,
        splitNumber: 4,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#85847e", margin: 12, formatter: (value: number) => value.toFixed(2) },
        splitLine: { lineStyle: { color: "#e7ecea", width: 1 } },
      },
      series: [
        {
          name: "累计净值",
          type: "line",
          data: selectedCurveRows.map((row) => row.cumulativeNav),
          showSymbol: false,
          symbol: "circle",
          smooth: 0.18,
          lineStyle: { color: "#2f6288", width: 3, cap: "round", join: "round" },
          itemStyle: { color: "#2f6288" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(47, 98, 136, 0.12)" },
              { offset: 1, color: "rgba(47, 98, 136, 0.015)" },
            ]),
          },
        },
      ],
    }),
    [selectedCurveRows],
  );

  function changeRange(next: RangeKey) {
    setRange(next);
    setPage(1);
  }

  function toggleFactor(key: AssetKey) {
    setSelectedFactors((current) => {
      if (current.includes(key)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== key);
      }
      return [...current, key];
    });
  }

  return (
    <>
      <div className="mb-5 grid grid-cols-4 gap-3 max-[760px]:grid-cols-2">
        <Metric label="累计净值" value={formatNumber(metrics.cumulativeNav, 4)} />
        <Metric label="区间末日收益" value={formatPercent(metrics.latestReturn)} tone={returnTone(metrics.latestReturn)} />
        <Metric label="区间年化" value={formatPercent(metrics.annualizedReturn)} tone={returnTone(metrics.annualizedReturn)} />
        <Metric label="区间最大回撤" value={formatPercent(metrics.maximumDrawdown)} tone="negative" />
      </div>

      <section className="panel chart-card overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-6 py-5 max-[600px]:items-start max-[600px]:flex-col">
          <div>
            <h2 className="text-base font-semibold">选中因子组合走势</h2>
            <div className="mt-1 text-xs text-[var(--muted)]">
              已选 {selectedFactors.length} 项 · 当前策略权重 {formatPercent(selectedWeight)} · {filteredRows.length} 个交易日
            </div>
          </div>
          <div className="chart-controls">
            <div ref={factorSelectorRef} className="factor-selector">
              <button
                type="button"
                className="factor-selector-trigger"
                aria-expanded={factorMenuOpen}
                aria-haspopup="true"
                onClick={() => setFactorMenuOpen((open) => !open)}
              >
                <ListFilter size={16} strokeWidth={2.2} />
                <span>因子</span>
                <span className="factor-count">{selectedFactors.length}/{ASSETS.length}</span>
                <ChevronDown size={15} className={factorMenuOpen ? "rotate-180 transition-transform" : "transition-transform"} />
              </button>
              {factorMenuOpen && (
                <div className="factor-selector-menu" role="menu" aria-label="选择净值因子">
                  <div className="factor-menu-heading">选择组合因子</div>
                  {ASSETS.map((asset) => {
                    const checked = selectedFactors.includes(asset.key);
                    const latestWeight = filteredRows.at(-1)?.weights[asset.key] ?? 0;
                    return (
                      <label key={asset.key} className="factor-option" role="menuitemcheckbox" aria-checked={checked}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={checked && selectedFactors.length === 1}
                          onChange={() => toggleFactor(asset.key)}
                        />
                        <span className="asset-dot" style={{ backgroundColor: asset.color }} />
                        <span className="factor-option-label">{asset.label}</span>
                        <span className="factor-option-weight">{formatPercent(latestWeight, 1)}</span>
                      </label>
                    );
                  })}
                  <div className="factor-menu-note">按原策略权重合并，不重新分配未选资产</div>
                </div>
              )}
            </div>
            <SegmentedControl value={range} options={RANGE_OPTIONS} onChange={changeRange} label="净值区间" />
          </div>
        </div>
        <EChart option={chartOption} className="h-[390px] w-full max-[680px]:h-[300px]" label="选中因子组合净值走势图" />
      </section>

      <section className="panel table-card mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-5">
          <h2 className="text-base font-semibold">原策略每日记录</h2>
          <span className="text-xs text-[var(--muted)]">共 {descendingRows.length} 条</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[790px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--line)] text-xs text-[var(--muted)]">
                <th className="px-6 py-3 font-medium">日期</th>
                <th className="px-4 py-3 text-right font-medium">累计净值</th>
                <th className="px-4 py-3 text-right font-medium">当日净收益</th>
                <th className="px-4 py-3 text-right font-medium">组合毛收益</th>
                <th className="px-4 py-3 text-right font-medium">交易成本</th>
                <th className="px-6 py-3 text-right font-medium">数据截至</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.date} className="table-row border-b border-[var(--line)] last:border-0">
                  <td className="px-6 py-4 text-sm font-medium">{formatDate(row.date)}</td>
                  <td className="px-4 py-4 text-right font-mono text-sm tabular-nums">{formatNumber(row.cumulativeNav, 4)}</td>
                  <td className={`px-4 py-4 text-right font-mono text-sm font-semibold tabular-nums ${returnTone(row.netReturn)}`}>
                    {formatPercent(row.netReturn)}
                  </td>
                  <td className={`px-4 py-4 text-right font-mono text-sm tabular-nums ${returnTone(row.grossReturn)}`}>
                    {formatPercent(row.grossReturn)}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-sm tabular-nums text-[var(--muted)]">{formatPercent(row.costRate, 4)}</td>
                  <td className="px-6 py-4 text-right text-sm text-[var(--muted)]">{formatDate(row.dataThrough)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--line)] px-6 py-4">
          <span className="text-xs text-[var(--muted)]">第 {visiblePage} / {totalPages} 页</span>
          <div className="flex gap-2">
            <button type="button" aria-label="上一页" title="上一页" disabled={visiblePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="icon-button grid size-10 place-items-center disabled:cursor-not-allowed disabled:opacity-35">
              <ChevronLeft size={16} />
            </button>
            <button type="button" aria-label="下一页" title="下一页" disabled={visiblePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="icon-button grid size-10 place-items-center disabled:cursor-not-allowed disabled:opacity-35">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "positive" | "negative" | "neutral" }) {
  return (
    <div className="metric-card px-6 py-6 max-[520px]:px-4">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className={`mt-2 font-mono text-2xl font-semibold tabular-nums max-[520px]:text-xl ${tone}`}>{value}</div>
    </div>
  );
}
