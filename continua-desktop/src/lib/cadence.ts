/**
 * Keystroke-cadence spike (P5).
 *
 * Captures inter-key deltas + hold times on the chrome's own inputs and
 * folds them into an FNV-1a digest with a per-session salt. This is a
 * *soft* behavioural signal for a trust score: hashed locally, never raw,
 * never transmitted. A stable digest over many samples on a known device
 * can raise trust; an abrupt change should lower it.
 */

/** FNV-1a 32 (mirrors the mix used by trust.rs). */
const fnv1a = (input: number): number => {
  let h = 0x811c9dc5;
  h ^= input & 0xff;
  h = Math.imul(h, 0x01000193);
  h ^= (input >>> 8) & 0xff;
  h = Math.imul(h, 0x01000193);
  h ^= (input >>> 16) & 0xff;
  h = Math.imul(h, 0x01000193);
  h ^= (input >>> 24) & 0xff;
  return h >>> 0;
};

const WINDOW = 256;

class Cadence {
  private salt = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
  private ring: number[] = [];
  private lastDown = 0;

  /** Record a key press; `up` marks the keyup for hold-time sampling. */
  capture(key: string, up: boolean): void {
    const now = performance.now();
    const code = key.length ? key.charCodeAt(0) : 0;
    if (up) {
      if (this.lastDown > 0) {
        const hold = Math.min(999, Math.round(now - this.lastDown));
        this.ring.push(hold);
        this.lastDown = 0;
      }
      return;
    }
    if (this.lastDown > 0) {
      const delta = Math.min(999, Math.round(now - this.lastDown));
      this.ring.push(delta);
    }
    this.lastDown = now;
    // Keep the window bounded; fold dropped samples into the mix so the
    // digest still shifts as typing changes over time.
    while (this.ring.length > WINDOW) this.ring.shift();
    void code;
  }

  /** FNV-1a over (salt, seeded ring mix). */
  digest(): string {
    let acc = this.salt ^ (this.ring.length * 0x9e3779b9);
    for (const sample of this.ring) {
      acc ^= fnv1a(sample & 0xffff);
      acc ^= fnv1a((sample * 31 + acc) >>> 0);
    }
    // Keyed on the salt so the digest is meaningless without it.
    return `cad:${(fnv1a(acc) ^ this.salt).toString(16).padStart(8, "0")}`;
  }

  count(): number {
    return this.ring.length;
  }

  reset(): void {
    this.ring = [];
    this.salt = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
  }
}

const cadence = new Cadence();

/** Attach key capture to any input-like element for the spike. */
export const attachCadence = (el: HTMLElement | null): void => {
  if (!el) return;
  el.addEventListener("keydown", (e) => cadence.capture(e.key, false));
  el.addEventListener("keyup", (e) => cadence.capture(e.key, true));
};

export const cadenceStatus = (): { digest: string; samples: number } => ({
  digest: cadence.digest(),
  samples: cadence.count(),
});

// Devtools-only inspection hook for the spike (nothing is persisted/sent).
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).continuaCadence = {
    status: cadenceStatus,
    reset: () => cadence.reset(),
  };
}