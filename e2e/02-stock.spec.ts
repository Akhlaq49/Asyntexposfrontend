import { test, expect } from '@playwright/test';
import { seed, stockAt, call } from './api';
import { confirmSwal, pickProduct } from './helpers';

test('adds a new branch on Branches & Warehouses', async ({ page }) => {
  await page.goto('/locations');
  await page.getByRole('button', { name: 'Add location' }).click();
  const modal = page.locator('.modal-content');
  await modal.getByPlaceholder('e.g. BR-01').fill('DHA');
  await modal.locator('.col-md-8 input').fill('DHA Branch');
  await modal.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('tbody tr', { hasText: 'DHA Branch' })).toBeVisible();
  await expect(page.locator('tbody tr', { hasText: 'WH' }).filter({ hasText: 'Warehouse' }).first()).toBeVisible();
});

test('moves stock warehouse → branch in two steps and records a short receipt', async ({ page }) => {
  const s = seed();
  const before = await stockAt(s.products.panadol.id, s.locations.warehouse);
  await page.goto('/stock-transfer');
  await page.getByRole('button', { name: 'New transfer' }).click();
  const modal = page.locator('.modal-content');
  await modal.getByLabel('From location').selectOption({ label: 'Central Warehouse' });
  await modal.getByLabel('To location').selectOption({ label: 'Gulberg Branch' });
  await pickProduct(page, modal, s.products.panadol.name);
  await modal.getByLabel(`Quantity for ${s.products.panadol.name}`).fill('40');
  await modal.getByRole('button', { name: 'Dispatch now' }).click();
  await confirmSwal(page, /dispatched/);

  const row = page.locator('tbody tr', { hasText: 'Central Warehouse' }).first();
  await expect(row).toContainText('Dispatched');
  expect(await stockAt(s.products.panadol.id, s.locations.warehouse)).toBe(before - 40);
  expect(await stockAt(s.products.panadol.id, s.locations.branch)).toBe(0); // in transit

  await row.getByRole('button', { name: 'Receive' }).click();
  await page.locator('.modal-content').getByLabel(`Received ${s.products.panadol.name}`).first().fill('38');
  await page.getByRole('button', { name: 'Confirm receipt' }).click();
  await confirmSwal(page, /Stock received/);
  await expect(page.locator('tbody tr', { hasText: 'Gulberg Branch' }).first()).toContainText('Received');
  expect(await stockAt(s.products.panadol.id, s.locations.branch)).toBe(38);
});

test('branch requests stock and the warehouse approves it', async ({ page }) => {
  const s = seed();
  await page.goto('/stock-requests');
  await page.getByRole('button', { name: 'New request' }).click();
  const modal = page.locator('.modal-content');
  await modal.getByLabel('Requesting branch').selectOption({ label: 'Gulberg Branch' });
  await modal.getByLabel('Supplying warehouse').selectOption({ label: 'Central Warehouse' });
  await pickProduct(page, modal, s.products.panadol.name);
  await modal.getByLabel(`Quantity for ${s.products.panadol.name}`).fill('20');
  await modal.getByRole('button', { name: 'Send request' }).click();

  const row = page.locator('tbody tr', { hasText: 'Gulberg Branch' }).first();
  await expect(row).toContainText('Submitted');
  await row.getByRole('button', { name: 'Approve' }).click();
  await page.getByRole('button', { name: 'Approve and dispatch' }).click();
  await confirmSwal(page, /Dispatched as/);
  await expect(page.locator('tbody tr').first()).toContainText('Approved');

  // The branch confirms the transfer created from the request.
  const transfers = await call<any[]>('GET', '/stock-transfers', undefined, { token: s.token });
  const t = transfers.find((x) => x.stockRequestId && x.status === 'Dispatched');
  expect(t).toBeTruthy();
  await page.goto('/stock-transfer');
  await page.locator('tbody tr', { hasText: t.referenceNumber }).getByRole('button', { name: 'Receive' }).click();
  await page.getByRole('button', { name: 'Confirm receipt' }).click();
  await confirmSwal(page);
  await page.goto('/stock-requests');
  await expect(page.locator('tbody tr').first()).toContainText('Fulfilled');
});

test('head office shows stock per location and the ledger reconciles', async ({ page }) => {
  const s = seed();
  await page.goto('/head-office');
  await page.getByRole('button', { name: 'Stock by location' }).click();
  await page.getByLabel('Search product').fill('Panadol');
  await page.getByRole('button', { name: 'Search' }).click();
  const row = page.locator('tbody tr', { hasText: s.products.panadol.name });
  await expect(row).toBeVisible();
  await expect(page.locator('thead')).toContainText('Gulberg Branch');

  await page.goto('/stock-ledger');
  await expect(page.getByText("Every product's total matches its batches.")).toBeVisible();
  await expect(page.locator('tbody')).toContainText('TransferIn');
});
