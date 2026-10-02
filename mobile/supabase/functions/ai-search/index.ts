import { corsHeaders, json } from "../_shared/cors.ts";
import { redact } from "../_shared/redact.ts";

type Intent = {
  keyword: string;
  maxPrice: number | null;
  maxDistance: number | null;
  availableOnly: boolean;
  verifiedOnly: boolean;
  audience: "freshman" | "worker" | "couple" | "any";
  priorities: string[];
  note: string;
  source: "llm" | "fallback";
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

function fold(input: string) {
  let out = input.toLowerCase();
  for (const [re, ch] of MARKS) out = out.replace(re, ch);
  return out;
}

function money(value: string, unit: string | undefined) {
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  if (!unit || /tr|trieu|m/.test(unit)) return Math.round(n * 1_000_000);
  return Math.round(n);
}

function distance(value: string, unit: string | undefined) {
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.round(unit?.startsWith("km") ? n * 1000 : n);
}

function fallback(query: string): Intent {
  let text = fold(query);
  const price = text.match(/\b(?:duoi|toi da|khong qua|tam|khoang|<=?)\s*(\d+(?:[,.]\d+)?)\s*(trieu|tr|m|d|vnd)?\b/);
  const range = text.match(/\b(?:gan|duoi|toi da|khong qua|<=?)\s*(\d+(?:[,.]\d+)?)\s*(km|m)\b/);
  const freshman = /\b(tan sinh vien|nam nhat|lan dau|it kinh nghiem|sinh vien moi)\b/.test(text);
  const worker = /\b(di lam|nhan vien|cong nhan|van phong)\b/.test(text);
  const couple = /\b(cap doi|vo chong|hai nguoi|2 nguoi)\b/.test(text);
  const safe = /\b(an toan|uy tin|khong lua|so bi lua|coc|xac thuc)\b/.test(text);
  const availableOnly = /\b(con trong|phong trong|dang trong|available|chua ai thue)\b/.test(text);
  const verifiedOnly = safe || /\b(xac thuc|verified)\b/.test(text);

  text = text
    .replace(/\b(?:gan|duoi|toi da|khong qua|tam|khoang|<=?)\s*\d+(?:[,.]\d+)?\s*(?:trieu|tr|m|d|vnd|km|m)?\b/g, " ")
    .replace(/\b(con trong|phong trong|dang trong|available|chua ai thue|xac thuc|uy tin|verified|an toan|khong lua|so bi lua|coc)\b/g, " ")
    .replace(/\b(roomy|phong|tro|can|tim|muon|gan|cho|minh|toi|em|oi|tan sinh vien|nam nhat|lan dau|it kinh nghiem|sinh vien moi)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const priorities = [
    freshman ? "gần trường, đã xác thực, giá dễ chịu" : "",
    safe ? "ưu tiên tin đã xác thực và có đánh giá" : "",
    worker ? "ưu tiên đi lại thuận tiện và giờ giấc rõ ràng" : "",
    couple ? "ưu tiên diện tích và chi phí điện nước minh bạch" : "",
  ].filter(Boolean);

  return {
    keyword: text,
    maxPrice: price ? money(price[1], price[2]) : freshman ? 2_000_000 : null,
    maxDistance: range ? distance(range[1], range[2]) : freshman ? 1200 : null,
    availableOnly: availableOnly || freshman,
    verifiedOnly: verifiedOnly || freshman,
    audience: freshman ? "freshman" : worker ? "worker" : couple ? "couple" : "any",
    priorities: priorities.length ? priorities : ["lọc theo điều kiện bạn mô tả"],
    note: freshman
      ? "Tân sinh viên nên ưu tiên phòng đã xác thực, gần trường, công khai điện nước và xem trực tiếp trước khi cọc."
      : "Roomy đã hiểu ý chính trong câu hỏi và chuyển thành bộ lọc có thể chỉnh lại.",
    source: "fallback",
  };
}

function cleanIntent(raw: Record<string, unknown>, backup: Intent): Intent {
  const audience = ["freshman", "worker", "couple", "any"].includes(String(raw.audience))
    ? raw.audience as Intent["audience"]
    : backup.audience;
  return {
    keyword: typeof raw.keyword === "string" ? raw.keyword.slice(0, 80) : backup.keyword,
    maxPrice: typeof raw.maxPrice === "number" && raw.maxPrice > 0 ? Math.round(raw.maxPrice) : backup.maxPrice,
    maxDistance: typeof raw.maxDistance === "number" && raw.maxDistance > 0 ? Math.round(raw.maxDistance) : backup.maxDistance,
    availableOnly: typeof raw.availableOnly === "boolean" ? raw.availableOnly : backup.availableOnly,
    verifiedOnly: typeof raw.verifiedOnly === "boolean" ? raw.verifiedOnly : backup.verifiedOnly,
    audience,
    priorities: Array.isArray(raw.priorities)
      ? raw.priorities.filter((x): x is string => typeof x === "string").slice(0, 4)
      : backup.priorities,
    note: typeof raw.note === "string" ? raw.note.slice(0, 180) : backup.note,
    source: "llm",
  };
}

async function askOpenAI(query: string, backup: Intent): Promise<Intent | null> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return null;

  const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-5-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content:
            "Bạn là AI tìm phòng trọ cho Roomy tại Thái Nguyên. Chỉ chuyển câu tiếng Việt thành JSON bộ lọc. Không trả số điện thoại, email, thông tin riêng tư, hoặc lời khuyên ngoài việc tìm phòng.",
        },
        {
          role: "user",
          content: `Câu hỏi đã ẩn thông tin riêng tư: ${query}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "roomy_search_intent",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              keyword: { type: "string" },
              maxPrice: { type: ["number", "null"] },
              maxDistance: { type: ["number", "null"] },
              availableOnly: { type: "boolean" },
              verifiedOnly: { type: "boolean" },
              audience: { type: "string", enum: ["freshman", "worker", "couple", "any"] },
              priorities: { type: "array", items: { type: "string" }, maxItems: 4 },
              note: { type: "string" },
            },
            required: [
              "keyword",
              "maxPrice",
              "maxDistance",
              "availableOnly",
              "verifiedOnly",
              "audience",
              "priorities",
              "note",
            ],
          },
        },
      },
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  const text =
    data.output_text ??
    data.output?.flatMap((item: { content?: { text?: string }[] }) => item.content ?? [])
      .map((item: { text?: string }) => item.text ?? "")
      .join("");
  if (typeof text !== "string" || !text.trim()) return null;

  try {
    return cleanIntent(JSON.parse(text), backup);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { query?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body JSON không hợp lệ." }, 400);
  }

  const query = typeof body.query === "string" ? redact(body.query).trim().slice(0, 300) : "";
  if (!query) return json({ error: "Nhập câu hỏi tìm phòng." }, 400);

  const backup = fallback(query);
  const llm = await askOpenAI(query, backup);
  return json(llm ?? backup);
});
