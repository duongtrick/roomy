import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { Nav, Footer } from "@/components/Nav";
import { ROOMS } from "@/lib/rooms";
import { formatVND } from "@/lib/format";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Bản đồ phòng trọ — Roomy.tn" },
      { name: "description", content: "Xem vị trí các phòng trọ trên bản đồ Thái Nguyên." },
    ],
  }),
  component: MapPage,
});

const LeafletMap = lazy(() => import("@/components/LeafletMap"));

function MapPage() {
  const [activeId, setActiveId] = useState<string>(ROOMS[0]?.id ?? "");
  const active = ROOMS.find((r) => r.id === activeId) ?? ROOMS[0];
  // Leaflet touches `window` on import, so the map only mounts after hydration.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-12">
        <div className="mb-8 animate-fade-up">
          <span className="text-xs uppercase tracking-widest font-bold text-primary">
            Khám phá theo vị trí
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif italic font-semibold mt-2 md:mt-3 text-balance max-w-3xl">
            Bản đồ phòng trọ Thái Nguyên
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 relative rounded-3xl overflow-hidden ring-1 ring-foreground/5 shadow-2xl bg-stone-100">
            <div className="w-full aspect-square sm:aspect-[4/3]">
              {mounted ? (
                <Suspense
                  fallback={
                    <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                      Đang tải bản đồ…
                    </div>
                  }
                >
                  <LeafletMap activeId={activeId} setActiveId={setActiveId} />
                </Suspense>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                  Đang tải bản đồ…
                </div>
              )}
            </div>
          </div>

          <aside className="lg:col-span-4 space-y-4">
            {active && (
              <>
                <Link
                  to="/room/$id"
                  params={{ id: active.id }}
                  className="block rounded-3xl overflow-hidden ring-1 ring-foreground/5 shadow-xl bg-card"
                >
                  <img
                    src={active.image}
                    alt={active.title}
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <div className="p-6">
                    <span className="px-2 py-1 bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider rounded">
                      {active.district}
                    </span>
                    <h3 className="text-2xl font-serif italic font-bold mt-3">{active.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2">{active.address}</p>
                    <div className="mt-4 flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-primary">
                        {formatVND(active.price)}
                        <span className="text-muted-foreground text-sm font-normal">/tháng</span>
                      </span>
                      <span className="text-sm font-bold border-b-2 border-primary">
                        Xem chi tiết →
                      </span>
                    </div>
                  </div>
                </Link>
              </>
            )}

            <div className="space-y-2">
              {ROOMS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiveId(r.id)}
                  className={`w-full text-left p-4 min-h-14 rounded-2xl transition-colors active:scale-[0.99] ${
                    activeId === r.id
                      ? "bg-foreground text-background"
                      : "bg-card hover:bg-stone-100"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{r.title}</span>
                    <span className="font-mono text-xs">{formatVND(r.price)}</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
