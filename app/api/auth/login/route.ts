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
import { createSession, createDevMasterSession } from '@/lib/session-store';

export async function POST(request: NextRequest) {
  try {
    // CSRF Protection: Validate Origin/Host headers
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (origin && host) {
      const parsedOrigin = new URL(origin);
      if (parsedOrigin.host !== host) {
        return NextResponse.json(
          { error: 'Forbidden: CSRF check failed' },
          { status: 403 }
        );
      }
    }
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate request body is object
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    const bodyObj = body as Record<string, unknown>;

    // Check required fields
    const fieldsCheck = validateRequiredFields(bodyObj, ['uniqueId']);
    if (!fieldsCheck.valid) {
      return NextResponse.json(
        { error: `Missing required fields: ${fieldsCheck.missing?.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate unique ID format
    const uniqueIdValidation = validateUniqueId(bodyObj.uniqueId);
    if (!uniqueIdValidation.valid) {
      return NextResponse.json(
        { error: uniqueIdValidation.error },
        { status: 400 }
      );
    }

    const uniqueId = sanitizeInput(bodyObj.uniqueId as string);

    // Rate limiting: 10 attempts per 5 minutes per IP
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-client-ip') || 
                     'unknown';
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
    const authProvider = getAuthProvider();

    // Dev-only master key bypass — requires DEV_MASTER_KEY env var (S-02 hardened)
    // NEVER available in production; requires explicit opt-in via environment
    const devMasterKey = process.env.DEV_MASTER_KEY;
    if (
      process.env.NODE_ENV === 'development' &&
      devMasterKey &&
      uniqueId === devMasterKey
    ) {
      const crypto = await import('crypto');
      const devToken = 'dev-master-' + crypto.randomBytes(32).toString('hex');
      createDevMasterSession(devToken);
      const response = NextResponse.json(
        {
          success: true,
          user: {
            id: 'master-user-id',
            uniqueId: 'dev-master',
            role: 'admin',
          },
        },
        { status: 200 }
      );

      response.cookies.set({
        name: 'anichisom_session',
        value: devToken,
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/',
        maxAge: 24 * 60 * 60,
      });

      return response;
    }

    // Attempt login
    let result;
    try {
      result = await authProvider.login({ uniqueId });
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message || 'Login failed' },
        { status: 401 }
      );
    }

    if (!result || !result.user) {
      return NextResponse.json(
        { error: 'Session creation failed' },
        { status: 500 }
      );
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
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: result.user.id,
          uniqueId: result.user.name || uniqueId,
          role: result.user.role || 'user',
        },
      },
      { status: 200 }
    );

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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
    return NextResponse.json(
      { error: 'Failed to generate ID' },
      { status: 500 }
    );
  }
}
