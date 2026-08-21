import type { ReactNode } from "react";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return (
    <input
      {...props}
      className={
        "w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-foreground/40 text-sm " +
        (props.className ?? "")
      }
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={
        "w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-foreground/40 text-sm " +
        (props.className ?? "")
      }
    />
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-background w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        <div className="flex items-center justify-between px-6 sm:px-8 pt-6 sm:pt-8 pb-4 border-b border-border shrink-0">
          <h2 className="text-xl sm:text-2xl font-serif italic font-bold truncate pr-4">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none shrink-0"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-6 sm:px-8 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        "inline-flex items-center justify-center gap-2 bg-foreground text-background px-5 py-2.5 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-50 " +
        (props.className ?? "")
      }
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        "inline-flex items-center justify-center gap-2 border border-border px-5 py-2.5 rounded-full font-medium hover:bg-foreground/5 transition-colors " +
        (props.className ?? "")
      }
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
    <div className="border border-dashed border-border rounded-3xl p-12 text-center">
      <div className="mx-auto text-muted-foreground mb-4 flex justify-center">{icon}</div>
      <h3 className="font-serif italic text-2xl mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
      {action}
    </div>
  );
}
