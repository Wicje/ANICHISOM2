/**
 * ContinuaOS: Deliverables Timeline
 * 
 * Visual timeline of project deliverables and milestones
 * Phase 2B: Campaign Lab App
 */

'use client';

import { useEffect, useMemo } from 'react';
import { Project, Deliverable } from '@/lib/workspace-types';
import { format, differenceInDays, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface DeliverablesTimelineProps {
  project: Project;
  onDeliverableClick?: (deliverable: Deliverable) => void;
}

export function DeliverablesTimeline({ project, onDeliverableClick }: DeliverablesTimelineProps) {
  const timeline = useMemo(() => {
    return project.deliverables
      .slice()
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [project.deliverables]);

  const getTimelineLabel = (date: Date): string => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isThisWeek(date)) return format(date, 'EEEE');
    return format(date, 'MMM d');
  };

  const getTimelineColor = (deliverable: Deliverable): string => {
    if (deliverable.status === 'delivered' || deliverable.status === 'approved') return 'from-green-500 to-emerald-500';
    const daysUntilDue = differenceInDays(deliverable.dueDate, new Date());
    if (daysUntilDue < 0) return 'from-red-500 to-rose-500';
    if (daysUntilDue <= 3) return 'from-amber-500 to-orange-500';
    return 'from-blue-500 to-cyan-500';
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-700 p-4 shrink-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Deliverables Timeline
        </h2>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        {timeline.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No deliverables scheduled</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {timeline.map((deliverable, index) => {
              const nextDeliverable = timeline[index + 1];
              const showDateHeader =
                index === 0 || format(deliverable.dueDate, 'yyyy-MM-dd') !==
                  format(timeline[index - 1]!.dueDate, 'yyyy-MM-dd');

              return (
                <div key={deliverable.id}>
                  {showDateHeader && (
                    <div className="mb-4 sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10 py-2">
                      <div className="text-sm font-semibold text-gray-300">
                        {getTimelineLabel(deliverable.dueDate)} • {format(deliverable.dueDate, 'MMM d, yyyy')}
                      </div>
                    </div>
                  )}

                  {/* Timeline Item */}
                  <div
                    className="flex gap-4 cursor-pointer group"
                    onClick={() => onDeliverableClick?.(deliverable)}
                  >
                    {/* Timeline Line & Dot */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full bg-gradient-to-br ${getTimelineColor(deliverable)} shadow-lg transition-transform group-hover:scale-125`}
                      />
                      {nextDeliverable && format(nextDeliverable.dueDate, 'yyyy-MM-dd') !== format(deliverable.dueDate, 'yyyy-MM-dd') && (
                        <div className="w-0.5 h-8 bg-gradient-to-b from-gray-600 to-transparent my-2" />
                      )}
                    </div>

                    {/* Content */}
                    <div
                      className={`flex-1 pb-4 p-3 rounded-lg transition-colors border ${
                        deliverable.status === 'delivered' || deliverable.status === 'approved'
                          ? 'bg-green-900/20 border-green-700/50'
                          : differenceInDays(deliverable.dueDate, new Date()) < 0
                          ? 'bg-red-900/20 border-red-700/50'
                          : differenceInDays(deliverable.dueDate, new Date()) <= 3
                          ? 'bg-amber-900/20 border-amber-700/50'
                          : 'bg-gray-800/50 border-gray-700 group-hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3
                            className={`font-medium ${
                              deliverable.status === 'delivered' || deliverable.status === 'approved'
                                ? 'line-through text-gray-400'
                                : 'text-white'
                            }`}
                          >
                            {deliverable.name}
                          </h3>
                          {deliverable.description && (
                            <p className="text-sm text-gray-400 mt-1">{deliverable.description}</p>
                          )}
                        </div>

                        {deliverable.status === 'delivered' || deliverable.status === 'approved' ? (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 ml-2" />
                        ) : differenceInDays(deliverable.dueDate, new Date()) < 0 ? (
                          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 ml-2" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                        )}
                      </div>

                      {/* Meta Info */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        {deliverable.assigneeId && (
                          <span className="flex items-center gap-1">
                             Assigned
                          </span>
                        )}
                        {deliverable.status === 'approved' && (
                          <span className="flex items-center gap-1 text-green-400">
                            Approved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
