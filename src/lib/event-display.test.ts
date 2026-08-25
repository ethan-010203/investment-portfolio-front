import { describe, expect, it } from "vitest";

import {
  compareEventTriggersDescending,
  triggeredEventsThrough,
} from "@/lib/event-display";
import type { RebalanceEventSummary } from "@/lib/types";

function event(
  id: string,
  signalDate: string,
  executionDate: string,
  sequence: number,
  type: RebalanceEventSummary["type"] = "组合止损",
): RebalanceEventSummary {
  return {
    id,
    strategyVersion: "test",
    type,
    cycleDate: "2026-08-01",
    signalDate,
    executionDate,
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

  it("本期事件和往期事件都按触发日期倒序排列", () => {
    expect([...events].sort(compareEventTriggersDescending).map((item) => item.id))
      .toEqual(["stop", "formal"]);
  });
});
