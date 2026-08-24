"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="panel mx-auto grid min-h-[360px] max-w-2xl place-items-center p-8 text-center">
      <div>
        <TriangleAlert className="mx-auto text-[var(--muted)]" size={26} />
        <h1 className="mt-5 text-2xl font-semibold">数据暂时无法读取</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">请稍后重新加载。</p>
        <button type="button" onClick={reset} className="mx-auto mt-6 flex h-10 items-center gap-2 rounded-[7px] bg-[#1c1d1b] px-4 text-sm font-medium text-white">
          <RefreshCw size={15} />
          重新加载
        </button>
      </div>
    </section>
  );
}
