import { yyyymmdd, csvSafe, val } from "./helpers";

// 抓单段
export async function fetchPowerDaily(lat, lon, startYYYYMMDD, endYYYYMMDD, signal) {
  const params = [
    "T2M", // 气温 °C
    "RH2M", // 相对湿度 %
    "WS2M", // 风速 m/s
    "PRECTOTCORR", // 降水 mm/day
  ].join(",");
  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${params}&community=RE&latitude=${lat}&longitude=${lon}&start=${startYYYYMMDD}&end=${endYYYYMMDD}&format=JSON`;
  const r = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!r.ok) throw new Error(`POWER HTTP ${r.status}`);
  const data = await r.json();
  const p = data?.properties?.parameter || {};
  const dates = Object.keys(p.T2M || {});
  // 小工具：清理缺测值
  const clean = (v) => (v === -999 || v === -99 ? null : v);

  return dates.map((d) => ({
    date: d,
    T2M: clean(p.T2M?.[d]),
    RH2M: clean(p.RH2M?.[d]),
    WS2M: clean(p.WS2M?.[d]),
    PRECTOTCORR: clean(p.PRECTOTCORR?.[d]),
  }));
}

// 大范围（1995-01-01 至 昨天），分块抓，避免过长区间
export async function fetchPowerDailyRange(lat, lon, signal) {
  const startYear = 1995;
  const today = new Date();
  const endDate = new Date(today.getTime() - 24 * 3600 * 1000); // 昨天
  const endYear = endDate.getFullYear();

  const results = [];
  for (let y = startYear; y <= endYear; y++) {
    const start = new Date(y, 0, 1);
    const end = y === endYear ? endDate : new Date(y, 11, 31);
    const rows = await fetchPowerDaily(
      lat,
      lon,
      yyyymmdd(start),
      yyyymmdd(end),
      signal
    );
    results.push(...rows);
  }
  return results;
}

export function computeProbabilities(
  rows,
  targetMonth,
  targetDay,
  wDays = 3,
  thresholds = {}
) {
  const th = {
    veryHot: (r) => r.T2M != null && r.T2M > 32,
    veryCold: (r) => r.T2M != null && r.T2M < 0,
    veryWet: (r) => r.PRECTOTCORR != null && r.PRECTOTCORR >= 10,
    veryWindy: (r) => r.WS2M != null && r.WS2M >= 10,
    veryUncomfortable: (r) =>
      r.T2M != null && r.RH2M != null && r.T2M >= 32 && r.RH2M >= 60,
    ...thresholds,
  };

  const toMD = (yyyymmddStr) => ({
    m: parseInt(yyyymmddStr.slice(4, 6), 10),
    d: parseInt(yyyymmddStr.slice(6, 8), 10),
  });

  // 将"目标月日"映射到同一年（2001）以便计算日差
  const target = new Date(2001, targetMonth - 1, targetDay);
  const inWindow = (md) => {
    const x = new Date(2001, md.m - 1, md.d);
    const diff = Math.abs((x - target) / 86400000);
    return diff <= wDays;
  };

  const sample = rows.filter((r) => inWindow(toMD(r.date)));
  const n = sample.length || 1;
  const prob = (fn) => {
    const hits = sample.filter(fn).length;
    return { hits, n: sample.length, pct: Math.round((hits / n) * 100) };
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
        `${r.date},${val(r.T2M)},${val(r.RH2M)},${val(r.WS2M)},${val(
          r.PRECTOTCORR
        )}`
    )
    .join("\n");

  const info =
    "# source: NASA POWER (temporal=daily, point); units: T2M=°C, RH2M=%, WS2M=m/s, PRECTOTCORR=mm/day\n";
  const csv = `${info}${header}\n${meta}\n\n${rowsHeader}\n${rows}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  return URL.createObjectURL(blob);
}