'use client';

import React, { useState, useEffect } from 'react';
import {
  Volume2, VolumeX, Eye, ZoomIn, Contrast, Sparkles, X, Sliders,
  HelpCircle, Check, Speech
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { audioSystem } from '@/lib/services/audio-engine';

interface AccessibilityProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccessibilityOverlay({ isOpen, onClose }: AccessibilityProps) {
  const [voiceOverEnabled, setVoiceOverEnabled] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [grayscale, setGrayscale] = useState(false);
  const [invertColors, setInvertColors] = useState(false);
  const [textScale, setTextScale] = useState(100);
  const [speechRate, setSpeechRate] = useState(1);

  // VoiceOver Announcement helper
  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (voiceOverEnabled) {
      speak('VoiceOver activated. ContinuaOS accessibility engine ready.');
    }
  }, [voiceOverEnabled]);

  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) root.classList.add('os-high-contrast');
    else root.classList.remove('os-high-contrast');

    if (grayscale) root.classList.add('os-grayscale');
    else root.classList.remove('os-grayscale');

    if (invertColors) root.classList.add('os-inverted');
    else root.classList.remove('os-inverted');
  }, [highContrast, grayscale, invertColors]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-6 select-none font-sans">
      <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 sm:p-8 max-w-xl w-full flex flex-col gap-6 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Accessibility & VoiceOver</h2>
              <p className="text-xs text-slate-400">Vision, hearing, and spoken feedback controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* VoiceOver Switch */}
        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Speech className="w-6 h-6 text-cyan-400" />
            <div>
              <h3 className="font-bold text-sm text-white">VoiceOver Screen Reader</h3>
              <p className="text-xs text-slate-400">Audibly speaks UI elements, notifications, and active apps</p>
            </div>
          </div>
          <button
            onClick={() => {
              setVoiceOverEnabled(!voiceOverEnabled);
              audioSystem.playClick();
            }}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
              voiceOverEnabled ? "bg-[#10F4A0] text-slate-950 shadow-md shadow-[#10F4A0]/20" : "bg-white/10 text-slate-300 hover:bg-white/20"
            )}
          >
            {voiceOverEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Vision Shaders Bento */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setHighContrast(!highContrast)}
            className={cn(
              "p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all",
              highContrast ? "bg-cyan-500/20 border-cyan-400 text-cyan-300" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
            )}
          >
            <Contrast className="w-5 h-5" />
            <span className="text-xs font-semibold">High Contrast</span>
          </button>

          <button
            onClick={() => setGrayscale(!grayscale)}
            className={cn(
              "p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all",
              grayscale ? "bg-purple-500/20 border-purple-400 text-purple-300" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
            )}
          >
            <Eye className="w-5 h-5" />
            <span className="text-xs font-semibold">Grayscale</span>
          </button>

          <button
            onClick={() => setInvertColors(!invertColors)}
            className={cn(
              "p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all",
              invertColors ? "bg-amber-500/20 border-amber-400 text-amber-300" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
            )}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-xs font-semibold">Invert Colors</span>
          </button>
        </div>

        {/* Text Scaling Slider */}
        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Display Zoom & Font Scale</span>
            <span className="font-mono text-cyan-400 font-bold">{textScale}%</span>
          </div>
          <input
            type="range"
            min="100"
            max="150"
            step="5"
            value={textScale}
            onChange={(e) => {
              const val = Number(e.target.value);
              setTextScale(val);
              document.documentElement.style.fontSize = `${(val / 100) * 16}px`;
            }}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Footer Close */}
        <div className="flex justify-end pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-white text-slate-950 font-bold text-xs hover:bg-slate-200 transition-all shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default AccessibilityOverlay;
