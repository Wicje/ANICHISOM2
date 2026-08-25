import React, { useState, useRef, useEffect } from 'react';
import { AgentMessage } from '../types';
import { cn } from '@/lib/utils';
import { getAiProvider, getDefaultProviderId, listAllModels } from '@/lib/ai-providers/ai-provider-factory';
import { Loader2, Sparkles } from 'lucide-react';

interface CopilotProps {
  agentOpen: boolean;
  setAgentOpen: (open: boolean) => void;
  code?: string;
  fileName?: string;
}

export function CopilotPanel({ agentOpen, setAgentOpen, code, fileName }: CopilotProps) {
  const [agentInput, setAgentInput] = useState('');
  const [agentHistory, setAgentHistory] = useState<AgentMessage[]>([
    { role: 'agent', content: 'I am your Agentic Copilot. I can generate code, debug, or refactor entire modules. Ask me anything about the current file.' }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      try {
        const defaultId = getDefaultProviderId();
        const provider = getAiProvider(defaultId);
        if (await provider.isAvailable()) {
          const models = await listAllModels();
          const providerModels = models.filter(m => m.provider === defaultId);
          if (providerModels.length > 0 && providerModels[0]) {
            setSelectedModel(providerModels[0].id);
          }
        }
      } catch {}
    };
    if (agentOpen) init();
  }, [agentOpen]);

  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: 'smooth' });
  }, [agentHistory]);

  const handleSend = async () => {
    if (!agentInput.trim() || isThinking) return;
    const userMsg = agentInput.trim();
    setAgentInput('');
    setAgentHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsThinking(true);

    try {
      const defaultId = getDefaultProviderId();
      const provider = getAiProvider(defaultId);

      if (!(await provider.isAvailable())) {
        setAgentHistory(prev => [...prev, { role: 'agent', content: 'No AI provider is configured. Please set an API key in Settings > AI Providers.' }]);
        setIsThinking(false);
        return;
      }

      const codeContext = code
        ? `Current file: ${fileName || 'unknown'}\n\`\`\`\n${code.slice(0, 3000)}${code.length > 3000 ? '\n...(truncated)' : ''}\n\`\`\``
        : 'No file is currently open.';

      const response = await provider.chat({
        model: selectedModel || undefined,
        messages: [
          {
            role: 'system',
            content: `You are an expert code assistant embedded in a VS Code-like editor. You help with code generation, debugging, refactoring, and explanations. Be concise and provide code blocks when relevant. Current file context is provided below.`
          },
          {
            role: 'user',
            content: `${codeContext}\n\nUser request: ${userMsg}`
          },
        ],
        temperature: 0.3,
        maxTokens: 2048,
      });

      setAgentHistory(prev => [...prev, { role: 'agent', content: response.text }]);
    } catch (err: any) {
      const msg = err?.message || 'Unknown error';
      if (msg.includes('api key') || msg.includes('unauthorized') || msg.includes('401')) {
        setAgentHistory(prev => [...prev, { role: 'agent', content: 'API key is missing or invalid. Please configure your AI provider key in Settings > AI Providers.' }]);
      } else {
        setAgentHistory(prev => [...prev, { role: 'agent', content: `Error: ${msg.slice(0, 200)}` }]);
      }
    } finally {
      setIsThinking(false);
    }
  };

  if (!agentOpen) return null;

  return (
    <div className="w-80 shrink-0 bg-[#252526] border-l border-[#3c3c3c] flex flex-col z-20 shadow-[-10px_0_20px_rgba(0,0,0,0.2)]">
      <div className="p-3 border-b border-[#3c3c3c] flex items-center justify-between text-white/80 font-sans">
         <div className="flex items-center gap-2 font-semibold">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" /> Agentic Copilot
         </div>
         <button onClick={() => setAgentOpen(false)} className="text-white/50 hover:text-white">×</button>
      </div>
      <div ref={historyRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
         {agentHistory.map((msg, i) => (
           <div key={i} className={cn("text-[13px] leading-relaxed p-3 rounded-lg font-sans whitespace-pre-wrap", msg.role === 'agent' ? "bg-[#37373d] text-white/90" : "bg-blue-600 text-white self-end max-w-[85%]")}>
              {msg.content}
           </div>
         ))}
         {isThinking && (
           <div className="flex items-center gap-2 text-[13px] text-white/50 bg-[#37373d] p-3 rounded-lg w-fit">
             <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
             <span>Thinking...</span>
           </div>
         )}
      </div>
      <div className="p-3 border-t border-[#3c3c3c]">
         <div className="flex gap-2">
           <input 
             type="text" 
             value={agentInput}
             onChange={e => setAgentInput(e.target.value)}
             onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
             placeholder="Ask copilot to edit..." 
             disabled={isThinking}
             className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-xs text-white outline-none focus:border-purple-500 transition-colors placeholder-white/30 disabled:opacity-50"
           />
           <button
             onClick={handleSend}
             disabled={isThinking || !agentInput.trim()}
             className="p-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
           >
             <Sparkles className="w-4 h-4 text-white" />
           </button>
         </div>
      </div>
    </div>
  );
}
