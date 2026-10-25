import { test, expect } from '@playwright/test'
import { login, USERS } from './helpers.js'

test.describe('Login and logout', () => {
  test('a valid login shows the user in the navbar', async ({ page }) => {
    await login(page, USERS.customer)

    const nav = page.getByRole('navigation')
    await expect(nav.getByText(`${USERS.customer} · customer`)).toBeVisible()
    await expect(nav.getByRole('button', { name: 'Log out' })).toBeVisible()
    await expect(page).toHaveURL(/\/companies$/)
  })

  test('a wrong password shows an error and stays on the login page', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Username').fill(USERS.customer)
    await page.getByLabel('Password').fill('wrong-password')
    await page.getByRole('button', { name: 'Log in' }).click()

    await expect(page.locator('.alert-danger')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('navigation').getByRole('button', { name: 'Log out' })).toHaveCount(0)
  })

  test('logout returns the navbar to the logged-out state', async ({ page }) => {
    await login(page, USERS.customer)

    await page.getByRole('navigation').getByRole('button', { name: 'Log out' }).click()

    const nav = page.getByRole('navigation')
    await expect(nav.getByRole('link', { name: 'Log in' })).toBeVisible()
    await expect(nav.getByText(USERS.customer)).toHaveCount(0)
  })
})
