/**
 * ContinuaOS: Approval Workflow
 * 
 * Client and stakeholder approval management
 * Phase 2B: Campaign Lab App
 */

'use client';

import { useState, useEffect } from 'react';
import { useOS } from '@/lib/os-context';
import { Project } from '@/lib/workspace-types';
import { projectAdapter } from '@/lib/supabase-adapter';
import {
  CheckCircle, XCircle, Clock, MessageSquare, User, Send,
  ThumbsUp, ThumbsDown, Eye, Edit2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ApprovalStep {
  id: string;
  title: string;
  description: string;
  assignee: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_review';
  comments: Array<{
    userId: string;
    userName: string;
    text: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  completedAt?: Date;
}

interface ApprovalWorkflowProps {
  project: Project;
}

export function ApprovalWorkflow({ project }: ApprovalWorkflowProps) {
  const { currentUser, emitEvent, workspaceId } = useOS();
  const [approvalSteps, setApprovalSteps] = useState<ApprovalStep[]>([
    {
      id: '1',
      title: 'Creative Brief Review',
      description: 'Client review of campaign creative direction and messaging',
      assignee: project.clientId,
      status: 'pending',
      comments: [],
      createdAt: new Date(),
    },
    {
      id: '2',
      title: 'Design Approval',
      description: 'Stakeholder sign-off on final design assets',
      assignee: project.clientId,
      status: 'pending',
      comments: [],
      createdAt: new Date(),
    },
    {
      id: '3',
      title: 'Final Review',
      description: 'Executive approval before launch',
      assignee: project.clientId,
      status: 'pending',
      comments: [],
      createdAt: new Date(),
    },
  ]);

  const [selectedStep, setSelectedStep] = useState<ApprovalStep>(approvalSteps[0]!);
  const [newComment, setNewComment] = useState('');
  const [expandedComments, setExpandedComments] = useState<string | null>(null);

  const handleAddComment = (stepId: string) => {
    if (!newComment.trim() || !currentUser) return;

    setApprovalSteps(
      approvalSteps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              comments: [
                ...step.comments,
                {
                  userId: currentUser.id,
                  userName: currentUser.name,
                  text: newComment,
                  timestamp: new Date(),
                },
              ],
            }
          : step
      )
    );

    setNewComment('');

    emitEvent({
      type: 'approval_comment',
      workspaceId,
      entityId: project.id,
      userId: currentUser.id,
      comment: `Added comment to ${approvalSteps.find((s) => s.id === stepId)?.title}`,
    });
  };

  const handleApprove = (stepId: string) => {
    setApprovalSteps(
      approvalSteps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              status: 'approved',
              completedAt: new Date(),
            }
          : step
      )
    );

    emitEvent({
      type: 'approval_granted',
      workspaceId,
      entityId: project.id,
      userId: currentUser?.id || 'unknown',
      comment: `Approved: ${approvalSteps.find((s) => s.id === stepId)?.title}`,
    });
  };

  const handleReject = (stepId: string) => {
    setApprovalSteps(
      approvalSteps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              status: 'rejected',
              completedAt: new Date(),
            }
          : step
      )
    );

    emitEvent({
      type: 'approval_rejected',
      workspaceId,
      entityId: project.id,
      userId: currentUser?.id || 'unknown',
      comment: `Rejected: ${approvalSteps.find((s) => s.id === stepId)?.title}`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-900/30 border-green-700/50 text-green-300';
      case 'rejected':
        return 'bg-red-900/30 border-red-700/50 text-red-300';
      case 'in_review':
        return 'bg-blue-900/30 border-blue-700/50 text-blue-300';
      default:
        return 'bg-gray-800/50 border-gray-700 text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'in_review':
        return <Eye className="w-5 h-5 text-blue-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const approvalRate = Math.round(
    (approvalSteps.filter((s) => s.status === 'approved').length / approvalSteps.length) * 100
  );

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-700 p-4 shrink-0">
        <h2 className="text-lg font-semibold mb-3">Approval Workflow</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-sm text-gray-400 mb-1">Overall Progress</div>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all duration-300"
                style={{ width: `${approvalRate}%` }}
              />
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{approvalRate}%</div>
            <div className="text-xs text-gray-400">Approved</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {/* Steps List */}
        <div className="w-80 border border-gray-700 rounded bg-gray-800/30 overflow-y-auto shrink-0 space-y-1 p-2">
          {approvalSteps.map((step) => (
            <button
              key={step.id}
              onClick={() => setSelectedStep(step)}
              className={`w-full text-left p-3 rounded border-l-2 transition-colors ${
                selectedStep.id === step.id
                  ? 'bg-blue-600/30 border-l-blue-500'
                  : `${getStatusColor(step.status)} border-l-transparent hover:bg-gray-800/50`
              }`}
            >
              <div className="flex items-start gap-2">
                {getStatusIcon(step.status)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{step.title}</div>
                  <div className="text-xs text-gray-400 mt-1 line-clamp-1">{step.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Step Details */}
        {selectedStep && (
          <div className="flex-1 border border-gray-700 rounded bg-gray-800/30 overflow-y-auto flex flex-col">
            {/* Step Header */}
            <div className="border-b border-gray-700 p-4 shrink-0">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {selectedStep.title}
                    {selectedStep.status === 'approved' && (
                      <span className="text-xs bg-green-900/50 text-green-300 px-2 py-0.5 rounded">
                        Approved
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">{selectedStep.description}</p>
                </div>
              </div>

              {/* Action Buttons */}
              {selectedStep.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(selectedStep.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(selectedStep.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              )}

              {selectedStep.completedAt && (
                <div className="text-xs text-gray-400">
                  {selectedStep.status === 'approved' ? 'Approved' : 'Rejected'} on{' '}
                  {format(selectedStep.completedAt, 'MMM d, yyyy')}
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
              {selectedStep.comments.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No comments yet</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedStep.comments.map((comment, idx) => (
                    <div key={idx} className="bg-gray-700/50 p-3 rounded">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                          {comment.userName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{comment.userName}</span>
                        <span className="text-xs text-gray-400">
                          {format(comment.timestamp, 'MMM d, HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">{comment.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment Input */}
              <div className="mt-4 pt-4 border-t border-gray-700 flex gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment(selectedStep.id);
                    }
                  }}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 bg-gray-700 rounded text-white text-sm placeholder-gray-400"
                />
                <button
                  onClick={() => handleAddComment(selectedStep.id)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
