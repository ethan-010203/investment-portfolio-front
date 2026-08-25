"use client";

import * as echarts from "echarts";
import { useEffect, useMemo, useState } from "react";

import { EChart } from "@/components/echart";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ASSETS, type AssetKey } from "@/lib/assets";
import { buildSelectedCurve } from "@/lib/factor-curve";
import { formatDate, formatNumber, formatPercent, returnTone } from "@/lib/format";
import { calculateMetrics } from "@/lib/metrics";
import type { NavSeriesRecord } from "@/lib/types";

const SELECTABLE_ASSETS = ASSETS.filter((asset) => asset.key !== "cash");
const SELECTED_ASSETS_STORAGE_KEY = "investment-portfolio:net-value-assets:v1";

function initialSelectedAssets(): AssetKey[] {
  const defaults = SELECTABLE_ASSETS.map((asset) => asset.key);
  if (typeof window === "undefined") return defaults;

  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(SELECTED_ASSETS_STORAGE_KEY) ?? "null");
    if (!Array.isArray(parsed)) return defaults;
    const allowed = new Set<AssetKey>(defaults);
    const selected = parsed.filter(
      (key): key is AssetKey => typeof key === "string" && allowed.has(key as AssetKey),
    );
    return selected.length > 0 ? [...new Set(selected)] : defaults;
  } catch {
    return defaults;
  }
}

export function NavDashboard({ rows }: { rows: NavSeriesRecord[] }) {
  const [selectedAssets, setSelectedAssets] = useState<AssetKey[]>(initialSelectedAssets);
  const isMobile = useMediaQuery("(max-width: 720px)");

  useEffect(() => {
    try {
      window.localStorage.setItem(SELECTED_ASSETS_STORAGE_KEY, JSON.stringify(selectedAssets));
    } catch {
      // 浏览器禁用本地存储时仍保留当前页面内的选择。
    }
  }, [selectedAssets]);

  const seriesRows = rows;

  const selectedCurveRows = useMemo(
    () => buildSelectedCurve(seriesRows, selectedAssets),
    [seriesRows, selectedAssets],
  );
  const metrics = useMemo(() => calculateMetrics(selectedCurveRows), [selectedCurveRows]);

  const lineChartOption = useMemo<echarts.EChartsCoreOption>(
    () => ({
      animationDuration: 500,
      grid: isMobile
        ? { left: 4, right: 8, top: 18, bottom: 58, containLabel: true }
        : { left: 18, right: 22, top: 24, bottom: 68, containLabel: true },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(32, 33, 36, 0.94)",
        borderWidth: 0,
        padding: [11, 13],
        borderRadius: 14,
        confine: true,
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
          height: isMobile ? 16 : 20,
          bottom: isMobile ? 10 : 13,
          borderColor: "transparent",
          backgroundColor: "#eef2f0",
          fillerColor: "rgba(47, 98, 136, 0.16)",
          handleSize: isMobile ? "140%" : "115%",
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
          margin: isMobile ? 10 : 15,
          fontSize: isMobile ? 10 : 12,
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
        axisLabel: { color: "#85847e", margin: isMobile ? 7 : 12, fontSize: isMobile ? 10 : 12, formatter: (value: number) => value.toFixed(2) },
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
          lineStyle: { color: "#2f6288", width: isMobile ? 2.5 : 3, cap: "round", join: "round" },
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
    [isMobile, selectedCurveRows],
  );

  const barChartOption = useMemo<echarts.EChartsCoreOption>(
    () => ({
      animationDuration: 350,
      grid: isMobile
        ? { left: 4, right: 8, top: 14, bottom: 58, containLabel: true }
        : { left: 18, right: 22, top: 18, bottom: 68, containLabel: true },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(32, 33, 36, 0.94)",
        borderWidth: 0,
        padding: [11, 13],
        borderRadius: 14,
        confine: true,
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
          height: isMobile ? 16 : 20,
          bottom: isMobile ? 10 : 13,
          borderColor: "transparent",
          backgroundColor: "#eef2f0",
          fillerColor: "rgba(47, 98, 136, 0.16)",
          handleSize: isMobile ? "140%" : "115%",
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
          margin: isMobile ? 10 : 15,
          fontSize: isMobile ? 10 : 12,
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
        axisLabel: { color: "#85847e", margin: isMobile ? 7 : 12, fontSize: isMobile ? 10 : 12, formatter: (value: number) => formatPercent(value) },
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
    [isMobile, selectedCurveRows],
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
        <section className="net-value-side-card net-value-performance-card">
          <div className="net-value-side-card-body">
            <h2 className="net-value-side-card-title">绩效</h2>
            <div className="net-value-metrics">
              <Metric
                label="累计净值"
                value={formatNumber(metrics.cumulativeNav, 4)}
                tone={returnTone(metrics.cumulativeNav - 1)}
                status={metrics.cumulativeNav >= 1 ? "up" : "down"}
              />
              <Metric
                label="区间年化"
                value={formatPercent(metrics.annualizedReturn)}
                tone={returnTone(metrics.annualizedReturn)}
                status={metrics.annualizedReturn >= 0 ? "up" : "down"}
              />
              <Metric
                label="年化波动率"
                value={formatPercent(metrics.annualizedVolatility)}
              />
              <Metric
                label="夏普比率"
                value={formatNumber(metrics.sharpeRatio, 2)}
                tone={returnTone(metrics.sharpeRatio)}
                status={metrics.sharpeRatio >= 0 ? "up" : "down"}
              />
              <Metric
                label="卡玛比率"
                value={formatNumber(metrics.calmarRatio, 2)}
                tone={returnTone(metrics.calmarRatio)}
                status={metrics.calmarRatio >= 0 ? "up" : "down"}
              />
              <Metric
                label="区间最大回撤"
                value={formatPercent(metrics.maximumDrawdown)}
                tone="negative"
                status="down"
              />
              <Metric
                className="metric-card-wide"
                label="最大回撤天数"
                value={`${metrics.maximumDrawdownDurationDays} 天`}
                detail={`${formatDate(metrics.maximumDrawdownStartDate)} - ${formatDate(metrics.maximumDrawdownEndDate)}`}
              />
            </div>
          </div>
        </section>

        <section className="net-value-side-card net-value-assets-card">
          <div className="net-value-side-card-body">
            <div className="net-value-sidebar-controls">
              <div className="net-value-control">
                <h2 className="net-value-side-card-title">品种</h2>
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
                        <span className="asset-option-code">{asset.code}</span>
                        <span className="asset-option-label">{asset.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
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
  className = "",
  label,
  value,
  detail,
  tone = "neutral",
  status,
}: {
  className?: string;
  label: string;
  value: string;
  detail?: string;
  tone?: "positive" | "negative" | "neutral";
  status?: "up" | "down";
}) {
  return (
    <div className={`metric-card ${className}`}>
      <div className="metric-title-row">
        <span className="metric-label">{label}</span>
      </div>
      <div className={`metric-value-row font-mono font-semibold tabular-nums ${tone}`}>
        <span>{value}</span>
        {status && <TrendArrow direction={status} />}
      </div>
      {detail && <div className="metric-detail">{detail}</div>}
    </div>
  );
}

function TrendArrow({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      className={`metric-trend-arrow metric-trend-${direction}`}
      viewBox="0 0 1792 1792"
      aria-hidden="true"
    >
      <path d="M1408 1216q0 26-19 45t-45 19H448q-26 0-45-19t-19-45 19-45l448-448q19-19 45-19t45 19l448 448q19 19 19 45z" />
    </svg>
  );
}
