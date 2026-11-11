import { test, expect } from '@playwright/test';
import { seed, call } from './api';
import { confirmSwal } from './helpers';

test('adds a medicine from the shared catalogue to the pharmacy', async ({ page }) => {
  const s = seed();
  await page.goto('/medicine-catalogue');
  await page.getByLabel('Search catalogue').fill(s.catalogueBrand);
  const row = page.locator('tbody tr', { hasText: s.catalogueBrand });
  await expect(row).toContainText('Ibuprofen');
  await row.getByRole('button', { name: 'Add' }).click();
  await confirmSwal(page, /Added to your products/);
  await expect(row.getByRole('link', { name: 'In your products' })).toBeVisible();

  // Imported with generic name and price per tablet (Rs 100 per pack of 10 x 2 = Rs 5).
  const found = await call<any>('GET', `/products?page=1&pageSize=5&search=${s.catalogueBrand}`, undefined, { token: s.token });
  const p = found.items[0];
  expect(p.genericName).toBe('Ibuprofen');
  expect(Number(p.price)).toBeCloseTo(5, 2);
});

test('creates colour × size variants for an article and shows the grid', async ({ page }) => {
  const s = seed();
  await page.goto(`/edit-product/${s.products.tee.id}`);
  await page.getByRole('button', { name: 'Sizes & colours' }).click();
  for (const v of ['Black', 'White', 'S', 'M', 'L']) await page.getByRole('button', { name: v, exact: true }).click();
  await page.getByRole('button', { name: 'Create variants' }).click();
  await confirmSwal(page, /6 variant\(s\) created/);

  const grid = page.locator('table.table-bordered').first();
  await expect(grid.locator('thead')).toContainText('S');
  await expect(grid.locator('thead')).toContainText('L');
  await expect(grid.locator('tbody')).toContainText('Black');
  await expect(grid.locator('tbody')).toContainText('White');

  const v = await call<any>('GET', `/variants/products/${s.products.tee.id}`, undefined, { token: s.token });
  expect(v.variants).toHaveLength(6);
});

test('product page shows stock by branch', async ({ page }) => {
  const s = seed();
  await page.goto(`/edit-product/${s.products.panadol.id}`);
  const section = page.locator('.card', { has: page.getByRole('button', { name: 'Stock by branch' }) });
  await expect(section).toContainText('Main Branch');
  await expect(section).toContainText('Central Warehouse');
  await expect(section).toContainText('PAN-W1');
});
