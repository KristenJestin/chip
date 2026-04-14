/** Returns the current time as a Unix timestamp (seconds). */
export function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}
