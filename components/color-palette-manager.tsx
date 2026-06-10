/**
 * ANICHISOM OS: Color Palette Manager
 * 
 * Manage and share design color palettes across projects
 * Phase 3A: Moodboard Mill
 */

'use client';

import { useState, useEffect } from 'react';
import { useOS } from '@/lib/os-context';
import {
  Plus, Trash2, Copy, Download, Share2, Eye, Palette,
  RefreshCw, Lock, Unlock, Check, X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Color {
  id: string;
  name: string;
  hex: string;
  rgb: string;
  usage?: string;
}

interface ColorPalette {
  id: string;
  name: string;
  description: string;
  colors: Color[];
  isPublic: boolean;
  createdAt: Date;
  createdBy: string;
  tags: string[];
}

export function ColorPaletteManager() {
  const { currentUser, workspaceId, emitEvent } = useOS();
  const [palettes, setPalettes] = useState<ColorPalette[]>([]);
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showColorForm, setShowColorForm] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [newColor, setNewColor] = useState({ name: '', hex: '#000000' });

  // Initialize with sample palettes
  useEffect(() => {
    const samplePalettes: ColorPalette[] = [
      {
        id: 'pal-1',
        name: 'Brutalist Monochrome',
        description: 'Black, white, and shades of gray for minimalist designs',
        colors: [
          { id: '1', name: 'Pure Black', hex: '#000000', rgb: 'rgb(0, 0, 0)' },
          { id: '2', name: 'Dark Gray', hex: '#1F2937', rgb: 'rgb(31, 41, 55)' },
          { id: '3', name: 'Medium Gray', hex: '#6B7280', rgb: 'rgb(107, 114, 128)' },
          { id: '4', name: 'Light Gray', hex: '#E5E7EB', rgb: 'rgb(229, 231, 235)' },
          { id: '5', name: 'Pure White', hex: '#FFFFFF', rgb: 'rgb(255, 255, 255)' },
        ],
        isPublic: false,
        createdAt: new Date(),
        createdBy: currentUser?.id || '',
        tags: ['minimalist', 'monochrome'],
      },
      {
        id: 'pal-2',
        name: 'Vibrant Tech',
        description: 'Bold and modern colors for tech products',
        colors: [
          { id: '1', name: 'Electric Blue', hex: '#0066FF', rgb: 'rgb(0, 102, 255)' },
          { id: '2', name: 'Neon Pink', hex: '#FF0080', rgb: 'rgb(255, 0, 128)' },
          { id: '3', name: 'Cyan', hex: '#00D9FF', rgb: 'rgb(0, 217, 255)' },
          { id: '4', name: 'Dark Background', hex: '#0F0F23', rgb: 'rgb(15, 15, 35)' },
          { id: '5', name: 'White Accent', hex: '#FFFFFF', rgb: 'rgb(255, 255, 255)' },
        ],
        isPublic: true,
        createdAt: new Date(),
        createdBy: currentUser?.id || '',
        tags: ['tech', 'modern', 'bold'],
      },
    ];
    setPalettes(samplePalettes);
    setSelectedPalette(samplePalettes[0]);
  }, [currentUser]);

  const handleCreatePalette = () => {
    if (!formData.name.trim()) return;

    const newPalette: ColorPalette = {
      id: crypto.randomUUID(),
      name: formData.name,
      description: formData.description,
      colors: [],
      isPublic: false,
      createdAt: new Date(),
      createdBy: currentUser?.id || '',
      tags: [],
    };

    setPalettes([newPalette, ...palettes]);
    setSelectedPalette(newPalette);
    setFormData({ name: '', description: '' });
    setShowNewForm(false);

    emitEvent({
      type: 'palette_created',
      workspaceId,
      entityId: newPalette.id,
      userId: currentUser?.id || 'unknown',
      comment: `Created palette: ${newPalette.name}`,
    });
  };

  const handleAddColor = () => {
    if (!selectedPalette || !newColor.name.trim()) return;

    const color: Color = {
      id: crypto.randomUUID(),
      name: newColor.name,
      hex: newColor.hex,
      rgb: hexToRgb(newColor.hex),
    };

    const updated = {
      ...selectedPalette,
      colors: [...selectedPalette.colors, color],
    };

    setPalettes(palettes.map((p) => (p.id === selectedPalette.id ? updated : p)));
    setSelectedPalette(updated);
    setNewColor({ name: '', hex: '#000000' });
    setShowColorForm(false);
  };

  const handleDeleteColor = (colorId: string) => {
    if (!selectedPalette) return;

    const updated = {
      ...selectedPalette,
      colors: selectedPalette.colors.filter((c) => c.id !== colorId),
    };

    setPalettes(palettes.map((p) => (p.id === selectedPalette.id ? updated : p)));
    setSelectedPalette(updated);
  };

  const handleCopyColor = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `rgb(${r}, ${g}, ${b})`;
    }
    return 'rgb(0, 0, 0)';
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-700 p-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Color Palettes
          </h2>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Palette
          </button>
        </div>

        {showNewForm && (
          <div className="bg-gray-800 p-3 rounded border border-gray-700 space-y-2">
            <input
              placeholder="Palette name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white text-sm placeholder-gray-400"
            />
            <input
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white text-sm placeholder-gray-400"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreatePalette}
                className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => setShowNewForm(false)}
                className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {/* Palettes List */}
        <div className="w-64 border border-gray-700 rounded bg-gray-800/30 overflow-y-auto shrink-0">
          <div className="divide-y divide-gray-700">
            {palettes.map((palette) => (
              <button
                key={palette.id}
                onClick={() => setSelectedPalette(palette)}
                className={`w-full text-left p-3 transition-colors ${
                  selectedPalette?.id === palette.id
                    ? 'bg-blue-600/30 border-l-2 border-l-blue-500'
                    : 'hover:bg-gray-700/50'
                }`}
              >
                <div className="font-medium text-sm mb-2">{palette.name}</div>
                <div className="flex gap-1 mb-2">
                  {palette.colors.slice(0, 5).map((color) => (
                    <div
                      key={color.id}
                      className="w-4 h-4 rounded border border-gray-600"
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>
                <div className="text-xs text-gray-400">{palette.colors.length} colors</div>
              </button>
            ))}
          </div>
        </div>

        {/* Palette Details */}
        {selectedPalette ? (
          <div className="flex-1 border border-gray-700 rounded bg-gray-800/30 overflow-y-auto flex flex-col">
            <div className="p-4 border-b border-gray-700 shrink-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold">{selectedPalette.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">{selectedPalette.description}</p>
                </div>
              </div>

              <button
                onClick={() => setShowColorForm(!showColorForm)}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors mt-3"
              >
                <Plus className="w-4 h-4" />
                Add Color
              </button>

              {showColorForm && (
                <div className="bg-gray-700/50 p-3 rounded border border-gray-600 mt-3 space-y-2">
                  <input
                    placeholder="Color name"
                    value={newColor.name}
                    onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 rounded text-white text-sm placeholder-gray-400"
                  />
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={newColor.hex}
                      onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      placeholder="#000000"
                      value={newColor.hex}
                      onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
                      className="flex-1 px-3 py-2 bg-gray-700 rounded text-white text-sm placeholder-gray-400 font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddColor}
                      className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowColorForm(false)}
                      className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Colors Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedPalette.colors.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                  <Palette className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No colors yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedPalette.colors.map((color) => (
                    <div
                      key={color.id}
                      className="flex items-center gap-3 p-3 bg-gray-700/50 rounded hover:bg-gray-700 transition-colors"
                    >
                      <div
                        className="w-12 h-12 rounded border border-gray-600"
                        style={{ backgroundColor: color.hex }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{color.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{color.hex}</div>
                        <div className="text-xs text-gray-500">{color.rgb}</div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleCopyColor(color.hex)}
                          className={`p-1.5 rounded transition-colors ${
                            copiedColor === color.hex
                              ? 'bg-green-600 text-white'
                              : 'text-gray-400 hover:text-white hover:bg-gray-600'
                          }`}
                          title="Copy hex"
                        >
                          {copiedColor === color.hex ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteColor(color.id)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Palette className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Select a palette</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
