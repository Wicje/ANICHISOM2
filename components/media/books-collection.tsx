'use client';

import React from 'react';

interface BookItem {
  title: string;
  color: string;
  rotation: number;
  x: number;
  y: number;
}

const books: BookItem[] = [
  { title: 'Book 1', color: '#4A6FA5', rotation: -5, x: 15, y: 20 },
  { title: 'Book 2', color: '#2C2C2C', rotation: 3, x: 30, y: 15 },
  { title: 'Book 3', color: '#8B4513', rotation: -2, x: 48, y: 22 },
  { title: 'Book 4', color: '#D4A574', rotation: 4, x: 65, y: 18 },
  { title: 'Book 5', color: '#C4C4C4', rotation: -3, x: 20, y: 50 },
  { title: 'Book 6', color: '#556B2F', rotation: 2, x: 38, y: 48 },
  { title: 'Book 7', color: '#FF6347', rotation: -4, x: 55, y: 52 },
  { title: 'Book 8', color: '#2F4F4F', rotation: 1, x: 72, y: 46 },
];

export function BooksCollection() {
  return (
    <div className="w-full h-full flex flex-col bg-white font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 shrink-0">
        <span className="text-sm text-gray-500">Raghav Agarwal</span>
        <button className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* Title */}
      <div className="text-center py-12 shrink-0">
        <h1 className="text-3xl font-serif text-gray-900 leading-relaxed">
          Curated collection of various<br />
          <span className="inline-flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
              </svg>
            </span>
            books and
            <span className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
            </span>
            songs.
          </span>
        </h1>
      </div>

      {/* Books Grid */}
      <div className="flex-1 relative px-16 pb-8">
        <div className="grid grid-cols-4 gap-8 max-w-3xl mx-auto">
          {books.map((book, i) => (
            <div
              key={i}
              className="aspect-[3/4] rounded-sm shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105"
              style={{
                background: book.color,
                transform: `rotate(${book.rotation}deg)`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default BooksCollection;
