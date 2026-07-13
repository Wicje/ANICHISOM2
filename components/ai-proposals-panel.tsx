/**
 * ANICHISOM OS: AI Proposals Panel
 * 
 * Display and manage AI-generated design recommendations
 * Phase 3B: AI Proposals & Adaptive UI
 */

'use client';

import { useState, useEffect } from 'react';
import { useOS } from '@/lib/os-context';
import { getAIProposalEngine, type DesignProposal, type ProjectBriefAnalysis } from '@/lib/ai-proposal-engine';
import {
  Sparkles, Copy, ThumbsUp, ThumbsDown, Zap, Eye, Heart,
  ChevronDown, ChevronUp, RefreshCw, Save, X, Loader
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIProposalsPanelProps {
  projectBrief: {
    projectName: string;
    description: string;
    clientName: string;
    targetAudience?: string;
  };
}

export function AIProposalsPanel({ projectBrief }: AIProposalsPanelProps) {
  const { currentUser, workspaceId, emitEvent } = useOS();
  const [analysis, setAnalysis] = useState<ProjectBriefAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<DesignProposal | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const [feedback, setFeedback] = useState<Record<string, 'liked' | 'disliked' | null>>({});
  const [savedProposals, setSavedProposals] = useState<string[]>([]);

  // Generate proposals on mount
  useEffect(() => {
    const generateProposals = async () => {
      try {
        setLoading(true);
        const engine = getAIProposalEngine();
        const result = await engine.analyzeProjectBrief(projectBrief);
        setAnalysis(result);
        if (result.recommendations.length > 0) {
          setSelectedProposal(result.recommendations[0]!);
        }

        emitEvent({
          type: 'ai_analysis_generated',
          workspaceId,
          entityId: projectBrief.projectName,
          userId: currentUser?.id || 'unknown',
          comment: `AI analysis generated for ${projectBrief.projectName}`,
        });
      } catch (error) {
        console.error('[v0] Failed to generate proposals:', error);
      } finally {
        setLoading(false);
      }
    };

    generateProposals();
  }, [projectBrief, workspaceId, currentUser, emitEvent]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleSaveProposal = (proposalId: string) => {
    if (savedProposals.includes(proposalId)) {
      setSavedProposals(savedProposals.filter((id) => id !== proposalId));
    } else {
      setSavedProposals([...savedProposals, proposalId]);
    }

    emitEvent({
      type: 'proposal_saved',
      workspaceId,
      entityId: proposalId,
      userId: currentUser?.id || 'unknown',
      comment: 'Design proposal saved',
    });
  };

  const handleFeedback = (proposalId: string, type: 'liked' | 'disliked') => {
    setFeedback({
      ...feedback,
      [proposalId]: feedback[proposalId] === type ? null : type,
    });
  };

  const getProposalIcon = (type: string) => {
    switch (type) {
      case 'color-palette':
        return '🎨';
      case 'typography':
        return '✍️';
      case 'layout':
        return '📐';
      case 'animation':
        return '✨';
      case 'accessibility':
        return '♿';
      default:
        return '⚡';
    }
  };

  if (!analysis) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
        {loading ? (
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-3" />
            <p>Analyzing project brief with AI...</p>
          </div>
        ) : (
          <p>No analysis available</p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-700 p-4 shrink-0 bg-gradient-to-r from-purple-900/20 to-pink-900/20">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold">AI Design Recommendations</h2>
        </div>
        <p className="text-sm text-gray-400">
          Smart design proposals generated for: <strong>{projectBrief.projectName}</strong>
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {/* Left: Analysis Overview */}
        <div className="w-72 border border-gray-700 rounded bg-gray-800/30 overflow-y-auto shrink-0">
          {/* Overview Section */}
          <div className="border-b border-gray-700">
            <button
              onClick={() => toggleSection('overview')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
            >
              <h3 className="font-semibold text-sm">Overview</h3>
              {expandedSections.has('overview') ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {expandedSections.has('overview') && (
              <div className="px-4 py-3 space-y-3 border-t border-gray-700/50">
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-2">Design Themes</div>
                  <div className="space-y-1">
                    {analysis.themes.map((theme) => (
                      <div key={theme} className="text-sm text-gray-300 bg-gray-700/30 px-2 py-1 rounded">
                        {theme}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-2">Target Audience</div>
                  <p className="text-sm text-gray-300">{analysis.targetAudience}</p>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-2">Key Colors</div>
                  <div className="flex gap-2">
                    {analysis.keyColors.map((color) => (
                      <div
                        key={color}
                        className="w-10 h-10 rounded border border-gray-600"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-2">Typography</div>
                  <div className="space-y-1">
                    {analysis.suggestedTypography.map((font) => (
                      <div key={font} className="text-sm text-gray-300">
                        {font}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Proposals List */}
          <div className="border-b border-gray-700">
            <button
              onClick={() => toggleSection('proposals')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
            >
              <h3 className="font-semibold text-sm">Proposals ({analysis.recommendations.length})</h3>
              {expandedSections.has('proposals') ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {expandedSections.has('proposals') && (
              <div className="divide-y divide-gray-700">
                {analysis.recommendations.map((proposal) => (
                  <button
                    key={proposal.id}
                    onClick={() => setSelectedProposal(proposal)}
                    className={`w-full text-left px-4 py-2 transition-colors ${
                      selectedProposal?.id === proposal.id
                        ? 'bg-purple-600/30'
                        : 'hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg mt-0.5">{getProposalIcon(proposal.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{proposal.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{proposal.type}</div>
                      </div>
                      {savedProposals.includes(proposal.id) && (
                        <Heart className="w-4 h-4 text-red-400 fill-red-400 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Selected Proposal Details */}
        {selectedProposal ? (
          <div className="flex-1 border border-gray-700 rounded bg-gray-800/30 overflow-y-auto flex flex-col">
            <div className="p-4 border-b border-gray-700 shrink-0">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <span className="text-4xl">{getProposalIcon(selectedProposal.type)}</span>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedProposal.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{selectedProposal.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-400">
                    {Math.round(selectedProposal.confidence * 100)}%
                  </div>
                  <div className="text-xs text-gray-400">confidence</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveProposal(selectedProposal.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                    savedProposals.includes(selectedProposal.id)
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <Heart
                    className={cn('w-4 h-4', savedProposals.includes(selectedProposal.id) && 'fill-current')}
                  />
                  Save
                </button>

                <button
                  onClick={() => handleFeedback(selectedProposal.id, 'liked')}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    feedback[selectedProposal.id] === 'liked'
                      ? 'bg-green-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleFeedback(selectedProposal.id, 'disliked')}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    feedback[selectedProposal.id] === 'disliked'
                      ? 'bg-red-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {/* Tags */}
                {selectedProposal.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">Tags</h4>
                    <div className="flex gap-2 flex-wrap">
                      {selectedProposal.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Details */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">Details</h4>
                  <div className="bg-gray-700/50 p-3 rounded text-sm text-gray-300 whitespace-pre-wrap">
                    {JSON.stringify(selectedProposal.details, null, 2)}
                  </div>
                </div>

                {/* Generated Info */}
                <div className="text-xs text-gray-500 border-t border-gray-700 pt-3">
                  Generated on {selectedProposal.generatedAt.toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Select a proposal to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
