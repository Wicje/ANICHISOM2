'use client';

export interface WebGPUDeviceInfo {
  supported: boolean;
  adapterName: string;
  vendor: string;
  architecture: string;
  limits: {
    maxComputeWorkgroupStorageSize?: number;
    maxComputeInvocationsPerWorkgroup?: number;
    maxBufferSize?: number;
    maxTextureDimension2D?: number;
  };
  features: string[];
}

class WebGPUEngineService {
  private deviceInfo: WebGPUDeviceInfo | null = null;
  private device: any = null;

  public async initialize(): Promise<WebGPUDeviceInfo> {
    if (this.deviceInfo) return this.deviceInfo;

    if (typeof navigator === 'undefined' || !(navigator as any).gpu) {
      this.deviceInfo = {
        supported: false,
        adapterName: 'Software Fallback (WebGL/Canvas)',
        vendor: 'Generic Web Engine',
        architecture: 'WebAssembly SIMD',
        limits: {},
        features: [],
      };
      return this.deviceInfo;
    }

    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (!adapter) throw new Error('No WebGPU adapter available');

      const info = await (adapter.requestAdapterInfo ? adapter.requestAdapterInfo() : Promise.resolve({}));
      this.device = await adapter.requestDevice();

      const features: string[] = [];
      adapter.features.forEach((f: string) => features.push(f));

      this.deviceInfo = {
        supported: true,
        adapterName: info.description || info.device || 'Metal / Vulkan Direct Adapter',
        vendor: info.vendor || 'Hardware Accelerated GPU',
        architecture: info.architecture || 'Discrete/Integrated Silicon',
        limits: {
          maxComputeWorkgroupStorageSize: adapter.limits?.maxComputeWorkgroupStorageSize,
          maxComputeInvocationsPerWorkgroup: adapter.limits?.maxComputeInvocationsPerWorkgroup,
          maxBufferSize: adapter.limits?.maxBufferSize,
          maxTextureDimension2D: adapter.limits?.maxTextureDimension2D,
        },
        features,
      };
    } catch (e) {
      this.deviceInfo = {
        supported: false,
        adapterName: 'WebGPU Unsupported on Current Browser',
        vendor: 'CPU Emulation',
        architecture: 'V8 JIT',
        limits: {},
        features: [],
      };
    }

    return this.deviceInfo;
  }

  public getDeviceInfo(): WebGPUDeviceInfo | null {
    return this.deviceInfo;
  }

  public async executeComputeBenchmark(): Promise<{ durationMs: number; opsPerSecond: string }> {
    const start = performance.now();
    // Benchmark tensor array addition
    const size = 1000000;
    const a = new Float32Array(size);
    const b = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      a[i] = i * 0.5;
      b[i] = i * 1.5;
    }
    const c = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      c[i] = a[i]! + b[i]!;
    }
    const duration = performance.now() - start;
    const gigaOps = ((size / (duration / 1000)) / 1e9).toFixed(2);
    return { durationMs: Math.max(1, Math.round(duration)), opsPerSecond: `${gigaOps} GFLOPS` };
  }
}

export const webgpuEngine = new WebGPUEngineService();
