import { test, expect } from '@playwright/test';
import { seed } from './api';

test.describe('sign in', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('signs in with the seeded account and leaves the sign-in page', async ({ page }) => {
    const s = seed();
    await page.goto('/signin');
    await page.locator('input[type="text"]').first().fill(s.email);
    await page.locator('input[type="password"]').fill(s.password);
    await page.locator('button[type="submit"]').click();
    await expect(page).not.toHaveURL(/signin/, { timeout: 20_000 });
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeTruthy();
  });
});

const pages: [string, RegExp][] = [
  ['/locations', /Branches & Warehouses/],
  ['/head-office', /Head Office/],
  ['/stock-transfer', /Stock Transfers/],
  ['/stock-requests', /Stock Requisitions/],
  ['/stock-ledger', /Stock Ledger/],
  ['/customer-accounts', /Customer Accounts/],
  ['/price-levels', /Price Levels/],
  ['/medicine-catalogue', /Medicine Catalogue/],
  ['/online-channels', /Online Channels/],
  ['/manufacturing', /Manufacturing/],
  ['/restaurant-setup', /Restaurant Setup/],
  ['/size-colour-report', /Size & Colour Sales/],
  ['/pos-restaurant', /Restaurant/],
  ['/pos-kitchen', /Kitchen/],
  ['/pos', /Order Details/],
];

test.describe('every new screen opens without errors', () => {
  for (const [url, heading] of pages) {
    test(`opens ${url}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(url);
      await expect(page.getByText(heading).first()).toBeVisible();
      await page.waitForLoadState('networkidle');
      // A failed API call shows a SweetAlert error.
      await expect(page.locator('.swal2-icon-error')).toHaveCount(0);
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }
});
