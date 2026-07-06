'use client';

import React, { useState, useEffect, useRef } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { Bot, Save, Server, Globe, Power, Zap, Lock, Send, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateChatResponse } from '@/app/actions';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export function AIGateway({ window }: { window: OSWindow }) {
  const [activeTab, setActiveTab] = useState<'config' | 'chat'>('chat');
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'AI Gateway is online. Connecting to Gemini API (gemini-3.5-flash).' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Config state
  const [model, setModel] = useState('gemini-3.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    import('idb-keyval').then(({ get }) => {
      get('anichisom_os_ai_config').then((config) => {
        if (config) {
          if (config.model) setModel(config.model);
          if (config.apiKey) setApiKey(config.apiKey);
        }
        setIsLoaded(true);
      });
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const saveConfig = () => {
    import('idb-keyval').then(({ set }) => {
      set('anichisom_os_ai_config', { model, apiKey });
      alert("AI Configuration saved locally.");
    });
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const res = await generateChatResponse(userMessage.content, "You are Ziklag OS's internal AI Gateway assistant. Be helpful, concise, and futuristic.", model, apiKey);
    
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(), 
      role: 'assistant', 
      content: res.success ? (res.text || '') : (res.error || 'Unknown error occurred.')
    }]);
    setLoading(false);
  };

  if (!isLoaded) return <div className="p-8 text-[#888]">Loading AI Gateway...</div>;
  
  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0a] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-[#111] border-r border-[#222] flex flex-col shrink-0">
          <div className="p-4 border-b border-[#222]">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-emerald-400">
              <Bot className="w-4 h-4" />
              AI Gateway Console
            </h2>
            <p className="text-xs text-[#888] mt-1">Live Gemini Integration.</p>
          </div>
          
          <div className="p-2 space-y-1">
            <button 
              onClick={() => setActiveTab('chat')}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors",
                activeTab === 'chat' ? "bg-emerald-500/10 text-emerald-400 font-medium" : "text-[#aaa] hover:bg-[#222]"
              )}
            >
              <Zap className="w-4 h-4" />
              Live Chat Tests
            </button>
            <button 
              onClick={() => setActiveTab('config')}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors",
                activeTab === 'config' ? "bg-emerald-500/10 text-emerald-400 font-medium" : "text-[#aaa] hover:bg-[#222]"
              )}
            >
              <Globe className="w-4 h-4" />
              Gateway Settings
            </button>
          </div>

          <div className="mt-auto p-4 border-t border-[#222]">
            <div className="bg-[#1a1a1a] p-3 rounded-lg border border-[#333]">
               <div className="flex items-center gap-2 mb-2 text-emerald-400 text-xs font-semibold">
                  <span className="relative flex h-2 w-2">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Gemini API Connected
               </div>
               <div className="text-[10px] text-[#888]">
                  Model: {model}<br/>
                  Latency: ~400ms
               </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-[#0a0a0a] flex flex-col overflow-hidden relative">
          {activeTab === 'chat' ? (
             <div className="flex-1 flex flex-col h-full absolute inset-0">
               <div className="border-b border-white/5 p-4 flex items-center justify-between shrink-0 bg-[#0f0f0f]">
                  <div className="flex items-center gap-2">
                     <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-emerald-400" />
                     </div>
                     <span className="text-sm font-medium">Gateway Assistant</span>
                  </div>
               </div>
               
               <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                 {messages.map(msg => (
                   <div key={msg.id} className={cn("flex gap-4 max-w-2xl", msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto")}>
                     <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", msg.role === 'user' ? "bg-blue-500/20" : "bg-emerald-500/20")}>
                        {msg.role === 'user' ? <User className="w-4 h-4 text-blue-400" /> : <Bot className="w-4 h-4 text-emerald-400" />}
                     </div>
                     <div className={cn("px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap", msg.role === 'user' ? "bg-blue-600 text-white rounded-tr-sm" : "bg-[#1a1a1a] text-white border border-[#222] rounded-tl-sm")}>
                       {msg.content}
                     </div>
                   </div>
                 ))}
                 {loading && (
                   <div className="flex gap-4 mr-auto max-w-2xl">
                     <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/20">
                        <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                     </div>
                     <div className="px-4 py-3 rounded-2xl bg-[#1a1a1a] text-[#888] border border-[#222] rounded-tl-sm flex items-center gap-2 text-sm text-emerald-400/70">
                       Processing request...
                     </div>
                   </div>
                 )}
               </div>

               <div className="p-4 bg-[#0f0f0f] border-t border-[#222] shrink-0">
                  <div className="max-w-3xl mx-auto relative flex items-center">
                    <input 
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSend()}
                      disabled={loading}
                      placeholder="Ask the AI Gateway anything..."
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-full pl-6 pr-14 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button 
                      onClick={handleSend}
                      disabled={!input.trim() || loading}
                      className="absolute right-2 p-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#333] disabled:text-[#888] text-white rounded-full transition-all"
                    >
                       <Send className="w-4 h-4" />
                    </button>
                  </div>
               </div>
             </div>
          ) : (
             <div className="p-8 max-w-2xl mx-auto space-y-6 w-full absolute inset-0 overflow-y-auto">
                <div>
                  <h3 className="text-lg font-medium text-white flex items-center gap-2">
                    <Server className="w-5 h-5 text-emerald-500" />
                    Model Configuration
                  </h3>
                  <p className="text-xs text-[#888] mt-1">Select which model powers the internal Gateway and Terminal AI features.</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-[#222]">
                   <div className="space-y-1">
                      <label className="text-xs text-[#888] font-medium">Active Model Framework</label>
                      <div className="grid grid-cols-2 gap-3 mt-1">
                         {['gemini-3.5-flash', 'gemini-1.5-pro', 'gemini-pro-vision', 'llama-3-local-mock'].map(m => (
                            <button
                               key={m}
                               onClick={() => setModel(m)}
                               className={cn(
                                  "px-4 py-3 rounded-lg border text-sm text-center transition-all",
                                  model === m 
                                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" 
                                    : "border-[#333] bg-[#1a1a1a] text-[#aaa] hover:bg-[#222]"
                               )}
                            >
                               {m}
                            </button>
                         ))}
                      </div>
                   </div>
                   
                   <div className="space-y-1 mt-6">
                      <label className="text-xs text-[#888] font-medium">Gemini API Key</label>
                      <div className="relative mt-1">
                        <Lock className="w-4 h-4 text-[#888] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                          type="password" 
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="AIzaSy..." 
                          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                      <p className="text-[10px] text-[#555] mt-2">Your key is stored locally in your browser's IndexedDB. If left blank, it falls back to the server environment variable.</p>
                   </div>
                   
                   <div className="pt-6 border-t border-[#222] mt-6">
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

