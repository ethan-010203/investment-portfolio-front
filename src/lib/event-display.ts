import type { RebalanceEventSummary } from "@/lib/types";

const EVENT_TYPE_ORDER: Record<RebalanceEventSummary["type"], number> = {
  正式调仓: 0,
  组合止损: 1,
  单品种止盈: 2,
};

/**
 * 事件在信号日收盘确认后即可展示，不能等到下一交易日实际执行时才出现。
 */
export function triggeredEventsThrough(
  events: readonly RebalanceEventSummary[],
  date: string,
): RebalanceEventSummary[] {
  return events.filter((event) => event.signalDate <= date);
}

export function compareEventTriggersDescending(
  left: RebalanceEventSummary,
  right: RebalanceEventSummary,
): number {
  const dateOrder = right.signalDate.localeCompare(left.signalDate);
  if (dateOrder !== 0) return dateOrder;
  return right.sequence - left.sequence
    || EVENT_TYPE_ORDER[right.type] - EVENT_TYPE_ORDER[left.type];
}
