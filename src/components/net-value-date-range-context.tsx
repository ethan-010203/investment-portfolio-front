"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  normalizeAvailableDates,
  resolveDateRange,
  type DateRangeValue,
} from "@/lib/date-range";

const STORAGE_KEY = "investment-portfolio:net-value-date-range:v1";

type NetValueDateRangeContextValue = {
  availableDates: readonly string[];
  effectiveRange: DateRangeValue | null;
  hasCustomRange: boolean;
  registerAvailableDates: (dates: readonly string[]) => void;
  setFrom: (date: string) => void;
  setTo: (date: string) => void;
};

const NetValueDateRangeContext = createContext<NetValueDateRangeContextValue | null>(null);

function readStoredRange(): DateRangeValue | null {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const candidate = parsed as Record<string, unknown>;
    if (typeof candidate.from !== "string" || typeof candidate.to !== "string") return null;
    return { from: candidate.from, to: candidate.to };
  } catch {
    return null;
  }
}

export function NetValueDateRangeProvider({ children }: { children: ReactNode }) {
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [requestedRange, setRequestedRange] = useState<DateRangeValue | null>(null);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRequestedRange(readStoredRange());
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      if (requestedRange) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requestedRange));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // 浏览器禁用本地存储时，日期筛选仍在当前页面会话内有效。
    }
  }, [requestedRange, storageReady]);

  const registerAvailableDates = useCallback((dates: readonly string[]) => {
    const normalized = normalizeAvailableDates(dates);
    setAvailableDates((current) => (
      current.length === normalized.length && current.every((date, index) => date === normalized[index])
        ? current
        : normalized
    ));
  }, []);

  const effectiveRange = useMemo(
    () => resolveDateRange(availableDates, requestedRange),
    [availableDates, requestedRange],
  );

  const setFrom = useCallback((date: string) => {
    setRequestedRange((current) => {
      const resolved = resolveDateRange(availableDates, current);
      const to = resolved?.to ?? date;
      return date > to ? { from: date, to: date } : { from: date, to };
    });
  }, [availableDates]);

  const setTo = useCallback((date: string) => {
    setRequestedRange((current) => {
      const resolved = resolveDateRange(availableDates, current);
      const from = resolved?.from ?? date;
      return date < from ? { from: date, to: date } : { from, to: date };
    });
  }, [availableDates]);

  const value = useMemo<NetValueDateRangeContextValue>(() => ({
    availableDates,
    effectiveRange,
    hasCustomRange: requestedRange !== null,
    registerAvailableDates,
    setFrom,
    setTo,
  }), [availableDates, effectiveRange, registerAvailableDates, requestedRange, setFrom, setTo]);

  return (
    <NetValueDateRangeContext.Provider value={value}>
      {children}
    </NetValueDateRangeContext.Provider>
  );
}

export function useNetValueDateRange(): NetValueDateRangeContextValue {
  const context = useContext(NetValueDateRangeContext);
  if (!context) throw new Error("日期范围组件必须在净值日期范围提供器中使用");
  return context;
}
