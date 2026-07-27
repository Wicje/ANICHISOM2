'use client';

import React, { useState, useEffect } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { Sparkles, FileText, Download, Send, CheckCircle2, Bot, Layers, ArrowRight, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { StorageAdapter } from '@/lib/storage';
import { getAIGateway } from '@/lib/ai-gateway-service';

interface ProposalData {
  clientName: string;
  projectScope: string;
  budget: string;
  generated: boolean;
  aiContent?: string;
  phases?: string[];
  generatedAt?: number;
}

export function ProposalGenerator({ window: osWindow }: { window: OSWindow }) {
  const { emitEvent, currentUser, workspaceMode } = useOS();
  const [storage] = useState(() => new StorageAdapter('proposal-generator', workspaceMode));
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [clientName, setClientName] = useState('Acme Corp');
  const [projectScope, setProjectScope] = useState('Q3 Brand Campaign & Digital Experience');
  const [budget, setBudget] = useState('25,000');
  const [isLoaded, setIsLoaded] = useState(false);
  const [aiContent, setAiContent] = useState('');
  const [phases, setPhases] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    storage.get('current-proposal').then((data: ProposalData | null) => {
      if (data) {
        setClientName(data.clientName || '');
        setProjectScope(data.projectScope || '');
        setBudget(data.budget || '');
        if (data.generated) {
          setGenerated(true);
          setAiContent(data.aiContent || '');
          setPhases(data.phases || []);
        }
      }
      setIsLoaded(true);
    });
  }, [storage]);

  const saveState = (overrides: Partial<ProposalData>) => {
    storage.set('current-proposal', {
      clientName, projectScope, budget, generated, aiContent, phases, ...overrides,
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const gateway = getAIGateway();
      const systemPrompt = `You are a senior creative strategist at ContinuaOS, a premium creative agency. Generate a professional project proposal document.

Return your response as valid JSON with this exact structure:
{
  "summary": "A 2-3 sentence executive summary of the project",
  "phases": [
    { "name": "Phase name", "description": "What this phase covers", "duration": "Week X-Y", "deliverables": ["deliverable 1", "deliverable 2"] }
  ],
  "approach": "Our strategic approach paragraph",
  "investment": "Breakdown of investment allocation",
  "timeline": "Overall timeline summary",
  "whyUs": "Why ContinuaOS is the right partner"
}

Be specific, professional, and persuasive. Tailor the proposal to the client's needs.`;

      const userMessage = `Create a proposal for:
Client: ${clientName}
Project: ${projectScope}
Budget: $${budget}

Tailor the phases, deliverables, and approach to this specific project scope and budget.`;

      const response = await gateway.chat({
        messages: [{ role: 'user', content: userMessage }],
        systemPrompt,
        temperature: 0.7,
        maxTokens: 2000,
      });

      const text = response.text;
      setAiContent(text);

      try {
        const parsed = JSON.parse(text);
        setPhases(
          (parsed.phases || []).map(
            (p: any) => `${p.name} (${p.duration || ''})`,
          ),
        );
      } catch {
        const lines = text.split('\n').filter(l => l.trim().length > 5).slice(0, 6); setPhases(lines);
      }

      setGenerated(true);
      saveState({ generated: true, aiContent: text, generatedAt: Date.now() });

      emitEvent({
        workspaceId: 'global',
        type: 'project_updated',
        entityId: 'proposal-1',
        userId: currentUser?.id || 'anonymous',
        comment: `Generated AI Proposal for ${clientName}`,
      });
    } catch (e: any) {
      console.error('[ProposalGenerator] AI generation failed:', e);
      setError(e.message || 'AI generation failed. Check your AI provider settings.');

      setPhases([
        'Discovery & Strategy (Week 1-2)',
        'Visual Identity (Week 3-4)',
        'Digital Experience (Week 5-7)',
        'Handoff & Review (Week 8)',
      ]);
      setGenerated(true);
      saveState({ generated: true, phases: [], generatedAt: Date.now() });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = () => {
    emitEvent({
      workspaceId: 'global',
      type: 'project_updated',
      entityId: 'proposal-1',
      userId: currentUser?.id || 'anonymous',
      comment: `Sent Proposal to ${clientName}`,
    });
    window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Proposal Sent', description: `Proposal delivered to ${clientName}`, type: 'success' } }));
  };

  if (!isLoaded) return <div className="w-full h-full bg-[#111] flex items-center justify-center text-white/50 animate-pulse">Loading Proposal Engine...</div>;

  return (
    <div className="w-full h-full flex bg-[#111] text-white font-sans overflow-hidden">
      {/* Editor Side */}
      <div className="w-1/2 border-r border-white/10 flex flex-col bg-[#0a0a0a]">
        <div className="p-4 border-b border-white/10 flex items-center gap-3 shrink-0">
          <Bot className="w-5 h-5 text-purple-400" />
          <h2 className="text-sm font-medium">AI Proposal Generator</h2>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-5">
            <div>
              <label className="text-xs text-white/50 font-bold uppercase tracking-wider mb-2 block">Client Name</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  saveState({ clientName: e.target.value });
                }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-white/50 font-bold uppercase tracking-wider mb-2 block">Project Scope</label>
              <textarea
                value={projectScope}
                onChange={(e) => {
                  setProjectScope(e.target.value);
                  saveState({ projectScope: e.target.value });
                }}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-white/50 font-bold uppercase tracking-wider mb-2 block">Estimated Budget (USD)</label>
              <input
                type="text"
                value={budget}
                onChange={(e) => {
                  setBudget(e.target.value);
                  saveState({ budget: e.target.value });
                }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="text-xs text-red-300">{error}</span>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="mt-4 w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg py-3.5 text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50"
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Sparkles className="w-4 h-4" /> {generated ? 'Regenerate Proposal' : 'Generate Smart Proposal'}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Side */}
      <div className="w-1/2 flex flex-col bg-[#111] relative">
        <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-medium">Live Preview</h2>
          </div>

          {generated && (
            <div className="flex gap-2">
              <button onClick={() => { const content = aiContent || projectScope; const blob = new Blob([`PROPOSAL FOR: ${clientName}\n\n${content}`], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Proposal-${clientName.replace(/\s+/g, '_')}.txt`; a.click(); }} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={handleSend} className="px-4 py-1.5 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-xs font-medium flex items-center gap-2 transition-colors shadow-lg">
                <Send className="w-3 h-3" /> Send to Client
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex justify-center">
          {!generated ? (
            <div className="flex flex-col items-center justify-center text-white/30 h-full max-w-xs text-center">
              <Layers className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm">Enter client details and generate a proposal to see the preview here.</p>
            </div>
          ) : (
            <div className="w-full max-w-md bg-white text-black p-8 rounded-xl shadow-2xl h-max animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight mb-1">ContinuaOS</h1>
                  <p className="text-black/50 text-xs font-medium uppercase tracking-widest">Creative Agency</p>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">{format(new Date(), 'MMMM d, yyyy')}</div>
                  <div className="text-black/50">Valid for 30 days</div>
                </div>
              </div>

              <div className="mb-8">
                <div className="text-xs font-bold text-black/50 uppercase tracking-wider mb-1">Prepared For</div>
                <div className="text-lg font-medium">{clientName}</div>
              </div>

              {aiContent ? (
                <div className="mb-8">
                  <div className="text-xs font-bold text-black/50 uppercase tracking-wider mb-2">AI-Generated Proposal</div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-black/80 max-h-64 overflow-y-auto">{aiContent}</div>
                </div>
              ) : (
                <div className="mb-8">
                  <div className="text-xs font-bold text-black/50 uppercase tracking-wider mb-2">Project Scope</div>
                  <p className="text-sm leading-relaxed">{projectScope}</p>
                  <p className="text-sm leading-relaxed mt-2 text-black/70">Our team will deliver a comprehensive strategy, encompassing visual design, structural layout, and high-fidelity prototypes aligned with your brand objectives.</p>
                </div>
              )}

              <div className="mb-10">
                <div className="text-xs font-bold text-black/50 uppercase tracking-wider mb-3">Deliverables & Timeline</div>
                <div className="space-y-3">
                  {(phases.length > 0 ? phases : ['Discovery & Strategy (Week 1-2)', 'Visual Identity (Week 3-4)', 'Digital Experience (Week 5-7)', 'Handoff & Review (Week 8)']).map((phase, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm border-b border-black/5 pb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      {phase}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-black/5 p-4 rounded-lg flex justify-between items-center">
                <div className="text-sm font-medium">Estimated Investment</div>
                <div className="text-xl font-bold">${budget}</div>
              </div>

              <div className="mt-10 pt-6 border-t border-black/10 flex justify-between items-center text-xs text-black/50">
                <div>Confidential</div>
                <div className="flex items-center gap-1 hover:text-black cursor-pointer transition-colors">
                  Approve Proposal <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
