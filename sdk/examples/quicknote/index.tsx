/**
 * QuickNote — Example ContinuaOS Plugin
 * 
 * A simple note-taking app that demonstrates:
 * - App registration
 * - Context Layer read/write
 * - Filesystem operations
 * - Modal dialogs
 * - Notifications
 */

import { registerApp } from 'continuaos-sdk';
import type { AppManifest, AppProps } from 'continuaos-sdk';

const manifest: AppManifest = {
  id: 'quicknote',
  title: 'QuickNote',
  description: 'A simple note-taking app for ContinuaOS',
  version: '1.0.0',
  author: 'ContinuaOS Team',
  category: 'productivity',
  icon: 'FileText',
  roles: ['user', 'admin'],
  size: { width: 600, height: 400 },
  tags: ['notes', 'text', 'productivity'],
};

function QuickNote({ context, focused }: AppProps) {
  const [notes, setNotes] = React.useState<Array<{ id: string; title: string; content: string }>>([]);
  const [selectedNote, setSelectedNote] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load notes from Context Layer on mount
  React.useEffect(() => {
    async function loadNotes() {
      const data = await context.readDomain('quicknote');
      if (data && Array.isArray(data.notes)) {
        setNotes(data.notes);
      }
      setIsLoading(false);
    }
    loadNotes();
  }, []);

  // Save notes to Context Layer on change
  const saveNotes = async (newNotes: typeof notes) => {
    setNotes(newNotes);
    await context.writeDomain('quicknote', { notes: newNotes });
  };

  const addNote = async () => {
    const id = crypto.randomUUID();
    const newNote = { id, title: 'New Note', content: '' };
    await saveNotes([...notes, newNote]);
    setSelectedNote(id);
  };

  const deleteNote = async (id: string) => {
    await saveNotes(notes.filter(n => n.id !== id));
    if (selectedNote === id) setSelectedNote(null);
  };

  const updateNote = async (id: string, updates: Partial<typeof notes[0]>) => {
    await saveNotes(notes.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  return (
    <div className="flex h-full bg-[var(--os-surface)] text-[var(--os-text)]">
      {/* Sidebar */}
      <div className="w-48 border-r border-[var(--os-border)] p-2 flex flex-col gap-1">
        <button
          onClick={addNote}
          className="w-full px-3 py-1.5 rounded bg-[var(--os-primary)] text-white text-sm hover:opacity-90"
        >
          + New Note
        </button>
        <div className="flex-1 overflow-y-auto mt-2">
          {notes.map(note => (
            <div
              key={note.id}
              onClick={() => setSelectedNote(note.id)}
              className={`px-3 py-2 rounded cursor-pointer text-sm ${
                selectedNote === note.id
                  ? 'bg-[var(--os-hover)]'
                  : 'hover:bg-[var(--os-hover)]'
              }`}
            >
              {note.title || 'Untitled'}
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <>
            <input
              type="text"
              value={notes.find(n => n.id === selectedNote)?.title || ''}
              onChange={e => updateNote(selectedNote, { title: e.target.value })}
              className="px-4 py-2 border-b border-[var(--os-border)] bg-transparent font-medium"
              placeholder="Note title..."
            />
            <textarea
              value={notes.find(n => n.id === selectedNote)?.content || ''}
              onChange={e => updateNote(selectedNote, { content: e.target.value })}
              className="flex-1 px-4 py-3 bg-transparent resize-none focus:outline-none"
              placeholder="Start writing..."
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--os-text-muted)]">
            Select a note or create a new one
          </div>
        )}
      </div>
    </div>
  );
}

registerApp(manifest, QuickNote);
