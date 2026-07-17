'use client';

import { useState, useEffect } from 'react';

export function useHardwareState() {
  const [battery, setBattery] = useState<{ level: number, charging: boolean } | null>(null);
  const [network, setNetwork] = useState<{ type: string, effectiveType: string, rtt: number, downlink: number } | null>(null);

  useEffect(() => {
    // Battery API
    let batteryObj: any = null;
    const updateBattery = () => {
      if (batteryObj) {
        setBattery({ level: batteryObj.level, charging: batteryObj.charging });
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

    // Network Information API
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const updateNetwork = () => {
      if (connection) {
        setNetwork({
          type: connection.type || 'unknown',
          effectiveType: connection.effectiveType || '4g',
          rtt: connection.rtt || 0,
          downlink: connection.downlink || 0
        });
      }
    };

    if (connection) {
      updateNetwork();
      connection.addEventListener('change', updateNetwork);
    }

    return () => {
      if (batteryObj) {
        batteryObj.removeEventListener('levelchange', updateBattery);
        batteryObj.removeEventListener('chargingchange', updateBattery);
      }
      if (connection) {
        connection.removeEventListener('change', updateNetwork);
      }
    };
  }, []);

  return { battery, network };
}
