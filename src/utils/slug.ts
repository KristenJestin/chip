/**
 * Converts a title to a kebab-case slug, stripping diacritics.
 * Max 64 chars.
 */
export function toSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumeric → dash
    .replace(/^-+|-+$/g, "") // trim leading/trailing dashes
    .slice(0, 64);
}

/**
 * Returns a unique slug by appending -2, -3, etc. if the base already exists.
 */
export function uniqueSlug(base: string, existing: string[]): string {
  if (!existing.includes(base)) return base;
  let n = 2;
  while (existing.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
