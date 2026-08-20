'use client';

import React, { useEffect, useState } from 'react';
import {
  Usb, Bluetooth, HardDrive, Smartphone, RefreshCw, Plus, CheckCircle2,
  ShieldAlert, Cpu, Activity, Zap, Layers, Database, X, Battery, Gauge,
  Radio, Play, AlertCircle, Monitor
} from 'lucide-react';
import { hardwareManager, ConnectedDevice } from '@/lib/hardware';
import { useWindowStore } from '@/lib/stores/window.store';
import { APP_MANIFEST } from '@/lib/app-manifest';
import { cn } from '@/lib/utils';

export function HardwareManagerApp() {
  const [activeTab, setActiveTab] = useState<'cpu' | 'memory' | 'energy' | 'disk' | 'hardware'>('cpu');
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const [gpuInfo, setGpuInfo] = useState<{ vendor: string; architecture: string; available: boolean } | null>(null);
  const [fps, setFps] = useState<number>(60);
  const [batteryInfo, setBatteryInfo] = useState<{ level: number; charging: boolean } | null>(null);

  const windows = useWindowStore((s) => s.windows);
  const closeWindow = useWindowStore((s) => s.closeWindow);

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

    if (typeof navigator !== 'undefined' && 'getBattery' in (navigator as any)) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryInfo({ level: Math.round(battery.level * 100), charging: battery.charging });
        battery.addEventListener('levelchange', () => {
          setBatteryInfo({ level: Math.round(battery.level * 100), charging: battery.charging });
        });
        battery.addEventListener('chargingchange', () => {
          setBatteryInfo({ level: Math.round(battery.level * 100), charging: battery.charging });
        });
      }).catch(() => {});
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
      {/* Header with Activity Monitor Tabs */}
      <div className="px-6 py-3 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">Activity Monitor & Hardware Subsystem</h2>
            <p className="text-[11px] text-slate-400">Process management, memory pressure, and hardware drivers</p>
          </div>
        </div>

        {/* 5 macOS Activity Monitor Tabs */}
        <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/10 text-xs">
          {[
            { id: 'cpu', label: 'CPU', icon: Cpu },
            { id: 'memory', label: 'Memory', icon: Layers },
            { id: 'energy', label: 'Energy', icon: Zap },
            { id: 'disk', label: 'Disk', icon: HardDrive },
            { id: 'hardware', label: 'Peripherals', icon: Radio },
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all",
                  isSelected ? "bg-white/20 text-white font-semibold shadow-sm" : "text-slate-400 hover:text-white"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {/* ─── 1. CPU & Processes Tab ─── */}
        {activeTab === 'cpu' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col gap-2">
                <span className="text-xs text-slate-400 font-medium">User Processes</span>
                <span className="text-2xl font-bold text-white tabular-nums">{windows.length}</span>
                <span className="text-[10px] text-emerald-400">All services running in sandboxed Web Workers</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col gap-2">
                <span className="text-xs text-slate-400 font-medium">System Refresh Rate</span>
                <span className="text-2xl font-bold text-cyan-400 tabular-nums">{fps} FPS</span>
                <span className="text-[10px] text-slate-400">VSync hardware synced</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col gap-2">
                <span className="text-xs text-slate-400 font-medium">System Idle</span>
                <span className="text-2xl font-bold text-[#10F4A0] tabular-nums">94.2%</span>
                <span className="text-[10px] text-slate-400">Kernel scheduler optimal</span>
              </div>
            </div>

            {/* Process Table */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 bg-white/10 border-b border-white/10 grid grid-cols-12 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <div className="col-span-1">PID</div>
                <div className="col-span-5">Process Name</div>
                <div className="col-span-2">CPU %</div>
                <div className="col-span-2">Memory</div>
                <div className="col-span-2 text-right">Action</div>
              </div>
              <div className="divide-y divide-white/5 text-xs">
                {windows.map((win, idx) => {
                  const app = APP_MANIFEST.find(a => a.id === win.appId);
                  const pid = 1000 + idx * 42;
                  const fakeCpu = ((idx * 3.7) % 8 + 0.5).toFixed(1);
                  const fakeMem = ((idx * 24.5) % 90 + 35).toFixed(0);

                  return (
                    <div key={win.id} className="px-4 py-3 grid grid-cols-12 items-center hover:bg-white/5 transition-colors">
                      <div className="col-span-1 font-mono text-slate-400">{pid}</div>
                      <div className="col-span-5 flex items-center gap-2 truncate">
                        <span className="font-semibold text-white truncate">{win.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({app?.title || win.appId})</span>
                      </div>
                      <div className="col-span-2 font-mono text-emerald-400">{fakeCpu}%</div>
                      <div className="col-span-2 font-mono text-cyan-400">{fakeMem} MB</div>
                      <div className="col-span-2 flex justify-end">
                        <button
                          onClick={() => closeWindow(win.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-[11px] font-semibold transition-all"
                          title="Force Quit Process"
                        >
                          Force Quit
                        </button>
                      </div>
                    </div>
                  );
                })}
                {windows.length === 0 && (
                  <div className="p-6 text-center text-slate-400 text-xs">No active user processes</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── 2. Memory Tab ─── */}
        {activeTab === 'memory' && (
          <div className="flex flex-col gap-6">
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-emerald-400" /> Memory Pressure
                </h3>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider">
                  Nominal / Low
                </span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-500"
                  style={{
                    width: typeof performance !== 'undefined' && (performance as any).memory
                      ? `${Math.min(100, Math.max(5, ((performance as any).memory.usedJSHeapSize / (performance as any).memory.jsHeapSizeLimit) * 100))}%`
                      : '22%'
                  }}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10 text-xs">
                <div>
                  <span className="text-slate-400">Physical Memory:</span>
                  <div className="text-base font-bold text-white">
                    {typeof navigator !== 'undefined' && (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory}.00 GB` : '8.00 GB'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">JS Heap Allocated:</span>
                  <div className="text-base font-bold text-cyan-400">
                    {typeof performance !== 'undefined' && (performance as any).memory
                      ? `${((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB`
                      : '240.5 MB'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Heap Total:</span>
                  <div className="text-base font-bold text-indigo-400">
                    {typeof performance !== 'undefined' && (performance as any).memory
                      ? `${((performance as any).memory.totalJSHeapSize / 1024 / 1024).toFixed(1)} MB`
                      : '512.0 MB'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Heap Limit:</span>
                  <div className="text-base font-bold text-slate-300">
                    {typeof performance !== 'undefined' && (performance as any).memory
                      ? `${((performance as any).memory.jsHeapSizeLimit / 1024 / 1024 / 1024).toFixed(1)} GB`
                      : '4.0 GB'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── 3. Energy Tab ─── */}
        {activeTab === 'energy' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Battery className="w-4 h-4 text-emerald-400" /> Battery & Power
                </h3>
                <div className="text-3xl font-black text-white tabular-nums">
                  {batteryInfo ? `${batteryInfo.level}%` : 'AC Power / 100%'}
                </div>
                <p className="text-xs text-slate-400">
                  {batteryInfo?.charging ? 'Connected to Power Adapter (Charging)' : 'Power Source: High Efficiency Power Supply'}
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-cyan-400" /> Display Energy
                </h3>
                <div className="text-3xl font-black text-cyan-400 tabular-nums">1.2W</div>
                <p className="text-xs text-slate-400">ProMotion adaptive dynamic refresh rendering</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── 4. Disk Tab ─── */}
        {activeTab === 'disk' && (
          <div className="flex flex-col gap-6">
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-col gap-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-blue-400" /> Storage Capacity & Quota
              </h3>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Consumed: {storageEstimate ? `${(storageEstimate.usage / 1024 / 1024).toFixed(1)} MB` : 'Estimating...'}</span>
                <span>Quota: {storageEstimate ? `${(storageEstimate.quota / 1024 / 1024 / 1024).toFixed(1)} GB` : 'Estimating...'}</span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: storageEstimate ? `${Math.max(2, (storageEstimate.usage / storageEstimate.quota) * 100)}%` : '5%' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── 5. Peripherals & Hardware Drivers Tab ─── */}
        {activeTab === 'hardware' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <button
                onClick={handleConnectUsb}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white transition-all shadow-md"
              >
                <Usb className="w-4 h-4" /> Connect WebUSB Device
              </button>
              <button
                onClick={handleConnectBt}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all shadow-md"
              >
                <Bluetooth className="w-4 h-4" /> Pair Web Bluetooth
              </button>
              <button
                onClick={handleMountStorage}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all shadow-md"
              >
                <HardDrive className="w-4 h-4" /> Mount Native Folder
              </button>
            </div>

            {/* GPU Info Card */}
            {gpuInfo && (
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cpu className="w-8 h-8 text-indigo-400" />
                  <div>
                    <h4 className="font-bold text-sm text-white">GPU Graphics Acceleration</h4>
                    <p className="text-xs text-slate-400">{gpuInfo.vendor} · {gpuInfo.architecture}</p>
                  </div>
                </div>
                <span className={cn("text-xs px-2.5 py-1 rounded-full font-bold uppercase", gpuInfo.available ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                  {gpuInfo.available ? 'WebGPU Active' : 'Fallback Canvas'}
                </span>
              </div>
            )}

            {/* Connected Devices List */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Attached Devices</h3>
              {devices.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-slate-400">
                  No external USB or Bluetooth peripherals currently paired.
                </div>
              ) : (
                devices.map(d => (
                  <div key={d.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {d.type === 'usb' ? <Usb className="w-5 h-5 text-cyan-400" /> : <Bluetooth className="w-5 h-5 text-blue-400" />}
                      <div>
                        <span className="font-bold text-sm text-white">{d.name}</span>
                        <p className="text-[11px] text-slate-400">{d.details || (d.vendorId ? `VID: ${d.vendorId}` : 'Standard Protocol')}</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                      Connected
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HardwareManagerApp;
