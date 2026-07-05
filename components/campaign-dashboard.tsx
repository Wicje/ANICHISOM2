/**
 * ANICHISOM OS: Campaign Dashboard
 * 
 * Project timeline and deliverables tracker
 * Phase 2B: Campaign Lab App
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useOS } from '@/lib/os-context';
import { projectAdapter } from '@/lib/firestore-adapter';
import { Project, Deliverable } from '@/lib/workspace-types';
import { 
  Calendar, CheckCircle, AlertCircle, Clock, Target, Users,
  Plus, Trash2, Edit2, GripVertical
} from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { cn } from '@/lib/utils';

interface CampaignDashboardProps {
  projectId: string;
}

export function CampaignDashboard({ projectId }: CampaignDashboardProps) {
  const { workspaceId, currentUser, emitEvent } = useOS();
  const [project, setProject] = useState<Project | null>(null);
  const now = useMemo(() => new Date(), []);
  const threeDaysFromNow = useMemo(() => new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), [now]);
  const [loading, setLoading] = useState(true);
  const [showDeliverableForm, setShowDeliverableForm] = useState(false);
  const [deliverableForm, setDeliverableForm] = useState(() => ({
    name: '',
    description: '',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assignee: '',
  }));

  useEffect(() => {
    const loadProject = async () => {
      try {
        const data = await projectAdapter.get(projectId);
        if (data) setProject(data);
      } catch (error) {
        console.error('[v0] Failed to load project:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId]);

  const handleAddDeliverable = async () => {
    if (!project || !deliverableForm.name.trim()) return;

    const newDeliverable: Deliverable = {
      id: crypto.randomUUID(),
      name: deliverableForm.name,
      description: deliverableForm.description,
      dueDate: new Date(deliverableForm.dueDate),
      status: 'pending',
      assigneeId: deliverableForm.assignee || currentUser?.id || 'unknown',
    };

    const updated = {
      ...project,
      deliverables: [...project.deliverables, newDeliverable],
      updatedAt: new Date(),
    };

    try {
      await projectAdapter.update(projectId, updated);
      setProject(updated);
      setShowDeliverableForm(false);
      setDeliverableForm({
        name: '',
        description: '',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        assignee: '',
      });

      emitEvent({
        type: 'deliverable_created',
        workspaceId,
        entityId: projectId,
        userId: currentUser?.id || 'unknown',
        comment: `Added deliverable: ${newDeliverable.name}`,
      });
    } catch (error) {
      console.error('[v0] Failed to add deliverable:', error);
    }
  };

  const handleToggleDeliverableStatus = async (deliverableId: string) => {
    if (!project) return;

    const updated = {
      ...project,
      deliverables: project.deliverables.map((d): Deliverable =>
        d.id === deliverableId
          ? { ...d, status: d.status === 'delivered' ? 'pending' : 'delivered' }
          : d
      ),
      updatedAt: new Date(),
    };

    try {
      await projectAdapter.update(projectId, { deliverables: updated.deliverables });
      setProject(updated);
    } catch (error) {
      console.error('[v0] Failed to update deliverable:', error);
    }
  };

  const handleDeleteDeliverable = async (deliverableId: string) => {
    if (!project || !confirm('Remove deliverable?')) return;

    const updated = {
      ...project,
      deliverables: project.deliverables.filter((d) => d.id !== deliverableId),
      updatedAt: new Date(),
    };

    try {
      await projectAdapter.update(projectId, { deliverables: updated.deliverables });
      setProject(updated);
    } catch (error) {
      console.error('[v0] Failed to delete deliverable:', error);
    }
  };

  const getProgressPercentage = () => {
    if (project?.deliverables.length === 0) return 0;
    if (!project) return 0;
    const completed = project.deliverables.filter((d) => d.status === 'delivered').length;
    return Math.round((completed / Math.max(1, project.deliverables.length)) * 100);
  };

  const activeDeliverables = useMemo(() => {
    if (!project) return [];
    return project.deliverables
      .filter((d) => d.status !== 'delivered')
      .filter((d) => d.status !== 'approved')
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 3);
  }, [project]);

  if (loading) {
    return <div className="p-4 text-gray-400">Loading project...</div>;
  }

  if (!project) {
    return <div className="p-4 text-gray-400">Project not found</div>;
  }

  const progress = getProgressPercentage();
  const upcoming = activeDeliverables;
  const overdue = project.deliverables.filter(
    (d) => d.status !== 'delivered' && d.status !== 'approved' && d.dueDate < new Date()
  );

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-gray-900 to-gray-950 text-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-700 p-6 shrink-0">
        <div className="mb-4">
          <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
          <p className="text-gray-400">Client: {project.clientId}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4" />
              Progress
            </span>
            <span className="text-sm text-gray-400">{progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Total</div>
            <div className="text-lg font-semibold">{project.deliverables.length}</div>
          </div>
          <div className="bg-green-900/30 p-3 rounded border border-green-700/50">
            <div className="text-xs text-green-400 mb-1">Completed</div>
            <div className="text-lg font-semibold">
              {project.deliverables.filter((d) => d.status === 'delivered' || d.status === 'approved').length}
            </div>
          </div>
          <div className="bg-amber-900/30 p-3 rounded border border-amber-700/50">
            <div className="text-xs text-amber-400 mb-1">Upcoming</div>
            <div className="text-lg font-semibold">{upcoming.length}</div>
          </div>
          <div className={`p-3 rounded border ${overdue.length > 0 ? 'bg-red-900/30 border-red-700/50' : 'bg-gray-800/50 border-gray-700'}`}>
            <div className={`text-xs mb-1 ${overdue.length > 0 ? 'text-red-400' : 'text-gray-400'}`}>
              Overdue
            </div>
            <div className="text-lg font-semibold">{overdue.length}</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Timeline & Deliverables */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Deliverables
            </h2>
            <button
              onClick={() => setShowDeliverableForm(!showDeliverableForm)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* Add Form */}
          {showDeliverableForm && (
            <div className="bg-gray-800/50 p-4 rounded border border-gray-700 mb-4">
              <input
                placeholder="Deliverable name"
                value={deliverableForm.name}
                onChange={(e) => setDeliverableForm({ ...deliverableForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white text-sm mb-3 placeholder-gray-400"
              />
              <input
                placeholder="Description (optional)"
                value={deliverableForm.description}
                onChange={(e) => setDeliverableForm({ ...deliverableForm, description: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white text-sm mb-3 placeholder-gray-400"
              />
              <input
                type="date"
                value={deliverableForm.dueDate}
                onChange={(e) => setDeliverableForm({ ...deliverableForm, dueDate: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white text-sm mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddDeliverable}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowDeliverableForm(false)}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Deliverables List */}
          <div className="space-y-2">
            {project.deliverables.length === 0 ? (
              <div className="text-gray-400 text-sm p-4 text-center">
                No deliverables yet. Add one to get started.
              </div>
            ) : (
              project.deliverables
                .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
                .map((deliverable) => {
                  const isOverdue = deliverable.status !== 'delivered' && deliverable.status !== 'approved' && deliverable.dueDate < now;
                  const isDueSoon =
                    deliverable.status !== 'delivered' &&
                    deliverable.status !== 'approved' &&
                    !isOverdue &&
                    deliverable.dueDate < threeDaysFromNow;

                  return (
                    <div
                      key={deliverable.id}
                      className={`flex items-start gap-3 p-3 rounded border transition-colors ${
                        deliverable.status === 'delivered' || deliverable.status === 'approved'
                          ? 'bg-gray-800/30 border-gray-700/50'
                          : isOverdue
                          ? 'bg-red-900/20 border-red-700/50'
                          : isDueSoon
                          ? 'bg-amber-900/20 border-amber-700/50'
                          : 'bg-gray-800/50 border-gray-700'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleDeliverableStatus(deliverable.id)}
                        className="mt-1 transition-colors"
                      >
                        {deliverable.status === 'delivered' || deliverable.status === 'approved' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-gray-400 hover:text-gray-300" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-medium text-sm ${deliverable.status === 'delivered' || deliverable.status === 'approved' ? 'line-through text-gray-500' : 'text-white'}`}
                        >
                          {deliverable.name}
                        </div>
                        {deliverable.description && (
                          <div className="text-xs text-gray-400 mt-1">{deliverable.description}</div>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {formatDistance(deliverable.dueDate, new Date(), { addSuffix: true })}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteDeliverable(deliverable.id)}
                        className="text-gray-400 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team
          </h2>
          <div className="space-y-2">
            {project.team.map((member) => (
              <div key={member.userId} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded border border-gray-700">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{member.name}</div>
                  <div className="text-xs text-gray-400 capitalize">{member.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
