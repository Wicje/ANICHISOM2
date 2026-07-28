'use client';
import React, { useEffect, useState } from 'react';
import { getInstalledPlugins, getInstallState, PluginManifest, subscribe } from '@/lib/plugin-registry';
import { HeadlessDaemon } from '@/components/apps/headless-daemon';

export function DaemonManager() {
  const [activeDaemons, setActiveDaemons] = useState<PluginManifest[]>([]);

  useEffect(() => {
    const updateDaemons = () => {
      const installed = getInstalledPlugins();
      const daemons = installed.filter((plugin) => {
        if (!plugin.isDaemon || !plugin.entryUrl) return false;
        const state = getInstallState(plugin.id);
        return state?.enabled === true;
      });
      setActiveDaemons(daemons);
    };

    updateDaemons();
    return subscribe(updateDaemons);
  }, []);

  if (activeDaemons.length === 0) return null;

  return (
    <>
      {activeDaemons.map(daemon => (
        <HeadlessDaemon
          key={daemon.id}
          pluginId={daemon.id}
          pluginUrl={daemon.entryUrl!}
        />
      ))}
    </>
  );
}
