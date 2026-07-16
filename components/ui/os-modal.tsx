'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

export interface OSModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Max width class, defaults to 'max-w-md' */
  maxWidth?: string;
  /** Show close X button, defaults to true */
  showClose?: boolean;
}

/**
 * Shared OS modal with focus trap, backdrop blur, Escape-to-close,
 * and enter/exit animations.
 */
export function OSModal({ open, onClose, title, children, maxWidth = 'max-w-md', showClose = true }: OSModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Focus trap
  useEffect(() => {
    if (!open) return;
    const content = contentRef.current;
    if (!content) return;

    const focusable = content.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      focusable.item(0)?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onPointerDown={(e) => {
            if (e.target === overlayRef.current) onClose();
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Content */}
          <motion.div
            ref={contentRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative ${maxWidth} w-full mx-4 glass-panel-active rounded-2xl shadow-2xl overflow-hidden`}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || showClose) && (
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--os-border)' }}>
                {title && (
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--os-text)' }}>{title}</h2>
                )}
                {showClose && (
                  <button
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-[var(--os-hover)] transition-colors ml-auto"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" style={{ color: 'var(--os-text-muted)' }} />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="px-6 py-4">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Prompt Modal (replaces window.prompt) ──────────────────────────────────

export interface OSPromptProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title?: string;
  placeholder?: string;
  defaultValue?: string;
  /** Input type, defaults to 'text' */
  type?: string;
}

export function OSPrompt({ open, onClose, onSubmit, title = 'Enter value', placeholder, defaultValue = '', type = 'text' }: OSPromptProps) {
  const [value, setValue] = React.useState(defaultValue);

  React.useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  return (
    <OSModal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <input
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-[var(--os-primary)]/30"
          style={{
            background: 'var(--os-surface-elevated)',
            borderColor: 'var(--os-border)',
            color: 'var(--os-text)',
          }}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSubmit(value);
              onClose();
            }
          }}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg transition-colors"
            style={{ color: 'var(--os-text-muted)' }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onSubmit(value); onClose(); }}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors"
            style={{ background: 'var(--os-primary)' }}
          >
            OK
          </button>
        </div>
      </div>
    </OSModal>
  );
}

// ─── Confirm Modal (replaces window.confirm) ────────────────────────────────

export interface OSConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  /** If true, confirm button is red/danger */
  danger?: boolean;
}

export function OSConfirm({ open, onClose, onConfirm, title = 'Confirm', message, confirmLabel = 'Confirm', danger = false }: OSConfirmProps) {
  return (
    <OSModal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm" style={{ color: 'var(--os-text-muted)' }}>{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg transition-colors"
            style={{ color: 'var(--os-text-muted)' }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors"
            style={{ background: danger ? 'var(--os-error, #ef4444)' : 'var(--os-primary)' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </OSModal>
  );
}
