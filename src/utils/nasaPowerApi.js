// src/utils/nasaPowerApi.js
// 快速 & 准确版：一次长区间请求（近 N 年）+ 本地过滤
// - 保留你原来的导出函数和参数签名：fetchPowerDaily / fetchPowerDailyRange / computeProbabilities / buildCSV
// - 优化点：内存 TTL 缓存、UTC 对齐、缺测清洗、DOY 环形日窗（跨年不漏）

import { yyyymmdd, csvSafe, val } from "./helpers";

// ===== 常量 / 工具 =====
const POWER_BASE = "https://power.larc.nasa.gov/api/temporal/daily/point";
const DEFAULT_PARAMETERS = ["T2M", "RH2M", "WS2M", "PRECTOTCORR"];
const CACHE_TTL_MS = 6 * 3600 * 1000; // 6 小时缓存

// 轻量内存缓存
const _cache = new Map(); // key:url -> { ts, data }

// 缺测清洗（POWER 常见填充值）
const clean = (v) => {
  const n = Number(v);
  return n === -999 || n === -99 || n === -9999 || !Number.isFinite(n) ? null : n;
};

// 构造 URL（统一 UTC、带 header 元数据）
function buildPowerURL({ lat, lon, start, end, parameters = DEFAULT_PARAMETERS, community = "RE" }) {
  const params = new URLSearchParams({
    parameters: Array.isArray(parameters) ? parameters.join(",") : String(parameters),
    community,
    latitude: String(lat),
    longitude: String(lon),
    start,
    end,
    format: "JSON",
    "time-standard": "UTC",
    header: "true",
  });
  return `${POWER_BASE}?${params.toString()}`;
}

// 单次请求 + TTL 缓存 + 30s 超时
async function fetchOnce(url, signal) {
  const now = Date.now();
  const hit = _cache.get(url);
  if (hit && now - hit.ts < CACHE_TTL_MS) return hit.data;

  const controller = !signal ? new AbortController() : null;
  const timeout = setTimeout(() => controller && controller.abort(), 30000);

  try {
    const r = await fetch(url, { headers: { Accept: "application/json" }, signal: signal || controller?.signal });
    if (!r.ok) throw new Error(`POWER HTTP ${r.status}`);
    const data = await r.json();

    const p = data?.properties?.parameter || {};
    const vars = Object.keys(p);
    if (!vars.length) return [];

    // 直接返回 YYYYMMDD（与你原始代码保持一致）
    const dates = Object.keys(p[vars[0]]); // 'YYYYMMDD'
    const rows = dates.map((d) => {
      const row = { date: d };
      for (const k of vars) row[k] = clean(p[k]?.[d]);
      return row;
    });

    _cache.set(url, { ts: now, data: rows });
    return rows;
  } finally {
    clearTimeout(timeout);
  }
}

// ===== 对外 API（同名导出） =====

// 抓单段（保持签名不变）
export async function fetchPowerDaily(lat, lon, startYYYYMMDD, endYYYYMMDD, signal) {
  const url = buildPowerURL({ lat, lon, start: startYYYYMMDD, end: endYYYYMMDD });
  return fetchOnce(url, signal);
}

// 大范围历史 —— 改为“一次拉近 N 年”（默认 10 年）
// 兼容签名：第三参通常是 signal；如果你想传 yearsBack，也可传第 4 参
export async function fetchPowerDailyRange(lat, lon, signal, yearsBack = 10) {
  // 兼容：如果把 yearsBack 误传在第三参
  if (typeof signal === "number" && yearsBack === 10) {
    yearsBack = signal;
    signal = undefined;
  }

  const today = new Date();
  const start = `${today.getFullYear() - yearsBack + 1}0101`;
  const end = yyyymmdd(new Date(today.getTime() - 24 * 3600 * 1000)); // 昨天
  const url = buildPowerURL({ lat, lon, start, end });
  return fetchOnce(url, signal);
}

