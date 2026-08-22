import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nativeBridge } from '@/lib/services/native-bridge.service';

describe('NativeBridgeService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('detects runtime environment', () => {
    const env = nativeBridge.getEnvironment();
    expect(env).toBeDefined();
    expect(typeof env.isTauri).toBe('boolean');
    expect(typeof env.isPWA).toBe('boolean');
    expect(['macos', 'windows', 'linux', 'web']).toContain(env.platform);
  });

  it('returns fallback system info in web browser mode', async () => {
    const info = await nativeBridge.getSystemInfo();
    expect(info).toBeDefined();
    expect(info.app_version).toBe('2.4.0');
    expect(typeof info.os).toBe('string');
  });

  it('delegates to Tauri invoke when available', async () => {
    const mockInvoke = vi.fn().mockResolvedValue({
      os: 'macos',
      arch: 'aarch64',
      hostname: 'Continua-MacBook',
      app_version: '2.4.0',
    });

    (globalThis as any).__TAURI_INTERNALS__ = { invoke: mockInvoke };
    (nativeBridge as any).env.isTauri = true;

    const info = await nativeBridge.getSystemInfo();
    expect(mockInvoke).toHaveBeenCalledWith('get_system_info', {});
    expect(info.hostname).toBe('Continua-MacBook');

    // Clean up
    delete (globalThis as any).__TAURI_INTERNALS__;
    (nativeBridge as any).env.isTauri = false;
  });

  it('handles native file IO commands via IPC bridge', async () => {
    const mockInvoke = vi.fn().mockImplementation((cmd, args) => {
      if (cmd === 'read_file_native') return Promise.resolve('file contents');
      if (cmd === 'write_file_native') return Promise.resolve(null);
      if (cmd === 'list_directory_native') return Promise.resolve([{ name: 'test.txt', path: '/test.txt', is_dir: false, size_bytes: 100 }]);
      return Promise.resolve(null);
    });

    (globalThis as any).__TAURI_INTERNALS__ = { invoke: mockInvoke };
    (nativeBridge as any).env.isTauri = true;

    const read = await nativeBridge.readNativeFile('/tmp/test.txt');
    expect(read).toBe('file contents');

    const write = await nativeBridge.writeNativeFile('/tmp/test.txt', 'hello');
    expect(write).toBe(true);

    const list = await nativeBridge.listNativeDirectory('/tmp');
    expect(list.length).toBe(1);
    expect(list[0]?.name).toBe('test.txt');

    // Clean up
    delete (globalThis as any).__TAURI_INTERNALS__;
    (nativeBridge as any).env.isTauri = false;
  });
});
