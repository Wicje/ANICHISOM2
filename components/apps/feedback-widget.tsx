'use client';

import React, { useState, useCallback } from 'react';
import { useFeedbackStore } from '@/lib/stores/feedback.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { APP_MANIFEST } from '@/lib/app-manifest';
import { cn } from '@/lib/utils';
import { MessageSquare, X, Bug, Lightbulb, MessageCircle, MousePointer2, Star, Send, Check } from 'lucide-react';
import type { FeedbackType } from '@/lib/stores/feedback.store';

const FEEDBACK_TYPES: { type: FeedbackType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: 'bug', label: 'Bug', icon: Bug },
  { type: 'feature-request', label: 'Feature', icon: Lightbulb },
  { type: 'general', label: 'General', icon: MessageCircle },
  { type: 'ux-issue', label: 'UX Issue', icon: MousePointer2 },
];

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [appId, setAppId] = useState('');

  const { submitFeedback } = useFeedbackStore();
  const { currentUser } = useAuthStore();

  const resetForm = useCallback(() => {
    setFeedbackType('general');
    setTitle('');
    setContent('');
    setRating(0);
    setAppId('');
    setSubmitted(false);
  }, []);

  const handleOpen = useCallback(() => {
    resetForm();
    setIsOpen(true);
  }, [resetForm]);

  const handleSubmit = useCallback(() => {
    if (!title.trim() || !content.trim()) return;

    const id = submitFeedback(feedbackType, title.trim(), content.trim(), rating || undefined, appId || undefined);

    // Tag with userId if available
    if (currentUser?.id) {
      const { feedback } = useFeedbackStore.getState();
      if (feedback[id]) {
        useFeedbackStore.setState({
          feedback: {
            ...feedback,
            [id]: { ...feedback[id], userId: currentUser.id },
          },
        });
      }
    }

    setSubmitted(true);
  }, [feedbackType, title, content, rating, appId, submitFeedback, currentUser]);

  const displayRating = hoveredStar || rating;

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-[9998] w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/20 transition-all shadow-lg"
        >
          <MessageSquare className="w-5 h-5 text-white/80" />
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-end p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-sm bg-[#141414] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-sm font-medium text-white/80">Send Feedback</span>
              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-white/50" />
              </button>
            </div>

            {submitted ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-white/80">Thank you!</p>
                <p className="text-xs text-white/40 mt-1">Your feedback helps us improve.</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {/* Type selector */}
                <div className="flex gap-1.5">
                  {FEEDBACK_TYPES.map((ft) => {
                    const Icon = ft.icon;
                    return (
                      <button
                        key={ft.type}
                        onClick={() => setFeedbackType(ft.type)}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors border',
                          feedbackType === ft.type
                            ? 'bg-white/10 border-white/20 text-white'
                            : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60',
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {ft.label}
                      </button>
                    );
                  })}
                </div>

                {/* Title */}
                <input
                  type="text"
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors"
                />

                {/* Content */}
                <textarea
                  placeholder="Describe your feedback..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors resize-none"
                />

                {/* Rating */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">Rating:</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(rating === star ? 0 : star)}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        className="p-0.5"
                      >
                        <Star
                          className={cn(
                            'w-4 h-4 transition-colors',
                            star <= displayRating ? 'text-amber-400 fill-amber-400' : 'text-white/15',
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* App selector */}
                <select
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 focus:outline-none focus:border-white/20 transition-colors appearance-none"
                >
                  <option value="">Select app (optional)</option>
                  {APP_MANIFEST.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.title}
                    </option>
                  ))}
                </select>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!title.trim() || !content.trim()}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                    title.trim() && content.trim()
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-white/5 text-white/25 cursor-not-allowed',
                  )}
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
