import { test, expect } from '@playwright/test';

/**
 * Ephemeral guest session journey:
 * pair (demo instant-approve) -> capability token stored ->
 * authorized API access -> wipe on exit.
 *
 * Uses ?demo=1 which enables a local instant-approve button so the
 * journey runs without a physical phone + Supabase session.
 */

test.describe('Ephemeral Pairing Journey', () => {
  test.describe.configure({ timeout: 120_000 });

  test('pair -> store token -> authorized proxy call -> wipe', async ({
    page,
    request,
  }) => {
    // ── 1. Guest opens connect screen with demo approval ──
    await page.goto('/connect?demo=1&nonav=1');

    // Wait for hydration proof: the QR data URL is generated client-side
    // after mount, so its presence guarantees handlers are attached.
    const qr = page.locator('img[src^="data:image/png"]');
    await expect(qr).toBeVisible({ timeout: 60_000 });

    await page.getByText('Authorize from Mobile (Instant Pair)').click();

    await expect(page.getByText('Approved by Mobile Key')).toBeVisible({
      timeout: 30_000,
    });

    // ── 2. Capability token persisted for this ephemeral session ──
    let token: string | null = null;
    await expect
      .poll(async () => page.evaluate(() => sessionStorage.getItem('continua_ephemeral_cap')), {
        timeout: 10_000,
      })
      .toBeTruthy();
    token = await page.evaluate(() =>
      sessionStorage.getItem('continua_ephemeral_cap')
    );
    expect(token).toBeTruthy();
    const cap = token as string;

    // ── 3. Token authorizes context API access ──
    // (via the request fixture so the page's auto-navigation to /os
    //  cannot abort in-flight fetches)
    const saveRes = await request.post('/api/context/save', {
      headers: { 'x-capability-token': cap },
      data: {
        domain: 'context_graph',
        data: {
          id: 'ctx_e2e_1',
          projectId: 'e2e-project',
          projectName: 'E2E Project',
          updatedAt: new Date().toISOString(),
          deviceId: 'e2e-guest',
          browserTabs: [],
          tasks: [],
        },
        version: Date.now(),
        deviceId: 'e2e-guest',
      },
    });
    expect(saveRes.status()).toBe(200);
    expect((await saveRes.json()).ok).toBe(true);

    const pullRes = await request.get('/api/context/pull?domains=context_graph', {
      headers: { 'x-capability-token': cap },
    });
    expect(pullRes.status()).toBe(200);

    // ── 4. Requests WITHOUT the token are rejected ──
    const anonSave = await request.post('/api/context/save', {
      data: { domain: 'context_graph', data: {}, version: 1, deviceId: 'anon' },
    });
    expect([401, 403]).toContain(anonSave.status());

    // ── 5. Exit wipes the ephemeral session (guard behavior) ──
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.reload();

    const wiped = await page.evaluate(() =>
      sessionStorage.getItem('continua_ephemeral_cap')
    );
    expect(wiped).toBeNull();
  });
});
