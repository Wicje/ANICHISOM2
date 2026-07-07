import React, { useState, useEffect } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { FS } from '@/lib/fs';
import { Settings, FileJson, Keyboard, Save, Plus, Trash2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DEFAULT_CONFIG = {
  keybinds: {
    'alt+t': 'open:terminal',
    'alt+f': 'open:files',
    'alt+b': 'open:browser',
    'alt+c': 'open:code',
    'ctrl+space': 'action:launchpad',
  },
  behavior: {
    animations: true,
    windowSnapping: true,
  }
};

const CONFIG_PATH = '.config/anichisom.json';

export function ConfigManagerApp({ window: osWindow }: { window: OSWindow }) {
  const { notify } = useOS();
  const [config, setConfig] = useState<typeof DEFAULT_CONFIG>(DEFAULT_CONFIG);
  const [rawJson, setRawJson] = useState('');
  const [mode, setMode] = useState<'ui' | 'json'>('ui');
  const [loading, setLoading] = useState(true);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const file = await FS.read(CONFIG_PATH);
      if (file && file.content) {
        const parsed = JSON.parse(file.content);
        setConfig(parsed);
        setRawJson(JSON.stringify(parsed, null, 2));
      } else {
        // Create default
        await FS.write(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
        setConfig(DEFAULT_CONFIG);
        setRawJson(JSON.stringify(DEFAULT_CONFIG, null, 2));
      }
    } catch (err) {
      console.error('Failed to load config', err);
      setRawJson(JSON.stringify(DEFAULT_CONFIG, null, 2));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const saveConfig = async () => {
    try {
      let dataToSave = config;
      if (mode === 'json') {
        dataToSave = JSON.parse(rawJson);
        setConfig(dataToSave);
      }
      await FS.write(CONFIG_PATH, JSON.stringify(dataToSave, null, 2));
      notify('Config Saved', { body: 'Your OS configurations have been updated.' });
      
      // Dispatch event to trigger global re-bind
      window.dispatchEvent(new CustomEvent('os:config-updated', { detail: dataToSave }));
    } catch (err: any) {
      notify('Config Error', { body: err.message || 'Failed to save config.' });
    }
  };

  const updateKeybind = (oldKey: string, newKey: string, action: string) => {
    setConfig(prev => {
      const updated = { ...prev };
      if (oldKey !== newKey) {
        delete updated.keybinds[oldKey as keyof typeof updated.keybinds];
      }
      updated.keybinds[newKey as keyof typeof updated.keybinds] = action;
      setRawJson(JSON.stringify(updated, null, 2));
      return updated;
    });
  };

  const removeKeybind = (key: string) => {
    setConfig(prev => {
      const updated = { ...prev };
      delete updated.keybinds[key as keyof typeof updated.keybinds];
      setRawJson(JSON.stringify(updated, null, 2));
      return updated;
    });
  };

  const addKeybind = () => {
    setConfig(prev => {
      const updated = { ...prev };
      updated.keybinds['new+key' as keyof typeof updated.keybinds] = 'open:app';
      setRawJson(JSON.stringify(updated, null, 2));
      return updated;
    });
  };

  return (
    <div className="flex flex-col w-full h-full bg-neutral-950 text-white font-sans overflow-hidden">
      
      {/* Toolbar */}
      <div className="h-14 border-b border-white/10 bg-white/5 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-rose-400" />
            <span className="font-medium text-sm">OS Config Engine</span>
          </div>
          
          <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
            <button 
              onClick={() => setMode('ui')}
              className={cn("px-3 py-1 text-xs font-medium rounded-md transition-colors", mode === 'ui' ? "bg-white/20 text-white" : "text-white/50 hover:text-white")}
            >
              Keybinds UI
            </button>
            <button 
              onClick={() => setMode('json')}
              className={cn("px-3 py-1 text-xs font-medium rounded-md transition-colors", mode === 'json' ? "bg-white/20 text-white" : "text-white/50 hover:text-white")}
            >
              Raw JSON
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={loadConfig}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors border border-white/10"
            title="Reload from Disk"
          >
            <RefreshCw className="w-4 h-4 text-white/70" />
          </button>
          <button 
            onClick={saveConfig}
            className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            Save & Apply
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-white/50">Loading config...</div>
        ) : mode === 'json' ? (
          <textarea 
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            className="w-full h-full bg-transparent text-emerald-400 font-mono text-sm p-6 outline-none resize-none leading-relaxed"
            spellCheck={false}
          />
        ) : (
          <div className="max-w-3xl mx-auto p-8 space-y-8 animate-in fade-in">
            
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-white/70" />
                  <h2 className="text-lg font-medium">Global Keybinds</h2>
                </div>
                <button onClick={addKeybind} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-md transition-colors flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              
              <div className="space-y-2">
                {Object.entries(config.keybinds || {}).map(([keyCombo, action]) => (
                  <div key={keyCombo} className="flex items-center gap-4 bg-white/5 border border-white/10 p-3 rounded-xl">
                    <input 
                      type="text" 
                      value={keyCombo}
                      onChange={(e) => updateKeybind(keyCombo, e.target.value, action)}
                      className="bg-black border border-white/20 rounded px-3 py-1.5 text-sm font-mono w-40 outline-none focus:border-rose-400 transition-colors text-white"
                      placeholder="e.g. alt+t"
                    />
                    <span className="text-white/30 text-xl font-light">→</span>
                    <input 
                      type="text" 
                      value={action}
                      onChange={(e) => updateKeybind(keyCombo, keyCombo, e.target.value)}
                      className="bg-black border border-white/20 rounded px-3 py-1.5 text-sm font-mono flex-1 outline-none focus:border-rose-400 transition-colors text-emerald-400"
                      placeholder="e.g. open:terminal"
                    />
                    <button 
                      onClick={() => removeKeybind(keyCombo)}
                      className="p-2 hover:bg-red-500/20 hover:text-red-400 text-white/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                <FileJson className="w-5 h-5 text-white/70" />
                <h2 className="text-lg font-medium">System Behavior</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">Window Animations</div>
                      <div className="text-xs text-white/50">Enable smooth scaling & fading</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={config.behavior?.animations ?? true}
                      onChange={(e) => {
                        const next = { ...config };
                        if (!next.behavior) next.behavior = { animations: true, windowSnapping: true };
                        next.behavior.animations = e.target.checked;
                        setConfig(next);
                        setRawJson(JSON.stringify(next, null, 2));
                      }}
                      className="w-5 h-5 accent-rose-500"
                    />
                 </div>
                 <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">Window Snapping</div>
                      <div className="text-xs text-white/50">Snap to edges of screen</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={config.behavior?.windowSnapping ?? true}
                      onChange={(e) => {
                        const next = { ...config };
                        if (!next.behavior) next.behavior = { animations: true, windowSnapping: true };
                        next.behavior.windowSnapping = e.target.checked;
                        setConfig(next);
                        setRawJson(JSON.stringify(next, null, 2));
                      }}
                      className="w-5 h-5 accent-rose-500"
                    />
                 </div>
              </div>
            </section>

          </div>
        )}
      </div>

    </div>
  );
}
