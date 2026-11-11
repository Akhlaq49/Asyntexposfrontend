import fs from 'node:fs';
import { API, call, SEED_FILE, STATE_DIR } from './api';
import type { Seed } from './api';

/**
 * Creates a fresh tenant with dummy pharmacy data and signs in, so every test starts from known data:
 * a main branch, a warehouse and a second branch; medicines with batches; a credit customer on the
 * wholesale price level; a sized article; a manufacturing recipe; and a restaurant dish with a table.
 */
export default async function globalSetup() {
  try { await fetch(API.replace(/\/api$/, '') + '/api/locations'); }
  catch { throw new Error(`The API is not reachable at ${API}. Start it first (see playwright.config.ts).`); }

  const stamp = Date.now();
  const email = `e2e-browser-${stamp}@test.local`;
  const password = 'Test@12345';
  const reg = await call<{ token: string; user: unknown }>('POST', '/auth/register', { fullName: 'Shifa Test Owner', email, password });
  const token = reg.token;
  const tenantId = Number(JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).TenantId);
  const t = { token };

  await call('PUT', '/pharmacy-settings', {
    pharmacyName: 'Shifa Pharmacy (Test)', address: 'Main Boulevard, Lahore', phone: '0300-0000000', drugLicenceNo: 'DL-TEST-1',
    requirePrescription: true, maxCashierDiscountPercent: 10, expiryAlertDays1: 90, expiryAlertDays2: 60, expiryAlertDays3: 30,
    fbrEnvironment: 'Sandbox', receiptLanguage: 'en+ur', blockOverCreditLimit: true,
  }, t);

  // Locations
  const locs = await call<any[]>('GET', '/locations', undefined, t);
  const main = locs.find((l) => l.isDefault).id as number;
  const warehouse = (await call<any>('POST', '/locations', { code: 'WH', name: 'Central Warehouse', type: 'Warehouse' }, t)).id as number;
  const branch = (await call<any>('POST', '/locations', { code: 'GLB', name: 'Gulberg Branch', type: 'Branch', parentId: warehouse }, t)).id as number;

  // Products (multipart form, like the product screen)
  const product = async (name: string, fields: Record<string, string>) => {
    const form = new FormData();
    const all: Record<string, string> = { productName: name, quantity: '0', quantityAlert: '5', unitsPerStrip: '1', stripsPerBox: '1', sku: `${name.replace(/\W/g, '').toUpperCase().slice(0, 10)}-${stamp % 100000}`, sellOnline: 'true', category: 'General', ...fields };
    Object.entries(all).forEach(([k, v]) => form.append(k, v));
    const p = await call<any>('POST', '/products', undefined, { ...t, form });
    return { id: Number(p.id), name };
  };
  const products = {
    panadol: await product('Panadol 500mg', { price: '2', purchasePrice: '1.2', genericName: 'Paracetamol', strength: '500mg', dosageForm: 'Tablet', unitsPerStrip: '10', stripsPerBox: '10', category: 'Medicines' }),
    brufen: await product('Brufen 400mg', { price: '5', purchasePrice: '3', genericName: 'Ibuprofen', strength: '400mg', dosageForm: 'Tablet', isPrescriptionOnly: 'true', category: 'Medicines' }),
    vitc: await product('Vitamin C 500', { price: '25', purchasePrice: '15', category: 'Supplements' }),
    tee: await product('Cotton T-Shirt', { price: '1200', purchasePrice: '600', category: 'Apparel' }),
    flour: await product('Flour (grams)', { price: '0.2', purchasePrice: '0.1', category: 'Kitchen' }),
    naan: await product('Butter Naan', { price: '60', category: 'Bread' }),
    syrupBase: await product('Syrup Base (ml)', { price: '1', purchasePrice: '0.5', category: 'Raw material' }),
    syrup: await product('Cough Syrup 120ml', { price: '180', category: 'Medicines' }),
  };

  const far = new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);
  const line = (p: { id: number; name: string }, qty: number, cost: number, batch: string) =>
    ({ productId: p.id, productName: p.name, quantity: qty, purchasePrice: cost, unitCost: cost, totalCost: qty * cost, batchNo: batch, expiryDate: far, purchaseUnit: 'Unit' });
  const purchase = (locationId: number, ref: string, lines: any[]) => call('POST', '/purchases', {
    supplierName: 'Test Distributor', reference: ref, date: new Date().toISOString().slice(0, 10), status: 'Received',
    total: lines.reduce((s, l) => s + l.totalCost, 0), paid: 0, locationId, items: lines,
  }, t);
  await purchase(main, `E2E-M-${stamp}`, [line(products.panadol, 500, 1.2, 'PAN-M1'), line(products.brufen, 100, 3, 'BRU-1'), line(products.vitc, 50, 15, 'VC-1'),
    line(products.flour, 5000, 0.1, 'FL-1'), line(products.syrupBase, 2000, 0.5, 'SB-1')]);
  await purchase(warehouse, `E2E-W-${stamp}`, [line(products.panadol, 300, 1.1, 'PAN-W1')]);

  // Credit customer on the wholesale level
  const cust = await call<any>('POST', '/customers', { name: 'Clinic Rehman', phone: '03001112233', email: `clinic-${stamp}@test.local`, address: 'Model Town', city: 'Lahore' }, t);
  const customer = { id: Number(cust.id), name: 'Clinic Rehman' };
  const levels = await call<any[]>('GET', '/price-levels', undefined, t);
  const wholesale = levels.find((l) => l.name === 'Wholesale').id;
  await call('PUT', `/customer-accounts/${customer.id}`, { customerType: 'Wholesale', priceLevelId: wholesale, creditLimit: 1000, creditDays: 30, openingBalance: 0 }, t);
  await call('PUT', `/price-levels/prices/${products.panadol.id}`, [{ productId: products.panadol.id, priceLevelId: wholesale, saleUnit: 'Unit', minQty: 1, price: 1.5 }], t);

  // Size and colour attributes (used by the variant test)
  await call('POST', '/variant-attributes', { name: 'Colour', values: 'Black, White', status: 'active' }, t);
  await call('POST', '/variant-attributes', { name: 'Size', values: 'S, M, L', status: 'active' }, t);

  // Manufacturing recipe: 10 ml base per bottle
  const bom = await call<any>('POST', '/manufacturing/bom', {
    name: 'Cough syrup 120ml', finishedProductId: products.syrup.id, outputQuantity: 1, laborCost: 5, overheadCost: 5, shelfLifeDays: 365,
    items: [{ rawMaterialId: products.syrupBase.id, quantity: 10 }], operations: [],
  }, t);

  // Restaurant: station, table and a dish with a recipe
  const station = await call<any>('POST', '/restaurant/stations', { name: 'Tandoor', locationId: main }, t);
  const table = await call<any>('POST', '/restaurant/tables', { name: 'T1', seats: 4, locationId: main }, t);
  await call('PUT', `/restaurant/recipes/${products.naan.id}`, { yieldQty: 1, kitchenStationId: station.id, items: [{ ingredientId: products.flour.id, quantity: 120, unit: 'g', wastagePct: 0 }] }, t);

  // Shared medicine catalogue entry and an interaction pair (platform maintenance endpoints)
  const catalogueBrand = `E2EBrufen${stamp % 100000}`;
  const csv = `BrandName,GenericName,Strength,DosageForm,UnitsPerStrip,StripsPerBox,Manufacturer,RegistrationNo,Schedule,MaxRetailPrice\n${catalogueBrand},Ibuprofen,200mg,Tablet,10,2,Abbott,REG-E2E-${stamp},OTC,100\n`;
  const form = new FormData();
  form.append('file', new Blob([csv], { type: 'text/csv' }), 'catalogue.csv');
  await call('POST', '/medicine-master/platform/import', undefined, { form, headers: { 'X-Platform-Key': process.env.E2E_PLATFORM_KEY ?? 'e2e-platform-key' } });
  const pairs = new FormData();
  pairs.append('file', new Blob(['GenericA,GenericB,Severity,Note\nIbuprofen,Paracetamol,Minor,E2E test pair\n'], { type: 'text/csv' }), 'pairs.csv');
  await call('POST', '/medicine-master/platform/interactions', undefined, { form: pairs, headers: { 'X-Platform-Key': process.env.E2E_PLATFORM_KEY ?? 'e2e-platform-key' } });

  const seedData: Seed = {
    token, tenantId, email, password, locations: { main, warehouse, branch }, products, customer,
    bomId: bom.id, tableId: table.id, stationId: station.id, catalogueBrand,
  };
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(SEED_FILE, JSON.stringify(seedData, null, 2));

  // Signed-in browser state: the app keeps the token and user in localStorage.
  const origin = `http://localhost:${process.env.E2E_WEB_PORT ?? 5173}`;
  fs.writeFileSync(`${STATE_DIR}/state.json`, JSON.stringify({
    cookies: [],
    origins: [{ origin, localStorage: [{ name: 'token', value: token }, { name: 'user', value: JSON.stringify(reg.user) }, { name: 'i18nextLng', value: 'en' }] }],
  }));
  console.log(`E2E tenant ${tenantId} (${email}) seeded.`);
}
