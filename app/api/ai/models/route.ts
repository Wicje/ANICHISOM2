/**
 * AI Models Listing Endpoint
 *
 * GET /api/ai/models
 *
 * Returns all available models from enabled providers.
 * Auth required — AI works FOR the user.
 */

import { NextRequest } from 'next/server';
import { requireSession, apiOk, apiInternal } from '@/lib/api-helpers';
import { listAllModels, getEnabledProviders, getRegisteredProviders, getFallbackChain, getDefaultProviderId } from '@/lib/ai-providers/ai-provider-factory';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireSession(request);
    if (!authResult.ok) return authResult.response;

    const models = await listAllModels();

    return apiOk({
      models,
      defaultProvider: getDefaultProviderId(),
      fallbackChain: getFallbackChain(),
      enabledProviders: getEnabledProviders(),
      registeredProviders: getRegisteredProviders(),
    });
  } catch (error) {
    console.error('[ai/models] Error:', error);
    return apiInternal();
  }
}
