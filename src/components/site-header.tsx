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
    <header className="sticky top-0 z-50 bg-[rgb(247_245_239_/_82%)] px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-[min(1240px,100%)] items-center justify-between gap-5 rounded-full bg-[rgb(255_253_248_/_74%)] px-4 shadow-[0_10px_30px_rgb(61_65_61_/_5%)] max-[680px]:h-auto max-[680px]:w-full max-[680px]:flex-col max-[680px]:items-stretch max-[680px]:gap-3 max-[680px]:rounded-[24px] max-[680px]:py-3">
        <Link href="/" className="flex items-center gap-2.5 px-2 font-semibold" aria-label="投资组合首页">
          <span className="grid size-9 place-items-center rounded-full bg-[#1d516f] text-[#f9fcfb] shadow-[0_5px_12px_rgb(29_81_111_/_20%)]">
            <ChartNoAxesCombined size={17} strokeWidth={2} />
          </span>
          <span>投资组合</span>
        </Link>

        <nav className="flex items-center gap-1 rounded-full bg-[#eef0ed] p-1 max-[680px]:w-full" aria-label="主导航">
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
