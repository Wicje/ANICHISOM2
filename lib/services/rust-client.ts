/**
 * Rust Backend Client — HTTP client for communicating with Rust microservices.
 *
 * Services:
 *  - Auth Service     → http://localhost:3001
 *  - WebSocket Server → http://localhost:3002
 *  - Event Engine     → http://localhost:3003
 *  - File Proxy       → http://localhost:3004
 *  - Hardware Bridge  → http://localhost:3005
 */

const RUST_SERVICES = {
  auth: process.env.NEXT_PUBLIC_RUST_AUTH_URL || 'http://localhost:3001',
  ws: process.env.NEXT_PUBLIC_RUST_WS_URL || 'http://localhost:3002',
  events: process.env.NEXT_PUBLIC_RUST_EVENTS_URL || 'http://localhost:3003',
  files: process.env.NEXT_PUBLIC_RUST_FILES_URL || 'http://localhost:3004',
  hardware: process.env.NEXT_PUBLIC_RUST_HW_URL || 'http://localhost:3005',
} as const;

export type RustServiceName = keyof typeof RUST_SERVICES;

// ─── Types ────────────────────────────────────────────────────────────────

export interface RustHealthStatus {
  status: 'ok' | 'error';
  service: string;
  version: string;
}

export interface RustAuthLoginRequest {
  username: string;
  password: string;
}

export interface RustAuthLoginResponse {
  token: string;
  user_id: string;
}

export interface RustSessionResponse {
  authenticated: boolean;
  user_id: string | null;
}

export interface RustEvent {
  id: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: string;
  sequence: number;
}

export interface RustAppendEventRequest {
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface RustFileMetadata {
  id: string;
  name: string;
  path: string;
  mime_type: string;
  size: number;
  modified_at: string;
  sync_status: string;
  connector_id: string;
}

export interface RustDeviceInfo {
  id: string;
  name: string;
  port: string;
  baud_rate: number;
  connected: boolean;
  last_data: string | null;
  device_type: string;
}

export interface RustPasskeyRegisterStartRequest {
  username: string;
  display_name: string;
}

export interface RustPasskeyRegisterStartResponse {
  challenge: string;
  rp_id: string;
  user_id: string;
  exclude_credentials: string[];
}

export interface RustPasskeyRegisterFinishRequest {
  username: string;
  credential_id: string;
  public_key: string;
  label?: string;
}

export interface RustPasskeyAuthenticateStartRequest {
  username: string;
}

export interface RustPasskeyAuthenticateStartResponse {
  challenge: string;
  allow_credentials: string[];
  rp_id: string;
}

export interface RustPasskeyAuthenticateFinishRequest {
  credential_id: string;
  authenticator_data: string;
  client_data_json: string;
  signature: string;
}

export interface RustPasskeyAuthenticateFinishResponse {
  token: string;
  user_id: string;
}

// ─── Client ───────────────────────────────────────────────────────────────

class RustServiceClient {
  protected baseUrl: string;
  private service: RustServiceName;

  constructor(service: RustServiceName) {
    this.service = service;
    this.baseUrl = RUST_SERVICES[service];
  }

  protected async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add auth token if available
    const token = typeof document !== 'undefined'
      ? document.cookie.match(/continuaos_session=([^;]+)/)?.[1]
      : null;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorBody.error || `Rust ${this.service} error: ${response.status}`);
    }

    return response.json();
  }

  protected get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  protected post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  protected put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  protected del<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  // ─── Health ────────────────────────────────────────────────────────

  async healthCheck(): Promise<RustHealthStatus> {
    return this.get<RustHealthStatus>('/health');
  }

  async isAvailable(): Promise<boolean> {
    try {
      const status = await this.healthCheck();
      return status.status === 'ok';
    } catch {
      return false;
    }
  }
}

// ─── Auth Service Client ──────────────────────────────────────────────────

class RustAuthClient extends RustServiceClient {
  constructor() {
    super('auth');
  }

  async login(username: string, password: string): Promise<RustAuthLoginResponse> {
    return this.post<RustAuthLoginResponse>('/api/auth/login', { username, password });
  }

  async logout(): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>('/api/auth/logout');
  }

  async getSession(): Promise<RustSessionResponse> {
    return this.get<RustSessionResponse>('/api/auth/session');
  }

  // ─── Passkey Registration ──────────────────────────────────────────

  async passkeyRegisterStart(
    username: string,
    displayName: string,
  ): Promise<RustPasskeyRegisterStartResponse> {
    return this.post<RustPasskeyRegisterStartResponse>('/api/auth/passkey/register/start', {
      username,
      display_name: displayName,
    });
  }

  async passkeyRegisterFinish(
    request: RustPasskeyRegisterFinishRequest,
  ): Promise<{ success: boolean; credential_id: string }> {
    return this.post('/api/auth/passkey/register/finish', request);
  }

  // ─── Passkey Authentication ────────────────────────────────────────

  async passkeyAuthStart(
    username: string,
  ): Promise<RustPasskeyAuthenticateStartResponse> {
    return this.post<RustPasskeyAuthenticateStartResponse>('/api/auth/passkey/authenticate/start', {
      username,
    });
  }

  async passkeyAuthFinish(
    request: RustPasskeyAuthenticateFinishRequest,
  ): Promise<RustPasskeyAuthenticateFinishResponse> {
    return this.post<RustPasskeyAuthenticateFinishResponse>('/api/auth/passkey/authenticate/finish', request);
  }
}

