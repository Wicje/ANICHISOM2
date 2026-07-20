'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Eye, Palette, Layout, Mail, Megaphone, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BoardNode, BoardGroup, BoardTag, Connection, Comment } from '@/components/apps/moodboard/types';
import { readDomain } from '@/lib/context-layer';
import type { OSWindow } from '@/lib/os-context';

interface AssetPreviewProps {
  nodes: BoardNode[];
  groups: BoardGroup[];
  tags: BoardTag[];
  connections: Connection[];
  comments: Comment[];
  camera: { x: number; y: number; z: number };
  setCamera: React.Dispatch<React.SetStateAction<{ x: number; y: number; z: number }>>;
  updateNodePosition: (id: string, x: number, y: number) => void;
  updateNodeContent: (id: string, content: string) => void;
  updateNodeSize: (id: string, w: number, h: number) => void;
  deleteNode: (id: string) => void;
  addText: () => void;
  processUrl: (url: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  addNodeReaction: (nodeId: string, emoji: string) => void;
  addNodeComment: (nodeId: string, text: string) => void;
  setNodeLabel: (nodeId: string, label: string) => void;
  setNodeBackground: (nodeId: string, color: string) => void;
  toggleNodeLock: (nodeId: string) => void;
  addNodeTag: (nodeId: string, tagId: string) => void;
  removeNodeTag: (nodeId: string, tagId: string) => void;
  setNodeGroup: (nodeId: string, groupId: string) => void;
  removeNodeGroup: (nodeId: string) => void;
  projectId: string;
  osWindow: OSWindow;
  _updateYNode: (vals: Partial<BoardNode> & { id: string }) => void;
}

type Template = 'product' | 'social' | 'email' | 'ad';

const TEMPLATES: { id: Template; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'product', label: 'Product Page', icon: Eye },
  { id: 'social', label: 'Social Post', icon: Layout },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'ad', label: 'Ad Creative', icon: Megaphone },
];

