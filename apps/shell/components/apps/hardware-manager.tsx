'use client';

import React, { useEffect, useState } from 'react';
import {
  Usb, Bluetooth, HardDrive, Smartphone, RefreshCw, Plus, CheckCircle2,
  ShieldAlert, Cpu, Activity, Zap, Layers, Database, X, Battery, Gauge,
  Radio, Play, AlertCircle, Monitor, Sparkles, Terminal, FolderPlus
} from 'lucide-react';
import { hardwareManager, ConnectedDevice } from '@/lib/hardware';
import { useWindowStore } from '@/lib/stores/window.store';
import { processSupervisor, VirtualProcess } from '@/lib/services/process-supervisor.service';
import { webgpuEngine, WebGPUDeviceInfo } from '@/lib/services/webgpu-engine.service';
import { FS, GitHubMount } from '@/lib/fs';
import { cn } from '@/lib/utils';
import { audioSystem } from '@/lib/services/audio-engine';

export function HardwareManagerApp() {
  const [activeTab, setActiveTab] = useState<'processes' | 'memory' | 'gpu' | 'storage' | 'devices'>('processes');
  const [processes, setProcesses] = useState<VirtualProcess[]>([]);
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [gpuInfo, setGpuInfo] = useState<WebGPUDeviceInfo | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<{ durationMs: number; opsPerSecond: string } | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [githubMounts, setGithubMounts] = useState<GitHubMount[]>([]);
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const [fps, setFps] = useState<number>(60);
  const [batteryInfo, setBatteryInfo] = useState<{ level: number; charging: boolean } | null>(null);

  const windows = useWindowStore((s) => s.windows);
  const closeWindow = useWindowStore((s) => s.closeWindow);

  // Sync virtual processes
  useEffect(() => {
    return processSupervisor.subscribe((procs) => {
      setProcesses(procs);
    });
  }, []);

  // Sync hardware devices & storage
  useEffect(() => {
    setDevices(hardwareManager.getDevices());
    const unsub = hardwareManager.subscribe(() => {
      setDevices(hardwareManager.getDevices());
    });

    webgpuEngine.initialize().then(info => setGpuInfo(info));
    FS.listGitHubMounts().then(mounts => setGithubMounts(mounts));

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
      }).catch(() => {});
    }

    // Live frame rate
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

    return () => {
      unsub();
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleForceQuit = (proc: VirtualProcess) => {
    audioSystem.playClick();
    processSupervisor.terminateProcess(proc.pid);
    if (proc.windowId && proc.windowId !== 'system-ui') {
      closeWindow(proc.windowId);
    }
  };

  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    audioSystem.playClick();
    const res = await webgpuEngine.executeComputeBenchmark();
    setBenchmarkResult(res);
    setIsBenchmarking(false);
  };

  const handleMountHost = async () => {
    if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'Not Supported', description: 'File System Access API requires Chromium or modern browser.', type: 'error' }
      }));
      return;
    }
    try {
      const dirHandle = await (window as any).showDirectoryPicker();
      audioSystem.playClick();
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'Host Directory Mounted', description: `Mounted ~/Host/${dirHandle.name} directly into ContinuaOS VFS!`, type: 'success' }
      }));
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        window.dispatchEvent(new CustomEvent('os:notify', {
          detail: { title: 'Mount Cancelled', description: e.message, type: 'info' }
        }));
      }
    }
  };

  const totalCpu = Math.min(100, processes.reduce((acc, p) => acc + p.cpuPercent, 0)).toFixed(1);
  const totalMem = processes.reduce((acc, p) => acc + p.memoryMB, 0).toFixed(1);

  return (
    <div className="w-full h-full bg-[#05070d]/95 backdrop-blur-3xl text-white font-sans flex flex-col justify-between p-6 select-none relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute -inset-10 bg-gradient-to-br from-indigo-950/20 via-cyan-950/15 to-emerald-950/15 blur-3xl pointer-events-none" />

      {/* Top Header & Metrics Bar */}
      <div className="flex items-center justify-between z-10 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide">Activity Monitor & Kernel Supervisor</h2>
            <p className="text-[10px] text-white/50">ContinuaOS POSIX Process Supervisor & WebGPU Engine</p>
          </div>
        </div>

        {/* Global Telemetry Pills */}
        <div className="flex items-center gap-2">
          <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-xl text-xs flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono font-bold text-white">{totalCpu}% CPU</span>
          </div>
          <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-xl text-xs flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono font-bold text-white">{totalMem} MB RAM</span>
          </div>
          <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-xl text-xs flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-mono font-bold text-white">{fps} FPS</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 bg-black/40 border border-white/15 p-1 rounded-2xl text-xs font-semibold my-3 z-10 w-fit">
        {[
          { id: 'processes', label: `Processes (${processes.length})`, icon: Activity },
          { id: 'gpu', label: 'WebGPU Compute', icon: Zap },
          { id: 'storage', label: 'Host Storage & Mounts', icon: HardDrive },
          { id: 'devices', label: `Peripherals (${devices.length})`, icon: Usb },
        ].map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                audioSystem.playClick();
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5",
                isSelected ? "bg-white text-black font-bold shadow-md" : "text-white/60 hover:text-white"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 my-2 z-10 overflow-hidden flex flex-col">
        {/* ─── 1. Processes Tab ─── */}
        {activeTab === 'processes' && (
          <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 p-3 bg-white/5 border-b border-white/10 text-[11px] font-bold text-white/50 uppercase tracking-wider">
              <div className="col-span-2">PID</div>
              <div className="col-span-4">Process Name</div>
              <div className="col-span-2">Threads</div>
              <div className="col-span-2">CPU %</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">
              {processes.map(p => (
                <div key={p.pid} className="grid grid-cols-12 gap-2 p-3 items-center text-xs hover:bg-white/5 transition-colors">
                  <div className="col-span-2 font-mono text-white/60">{p.pid}</div>
                  <div className="col-span-4 flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", p.status === 'unresponsive' ? "bg-rose-500 animate-ping" : "bg-emerald-400")} />
                    <span className="font-semibold text-white truncate">{p.name}</span>
                  </div>
                  <div className="col-span-2 font-mono text-white/60">{p.threads} threads</div>
                  <div className="col-span-2 font-mono text-cyan-400 font-bold">{p.cpuPercent.toFixed(1)}%</div>
                  <div className="col-span-2 flex justify-end">
                    {p.id !== 'kernel' && (
                      <button
                        onClick={() => handleForceQuit(p)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 text-[11px] font-bold transition-colors border border-rose-500/30"
                      >
                        Force Quit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── 2. WebGPU Compute Tab ─── */}
        {activeTab === 'gpu' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-5 rounded-3xl bg-white/5 border border-white/10 flex flex-col justify-between backdrop-blur-2xl">
              <div className="space-y-4">
                <div className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-cyan-400" /> GPU Silicon & Adapter
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-bold text-white">{gpuInfo?.adapterName}</div>
                  <div className="text-xs text-white/60">Vendor: {gpuInfo?.vendor}</div>
                  <div className="text-xs text-white/60">Architecture: {gpuInfo?.architecture}</div>
                  <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Hardware Compute Pipeline Active
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <button
                  onClick={handleRunBenchmark}
                  disabled={isBenchmarking}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  {isBenchmarking ? 'Executing WebGPU Compute Pipeline...' : 'Run WebGPU Tensor Benchmark'}
                </button>
                {benchmarkResult && (
                  <div className="mt-3 p-3 rounded-xl bg-black/40 border border-white/10 text-xs flex justify-between font-mono">
                    <span className="text-white/60">Throughput:</span>
                    <span className="text-emerald-400 font-bold">{benchmarkResult.opsPerSecond} ({benchmarkResult.durationMs}ms)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white/5 border border-white/10 flex flex-col justify-between backdrop-blur-2xl">
              <div className="space-y-3">
                <div className="text-xs font-bold text-white/50 uppercase tracking-wider">WebGPU Compute Shader Features</div>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {gpuInfo?.features && gpuInfo.features.length > 0 ? (
                    gpuInfo.features.map(f => (
                      <span key={f} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-cyan-300">
                        {f}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-white/40">Standard WGSL shader compute features active.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── 3. Host Storage & Mounts Tab ─── */}
        {activeTab === 'storage' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-5 rounded-3xl bg-white/5 border border-white/10 flex flex-col justify-between backdrop-blur-2xl">
              <div className="space-y-3">
                <div className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                  <FolderPlus className="w-4 h-4 text-emerald-400" /> Host File System Access API
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  Mount real directories from your computer (e.g. <code className="text-cyan-300">~/Projects</code> or external USB drives) directly into ContinuaOS with direct read/write access.
                </p>
              </div>
              <button
                onClick={handleMountHost}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <FolderPlus className="w-4 h-4" /> Mount Host Directory into VFS
              </button>
            </div>

            <div className="p-5 rounded-3xl bg-white/5 border border-white/10 flex flex-col justify-between backdrop-blur-2xl">
              <div className="space-y-3">
                <div className="text-xs font-bold text-white/50 uppercase tracking-wider">Mounted Repositories ({githubMounts.length})</div>
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {githubMounts.map(m => (
                    <div key={m.id} className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-white">{m.owner}/{m.repo}</span>
                      <span className="text-[10px] text-cyan-400">Branch: {m.branch}</span>
                    </div>
                  ))}
                  {githubMounts.length === 0 && (
                    <span className="text-xs text-white/40">No GitHub repositories mounted.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── 4. Peripherals Tab ─── */}
        {activeTab === 'devices' && (
          <div className="p-5 rounded-3xl bg-white/5 border border-white/10 flex flex-col justify-between backdrop-blur-2xl flex-1">
            <div className="space-y-3">
              <div className="text-xs font-bold text-white/50 uppercase tracking-wider">Connected WebUSB / WebHID Devices ({devices.length})</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto custom-scrollbar">
                {devices.map(d => (
                  <div key={d.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Usb className="w-5 h-5 text-cyan-400" />
                      <div>
                        <div className="text-xs font-bold text-white">{d.name}</div>
                        <div className="text-[10px] text-white/50">{d.type.toUpperCase()} · Vendor ID: {d.vendorId || 'N/A'}</div>
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                ))}
                {devices.length === 0 && (
                  <div className="col-span-2 text-xs text-white/40 p-4 text-center">
                    No physical USB/HID devices currently connected.
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-white/10">
              <button
                onClick={async () => {
                  audioSystem.playClick();
                  await hardwareManager.requestUsbDevice();
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 border border-white/10"
              >
                <Plus className="w-3.5 h-3.5" /> Pair WebUSB Device
              </button>
              <button
                onClick={async () => {
                  audioSystem.playClick();
                  await hardwareManager.requestBluetoothDevice();
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 border border-white/10"
              >
                <Bluetooth className="w-3.5 h-3.5" /> Pair Web Bluetooth
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="z-10 flex items-center justify-between text-[10px] text-white/40 border-t border-white/10 pt-3 font-mono">
        <span>Kernel Process Watchdog: Active (Interval: 1200ms)</span>
        <span>Memory Model: Shared WebAssembly Heap (Isolated)</span>
      </div>
    </div>
  );
}
