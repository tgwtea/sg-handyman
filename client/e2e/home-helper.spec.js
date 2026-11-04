import { test, expect } from '@playwright/test'

test.describe('Home helper', () => {
  test('a repeat power trip always means a pro, and the forum link keeps the category', async ({ page }) => {
    await page.goto('/')
    const helper = page.getByRole('region', { name: 'Fix it yourself, or call a pro?' })

    await helper.getByRole('button', { name: 'Power trip' }).click()
    await helper.getByRole('button', { name: 'Keeps tripping, or smells of burning' }).click()
    await helper.getByRole('button', { name: 'Done it before' }).click()

    // the safety rule wins over the confidence answer
    await expect(helper.getByRole('status')).toContainText('Call a pro')
    await expect(helper.getByRole('heading', { level: 3 }).first()).toHaveText('Pros free soonest')

    await helper.getByRole('link', { name: 'Ask the forum →' }).click()
    await expect(page).toHaveURL(/\/forum\?category=Power(\+|%20)trip/)
    await expect(page.getByRole('button', { name: 'Power trip' })).toHaveClass(/active-category/)
  })

  test('a small job with some confidence puts the forum first, and Start again resets', async ({ page }) => {
    await page.goto('/')
    const helper = page.getByRole('region', { name: 'Fix it yourself, or call a pro?' })

    await helper.getByRole('button', { name: 'Leaking tap' }).click()
    await helper.getByRole('button', { name: 'Drips from the spout' }).click()
    await helper.getByRole('button', { name: 'Watched a video' }).click()

    await expect(helper.getByRole('status')).toContainText('You can fix this')
    await expect(helper.getByRole('heading', { level: 3 }).first()).toHaveText('From the DIY forum')
    await expect(helper.getByRole('link', { name: 'Shop the tools →' })).toHaveAttribute('href', /\/shop\?q=thread/)

    await helper.getByRole('button', { name: 'Start again' }).click()
    await expect(helper.getByText('What needs fixing?')).toBeVisible()
  })
})
