import { test, expect } from '@playwright/test';
import { seed, stockAt } from './api';
import { confirmSwal } from './helpers';

test('runs a production order and adds the finished batch to stock', async ({ page }) => {
  const s = seed();
  const baseBefore = await stockAt(s.products.syrupBase.id, s.locations.main);
  await page.goto('/manufacturing');
  await page.getByRole('button', { name: 'New production order' }).click();
  const modal = page.locator('.modal-content');
  await modal.locator('select').first().selectOption({ index: 1 });
  await modal.locator('input[type="number"]').first().fill('5');
  await modal.getByRole('button', { name: 'Create' }).click();

  const detail = page.locator('.modal-content');
  await expect(detail).toContainText('Cough Syrup 120ml');
  await detail.getByRole('button', { name: 'Complete', exact: true }).click();
  await page.getByRole('button', { name: 'Complete and add to stock' }).click();
  await confirmSwal(page, /Production completed/);

  expect(await stockAt(s.products.syrup.id, s.locations.main)).toBe(5);
  expect(await stockAt(s.products.syrupBase.id, s.locations.main)).toBe(baseBefore - 50);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Yield report' }).click();
  await expect(page.locator('tbody')).toContainText('Cough syrup 120ml');
});

test('restaurant: order for a table reaches the kitchen and uses the recipe', async ({ page }) => {
  const s = seed();
  const flourBefore = await stockAt(s.products.flour.id, s.locations.main);
  await page.goto('/pos-restaurant');
  await page.getByRole('button', { name: /^T1/ }).click();
  await page.getByRole('button', { name: /Butter Naan/ }).click();
  await page.getByRole('button', { name: 'Send to kitchen' }).click();
  await expect(page.locator('.swal2-title')).toContainText('Sent to kitchen');
  expect(await stockAt(s.products.flour.id, s.locations.main)).toBe(flourBefore - 120);

  await page.goto('/pos-kitchen');
  const ticket = page.locator('.card', { hasText: 'Table T1' });
  await expect(ticket).toContainText('Butter Naan');
  await ticket.getByRole('button', { name: 'Start cooking' }).click();
  await expect(ticket.getByRole('button', { name: 'Ready' })).toBeVisible();
  await ticket.getByRole('button', { name: 'Ready' }).click();
  await expect(ticket.getByRole('button', { name: 'Served' })).toBeVisible();

  // The table is occupied with the bill open; settling frees it.
  await page.goto('/pos-restaurant');
  await page.getByRole('button', { name: /^T1/ }).click();
  await page.getByRole('button', { name: /Settle table/ }).click();
  await page.locator('.swal2-confirm').click();
  await expect(page.locator('.swal2-title')).toContainText('T1 settled');
});

test('switching to Urdu turns the layout right-to-left and translates the counter', async ({ page }) => {
  await page.goto('/pos');
  await page.waitForLoadState('networkidle');
  await page.goto('/locations');
  await page.locator('.flag-nav .dropdown-toggle').click();
  await page.locator('.dropdown-menu.show .dropdown-item', { hasText: 'اردو' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.goto('/pos');
  await expect(page.getByText('کل رقم').first()).toBeVisible();

  // Back to English so later runs start in English (the choice is saved on the account).
  await page.goto('/locations');
  await page.locator('.flag-nav .dropdown-toggle').click();
  await page.locator('.dropdown-menu.show .dropdown-item', { hasText: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});
