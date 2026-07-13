import React, { useState } from 'react';
import { OSWindow } from '@/lib/os-context';
import { Pipette, Copy, Check, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ColorPickerApp({ window }: { window: OSWindow }) {
  const [color, setColor] = useState('#00f0ff');
  const [savedColors, setSavedColors] = useState<string[]>(['#00f0ff', '#ff003c', '#ccff00', '#8a2be2']);
  const [copied, setCopied] = useState<string | null>(null);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      `${parseInt(result[1]!, 16)}, ${parseInt(result[2]!, 16)}, ${parseInt(result[3]!, 16)}` : '0, 0, 0';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const saveColor = () => {
    if (!savedColors.includes(color)) {
      setSavedColors(prev => [color, ...prev].slice(0, 12));
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-neutral-950 text-white font-sans p-6 overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <Pipette className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-medium">Color Utility</h2>
          <p className="text-xs text-white/50">Pick, convert, and save colors</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Picker Section */}
        <div className="space-y-4">
          <div 
            className="w-full aspect-video rounded-xl border border-white/10 shadow-inner flex items-center justify-center transition-colors"
            style={{ backgroundColor: color }}
          >
            <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-lg text-white font-mono text-sm tracking-wider">
              {color.toUpperCase()}
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1 h-10 rounded-lg overflow-hidden border border-white/20">
              <input 
                type="color" 
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer opacity-0"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-sm font-medium">
                Click to Pick Color
              </div>
            </div>
            <button 
              onClick={saveColor}
              className="px-4 bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/10"
              title="Save to Palette"
            >
              <Palette className="w-4 h-4 text-white/80" />
            </button>
          </div>
        </div>

        {/* Formats Section */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Formats</div>
          
          <div className="group flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-lg hover:bg-white/10 transition-colors">
            <div>
              <div className="text-[10px] text-white/40 uppercase mb-1">HEX</div>
              <div className="font-mono text-sm">{color.toUpperCase()}</div>
            </div>
            <button 
              onClick={() => copyToClipboard(color.toUpperCase())}
              className="p-2 bg-white/5 hover:bg-white/20 rounded-md transition-colors"
            >
              {copied === color.toUpperCase() ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/70" />}
            </button>
          </div>

          <div className="group flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-lg hover:bg-white/10 transition-colors">
            <div>
              <div className="text-[10px] text-white/40 uppercase mb-1">RGB</div>
              <div className="font-mono text-sm">rgb({hexToRgb(color)})</div>
            </div>
            <button 
              onClick={() => copyToClipboard(`rgb(${hexToRgb(color)})`)}
              className="p-2 bg-white/5 hover:bg-white/20 rounded-md transition-colors"
            >
              {copied === `rgb(${hexToRgb(color)})` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/70" />}
            </button>
          </div>
        </div>
      </div>

      {/* Saved Palette */}
      <div className="mt-8">
        <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Saved Palette</div>
        <div className="flex flex-wrap gap-2">
          {savedColors.map((savedHex, i) => (
            <button
              key={i}
              onClick={() => setColor(savedHex)}
              className={cn(
                "w-10 h-10 rounded-full border-2 transition-transform hover:scale-110",
                color === savedHex ? "border-white" : "border-white/10"
              )}
              style={{ backgroundColor: savedHex }}
              title={savedHex}
            />
          ))}
          {savedColors.length === 0 && (
            <div className="text-sm text-white/40 italic">No saved colors yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
