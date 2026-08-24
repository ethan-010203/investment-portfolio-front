# investment-portfolio-front

正式投资组合前端，读取 Turso 中的策略净值与调仓事件，并部署到 Cloudflare Workers。

## 页面

- /：策略公告和最新结算概览。
- /net-value：净值指标、区间走势图和每日记录。
- /rebalance：按最新或历史漂移权重计算本金配置，并展示对应风控事件。

调仓计算只要求输入本金。资产金额按“本金 × 最终权重”计算到分，舍入尾差归入现金，因此配置合计始终等于本金。

## 本地开发

复制 .dev.vars.example 为 .dev.vars，配置只读 Turso 凭据：

~~~dotenv
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-read-only-token
~~~

安装并启动：

~~~bash
npm install
npm run dev
~~~

Windows 本地构建使用 Node.js 22 LTS 或 24.19 以上版本。

## 检查与部署

~~~bash
npm run typecheck
npm run lint
npm test
npm run cf:build
npm run deploy
~~~

Cloudflare Worker 名称固定为 investment-portfolio-front。生产环境中的两项 Turso 配置通过 Wrangler Secret 注入，不写入仓库。
