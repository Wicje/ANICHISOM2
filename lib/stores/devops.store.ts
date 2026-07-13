/**
 * DevOps Zustand Store — deployment & pipeline state for the Developer Pack.
 *
 * Manages deployments, code reviews, pipelines, and API endpoints.
 * Persists to IndexedDB via debounced writes.
 */
import { create } from 'zustand';
import { withPersistence } from '@/lib/stores/persisted-store';

// ─── Types ──────────────────────────────────────────────────────────────

export interface Deployment {
  id: string;
  service: string;
  environment: 'production' | 'staging' | 'development';
  status: 'healthy' | 'degraded' | 'down' | 'deploying' | 'rolled-back';
  version: string;
  deployedAt: number;
  url?: string;
  metrics?: { latency: number; errorRate: number; uptime: number };
  commitSha?: string;
  deployedBy?: string;
}

export interface CodeReview {
  id: string;
  repo: string;
  prNumber: number;
  title: string;
  author: string;
  status: 'open' | 'approved' | 'changes-requested' | 'merged' | 'closed';
  reviewers: string[];
  filesChanged: number;
  additions: number;
  deletions: number;
  labels: string[];
  createdAt: number;
  mergedAt?: number;
}

export interface Pipeline {
  id: string;
  name: string;
  repo: string;
  status: 'running' | 'passed' | 'failed' | 'queued' | 'cancelled';
  stages: Array<{
    name: string;
    status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
    duration?: number;
  }>;
  lastRun: number;
  trigger: 'push' | 'pr' | 'manual' | 'schedule';
  branch: string;
  commitSha: string;
}

