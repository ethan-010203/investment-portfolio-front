"use client";

import * as echarts from "echarts";
import { useMemo, useState } from "react";

import { EChart } from "@/components/echart";
import { ASSETS, type AssetKey } from "@/lib/assets";
import { buildSelectedCurve } from "@/lib/factor-curve";
import { formatDate, formatNumber, formatPercent, returnTone } from "@/lib/format";
import { calculateMetrics } from "@/lib/metrics";
import type { NavSeriesRecord } from "@/lib/types";

const SELECTABLE_ASSETS = ASSETS.filter((asset) => asset.key !== "cash");

export function NavDashboard({ rows }: { rows: NavSeriesRecord[] }) {
  const [selectedAssets, setSelectedAssets] = useState<AssetKey[]>(() =>
    SELECTABLE_ASSETS.map((asset) => asset.key),
  );

  const seriesRows = rows;

  const selectedCurveRows = useMemo(
    () => buildSelectedCurve(seriesRows, selectedAssets),
    [seriesRows, selectedAssets],
  );
  const metrics = useMemo(() => calculateMetrics(selectedCurveRows), [selectedCurveRows]);

  const lineChartOption = useMemo<echarts.EChartsCoreOption>(
    () => ({
      animationDuration: 500,
      grid: { left: 18, right: 22, top: 24, bottom: 68, containLabel: true },
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

  function toggleAsset(key: AssetKey) {
    setSelectedAssets((current) => {
      if (current.includes(key)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== key);
      }
      return [...current, key];
    });
  }

  return (
    <div className="net-value-layout">
      <aside className="net-value-sidebar">
        <div className="net-value-metrics">
          <Metric label="累计净值" value={formatNumber(metrics.cumulativeNav, 4)} />
          <Metric label="区间年化" value={formatPercent(metrics.annualizedReturn)} tone={returnTone(metrics.annualizedReturn)} />
          <Metric label="年化波动率" value={formatPercent(metrics.annualizedVolatility)} />
          <Metric label="夏普比率" value={formatNumber(metrics.sharpeRatio, 2)} tone={returnTone(metrics.sharpeRatio)} />
          <Metric label="卡玛比率" value={formatNumber(metrics.calmarRatio, 2)} tone={returnTone(metrics.calmarRatio)} />
          <Metric label="区间最大回撤" value={formatPercent(metrics.maximumDrawdown)} tone="negative" />
          <Metric
            label="最大回撤天数"
            value={`${metrics.maximumDrawdownDurationDays} 天`}
            detail={`${formatDate(metrics.maximumDrawdownStartDate)} - ${formatDate(metrics.maximumDrawdownEndDate)}`}
          />
        </div>

        <div className="net-value-sidebar-controls">
          <div className="net-value-control">
            <span className="net-value-control-label">品种</span>
            <div className="asset-options-list" aria-label="选择净值品种">
              {SELECTABLE_ASSETS.map((asset) => {
                const checked = selectedAssets.includes(asset.key);
                return (
                  <label key={asset.key} className="asset-option">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={checked && selectedAssets.length === 1}
                      onChange={() => toggleAsset(asset.key)}
                    />
                    <span className="asset-dot" style={{ backgroundColor: asset.color }} />
                    <span className="asset-option-label">{asset.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      <div className="net-value-charts">
        <section className="panel net-value-chart-panel overflow-hidden">
          <div className="net-value-chart-header">
            <div>
              <h2>累计净值走势</h2>
            </div>
          </div>
          <EChart option={lineChartOption} className="net-value-chart-canvas" label="选中品种组合累计净值折线图" />
        </section>

        <section className="panel net-value-chart-panel overflow-hidden">
          <div className="net-value-chart-header">
            <div>
              <h2>组合净值日度收益率</h2>
            </div>
          </div>
          <EChart option={barChartOption} className="net-value-chart-canvas" label="选中品种组合日度收益率柱状图" />
        </section>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  return (
    <div className="metric-card px-6 py-6 max-[520px]:px-4">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className={`mt-2 font-mono text-2xl font-semibold tabular-nums max-[520px]:text-xl ${tone}`}>{value}</div>
      {detail && <div className="metric-detail">{detail}</div>}
    </div>
  );
}
