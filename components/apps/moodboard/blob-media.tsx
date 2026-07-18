'use client';

import { useState, useEffect } from 'react';
import { get } from 'idb-keyval';

export function BlobMedia({ content, type, className }: { content: string; type: 'image' | 'video'; className?: string }) {
  const [blobSrc, setBlobSrc] = useState<string>('');
  useEffect(() => {
    if (content.startsWith('local-blob:')) {
      const id = content.split(':')[1];
      let active = true;
      let url = '';
      get(`blob_${id}`).then((blob: any) => {
        if (active && blob instanceof Blob) {
          url = URL.createObjectURL(blob);
          setBlobSrc(url);
        }
      });
      return () => { active = false; if (url) URL.revokeObjectURL(url); };
    }
    return undefined;
  }, [content]);
  const src = content.startsWith('local-blob:') ? blobSrc : content;
  if (!src) return <div className="w-[400px] h-[300px] bg-slate-100 animate-pulse rounded flex items-center justify-center text-xs text-black/50">Loading Media...</div>;
  if (type === 'video') return <video src={src} className={className} controls onPointerDown={(e) => e.stopPropagation()} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img loading="lazy" src={src} className={className} alt="Media content" />;
}
