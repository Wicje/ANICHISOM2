'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { Bot, Save, Server, Globe, Power, Zap, Lock, Send, User, Loader2, ChevronDown, Cpu, Cloud, Sparkles, Wifi, WifiOff, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StorageAdapter } from '@/lib/storage';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  model?: string;
};

type ProviderInfo = {
  id: string;
  name: string;
  available: boolean;
  models: { id: string; name: string; capabilities: { vision?: boolean; streaming?: boolean; tools?: boolean } }[];
};

type ModelsResponse = {
  models: { id: string; name: string; provider: string; capabilities: { vision?: boolean; streaming?: boolean; tools?: boolean; maxTokens?: number } }[];
  defaultProvider: string;
  fallbackChain: string[];
  enabledProviders: string[];
  registeredProviders: string[];
};

const PROVIDER_META: Record<string, { icon: any; color: string; description: string }> = {
  gemini: { icon: Sparkles, color: 'emerald', description: 'Google\'s multimodal AI' },
  openai: { icon: Cloud, color: 'sky', description: 'GPT models from OpenAI' },
  claude: { icon: Bot, color: 'amber', description: 'Anthropic\'s thoughtful AI' },
  qwen: { icon: Cpu, color: 'rose', description: 'Alibaba\'s Qwen models' },
  local: { icon: Server, color: 'slate', description: 'Local models via Ollama/LM Studio' },
};

function getProviderColor(providerId: string): string {
  return PROVIDER_META[providerId]?.color || 'gray';
}

function getProviderIcon(providerId: string) {
  return PROVIDER_META[providerId]?.icon || Server;
}

