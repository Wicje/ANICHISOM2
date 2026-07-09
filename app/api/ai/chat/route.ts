/**
 * Multi-AI Chat Endpoint
 *
 * POST /api/ai/chat
 *
 * Body: { prompt, systemPrompt, model, provider, messages }
 *
 * Supports any configured AI provider with fallback chain.
 * AI works FOR the user — they pick their model.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/auth-validation';
import { resolveSession } from '@/lib/session-store';
import { getAiProvider, chatWithFallback } from '@/lib/ai-providers/ai-provider-factory';

export async function POST(request: NextRequest) {
  try {
    // Auth check — must have valid session
    const sessionCookie = request.cookies.get('anichisom_session');
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const sessionData = resolveSession(sessionCookie.value);
    if (!sessionData) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    // Rate limiting: 30 requests per minute per user
    const rateCheck = checkRateLimit(`ai-chat:${sessionData.userId}`, 30, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Parse request
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
    }

    const bodyObj = body as Record<string, unknown>;
    const prompt = bodyObj.prompt as string;
    const systemPrompt = bodyObj.systemPrompt as string || 'You are a helpful AI assistant.';
    const providerId = bodyObj.provider as string | undefined;
    const model = bodyObj.model as string | undefined;
    const messages = bodyObj.messages as any[] | undefined;

    if (!prompt && !messages) {
      return NextResponse.json({ error: 'Missing prompt or messages' }, { status: 400 });
    }

    // Build chat options
    const chatMessages = messages || [
      { role: 'user' as const, content: prompt },
    ];

    const chatOptions = {
      messages: chatMessages,
      systemPrompt,
      model,
      maxTokens: 4096,
      temperature: 0.7,
    };

    // If provider specified, use it directly; otherwise use fallback chain
    if (providerId) {
      const provider = getAiProvider(providerId);
      if (!(await provider.isAvailable())) {
        return NextResponse.json(
          { error: `Provider ${providerId} is not available. Check your API key configuration.` },
          { status: 503 }
        );
      }

      try {
        const response = await provider.chat(chatOptions);
        return NextResponse.json({ success: true, ...response });
      } catch (error: any) {
        return NextResponse.json(
          { success: false, error: `Provider ${providerId} error: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // Use fallback chain
    try {
      const response = await chatWithFallback(chatOptions);
      return NextResponse.json({ success: true, ...response });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('[ai/chat] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
