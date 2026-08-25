import { describe, expect, it } from "vitest";

import {
  advanceDateRangeSelection,
  filterRowsByDateRange,
  normalizeAvailableDates,
  resolveDateRange,
  resolvePresetDateRange,
} from "@/lib/date-range";

const dates = ["2025-01-02", "2025-01-03", "2025-01-06", "2025-01-07"];

describe("净值日期范围", () => {
  it("默认使用全部可用日期，并在新增数据后自动跟随最新日期", () => {
    expect(resolveDateRange(dates, null)).toEqual({
      from: "2025-01-02",
      to: "2025-01-07",
    });
    expect(resolveDateRange([...dates, "2025-01-08"], null)?.to).toBe("2025-01-08");
  });

  it("日期过滤包含起止两端", () => {
    const rows = dates.map((date) => ({ date }));
    expect(filterRowsByDateRange(rows, { from: "2025-01-03", to: "2025-01-06" }))
      .toEqual([{ date: "2025-01-03" }, { date: "2025-01-06" }]);
  });

  it("保存的非交易日端点会吸附到区间内最近的净值日期", () => {
    expect(resolveDateRange(dates, { from: "2025-01-04", to: "2025-01-08" }))
      .toEqual({ from: "2025-01-06", to: "2025-01-07" });
  });

  it("无效或反向区间回退为全部日期", () => {
    expect(resolveDateRange(dates, { from: "2025-01-08", to: "2025-01-01" }))
      .toEqual({ from: "2025-01-02", to: "2025-01-07" });
  });

  it("可用日期会去重、排序并剔除非法格式", () => {
    expect(normalizeAvailableDates(["2025-01-03", "bad", "2025-01-02", "2025-01-03"]))
      .toEqual(["2025-01-02", "2025-01-03"]);
  });

  it("快捷范围以最新净值日期为终点并吸附到实际日期", () => {
    const availableDates = ["2024-08-26", "2025-07-25", "2025-08-18", "2025-08-25"];

    expect(resolvePresetDateRange(availableDates, "year")).toEqual({
      from: "2024-08-26",
      to: "2025-08-25",
    });
    expect(resolvePresetDateRange(availableDates, "month")).toEqual({
      from: "2025-07-25",
      to: "2025-08-25",
    });
    expect(resolvePresetDateRange(availableDates, "week")).toEqual({
      from: "2025-08-25",
      to: "2025-08-25",
    });
  });

  it("日期范围第二次选择更早日期时会重置起点", () => {
    expect(advanceDateRangeSelection(null, "2025-08-20")).toEqual({
      pendingFrom: "2025-08-20",
      completedRange: null,
    });
    expect(advanceDateRangeSelection("2025-08-20", "2025-08-18")).toEqual({
      pendingFrom: "2025-08-18",
      completedRange: null,
    });
    expect(advanceDateRangeSelection("2025-08-18", "2025-08-25")).toEqual({
      pendingFrom: null,
      completedRange: { from: "2025-08-18", to: "2025-08-25" },
    });
  });
});
