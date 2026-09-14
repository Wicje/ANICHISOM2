'use client';

import React, { useEffect, useState } from 'react';
import { useBooksStore, BookItem } from '@/lib/stores/books.store';
import { Plus, Trash2, BookOpen, X, Pencil } from 'lucide-react';

export function BooksCollection() {
  const { books, loaded, loadBooks, addBook, removeBook, updateBook } = useBooksStore();
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editProgress, setEditProgress] = useState(0);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  if (!loaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-gray-400 animate-pulse">Loading collection...</div>
      </div>
    );
  }

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const colors = ['#4A6FA5', '#2C2C2C', '#8B4513', '#D4A574', '#C4C4C4', '#556B2F', '#FF6347', '#2F4F4F', '#6B3FA0', '#1DB954'];
    addBook({
      title: newTitle.trim(),
      author: newAuthor.trim() || 'Unknown',
      color: colors[Math.floor(Math.random() * colors.length)]!,
      rotation: (Math.random() - 0.5) * 10,
      x: Math.random() * 60 + 10,
      y: Math.random() * 60 + 10,
      progress: 0,
    });
    setNewTitle('');
    setNewAuthor('');
    setShowAdd(false);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 shrink-0 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">{books.length} books</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Book
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="px-8 py-4 bg-gray-50 border-b border-gray-200 flex items-end gap-3">
          <div className="flex-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Book title"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">Author</label>
            <input
              type="text"
              value={newAuthor}
              onChange={(e) => setNewAuthor(e.target.value)}
              placeholder="Author name"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newTitle.trim()}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => { setShowAdd(false); setNewTitle(''); setNewAuthor(''); }}
            className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Books Grid */}
      <div className="flex-1 relative px-16 py-8 overflow-auto">
        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
            <BookOpen className="w-16 h-16 opacity-20" />
            <p className="text-sm">Your collection is empty.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Add Your First Book
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {books.map((book) => (
              <div
                key={book.id}
                className="group relative cursor-pointer"
                onClick={() => setSelectedBook(selectedBook?.id === book.id ? null : book)}
              >
                <div
                  className="aspect-[3/4] rounded-sm shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                  style={{
                    background: book.color,
                    transform: `rotate(${book.rotation}deg)`,
                  }}
                >
                  {/* Spine highlight */}
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-black/10" />
                  {/* Title on spine */}
                  <div className="absolute inset-0 flex items-center justify-center p-3">
                    <span className="text-white/90 text-xs font-medium text-center leading-tight drop-shadow-md line-clamp-3">
                      {book.title}
                    </span>
                  </div>
                  {/* Progress bar */}
                  {book.progress !== undefined && book.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                      <div
                        className="h-full bg-white/60"
                        style={{ width: `${book.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); removeBook(book.id); }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg"
                  title="Remove book"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Book Detail Panel */}
      {selectedBook && (
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-30 p-6">
          <div className="max-w-2xl mx-auto flex items-start gap-6">
            <div
              className="w-16 h-24 rounded-sm shadow-lg shrink-0 relative overflow-hidden"
              style={{ background: selectedBook.color }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-black/10" />
              <div className="absolute inset-0 flex items-center justify-center p-1">
                <span className="text-white/90 text-[8px] font-medium text-center leading-tight">
                  {selectedBook.title}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-lg">{selectedBook.title}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{selectedBook.author}</p>
              {selectedBook.progress !== undefined && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{selectedBook.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-900 rounded-full transition-all"
                      style={{ width: `${selectedBook.progress}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingId(selectedBook.id);
                    setEditProgress(selectedBook.progress || 0);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Pencil className="w-3 h-3" /> Edit Progress
                </button>
                <button
                  onClick={() => { removeBook(selectedBook.id); setSelectedBook(null); }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </div>
              {editingId === selectedBook.id && (
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={editProgress}
                    onChange={(e) => setEditProgress(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono text-gray-600 w-10 text-right">{editProgress}%</span>
                  <button
                    onClick={() => {
                      updateBook(selectedBook.id, { progress: editProgress });
                      setSelectedBook({ ...selectedBook, progress: editProgress });
                      setEditingId(null);
                    }}
                    className="px-3 py-1 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedBook(null)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BooksCollection;
