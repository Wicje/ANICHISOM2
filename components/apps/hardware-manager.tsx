'use client';

import React, { useEffect, useState } from 'react';
import { Usb, Bluetooth, HardDrive, Smartphone, RefreshCw, Plus, CheckCircle2, ShieldAlert, Cpu, Activity, Zap, Layers, Database } from 'lucide-react';
import { hardwareManager, ConnectedDevice } from '@/lib/hardware';
import { cn } from '@/lib/utils';

export function HardwareManagerApp() {
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const [gpuInfo, setGpuInfo] = useState<{ vendor: string; architecture: string; available: boolean } | null>(null);
  const [fps, setFps] = useState<number>(60);

  useEffect(() => {
    setDevices(hardwareManager.getDevices());
    return hardwareManager.subscribe(() => {
      setDevices(hardwareManager.getDevices());
    });
  }, []);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(est => {
        if (est.usage !== undefined && est.quota !== undefined) {
          setStorageEstimate({ usage: est.usage, quota: est.quota });
        }
      });
    }

    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      (navigator as any).gpu.requestAdapter().then(async (adapter: any) => {
        if (adapter) {
          try {
            const info = await adapter.requestAdapterInfo?.();
            setGpuInfo({
              vendor: info?.vendor || 'Hardware Accelerated',
              architecture: info?.architecture || 'WebGPU Compute',
              available: true,
            });
          } catch {
            setGpuInfo({ vendor: 'WebGPU Compatible', architecture: 'Unified Shader Pipeline', available: true });
          }
        } else {
          setGpuInfo({ vendor: 'Disabled', architecture: 'N/A', available: false });
        }
      }).catch(() => {
        setGpuInfo({ vendor: 'Disabled', architecture: 'N/A', available: false });
      });
    }

    // Live frame rate measurement
    let frames = 0;
    let lastTime = performance.now();
    let animId: number;

    const measure = () => {
      frames++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round((frames * 1000) / (now - lastTime)));
        frames = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(measure);
    };
    animId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleConnectUsb = async () => {
    await hardwareManager.requestUsbDevice();
  };

  const handleConnectBt = async () => {
    await hardwareManager.requestBluetoothDevice();
  };

  const handleMountStorage = async () => {
    await hardwareManager.mountLocalDirectory();
  };

  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base tracking-wide text-white">Hardware & Peripheral Subsystem</h2>
            <p className="text-xs text-slate-400">WebUSB, Web Bluetooth, and File System Drivers</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleConnectUsb}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/10 transition-all"
          >
            <Usb className="w-3.5 h-3.5 text-cyan-400" /> Connect USB
          </button>
          <button
            onClick={handleConnectBt}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/10 transition-all"
          >
            <Bluetooth className="w-3.5 h-3.5 text-cyan-400" /> Pair Bluetooth
          </button>
          <button
            onClick={handleMountStorage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 hover:brightness-110 text-xs font-bold transition-all shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-3.5 h-3.5" /> Mount Local Drive
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        
        {/* Real-Time Hardware & Engine Telemetry Cards (Fluidd Pattern) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
                <Activity className="w-4 h-4" /> System Frame Rate
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                {fps} FPS
              </span>
            </div>
            <div className="text-2xl font-black text-white">{fps} <span className="text-xs font-normal text-slate-400">fps (60Hz target)</span></div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (fps / 60) * 100)}%` }} />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-cyan-400">
                <Database className="w-4 h-4" /> Storage Quota (OPFS)
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                {storageEstimate ? `${Math.round((storageEstimate.usage / storageEstimate.quota) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="text-xl font-bold text-white">
              {storageEstimate ? `${(storageEstimate.usage / (1024 * 1024)).toFixed(1)} MB` : '0 MB'}
              <span className="text-xs font-normal text-slate-400 ml-1">
                / {storageEstimate ? `${(storageEstimate.quota / (1024 * 1024 * 1024)).toFixed(1)} GB quota` : 'N/A'}
              </span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all"
                style={{ width: `${storageEstimate ? Math.min(100, (storageEstimate.usage / storageEstimate.quota) * 100) : 5}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-purple-400">
                <Zap className="w-4 h-4" /> WebGPU Engine
              </span>
              <span className={cn("font-mono text-xs px-2 py-0.5 rounded font-bold", gpuInfo?.available ? "bg-purple-500/20 text-purple-300" : "bg-slate-800 text-slate-400")}>
                {gpuInfo?.available ? 'Hardware Active' : 'Fallback'}
              </span>
            </div>
            <div className="text-base font-bold text-white truncate">{gpuInfo?.vendor || 'WebGPU Compute'}</div>
            <div className="text-xs text-slate-400 truncate">{gpuInfo?.architecture || 'Unified Shader Core'}</div>
          </div>
        </div>

        {/* Device Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={handleConnectUsb}
            className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-white/10 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <Usb className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                WebUSB API
              </span>
            </div>
            <h3 className="font-bold text-sm text-white">Attach Flash Drive / Phone</h3>
            <p className="text-xs text-slate-400 mt-1">Connect raw USB storage, Android devices, or microcontrollers.</p>
          </div>

          <div
            onClick={handleConnectBt}
            className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-white/10 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <Bluetooth className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                Web Bluetooth
              </span>
            </div>
            <h3 className="font-bold text-sm text-white">Pair Wireless Peripheral</h3>
            <p className="text-xs text-slate-400 mt-1">Pair audio headsets, keyboards, gamepads, or smartphones.</p>
          </div>

          <div
            onClick={handleMountStorage}
            className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-white/10 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <HardDrive className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                File System Access
              </span>
            </div>
            <h3 className="font-bold text-sm text-white">Mount Host Drive / Folder</h3>
            <p className="text-xs text-slate-400 mt-1">Direct high-speed read/write access to your local C: drive or home folder.</p>
          </div>
        </div>

        {/* Connected Devices Table */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Connected Hardware ({devices.length})</span>
            <button
              onClick={() => setDevices(hardwareManager.getDevices())}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh Bus
            </button>
          </div>

          {devices.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white/5 border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
              <Smartphone className="w-10 h-10 text-slate-600 mb-3" />
              <h4 className="font-semibold text-sm text-slate-300">No Hardware Peripherals Connected</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Click one of the actions above to mount external hard drives, USB devices, or pair bluetooth headphones.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {devices.map((dev) => (
                <div
                  key={dev.id}
                  className="p-4 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                      {dev.type === 'usb' && <Usb className="w-5 h-5 text-cyan-400" />}
                      {dev.type === 'bluetooth' && <Bluetooth className="w-5 h-5 text-cyan-400" />}
                      {dev.type === 'storage' && <HardDrive className="w-5 h-5 text-emerald-400" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-white">{dev.name}</span>
                      <span className="text-xs text-slate-400">{dev.details || 'Active Bus Device'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mounted
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
