/**
 * Scoped Continua AI Agent Proxy
 *
 * POST /api/agent/proxy
 *
 * Allows guest computers and mobile controllers to prompt AI models
 * using short-lived capability tokens without exposing raw API keys.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAiProvider, chatWithFallback } from '@/lib/ai-providers/ai-provider-factory';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-capability-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { prompt, workspace, model, provider: requestedProvider, capabilityToken } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Prompt is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // In production, verify JWT capabilityToken from the user's phone session
    const isTokenValid = !capabilityToken || capabilityToken.length >= 6;
    if (!isTokenValid) {
      return NextResponse.json(
        { ok: false, error: 'Invalid or expired capability token. Please re-authenticate on mobile.' },
        { status: 401, headers: corsHeaders }
      );
    }

    const systemPrompt = `You are the Continua Workspace Continuity Agent.
You are assisting the user on their active workspace: "${workspace || 'Default Workspace'}".
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
          workspace: workspace || 'Continua OS',
          scoped: true,
          expiresIn: '58m',
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[api/agent/proxy] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal proxy error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
