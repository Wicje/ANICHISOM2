import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDevopsStore } from '@/lib/stores/devops.store';

describe('DevopsStore', () => {
  beforeEach(() => {
    useDevopsStore.setState({
      deployments: {},
      reviews: {},
      pipelines: {},
      endpoints: {},
      activeDeploymentId: null,
      activeRepoFilter: null,
    });
    vi.clearAllTimers();
  });

  // ─── Deployments ────────────────────────────────────────────────

  describe('createDeployment', () => {
    it('should create a deployment and return its ID', () => {
      const id = useDevopsStore.getState().createDeployment('api', 'production', '1.0.0');
      expect(id).toMatch(/^devops_/);
      const d = useDevopsStore.getState().deployments[id];
      expect(d).toBeDefined();
      expect(d.service).toBe('api');
      expect(d.environment).toBe('production');
      expect(d.version).toBe('1.0.0');
      expect(d.status).toBe('deploying');
    });
  });

  describe('updateDeployment', () => {
    it('should update deployment status', () => {
      const id = useDevopsStore.getState().createDeployment('web', 'staging', '2.0.0');
      useDevopsStore.getState().updateDeployment(id, { status: 'healthy' });
      expect(useDevopsStore.getState().deployments[id].status).toBe('healthy');
    });

    it('should not create new deployments for unknown IDs', () => {
      useDevopsStore.getState().updateDeployment('nonexistent', { status: 'down' });
      expect(useDevopsStore.getState().deployments['nonexistent']).toBeUndefined();
    });
  });

  describe('deleteDeployment', () => {
    it('should remove deployment from store', () => {
      const id = useDevopsStore.getState().createDeployment('api', 'production', '1.0.0');
      useDevopsStore.getState().deleteDeployment(id);
      expect(useDevopsStore.getState().deployments[id]).toBeUndefined();
    });

    it('should clear activeDeploymentId if deleting active deployment', () => {
      const id = useDevopsStore.getState().createDeployment('api', 'production', '1.0.0');
      useDevopsStore.getState().setActiveDeployment(id);
      useDevopsStore.getState().deleteDeployment(id);
      expect(useDevopsStore.getState().activeDeploymentId).toBeNull();
    });
  });

  describe('getDeploymentsByEnvironment', () => {
    it('should filter deployments by environment', () => {
      useDevopsStore.getState().createDeployment('api', 'production', '1.0.0');
      useDevopsStore.getState().createDeployment('web', 'staging', '1.1.0');
      useDevopsStore.getState().createDeployment('worker', 'production', '1.0.1');
      expect(useDevopsStore.getState().getDeploymentsByEnvironment('production')).toHaveLength(2);
      expect(useDevopsStore.getState().getDeploymentsByEnvironment('staging')).toHaveLength(1);
      expect(useDevopsStore.getState().getDeploymentsByEnvironment('development')).toHaveLength(0);
    });
  });

  describe('getHealthyDeployments', () => {
    it('should return only healthy deployments', () => {
      const id1 = useDevopsStore.getState().createDeployment('api', 'production', '1.0.0');
      const id2 = useDevopsStore.getState().createDeployment('web', 'production', '2.0.0');
      useDevopsStore.getState().updateDeployment(id1, { status: 'healthy' });
      useDevopsStore.getState().updateDeployment(id2, { status: 'down' });
      expect(useDevopsStore.getState().getHealthyDeployments()).toHaveLength(1);
      expect(useDevopsStore.getState().getHealthyDeployments()[0].id).toBe(id1);
    });
  });

  // ─── Code Reviews ───────────────────────────────────────────────

  describe('createReview', () => {
    it('should create a review and return its ID', () => {
      const id = useDevopsStore.getState().createReview('frontend', 42, 'Add dark mode', 'alice');
      expect(id).toMatch(/^review_/);
      const r = useDevopsStore.getState().reviews[id];
      expect(r).toBeDefined();
      expect(r.repo).toBe('frontend');
      expect(r.prNumber).toBe(42);
      expect(r.title).toBe('Add dark mode');
      expect(r.author).toBe('alice');
      expect(r.status).toBe('open');
    });
  });

  describe('updateReview', () => {
    it('should update review status', () => {
      const id = useDevopsStore.getState().createReview('backend', 10, 'Refactor', 'bob');
      useDevopsStore.getState().updateReview(id, { status: 'approved' });
      expect(useDevopsStore.getState().reviews[id].status).toBe('approved');
    });

    it('should not create new reviews for unknown IDs', () => {
      useDevopsStore.getState().updateReview('nonexistent', { status: 'merged' });
      expect(useDevopsStore.getState().reviews['nonexistent']).toBeUndefined();
    });
  });

  describe('deleteReview', () => {
    it('should remove review from store', () => {
      const id = useDevopsStore.getState().createReview('frontend', 5, 'Fix bug', 'carol');
      useDevopsStore.getState().deleteReview(id);
      expect(useDevopsStore.getState().reviews[id]).toBeUndefined();
    });
  });

  describe('getReviewsByStatus', () => {
    it('should filter reviews by status', () => {
      const id1 = useDevopsStore.getState().createReview('frontend', 1, 'PR 1', 'alice');
      useDevopsStore.getState().createReview('frontend', 2, 'PR 2', 'bob');
      useDevopsStore.getState().updateReview(id1, { status: 'merged' });
      expect(useDevopsStore.getState().getReviewsByStatus('open')).toHaveLength(1);
      expect(useDevopsStore.getState().getReviewsByStatus('merged')).toHaveLength(1);
    });
  });

  // ─── Pipelines ──────────────────────────────────────────────────

  describe('createPipeline', () => {
    it('should create a pipeline and return its ID', () => {
      const id = useDevopsStore.getState().createPipeline('CI', 'backend', 'main', 'abc123');
      expect(id).toMatch(/^pipe_/);
      const p = useDevopsStore.getState().pipelines[id];
      expect(p).toBeDefined();
      expect(p.name).toBe('CI');
      expect(p.repo).toBe('backend');
      expect(p.branch).toBe('main');
      expect(p.commitSha).toBe('abc123');
      expect(p.status).toBe('queued');
    });
  });

  describe('updatePipeline', () => {
    it('should update pipeline status and stages', () => {
      const id = useDevopsStore.getState().createPipeline('Deploy', 'frontend', 'main', 'def456');
      useDevopsStore.getState().updatePipeline(id, {
        status: 'running',
        stages: [{ name: 'build', status: 'passed', duration: 30 }, { name: 'test', status: 'running' }],
      });
      const p = useDevopsStore.getState().pipelines[id];
      expect(p.status).toBe('running');
      expect(p.stages).toHaveLength(2);
    });

    it('should not create new pipelines for unknown IDs', () => {
      useDevopsStore.getState().updatePipeline('nonexistent', { status: 'failed' });
      expect(useDevopsStore.getState().pipelines['nonexistent']).toBeUndefined();
    });
  });

  describe('deletePipeline', () => {
    it('should remove pipeline from store', () => {
      const id = useDevopsStore.getState().createPipeline('Lint', 'api', 'dev', 'aaa');
      useDevopsStore.getState().deletePipeline(id);
      expect(useDevopsStore.getState().pipelines[id]).toBeUndefined();
    });
  });

  describe('getPipelinesByRepo', () => {
    it('should filter pipelines by repo', () => {
      useDevopsStore.getState().createPipeline('CI', 'frontend', 'main', 'sha1');
      useDevopsStore.getState().createPipeline('CD', 'backend', 'main', 'sha2');
      useDevopsStore.getState().createPipeline('Lint', 'frontend', 'dev', 'sha3');
      expect(useDevopsStore.getState().getPipelinesByRepo('frontend')).toHaveLength(2);
      expect(useDevopsStore.getState().getPipelinesByRepo('backend')).toHaveLength(1);
    });
  });

  // ─── API Endpoints ──────────────────────────────────────────────

  describe('createEndpoint', () => {
    it('should create an endpoint and return its ID', () => {
      const id = useDevopsStore.getState().createEndpoint('Get Users', 'GET', '/api/users');
      expect(id).toMatch(/^ep_/);
      const e = useDevopsStore.getState().endpoints[id];
      expect(e).toBeDefined();
      expect(e.name).toBe('Get Users');
      expect(e.method).toBe('GET');
      expect(e.url).toBe('/api/users');
      expect(e.status).toBe('healthy');
    });
  });

  describe('updateEndpoint', () => {
    it('should update endpoint metrics', () => {
      const id = useDevopsStore.getState().createEndpoint('Health', 'GET', '/health');
      useDevopsStore.getState().updateEndpoint(id, {
        latency: 42,
        p50: 30,
        p95: 80,
        p99: 120,
        errorRate: 0.01,
        requestCount: 1000,
      });
      const e = useDevopsStore.getState().endpoints[id];
      expect(e.latency).toBe(42);
      expect(e.p95).toBe(80);
      expect(e.requestCount).toBe(1000);
    });

    it('should not create new endpoints for unknown IDs', () => {
      useDevopsStore.getState().updateEndpoint('nonexistent', { latency: 999 });
      expect(useDevopsStore.getState().endpoints['nonexistent']).toBeUndefined();
    });
  });

  describe('deleteEndpoint', () => {
    it('should remove endpoint from store', () => {
      const id = useDevopsStore.getState().createEndpoint('Create Post', 'POST', '/api/posts');
      useDevopsStore.getState().deleteEndpoint(id);
      expect(useDevopsStore.getState().endpoints[id]).toBeUndefined();
    });
  });

  describe('getEndpointsByStatus', () => {
    it('should filter endpoints by status', () => {
      const id1 = useDevopsStore.getState().createEndpoint('A', 'GET', '/a');
      const id2 = useDevopsStore.getState().createEndpoint('B', 'POST', '/b');
      useDevopsStore.getState().updateEndpoint(id1, { status: 'healthy' });
      useDevopsStore.getState().updateEndpoint(id2, { status: 'down' });
      expect(useDevopsStore.getState().getEndpointsByStatus('healthy')).toHaveLength(1);
      expect(useDevopsStore.getState().getEndpointsByStatus('down')).toHaveLength(1);
      expect(useDevopsStore.getState().getEndpointsByStatus('degraded')).toHaveLength(0);
    });
  });

  describe('getAverageLatency', () => {
    it('should compute average latency across endpoints', () => {
      const id1 = useDevopsStore.getState().createEndpoint('A', 'GET', '/a');
      const id2 = useDevopsStore.getState().createEndpoint('B', 'POST', '/b');
      useDevopsStore.getState().updateEndpoint(id1, { latency: 20 });
      useDevopsStore.getState().updateEndpoint(id2, { latency: 80 });
      expect(useDevopsStore.getState().getAverageLatency()).toBe(50);
    });

    it('should return 0 when no endpoints exist', () => {
      expect(useDevopsStore.getState().getAverageLatency()).toBe(0);
    });
  });

  describe('getOverallUptime', () => {
    it('should compute uptime as percentage of healthy endpoints', () => {
      const id1 = useDevopsStore.getState().createEndpoint('A', 'GET', '/a');
      const id2 = useDevopsStore.getState().createEndpoint('B', 'POST', '/b');
      useDevopsStore.getState().updateEndpoint(id1, { status: 'healthy' });
      useDevopsStore.getState().updateEndpoint(id2, { status: 'degraded' });
      expect(useDevopsStore.getState().getOverallUptime()).toBe(50);
    });

    it('should return 0 when no endpoints exist', () => {
      expect(useDevopsStore.getState().getOverallUptime()).toBe(0);
    });
  });

  // ─── Default state ──────────────────────────────────────────────

  describe('default state', () => {
    it('should have empty records and null active IDs', () => {
      const s = useDevopsStore.getState();
      expect(s.deployments).toEqual({});
      expect(s.reviews).toEqual({});
      expect(s.pipelines).toEqual({});
      expect(s.endpoints).toEqual({});
      expect(s.activeDeploymentId).toBeNull();
      expect(s.activeRepoFilter).toBeNull();
    });
  });
});
