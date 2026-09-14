import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a unique ID with an optional prefix.
 * Uses crypto.randomUUID when available, falls back to timestamp+random.
 */
export function generateId(prefix?: string): string {
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return prefix ? `${prefix}_${id}` : id;
}
