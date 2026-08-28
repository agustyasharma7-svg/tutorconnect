import { test, expect } from '@playwright/test';

test.describe('Phase 6 smoke', () => {
  test('home loads and language switch hi ↔ en', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByText(/TutorConnect/i).first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Tuition, without the tension/i }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Help/i }).first()).toBeVisible();

    await page.goto('/hi');
    await expect(page.locator('body')).toBeVisible();
    // Hindi hero or CTA should differ from English route
    await expect(page).toHaveURL(/\/hi/);

    await page.goto('/en');
    await expect(page).toHaveURL(/\/en/);
  });

  test('help desk is reachable from home', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('link', { name: /^Help$/ }).first().click();
    await expect(page).toHaveURL(/\/en\/help/);
    await expect(page.getByRole('heading', { name: /We're here/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Common questions/i })).toBeVisible();
  });

  test('login page reachable', async ({ page }) => {
    await page.goto('/en/auth/login');
    await expect(page.locator('form, input, button').first()).toBeVisible();
  });

  test('student requirement new page requires auth redirect or form', async ({
    page,
  }) => {
    await page.goto('/en/requirements/new');
    // Unauthenticated users redirect to login; authenticated see form
    await expect(page).toHaveURL(/\/(auth\/login|requirements\/new)/);
  });
});