export function AIGateway({ window }: { window: OSWindow }) {
  const [activeTab, setActiveTab] = useState<'config' | 'chat'>('chat');

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Provider/model state
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [defaultProvider, setDefaultProvider] = useState('gemini');
  const [fallbackChain, setFallbackChain] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const { openWindow, setThemeColor, setScreenShader, notify, workspaceMode } = useOS();
  const storage = useRef(new StorageAdapter('ai-gateway', workspaceMode)).current;

  // Load saved config + fetch available models
  useEffect(() => {
    async function init() {
      // Load saved preferences first
      const config = await storage.get<{ provider?: string; model?: string }>('config');
      if (config) {
        if (config.provider) setSelectedProvider(config.provider);
        if (config.model) setSelectedModel(config.model);
      }

      // Fetch available models from the API
      try {
        const res = await fetch('/api/ai/models');
        if (res.ok) {
          const data: ModelsResponse = await res.json();
          setDefaultProvider(data.defaultProvider);
          setFallbackChain(data.fallbackChain);

          // Group models by provider
          const providerMap = new Map<string, ProviderInfo>();
          for (const model of data.models) {
            if (!providerMap.has(model.provider)) {
              providerMap.set(model.provider, {
                id: model.provider,
                name: PROVIDER_META[model.provider]?.description || model.provider,
                available: true,
                models: [],
              });
            }
            providerMap.get(model.provider)!.models.push({
              id: model.id,
              name: model.name,
              capabilities: model.capabilities,
            });
          }

          // Also mark registered but unavailable providers
          for (const pid of data.registeredProviders) {
            if (!providerMap.has(pid)) {
              providerMap.set(pid, {
                id: pid,
                name: PROVIDER_META[pid]?.description || pid,
                available: false,
                models: [],
              });
            }
          }

          setProviders(Array.from(providerMap.values()));

          // Set defaults
          const savedProvider = config?.provider || data.defaultProvider;
          setSelectedProvider(savedProvider);
          const savedModel = config?.model;
          if (savedModel) {
            setSelectedModel(savedModel);
          } else {
            // Use default model for the selected provider
            const pInfo = providerMap.get(savedProvider);
            if (pInfo && (pInfo.models?.length ?? 0) > 0) {
              setSelectedModel(pInfo.models![0]!.id);
            }
          }

          setMessages([
            {
              id: '1',
              role: 'assistant',
              content: `AI Gateway online. ${data.enabledProviders.length} providers available — you pick your model.`,
              provider: data.defaultProvider,
              model: data.defaultProvider,
            }
          ]);
        }
      } catch (err) {
        setMessages([
          { id: '1', role: 'assistant', content: 'AI Gateway online. Unable to fetch model list — check server configuration.', provider: 'unknown', model: 'unknown' }
        ]);
      }

      setIsLoaded(true);
    }
    init();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const saveConfig = async () => {
    await storage.set('config', { provider: selectedProvider, model: selectedModel });
    notify?.("AI Configuration saved.");
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
    };
    setMessages(prev => [...prev, userMessage]);

    const cmd = input.toLowerCase();
    setInput('');
    setLoading(true);

    // System command handling (OS-level, doesn't need AI)
    let systemResponse: string | null = null;

    if (cmd.includes('open') && openWindow) {
      const apps = ['terminal', 'files', 'browser', 'settings', 'colorpicker', 'hardware', 'config', 'store', 'media-player', 'code', 'campaign', 'moodboard'];
      const found = apps.find(a => cmd.includes(a));
      if (found) {
        openWindow(found);
        systemResponse = `Opening ${found} for you.`;
      }
    } else if ((cmd.includes('theme') || cmd.includes('color')) && setThemeColor) {
      if (cmd.includes('blue')) { setThemeColor('#3b82f6'); systemResponse = 'Theme → Blue.'; }
      else if (cmd.includes('red')) { setThemeColor('#ef4444'); systemResponse = 'Theme → Red.'; }
      else if (cmd.includes('green')) { setThemeColor('#10b981'); systemResponse = 'Theme → Green.'; }
      else { setThemeColor('#8b5cf6'); systemResponse = 'Theme → Purple.'; }
    } else if ((cmd.includes('shader') || cmd.includes('filter')) && setScreenShader) {
      if (cmd.includes('crt')) { setScreenShader('crt'); systemResponse = 'CRT shader enabled.'; }
      else if (cmd.includes('night') || cmd.includes('warm')) { setScreenShader('warm'); systemResponse = 'Night shift enabled.'; }
      else if (cmd.includes('off') || cmd.includes('none')) { setScreenShader('none'); systemResponse = 'Shaders disabled.'; }
    }

    if (systemResponse) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: systemResponse,
        provider: 'system',
        model: 'os-command',
      }]);
      setLoading(false);
      return;
    }

    // Send to AI via API route
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage.content,
          systemPrompt: "You are Anichisom OS's AI assistant. Be helpful, concise, and futuristic.",
          model: selectedModel,
          provider: selectedProvider,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.text || 'No response.',
          provider: data.provider || selectedProvider,
          model: data.model || selectedModel,
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Error: ${data.error || 'Unknown error.'}`,
          provider: selectedProvider,
          model: selectedModel,
        }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Network error: ${err.message || 'Failed to reach AI server.'}`,
        provider: selectedProvider,
        model: selectedModel,
      }]);
    }

    setLoading(false);
  }, [input, loading, selectedProvider, selectedModel, openWindow, setThemeColor, setScreenShader]);

  // Get current provider info
  const currentProviderInfo = providers.find(p => p.id === selectedProvider);
  const currentProviderMeta = PROVIDER_META[selectedProvider];
  const ProviderIcon = currentProviderMeta?.icon || Server;
  const providerColor = currentProviderMeta?.color || 'gray';

  // Count available providers
  const availableCount = providers.filter(p => p.available && p.models.length > 0).length;
  const totalRegistered = providers.length;

  if (!isLoaded) return <div className="p-8 text-[var(--os-text-muted)]">Loading AI Gateway...</div>;

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0a] text-white font-sans overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-[#111] border-r border-[var(--os-border)] flex flex-col shrink-0">
          <div className="p-4 border-b border-[var(--os-border)]">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-emerald-400">
              <Bot className="w-4 h-4" />
              AI Gateway Console
            </h2>
            <p className="text-xs text-[var(--os-text-muted)] mt-1">Multi-provider AI. You pick your model.</p>
          </div>

          <div className="p-2 space-y-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors",
                activeTab === 'chat' ? "bg-emerald-500/10 text-emerald-400 font-medium" : "text-[var(--os-text-muted)] hover:bg-[var(--os-border)]"
              )}
            >
              <Zap className="w-4 h-4" />
              Live Chat
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors",
                activeTab === 'config' ? "bg-emerald-500/10 text-emerald-400 font-medium" : "text-[var(--os-text-muted)] hover:bg-[var(--os-border)]"
              )}
            >
              <Settings className="w-4 h-4" />
              Provider Settings
            </button>
          </div>

          {/* Provider list in sidebar */}
          <div className="p-3 space-y-2">
            <p className="text-[10px] text-[#555] uppercase tracking-wider">Providers</p>
            {providers.map(p => {
              const meta = PROVIDER_META[p.id];
              const PIcon = meta?.icon || Server;
              const pColor = meta?.color || 'gray';
              const isActive = p.id === selectedProvider;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProvider(p.id);
                    const defaultModel = p.models[0]?.id;
                    if (defaultModel) setSelectedModel(defaultModel);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-colors",
                    isActive ? `bg-${pColor}-500/10 text-${pColor}-400 font-medium` : "text-[var(--os-text-muted)] hover:bg-[var(--os-border)]",
                    !p.available && "opacity-40"
                  )}
                >
                  <PIcon className="w-3.5 h-3.5" />
                  <span className="truncate">{p.id}</span>
                  {p.available && p.models.length > 0 ? (
                    <Wifi className="w-3 h-3 text-emerald-400 ml-auto" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-[#555] ml-auto" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Status footer */}
          <div className="mt-auto p-4 border-t border-[var(--os-border)]">
            <div className="bg-[var(--os-surface)] p-3 rounded-lg border border-[var(--os-border)]">
              <div className="flex items-center gap-2 mb-2 text-emerald-400 text-xs font-semibold">
                <span className="relative flex h-2 w-2">
                  {availableCount > 0 ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#555]"></span>
                  )}
                </span>
                {availableCount > 0 ? `${availableCount}/${totalRegistered} Providers Online` : 'No Providers Available'}
              </div>
              <div className="text-[10px] text-[var(--os-text-muted)]">
                Active: {selectedProvider} / {selectedModel}<br/>
                Fallback: {fallbackChain.slice(0, 3).join(' → ')}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-[#0a0a0a] flex flex-col overflow-hidden relative">
          {activeTab === 'chat' ? (
            <div className="flex-1 flex flex-col h-full absolute inset-0">
              {/* Chat header with provider/model selector */}
              <div className="border-b border-white/5 p-4 flex items-center justify-between shrink-0 bg-[#0f0f0f]">
                <div className="flex items-center gap-2">
                  <div className={cn("w-6 h-6 rounded flex items-center justify-center", `bg-${providerColor}-500/20`)}>
                    <ProviderIcon className={cn("w-4 h-4", `text-${providerColor}-400`)} />
                  </div>
                  <span className="text-sm font-medium">Gateway Assistant</span>
                  <span className="text-[10px] text-[var(--os-text-muted)] ml-1">via {selectedProvider}/{selectedModel}</span>
                </div>

                {/* Inline model selector */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => { setModelDropdownOpen(!modelDropdownOpen); setProviderDropdownOpen(false); }}
                      className="px-3 py-1.5 rounded-lg border border-[var(--os-border)] bg-[var(--os-surface)] text-xs text-[var(--os-text-muted)] hover:text-white flex items-center gap-1.5 transition-colors"
                    >
                      {selectedModel}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {modelDropdownOpen && currentProviderInfo && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-lg shadow-xl z-50 overflow-hidden">
                        {currentProviderInfo.models.map(m => (
                          <button
                            key={m.id}
                            onClick={() => { setSelectedModel(m.id); setModelDropdownOpen(false); }}
                            className={cn(
                              "w-full text-left px-3 py-2 text-xs hover:bg-[var(--os-border)] transition-colors",
                              selectedModel === m.id ? "text-emerald-400 bg-emerald-500/5" : "text-[var(--os-text-muted)]"
                            )}
                          >
                            {m.name}
                            <span className="text-[#555] ml-1">{m.id}</span>
                            {m.capabilities.vision && <span className="text-[8px] text-sky-400 ml-1">👁</span>}
                            {m.capabilities.tools && <span className="text-[8px] text-amber-400 ml-1">🔧</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map(msg => (
                  <div key={msg.id} className={cn("flex gap-4 max-w-2xl", msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto")}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      msg.role === 'user' ? "bg-blue-500/20" : `bg-${getProviderColor(msg.provider || selectedProvider)}-500/20`
                    )}>
                      {msg.role === 'user' ? <User className="w-4 h-4 text-blue-400" /> : <Bot className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className={cn(
                      "px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                      msg.role === 'user' ? "bg-blue-600 text-white rounded-tr-sm" : "bg-[var(--os-surface)] text-white border border-[var(--os-border)] rounded-tl-sm"
                    )}>
                      {msg.content}
                      {msg.role === 'assistant' && msg.provider && msg.provider !== 'system' && (
                        <div className="text-[9px] text-[#555] mt-1">{msg.provider}/{msg.model}</div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-4 mr-auto max-w-2xl">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/20">
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl bg-[var(--os-surface)] text-[var(--os-text-muted)] border border-[var(--os-border)] rounded-tl-sm flex items-center gap-2 text-sm text-emerald-400/70">
                      Processing via {selectedProvider}...
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-4 bg-[#0f0f0f] border-t border-[var(--os-border)] shrink-0">
                <div className="max-w-3xl mx-auto relative flex items-center">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    disabled={loading}
                    placeholder="Ask anything... (try: open terminal, theme blue, or any question)"
                    className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-full pl-6 pr-14 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className="absolute right-2 p-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-[var(--os-border)] disabled:text-[var(--os-text-muted)] text-white rounded-full transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Config tab */
            <div className="p-8 max-w-2xl mx-auto space-y-6 w-full absolute inset-0 overflow-y-auto">
              <div>
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-500" />
                  Provider Configuration
                </h3>
                <p className="text-xs text-[var(--os-text-muted)] mt-1">
                  Select your AI provider and model. API keys are configured server-side via environment variables — your data stays private.
                </p>
              </div>

              {/* Provider selection */}
              <div className="space-y-4 pt-4 border-t border-[var(--os-border)]">
                <div className="space-y-2">
                  <label className="text-xs text-[var(--os-text-muted)] font-medium">Active Provider</label>
                  <div className="grid grid-cols-1 gap-2 mt-1">
                    {providers.map(p => {
                      const meta = PROVIDER_META[p.id];
                      const PIcon = meta?.icon || Server;
                      const pColor = meta?.color || 'gray';
                      const isSelected = p.id === selectedProvider;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedProvider(p.id);
                            const defModel = p.models[0]?.id;
                            if (defModel) setSelectedModel(defModel);
                          }}
                          className={cn(
                            "px-4 py-3 rounded-lg border text-sm flex items-center gap-3 transition-all",
                            isSelected
                              ? `border-${pColor}-500 bg-${pColor}-500/10 text-${pColor}-400`
                              : "border-[var(--os-border)] bg-[var(--os-surface)] text-[var(--os-text-muted)] hover:bg-[var(--os-border)]",
                            !p.available && "opacity-40"
                          )}
                        >
                          <PIcon className="w-5 h-5" />
                          <div className="flex-1">
                            <div className="font-medium">{p.id}</div>
                            <div className="text-[10px] text-[var(--os-text-muted)]">{meta?.description || p.name}</div>
                          </div>
                          {p.available && p.models.length > 0 ? (
                            <Wifi className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <WifiOff className="w-4 h-4 text-[#555]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Model selection for chosen provider */}
                {currentProviderInfo && currentProviderInfo.models.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <label className="text-xs text-[var(--os-text-muted)] font-medium">Model — {selectedProvider}</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {currentProviderInfo.models.map(m => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedModel(m.id)}
                          className={cn(
                            "px-4 py-3 rounded-lg border text-sm text-center transition-all",
                            selectedModel === m.id
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                              : "border-[var(--os-border)] bg-[var(--os-surface)] text-[var(--os-text-muted)] hover:bg-[var(--os-border)]"
                          )}
                        >
                          <div className="font-medium">{m.name}</div>
                          <div className="text-[10px] text-[#555] mt-0.5">{m.id}</div>
                          <div className="flex justify-center gap-1 mt-1">
                            {m.capabilities.vision && <span className="text-[8px] bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded">Vision</span>}
                            {m.capabilities.streaming && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Stream</span>}
                            {m.capabilities.tools && <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">Tools</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback chain info */}
                <div className="space-y-2 mt-4 pt-4 border-t border-[var(--os-border)]">
                  <label className="text-xs text-[var(--os-text-muted)] font-medium">Fallback Chain</label>
                  <div className="flex items-center gap-1 text-xs text-[var(--os-text-muted)]">
                    {fallbackChain.map((fId, i) => (
                      <React.Fragment key={fId}>
                        <span className={cn(
                          "px-2 py-1 rounded bg-[var(--os-surface)] border border-[var(--os-border)]",
                          fId === selectedProvider ? "text-emerald-400 border-emerald-500/30" : ""
                        )}>{fId}</span>
                        {i < fallbackChain.length - 1 && <span className="text-[#555]">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#555]">
                    If your selected provider fails, the system automatically tries the next in chain.
                  </p>
                </div>

                {/* Privacy notice */}
                <div className="mt-4 p-3 rounded-lg bg-[#111] border border-[var(--os-border)]">
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                    <Lock className="w-3.5 h-3.5" />
                    Privacy-First Design
                  </div>
                  <p className="text-[10px] text-[var(--os-text-muted)] mt-1">
                    API keys are stored server-side only — never sent to the browser. Your AI conversations use session-authenticated endpoints. Self-hosting gives you full data control.
                  </p>
                </div>

                <div className="pt-6 border-t border-[var(--os-border)] mt-6">
                  <button onClick={saveConfig} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
