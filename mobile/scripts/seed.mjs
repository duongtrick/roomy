/**
 * Seeds a fresh Supabase project with the demo data.
 *
 *   node scripts/seed.mjs
 *
 * Needs, in the environment or in `mobile/.env.seed`:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY      (Project Settings → API → service_role)
 *
 * The service key bypasses RLS and can create users, so it must never end up
 * in the app bundle — that is why it has no EXPO_PUBLIC_ prefix and why this
 * script lives outside src. The seed file is deliberately separate from
 * Expo's environment file, so Metro cannot load the service key into its
 * diagnostic logs.
 *
 * Safe to re-run: it deletes the demo accounts and everything they own (the
 * foreign keys cascade), then rebuilds. It touches nothing belonging to any
 * other account.
 */
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

/** Minimal .env reader — avoids a dependency for six lines of parsing. */
async function loadEnv() {
  try {
    const raw = await readFile(join(root, ".env.seed"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // No .env.seed file — fall back to whatever is already exported.
  }
}

await loadEnv();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Thiếu biến môi trường.\n" +
      "  EXPO_PUBLIC_SUPABASE_URL   = " +
      (url ?? "(chưa có)") +
      "\n  SUPABASE_SERVICE_ROLE_KEY  = " +
      (serviceKey ? "(đã có)" : "(chưa có)") +
      "\n\nLấy ở Supabase dashboard → Project Settings → API.",
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const LANDLORD = {
  email: "demo@roomy.vn",
  password: "roomy123456",
  full_name: "Nguyễn Văn Chủ Trọ",
  phone: "0912 345 678",
  role: "landlord",
};
const TENANT = {
  email: "tenant@roomy.vn",
  password: "roomy123456",
  full_name: "Trần Thị Thuê",
  phone: "0987 654 321",
  role: "tenant",
};
// Vai trò 'admin' không đi qua metadata: `handle_new_user` hạ mọi yêu cầu
// admin xuống 'tenant', nên tài khoản này được tạo như người thuê rồi mới đổi
// vai trò bằng một câu ghi thẳng vào `user_roles` — thứ chỉ service_role làm
// được. Đây cũng đúng là cách cấp quyền admin cho một tài khoản thật.
const ADMIN = {
  email: "admin@roomy.vn",
  password: "roomy123456",
  full_name: "Quản Trị Viên Roomy",
  phone: "0900 000 000",
  role: "tenant",
};

/** Deletes the account if it exists, then creates it fresh and confirmed. */
async function recreateUser(spec) {
  const { data: list, error: listErr } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw listErr;

  const existing = list.users.find((u) => u.email === spec.email);
  if (existing) {
    const { error } = await db.auth.admin.deleteUser(existing.id);
    if (error) throw error;
  }

  // `email_confirm` skips the confirmation mail — the point of a demo account
  // is that it works the moment the script finishes.
  const { data, error } = await db.auth.admin.createUser({
    email: spec.email,
    password: spec.password,
    email_confirm: true,
    user_metadata: {
      full_name: spec.full_name,
      phone: spec.phone,
      role: spec.role,
    },
  });
  if (error) throw error;
  return data.user;
}

/** Đổi vai trò của một tài khoản thành quản trị viên. */
async function promoteToAdmin(user) {
  const { error: clearErr } = await db.from("user_roles").delete().eq("user_id", user.id);
  if (clearErr) throw clearErr;
  const { error } = await db.from("user_roles").insert({ user_id: user.id, role: "admin" });
  if (error) throw error;
}

function insert(table, rows) {
  return db
    .from(table)
    .insert(rows)
    .select("*")
    .then(({ data, error }) => {
      if (error) throw new Error(`${table}: ${error.message}`);
      return data;
    });
}

const ROOMS = [
  {
    title: "P.101 — Phòng Tiết Kiệm Quyết Thắng",
    public_title: "Phòng trọ giá sinh viên — Quyết Thắng",
    public_description:
      "Phòng nhỏ gọn giá mềm nhất khu, phù hợp sinh viên năm nhất. Chủ nhà ở gần, an ninh yên tâm, giờ giấc tự do.",
    description: null,
    price: 1000000,
    size: 14,
    status: "available",
    verification: "verified",
    address: "Ngõ 45 Đường Quyết Thắng, P. Quyết Thắng, TP. Thái Nguyên",
    area: "Phường Quyết Thắng",
    district: "Gần ĐH Nông Lâm",
    school_name: "ĐH Nông Lâm Thái Nguyên",
    distance_to_school: 400,
    amenities: ["Wifi", "Quạt trần", "Khép kín", "Gửi xe miễn phí"],
    lat: 21.5761,
    lng: 105.8402,
    electricity_rate: 3500,
    water_rate: 22000,
    photos: ["room-101.jpg"],
    reviews: [{ author_name: "Quang Huy", rating: 4, comment: "Giá hợp lý cho sinh viên." }],
  },
  {
    title: "P.102 — Phòng Ghép Tân Thịnh",
    public_title: "Phòng ghép 2 người — Z115 Tân Thịnh",
    public_description:
      "Phòng ghép 2 người, đã kê sẵn 2 giường tầng và bàn học. Khu trọ 8 phòng, có sân phơi chung và chỗ để xe trong nhà.",
    description: "Ưu tiên sinh viên năm nhất.",
    price: 1150000,
    size: 16,
    status: "available",
    verification: "unverified",
    address: "Tổ 6 Z115, P. Tân Thịnh, TP. Thái Nguyên",
    area: "Phường Tân Thịnh",
    district: "Gần ĐH Kỹ thuật Công nghiệp",
    school_name: "ĐH Kỹ thuật Công nghiệp",
    distance_to_school: 1100,
    amenities: ["Wifi", "Quạt trần", "Sân phơi", "Gửi xe miễn phí"],
    lat: 21.5981,
    lng: 105.8309,
    electricity_rate: 3500,
    water_rate: 20000,
    photos: ["room-102.jpg", "room-102-detail-1.jpg"],
    reviews: [],
  },
  {
    title: "P.103 — Phòng Gác Xép Hoàng Văn Thụ",
    public_title: "Phòng có gác xép — Hoàng Văn Thụ",
    public_description:
      "Gác xép rộng đủ kê đệm đôi, tầng dưới làm chỗ học và bếp. Ngay mặt ngõ ô tô vào được, gần chợ và bến xe.",
    description: "Đang sơn lại tường và thay khoá cửa, dự kiến xong đầu tháng sau.",
    price: 1300000,
    size: 18,
    status: "maintenance",
    verification: "unverified",
    address: "Ngõ 68 Hoàng Văn Thụ, P. Hoàng Văn Thụ, TP. Thái Nguyên",
    area: "Phường Hoàng Văn Thụ",
    district: "Trung tâm thành phố",
    school_name: "ĐH Kinh tế & QTKD",
    distance_to_school: 1100,
    amenities: ["Gác xép", "Wifi", "Khép kín", "Bếp riêng"],
    lat: 21.5928,
    lng: 105.8434,
    electricity_rate: 3500,
    water_rate: 25000,
    photos: ["room-103.jpg"],
    reviews: [{ author_name: "Ngọc Mai", rating: 4, comment: "Gác rộng, ở hai người vẫn thoải mái." }],
  },
  {
    title: "P.104 — Phòng Khép Kín Túc Duyên",
    public_title: "Phòng khép kín ven sông — Túc Duyên",
    public_description:
      "Khu dân cư ven sông Cầu, ít xe cộ, buổi tối rất yên. Phòng khép kín, có cửa sổ thoáng và sân chung rộng để phơi đồ.",
    description: null,
    price: 1450000,
    size: 18,
    status: "available",
    verification: "verified",
    address: "Tổ 9 Túc Duyên, P. Túc Duyên, TP. Thái Nguyên",
    area: "Phường Túc Duyên",
    district: "Ven sông Cầu",
    school_name: "ĐH Sư Phạm Thái Nguyên",
    distance_to_school: 2400,
    amenities: ["Khép kín", "Wifi", "Sân phơi", "Cửa sổ thoáng"],
    lat: 21.6002,
    lng: 105.8531,
    electricity_rate: 3500,
    water_rate: 22000,
    photos: ["room-104.jpg", "room-104-detail-1.jpg"],
    reviews: [],
  },
  {
    title: "P.105 — Phòng Yên Tĩnh Nông Lâm",
    public_title: "Phòng trọ yên tĩnh — sát ĐH Nông Lâm",
    public_description:
      "Cách cổng chính ĐH Nông Lâm 300m, đi bộ 4 phút. Khu trọ khép kín có chủ ở cùng, giờ giấc thoải mái, nước máy sạch.",
    description: null,
    price: 1600000,
    size: 17,
    status: "available",
    verification: "verified",
    address: "Ngõ 88 Đường Quyết Thắng, P. Quyết Thắng, TP. Thái Nguyên",
    area: "Phường Quyết Thắng",
    district: "Gần ĐH Nông Lâm",
    school_name: "ĐH Nông Lâm Thái Nguyên",
    distance_to_school: 300,
    amenities: ["Wifi", "Khép kín", "Chủ ở cùng", "Giờ giấc tự do"],
    lat: 21.5779,
    lng: 105.8371,
    electricity_rate: 3500,
    water_rate: 25000,
    photos: ["room-105.jpg", "room-105-detail-1.jpg", "room-105-detail-2.jpg"],
    reviews: [
      { author_name: "Việt Hùng", rating: 5, comment: "Đi bộ tới trường, giá mềm nhất khu này." },
    ],
  },
  {
    title: "P.106 — Studio Mới Xây Thịnh Đán",
    public_title: "Studio mới xây — Thịnh Đán",
    moderation: "pending",
    public_description:
      "Toà nhà mới bàn giao 2026, mỗi tầng 4 phòng. Cửa sổ hướng đông, tủ bếp và máy hút mùi lắp sẵn, có camera hành lang.",
    description: null,
    price: 1750000,
    size: 20,
    status: "available",
    verification: "pending",
    address: "Tổ 2 Thịnh Đán, P. Thịnh Đán, TP. Thái Nguyên",
    area: "Phường Thịnh Đán",
    district: "Gần ĐH Kỹ thuật Công nghiệp",
    school_name: "ĐH Kỹ thuật Công nghiệp",
    distance_to_school: 700,
    amenities: ["Điều hòa", "Bếp riêng", "Camera an ninh", "Wifi"],
    lat: 21.5893,
    lng: 105.8137,
    electricity_rate: 3500,
    water_rate: 25000,
    photos: ["room-106.jpg", "room-106-detail-1.jpg"],
    reviews: [],
  },
  {
    title: "P.107 — Phòng Khép Kín Gần ICTU",
    public_title: "Phòng khép kín mới sửa — sát ĐH CNTT&TT",
    public_description:
      "Đi bộ 5 phút tới cổng ĐH Công nghệ Thông tin và Truyền thông. Phòng mới sơn lại, nóng lạnh và điều hòa lắp năm nay, có bàn học rộng.",
    description: null,
    price: 1900000,
    size: 22,
    status: "available",
    verification: "verified",
    address: "Ngõ 209 Đường Z115, P. Quyết Thắng, TP. Thái Nguyên",
    area: "Phường Quyết Thắng",
    district: "Gần ĐH CNTT&TT",
    school_name: "ĐH CNTT&TT (ICTU)",
    distance_to_school: 350,
    amenities: ["Điều hòa", "Nóng lạnh", "Khép kín", "Wifi", "Bàn học"],
    lat: 21.5871,
    lng: 105.8206,
    electricity_rate: 3500,
    water_rate: 25000,
    photos: [
      "room-107.jpg",
      "room-107-detail-1.jpg",
      "room-107-detail-2.jpg",
      "room-107-detail-3.jpg",
    ],
    reviews: [
      { author_name: "Bảo Nam", rating: 5, comment: "Sát trường, đi học không cần xe." },
      { author_name: "Thu Hằng", rating: 4, comment: "Phòng mới, chỉ hơi nhỏ so với giá." },
    ],
  },
  {
    title: "P.108 — Phòng Đơn Đồng Quang",
    public_title: "Phòng đơn giá tốt — Đồng Quang",
    public_description:
      "Phòng đơn gọn gàng gần trung tâm, tiện đi làm và đi học. Khu phố yên tĩnh, gần chợ và trạm xe buýt.",
    description: null,
    price: 2050000,
    size: 20,
    status: "available",
    verification: "unverified",
    address: "Số 20 Phan Đình Phùng, P. Đồng Quang, TP. Thái Nguyên",
    area: "Phường Đồng Quang",
    district: "Trung tâm thành phố",
    school_name: "ĐH Y Dược Thái Nguyên",
    distance_to_school: 1600,
    amenities: ["Wifi", "Quạt trần", "Tủ quần áo"],
    lat: 21.5902,
    lng: 105.8301,
    electricity_rate: 3500,
    water_rate: 25000,
    photos: ["room-108.jpg", "room-108-detail-1.jpg", "room-108-detail-2.jpg"],
    reviews: [],
  },
  {
    title: "P.109 — Studio Ban Công Xanh",
    public_title: "Phòng Studio Ban Công Xanh — Quang Trung",
    public_description:
      "Nội thất gỗ tự nhiên, không gian yên tĩnh, cách cổng trường 200m. Cửa sổ lớn đón nắng sớm, có khu vực bếp riêng và ban công nhỏ trồng cây.",
    description: "Khoá cửa thay tháng 3. Bình nóng lạnh còn bảo hành.",
    price: 2200000,
    size: 26,
    status: "occupied",
    verification: "verified",
    address: "Ngõ 24 Lương Ngọc Quyến, P. Quang Trung, TP. Thái Nguyên",
    area: "Phường Quang Trung",
    district: "Gần ĐH Sư Phạm",
    school_name: "ĐH Sư Phạm Thái Nguyên",
    distance_to_school: 200,
    amenities: ["Điều hòa", "Ban công", "Bếp riêng", "Wifi", "Khép kín"],
    lat: 21.5942,
    lng: 105.8482,
    electricity_rate: 3500,
    water_rate: 25000,
    photos: [
      "room-109.jpg",
      "room-109-detail-1.jpg",
      "room-109-detail-2.jpg",
      "room-109-detail-3.jpg",
      "room-109-detail-4.jpg",
    ],
    reviews: [
      { author_name: "Minh Anh", rating: 5, comment: "Phòng sạch sẽ, chủ nhà thân thiện." },
      { author_name: "Tuấn Kiệt", rating: 5, comment: "Vị trí thuận tiện, gần trường, an ninh tốt." },
    ],
  },
  {
    title: "P.110 — Phòng Máy Lạnh Chợ Thái",
    public_title: "Phòng máy lạnh — sát chợ Thái",
    public_description:
      "Ngay sau chợ Thái, đi bộ ra hàng ăn và siêu thị. Phòng có máy lạnh, tủ lạnh mini và bình nóng lạnh, khoá cửa từ.",
    description: null,
    price: 2400000,
    size: 24,
    status: "available",
    verification: "verified",
    address: "Ngõ 3 Đội Cấn, P. Trưng Vương, TP. Thái Nguyên",
    area: "Phường Trưng Vương",
    district: "Trung tâm thành phố",
    school_name: "ĐH Kinh tế & QTKD",
    distance_to_school: 600,
    amenities: ["Điều hòa", "Tủ lạnh", "Nóng lạnh", "Khoá từ", "Wifi"],
    lat: 21.5911,
    lng: 105.8397,
    electricity_rate: 3500,
    water_rate: 25000,
    photos: ["room-110.jpg", "room-110-detail-1.jpg", "room-110-detail-2.jpg"],
    reviews: [{ author_name: "Đức Anh", rating: 5, comment: "Tiện đi chợ, phòng mát và sạch." }],
  },
  {
    title: "P.111 — Phòng Rộng Gia Sàng",
    public_title: "Phòng rộng rãi — Gia Sàng",
    moderation: "rejected",
    moderation_note: "Ảnh minh hoạ không phải ảnh phòng thật. Gửi lại ảnh chụp đúng phòng đang cho thuê.",
    public_description:
      "Phòng rộng thoáng, khu dân cư yên tĩnh gần khu công nghiệp Gang Thép. Phù hợp người đi làm hoặc ở ghép.",
    description: null,
    price: 2600000,
    size: 25,
    status: "available",
    verification: "pending",
    address: "Tổ 4 Gia Sàng, P. Gia Sàng, TP. Thái Nguyên",
    area: "Phường Gia Sàng",
    district: "Khu Gang Thép",
    school_name: "ĐH Y Dược Thái Nguyên",
    distance_to_school: 2000,
    amenities: ["Điều hòa", "Wifi", "Ban công"],
    lat: 21.5834,
    lng: 105.8228,
    electricity_rate: 3500,
    water_rate: 25000,
    photos: [
      "room-111.jpg",
      "room-111-detail-1.jpg",
      "room-111-detail-2.jpg",
      "room-111-detail-3.jpg",
    ],
    reviews: [],
  },
  {
    title: "P.112 — Căn Hộ Dịch Vụ CMT8",
    public_title: "Căn hộ dịch vụ Full nội thất — Đường CMT8",
    public_description:
      "An ninh 24/7, có thang máy, khóa vân tay. Khu dân cư trí thức, gần chợ Thái và siêu thị lớn. Đầy đủ nội thất, dọn vào ở ngay.",
    description: "Thẻ thang máy cấp 2 cái/phòng.",
    price: 2800000,
    size: 25,
    status: "occupied",
    verification: "verified",
    address: "Số 142 Cách Mạng Tháng 8, P. Trưng Vương, TP. Thái Nguyên",
    area: "Phường Trưng Vương",
    district: "Khu Gang Thép",
    school_name: "ĐH Y Dược Thái Nguyên",
    distance_to_school: 900,
    amenities: ["An ninh 24/7", "Thang máy", "Khóa vân tay", "Wifi", "Điều hòa"],
    lat: 21.5868,
    lng: 105.8252,
    electricity_rate: 3500,
    water_rate: 25000,
    photos: [
      "room-112.jpg",
      "room-112-detail-1.jpg",
      "room-112-detail-2.jpg",
      "room-112-detail-3.jpg",
      "room-112-detail-4.jpg",
    ],
    reviews: [
      { author_name: "Hà Linh", rating: 5, comment: "Quản lý chuyên nghiệp, phòng đẹp như hình." },
    ],
  },
  {
    title: "P.113 — Phòng Ban Công Quang Trung",
    public_title: "Phòng ban công thoáng mát — Quang Trung",
    public_description:
      "Ban công rộng đón gió, phù hợp trồng cây và phơi đồ. Khu phố yên tĩnh, gần quán ăn và tiệm tạp hoá.",
    description: null,
    price: 3000000,
    size: 28,
    status: "available",
    verification: "verified",
    address: "Ngõ 15 Lương Ngọc Quyến, P. Quang Trung, TP. Thái Nguyên",
    area: "Phường Quang Trung",
    district: "Gần ĐH Sư Phạm",
    school_name: "ĐH Sư Phạm Thái Nguyên",
    distance_to_school: 400,
    amenities: ["Ban công", "Điều hòa", "Bếp riêng", "Wifi", "Máy giặt chung"],
    lat: 21.5951,
    lng: 105.8471,
    electricity_rate: 3500,
    water_rate: 25000,
    photos: [
      "room-113.jpg",
      "room-113-detail-1.jpg",
      "room-113-detail-2.jpg",
      "room-113-detail-3.jpg",
    ],
    reviews: [],
  },
  {
    title: "P.114 — Studio View Núi Tân Thịnh",
    public_title: "Studio View Núi — Tân Thịnh",
    public_description:
      "Tầng cao, view núi xanh mướt vùng chè. Trần gỗ ấm cúng, bếp mở, bàn ăn cho 2 người. Lý tưởng cho cặp đôi trẻ.",
    description: null,
    price: 3250000,
    size: 32,
    status: "occupied",
    verification: "verified",
    address: "Ngõ 6 Z115, P. Tân Thịnh, TP. Thái Nguyên",
    area: "Phường Tân Thịnh",
    district: "Gần ĐH Thái Nguyên",
    school_name: "ĐH Thái Nguyên",
    distance_to_school: 1500,
    amenities: ["Ban công", "View núi", "Bếp riêng", "Máy giặt", "Wifi"],
    lat: 21.6012,
    lng: 105.8351,
    electricity_rate: 3800,
    water_rate: 27000,
    photos: [
      "room-114.jpg",
      "room-114-detail-1.jpg",
      "room-114-detail-2.jpg",
      "room-114-detail-3.jpg",
      "room-114-detail-4.jpg",
      "room-114-detail-5.jpg",
    ],
    reviews: [
      { author_name: "Phương Thảo", rating: 5, comment: "View tuyệt vời, sáng nào cũng thấy núi." },
      { author_name: "Đức Anh", rating: 4, comment: "Phòng đẹp, hơi xa trung tâm một chút." },
    ],
  },
  {
    title: "P.115 — Căn Hộ Mini Đồng Quang",
    public_title: "Căn hộ mini 1 phòng ngủ — Đồng Quang",
    public_description:
      "Căn hộ mini tách phòng ngủ riêng, phòng khách kê được sofa. Hợp gia đình trẻ hoặc hai người đi làm. Có chỗ để xe máy trong sân.",
    description: null,
    price: 3500000,
    size: 30,
    status: "occupied",
    verification: "verified",
    address: "Số 15 Phan Đình Phùng, P. Đồng Quang, TP. Thái Nguyên",
    area: "Phường Đồng Quang",
    district: "Trung tâm thành phố",
    school_name: "ĐH Y Dược Thái Nguyên",
    distance_to_school: 1800,
    amenities: ["Điều hòa", "Máy giặt", "Bếp riêng", "Thang máy", "Wifi"],
    lat: 21.5896,
    lng: 105.8288,
    electricity_rate: 3800,
    water_rate: 27000,
    photos: [
      "room-115.jpg",
      "room-115-detail-1.jpg",
      "room-115-detail-2.jpg",
      "room-115-detail-3.jpg",
      "room-115-detail-4.jpg",
    ],
    reviews: [
      { author_name: "Hoàng Long", rating: 5, comment: "Rộng rãi, yên tĩnh, để xe thoải mái." },
    ],
  },
];

const ROOM_PHOTOS = ROOMS.flatMap((room) => room.photos ?? []);

const TENANTS = [
  {
    full_name: "Lê Minh Anh",
    phone: "0912 111 222",
    email: "minhanh@email.com",
    id_number: "001234567890",
    move_in_date: "2025-09-01",
    notes: "Sinh viên năm 3 ĐH Sư Phạm Thái Nguyên",
  },
  {
    full_name: "Phạm Tuấn Kiệt",
    phone: "0987 333 444",
    email: "kiettuan@email.com",
    id_number: "001234567891",
    move_in_date: "2025-10-15",
    notes: "Nhân viên văn phòng Gang Thép",
  },
  {
    full_name: "Nguyễn Hà Linh",
    phone: "0901 555 666",
    email: "halinhnguyen@email.com",
    id_number: "001234567892",
    move_in_date: "2026-01-01",
    notes: "Làm việc tại BV Trung Ương Thái Nguyên",
  },
  {
    full_name: "Trần Đức Anh",
    phone: "0978 777 888",
    email: "ducanh@email.com",
    id_number: "001234567893",
    move_in_date: "2026-03-10",
    notes: null,
  },
];

async function main() {
  console.log("→ Tạo tài khoản demo…");
  const landlord = await recreateUser(LANDLORD);
  const tenantUser = await recreateUser(TENANT);
  const adminUser = await recreateUser(ADMIN);
  await promoteToAdmin(adminUser);
  console.log(`  chủ trọ  ${LANDLORD.email}  (${landlord.id})`);
  console.log(`  người thuê ${TENANT.email}  (${tenantUser.id})`);
  console.log(`  quản trị ${ADMIN.email}  (${adminUser.id})`);

  console.log("→ Tải ảnh phòng lên Storage…");
  const uploaded = new Map();
  for (const name of ROOM_PHOTOS) {
    const bytes = await readFile(join(root, "assets", "rooms", name));
    const path = `seed/${name}`;
    const { error } = await db.storage
      .from("room-photos")
      .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
    if (error) throw new Error(`storage ${name}: ${error.message}`);
    uploaded.set(name, path);
    console.log(`  ${path}`);
  }

  console.log("→ Thêm phòng…");
  const listings = await insert(
    "listings",
    ROOMS.map((r) => ({
      owner_id: landlord.id,
      title: r.title,
      description: r.description,
      status: r.status,
      electricity_rate: r.electricity_rate,
      water_rate: r.water_rate,
      is_published: Boolean(r.public_title),
      public_title: r.public_title,
      public_description: r.public_description,
      price: r.price,
      size: r.size,
      address: r.address,
      area: r.area,
      district: r.district,
      amenities: r.amenities,
      lat: r.lat,
      lng: r.lng,
      school_name: r.school_name,
      distance_to_school: r.distance_to_school,
      // Chỉ script chạy bằng service_role mới đặt được 'verified' — trigger
      // listings_guard_verification chặn mọi vai trò khác.
      verification: r.verification,
      // Cũng vậy với kiểm duyệt. Vài phòng cố ý để 'pending'/'rejected' để
      // Bảng quản trị có việc thật mà duyệt ngay sau khi seed.
      moderation_status: r.moderation ?? "approved",
      moderation_note: r.moderation_note ?? null,
    })),
  );
  const byTitle = new Map(listings.map((l) => [l.title, l]));

  // Every demo room gets its own gallery. The first image is the cover and the
  // remaining images show room details; gallery sizes intentionally vary by
  // listing so the demo exercises real-world listings instead of a fixed
  // three-photo assumption.
  const gallery = [];
  const reviews = [];
  for (const r of ROOMS) {
    const listing = byTitle.get(r.title);
    for (const [sortOrder, photo] of (r.photos ?? []).entries()) {
      const storagePath = uploaded.get(photo);
      if (!storagePath) throw new Error(`Thiếu asset ảnh ${photo} cho ${r.title}`);
      gallery.push({ listing_id: listing.id, storage_path: storagePath, sort_order: sortOrder });
    }
    for (const rev of r.reviews) {
      reviews.push({ listing_id: listing.id, ...rev });
    }
  }
  await insert("listing_images", gallery);
  if (reviews.length) await insert("reviews", reviews);
  console.log(`  ${listings.length} phòng · ${gallery.length} ảnh · ${reviews.length} đánh giá`);

  console.log("→ Thêm người thuê và hợp đồng…");
  const tenants = await insert(
    "tenants",
    [
      ...TENANTS.map((t) => ({ owner_id: landlord.id, ...t })),
      // Hồ sơ nối sẵn với tài khoản người thuê demo. Bình thường chủ trọ chỉ
      // điền email và chính người thuê bấm "Nhận hồ sơ thuê của tôi" để nối;
      // ở đây nối luôn để đăng nhập vào là thử viết đánh giá được ngay.
      {
        owner_id: landlord.id,
        full_name: TENANT.full_name,
        phone: TENANT.phone,
        email: TENANT.email,
        id_number: "001234567894",
        move_in_date: "2025-03-01",
        notes: "Tài khoản demo — đã trả phòng, vẫn đánh giá được phòng từng thuê.",
        user_id: tenantUser.id,
      },
    ],
  );

  const leaseSpecs = [
    ["P.109 — Studio Ban Công Xanh", "Lê Minh Anh", "2025-09-01", "2026-09-01", 2200000, 2200000],
    ["P.112 — Căn Hộ Dịch Vụ CMT8", "Phạm Tuấn Kiệt", "2025-10-15", "2026-10-15", 2800000, 2800000],
    ["P.114 — Studio View Núi Tân Thịnh", "Nguyễn Hà Linh", "2026-01-01", "2027-01-01", 3250000, 4000000],
    ["P.115 — Căn Hộ Mini Đồng Quang", "Trần Đức Anh", "2026-03-10", "2027-03-10", 3500000, 3500000],
  ];
  // Hợp đồng đã kết thúc: phòng vẫn còn trống trên trang Khám phá, còn tài
  // khoản demo thì đủ điều kiện đánh giá — `can_review_listing` nhận cả hợp
  // đồng cũ lẫn hợp đồng đang hiệu lực.
  leaseSpecs.push([
    "P.105 — Phòng Yên Tĩnh Nông Lâm",
    TENANT.full_name,
    "2025-03-01",
    "2026-03-01",
    1600000,
    1600000,
    "ended",
  ]);

  const byName = new Map(tenants.map((t) => [t.full_name, t]));
  const leases = await insert(
    "leases",
    leaseSpecs.map(([room, tenant, start, end, rent, deposit, status]) => ({
      owner_id: landlord.id,
      listing_id: byTitle.get(room).id,
      tenant_id: byName.get(tenant).id,
      start_date: start,
      end_date: end,
      monthly_rent: rent,
      deposit,
      status: status ?? "active",
    })),
  );

  console.log("→ Thêm chỉ số điện nước…");
  const meterSpecs = [
    ["P.109 — Studio Ban Công Xanh", "2026-06", 1000, 1120, 50, 58],
    ["P.109 — Studio Ban Công Xanh", "2026-07", 1120, 1250, 58, 67],
    ["P.109 — Studio Ban Công Xanh", "2026-08", 1250, 1395, 67, 75],
    ["P.112 — Căn Hộ Dịch Vụ CMT8", "2026-06", 2000, 2090, 100, 106],
    ["P.112 — Căn Hộ Dịch Vụ CMT8", "2026-07", 2090, 2200, 106, 114],
    ["P.112 — Căn Hộ Dịch Vụ CMT8", "2026-08", 2200, 2320, 114, 121],
    ["P.114 — Studio View Núi Tân Thịnh", "2026-06", 500, 650, 30, 40],
    ["P.114 — Studio View Núi Tân Thịnh", "2026-07", 650, 810, 40, 51],
    ["P.114 — Studio View Núi Tân Thịnh", "2026-08", 810, 970, 51, 62],
  ];
  await insert(
    "meter_readings",
    meterSpecs.map(([room, period, es, ee, ws, we]) => ({
      owner_id: landlord.id,
      listing_id: byTitle.get(room).id,
      period,
      electricity_start: es,
      electricity_end: ee,
      water_start: ws,
      water_end: we,
    })),
  );

  console.log("→ Thêm hoá đơn…");
  // `(listing_id, period)` is unique, so one invoice per room per month. The
  // most recent period is left unbilled on purpose — it gives the dashboard a
  // "Chờ tạo HĐ" flag to show.
  const invoiceSpecs = [
    ["P.109 — Studio Ban Công Xanh", "2026-06", 2200000, 120, 420000, 8, 200000, 0, "paid", "2026-07-05T10:00:00Z"],
    ["P.109 — Studio Ban Công Xanh", "2026-07", 2200000, 130, 455000, 9, 225000, 0, "paid", "2026-08-03T10:00:00Z"],
    ["P.112 — Căn Hộ Dịch Vụ CMT8", "2026-06", 2800000, 90, 315000, 6, 150000, 0, "paid", "2026-07-08T10:00:00Z"],
    ["P.112 — Căn Hộ Dịch Vụ CMT8", "2026-07", 2800000, 110, 385000, 8, 200000, 0, "unpaid", null],
    ["P.114 — Studio View Núi Tân Thịnh", "2026-06", 3250000, 150, 570000, 10, 270000, 50000, "paid", "2026-07-02T10:00:00Z"],
    ["P.114 — Studio View Núi Tân Thịnh", "2026-07", 3250000, 160, 608000, 11, 297000, 0, "unpaid", null],
  ];
  const leaseByListing = new Map(leases.map((l) => [l.listing_id, l]));
  await insert(
    "invoices",
    invoiceSpecs.map(([room, period, rent, kwh, eAmt, m3, wAmt, other, status, paidAt]) => {
      const listing = byTitle.get(room);
      const lease = leaseByListing.get(listing.id);
      return {
        owner_id: landlord.id,
        lease_id: lease.id,
        listing_id: listing.id,
        tenant_id: lease.tenant_id,
        period,
        rent_amount: rent,
        electricity_kwh: kwh,
        electricity_amount: eAmt,
        water_m3: m3,
        water_amount: wAmt,
        other_amount: other,
        total_amount: rent + eAmt + wAmt + other,
        status,
        paid_at: paidAt,
        due_date: `${period}-10`,
      };
    }),
  );

  console.log("\n✓ Xong.\n");
  console.log("  Chủ trọ    " + LANDLORD.email + " / " + LANDLORD.password);
  console.log("  Người thuê " + TENANT.email + " / " + TENANT.password);
  console.log("  Quản trị   " + ADMIN.email + " / " + ADMIN.password);
}

main().catch((e) => {
  console.error("\n✗ Seed thất bại:", e.message ?? e);
  process.exit(1);
});
