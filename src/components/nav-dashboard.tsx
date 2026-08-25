"use client";

import * as echarts from "echarts";
import { ChevronDown, ListFilter } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { EChart } from "@/components/echart";
import { SegmentedControl } from "@/components/segmented-control";
import { ASSETS, type AssetKey } from "@/lib/assets";
import { buildSelectedCurve } from "@/lib/factor-curve";
import { formatNumber, formatPercent, returnTone } from "@/lib/format";
import { calculateMetrics } from "@/lib/metrics";
import type { NavSeriesRecord } from "@/lib/types";

type RangeKey = "1y" | "3y" | "5y" | "all";

const RANGE_OPTIONS = [
  { value: "1y", label: "近1年" },
  { value: "3y", label: "近3年" },
  { value: "5y", label: "近5年" },
  { value: "all", label: "全部" },
] as const;

function startDateForRange(latestDate: string, range: RangeKey): string {
  if (range === "all") return "0000-01-01";
  const years = Number(range[0]);
  const date = new Date(`${latestDate}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date.toISOString().slice(0, 10);
}

export function NavDashboard({ rows }: { rows: NavSeriesRecord[] }) {
  const [range, setRange] = useState<RangeKey>("all");
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
  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (factorSelectorRef.current && !factorSelectorRef.current.contains(event.target as Node)) {
        setFactorMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const lineChartOption = useMemo<echarts.EChartsCoreOption>(
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

  const barChartOption = useMemo<echarts.EChartsCoreOption>(
    () => ({
      animationDuration: 350,
      grid: { left: 18, right: 22, top: 18, bottom: 68, containLabel: true },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(32, 33, 36, 0.94)",
        borderWidth: 0,
        padding: [11, 13],
        borderRadius: 14,
        textStyle: { color: "#fffdf8", fontSize: 12 },
        valueFormatter: (value: unknown) => formatPercent(Number(value)),
        axisPointer: {
          type: "shadow",
          lineStyle: { color: "#9db8c9", width: 1, type: "dashed" },
        },
      },
      dataZoom: [
        {
          type: "inside",
          xAxisIndex: 0,
          start: Math.max(0, 100 - (30 / Math.max(selectedCurveRows.length, 30)) * 100),
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
        },
        {
          type: "slider",
          xAxisIndex: 0,
          height: 20,
          bottom: 13,
          borderColor: "transparent",
          backgroundColor: "#eef2f0",
          fillerColor: "rgba(47, 98, 136, 0.16)",
          handleSize: "115%",
          handleStyle: { color: "#2f6288", borderWidth: 0 },
          moveHandleStyle: { color: "#9db8c9" },
          dataBackground: {
            lineStyle: { color: "#b8ccda", width: 1 },
            areaStyle: { color: "rgba(184, 204, 218, 0.18)" },
          },
        },
      ],
      xAxis: {
        type: "category",
        boundaryGap: true,
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
        axisLabel: { color: "#85847e", margin: 12, formatter: (value: number) => formatPercent(value) },
        splitLine: { lineStyle: { color: "#e7ecea", width: 1 } },
      },
      series: [
        {
          name: "当日收益率",
          type: "bar",
          barMaxWidth: 18,
          barMinHeight: 2,
          data: selectedCurveRows.map((row) => ({
            value: row.netReturn,
            itemStyle: {
              color: row.netReturn >= 0 ? "#c84f3d" : "#16805f",
              borderRadius: row.netReturn >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4],
            },
          })),
          markLine: {
            silent: true,
            symbol: "none",
            label: { show: false },
            lineStyle: { color: "#aeb9b4", width: 1 },
            data: [{ yAxis: 0 }],
          },
        },
      ],
    }),
    [selectedCurveRows],
  );

  function changeRange(next: RangeKey) {
    setRange(next);
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
            <h2 className="text-base font-semibold">累计净值走势</h2>
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
        <EChart option={lineChartOption} className="h-[390px] w-full max-[680px]:h-[300px]" label="选中因子组合累计净值折线图" />
      </section>

      <section className="panel chart-card mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-5">
          <div>
            <h2 className="text-base font-semibold">组合净值日度收益率</h2>
            <div className="mt-1 text-xs text-[var(--muted)]">{selectedCurveRows.length} 个交易日</div>
          </div>
        </div>
        <EChart option={barChartOption} className="h-[390px] w-full max-[680px]:h-[300px]" label="选中因子组合日度收益率柱状图" />
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
