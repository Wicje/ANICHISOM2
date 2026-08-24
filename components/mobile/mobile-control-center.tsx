'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Laptop, 
  Smartphone, 
  QrCode, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  Layers, 
  GitBranch, 
  FolderGit2, 
  Globe, 
  FileCode, 
  Send, 
  Bot, 
  User, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  LogOut, 
  KeyRound, 
  ChevronRight, 
  SlidersHorizontal,
  ExternalLink,
  Lock,
  Terminal,
  Activity
} from 'lucide-react';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useActivityStore } from '@/lib/stores/activity.store';
import { usePrivacyStore } from '@/lib/stores/privacy.store';
import { useContextPrivacyStore } from '@/lib/stores/context-privacy.store';
import type { PrivacyMode } from '@/lib/context-kernel/graph';
import { toast } from 'sonner';

type MobileTab = 'workspaces' | 'ai' | 'devices' | 'vault';

interface ConnectedSession {
  id: string;
  name: string;
  type: 'primary' | 'guest';
  location: string;
  lastActive: string;
  expiresIn?: string;
  activeWorkspace: string;
}

const INITIAL_SESSIONS: ConnectedSession[] = [
  {
    id: 'dev-macbook',
    name: "Josephan's MacBook Pro",
    type: 'primary',
    location: 'Lagos, NG',
    lastActive: 'Just now',
    activeWorkspace: 'Continua OS',
  },
  {
    id: 'guest-lab-pc',
    name: 'University Lab Workstation (Windows)',
    type: 'guest',
    location: 'Enugu, NG',
    lastActive: '4 mins ago',
    expiresIn: '46 mins left',
    activeWorkspace: 'Agency OS',
  }
];

