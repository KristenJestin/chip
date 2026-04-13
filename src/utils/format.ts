import chalk from "chalk";

type ChalkFn = (s: string) => string;

const STATUS_CHALK: Record<string, ChalkFn> = {
  // feature statuses
  active: (s) => chalk.blue(s),
  done: (s) => chalk.green(s),
  archived: (s) => chalk.dim(s),
  // phase / task statuses
  todo: (s) => chalk.gray(s),
  "in-progress": (s) => chalk.yellow(s),
  review: (s) => chalk.cyan(s),
};

export function formatDate(ts: number | null | undefined): string {
  if (ts == null) return "—";
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

export function formatDateTime(ts: number | null | undefined): string {
  if (ts == null) return "—";
  return new Date(ts * 1000).toISOString().slice(0, 16).replace("T", " ");
}

export function statusBadge(status: string): string {
  const badge = `[${status}]`;
  return STATUS_CHALK[status]?.(badge) ?? badge;
}

export function sep(width = 56): string {
  return "─".repeat(width);
}

/** Pads a string to the given width (does not truncate if longer). */
export function pad(s: string, width: number): string {
  if (s.length >= width) return s;
  return s + " ".repeat(width - s.length);
}
