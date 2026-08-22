import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ContinuaPluginSDK } from '@/lib/plugin-sdk/index';
import { pluginSandboxHost } from '@/lib/services/plugin-sandbox.service';
import { usePluginStore } from '@/lib/stores/plugin.store';

describe('Continua Plugin SDK & Sandbox Host', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    const store = usePluginStore.getState();
    store.registerPlugin({
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'A test plugin',
      author: 'Tester',
      category: 'utility',
      permissions: ['storage:read', 'storage:write', 'context:read', 'context:write', 'ui:notifications'] as any,
      runtime: 'iframe',
      source: 'custom',
    });
    store.installPlugin('test-plugin');

    pluginSandboxHost.init();
  });

  afterEach(() => {
    pluginSandboxHost.destroy();
  });

  it('initializes ContinuaPluginSDK with expected APIs', () => {
    const sdk = new ContinuaPluginSDK({ pluginId: 'test-plugin' });
    expect(sdk.context).toBeDefined();
    expect(sdk.storage).toBeDefined();
    expect(sdk.ui).toBeDefined();
    expect(sdk.audio).toBeDefined();
  });

  it('sends postMessage requests to host', async () => {
    const mockPostMessage = vi.fn();
    const fakeParent = { postMessage: mockPostMessage } as unknown as Window;

    const sdk = new ContinuaPluginSDK({
      pluginId: 'test-plugin',
      targetWindow: fakeParent,
    });

    sdk.ui.notify('Test Title', 'Test Description', 'info').catch(() => {});

    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    const sentMsg = mockPostMessage.mock.calls[0]![0];
    expect(sentMsg.pluginId).toBe('test-plugin');
    expect(sentMsg.action).toBe('ui:notify');
    expect(sentMsg.payload.title).toBe('Test Title');
  });

  it('enforces permission checks in sandbox host', async () => {
    const mockPostMessage = vi.fn();
    const fakeEvent = {
      data: {
        pluginId: 'test-plugin',
        requestId: 'req-123',
        type: 'request',
        action: 'audio:playClick',
        payload: {},
      },
      source: { postMessage: mockPostMessage } as unknown as Window,
      origin: 'http://localhost:3000',
    } as unknown as MessageEvent;

    // test-plugin does NOT have 'audio:play' permission
    await (pluginSandboxHost as any).handleIframeMessage(fakeEvent);

    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    const response = mockPostMessage.mock.calls[0]![0];
    expect(response.type).toBe('response');
    expect(response.error).toContain('Permission denied: audio:play');
  });

  it('allows permitted context:set and context:get actions', async () => {
    const mockPostMessage = vi.fn();
    const fakeEvent = {
      data: {
        pluginId: 'test-plugin',
        requestId: 'req-456',
        type: 'request',
        action: 'context:set',
        payload: { domain: 'sample-domain', data: { color: 'green' } },
      },
      source: { postMessage: mockPostMessage } as unknown as Window,
      origin: 'http://localhost:3000',
    } as unknown as MessageEvent;

    await (pluginSandboxHost as any).handleIframeMessage(fakeEvent);

    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    const response = mockPostMessage.mock.calls[0]![0];
    expect(response.error).toBeUndefined();
    expect(response.data).toEqual({ success: true });
  });
});
