'use client';

/**
 * CollaborativeEditor — TipTap editor with real-time collaboration.
 *
 * Uses Yjs for CRDT-based editing, y-websocket for sync,
 * and y-indexeddb for offline persistence.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { useCollaborativeDoc } from '@/lib/collab/use-collaborative-doc';
import { useCollabStatusStore } from '@/lib/stores/collab-status.store';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Code, List, ListOrdered, Quote, Minus,
  Users, Wifi, WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollaborativeEditorProps {
  /** Document/room ID for collaboration */
  documentId: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether collaboration is enabled */
  collaborative?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Read-only mode */
  readOnly?: boolean;
}

export default function CollaborativeEditor({
  documentId,
  placeholder = 'Start writing...',
  collaborative = true,
  className,
  readOnly = false,
}: CollaborativeEditorProps) {
  const { doc, connected, peerCount } = useCollaborativeDoc({
    roomId: documentId,
    enabled: collaborative,
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily,
      ...(collaborative
        ? [
            Collaboration.configure({
              document: doc,
            }),
          ]
        : []),
    ],
    content: '',
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3',
        'data-placeholder': placeholder,
      },
    },
  });

  // Set awareness user info when editor is ready
  useEffect(() => {
    if (!editor || !collaborative) return;
    // Could set user name/color here from auth store
  }, [editor, collaborative]);

  if (!editor) return null;

  return (
    <div className={cn('flex flex-col border border-[var(--os-border)] rounded-xl overflow-hidden bg-[var(--os-surface)]', className)}>
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[var(--os-border)] bg-[var(--os-surface)] flex-wrap">
          <ToolbarBtn
            icon={Bold}
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          />
          <ToolbarBtn
            icon={Italic}
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          />
          <ToolbarBtn
            icon={UnderlineIcon}
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline"
          />
          <ToolbarBtn
            icon={Strikethrough}
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          />
          <div className="w-px h-4 bg-[var(--os-border)] mx-1" />
          <ToolbarBtn
            icon={Code}
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Code"
          />
          <ToolbarBtn
            icon={Quote}
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Quote"
          />
          <div className="w-px h-4 bg-[var(--os-border)] mx-1" />
          <ToolbarBtn
            icon={List}
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          />
          <ToolbarBtn
            icon={ListOrdered}
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Ordered List"
          />
          <ToolbarBtn
            icon={Minus}
            active={false}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Divider"
          />

          {/* Collaboration status */}
          {collaborative && (
            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-[var(--os-text-muted)]">
              {connected ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <Users className="w-3 h-3" />
                  <span>{peerCount} peer{peerCount !== 1 ? 's' : ''}</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span>Offline</span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarBtn({
  icon: Icon,
  active,
  onClick,
  title,
}: {
  icon: React.FC<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'p-1 rounded transition-colors',
        active
          ? 'bg-[var(--os-primary)]/20 text-[var(--os-primary)]'
          : 'text-[var(--os-text-muted)] hover:text-[var(--os-text)] hover:bg-[var(--os-hover)]',
      )}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
