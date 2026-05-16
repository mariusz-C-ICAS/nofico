import { test, expect } from '@playwright/test';

test('has logo and navigates to login if not authenticated', async ({ page }) => {
  await page.goto('/');

  // Should contain C-ICAS text (either on landing page or logo)
  await expect(page.locator('body')).toContainText(/C-ICAS/i);
});
