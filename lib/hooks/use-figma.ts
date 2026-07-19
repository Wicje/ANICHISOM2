'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getFigmaConfig,
  saveFigmaToken,
  syncFigmaFile,
  getDesignTokens,
  getSyncedFiles,
  type FigmaConfig,
  type FigmaDesignTokens,
  type FigmaFile,
} from '@/lib/figma-integration';

/**
 * Hook for Figma integration — manage token, sync files, access design tokens.
 */
export function useFigma() {
  const [config, setConfig] = useState<FigmaConfig | null>(null);
  const [tokens, setTokens] = useState<FigmaDesignTokens>({ colors: [], textStyles: [], effects: [], components: [] });
  const [files, setFiles] = useState<Record<string, FigmaFile>>({});
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load config on mount
  useEffect(() => {
    getFigmaConfig().then(c => {
      setConfig(c);
      if (c) {
        return getDesignTokens().then(setTokens).then(() => { /* done */ });
      }
      return undefined;
    }).then(() => getSyncedFiles().then(setFiles)).catch(() => {});
  }, []);

  const connect = useCallback(async (token: string) => {
    try {
      await saveFigmaToken(token);
      setConfig({ accessToken: token });
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const syncFile = useCallback(async (fileKey: string) => {
    setSyncing(true);
    setError(null);
    try {
      await syncFigmaFile(fileKey);
      const [newTokens, newFiles] = await Promise.all([getDesignTokens(), getSyncedFiles()]);
      setTokens(newTokens);
      setFiles(newFiles);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  }, []);

  return {
    connected: !!config,
    tokens,
    files,
    syncing,
    error,
    connect,
    syncFile,
  };
}
