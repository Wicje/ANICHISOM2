/**
 * Scoped Continua AI Agent Proxy
 *
 * POST /api/agent/proxy
 *
 * Allows guest computers and mobile controllers to prompt AI models
 * using short-lived capability tokens without exposing raw API keys.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildCorsHeaders } from '@/lib/cors';
import { getAiProvider, chatWithFallback } from '@/lib/ai-providers/ai-provider-factory';
import {
  extractTokenFromRequest,
  verifyCapabilityToken,
} from '@/lib/capability-token';

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: buildCorsHeaders(request) });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { prompt, workspace, model, provider: requestedProvider } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Prompt is required' },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    // Verify the signed capability token (JWT). Guest sessions receive one
    // when their pairing is approved; mobile clients mint their own.
    const token =
      extractTokenFromRequest(request) ||
      (typeof body.capabilityToken === 'string' ? body.capabilityToken : null);
    const claims = await verifyCapabilityToken(token);
    if (!claims) {
      return NextResponse.json(
        { ok: false, error: 'Invalid or expired capability token. Please re-authenticate on mobile.' },
        { status: 401, headers: buildCorsHeaders(request) }
      );
    }

    const effectiveWorkspace = workspace || claims.ws;

    const systemPrompt = `You are the Continua Workspace Continuity Agent.
You are assisting the user on their active workspace: "${effectiveWorkspace}".
Provide concise, accurate, actionable code solutions, git commands, and workspace summaries.`;

    const chatOptions = {
      messages: [{ role: 'user' as const, content: prompt }],
      systemPrompt,
      model: model || 'gemini-2.5-pro',
      maxTokens: 4096,
      temperature: 0.7,
    };

    let resultText = '';
    let usedProvider = requestedProvider || 'gemini';

    if (requestedProvider) {
      try {
        const provider = getAiProvider(requestedProvider);
        if (await provider.isAvailable()) {
          const res = await provider.chat(chatOptions);
          resultText = res.text;
        } else {
          // Fallback to chain
          const res = await chatWithFallback(chatOptions);
          resultText = res.text;
          usedProvider = res.provider;
        }
      } catch (err: any) {
        const res = await chatWithFallback(chatOptions);
        resultText = res.text;
        usedProvider = res.provider;
      }
    } else {
      const res = await chatWithFallback(chatOptions);
      resultText = res.text;
      usedProvider = res.provider;
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          text: resultText,
          provider: usedProvider,
          workspace: effectiveWorkspace,
          scoped: true,
          expiresIn: '58m',
        },
      },
      { headers: buildCorsHeaders(request) }
    );
  } catch (error: any) {
    console.error('[api/agent/proxy] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal proxy error' },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}
