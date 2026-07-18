import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';

export interface BookItem {
  id: string;
  title: string;
  author: string;
  color: string;
  rotation: number;
  x: number;
  y: number;
  progress?: number; // 0-100
  notes?: string;
  addedAt: number;
}

const STORAGE_KEY = 'continuaos_books';

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
  books: [],
  loaded: false,

  loadBooks: async () => {
    try {
      const saved = await idbGet<BookItem[]>(STORAGE_KEY);
      if (saved && saved.length > 0) {
        set({ books: saved, loaded: true });
      } else {
        set({ books: DEFAULT_BOOKS, loaded: true });
        idbSet(STORAGE_KEY, DEFAULT_BOOKS);
      }
    } catch {
      set({ books: DEFAULT_BOOKS, loaded: true });
    }
  },

  addBook: (book) => {
    const newBook: BookItem = {
      ...book,
      id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      addedAt: Date.now(),
    };
    set((s) => {
      const next = [...s.books, newBook];
      idbSet(STORAGE_KEY, next);
      return { books: next };
    });
  },

  removeBook: (id) => {
    set((s) => {
      const next = s.books.filter((b) => b.id !== id);
      idbSet(STORAGE_KEY, next);
      return { books: next };
    });
  },

  updateBook: (id, updates) => {
    set((s) => {
      const next = s.books.map((b) => (b.id === id ? { ...b, ...updates } : b));
      idbSet(STORAGE_KEY, next);
      return { books: next };
    });
  },

  persist: () => {
    const { books } = get();
    idbSet(STORAGE_KEY, books);
  },
}));
