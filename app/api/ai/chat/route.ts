/**
 * Multi-AI Chat Endpoint
 *
 * POST /api/ai/chat
 *
 * Body: { prompt, systemPrompt, model, provider, messages }
 */

import { NextRequest } from 'next/server';
import { requireAuth, apiOk, apiError, apiInternal } from '@/lib/api-helpers';
import { getAiProvider, chatWithFallback } from '@/lib/ai-providers/ai-provider-factory';

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request, 'AI_CHAT');
    if (!auth.ok) return auth.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON');
    }

    if (typeof body !== 'object' || body === null) {
      return apiError('Request body must be JSON');
    }

    const bodyObj = body as Record<string, unknown>;
    const prompt = bodyObj.prompt as string;
    const systemPrompt = (bodyObj.systemPrompt as string) || 'You are a helpful AI assistant.';
    const providerId = bodyObj.provider as string | undefined;
    const model = bodyObj.model as string | undefined;
    const messages = bodyObj.messages as Array<{ role: 'user' | 'system' | 'assistant'; content: string }> | undefined;

    if (!prompt && !messages) {
      return apiError('Missing prompt or messages');
    }

    const chatMessages: Array<{ role: 'user' | 'system' | 'assistant'; content: string }> = messages || [
      { role: 'user', content: prompt },
    ];

    const chatOptions = {
      messages: chatMessages,
      systemPrompt,
      model,
      maxTokens: 4096,
      temperature: 0.7,
    };

    if (providerId) {
      const provider = getAiProvider(providerId);
      if (!(await provider.isAvailable())) {
        return apiError(`Provider ${providerId} is not available. Check your API key configuration.`, 503);
      }

      try {
        const response = await provider.chat(chatOptions);
        return apiOk(response);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return apiError(`Provider ${providerId} error: ${message}`, 500);
      }
    }

    try {
      const response = await chatWithFallback(chatOptions);
      return apiOk(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return apiError(message, 503);
    }
  } catch (error) {
    console.error('[ai/chat] Unexpected error:', error);
    return apiInternal();
  }
}
