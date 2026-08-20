import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/os';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Sync user into users table if table exists
      try {
        await supabase.from('users').upsert({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
          avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null,
          role: data.user.user_metadata?.role || 'user',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (dbErr) {
        console.warn('[Auth Callback] Upsert to users table skipped/failed:', dbErr);
      }

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return to OS with error if code exchange fails
  return NextResponse.redirect(`${origin}/os?error=auth-code-error`);
}
