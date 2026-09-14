'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ZoomIn, ZoomOut, RotateCcw, RotateCw, Maximize2, Minimize2, Download,
  Info, Image as ImageIcon, LayoutGrid, FlipHorizontal, Sparkles,
  ChevronLeft, ChevronRight, Monitor
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FS } from '@/lib/fs';
import { BrowserClipService } from '@/lib/services/browser-clip.service';
import { useThemeStore } from '@/lib/stores/theme.store';

export function ImageViewerApp({ window: osWindow }: { window: any }) {
  const fileData = osWindow?.data || {};
  const initialUrl = fileData.content || fileData.url || fileData.fileId || fileData.path || null;
  const [imageUrl, setImageUrl] = useState<string | null>(initialUrl);
  const [fileName, setFileName] = useState<string>(fileData.name || osWindow?.title || 'Image Preview');
  const [fileSize, setFileSize] = useState<string>('Unknown');
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [flipped, setFlipped] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [loading, setLoading] = useState<boolean>(true);

  // Sibling image navigation
  const [siblingImages, setSiblingImages] = useState<string[]>([]);
  const [currentSiblingIndex, setCurrentSiblingIndex] = useState<number>(0);
  const setWallpaper = useThemeStore((s) => s.setWallpaper);

  useEffect(() => {
    async function loadSiblings() {
      const currentPath = fileData.fileId || fileData.path;
      if (!currentPath) return;

      try {
        const parts = currentPath.split('/');
        const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
        const items = await FS.readDir(dir);
        const imgExts = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.bmp'];
        const images = items
          .filter(item => !item.isFolder && imgExts.some(ext => item.name.toLowerCase().endsWith(ext)))
          .map(item => dir ? `${dir}/${item.name}` : item.name);

        if (images.length > 0) {
          setSiblingImages(images);
          const idx = images.indexOf(currentPath);
          setCurrentSiblingIndex(idx !== -1 ? idx : 0);
        }
      } catch (err) {
        console.warn('Failed to load sibling images:', err);
      }
    }
    loadSiblings();
  }, [fileData.fileId, fileData.path]);

  const loadSpecificImage = async (pathOrUrl: string) => {
    setLoading(true);
    setZoom(1);
    setRotation(0);
    setFlipped(false);
    try {
      if (pathOrUrl.startsWith('http') || pathOrUrl.startsWith('blob:')) {
        setImageUrl(pathOrUrl);
        setFileName(pathOrUrl.split('/').pop() || 'Image Preview');
      } else {
        const file = await FS.read(pathOrUrl);
        if (file?.content) {
          setImageUrl(file.content);
          setFileName(pathOrUrl.split('/').pop() || 'Image Preview');
          if (file.size) setFileSize(`${(file.size / 1024).toFixed(1)} KB`);
        }
      }
    } catch (err) {
      console.error('Failed to load image into viewer:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadImage() {
      setLoading(true);
      try {
        const pathOrId = fileData.fileId || fileData.path;
        if (pathOrId && !fileData.url) {
          const file = await FS.read(pathOrId);
          if (file?.content) {
            setImageUrl(file.content);
            if (file.size) setFileSize(`${(file.size / 1024).toFixed(1)} KB`);
          }
        } else if (fileData.url) {
          setImageUrl(fileData.url);
        } else if (fileData.content) {
          setImageUrl(fileData.content);
        }
      } catch (err) {
        console.error('Failed to load image into viewer:', err);
      } finally {
        setLoading(false);
      }
    }
    loadImage();
  }, [fileData]);

  const navigateSibling = (direction: 'prev' | 'next') => {
    if (siblingImages.length <= 1) return;
    const newIdx = direction === 'next'
      ? (currentSiblingIndex + 1) % siblingImages.length
      : (currentSiblingIndex - 1 + siblingImages.length) % siblingImages.length;
    setCurrentSiblingIndex(newIdx);
    const targetPath = siblingImages[newIdx]!;
    loadSpecificImage(targetPath);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        navigateSibling('prev');
      } else if (e.key === 'ArrowRight') {
        navigateSibling('next');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [siblingImages, currentSiblingIndex]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.25));
  const handleReset = () => { setZoom(1); setRotation(0); setFlipped(false); };
  const handleRotateLeft = () => setRotation((r) => r - 90);
  const handleRotateRight = () => setRotation((r) => r + 90);
  const handleFlip = () => setFlipped((f) => !f);

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = fileName;
    a.click();
  };

  const handleSetWallpaper = () => {
    if (!imageUrl) return;
    setWallpaper(imageUrl);
    window.dispatchEvent(new CustomEvent('os:notify', {
      detail: { title: 'Wallpaper Updated', description: `Set ${fileName} as desktop wallpaper`, type: 'success' },
    }));
  };

  const handleSendToMoodboard = () => {
    if (!imageUrl) return;
    BrowserClipService.clipImage(imageUrl, fileName, 'Image Viewer');
    window.dispatchEvent(new CustomEvent('os:notify', {
      detail: { title: 'Sent to Moodboard', description: `Added ${fileName} to Moodboard Canvas`, type: 'success' },
    }));
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0c0c0e] text-white font-sans relative overflow-hidden select-none">
      {/* Top Header / Control Bar */}
      <div className="h-12 border-b border-white/10 bg-black/40 backdrop-blur-xl px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
            <ImageIcon className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold tracking-wide truncate">{fileName}</span>
          {dimensions.width > 0 && (
            <span className="text-[10px] text-white/40 px-2 py-0.5 rounded bg-white/5 font-mono">
              {dimensions.width} × {dimensions.height}
            </span>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          {siblingImages.length > 1 && (
            <>
              <button onClick={() => navigateSibling('prev')} className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors" title="Previous Image (Left Arrow)">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono px-1 text-white/60">{currentSiblingIndex + 1}/{siblingImages.length}</span>
              <button onClick={() => navigateSibling('next')} className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors" title="Next Image (Right Arrow)">
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-white/10 mx-1" />
            </>
          )}

          <button onClick={handleZoomOut} className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono w-12 text-center text-white/80">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-white/10 mx-1" />

          <button onClick={handleRotateLeft} className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors" title="Rotate Counter-Clockwise">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={handleRotateRight} className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors" title="Rotate Clockwise">
            <RotateCw className="w-4 h-4" />
          </button>
          <button onClick={handleFlip} className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors" title="Flip Horizontal">
            <FlipHorizontal className="w-4 h-4" />
          </button>
          <button onClick={handleReset} className="px-2 py-1 hover:bg-white/10 rounded-lg text-[11px] font-medium text-white/70 hover:text-white transition-colors">
            Reset
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSetWallpaper}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 transition-all text-xs font-medium"
            title="Set as Desktop Wallpaper"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Set Wallpaper</span>
          </button>

          <button
            onClick={handleSendToMoodboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 transition-all text-xs font-medium"
            title="Send to Moodboard"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Moodboard</span>
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
            title="Download Image"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              showDetails ? "bg-blue-500 text-white" : "hover:bg-white/10 text-white/70 hover:text-white"
            )}
            title="File Details"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Preview Workspace */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-[radial-gradient(#1e1e24_1px,transparent_1px)] [background-size:16px_16px] group">
        {siblingImages.length > 1 && (
          <>
            <button
              onClick={() => navigateSibling('prev')}
              className="absolute left-4 z-30 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white/70 hover:text-white border border-white/15 backdrop-blur-xl opacity-0 group-hover:opacity-100 transition-all shadow-xl"
              title="Previous Image (Left Arrow)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigateSibling('next')}
              className="absolute right-4 z-30 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white/70 hover:text-white border border-white/15 backdrop-blur-xl opacity-0 group-hover:opacity-100 transition-all shadow-xl"
              title="Next Image (Right Arrow)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
        {loading ? (
          <div className="flex flex-col items-center gap-2 text-white/40">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Loading image...</span>
          </div>
        ) : imageUrl ? (
          <div
            className="transition-transform duration-200 ease-out flex items-center justify-center max-w-full max-h-full p-4"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${flipped ? -1 : 1})`,
            }}
          >
            <img
              src={imageUrl}
              alt={fileName}
              onLoad={handleImageLoad}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl pointer-events-auto"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-white/40">
            <ImageIcon className="w-12 h-12 stroke-[1]" />
            <span className="text-xs font-medium">No image loaded</span>
          </div>
        )}

        {/* File Info Overlay Drawer */}
        {showDetails && (
          <div className="absolute top-4 right-4 w-64 bg-[#141416]/90 backdrop-blur-2xl border border-white/10 rounded-xl p-4 shadow-2xl text-xs space-y-3 z-30 animate-in fade-in slide-in-from-right-4 duration-200">
            <h3 className="font-semibold text-white/90 border-b border-white/10 pb-2">Image Information</h3>
            <div className="space-y-2 text-white/70">
              <div>
                <span className="text-white/40 block text-[10px] uppercase tracking-wider">File Name</span>
                <span className="font-mono break-all">{fileName}</span>
              </div>
              {dimensions.width > 0 && (
                <div>
                  <span className="text-white/40 block text-[10px] uppercase tracking-wider">Resolution</span>
                  <span className="font-mono">{dimensions.width} × {dimensions.height} px</span>
                </div>
              )}
              {fileSize && (
                <div>
                  <span className="text-white/40 block text-[10px] uppercase tracking-wider">File Size</span>
                  <span className="font-mono">{fileSize}</span>
                </div>
              )}
              {fileData.path && (
                <div>
                  <span className="text-white/40 block text-[10px] uppercase tracking-wider">Storage Location</span>
                  <span className="font-mono break-all">{fileData.path}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
