import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import type { Room } from "@/lib/rooms";
import { formatVND } from "@/lib/rooms";
import { useFavorites } from "@/lib/favorites";

export function RoomCard({ room, delay = 0 }: { room: Room; delay?: number }) {
  const { has, toggle } = useFavorites();
  const fav = has(room.id);

  return (
    <article className="group animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex flex-col md:flex-row gap-6">
        <Link
          to="/room/$id"
          params={{ id: room.id }}
          className="w-full md:w-72 shrink-0 overflow-hidden rounded-2xl relative block bg-stone-200"
        >
          <img
            src={room.image}
            alt={room.title}
            width={800}
            height={1000}
            loading="lazy"
            className="w-full aspect-[4/5] object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              toggle(room.id);
            }}
            aria-label={fav ? "Bỏ khỏi yêu thích" : "Lưu vào yêu thích"}
            className="absolute top-3 right-3 size-9 rounded-full bg-background/90 backdrop-blur grid place-items-center hover:scale-110 transition-transform"
          >
            <Heart
              className={`size-4 ${fav ? "fill-primary text-primary" : "text-foreground"}`}
              strokeWidth={2}
            />
          </button>
        </Link>
        <div className="flex flex-col py-2 flex-1">
          <div className="flex gap-2 mb-3 flex-wrap">
            <span className="px-2 py-1 bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider rounded">
              {room.district}
            </span>
            <span className="px-2 py-1 bg-stone-100 text-muted-foreground text-[10px] font-bold uppercase tracking-wider rounded">
              {room.size}m²
            </span>
          </div>
          <Link to="/room/$id" params={{ id: room.id }}>
            <h3 className="text-2xl font-serif italic font-bold mb-2 group-hover:text-primary transition-colors text-balance">
              {room.title}
            </h3>
          </Link>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6 line-clamp-2">
            {room.description}
          </p>
          <div className="mt-auto flex items-end justify-between">
            <div>
              <span className="text-2xl font-bold text-primary">{formatVND(room.price)}</span>
              <span className="text-muted-foreground text-sm">/tháng</span>
            </div>
            <Link
              to="/room/$id"
              params={{ id: room.id }}
              className="text-sm font-bold border-b-2 border-primary pb-0.5 hover:text-primary transition-colors"
            >
              Xem chi tiết
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
