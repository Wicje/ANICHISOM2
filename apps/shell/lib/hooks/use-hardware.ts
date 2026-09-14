'use client';

import { useState, useEffect, useRef } from 'react';

export function useHardwareState() {
  const [battery, setBattery] = useState<{ level: number, charging: boolean } | null>(null);
  const [network, setNetwork] = useState<{ type: string, effectiveType: string, rtt: number, downlink: number } | null>(null);
  const lowBatteryNotified = useRef(false);
  const offlineNotified = useRef(false);

  useEffect(() => {
    let batteryObj: any = null;
    const updateBattery = () => {
      if (batteryObj) {
        const level = batteryObj.level;
        const charging = batteryObj.charging;
        setBattery({ level, charging });
        
        if (level <= 0.2 && !charging && !lowBatteryNotified.current) {
          lowBatteryNotified.current = true;
          window.dispatchEvent(new CustomEvent('os:notify', {
            detail: { title: 'Low Battery', description: `Battery at ${Math.round(level * 100)}%. Consider plugging in.`, type: 'warning' }
          }));
        }
        if (level > 0.2) {
          lowBatteryNotified.current = false;
        }
      }
    };

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((b: any) => {
        batteryObj = b;
        updateBattery();
        b.addEventListener('levelchange', updateBattery);
        b.addEventListener('chargingchange', updateBattery);
      });
    }

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const updateNetwork = () => {
      if (connection) {
        const online = navigator.onLine;
        setNetwork({
          type: connection.type || 'unknown',
          effectiveType: connection.effectiveType || '4g',
          rtt: connection.rtt || 0,
          downlink: connection.downlink || 0
        });
        
        if (!online && !offlineNotified.current) {
          offlineNotified.current = true;
          window.dispatchEvent(new CustomEvent('os:notify', {
            detail: { title: 'Network Offline', description: 'You are no longer connected to the internet.', type: 'warning' }
          }));
        }
        if (online) {
          offlineNotified.current = false;
        }
      }
    };

    const handleOnline = () => {
      offlineNotified.current = false;
      window.dispatchEvent(new CustomEvent('os:notify', {
        detail: { title: 'Network Restored', description: 'You are back online.', type: 'success' }
      }));
    };

    const handleOffline = () => {
      if (!offlineNotified.current) {
        offlineNotified.current = true;
        window.dispatchEvent(new CustomEvent('os:notify', {
          detail: { title: 'Network Offline', description: 'You are no longer connected to the internet.', type: 'warning' }
        }));
      }
    };

    if (connection) {
      updateNetwork();
      connection.addEventListener('change', updateNetwork);
    }
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (batteryObj) {
        batteryObj.removeEventListener('levelchange', updateBattery);
        batteryObj.removeEventListener('chargingchange', updateBattery);
      }
      if (connection) {
        connection.removeEventListener('change', updateNetwork);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { battery, network };
}
