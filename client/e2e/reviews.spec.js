import { Buffer } from 'node:buffer'
import { test, expect } from '@playwright/test'
import {
  login, openCompany, createFreeSlot, createFinishedBooking, apiAs, bookSlot, uniqueTitle,
  USERS, ADMIN, API_URL, BUSINESS_COMPANY
} from './helpers.js'

// a real 16x16 PNG, so the server's image check accepts it and the browser can draw it
const PHOTO = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAF0lEQVR4nGP8z8BAEmAaVTCqYFQBdRUAAI7JAR8D2lODAAAAAElFTkSuQmCC',
  'base64'
)

// Opens the company page and jumps to its reviews with the side nav
async function openReviews(page, companyName = BUSINESS_COMPANY) {
  await openCompany(page, companyName)
  await page.getByRole('navigation', { name: 'Company page sections' }).getByRole('link', { name: 'Reviews' }).click()
  return page.locator('#reviews')
}

test.describe('Company reviews', () => {
  test('a visitor sees the reviews and a prompt to log in before reviewing', async ({ page }) => {
    const reviews = await openReviews(page)

    await expect(reviews.getByRole('heading', { name: 'Reviews' })).toBeVisible()
    await expect(reviews.getByText('as a customer to review')).toBeVisible()
    await expect(reviews.getByRole('link', { name: 'Log in' })).toBeVisible()
    await expect(reviews.getByRole('heading', { name: 'Write a review' })).toHaveCount(0)
  })

  test('a customer cannot review a booking before its appointment ends', async () => {
    const created = await createFreeSlot()
    const customer = await apiAs(USERS.customer)
    const booking = await bookSlot(customer, created.slot, 'Upcoming job')
    try {
      const early = await customer.post(`reviews/company/${created.companyId}`, {
        data: { bookingId: booking._id, rating: 5, comment: 'Too early' }
      })
      expect(early.status()).toBe(409)
      const list = await (await customer.get(`reviews/company/${created.companyId}`)).json()
      expect(list.reviewableBookings.some((item) => item._id === booking._id)).toBe(false)
    } finally {
      await customer.delete(`bookings/${booking._id}`)
      await customer.dispose()
      await created.remove()
    }
  })

  test('a customer reviews their booking with a photo, edits it, then deletes it', async ({ page }) => {
    const customer = await apiAs(USERS.customer)
    const created = await createFinishedBooking(customer, 'Leak repair')
    const { booking } = created
    const comment = uniqueTitle('Fixed the leak quickly')
    // the review id from the API, so the finally block can clean up if the test fails midway
    let reviewId = null
    page.on('response', async (response) => {
      if (/\/api\/reviews\/company\//.test(response.url()) && response.request().method() === 'POST' && response.status() === 201) {
        reviewId = (await response.json())._id
      }
    })

    try {
      await login(page, USERS.customer)
      const reviews = await openReviews(page, created.companyName)

      // write the review: booking, stars, comment and a photo
      await reviews.getByLabel('Booking').selectOption(booking._id)
      await reviews.getByRole('radio', { name: '4 out of 5 stars' }).click()
      await reviews.getByLabel('Comment').fill(comment)
      await reviews.getByLabel('Photo (optional)').setInputFiles({ name: 'leak.png', mimeType: 'image/png', buffer: PHOTO })
      await expect(reviews.getByText('leak.png')).toBeVisible()
      await reviews.getByRole('button', { name: 'Post review' }).click()

      await expect(reviews.getByText('Thanks for your review!')).toBeVisible()
      const review = reviews.getByRole('listitem').filter({ hasText: comment })
      await expect(review).toBeVisible()
      await expect(review.getByText('Service: Leak repair')).toBeVisible()
      await expect(review.getByLabel('4 out of 5 stars')).toBeVisible()

      // the photo loads from its own route and actually draws
      const photo = review.getByRole('img', { name: `Photo from ${USERS.customer}'s review` })
      await expect(photo).toBeVisible()
      await expect.poll(() => photo.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)

      // one review per booking: the booking leaves the dropdown, and the API refuses a second review
      await expect(reviews.locator(`#review-booking option[value="${booking._id}"]`)).toHaveCount(0)
      const second = await customer.post(`reviews/company/${created.companyId}`, {
        data: { bookingId: booking._id, rating: 5, comment: 'Second review' }
      })
      expect(second.status()).toBe(409)

      // edit: the rating and comment change, the photo cannot
      await review.getByRole('button', { name: 'Edit' }).click()
      await expect(reviews.getByRole('heading', { name: 'Edit your review' })).toBeVisible()
      await expect(reviews.getByLabel('Photo (optional)')).toHaveCount(0)
      const edited = `${comment} (edited)`
      await reviews.getByRole('radio', { name: '2 out of 5 stars' }).click()
      await reviews.getByLabel('Comment').fill(edited)
      await reviews.getByRole('button', { name: 'Save' }).click()

      await expect(reviews.getByText('Review updated.')).toBeVisible()
      const editedReview = reviews.getByRole('listitem').filter({ hasText: edited })
      await expect(editedReview.getByLabel('2 out of 5 stars')).toBeVisible()

      // delete: Cancel keeps it, then confirming removes it
      const dialog = page.getByRole('alertdialog')
      await editedReview.getByRole('button', { name: 'Delete' }).click()
      await dialog.getByRole('button', { name: 'Cancel' }).click()
      await expect(dialog).toBeHidden()
      await expect(editedReview).toBeVisible()

      await editedReview.getByRole('button', { name: 'Delete' }).click()
      await dialog.getByRole('button', { name: 'Yes, Delete Review' }).click()
      await expect(reviews.getByText('Review deleted.')).toBeVisible()
      await expect(editedReview).toHaveCount(0)
      reviewId = null
    } finally {
      // the database is shared: cancelling the booking also deletes any review left for it
      if (reviewId) await customer.delete(`reviews/${reviewId}`)
      await created.remove()
      await customer.dispose()
    }
  })

  test('another customer cannot delete a review, but an admin can', async ({ page }) => {
    const customer = await apiAs(USERS.customer)
    const otherCustomer = await apiAs('test-customer-2')
    const created = await createFinishedBooking(customer)
    const { booking } = created
    const comment = uniqueTitle('Review for the admin test')

    try {
      const response = await customer.post(`reviews/company/${created.companyId}`, {
        data: { bookingId: booking._id, rating: 3, comment }
      })
      expect(response.status()).toBe(201)
      const { _id: reviewId } = await response.json()

      // the server checks who is deleting, not only the page
      expect((await otherCustomer.delete(`reviews/${reviewId}`)).status()).toBe(403)

      await login(page, ADMIN.username, ADMIN.password)
      const reviews = await openReviews(page, created.companyName)
      const review = reviews.getByRole('listitem').filter({ hasText: comment })
      // an admin can delete but not edit someone else's review
      await expect(review.getByRole('button', { name: 'Edit' })).toHaveCount(0)
      await review.getByRole('button', { name: 'Delete' }).click()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Yes, Delete Review' }).click()

      await expect(reviews.getByText('Review deleted.')).toBeVisible()
      await expect(review).toHaveCount(0)
    } finally {
      await created.remove()
      await customer.dispose()
      await otherCustomer.dispose()
    }
  })
})
