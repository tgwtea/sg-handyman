import { test, expect } from '@playwright/test'
import { login, openCompany, apiAs, USERS, BUSINESS_COMPANY } from './helpers.js'
import { formatDay, formatTimeRange, toDateInput, fromInputs } from '../src/utils/sgTime.js'

const DAY_MS = 24 * 60 * 60 * 1000

// "21:15" for a time this many quarter hours after 21:00, the time format of <input type="time">
function quarterAfterNine(quarters) {
  const minutes = 21 * 60 + quarters * 15
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

test.describe('Business owner', () => {
  test('sees the timeslot manager on their own company page', async ({ page }) => {
    await login(page, USERS.business)
    await openCompany(page, BUSINESS_COMPANY)

    await expect(page.getByRole('heading', { name: 'Manage timeslots' })).toBeVisible()
    await expect(page.getByLabel('Date')).toBeVisible()
  })

  test('does not see the timeslot manager when logged out', async ({ page }) => {
    await openCompany(page, BUSINESS_COMPANY)

    await expect(page.getByRole('heading', { name: 'Available timeslots' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Manage timeslots' })).toHaveCount(0)
  })

  test('adds, edits and deletes a timeslot', async ({ page }) => {
    // tomorrow between 21:00 and 23:30 Singapore time: after seeded closing times and the
    // 20:00 slots of createFreeSlot; a random start avoids clashing with another run
    const date = toDateInput(Date.now() + DAY_MS)
    const quarter = Math.floor(Math.random() * 9)
    const start = quarterAfterNine(quarter)
    const end = quarterAfterNine(quarter + 1)
    const newEnd = quarterAfterNine(quarter + 2)
    const startIso = fromInputs(date, start)
    const rowFor = (manager, endTime) => manager.getByRole('row')
      .filter({ hasText: formatDay(startIso) })
      .filter({ hasText: formatTimeRange(startIso, fromInputs(date, endTime)) })

    try {
      await login(page, USERS.business)
      await openCompany(page, BUSINESS_COMPANY)
      const manager = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Manage timeslots' }) })

      await manager.getByLabel('Date').fill(date)
      await manager.getByLabel('Start', { exact: true }).fill(start)
      await manager.getByLabel('End', { exact: true }).fill(end)
      await manager.getByRole('button', { name: 'Add' }).click()

      await expect(manager.getByText('Timeslot added.')).toBeVisible()
      const added = rowFor(manager, end)
      await expect(added).toBeVisible()
      await expect(added.getByText('Free')).toBeVisible()

      // edit: the form fills in, and saving makes the slot 15 minutes longer
      await added.getByRole('button', { name: 'Edit' }).click()
      await expect(manager.getByText('Edit timeslot')).toBeVisible()
      await expect(manager.getByLabel('Start', { exact: true })).toHaveValue(start)
      await manager.getByLabel('End', { exact: true }).fill(newEnd)
      await manager.getByRole('button', { name: 'Save' }).click()

      await expect(manager.getByText('Timeslot updated.')).toBeVisible()
      const edited = rowFor(manager, newEnd)
      await expect(edited).toBeVisible()
      await expect(added).toHaveCount(0)

      // delete asks the browser to confirm first
      page.once('dialog', (dialog) => dialog.accept())
      await edited.getByRole('button', { name: 'Delete' }).click()
      await expect(manager.getByText('Timeslot deleted.')).toBeVisible()
      await expect(edited).toHaveCount(0)
    } finally {
      // the database is shared: remove the slot if the test stopped before deleting it
      const api = await apiAs(USERS.business)
      const companies = await (await api.get('companies')).json()
      const companyId = companies.find((company) => company.name === BUSINESS_COMPANY)._id
      const slots = await (await api.get(`companies/${companyId}/timeslots`, { params: { to: new Date(Date.now() + 3 * DAY_MS).toISOString() } })).json()
      const leftover = slots.find((slot) => new Date(slot.start).getTime() === new Date(startIso).getTime())
      if (leftover) await api.delete(`timeslots/${leftover._id}`)
      await api.dispose()
    }
  })
})
