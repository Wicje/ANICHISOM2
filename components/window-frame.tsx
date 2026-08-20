'use client';

import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls, useReducedMotion } from 'motion/react';
import { OSWindow } from '@/lib/os-context';
import { useWindowActions } from '@/lib/hooks/use-window-actions';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useFocusStore } from '@/lib/stores/focus.store';
import { X, Minus, Maximize2, Square, Lock } from 'lucide-react';
import { getFileLockManager } from '@/lib/file-lock-manager';
import { audioSystem } from '@/lib/services/audio-engine';
import { ErrorBoundary } from '@/components/error-boundary';
import { AppIconInline } from '@/components/ui/app-icon';
import { APP_MANIFEST } from '@/lib/app-manifest';

type SnapPreviewMode = 'left' | 'right' | 'top' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface WindowFrameProps {
  osWindow: OSWindow;
  children: React.ReactNode;
}

export function WindowFrame({ osWindow, children }: WindowFrameProps) {
  const { id, title, isMaximized, isMinimized, zIndex, x, y, width, height } = osWindow;
  const { closeWindow, minimizeWindow, maximizeWindow, focusWindow, updateWindowDimensions, highestZIndex } = useWindowActions();
  const performanceMode = useThemeStore((s) => s.performanceMode);
  const aeroSnap = useThemeStore((s) => s.aeroSnap);
  const animationsEnabled = useThemeStore((s) => s.animationsEnabled);
  const glassmorphism = useThemeStore((s) => s.glassmorphism);
  const focusEnabled = useFocusStore((s) => s.enabled);
  const dragControls = useDragControls();
  const shouldReduceMotion = useReducedMotion();

  const windowRef = useRef<HTMLDivElement>(null);
  const resizeHandlers = useRef<{ move?: (e: PointerEvent) => void, up?: () => void }>({});
  
  const [isResizing, setIsResizing] = useState(false);
  const [localSize, setLocalSize] = useState({ w: width, h: height });
  const [localPosition, setLocalPosition] = useState({ x, y });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isFileLocked, setIsFileLocked] = useState(false);
  const [lockedByUser, setLockedByUser] = useState<string | null>(null);
  const [isMinimizing, setIsMinimizing] = useState(false);
  const [snapPreview, setSnapPreview] = useState<SnapPreviewMode | null>(null);
  const [showTilingMenu, setShowTilingMenu] = useState(false);
  const tilingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const applyTile = (mode: SnapPreviewMode | 'center' | 'fullscreen') => {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const headerSpace = 32;
    const halfW = screenW / 2;
    const halfH = (screenH - headerSpace) / 2;

    if (mode === 'fullscreen') {
      maximizeWindow(id);
    } else if (mode === 'center') {
      if (isMaximized) maximizeWindow(id);
      const w = Math.min(1000, screenW * 0.75);
      const h = Math.min(650, (screenH - headerSpace) * 0.8);
      const newX = (screenW - w) / 2;
      const newY = headerSpace + ((screenH - headerSpace - h) / 2);
      setLocalPosition({ x: newX, y: newY });
      setLocalSize({ w, h });
      updateWindowDimensions(id, newX, newY, w, h);
    } else if (mode === 'left') {
      if (isMaximized) maximizeWindow(id);
      setLocalPosition({ x: 0, y: headerSpace });
      setLocalSize({ w: halfW, h: screenH - headerSpace });
      updateWindowDimensions(id, 0, headerSpace, halfW, screenH - headerSpace);
    } else if (mode === 'right') {
      if (isMaximized) maximizeWindow(id);
      setLocalPosition({ x: halfW, y: headerSpace });
      setLocalSize({ w: halfW, h: screenH - headerSpace });
      updateWindowDimensions(id, halfW, headerSpace, halfW, screenH - headerSpace);
    } else if (mode === 'top') {
      if (isMaximized) maximizeWindow(id);
      setLocalPosition({ x: 0, y: headerSpace });
      setLocalSize({ w: screenW, h: halfH });
      updateWindowDimensions(id, 0, headerSpace, screenW, halfH);
    } else if (mode === 'top-left') {
      if (isMaximized) maximizeWindow(id);
      setLocalPosition({ x: 0, y: headerSpace });
      setLocalSize({ w: halfW, h: halfH });
      updateWindowDimensions(id, 0, headerSpace, halfW, halfH);
    } else if (mode === 'top-right') {
      if (isMaximized) maximizeWindow(id);
      setLocalPosition({ x: halfW, y: headerSpace });
      setLocalSize({ w: halfW, h: halfH });
      updateWindowDimensions(id, halfW, headerSpace, halfW, halfH);
    } else if (mode === 'bottom-left') {
      if (isMaximized) maximizeWindow(id);
      setLocalPosition({ x: 0, y: headerSpace + halfH });
      setLocalSize({ w: halfW, h: halfH });
      updateWindowDimensions(id, 0, headerSpace + halfH, halfW, halfH);
    } else if (mode === 'bottom-right') {
      if (isMaximized) maximizeWindow(id);
      setLocalPosition({ x: halfW, y: headerSpace + halfH });
      setLocalSize({ w: halfW, h: halfH });
      updateWindowDimensions(id, halfW, headerSpace + halfH, halfW, halfH);
    }
    setShowTilingMenu(false);
    setSnapPreview(null);
  };

  useEffect(() => {
    if (!osWindow.data?.fileId) return;
    const fileLockManager = getFileLockManager();
    if (!fileLockManager) return;
    const lockStatus = fileLockManager.isLocked(osWindow.data.fileId);
    Promise.resolve().then(() => {
      setIsFileLocked(lockStatus.locked);
      setLockedByUser(lockStatus.userId || null);
    });
  }, [osWindow.data?.fileId]);

  useEffect(() => {
    const handlers = resizeHandlers.current;
    return () => {
      if (handlers.move) document.removeEventListener('pointermove', handlers.move);
      if (handlers.up) document.removeEventListener('pointerup', handlers.up);
    };
  }, []);

  const currentWidth = isResizing ? localSize.w : width;
  const currentHeight = isResizing ? localSize.h : height;
  const currentX = isResizing ? localPosition.x : x;
  const currentY = isResizing ? localPosition.y : y;

  const isActive = zIndex >= highestZIndex;
  const dimmed = focusEnabled && !isActive;

  if (isMinimized && !isMinimizing) {
    return <div style={{ display: 'none' }}>{children}</div>;
  }

  const startResize = (e: React.PointerEvent, edges: { top?: boolean; right?: boolean; bottom?: boolean; left?: boolean }) => {
    e.stopPropagation();
    if (isMaximized) return;
    setIsResizing(true);
    const startW = currentWidth;
    const startH = currentHeight;
    const startXPos = currentX;
    const startYPos = currentY;
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    let newW = startW;
    let newH = startH;
    let newXPos = startXPos;
    let newYPos = startYPos;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      let deltaX = moveEvent.clientX - startMouseX;
      let deltaY = moveEvent.clientY - startMouseY;

      if (edges.right) newW = Math.max(300, startW + deltaX);
      if (edges.bottom) newH = Math.max(200, startH + deltaY);
      if (edges.left) {
        newW = Math.max(300, startW - deltaX);
        newXPos = startW - deltaX >= 300 ? startXPos + deltaX : startXPos + startW - 300;
      }
      if (edges.top) {
        newH = Math.max(200, startH - deltaY);
        newYPos = startH - deltaY >= 200 ? startYPos + deltaY : startYPos + startH - 200;
      }

      setLocalSize({ w: newW, h: newH });
      setLocalPosition({ x: newXPos, y: newYPos });
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      if (resizeHandlers.current.move) document.removeEventListener('pointermove', resizeHandlers.current.move);
      if (resizeHandlers.current.up) document.removeEventListener('pointerup', resizeHandlers.current.up);
      resizeHandlers.current.move = undefined;
      resizeHandlers.current.up = undefined;
      updateWindowDimensions(id, newXPos, newYPos, newW, newH);
    };

    resizeHandlers.current.move = handlePointerMove;
    resizeHandlers.current.up = handlePointerUp;
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  // Dynamic Depth: Higher z-index = softer, larger shadow
  const shadowDepth = Math.min(zIndex, 50);
  const activeShadow = performanceMode === 'heavy'
    ? `0 ${shadowDepth}px ${shadowDepth * 3}px rgba(0,0,0,0.25), 0 0 0 1px rgba(16,244,160,0.12), 0 0 20px rgba(16,244,160,0.04)`
    : `0 ${shadowDepth}px ${shadowDepth * 2}px rgba(0,0,0,0.15), 0 0 0 1px rgba(16,244,160,0.08)`;

  const inactiveShadow = performanceMode === 'heavy'
    ? `0 ${shadowDepth / 2}px ${shadowDepth}px rgba(0,0,0,0.15)`
    : `0 ${shadowDepth / 2}px ${shadowDepth}px rgba(0,0,0,0.1)`;

  return (
    <motion.div
      ref={windowRef}
      role="dialog"
      aria-label={title}
      initial={animationsEnabled ? { opacity: 0, scale: 0.95 } : { opacity: 1, scale: 1 }}
      animate={isMinimizing
        ? animationsEnabled
          ? { opacity: 0, scale: 0.1, y: window.innerHeight - 40, x: window.innerWidth / 2 - 40, borderRadius: '50%', filter: 'blur(8px)', transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }
          : { opacity: 0, scale: 1, transition: { duration: 0 } }
        : {
          opacity: dimmed ? 0.3 : 1,
          scale: 1,
          filter: dimmed ? 'blur(1px)' : 'blur(0px)',
          width: isMaximized ? '100vw' : currentWidth,
          height: isMaximized ? 'calc(100vh - 32px)' : currentHeight,
          x: isMaximized ? 0 : currentX,
          y: isMaximized ? 32 : currentY,
          borderRadius: isMaximized ? '0px' : '0.75rem',
          transition: isResizing || !animationsEnabled ? { duration: 0 } : {
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 0.8
          }
        }}
      drag={!isMaximized}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      onDrag={(e, info) => {
        if (!aeroSnap) { setSnapPreview(null); return; }
        const pointerX = info.point.x;
        const pointerY = info.point.y;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;
        const cornerMargin = 55;
        const edgeMargin = 35;

        // 4 Corner Quadrants
        if (pointerY < cornerMargin && pointerX < cornerMargin) {
          setSnapPreview('top-left');
        } else if (pointerY < cornerMargin && pointerX > screenW - cornerMargin) {
          setSnapPreview('top-right');
        } else if (pointerY > screenH - cornerMargin - 40 && pointerX < cornerMargin) {
          setSnapPreview('bottom-left');
        } else if (pointerY > screenH - cornerMargin - 40 && pointerX > screenW - cornerMargin) {
          setSnapPreview('bottom-right');
        } else if (pointerY < edgeMargin) {
          setSnapPreview('top');
        } else if (pointerX < edgeMargin) {
          setSnapPreview('left');
        } else if (pointerX > screenW - edgeMargin) {
          setSnapPreview('right');
        } else {
          setSnapPreview(null);
        }
      }}
      onDragEnd={(e, info) => {
        let newX = currentX + info.offset.x;
        let newY = currentY + info.offset.y;
        let newWidth = currentWidth;
        let newHeight = currentHeight;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;
        const headerSpace = 32;
        const halfW = screenW / 2;
        const halfH = (screenH - headerSpace) / 2;
        const pointerX = info.point.x;
        const pointerY = info.point.y;
        const cornerMargin = 55;
        const edgeMargin = 35;

        if (aeroSnap) {
          if (pointerY < cornerMargin && pointerX < cornerMargin) {
            newX = 0;
            newY = headerSpace;
            newWidth = halfW;
            newHeight = halfH;
          } else if (pointerY < cornerMargin && pointerX > screenW - cornerMargin) {
            newX = halfW;
            newY = headerSpace;
            newWidth = halfW;
            newHeight = halfH;
          } else if (pointerY > screenH - cornerMargin - 40 && pointerX < cornerMargin) {
            newX = 0;
            newY = headerSpace + halfH;
            newWidth = halfW;
            newHeight = halfH;
          } else if (pointerY > screenH - cornerMargin - 40 && pointerX > screenW - cornerMargin) {
            newX = halfW;
            newY = headerSpace + halfH;
            newWidth = halfW;
            newHeight = halfH;
          } else if (pointerY < edgeMargin) {
            if (!isMaximized) maximizeWindow(id);
            return;
          } else if (pointerX < edgeMargin) {
            newX = 0;
            newY = headerSpace;
            newWidth = halfW;
            newHeight = screenH - headerSpace;
          } else if (pointerX > screenW - edgeMargin) {
            newX = halfW;
            newY = headerSpace;
            newWidth = halfW;
            newHeight = screenH - headerSpace;
          }
        }

        setLocalPosition({ x: newX, y: newY });
        updateWindowDimensions(id, newX, newY, newWidth, newHeight);
        setSnapPreview(null);
      }}
      style={{ zIndex }}
      onPointerDown={() => focusWindow(id)}
      onPointerMove={(e) => {
        if (windowRef.current) {
          const rect = windowRef.current.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
      }}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      className="absolute top-0 left-0 flex flex-col pointer-events-auto border transition-colors duration-200 overflow-hidden contain-window rounded-3xl"
    >
      {/* Reveal Light Effect */}
      {isHovered && performanceMode === 'heavy' && (
        <div 
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{
            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.06), transparent 40%)`,
            zIndex: -1
          }}
        />
      )}
      
      {/* Window glass background */}
      <div
        className="absolute inset-0 -z-10 rounded-3xl"
        style={{
          background: isActive ? 'var(--os-glass-bg)' : 'var(--os-glass-bg)',
          backdropFilter: glassmorphism && performanceMode === 'heavy'
            ? (isActive ? 'blur(50px) saturate(200%)' : 'blur(40px) saturate(180%)')
            : 'none',
          borderColor: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)',
          borderWidth: '1px',
          borderStyle: 'solid',
          boxShadow: isActive ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : inactiveShadow,
          borderRadius: '1.5rem',
        }}
      />

      {/* Window Header */}
      <div 
        className={`h-9 flex items-center justify-between px-3.5 shrink-0 relative ${isMaximized ? 'rounded-none' : 'rounded-t-3xl'}`}
        style={{ background: isActive ? 'var(--os-hover)' : 'transparent' }}
        onPointerDown={(e) => {
           if (!id) return;
           try {
             focusWindow(id);
             dragControls.start(e);
           } catch { /* handle window closed mid-drag gracefully (Issue 61) */ }
        }}
        onDoubleClick={() => maximizeWindow(id)}
      >
        {isActive && (
          <div
            aria-hidden="true"
            className="absolute top-0 left-6 right-6 h-[2px] rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, var(--os-primary), transparent)',
              opacity: 0.7,
            }}
          />
        )}
        <div className="flex gap-2 items-center">
          {/* Semantic traffic light colors — always visible */}
          <button
            aria-label="Close window"
            onClick={(e) => { e.stopPropagation(); audioSystem.playWindowClose(); closeWindow(id); }}
            className="w-3 h-3 rounded-full transition-colors flex items-center justify-center group"
            style={{ background: '#FF5F57' }}
          >
            <X className="w-2 h-2 opacity-0 group-hover:opacity-100 text-black" aria-hidden="true" />
          </button>
          <button
            aria-label="Minimize window"
            onClick={(e) => {
              e.stopPropagation();
              if (animationsEnabled) audioSystem.playSwoosh();
              setIsMinimizing(true);
              setTimeout(() => {
                minimizeWindow(id);
                setIsMinimizing(false);
              }, animationsEnabled ? 200 : 0);
            }}
            className="w-3 h-3 rounded-full transition-colors flex items-center justify-center group"
            style={{ background: '#FEB429' }}
          >
            <Minus className="w-2 h-2 opacity-0 group-hover:opacity-100 text-black" aria-hidden="true" />
          </button>
          <div
            className="relative"
            onMouseEnter={() => {
              tilingTimeoutRef.current = setTimeout(() => setShowTilingMenu(true), 250);
            }}
            onMouseLeave={() => {
              if (tilingTimeoutRef.current) clearTimeout(tilingTimeoutRef.current);
              setShowTilingMenu(false);
              setSnapPreview(null);
            }}
          >
            <button
              aria-label="Maximize window"
              onClick={(e) => { e.stopPropagation(); audioSystem.playClick(); maximizeWindow(id); }}
              className="w-3 h-3 rounded-full transition-colors flex items-center justify-center group"
              style={{ background: '#28C840' }}
            >
              <Maximize2 className="w-2 h-2 opacity-0 group-hover:opacity-100 text-black shrink-0" aria-hidden="true" />
            </button>

            {/* macOS Sequoia Tiling Popover Menu */}
            {showTilingMenu && (
              <div
                className="absolute top-5 left-0 z-[9999] w-64 bg-[var(--os-glass-bg)] backdrop-blur-2xl border border-[var(--os-glass-border)] rounded-2xl shadow-2xl p-2.5 flex flex-col gap-2 pointer-events-auto select-none animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--os-text-muted)] px-2">Move & Resize (Sequoia Tiling)</div>
                
                {/* 2-Column Split View */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => applyTile('left')}
                    onMouseEnter={() => setSnapPreview('left')}
                    onMouseLeave={() => setSnapPreview(null)}
                    className="flex items-center gap-2 p-2 rounded-xl hover:bg-[var(--os-hover)] text-left text-xs text-[var(--os-text)] transition-colors"
                  >
                    <div className="w-5 h-4 border border-white/40 rounded flex overflow-hidden">
                      <div className="w-1/2 h-full bg-[var(--os-primary)]" />
                    </div>
                    <span>Left Half</span>
                  </button>
                  <button
                    onClick={() => applyTile('right')}
                    onMouseEnter={() => setSnapPreview('right')}
                    onMouseLeave={() => setSnapPreview(null)}
                    className="flex items-center gap-2 p-2 rounded-xl hover:bg-[var(--os-hover)] text-left text-xs text-[var(--os-text)] transition-colors"
                  >
                    <div className="w-5 h-4 border border-white/40 rounded flex overflow-hidden">
                      <div className="w-1/2 h-full ml-auto bg-[var(--os-primary)]" />
                    </div>
                    <span>Right Half</span>
                  </button>
                </div>

                {/* Quarters (Top-Left, Top-Right, Bottom-Left, Bottom-Right) */}
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--os-text-muted)] px-2 pt-1 border-t border-[var(--os-border)]">Quarters</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => applyTile('top-left')}
                    onMouseEnter={() => setSnapPreview('top-left')}
                    onMouseLeave={() => setSnapPreview(null)}
                    className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-[var(--os-hover)] text-left text-[11px] text-[var(--os-text)]"
                  >
                    <div className="w-4 h-3.5 border border-white/40 rounded flex flex-col overflow-hidden">
                      <div className="w-1/2 h-1/2 bg-[var(--os-primary)]" />
                    </div>
                    <span>Top-Left</span>
                  </button>
                  <button
                    onClick={() => applyTile('top-right')}
                    onMouseEnter={() => setSnapPreview('top-right')}
                    onMouseLeave={() => setSnapPreview(null)}
                    className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-[var(--os-hover)] text-left text-[11px] text-[var(--os-text)]"
                  >
                    <div className="w-4 h-3.5 border border-white/40 rounded flex flex-col overflow-hidden items-end">
                      <div className="w-1/2 h-1/2 bg-[var(--os-primary)]" />
                    </div>
                    <span>Top-Right</span>
                  </button>
                  <button
                    onClick={() => applyTile('bottom-left')}
                    onMouseEnter={() => setSnapPreview('bottom-left')}
                    onMouseLeave={() => setSnapPreview(null)}
                    className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-[var(--os-hover)] text-left text-[11px] text-[var(--os-text)]"
                  >
                    <div className="w-4 h-3.5 border border-white/40 rounded flex flex-col justify-end overflow-hidden">
                      <div className="w-1/2 h-1/2 bg-[var(--os-primary)]" />
                    </div>
                    <span>Bottom-Left</span>
                  </button>
                  <button
                    onClick={() => applyTile('bottom-right')}
                    onMouseEnter={() => setSnapPreview('bottom-right')}
                    onMouseLeave={() => setSnapPreview(null)}
                    className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-[var(--os-hover)] text-left text-[11px] text-[var(--os-text)]"
                  >
                    <div className="w-4 h-3.5 border border-white/40 rounded flex flex-col justify-end items-end overflow-hidden">
                      <div className="w-1/2 h-1/2 bg-[var(--os-primary)]" />
                    </div>
                    <span>Bottom-Right</span>
                  </button>
                </div>

                {/* Fill / Center */}
                <div className="border-t border-[var(--os-border)] pt-1 flex items-center justify-between">
                  <button
                    onClick={() => applyTile('center')}
                    className="px-2.5 py-1 rounded-lg hover:bg-[var(--os-hover)] text-xs text-[var(--os-text)] font-medium"
                  >
                    Center (80%)
                  </button>
                  <button
                    onClick={() => applyTile('fullscreen')}
                    className="px-2.5 py-1 rounded-lg hover:bg-[var(--os-hover)] text-xs text-[var(--os-primary)] font-semibold"
                  >
                    Fullscreen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="font-display text-xs tracking-wider uppercase select-none pointer-events-none flex items-center gap-2" style={{ color: 'var(--os-text-muted)' }}>
          {(() => {
            const entry = APP_MANIFEST.find((a) => a.id === osWindow.appId || a.id === id);
            return (
              <>
                <AppIconInline icon={entry?.icon} iconImage={entry?.iconImage} size={16} className="rounded" />
                <span>{title}</span>
              </>
            );
          })()}
          {isFileLocked && (
            <span title={`Locked by ${lockedByUser || 'another user'}`}>
              <Lock className="w-3 h-3" style={{ color: '#f59e0b' }} />
            </span>
          )}
        </div>
        
        <div className="w-[44px]" />
      </div>

      {/* Window Content */}
      <div className="flex-1 overflow-hidden relative break-words" style={{ background: 'transparent' }}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </div>
      
      {/* Edge & Corner Resizers */}
      {!isMaximized && (
        <>
          <div className="absolute top-0 left-2 right-2 h-2 cursor-n-resize z-50" onPointerDown={(e) => startResize(e, { top: true })} />
          <div className="absolute bottom-0 left-2 right-2 h-2 cursor-s-resize z-50" onPointerDown={(e) => startResize(e, { bottom: true })} />
          <div className="absolute top-2 bottom-2 left-0 w-2 cursor-w-resize z-50" onPointerDown={(e) => startResize(e, { left: true })} />
          <div className="absolute top-2 bottom-2 right-0 w-2 cursor-e-resize z-50" onPointerDown={(e) => startResize(e, { right: true })} />
          <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize z-50" onPointerDown={(e) => startResize(e, { top: true, left: true })} />
          <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize z-50" onPointerDown={(e) => startResize(e, { top: true, right: true })} />
          <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize z-50" onPointerDown={(e) => startResize(e, { bottom: true, left: true })} />
          <div 
            className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize flex items-end justify-end p-1.5 opacity-30 hover:opacity-100 z-50 rounded-tl-lg transition-opacity"
            style={{ background: 'var(--os-hover)' }}
            onPointerDown={(e) => startResize(e, { bottom: true, right: true })}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: 'var(--os-text-muted)' }}>
              <path d="M10 2V10H2" stroke="currentColor" strokeWidth="1" />
              <path d="M6 6V10H2" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>
        </>
      )}

      {/* Desktop Blueprint Ghost Overlay (HomeDockOS Style) */}
      {snapPreview && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none rounded-2xl border-2 border-emerald-400/60 bg-emerald-400/10 backdrop-blur-sm shadow-[0_0_30px_rgba(16,244,160,0.25)] transition-all duration-150 ease-out animate-pulse"
          style={{
            left: snapPreview === 'left' || snapPreview === 'top-left' || snapPreview === 'bottom-left' || snapPreview === 'top' ? 8 : (window.innerWidth / 2 + 4),
            top: snapPreview === 'top' || snapPreview === 'top-left' || snapPreview === 'top-right' || snapPreview === 'left' || snapPreview === 'right' ? 38 : (32 + (window.innerHeight - 32) / 2 + 4),
            width: snapPreview === 'top' ? 'calc(100vw - 16px)' : 'calc(50vw - 12px)',
            height: snapPreview === 'top' || snapPreview === 'left' || snapPreview === 'right' ? 'calc(100vh - 48px)' : 'calc(50vh - 28px)',
          }}
        />,
        document.body
      )}
    </motion.div>
  );
}
