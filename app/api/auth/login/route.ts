/**
 * Authentication Login Endpoint
 * 
 * POST /api/auth/login
 * 
 * Body: { uniqueId: string }
 * 
 * Security:
 * - Input validation to prevent injection
 * - Rate limiting to prevent brute force
 * - Session token generation
 * - Secure cookies (HTTP-only, same-site)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  validateUniqueId,
  validateRequiredFields,
  checkRateLimit,
  sanitizeInput,
} from '@/lib/auth-validation';
import { getAuthProvider } from '@/lib/auth-providers/provider-factory';
import { createSession } from '@/lib/session-store';
import {
  apiError,
  apiForbidden,
  apiUnauthorized,
  apiInternal,
  apiOk,
} from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    // CSRF Protection: Validate Origin/Host headers
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (origin && host) {
      const parsedOrigin = new URL(origin);
      if (parsedOrigin.host !== host) {
        return apiForbidden('Forbidden: CSRF check failed');
      }
    }
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON in request body');
    }

    // Validate request body is object
    if (typeof body !== 'object' || body === null) {
      return apiError('Request body must be a JSON object');
    }

    const bodyObj = body as Record<string, unknown>;

    // Check required fields
    const fieldsCheck = validateRequiredFields(bodyObj, ['uniqueId']);
    if (!fieldsCheck.valid) {
      return apiError(`Missing required fields: ${fieldsCheck.missing?.join(', ')}`);
    }

    // Validate unique ID format
    const uniqueIdValidation = validateUniqueId(bodyObj.uniqueId);
    if (!uniqueIdValidation.valid) {
      return apiError(uniqueIdValidation.error || 'Invalid unique ID');
    }

    const uniqueId = sanitizeInput(bodyObj.uniqueId as string);

    // Rate limiting: 10 attempts per 5 minutes per IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor
      ? forwardedFor.split(',').pop()?.trim() || 'unknown'
      : request.headers.get('x-client-ip') || 'unknown';
    const rateLimitKey = `login:${clientIp}`;
    const rateLimitCheck = checkRateLimit(rateLimitKey, 10, 5 * 60 * 1000);

    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many login attempts. Please try again later.',
          resetAt: new Date(rateLimitCheck.resetAt).toISOString(),
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitCheck.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    // Get configured auth provider
    const authProvider = await getAuthProvider();

    // Attempt login
    let result;
    try {
      result = await authProvider.login({ uniqueId });
    } catch (err: any) {
      return apiUnauthorized(err?.message || 'Login failed');
    }

    if (!result || !result.user) {
      return apiInternal('Session creation failed');
    }

    // Generate crypto-random session token — never use userId as token (S-06)
    const crypto = await import('crypto');
    const sessionToken = result.token || crypto.randomBytes(32).toString('hex');

    // Register session in store so the session route can resolve token → user
    createSession(
      sessionToken,
      result.user.id,
      result.user.name || uniqueId,
      result.user.role || 'user',
    );

    // Create response with secure session cookie
    const response = apiOk({
      user: {
        id: result.user.id,
        uniqueId: result.user.name || uniqueId,
        role: result.user.role || 'user',
      },
    });

    // Set HTTP-only, secure cookie
    const isProduction = process.env.NODE_ENV === 'production';
    response.cookies.set({
      name: 'anichisom_session',
      value: sessionToken,
      httpOnly: true,
      secure: isProduction, // Only send over HTTPS in production
      sameSite: 'strict',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error('[auth/login] Unexpected error:', error);
    return apiInternal();
  }
}

export async function GET(request: NextRequest) {
  /**
   * GET endpoint to generate a random unique ID for new users
   * This helps users who don't know what ID to use
   */
  try {
    const randomId = `user_${Math.random().toString(36).substring(2, 12)}`;
    
    return NextResponse.json({
      generatedId: randomId,
      message: 'Use this ID to login, or customize it to your preference',
    });
  } catch (error) {
    console.error('[auth/login] ID generation error:', error);
    return apiInternal('Failed to generate ID');
  }
}
