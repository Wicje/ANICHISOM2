/**
 * AI Models Listing Endpoint
 *
 * GET /api/ai/models
 *
 * Returns all available models from enabled providers.
 * Auth required — AI works FOR the user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveSession } from '@/lib/session-store';
import { listAllModels, getEnabledProviders, getRegisteredProviders, getFallbackChain, getDefaultProviderId } from '@/lib/ai-providers/ai-provider-factory';

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('anichisom_session');
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const sessionData = resolveSession(sessionCookie.value);
    if (!sessionData) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const models = await listAllModels();

    return NextResponse.json({
      models,
      defaultProvider: getDefaultProviderId(),
      fallbackChain: getFallbackChain(),
      enabledProviders: getEnabledProviders(),
      registeredProviders: getRegisteredProviders(),
    });
  } catch (error) {
    console.error('[ai/models] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
