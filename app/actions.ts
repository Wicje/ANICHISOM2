'use server';

import { chatWithFallback, getAiProvider } from '@/lib/ai-providers/ai-provider-factory';

export async function generateChatResponse(
  prompt: string,
  customSystemPrompt: string = 'You are a helpful AI assistant.',
  model?: string,
  provider?: string,
) {
  try {
    const chatOptions = {
      messages: [{ role: 'user' as const, content: prompt }],
      systemPrompt: customSystemPrompt,
      model,
      maxTokens: 4096,
      temperature: 0.7,
    };

    if (provider) {
      const aiProvider = getAiProvider(provider);
      if (!(await aiProvider.isAvailable())) {
        return { success: false, error: `Provider "${provider}" is not available. Check server configuration.` };
      }
      const response = await aiProvider.chat(chatOptions);
      return { success: true, text: response.text };
    }

    const response = await chatWithFallback(chatOptions);
    return { success: true, text: response.text };
  } catch (error: unknown) {
    console.error('[AI] Chat error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error.';
    if (message.includes('All AI providers')) {
      return { success: false, error: 'All AI providers failed. Ensure at least one is configured in server settings.' };
    }
    return { success: false, error: 'AI Gateway Error: ' + message };
  }
}

export async function generateTerminalResponse(
  prompt: string,
  model?: string,
  provider?: string,
) {
  try {
    const chatOptions = {
      messages: [{ role: 'user' as const, content: prompt }],
      systemPrompt: 'You are an AI assistant integrated into a web-based operating system terminal (ContinuaOS OS). Respond concisely and technically as if producing CLI output.',
      model,
      maxTokens: 2048,
      temperature: 0.4,
    };

    if (provider) {
      const aiProvider = getAiProvider(provider);
      if (!(await aiProvider.isAvailable())) {
        return { success: false, error: `Provider "${provider}" is not available.` };
      }
      const response = await aiProvider.chat(chatOptions);
      return { success: true, text: response.text };
    }

    const response = await chatWithFallback(chatOptions);
    return { success: true, text: response.text };
  } catch (error: unknown) {
    console.error('[AI] Terminal error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error.';
    return { success: false, error: 'AI Gateway Error: ' + message };
  }
}
