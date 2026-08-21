/**
 * Joins class names, dropping falsy entries.
 *
 * Deliberately dependency-free: the previous `clsx` + `tailwind-merge` pair was
 * removed with the shadcn components. Because this does *not* resolve Tailwind
 * conflicts, components here accept `className` only to **add** classes
 * (layout, sizing, extra states) — never to override a colour or spacing the
 * component already sets. Where a real variation is needed, add a prop.
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
