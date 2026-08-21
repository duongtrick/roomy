import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Clock, MapPin, Trash2, X } from "lucide-react";
import { Nav, Footer } from "@/components/Nav";
import { useBookings, statusLabel, type BookingStatus } from "@/lib/bookings";
import { formatDate } from "@/lib/format";
import { getRoom } from "@/lib/rooms";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "Lịch xem phòng của tôi — Roomy.tn" },
      { name: "description", content: "Theo dõi trạng thái các lịch xem phòng đã đặt." },
    ],
  }),
  component: BookingsPage,
});

const statusClass: Record<BookingStatus, string> = {
  pending: "bg-primary/10 text-primary",
  confirmed: "bg-accent/10 text-accent",
  cancelled: "bg-foreground/10 text-muted-foreground line-through",
};

function BookingsPage() {
  const { bookings, cancel, remove } = useBookings();

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-12">
        <div className="mb-8 md:mb-12 animate-fade-up">
          <span className="text-xs uppercase tracking-widest font-bold text-primary">Quản lý</span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif italic font-semibold mt-2 md:mt-3 text-balance">
            Lịch xem phòng của tôi
          </h1>
          <p className="text-muted-foreground mt-4 max-w-xl">
            Theo dõi trạng thái xác nhận từ chủ trọ. Yêu cầu mới thường được xác nhận trong vòng vài
            phút.
          </p>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-3xl">
            <p className="font-serif italic text-2xl mb-4">Bạn chưa đặt lịch xem phòng nào.</p>
            <Link
              to="/"
              className="inline-flex items-center justify-center bg-primary text-primary-foreground px-6 h-12 rounded-full font-bold active:scale-95 transition"
            >
              Khám phá phòng trọ
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b, i) => {
              const room = getRoom(b.roomId);
              return (
                <article
                  key={b.id}
                  className="p-4 sm:p-6 bg-card rounded-3xl ring-1 ring-foreground/5 animate-fade-up flex flex-col sm:flex-row gap-4 sm:gap-6"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {room && (
                    <Link
                      to="/room/$id"
                      params={{ id: room.id }}
                      className="w-full sm:w-40 shrink-0 rounded-2xl overflow-hidden bg-stone-200"
                    >
                      <img
                        src={room.image}
                        alt={room.title}
                        className="w-full aspect-[4/3] object-cover"
                      />
                    </Link>
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <Link
                          to="/room/$id"
                          params={{ id: b.roomId }}
                          className="font-serif italic font-bold text-xl hover:text-primary transition-colors"
                        >
                          {b.roomTitle}
                        </Link>
                        {room && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="size-3" /> {room.address}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusClass[b.status]}`}
                      >
                        {b.status === "pending" && (
                          <span className="inline-block size-1.5 rounded-full bg-primary mr-1.5 align-middle animate-pulse" />
                        )}
                        {statusLabel(b.status)}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="size-4" /> {formatDate(b.date)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="size-4" /> {b.time}
                      </span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {b.name} · {b.phone}
                      </span>
                    </div>

                    {b.note && (
                      <p className="mt-3 text-sm text-muted-foreground italic font-serif">
                        "{b.note}"
                      </p>
                    )}

                    <div className="mt-5 flex gap-2">
                      {b.status !== "cancelled" && (
                        <button
                          type="button"
                          onClick={() => cancel(b.id)}
                          className="text-xs font-bold uppercase tracking-wider px-4 h-11 rounded-full border border-border hover:bg-foreground/5 active:scale-95 transition inline-flex items-center gap-1.5"
                        >
                          <X className="size-3" /> Hủy lịch
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(b.id)}
                        className="text-xs font-bold uppercase tracking-wider px-4 h-11 rounded-full text-muted-foreground hover:text-destructive active:scale-95 transition inline-flex items-center gap-1.5"
                      >
                        <Trash2 className="size-3" /> Xoá
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
