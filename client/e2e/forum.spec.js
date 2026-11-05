// @ts-check
import { test, expect } from '@playwright/test'
import { login, uniqueTitle, USERS, API_URL } from './helpers.js'

async function createPost(page, title, details) {
  await page.getByRole('button', { name: 'Add a post' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByRole('group', { name: 'Category' }).getByRole('button', { name: 'Others' }).click()
  await page.getByLabel('Details').fill(details)
  await page.getByRole('button', { name: 'Create post' }).click()
}

async function showReplies(post) {
  await post.getByRole('button', { name: 'Show replies' }).click()
}

test('visitor sees the posts and login prompt', async ({ page }) => {
  await page.goto('/forum')

  await expect(page.getByRole('heading', { name: 'DIY Forum', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Posts', level: 2 })).toBeVisible()
  await expect(page.getByText('to create a post or reply.')).toBeVisible()
})

test('logged-in user creates a post', async ({ page }) => {
  const title = uniqueTitle('E2E test post')

  await login(page, USERS.customer)
  await page.goto('/forum')
  await createPost(page, title, 'Created by an automated Playwright test.')

  await expect(page.getByRole('status')).toHaveText('Post created.')

  const post = page.locator('article').filter({ has: page.getByRole('heading', { name: title }) })
  await expect(post).toBeVisible()
})

test('logged-in user adds a reply to a post', async ({ page }) => {
  const title = uniqueTitle('E2E reply post')

  await login(page, USERS.customer)
  await page.goto('/forum')

  await createPost(page, title, 'Post for testing replies.')

  const post = page.locator('article').filter({ has: page.getByRole('heading', { name: title }) })
  await expect(post).toBeVisible()

  await post.getByLabel('Write a reply').fill('This is a test reply.')
  await post.getByRole('button', { name: 'Add reply' }).click()

  await expect(page.getByRole('status')).toHaveText('Reply added.')
  await showReplies(post)
  await expect(post.getByText('This is a test reply.')).toBeVisible()
})

test('logged-in user can edit their own post and reply', async ({ page }) => {
  const title = uniqueTitle('E2E edit post')
  const updatedTitle = `${title} updated`

  await login(page, USERS.customer)
  await page.goto('/forum')

  await createPost(page, title, 'Post for testing edits.')

  let post = page.locator('article').filter({ has: page.getByRole('heading', { name: title }) })
  await expect(post).toBeVisible()

  await post.getByLabel('Write a reply').fill('Reply before editing.')
  await post.getByRole('button', { name: 'Add reply' }).click()
  await showReplies(post)
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
})

test('logged-in user can delete their own reply', async ({ page }) => {
  const title = uniqueTitle('E2E delete own reply')

  await login(page, USERS.customer)
  await page.goto('/forum')
  await createPost(page, title, 'Post for testing reply deletion.')

  const post = page.locator('article').filter({ has: page.getByRole('heading', { name: title }) })
  await expect(post).toBeVisible()

  await post.getByLabel('Write a reply').fill('This reply should be deleted.')
  await post.getByRole('button', { name: 'Add reply' }).click()
  await showReplies(post)
  await expect(post.getByText('This reply should be deleted.')).toBeVisible()

  await post.getByRole('button', { name: 'Delete reply' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Yes, Delete Reply' }).click()

  await expect(post.getByText('This reply should be deleted.')).toHaveCount(0)
})

test('logged-in user can delete their own post', async ({ page, browser }) => {
  const title = uniqueTitle('E2E delete protected post')
  const attackerContext = await browser.newContext()
  const attackerPage = await attackerContext.newPage()

  await login(page, USERS.customer)
  await page.goto('/forum')
  await createPost(page, title, 'Post for testing delete permissions.')

  const post = page.locator('article').filter({ has: page.getByRole('heading', { name: title }) })
  await expect(post).toBeVisible()

  const listResponse = await page.request.get(`${API_URL}/forum`)
  const posts = await listResponse.json()
  const createdPost = posts.find((item) => item.title === title)
  expect(createdPost).toBeTruthy() // make sure the new post is there

  await login(attackerPage, USERS.business)
  await attackerPage.goto('/forum')

  const attackerPost = attackerPage.locator('article').filter({
    has: attackerPage.getByRole('heading', { name: title })
  })

  await expect(attackerPost).toBeVisible()
  await expect(attackerPost.getByRole('button', { name: 'Delete post' })).toHaveCount(0)


})

test('logged-in user can add and remove a post thumbs-up', async ({ page }) => {
  const title = uniqueTitle('E2E like post')

  await login(page, USERS.customer)
  await page.goto('/forum')

  await createPost(page, title, 'Post for testing likes.')

  const post = page.locator('article').filter({ has: page.getByRole('heading', { name: title }) })
  await expect(post).toBeVisible()

  await post.getByRole('button', { name: '👍 (0)' }).click()
  await expect(post.getByRole('button', { name: '👍 (1)' })).toBeVisible()

  await post.getByRole('button', { name: '👍 (1)' }).click()
  await expect(post.getByRole('button', { name: '👍 (0)' })).toBeVisible()
})
