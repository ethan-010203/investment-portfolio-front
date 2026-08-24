"use client";

import * as echarts from "echarts";
import { useEffect, useRef } from "react";

type EChartProps = {
  option: echarts.EChartsCoreOption;
  className?: string;
  label: string;
};

export function EChart({ option, className, label }: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current, undefined, { renderer: "canvas" });
    chart.setOption(option);
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [option]);

  return <div ref={containerRef} className={className} role="img" aria-label={label} />;
}
