/**
 * Gemini AI Provider — Google's Gemini models
 *
 * Uses the existing @google/genai SDK that's already in the project.
 * Supports: gemini-3.5-flash, gemini-1.5-pro, gemini-pro-vision
 */

import { IAiProvider, AiCapabilities, AiModelInfo, AiChatOptions, AiChatResponse, AiStreamChunk, AiMessage } from './ai-provider';

const GEMINI_MODELS: AiModelInfo[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    capabilities: { streaming: true, tools: true, vision: true, maxTokens: 8192, maxContextTokens: 1000000, supportedFeatures: ['chat', 'vision', 'code', 'tools'] },
    costPer1kTokens: { input: 0.0, output: 0.0 },
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'gemini',
    capabilities: { streaming: true, tools: true, vision: true, maxTokens: 8192, maxContextTokens: 2000000, supportedFeatures: ['chat', 'vision', 'code', 'tools'] },
    costPer1kTokens: { input: 0.0, output: 0.0 },
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    capabilities: { streaming: true, tools: true, vision: true, maxTokens: 8192, maxContextTokens: 2000000, supportedFeatures: ['chat', 'vision', 'code', 'tools'] },
    costPer1kTokens: { input: 0.0, output: 0.0 },
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    provider: 'gemini',
    capabilities: { streaming: true, tools: true, vision: true, maxTokens: 8192, maxContextTokens: 1000000, supportedFeatures: ['chat', 'vision', 'code', 'tools'] },
    costPer1kTokens: { input: 0.0, output: 0.0 },
  },
];

export class GeminiProvider implements IAiProvider {
  id = 'gemini';
  name = 'Google Gemini';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || (typeof window !== 'undefined' ? (localStorage.getItem('continuaos_ai_gemini_key') || localStorage.getItem('continuaos_gemini_api_key') || '') : '') || process.env.GEMINI_API_KEY || '';
  }

  async isAvailable(): Promise<boolean> {
    return this.apiKey.length > 0;
  }

  getCapabilities(model?: string): AiCapabilities {
    const modelInfo = GEMINI_MODELS.find(m => m.id === (model || this.getDefaultModel()));
    return modelInfo?.capabilities || GEMINI_MODELS[0]!.capabilities;
  }

  async listModels(): Promise<AiModelInfo[]> {
    return GEMINI_MODELS;
  }

  getDefaultModel(): string {
    return 'gemini-3.5-flash';
  }

  async chat(options: AiChatOptions): Promise<AiChatResponse> {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    const model = options.model || this.getDefaultModel();

    // Build the prompt from messages
    const systemPrompt = options.systemPrompt || '';
    const contents = this.buildContents(options.messages, systemPrompt);

    const response = await ai.models.generateContent({
      model,
      contents,
    });

    return {
      text: response.text || 'No response.',
      model,
      provider: this.id,
      finishReason: 'stop',
    };
  }

  async chatStream(options: AiChatOptions, onChunk: (chunk: AiStreamChunk) => void): Promise<void> {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    const model = options.model || this.getDefaultModel();
    const systemPrompt = options.systemPrompt || '';
    const contents = this.buildContents(options.messages, systemPrompt);

    const response = await ai.models.generateContentStream({
      model,
      contents,
    });

    for await (const chunk of response) {
      onChunk({
        text: chunk.text || '',
        done: false,
        model,
        provider: this.id,
      });
    }

    onChunk({ text: '', done: true, model, provider: this.id });
  }

  private buildContents(messages: AiMessage[], systemPrompt: string): any[] {
    const contents: any[] = [];

    if (systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: systemPrompt }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I will follow these instructions.' }],
      });
    }

    for (const msg of messages) {
      const parts: any[] = [];
      if (msg.content) parts.push({ text: msg.content });
      if (msg.images) {
        for (const img of msg.images) {
          parts.push({ inlineData: { mimeType: 'image/jpeg', data: img } });
        }
      }

      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      });
    }

    return contents;
  }
}
