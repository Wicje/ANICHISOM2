import React, { useState, useRef, useEffect, useMemo } from 'react';
import { OSWindow } from '@/lib/os-context';
import { Sparkles, Send, Bot, User, Settings2, Loader2, AlertCircle, ChevronDown, Home, Bookmark, Zap, Layout, Mic, X } from 'lucide-react';
import { useOS } from '@/lib/os-context';
import { useWindowStore } from '@/lib/stores/window.store';
import { StorageAdapter } from '@/lib/storage';
import { APP_MANIFEST } from '@/lib/app-manifest';
import {
  getAiProvider,
  getRegisteredProviders,
  getDefaultProviderId,
  listAllModels,
} from '@/lib/ai-providers/ai-provider-factory';
import { AiModelInfo } from '@/lib/ai-providers/ai-provider';
import { cn } from '@/lib/utils';

const APP_LIST_FOR_AI = APP_MANIFEST.map(a => `${a.id}: ${a.title} — ${a.description || ''}`).join('\n');

const INITIAL_MESSAGE: { role: 'ai'; text: string } = { role: 'ai', text: 'Hello! I am your OS System Assistant. I can open apps, change themes, toggle shaders, or answer questions using Claude, Gemini, Qwen, or other AI models. What can I do for you?' };

type ViewMode = 'chat' | 'mindpalace';

