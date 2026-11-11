import { expect, Page } from '@playwright/test';

/** Clicks the confirm button of the open SweetAlert and waits for it to close. */
export async function confirmSwal(page: Page, title?: RegExp | string) {
  const popup = page.locator('.swal2-popup');
  await expect(popup).toBeVisible();
  if (title) await expect(page.locator('.swal2-title')).toContainText(title);
  await page.locator('.swal2-confirm').click();
  await expect(popup).toBeHidden();
}

/** Picks a product in the shared product search box (type-ahead). */
export async function pickProduct(page: Page, scope: ReturnType<Page['locator']> | Page, name: string) {
  const input = scope.getByLabel('Search product').first();
  await input.fill(name.slice(0, 8));
  await page.locator('.list-group-item', { hasText: name }).first().click();
}

/** Opens the till on the counter screen if it is not open yet. */
export async function ensureTillOpen(page: Page) {
  // The till status loads after the page; wait for it before deciding.
  await page.waitForLoadState('networkidle');
  const open = page.locator('button.btn-warning', { hasText: 'Open till' });
  const closeShift = page.locator('button', { hasText: /Close shift|Close till|Till #/ });
  await expect(open.or(closeShift).first()).toBeVisible();
  if (await open.isVisible().catch(() => false)) {
    await open.click();
    await page.locator('#till-open-cash').fill('1000');
    await page.locator('.modal').getByRole('button', { name: 'Open till' }).click();
    await expect(page.locator('#till-open-cash')).toBeHidden();
  }
}

/** Adds a product to the counter bill by searching and clicking its card. */
export async function addToBill(page: Page, name: string) {
  const search = page.getByPlaceholder(/Medicine, salt name or barcode/);
  await search.fill(name);
  await page.getByRole('button', { name: `Add ${name} to cart` }).click();
  await search.fill('');
}
