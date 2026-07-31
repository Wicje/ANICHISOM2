/**
 * Virtual Display & Multi-Monitor Subsystem
 * Manages multi-screen workspace layouts, BroadcastChannel sync, and secondary display windows.
 */

export interface DisplayInfo {
  id: string;
  name: string;
  isPrimary: boolean;
  width: number;
  height: number;
  x: number;
  y: number;
  status: 'active' | 'disconnected';
  windowIds: string[];
}

export type DisplayMessage =
  | { type: 'DISPLAY_REGISTER'; display: DisplayInfo }
  | { type: 'DISPLAY_UNREGISTER'; displayId: string }
  | { type: 'WINDOW_TRANSFER'; windowId: string; targetDisplayId: string }
  | { type: 'STATE_SYNC'; displays: DisplayInfo[] };

class VirtualDisplayService {
  private channel: BroadcastChannel | null = null;
  private displays: Map<string, DisplayInfo> = new Map();
  private listeners: Set<() => void> = new Set();
  private currentDisplayId: string = 'display-primary';

  constructor() {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const isSecondary = urlParams.get('display');
      if (isSecondary) {
        this.currentDisplayId = `display-${isSecondary}`;
      }

      this.initChannel();
      this.registerSelf();
    }
  }

  private initChannel() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('continuaos_virtual_displays');
      this.channel.onmessage = (event: MessageEvent<DisplayMessage>) => {
        this.handleMessage(event.data);
      };
    }
  }

  private registerSelf() {
    const isPrimary = this.currentDisplayId === 'display-primary';
    const selfDisplay: DisplayInfo = {
      id: this.currentDisplayId,
      name: isPrimary ? 'Built-in Display (Primary)' : `External Display ${this.currentDisplayId.split('-')[1]}`,
      isPrimary,
      width: typeof window !== 'undefined' ? window.innerWidth : 1920,
      height: typeof window !== 'undefined' ? window.innerHeight : 1080,
      x: isPrimary ? 0 : 1920,
      y: 0,
      status: 'active',
      windowIds: [],
    };

    this.displays.set(selfDisplay.id, selfDisplay);
    this.broadcast({ type: 'DISPLAY_REGISTER', display: selfDisplay });

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.broadcast({ type: 'DISPLAY_UNREGISTER', displayId: selfDisplay.id });
      });
    }
  }

  private handleMessage(msg: DisplayMessage) {
    switch (msg.type) {
      case 'DISPLAY_REGISTER':
        this.displays.set(msg.display.id, msg.display);
        this.notify();
        break;

      case 'DISPLAY_UNREGISTER':
        this.displays.delete(msg.displayId);
        this.notify();
        break;

      case 'WINDOW_TRANSFER':
        window.dispatchEvent(
          new CustomEvent('os:window-transfer', {
            detail: { windowId: msg.windowId, targetDisplayId: msg.targetDisplayId },
          })
        );
        break;

      case 'STATE_SYNC':
        msg.displays.forEach((d) => this.displays.set(d.id, d));
        this.notify();
        break;
    }
  }

  private broadcast(msg: DisplayMessage) {
    if (this.channel) {
      this.channel.postMessage(msg);
    }
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public getDisplays(): DisplayInfo[] {
    return Array.from(this.displays.values());
  }

  public getCurrentDisplayId(): string {
    return this.currentDisplayId;
  }

  /**
   * Spawn a new secondary monitor window using window.open
   */
  public spawnSecondaryDisplay(): boolean {
    if (typeof window === 'undefined') return false;

    const nextId = this.displays.size + 1;
    const secondaryUrl = `${window.location.origin}${window.location.pathname}?display=${nextId}`;
    const newWin = window.open(
      secondaryUrl,
      `ContinuaOS Display ${nextId}`,
      'width=1280,height=800,menubar=no,toolbar=no,location=no,status=no'
    );

    if (newWin) {
      window.dispatchEvent(
        new CustomEvent('os:notify', {
          detail: {
            title: 'Secondary Display Spawning',
            description: `Opened External Display ${nextId} in satellite window.`,
            type: 'success',
          },
        })
      );
      return true;
    } else {
      window.dispatchEvent(
        new CustomEvent('os:notify', {
          detail: {
            title: 'Popup Blocked',
            description: 'Please allow popups to launch external virtual displays.',
            type: 'error',
          },
        })
      );
      return false;
    }
  }

  /**
   * Transfer a window from current display to target display ID
   */
  public transferWindow(windowId: string, targetDisplayId: string) {
    this.broadcast({
      type: 'WINDOW_TRANSFER',
      windowId,
      targetDisplayId,
    });
  }
}

export const virtualDisplayManager = new VirtualDisplayService();
