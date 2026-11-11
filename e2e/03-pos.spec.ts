import { test, expect } from '@playwright/test';
import { seed, stockAt } from './api';
import { addToBill, confirmSwal, ensureTillOpen } from './helpers';

test('cash sale at the counter takes stock from the branch and prints a bilingual receipt', async ({ page }) => {
  const s = seed();
  const before = await stockAt(s.products.panadol.id, s.locations.main);
  await page.goto('/pos');
  await ensureTillOpen(page);
  await addToBill(page, s.products.panadol.name); // one strip = 10 tablets
  await page.getByRole('button', { name: /Pay : Rs/ }).click();

  const receipt = page.locator('.rx-receipt');
  await expect(receipt).toBeVisible();
  await expect(receipt).toContainText('Shifa Pharmacy (Test)');
  await expect(receipt).toContainText(s.products.panadol.name);
  await expect(receipt).toContainText('ذیلی میزان'); // receipt language = English + Urdu
  expect(await stockAt(s.products.panadol.id, s.locations.main)).toBe(before - 10);
});

test('warns about a drug interaction and asks for the doctor on a prescription medicine', async ({ page }) => {
  const s = seed();
  await page.goto('/pos');
  await ensureTillOpen(page);
  await addToBill(page, s.products.panadol.name);
  await addToBill(page, s.products.brufen.name);
  await expect(page.getByRole('alert').filter({ hasText: 'Interaction check' })).toContainText('Ibuprofen');

  await page.getByRole('button', { name: /Pay : Rs/ }).click();
  await confirmSwal(page, /Prescription needed/);
  await page.getByPlaceholder("Doctor's name").fill('Dr. Test');
  await page.getByRole('button', { name: /Pay : Rs/ }).click();
  await expect(page.locator('.rx-receipt')).toContainText('Dr. Test');
});

test('credit customer: wholesale price, limit override, payment on account and statement', async ({ page }) => {
  const s = seed();

  // Tighten the limit from Customer Accounts → Terms.
  await page.goto('/customer-accounts');
  await page.getByText('Only customers who owe').click(); // show every customer
  const row = page.locator('tbody tr', { hasText: s.customer.name });
  await row.getByRole('button', { name: 'Terms' }).click();
  const terms = page.locator('.modal-content');
  await terms.getByPlaceholder('No limit').fill('10');
  await terms.getByRole('button', { name: 'Save' }).click();
  await expect(terms).toBeHidden();

  // Credit sale at the counter: wholesale price 1.50/tablet → one strip = Rs 15, over the Rs 10 limit.
  await page.goto('/pos');
  await ensureTillOpen(page);
  await page.locator('select.form-select').filter({ has: page.locator(`option:text("${s.customer.name}")`) }).selectOption({ label: s.customer.name });
  await expect(page.getByText('Wholesale prices apply to this customer.')).toBeVisible();
  await addToBill(page, s.products.panadol.name);
  await page.getByRole('button', { name: 'Credit' }).click();
  await page.getByRole('button', { name: /Place order : Rs 15/ }).click();
  await confirmSwal(page, /Outside credit terms/); // admin may allow it; it is logged
  const receipt = page.locator('.rx-receipt');
  await expect(receipt).toContainText('Previous balance');
  await expect(receipt).toContainText('15.00');

  // Take the payment on account and read the statement.
  await page.goto('/customer-accounts');
  const acct = page.locator('tbody tr', { hasText: s.customer.name });
  await expect(acct).toContainText('15');
  await acct.getByRole('button', { name: 'Receive' }).click();
  await page.getByRole('button', { name: 'Save receipt' }).click();
  await expect(page.locator('.swal2-title')).toContainText('Receipt RC');
  await expect(page.locator('.swal2-html-container')).toContainText('Balance now: Rs 0');
  await confirmSwal(page);

  await page.getByText('Only customers who owe').click();
  await page.locator('tbody tr', { hasText: s.customer.name }).getByRole('button', { name: 'Statement' }).click();
  const st = page.locator('.modal-content');
  await expect(st).toContainText('Closing balance');
  await expect(st.locator('tbody')).toContainText('Receipt');
});
