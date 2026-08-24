/**
 * Central configuration — all constants in one place.
 * No more magic numbers scattered across files.
 */

// ─── API Endpoints ────────────────────────────────────────────────────────

export const API = {
  AUTH_SESSION: '/api/auth/session',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_SOCKET_TOKEN: '/api/auth/socket-token',
  WORKSPACE_SYNC: '/api/workspaces/sync',
  STORAGE_FILES: '/api/storage/files',
  AI_CHAT: '/api/ai/chat',
  AI_MODELS: '/api/ai/models',
  PLUGINS: '/api/plugins',
  ADMIN_USERS: '/api/admin/users',
  ADMIN_DASHBOARD: '/api/admin/dashboard',
} as const;

// ─── WebSocket ────────────────────────────────────────────────────────────

export const WS = {
  YJS_PORT: 1234,
  YJS_URL: typeof window !== 'undefined'
    ? `ws://${window.location.hostname}:1234`
    : 'ws://localhost:1234',
  MAX_CONNECTIONS_PER_IP: 10,
} as const;

// ─── Session ──────────────────────────────────────────────────────────────

export const SESSION = {
  COOKIE_NAME: 'continuaos_session',
  TTL_MS: 30 * 24 * 60 * 60 * 1000, // 30 days
  DEV_TTL_MS: 24 * 60 * 60 * 1000,  // 24 hours
  MAX_SESSIONS: 5000,
  SOCKET_TOKEN_TTL_MS: 5 * 60 * 1000, // 5 minutes
  CHALLENGE_TTL_MS: 60 * 1000, // 1 minute
} as const;

// ─── Rate Limits (requests, window ms) ────────────────────────────────────

export const RATE_LIMITS = {
  AI_CHAT: { max: 30, windowMs: 60 * 1000 },
  AUTH_LOGIN: { max: 10, windowMs: 5 * 60 * 1000 },
  AUTH_SESSION: { max: 100, windowMs: 5 * 60 * 1000 },
  ADMIN_USERS: { max: 50, windowMs: 5 * 60 * 1000 },
  ADMIN_DASHBOARD: { max: 30, windowMs: 5 * 60 * 1000 },
  PLUGINS: { max: 60, windowMs: 60 * 1000 },
  STORAGE: { max: 30, windowMs: 60 * 1000 },
  PASSKEY: { max: 10, windowMs: 5 * 60 * 1000 },
  PROXY: { max: 20, windowMs: 60 * 1000 },
  ADMIN_INVITES: { max: 30, windowMs: 5 * 60 * 1000 },
  VITALS: { max: 60, windowMs: 60 * 1000 },
  CONNECT_PAIR: { max: 30, windowMs: 5 * 60 * 1000 },
} as const;

// ─── Timeouts ─────────────────────────────────────────────────────────────

export const TIMEOUTS = {
  IDLE_LOCK_MS: 5 * 60 * 1000, // 5 minutes
  PERSIST_DEBOUNCE_MS: 2000,
  PWA_SNAPSHOT_INTERVAL_MS: 30 * 1000,
  SESSION_CHECK_DEBOUNCE_MS: 2000,
  FILE_LOCK_MS: 30 * 60 * 1000, // 30 minutes
  HEARTBEAT_MS: 15 * 1000,
  PERSIST_BATCH_SIZE: 5,
  PERSIST_BATCH_DELAY_MS: 500,
} as const;

// ─── File System ──────────────────────────────────────────────────────────

export const FS = {
  OPFS_ROOT: 'continuaos',
  MAX_FILE_SIZE_MB: 50,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  ALLOWED_DOC_TYPES: ['application/pdf', 'text/plain', 'text/markdown'],
} as const;

// ─── UI ───────────────────────────────────────────────────────────────────

export const UI = {
  MOBILE_BREAKPOINT: 768,
  DOCK_SIZE: 56,
  MENU_BAR_HEIGHT: 32,
  WINDOW_MIN_WIDTH: 300,
  WINDOW_MIN_HEIGHT: 200,
  DEFAULT_WINDOW_WIDTH: 800,
  DEFAULT_WINDOW_HEIGHT: 600,
  MAX_WIDGETS: 50,
  MAX_RECENT_APPS: 10,
} as const;

// ─── Storage Keys ─────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  USER_CACHE: 'continuaos_os_user_cache',
  DESKTOP_STATE: 'continuaos_os_desktop',
  FEEDBACK: 'continuaos-feedback-state',
  BRAND: 'continuaos-brand-state',
  CLOTHING: 'continuaos-clothing-state',
  FORENSICS: 'continuaos-forensics-state',
  HARDWARE: 'continuaos-hardware-state',
  SIDE_GIGS: 'continuaos-sidegigs-state',
  PHOTOGRAPHY: 'continuaos-photography-state',
  DEVOPS: 'continuaos-devops-state',
  PRIVACY: 'continuaos-privacy-state',
  ONBOARDING: 'continuaos-onboarding-state',
  REGISTRY: 'continuaos-registry-state',
} as const;

// ─── Plugin System ────────────────────────────────────────────────────────

export const PLUGIN = {
  SANDBOX_ORIGIN: 'about:blank',
  MAX_PERMISSIONS: 20,
  ALLOWED_ORIGINS: [] as string[],
} as const;
