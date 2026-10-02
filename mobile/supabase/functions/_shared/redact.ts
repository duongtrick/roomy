export function redact(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b(?:\+?84|0)(?:\d[\s.-]?){8,10}\b/g, "[phone]")
    .replace(/\b\d{9,12}\b/g, "[number]");
}
