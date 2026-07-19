/**
 * Bootstrap Check — Is there an admin user yet?
 *
 * GET /api/auth/bootstrap/check
 *
 * Returns { needsBootstrap: true } if no admin exists (safe to show the button).
 * Returns { needsBootstrap: false } if an admin already exists (hide everything).
 */

import { apiOk } from '@/lib/api-helpers';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('is_admin', true)
      .limit(1);

    if (error) {
      return apiOk({ needsBootstrap: true });
    }

    return apiOk({ needsBootstrap: !data || data.length === 0 });
  } catch (error) {
    console.error('[bootstrap/check] Error:', error);
    return apiOk({ needsBootstrap: true });
  }
}
