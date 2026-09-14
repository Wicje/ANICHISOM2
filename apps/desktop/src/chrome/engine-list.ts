/** Search engines supported by the omnibox and the settings panel. */
export const ENGINES = ["google", "duckduckgo", "bing", "brave"] as const;
export type EngineId = (typeof ENGINES)[number];

export const DEFAULT_ENGINE: EngineId = "google";