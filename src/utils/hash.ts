export function hashString(input: string): string {
  // A tiny deterministic hash is enough here because we only need
  // stable file names for temp cache entries, not cryptographic safety.
  let hash = 5381;

  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }

  return Math.abs(hash >>> 0).toString(36);
}
