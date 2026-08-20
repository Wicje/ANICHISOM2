/**
 * Qwen AI Provider — Alibaba's Qwen models
 *
 * Uses DashScope (Qwen's API) which is OpenAI-compatible.
 * Users provide their own API key — AI works FOR the user.
 */

import { IAiProvider, AiCapabilities, AiModelInfo, AiChatOptions, AiChatResponse, AiStreamChunk } from './ai-provider';

const QWEN_MODELS: AiModelInfo[] = [
  {
    id: 'qwen-max',
    name: 'Qwen Max',
    provider: 'qwen',
    capabilities: { streaming: true, tools: true, vision: false, maxTokens: 8192, maxContextTokens: 32000, supportedFeatures: ['chat', 'code', 'tools'] },
  },
  {
    id: 'qwen-plus',
    name: 'Qwen Plus',
    provider: 'qwen',
    capabilities: { streaming: true, tools: true, vision: false, maxTokens: 8192, maxContextTokens: 32000, supportedFeatures: ['chat', 'code', 'tools'] },
  },
  {
    id: 'qwen-turbo',
    name: 'Qwen Turbo',
    provider: 'qwen',
    capabilities: { streaming: true, tools: true, vision: false, maxTokens: 8192, maxContextTokens: 32000, supportedFeatures: ['chat', 'code', 'tools'] },
  },
  {
    id: 'qwen-vl-max',
    name: 'Qwen VL Max (Vision)',
    provider: 'qwen',
    capabilities: { streaming: true, tools: false, vision: true, maxTokens: 8192, maxContextTokens: 32000, supportedFeatures: ['chat', 'vision', 'code'] },
  },
];

export class QwenProvider implements IAiProvider {
  id = 'qwen';
  name = 'Alibaba Qwen';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || (typeof window !== 'undefined' ? (localStorage.getItem('continuaos_ai_qwen_key') || localStorage.getItem('continuaos_qwen_api_key') || '') : '') || process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || '';
    this.baseUrl = baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  }

  async isAvailable(): Promise<boolean> {
    return this.apiKey.length > 0;
  }

  getCapabilities(model?: string): AiCapabilities {
    const modelInfo = QWEN_MODELS.find(m => m.id === (model || this.getDefaultModel()));
    return modelInfo?.capabilities || QWEN_MODELS[0]!.capabilities;
  }

  async listModels(): Promise<AiModelInfo[]> {
    return QWEN_MODELS;
  }

  getDefaultModel(): string {
    return 'qwen-plus';
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
      throw new Error(`Qwen API error: ${response.status} — ${error}`);
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
      throw new Error(`Qwen API error: ${response.status} — ${error}`);
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
}
