export const ASSETS = [
  { key: "dividend", label: "红利", code: "512890", name: "红利低波ETF", color: "#D66B62" },
  { key: "sp500", label: "标普", code: "513500", name: "标普500ETF", color: "#4E84A7" },
  { key: "nasdaq", label: "纳指", code: "513100", name: "纳指ETF", color: "#7CA7C7" },
  { key: "policyBankBond", label: "政金债", code: "003376", name: "广发7-10年国开债A", color: "#5E9276" },
  { key: "gold", label: "黄金", code: "518880", name: "黄金ETF", color: "#D3A644" },
  { key: "soymeal", label: "豆粕", code: "159985", name: "豆粕ETF", color: "#BD815F" },
  { key: "cash", label: "现金", code: "CASH", name: "未投资现金", color: "#9B9D97" },
] as const;

export type AssetKey = (typeof ASSETS)[number]["key"];

export const ASSET_BY_KEY = Object.fromEntries(
  ASSETS.map((asset) => [asset.key, asset]),
) as Record<AssetKey, (typeof ASSETS)[number]>;

export const RISK_ASSET_KEYS: AssetKey[] = [
  "dividend",
  "sp500",
  "nasdaq",
  "gold",
  "soymeal",
];
