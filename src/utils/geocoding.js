// 反向：点击获取行政区名
export const fetchAreaInfo = async (lat, lng, signal) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=8&addressdetails=1`;
  const r = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  }).catch(() => null);
  if (!r || !r.ok) return null;
  const data = await r.json().catch(() => null);
  if (!data) return null;
  const name =
    data.name ||
    data.display_name ||
    data.address?.city ||
    data.address?.state ||
    data.address?.country ||
    "Unknown";
  const type = data.addresstype || data.type || "admin";
  return { name, type };
};

// 正向：搜索地点
export const searchPlace = async (query, signal) => {
  if (!query) return;
  
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
    query
  )}&addressdetails=1&limit=1`;
  const r = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  }).catch(() => null);
  if (!r || !r.ok) return;

  const list = (await r.json().catch(() => [])) || [];
  if (!list.length) return;

  const hit = list[0];
  const lat = parseFloat(hit.lat);
  const lng = parseFloat(hit.lon);
  const name =
    hit.name ||
    hit.display_name ||
    hit.address?.city ||
    hit.address?.state ||
    hit.address?.country ||
    "Unknown";
  const type = hit.addresstype || hit.type || "place";

  return { lat, lng, name, type };
};