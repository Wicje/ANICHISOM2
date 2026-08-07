'use client';

import React, { useState, useEffect } from 'react';
import { useOS, OSWindow } from '@/lib/os-context';
import { StorageAdapter } from '@/lib/storage';
import { HardDrive, Activity, AlertTriangle, CheckCircle, Clock, Server, Download, Upload, RefreshCcw, Search, Shield, Zap, Terminal, Plus, FileSearch, Link2, Hash } from 'lucide-react';
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

type ForensicCase = {
  id: string;
  client: string;
  status: 'intake' | 'imaging' | 'analysis' | 'recovered' | 'failed';
  date: string;
  driveSerial: string;
  investigator: string;
};

type Evidence = {
  id: string;
  caseId: string;
  type: 'hdd' | 'ssd' | 'flash' | 'mobile' | 'image';
  makeModel: string;
  serialNumber: string;
  capacity: string;
  receivedDate: string;
  condition: string;
};

type ChainOfCustodyEvent = {
  id: string;
  evidenceId: string;
  timestamp: string;
  action: 'received' | 'secured' | 'imaged' | 'analyzed' | 'returned' | 'destroyed';
  performedBy: string;
  location: string;
  notes: string;
};

type HashVerification = {
  id: string;
  evidenceId: string;
  timestamp: string;
  algorithm: 'MD5' | 'SHA-1' | 'SHA-256';
  originalHash: string;
  verifiedHash: string;
  match: boolean;
};

const DUMMY_DISKS: DiskScan[] = [
  { id: 'dev0', name: '/dev/md0 (RAID 5)', capacity: '32 TB', used: '18.4 TB', health: 'healthy', temperature: 38, readSpeed: '450 MB/s', writeSpeed: '410 MB/s' },
  { id: 'dev1', name: '/dev/sdc1 (Client Backup)', capacity: '4 TB', used: '3.8 TB', health: 'warning', temperature: 45, readSpeed: '85 MB/s', writeSpeed: '60 MB/s' },
  { id: 'dev2', name: '/dev/nvme0n1 (Cache)', capacity: '2 TB', used: '1.1 TB', health: 'healthy', temperature: 42, readSpeed: '3200 MB/s', writeSpeed: '2800 MB/s' },
  { id: 'dev3', name: '/dev/sdd (Recovery Target)', capacity: '8 TB', used: '0 TB', health: 'rebuilding', temperature: 52, readSpeed: '120 MB/s', writeSpeed: '120 MB/s' },
];

const DUMMY_CASES: ForensicCase[] = [
  { id: 'CASE-001', client: 'ContinuaOS Studio', status: 'imaging', date: new Date().toISOString(), driveSerial: 'WD-WCC6Y4', investigator: 'Admin' },
  { id: 'CASE-002', client: 'Nexus Corp', status: 'recovered', date: new Date(Date.now() - 86400000).toISOString(), driveSerial: 'SAMSUNG-S5', investigator: 'Admin' },
  { id: 'CASE-003', client: 'Unknown Drive', status: 'failed', date: new Date(Date.now() - 172800000).toISOString(), driveSerial: 'ST-8000VN', investigator: 'Admin' },
];

const DUMMY_EVIDENCE: Evidence[] = [
  { id: 'EV-001', caseId: 'CASE-001', type: 'hdd', makeModel: 'WD Blue 4TB', serialNumber: 'WD-WCC6Y4', capacity: '4TB', receivedDate: new Date().toISOString(), condition: 'Clicking head' },
  { id: 'EV-002', caseId: 'CASE-002', type: 'ssd', makeModel: 'Samsung 860 EVO', serialNumber: 'SAMSUNG-S5', capacity: '1TB', receivedDate: new Date(Date.now() - 86400000).toISOString(), condition: 'Dead controller' }
];

