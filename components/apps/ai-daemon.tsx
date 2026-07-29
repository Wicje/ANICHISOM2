'use client';
import { useEffect, useRef } from 'react';
import { useAIStore } from '@/lib/stores/ai.store';

export function EdgeAIDaemon() {
  const { setReady, setProgress, setQueryEngine } = useAIStore();
  const initAttempted = useRef(false);

  useEffect(() => {
    if (initAttempted.current) return;
    initAttempted.current = true;

    async function initWebLLM() {
      try {
        const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
        
        // Use a tiny model suitable for web (Llama-3-8B-Instruct is too big for many GPUs, Qwen2.5-1.5B is better)
        const selectedModel = 'Llama-3.2-1B-Instruct-q4f32_1-MLC';
        setProgress('Loading Edge AI Model...');

        // We use a worker so it doesn't block the UI thread during generation
        const worker = new Worker(
          new URL('./ai-worker.ts', import.meta.url), 
          { type: 'module' }
        );
        
        const engine = await CreateWebWorkerMLCEngine(worker, selectedModel, {
          initProgressCallback: (progress) => {
            setProgress(progress.text);
          }
        });

        setQueryEngine(async (prompt: string) => {
          try {
            const { useMemoryStore } = await import('@/lib/stores/memory.store');
            const context = useMemoryStore.getState().getContext();
            
            const reply = await engine.chat.completions.create({
              messages: [
                { 
                  role: 'system', 
                  content: `You are ContinuaOS Edge AI. You run fully offline on the user's local GPU. Be concise, highly helpful, and conversational.\n\n${context}` 
                },
                { role: 'user', content: prompt }
              ],
              temperature: 0.7,
              max_tokens: 512,
            });
            return reply.choices[0]?.message.content || 'No response.';
          } catch (e: any) {
            return `AI Error: ${e.message}`;
          }
        });

        setReady(true);
        setProgress('Ready (Offline)');
      } catch (err: any) {
        setProgress(`Failed to load AI: ${err.message}`);
      }
    }

    initWebLLM();
  }, [setReady, setProgress, setQueryEngine]);

  return null;
}
