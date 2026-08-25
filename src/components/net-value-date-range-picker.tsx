"use client";

import { addMonths, addYears } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import { useNetValueDateRange } from "@/components/net-value-date-range-context";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  advanceDateRangeSelection,
  formatIsoDate,
  parseIsoDate,
  resolvePresetDateRange,
  type DateRangePreset,
} from "@/lib/date-range";

type CalendarView = "day" | "month" | "year";

const PRESET_OPTIONS: ReadonlyArray<{ label: string; value: DateRangePreset }> = [
  { label: "最近一年", value: "year" },
  { label: "最近一个月", value: "month" },
  { label: "最近 7 天", value: "week" },
];

const MONTHS = Array.from({ length: 12 }, (_, index) => index);
const EMPTY_DATE_RANGE: DateRange = { from: undefined, to: undefined };

export function NetValueDateRangePicker() {
  const { availableDates, effectiveRange, setRange } = useNetValueDateRange();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<CalendarView>("day");
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());

  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates]);
  const availableMonthSet = useMemo(
    () => new Set(availableDates.map((date) => date.slice(0, 7))),
    [availableDates],
  );
  const availableYears = useMemo(
    () => [...new Set(availableDates.map((date) => Number(date.slice(0, 4))))],
    [availableDates],
  );
  const firstDate = availableDates[0];
  const lastDate = availableDates.at(-1);
  const ready = Boolean(effectiveRange && firstDate && lastDate);

  const selectedRange = useMemo<DateRange | undefined>(() => {
    if (!effectiveRange) return undefined;
    return {
      from: parseIsoDate(effectiveRange.from),
      to: parseIsoDate(effectiveRange.to),
    };
  }, [effectiveRange]);
  const pendingDate = pendingFrom ? parseIsoDate(pendingFrom) : undefined;

  const visibleYear = visibleMonth.getFullYear();
  const visibleMonthIndex = visibleMonth.getMonth();
  const firstMonthKey = firstDate?.slice(0, 7);
  const lastMonthKey = lastDate?.slice(0, 7);

  function closePicker() {
    setOpen(false);
    setPendingFrom(null);
    setView("day");
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    setPendingFrom(null);
    setView("day");
    if (nextOpen && effectiveRange) {
      setVisibleMonth(parseIsoDate(effectiveRange.to));
    }
  }

  function applyPreset(preset: DateRangePreset) {
    const range = resolvePresetDateRange(availableDates, preset);
    if (!range) return;
    setRange(range);
    setVisibleMonth(parseIsoDate(range.to));
    closePicker();
  }

  function restoreDefault() {
    setRange(null);
    if (lastDate) setVisibleMonth(parseIsoDate(lastDate));
    closePicker();
  }

  function selectDay(date: Date) {
    const selectedDate = formatIsoDate(date);
    if (!availableDateSet.has(selectedDate)) return;

    const nextStep = advanceDateRangeSelection(pendingFrom, selectedDate);
    setPendingFrom(nextStep.pendingFrom);
    if (nextStep.completedRange) {
      setRange(nextStep.completedRange);
      closePicker();
    }
  }

  function selectYear(year: number) {
    const currentMonthKey = `${year}-${String(visibleMonthIndex + 1).padStart(2, "0")}`;
    const firstAvailableMonth = MONTHS.find((month) => (
      availableMonthSet.has(`${year}-${String(month + 1).padStart(2, "0")}`)
    ));
    const month = availableMonthSet.has(currentMonthKey)
      ? visibleMonthIndex
      : (firstAvailableMonth ?? 0);

    setVisibleMonth(new Date(year, month, 1));
    setView("month");
  }

  function selectMonth(month: number) {
    const monthKey = `${visibleYear}-${String(month + 1).padStart(2, "0")}`;
    if (!availableMonthSet.has(monthKey)) return;
    setVisibleMonth(new Date(visibleYear, month, 1));
    setView("day");
  }

  function moveCalendar(direction: -1 | 1) {
    setVisibleMonth((current) => (
      view === "month" ? addYears(current, direction) : addMonths(current, direction)
    ));
  }

  function canMoveCalendar(direction: -1 | 1): boolean {
    if (!firstMonthKey || !lastMonthKey || view === "year") return false;
    const target = view === "month"
      ? addYears(visibleMonth, direction)
      : addMonths(visibleMonth, direction);
    const targetKey = formatIsoDate(target).slice(0, 7);
    return targetKey >= firstMonthKey && targetKey <= lastMonthKey;
  }

  return (
    <div className="net-value-date-range" aria-label="净值日期范围">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={!ready}
            className="net-value-date-trigger h-10 justify-start gap-2 rounded-xl bg-[#fffdf8] px-3 text-[13px] font-semibold text-[#24343d] shadow-[inset_0_0_0_1px_rgb(82_101_108_/_18%)] hover:bg-[#f4f5ef] aria-expanded:bg-[#edf2f1]"
            aria-label="选择净值日期范围"
          >
            <CalendarDays className="size-4 text-[#55717e]" />
            <span className="font-mono tabular-nums">
              {effectiveRange
                ? `${effectiveRange.from.replaceAll("-", "/")} - ${effectiveRange.to.replaceAll("-", "/")}`
                : "----/--/-- - ----/--/--"}
            </span>
          </Button>
        </PopoverTrigger>

        {ready && (
          <PopoverContent
            align="center"
            sideOffset={8}
            collisionPadding={10}
            className="w-[350px] max-w-[calc(100vw-20px)] gap-0 overflow-hidden rounded-2xl bg-[#fffdf8] p-0 shadow-[0_20px_50px_rgb(49_58_53_/_16%)] ring-1 ring-[#d8ddd8]"
          >
            <div className="flex flex-wrap items-center gap-1.5 border-b border-[#e5e7e2] px-3 py-2.5">
              {PRESET_OPTIONS.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg px-2.5 text-xs font-semibold text-[#55717e] hover:bg-[#edf2f1]"
                  onClick={() => applyPreset(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <div className="flex h-12 items-center justify-between px-3 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg text-[#55717e] hover:bg-[#edf2f1]"
                disabled={!canMoveCalendar(-1)}
                aria-label={view === "month" ? "上一年" : "上个月"}
                onClick={() => moveCalendar(-1)}
              >
                <ChevronLeft />
              </Button>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg px-2 text-sm font-bold text-[#24343d] hover:bg-[#edf2f1]"
                  aria-pressed={view === "year"}
                  onClick={() => setView("year")}
                >
                  {visibleYear}年
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg px-2 text-sm font-bold text-[#24343d] hover:bg-[#edf2f1]"
                  aria-pressed={view === "month"}
                  onClick={() => setView("month")}
                >
                  {visibleMonthIndex + 1}月
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg text-[#55717e] hover:bg-[#edf2f1]"
                disabled={!canMoveCalendar(1)}
                aria-label={view === "month" ? "下一年" : "下个月"}
                onClick={() => moveCalendar(1)}
              >
                <ChevronRight />
              </Button>
            </div>

            <div className="min-h-[292px] px-3 pb-2">
              {view === "day" && (
                <Calendar
                  mode="range"
                  selected={pendingDate ? EMPTY_DATE_RANGE : selectedRange}
                  onSelect={() => undefined}
                  modifiers={pendingDate ? { pendingStart: pendingDate } : undefined}
                  modifiersClassNames={{
                    pendingStart: "[&_button]:bg-[#1d516f] [&_button]:text-white [&_button]:hover:bg-[#1d516f]",
                  }}
                  month={visibleMonth}
                  onMonthChange={setVisibleMonth}
                  startMonth={parseIsoDate(firstDate!)}
                  endMonth={parseIsoDate(lastDate!)}
                  locale={zhCN}
                  showOutsideDays={false}
                  disabled={(date) => !availableDateSet.has(formatIsoDate(date))}
                  onDayClick={selectDay}
                  className="w-full bg-transparent p-0 [--cell-size:2.45rem]"
                  classNames={{
                    root: "w-full",
                    month: "flex w-full flex-col gap-3",
                    month_caption: "hidden",
                    nav: "hidden",
                    month_grid: "w-full border-collapse",
                  }}
                />
              )}

              {view === "month" && (
                <div className="grid min-h-[280px] grid-cols-3 content-center gap-2" aria-label="选择月份">
                  {MONTHS.map((month) => {
                    const monthKey = `${visibleYear}-${String(month + 1).padStart(2, "0")}`;
                    const available = availableMonthSet.has(monthKey);
                    return (
                      <Button
                        key={month}
                        type="button"
                        variant="ghost"
                        disabled={!available}
                        aria-pressed={month === visibleMonthIndex}
                        className="h-12 rounded-xl text-sm font-semibold text-[#45565d] hover:bg-[#edf2f1] aria-pressed:bg-[#1d516f] aria-pressed:text-white"
                        onClick={() => selectMonth(month)}
                      >
                        {month + 1}月
                      </Button>
                    );
                  })}
                </div>
              )}

              {view === "year" && (
                <div className="grid min-h-[280px] grid-cols-3 content-center gap-2" aria-label="选择年份">
                  {availableYears.map((year) => (
                    <Button
                      key={year}
                      type="button"
                      variant="ghost"
                      aria-pressed={year === visibleYear}
                      className="h-12 rounded-xl text-sm font-semibold text-[#45565d] hover:bg-[#edf2f1] aria-pressed:bg-[#1d516f] aria-pressed:text-white"
                      onClick={() => selectYear(year)}
                    >
                      {year}年
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex min-h-12 items-center justify-between gap-3 border-t border-[#e5e7e2] px-3 py-2">
              <span className="text-xs font-medium text-[#7c8583]" aria-live="polite">
                {pendingFrom ? "请选择结束日期" : "请选择开始日期"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg px-2.5 text-xs font-semibold text-[#55717e] hover:bg-[#edf2f1]"
                onClick={restoreDefault}
              >
                恢复默认
              </Button>
            </div>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}
