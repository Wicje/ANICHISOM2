/**
 * AI Provider Factory — registration, lookup, routing with fallback chains
 *
 * Mirrors the auth ProviderFactory pattern.
 * Users configure which providers to enable, default provider, and fallback chain.
 *
 * Config via environment:
 *   AI_DEFAULT_PROVIDER=gemini
 *   AI_FALLBACK_CHAIN=gemini,openai,claude,local
 *   AI_ENABLED_PROVIDERS=gemini,openai,claude,qwen,local
 */

import { IAiProvider, AiChatOptions, AiChatResponse, AiStreamChunk, AiModelInfo } from './ai-provider';
import { GeminiProvider } from './gemini-provider';
import { OpenAIProvider } from './openai-provider';
import { ClaudeProvider } from './claude-provider';
import { QwenProvider } from './qwen-provider';
import { LocalProvider } from './local-provider';
import { WebGPUProvider } from './webgpu-provider';

type ProviderConstructor = new (...args: any[]) => IAiProvider;

const providerRegistry = new Map<string, ProviderConstructor>();
const providerInstances = new Map<string, IAiProvider>();

// Register built-in providers
providerRegistry.set('gemini', GeminiProvider);
providerRegistry.set('openai', OpenAIProvider);
providerRegistry.set('claude', ClaudeProvider);
providerRegistry.set('qwen', QwenProvider);
providerRegistry.set('local', LocalProvider);
providerRegistry.set('webgpu', WebGPUProvider);

/**
 * Register a custom AI provider (for plugins/extensions)
 */
export function registerAiProvider(id: string, constructor: ProviderConstructor): void {
  providerRegistry.set(id, constructor);
}

/**
 * Get or create a provider instance by ID
 */
export function getAiProvider(providerId?: string, config?: Record<string, string>): IAiProvider {
  const id = providerId || getDefaultProviderId();

  // Check for cached instance (without config overrides)
  if (!config && providerInstances.has(id)) {
    return providerInstances.get(id)!;
  }

  const constructor = providerRegistry.get(id);
  if (!constructor) {
    throw new Error(
      `Unknown AI provider: ${id}. ` +
      `Available: ${Array.from(providerRegistry.keys()).join(', ')}`
    );
  }

  const instance = new constructor(config);

  if (!config) {
    providerInstances.set(id, instance);
  }

  return instance;
}

/**
 * Get all registered provider IDs
 */
export function getRegisteredProviders(): string[] {
  return Array.from(providerRegistry.keys());
}

/**
 * Get the default provider ID from environment
 */
export function getDefaultProviderId(): string {
  return process.env.AI_DEFAULT_PROVIDER || 'gemini';
}

/**
 * Get the fallback chain from environment
 */
export function getFallbackChain(): string[] {
  const chain = process.env.AI_FALLBACK_CHAIN;
  if (chain) return chain.split(',').map(s => s.trim());

  // Default: try default provider, then all enabled providers
  const enabled = getEnabledProviders();
  const defaultId = getDefaultProviderId();
  const others = enabled.filter(id => id !== defaultId);
  return [defaultId, ...others];
}

/**
 * Get enabled providers from environment
 */
export function getEnabledProviders(): string[] {
  const enabled = process.env.AI_ENABLED_PROVIDERS;
  if (enabled) return enabled.split(',').map(s => s.trim());

  // Default: all registered providers
  return Array.from(providerRegistry.keys());
}

/**
 * List all models from all enabled providers
 */
export async function listAllModels(): Promise<AiModelInfo[]> {
  const enabled = getEnabledProviders();
  const models: AiModelInfo[] = [];

  for (const providerId of enabled) {
    try {
      const provider = getAiProvider(providerId);
      if (await provider.isAvailable()) {
        const providerModels = await provider.listModels();
        models.push(...providerModels);
      }
    } catch {
      // Provider unavailable — skip
    }
  }

  return models;
}

import { episodicMemory } from '@/lib/ai-memory/episodic-memory';

/**
 * Enriches prompt options with episodic nucleus memory and applies MinMax token pruning
 */
async function enrichOptionsWithEpisodicMemory(options: AiChatOptions): Promise<AiChatOptions> {
  const lastUserMsg = [...options.messages].reverse().find(m => m.role === 'user');
  if (!lastUserMsg || !lastUserMsg.content) return options;

  try {
    const nucleusContext = await episodicMemory.retrieveNucleusContext(lastUserMsg.content);
    if (!nucleusContext) return options;

    const baseSystem = options.systemPrompt || '';
    const enrichedSystem = episodicMemory.optimizeTokens(
      baseSystem ? `${baseSystem}\n\n${nucleusContext}` : nucleusContext,
      1500
    );

    return {
      ...options,
      systemPrompt: enrichedSystem,
    };
  } catch {
    return options;
  }
}

/**
 * Chat with fallback chain — try providers in order until one succeeds
 */
export async function chatWithFallback(options: AiChatOptions): Promise<AiChatResponse> {
  const enriched = await enrichOptionsWithEpisodicMemory(options);
  const chain = getFallbackChain();

  for (const providerId of chain) {
    try {
      const provider = getAiProvider(providerId);
      if (await provider.isAvailable()) {
        const response = await provider.chat(enriched);
        // Record turn into continuous episodic memory
        const userPrompt = options.messages[options.messages.length - 1]?.content;
        if (userPrompt) {
          episodicMemory.recordTurn('user', userPrompt).catch(() => {});
          episodicMemory.recordTurn('assistant', response.text).catch(() => {});
        }
        return response;
      }
    } catch (error: unknown) {
      console.warn(`[AI] Provider ${providerId} failed:`, error);
      continue;
    }
  }

  throw new Error(
    `All AI providers in fallback chain failed. ` +
    `Chain: ${chain.join(' → ')}. ` +
    `Ensure at least one provider is configured.`
  );
}

/**
 * Chat stream with fallback chain
 */
export async function chatStreamWithFallback(
  options: AiChatOptions,
  onChunk: (chunk: AiStreamChunk) => void,
): Promise<void> {
  const enriched = await enrichOptionsWithEpisodicMemory(options);
  const chain = getFallbackChain();

  for (const providerId of chain) {
    try {
      const provider = getAiProvider(providerId);
      if (await provider.isAvailable()) {
        let fullText = '';
        await provider.chatStream(enriched, (chunk) => {
          fullText += chunk.text;
          onChunk(chunk);
        });
        const userPrompt = options.messages[options.messages.length - 1]?.content;
        if (userPrompt && fullText) {
          episodicMemory.recordTurn('user', userPrompt).catch(() => {});
          episodicMemory.recordTurn('assistant', fullText).catch(() => {});
        }
        return;
      }
    } catch (error: unknown) {
      console.warn(`[AI] Stream provider ${providerId} failed:`, error);
      continue;
    }
  }

  throw new Error(
    `All AI stream providers in fallback chain failed. ` +
    `Chain: ${chain.join(' → ')}.`
  );
}

/**
 * Clear cached provider instances (useful for testing)
 */
export function clearProviderCache(): void {
  providerInstances.clear();
}
