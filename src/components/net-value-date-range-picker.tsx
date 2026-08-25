"use client";

import { zhCN } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";

import { useNetValueDateRange } from "@/components/net-value-date-range-context";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatIsoDate, parseIsoDate } from "@/lib/date-range";

export function NetValueDateRangePicker() {
  const { availableDates, effectiveRange, setFrom, setTo } = useNetValueDateRange();
  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates]);
  const firstDate = availableDates[0];
  const lastDate = availableDates.at(-1);

  return (
    <div className="net-value-date-range" aria-label="净值日期范围">
      <DateField
        label="起"
        value={effectiveRange?.from}
        firstDate={firstDate}
        lastDate={lastDate}
        isDateDisabled={(date) => !availableDateSet.has(date) || Boolean(effectiveRange && date > effectiveRange.to)}
        onChange={setFrom}
      />
      <DateField
        label="止"
        value={effectiveRange?.to}
        firstDate={firstDate}
        lastDate={lastDate}
        isDateDisabled={(date) => !availableDateSet.has(date) || Boolean(effectiveRange && date < effectiveRange.from)}
        onChange={setTo}
      />
    </div>
  );
}

function DateField({
  label,
  value,
  firstDate,
  lastDate,
  isDateDisabled,
  onChange,
}: {
  label: "起" | "止";
  value?: string;
  firstDate?: string;
  lastDate?: string;
  isDateDisabled: (date: string) => boolean;
  onChange: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ready = Boolean(value && firstDate && lastDate);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={!ready}
          className="net-value-date-trigger h-10 justify-start gap-2 rounded-xl bg-[#fffdf8] px-3 text-[13px] font-semibold text-[#24343d] shadow-[inset_0_0_0_1px_rgb(82_101_108_/_18%)] hover:bg-[#f4f5ef] aria-expanded:bg-[#edf2f1]"
          aria-label={`选择${label === "起" ? "开始" : "结束"}日期`}
        >
          <CalendarDays className="size-4 text-[#55717e]" />
          <span className="text-[#6d7778]">{label}</span>
          <span className="font-mono tabular-nums">{value?.replaceAll("-", "/") ?? "----/--/--"}</span>
        </Button>
      </PopoverTrigger>
      {ready && (
        <PopoverContent
          align={label === "起" ? "start" : "end"}
          sideOffset={8}
          className="w-auto overflow-hidden rounded-2xl bg-[#fffdf8] p-0 shadow-[0_20px_50px_rgb(49_58_53_/_16%)] ring-1 ring-[#d8ddd8]"
        >
          <Calendar
            mode="single"
            selected={parseIsoDate(value!)}
            defaultMonth={parseIsoDate(value!)}
            startMonth={parseIsoDate(firstDate!)}
            endMonth={parseIsoDate(lastDate!)}
            captionLayout="dropdown"
            locale={zhCN}
            disabled={(date) => isDateDisabled(formatIsoDate(date))}
            onSelect={(date) => {
              if (!date) return;
              onChange(formatIsoDate(date));
              setOpen(false);
            }}
            className="bg-transparent p-3 [--cell-size:--spacing(9)]"
          />
        </PopoverContent>
      )}
    </Popover>
  );
}
