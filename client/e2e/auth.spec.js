import { test, expect } from '@playwright/test'
import { login, uniqueTitle, USERS } from './helpers.js'

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

test.describe('Signup', () => {
  async function fillSignup(page, username, password, confirmPassword = password) {
    await page.goto('/sign-up')
    await page.getByLabel('Username').fill(username)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByLabel('Confirm password').fill(confirmPassword)
    await page.locator('form').getByRole('button', { name: 'Sign up' }).click()
  }

  // Each run leaves one signup-* customer in the database; signup has no delete route
  test('a new username creates a customer and logs them in', async ({ page }) => {
    const username = uniqueTitle('signup').replace(' ', '-')
    await fillSignup(page, username, 'new-password-123')

    const nav = page.getByRole('navigation')
    await expect(nav.getByText(`${username} · customer`)).toBeVisible()
    await expect(page).toHaveURL(/\/companies$/)
  })

  test('a taken username shows an error and clears the form', async ({ page }) => {
    await fillSignup(page, USERS.customer, 'new-password-123')

    await expect(page.locator('.alert-danger')).toHaveText('Username already taken')
    await expect(page.getByLabel('Username')).toHaveValue('')
    await expect(page.getByLabel('Password', { exact: true })).toHaveValue('')
    await expect(page).toHaveURL(/\/sign-up$/)
  })

  test('mismatched passwords show an error and send no request', async ({ page }) => {
    let signupRequests = 0
    page.on('request', (request) => {
      if (request.url().endsWith('/auth/signup')) signupRequests++
    })
    await fillSignup(page, 'never-created-user', 'new-password-123', 'other-password-123')

    await expect(page.locator('.alert-danger')).toHaveText('Passwords do not match')
    expect(signupRequests).toBe(0)
  })
})
