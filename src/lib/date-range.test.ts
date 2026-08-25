import { describe, expect, it } from "vitest";

import {
  filterRowsByDateRange,
  normalizeAvailableDates,
  resolveDateRange,
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
});