export function AssistantApp({ window: osWindow }: { window: OSWindow }) {
  const { openWindow, setThemeColor, setScreenShader, notify, workspaceMode } = useOS();
  const storage = useMemo(() => new StorageAdapter('assistant', workspaceMode), [workspaceMode]);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([INITIAL_MESSAGE]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<AiModelInfo[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  // View mode: 'chat' (default) or 'mindpalace'
  const [viewMode, setViewMode] = useState<ViewMode>('chat');

  // MindPalace state
  const [mpTab, setMpTab] = useState<'home' | 'remember' | 'settings'>('home');
  const [futureCards, setFutureCards] = useState([
    { id: 1, text: 'Brainstorm brand direction for client presentation', done: true },
    { id: 2, text: 'Set up my creative workspace with Moodboard', done: false },
  ]);
  const [mpSearchInput, setMpSearchInput] = useState('');
  const [mpFutureInput, setMpFutureInput] = useState('');

  useEffect(() => {
    // Initialize AI providers
    const initProviders = async () => {
      try {
        const providers = getRegisteredProviders();
        setAvailableProviders(providers);

        // Load all available models
        const models = await listAllModels();
        setAvailableModels(models);

        // Set default provider and model
        const defaultProvider = getDefaultProviderId();
        setSelectedProvider(defaultProvider);

        const providerObj = getAiProvider(defaultProvider);
        if (providerObj) {
          const pModels = await providerObj.listModels();
          if (pModels.length > 0 && pModels[0]) {
            setSelectedModel(pModels[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to initialize AI providers:', err);
      }
    };
    initProviders();

    // Load chat history
    storage.get<{ role: 'user' | 'ai', text: string }[]>('chat_history').then(saved => {
      if (saved && saved.length > 0) setMessages(saved);
      setIsLoaded(true);
    });
  }, [storage, notify]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isLoaded) return;
    storage.set('chat_history', messages);
  }, [messages, isLoaded, storage]);

  const handleProviderChange = async (providerId: string) => {
    try {
      const provider = getAiProvider(providerId);
      const isAvailable = await provider.isAvailable();

      if (!isAvailable) {
        notify('Assistant', { body: `Provider ${providerId} is not configured` });
        return;
      }

      setSelectedProvider(providerId);
      
      // Load models for this provider
      const models = await listAllModels();
      const providerModels = models.filter(m => m.provider === providerId);
      
      if (providerModels.length > 0) {
        setSelectedModel(providerModels[0]!.id);
      }

      notify('Assistant', { body: `Switched to ${provider.name}` });
    } catch (error) {
      console.error('Failed to switch provider:', error);
      notify('Assistant', { body: 'Failed to switch provider' });
    }
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
  };

  const handleSendAI = async () => {
    if (!input.trim() || !selectedProvider || !selectedModel) return;

    setIsStreaming(true);
    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');

    try {
      const provider = getAiProvider(selectedProvider);
      
      const activeWindows = useWindowStore.getState().windows;
      const windowContextStr = activeWindows.length > 0 
        ? activeWindows.map(w => `- [${w.appId}] "${w.title}" ${w.isMinimized ? '(minimized)' : '(open)'} ${w.data?.url ? `(URL: ${w.data.url})` : ''}`).join('\n')
        : 'No other apps currently open.';

      // Broadcast deep-context request to all open apps
      const gatherDeepContext = async (): Promise<string> => {
        return new Promise((resolve) => {
          const contexts: string[] = [];
          const handler = (e: any) => {
            if (e.detail?.appId && e.detail?.context) {
              contexts.push(`--- Deep Context from ${e.detail.appId} ---\n${e.detail.context}`);
            }
          };
          window.addEventListener('os:context-response', handler);
          window.dispatchEvent(new CustomEvent('os:request-context'));
          
          setTimeout(() => {
            window.removeEventListener('os:context-response', handler);
            resolve(contexts.length > 0 ? contexts.join('\n\n') : 'No deep context provided by active apps.');
          }, 350); // wait 350ms for apps to reply
        });
      };

      const rawDeepContextStr = await gatherDeepContext();
      // Truncate context payload to 2000 chars to avoid 413 / token limit errors (Issue 125)
      const deepContextStr = rawDeepContextStr.length > 2000 
        ? rawDeepContextStr.slice(0, 2000) + '\n...[context truncated to 2000 chars]'
        : rawDeepContextStr;

      const systemPrompt = `You are the ContinuaOS System Assistant. You help users operate their desktop environment.

CURRENT WORKSPACE WINDOWS:
${windowContextStr}

APP DEEP CONTEXT (Content currently visible inside apps):
${deepContextStr}

Available apps the user can open (use the open command or suggest them):
${APP_LIST_FOR_AI}

You can help with:
- Opening apps (terminal, files, browser, moodboard, campaign, code, settings, etc.)
- Changing theme colors (blue, red, green, purple, or any hex color)
- Toggling screen shaders (crt, night/warm, off)
- Answering questions about the OS and apps. If they ask what is open, use the context above.

When a user asks to open an app, respond naturally like "Opening [app name] for you!" — the system handles the actual launch.`;

      const response = await provider.chat({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role === 'user' ? 'user' as const : 'assistant' as const, content: m.text })),
          { role: 'user', content: userMessage },
        ],
      });

      setMessages(prev => [...prev, { role: 'ai', text: response.text }]);
    } catch (error: any) {
      console.error('AI request failed:', error);
      const errorMessage = error?.message?.toLowerCase() || '';
      if (errorMessage.includes('api key') || errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
         setMessages(prev => [...prev, { role: 'ai', text: 'It looks like my API key is missing or invalid. Please configure your Vercel Environment Variables (e.g., OPENAI_API_KEY) or check the Settings app.' }]);
      } else {
         setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error while processing that request. Please try again or check your configuration.' }]);
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleCommand = (text: string) => {
    const cmd = text.toLowerCase();
    
    setTimeout(() => {
      let response = "I don't quite understand that command yet. Try asking me to 'open terminal' or 'change theme to blue'.";
      
      if (cmd.includes('open')) {
        // Match against all apps from manifest (by ID and title)
        const found = APP_MANIFEST.find(a => 
          cmd.includes(a.id) || cmd.includes(a.title.toLowerCase())
        );
        if (found) {
          openWindow(found.id);
          response = `Opening ${found.title} for you right now.`;
        }
      } else if (cmd.includes('theme') || cmd.includes('color')) {
         if (cmd.includes('blue')) { setThemeColor('#3b82f6'); response = 'Theme updated to Blue.'; }
         else if (cmd.includes('red')) { setThemeColor('#ef4444'); response = 'Theme updated to Red.'; }
         else if (cmd.includes('green')) { setThemeColor('#10b981'); response = 'Theme updated to Green.'; }
         else { setThemeColor('#8b5cf6'); response = 'Theme updated to Purple.'; }
      } else if (cmd.includes('shader') || cmd.includes('filter')) {
         if (cmd.includes('crt')) { setScreenShader('crt'); response = 'CRT shader enabled.'; }
         else if (cmd.includes('night') || cmd.includes('warm')) { setScreenShader('warm'); response = 'Night shift enabled.'; }
         else if (cmd.includes('off') || cmd.includes('none')) { setScreenShader('none'); response = 'Shaders disabled.'; }
      }

      setMessages(prev => [...prev, { role: 'ai', text: response }]);
      
      if (response !== "I don't quite understand that command yet. Try asking me to 'open terminal' or 'change theme to blue'.") {
         notify('System Assistant', { body: response });
      }
    }, 600);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const isCommand = input.toLowerCase().match(/^(open|theme|color|shader|filter)/);
    
    if (isCommand) {
      setMessages(prev => [...prev, { role: 'user', text: input }]);
      handleCommand(input);
      setInput('');
    } else {
      // Route to AI provider if configured
      if (selectedProvider && selectedModel) {
        handleSendAI();
      } else {
        // Fallback to command handler
        setMessages(prev => [...prev, { role: 'user', text: input }]);
        handleCommand(input);
        setInput('');
      }
    }
  };

  // MindPalace handlers
  const addFutureCard = () => {
    if (!mpFutureInput.trim()) return;
    setFutureCards(prev => [...prev, { id: Date.now(), text: mpFutureInput, done: false }]);
    setMpFutureInput('');
  };

  const toggleFutureCard = (id: number) => {
    setFutureCards(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c));
  };

  const deleteFutureCard = (id: number) => {
    setFutureCards(prev => prev.filter(c => c.id !== id));
  };

  if (!isLoaded) return <div className="p-8 text-[#888]">Loading Assistant...</div>;

  // --- MindPalace View ---
  if (viewMode === 'mindpalace') {
    return (
      <div className="flex w-full h-full bg-[#08080c] text-white font-sans overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-14 bg-black/50 border-r border-white/10 flex flex-col items-center py-4 gap-4 shrink-0">
          <button onClick={() => setMpTab('home')} className={cn('p-2 rounded-xl transition-all', mpTab === 'home' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5')} title="Home">
            <Home className="w-5 h-5" />
          </button>
          <button onClick={() => setMpTab('remember')} className={cn('p-2 rounded-xl transition-all', mpTab === 'remember' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5')} title="Remember">
            <Bookmark className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <button onClick={() => setMpTab('settings')} className={cn('p-2 rounded-xl transition-all', mpTab === 'settings' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5')} title="Settings">
            <Settings2 className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="h-12 border-b border-white/10 bg-black/30 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2">
              <Layout className="w-4 h-4 text-white/50" />
              <span className="text-sm font-medium text-white/70">{mpTab === 'home' ? 'MindPalace' : mpTab === 'remember' ? 'Remember' : 'Settings'}</span>
            </div>
            <button onClick={() => setViewMode('chat')} className="px-3 py-1 text-xs rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              Chat
            </button>
          </div>

          {/* Home Tab */}
          {mpTab === 'home' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-white/50" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Ask your data anything</h2>
              <p className="text-white/40 text-sm mb-8 text-center max-w-md">
                I can help you find files, analyze data, manage tasks, and connect your workspace.
              </p>
              <div className="w-full max-w-lg relative">
                <input
                  type="text"
                  value={mpSearchInput}
                  onChange={(e) => setMpSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && mpSearchInput.trim()) {
                      console.log('Search:', mpSearchInput);
                      setMpSearchInput('');
                    }
                  }}
                  placeholder="Ask me anything about your data..."
                  className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-4 pr-12 text-sm outline-none focus:border-white/20 transition-colors"
                />
                <button 
                  onClick={() => {
                    console.log('Search:', mpSearchInput);
                    setMpSearchInput('');
                  }} 
                  className="absolute right-2 top-1.5 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Remember Tab */}
          {mpTab === 'remember' && (
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-lg font-bold mb-4">Remember</h3>
              <p className="text-white/40 text-sm">Your saved memories and context will appear here.</p>
            </div>
          )}

          {/* Settings Tab */}
          {mpTab === 'settings' && (
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-lg font-bold mb-4">MindPalace Settings</h3>
              <p className="text-white/40 text-sm">Configure your MindPalace preferences here.</p>
            </div>
          )}
        </div>

        {/* Right Panel: Future */}
        <div className="w-72 bg-black/30 border-l border-white/10 flex flex-col shrink-0">
          <div className="h-12 border-b border-white/10 flex items-center px-4 shrink-0">
            <Zap className="w-4 h-4 text-yellow-400 mr-2" />
            <span className="text-sm font-medium">Future</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {futureCards.map(card => (
              <div key={card.id} className="group p-3 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all">
                <div className="flex items-start gap-2">
                  <button onClick={() => toggleFutureCard(card.id)} className={cn('mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all', card.done ? 'bg-green-500 border-green-500' : 'border-white/30 hover:border-white/50')}>
                    {card.done && <span className="text-[10px] text-white">✓</span>}
                  </button>
                  <span className={cn('text-sm flex-1', card.done && 'line-through text-white/30')}>{card.text}</span>
                  <button onClick={() => deleteFutureCard(card.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all">
                    <span className="text-xs text-white/40">×</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-white/10">
            <input
              type="text"
              value={mpFutureInput}
              onChange={(e) => setMpFutureInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addFutureCard()}
              placeholder="Add a future task..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-white/20 transition-colors"
            />
          </div>
        </div>
      </div>
    );
  }

  // --- Chat View (default) ---
  return (
    <div className="flex flex-col w-full h-full bg-neutral-950/80 backdrop-blur-2xl border border-white/10 text-white font-sans overflow-hidden">
      
      {/* Header with ChatGPT AI Voice Bar (ref_ui2.jpg inspired) */}
      <div className="p-3 border-b border-white/10 bg-slate-900/90 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => openWindow('terminal')} 
            className="w-9 h-9 rounded-xl bg-neutral-900 border border-white/20 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs shadow-md hover:scale-105 transition-transform"
            title="Open System Terminal"
          >
            &gt;_
          </button>
        </div>

        {/* Dynamic Voice Equalizer Wave Pill */}
        <div className="flex-1 max-w-xs h-10 bg-neutral-900/90 border border-white/15 rounded-full px-3 flex items-center justify-between shadow-xl relative">
          <button 
            onClick={() => setIsVoiceActive(!isVoiceActive)} 
            className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors", isVoiceActive ? "bg-rose-500/20 text-rose-400 border border-rose-500/40" : "bg-white/10 text-white/60 hover:bg-white/20")}
            title="Voice Mic Input"
          >
            <Mic className="w-3.5 h-3.5" />
          </button>

          {/* Equalizer Wave Bubbles */}
          <div className="flex items-center gap-1">
            {[10, 18, 28, 18, 10].map((h, i) => (
              <div 
                key={i} 
                className={cn("w-2.5 bg-white rounded-full transition-all duration-300", isVoiceActive && "animate-pulse")} 
                style={{ height: isVoiceActive ? `${h}px` : '8px' }} 
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-black text-white border border-white/20 flex items-center justify-center text-[9px] font-black">
              <Sparkles className="w-3 h-3 text-emerald-400" />
            </span>
            <button 
              onClick={() => setIsVoiceActive(false)} 
              className="w-5 h-5 rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 font-bold text-[10px] flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Provider & Model Selector */}
        {availableProviders.length > 0 && (
          <div className="flex gap-2 min-w-0">
            <select
              value={selectedProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded border border-white/20 cursor-pointer transition-colors"
            >
              {availableProviders.map(p => (
                <option key={p} value={p} className="bg-black text-white">{p}</option>
              ))}
            </select>

            {availableModels.length > 0 && (
              <select
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded border border-white/20 cursor-pointer transition-colors truncate"
              >
                {availableModels
                  .filter(m => !selectedProvider || m.provider === selectedProvider)
                  .map(m => (
                    <option key={m.id} value={m.id} className="bg-black text-white">{m.name}</option>
                  ))}
              </select>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('mindpalace')}
            className="px-3 py-1 text-xs rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title="MindPalace"
          >
            MindPalace
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"
            title="Settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
             <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-white/10' : 'bg-indigo-500/20 text-indigo-400'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
             </div>
             <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white/5 border border-white/10 rounded-tl-sm'}`}>
               {msg.text}
             </div>
          </div>
        ))}
        {isStreaming && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-black/50 border-t border-white/10">
        <form onSubmit={submit} className="relative flex items-center">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
            placeholder={selectedProvider ? "Ask anything..." : "Ask me to open apps or change settings..."}
            className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-4 pr-12 text-sm outline-none focus:border-indigo-500 transition-colors shadow-inner disabled:opacity-50"
          />
          <button 
            type="submit" 
            disabled={isStreaming}
            className="absolute right-2 p-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-700 rounded-full transition-colors disabled:opacity-50"
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
