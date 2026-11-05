// Counts failed logins per IP address and username, in memory.
// On Vercel each server instance keeps its own count, so the limit is per instance.
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MS = 15 * 60 * 1000;

export function createLoginLimiter({ max = MAX_FAILED_LOGINS, windowMs = LOCK_MS, now = () => Date.now() } = {}) {
  const failures = new Map();

  function key(ip, username) {
    return `${ip}|${String(username).toLowerCase()}`;
  }

  function prune() {
    const time = now();
    for (const [k, entry] of failures) {
      if (entry.resetAt <= time) failures.delete(k);
    }
  }

  return {
    // seconds until the next try is allowed, or 0 when a try is allowed now
    retryAfter(ip, username) {
      const entry = failures.get(key(ip, username));
      if (!entry || entry.resetAt <= now()) return 0;
      return entry.count >= max ? Math.ceil((entry.resetAt - now()) / 1000) : 0;
    },
    fail(ip, username) {
      if (failures.size > 10000) prune();
      const k = key(ip, username);
      const entry = failures.get(k);
      if (!entry || entry.resetAt <= now()) {
        failures.set(k, { count: 1, resetAt: now() + windowMs });
      } else {
        entry.count += 1;
      }
    },
    succeed(ip, username) {
      failures.delete(key(ip, username));
    }
  };
}

export default createLoginLimiter();
