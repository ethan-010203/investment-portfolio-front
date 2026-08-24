import { ArrowUpRight, CalendarDays, CircleCheck, Clock3 } from "lucide-react";
import Link from "next/link";

import { formatDate, formatNumber, formatPercent, returnTone } from "@/lib/format";
import { loadLatestSnapshot } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const dataset = await loadLatestSnapshot();
  const latest = dataset.nav.at(-1)!;

  return (
    <div>
      <div className="page-title-row">
        <h1 className="page-title">策略公告</h1>
        <span className="eyebrow">{formatDate(latest.date)} 更新</span>
      </div>

      <section className="panel overflow-hidden">
        <div className="grid min-h-[310px] grid-cols-[1fr_310px] max-[820px]:grid-cols-1">
          <article className="flex flex-col justify-between p-9 max-[680px]:p-6">
            <div>
              <div className="mb-8 flex items-center gap-2 text-xs font-semibold text-[var(--negative)]">
                <CircleCheck size={15} />
                <span>策略正常运行</span>
              </div>
              <h2 className="max-w-[640px] text-[32px] leading-[1.35] font-semibold max-[680px]:text-2xl">
                第一版组合看板进入试运行
              </h2>
              <p className="mt-5 max-w-[650px] text-[15px] leading-7 text-[var(--muted)]">
                每日净值、漂移仓位与历史风控事件已接入正式策略数据。盘中以最新计算结果为参考，收盘数据完整后自动更新。
              </p>
            </div>
            <div className="mt-10 flex items-center gap-3 text-sm text-[var(--muted)]">
              <CalendarDays size={16} />
              <span>发布于 2026.08.25</span>
            </div>
          </article>

          <aside className="border-l border-[var(--line)] bg-[rgb(231_238_244_/_42%)] p-8 max-[820px]:border-t max-[820px]:border-l-0 max-[680px]:p-6">
            <div className="eyebrow">最新结算</div>
            <div className="mt-7 border-b border-[var(--line)] pb-6">
              <div className="text-sm text-[var(--muted)]">累计净值</div>
              <div className="mt-2 font-mono text-4xl font-semibold tabular-nums">
                {formatNumber(latest.cumulativeNav, 4)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-6">
              <div>
                <div className="text-xs text-[var(--muted)]">当日收益</div>
                <div className={`mt-2 font-mono text-lg font-semibold ${returnTone(latest.netReturn)}`}>
                  {formatPercent(latest.netReturn)}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">数据截至</div>
                <div className="mt-2 text-sm font-semibold">{formatDate(latest.dataThrough)}</div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-5 max-[680px]:grid-cols-1">
        <Link href="/net-value" className="group panel flex min-h-28 items-center justify-between p-6 transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--surface-strong)]">
          <div>
            <div className="text-sm text-[var(--muted)]">组合表现</div>
            <div className="mt-2 text-lg font-semibold">每日净值</div>
          </div>
          <ArrowUpRight className="text-[var(--muted)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" size={20} />
        </Link>
        <Link href="/rebalance" className="group panel flex min-h-28 items-center justify-between p-6 transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--surface-strong)]">
          <div>
            <div className="text-sm text-[var(--muted)]">资产配置</div>
            <div className="mt-2 text-lg font-semibold">调仓计算</div>
          </div>
          <ArrowUpRight className="text-[var(--muted)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" size={20} />
        </Link>
      </div>

      <div className="mt-8 flex items-center gap-2 text-xs text-[var(--muted)]">
        <Clock3 size={14} />
        <span>策略版本 {dataset.strategyVersion}</span>
      </div>
    </div>
  );
}
