'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import {
  MousePointer2, GripHorizontal, Type, Trash2, Link as LinkIcon, Upload,
  MessageSquare, Heart, X as XIcon, CheckCircle, Plus, Undo2, Redo2,
  ZoomIn, ZoomOut, Maximize, Download, Tag, Group, Minus, ArrowRight,
  Lock, Unlock, Palette, Eye, LayoutGrid, Pin, Star, Sparkles, Clock,
  ChevronDown, ChevronRight, Send, Filter, Presentation, Scissors, ExternalLink,
  Image as ImageIcon
} from 'lucide-react';
import { writeBlob } from '@/lib/context-layer';
import { FS } from '@/lib/fs';
import { cn } from '@/lib/utils';
import { isTauri } from '@/lib/platform';
import { useCollaborativeDoc } from '@/lib/hooks/useCollaborativeDoc';
import { SyncPromptBanner } from '../sync-prompt-banner';
import { MoodboardExportService } from '@/lib/services/moodboard-export.service';
import { OSPrompt } from '@/components/ui/os-modal';

import type { BoardNode, Comment, Connection, CanvasMode, BoardGroup, BoardTag } from './types';
import { REACTION_EMOJIS, NODE_COLORS, GROUP_COLORS, TAG_COLORS, SNAP_GRID_SIZE } from './types';
import { isImageUrl, getEmbedDetails, snapToGrid } from './helpers';
import { CursorOverlay } from './cursor-overlay';
import { BlobMedia } from './blob-media';
import { ConnectionLines } from './connection-lines';
import { MiniMap } from './minimap';
import { DraggableNode } from './draggable-node';
import { MoodboardSidebar } from './sidebar';
import { CanvasView } from '@/components/moodboard/views/canvas-view';
import { MoodboardTimelineView } from '@/components/moodboard/views/timeline-view';
import { SamurAIView } from '@/components/moodboard/views/samurai-view';
import { AssetPreview } from '@/components/moodboard/views/asset-preview';

