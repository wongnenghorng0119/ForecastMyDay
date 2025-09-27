// 小工具：格式化 YYYYMMDD
export const yyyymmdd = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;

// 小工具
export function clampInt(v, min, max) {
  let n = parseInt(v, 10);
  if (Number.isNaN(n)) n = min;
  return Math.max(min, Math.min(max, n));
}

export const csvSafe = (s) => `"${String(s).replace(/"/g, '""')}"`;
export const val = (x) => (x == null ? "" : x);