/**
 * Continua Event Journal — S4 Envelope Contract
 *
 * The single shared shape every capture path emits: Rust daemon, web sensor,
 * future mobile sensors. See docs/CONTINUA_CORE_ARCHITECTURE.md §S4.
 *
 * Principles (architecture invariants):
 *   - capture never blocks: events are written locally first, synced later
 *   - importance is assigned deterministically at capture time; AI
 *     interpretation is a later, separate consumer — never on the hot path
 *   - cloud receives milestones/checkpoints (importance >= MIN_SYNC), raw
 *     low-importance noise stays local until aggregated/purged
 */

/** L0 noise … L4 checkpoint */
export type Importance = 0 | 1 | 2 | 3 | 4;

export const IMPORTANCE = {
  NOISE: 0,
  LOW: 1,
  ACTIVITY: 2,
  MILESTONE: 3,
  CHECKPOINT: 4,
} as const satisfies Record<string, Importance>;

/**
 * Events at or above this bar are eligible for batched cloud sync.
 * Raw L0–L2 remains local-only until interpretation/aggregation.
 */
export const MIN_SYNC_IMPORTANCE: Importance = IMPORTANCE.MILESTONE;

/**
 * Closed, namespaced kind set. Adding a kind is a protocol change:
 * update this union, the Rust mirror, and the DB check constraint together.
 */
export const JOURNAL_EVENT_KINDS = [
  'session.start',
  'session.end',
  'app.focus',
  'window.title',
  'git.branch',
  'git.commit',
  'git.push',
  'checkpoint.manual',
] as const;

export type JournalEventKind = (typeof JOURNAL_EVENT_KINDS)[number];

export function isJournalEventKind(v: unknown): v is JournalEventKind {
  return typeof v === 'string' && (JOURNAL_EVENT_KINDS as readonly string[]).includes(v);
}

/** Deterministic default importance per kind (capture-time classification). */
const KIND_IMPORTANCE: Record<JournalEventKind, Importance> = {
  'session.start': IMPORTANCE.ACTIVITY,
  'session.end': IMPORTANCE.CHECKPOINT, // session termination flushes state
  'app.focus': IMPORTANCE.LOW,
  'window.title': IMPORTANCE.NOISE,
  'git.branch': IMPORTANCE.ACTIVITY,
  'git.commit': IMPORTANCE.MILESTONE,
  'git.push': IMPORTANCE.MILESTONE,
  'checkpoint.manual': IMPORTANCE.CHECKPOINT,
};

export function classifyImportance(kind: JournalEventKind): Importance {
  return KIND_IMPORTANCE[kind];
}

/** S4 envelope. `payload` is kind-specific and already privacy-tiered upstream. */
export interface JournalEvent {
  id: string;
  /** Epoch milliseconds (device clock). */
  ts: number;
  /** Emitting device id (e.g. "daemon-1a2b3c4d"). */
  device: string;
  kind: JournalEventKind;
  importance: Importance;
  /** Optional org/project slice key (e.g. repo name). Never a secret. */
  projectTag?: string;
  payload?: Record<string, unknown>;
}

export interface JournalEventInput {
  id?: string;
  ts?: number;
  device: string;
  kind: JournalEventKind;
  importance?: Importance;
  projectTag?: string;
  payload?: Record<string, unknown>;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Structural validation for wire-format ingestion (defense-in-depth). */
export function isJournalEvent(v: unknown): v is JournalEvent {
  if (!isRecord(v)) return false;
  if (typeof v.id !== 'string' || v.id.length === 0 || v.id.length > 128) return false;
  if (typeof v.ts !== 'number' || !Number.isFinite(v.ts) || v.ts <= 0) return false;
  if (!isJournalEventKind(v.kind)) return false;
  const imp = v.importance;
  if (typeof imp !== 'number' || !Number.isInteger(imp) || imp < 0 || imp > 4) return false;
  if (typeof v.device !== 'string' || v.device.length === 0 || v.device.length > 128) return false;
  if (v.projectTag !== undefined && (typeof v.projectTag !== 'string' || v.projectTag.length > 256)) return false;
  if (v.payload !== undefined && !isRecord(v.payload)) return false;
  return true;
}

/**
 * Build a validated envelope from capture input, filling defaults.
 * Capture paths call this instead of hand-rolling objects so the contract
 * stays honest across sensors.
 */
export function makeJournalEvent(input: JournalEventInput): JournalEvent {
  const kind = input.kind;
  return {
    id: input.id ?? crypto.randomUUID(),
    ts: input.ts ?? Date.now(),
    device: input.device,
    kind,
    importance: input.importance ?? classifyImportance(kind),
    ...(input.projectTag ? { projectTag: input.projectTag.slice(0, 256) } : {}),
    ...(input.payload ? { payload: input.payload } : {}),
  };
}
