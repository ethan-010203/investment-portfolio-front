import { describe, expect, it } from "vitest";

import { createDataRevision } from "@/lib/data-revision";

describe("数据修订指纹", () => {
  it("相同数据生成相同指纹", () => {
    const value = { date: "2026-08-25", weights: [0.2, 0.8] };

    expect(createDataRevision(value)).toBe(createDataRevision(value));
  });

  it("任意数据变化都会改变指纹", () => {
    expect(createDataRevision({ value: 1 })).not.toBe(createDataRevision({ value: 2 }));
  });
});
