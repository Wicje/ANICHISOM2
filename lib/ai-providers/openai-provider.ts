/**
 * OpenAI AI Provider — GPT-4, GPT-3.5, etc.
 *
 * Uses the OpenAI REST API directly (no SDK dependency needed).
 * Users provide their own API key — AI works FOR the user.
 */

import { IAiProvider, AiCapabilities, AiModelInfo, AiChatOptions, AiChatResponse, AiStreamChunk } from './ai-provider';

const OPENAI_MODELS: AiModelInfo[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    capabilities: { streaming: true, tools: true, vision: true, maxTokens: 16384, maxContextTokens: 128000, supportedFeatures: ['chat', 'vision', 'code', 'tools'] },
    costPer1kTokens: { input: 5.0, output: 15.0 },
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    capabilities: { streaming: true, tools: true, vision: true, maxTokens: 16384, maxContextTokens: 128000, supportedFeatures: ['chat', 'vision', 'code', 'tools'] },
    costPer1kTokens: { input: 0.15, output: 0.6 },
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    capabilities: { streaming: true, tools: true, vision: true, maxTokens: 4096, maxContextTokens: 128000, supportedFeatures: ['chat', 'vision', 'code', 'tools'] },
    costPer1kTokens: { input: 10.0, output: 30.0 },
  },
  {
    id: 'o3-mini',
    name: 'o3-mini',
    provider: 'openai',
    capabilities: { streaming: true, tools: true, vision: false, maxTokens: 100000, maxContextTokens: 200000, supportedFeatures: ['chat', 'code', 'tools', 'reasoning'] },
    costPer1kTokens: { input: 1.1, output: 4.4 },
  },
];

export class OpenAIProvider implements IAiProvider {
  id = 'openai';
  name = 'OpenAI';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.baseUrl = baseUrl || 'https://api.openai.com/v1';
  }

  async isAvailable(): Promise<boolean> {
    return this.apiKey.length > 0;
  }

  getCapabilities(model?: string): AiCapabilities {
    const modelInfo = OPENAI_MODELS.find(m => m.id === (model || this.getDefaultModel()));
    return modelInfo?.capabilities || OPENAI_MODELS[0].capabilities;
  }

  async listModels(): Promise<AiModelInfo[]> {
    return OPENAI_MODELS;
  }

  getDefaultModel(): string {
    return 'gpt-4o-mini';
  }

  async chat(options: AiChatOptions): Promise<AiChatResponse> {
    const model = options.model || this.getDefaultModel();
    const messages = this.buildMessages(options);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
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
      throw new Error(`OpenAI API error: ${response.status} — ${error}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      text: choice?.message?.content || 'No response.',
      model: data.model || model,
      provider: this.id,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
      finishReason: choice?.finish_reason,
    };
  }

  async chatStream(options: AiChatOptions, onChunk: (chunk: AiStreamChunk) => void): Promise<void> {
    const model = options.model || this.getDefaultModel();
    const messages = this.buildMessages(options);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
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
      throw new Error(`OpenAI API error: ${response.status} — ${error}`);
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
      const content: any = msg.images?.length
        ? [
            { type: 'text', text: msg.content },
            ...msg.images.map(img => ({ type: 'image_url', image_url: { url: img } })),
          ]
        : msg.content;

      messages.push({ role: msg.role, content });
    }

    return messages;
  }
}
