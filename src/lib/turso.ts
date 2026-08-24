import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

export type SqlValue = string | number | bigint | boolean | null;

type PipelineValue = {
  type: "null" | "integer" | "float" | "text" | "blob";
  value?: string | number;
};

type PipelineResult = {
  type?: string;
  response?: {
    error?: { message?: string };
    result?: {
      cols?: { name?: string }[];
      rows?: PipelineValue[][];
    };
  };
};

function binding(name: "TURSO_DATABASE_URL" | "TURSO_AUTH_TOKEN"): string {
  const localValue = process.env[name]?.trim();
  if (localValue) return localValue;

  try {
    const value = getCloudflareContext().env[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  } catch {
    // Next.js 构建阶段不存在请求级 Cloudflare 上下文。
  }
  throw new Error(`缺少服务端配置：${name}`);
}

function pipelineUrl(databaseUrl: string): string {
  const normalized = databaseUrl.trim().replace(/\/$/, "").replace(/^libsql:\/\//, "https://");
  const url = new URL(normalized);
  if (url.protocol !== "https:") throw new Error("Turso 地址必须使用 libsql:// 或 https://");
  return `${url.origin}${url.pathname.replace(/\/$/, "")}/v2/pipeline`;
}

function argument(value: SqlValue): PipelineValue {
  if (value === null) return { type: "null" };
  if (typeof value === "boolean") return { type: "integer", value: value ? "1" : "0" };
  if (typeof value === "bigint") return { type: "integer", value: value.toString() };
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Turso 查询参数必须是有限数值");
    return Number.isInteger(value)
      ? { type: "integer", value: value.toString() }
      : { type: "float", value };
  }
  return { type: "text", value };
}

function parseValue(value: PipelineValue | undefined): unknown {
  if (!value || value.type === "null") return null;
  if (value.type === "integer" || value.type === "float") {
    const parsed = Number(value.value);
    return Number.isFinite(parsed) ? parsed : value.value;
  }
  return value.value ?? null;
}

export async function queryRows(
  sql: string,
  args: SqlValue[] = [],
): Promise<Record<string, unknown>[]> {
  if (!sql.trim()) throw new Error("Turso SQL 不能为空");
  const response = await fetch(pipelineUrl(binding("TURSO_DATABASE_URL")), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${binding("TURSO_AUTH_TOKEN")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          type: "execute",
          stmt: {
            sql,
            args: args.map(argument),
          },
        },
        { type: "close" },
      ],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Turso 请求失败：HTTP ${response.status}`);

  const body = (await response.json()) as { results?: PipelineResult[] };
  const executeResult = body.results?.[0];
  if (executeResult?.type !== "ok") {
    throw new Error(executeResult?.response?.error?.message ?? "Turso SQL 执行失败");
  }
  const result = executeResult.response?.result;
  const columns = (result?.cols ?? []).map((column) => column.name ?? "");
  return (result?.rows ?? []).map((row) =>
    Object.fromEntries(columns.map((column, index) => [column, parseValue(row[index])])),
  );
}
