export function formatDate(ts: number | null | undefined): string {
  if (ts == null) return "—";
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

export function formatDateTime(ts: number | null | undefined): string {
  if (ts == null) return "—";
  return new Date(ts * 1000).toISOString().slice(0, 16).replace("T", " ");
}

export function statusBadge(status: string): string {
  return `[${status}]`;
}

export function sep(width = 56): string {
  return "─".repeat(width);
}

/** Pads a string to the given width (truncates if longer). */
export function pad(s: string, width: number): string {
  if (s.length >= width) return s;
  return s + " ".repeat(width - s.length);
}
