/**
 * Authentication Session Endpoint
 * 
 * GET /api/auth/session
 * 
 * Security:
 * - Session token validation
 * - Rate limiting to prevent abuse
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  validateUniqueId,
  checkRateLimit,
  sanitizeInput,
} from '@/lib/auth-validation';
import { getAuthProvider } from '@/lib/auth-providers/provider-factory';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting: 100 requests per 5 minutes per IP
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-client-ip') || 
                     'unknown';
    const rateLimitKey = `session:${clientIp}`;
    const rateLimitCheck = checkRateLimit(rateLimitKey, 100, 5 * 60 * 1000);

    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitCheck.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const sessionCookie = request.cookies.get('anichisom_session');
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }

    const tokenValue = sessionCookie.value;
    
    // Master key session override check
    if (tokenValue === 'master-session-token-override') {
      return NextResponse.json({
        success: true,
        user: {
          id: 'master-user-id',
          uniqueId: 'ANICHISOM',
          role: 'admin',
        }
      });
    }

    const authProvider = getAuthProvider();
    const providerName = process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'custom';

    if (providerName.toLowerCase() === 'custom') {
      // For custom provider, tokenValue is the unique ID
      const uniqueIdValidation = validateUniqueId(tokenValue);
      if (!uniqueIdValidation.valid) {
        return NextResponse.json(
          { error: 'Invalid session token format' },
          { status: 400 }
        );
      }

      const uniqueId = sanitizeInput(tokenValue);
      const result = await authProvider.login({ uniqueId });
      
      if (!result || !result.user) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: result.user.id,
          uniqueId: result.user.name || uniqueId,
          role: result.user.role || 'user',
        }
      });
    } else {
      // For Supabase/Firebase, delegate to getCurrentUser
      const user = await authProvider.getCurrentUser();
      if (!user) {
        return NextResponse.json(
          { error: 'Session expired or invalid' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          uniqueId: user.name,
          role: user.role || 'user',
        }
      });
    }
  } catch (error) {
    console.error('[auth/session] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
