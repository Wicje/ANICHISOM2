'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, useDragControls, useReducedMotion } from 'motion/react';
import { OSWindow } from '@/lib/os-context';
import { useWindowActions } from '@/lib/hooks/use-window-actions';
import { useThemeStore } from '@/lib/stores/theme.store';
import { useFocusStore } from '@/lib/stores/focus.store';
import { X, Minus, Maximize2, Square, Lock } from 'lucide-react';
import { getFileLockManager } from '@/lib/file-lock-manager';
import { audioSystem } from '@/lib/services/audio-engine';
import { ErrorBoundary } from '@/components/error-boundary';

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
  const [snapPreview, setSnapPreview] = useState<'left' | 'right' | 'top' | null>(null);

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
        const pointerMargin = 20;
        if (pointerY < pointerMargin) setSnapPreview('top');
        else if (pointerX < pointerMargin) setSnapPreview('left');
        else if (pointerX > screenW - pointerMargin) setSnapPreview('right');
        else setSnapPreview(null);
      }}
      onDragEnd={(e, info) => {
        let newX = currentX + info.offset.x;
        let newY = currentY + info.offset.y;
        let newWidth = currentWidth;
        let newHeight = currentHeight;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;
        const headerSpace = 32;
        const pointerX = info.point.x;
        const pointerY = info.point.y;
        const pointerMargin = 20;

        if (aeroSnap) {
          if (pointerY < pointerMargin) {
            if (!isMaximized) maximizeWindow(id);
            return;
          }
          if (pointerX < pointerMargin) {
            newX = 0;
            newY = headerSpace;
            newWidth = screenW / 2;
            newHeight = screenH - headerSpace;
          } else if (pointerX > screenW - pointerMargin) {
            newX = screenW / 2;
            newY = headerSpace;
            newWidth = screenW / 2;
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
        className={`h-9 flex items-center justify-between px-3.5 shrink-0 ${isMaximized ? 'rounded-none' : 'rounded-t-3xl'}`}
        style={{ background: isActive ? 'var(--os-hover)' : 'transparent' }}
        onPointerDown={(e) => {
           focusWindow(id);
           dragControls.start(e);
        }}
        onDoubleClick={() => maximizeWindow(id)}
      >
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
          <button
            aria-label="Maximize window"
            onClick={(e) => { e.stopPropagation(); audioSystem.playClick(); maximizeWindow(id); }}
            className="w-3 h-3 rounded-full transition-colors flex items-center justify-center group"
            style={{ background: '#28C840' }}
          >
            <Maximize2 className="w-2 h-2 opacity-0 group-hover:opacity-100 text-black shrink-0" aria-hidden="true" />
          </button>
        </div>
        
        <div className="font-display text-xs tracking-wider uppercase select-none pointer-events-none flex items-center gap-2" style={{ color: 'var(--os-text-muted)' }}>
          {title}
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

      {/* Snap Preview Overlay */}
      {snapPreview && (
        <div
          className="absolute z-[200] rounded-xl border-2 border-blue-400/60 bg-blue-400/10 pointer-events-none transition-all duration-150"
          style={{
            ...(snapPreview === 'left' ? { left: 0, top: 0, width: '50%', height: '100%' } : {}),
            ...(snapPreview === 'right' ? { right: 0, top: 0, width: '50%', height: '100%' } : {}),
            ...(snapPreview === 'top' ? { left: 0, top: 0, width: '100%', height: '100%' } : {}),
          }}
        />
      )}
    </motion.div>
  );
}
