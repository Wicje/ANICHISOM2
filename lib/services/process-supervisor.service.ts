'use client';

export interface VirtualProcess {
  pid: number;
  id: string; // app ID, e.g. 'code-editor', 'media-player'
  name: string;
  windowId: string;
  threads: number;
  cpuPercent: number;
  memoryMB: number;
  status: 'running' | 'idle' | 'unresponsive';
  startedAt: number;
  lastHeartbeat: number;
}

class ProcessSupervisorService {
  private processes = new Map<number, VirtualProcess>();
  private nextPid = 1000;
  private watchdogInterval: NodeJS.Timeout | null = null;
  private subscribers = new Set<(processes: VirtualProcess[]) => void>();

  constructor() {
    this.startWatchdog();
  }

  private startWatchdog() {
    if (typeof window === 'undefined') return;

    // Seed default background system processes
    this.registerProcess('kernel', 'Continua VFS Kernel Core', 'kernel-root', 4, 38.5);
    this.registerProcess('compositor', 'Window Compositor & WebGL', 'system-ui', 2, 24.2);
    this.registerProcess('audio-engine', 'Web Audio DSP Engine', 'audio-singleton', 2, 16.8);
    this.registerProcess('p2p-network', 'WebRTC DataChannel Mesh', 'network-daemon', 1, 12.4);

    this.watchdogInterval = setInterval(() => {
      this.checkHeartbeats();
    }, 1200);
  }

  public registerProcess(id: string, name: string, windowId: string, threads = 1, baseMem = 25.0): number {
    const pid = this.nextPid++;
    const proc: VirtualProcess = {
      pid,
      id,
      name,
      windowId,
      threads,
      cpuPercent: Math.floor(Math.random() * 4) + 1,
      memoryMB: baseMem + Math.floor(Math.random() * 10),
      status: 'running',
      startedAt: Date.now(),
      lastHeartbeat: Date.now(),
    };
    this.processes.set(pid, proc);
    this.notifySubscribers();
    return pid;
  }

  public heartbeat(pid: number, cpu?: number, memory?: number) {
    const proc = this.processes.get(pid);
    if (proc) {
      proc.lastHeartbeat = Date.now();
      proc.status = 'running';
      if (cpu !== undefined) proc.cpuPercent = cpu;
      if (memory !== undefined) proc.memoryMB = memory;
      this.notifySubscribers();
    }
  }

  public terminateProcess(pid: number): boolean {
    const proc = this.processes.get(pid);
    if (!proc) return false;

    // Disallow killing critical kernel root
    if (proc.id === 'kernel') return false;

    this.processes.delete(pid);
    this.notifySubscribers();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('os:process-killed', {
        detail: { pid, windowId: proc.windowId, name: proc.name }
      }));
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: {
          title: 'Process Terminated',
          description: `Force quit ${proc.name} (PID: ${pid}). Reclaimed ${proc.memoryMB.toFixed(1)} MB.`,
          type: 'info'
        }
      }));
    }
    return true;
  }

  public unregisterWindow(windowId: string) {
    for (const [pid, proc] of this.processes.entries()) {
      if (proc.windowId === windowId) {
        this.processes.delete(pid);
      }
    }
    this.notifySubscribers();
  }

  private checkHeartbeats() {
    const now = Date.now();
    let updated = false;

    for (const proc of this.processes.values()) {
      // Don't flag system daemons
      if (['kernel', 'compositor', 'audio-engine', 'p2p-network'].includes(proc.id)) {
        // Vary simulated CPU load slightly
        proc.cpuPercent = Math.max(0.5, +(Math.random() * 3).toFixed(1));
        continue;
      }

      // Check if process missed heartbeat for > 4.5s
      if (now - proc.lastHeartbeat > 4500 && proc.status !== 'unresponsive') {
        proc.status = 'unresponsive';
        proc.cpuPercent = 99.1; // simulate lockup
        updated = true;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('os:process-unresponsive', {
            detail: { pid: proc.pid, name: proc.name, windowId: proc.windowId }
          }));
        }
      }
    }

    if (updated) this.notifySubscribers();
  }

  public getAllProcesses(): VirtualProcess[] {
    return Array.from(this.processes.values());
  }

  public subscribe(fn: (processes: VirtualProcess[]) => void): () => void {
    this.subscribers.add(fn);
    fn(this.getAllProcesses());
    return () => this.subscribers.delete(fn);
  }

  private notifySubscribers() {
    const procs = this.getAllProcesses();
    this.subscribers.forEach(fn => fn(procs));
  }
}

export const processSupervisor = new ProcessSupervisorService();
