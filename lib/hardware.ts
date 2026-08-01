/**
 * Hardware Integration Subsystem
 * WebUSB, Web Bluetooth, and File System Access API abstraction
 */

export interface ConnectedDevice {
  id: string;
  name: string;
  type: 'usb' | 'bluetooth' | 'storage' | 'audio';
  vendorId?: string | number;
  productId?: string | number;
  status: 'connected' | 'disconnected' | 'pairing';
  details?: string;
}

class HardwareManagerService {
  private devices: Map<string, ConnectedDevice> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initListeners();
    }
  }

  private initListeners() {
    const nav = navigator as any;
    if (nav.usb) {
      nav.usb.addEventListener('connect', (e: any) => this.handleUsbConnect(e.device));
      nav.usb.addEventListener('disconnect', (e: any) => this.handleUsbDisconnect(e.device));
    }
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public getDevices(): ConnectedDevice[] {
    return Array.from(this.devices.values());
  }

  /**
   * WebUSB: Request user permission to connect USB device (Flash Drives, Phones, Microcontrollers)
   */
  public async requestUsbDevice(): Promise<ConnectedDevice | null> {
    const nav = navigator as any;
    if (!nav.usb) {
      throw new Error('WebUSB API is not supported in this browser environment.');
    }

    try {
      const device = await nav.usb.requestDevice({ filters: [] });
      // Mask PII device serial number (Issue 72)
      const rawSerial = device.serialNumber || '';
      const maskedSerial = rawSerial.length > 4 ? `***${rawSerial.slice(-4)}` : (rawSerial ? '****' : 'N/A');

      const dev: ConnectedDevice = {
        id: `usb-${device.vendorId}-${device.productId}-${Date.now()}`,
        name: device.productName || `USB Device (${device.vendorId}:${device.productId})`,
        type: 'usb',
        vendorId: device.vendorId,
        productId: device.productId,
        status: 'connected',
        details: `Manufacturer: ${device.manufacturerName || 'Generic'} | Serial: ${maskedSerial}`,
      };

      this.devices.set(dev.id, dev);
      this.notify();

      window.dispatchEvent(
        new CustomEvent('os:notify', {
          detail: {
            title: 'USB Device Connected',
            description: `Successfully paired ${dev.name}`,
            type: 'success',
          },
        })
      );

      return dev;
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        window.dispatchEvent(
          new CustomEvent('os:notify', {
            detail: {
              title: 'USB Connection Failed',
              description: err.message || 'Device pairing was aborted',
              type: 'error',
            },
          })
        );
      }
      return null;
    }
  }

  /**
   * Web Bluetooth API: Connect Bluetooth audio, peripheral, or phone
   */
  public async requestBluetoothDevice(): Promise<ConnectedDevice | null> {
    if (!('bluetooth' in navigator)) {
      throw new Error('Web Bluetooth API is not supported in this browser environment.');
    }

    try {
      const device = await (navigator.bluetooth as any).requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'device_information'],
      });

      const dev: ConnectedDevice = {
        id: `bt-${device.id || Date.now()}`,
        name: device.name || 'Bluetooth Peripheral',
        type: 'bluetooth',
        status: 'pairing',
        details: 'Connecting to GATT Server...',
      };

      this.devices.set(dev.id, dev);
      this.notify();

      if (device.gatt) {
        try {
          await device.gatt.connect();
          dev.status = 'connected';
          dev.details = 'GATT Server Connected | Active Wireless Stream';
        } catch {
          dev.status = 'disconnected';
          dev.details = 'GATT Connection Failed';
        }
        this.notify();
      }
      this.notify();

      window.dispatchEvent(
        new CustomEvent('os:notify', {
          detail: {
            title: 'Bluetooth Connected',
            description: `Paired with ${dev.name}`,
            type: 'success',
          },
        })
      );

      return dev;
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        window.dispatchEvent(
          new CustomEvent('os:notify', {
            detail: {
              title: 'Bluetooth Pair Failed',
              description: err.message || 'Pairing request timed out',
              type: 'error',
            },
          })
        );
      }
      return null;
    }
  }

  /**
   * File System Access API: Mount local directory / External Drive into Virtual File System
   */
  public async mountLocalDirectory(): Promise<{ name: string; handle: FileSystemDirectoryHandle } | null> {
    if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
      throw new Error('Native File System Directory Access is not supported in this browser.');
    }

    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });

      const dev: ConnectedDevice = {
        id: `drive-${handle.name}-${Date.now()}`,
        name: `Mounted Volume: ${handle.name}`,
        type: 'storage',
        status: 'connected',
        details: `Direct Host Directory Access (${handle.name})`,
      };

      this.devices.set(dev.id, dev);
      this.notify();

      window.dispatchEvent(
        new CustomEvent('os:notify', {
          detail: {
            title: 'External Volume Mounted',
            description: `Attached directory ${handle.name} to Virtual FS`,
            type: 'success',
          },
        })
      );

      return { name: handle.name, handle };
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        window.dispatchEvent(
          new CustomEvent('os:notify', {
            detail: {
              title: 'Mount Failed',
              description: err.message || 'Folder selection aborted',
              type: 'error',
            },
          })
        );
      }
      return null;
    }
  }

  private handleUsbConnect(device: any) {
    const dev: ConnectedDevice = {
      id: `usb-${device.vendorId}-${device.productId}`,
      name: device.productName || 'USB Peripheral',
      type: 'usb',
      vendorId: device.vendorId,
      productId: device.productId,
      status: 'connected',
    };
    this.devices.set(dev.id, dev);
    this.notify();
  }

  private handleUsbDisconnect(device: any) {
    const id = `usb-${device.vendorId}-${device.productId}`;
    this.devices.delete(id);
    this.notify();
  }
}

export const hardwareManager = new HardwareManagerService();
