/**
 * Local AI Provider — Ollama, LM Studio, and other OpenAI-compatible local servers
 *
 * AI works FOR the user — they pick their local model and endpoint.
 * Uses OpenAI-compatible API (most local servers support this format).
 */

import { IAiProvider, AiCapabilities, AiModelInfo, AiChatOptions, AiChatResponse, AiStreamChunk } from './ai-provider';

const LOCAL_CAPABILITIES: AiCapabilities = {
  streaming: true,
  tools: false,
  vision: false,
  maxTokens: 4096,
  maxContextTokens: 8192,
  supportedFeatures: ['chat', 'code'],
};

export class LocalProvider implements IAiProvider {
  id = 'local';
  name = 'Local Models (Ollama / LM Studio)';
  private baseUrl: string;
  private model: string;

  constructor(baseUrl?: string, model?: string) {
    this.baseUrl = baseUrl || process.env.LOCAL_AI_BASE_URL || 'http://localhost:11434/v1';
    this.model = model || process.env.LOCAL_AI_MODEL || 'llama3';
  }

  async isAvailable(): Promise<boolean> {
    try {
      // For Ollama, check /api/tags; for LM Studio/OpenAI compat, check /v1/models
      const checkUrl = this.baseUrl.includes('/v1')
        ? `${this.baseUrl}/models`
        : `${this.baseUrl.replace('/v1', '')}/api/tags`;

      const response = await fetch(checkUrl, { signal: AbortSignal.timeout(3000) });
      return response.ok;
    } catch {
      return false;
    }
  }

  getCapabilities(model?: string): AiCapabilities {
    // Local models vary widely — return conservative defaults
    // Users can override via config if they know their model's specs
    return LOCAL_CAPABILITIES;
  }

  async listModels(): Promise<AiModelInfo[]> {
    try {
      // Try OpenAI-compatible endpoint first
      const listUrl = this.baseUrl.includes('/v1')
        ? `${this.baseUrl}/models`
        : `${this.baseUrl.replace('/v1', '')}/api/tags`;

      const response = await fetch(listUrl);
      if (!response.ok) return this.defaultModels();

      const data = await response.json();

      // OpenAI-compatible format
      if (data.data) {
        return data.data.map((m: any) => ({
          id: m.id,
          name: m.id,
          provider: this.id,
          capabilities: LOCAL_CAPABILITIES,
        }));
      }

      // Ollama format
      if (data.models) {
        return data.models.map((m: any) => ({
          id: m.name,
          name: m.name,
          provider: this.id,
          capabilities: LOCAL_CAPABILITIES,
        }));
      }

      return this.defaultModels();
    } catch {
      return this.defaultModels();
    }
  }

  getDefaultModel(): string {
    return this.model;
  }

  async chat(options: AiChatOptions): Promise<AiChatResponse> {
    const model = options.model || this.getDefaultModel();
    const messages = this.buildMessages(options);

    const url = this.baseUrl.includes('/v1')
      ? `${this.baseUrl}/chat/completions`
      : `${this.baseUrl.replace('/v1', '')}/v1/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Local AI error: ${response.status} — ${error}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      text: choice?.message?.content || 'No response.',
      model: data.model || model,
      provider: this.id,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      } : undefined,
      finishReason: choice?.finish_reason,
    };
  }

  async chatStream(options: AiChatOptions, onChunk: (chunk: AiStreamChunk) => void): Promise<void> {
    const model = options.model || this.getDefaultModel();
    const messages = this.buildMessages(options);

    const url = this.baseUrl.includes('/v1')
      ? `${this.baseUrl}/chat/completions`
      : `${this.baseUrl.replace('/v1', '')}/v1/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Local AI error: ${response.status} — ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body for streaming');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const chunk = JSON.parse(line.slice(6));
            const content = chunk.choices?.[0]?.delta?.content || '';
            if (content) {
              onChunk({ text: content, done: false, model: chunk.model || model, provider: this.id });
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    }

    onChunk({ text: '', done: true, model, provider: this.id });
  }

  private buildMessages(options: AiChatOptions): any[] {
    const messages: any[] = [];

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    for (const msg of options.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }

    return messages;
  }

  private defaultModels(): AiModelInfo[] {
    return [
      { id: 'llama3', name: 'Llama 3', provider: this.id, capabilities: LOCAL_CAPABILITIES },
      { id: 'mistral', name: 'Mistral', provider: this.id, capabilities: LOCAL_CAPABILITIES },
      { id: 'codellama', name: 'Code Llama', provider: this.id, capabilities: LOCAL_CAPABILITIES },
      { id: 'phi3', name: 'Phi-3', provider: this.id, capabilities: LOCAL_CAPABILITIES },
    ];
  }
}
