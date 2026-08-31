import { describe, expect, it } from "vitest";

import {
  compareEventTriggersDescending,
  eventReasonForDisplay,
  triggeredEventsThrough,
} from "@/lib/event-display";
import type { RebalanceEventSummary } from "@/lib/types";

function event(
  id: string,
  signalDate: string,
  executionDate: string | null,
  sequence: number,
  type: RebalanceEventSummary["type"] = "组合止损",
  status: RebalanceEventSummary["status"] = "已执行",
): RebalanceEventSummary {
  return {
    id,
    strategyVersion: "test",
    type,
    cycleDate: "2026-08-01",
    signalDate,
    executionDate,
    status,
    sequence,
    asset: "组合",
    reason: "测试事件",
    adjustments: [],
  };
}

describe("调仓事件展示日期", () => {
  const events = [
    event("formal", "2026-08-24", "2026-08-25", 1, "正式调仓"),
    event("stop", "2026-08-25", "2026-08-26", 2),
  ];

  it("信号日收盘后立即展示，不等待执行日期", () => {
    expect(triggeredEventsThrough(events, "2026-08-24").map((item) => item.id))
      .toEqual(["formal"]);
  });

  it("待执行事件也必须按信号日期展示", () => {
    const pending = event("pending", "2026-08-31", null, 1, "单品种止盈", "待执行");

    expect(triggeredEventsThrough([...events, pending], "2026-08-31").map((item) => item.id))
      .toContain("pending");
  });

  it("本期事件和往期事件都按触发日期倒序排列", () => {
    expect([...events].sort(compareEventTriggersDescending).map((item) => item.id))
      .toEqual(["stop", "formal"]);
  });
});

describe("调仓事件展示说明", () => {
  it("隐藏单品种止盈的内部判断细节", () => {
    const takeProfitEvent = event("take-profit", "2026-08-25", "2026-08-26", 2, "单品种止盈");
    takeProfitEvent.reason = "累计盈利达到启动阈值；峰值回撤达到止盈阈值；收盘价跌破十日均线";

    expect(eventReasonForDisplay(takeProfitEvent)).toBe("已触发策略止盈信号");
  });

  it("保留其他事件原有说明", () => {
    const stopEvent = event("stop", "2026-08-25", "2026-08-26", 2, "组合止损");

    expect(eventReasonForDisplay(stopEvent)).toBe("测试事件");
  });
});