// ─── Event Engine Client ──────────────────────────────────────────────────

class RustEventsClient extends RustServiceClient {
  constructor() {
    super('events');
  }

  async listEvents(offset = 0, limit = 100): Promise<{ events: RustEvent[]; total: number }> {
    return this.get(`/api/events?offset=${offset}&limit=${limit}`);
  }

  async appendEvent(request: RustAppendEventRequest): Promise<RustEvent> {
    return this.post<RustEvent>('/api/events', request);
  }

  async getEventsForAggregate(aggregateId: string): Promise<RustEvent[]> {
    return this.get<RustEvent[]>(`/api/events/${aggregateId}`);
  }

  async getProjection(name: string): Promise<Record<string, unknown>> {
    return this.get(`/api/events/projections/${name}`);
  }
}

// ─── File Proxy Client ────────────────────────────────────────────────────

class RustFilesClient extends RustServiceClient {
  constructor() {
    super('files');
  }

  async listFiles(): Promise<{ files: RustFileMetadata[]; total: number }> {
    return this.get('/api/files');
  }

  async getSyncStatus(): Promise<{
    total: number;
    synced: number;
    pending: number;
    last_sync: string;
  }> {
    return this.get('/api/files/sync');
  }

  async triggerSync(): Promise<{ status: string }> {
    return this.post('/api/files/sync');
  }

  async getConnectors(): Promise<{ connectors: Array<{ id: string; name: string; status: string }> }> {
    return this.get('/api/files/connectors');
  }

  async disconnectSource(id: string): Promise<{ id: string; status: string }> {
    return this.post(`/api/files/connectors/${id}/disconnect`);
  }
}

// ─── Hardware Bridge Client ───────────────────────────────────────────────

class RustHardwareClient extends RustServiceClient {
  constructor() {
    super('hardware');
  }

  async listDevices(): Promise<RustDeviceInfo[]> {
    return this.get<RustDeviceInfo[]>('/api/hardware');
  }

  async getDevice(id: string): Promise<RustDeviceInfo> {
    return this.get<RustDeviceInfo>(`/api/hardware/${id}`);
  }

  async listSerialPorts(): Promise<Array<{ port: string; type: string }>> {
    return this.get('/api/hardware/ports');
  }

  async connectDevice(id: string): Promise<RustDeviceInfo> {
    return this.get<RustDeviceInfo>(`/api/hardware/${id}/connect`);
  }

  async disconnectDevice(id: string): Promise<{ id: string; connected: boolean }> {
    return this.get(`/api/hardware/${id}/disconnect`);
  }

  async readDevice(id: string): Promise<{ id: string; data: string; timestamp: string }> {
    return this.get(`/api/hardware/${id}/read`);
  }

  async writeDevice(id: string, data: string): Promise<{ id: string; bytes_written: number }> {
    return this.get(`/api/hardware/${id}/write?data=${encodeURIComponent(data)}`);
  }
}

// ─── WebSocket Client ─────────────────────────────────────────────────────

class RustWSClient extends RustServiceClient {
  constructor() {
    super('ws');
  }

  connect(room: string): WebSocket | null {
    if (typeof WebSocket === 'undefined') return null;
    const wsUrl = this.baseUrl.replace('http', 'ws');
    return new WebSocket(`${wsUrl}/ws?room=${encodeURIComponent(room)}`);
  }
}

// ─── Singleton Clients ────────────────────────────────────────────────────

export const rustAuth = new RustAuthClient();
export const rustEvents = new RustEventsClient();
export const rustFiles = new RustFilesClient();
export const rustHardware = new RustHardwareClient();
export const rustWS = new RustWSClient();

// ─── Convenience: Check which Rust services are available ─────────────────

export async function checkRustServices(): Promise<Record<RustServiceName, boolean>> {
  const checks = await Promise.allSettled([
    rustAuth.healthCheck(),
    rustWS.healthCheck(),
    rustEvents.healthCheck(),
    rustFiles.healthCheck(),
    rustHardware.healthCheck(),
  ]);

  return {
    auth: checks[0].status === 'fulfilled' && checks[0].value.status === 'ok',
    ws: checks[1].status === 'fulfilled' && checks[1].value.status === 'ok',
    events: checks[2].status === 'fulfilled' && checks[2].value.status === 'ok',
    files: checks[3].status === 'fulfilled' && checks[3].value.status === 'ok',
    hardware: checks[4].status === 'fulfilled' && checks[4].value.status === 'ok',
  };
}
