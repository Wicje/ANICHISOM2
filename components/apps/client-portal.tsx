import React, { useState, useEffect, useMemo } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import {
  Eye, Palette, FileText, MessageSquare, LayoutGrid, CheckCircle2,
  Clock, ChevronDown, ChevronRight, Send, ExternalLink, Sparkles, Folder
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrandStore, BrandGuidelines } from '@/lib/stores/brand.store';
import { useMoodboardStore, MoodboardBoard } from '@/lib/stores/moodboard.store';
import { useCampaignStore } from '@/lib/stores/campaign.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { StorageAdapter } from '@/lib/storage';

type PortalTab = 'overview' | 'moodboard' | 'proposals' | 'brand' | 'comments';

interface PortalComment {
  id: string;
  author: string;
  text: string;
  timestamp: number;
  section?: string;
}

interface StoredProposal {
  clientName?: string;
  projectScope?: string;
  budget?: string;
  generated?: boolean;
  aiContent?: string;
  phases?: string[];
  generatedAt?: number;
}

export function ClientPortal({ window: osWindow }: { window: OSWindow }) {
  const { workspaceMode } = useOS();
  const [activeTab, setActiveTab] = useState<PortalTab>('overview');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<PortalComment[]>([]);
  const [proposalStatus, setProposalStatus] = useState('Pending Review');
  const [realProposal, setRealProposal] = useState<StoredProposal | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');

  const projectId = osWindow.data?.projectId || 'global';
  const storageKey = `client-portal-comments-${projectId}`;

  // Load real proposal from StorageAdapter
  useEffect(() => {
    const storage = new StorageAdapter('proposal-generator', workspaceMode);
    storage.get('current-proposal').then((data: StoredProposal | null) => {
      if (data) setRealProposal(data);
    });
  }, [workspaceMode]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { setComments(JSON.parse(saved)); } catch (e) {}
    } else {
      setComments([]);
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(comments));
  }, [comments, storageKey]);

  const brands = useBrandStore((s) => Object.values(s.brands));
  const boards = useMoodboardStore((s) => Object.values(s.boards));
  const currentUser = useAuthStore((s) => s.currentUser);
  const { pages, getCampaignPages } = useCampaignStore();

  const linkedBrand = useMemo(() => {
    if (selectedBrandId) return brands.find(b => b.id === selectedBrandId) || brands[0] || null;
    return brands[0] || null;
  }, [brands, selectedBrandId]);

  const linkedBoard = useMemo(() => {
    if (selectedBoardId) return boards.find(b => b.id === selectedBoardId) || boards[0] || null;
    return boards[0] || null;
  }, [boards, selectedBoardId]);

  // Derive campaign from first campaign-level page
  const campaignPage = pages.find(p => p.level === 'campaign' && !p.trash);
  const campaignPhases = campaignPage
    ? getCampaignPages(campaignPage.id).filter(p => p.level === 'phase')
    : [];
  const campaign = campaignPage
    ? {
        name: campaignPage.title || 'Untitled Campaign',
        status: campaignPhases.length === 0 ? 'Not Started'
          : campaignPhases.every(p => p.status === 'done') ? 'Completed'
          : 'In Progress',
        phases: campaignPhases.map(p => ({
          name: p.title || 'Untitled Phase',
          status: p.status === 'done' ? 'completed' : p.status === 'in-progress' ? 'in-progress' : 'pending',
          progress: p.status === 'done' ? 100 : p.status === 'in-progress' ? 65 : 0,
        })),
      }
    : { name: 'No Campaign Created', status: 'Not Started', phases: [] as { name: string; status: string; progress: number }[] };

  const approvedNodes = useMemo(() => {
    if (!linkedBoard) return [];
    return linkedBoard.nodes.filter((n) => n.reactions && Object.values(n.reactions).some((r) => r.length > 0));
  }, [linkedBoard]);

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    setComments((prev) => [
      ...prev,
      {
        id: `c_${Date.now()}`,
        author: currentUser?.name || 'Client',
        text: newComment.trim(),
        timestamp: Date.now(),
        section: activeTab,
      },
    ]);
    setNewComment('');
  };

  return (
    <div className="w-full h-full flex flex-col bg-[var(--os-bg)] text-[var(--os-text)] font-sans overflow-hidden select-none">
      {/* Header */}
      <div className="h-14 border-b border-[var(--os-border)] bg-[var(--os-surface)] flex items-center px-6 shrink-0 justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--os-primary)]/15 text-[var(--os-primary)] border border-[var(--os-primary)]/25">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[var(--os-text)]">Client Portal</h1>
            <p className="text-[10px] text-[var(--os-text-muted)]">Verified Stakeholder View • {campaign.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-[var(--os-primary)]/15 text-[var(--os-primary)] border border-[var(--os-primary)]/30 text-[10px] font-bold rounded-full flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" /> {campaign.status}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--os-border)] bg-[var(--os-surface-dim)] flex px-4 shrink-0 overflow-x-auto custom-scrollbar">
        {([
          { id: 'overview', label: 'Overview', icon: LayoutGrid },
          { id: 'moodboard', label: 'Moodboard', icon: Palette },
          { id: 'proposals', label: 'Proposals', icon: FileText },
          { id: 'brand', label: 'Brand', icon: Palette },
          { id: 'comments', label: 'Comments', icon: MessageSquare },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-3 text-xs font-semibold flex items-center gap-2 transition-all border-b-2 -mb-px whitespace-nowrap",
              activeTab === tab.id 
                ? "text-[var(--os-primary)] border-[var(--os-primary)] font-bold bg-[var(--os-surface)] rounded-t-xl" 
                : "text-[var(--os-text-muted)] border-transparent hover:text-[var(--os-text)] hover:bg-[var(--os-hover)]",
            )}
          >
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[var(--os-text)]">Campaign Progress &amp; Deliverables</h2>
                <span className="text-xs font-mono text-[var(--os-text-muted)]">{campaign.phases.length} Total Phases</span>
              </div>
              <div className="space-y-3">
                {campaign.phases.map((phase, i) => (
                  <div key={i} className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm font-semibold text-[var(--os-text)]">{phase.name}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                        phase.status === 'completed' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                        phase.status === 'in-progress' ? "bg-[var(--os-primary)]/20 text-[var(--os-primary)] border border-[var(--os-primary)]/30" :
                        "bg-[var(--os-surface-dim)] text-[var(--os-text-muted)]",
                      )}>
                        {phase.status}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[var(--os-surface-dim)] rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          phase.status === 'completed' ? "bg-emerald-500" :
                          phase.status === 'in-progress' ? "bg-[var(--os-primary)]" :
                          "bg-white/10",
                        )}
                        style={{ width: `${phase.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-5 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-[var(--os-text-muted)] mb-1 flex items-center justify-between">
                    <span>Brand Guidelines</span>
                    {brands.length > 1 && (
                      <select 
                        value={selectedBrandId} 
                        onChange={(e) => setSelectedBrandId(e.target.value)}
                        className="bg-[var(--os-surface-dim)] border border-[var(--os-border)] rounded-lg text-[10px] px-2 py-0.5 text-[var(--os-text)] outline-none"
                      >
                        {brands.map(b => <option key={b.id} value={b.id}>{b.brandName}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="text-base font-bold text-[var(--os-text)] mt-2">{linkedBrand ? linkedBrand.brandName : 'No brand linked'}</div>
                  {linkedBrand && <div className="text-xs text-[var(--os-text-muted)] mt-1">{linkedBrand.colors.length} brand colors • {linkedBrand.typography.headingFont}</div>}
                </div>

                <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-5 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-[var(--os-text-muted)] mb-1 flex items-center justify-between">
                    <span>Moodboard Studio</span>
                    {boards.length > 1 && (
                      <select 
                        value={selectedBoardId} 
                        onChange={(e) => setSelectedBoardId(e.target.value)}
                        className="bg-[var(--os-surface-dim)] border border-[var(--os-border)] rounded-lg text-[10px] px-2 py-0.5 text-[var(--os-text)] outline-none"
                      >
                        {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="text-base font-bold text-[var(--os-text)] mt-2">{linkedBoard ? linkedBoard.name : 'No boards'}</div>
                  {linkedBoard && <div className="text-xs text-[var(--os-text-muted)] mt-1">{linkedBoard.nodes.length} assets • {approvedNodes.length} client-approved</div>}
                </div>
              </div>
            </div>
          )}

          {/* Moodboard Tab */}
          {activeTab === 'moodboard' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[var(--os-text)]">Approved Moodboard &amp; Visual Direction</h2>
                {boards.length > 1 && (
                  <select 
                    value={selectedBoardId} 
                    onChange={(e) => setSelectedBoardId(e.target.value)}
                    className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl text-xs px-3 py-1.5 text-[var(--os-text)] outline-none"
                  >
                    {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                )}
              </div>
              {!linkedBoard ? (
                <div className="text-center py-12 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl text-[var(--os-text-muted)]">
                  <Palette className="w-10 h-10 mx-auto mb-3 opacity-40 text-[var(--os-primary)]" />
                  <p className="text-sm font-medium">No moodboard linked to this campaign.</p>
                </div>
              ) : (
                <>
                  <div className="text-xs text-[var(--os-text-muted)]">{linkedBoard.name} — {linkedBoard.nodes.length} total nodes</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {linkedBoard.nodes.map((node) => (
                      <div key={node.id} className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl overflow-hidden group shadow-sm hover:border-[var(--os-primary)]/40 transition-all">
                        {node.type === 'image' && node.content ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img loading="lazy" src={node.content} alt={node.label || 'Asset'} className="w-full h-36 object-cover" />
                        ) : (
                          <div className="w-full h-36 bg-[var(--os-surface-dim)] flex items-center justify-center text-[var(--os-text-muted)] text-xs font-mono">
                            {node.type === 'text' ? (node.content?.slice(0, 40) || 'Text Note') : node.type === 'video' ? 'Video Asset' : 'Embed'}
                          </div>
                        )}
                        <div className="p-3">
                          <div className="text-xs font-semibold text-[var(--os-text)] truncate">{node.label || 'Design Element'}</div>
                          {node.reactions && (
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                              {Object.entries(node.reactions).map(([emoji, users]) => (
                                <span key={emoji} className="text-[10px] bg-[var(--os-surface-dim)] border border-[var(--os-border)] px-1.5 py-0.5 rounded-md text-[var(--os-text)]">
                                  {emoji} {Array.isArray(users) ? users.length : users as number}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Proposals Tab */}
          {activeTab === 'proposals' && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-[var(--os-text)]">Project Scope &amp; Commercial Proposal</h2>
              <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-6 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--os-border)] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-[var(--os-text)]">
                      {realProposal?.clientName ? `${realProposal.clientName} Brand Proposal` : `${campaign.name} Proposal`}
                    </h3>
                    <p className="text-xs text-[var(--os-text-muted)] mt-0.5">
                      Scope: {realProposal?.projectScope || 'Visual Identity & Multi-Channel Marketing Campaign'} • Budget: ${realProposal?.budget || '25,000'}
                    </p>
                  </div>
                  <span className={cn(
                    "px-3 py-1 text-xs font-bold rounded-full border shadow-sm",
                    proposalStatus === 'Approved' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                    proposalStatus === 'Changes Requested' ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                    "bg-[var(--os-primary)]/20 text-[var(--os-primary)] border-[var(--os-primary)]/30"
                  )}>
                    {proposalStatus}
                  </span>
                </div>

                <div className="text-xs text-[var(--os-text)] leading-relaxed bg-[var(--os-surface-dim)] p-4 rounded-xl border border-[var(--os-border)] whitespace-pre-wrap font-sans">
                  {realProposal?.aiContent || 
                    "Comprehensive brand campaign execution including visual identity redesign, digital experience architecture, and multi-channel creative rollout."}
                </div>

                <div className="space-y-2 pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-[var(--os-text-muted)]">Commercial Milestones</div>
                  {(realProposal?.phases && realProposal.phases.length > 0 ? realProposal.phases : campaign.phases.map(p => p.name)).map((phaseName, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-[var(--os-text)] bg-[var(--os-bg)] p-2.5 rounded-xl border border-[var(--os-border)]">
                      <CheckCircle2 className="w-4 h-4 text-[var(--os-primary)] shrink-0" />
                      <span className="font-medium">{typeof phaseName === 'string' ? phaseName : (phaseName as any)?.name}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--os-border)] flex items-center justify-between flex-wrap gap-3">
                  {proposalStatus === 'Pending Review' ? (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { 
                          setProposalStatus('Approved'); 
                          window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Proposal Approved', description: 'Client verified and approved the scope of work.', type: 'success' }}));
                        }} 
                        className="px-5 py-2 bg-[var(--os-primary)] text-slate-950 text-xs font-bold rounded-xl hover:brightness-110 transition-all shadow-md shadow-[var(--os-primary)]/20 flex items-center gap-2 active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve Scope
                      </button>
                      <button 
                        onClick={() => { 
                          setProposalStatus('Changes Requested'); 
                          window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Changes Requested', description: 'Feedback noted for the agency creative team.', type: 'info' }}));
                        }} 
                        className="px-4 py-2 bg-[var(--os-surface-dim)] hover:bg-[var(--os-hover)] text-[var(--os-text)] text-xs font-semibold rounded-xl border border-[var(--os-border)] transition-all active:scale-95"
                      >
                        Request Changes
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-[var(--os-text-muted)] flex items-center gap-2">
                      <span>Status:</span> <strong className="text-[var(--os-primary)]">{proposalStatus}</strong>
                    </div>
                  )}

                  <span className="text-[10px] text-[var(--os-text-muted)]">Signed digitally via Continua Client Portal</span>
                </div>
              </div>
            </div>
          )}

          {/* Brand Tab */}
          {activeTab === 'brand' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[var(--os-text)]">Brand Guidelines &amp; Style Directives</h2>
                {brands.length > 1 && (
                  <select 
                    value={selectedBrandId} 
                    onChange={(e) => setSelectedBrandId(e.target.value)}
                    className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl text-xs px-3 py-1.5 text-[var(--os-text)] outline-none"
                  >
                    {brands.map(b => <option key={b.id} value={b.id}>{b.brandName}</option>)}
                  </select>
                )}
              </div>
              {!linkedBrand ? (
                <div className="text-center py-12 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl text-[var(--os-text-muted)]">
                  <Palette className="w-10 h-10 mx-auto mb-3 opacity-40 text-[var(--os-primary)]" />
                  <p className="text-sm">No brand guidelines linked.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-[var(--os-text)]">{linkedBrand.brandName}</h3>
                    <p className="text-[10px] text-[var(--os-text-muted)] mt-0.5">Updated {new Date(linkedBrand.updatedAt).toLocaleDateString()}</p>
                  </div>

                  <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-5 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--os-text-muted)]">Color Palette</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {linkedBrand.colors.map((c) => (
                        <div key={c.id} className="bg-[var(--os-surface-dim)] p-2.5 rounded-xl border border-[var(--os-border)] flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg border border-black/10 shadow-sm shrink-0" style={{ backgroundColor: c.hex }} />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[var(--os-text)] truncate">{c.name}</div>
                            <div className="text-[10px] font-mono text-[var(--os-text-muted)] uppercase">{c.hex}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl p-5 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--os-text-muted)]">Typography Standards</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-[var(--os-surface-dim)] rounded-xl border border-[var(--os-border)]">
                        <div className="text-[10px] text-[var(--os-text-muted)] uppercase font-bold">Heading Font</div>
                        <div className="text-xs font-bold text-[var(--os-text)] mt-1">{linkedBrand.typography.headingFont} ({linkedBrand.typography.headingWeight})</div>
                      </div>
                      <div className="p-3 bg-[var(--os-surface-dim)] rounded-xl border border-[var(--os-border)]">
                        <div className="text-[10px] text-[var(--os-text-muted)] uppercase font-bold">Body Font</div>
                        <div className="text-xs font-bold text-[var(--os-text)] mt-1">{linkedBrand.typography.bodyFont} ({linkedBrand.typography.bodyWeight})</div>
                      </div>
                      <div className="p-3 bg-[var(--os-surface-dim)] rounded-xl border border-[var(--os-border)]">
                        <div className="text-[10px] text-[var(--os-text-muted)] uppercase font-bold">Accent Font</div>
                        <div className="text-xs font-bold text-[var(--os-text)] mt-1">{linkedBrand.typography.accentFont}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-[var(--os-text)]">Stakeholder Review &amp; Client Feedback</h2>
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <div className="text-center py-8 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl text-xs text-[var(--os-text-muted)]">
                    No comments yet. Leave a note below for the creative team.
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className={cn(
                      "rounded-2xl p-4 border shadow-sm transition-all",
                      c.author === 'Client' 
                        ? "bg-[var(--os-primary)]/10 border-[var(--os-primary)]/20 ml-6" 
                        : "bg-[var(--os-surface)] border-[var(--os-border)] mr-6",
                    )}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-[var(--os-text)]">{c.author}</span>
                        <span className="text-[10px] text-[var(--os-text-muted)] font-mono">{new Date(c.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-[var(--os-text)] leading-relaxed">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder="Add feedback for the agency team..."
                  className="flex-1 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl px-4 py-2.5 text-xs text-[var(--os-text)] placeholder-[var(--os-text-muted)] outline-none focus:border-[var(--os-primary)] shadow-inner"
                />
                <button
                  onClick={handleAddComment}
                  className="px-4 py-2.5 bg-[var(--os-primary)] text-slate-950 rounded-xl transition-all font-bold hover:brightness-110 shadow-md shadow-[var(--os-primary)]/20 flex items-center justify-center active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
