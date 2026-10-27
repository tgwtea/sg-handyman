import { test, expect } from '@playwright/test'
import { login, openCompany, USERS, API_URL, BUSINESS_COMPANY } from './helpers.js'

test.describe('Booking a timeslot', () => {
  test('a logged-out visitor is asked to log in before booking', async ({ page }) => {
    await openCompany(page, BUSINESS_COMPANY)

    const prompt = page.locator('.alert-info').filter({ hasText: 'as a customer to book' })
    await expect(prompt).toBeVisible()
    await expect(prompt.getByRole('link', { name: 'Log in' })).toBeVisible()
  })

  test('a customer books a free slot, then cancels it', async ({ page }) => {
    // the booking id from the API, so the finally block can clean up if the test fails midway
    let bookingId = null
    page.on('response', async (response) => {
      if (response.url() === `${API_URL}/bookings` && response.request().method() === 'POST' && response.status() === 201) {
        bookingId = (await response.json())._id
      }
    })

    try {
      await login(page, USERS.customer)
      await openCompany(page, BUSINESS_COMPANY)

      // pick the first free slot and remember it by its test id
      const freeSlot = page.getByTitle('Free').first()
      await expect(freeSlot).toBeEnabled()
      const slotTestId = await freeSlot.getAttribute('data-testid')
      const slot = page.getByTestId(slotTestId)

      await slot.click()

      // "No" closes the confirmation but keeps the slot selected
      await page.getByRole('button', { name: 'Confirm booking' }).click()
      await page.getByRole('button', { name: 'No', exact: true }).click()
      await expect(slot).toHaveAttribute('title', 'Free')

      await page.getByRole('button', { name: 'Confirm booking' }).click()
      await page.getByRole('button', { name: 'Yes, book it' }).click()

      await expect(page.locator('.alert-success')).toContainText('Booked')
      await expect(slot).toHaveAttribute('title', /^Your booking:/)

      // cancel through the UI, saying "No, keep it" first
      await slot.click()
      await page.getByRole('button', { name: 'Cancel booking' }).click()
      await page.getByRole('button', { name: 'No, keep it' }).click()
      await expect(slot).toHaveAttribute('title', /^Your booking:/)

      await page.getByRole('button', { name: 'Cancel booking' }).click()
      await page.getByRole('button', { name: 'Yes, cancel it' }).click()

      await expect(page.locator('.alert-success')).toHaveText('Booking cancelled.')
      await expect(slot).toHaveAttribute('title', 'Free')
      bookingId = null
    } finally {
      // the database is shared, so never leave a test booking behind
      if (bookingId) {
        await page.request.delete(`${API_URL}/bookings/${bookingId}`)
      }
    }
  })
})
