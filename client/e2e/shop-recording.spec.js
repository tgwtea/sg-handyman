import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('/shop');
  await page.locator('#navbarSupportedContent').getByRole('link', { name: 'Log in' }).click();
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('test-customer-1');
  await page.getByRole('textbox', { name: 'Username' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill('test-password-123');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.locator('#navbarSupportedContent').getByRole('link', { name: 'Shop' }).click();
  await page.getByRole('button', { name: 'View details' }).first().click();
  await page.getByRole('button', { name: 'Delete review' }).click();
  await expect(page.getByText('🗑Confirm Deletion ×')).toBeVisible();
  await page.getByRole('button', { name: '✓ Yes, Delete Review' }).click();
  await expect(page.getByRole('button', { name: 'Submit review' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Your review' }).click();
  await page.getByRole('textbox', { name: 'Your review' }).fill('test');
  await page.getByRole('button', { name: 'Rate 5 stars' }).click();
  await page.getByRole('button', { name: 'Submit review' }).click();
  await expect(page.getByText('Your review')).toBeVisible();
});