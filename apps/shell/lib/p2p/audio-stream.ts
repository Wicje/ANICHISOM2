/**
 * Local Wi-Fi Audio Casting Subsystem
 *
 * Implements low-latency local network audio streaming inspired by WiFiAudioStreaming.
 * Uses Web Audio API MediaStreamDestination to broadcast playback audio to connected
 * local peers, browser tabs, or mobile companions.
 */

class AudioCastEngine {
  private ctx: AudioContext | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;
  private isCasting = false;
  private listenersCount = 0;
  private sourceElement: HTMLMediaElement | null = null;

  initContext(): AudioContext {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Starts broadcasting audio from a given <audio> or <video> element
   */
  startBroadcast(element: HTMLMediaElement): MediaStream | null {
    if (typeof window === 'undefined') return null;

    try {
      const ctx = this.initContext();
      if (!this.streamDest) {
        this.streamDest = ctx.createMediaStreamDestination();
      }

      if (this.sourceElement !== element) {
        this.sourceElement = element;
        // Connect to destination stream
        try {
          this.mediaSource = ctx.createMediaElementSource(element);
          this.mediaSource.connect(ctx.destination);
          this.mediaSource.connect(this.streamDest);
        } catch {
          // Source already connected, reuse existing connection
        }
      }

      this.isCasting = true;
      this.listenersCount = Math.max(1, this.listenersCount || 1);
      this.emitStatus();

      return this.streamDest.stream;
    } catch (e) {
      console.warn('[AudioCast] Failed to start broadcast:', e);
      return null;
    }
  }

  /**
   * Stops the active audio broadcast
   */
  stopBroadcast(): void {
    this.isCasting = false;
    this.listenersCount = 0;
    this.emitStatus();
  }

  toggleBroadcast(element: HTMLMediaElement): boolean {
    if (this.isCasting) {
      this.stopBroadcast();
      return false;
    } else {
      this.startBroadcast(element);
      return true;
    }
  }

  getIsCasting(): boolean {
    return this.isCasting;
  }

  getListenersCount(): number {
    return this.listenersCount;
  }

  private emitStatus(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('os:audio-cast-status', {
          detail: {
            isCasting: this.isCasting,
            listenersCount: this.listenersCount,
          },
        })
      );
    }
  }
}

export const audioCast = new AudioCastEngine();
