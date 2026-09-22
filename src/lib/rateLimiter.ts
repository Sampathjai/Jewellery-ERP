/**
 * Client-side / Session-based Brute Force Rate Limiter
 * Tracks failed authentication attempts to protect against credential stuffing
 */

interface AttemptRecord {
  count: number;
  firstAttemptTime: number;
  lastAttemptTime: number;
  lockedUntil?: number;
}

const STORAGE_PREFIX = 'erp_rl_';
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

export const rateLimiter = {
  getRecord(key: string): AttemptRecord | null {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return null;
      const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isRateLimited(key: string, maxAttempts = DEFAULT_MAX_ATTEMPTS, lockoutMs = DEFAULT_LOCKOUT_MS): { limited: boolean; remainingSeconds: number } {
    const record = this.getRecord(key);
    if (!record) return { limited: false, remainingSeconds: 0 };

    const now = Date.now();

    // Check if locked
    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { limited: true, remainingSeconds };
    }

    // Check if max attempts reached within window
    if (record.count >= maxAttempts) {
      const lockUntil = record.lastAttemptTime + lockoutMs;
      if (lockUntil > now) {
        const remainingSeconds = Math.ceil((lockUntil - now) / 1000);
        return { limited: true, remainingSeconds };
      }
    }

    return { limited: false, remainingSeconds: 0 };
  },

  recordFailure(key: string, maxAttempts = DEFAULT_MAX_ATTEMPTS, lockoutMs = DEFAULT_LOCKOUT_MS): { limited: boolean; remainingSeconds: number } {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) {
        return { limited: false, remainingSeconds: 0 };
      }

      const now = Date.now();
      let record = this.getRecord(key);

      if (!record || (record.lockedUntil && record.lockedUntil <= now)) {
        record = {
          count: 1,
          firstAttemptTime: now,
          lastAttemptTime: now,
        };
      } else {
        record.count += 1;
        record.lastAttemptTime = now;
      }

      if (record.count >= maxAttempts) {
        record.lockedUntil = now + lockoutMs;
      }

      sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(record));

      if (record.lockedUntil && record.lockedUntil > now) {
        return {
          limited: true,
          remainingSeconds: Math.ceil((record.lockedUntil - now) / 1000),
        };
      }

      return { limited: false, remainingSeconds: 0 };
    } catch {
      return { limited: false, remainingSeconds: 0 };
    }
  },

  reset(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(STORAGE_PREFIX + key);
      }
    } catch {
      // Ignore storage errors
    }
  },
};

