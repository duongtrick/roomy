import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { Heart, Phone, Star, MapPin, Calendar, Check } from "lucide-react";
import { Nav, Footer } from "@/components/Nav";
import { BookingModal } from "@/components/BookingModal";
import { getRoom, ROOMS, type Room } from "@/lib/rooms";
import { formatVND } from "@/lib/format";
import { useFavorites } from "@/lib/favorites";

const RoomMiniMap = lazy(() => import("@/components/RoomMiniMap"));

export const Route = createFileRoute("/room/$id")({
  loader: ({ params }) => {
    const room = getRoom(params.id);
    if (!room) throw notFound();
    return { room };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.room.title} — Roomy.tn` },
          { name: "description", content: loaderData.room.description.slice(0, 155) },
          { property: "og:title", content: loaderData.room.title },
          { property: "og:description", content: loaderData.room.description.slice(0, 155) },
          { property: "og:image", content: loaderData.room.image },
        ]
      : [],
  }),
  component: RoomDetail,
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="text-center">
        <h1 className="text-4xl font-serif italic font-bold mb-4">Không tìm thấy phòng</h1>
        <Link to="/" className="text-primary font-bold border-b-2 border-primary">
          Về trang chủ
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center">
      <p className="text-muted-foreground">{error.message}</p>
    </div>
  ),
});

function RoomDetail() {
  const { room } = Route.useLoaderData() as { room: Room };
  const { has, toggle } = useFavorites();
  const fav = has(room.id);
  const [active, setActive] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [mapMounted, setMapMounted] = useState(false);
  useEffect(() => setMapMounted(true), []);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-12">
        {/* Header */}
        <div className="mb-8 animate-fade-up">
          <Link
            to="/"
            className="inline-flex items-center min-h-11 -ml-1 px-1 text-xs uppercase tracking-widest font-bold text-muted-foreground hover:text-primary transition-colors"
          >
            ← Quay lại danh sách
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-4">
            <div>
              <div className="flex gap-2 mb-3 flex-wrap">
                <span className="px-2 py-1 bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider rounded">
                  {room.district}
                </span>
                <span className="px-2 py-1 bg-stone-100 text-muted-foreground text-[10px] font-bold uppercase tracking-wider rounded">
                  {room.size}m²
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif italic font-bold text-balance max-w-2xl">
                {room.title}
              </h1>
              <p className="flex items-center gap-2 text-muted-foreground mt-3">
                <MapPin className="size-4" /> {room.address}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggle(room.id)}
              className="shrink-0 inline-flex items-center gap-2 px-5 h-12 rounded-full border border-border hover:bg-foreground/5 active:scale-95 transition text-sm font-bold"
            >
              <Heart className={`size-4 ${fav ? "fill-primary text-primary" : ""}`} />
              {fav ? "Đã lưu" : "Lưu phòng"}
            </button>
          </div>
        </div>

        {/* Gallery */}
        <section className="mb-8 md:mb-12 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <div className="rounded-3xl overflow-hidden bg-stone-200 mb-3">
            <img
              src={room.gallery[active]}
              alt={room.title}
              width={1200}
              height={800}
              className="w-full aspect-[3/2] object-cover"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {room.gallery.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                className={`rounded-xl overflow-hidden aspect-[3/2] ring-2 transition-all ${
                  active === i ? "ring-primary" : "ring-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
          {/* Main */}
          <div className="lg:col-span-7 space-y-8 md:space-y-12">
            <section>
              <h2 className="text-2xl font-serif italic font-bold mb-4">Mô tả</h2>
              <p className="text-muted-foreground leading-relaxed">{room.description}</p>
            </section>

            <section>
              <h2 className="text-2xl font-serif italic font-bold mb-4">Tiện ích</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {room.amenities.map((a) => (
                  <li
                    key={a}
                    className="flex items-center gap-3 p-3 bg-card rounded-xl ring-1 ring-foreground/5"
                  >
                    <Check className="size-4 text-primary" />
                    <span className="text-sm font-medium">{a}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <div className="flex items-baseline justify-between border-b border-border pb-3 mb-6">
                <h2 className="text-2xl font-serif italic font-bold">Đánh giá từ người thuê</h2>
                <span className="font-mono text-sm text-muted-foreground">
                  {room.reviews.length} nhận xét
                </span>
              </div>
              <div className="space-y-6">
                {room.reviews.map((r, i) => (
                  <div key={i} className="p-6 bg-card rounded-2xl ring-1 ring-foreground/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">{r.author}</span>
                      <span className="text-xs text-muted-foreground font-mono">{r.date}</span>
                    </div>
                    <div className="flex gap-1 mb-3">
                      {Array.from({ length: r.rating }).map((_, k) => (
                        <Star key={k} className="size-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground italic font-serif">"{r.comment}"</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-5 lg:sticky lg:top-28 h-fit space-y-6 order-first lg:order-none">
            <div className="p-6 bg-card rounded-3xl ring-1 ring-foreground/5 shadow-xl">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-serif italic font-bold text-primary">
                  {formatVND(room.price)}
                </span>
                <span className="text-muted-foreground">/tháng</span>
              </div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6">
                Giá đã bao gồm phí dịch vụ
              </p>

              <button
                type="button"
                onClick={() => setBookingOpen(true)}
                className="w-full bg-primary text-primary-foreground h-14 rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2 mb-3"
              >
                <Calendar className="size-4" /> Đặt lịch xem phòng
              </button>
              <a
                href={`tel:${room.landlord.phone.replace(/\s/g, "")}`}
                className="w-full border border-border h-14 rounded-xl font-bold hover:bg-foreground/5 active:scale-[0.98] transition inline-flex items-center justify-center gap-2"
              >
                <Phone className="size-4" /> Gọi chủ trọ
              </a>

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">
                  Chủ nhà trọ
                </p>
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-accent text-accent-foreground grid place-items-center font-serif italic font-bold">
                    {room.landlord.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold">{room.landlord.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Star className="size-3 fill-primary text-primary" /> {room.landlord.rating}{" "}
                      đánh giá
                    </p>
                  </div>
                </div>
                <p className="text-sm font-mono mt-3 text-muted-foreground">
                  {room.landlord.phone}
                </p>
              </div>
            </div>

            <div className="block rounded-3xl overflow-hidden ring-1 ring-foreground/5 bg-stone-100">
              <div className="w-full aspect-[4/3]">
                {mapMounted ? (
                  <Suspense fallback={<div className="w-full h-full bg-stone-100" />}>
                    <RoomMiniMap lat={room.lat} lng={room.lng} />
                  </Suspense>
                ) : null}
              </div>
              <Link
                to="/map"
                className="p-4 bg-card text-xs uppercase tracking-widest font-bold flex justify-between"
              >
                <span>Vị trí trên bản đồ</span>
                <span className="text-primary">Xem chi tiết →</span>
              </Link>
            </div>
          </aside>
        </div>

        {/* Related */}
        <section className="mt-16 md:mt-24">
          <h2 className="text-2xl font-serif italic font-bold mb-6 border-b border-border pb-3">
            Có thể bạn quan tâm
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {ROOMS.filter((r) => r.id !== room.id)
              .slice(0, 3)
              .map((r) => (
                <Link
                  key={r.id}
                  to="/room/$id"
                  params={{ id: r.id }}
                  className="group block rounded-2xl overflow-hidden"
                >
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-stone-200">
                    <img
                      src={r.image}
                      alt={r.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <h3 className="font-serif italic font-bold text-lg mt-3 group-hover:text-primary transition-colors">
                    {r.title}
                  </h3>
                  <p className="text-primary font-bold text-sm mt-1">
                    {formatVND(r.price)}
                    <span className="text-muted-foreground font-normal">/tháng</span>
                  </p>
                </Link>
              ))}
          </div>
        </section>
      </main>

      {bookingOpen && (
        <BookingModal
          roomId={room.id}
          roomTitle={room.title}
          onClose={() => setBookingOpen(false)}
        />
      )}

      <Footer />
    </div>
  );
}
