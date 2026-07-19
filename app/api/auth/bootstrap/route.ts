/**
 * Bootstrap API — Create the first admin user (no invite required)
 *
 * POST /api/auth/bootstrap
 *
 * Only works when no admin user exists yet. Prevents privilege escalation.
 */

import { NextRequest } from 'next/server';
import { apiOk, apiError, apiInternal } from '@/lib/api-helpers';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if any admin user already exists
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('is_admin', true)
      .limit(1);

    if (existingAdmin && existingAdmin.length > 0) {
      return apiError('Admin account already exists. Use the invite system instead.', 403);
    }

    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return apiError('Email and password are required');
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return apiError('Email and password must be strings');
    }

    if (password.length < 6) {
      return apiError('Password must be at least 6 characters');
    }

    // Create the user via Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0],
          role: 'admin',
        },
      },
    });

    if (error) {
      return apiError(error.message);
    }

    if (!data.user) {
      return apiInternal('Signup failed');
    }

    // Wait briefly for the auth trigger to create the users row
    await new Promise((r) => setTimeout(r, 1000));

    // Ensure the users row has admin flag
    const { error: updateError } = await supabase
      .from('users')
      .update({ is_admin: true, role: 'admin' })
      .eq('id', data.user.id);

    if (updateError) {
      console.warn('[bootstrap] Could not set admin flag (trigger may handle it):', updateError.message);
    }

    return apiOk({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: name || email.split('@')[0],
        role: 'admin',
      },
      message: data.session
        ? 'Admin account created successfully'
        : 'Check your email to confirm your account',
    });
  } catch (error) {
    console.error('[bootstrap] Error:', error);
    return apiInternal();
  }
}
