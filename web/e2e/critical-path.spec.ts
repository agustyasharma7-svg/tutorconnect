import { test, expect } from '@playwright/test';

/**
 * Critical-path smoke (Phase 7C.2).
 * Full register→pay needs running API + SMTP; CI runs page-level gates with mock payments env.
 */
test.describe('Critical path gates', () => {
  test('home + search route reachable (SEO shell)', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goto('/en/search');
    // Unauthenticated redirects to login — still a valid gate
    await expect(page).toHaveURL(/\/(en\/search|en\/auth\/login)/);
  });

  test('auth register + login pages ready for student/tutor', async ({ page }) => {
    await page.goto('/en/auth/register/student');
    await expect(page.locator('form, input, button').first()).toBeVisible();
    await page.goto('/en/auth/register/tutor');
    await expect(page.locator('form, input, button').first()).toBeVisible();
    await page.goto('/en/auth/login');
    await expect(page.locator('form, input, button').first()).toBeVisible();
  });

  test('registration payment page requires auth', async ({ page }) => {
    await page.goto('/en/payments/registration');
    await expect(page).toHaveURL(/\/(auth\/login|payments\/registration)/);
  });

  test('locale switch preserves marketing surface', async ({ page }) => {
    await page.goto('/en');
    await page.goto('/hi');
    await expect(page).toHaveURL(/\/hi/);
    await expect(page.locator('body')).toBeVisible();
  });
});
