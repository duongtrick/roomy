export type RoomyQueryIntent = {
  keyword: string;
  maxPrice: number | null;
  maxDistance: number | null;
  availableOnly: boolean;
  verifiedOnly: boolean;
};

const MARKS: [RegExp, string][] = [
  [/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a"],
  [/[èéẹẻẽêềếệểễ]/g, "e"],
  [/[ìíịỉĩ]/g, "i"],
  [/[òóọỏõôồốộổỗơờớợởỡ]/g, "o"],
  [/[ùúụủũưừứựửữ]/g, "u"],
  [/[ỳýỵỷỹ]/g, "y"],
  [/đ/g, "d"],
];

export function foldVietnamese(s: string): string {
  let out = s.toLowerCase();
  for (const [re, ch] of MARKS) out = out.replace(re, ch);
  return out;
}

function parseMoney(value: string, unit: string | undefined): number {
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  if (!unit || /tr|trieu|m/.test(unit)) return Math.round(n * 1_000_000);
  return Math.round(n);
}

function parseDistance(value: string, unit: string | undefined): number {
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.round(unit?.startsWith("km") ? n * 1000 : n);
}

const PRICE = /(\d+(?:[,.]\d+)?)\s*(trieu|tr|m|d|vnd)\b/;
const DISTANCE = /(\d+(?:[,.]\d+)?)\s*(km|m)\b/;

export function parseRoomyQuery(input: string): RoomyQueryIntent {
  let text = foldVietnamese(input);
  const maxPriceMatch =
    text.match(/\b(?:duoi|toi da|khong qua|tam|khoang|<=?)\s*(\d+(?:[,.]\d+)?)\s*(trieu|tr|m|d|vnd)?\b/) ??
    text.match(PRICE);
  const maxDistanceMatch = text.match(
    /\b(?:gan|duoi|toi da|khong qua|<=?)\s*(\d+(?:[,.]\d+)?)\s*(km|m)\b/,
  ) ?? text.match(DISTANCE);

  const maxPrice = maxPriceMatch ? parseMoney(maxPriceMatch[1], maxPriceMatch[2]) : null;
  const maxDistance = maxDistanceMatch
    ? parseDistance(maxDistanceMatch[1], maxDistanceMatch[2])
    : null;
  const availableOnly = /\b(con trong|phong trong|dang trong|available|chua ai thue)\b/.test(text);
  const verifiedOnly = /\b(xac thuc|uy tin|verified|an toan)\b/.test(text);

  text = text
    .replace(/\b(?:gan|duoi|toi da|khong qua|tam|khoang|<=?)\s*\d+(?:[,.]\d+)?\s*(?:trieu|tr|m|d|vnd|km|m)?\b/g, " ")
    .replace(PRICE, " ")
    .replace(DISTANCE, " ")
    .replace(/\b(con trong|phong trong|dang trong|available|chua ai thue|xac thuc|uy tin|verified|an toan)\b/g, " ")
    .replace(/\b(roomy|phong|tro|can|tim|muon|gan|cho|minh|toi|em|oi)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { keyword: text, maxPrice, maxDistance, availableOnly, verifiedOnly };
}
