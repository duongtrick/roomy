import { useEffect, useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5"
      >
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * Controls are `h-12` on touch screens and `h-10` from `sm` up. The base font
 * size is set to 16px for coarse pointers in styles.css, which is what stops
 * iOS Safari zooming the page when a field takes focus.
 */
const controlClass =
  "w-full h-12 sm:h-10 px-4 rounded-xl border border-border bg-background text-base sm:text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-foreground/40 transition";

export function TextInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(controlClass, className)} />;
}

/**
 * `appearance-none` gives the field the same box as the text inputs, so the
 * chevron has to be drawn back in — without it the control reads as a plain
 * text box and nobody realises it opens a list.
 */
const CHEVRON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  );

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        backgroundImage: `url("${CHEVRON}")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.75rem center",
        ...props.style,
      }}
      className={cn(controlClass, "appearance-none pr-10", className)}
    />
  );
}

export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(controlClass, "h-auto sm:h-auto py-3 leading-relaxed", className)}
    />
  );
}

/**
 * Full-screen dialog on desktop, bottom sheet on phones.
 *
 * The sheet keeps its action row pinned below the scroll area so "Lưu" is
 * always reachable without scrolling to the end of a long form, and pads for
 * the iOS home indicator.
 */
export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    // Stop the page behind the sheet from scrolling with it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="bg-background w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] shadow-2xl animate-in slide-in-from-bottom duration-200 sm:zoom-in-95 sm:slide-in-from-bottom-0"
      >
        {/* Grab handle — signals "drag/swipe down to dismiss" on touch. */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
          <span className="h-1 w-10 rounded-full bg-foreground/15" />
        </div>

        <div className="flex items-center justify-between gap-3 px-5 sm:px-8 pt-3 sm:pt-8 pb-4 border-b border-border shrink-0">
          <h2 id={titleId} className="text-lg sm:text-2xl font-serif italic font-bold truncate">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="shrink-0 size-10 -mr-2 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 active:scale-95 transition"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-5 sm:px-8 py-5 flex-1">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-border px-5 sm:px-8 py-3 pb-safe bg-background">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 h-12 sm:h-10 px-5 rounded-full font-medium " +
  "transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

export function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(buttonBase, "bg-foreground text-background hover:opacity-90", className)}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(buttonBase, "border border-border hover:bg-foreground/5", className)}
    >
      {children}
    </button>
  );
}

/** Square 44px icon button — the minimum comfortable touch target. */
export function IconButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-grid place-items-center size-11 rounded-full text-muted-foreground",
        "hover:text-foreground hover:bg-foreground/5 active:scale-95 transition",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-border rounded-3xl px-6 py-10 sm:p-12 text-center">
      <div className="mx-auto text-muted-foreground mb-4 flex justify-center">{icon}</div>
      <h3 className="font-serif italic text-xl sm:text-2xl mb-2">{title}</h3>
      <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-md mx-auto">
        {description}
      </p>
      {action}
    </div>
  );
}

/** Section header used at the top of every dashboard tab. */
export function TabHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h2 className="text-xl sm:text-2xl font-serif italic font-bold">{title}</h2>
        {subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * One record rendered as a card. Dashboard tabs show these below `lg` and a
 * table above it — a 10-column table on a 375px screen pushed ~64% of its
 * content off-screen behind a horizontal scroll nobody discovers.
 */
export function RecordCard({
  title,
  subtitle,
  badge,
  rows,
  actions,
  onClick,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  rows: { label: string; value: ReactNode }[];
  actions?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <li
      onClick={onClick}
      className={cn(
        "border border-border rounded-2xl p-4 bg-background",
        onClick &&
          "cursor-pointer hover:border-foreground/30 active:bg-foreground/[0.02] transition-colors",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium truncate">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
        </div>
        {badge}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="min-w-0">
            <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{r.label}</dt>
            <dd className="truncate font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>

      {actions && (
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-end gap-1">
          {actions}
        </div>
      )}
    </li>
  );
}
