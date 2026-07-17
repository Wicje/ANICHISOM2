'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Check, Smile, Meh, Frown, Heart, Zap, BookOpen, Plus, Trash2, Mic, MicOff, Clock, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';

interface JournalEntry {
  id: string;
  content: string;
  mood: 'great' | 'good' | 'neutral' | 'bad' | 'awful';
  timestamp: number;
}

const STORAGE_KEY = 'anichisom-journal-entries';
const MOODS: { value: JournalEntry['mood']; icon: React.ComponentType<any>; color: string; label: string }[] = [
  { value: 'great', icon: Heart, color: '#10b981', label: 'Great' },
  { value: 'good', icon: Smile, color: '#3b82f6', label: 'Good' },
  { value: 'neutral', icon: Meh, color: '#6b7280', label: 'Neutral' },
  { value: 'bad', icon: Frown, color: '#f59e0b', label: 'Bad' },
  { value: 'awful', icon: Frown, color: '#ef4444', label: 'Awful' },
];

function loadEntries(): JournalEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveEntries(entries: JournalEntry[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
}

export function DigitalJournal({ window: osWindow }: { window?: any }) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [newContent, setNewContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<JournalEntry['mood']>('good');
  const [isRecording, setIsRecording] = useState(false);
  const [activeView, setActiveView] = useState<'write' | 'timeline' | 'stats'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => { setEntries(loadEntries()); }, []);

  const addEntry = useCallback(() => {
    if (!newContent.trim()) return;
    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      content: newContent.trim(),
      mood: selectedMood,
      timestamp: Date.now(),
    };
    const updated = [entry, ...entries];
    setEntries(updated);
    saveEntries(updated);
    setNewContent('');
    setSelectedMood('good');
  }, [newContent, selectedMood, entries]);

  const deleteEntry = useCallback((id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    saveEntries(updated);
  }, [entries]);

  const toggleVoiceRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'Voice Input', description: 'Speech recognition not supported in this browser', type: 'warning' } }));
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e: any) => {
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setNewContent((prev) => prev + transcript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  }, [isRecording]);

  // Mood stats
  const moodStats = MOODS.map((m) => ({
    ...m,
    count: entries.filter((e) => e.mood === m.value).length,
  }));
  const totalMoodCount = entries.length || 1;

  // Streak
  const today = startOfDay(new Date());
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const day = subDays(today, i);
    if (entries.some((e) => isSameDay(new Date(e.timestamp), day))) {
      streak++;
    } else break;
  }

  return (
    <div className="w-full h-full flex overflow-hidden" style={{ background: 'var(--os-surface)' }}>
      {/* Sidebar */}
      <div className="w-48 shrink-0 border-r flex flex-col py-4" style={{ borderColor: 'var(--os-border)', background: 'var(--os-hover)' }}>
        <div className="px-4 mb-4">
          <h2 className="text-sm font-bold" style={{ color: 'var(--os-text)' }}>Digital Journal</h2>
          <p className="text-[10px] mt-1" style={{ color: 'var(--os-text-muted)' }}>Capture your thoughts</p>
        </div>
        <nav className="flex flex-col gap-1 px-2">
          {[
            { id: 'write' as const, icon: BookOpen, label: 'Write Entry' },
            { id: 'timeline' as const, icon: Clock, label: 'Timeline' },
            { id: 'stats' as const, icon: BarChart3, label: 'Mood Stats' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left w-full",
                activeView === item.id
                  ? "font-semibold"
                  : ""
              )}
              style={{
                background: activeView === item.id ? 'var(--os-surface)' : 'transparent',
                color: activeView === item.id ? 'var(--os-text)' : 'var(--os-text-muted)',
              }}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          ))}
        </nav>
        {/* Streak */}
        <div className="mt-auto px-4 py-3 border-t" style={{ borderColor: 'var(--os-border)' }}>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: '#f59e0b' }} />
            <div>
              <div className="text-xs font-bold" style={{ color: 'var(--os-text)' }}>{streak} day streak</div>
              <div className="text-[10px]" style={{ color: 'var(--os-text-muted)' }}>{entries.length} entries total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeView === 'write' && (
          <div className="max-w-xl">
            <h1 className="text-lg font-bold mb-1" style={{ color: 'var(--os-text)' }}>New Entry</h1>
            <p className="text-xs mb-4" style={{ color: 'var(--os-text-muted)' }}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>

            {/* Mood selector */}
            <div className="flex gap-2 mb-4">
              {MOODS.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.value}
                    onClick={() => setSelectedMood(m.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-medium transition-all border",
                      selectedMood === m.value ? "scale-105" : "opacity-50 hover:opacity-80"
                    )}
                  style={{
                    background: selectedMood === m.value ? `${m.color}15` : 'transparent',
                    borderColor: selectedMood === m.value ? m.color : 'transparent',
                    color: m.color,
                    outline: selectedMood === m.value ? `1px solid ${m.color}` : undefined,
                  }}
                  >
                    <Icon className="w-5 h-5" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Textarea */}
            <div className="relative mb-4">
              <textarea
                ref={textareaRef}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full h-40 p-4 text-sm rounded-xl border outline-none resize-none transition-shadow focus:ring-2"
                style={{
                  background: 'var(--os-hover)',
                  borderColor: 'var(--os-border)',
                  color: 'var(--os-text)',
                  '--tw-ring-color': 'var(--os-primary)',
                } as React.CSSProperties}
              />
              <button
                onClick={toggleVoiceRecording}
                className={cn(
                  "absolute bottom-3 right-3 p-2 rounded-full transition-colors",
                  isRecording ? "bg-red-500 text-white animate-pulse" : ""
                )}
                style={!isRecording ? { background: 'var(--os-surface)', color: 'var(--os-text-muted)' } : undefined}
                title="Voice-to-text"
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={addEntry}
              disabled={!newContent.trim()}
              className="px-4 py-2 text-xs font-semibold rounded-lg transition-all disabled:opacity-30"
              style={{ background: 'var(--os-primary)', color: '#fff' }}
            >
              Save Entry
            </button>

            {/* Recent entries */}
            {entries.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xs font-bold mb-3" style={{ color: 'var(--os-text-muted)' }}>RECENT ENTRIES</h3>
                <div className="space-y-2">
                  {entries.slice(0, 5).map((entry) => {
                    const moodCfg = MOODS.find((m) => m.value === entry.mood);
                    return (
                      <div key={entry.id} className="p-3 rounded-xl border group" style={{ borderColor: 'var(--os-border)', background: 'var(--os-hover)' }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {moodCfg && <moodCfg.icon className="w-3 h-3" style={{ color: moodCfg.color }} />}
                              <span className="text-[10px]" style={{ color: 'var(--os-text-muted)' }}>{format(new Date(entry.timestamp), 'MMM d, h:mm a')}</span>
                            </div>
                            <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--os-text)' }}>{entry.content}</p>
                          </div>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                            style={{ color: 'var(--os-text-muted)' }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'timeline' && (
          <div className="max-w-xl">
            <h1 className="text-lg font-bold mb-4" style={{ color: 'var(--os-text)' }}>Timeline</h1>
            {entries.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--os-text-muted)' }}>No entries yet. Start writing!</p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px" style={{ background: 'var(--os-border)' }} />
                {entries.map((entry) => {
                  const moodCfg = MOODS.find((m) => m.value === entry.mood);
                  return (
                    <div key={entry.id} className="flex items-start gap-3 py-3 relative group">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-2"
                        style={{ background: moodCfg ? `${moodCfg.color}20` : 'var(--os-hover)', borderColor: 'var(--os-surface)' }}
                      >
                        {moodCfg && <moodCfg.icon className="w-3.5 h-3.5" style={{ color: moodCfg.color }} />}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[10px] font-medium" style={{ color: 'var(--os-text-muted)' }}>{format(new Date(entry.timestamp), 'MMM d, h:mm a')}</span>
                          <span className="text-[10px]" style={{ color: moodCfg?.color }}>{moodCfg?.label}</span>
                        </div>
                        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--os-text)' }}>{entry.content}</p>
                      </div>
                      <button onClick={() => deleteEntry(entry.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity" style={{ color: 'var(--os-text-muted)' }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeView === 'stats' && (
          <div className="max-w-xl">
            <h1 className="text-lg font-bold mb-4" style={{ color: 'var(--os-text)' }}>Mood Statistics</h1>
            <div className="grid grid-cols-5 gap-3 mb-8">
              {moodStats.map((m) => (
                <div key={m.value} className="flex flex-col items-center p-3 rounded-xl border" style={{ borderColor: 'var(--os-border)', background: 'var(--os-hover)' }}>
                  <m.icon className="w-6 h-6 mb-1" style={{ color: m.color }} />
                  <span className="text-lg font-bold" style={{ color: 'var(--os-text)' }}>{m.count}</span>
                  <span className="text-[10px]" style={{ color: 'var(--os-text-muted)' }}>{m.label}</span>
                  <div className="w-full h-1.5 rounded-full mt-2" style={{ background: 'var(--os-border)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${(m.count / totalMoodCount) * 100}%`, background: m.color }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--os-border)', background: 'var(--os-hover)' }}>
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5" style={{ color: '#f59e0b' }} />
                <div>
                  <div className="text-sm font-bold" style={{ color: 'var(--os-text)' }}>{streak} Day Streak</div>
                  <div className="text-xs" style={{ color: 'var(--os-text-muted)' }}>
                    {streak === 0 ? "Start writing today!" : streak < 7 ? "Keep it going!" : "You're on fire!"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DigitalJournal;