const DUMMY_CHAIN: ChainOfCustodyEvent[] = [
  { id: 'COC-001', evidenceId: 'EV-001', timestamp: new Date(Date.now() - 86400000).toISOString(), action: 'received', performedBy: 'Admin', location: 'Intake Desk', notes: 'Received via courier' },
  { id: 'COC-002', evidenceId: 'EV-001', timestamp: new Date(Date.now() - 40000000).toISOString(), action: 'secured', performedBy: 'Admin', location: 'Locker 4', notes: 'Placed in anti-static bag' },
  { id: 'COC-003', evidenceId: 'EV-001', timestamp: new Date(Date.now() - 20000000).toISOString(), action: 'imaged', performedBy: 'Admin', location: 'Imaging Station 1', notes: 'Bit-for-bit copy created' }
];

const DUMMY_HASHES: HashVerification[] = [
  { id: 'HV-001', evidenceId: 'EV-001', timestamp: new Date(Date.now() - 10000000).toISOString(), algorithm: 'SHA-256', originalHash: 'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855', verifiedHash: 'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855', match: true },
  { id: 'HV-002', evidenceId: 'EV-002', timestamp: new Date(Date.now() - 80000000).toISOString(), algorithm: 'MD5', originalHash: 'D41D8CD98F00B204E9800998ECF8427E', verifiedHash: 'D41D8CD98F00B204E9800998ECF8427E', match: true }
];