export interface ApiEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  lastCheck: number;
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
  requestCount: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function generateId(): string {
  return `devops_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── State ──────────────────────────────────────────────────────────────

interface DevopsState {
  deployments: Record<string, Deployment>;
  reviews: Record<string, CodeReview>;
  pipelines: Record<string, Pipeline>;
  endpoints: Record<string, ApiEndpoint>;
  activeDeploymentId: string | null;
  activeRepoFilter: string | null;

  // ─── Deployment CRUD ─────────────────────────────────────────────
  createDeployment: (service: string, environment: Deployment['environment'], version: string) => string;
  updateDeployment: (id: string, updates: Partial<Omit<Deployment, 'id' | 'deployedAt'>>) => void;
  deleteDeployment: (id: string) => void;
  setActiveDeployment: (id: string | null) => void;
  getDeploymentsByEnvironment: (env: Deployment['environment']) => Deployment[];
  getHealthyDeployments: () => Deployment[];

  // ─── CodeReview CRUD ─────────────────────────────────────────────
  createReview: (repo: string, prNumber: number, title: string, author: string) => string;
  updateReview: (id: string, updates: Partial<Omit<CodeReview, 'id' | 'createdAt'>>) => void;
  deleteReview: (id: string) => void;
  getReviewsByStatus: (status: CodeReview['status']) => CodeReview[];

  // ─── Pipeline CRUD ───────────────────────────────────────────────
  createPipeline: (name: string, repo: string, branch: string, commitSha: string) => string;
  updatePipeline: (id: string, updates: Partial<Omit<Pipeline, 'id' | 'lastRun'>>) => void;
  deletePipeline: (id: string) => void;
  getPipelinesByRepo: (repo: string) => Pipeline[];

  // ─── ApiEndpoint CRUD ────────────────────────────────────────────
  createEndpoint: (name: string, method: ApiEndpoint['method'], url: string) => string;
  updateEndpoint: (id: string, updates: Partial<Omit<ApiEndpoint, 'id'>>) => void;
  deleteEndpoint: (id: string) => void;
  setActiveRepoFilter: (repo: string | null) => void;
  getEndpointsByStatus: (status: ApiEndpoint['status']) => ApiEndpoint[];
  getAverageLatency: () => number;
  getOverallUptime: () => number;
}

export const useDevopsStore = create<DevopsState>((set, get) => ({
  deployments: {},
  reviews: {},
  pipelines: {},
  endpoints: {},
  activeDeploymentId: null,
  activeRepoFilter: null,

  // ─── Deployment CRUD ─────────────────────────────────────────────

  createDeployment: (service, environment, version) => {
    const id = generateId();
    const deployment: Deployment = {
      id,
      service,
      environment,
      status: 'deploying',
      version,
      deployedAt: Date.now(),
    };
    set((s) => {
      const deployments = { ...s.deployments, [id]: deployment };
      return { deployments };
    });
    return id;
  },

  updateDeployment: (id, updates) => {
    set((s) => {
      const existing = s.deployments[id];
      if (!existing) return s;
      const deployments = {
        ...s.deployments,
        [id]: { ...existing, ...updates },
      };
      return { deployments };
    });
  },

  deleteDeployment: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.deployments;
      const activeDeploymentId = s.activeDeploymentId === id ? null : s.activeDeploymentId;
      return { deployments: rest, activeDeploymentId };
    });
  },

  setActiveDeployment: (id) => {
    set({ activeDeploymentId: id });
  },

  getDeploymentsByEnvironment: (env) => {
    return Object.values(get().deployments).filter((d) => d.environment === env);
  },

  getHealthyDeployments: () => {
    return Object.values(get().deployments).filter((d) => d.status === 'healthy');
  },

  // ─── CodeReview CRUD ─────────────────────────────────────────────

  createReview: (repo, prNumber, title, author) => {
    const id = `review_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const review: CodeReview = {
      id,
      repo,
      prNumber,
      title,
      author,
      status: 'open',
      reviewers: [],
      filesChanged: 0,
      additions: 0,
      deletions: 0,
      labels: [],
      createdAt: Date.now(),
    };
    set((s) => {
      const reviews = { ...s.reviews, [id]: review };
      return { reviews };
    });
    return id;
  },

  updateReview: (id, updates) => {
    set((s) => {
      const existing = s.reviews[id];
      if (!existing) return s;
      const reviews = {
        ...s.reviews,
        [id]: { ...existing, ...updates },
      };
      return { reviews };
    });
  },

  deleteReview: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.reviews;
      return { reviews: rest };
    });
  },

  getReviewsByStatus: (status) => {
    return Object.values(get().reviews).filter((r) => r.status === status);
  },

  // ─── Pipeline CRUD ───────────────────────────────────────────────

  createPipeline: (name, repo, branch, commitSha) => {
    const id = `pipe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const pipeline: Pipeline = {
      id,
      name,
      repo,
      status: 'queued',
      stages: [],
      lastRun: Date.now(),
      trigger: 'push',
      branch,
      commitSha,
    };
    set((s) => {
      const pipelines = { ...s.pipelines, [id]: pipeline };
      return { pipelines };
    });
    return id;
  },

  updatePipeline: (id, updates) => {
    set((s) => {
      const existing = s.pipelines[id];
      if (!existing) return s;
      const pipelines = {
        ...s.pipelines,
        [id]: { ...existing, ...updates },
      };
      return { pipelines };
    });
  },

  deletePipeline: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.pipelines;
      return { pipelines: rest };
    });
  },

  getPipelinesByRepo: (repo) => {
    return Object.values(get().pipelines).filter((p) => p.repo === repo);
  },

  // ─── ApiEndpoint CRUD ────────────────────────────────────────────

  createEndpoint: (name, method, url) => {
    const id = `ep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const endpoint: ApiEndpoint = {
      id,
      name,
      method,
      url,
      status: 'healthy',
      latency: 0,
      lastCheck: Date.now(),
      p50: 0,
      p95: 0,
      p99: 0,
      errorRate: 0,
      requestCount: 0,
    };
    set((s) => {
      const endpoints = { ...s.endpoints, [id]: endpoint };
      return { endpoints };
    });
    return id;
  },

  updateEndpoint: (id, updates) => {
    set((s) => {
      const existing = s.endpoints[id];
      if (!existing) return s;
      const endpoints = {
        ...s.endpoints,
        [id]: { ...existing, ...updates },
      };
      return { endpoints };
    });
  },

  deleteEndpoint: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.endpoints;
      return { endpoints: rest };
    });
  },

  setActiveRepoFilter: (repo) => {
    set({ activeRepoFilter: repo });
  },

  getEndpointsByStatus: (status) => {
    return Object.values(get().endpoints).filter((e) => e.status === status);
  },

  getAverageLatency: () => {
    const eps = Object.values(get().endpoints);
    if (eps.length === 0) return 0;
    return eps.reduce((sum, e) => sum + e.latency, 0) / eps.length;
  },

  getOverallUptime: () => {
    const eps = Object.values(get().endpoints);
    if (eps.length === 0) return 0;
    const healthyCount = eps.filter((e) => e.status === 'healthy').length;
    return (healthyCount / eps.length) * 100;
  },
}));

withPersistence(useDevopsStore, 'devops-state', ['deployments', 'reviews', 'pipelines', 'endpoints', 'activeDeploymentId', 'activeRepoFilter']);
