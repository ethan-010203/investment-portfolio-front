"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export type BrowserResourceConfig<T> = {
  key: string;
  url: string;
  validate: (value: unknown) => value is T;
};

type BrowserCacheSnapshot<T> = {
  schema: 1;
  revision: string;
  storedAt: number;
  data: T;
};

const CACHE_PREFIX = "investment-portfolio:data-cache:v1:";
const snapshots = new Map<string, BrowserCacheSnapshot<unknown>>();
const listeners = new Map<string, Set<() => void>>();
const requests = new Map<string, Promise<BrowserCacheSnapshot<unknown>>>();

function storageKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

function subscribe(key: string, listener: () => void): () => void {
  const resourceListeners = listeners.get(key) ?? new Set<() => void>();
  resourceListeners.add(listener);
  listeners.set(key, resourceListeners);

  return () => {
    resourceListeners.delete(listener);
    if (resourceListeners.size === 0) listeners.delete(key);
  };
}

function readStoredSnapshot<T>(config: BrowserResourceConfig<T>): BrowserCacheSnapshot<T> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey(config.key));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("缓存格式无效");

    const candidate = parsed as Record<string, unknown>;
    if (
      candidate.schema !== 1
      || typeof candidate.revision !== "string"
      || typeof candidate.storedAt !== "number"
      || !config.validate(candidate.data)
    ) {
      throw new Error("缓存内容无效");
    }

    const snapshot = candidate as BrowserCacheSnapshot<T>;
    snapshots.set(config.key, snapshot);
    return snapshot;
  } catch {
    try {
      window.localStorage.removeItem(storageKey(config.key));
    } catch {
      // 浏览器禁用本地存储时仍可使用当前会话的内存缓存。
    }
    return null;
  }
}

function getSnapshot<T>(config: BrowserResourceConfig<T>): BrowserCacheSnapshot<T> | null {
  const current = snapshots.get(config.key);
  if (current) return current as BrowserCacheSnapshot<T>;
  return readStoredSnapshot(config);
}

function publishSnapshot<T>(config: BrowserResourceConfig<T>, snapshot: BrowserCacheSnapshot<T>) {
  snapshots.set(config.key, snapshot);
  try {
    window.localStorage.setItem(storageKey(config.key), JSON.stringify(snapshot));
  } catch {
    // 写入失败不影响页面继续使用内存中的最新数据。
  }
  notify(config.key);
}

async function fetchFreshSnapshot<T>(config: BrowserResourceConfig<T>): Promise<BrowserCacheSnapshot<T>> {
  const pending = requests.get(config.key);
  if (pending) return pending as Promise<BrowserCacheSnapshot<T>>;

  const request = (async () => {
    const response = await fetch(config.url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`数据请求失败：${response.status}`);

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("数据响应格式无效");
    const candidate = payload as Record<string, unknown>;
    if (typeof candidate.revision !== "string" || !config.validate(candidate.data)) {
      throw new Error("数据响应内容无效");
    }

    const current = getSnapshot(config);
    if (current?.revision === candidate.revision) return current;

    const snapshot: BrowserCacheSnapshot<T> = {
      schema: 1,
      revision: candidate.revision,
      storedAt: Date.now(),
      data: candidate.data,
    };
    publishSnapshot(config, snapshot);
    return snapshot;
  })().finally(() => {
    requests.delete(config.key);
  });

  requests.set(config.key, request);
  return request;
}

export function warmBrowserResource<T>(config: BrowserResourceConfig<T>): Promise<void> {
  return fetchFreshSnapshot(config).then(() => undefined);
}

export function useBrowserResource<T>(config: BrowserResourceConfig<T>) {
  const subscribeToResource = useCallback(
    (listener: () => void) => subscribe(config.key, listener),
    [config.key],
  );
  const getClientSnapshot = useCallback(() => getSnapshot(config), [config]);
  const getServerSnapshot = useCallback(() => null, []);
  const snapshot = useSyncExternalStore(subscribeToResource, getClientSnapshot, getServerSnapshot);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      await fetchFreshSnapshot(config);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error("数据请求失败"));
    }
  }, [config]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearTimeout(initialRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  return {
    data: snapshot?.data,
    error,
    loading: !snapshot && !error,
    refresh,
  };
}
