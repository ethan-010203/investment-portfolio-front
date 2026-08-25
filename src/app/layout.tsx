import type { Metadata } from "next";

import { PortfolioDataCacheWarmer } from "@/components/portfolio-data-warmer";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "投资组合",
    template: "%s · 投资组合",
  },
  description: "策略净值与资产配置工具",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">
        <PortfolioDataCacheWarmer />
        <SiteHeader />
        <main className="page-shell">{children}</main>
      </body>
    </html>
  );
}
