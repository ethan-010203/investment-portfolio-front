"use client";

import { ChartNoAxesCombined, Home, LineChart, RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "首页", icon: Home },
  { href: "/net-value", label: "每日净值", icon: LineChart },
  { href: "/rebalance", label: "调仓计算", icon: RefreshCw },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[rgb(244_241_233_/_90%)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-[min(1180px,calc(100%-40px))] items-center justify-between gap-5 max-[680px]:h-auto max-[680px]:w-[calc(100%-24px)] max-[680px]:flex-col max-[680px]:items-stretch max-[680px]:py-3">
        <Link href="/" className="flex items-center gap-2.5 font-semibold" aria-label="投资组合首页">
          <span className="grid size-8 place-items-center rounded-[7px] bg-[#1c1d1b] text-[#faf8f2]">
            <ChartNoAxesCombined size={17} strokeWidth={2} />
          </span>
          <span>投资组合</span>
        </Link>

        <nav className="flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[rgb(255_253_248_/_64%)] p-1 max-[680px]:w-full" aria-label="主导航">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-9 items-center justify-center gap-2 rounded-[6px] px-3 text-sm transition-colors max-[680px]:flex-1 ${active ? "bg-[#1c1d1b] text-[#faf8f2] shadow-sm" : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"}`}
              >
                <Icon size={15} strokeWidth={2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
