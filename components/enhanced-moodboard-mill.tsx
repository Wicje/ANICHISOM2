/**
 * ANICHISOM OS: Enhanced Moodboard Mill
 * 
 * Visual inspiration and design asset curation platform
 * Phase 3A: Moodboard Mill
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOS } from '@/lib/os-context';
import {
  Plus, Trash2, Share2, Download, Grid3x3, List, Heart, MessageSquare,
  Search, Filter, Tag, Eye, MoreHorizontal, Copy, Move as MoveIcon,
  Maximize2, X, Check, Clock, User
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface MoodboardAsset {
  id: string;
  url: string;
  title: string;
  tags: string[];
  color?: string;
  notes?: string;
  likes: number;
  userLiked: boolean;
  createdAt: Date;
  createdBy: string;
}

interface Moodboard {
  id: string;
  name: string;
  description: string;
  assets: MoodboardAsset[];
  tags: string[];
  collaborators: string[];
  isPublic: boolean;
  thumbnail?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface EnhancedMoodboardMillProps {
  projectId?: string;
}

export function EnhancedMoodboardMill({ projectId }: EnhancedMoodboardMillProps) {
  const { currentUser, workspaceId, emitEvent } = useOS();
  const [moodboards, setMoodboards] = useState<Moodboard[]>(() => [
    {
      id: 'mood-1',
      name: 'Brutalist Design',
      description: 'Raw, minimalist aesthetic with bold typography',
      assets: [],
      tags: ['design', 'minimalist', 'typography'],
      collaborators: [''],
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'mood-2',
      name: 'Modern Commerce',
      description: 'Clean, accessible e-commerce designs',
      assets: [],
      tags: ['ecommerce', 'clean', 'accessible'],
      collaborators: [''],
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const [selectedMoodboardId, setSelectedMoodboardId] = useState<string | null>(null);
  const selectedMoodboard = moodboards.find(m => m.id === (selectedMoodboardId || 'mood-1')) || moodboards[0] || null;

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MoodboardAsset | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [assetData, setAssetData] = useState({ url: '', title: '', tags: '' });

  const handleCreateMoodboard = () => {
    if (!formData.name.trim()) return;

    const newMoodboard: Moodboard = {
      id: crypto.randomUUID(),
      name: formData.name,
      description: formData.description,
      assets: [],
      tags: [],
      collaborators: [currentUser?.id || ''],
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setMoodboards([newMoodboard, ...moodboards]);
    setSelectedMoodboardId(newMoodboard.id);
    setFormData({ name: '', description: '' });
    setShowNewForm(false);

    emitEvent({
      type: 'moodboard_created',
      workspaceId,
      entityId: newMoodboard.id,
      userId: currentUser?.id || 'unknown',
      comment: `Created moodboard: ${newMoodboard.name}`,
    });
  };

  const handleAddAsset = () => {
    if (!selectedMoodboard || !assetData.url.trim() || !assetData.title.trim()) {
      alert('Please fill in URL and title');
      return;
    }

    const newAsset: MoodboardAsset = {
      id: crypto.randomUUID(),
      url: assetData.url,
      title: assetData.title,
      tags: assetData.tags.split(',').map((t) => t.trim()),
      notes: '',
      likes: 0,
      userLiked: false,
      createdAt: new Date(),
      createdBy: currentUser?.id || 'unknown',
    };

    const updated = {
      ...selectedMoodboard,
      assets: [newAsset, ...selectedMoodboard.assets],
      updatedAt: new Date(),
    };

    setMoodboards(moodboards.map((m) => (m.id === selectedMoodboard.id ? updated : m)));
    setAssetData({ url: '', title: '', tags: '' });
    setShowAssetForm(false);

    emitEvent({
      type: 'asset_added',
      workspaceId,
      entityId: selectedMoodboard.id,
      userId: currentUser?.id || 'unknown',
      comment: `Added asset: ${newAsset.title}`,
    });
  };

  const handleDeleteAsset = (assetId: string) => {
    if (!selectedMoodboard) return;

    const updated = {
      ...selectedMoodboard,
      assets: selectedMoodboard.assets.filter((a) => a.id !== assetId),
      updatedAt: new Date(),
    };

    setMoodboards(moodboards.map((m) => (m.id === selectedMoodboard.id ? updated : m)));
  };

  const handleLikeAsset = (assetId: string) => {
    if (!selectedMoodboard) return;

    const updated = {
      ...selectedMoodboard,
      assets: selectedMoodboard.assets.map((a) =>
        a.id === assetId
          ? { ...a, likes: a.userLiked ? a.likes - 1 : a.likes + 1, userLiked: !a.userLiked }
          : a
      ),
      updatedAt: new Date(),
    };

    setMoodboards(moodboards.map((m) => (m.id === selectedMoodboard.id ? updated : m)));
  };

  const filteredAssets =
    selectedMoodboard?.assets.filter((asset) => {
      const matchesSearch =
        asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.notes?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tag) => asset.tags.includes(tag));

      return matchesSearch && matchesTags;
    }) || [];

  const allTags = Array.from(
    new Set(selectedMoodboard?.assets.flatMap((a) => a.tags) || [])
  );

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Moodboards Sidebar */}
      <div className="flex-1 overflow-hidden flex">
        {/* Moodboards List */}
        <div className="w-64 border-r border-gray-700 bg-gray-800/50 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-700">
            <button
              onClick={() => setShowNewForm(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Moodboard
            </button>
          </div>

          {showNewForm && (
            <div className="p-4 border-b border-gray-700 space-y-2">
              <input
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-2 py-1.5 bg-gray-700 rounded text-sm text-white placeholder-gray-400"
              />
              <input
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-2 py-1.5 bg-gray-700 rounded text-sm text-white placeholder-gray-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateMoodboard}
                  className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowNewForm(false)}
                  className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto divide-y divide-gray-700">
            {moodboards.map((board) => (
              <button
                key={board.id}
                onClick={() => setSelectedMoodboardId(board.id)}
                className={`w-full text-left p-3 transition-colors ${
                  selectedMoodboard?.id === board.id
                    ? 'bg-blue-600/30 border-l-2 border-l-blue-500'
                    : 'hover:bg-gray-700/50'
                }`}
              >
                <div className="font-medium text-sm mb-1">{board.name}</div>
                <div className="text-xs text-gray-400 line-clamp-1">{board.description}</div>
                <div className="text-xs text-gray-500 mt-2">{board.assets.length} assets</div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        {selectedMoodboard ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="border-b border-gray-700 p-4 shrink-0">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-2xl font-bold">{selectedMoodboard.name}</h2>
                  <p className="text-sm text-gray-400 mt-1">{selectedMoodboard.description}</p>
                </div>
                <button
                  onClick={() => setShowAssetForm(!showAssetForm)}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Asset
                </button>
              </div>

              {/* Asset Form */}
              {showAssetForm && (
                <div className="bg-gray-800/50 p-3 rounded border border-gray-700 space-y-2 mb-3">
                  <input
                    placeholder="Image URL"
                    value={assetData.url}
                    onChange={(e) => setAssetData({ ...assetData, url: e.target.value })}
                    className="w-full px-2 py-1.5 bg-gray-700 rounded text-sm text-white placeholder-gray-400"
                  />
                  <input
                    placeholder="Title"
                    value={assetData.title}
                    onChange={(e) => setAssetData({ ...assetData, title: e.target.value })}
                    className="w-full px-2 py-1.5 bg-gray-700 rounded text-sm text-white placeholder-gray-400"
                  />
                  <input
                    placeholder="Tags (comma separated)"
                    value={assetData.tags}
                    onChange={(e) => setAssetData({ ...assetData, tags: e.target.value })}
                    className="w-full px-2 py-1.5 bg-gray-700 rounded text-sm text-white placeholder-gray-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddAsset}
                      className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowAssetForm(false)}
                      className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Search & Filters */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400" />
                  <input
                    placeholder="Search assets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-gray-700 rounded text-sm text-white placeholder-gray-400"
                  />
                </div>

                {/* Tag Filter */}
                {allTags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() =>
                          setSelectedTags(
                            selectedTags.includes(tag)
                              ? selectedTags.filter((t) => t !== tag)
                              : [...selectedTags, tag]
                          )
                        }
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          selectedTags.includes(tag)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Assets Grid/List */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredAssets.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No assets yet</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="group relative bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-all"
                    >
                      {/* Image */}
                      <div className="aspect-square bg-gray-700 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.url}
                          alt={asset.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23374151" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%239CA3AF" font-size="14"%3EImage%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <h3 className="font-medium text-sm truncate">{asset.title}</h3>
                        {asset.tags.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {asset.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                          <button
                            onClick={() => handleLikeAsset(asset.id)}
                            className={`flex items-center gap-1 transition-colors ${
                              asset.userLiked ? 'text-red-400' : 'hover:text-red-400'
                            }`}
                          >
                            <Heart
                              className={cn('w-3 h-3', asset.userLiked && 'fill-red-400')}
                            />
                            {asset.likes}
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="ml-auto hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
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
              <Grid3x3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Select or create a moodboard</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
