/**
 * Continua Relevance Scoring Engine
 *
 * Scores how relevant a workspace resource is based on
 * recency, frequency, dwell time, relatedness, and current state.
 *
 * Used by the restore flow to prioritize which resources to restore
 * on a new device.
 */

import type { WorkspaceResource, RelevanceFactors } from '@/lib/continuity/types';

// ─── Scoring Weights ───────────────────────────────────────

const WEIGHTS = {
  recency: 0.35,     // More recent = higher score
  frequency: 0.25,   // Accessed more often = higher score
  dwellTime: 0.20,   // Spent more time = higher score
  relatedness: 0.10, // More related resources = higher score
  currentlyOpen: 0.10, // Still open = highest priority
};

// ─── Scoring Functions ─────────────────────────────────────

function scoreRecency(lastAccessedMs: number, nowMs: number): number {
  const ageMs = nowMs - lastAccessedMs;
  const ageHours = ageMs / (1000 * 60 * 60);

  // Within last hour: 1.0
  // Within last 6 hours: 0.8
  // Within last 24 hours: 0.5
  // Within last 7 days: 0.2
  // Older: 0.05
  if (ageHours < 1) return 1.0;
  if (ageHours < 6) return 0.8;
  if (ageHours < 24) return 0.5;
  if (ageHours < 168) return 0.2;
  return 0.05;
}

function scoreFrequency(accessCount: number, hoursSinceFirst: number): number {
  if (hoursSinceFirst <= 0) return 0.5;
  const accessesPerHour = accessCount / Math.max(hoursSinceFirst, 1);

  // > 2/hour: 1.0
  // > 0.5/hour: 0.7
  // > 0.1/hour: 0.4
  // Less: 0.1
  if (accessesPerHour > 2) return 1.0;
  if (accessesPerHour > 0.5) return 0.7;
  if (accessesPerHour > 0.1) return 0.4;
  return 0.1;
}

function scoreDwellTime(dwellTimeMs: number): number {
  const minutes = dwellTimeMs / (1000 * 60);

  // > 30 min: 1.0
  // > 10 min: 0.7
  // > 2 min: 0.4
  // Less: 0.1
  if (minutes > 30) return 1.0;
  if (minutes > 10) return 0.7;
  if (minutes > 2) return 0.4;
  return 0.1;
}

function scoreRelatedness(resourceIndex: number, totalResources: number): number {
  // Resources that are part of a larger set are more likely related
  if (totalResources <= 1) return 0.3;
  if (totalResources <= 5) return 0.6;
  if (totalResources <= 15) return 0.8;
  return 1.0;
}

function scoreCurrentlyOpen(resource: WorkspaceResource, activeResources: Set<string>): number {
  return activeResources.has(resource.id) ? 1.0 : 0.0;
}

// ─── Main Scoring Function ─────────────────────────────────

export function scoreRelevance(
  resource: WorkspaceResource,
  allResources: WorkspaceResource[],
  activeResources: Set<string>,
  nowMs: number = Date.now()
): number {
  const factors: RelevanceFactors = {
    recencyMs: nowMs - resource.lastAccessed,
    frequency: resource.accessCount,
    dwellTimeMs: resource.dwellTimeMs,
    relatedCount: allResources.length - 1,
    isCurrentlyOpen: activeResources.has(resource.id),
  };

  const hoursSinceFirst = (nowMs - resource.firstAccessed) / (1000 * 60 * 60);

  const scores = {
    recency: scoreRecency(resource.lastAccessed, nowMs),
    frequency: scoreFrequency(resource.accessCount, hoursSinceFirst),
    dwellTime: scoreDwellTime(resource.dwellTimeMs),
    relatedness: scoreRelatedness(
      allResources.indexOf(resource),
      allResources.length
    ),
    currentlyOpen: scoreCurrentlyOpen(resource, activeResources),
  };

  const weighted =
    scores.recency * WEIGHTS.recency +
    scores.frequency * WEIGHTS.frequency +
    scores.dwellTime * WEIGHTS.dwellTime +
    scores.relatedness * WEIGHTS.relatedness +
    scores.currentlyOpen * WEIGHTS.currentlyOpen;

  return Math.round(weighted * 100) / 100; // 2 decimal places
}

// ─── Relevance Classification ──────────────────────────────

export function classifyRelevance(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.6) return 'high';
  if (score >= 0.3) return 'medium';
  return 'low';
}

// ─── Batch Scoring ─────────────────────────────────────────

export function scoreAllResources(
  resources: WorkspaceResource[],
  activeResources: Set<string> = new Set()
): Array<{ resource: WorkspaceResource; score: number; relevance: 'high' | 'medium' | 'low' }> {
  const now = Date.now();

  return resources
    .map(resource => {
      const score = scoreRelevance(resource, resources, activeResources, now);
      return {
        resource,
        score,
        relevance: classifyRelevance(score),
      };
    })
    .sort((a, b) => b.score - a.score); // Highest relevance first
}

// ─── Restore Priority ──────────────────────────────────────

export function getRestorePriority(
  resources: WorkspaceResource[],
  activeResources: Set<string> = new Set()
): { high: WorkspaceResource[]; medium: WorkspaceResource[]; low: WorkspaceResource[] } {
  const scored = scoreAllResources(resources, activeResources);

  return {
    high: scored.filter(s => s.relevance === 'high').map(s => s.resource),
    medium: scored.filter(s => s.relevance === 'medium').map(s => s.resource),
    low: scored.filter(s => s.relevance === 'low').map(s => s.resource),
  };
}
