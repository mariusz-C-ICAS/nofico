import { test, expect } from '@playwright/test';

test.describe('Polish Business Validators', () => {
  test('validateNIP — poprawny NIP', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
      const { validateNIP } = await import('/src/shared/lib/validators/services/validators');
      return validateNIP('5252248481');
    });
    expect(result.valid).toBe(true);
  });

  test('validateNIP — błędny NIP', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
      const { validateNIP } = await import('/src/shared/lib/validators/services/validators');
      return validateNIP('1234567890');
    });
    expect(result.valid).toBe(false);
  });

  test('validatePESEL — poprawny PESEL', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
      const { validatePESEL } = await import('/src/shared/lib/validators/services/validators');
      return validatePESEL('44051401458');
    });
    expect(result.valid).toBe(true);
  });

  test('validateIBAN — poprawny IBAN PL', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
      const { validateIBAN } = await import('/src/shared/lib/validators/services/validators');
      return validateIBAN('PL61109010140000071219812874');
    });
    expect(result.valid).toBe(true);
  });

  test('validateREGON — 9-cyfrowy', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
      const { validateREGON } = await import('/src/shared/lib/validators/services/validators');
      return validateREGON('123456785');
    });
    expect(result.valid).toBe(true);
  });

  test('validatePostalCodePL — poprawny format', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
      const { validatePostalCodePL } = await import('/src/shared/lib/validators/services/validators');
      return validatePostalCodePL('00-001');
    });
    expect(result.valid).toBe(true);
  });
});
