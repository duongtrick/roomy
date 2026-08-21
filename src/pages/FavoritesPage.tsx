import { Link } from "react-router-dom";
import { Nav, Footer } from "@/components/Nav";
import { RoomCard } from "@/components/RoomCard";
import { ROOMS } from "@/lib/rooms";
import { useFavorites } from "@/lib/favorites";

export function FavoritesPage() {
  const { ids } = useFavorites();
  const rooms = ROOMS.filter((r) => ids.includes(r.id));

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-12">
        <div className="mb-8 md:mb-12 animate-fade-up">
          <span className="text-xs uppercase tracking-widest font-bold text-primary">
            Bộ sưu tập của bạn
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif italic font-semibold mt-2 md:mt-3 text-balance">
            Phòng đã lưu
          </h1>
          <p className="text-muted-foreground mt-4 max-w-xl">
            Theo dõi và so sánh những căn phòng bạn quan tâm. Tất cả đều được lưu trên thiết bị của
            bạn.
          </p>
        </div>

        {rooms.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-3xl">
            <p className="font-serif italic text-2xl mb-4">Chưa có phòng nào được lưu.</p>
            <Link
              to="/"
              className="inline-flex items-center justify-center bg-primary text-primary-foreground px-6 h-12 rounded-full font-bold active:scale-95 transition cursor-pointer"
            >
              Khám phá phòng trọ
            </Link>
          </div>
        ) : (
          <div className="space-y-8 md:space-y-12">
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
