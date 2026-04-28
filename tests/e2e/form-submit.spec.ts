import { test, expect } from '@playwright/test';

// Regression cover for the "fill form → click Sign → 404" bug where Netlify
// Forms silently failed to detect the form on the SSR-adapter deploy and
// the POST fell through to the SSR catch-all. The fix routes form POSTs
// through netlify/functions/submit.ts at /api/submit; this test asserts
// the redirect chain still ends on /confirm-thanks/ (not Netlify's yellow
// default 404 page).
//
// Runs against E2E_BASE_URL (default http://localhost:8888 — `netlify dev`).
// Skip the live-prod branch unless E2E_ALLOW_LIVE=1: a real submission writes
// a Supabase row and sends an email.

test.describe('signature form submission', () => {
  test.beforeEach(async ({ baseURL }) => {
    if (!baseURL) test.fail(true, 'baseURL not configured');
    if (baseURL?.includes('fundburnabykids.ca') && !process.env.E2E_ALLOW_LIVE) {
      test.skip(true, 'set E2E_ALLOW_LIVE=1 to run against production');
    }
  });

  test('lands on /confirm-thanks/ after POST', async ({ page }) => {
    await page.goto('/');

    await page.locator('input[name="firstname"]').fill('PlaywrightTest');
    await page.locator('input[name="lastname"]').fill('DontStore');
    await page.locator('input[name="email"]').fill('playwright-smoke@example.invalid');
    await page.locator('select[name="school"]').selectOption('Capitol Hill');
    await page.locator('select[name="grade"]').selectOption('2');
    // Postal with embedded space — the canonical Canadian form. If the
    // pattern attribute doesn't accept it, HTML5 form validation blocks
    // submit and waitForURL below times out.
    await page.locator('input[name="postal"]').fill('V5B 3X6');
    await page.locator('input[name="consent-public"]').check();

    await page.locator('form.action-form button[type="submit"]').click();
    await page.waitForURL(/\/confirm-thanks\/?(\?.*)?$/, { timeout: 20_000 });

    // Hard guard against Netlify's default 404 page leaking through.
    await expect(page.locator('body')).not.toContainText('Page not found');
    await expect(page.locator('h1')).toContainText(/Check your email|请查收邮件/);
  });
});
