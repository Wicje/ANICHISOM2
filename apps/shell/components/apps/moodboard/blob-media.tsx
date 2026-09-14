'use client';

import { useState, useEffect } from 'react';
import { readBlob } from '@/lib/context-layer';

export function BlobMedia({ content, type, className }: { content: string; type: 'image' | 'video'; className?: string }) {
  const [blobSrc, setBlobSrc] = useState<string>('');
  useEffect(() => {
    let active = true;
    let url = '';

    if (content.startsWith('local-blob:')) {
      const id = content.split(':')[1] || '';
      readBlob(id).then((blob: any) => {
        if (!active) return;
        if (blob instanceof Blob) {
          url = URL.createObjectURL(blob);
          setBlobSrc(url);
        }
      });
    } else if (!content.startsWith('http') && !content.startsWith('blob:') && !content.startsWith('data:')) {
      // It's a file system path
      import('@/lib/fs').then(({ FS }) => {
        if (!active) return;
        FS.read(content).then((file) => {
          if (active && file?.content) {
            setBlobSrc(file.content);
          }
        });
      });
    }

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [content]);
  const src = (content.startsWith('local-blob:') || (!content.startsWith('http') && !content.startsWith('blob:') && !content.startsWith('data:'))) ? blobSrc : content;
  if (!src) return <div className="w-[400px] h-[300px] bg-slate-100 animate-pulse rounded flex items-center justify-center text-xs text-black/50">Loading Media...</div>;
  if (type === 'video') return <video src={src} className={className} controls onPointerDown={(e) => e.stopPropagation()} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img loading="lazy" src={src} className={className} alt="Media content" />;
}
