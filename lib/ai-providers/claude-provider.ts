/**
 * Claude AI Provider — Anthropic's Claude models
 *
 * Uses Anthropic's REST API directly.
 * Users provide their own API key — AI works FOR the user.
 */

import { IAiProvider, AiCapabilities, AiModelInfo, AiChatOptions, AiChatResponse, AiStreamChunk } from './ai-provider';

const CLAUDE_MODELS: AiModelInfo[] = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'claude',
    capabilities: { streaming: true, tools: true, vision: true, maxTokens: 8192, maxContextTokens: 200000, supportedFeatures: ['chat', 'vision', 'code', 'tools'] },
    costPer1kTokens: { input: 3.0, output: 15.0 },
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'claude',
    capabilities: { streaming: true, tools: true, vision: true, maxTokens: 8192, maxContextTokens: 200000, supportedFeatures: ['chat', 'vision', 'code', 'tools'] },
    costPer1kTokens: { input: 0.8, output: 4.0 },
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'claude',
    capabilities: { streaming: true, tools: true, vision: true, maxTokens: 8192, maxContextTokens: 200000, supportedFeatures: ['chat', 'vision', 'code', 'tools'] },
    costPer1kTokens: { input: 3.0, output: 15.0 },
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    provider: 'claude',
    capabilities: { streaming: true, tools: true, vision: true, maxTokens: 8192, maxContextTokens: 200000, supportedFeatures: ['chat', 'vision', 'code', 'tools'] },
    costPer1kTokens: { input: 15.0, output: 75.0 },
  },
];

export class ClaudeProvider implements IAiProvider {
  id = 'claude';
  name = 'Anthropic Claude';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.baseUrl = baseUrl || 'https://api.anthropic.com/v1';
  }

  async isAvailable(): Promise<boolean> {
    return this.apiKey.length > 0;
  }

  getCapabilities(model?: string): AiCapabilities {
    const modelInfo = CLAUDE_MODELS.find(m => m.id === (model || this.getDefaultModel()));
    return modelInfo?.capabilities || CLAUDE_MODELS[0]!.capabilities;
  }

  async listModels(): Promise<AiModelInfo[]> {
    return CLAUDE_MODELS;
  }

  getDefaultModel(): string {
    return 'claude-sonnet-4-20250514';
  }

  async chat(options: AiChatOptions): Promise<AiChatResponse> {
    const model = options.model || this.getDefaultModel();
    const { system, messages } = this.buildRequest(options);

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.7,
        system,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} — ${error}`);
    }

    const data = await response.json();
    const textBlock = data.content?.find((b: any) => b.type === 'text');

    return {
      text: textBlock?.text || 'No response.',
      model: data.model || model,
      provider: this.id,
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      } : undefined,
      finishReason: data.stop_reason,
    };
  }

  async chatStream(options: AiChatOptions, onChunk: (chunk: AiStreamChunk) => void): Promise<void> {
    const model = options.model || this.getDefaultModel();
    const { system, messages } = this.buildRequest(options);

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.7,
        system,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} — ${error}`);
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
            const event = JSON.parse(line.slice(6));
            if (event.type === 'content_block_delta' && event.delta?.text) {
              onChunk({ text: event.delta.text, done: false, model: event.model || model, provider: this.id });
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    }

    onChunk({ text: '', done: true, model, provider: this.id });
  }

  private buildRequest(options: AiChatOptions): { system: string | undefined; messages: any[] } {
    const system = options.systemPrompt;
    const messages: any[] = [];

    for (const msg of options.messages) {
      const content: any = msg.images?.length
        ? [
            { type: 'text', text: msg.content },
            ...msg.images.map(img => ({
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: img },
            })),
          ]
        : msg.content;

      messages.push({ role: msg.role, content });
    }

    return { system, messages };
  }
}