// ===== 统计（修正为 DOY 环形日窗，跨年不漏） =====

// 把 'YYYYMMDD' 转成 DOY（用非闰年 2001 做映射）
function doyYYYYMMDD(yyyymmddStr) {
  const m = parseInt(yyyymmddStr.slice(4, 6), 10);
  const d = parseInt(yyyymmddStr.slice(6, 8), 10);
  const ref = new Date(2001, 0, 1); // 2001 非闰年
  const cur = new Date(2001, m - 1, d);
  return Math.floor((cur - ref) / 86400000) + 1; // 1..365
}

export function computeProbabilities(rows, targetMonth, targetDay, wDays = 3, thresholds = {}) {
  const th = {
    veryHot: (r) => r.T2M != null && r.T2M > 32, // °C
    veryCold: (r) => r.T2M != null && r.T2M < 0, // °C
    veryWet: (r) => r.PRECTOTCORR != null && r.PRECTOTCORR >= 10, // mm/day
    veryWindy: (r) => r.WS2M != null && r.WS2M >= 10, // m/s
    veryUncomfortable: (r) => r.T2M != null && r.RH2M != null && r.T2M >= 32 && r.RH2M >= 60,
    ...thresholds,
  };

  const pad2 = (n) => String(n).padStart(2, "0");
  const targetDOY = doyYYYYMMDD(`2001${pad2(targetMonth)}${pad2(targetDay)}`);

  // 环形距离：min(|d1-d2|, 365-|d1-d2|)
  const sample = rows.filter((r) => {
    const d = doyYYYYMMDD(r.date);
    const delta0 = Math.abs(d - targetDOY);
    const delta = Math.min(delta0, 365 - delta0);
    return delta <= wDays;
  });

  const n = sample.length || 1;
  const prob = (fn) => {
    const hits = sample.filter(fn).length;
    return { hits, n: sample.length, pct: Math.round((hits / n) * 100) };
    // 注意：当 sample.length 为 0 时，n=1 防止 NaN，pct 会是 0
  };

  return {
    windowDays: wDays,
    sampleCount: sample.length,
    veryHot: prob(th.veryHot),
    veryCold: prob(th.veryCold),
    veryWet: prob(th.veryWet),
    veryWindy: prob(th.veryWindy),
    veryUncomfortable: prob(th.veryUncomfortable),
    sample,
  };
}

// ===== CSV 导出（保持你原来的字段顺序） =====
export function buildCSV(area, month, day, windowDays, stats) {
  const header = [
    "name",
    "lat",
    "lng",
    "month",
    "day",
    "windowDays",
    "veryHot_pct",
    "veryCold_pct",
    "veryWet_pct",
    "veryWindy_pct",
    "veryUncomfortable_pct",
    "sampleCount",
  ].join(",");

  const meta = [
    csvSafe(area?.name || ""),
    area?.lat ?? "",
    area?.lng ?? "",
    month,
    day,
    windowDays,
    stats?.veryHot?.pct ?? "",
    stats?.veryCold?.pct ?? "",
    stats?.veryWet?.pct ?? "",
    stats?.veryWindy?.pct ?? "",
    stats?.veryUncomfortable?.pct ?? "",
    stats?.sampleCount ?? "",
  ].join(",");

  const rowsHeader = "date,T2M,RH2M,WS2M,PRECTOTCORR";
  const rows = (stats?.sample || [])
    .map(
      (r) =>
        `${r.date},${val(r.T2M)},${val(r.RH2M)},${val(r.WS2M)},${val(r.PRECTOTCORR)}`
    )
    .join("\n");

  const info =
    "# source: NASA POWER (temporal=daily, point, time-standard=UTC); units: T2M=°C, RH2M=%, WS2M=m/s, PRECTOTCORR=mm/day\n";
  const csv = `${info}${header}\n${meta}\n\n${rowsHeader}\n${rows}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  return URL.createObjectURL(blob);
}
