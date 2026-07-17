'use client';

import React, { useState, useEffect } from 'react';
import { Cloud, HardDrive, X, Upload, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { shouldPromptSync, formatFileSize } from '@/lib/storage-connectors/storage-connector';

type SyncPromptBannerProps = {
  fileName: string;
  fileSize: number;
  fileType: string;
  file?: File;
  onSync?: () => void;
  onDismiss?: () => void;
  onKeepLocal?: () => void;
};

type ConnectedSource = {
  id: string;
  name: string;
  connected: boolean;
};

const STORAGE_LABELS: Record<string, string> = {
  'google-drive': 'Google Drive',
  'dropbox': 'Dropbox',
  'onedrive': 'OneDrive',
};

export function SyncPromptBanner({ fileName, fileSize, fileType, file, onSync, onDismiss, onKeepLocal }: SyncPromptBannerProps) {
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [visible, setVisible] = useState(true);
  const [connectedSources, setConnectedSources] = useState<ConnectedSource[]>([]);

  // Fetch connected providers from existing API routes
  useEffect(() => {
    fetch('/api/storage/files')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.connectors) {
          setConnectedSources(
            data.connectors
              .filter((c: any) => c.connected)
              .map((c: any) => ({ id: c.id, name: c.name, connected: true }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const hasCloudProvider = connectedSources.length > 0;
  const primaryProvider = connectedSources[0];
  const providerName = primaryProvider ? STORAGE_LABELS[primaryProvider.id] || primaryProvider.name : null;

  const formattedSize = formatFileSize(fileSize);

  const handleSync = async () => {
    if (!primaryProvider) return;
    setSyncing(true);
    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      } else {
        // Fallback: create empty blob with correct name/type
        formData.append('file', new Blob([], { type: fileType }), fileName);
      }
      formData.append('path', `/${fileName}`);
      const res = await fetch(`/api/storage/upload/${primaryProvider.id}`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Upload failed: ${res.status}`);
      }
      setSynced(true);
      onSync?.();
    } catch (err) {
      console.error('Sync failed:', err);
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'Sync Failed', description: err instanceof Error ? err.message : 'Upload failed', type: 'error' },
      }));
    }
    setSyncing(false);
  };

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  const handleKeepLocal = () => {
    setVisible(false);
    onKeepLocal?.();
  };

  if (!visible) return null;
  if (!shouldPromptSync(fileSize)) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9998] max-w-lg w-full mx-4">
      <div className={cn(
        "bg-[var(--os-surface)] border rounded-xl shadow-2xl p-4 flex items-start gap-4 transition-all",
        synced ? "border-emerald-500/30" : "border-white/10"
      )}>
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          synced ? "bg-emerald-500/20" : "bg-amber-500/20"
        )}>
          {synced ? (
            <Check className="w-5 h-5 text-emerald-400" />
          ) : syncing ? (
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
          ) : (
            <Cloud className="w-5 h-5 text-amber-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white">
            {synced ? 'File synced to cloud' : `Large file detected (${formattedSize})`}
          </div>
          <div className="text-xs text-white/50 mt-0.5 truncate">
            {fileName}
          </div>
          
          {!synced && hasCloudProvider && (
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-blue-600 hover:bg-blue-500 text-white"
              >
                {syncing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3" />
                )}
                Sync to {providerName}
              </button>
              <button
                onClick={handleKeepLocal}
                className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/70 hover:bg-white/5 transition-colors"
              >
                Keep local only
              </button>
            </div>
          )}

          {!synced && !hasCloudProvider && (
            <div className="text-xs text-white/30 mt-2">
              Connect a cloud storage provider in Files to enable sync.
            </div>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 text-white/30 hover:text-white/60 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
