'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { OSWindow } from '@/lib/os-context';
import {
  Eye, Palette, FileText, MessageSquare, LayoutGrid, CheckCircle2,
  Clock, ChevronDown, ChevronRight, Send, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrandStore, BrandGuidelines } from '@/lib/stores/brand.store';
import { useMoodboardStore, MoodboardBoard } from '@/lib/stores/moodboard.store';
import { useCampaignStore } from '@/lib/stores/campaign.store';
import { useAuthStore } from '@/lib/stores/auth.store';

type PortalTab = 'overview' | 'moodboard' | 'proposals' | 'brand' | 'comments';

interface PortalComment {
  id: string;
  author: string;
  text: string;
  timestamp: number;
  section?: string;
}

export function ClientPortal({ window: osWindow }: { window: OSWindow }) {
  
  const [activeTab, setActiveTab] = useState<PortalTab>('overview');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<PortalComment[]>([]);
  const [proposalStatus, setProposalStatus] = useState('Pending Review');

  const projectId = osWindow.data?.projectId || 'global';
  const storageKey = `client-portal-comments-${projectId}`;

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
  const linkedBrand = brands[0] || null;
  const linkedBoard = boards[0] || null;

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
    <div className="w-full h-full flex flex-col bg-[#0a0a0a] text-white font-sans overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-white/10 bg-white/5 flex items-center px-6 shrink-0 gap-4">
        <Eye className="w-5 h-5 text-blue-400" />
        <div>
          <h1 className="text-sm font-bold">Client Portal</h1>
          <p className="text-[10px] text-white/40">Read-only view for {campaign.name}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {campaign.status}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 bg-white/[0.02] flex px-4 shrink-0">
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
              "px-4 py-3 text-xs font-bold flex items-center gap-1.5 transition-colors border-b-2 -mb-px",
              activeTab === tab.id ? "text-white border-blue-400" : "text-white/40 border-transparent hover:text-white/70",
            )}
          >
            <tab.icon className="w-3 h-3" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold">Campaign Progress</h2>
              <div className="space-y-3">
                {campaign.phases.map((phase, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold">{phase.name}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded",
                        phase.status === 'completed' ? "bg-emerald-500/20 text-emerald-400" :
                        phase.status === 'in-progress' ? "bg-blue-500/20 text-blue-400" :
                        "bg-white/10 text-white/40",
                      )}>
                        {phase.status}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          phase.status === 'completed' ? "bg-emerald-500" :
                          phase.status === 'in-progress' ? "bg-blue-500" :
                          "bg-white/10",
                        )}
                        style={{ width: `${phase.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="text-xs font-bold text-white/50 mb-1">Brand Guidelines</div>
                  <div className="text-lg font-bold">{linkedBrand ? linkedBrand.brandName : 'Not linked'}</div>
                  {linkedBrand && <div className="text-[10px] text-white/40 mt-1">{linkedBrand.colors.length} colors defined</div>}
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="text-xs font-bold text-white/50 mb-1">Moodboard</div>
                  <div className="text-lg font-bold">{linkedBoard ? linkedBoard.name : 'No boards'}</div>
                  {linkedBoard && <div className="text-[10px] text-white/40 mt-1">{approvedNodes.length} approved assets</div>}
                </div>
              </div>
            </div>
          )}

          {/* Moodboard Tab */}
          {activeTab === 'moodboard' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold">Moodboard</h2>
              {!linkedBoard ? (
                <div className="text-center py-12 text-white/30">
                  <Palette className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No moodboard linked to this campaign.</p>
                </div>
              ) : (
                <>
                  <div className="text-xs text-white/50">{linkedBoard.name} — {linkedBoard.nodes.length} assets</div>
                  <div className="grid grid-cols-3 gap-3">
                    {linkedBoard.nodes.map((node) => (
                      <div key={node.id} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden group">
                        {node.type === 'image' && node.content ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img loading="lazy" src={node.content} alt={node.label || 'Asset'} className="w-full h-32 object-cover" />
                        ) : (
                          <div className="w-full h-32 bg-white/5 flex items-center justify-center text-white/20 text-xs">
                            {node.type === 'text' ? 'Text' : node.type === 'video' ? 'Video' : 'Embed'}
                          </div>
                        )}
                        <div className="p-2">
                          <div className="text-[10px] font-bold truncate">{node.label || 'Untitled'}</div>
                          {node.reactions && (
                            <div className="flex gap-1 mt-1">
                              {Object.entries(node.reactions).map(([emoji, users]) => (
                                <span key={emoji} className="text-[9px] text-white/40">{emoji} {Array.isArray(users) ? users.length : users as number}</span>
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
              <h2 className="text-lg font-bold">Proposals</h2>
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-bold">Q3 Brand Campaign Proposal</div>
                    <div className="text-[10px] text-white/40">Generated by AI — $25,000</div>
                  </div>
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded">Pending Review</span>
                </div>
                <div className="text-xs text-white/60 leading-relaxed mb-4">
                  Comprehensive brand campaign including visual identity redesign, digital experience development, and strategic marketing rollout for Q3 2026.
                </div>
                <div className="space-y-2">
                  {campaign.phases.map((phase, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className={cn("w-3.5 h-3.5", phase.status === 'completed' ? "text-emerald-400" : "text-white/20")} />
                      <span className={cn(phase.status === 'completed' ? "text-white/80" : "text-white/40")}>{phase.name}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                  {proposalStatus === 'Pending Review' ? (
                    <>
                      <button onClick={() => { setProposalStatus('Approved'); window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Proposal Approved', description: 'Client approved the proposal for ' + campaign.name, type: 'success' }})) }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-xs font-bold rounded transition-colors flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </button>
                      <button onClick={() => { setProposalStatus('Changes Requested'); window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Changes Requested', description: 'Change request sent to the team', type: 'info' }})) }} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold rounded transition-colors border border-white/10">
                        Request Changes
                      </button>
                    </>
                  ) : (
                    <div className="text-sm font-medium text-white/50">Status: {proposalStatus}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Brand Tab */}
          {activeTab === 'brand' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold">Brand Guidelines</h2>
              {!linkedBrand ? (
                <div className="text-center py-12 text-white/30">
                  <Palette className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No brand guidelines linked.</p>
                </div>
              ) : (
                <>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="text-sm font-bold mb-1">{linkedBrand.brandName}</div>
                    <div className="text-[10px] text-white/40">Last updated {new Date(linkedBrand.updatedAt).toLocaleDateString()}</div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-white/60 mb-2">Color Palette</h3>
                    <div className="flex gap-2 flex-wrap">
                      {linkedBrand.colors.map((c) => (
                        <div key={c.id} className="text-center">
                          <div className="w-12 h-12 rounded-lg border border-white/10 mb-1" style={{ backgroundColor: c.hex }} />
                          <div className="text-[9px] text-white/40">{c.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-white/60 mb-2">Typography</h3>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1">
                      <div className="text-xs"><span className="text-white/40">Heading:</span> {linkedBrand.typography.headingFont} ({linkedBrand.typography.headingWeight})</div>
                      <div className="text-xs"><span className="text-white/40">Body:</span> {linkedBrand.typography.bodyFont} ({linkedBrand.typography.bodyWeight})</div>
                      <div className="text-xs"><span className="text-white/40">Accent:</span> {linkedBrand.typography.accentFont}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-white/60 mb-2">Voice</h3>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
                      <div className="text-xs"><span className="text-white/40">Tone:</span> {linkedBrand.voice.tone}</div>
                      {linkedBrand.voice.personality.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {linkedBrand.voice.personality.map((p, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] rounded">{p}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold">Comments</h2>
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className={cn(
                    "rounded-lg p-3 border",
                    c.author === 'Client' ? "bg-blue-500/5 border-blue-500/10 ml-8" : "bg-white/5 border-white/10 mr-8",
                  )}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold">{c.author}</span>
                      <span className="text-[9px] text-white/30">{new Date(c.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-white/70">{c.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder="Add a comment..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-blue-400"
                />
                <button
                  onClick={handleAddComment}
                  className="px-4 py-2.5 bg-blue-500 hover:bg-blue-400 rounded-lg transition-colors"
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
