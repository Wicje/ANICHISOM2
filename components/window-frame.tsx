'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, useDragControls, useReducedMotion } from 'motion/react';
import { OSWindow } from '@/lib/os-context';
import { useWindowStore } from '@/lib/stores/window.store';
import { useThemeStore } from '@/lib/stores/theme.store';
import { X, Minus, Maximize2, Square, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFileLockManager } from '@/lib/file-lock-manager';

interface WindowFrameProps {
  osWindow: OSWindow;
  children: React.ReactNode;
}

export function WindowFrame({ osWindow, children }: WindowFrameProps) {
  const { id, title, isMaximized, isMinimized, zIndex, x, y, width, height } = osWindow;
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const maximizeWindow = useWindowStore((s) => s.maximizeWindow);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const updateWindowDimensions = useWindowStore((s) => s.updateWindowDimensions);
  const highestZIndex = useWindowStore((s) => s.highestZIndex);
  const performanceMode = useThemeStore((s) => s.performanceMode);
  const dragControls = useDragControls();
  const shouldReduceMotion = useReducedMotion();

  const windowRef = useRef<HTMLDivElement>(null);
  const resizeHandlers = useRef<{ move?: (e: PointerEvent) => void, up?: () => void }>({});
  
  const [isResizing, setIsResizing] = useState(false);
  const [localSize, setLocalSize] = useState({ w: width, h: height });
  const [localPosition, setLocalPosition] = useState({ x, y });
  const [isFileLocked, setIsFileLocked] = useState(false);
  const [lockedByUser, setLockedByUser] = useState<string | null>(null);

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

  if (isMinimized) {
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

  const activeShadow = performanceMode === 'heavy'
    ? '0 4px 40px rgba(0,88,188,0.08), 0 0 0 1px rgba(128,128,128,0.08)'
    : '0 8px 32px rgba(0,0,0,0.12)';

  const inactiveShadow = performanceMode === 'heavy'
    ? '0 2px 20px rgba(0,0,0,0.08)'
    : '0 4px 16px rgba(0,0,0,0.08)';

  return (
    <motion.div
      ref={windowRef}
      role="dialog"
      aria-label={title}
      initial={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: 1,
        width: isMaximized ? '100vw' : currentWidth,
        height: isMaximized ? 'calc(100vh - 32px)' : currentHeight,
        x: isMaximized ? 0 : currentX,
        y: isMaximized ? 32 : currentY,
        transition: isResizing || shouldReduceMotion ? { duration: 0 } : {
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

        setLocalPosition({ x: newX, y: newY });
        updateWindowDimensions(id, newX, newY, newWidth, newHeight);
      }}
      style={{ zIndex }}
      onPointerDown={() => focusWindow(id)}
      className="absolute top-0 left-0 rounded-xl flex flex-col pointer-events-auto border transition-colors duration-200 overflow-hidden contain-window"
    >
      {/* Window glass background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: isActive ? 'var(--os-glass-bg)' : 'var(--os-glass-bg)',
          backdropFilter: performanceMode === 'heavy'
            ? (isActive ? 'blur(50px) saturate(200%)' : 'blur(40px) saturate(180%)')
            : 'none',
          borderColor: isActive ? 'var(--os-glass-border)' : 'var(--os-border)',
          borderWidth: '1px',
          borderStyle: 'solid',
          boxShadow: isActive ? activeShadow : inactiveShadow,
          borderRadius: 'inherit',
        }}
      />

      {/* Window Header */}
      <div 
        className="h-8 flex items-center justify-between px-3 shrink-0 rounded-t-xl"
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
            onClick={(e) => { e.stopPropagation(); closeWindow(id); }}
            className="w-3 h-3 rounded-full transition-colors flex items-center justify-center group"
            style={{ background: '#FF5F57' }}
          >
            <X className="w-2 h-2 opacity-0 group-hover:opacity-100 text-black" aria-hidden="true" />
          </button>
          <button
            aria-label="Minimize window"
            onClick={(e) => { e.stopPropagation(); minimizeWindow(id); }}
            className="w-3 h-3 rounded-full transition-colors flex items-center justify-center group"
            style={{ background: '#FEB429' }}
          >
            <Minus className="w-2 h-2 opacity-0 group-hover:opacity-100 text-black" aria-hidden="true" />
          </button>
          <button
            aria-label="Maximize window"
            onClick={(e) => { e.stopPropagation(); maximizeWindow(id); }}
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
      <div className="flex-1 overflow-hidden relative break-words" style={{ background: 'var(--os-surface)' }}>
        {children}
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
    </motion.div>
  );
}
