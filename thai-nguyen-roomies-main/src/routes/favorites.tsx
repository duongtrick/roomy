import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav, Footer } from "@/components/Nav";
import { RoomCard } from "@/components/RoomCard";
import { ROOMS } from "@/lib/rooms";
import { useFavorites } from "@/lib/favorites";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "Phòng yêu thích — Roomy.tn" },
      { name: "description", content: "Danh sách phòng trọ bạn đã lưu để so sánh và theo dõi." },
    ],
  }),
  component: Favorites,
});

function Favorites() {
  const { ids } = useFavorites();
  const rooms = ROOMS.filter((r) => ids.includes(r.id));

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12 animate-fade-up">
          <span className="text-xs uppercase tracking-widest font-bold text-primary">Bộ sưu tập của bạn</span>
          <h1 className="text-5xl md:text-6xl font-serif italic font-semibold mt-3 text-balance">
            Phòng đã lưu
          </h1>
          <p className="text-muted-foreground mt-4 max-w-xl">
            Theo dõi và so sánh những căn phòng bạn quan tâm. Tất cả đều được lưu trên thiết bị của bạn.
          </p>
        </div>

        {rooms.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-3xl">
            <p className="font-serif italic text-2xl mb-4">Chưa có phòng nào được lưu.</p>
            <Link to="/" className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-full font-bold">
              Khám phá phòng trọ
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {rooms.map((r, i) => (
              <RoomCard key={r.id} room={r} delay={i * 100} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
