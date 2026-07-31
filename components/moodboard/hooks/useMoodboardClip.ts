'use client';

import { useEffect } from 'react';

export interface ClipPayload {
  url?: string;
  image?: string;
  video?: string;
  title?: string;
  content?: string;
}

export function useMoodboardClip(addImportedNode: (payload: ClipPayload) => void) {
  useEffect(() => {
    const handleClip = (e: CustomEvent) => {
      const { url, title, image, video, content } = e.detail || {};
      if (url || image || video || content) {
        addImportedNode({ url, image, video, title, content });
      }
    };
    window.addEventListener('os:clip-to-moodboard', handleClip as EventListener);
    return () => window.removeEventListener('os:clip-to-moodboard', handleClip as EventListener);
  }, [addImportedNode]);
}
