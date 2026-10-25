import { test, expect } from '@playwright/test'
import { login, uniqueTitle, USERS, API_URL } from './helpers.js'

test.describe('DIY Forum', () => {
  test('a visitor sees the posts and a prompt to log in', async ({ page }) => {
    await page.goto('/forum')

    await expect(page.getByRole('heading', { name: 'DIY Forum', level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Posts', level: 2 })).toBeVisible()
    await expect(page.getByText('to create a post or reply.')).toBeVisible()
  })

  test('a logged-in user creates a post, then deletes it', async ({ page }) => {
    const title = uniqueTitle('E2E test post')

    try {
      await login(page, USERS.customer)
      await page.goto('/forum')

      await page.getByLabel('Title').fill(title)
      await page.getByLabel('Category').fill('testing')
      await page.getByLabel('Details').fill('Created by an automated Playwright test. It deletes itself.')
      await page.getByRole('button', { name: 'Create post' }).click()

      await expect(page.getByRole('status')).toHaveText('Post created.')
      const post = page.locator('article').filter({ has: page.getByRole('heading', { name: title }) })
      await expect(post).toBeVisible()

      // the delete button asks for confirmation in a browser dialog
      page.once('dialog', (dialog) => dialog.accept())
      await post.getByRole('button', { name: 'Delete post' }).click()

      await expect(page.getByRole('status')).toHaveText('Post deleted.')
      await expect(post).toHaveCount(0)
    } finally {
      // the database is shared, so remove the post if the UI delete did not run
      const response = await page.request.get(`${API_URL}/forum`)
      if (response.ok()) {
        const posts = await response.json()
        for (const leftover of posts.filter((item) => item.title === title)) {
          await page.request.delete(`${API_URL}/forum/${leftover._id}`)
        }
      }
    }
  })
})