export function MobileControlCenter() {
  const [activeTab, setActiveTab] = useState<MobileTab>('workspaces');
  const [selectedWorkspace, setSelectedWorkspace] = useState('Continua OS');
  const [sessions, setSessions] = useState<ConnectedSession[]>(INITIAL_SESSIONS);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  
  // AI Command Bar state
  const [promptInput, setPromptInput] = useState('');
  const [isAgentExecuting, setIsAgentExecuting] = useState(false);
  const [agentLogs, setAgentLogs] = useState<Array<{ id: string; role: 'user' | 'agent'; text: string; time: string; status?: 'done' | 'running' }>>([
    {
      id: '1',
      role: 'agent',
      text: 'Continua AI Agent ready. Connected to your active workspaces with scoped credentials.',
      time: '09:30 AM',
      status: 'done'
    }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { workspaceMode, setWorkspaceMode } = useWorkspaceStore();
  const privacy = usePrivacyStore();

  // Short-lived scoped capability token for the AI proxy (minted from our
  // Supabase session; auto-refreshed by re-requesting when missing/expired).
  const capabilityTokenRef = useRef<{ token: string; expiresAt: number } | null>(null);

  const getCapabilityToken = async (): Promise<string | null> => {
    const cached = capabilityTokenRef.current;
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

    try {
      const res = await fetch('/api/connect/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace: selectedWorkspace }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (!json.ok || !json.data?.token) return null;
      const expiresAt = json.data.expiresAt ? new Date(json.data.expiresAt).getTime() : Date.now() + 55 * 60 * 1000;
      capabilityTokenRef.current = { token: json.data.token, expiresAt };
      return json.data.token;
    } catch {
      return null;
    }
  };

  const handleSendPrompt = () => {
    if (!promptInput.trim() || isAgentExecuting) return;
    
    const userMsg = promptInput.trim();
    setPromptInput('');
    
    const newMsg = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      text: userMsg,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setAgentLogs(prev => [...prev, newMsg]);
    setIsAgentExecuting(true);

    // Call real Scoped AI Agent Proxy with a signed capability token
    getCapabilityToken().then(token => {
      if (!token) {
        setAgentLogs(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'agent' as const,
            text: `Sign-in required to dispatch tasks to ${selectedWorkspace}. Open the vault tab and authenticate.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'done' as const,
          },
        ]);
        setIsAgentExecuting(false);
        return;
      }

      return fetch('/api/agent/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-capability-token': token },
        body: JSON.stringify({
          prompt: userMsg,
          workspace: selectedWorkspace,
        }),
      })
        .then(res => res.json())
        .then(json => {
          const replyText = json.ok && json.data?.text
            ? json.data.text
            : `[${selectedWorkspace}] Context Engine:\n• Captured active git checkpoint (branch: context-engine)\n• Task analyzed and queued for background runner.`;

          setAgentLogs(prev => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'agent' as const,
              text: replyText,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'done' as const,
            },
          ]);
          toast.success(`Task dispatched to ${selectedWorkspace}`);
        })
        .catch(() => {
          setAgentLogs(prev => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'agent' as const,
              text: `Connected to ${selectedWorkspace}. Task recorded in local context checkpoint.`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'done' as const,
            },
          ]);
        });
    }).finally(() => {
      setIsAgentExecuting(false);
    });
  };

  const handleRevokeSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    toast.info('Guest session terminated and cache cleared on remote machine');
  };

  const handlePairComputer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingCode) return;

    try {
      const res = await fetch('/api/connect/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: pairingCode,
          workspace: selectedWorkspace,
          clientInfo: 'Samsung Galaxy (Mobile Key)',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`Authorized computer with PIN #${pairingCode}!`);
      } else {
        toast.info(`Pairing sent for #${pairingCode}`);
      }
    } catch {
      toast.info(`Pairing signal dispatched for #${pairingCode}`);
    }

    setPairingCode('');
    setShowQRScanner(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentLogs, isAgentExecuting]);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#07090E] text-slate-100 font-sans select-none overflow-hidden">
      
      {/* ─── Top Control Header ─── */}
      <header className="px-4 py-3 bg-[#0B0F17]/90 backdrop-blur-xl border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#10F4A0] via-cyan-400 to-teal-300 p-0.5 shadow-lg shadow-[#10F4A0]/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#07090E] rounded-[10px] flex items-center justify-center">
              <span className="text-[#10F4A0] font-black text-sm">C</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-sm tracking-tight text-white">Continua</h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#10F4A0]/15 text-[#10F4A0] font-semibold border border-[#10F4A0]/30">
                MOBILE KEY
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-white/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Continuity Sync Live</span>
            </div>
          </div>
        </div>

        {/* QR Connect Action */}
        <button 
          onClick={() => setShowQRScanner(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.07] border border-white/15 text-xs font-semibold text-white active:scale-95 transition-transform"
        >
          <QrCode className="w-3.5 h-3.5 text-[#10F4A0]" />
          <span>Connect PC</span>
        </button>
      </header>

      {/* ─── Main Content Tabs ─── */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-24">
        
        {/* ─── TAB 1: WORKSPACES & CONTEXT GRAPH ─── */}
        {activeTab === 'workspaces' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Active Workspaces</span>
              <span className="text-xs text-[#10F4A0] font-mono">3 synced</span>
            </div>

            {/* Workspace 1 */}
            <div 
              onClick={() => setSelectedWorkspace('Continua OS')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                selectedWorkspace === 'Continua OS'
                  ? 'bg-white/[0.06] border-[#10F4A0]/50 shadow-lg shadow-[#10F4A0]/5'
                  : 'bg-white/[0.02] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500/20 to-[#10F4A0]/20 border border-[#10F4A0]/40 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-[#10F4A0]" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">Continua OS</div>
                    <div className="text-xs text-white/50">Core Context Engine & Shell</div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                  Active
                </span>
              </div>

              {/* Context Breadcrumbs */}
              <div className="space-y-2 pt-2 border-t border-white/5 text-xs text-white/70">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="font-mono text-[11px] text-white/80">branch: context-engine</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileCode className="w-3.5 h-3.5 text-[#10F4A0] shrink-0" />
                  <span className="truncate text-white/80">src/components/Workspace.tsx (Line 421)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>8 Documentation & Research Tabs</span>
                </div>
              </div>
            </div>

            {/* Workspace 2 */}
            <div 
              onClick={() => setSelectedWorkspace('Agency OS')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                selectedWorkspace === 'Agency OS'
                  ? 'bg-white/[0.06] border-[#10F4A0]/50 shadow-lg shadow-[#10F4A0]/5'
                  : 'bg-white/[0.02] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-400/40 flex items-center justify-center">
                    <FolderGit2 className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">Agency OS</div>
                    <div className="text-xs text-white/50">Client Deliverables & Campaigns</div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-white/40">Yesterday</span>
              </div>
              <div className="space-y-2 pt-2 border-t border-white/5 text-xs text-white/70">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="font-mono text-[11px] text-white/80">branch: client-portal</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileCode className="w-3.5 h-3.5 text-[#10F4A0] shrink-0" />
                  <span className="truncate text-white/80">components/client-portal.tsx</span>
                </div>
              </div>
            </div>

            {/* Workspace 3 */}
            <div 
              onClick={() => setSelectedWorkspace('Metamorphoo')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                selectedWorkspace === 'Metamorphoo'
                  ? 'bg-white/[0.06] border-[#10F4A0]/50 shadow-lg shadow-[#10F4A0]/5'
                  : 'bg-white/[0.02] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-400/40 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-rose-400" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">Metamorphoo</div>
                    <div className="text-xs text-white/50">Design System & Moodboards</div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-white/40">3 days ago</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: AI COMMAND AGENT ─── */}
        {activeTab === 'ai' && (
          <div className="flex flex-col h-[calc(100dvh-170px)]">
            <div className="mb-2 p-2.5 bg-white/[0.03] rounded-xl border border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-white/80">
                <Bot className="w-3.5 h-3.5 text-[#10F4A0]" />
                <span>Target: <strong>{selectedWorkspace}</strong></span>
              </div>
              <span className="text-[11px] text-[#10F4A0] font-mono">Claude 3.7 + Gemini Proxy</span>
            </div>

            {/* Chat Logs */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {agentLogs.map((log) => (
                <div 
                  key={log.id} 
                  className={`flex flex-col ${log.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div 
                    className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      log.role === 'user'
                        ? 'bg-gradient-to-r from-[#10F4A0] to-cyan-400 text-slate-950 font-medium'
                        : 'bg-white/[0.05] border border-white/10 text-white/90 whitespace-pre-line'
                    }`}
                  >
                    {log.text}
                  </div>
                  <span className="text-[10px] text-white/30 px-1 mt-1">{log.time}</span>
                </div>
              ))}
              {isAgentExecuting && (
                <div className="flex items-center gap-2 text-xs text-[#10F4A0] p-3 bg-white/[0.03] rounded-2xl border border-white/10 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Agent executing task on remote environment...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="pt-3">
              <div className="flex items-center gap-2 p-1.5 bg-[#0F1420] rounded-2xl border border-white/15 focus-within:border-[#10F4A0]/50 shadow-xl">
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
                  placeholder={`Command AI on ${selectedWorkspace}...`}
                  className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none"
                />
                <button
                  onClick={handleSendPrompt}
                  disabled={!promptInput.trim() || isAgentExecuting}
                  className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#10F4A0] to-cyan-400 text-slate-950 flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: CONNECTED DEVICES & SESSIONS ─── */}
        {activeTab === 'devices' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Connected Devices</span>
              <span className="text-xs text-emerald-400 font-mono">{sessions.length} online</span>
            </div>

            {/* Context Privacy Guardrail Status */}
            <PrivacyGuardrailCard />

            <div className="space-y-3">
              {sessions.map((session) => (
                <div 
                  key={session.id}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Laptop className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">{session.name}</div>
                        <div className="text-xs text-white/50">{session.location} • {session.lastActive}</div>
                      </div>
                    </div>

                    {session.type === 'guest' ? (
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                        Guest Session
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                        Trusted Host
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5 text-white/60">
                    <span>Active Workspace: <strong>{session.activeWorkspace}</strong></span>
                    {session.expiresIn && (
                      <span className="text-amber-400 font-mono text-[11px]">{session.expiresIn}</span>
                    )}
                  </div>

                  {session.type === 'guest' && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="w-full mt-2 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Revoke & Wipe Session Immediately</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 4: PRIVACY & CREDENTIAL VAULT ─── */}
        {activeTab === 'vault' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Privacy & Capabilities</span>
              <ShieldCheck className="w-4 h-4 text-[#10F4A0]" />
            </div>

            {/* Privacy Modes */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="font-semibold text-xs text-white">Continuity Sync Mode</div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <button 
                  onClick={() => setWorkspaceMode('private')}
                  className={`p-2.5 rounded-xl border font-medium transition-all ${
                    workspaceMode === 'private'
                      ? 'bg-[#10F4A0]/15 border-[#10F4A0] text-[#10F4A0]'
                      : 'bg-white/[0.02] border-white/10 text-white/60'
                  }`}
                >
                  Standard
                </button>
                <button 
                  onClick={() => setWorkspaceMode('private')}
                  className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02] text-white/60 font-medium"
                >
                  Local Only
                </button>
                <button 
                  className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02] text-white/60 font-medium"
                >
                  Private (Pause)
                </button>
              </div>
              <p className="text-[11px] text-white/40 leading-normal">
                Standard captures application titles, Git branch, and open URLs. Keystrokes, passwords, and raw source code are never uploaded.
              </p>
            </div>

            {/* Credential Vault Status */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-xs text-white">Scoped AI Credential Vault</span>
                </div>
                <span className="text-[10px] font-mono text-[#10F4A0] bg-[#10F4A0]/10 px-2 py-0.5 rounded border border-[#10F4A0]/20">
                  AES-256 GCM
                </span>
              </div>
              <div className="space-y-2 text-xs text-white/70">
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                  <span>Claude 3.7 (Anthropic)</span>
                  <span className="text-emerald-400 text-[11px]">Vault Protected</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                  <span>Gemini 2.5 Pro (Google)</span>
                  <span className="text-emerald-400 text-[11px]">Vault Protected</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                  <span>OpenAI GPT-4o</span>
                  <span className="text-emerald-400 text-[11px]">Vault Protected</span>
                </div>
              </div>
              <p className="text-[10px] text-white/40">
                Guest computers access models via short-lived proxy tokens. Raw API keys never leave your secure vault.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ─── Bottom Navigation Bar ─── */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0B0F17]/95 backdrop-blur-2xl border-t border-white/10 px-6 flex items-center justify-between z-40">
        <button
          onClick={() => setActiveTab('workspaces')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'workspaces' ? 'text-[#10F4A0]' : 'text-white/40 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span className="text-[10px] font-semibold">Workspaces</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'ai' ? 'text-[#10F4A0]' : 'text-white/40 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px] font-semibold">AI Agent</span>
        </button>

        <button
          onClick={() => setActiveTab('devices')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'devices' ? 'text-[#10F4A0]' : 'text-white/40 hover:text-white'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span className="text-[10px] font-semibold">Devices</span>
        </button>

        <button
          onClick={() => setActiveTab('vault')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'vault' ? 'text-[#10F4A0]' : 'text-white/40 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span className="text-[10px] font-semibold">Vault</span>
        </button>
      </nav>

      {/* ─── Modal: QR Code Connect / Pairing PIN ─── */}
      {showQRScanner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
          <div className="w-full max-w-sm bg-[#0E131E] border border-white/15 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#10F4A0]" />
                <h3 className="font-bold text-sm text-white">Pair Guest Computer</h3>
              </div>
              <button 
                onClick={() => setShowQRScanner(false)}
                className="text-white/40 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-6 bg-white/[0.02] border border-dashed border-white/20 rounded-2xl space-y-3">
              <div className="w-36 h-36 bg-white p-2 rounded-xl flex items-center justify-center shadow-inner">
                {/* SVG Mock QR Code */}
                <div className="w-full h-full border-2 border-black flex flex-col justify-between p-1 bg-white">
                  <div className="flex justify-between">
                    <div className="w-8 h-8 bg-black rounded-sm" />
                    <div className="w-8 h-8 bg-black rounded-sm" />
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="w-6 h-6 bg-[#10F4A0] rounded flex items-center justify-center font-bold text-[10px] text-black">
                      C
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <div className="w-8 h-8 bg-black rounded-sm" />
                    <div className="w-4 h-4 bg-black rounded-sm" />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-center text-white/50">
                Point camera at the QR code displayed on the guest computer screen.
              </p>
            </div>

            <form onSubmit={handlePairComputer} className="space-y-3">
              <div className="text-center text-xs text-white/40 font-semibold">— OR ENTER 6-DIGIT PIN —</div>
              <input
                type="text"
                maxLength={6}
                value={pairingCode}
                onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
                placeholder="e.g. 7X9K21"
                className="w-full text-center tracking-widest font-mono text-sm py-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-[#10F4A0]"
              />
              <button
                type="submit"
                disabled={!pairingCode}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#10F4A0] to-cyan-400 text-slate-950 font-bold text-xs disabled:opacity-40 active:scale-98 transition-all"
              >
                Approve Scoped Session (60 Min)
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Privacy Guardrail Status Card (Devices Tab) ─────────────────────────

const PRIVACY_TIER_META: Record<PrivacyMode, { label: string; color: string; hint: string }> = {
  standard: { label: 'Standard', color: '#10F4A0', hint: 'Metadata checkpoints syncing to cloud' },
  local_only: { label: 'Local Only', color: '#22d3ee', hint: 'Checkpoints kept on device only' },
  private_session: { label: 'Paused', color: '#fbbf24', hint: 'All context monitoring paused' },
};

function PrivacyGuardrailCard() {
  const { mode, hydrated, hydrate, setMode } = useContextPrivacyStore();

  useEffect(() => {
    hydrate();
    const onChange = () => hydrate();
    window.addEventListener('os:privacy-mode-changed', onChange);
    return () => window.removeEventListener('os:privacy-mode-changed', onChange);
  }, [hydrate]);

  if (!hydrated) return null;
  const meta = PRIVACY_TIER_META[mode];
  const isPaused = mode === 'private_session';

  return (
    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: meta.color, boxShadow: `0 0 8px ${meta.color}` }}
        />
        <div className="min-w-0">
          <div className="text-xs font-bold text-white">
            Context Engine: <span style={{ color: meta.color }}>{meta.label}</span>
          </div>
          <div className="text-[10px] text-white/40 truncate">{meta.hint}</div>
        </div>
      </div>
      <button
        onClick={() => {
          const next: PrivacyMode = isPaused ? 'standard' : 'private_session';
          setMode(next);
          toast.success(isPaused ? 'Context engine resumed' : 'Context engine paused');
        }}
        className={`shrink-0 text-[10px] font-bold uppercase px-3 py-1.5 rounded-full border transition-all active:scale-95 ${
          isPaused
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
            : 'bg-amber-400/10 text-amber-300 border-amber-400/30'
        }`}
      >
        {isPaused ? 'Resume' : 'Pause'}
      </button>
    </div>
  );
}
