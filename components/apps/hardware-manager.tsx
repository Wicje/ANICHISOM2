'use client';

import React, { useEffect, useState } from 'react';
import { Usb, Bluetooth, HardDrive, Smartphone, RefreshCw, Plus, CheckCircle2, ShieldAlert } from 'lucide-react';
import { hardwareManager, ConnectedDevice } from '@/lib/hardware';

export function HardwareManagerApp() {
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);

  useEffect(() => {
    setDevices(hardwareManager.getDevices());
    return hardwareManager.subscribe(() => {
      setDevices(hardwareManager.getDevices());
    });
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
