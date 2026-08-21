import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Nav, Footer } from "@/components/Nav";
import { RoomCard } from "@/components/RoomCard";
import { ROOMS, AREAS, PRICE_BANDS } from "@/lib/rooms";
import "leaflet/dist/leaflet.css";

const LeafletMap = lazy(() => import("@/components/LeafletMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Roomy — Tìm phòng trọ tại Thái Nguyên" },
      {
        name: "description",
        content:
          "Roomy kết nối người thuê và chủ trọ tại Thái Nguyên. Tìm phòng theo khu vực, giá, diện tích, xem bản đồ và đặt lịch xem dễ dàng.",
      },
      { property: "og:title", content: "Roomy — Tìm phòng trọ tại Thái Nguyên" },
      { property: "og:description", content: "Tìm phòng trọ lý tưởng tại Thái Nguyên." },
    ],
  }),
  component: Home,
});

function Home() {
  const [area, setArea] = useState<string>(AREAS[0]);
  const [bandIdx, setBandIdx] = useState(0);
  const [activeId, setActiveId] = useState<string>(ROOMS[0]?.id ?? "");
  // Leaflet touches `window` on import, so the map only mounts after hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const filtered = useMemo(() => {
    const band = PRICE_BANDS[bandIdx];
    return ROOMS.filter((r) => {
      const okArea = area === AREAS[0] || r.area === area;
      const okPrice = r.price >= band.min && r.price <= band.max;
      return okArea && okPrice;
    });
  }, [area, bandIdx]);

  return (
    <div className="min-h-screen">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-12">
        {/* Hero */}
        <section className="mb-12 md:mb-20 animate-fade-up">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-serif italic font-semibold leading-[1.1] md:leading-[1.05] text-balance mb-6 md:mb-8">
              Tìm phòng trọ <span className="text-primary">lý tưởng</span> tại Thái Nguyên.
            </h1>

            <div className="flex flex-col md:flex-row gap-1 md:gap-2 p-2 bg-card ring-1 ring-foreground/5 rounded-2xl shadow-xl shadow-foreground/5">
              <div className="flex-1 px-4 py-3">
                <label className="block text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
                  Khu vực
                </label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  aria-label="Khu vực"
                  className="w-full bg-transparent font-medium focus:outline-none appearance-none cursor-pointer"
                >
                  {AREAS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div className="w-px bg-border my-2 hidden md:block" />
              <div className="h-px bg-border mx-4 md:hidden" />
              <div className="flex-1 px-4 py-3">
                <label className="block text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
                  Giá thuê
                </label>
                <select
                  value={bandIdx}
                  onChange={(e) => setBandIdx(Number(e.target.value))}
                  aria-label="Khoảng giá"
                  className="w-full bg-transparent font-medium focus:outline-none appearance-none cursor-pointer"
                >
                  {PRICE_BANDS.map((b, i) => (
                    <option key={b.label} value={i}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="bg-primary text-primary-foreground px-8 h-14 md:h-auto md:py-4 rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all"
              >
                Tìm phòng ngay
              </button>
            </div>
          </div>
        </section>

        {/* Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
          <div className="lg:col-span-7 space-y-8 md:space-y-12">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-xl font-semibold">Phòng trống mới nhất</h2>
              <span className="text-sm text-muted-foreground font-mono">
                {filtered.length} kết quả
              </span>
            </div>

            {filtered.length === 0 ? (
              <p className="text-muted-foreground italic font-serif text-lg">
                Chưa có phòng phù hợp. Hãy thử mở rộng khu vực hoặc khoảng giá.
              </p>
            ) : (
              filtered.map((room, i) => (
                <RoomCard key={room.id} room={room} delay={100 * (i + 1)} />
              ))
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-5 lg:sticky lg:top-28 h-fit space-y-6 md:space-y-8 order-last">
            <div
              className="block rounded-3xl overflow-hidden ring-1 ring-foreground/5 shadow-2xl animate-fade-up"
              style={{ animationDelay: "300ms" }}
            >
              <div className="bg-stone-100 pl-4 pr-2 py-1 border-b border-border flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest">Vị trí bản đồ</span>
                <Link
                  to="/map"
                  className="text-xs text-primary font-bold hover:underline inline-flex items-center min-h-11 px-2 -mr-2"
                >
                  Mở toàn màn hình
                </Link>
              </div>
              <div className="w-full aspect-[4/3] bg-stone-100">
                {mounted ? (
                  <Suspense fallback={<div className="w-full h-full bg-stone-100" />}>
                    <LeafletMap activeId={activeId} setActiveId={setActiveId} />
                  </Suspense>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div
                className="p-6 bg-card rounded-2xl ring-1 ring-foreground/5 animate-fade-up"
                style={{ animationDelay: "400ms" }}
              >
                <span className="block text-3xl font-serif italic font-bold text-primary mb-1">
                  150+
                </span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Phòng đang trống
                </span>
              </div>
              <div
                className="p-6 bg-card rounded-2xl ring-1 ring-foreground/5 animate-fade-up"
                style={{ animationDelay: "500ms" }}
              >
                <span className="block text-3xl font-serif italic font-bold text-primary mb-1">
                  4.9/5
                </span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Đánh giá tích cực
                </span>
              </div>
            </div>

            <div
              className="p-8 bg-accent text-accent-foreground rounded-3xl animate-fade-up"
              style={{ animationDelay: "600ms" }}
            >
              <p className="text-lg font-serif italic mb-6 text-balance">
                "Tôi đã tìm được căn phòng ưng ý chỉ sau 2 ngày sử dụng Roomy. Thông tin rất minh
                bạch."
              </p>
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-accent-foreground/20" />
                <div>
                  <span className="block text-xs font-bold">Minh Anh</span>
                  <span className="block text-[10px] opacity-60">Sinh viên ĐH Thái Nguyên</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