export function AssetPreview(props: AssetPreviewProps) {
  const { nodes, projectId } = props;
  const [activeTemplate, setActiveTemplate] = useState<Template>('product');
  const [brandColors, setBrandColors] = useState({ primary: '#060608', accent: '#10F4A0', bg: '#f5f5f5' });
  const [editingField, setEditingField] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    readDomain<any>('brand').then(data => {
      if (data && data.colors) {
        setBrandColors({
          primary: data.colors.primary || '#060608',
          accent: data.colors.accent || '#10F4A0',
          bg: data.colors.background || '#f5f5f5'
        });
      }
    });
  }, []);

  const handleExport = async () => {
    if (!exportRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(exportRef.current, { useCORS: true, backgroundColor: null });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `asset-preview-${activeTemplate}.png`;
      a.click();
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  const textNodes = nodes.filter(n => n.type === 'text');
  const imageNodes = nodes.filter(n => n.type === 'image' || n.type === 'video');
  const firstImage = imageNodes[0];
  const title = textNodes[0]?.content || 'Campaign Asset';
  const features = textNodes.slice(1).map(n => n.content || '');

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Template picker */}
      <div className="flex items-center gap-2 px-4 py-2 shrink-0 border-b border-black/5">
        <Eye className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Asset Preview</span>
        <div className="ml-auto flex items-center bg-gray-200/60 rounded-lg p-0.5">
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => setActiveTemplate(t.id)}
              className={cn("px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors flex items-center gap-1",
                activeTemplate === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              <t.icon className="w-3 h-3" />
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={handleExport} className="ml-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </div>

      {/* Preview area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview canvas */}
        <div className="flex-1 flex items-center justify-center p-8 bg-gray-100 overflow-auto">
          <div ref={exportRef} className="bg-white rounded-xl shadow-2xl overflow-hidden" style={{ maxWidth: activeTemplate === 'social' ? 400 : activeTemplate === 'ad' ? 500 : 800 }}>
            {activeTemplate === 'product' && (
              <div className="flex flex-col md:flex-row">
                {/* Product image */}
                <div className="flex-1 flex items-center justify-center p-8 min-h-[300px]"
                  style={{ background: brandColors.bg }}>
                  {firstImage?.content ? (
                    <img src={firstImage.content} alt="" className="max-w-full max-h-[300px] object-contain" />
                  ) : (
                    <div className="w-48 h-48 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400 text-sm">Add image</span>
                    </div>
                  )}
                </div>
                {/* Product info */}
                <div className="w-80 p-8">
                  <h1 className="text-xl font-bold mb-4" style={{ color: brandColors.primary }}>{title}</h1>
                  {features.length > 0 ? (
                    <ul className="space-y-2 mb-6">
                      {features.map((f, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                          <span style={{ color: brandColors.accent }}>●</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400 mb-6">Add text nodes to populate features</p>
                  )}
                  <button className="w-full py-3 rounded-lg text-sm font-bold text-white transition-colors"
                    style={{ background: brandColors.accent }}>
                    Call to Action
                  </button>
                </div>
              </div>
            )}

            {activeTemplate === 'social' && (
              <div className="w-[400px]">
                {firstImage?.content ? (
                  <img src={firstImage.content} alt="" className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400">Add image</span>
                  </div>
                )}
                <div className="p-4">
                  <h2 className="text-sm font-bold mb-1">{title}</h2>
                  {features.length > 0 && <p className="text-xs text-gray-500">{features[0]}</p>}
                </div>
              </div>
            )}

            {activeTemplate === 'email' && (
              <div className="w-[500px]">
                <div className="p-8 text-center" style={{ background: brandColors.primary }}>
                  <h1 className="text-lg font-bold text-white">{title}</h1>
                </div>
                <div className="p-8">
                  {features.map((f, i) => (
                    <p key={i} className="text-sm text-gray-600 mb-4">{f}</p>
                  ))}
                  {features.length === 0 && <p className="text-sm text-gray-400">Add text nodes for email content</p>}
                  <button className="mt-4 px-6 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: brandColors.accent }}>
                    Get Started
                  </button>
                </div>
              </div>
            )}

            {activeTemplate === 'ad' && (
              <div className="w-[500px] relative">
                {firstImage?.content ? (
                  <img src={firstImage.content} alt="" className="w-full aspect-[4/3] object-cover" />
                ) : (
                  <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400">Add creative</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                  <h2 className="text-lg font-bold text-white mb-1">{title}</h2>
                  {features[0] && <p className="text-xs text-white/70">{features[0]}</p>}
                  <button className="mt-3 px-4 py-2 rounded text-xs font-bold text-black" style={{ background: brandColors.accent }}>
                    Learn More
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Style panel */}
        <div className="w-56 shrink-0 border-l border-black/5 bg-white p-4 overflow-y-auto">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Brand Kit</h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={brandColors.primary} onChange={(e) => setBrandColors(p => ({ ...p, primary: e.target.value }))}
                  className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
                <span className="text-[10px] text-gray-500 font-mono">{brandColors.primary}</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Accent Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={brandColors.accent} onChange={(e) => setBrandColors(p => ({ ...p, accent: e.target.value }))}
                  className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
                <span className="text-[10px] text-gray-500 font-mono">{brandColors.accent}</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Background</label>
              <div className="flex items-center gap-2">
                <input type="color" value={brandColors.bg} onChange={(e) => setBrandColors(p => ({ ...p, bg: e.target.value }))}
                  className="w-6 h-6 rounded border border-gray-200 cursor-pointer" />
                <span className="text-[10px] text-gray-500 font-mono">{brandColors.bg}</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Content</h3>
            <div className="space-y-2">
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-[10px] text-gray-400 mb-1">Title</div>
                <div className="text-xs text-gray-700 truncate">{title}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-[10px] text-gray-400 mb-1">Images</div>
                <div className="text-xs text-gray-700">{imageNodes.length} image(s)</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-[10px] text-gray-400 mb-1">Text Blocks</div>
                <div className="text-xs text-gray-700">{textNodes.length} block(s)</div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Presets</h3>
            <div className="space-y-1.5">
              {[
                { label: 'Dark Mode', primary: '#ffffff', accent: '#10F4A0', bg: '#060608' },
                { label: 'Light Mode', primary: '#060608', accent: '#10F4A0', bg: '#f5f5f5' },
                { label: 'Warm', primary: '#333333', accent: '#f59e0b', bg: '#fef3c7' },
                { label: 'Cool', primary: '#1e293b', accent: '#3b82f6', bg: '#f1f5f9' },
              ].map(preset => (
                <button key={preset.label} onClick={() => setBrandColors(preset)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex gap-0.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: preset.primary }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: preset.accent }} />
                  </div>
                  <span className="text-[10px] text-gray-600">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
