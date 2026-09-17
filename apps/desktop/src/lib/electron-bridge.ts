/**
 * Continua Electron bridge — deprecated shim (ADR-008).
 * The unified contract lives in tauri-bridge.ts (Electron-first invoke).
 * This file re-exports it so old imports keep working with zero drift.
 */
export * from "./tauri-bridge";
