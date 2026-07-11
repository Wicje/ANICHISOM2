'use client';

import React, { useState, useEffect, useRef } from 'react';
import { OSWindow } from '@/lib/os-context';
import {
  Palette, Type, Megaphone, Image, FileText, Plus, Trash2, Download,
  ChevronRight, X, Check, GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrandStore, BrandColor, BrandLogo, BrandUsageRule } from '@/lib/stores/brand.store';

type Section = 'colors' | 'typography' | 'voice' | 'logos' | 'rules';

const SECTIONS: { id: Section; label: string; icon: typeof Palette }[] = [
  { id: 'colors', label: 'Colors', icon: Palette },
  { id: 'typography', label: 'Typography', icon: Type },
  { id: 'voice', label: 'Voice & Tone', icon: Megaphone },
  { id: 'logos', label: 'Logos', icon: Image },
  { id: 'rules', label: 'Usage Rules', icon: FileText },
];

const COLOR_ROLES: BrandColor['role'][] = ['primary', 'secondary', 'accent', 'neutral', 'background'];
const RULE_CATEGORIES: BrandUsageRule['category'][] = ['spacing', 'color', 'typography', 'logo', 'tone', 'general'];

export function BrandGuides({ window: osWindow }: { window: OSWindow }) {
  const [activeSection, setActiveSection] = useState<Section>('colors');
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [newBrandName, setNewBrandName] = useState('');
  const [showNewBrand, setShowNewBrand] = useState(false);

  const store = useBrandStore();
  const { brands, createBrand, setActiveBrand, getActiveBrand, deleteBrand } = store;
  const brandList = Object.values(brands);
  const activeBrand = activeBrandId ? brands[activeBrandId] : null;

  useEffect(() => {
    store.hydrate();
  }, []);

  useEffect(() => {
    if (!activeBrandId && brandList.length > 0) {
      setActiveBrandId(brandList[0].id);
    }
  }, [brandList, activeBrandId, setActiveBrand]);

  const handleCreateBrand = () => {
    if (!newBrandName.trim()) return;
    const id = createBrand(newBrandName.trim());
    setActiveBrandId(id);
    setNewBrandName('');
    setShowNewBrand(false);
  };

  const handleExport = () => {
    if (!activeBrand) return;
    const blob = new Blob([JSON.stringify(activeBrand, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeBrand.brandName}-brand-guide.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-full flex bg-[#0a0a0a] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-56 border-r border-white/10 flex flex-col shrink-0 bg-[#111]">
        <div className="p-3 border-b border-white/10">
          <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Brand</div>
          <select
            value={activeBrandId || ''}
            onChange={(e) => setActiveBrandId(e.target.value || null)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="">Select brand...</option>
            {brandList.map((b) => (
              <option key={b.id} value={b.id}>{b.brandName}</option>
            ))}
          </select>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setShowNewBrand(true)}
              className="flex-1 px-2 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] font-bold rounded transition-colors border border-white/10"
            >
              <Plus className="w-3 h-3 inline mr-1" /> New
            </button>
            {activeBrand && (
              <button
                onClick={() => { deleteBrand(activeBrand.id); setActiveBrandId(null); }}
                className="px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold rounded transition-colors border border-red-500/20"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {showNewBrand && (
          <div className="p-3 border-b border-white/10 bg-white/5">
            <input
              autoFocus
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBrand()}
              placeholder="Brand name..."
              className="w-full bg-black/50 border border-white/10 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-400"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={handleCreateBrand} className="flex-1 px-2 py-1 bg-blue-500 hover:bg-blue-400 text-[10px] font-bold rounded">Create</button>
              <button onClick={() => setShowNewBrand(false)} className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[10px] font-bold rounded">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-colors",
                activeSection === sec.id ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80 hover:bg-white/5",
              )}
            >
              <sec.icon className="w-3.5 h-3.5" />
              {sec.label}
              <ChevronRight className="w-3 h-3 ml-auto opacity-50" />
            </button>
          ))}
        </div>

        {activeBrand && (
          <div className="p-3 border-t border-white/10">
            <button
              onClick={handleExport}
              className="w-full px-3 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 border border-white/10"
            >
              <Download className="w-3 h-3" /> Export Brand Guide
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!activeBrand ? (
          <div className="flex flex-col items-center justify-center h-full text-white/30">
            <Palette className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-sm mb-2">No brand selected</p>
            <p className="text-xs">Create a new brand to get started with your brand guidelines.</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-xl font-bold mb-1">{activeBrand.brandName}</h1>
            <p className="text-xs text-white/40 mb-8">Brand Guidelines</p>

            {/* Colors Section */}
            {activeSection === 'colors' && (
              <ColorsSection brandId={activeBrand.id} colors={activeBrand.colors} store={store} />
            )}

            {/* Typography Section */}
            {activeSection === 'typography' && (
              <TypographySection brandId={activeBrand.id} typography={activeBrand.typography} store={store} />
            )}

            {/* Voice Section */}
            {activeSection === 'voice' && (
              <VoiceSection brandId={activeBrand.id} voice={activeBrand.voice} store={store} />
            )}

            {/* Logos Section */}
            {activeSection === 'logos' && (
              <LogosSection brandId={activeBrand.id} logos={activeBrand.logos} store={store} />
            )}

            {/* Rules Section */}
            {activeSection === 'rules' && (
              <RulesSection brandId={activeBrand.id} rules={activeBrand.usageRules} store={store} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Colors Section ───────────────────────────────────────────────────

function ColorsSection({ brandId, colors, store }: { brandId: string; colors: BrandColor[]; store: ReturnType<typeof useBrandStore.getState> }) {
  const [newColor, setNewColor] = useState({ hex: '#3B82F6', name: '', role: 'primary' as BrandColor['role'] });

  const handleAdd = () => {
    if (!newColor.name.trim()) return;
    store.addColor(brandId, newColor);
    setNewColor({ hex: '#3B82F6', name: '', role: 'primary' });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-bold flex items-center gap-2"><Palette className="w-4 h-4 text-purple-400" /> Color Palette</h2>

      <div className="grid grid-cols-2 gap-3">
        {colors.map((color) => (
          <div key={color.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg shrink-0 border border-white/10" style={{ backgroundColor: color.hex }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate">{color.name}</div>
              <div className="text-[10px] text-white/40 font-mono">{color.hex}</div>
              <div className="text-[10px] text-white/30 mt-0.5">{color.role}</div>
            </div>
            <button onClick={() => store.removeColor(brandId, color.id)} className="text-white/20 hover:text-red-400 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
        <div className="text-xs font-bold text-white/60">Add Color</div>
        <div className="flex gap-2">
          <input type="color" value={newColor.hex} onChange={(e) => setNewColor((c) => ({ ...c, hex: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border-0" />
          <input
            value={newColor.name}
            onChange={(e) => setNewColor((c) => ({ ...c, name: e.target.value }))}
            placeholder="Color name..."
            className="flex-1 bg-black/50 border border-white/10 rounded px-3 py-2 text-xs outline-none focus:border-blue-400"
          />
          <select
            value={newColor.role}
            onChange={(e) => setNewColor((c) => ({ ...c, role: e.target.value as BrandColor['role'] }))}
            className="bg-black/50 border border-white/10 rounded px-2 py-2 text-xs outline-none"
          >
            {COLOR_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={handleAdd} className="px-3 py-2 bg-blue-500 hover:bg-blue-400 text-xs font-bold rounded transition-colors">
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Typography Section ───────────────────────────────────────────────

function TypographySection({ brandId, typography, store }: { brandId: string; typography: ReturnType<typeof useBrandStore.getState> extends { brands: Record<string, { typography: infer T }> } ? T : never; store: ReturnType<typeof useBrandStore.getState> }) {
  const fonts = ['Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Playfair Display', 'Merriweather', 'Source Code Pro', 'Lora', 'Poppins', 'Raleway'];

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-bold flex items-center gap-2"><Type className="w-4 h-4 text-blue-400" /> Typography</h2>

      <div className="space-y-4">
        {[
          { key: 'headingFont' as const, label: 'Heading Font', weight: 'headingWeight' as const },
          { key: 'bodyFont' as const, label: 'Body Font', weight: 'bodyWeight' as const },
          { key: 'accentFont' as const, label: 'Accent Font', weight: null },
        ].map(({ key, label, weight }) => (
          <div key={key} className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="text-xs font-bold text-white/60 mb-2">{label}</div>
            <div className="flex gap-2">
              <select
                value={typography[key]}
                onChange={(e) => store.updateTypography(brandId, { [key]: e.target.value })}
                className="flex-1 bg-black/50 border border-white/10 rounded px-3 py-2 text-xs outline-none"
              >
                {fonts.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              {weight && (
                <select
                  value={typography[weight]}
                  onChange={(e) => store.updateTypography(brandId, { [weight]: e.target.value })}
                  className="w-24 bg-black/50 border border-white/10 rounded px-2 py-2 text-xs outline-none"
                >
                  {['300', '400', '500', '600', '700', '800', '900'].map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="mt-3 text-lg" style={{ fontFamily: typography[key], fontWeight: weight ? typography[weight] : undefined }}>
              The quick brown fox jumps over the lazy dog
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Voice Section ───────────────────────────────────────────────────

function VoiceSection({ brandId, voice, store }: { brandId: string; voice: { tone: string; personality: string[]; dos: string[]; donts: string[] }; store: ReturnType<typeof useBrandStore.getState> }) {
  const [newPersonality, setNewPersonality] = useState('');
  const [newDo, setNewDo] = useState('');
  const [newDont, setNewDont] = useState('');

  const addToList = (field: 'personality' | 'dos' | 'donts', value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    store.updateVoice(brandId, { [field]: [...voice[field], value.trim()] });
    setter('');
  };

  const removeFromList = (field: 'personality' | 'dos' | 'donts', index: number) => {
    store.updateVoice(brandId, { [field]: voice[field].filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-bold flex items-center gap-2"><Megaphone className="w-4 h-4 text-emerald-400" /> Voice & Tone</h2>

      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="text-xs font-bold text-white/60 mb-2">Brand Tone</div>
        <input
          value={voice.tone}
          onChange={(e) => store.updateVoice(brandId, { tone: e.target.value })}
          placeholder="e.g., Professional, Friendly, Bold..."
          className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-xs outline-none focus:border-blue-400"
        />
      </div>

      {([
        { key: 'personality' as const, label: 'Personality Traits', value: newPersonality, setter: setNewPersonality, color: 'blue' },
        { key: 'dos' as const, label: 'Do\'s', value: newDo, setter: setNewDo, color: 'emerald' },
        { key: 'donts' as const, label: 'Don\'ts', value: newDont, setter: setNewDont, color: 'red' },
      ]).map(({ key, label, value, setter, color }) => (
        <div key={key} className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="text-xs font-bold text-white/60 mb-2">{label}</div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {voice[key].map((item, i) => (
              <span key={i} className={cn(
                "px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1",
                color === 'emerald' ? "bg-emerald-500/20 text-emerald-400" :
                color === 'red' ? "bg-red-500/20 text-red-400" :
                "bg-blue-500/20 text-blue-400",
              )}>
                {item}
                <button onClick={() => removeFromList(key, i)} className="hover:text-white"><X className="w-2.5 h-2.5" /></button>
              </span>
            ))}
            {voice[key].length === 0 && <span className="text-[10px] text-white/20">None yet</span>}
          </div>
          <div className="flex gap-2">
            <input
              value={value}
              onChange={(e) => setter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addToList(key, value, setter)}
              placeholder={`Add ${label.toLowerCase().slice(0, -1)}...`}
              className="flex-1 bg-black/50 border border-white/10 rounded px-3 py-1.5 text-xs outline-none focus:border-blue-400"
            />
            <button onClick={() => addToList(key, value, setter)} className="px-2 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs">
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Logos Section ───────────────────────────────────────────────────

function LogosSection({ brandId, logos, store }: { brandId: string; logos: BrandLogo[]; store: ReturnType<typeof useBrandStore.getState> }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newLogoName, setNewLogoName] = useState('');
  const [newLogoVariant, setNewLogoVariant] = useState<BrandLogo['variant']>('primary');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !newLogoName.trim()) return;
    const reader = new FileReader();
    reader.onload = () => {
      store.addLogo(brandId, {
        name: newLogoName.trim(),
        variant: newLogoVariant,
        dataUrl: reader.result as string,
      });
      setNewLogoName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-bold flex items-center gap-2"><Image className="w-4 h-4 text-yellow-400" /> Logo Library</h2>

      <div className="grid grid-cols-2 gap-3">
        {logos.map((logo) => (
          <div key={logo.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo.dataUrl} alt={logo.name} className="w-full h-24 object-contain rounded bg-white/5 mb-2" />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold">{logo.name}</div>
                <div className="text-[10px] text-white/40">{logo.variant}</div>
              </div>
              <button onClick={() => store.removeLogo(brandId, logo.id)} className="text-white/20 hover:text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
        <div className="text-xs font-bold text-white/60">Upload Logo</div>
        <div className="flex gap-2">
          <input
            value={newLogoName}
            onChange={(e) => setNewLogoName(e.target.value)}
            placeholder="Logo name..."
            className="flex-1 bg-black/50 border border-white/10 rounded px-3 py-2 text-xs outline-none focus:border-blue-400"
          />
          <select
            value={newLogoVariant}
            onChange={(e) => setNewLogoVariant(e.target.value as BrandLogo['variant'])}
            className="bg-black/50 border border-white/10 rounded px-2 py-2 text-xs outline-none"
          >
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="favicon">Favicon</option>
            <option value="icon">Icon</option>
          </select>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="text-xs text-white/40 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30"
        />
      </div>
    </div>
  );
}

// ─── Rules Section ───────────────────────────────────────────────────

function RulesSection({ brandId, rules, store }: { brandId: string; rules: BrandUsageRule[]; store: ReturnType<typeof useBrandStore.getState> }) {
  const [newCategory, setNewCategory] = useState<BrandUsageRule['category']>('general');
  const [newRule, setNewRule] = useState('');

  const handleAdd = () => {
    if (!newRule.trim()) return;
    store.addUsageRule(brandId, { category: newCategory, rule: newRule.trim() });
    setNewRule('');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-orange-400" /> Usage Rules</h2>

      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-start gap-3">
            <span className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] font-bold uppercase tracking-wider text-white/50 shrink-0 mt-0.5">
              {rule.category}
            </span>
            <span className="text-xs text-white/80 flex-1">{rule.rule}</span>
            <button onClick={() => store.removeUsageRule(brandId, rule.id)} className="text-white/20 hover:text-red-400 transition-colors shrink-0">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {rules.length === 0 && <p className="text-xs text-white/30">No usage rules defined yet.</p>}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
        <div className="text-xs font-bold text-white/60">Add Rule</div>
        <div className="flex gap-2">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as BrandUsageRule['category'])}
            className="bg-black/50 border border-white/10 rounded px-2 py-2 text-xs outline-none"
          >
            {RULE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Describe the usage rule..."
            className="flex-1 bg-black/50 border border-white/10 rounded px-3 py-2 text-xs outline-none focus:border-blue-400"
          />
          <button onClick={handleAdd} className="px-3 py-2 bg-blue-500 hover:bg-blue-400 text-xs font-bold rounded transition-colors">
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
