/**
 * Books Zustand Store — reading list.
 *
 * All persistence through Context Layer (readDomain/writeDomain).
 */
import { create } from 'zustand';
import { readDomain, writeDomain } from '@/lib/context-layer';

const DOMAIN = 'books';
const LEGACY_KEY = 'continuaos_books';

export interface BookItem {
  id: string; title: string; author: string; color: string; rotation: number;
  x: number; y: number; progress?: number; notes?: string; addedAt: number;
}

const DEFAULT_BOOKS: BookItem[] = [
  { id: 'b1', title: 'The Edge Manifesto', author: 'ContinuaOS', color: '#4A6FA5', rotation: -5, x: 15, y: 20, progress: 72, addedAt: Date.now() },
  { id: 'b2', title: 'Local-First Software', author: 'Martin Kleppmann', color: '#2C2C2C', rotation: 3, x: 30, y: 15, progress: 45, addedAt: Date.now() },
  { id: 'b3', title: 'Designing Data Apps', author: 'Katie Cox', color: '#8B4513', rotation: -2, x: 48, y: 22, progress: 88, addedAt: Date.now() },
  { id: 'b4', title: 'Creative Confidence', author: 'Tom & David Kelley', color: '#D4A574', rotation: 4, x: 65, y: 18, progress: 30, addedAt: Date.now() },
  { id: 'b5', title: 'Zero to One', author: 'Peter Thiel', color: '#C4C4C4', rotation: -3, x: 20, y: 50, progress: 15, addedAt: Date.now() },
  { id: 'b6', title: 'The Pragmatic Programmer', author: 'Hunt & Thomas', color: '#556B2F', rotation: 2, x: 38, y: 48, progress: 60, addedAt: Date.now() },
  { id: 'b7', title: 'Atomic Habits', author: 'James Clear', color: '#FF6347', rotation: -4, x: 55, y: 52, progress: 95, addedAt: Date.now() },
  { id: 'b8', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', color: '#2F4F4F', rotation: 1, x: 72, y: 46, progress: 20, addedAt: Date.now() },
];

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function persistBooks(books: BookItem[]) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => writeDomain(DOMAIN, books), 2000);
}

interface BooksState {
  books: BookItem[];
  loaded: boolean;
  loadBooks: () => Promise<void>;
  addBook: (book: Omit<BookItem, 'id' | 'addedAt'>) => void;
  removeBook: (id: string) => void;
  updateBook: (id: string, updates: Partial<BookItem>) => void;
  persist: () => void;
}

export const useBooksStore = create<BooksState>((set, get) => ({
  books: [], loaded: false,

  loadBooks: async () => {
    try {
      const ctxData = await readDomain<BookItem[]>(DOMAIN);
      if (ctxData && ctxData.length > 0) { set({ books: ctxData, loaded: true }); return; }
      // Migration
      const { get: idbGet } = await import('idb-keyval');
      const saved = await idbGet<BookItem[]>(LEGACY_KEY);
      if (saved && saved.length > 0) { set({ books: saved, loaded: true }); writeDomain(DOMAIN, saved); }
      else { set({ books: DEFAULT_BOOKS, loaded: true }); writeDomain(DOMAIN, DEFAULT_BOOKS); }
    } catch { set({ books: DEFAULT_BOOKS, loaded: true }); }
  },

  addBook: (book) => {
    const newBook: BookItem = { ...book, id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, addedAt: Date.now() };
    set(s => ({ books: [...s.books, newBook] }));
    persistBooks(get().books);
  },

  removeBook: (id) => {
    set(s => ({ books: s.books.filter(b => b.id !== id) }));
    persistBooks(get().books);
  },

  updateBook: (id, updates) => {
    set(s => ({ books: s.books.map(b => b.id === id ? { ...b, ...updates } : b) }));
    persistBooks(get().books);
  },

  persist: () => writeDomain(DOMAIN, get().books),
}));
