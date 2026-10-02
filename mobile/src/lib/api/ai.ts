import { foldVietnamese, parseRoomyQuery, type RoomyQueryIntent } from "../roomy-query";
import { assertConfigured } from "./errors";
import { supabase } from "../supabase";

export type AiSearchIntent = RoomyQueryIntent & {
  audience: "freshman" | "worker" | "couple" | "any";
  priorities: string[];
  note: string;
  source: "llm" | "fallback" | "local";
};

export function localAiFallback(query: string): AiSearchIntent {
  const intent = parseRoomyQuery(query);
  const text = foldVietnamese(query);
  const freshman = /\b(tan sinh vien|nam nhat|lan dau|it kinh nghiem|sinh vien moi)\b/.test(text);
  const worker = /\b(di lam|nhan vien|cong nhan|van phong)\b/.test(text);
  const couple = /\b(cap doi|vo chong|hai nguoi|2 nguoi)\b/.test(text);
  const safety = /\b(an toan|uy tin|khong lua|so bi lua|coc)\b/.test(text);

  return {
    ...intent,
    keyword: intent.keyword
      .replace(/\b(la|tan sinh vien|nam nhat|lan dau|it kinh nghiem|sinh vien moi)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
    maxPrice: intent.maxPrice ?? (freshman ? 2_000_000 : null),
    maxDistance: intent.maxDistance ?? (freshman ? 1200 : null),
    availableOnly: intent.availableOnly || freshman,
    verifiedOnly: intent.verifiedOnly || freshman || safety,
    audience: freshman ? "freshman" : worker ? "worker" : couple ? "couple" : "any",
    priorities: [
      freshman ? "ưu tiên phòng đã xác thực, gần trường, còn trống" : "",
      safety ? "kiểm tra cọc, giấy tờ và đánh giá trước khi chuyển tiền" : "",
      worker ? "ưu tiên đường đi thuận tiện và chi phí rõ ràng" : "",
      couple ? "ưu tiên diện tích, nội quy ở 2 người và điện nước minh bạch" : "",
    ].filter(Boolean),
    note: freshman
      ? "Tân sinh viên nên chọn phòng đã xác thực, gần trường, công khai điện nước và xem trực tiếp trước khi cọc."
      : "AI chưa sẵn sàng, Roomy tạm dùng bộ hiểu câu hỏi trên máy.",
    source: "local",
  };
}

export async function askRoomySearch(query: string): Promise<AiSearchIntent> {
  assertConfigured();
  const local = localAiFallback(query);

  const { data, error } = await supabase.functions.invoke("ai-search", {
    body: { query },
  });

  if (error || !data || typeof data !== "object") {
    return {
      ...local,
    };
  }

  const raw = data as Partial<AiSearchIntent>;
  return {
    keyword: typeof raw.keyword === "string" ? raw.keyword : local.keyword,
    maxPrice: typeof raw.maxPrice === "number" || raw.maxPrice === null ? raw.maxPrice : local.maxPrice,
    maxDistance:
      typeof raw.maxDistance === "number" || raw.maxDistance === null ? raw.maxDistance : local.maxDistance,
    availableOnly: typeof raw.availableOnly === "boolean" ? raw.availableOnly : local.availableOnly,
    verifiedOnly: typeof raw.verifiedOnly === "boolean" ? raw.verifiedOnly : local.verifiedOnly,
    audience: raw.audience ?? "any",
    priorities: Array.isArray(raw.priorities) ? raw.priorities.slice(0, 4) : [],
    note:
      typeof raw.note === "string" && raw.note.trim()
        ? raw.note
        : "Roomy đã chuyển câu hỏi thành bộ lọc có thể chỉnh lại.",
    source: raw.source ?? "fallback",
  };
}
