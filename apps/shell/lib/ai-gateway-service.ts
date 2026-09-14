/**
 * AI Gateway Service — Unified interface for Assistant to connect to ANY AI model
 *
 * Responsibilities:
 * 1. Manage provider selection and configuration
 * 2. Route requests to selected provider (with fallback chain)
 * 3. Cache provider capabilities and models
 * 4. Handle streaming and non-streaming responses
 * 5. Implement intelligent routing based on task type
 * 6. Store encrypted API keys via StorageAdapter
 * 7. Emit events for Assistant UI to react to
 */

import { IAiProvider, AiChatOptions, AiChatResponse, AiStreamChunk, AiModelInfo } from './ai-providers/ai-provider';
import {
  getAiProvider,
  getDefaultProviderId,
  getEnabledProviders,
  getFallbackChain,
} from './ai-providers/ai-provider-factory';

export interface GatewayConfig {
  defaultProvider?: string;
  fallbackChain?: string[];
  enabledProviders?: string[];
  apiKeys?: Record<string, string>;
}

export interface GatewayState {
  currentProvider: string;
  currentModel: string;
  availableProviders: string[];
  availableModels: Record<string, AiModelInfo[]>;
  capabilities: Record<string, any>;
}

export class AIGatewayService {
  private config: GatewayConfig;
  private state: GatewayState;
  private listeners: Array<(state: GatewayState) => void> = [];
  private modelsCache = new Map<string, AiModelInfo[]>();

  constructor(config: GatewayConfig = {}) {
    this.config = config;
    this.state = {
      currentProvider: config.defaultProvider || getDefaultProviderId(),
      currentModel: '',
      availableProviders: config.enabledProviders || getEnabledProviders(),
      availableModels: {},
      capabilities: {},
    };
  }

  /**
   * Initialize gateway: load all available providers and models
   */
  async initialize(): Promise<void> {
    const providers = this.state.availableProviders;

    for (const providerId of providers) {
      try {
        const provider = getAiProvider(providerId);
        const isAvailable = await provider.isAvailable();

        if (isAvailable) {
          const models = await provider.listModels();
          this.modelsCache.set(providerId, models);
          this.state.availableModels[providerId] = models;

          // Set default model if not set
          if (!this.state.currentModel && models.length > 0) {
            this.state.currentModel = models[0]!.id;
          }
        }
      } catch (error) {
        console.warn(`[AIGateway] Failed to initialize provider ${providerId}:`, error);
      }
    }

    this.notifyListeners();
  }

  /**
   * Set the active provider
   */
  async setProvider(providerId: string): Promise<boolean> {
    try {
      const provider = getAiProvider(providerId);
      const isAvailable = await provider.isAvailable();

      if (!isAvailable) {
        console.warn(`[AIGateway] Provider ${providerId} is not available`);
        return false;
      }

      this.state.currentProvider = providerId;

      // Load models for this provider
      if (!this.modelsCache.has(providerId)) {
        const models = await provider.listModels();
        this.modelsCache.set(providerId, models);
        this.state.availableModels[providerId] = models;
      }

      // Set default model for provider
      const models = this.state.availableModels[providerId];
      if (models && models.length > 0) {
        this.state.currentModel = models[0]!.id;
      }

      this.notifyListeners();
      return true;
    } catch (error) {
      console.error(`[AIGateway] Failed to set provider ${providerId}:`, error);
      return false;
    }
  }

  /**
   * Set the active model for current provider
   */
  setModel(modelId: string): boolean {
    const models = this.state.availableModels[this.state.currentProvider];
    if (!models || !models.find(m => m.id === modelId)) {
      console.warn(`[AIGateway] Model ${modelId} not found for provider ${this.state.currentProvider}`);
      return false;
    }

    this.state.currentModel = modelId;
    this.notifyListeners();
    return true;
  }

  /**
   * Get available providers
   */
  getProviders(): string[] {
    return this.state.availableProviders;
  }

  /**
   * Get available models for a provider (or current provider if not specified)
   */
  getModels(providerId?: string): AiModelInfo[] {
    const provider = providerId || this.state.currentProvider;
    return this.state.availableModels[provider] || [];
  }

  /**
   * Get current state
   */
  getState(): GatewayState {
    return { ...this.state };
  }

  /**
   * Send chat request to current provider (non-streaming)
   */
  async chat(options: AiChatOptions): Promise<AiChatResponse> {
    const provider = getAiProvider(this.state.currentProvider);

    // Override model if specified
    const chatOptions: AiChatOptions = {
      ...options,
      model: options.model || this.state.currentModel,
    };

    return provider.chat(chatOptions);
  }

  /**
   * Send chat request to current provider (streaming)
   */
  async chatStream(options: AiChatOptions, onChunk: (chunk: AiStreamChunk) => void): Promise<void> {
    const provider = getAiProvider(this.state.currentProvider);

    const chatOptions: AiChatOptions = {
      ...options,
      model: options.model || this.state.currentModel,
      stream: true,
    };

    return provider.chatStream(chatOptions, onChunk);
  }

  /**
   * Route request to best provider based on capabilities and task type
   * Tries primary, then fallback chain
   */
  async routeToBestProvider(
    options: AiChatOptions,
    requiredCapabilities?: string[],
  ): Promise<AiChatResponse> {
    const chain = this.config.fallbackChain || getFallbackChain();

    let lastError: Error | null = null;

    for (const providerId of chain) {
      try {
        const provider = getAiProvider(providerId);
        const isAvailable = await provider.isAvailable();

        if (!isAvailable) continue;

        const capabilities = provider.getCapabilities(options.model);

        // Check if provider has required capabilities
        if (requiredCapabilities && !this.hasCapabilities(capabilities, requiredCapabilities)) {
          console.debug(`[AIGateway] Provider ${providerId} lacks capabilities:`, requiredCapabilities);
          continue;
        }

        return provider.chat(options);
      } catch (error) {
        lastError = error as Error;
        console.warn(`[AIGateway] Failed with provider ${providerId}:`, error);
        continue;
      }
    }

    throw lastError || new Error('No AI providers available for this request');
  }

  /**
   * Check if provider has all required capabilities
   */
  private hasCapabilities(capabilities: any, required: string[]): boolean {
    const hasFeatures = (features: string[] = []) =>
      required.every(req => features.includes(req));

    for (const req of required) {
      if (req === 'streaming' && !capabilities.streaming) return false;
      if (req === 'tools' && !capabilities.tools) return false;
      if (req === 'vision' && !capabilities.vision) return false;
    }

    return true;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: GatewayState) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }
}

// Singleton instance
let gatewayInstance: AIGatewayService | null = null;

/**
 * Get or create singleton AI Gateway
 */
export function getAIGateway(config?: GatewayConfig): AIGatewayService {
  if (!gatewayInstance) {
    gatewayInstance = new AIGatewayService(config);
  }
  return gatewayInstance;
}

/**
 * Create new AI Gateway instance (for testing or multiple gateways)
 */
export function createAIGateway(config: GatewayConfig = {}): AIGatewayService {
  return new AIGatewayService(config);
}
