import { test, expect, type Page, type Download } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Fixed Date only: real timers still exercise the five-second Undo timeout.
const today = '2026-11-15';
const budget = { monthly_income: 4200, savings_goal: 800, fixed_expenses: { rent: 1500, utilities: 180, insurance: 120, groceries: 450 } };
const purchase = (id: string, amount = 12.5, date = today, description = `Synthetic ${id}`, category = 'takeout') => ({
  id, amount, category, date, description, is_essential: category === 'groceries', created_at: `${date}T12:00:00.000Z`,
});
const backup = (transactions = [purchase('a')], income = 4200) => ({
  app: 'penney', appVersion: '1.0.0', exportedAt: `${today}T12:00:00.000Z`,
  budget: { ...budget, monthly_income: income }, transactions, categoryBudgets: { takeout: 150 }, commentaryLog: [],
});
type Backup = ReturnType<typeof backup>;
const errors = new WeakMap<Page, string[]>();
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const state = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('penney-store')!).state);
async function file(page: Page, data: Backup) {
  const chooser = page.waitForEvent('filechooser');
  await button(page, 'Choose a backup file').click();
  await (await chooser).setFiles({ name: 'synthetic-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
  await expect(page.getByText('In this backup', { exact: true })).toBeVisible();
}
async function restore(page: Page, data = backup()) {
  await page.goto('import'); await file(page, data);
  await button(page, 'Restore this backup').click();
  await expect(button(page, 'Go to the dashboard')).toBeVisible();
  await expect.poll(async () => (await state(page)).transactions.toSorted((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id))).toEqual(data.transactions.toSorted((a, b) => a.id.localeCompare(b.id)));
}
async function downloadText(download: Download) {
  expect(download.suggestedFilename()).toMatch(/\.(json|csv)$/);
  return readFile((await download.path())!, 'utf8');
}

test.beforeEach(async ({ page, baseURL }) => {
  errors.set(page, []);
  page.on('pageerror', error => errors.get(page)!.push(error.message));
  // Synthetic, browser-local data only. Never contact an optional AI provider.
  const origin = new URL(baseURL!).origin;
  await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await page.clock.setFixedTime(new Date(`${today}T12:00:00Z`));
  const response = await page.goto('./');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Meet Penney', exact: true })).toBeVisible();
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

test('fresh onboarding, calendar, edit, Day 8 Undo target and reload persistence', async ({ page }) => {
  await button(page, "Let's go").click();
  await expect(page.getByRole('alert')).toBeVisible();
  for (const [label, value] of Object.entries({ 'Monthly net income': '4200', 'Monthly savings goal': '800', Rent: '1500', Utilities: '180', Insurance: '120', Groceries: '450' })) {
    await page.getByRole('textbox', { name: label, exact: true }).fill(value);
  }
  await button(page, "Let's go").click();
  await expect.poll(async () => (await state(page)).budget).toEqual(budget);
  await page.goto('transactions'); await button(page, '+ Add').click();
  await page.getByLabel('Amount', { exact: true }).fill('9.25');
  await page.getByLabel('Note', { exact: true }).fill('Browser receipt');
  const chip = await page.getByRole('dialog').getByRole('button', { name: 'Takeout', exact: true }).boundingBox();
  expect(chip!.height).toBeGreaterThanOrEqual(44);
  const date = page.getByLabel('Expense date', { exact: true });
  await date.fill('2026-10-02'); await expect(date).toHaveValue('2026-10-02');
  await date.fill('2026-11-16'); await expect(date).toHaveValue('2026-10-02');
  await date.fill(today); await button(page, 'Save expense').click();
  await expect(page.getByText('1 expense · $9.25', { exact: true })).toBeVisible();
  await button(page, 'Takeout, $9.25, Browser receipt').click();
  await page.getByLabel('Amount', { exact: true }).fill('10.25'); await button(page, 'Save changes').click();
  const remove = button(page, 'Delete Takeout expense of $10.25');
  const removeRect = (await remove.boundingBox())!;
  expect(removeRect.width).toBeGreaterThanOrEqual(44); expect(removeRect.height).toBeGreaterThanOrEqual(44);
  await remove.click();
  const undo = button(page, 'Undo delete'); await expect(undo).toBeVisible();
  const rect = (await undo.boundingBox())!;
  expect(rect.width).toBeGreaterThanOrEqual(44); expect(rect.height).toBeGreaterThanOrEqual(44);
  await undo.click({ position: { x: 2, y: 2 } });
  await expect(page.getByText('1 expense · $10.25', { exact: true })).toBeVisible();
  await page.reload(); await expect(button(page, 'Takeout, $10.25, Browser receipt')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('History search, month/category/type filters, empty guidance and downloaded CSV', async ({ page }) => {
  await restore(page, backup([purchase('a', 12.5, today, 'Friday Pizza'), purchase('b', 40, '2026-10-10', 'Weekly shop', 'groceries'), purchase('c', 3, today, 'Coffee')]));
  await page.goto('transactions');
  const search = page.getByRole('textbox', { name: 'Search expenses', exact: true });
  await search.fill('pizza takeout'); await expect(page.getByText('1 expense · $12.50', { exact: true })).toBeVisible();
  const pending = page.waitForEvent('download'); await button(page, 'Download results as CSV').click();
  const csv = await downloadText(await pending);
  expect(csv).toContain('Friday Pizza'); expect(csv).toContain('12.50'); expect(csv).not.toContain('Coffee');
  await search.fill('weekly'); await expect(button(page, 'Download results as CSV')).toBeDisabled();
  await expect(page.getByText('Try another search, clear your filters, or choose All months.', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'All months', exact: true }).click();
  await expect(page.getByText('1 expense · $40.00', { exact: true })).toBeVisible();
  await button(page, 'Clear filters').click(); await button(page, 'Groceries').click();
  await page.getByRole('radio', { name: 'Discretionary', exact: true }).click();
  await expect(button(page, 'Clear filters')).toHaveCount(1);
  await expect(page.getByText('Try another search or clear your filters.', { exact: true })).toBeVisible();
  await button(page, 'Clear filters').click(); await expect(page.getByText('3 expenses · $55.50', { exact: true })).toBeVisible();
});

test('file restore, JSON download, invalid paste, confirmed replacement and Undo', async ({ page }) => {
  const original = backup(); await restore(page, original);
  await page.goto('settings'); const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export backup \(/ }).click();
  const exported = JSON.parse(await downloadText(await pending));
  expect(exported.budget).toEqual(original.budget); expect(exported.transactions).toEqual(original.transactions);
  await page.goto('import'); await button(page, 'Paste backup text instead').click();
  const paste = page.getByLabel('Backup text', { exact: true });
  await paste.fill('hello there'); await button(page, 'Read backup').click();
  await expect(page.getByText(/should start with/)).toBeVisible();
  expect((await state(page)).transactions).toEqual(original.transactions);
  const replacement = backup([purchase('b', 30)], 5000);
  await paste.fill(JSON.stringify(replacement)); await button(page, 'Read backup').click();
  await button(page, 'Replace my data').click();
  await expect(button(page, 'Tap again to replace everything')).toBeVisible();
  expect((await state(page)).transactions).toEqual(original.transactions);
  await button(page, 'Tap again to replace everything').click();
  await expect(button(page, 'Undo import')).toBeVisible();
  await expect.poll(async () => (await state(page)).transactions).toEqual(replacement.transactions);
  await button(page, 'Undo import').click();
  await expect.poll(async () => (await state(page)).budget).toEqual(original.budget);
  expect((await state(page)).transactions).toEqual(original.transactions);
});

test('duplicate-safe merge/reimport and direct-route reload persistence', async ({ page }) => {
  await restore(page);
  const merge = backup([purchase('a'), { ...purchase('a'), id: 'different-id-same-purchase' }, purchase('c', 42)]);
  await page.goto('import'); await file(page, merge);
  await page.getByRole('radio', { name: 'Add missing expenses', exact: true }).click();
  await button(page, 'Add 1 expense').click(); await expect(page.getByText('Added 1 expense from the backup.', { exact: true })).toBeVisible();
  await page.goto('import'); await file(page, merge);
  await page.getByRole('radio', { name: 'Add missing expenses', exact: true }).click();
  await expect(button(page, 'Nothing new to add')).toBeDisabled();
  await page.reload(); await expect(button(page, 'Choose a backup file')).toBeVisible();
  expect((await state(page)).transactions).toHaveLength(2);
  expect((await state(page)).categoryBudgets).toEqual({ takeout: 150 });
  for (const route of ['week', 'charts', 'settings', 'transactions']) {
    const response = await page.goto(route); expect([200, 404]).toContain(response?.status());
    await expect(page.getByRole('heading').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('Undo auto-dismiss retains deletion and empty History offers a working Add action', async ({ page }) => {
  await restore(page); await page.goto('transactions');
  await button(page, 'Delete Takeout expense of $12.50').click();
  const undo = button(page, 'Undo delete'); await expect(undo).toBeVisible();
  await expect(undo).toBeHidden({ timeout: 8000 });
  expect((await state(page)).transactions).toHaveLength(0);
  await page.getByRole('radio', { name: 'All months', exact: true }).click();
  await expect(page.getByText('No expenses yet', { exact: true })).toBeVisible();
  await expect(button(page, 'Clear filters')).toHaveCount(0);
  await button(page, 'Add an expense').click(); await expect(button(page, 'Save expense')).toBeVisible();
  await button(page, 'Cancel').click(); await expect(page.getByRole('dialog')).toBeHidden();
});
