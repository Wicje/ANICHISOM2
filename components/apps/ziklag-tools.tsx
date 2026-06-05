'use client';

import React, { useState, useEffect } from 'react';
import { useOS, OSWindow } from '@/lib/os-context';
import { HardDrive, Activity, AlertTriangle, CheckCircle, Clock, Server, Download, Upload, RefreshCcw, Search, Shield, Zap, Terminal, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type DiskHealth = 'healthy' | 'warning' | 'critical' | 'rebuilding';
type DiskScan = {
  id: string;
  name: string;
  capacity: string;
  used: string;
  health: DiskHealth;
  temperature: number;
  readSpeed: string;
  writeSpeed: string;
};

type RecoveryTicket = {
  id: string;
  client: string;
  status: 'pending' | 'scanning' | 'recovered' | 'failed';
  date: string;
  payloadSize?: string;
  priority: 'low' | 'medium' | 'high';
};

const DUMMY_DISKS: DiskScan[] = [
  { id: 'dev0', name: '/dev/md0 (RAID 5)', capacity: '32 TB', used: '18.4 TB', health: 'healthy', temperature: 38, readSpeed: '450 MB/s', writeSpeed: '410 MB/s' },
  { id: 'dev1', name: '/dev/sdc1 (Client Backup)', capacity: '4 TB', used: '3.8 TB', health: 'warning', temperature: 45, readSpeed: '85 MB/s', writeSpeed: '60 MB/s' },
  { id: 'dev2', name: '/dev/nvme0n1 (Cache)', capacity: '2 TB', used: '1.1 TB', health: 'healthy', temperature: 42, readSpeed: '3200 MB/s', writeSpeed: '2800 MB/s' },
  { id: 'dev3', name: '/dev/sdd (Recovery Target)', capacity: '8 TB', used: '0 TB', health: 'rebuilding', temperature: 52, readSpeed: '120 MB/s', writeSpeed: '120 MB/s' },
];

const DUMMY_TICKETS: RecoveryTicket[] = [
  { id: 'REC-9942', client: 'Anichisom Studio', status: 'scanning', date: new Date().toISOString(), priority: 'high', payloadSize: 'Calculating...' },
  { id: 'REC-9941', client: 'Nexus Corp', status: 'recovered', date: new Date(Date.now() - 86400000).toISOString(), priority: 'medium', payloadSize: '2.4 TB' },
  { id: 'REC-9940', client: 'Unknown Drive (Corrupted)', status: 'failed', date: new Date(Date.now() - 172800000).toISOString(), priority: 'low' },
];

export function ZiklagTools({ window: osWindow }: { window: OSWindow }) {
  const { currentUser } = useOS();
  const [activeTab, setActiveTab] = useState<'overview' | 'disks' | 'tickets' | 'terminal' | 'hex' | 'telemetry'>('overview');
  const [disks, setDisks] = useState<DiskScan[]>(DUMMY_DISKS);
  const [tickets, setTickets] = useState<RecoveryTicket[]>(DUMMY_TICKETS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hexData, setHexData] = useState<{ address: string, bytes: string, ascii: string }[]>([]);
  const [hexMode, setHexMode] = useState<'hex' | 'telemetry'>('hex');

  useEffect(() => {
    // Generate mock hex data
    const generateHex = () => Array.from({ length: 64 }).map((_, i) => {
      const address = (i * 16).toString(16).padStart(8, '0').toUpperCase();
      const bytesArr = Array.from({ length: 16 }).map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase());
      const bytes = bytesArr.join(' ');
      const ascii = bytesArr.map(b => {
        const c = parseInt(b, 16);
        return (c >= 32 && c <= 126) ? String.fromCharCode(c) : '.';
      }).join('');
      return { address, bytes, ascii };
    });
    setHexData(generateHex());
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      // Simulate real-time updates
      setDisks([...DUMMY_DISKS].map(d => ({
        ...d,
        temperature: d.temperature + Math.floor(Math.random() * 5) - 2,
      })));
      setIsRefreshing(false);
    }, 1500);
  };
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDisks(prev => prev.map(d => ({
        ...d,
        temperature: d.temperature + (Math.random() > 0.5 ? 1 : -1),
      })));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getHealthColor = (health: DiskHealth) => {
    if (health === 'healthy') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    if (health === 'warning') return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    if (health === 'critical') return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    return 'text-neon-blue bg-neon-blue/10 border-neon-blue/20';
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#050505] text-white font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 shrink-0 bg-black/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-900/20 flex items-center justify-center border border-red-500/30">
            <Server className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-tight">Ziklag Diagnostic Terminal</h1>
            <div className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Hardware Payload & Recovery</div>
          </div>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-lg">
          {(['overview', 'disks', 'tickets', 'hex', 'terminal'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all",
                activeTab === tab ? "bg-white/10 text-white shadow" : "text-white/40 hover:text-white/80 hover:bg-white/5"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3">
           <button 
             onClick={handleRefresh}
             className={cn("p-2 rounded-full hover:bg-white/10 transition-colors", isRefreshing && "animate-spin text-neon-blue")}
           >
             <RefreshCcw className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="p-4 rounded-xl border border-white/5 bg-white/5 flex flex-col justify-between">
                 <div className="flex items-center justify-between mb-4">
                   <span className="text-xs text-white/50 uppercase tracking-widest font-mono">System Status</span>
                   <Shield className="w-4 h-4 text-emerald-400" />
                 </div>
                 <div className="text-2xl font-light">Online</div>
                 <div className="text-xs text-emerald-400 mt-1">All core arrays healthy</div>
               </div>
               
               <div className="p-4 rounded-xl border border-white/5 bg-white/5 flex flex-col justify-between">
                 <div className="flex items-center justify-between mb-4">
                   <span className="text-xs text-white/50 uppercase tracking-widest font-mono">Active Array</span>
                   <HardDrive className="w-4 h-4 text-neon-blue" />
                 </div>
                 <div className="text-2xl font-light">ZFS Pool</div>
                 <div className="text-xs text-white/40 mt-1">18.4 TB / 32.0 TB</div>
               </div>
               
               <div className="p-4 rounded-xl border border-white/5 bg-white/5 flex flex-col justify-between">
                 <div className="flex items-center justify-between mb-4">
                   <span className="text-xs text-white/50 uppercase tracking-widest font-mono">I/O Load</span>
                   <Activity className="w-4 h-4 text-amber-400" />
                 </div>
                 <div className="text-2xl font-light">45%</div>
                 <div className="text-xs text-amber-400 mt-1">Rebuild in progress</div>
               </div>
               
               <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex flex-col justify-between">
                 <div className="flex items-center justify-between mb-4">
                   <span className="text-xs text-rose-500/80 uppercase tracking-widest font-mono">Active Alerts</span>
                   <AlertTriangle className="w-4 h-4 text-rose-500" />
                 </div>
                 <div className="text-2xl font-light text-rose-500">2</div>
                 <div className="text-xs text-rose-500/60 mt-1">Drive degraded (/dev/sdc1)</div>
               </div>
            </div>
            
            <div className="p-6 rounded-xl border border-white/5 bg-[#0a0a0a] flex flex-col gap-4">
               <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80">Recent Payload Events</h3>
               <div className="flex flex-col gap-3 font-mono text-xs">
                 <div className="flex items-center gap-4 text-white/60">
                   <span className="text-white/30">14:22:01</span>
                   <span className="text-blue-400">[INFO]</span>
                   <span>New hardware payload mounted: UUID 8f4a-9b2c (/dev/nvme1n1)</span>
                 </div>
                 <div className="flex items-center gap-4 text-white/60">
                   <span className="text-white/30">14:15:33</span>
                   <span className="text-amber-400">[WARN]</span>
                   <span>High read latency detected on array 0. Throttling backup job.</span>
                 </div>
                 <div className="flex items-center gap-4 text-white/60">
                   <span className="text-white/30">13:40:12</span>
                   <span className="text-emerald-400">[SUCCESS]</span>
                   <span>Recovery ticket REC-9941 forensic copy verified. Hash matched.</span>
                 </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'disks' && (
          <div className="flex flex-col gap-4">
            {disks.map((disk) => (
              <div key={disk.id} className="p-5 rounded-xl border border-white/5 bg-[#0a0a0a] flex items-center justify-between group hover:border-white/20 transition-colors">
                <div className="flex items-center gap-5">
                   <div className={cn("px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider", getHealthColor(disk.health))}>
                      {disk.health}
                   </div>
                   <div className="flex flex-col">
                      <span className="font-mono text-sm font-bold">{disk.name}</span>
                      <span className="text-xs text-white/40 mt-0.5">{disk.used} / {disk.capacity}</span>
                   </div>
                </div>
                
                <div className="flex items-center gap-8 text-xs font-mono text-white/60">
                   <div className="flex flex-col gap-1 items-end">
                      <span className="text-white/30">TEMP</span>
                      <span className={cn(disk.temperature > 50 && "text-rose-500 font-bold")}>{disk.temperature}°C</span>
                   </div>
                   <div className="flex flex-col gap-1 items-end">
                      <span className="text-white/30">READ</span>
                      <span className="text-blue-400">{disk.readSpeed}</span>
                   </div>
                   <div className="flex flex-col gap-1 items-end">
                      <span className="text-white/30">WRITE</span>
                      <span className="text-emerald-400">{disk.writeSpeed}</span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="flex flex-col gap-4">
             <div className="flex justify-end mb-2">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors">
                  <Plus className="w-3 h-3" />
                  New Recovery Job
                </button>
             </div>
             <table className="w-full text-left text-sm border-collapse">
               <thead>
                 <tr className="border-b border-white/10 text-white/40 font-mono text-xs uppercase text-left">
                   <th className="pb-3 font-normal">Ticket ID</th>
                   <th className="pb-3 font-normal">Client / Target</th>
                   <th className="pb-3 font-normal">Status</th>
                   <th className="pb-3 font-normal">Payload</th>
                   <th className="pb-3 font-normal">Date (UTC)</th>
                 </tr>
               </thead>
               <tbody>
                 {tickets.map(ticket => (
                   <tr key={ticket.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                     <td className="py-4 font-mono text-red-400">{ticket.id}</td>
                     <td className="py-4 font-medium">{ticket.client}</td>
                     <td className="py-4">
                       <span className={cn(
                           "px-2 py-1 flex items-center justify-center w-24 text-[10px] font-bold uppercase tracking-wider rounded border",
                           ticket.status === 'recovered' ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' :
                           ticket.status === 'scanning' ? 'text-blue-400 border-blue-400/30 bg-blue-400/10 animate-pulse' :
                           ticket.status === 'failed' ? 'text-rose-500 border-rose-500/30 bg-rose-500/10' :
                           'text-white/60 border-white/20 bg-white/5'
                       )}>
                         {ticket.status}
                       </span>
                     </td>
                     <td className="py-4 font-mono text-xs text-white/50">{ticket.payloadSize || '--'}</td>
                     <td className="py-4 text-white/40 text-xs">{format(new Date(ticket.date), 'MMM dd HH:mm')}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}
        
        {activeTab === 'hex' && (
          <div className="h-full w-full flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                 <Terminal className="w-5 h-5 text-emerald-400" />
                 <div>
                   <h3 className="font-semibold text-white/90">Memory & Block Forensics</h3>
                   <div className="text-xs text-white/40 font-mono mt-0.5">/dev/sdc1 (Sector 0x00A4B1)</div>
                 </div>
              </div>
              <div className="flex bg-white/5 p-1 rounded-lg">
                 <button 
                    onClick={() => setHexMode('hex')}
                    className={cn("px-3 py-1 rounded text-xs font-semibold transition-colors", hexMode === 'hex' ? "bg-white/10 text-white" : "hover:text-white text-white/40 hover:bg-white/5")}
                 >
                    Hex Viewer
                 </button>
                 <button 
                    onClick={() => setHexMode('telemetry')}
                    className={cn("px-3 py-1 rounded text-xs font-semibold transition-colors", hexMode === 'telemetry' ? "bg-white/10 text-white" : "hover:text-white text-white/40 hover:bg-white/5")}
                 >
                    Telemetry stream
                 </button>
              </div>
            </div>
            {hexMode === 'hex' ? (
              <div className="flex-1 w-full bg-[#050505] rounded-xl border border-white/10 p-4 font-mono text-[13px] overflow-y-auto uppercase">
                 <div className="grid grid-cols-[80px_1fr_140px] gap-6 text-white/50 mb-3 border-b border-white/10 pb-2 font-bold sticky top-0 bg-[#050505] z-10">
                   <div>Offset</div>
                   <div>00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F</div>
                   <div>Decoded</div>
                 </div>
                 <div className="flex flex-col gap-1">
                   {hexData.map((row, i) => (
                     <div key={i} className="grid grid-cols-[80px_1fr_140px] gap-6 hover:bg-white/10 px-1 -mx-1 rounded transition-colors cursor-crosshair">
                        <div className="text-emerald-500/80">{row.address}</div>
                        <div className="text-white/70 tracking-[0.2em]">{row.bytes}</div>
                        <div className="text-amber-300/80 tracking-widest whitespace-pre">{row.ascii}</div>
                     </div>
                   ))}
                 </div>
              </div>
            ) : (
              <div className="flex-1 w-full bg-[#050505] rounded-xl border border-white/10 p-4 font-mono text-xs overflow-y-auto">
                 <div className="flex flex-col">
                    {Array.from({length: 30}).map((_, i) => (
                      <div key={i} className="flex gap-4 items-start border-b border-white/5 py-1.5 hover:bg-white/5 px-2 -mx-2">
                         <span className="text-white/30 whitespace-nowrap">{(new Date(Date.now() - i * 1420 - Math.random() * 5000)).toISOString().replace('T', ' ').replace('Z', '')}</span>
                         <span className={cn(i % 5 === 0 ? "text-amber-400" : "text-emerald-400")}>
                           {i % 5 === 0 ? '[WARN]' : '[INFO]'} {i % 5 === 0 ? `I/O LATENCY SPIKE DETECTED ON /dev/sdc1 (${Math.floor(Math.random() * 200 + 50)}ms)` : `BLOCK_READ SUCCESS SECTOR 0x00${Math.floor(Math.random() * 10000).toString(16).toUpperCase()} - 512 BYTES - CRC: OK`}
                         </span>
                      </div>
                    ))}
                 </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'terminal' && (
          <div className="h-full w-full bg-black rounded-lg border border-white/10 p-4 font-mono text-xs text-green-400 overflow-y-auto">
             <div>Welcome to Ziklag Diagnostics OS v2.0</div>
             <div># zpool status</div>
             <div className="text-white/60 mt-2">
                pool: storage_01<br/>
                state: ONLINE<br/>
                scan: scrub repaired 0B in 04:12:33 with 0 errors on Sun Oct 15 02:24:11 2026<br/>
                config:<br/>
                <br/>
                &nbsp;&nbsp;NAME&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;STATE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;READ WRITE CKSUM<br/>
                &nbsp;&nbsp;storage_01&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ONLINE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;raidz1-0&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ONLINE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ata-ST8000&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ONLINE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ata-ST8000_2&nbsp;&nbsp;&nbsp;&nbsp;ONLINE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ata-ST8000_3&nbsp;&nbsp;&nbsp;&nbsp;ONLINE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0<br/>
             </div>
             <div className="flex items-center gap-2 mt-4">
               <span className="text-blue-400">root@ziklag:~#</span>
               <div className="w-2 h-4 bg-white/80 animate-pulse" />
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