export function Moodboard({ window: osWindow }: { window: OSWindow }) {
  const { workspaceMode, openWindow } = useOS();
  const projectId = osWindow.data?.projectId || osWindow.id;

  const collab = useCollaborativeDoc({
    appPrefix: 'moodboard',
    docId: projectId,
    sharedTypes: [
      { name: 'nodes', kind: 'Map' },
      { name: 'comments', kind: 'Map' },
      { name: 'connections', kind: 'Map' },
      { name: 'groups', kind: 'Map' },
      { name: 'tags', kind: 'Map' },
    ],
    undoTrackingTypes: ['nodes', 'comments', 'connections', 'groups', 'tags'],
    onFirstSync: (_ydoc: any, types: Record<string, any>) => {
      if (types.nodes.size === 0) {
        const initNode: BoardNode = {
          id: '1', type: 'text', x: 100, y: 100,
          content: `CAMPAIGN: "${projectId.toUpperCase()}"\n\n${workspaceMode === 'agency' ? 'Agency Shared Mode' : 'Private Mode'}`,
          backgroundColor: '#fef3c7',
        };
        types.nodes.set(initNode.id, initNode);
      }
    },
  });

  const [nodes, setNodes] = useState<BoardNode[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [groups, setGroups] = useState<BoardGroup[]>([]);
  const [tags, setTags] = useState<BoardTag[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, z: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [mode, setMode] = useState<CanvasMode>('select');
  const [voteMode, setVoteMode] = useState(false);
  const [currentVoteIndex, setCurrentVoteIndex] = useState(0);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<{ tagId: string | null; groupId: string | null }>({ tagId: null, groupId: null });
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [presentMode, setPresentMode] = useState(false);
  const presentDivRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (presentMode) presentDivRef.current?.focus(); }, [presentMode]);
  const [presentIndex, setPresentIndex] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCampaignLink, setShowCampaignLink] = useState<string | null>(null);
  const [showAddUrl, setShowAddUrl] = useState(false);
  const [activeView, setActiveView] = useState<'grid' | 'canvas' | 'timeline' | 'samurai' | 'preview'>('grid');
  const [showViewMenu, setShowViewMenu] = useState(false);

  const [syncPromptFile, setSyncPromptFile] = useState<{ name: string; size: number; type: string } | null>(null);

  useEffect(() => {
    if (!collab.synced) return;
    const yNodes = collab.sharedTypesRef.current.nodes;
    const yComments = collab.sharedTypesRef.current.comments;
    const yConnections = collab.sharedTypesRef.current.connections;
    const yGroups = collab.sharedTypesRef.current.groups;
    const yTags = collab.sharedTypesRef.current.tags;

    const syncUi = () => {
      setNodes(Array.from(yNodes.values()));
      setComments(Array.from(yComments.values()));
      setConnections(Array.from(yConnections.values()));
      setGroups(Array.from(yGroups.values()));
      setTags(Array.from(yTags.values()));
    };

    syncUi();
    yNodes.observe(syncUi);
    yComments.observe(syncUi);
    yConnections.observe(syncUi);
    yGroups.observe(syncUi);
    yTags.observe(syncUi);
    return () => {
      yNodes.unobserve(syncUi);
      yComments.unobserve(syncUi);
      yConnections.unobserve(syncUi);
      yGroups.unobserve(syncUi);
      yTags.unobserve(syncUi);
    };
  }, [collab.synced, collab.sharedTypesRef]);

  const addImportedNode = useCallback(async (data: { url?: string; image?: string; video?: string; title?: string }) => {
    if (!collab.synced) return;
    const rawContent = data.image || data.video || data.url;
    if (!rawContent) return;

    let content = rawContent;
    // We intentionally keep local file paths as paths (e.g. "Desktop/image.png")
    // BlobMedia will handle dynamic resolving to avoid storing transient Blob URLs in CRDT state.

    const yNodes = collab.sharedTypesRef.current.nodes;
    if (!yNodes) return;

    // Removed deduplication check to allow importing the same file multiple times

    const newId = crypto.randomUUID();
    const winW = osWindow.width || 800;
    const winH = osWindow.height || 600;
    const targetX = Math.round((winW / 2 - camera.x) / camera.z - 175);
    const targetY = Math.round((winH / 2 - camera.y) / camera.z - 100);

    const isImage = isImageUrl(rawContent) || isImageUrl(content) || !!data.image;
    const isVideo = rawContent.match(/\.(mp4|webm|ogg)$/i) || !!data.video;
    const nodeType = isImage ? 'image' : (isVideo ? 'video' : 'embed');

    const newNode = {
      id: newId,
      type: nodeType,
      x: targetX,
      y: targetY,
      width: isImage ? 350 : 450,
      height: isImage ? 250 : 300,
      content,
      label: data.title || (rawContent.split('/').pop() || 'Imported Asset'),
      createdAt: Date.now(),
    };

    yNodes.set(newId, newNode);

    // Center camera on newly created node
    setCamera((prev) => ({
      ...prev,
      x: Math.round(winW / 2 - (targetX + 175) * prev.z),
      y: Math.round(winH / 2 - (targetY + 100) * prev.z),
    }));
  }, [collab.synced, collab.sharedTypesRef, camera, osWindow.width, osWindow.height, osWindow.title]);

  // Handle window data imports (e.g. from Files app)
  useEffect(() => {
    if (collab.synced && (osWindow.data?.url || osWindow.data?.image || osWindow.data?.video)) {
      addImportedNode({ url: osWindow.data.url, image: osWindow.data.image, video: osWindow.data.video, title: osWindow.title });
    }
  }, [osWindow.data?.url, osWindow.data?.image, osWindow.data?.video, collab.synced, addImportedNode, osWindow.title]);

  // Handle custom clip events (e.g. from Power Browser)
  useEffect(() => {
    const handleClip = (e: CustomEvent) => {
      const { url, title, image, video } = e.detail || {};
      if (url || image || video) {
        addImportedNode({ url, image, video, title });
      }
    };
    window.addEventListener('os:clip-to-moodboard', handleClip as EventListener);
    return () => window.removeEventListener('os:clip-to-moodboard', handleClip as EventListener);
  }, [addImportedNode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setCamera(prev => {
        let { x, y, z } = prev;
        if (e.ctrlKey || e.metaKey) {
          const zoomFactor = Math.pow(0.995, e.deltaY);
          const newZ = Math.min(Math.max(0.1, z * zoomFactor), 5);
          const rect = container.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          x = mouseX - (mouseX - x) * (newZ / z);
          y = mouseY - (mouseY - y) * (newZ / z);
          z = newZ;
        } else {
          x -= e.deltaX;
          y -= e.deltaY;
        }
        return { x, y, z };
      });
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  const _updateYNode = useCallback((newVals: Partial<BoardNode> & { id: string }) => {
    const yNodes = collab.sharedTypesRef.current.nodes;
    if (yNodes) {
      const existing = yNodes.get(newVals.id) || {};
      yNodes.set(newVals.id, { ...existing, ...newVals });
    }
  }, [collab.sharedTypesRef]);

  const _updateYComment = useCallback((newVals: Partial<Comment> & { id: string }) => {
    const yComments = collab.sharedTypesRef.current.comments;
    if (yComments) {
      const existing = yComments.get(newVals.id) || {};
      yComments.set(newVals.id, { ...existing, ...newVals });
    }
  }, [collab.sharedTypesRef]);

  const _deleteYComment = useCallback((id: string) => {
    collab.sharedTypesRef.current.comments?.delete(id);
  }, [collab.sharedTypesRef]);

  const undo = collab.undo;
  const redo = collab.redo;

  const centerCanvasX = useCallback(() => (osWindow.width / 2 - camera.x) / camera.z, [osWindow.width, camera.x, camera.z]);
  const centerCanvasY = useCallback(() => (osWindow.height / 2 - camera.y) / camera.z, [osWindow.height, camera.y, camera.z]);

  const addText = useCallback(() => {
    const newId = crypto.randomUUID();
    _updateYNode({ id: newId, type: 'text', x: centerCanvasX(), y: centerCanvasY(), content: 'New Text', width: 240, height: 150 });
  }, [_updateYNode, centerCanvasX, centerCanvasY]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'File Too Large', message: 'Maximum file size is 50MB.' } })); return; }
    
    try {
      await FS.mkdir('Media');
    } catch { /* ignore */ }
    const path = `Media/${file.name}`;
    await FS.write(path, file);

    const type = file.type.startsWith('video/') ? 'video' : 'image';
    addImportedNode({ [type]: path, title: file.name });

    if (fileInputRef.current) fileInputRef.current.value = '';

    if (file.size > 5 * 1024 * 1024) {
      setSyncPromptFile({ name: file.name, size: file.size, type: file.type });
    }
  }, [addImportedNode]);

  const processUrl = useCallback((url: string) => {
    let type: BoardNode['type'] = 'embed';
    if (isImageUrl(url)) type = 'image';
    else if (url.includes('figma.com/')) type = 'figma';
    else if (url.includes('github.com/')) type = 'github';
    else if (url.includes('youtube.com/') || url.includes('youtu.be/') || url.includes('instagram.com/') || url.includes('pinterest.com/')) type = 'embed';
    const newId = crypto.randomUUID();
    _updateYNode({ id: newId, type, x: centerCanvasX(), y: centerCanvasY(), content: url });
  }, [_updateYNode, centerCanvasX, centerCanvasY]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    if (activeView !== 'grid' && activeView !== 'canvas') return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      for (const file of files) {
        if (file.size > 50 * 1024 * 1024) { window.dispatchEvent(new CustomEvent('os:notify', { detail: { title: 'File Too Large', message: 'Maximum file size is 50MB.' } })); continue; }
        try { await FS.mkdir('Media'); } catch {}
        const path = `Media/${file.name}`;
        await FS.write(path, file);
        const type = file.type.startsWith('video/') ? 'video' : 'image';
        addImportedNode({ [type]: path, title: file.name });
      }
    } else {
      const uriList = e.dataTransfer.getData('text/uri-list');
      const plainText = e.dataTransfer.getData('text/plain');
      
      if (uriList && plainText && /\.(png|jpe?g|gif|webp|svg|mp4|webm)$/i.test(plainText)) {
        const type = /\.(mp4|webm)$/i.test(plainText) ? 'video' : 'image';
        _updateYNode({ id: crypto.randomUUID(), type, x: centerCanvasX(), y: centerCanvasY(), content: uriList });
        return;
      }
      
      const url = uriList || plainText;
      if (url) processUrl(url);
    }
  }, [activeView, addImportedNode, processUrl, centerCanvasX, centerCanvasY, _updateYNode]);

  const handleAddLink = useCallback(() => {
    setShowAddUrl(true);
  }, []);

  const deleteNode = useCallback((id: string) => {
    collab.sharedTypesRef.current.nodes?.delete(id);
    const yConns = collab.sharedTypesRef.current.connections;
    if (yConns) {
      Array.from(yConns.entries()).forEach((entry) => {
        const [cid, conn] = entry as [string, Connection];
        if (conn.fromId === id || conn.toId === id) yConns.delete(cid);
      });
    }
  }, [collab.sharedTypesRef]);

  const addConnection = useCallback((fromId: string, toId: string) => {
    const yConns = collab.sharedTypesRef.current.connections;
    if (yConns) {
      const newId = crypto.randomUUID();
      yConns.set(newId, { id: newId, fromId, toId, color: '#94a3b8' });
    }
    setConnectFromId(null);
    setMode('select');
  }, [collab.sharedTypesRef]);

  const deleteConnection = useCallback((id: string) => {
    collab.sharedTypesRef.current.connections?.delete(id);
  }, [collab.sharedTypesRef]);

  const createGroup = useCallback((name: string, color: string) => {
    const yGroups = collab.sharedTypesRef.current.groups;
    if (yGroups) {
      const newId = crypto.randomUUID();
      yGroups.set(newId, { id: newId, name, color });
    }
  }, [collab.sharedTypesRef]);

  const deleteGroup = useCallback((id: string) => {
    collab.sharedTypesRef.current.groups?.delete(id);
    const yNodes = collab.sharedTypesRef.current.nodes;
    if (yNodes) {
      Array.from(yNodes.entries()).forEach((entry) => {
        const [nid, node] = entry as [string, BoardNode];
        if (node.groupId === id) yNodes.set(nid, { ...node, groupId: undefined });
      });
    }
  }, [collab.sharedTypesRef]);

  const createTag = useCallback((name: string, color: string) => {
    const yTags = collab.sharedTypesRef.current.tags;
    if (yTags) {
      const newId = crypto.randomUUID();
      yTags.set(newId, { id: newId, name, color });
    }
  }, [collab.sharedTypesRef]);

  const deleteTag = useCallback((id: string) => {
    collab.sharedTypesRef.current.tags?.delete(id);
    const yNodes = collab.sharedTypesRef.current.nodes;
    if (yNodes) {
      Array.from(yNodes.entries()).forEach((entry) => {
        const [nid, node] = entry as [string, BoardNode];
        if (node.tags?.includes(id)) yNodes.set(nid, { ...node, tags: node.tags.filter((t: string) => t !== id) });
      });
    }
  }, [collab.sharedTypesRef]);

  const updateNodePosition = useCallback((id: string, x: number, y: number) => {
    if (snapEnabled) {
      _updateYNode({ id, x: snapToGrid(x, SNAP_GRID_SIZE), y: snapToGrid(y, SNAP_GRID_SIZE) });
    } else {
      _updateYNode({ id, x, y });
    }
  }, [_updateYNode, snapEnabled]);

  const updateNodeContent = useCallback((id: string, content: string) => {
    _updateYNode({ id, content });
  }, [_updateYNode]);

  const updateNodeSize = useCallback((id: string, width: number, height: number) => {
    _updateYNode({ id, width, height });
  }, [_updateYNode]);

  const toggleNodeLock = useCallback((id: string) => {
    const yNodes = collab.sharedTypesRef.current.nodes;
    if (yNodes) {
      const existing = yNodes.get(id) || {};
      _updateYNode({ id, locked: !existing.locked });
    }
  }, [_updateYNode, collab.sharedTypesRef]);

  const setNodeBackground = useCallback((id: string, color: string) => {
    _updateYNode({ id, backgroundColor: color });
  }, [_updateYNode]);

  const addNodeTag = useCallback((nodeId: string, tagId: string) => {
    const yNodes = collab.sharedTypesRef.current.nodes;
    if (yNodes) {
      const existing = yNodes.get(nodeId) || {};
      const currentTags = existing.tags || [];
      if (!currentTags.includes(tagId)) {
        _updateYNode({ id: nodeId, tags: [...currentTags, tagId] });
      }
    }
  }, [_updateYNode, collab.sharedTypesRef]);

  const removeNodeTag = useCallback((nodeId: string, tagId: string) => {
    const yNodes = collab.sharedTypesRef.current.nodes;
    if (yNodes) {
      const existing = yNodes.get(nodeId) || {};
      const currentTags = existing.tags || [];
      _updateYNode({ id: nodeId, tags: currentTags.filter((t: string) => t !== tagId) });
    }
  }, [_updateYNode, collab.sharedTypesRef]);

  const setNodeGroup = useCallback((nodeId: string, groupId: string) => {
    _updateYNode({ id: nodeId, groupId });
  }, [_updateYNode]);

  const removeNodeGroup = useCallback((nodeId: string) => {
    _updateYNode({ id: nodeId, groupId: undefined });
  }, [_updateYNode]);

  const addNodeReaction = useCallback((nodeId: string, emoji: string) => {
    const yNodes = collab.sharedTypesRef.current.nodes;
    if (yNodes) {
      const existing = yNodes.get(nodeId) || {};
      const reactions = existing.reactions || {};
      const current = reactions[emoji] || [];
      const userId = 'local';
      if (!current.includes(userId)) {
        _updateYNode({ id: nodeId, reactions: { ...reactions, [emoji]: [...current, userId] } });
      } else {
        _updateYNode({ id: nodeId, reactions: { ...reactions, [emoji]: current.filter((u: string) => u !== userId) } });
      }
    }
  }, [_updateYNode, collab.sharedTypesRef]);

  const addNodeComment = useCallback((nodeId: string, text: string) => {
    const yNodes = collab.sharedTypesRef.current.nodes;
    if (yNodes) {
      const existing = yNodes.get(nodeId) || {};
      const currentComments = existing.comments || [];
      const newComment: import('./types').NodeComment = { id: crypto.randomUUID(), author: 'Guest', text, createdAt: Date.now() };
      _updateYNode({ id: nodeId, comments: [...currentComments, newComment] });
    }
  }, [_updateYNode, collab.sharedTypesRef]);

  const setNodeLabel = useCallback((nodeId: string, label: string) => {
    _updateYNode({ id: nodeId, label });
  }, [_updateYNode]);

  const removeCampaignLink = useCallback((nodeId: string) => {
    _updateYNode({ id: nodeId, campaignLinkId: undefined });
  }, [_updateYNode]);

  const filteredNodes = useMemo(() => {
    let result = nodes;
    if (activeFilter.tagId) {
      result = result.filter(n => n.tags?.includes(activeFilter.tagId!));
    }
    if (activeFilter.groupId) {
      result = result.filter(n => n.groupId === activeFilter.groupId);
    }
    return result;
  }, [nodes, activeFilter]);

  const visibleNodes = useMemo(() => {
    const buffer = 500 / camera.z;
    const viewLeft = -camera.x / camera.z - buffer;
    const viewTop = -camera.y / camera.z - buffer;
    const viewRight = (osWindow.width - camera.x) / camera.z + buffer;
    const viewBottom = (osWindow.height - camera.y) / camera.z + buffer;

    return filteredNodes.filter(n => {
      const w = n.width || 300;
      const h = n.height || 200;
      return n.x < viewRight && (n.x + w) > viewLeft &&
             n.y < viewBottom && (n.y + h) > viewTop;
    });
  }, [filteredNodes, camera, osWindow.width, osWindow.height]);

  const autoArrange = useCallback(() => {
    const yNodes = collab.sharedTypesRef.current.nodes;
    if (!yNodes) return;
    const allNodes = Array.from(yNodes.entries());
    const cols = Math.ceil(Math.sqrt(allNodes.length));
    const gapX = 280;
    const gapY = 250;
    allNodes.forEach((entry, i: number) => {
      const [nid, node] = entry as [string, BoardNode];
      const col = i % cols;
      const row = Math.floor(i / cols);
      yNodes.set(nid, { ...node, x: 100 + col * gapX, y: 100 + row * gapY });
    });
  }, [collab.sharedTypesRef]);

  const zoomIn = useCallback(() => {
    setCamera(prev => {
      const newZ = Math.min(prev.z * 1.2, 5);
      const cx = osWindow.width / 2;
      const cy = osWindow.height / 2;
      return {
        x: cx - (cx - prev.x) * (newZ / prev.z),
        y: cy - (cy - prev.y) * (newZ / prev.z),
        z: newZ,
      };
    });
  }, [osWindow.width, osWindow.height]);

  const zoomOut = useCallback(() => {
    setCamera(prev => {
      const newZ = Math.max(prev.z / 1.2, 0.1);
      const cx = osWindow.width / 2;
      const cy = osWindow.height / 2;
      return {
        x: cx - (cx - prev.x) * (newZ / prev.z),
        y: cy - (cy - prev.y) * (newZ / prev.z),
        z: newZ,
      };
    });
  }, [osWindow.width, osWindow.height]);

  const fitToContent = useCallback(() => {
    if (nodes.length === 0) {
      setCamera({ x: 0, y: 0, z: 1 });
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + (n.width || 200));
      maxY = Math.max(maxY, n.y + (n.height || 200));
    }
    const contentW = maxX - minX + 100;
    const contentH = maxY - minY + 100;
    const z = Math.min(osWindow.width / contentW, osWindow.height / contentH, 1);
    const cx = osWindow.width / 2;
    const cy = osWindow.height / 2;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setCamera({ x: cx - centerX * z, y: cy - centerY * z, z });
  }, [nodes, osWindow.width, osWindow.height]);

  const exportJSON = useCallback(() => {
    const data = { nodes, comments, connections, groups, tags, exportedAt: Date.now(), projectId };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `moodboard-${projectId}.json`; a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [nodes, comments, connections, groups, tags, projectId]);

  const exportPNG = useCallback(async () => {
    const exportNodes = nodes.map(n => ({
      id: n.id, type: n.type, x: n.x, y: n.y, width: n.width, height: n.height,
      content: n.content, label: n.label, backgroundColor: n.backgroundColor,
      tags: n.tags, reactions: n.reactions,
    }));
    const { MoodboardExportService: ExportSvc } = await import('@/lib/services/moodboard-export.service');
    await ExportSvc.exportPNG(exportNodes, { format: 'png', filename: `moodboard-${projectId}.png` });
    setShowExportMenu(false);
  }, [nodes, projectId]);

  const exportPrint = useCallback(() => {
    const exportNodes = nodes.map(n => ({
      id: n.id, type: n.type, x: n.x, y: n.y, width: n.width, height: n.height,
      content: n.content, label: n.label, backgroundColor: n.backgroundColor,
      tags: n.tags, reactions: n.reactions,
    }));
    const exportConns = connections.map(c => ({ fromId: c.fromId, toId: c.toId, label: c.label }));
    MoodboardExportService.exportPrint(exportNodes, exportConns, `Moodboard: ${projectId}`);
    setShowExportMenu(false);
  }, [nodes, connections, projectId]);

  const linkToCampaign = useCallback((nodeId: string, campaignPageId: string) => {
    _updateYNode({ id: nodeId, campaignLinkId: campaignPageId });
    setShowCampaignLink(null);
  }, [_updateYNode]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 1 || e.button === 2 || mode === 'pan') {
      e.preventDefault();
      setIsPanning(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    if (mode === 'comment' && e.target === e.currentTarget) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left - camera.x) / camera.z;
      const y = (e.clientY - rect.top - camera.y) / camera.z;
      _updateYComment({ id: crypto.randomUUID(), x, y, text: 'New comment...', author: 'Guest' });
      setMode('select');
    }
    if (mode === 'connect' && e.target === e.currentTarget) {
      setConnectFromId(null);
      setMode('select');
    }
  }, [mode, camera, _updateYComment]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning) {
      setCamera(prev => ({ ...prev, x: prev.x + e.movementX, y: prev.y + e.movementY }));
    }
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = (e.clientX - rect.left - camera.x) / camera.z;
      const y = (e.clientY - rect.top - camera.y) / camera.z;
      collab.setLocalCursor(x, y);
    }
  }, [isPanning, camera, collab]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsPanning(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const activeElement = document.activeElement;
    if (activeElement && activeElement.tagName === 'TEXTAREA') return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i]!.type.indexOf('image') !== -1) {
        const file = items[i]!.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = async () => {
            const fileId = crypto.randomUUID();
            await writeBlob(fileId, file);
            _updateYNode({ id: crypto.randomUUID(), type: 'image', x: centerCanvasX(), y: centerCanvasY(), content: `local-blob:${fileId}` });
          };
          reader.readAsArrayBuffer(file);
        }
        return;
      }
    }
    const text = e.clipboardData.getData('text');
    if (text) {
      if (/^https?:\/\//.test(text.trim())) {
        processUrl(text.trim());
      } else {
        _updateYNode({ id: crypto.randomUUID(), type: 'text', x: centerCanvasX(), y: centerCanvasY(), content: text });
      }
    }
  }, [_updateYNode, centerCanvasX, centerCanvasY, processUrl]);

  const presentableNodes = useMemo(() => nodes.filter(n => n.type === 'image' || n.type === 'embed' || (n.type === 'text' && n.content.length > 10)), [nodes]);

  if (!collab.synced) {
    return (
      <div className="w-full h-full bg-[#eee] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <span className="text-sm text-black/50 font-medium">Syncing moodboard...</span>
        </div>
      </div>
    );
  }

  if (collab.synced && nodes.length === 0) {
    return (
      <div className="w-full h-full bg-[#eee] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-white border border-black/10 shadow-sm flex items-center justify-center">
            <LayoutGrid className="w-8 h-8 text-black/30" />
          </div>
          <h3 className="text-lg font-semibold text-black/70">Start your moodboard</h3>
          <p className="text-sm text-black/40">Add images, text, links, or embeds. Drag to arrange. Connect ideas visually.</p>
          <div className="flex gap-2 mt-2">
            <button onClick={addText} className="px-4 py-2 bg-white border border-black/10 rounded-lg text-sm font-medium hover:bg-black/5 transition-colors flex items-center gap-2">
              <Type className="w-4 h-4" /> Add Text
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white border border-black/10 rounded-lg text-sm font-medium hover:bg-black/5 transition-colors flex items-center gap-2">
              <Upload className="w-4 h-4" /> Upload Media
            </button>
            <button onClick={handleAddLink} className="px-4 py-2 bg-white border border-black/10 rounded-lg text-sm font-medium hover:bg-black/5 transition-colors flex items-center gap-2">
              <LinkIcon className="w-4 h-4" /> Add Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (presentMode) {
    const node = presentableNodes[presentIndex];
    return (
      <div className="w-full h-full bg-[#111] flex flex-col items-center justify-center relative" onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === ' ') setPresentIndex(i => Math.min(i + 1, presentableNodes.length - 1));
        if (e.key === 'ArrowLeft') setPresentIndex(i => Math.max(i - 1, 0));
        if (e.key === 'Escape') setPresentMode(false);
      }} tabIndex={0}>
        <button onClick={() => setPresentMode(false)} className="absolute top-4 right-4 text-white/30 hover:text-white bg-white/10 p-2 rounded-full transition-colors z-50">
          <XIcon className="w-5 h-5" />
        </button>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs font-bold">
          {presentIndex + 1} / {presentableNodes.length} — Arrow keys to navigate, Esc to exit
        </div>
        {node ? (
          <div className="max-w-3xl max-h-[80vh] flex items-center justify-center">
            {node.type === 'image' && <BlobMedia content={node.content} type="image" className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />}
            {node.type === 'embed' && (
              isTauri() ? (
                <iframe
                  src={getEmbedDetails(node.content).url}
                  className="w-[600px] h-[400px] border-none rounded-lg shadow-2xl"
                  sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                />
              ) : (
                <iframe src={getEmbedDetails(node.content).url} className="w-[600px] h-[400px] border-none rounded-lg shadow-2xl" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" />
              )
            )}
            {node.type === 'text' && (
              <div className="bg-white rounded-xl p-8 shadow-2xl max-w-xl text-black text-lg whitespace-pre-wrap">{node.content}</div>
            )}
            {node.label && <div className="text-white/60 text-sm mt-3 font-bold">{node.label}</div>}
          </div>
        ) : (
          <div className="text-white/30 text-lg">No items to present</div>
        )}
      </div>
    );
  }

  // ─── Sub-view rendering ──────────────────────────────────────
  const subViewProps = {
    nodes, comments, connections, groups, tags, camera, setCamera,
    updateNodePosition, updateNodeContent, updateNodeSize, deleteNode,
    addText, processUrl, fileInputRef, handleFileUpload,
    addNodeReaction, addNodeComment, setNodeLabel, setNodeBackground,
    toggleNodeLock, addNodeTag, removeNodeTag, setNodeGroup, removeNodeGroup,
    projectId, osWindow, _updateYNode: (vals: Partial<BoardNode> & { id: string }) => {
      const yNodes = collab.sharedTypesRef.current.nodes;
      if (yNodes) {
        const existing = yNodes.get(vals.id) || {};
        yNodes.set(vals.id, { ...existing, ...vals });
      }
    },
  };

  if (activeView !== 'grid') {
    return (
      <div className="w-full h-full overflow-hidden relative font-sans outline-none" tabIndex={0}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
          if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
        }}
      >
        {/* Sub-view content */}
        <div className="w-full h-full">
          {activeView === 'canvas' && <CanvasView {...subViewProps} />}
          {activeView === 'timeline' && <MoodboardTimelineView {...subViewProps} />}
          {activeView === 'samurai' && <SamurAIView {...subViewProps} />}
          {activeView === 'preview' && <AssetPreview {...subViewProps} />}
        </div>

        {/* Shared toolbar overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-3 py-2 rounded-full shadow-lg border border-black/10 z-50 flex items-center gap-1.5">
          <div className="px-2 py-1 flex flex-col justify-center text-[10px] rounded uppercase font-bold tracking-wider leading-tight mr-1 text-black/50">
            <span>{workspaceMode}</span>
            <span className="text-[8px] opacity-70">Context</span>
          </div>
          <div className="w-px h-6 bg-black/10" />
          <div className="relative">
            <button onClick={() => setShowViewMenu(!showViewMenu)} className="w-7 h-7 rounded flex items-center justify-center bg-black text-white transition-colors" title="Switch View">
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            {showViewMenu && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white shadow-xl rounded-lg border border-black/10 py-1 z-50 w-40" onPointerDown={(e) => e.stopPropagation()}>
                {[
                  { id: 'grid' as const, label: 'Grid Canvas', icon: LayoutGrid },
                  { id: 'canvas' as const, label: 'Canvas Board', icon: LayoutGrid },
                  { id: 'timeline' as const, label: 'Timeline', icon: Clock },
                  { id: 'samurai' as const, label: 'SamurAI Board', icon: Sparkles },
                  { id: 'preview' as const, label: 'Asset Preview', icon: Eye },
                ].map(v => (
                  <button key={v.id} onClick={() => { setActiveView(v.id); setShowViewMenu(false); }}
                    className={cn("w-full text-left px-3 py-2 text-xs hover:bg-slate-100 flex items-center gap-2", activeView === v.id && "bg-slate-100 font-medium")}>
                    <v.icon className="w-3 h-3" />{v.label}
                    {activeView === v.id && <span className="ml-auto text-[10px] text-black/30">●</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="w-px h-5 bg-black/10" />
          <button onClick={undo} disabled={!collab.canUndo} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors disabled:opacity-30" title="Undo"><Undo2 className="w-3.5 h-3.5" /></button>
          <button onClick={redo} disabled={!collab.canRedo} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors disabled:opacity-30" title="Redo"><Redo2 className="w-3.5 h-3.5" /></button>
          <div className="w-px h-5 bg-black/10" />
          <button onClick={addText} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors" title="Add Text"><Type className="w-3.5 h-3.5" /></button>
          <button onClick={() => fileInputRef.current?.click()} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors" title="Upload Media"><Upload className="w-3.5 h-3.5" /></button>
          <button onClick={handleAddLink} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors" title="Add Link"><LinkIcon className="w-3.5 h-3.5" /></button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full h-full bg-[#eee] overflow-hidden relative font-sans outline-none",
        isPanning ? "cursor-grabbing" : mode === 'pan' ? "cursor-grab" : mode === 'connect' ? "cursor-crosshair" : mode === 'comment' ? "cursor-crosshair" : "cursor-default",
      )}
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      }}
      onContextMenu={(e) => e.preventDefault()}
      tabIndex={0}
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-20 origin-top-left"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)',
          backgroundSize: `${24 * camera.z}px ${24 * camera.z}px`,
          backgroundPosition: `${camera.x}px ${camera.y}px`,
        }}
      />

      <ConnectionLines connections={connections} nodes={visibleNodes} camera={camera} />

      <div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.z})` }}>
        {visibleNodes.map(node => (
          <DraggableNode
            key={node.id}
            node={node}
            cameraScale={camera.z}
            groups={groups}
            tags={tags}
            onDelete={() => deleteNode(node.id)}
            onPositionChange={(x, y) => updateNodePosition(node.id, x, y)}
            onContentChange={(c) => updateNodeContent(node.id, c)}
            onSizeChange={(w, h) => updateNodeSize(node.id, w, h)}
            onToggleLock={() => toggleNodeLock(node.id)}
            onSetBackground={(color) => setNodeBackground(node.id, color)}
            onAddTag={(tagId) => addNodeTag(node.id, tagId)}
            onRemoveTag={(tagId) => removeNodeTag(node.id, tagId)}
            onSetGroup={(groupId) => setNodeGroup(node.id, groupId)}
            onRemoveGroup={() => removeNodeGroup(node.id)}
            onAddReaction={(emoji) => addNodeReaction(node.id, emoji)}
            onAddComment={(text) => addNodeComment(node.id, text)}
            onSetLabel={(label) => setNodeLabel(node.id, label)}
            onRemoveCampaignLink={() => removeCampaignLink(node.id)}
            onSetCampaignLink={() => setShowCampaignLink(node.id)}
            connectFromId={connectFromId}
            onConnectTo={addConnection}
          />
        ))}

        {comments.map((comment) => (
          <div
            key={comment.id}
            className="absolute rounded bg-yellow-200 text-black shadow-md border border-yellow-400 p-2 text-sm w-48 font-sans cursor-text group"
            style={{ left: comment.x, top: comment.y }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button onClick={() => _deleteYComment(comment.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
            <div className="text-[10px] uppercase font-bold text-black/40 mb-1">{comment.author}</div>
            <textarea className="w-full bg-transparent border-none outline-none resize-none" value={comment.text} onChange={(e) => _updateYComment({ id: comment.id, text: e.target.value })} placeholder="Write comment..." rows={2} />
          </div>
        ))}

        {collab.remoteCursors.map((cursor) => (
          <CursorOverlay key={cursor.userId} state={{ cursor: { x: cursor.x, y: cursor.y }, user: { name: cursor.name, color: cursor.color } }} />
        ))}
      </div>

      {/* ─── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-3 py-2 rounded-full shadow-lg border border-black/10 z-50 flex items-center gap-1.5">
        <div className="px-2 py-1 flex flex-col justify-center text-[10px] rounded uppercase font-bold tracking-wider leading-tight mr-1 text-black/50">
          <span>{workspaceMode}</span>
          <span className="text-[8px] opacity-70">Context</span>
        </div>
        <div className="w-px h-6 bg-black/10" />

        {/* View Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowViewMenu(!showViewMenu)}
            className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors"
            title="Switch View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          {showViewMenu && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white shadow-xl rounded-lg border border-black/10 py-1 z-50 w-40" onPointerDown={(e) => e.stopPropagation()}>
              {[
                { id: 'grid' as const, label: 'Grid Canvas', icon: LayoutGrid },
                { id: 'canvas' as const, label: 'Canvas Board', icon: LayoutGrid },
                { id: 'timeline' as const, label: 'Timeline', icon: Clock },
                { id: 'samurai' as const, label: 'SamurAI Board', icon: Sparkles },
                { id: 'preview' as const, label: 'Asset Preview', icon: Eye },
              ].map(v => (
                <button
                  key={v.id}
                  onClick={() => { setActiveView(v.id); setShowViewMenu(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs hover:bg-slate-100 flex items-center gap-2",
                    activeView === v.id && "bg-slate-100 font-medium"
                  )}
                >
                  <v.icon className="w-3 h-3" />
                  {v.label}
                  {activeView === v.id && <span className="ml-auto text-[10px] text-black/30">●</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="w-px h-5 bg-black/10" />

        <button onClick={undo} disabled={!collab.canUndo} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors disabled:opacity-30" title="Undo">
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={redo} disabled={!collab.canRedo} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors disabled:opacity-30" title="Redo">
          <Redo2 className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-5 bg-black/10" />

        <button onClick={() => setMode('select')} className={cn("w-7 h-7 rounded flex items-center justify-center transition-colors", mode === 'select' ? "bg-black text-white" : "text-black/60 hover:bg-slate-100")} title="Select">
          <MousePointer2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setMode('pan')} className={cn("w-7 h-7 rounded flex items-center justify-center transition-colors", mode === 'pan' ? "bg-black text-white" : "text-black/60 hover:bg-slate-100")} title="Pan">
          <GripHorizontal className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setMode('comment')} className={cn("w-7 h-7 rounded flex items-center justify-center transition-colors", mode === 'comment' ? "bg-black text-white" : "text-black/60 hover:bg-slate-100")} title="Comment">
          <MessageSquare className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => { setMode('connect'); setConnectFromId(null); }} className={cn("w-7 h-7 rounded flex items-center justify-center transition-colors", mode === 'connect' ? "bg-black text-white" : "text-black/60 hover:bg-slate-100")} title="Connect">
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-5 bg-black/10" />

        <button onClick={addText} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors" title="Add Text">
          <Type className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors" title="Upload Media">
          <Upload className="w-3.5 h-3.5" />
        </button>
        <button onClick={handleAddLink} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors" title="Add Link">
          <LinkIcon className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-5 bg-black/10" />

        <button onClick={() => setSidebarOpen(!sidebarOpen)} className={cn("w-7 h-7 rounded flex items-center justify-center transition-colors", sidebarOpen ? "bg-blue-500 text-white" : "text-black/60 hover:bg-slate-100")} title="Organize">
          <Group className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setSnapEnabled(!snapEnabled)} className={cn("w-7 h-7 rounded flex items-center justify-center transition-colors", snapEnabled ? "bg-emerald-500 text-white" : "text-black/60 hover:bg-slate-100")} title="Snap to Grid">
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => { setVoteMode(true); setCurrentVoteIndex(0); }} className="px-2 h-7 rounded flex items-center justify-center bg-rose-50 text-rose-500 font-bold text-xs hover:bg-rose-100 transition-colors gap-1" title="Moodboard Mill (Voting)">
          <Heart className="w-3 h-3" /> Mill
        </button>
        <div className="w-px h-5 bg-black/10" />

        <button onClick={() => setShowExportMenu(!showExportMenu)} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors" title="Export">
          <Download className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => { if (presentableNodes.length > 0) setPresentMode(true); setPresentIndex(0); }} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors" title="Present" disabled={presentableNodes.length === 0}>
          <Presentation className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => openWindow('moodboard', 'New Moodboard', { projectId: crypto.randomUUID() })}
          className="w-7 h-7 rounded flex items-center justify-center text-black hover:bg-blue-100 transition-colors" title="New Board"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
      </div>

      {/* Export menu dropdown */}
      {showExportMenu && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-white shadow-xl rounded-lg border border-black/10 py-1 z-50 w-48" onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={exportJSON} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 flex items-center gap-2">
            <Download className="w-3 h-3" /> Export as JSON
          </button>
          <button onClick={exportPNG} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 flex items-center gap-2">
            <ImageIcon className="w-3 h-3" /> Export as PNG
          </button>
          <button onClick={exportPrint} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 flex items-center gap-2">
            <Presentation className="w-3 h-3" /> Print View
          </button>
        </div>
      )}

      {/* Connect mode indicator */}
      {mode === 'connect' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow z-50">
          {connectFromId ? 'Click a node to connect' : 'Click a node to start connection'}
        </div>
      )}

      {/* Sidebar */}
      {sidebarOpen && (
        <MoodboardSidebar
          groups={groups}
          tags={tags}
          connections={connections}
          nodes={nodes}
          onCreateGroup={createGroup}
          onDeleteGroup={deleteGroup}
          onCreateTag={createTag}
          onDeleteTag={deleteTag}
          onDeleteConnection={deleteConnection}
          onFilterTag={(tagId) => setActiveFilter(prev => ({ ...prev, tagId }))}
          onFilterGroup={(groupId) => setActiveFilter(prev => ({ ...prev, groupId }))}
          activeFilter={activeFilter}
          onAutoArrange={autoArrange}
        />
      )}

      {/* Zoom controls (bottom-right, above mini-map) */}
      <div className="absolute bottom-[110px] right-4 z-40 bg-white/90 rounded-lg shadow-lg border border-black/10 flex flex-col items-center gap-0.5 p-1">
        <button onClick={zoomIn} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors" title="Zoom In">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <div className="text-[10px] font-bold text-black/40 text-center">{Math.round(camera.z * 100)}%</div>
        <button onClick={zoomOut} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors" title="Zoom Out">
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <div className="w-full h-px bg-black/5 my-0.5" />
        <button onClick={fitToContent} className="w-7 h-7 rounded flex items-center justify-center text-black/60 hover:bg-slate-100 transition-colors" title="Fit to Content">
          <Maximize className="w-3.5 h-3.5" />
        </button>
      </div>

      <MiniMap
        nodes={nodes}
        camera={camera}
        containerSize={{ w: osWindow.width, h: osWindow.height }}
        onNavigate={(x, y) => setCamera(prev => ({ ...prev, x, y }))}
      />

      {/* ─── Moodboard Mill Voting Overlay ───────────────────────────────── */}
      {voteMode && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-8">
          <button onClick={() => setVoteMode(false)} className="absolute top-6 right-6 text-white/50 hover:text-white bg-white/10 p-2 rounded-full transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2 mb-2">
              <Heart className="w-6 h-6 text-rose-500 fill-rose-500" /> Moodboard Mill
            </h2>
            <p className="text-white/50 text-sm max-w-md">Client Voting Mode: Approve or reject items to generate a precise taste profile.</p>
          </div>
          {nodes.filter(n => n.type === 'image' || n.type === 'embed').length > 0 ? (
            currentVoteIndex < nodes.filter(n => n.type === 'image' || n.type === 'embed').length ? (
              <div className="relative w-full max-w-sm aspect-[3/4] bg-[#111] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col items-center justify-center group">
                <div className="absolute inset-0 p-4 flex items-center justify-center bg-black/50 pointer-events-none">
                  {(() => {
                    const voteNodes = nodes.filter(n => n.type === 'image' || n.type === 'embed');
                    const node = voteNodes[currentVoteIndex]!;
                    if (node.type === 'image') return <BlobMedia content={node.content} type="image" className="max-w-full max-h-full object-contain rounded" />;
                    return <div className="text-white/50 bg-black/50 p-4 rounded text-center">Video/Embed Item<br/><span className="text-xs break-all">{node.content}</span></div>;
                  })()}
                </div>
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 px-6">
                  <button onClick={() => setCurrentVoteIndex(c => c + 1)} className="w-16 h-16 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white flex items-center justify-center hover:bg-rose-500 hover:border-rose-500 transition-all shadow-xl">
                    <XIcon className="w-8 h-8" />
                  </button>
                  <button onClick={() => {
                    const voteNodes = nodes.filter(n => n.type === 'image' || n.type === 'embed');
                    if (voteNodes[currentVoteIndex]) addNodeReaction(voteNodes[currentVoteIndex].id, '❤️');
                    setCurrentVoteIndex(c => c + 1);
                  }} className="w-16 h-16 rounded-full bg-white/10 backdrop-blur border border-white/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:border-emerald-500 hover:text-white transition-all shadow-xl">
                    <Heart className="w-8 h-8 fill-current" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center bg-white/5 border border-white/10 p-8 rounded-2xl max-w-md w-full">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Voting Complete</h3>
                <p className="text-white/60 text-sm mb-6">Taste profile generated. Approved items have ❤️ reactions.</p>
                <button onClick={() => setVoteMode(false)} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg transition-colors">Return to Canvas</button>
              </div>
            )
          ) : (
            <div className="text-center text-white/50 bg-white/5 border border-white/10 p-8 rounded-2xl">Add images or media to start voting.</div>
          )}
        </div>
      )}

      {/* ─── Campaign Link Modal ──────────────────────────────────────────── */}
      {showCampaignLink && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center" onClick={() => setShowCampaignLink(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-blue-500" /> Link to Campaign Lab
            </h3>
            <p className="text-xs text-black/50 mb-4">Enter a Campaign Lab page ID to link this item.</p>
            <input
              className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 mb-3"
              placeholder="Page ID or name..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  linkToCampaign(showCampaignLink, e.currentTarget.value.trim());
                }
              }}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowCampaignLink(null)} className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button onClick={() => {
                const input = document.querySelector('input[placeholder="Page ID or name..."]') as HTMLInputElement;
                if (input?.value.trim()) linkToCampaign(showCampaignLink, input.value.trim());
              }} className="px-3 py-1.5 text-xs bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors">Link</button>
            </div>
            <div className="mt-3 text-[10px] text-black/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Opens in Campaign Lab when clicked
            </div>
          </div>
        </div>
      )}

      {/* Sync Prompt Banner for large files */}
      {syncPromptFile && (
        <SyncPromptBanner
          fileName={syncPromptFile.name}
          fileSize={syncPromptFile.size}
          fileType={syncPromptFile.type}
          onDismiss={() => setSyncPromptFile(null)}
          onKeepLocal={() => setSyncPromptFile(null)}
        />
      )}

      {/* Add URL Prompt */}
      <OSPrompt
        open={showAddUrl}
        onClose={() => setShowAddUrl(false)}
        onSubmit={(url) => { if (url) processUrl(url); }}
        title="Add Link"
        placeholder="Enter a URL (YouTube, Instagram, Pinterest, Image, etc.)"
      />
    </div>
  );
}

export default Moodboard;