export function ZiklagTools({ window: osWindow }: { window: OSWindow }) {
  const { currentUser, emitEvent, workspaceMode } = useOS();
  const [storage] = useState(() => new StorageAdapter('ziklag-tools', workspaceMode));
  const [activeTab, setActiveTab] = useState<'overview' | 'disks' | 'cases' | 'evidence' | 'chain' | 'hash' | 'hex' | 'terminal'>('overview');
  const [disks, setDisks] = useState<DiskScan[]>([]);
  const [cases, setCases] = useState<ForensicCase[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [chainOfCustody, setChainOfCustody] = useState<ChainOfCustodyEvent[]>([]);
  const [hashVerifications, setHashVerifications] = useState<HashVerification[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hexData, setHexData] = useState<{ address: string, bytes: string, ascii: string }[]>(() => {
    return Array.from({ length: 64 }).map((_, i) => {
      const address = (i * 16).toString(16).padStart(8, '0').toUpperCase();
      const bytesArr = Array.from({ length: 16 }).map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase());
      const bytes = bytesArr.join(' ');
      const ascii = bytesArr.map(b => {
        const c = parseInt(b, 16);
        return (c >= 32 && c <= 126) ? String.fromCharCode(c) : '.';
      }).join('');
      return { address, bytes, ascii };
    });
  });
  const [telemetryLogs] = useState(() => {
    return Array.from({length: 30}).map((_, i) => {
      const timestamp = (new Date(Date.now() - i * 1420 - Math.random() * 5000)).toISOString().replace('T', ' ').replace('Z', '');
      const isWarn = i % 5 === 0;
      const latency = Math.floor(Math.random() * 200 + 50);
      const sector = Math.floor(Math.random() * 10000).toString(16).toUpperCase();
      return { timestamp, isWarn, latency, sector, index: i };
    });
  });
  const [hexMode, setHexMode] = useState<'hex' | 'telemetry'>('hex');

  const [verifyHashInput, setVerifyHashInput] = useState('');
  const [isHashingFile, setIsHashingFile] = useState(false);

  useEffect(() => {
    Promise.all([
      storage.get('disks'),
      storage.get('cases'),
      storage.get('evidence'),
      storage.get('chainOfCustody'),
      storage.get('hashVerifications')
    ]).then(([d, c, e, ch, h]) => {
      setDisks(d || DUMMY_DISKS);
      setCases(c || DUMMY_CASES);
      setEvidence(e || DUMMY_EVIDENCE);
      setChainOfCustody(ch || DUMMY_CHAIN);
      setHashVerifications(h || DUMMY_HASHES);
      setIsLoaded(true);
    });
  }, [storage]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setDisks(prev => {
        const next = prev.map(d => ({
          ...d,
          temperature: d.temperature + Math.floor(Math.random() * 5) - 2,
        }));
        storage.set('disks', next);
        return next;
      });
      setIsRefreshing(false);
    }, 1500);
  };
  
  useEffect(() => {
    if (!isLoaded) return;
    const interval = setInterval(() => {
      setDisks(prev => {
        const next = prev.map(d => ({
          ...d,
          temperature: d.temperature + (Math.random() > 0.5 ? 1 : -1),
        }));
        storage.set('disks', next);
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isLoaded, storage]);

  const handleVerifyHash = async () => {
    if (!verifyHashInput) return;
    
    // Convert input string to actual buffer for real hashing using WebCrypto
    const encoder = new TextEncoder();
    const data = encoder.encode(verifyHashInput);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    // Simulate hash verification against the typed input just to show the real WebCrypto result
    const newHash: HashVerification = {
      id: `HV-${Math.floor(Math.random() * 1000)}`,
      evidenceId: 'EV-001',
      timestamp: new Date().toISOString(),
      algorithm: 'SHA-256',
      originalHash: verifyHashInput, // The raw string provided
      verifiedHash: computedHash, // The actual computed WebCrypto hash of the string!
      match: verifyHashInput.toUpperCase() === computedHash // Checks if they typed the hash itself
    };
    
    const newHashes = [newHash, ...hashVerifications];
    setHashVerifications(newHashes);
    storage.set('hashVerifications', newHashes);
    setVerifyHashInput('');
    
    emitEvent({
      workspaceId: 'global',
      type: 'hash_verified',
      entityId: newHash.id,
      userId: currentUser?.id || 'unknown',
      newValue: { match: newHash.match, evidenceId: newHash.evidenceId, computed: computedHash },
      comment: `Verified WebCrypto hash for ${newHash.evidenceId}`
    });
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]!;
      setIsHashingFile(true);
      try {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        
        const newHash: HashVerification = {
          id: `HV-${Math.floor(Math.random() * 1000)}`,
          evidenceId: file.name,
          timestamp: new Date().toISOString(),
          algorithm: 'SHA-256',
          originalHash: verifyHashInput || 'N/A',
          verifiedHash: computedHash,
          match: verifyHashInput ? verifyHashInput.toUpperCase() === computedHash : false
        };
        
        const newHashes = [newHash, ...hashVerifications];
        setHashVerifications(newHashes);
        storage.set('hashVerifications', newHashes);
        setVerifyHashInput('');
        
        emitEvent({
          workspaceId: 'global',
          type: 'hash_verified',
          entityId: newHash.id,
          userId: currentUser?.id || 'unknown',
          newValue: { match: newHash.match, evidenceId: newHash.evidenceId, computed: computedHash },
          comment: `Verified WebCrypto hash for file ${newHash.evidenceId}`
        });
      } catch (err) {
        console.error("Hashing failed", err);
      } finally {
        setIsHashingFile(false);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const getHealthColor = (health: DiskHealth) => {
    if (health === 'healthy') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    if (health === 'warning') return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    if (health === 'critical') return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    return 'text-neon-blue bg-neon-blue/10 border-neon-blue/20';
  };

  if (!isLoaded) {
    return <div className="w-full h-full bg-[var(--os-bg)] flex items-center justify-center text-white/50 animate-pulse">Initializing Ziklag Core...</div>;
  }

  return (
    <div className="w-full h-full flex flex-col bg-[var(--os-bg)] text-white font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 shrink-0 bg-black/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-900/20 flex items-center justify-center border border-red-500/30">
            <Server className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-tight">Ziklag Forensics Desk</h1>
            <div className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Data Recovery & Custody</div>
          </div>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-lg overflow-x-auto no-scrollbar max-w-[50%]">
          {(['overview', 'cases', 'evidence', 'chain', 'hash', 'disks', 'hex', 'terminal'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap",
                activeTab === tab ? "bg-white/10 text-white shadow" : "text-white/40 hover:text-white/80 hover:bg-white/5"
              )}
            >
              {tab === 'chain' ? 'Chain of Custody' : tab === 'hash' ? 'Hash Verifier' : tab}
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
                   <span className="text-xs text-white/50 uppercase tracking-widest font-mono">Active Cases</span>
                   <FileSearch className="w-4 h-4 text-emerald-400" />
                 </div>
                 <div className="text-2xl font-light">3</div>
                 <div className="text-xs text-emerald-400 mt-1">1 in imaging phase</div>
               </div>
               
               <div className="p-4 rounded-xl border border-white/5 bg-white/5 flex flex-col justify-between">
                 <div className="flex items-center justify-between mb-4">
                   <span className="text-xs text-white/50 uppercase tracking-widest font-mono">Evidence Items</span>
                   <HardDrive className="w-4 h-4 text-neon-blue" />
                 </div>
                 <div className="text-2xl font-light">2</div>
                 <div className="text-xs text-white/40 mt-1">Secured in lockers</div>
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
                   <span className="text-xs text-rose-500/80 uppercase tracking-widest font-mono">Integrity Alerts</span>
                   <AlertTriangle className="w-4 h-4 text-rose-500" />
                 </div>
                 <div className="text-2xl font-light text-rose-500">0</div>
                 <div className="text-xs text-emerald-400 mt-1">All hashes verified</div>
               </div>
            </div>
            
            <div className="p-6 rounded-xl border border-white/5 bg-[#0a0a0a] flex flex-col gap-4">
               <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80">Recent Forensic Events</h3>
               <div className="flex flex-col gap-3 font-mono text-xs">
                 <div className="flex items-center gap-4 text-white/60">
                   <span className="text-white/30">14:22:01</span>
                   <span className="text-blue-400">[CHAIN]</span>
                   <span>Evidence EV-001 moved to Imaging Station 1 by Admin</span>
                 </div>
                 <div className="flex items-center gap-4 text-white/60">
                   <span className="text-white/30">14:15:33</span>
                   <span className="text-amber-400">[WARN]</span>
                   <span>High read latency detected on evidence source drive. Throttling imager.</span>
                 </div>
                 <div className="flex items-center gap-4 text-white/60">
                   <span className="text-white/30">13:40:12</span>
                   <span className="text-emerald-400">[HASH]</span>
                   <span>Forensic image verified. SHA-256 matched original media block.</span>
                 </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'cases' && (
          <div className="flex flex-col gap-4">
             <div className="flex justify-end mb-2">
                <button 
                  onClick={() => {
                     const client = prompt('Enter client name:');
                     if (!client) return;
                     const newCase: ForensicCase = { id: `CASE-00${cases.length + 1}`, client, status: 'intake', date: new Date().toISOString(), driveSerial: 'UNKNOWN', investigator: currentUser?.name || 'Admin' };
                     setCases(prev => { const n = [...prev, newCase]; storage.set('cases', n); return n; });
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors">
                  <Plus className="w-3 h-3" />
                  New Case
                </button>
             </div>
             <table className="w-full text-left text-sm border-collapse">
               <thead>
                 <tr className="border-b border-white/10 text-white/40 font-mono text-xs uppercase text-left">
                   <th className="pb-3 font-normal">Case ID</th>
                   <th className="pb-3 font-normal">Client</th>
                   <th className="pb-3 font-normal">Status</th>
                   <th className="pb-3 font-normal">Target Drive</th>
                   <th className="pb-3 font-normal">Investigator</th>
                 </tr>
               </thead>
               <tbody>
                 {cases.map(c => (
                   <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer">
                     <td className="py-4 font-mono text-red-400">{c.id}</td>
                     <td className="py-4 font-medium">{c.client}</td>
                     <td className="py-4">
                       <span className={cn(
                           "px-2 py-1 flex items-center justify-center w-24 text-[10px] font-bold uppercase tracking-wider rounded border",
                           c.status === 'recovered' ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' :
                           c.status === 'imaging' ? 'text-blue-400 border-blue-400/30 bg-blue-400/10 animate-pulse' :
                           c.status === 'failed' ? 'text-rose-500 border-rose-500/30 bg-rose-500/10' :
                           'text-white/60 border-white/20 bg-white/5'
                       )}>
                         {c.status}
                       </span>
                     </td>
                     <td className="py-4 font-mono text-xs text-white/50">{c.driveSerial}</td>
                     <td className="py-4 text-white/60 text-xs">{c.investigator}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="flex flex-col gap-4">
             <div className="flex justify-end mb-2">
                <button 
                  onClick={() => {
                     const model = prompt('Enter Drive Model/Type:');
                     if (!model) return;
                     const newEv: Evidence = { id: `EV-00${evidence.length + 1}`, caseId: 'CASE-001', type: 'hdd', makeModel: model, serialNumber: 'UNKNOWN', capacity: 'Unknown', receivedDate: new Date().toISOString(), condition: 'Unknown' };
                     setEvidence(prev => { const n = [...prev, newEv]; storage.set('evidence', n); return n; });
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors">
                  <Plus className="w-3 h-3" />
                  Log Evidence
                </button>
             </div>
             <table className="w-full text-left text-sm border-collapse">
               <thead>
                 <tr className="border-b border-white/10 text-white/40 font-mono text-xs uppercase text-left">
                   <th className="pb-3 font-normal">ID / Case</th>
                   <th className="pb-3 font-normal">Type & Model</th>
                   <th className="pb-3 font-normal">Serial Number</th>
                   <th className="pb-3 font-normal">Condition</th>
                   <th className="pb-3 font-normal">Date Logged</th>
                 </tr>
               </thead>
               <tbody>
                 {evidence.map(e => (
                   <tr key={e.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer">
                     <td className="py-4">
                       <div className="font-mono text-red-400 text-sm">{e.id}</div>
                       <div className="font-mono text-xs text-white/40">{e.caseId}</div>
                     </td>
                     <td className="py-4">
                       <div className="font-medium">{e.makeModel} ({e.capacity})</div>
                       <div className="text-xs uppercase tracking-wider text-white/40 mt-1">{e.type}</div>
                     </td>
                     <td className="py-4 font-mono text-xs text-white/70">{e.serialNumber}</td>
                     <td className="py-4 text-white/60 text-xs">{e.condition}</td>
                     <td className="py-4 text-white/40 text-xs">{format(new Date(e.receivedDate), 'MMM dd, yyyy')}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}

        {activeTab === 'chain' && (
          <div className="flex flex-col gap-4 max-w-4xl mx-auto">
             <div className="flex items-center justify-between mb-4">
               <h2 className="text-lg font-light text-white/90">Chain of Custody Log</h2>
               <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors">
                 <Plus className="w-3 h-3" />
                 Log Event
               </button>
             </div>
             
             <div className="relative pl-8 border-l border-white/10 space-y-8 mt-4">
               {chainOfCustody.map((coc, i) => (
                 <div key={coc.id} className="relative">
                   <div className="absolute -left-[41px] bg-[var(--os-bg)] p-1 rounded-full">
                     <div className={cn(
                       "w-4 h-4 rounded-full border-2",
                       coc.action === 'received' ? 'bg-emerald-500/20 border-emerald-500' :
                       coc.action === 'secured' ? 'bg-blue-500/20 border-blue-500' :
                       coc.action === 'imaged' ? 'bg-emerald-500/20 border-emerald-500' :
                       'bg-white/20 border-white/50'
                     )} />
                   </div>
                   
                   <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 hover:border-white/20 transition-colors">
                     <div className="flex justify-between items-start mb-3">
                       <div className="flex items-center gap-3">
                         <span className={cn(
                           "px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded",
                           coc.action === 'received' ? 'bg-emerald-500/10 text-emerald-400' :
                           coc.action === 'secured' ? 'bg-blue-500/10 text-blue-400' :
                           coc.action === 'imaged' ? 'bg-emerald-500/10 text-emerald-400' :
                           'bg-white/10 text-white/70'
                         )}>
                           {coc.action}
                         </span>
                         <span className="font-mono text-xs text-white/50">{coc.evidenceId}</span>
                       </div>
                       <span className="text-xs text-white/40 font-mono">{format(new Date(coc.timestamp), 'yyyy-MM-dd HH:mm:ss')}</span>
                     </div>
                     
                     <p className="text-sm text-white/80 mb-3">{coc.notes}</p>
                     
                     <div className="flex gap-6 text-xs text-white/50">
                       <div className="flex items-center gap-2">
                         <Shield className="w-3 h-3" />
                         <span>{coc.performedBy}</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <Link2 className="w-3 h-3" />
                         <span>{coc.location}</span>
                       </div>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {activeTab === 'hash' && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-light text-white/90 mb-4 flex items-center gap-2">
                <Hash className="w-5 h-5 text-neon-blue" />
                Hash Verifier
              </h2>
              
              <div className="flex gap-4">
                <input 
                  type="text" 
                  value={verifyHashInput}
                  onChange={(e) => setVerifyHashInput(e.target.value)}
                  placeholder="Enter expected MD5, SHA-1, or SHA-256 hash to verify against selected evidence image..."
                  className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-2 text-sm font-mono focus:outline-none focus:border-neon-blue transition-colors"
                />
                <button 
                  onClick={handleVerifyHash}
                  disabled={!verifyHashInput}
                  className="px-6 py-2 bg-white text-black hover:bg-white/90 disabled:opacity-50 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors"
                >
                  Verify
                </button>
              </div>
              <div 
                className={cn("mt-4 border-2 border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center justify-center transition-colors", isHashingFile ? "bg-white/5 border-neon-blue" : "hover:border-white/40 hover:bg-white/5")}
                onDrop={handleFileDrop}
                onDragOver={handleDragOver}
              >
                {isHashingFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCcw className="w-8 h-8 text-neon-blue animate-spin" />
                    <span className="text-sm font-mono text-white/70">Hashing File via WebCrypto...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 pointer-events-none">
                    <Upload className="w-8 h-8 text-white/30" />
                    <span className="text-sm font-mono text-white/50">Drag & Drop a local file here to compute its SHA-256 hash</span>
                    <span className="text-[10px] text-white/30 uppercase tracking-widest mt-1">100% Client-Side. Zero Uploads.</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Verification History</h3>
              {hashVerifications.map(hv => (
                <div key={hv.id} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded flex items-center gap-1",
                        hv.match ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500'
                      )}>
                        {hv.match ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        {hv.match ? 'MATCH' : 'MISMATCH'}
                      </span>
                      <span className="font-mono text-xs text-white/50">{hv.evidenceId} ({hv.algorithm})</span>
                    </div>
                    <span className="text-xs text-white/40 font-mono">{format(new Date(hv.timestamp), 'yyyy-MM-dd HH:mm:ss')}</span>
                  </div>
                  
                  <div className="grid grid-cols-[100px_1fr] gap-2 text-xs font-mono">
                    <div className="text-white/40">Expected:</div>
                    <div className="text-white/80 break-all">{hv.originalHash}</div>
                    <div className="text-white/40">Computed:</div>
                    <div className={cn("break-all", hv.match ? "text-emerald-400/80" : "text-rose-500/80")}>
                      {hv.verifiedHash}
                    </div>
                  </div>
                </div>
              ))}
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
              <div className="flex-1 w-full bg-[var(--os-bg)] rounded-xl border border-white/10 p-4 font-mono text-[13px] overflow-y-auto uppercase">
                 <div className="grid grid-cols-[80px_1fr_140px] gap-6 text-white/50 mb-3 border-b border-white/10 pb-2 font-bold sticky top-0 bg-[var(--os-bg)] z-10">
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
              <div className="flex-1 w-full bg-[var(--os-bg)] rounded-xl border border-white/10 p-4 font-mono text-xs overflow-y-auto">
                 <div className="flex flex-col">
                    {telemetryLogs.map((log) => (
                      <div key={log.index} className="flex gap-4 items-start border-b border-white/5 py-1.5 hover:bg-white/5 px-2 -mx-2">
                         <span className="text-white/30 whitespace-nowrap">{log.timestamp}</span>
                         <span className={cn(log.isWarn ? "text-amber-400" : "text-emerald-400")}>
                           {log.isWarn ? '[WARN]' : '[INFO]'} {log.isWarn ? `I/O LATENCY SPIKE DETECTED ON /dev/sdc1 (${log.latency}ms)` : `BLOCK_READ SUCCESS SECTOR 0x00${log.sector} - 512 BYTES - CRC: OK`}
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
