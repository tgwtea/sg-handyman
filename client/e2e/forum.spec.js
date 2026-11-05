import { test, expect } from '@playwright/test'
import { login, uniqueTitle, USERS } from './helpers.js'

async function createPost(page, title, details) {
  await page.getByRole('button', { name: 'Add a post' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByRole('group', { name: 'Category' }).getByRole('button', { name: 'Others' }).click()
  await page.getByLabel('Details').fill(details)
  await page.getByRole('button', { name: 'Create post' }).click()
}

// the page message is a status, or an alert when the server returns an error;
// checking both shows the real error text instead of a timeout
function forumMessage(page) {
  return page.getByRole('status').or(page.getByRole('alert'))
}

async function showReplies(post) {
  await post.getByRole('button', { name: 'Show replies' }).click()
}

async function deleteTestPost(page, titles) {
  for (const title of titles) {
    const post = page.locator('article').filter({
      has: page.getByRole('heading', { name: title, exact: true })
    })

    if (await post.count()) {
      await post.getByRole('button', { name: 'Delete post' }).click()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Yes, Delete Post' }).click()
      await expect(forumMessage(page)).toHaveText('Post deleted.')
    }
  }
}

test('visitor sees the posts and login prompt', async ({ page }) => {
  await page.goto('/forum')

  await expect(page.getByRole('heading', { name: 'DIY Forum', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Posts', level: 2 })).toBeVisible()
  await expect(page.getByText('to create a post or reply.')).toBeVisible()
})

test('logged-in user creates a post', async ({ page }) => {
  const title = uniqueTitle('E2E test post')

  try {
    await login(page, USERS.customer)
    await page.goto('/forum')
    await createPost(page, title, 'Created by an automated Playwright test.')

    await expect(forumMessage(page)).toHaveText('Post created.')

    const post = page.locator('article').filter({ has: page.getByRole('heading', { name: title }) })
    await expect(post).toBeVisible()
  } finally {
    await deleteTestPost(page, [title])
  }
})

test('logged-in user adds a reply to a post', async ({ page }) => {
  const title = uniqueTitle('E2E reply post')

  try {
    await login(page, USERS.customer)
    await page.goto('/forum')

    await createPost(page, title, 'Post for testing replies.')

    const post = page.locator('article').filter({ has: page.getByRole('heading', { name: title }) })
    await expect(post).toBeVisible()

    await post.getByLabel('Write a reply').fill('This is a test reply.')
    await post.getByRole('button', { name: 'Add reply' }).click()

    await expect(forumMessage(page)).toHaveText('Reply added.')
    await showReplies(post)
    await expect(post.getByText('This is a test reply.')).toBeVisible()
  } finally {
    await deleteTestPost(page, [title])
  }
})

test('logged-in user can edit their own post and reply', async ({ page }) => {
  const title = uniqueTitle('E2E edit post')
  const updatedTitle = `${title} updated`

  try {
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

    await expect(forumMessage(page)).toHaveText('Reply updated.')
    await expect(post.getByText('Reply after editing.')).toBeVisible()
  } finally {
    await deleteTestPost(page, [title, updatedTitle])
  }
})

test('logged-in user can delete their own reply', async ({ page }) => {
  const title = uniqueTitle('E2E delete own reply')

  try {
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
  } finally {
    await deleteTestPost(page, [title])
  }
})

test('logged-in user can delete their own post', async ({ page }) => {
  const title = uniqueTitle('E2E delete protected post')
  const post = page.locator('article').filter({ has: page.getByRole('heading', { name: title }) })

  try {
    await login(page, USERS.customer)
    await page.goto('/forum')
    await createPost(page, title, 'Post for testing delete permissions')

    await expect(post).toBeVisible()

    await post.getByRole('button', { name: 'Delete post' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Yes, Delete Post' }).click()

    await expect(forumMessage(page)).toHaveText('Post deleted.')
    await expect(post).toHaveCount(0)
  } finally {
    await deleteTestPost(page, [title])
  }
})

test('logged-in user can add and remove a post thumbs-up', async ({ page }) => {
  const title = uniqueTitle('E2E like post')

  try {
    await login(page, USERS.customer)
    await page.goto('/forum')

    await createPost(page, title, 'Post for testing likes.')

    const post = page.locator('article').filter({ has: page.getByRole('heading', { name: title }) })
    await expect(post).toBeVisible()

    await post.getByRole('button', { name: '👍 (0)' }).click()
    await expect(post.getByRole('button', { name: '👍 (1)' })).toBeVisible()

    await post.getByRole('button', { name: '👍 (1)' }).click()
    await expect(post.getByRole('button', { name: '👍 (0)' })).toBeVisible()
  } finally {
    await deleteTestPost(page, [title])
  }
})
