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

  test('a logged-in user adds a reply to a post', async ({ page }) => {
    const title = uniqueTitle('E2E reply post')

    try {
      await login(page, USERS.customer)
      await page.goto('/forum')

      await page.getByLabel('Title').fill(title)
      await page.getByLabel('Details').fill('Post for testing replies.')
      await page.getByRole('button', { name: 'Create post' }).click()

      const post = page.locator('article').filter({ has: page.getByRole('heading', { name: title }) })
      await expect(post).toBeVisible()

      await post.getByLabel('Write a reply').fill('This is a test reply.')
      await post.getByRole('button', { name: 'Add reply' }).click()

      await expect(page.getByRole('status')).toHaveText('Reply added.')
      await expect(post.getByText('This is a test reply.')).toBeVisible()
    } finally {
      const response = await page.request.get(`${API_URL}/forum`)
      if (response.ok()) {
        const posts = await response.json()
        for (const post of posts.filter((item) => item.title === title)) {
          await page.request.delete(`${API_URL}/forum/${post._id}`)
        }
      }
    }
  })

  test('a logged-in user can edit their own post and reply', async ({ page }) => {
    const title = uniqueTitle('E2E edit post')
    const updatedTitle = `${title} updated`

    try {
      await login(page, USERS.customer)
      await page.goto('/forum')

      await page.getByLabel('Title').fill(title)
      await page.getByLabel('Details').fill('Post for testing edits.')
      await page.getByRole('button', { name: 'Create post' }).click()

      let post = page.locator('article').filter({ has: page.getByRole('heading', { name: title }) })
      await expect(post).toBeVisible()
      await post.getByLabel('Write a reply').fill('Reply before editing.')
      await post.getByRole('button', { name: 'Add reply' }).click()
      await expect(post.getByText('Reply before editing.')).toBeVisible()

      await post.getByRole('button', { name: 'Edit post' }).click()
      await page.getByLabel('Title').fill(updatedTitle)
      await page.getByRole('button', { name: 'Save changes' }).click()

      post = page.locator('article').filter({ has: page.getByRole('heading', { name: updatedTitle }) })
      await expect(post).toBeVisible()

      await post.getByRole('button', { name: 'Edit reply' }).click()
      await post.getByLabel('Edit reply').fill('Reply after editing.')
      await post.getByRole('button', { name: 'Save reply' }).click()

      await expect(page.getByRole('status')).toHaveText('Reply updated.')
      await expect(post.getByText('Reply after editing.')).toBeVisible()
    } finally {
      const response = await page.request.get(`${API_URL}/forum`)
      if (response.ok()) {
        const posts = await response.json()
        for (const post of posts.filter((item) => item.title === title || item.title === updatedTitle)) {
          await page.request.delete(`${API_URL}/forum/${post._id}`)
        }
      }
    }
  })

  test('a different user cannot edit or delete another user’s post or reply', async ({ page, browser }) => {
    const title = uniqueTitle('E2E protected post')
    const attackerContext = await browser.newContext()
    const attackerPage = await attackerContext.newPage()

    try {
      await login(page, USERS.customer)
      await page.goto('/forum')

      await page.getByLabel('Title').fill(title)
      await page.getByLabel('Details').fill('Post for testing permissions.')
      await page.getByRole('button', { name: 'Create post' }).click()

      let post = page.locator('article').filter({ has: page.getByRole('heading', { name: title }) })
      await expect(post).toBeVisible()
      await post.getByLabel('Write a reply').fill('Reply owned by the first user.')
      await post.getByRole('button', { name: 'Add reply' }).click()
      await expect(post.getByText('Reply owned by the first user.')).toBeVisible()

      const listResponse = await page.request.get(`${API_URL}/forum`)
      const posts = await listResponse.json()
      const createdPost = posts.find((item) => item.title === title)
      expect(createdPost).toBeTruthy()
      const reply = createdPost.replies.find((item) => item.content === 'Reply owned by the first user.')
      expect(reply).toBeTruthy()

      await login(attackerPage, USERS.business)
      await attackerPage.goto('/forum')

      post = attackerPage.locator('article').filter({
        has: attackerPage.getByRole('heading', { name: title })
      })
      await expect(post).toBeVisible()
      await expect(post.getByRole('button', { name: 'Edit post' })).toHaveCount(0)
      await expect(post.getByRole('button', { name: 'Delete post' })).toHaveCount(0)
      await expect(post.getByRole('button', { name: 'Edit reply' })).toHaveCount(0)
      await expect(post.getByRole('button', { name: 'Delete reply' })).toHaveCount(0)

      const updatePostResponse = await attackerPage.request.put(`${API_URL}/forum/${createdPost._id}`, {
        data: { title: 'Changed by another user', content: 'Not allowed', category: 'testing' }
      })
      expect(updatePostResponse.status()).toBe(403)

      const deletePostResponse = await attackerPage.request.delete(`${API_URL}/forum/${createdPost._id}`)
      expect(deletePostResponse.status()).toBe(403)

      const updateReplyResponse = await attackerPage.request.put(
        `${API_URL}/forum/${createdPost._id}/replies/${reply._id}`,
        { data: { content: 'Changed by another user' } }
      )
      expect(updateReplyResponse.status()).toBe(403)

      const deleteReplyResponse = await attackerPage.request.delete(
        `${API_URL}/forum/${createdPost._id}/replies/${reply._id}`
      )
      expect(deleteReplyResponse.status()).toBe(403)
    } finally {
      const response = await page.request.get(`${API_URL}/forum`)
      if (response.ok()) {
        const posts = await response.json()
        for (const post of posts.filter((item) => item.title === title)) {
          await page.request.delete(`${API_URL}/forum/${post._id}`)
        }
      }
      await attackerContext.close()
    }
  })
})
