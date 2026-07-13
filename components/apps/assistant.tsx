import React, { useState, useRef, useEffect, useMemo } from 'react';
import { OSWindow } from '@/lib/os-context';
import { Sparkles, Send, Bot, User, Settings2, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { useOS } from '@/lib/os-context';
import { StorageAdapter } from '@/lib/storage';
import {
  getAiProvider,
  getRegisteredProviders,
  getDefaultProviderId,
  listAllModels,
} from '@/lib/ai-providers/ai-provider-factory';
import { AiModelInfo } from '@/lib/ai-providers/ai-provider';

const INITIAL_MESSAGE: { role: 'ai'; text: string } = { role: 'ai', text: 'Hello! I am your OS System Assistant. I can open apps, change themes, toggle shaders, or answer questions using Claude, Gemini, Qwen, or other AI models. What can I do for you?' };

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

        if (models.length > 0) {
          const defaultModel = models[0]!.id;
          setSelectedModel(defaultModel);
        }
      } catch (error) {
        console.error('[Assistant] Failed to initialize AI providers:', error);
        notify('Assistant', { body: 'Failed to load AI providers' });
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
      const response = await provider.chat({
        model: selectedModel,
        messages: [{ role: 'user', content: userMessage }],
      });

      setMessages(prev => [...prev, { role: 'ai', text: response.text }]);
    } catch (error) {
      console.error('AI request failed:', error);
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleCommand = (text: string) => {
    const cmd = text.toLowerCase();
    
    setTimeout(() => {
      let response = "I don't quite understand that command yet. Try asking me to 'open terminal' or 'change theme to blue'.";
      
      if (cmd.includes('open')) {
        const apps = ['terminal', 'files', 'browser', 'settings', 'colorpicker', 'hardware', 'config', 'store', 'media-player', 'code'];
        const found = apps.find(a => cmd.includes(a));
        if (found) {
          openWindow(found);
          response = `Opening ${found} for you right now.`;
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

  if (!isLoaded) return <div className="p-8 text-[#888]">Loading Assistant...</div>;

  return (
    <div className="flex flex-col w-full h-full bg-[#111] text-white font-sans overflow-hidden">
      
      {/* Header */}
      <div className="h-16 border-b border-white/10 bg-black/50 flex items-center justify-between px-4 shrink-0 gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)] shrink-0">
             <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-wide">System AI</span>
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

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"
          title="Settings"
        >
          <Settings2 className="w-4 h-4" />
        </button>
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
