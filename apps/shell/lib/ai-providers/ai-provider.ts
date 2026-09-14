/**
 * AI Provider Interface — unified adapter for ANY AI model
 *
 * Mirrors the AuthProvider pattern: one interface, many implementations.
 * Users choose their provider — Claude, Gemini, OpenAI, Qwen, local models.
 * The AI works FOR the user, not the other way around.
 */

export interface AiCapabilities {
  streaming: boolean;
  tools: boolean;          // function/tool calling
  vision: boolean;         // image input
  maxTokens: number;
  maxContextTokens: number;
  supportedFeatures: string[];
}

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];       // base64 or URLs for vision models
  toolCalls?: AiToolCall[];
}

export interface AiToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AiToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AiChatOptions {
  model?: string;
  messages: AiMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: AiToolDefinition[];
  stream?: boolean;
}

export interface AiChatResponse {
  text: string;
  model: string;
  provider: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  toolCalls?: AiToolCall[];
  finishReason?: string;
}

export interface AiStreamChunk {
  text: string;
  done: boolean;
  model: string;
  provider: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export interface AiModelInfo {
  id: string;
  name: string;
  provider: string;
  capabilities: AiCapabilities;
  costPer1kTokens?: { input: number; output: number };
}

export interface IAiProvider {
  /** Provider identifier — e.g. 'gemini', 'openai', 'claude', 'qwen', 'local' */
  id: string;

  /** Human-readable name */
  name: string;

  /** Check if this provider is configured and available */
  isAvailable(): Promise<boolean>;

  /** Get capabilities for a specific model */
  getCapabilities(model?: string): AiCapabilities;

  /** List available models from this provider */
  listModels(): Promise<AiModelInfo[]>;

  /** Send a chat completion request (non-streaming) */
  chat(options: AiChatOptions): Promise<AiChatResponse>;

  /** Send a chat completion request (streaming) */
  chatStream(options: AiChatOptions, onChunk: (chunk: AiStreamChunk) => void): Promise<void>;

  /** Get the default model for this provider */
  getDefaultModel(): string;
}
