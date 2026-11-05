import { test, expect } from '@playwright/test'
import {
  USERS, BUSINESS_COMPANY, SHOP_SELLER, SHOP_SELLER_LOGIN,
  login, apiAs, uniqueTitle, clearCart, placeOrderByApi, removeOrder
} from './helpers.js'

// reads the catalogue from the API (no login needed)
async function getProducts() {
  const api = await apiAs(USERS.customer)
  const response = await api.get('shop/products')
  expect(response.ok()).toBeTruthy()
  const products = (await response.json()).filter((product) => !product.removed)
  await api.dispose()
  return products
}

// a product whose name appears once, so the test can find its card by name
function productWithUniqueName(products) {
  const product = products.find((item) => products.filter((other) => other.name === item.name).length === 1)
  expect(product, 'The catalogue needs at least one product with a unique name.').toBeTruthy()
  return product
}

function productCard(page, name) {
  return page.locator('.card').filter({ has: page.getByRole('heading', { name, exact: true }) })
}

function priceOf(text) {
  return Number(text.replace('Price: $', ''))
}

test.describe('Shop: browsing as a guest', () => {
  test('shop displays its heading', async ({ page }) => {
    await page.goto('/shop')
    await expect(page.getByRole('heading', { name: 'DIY tools shop', exact: true })).toBeVisible()
  })

  test('search finds a product and opens its details', async ({ page }) => {
    await page.goto('/shop')
    await page.getByRole('textbox', { name: 'Search tools' }).fill('hammer')
    await productCard(page, 'Claw hammer').first().getByRole('button', { name: 'View details' }).click()

    const dialog = page.getByRole('dialog', { name: 'Claw hammer', exact: true })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Close product details' }).click()
    await expect(dialog).toBeHidden()
  })

  test("seller filter shows only that seller's products", async ({ page }) => {
    const products = await getProducts()
    const api = await apiAs(USERS.customer)
    const companies = await (await api.get('companies')).json()
    await api.dispose()
    const seller = companies.find((company) => company.name === BUSINESS_COMPANY)
    const sellerProductCount = products.filter((product) => product.companyId === seller._id).length
    expect(sellerProductCount).toBeGreaterThan(0)

    await page.goto('/shop')
    const cards = page.locator('.card')
    await expect(cards.first()).toBeVisible()

    await page.getByLabel('Seller').selectOption({ label: BUSINESS_COMPANY })
    await expect(cards).toHaveCount(sellerProductCount)
    for (const sellerLine of await cards.locator('.card-body > p.small').allTextContents()) {
      expect(sellerLine.trim()).toBe(BUSINESS_COMPANY)
    }

    // a seller with no products shows the empty message
    const emptySeller = companies.find((company) => !products.some((product) => product.companyId === company._id))
    if (emptySeller) {
      await page.getByLabel('Seller').selectOption({ label: emptySeller.name })
      await expect(page.getByText('No products match your filters. Try Clear filters.', { exact: true })).toBeVisible()
    }
  })

  test('products can be sorted by price', async ({ page }) => {
    await page.goto('/shop')
    const priceLabels = page.locator('.card .card-text')
    await expect(priceLabels.first()).toBeVisible()

    await page.getByLabel('Sort products').selectOption('price-low')
    let prices = (await priceLabels.allTextContents()).map(priceOf)
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1])
    }

    await page.getByLabel('Sort products').selectOption('price-high')
    prices = (await priceLabels.allTextContents()).map(priceOf)
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeLessThanOrEqual(prices[i - 1])
    }
  })

  test('minimum rating filter shows only qualifying products', async ({ page }) => {
    await page.goto('/shop')
    const cards = page.locator('.card')
    const ratingLabels = cards.locator('.rating-trigger strong')
    await expect(ratingLabels.first()).toBeVisible()
    const originalCount = await cards.count()
    const originalRatings = await ratingLabels.allTextContents()

    for (const minimumRating of [4, 3, 2]) {
      await page.getByLabel('Minimum rating', { exact: true }).selectOption(String(minimumRating))

      const expectedCount = originalRatings.filter((text) => Number(text) >= minimumRating).length
      await expect(cards).toHaveCount(expectedCount)
      await expect(ratingLabels).toHaveCount(expectedCount)

      for (const text of await ratingLabels.allTextContents()) {
        expect(Number(text)).toBeGreaterThanOrEqual(minimumRating)
      }
      if (expectedCount === 0) {
        await expect(page.getByText('No products match your filters. Try Clear filters.', { exact: true })).toBeVisible()
      }
    }

    await page.getByLabel('Minimum rating', { exact: true }).selectOption('')
    await expect(cards).toHaveCount(originalCount)
  })

  test('price range bar filters products within its limits', async ({ page }) => {
    await page.goto('/shop')
    const minimumSlider = page.getByLabel('Minimum price ($)', { exact: true })
    const maximumSlider = page.getByLabel('Maximum price ($)', { exact: true })
    const cards = page.locator('.card')
    await expect(maximumSlider).toBeVisible()
    expect(await cards.count()).toBeGreaterThanOrEqual(2)

    const originalPrices = (await cards.locator('.card-text').allTextContents()).map(priceOf)
    const lowest = Math.min(...originalPrices)
    const highest = Math.max(...originalPrices)
    expect(highest).toBeGreaterThan(lowest)
    const middle = (lowest + highest) / 2
    const lowerLimit = Math.floor(middle * 10) / 10
    const upperLimit = Math.ceil(middle * 10) / 10
    const originalMaximum = Number(await maximumSlider.inputValue())

    async function checkDisplayedPrices(minimum, maximum) {
      const expectedCount = originalPrices.filter((price) => price >= minimum && price <= maximum).length
      await expect(cards).toHaveCount(expectedCount)
      for (const price of (await cards.locator('.card-text').allTextContents()).map(priceOf)) {
        expect(price).toBeGreaterThanOrEqual(minimum)
        expect(price).toBeLessThanOrEqual(maximum)
      }
    }

    await minimumSlider.fill(String(lowerLimit))
    await expect(minimumSlider).toHaveValue(String(lowerLimit))
    await checkDisplayedPrices(lowerLimit, originalMaximum)

    await minimumSlider.fill('0')
    await maximumSlider.fill(String(upperLimit))
    await expect(maximumSlider).toHaveValue(String(upperLimit))
    await checkDisplayedPrices(0, upperLimit)

    await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
    await expect(cards).toHaveCount(originalPrices.length)
    await expect(minimumSlider).toHaveValue('0')
    await expect(maximumSlider).toHaveValue(String(originalMaximum))
  })
})

test.describe('Shop: buying as a customer', () => {
  let customerApi

  test.beforeEach(async () => {
    // every test starts with an empty saved cart
    customerApi = await apiAs(USERS.customer)
    await clearCart(customerApi)
  })

  test.afterEach(async () => {
    await clearCart(customerApi)
    await customerApi.dispose()
  })

  test('customer changes cart quantities and empties the cart', async ({ page }) => {
    const product = productWithUniqueName(await getProducts())
    await login(page, USERS.customer)
    await page.goto('/shop')

    await productCard(page, product.name).getByRole('button', { name: 'View details' }).click()
    const dialog = page.getByRole('dialog', { name: product.name, exact: true })
    await dialog.getByRole('spinbutton', { name: 'Quantity' }).fill('100')
    await dialog.getByRole('button', { name: 'Add to cart', exact: true }).click()
    await dialog.getByRole('button', { name: 'Close product details' }).click()

    const cartLink = page.getByRole('link', { name: /Cart \(/ })
    await expect(cartLink).toHaveText(/Cart \(100\)/)
    await cartLink.click()
    await page.getByRole('button', { name: '+' }).click()
    await expect(cartLink).toHaveText(/Cart \(101\)/)
    await page.getByRole('button', { name: '-' }).click()
    await expect(cartLink).toHaveText(/Cart \(100\)/)
    await page.getByRole('button', { name: 'Remove', exact: true }).click()
    await expect(page.getByText('Your cart is empty.', { exact: true })).toBeVisible()
  })

  test('customer checks out and sees the saved order', async ({ page }) => {
    const product = productWithUniqueName(await getProducts())
    const recipientName = uniqueTitle('Checkout test')
    let orderId = null

    try {
      await login(page, USERS.customer)
      await page.goto('/shop')
      await productCard(page, product.name).getByRole('button', { name: 'Add to cart', exact: true }).click()
      await page.getByRole('link', { name: 'Cart (1)' }).click()
      await page.getByRole('link', { name: 'Continue to checkout' }).click()
      await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible()

      await page.getByRole('textbox', { name: 'Recipient name' }).fill(recipientName)
      await page.getByRole('textbox', { name: 'Delivery address' }).fill('1 Test Street, Singapore 000001')
      await page.getByRole('textbox', { name: 'Delivery note (optional)' }).fill('Leave at the door')
      await page.getByRole('textbox', { name: 'Cardholder name' }).fill('Test Customer')

      // the card brand logo follows the first digits
      const cardNumber = page.getByRole('textbox', { name: 'Card number' })
      await cardNumber.fill('4242')
      await expect(page.getByRole('img', { name: 'Visa' })).toBeVisible()
      await cardNumber.fill('55')
      await expect(page.getByRole('img', { name: 'Mastercard' })).toBeVisible()
      await cardNumber.fill('37')
      await expect(page.getByRole('img', { name: 'American Express' })).toBeVisible()
      await cardNumber.fill('4242 4242 4242 4242')

      await page.getByRole('textbox', { name: 'Expiry month' }).fill('12')
      await page.getByRole('textbox', { name: 'Expiry year' }).fill('2222')
      await page.getByRole('textbox', { name: 'Security code' }).fill('123')

      const orderResponse = page.waitForResponse((response) =>
        response.url().endsWith('/shop/orders') && response.request().method() === 'POST')
      await page.getByRole('button', { name: 'Place order' }).click()
      const response = await orderResponse
      expect(response.status()).toBe(201)
      orderId = (await response.json())._id

      await expect(page.getByRole('heading', { name: 'Order saved' })).toBeVisible()
      await expect(page.locator('article').filter({ hasText: recipientName })).toBeVisible()
    } finally {
      // the database is shared, so cancel and hide the test order
      if (orderId) await removeOrder(customerApi, orderId)
    }
  })

  test('company cancels only its own items in a two-seller order', async ({ page }) => {
    // place one order with a product from the seller and a product from another company
    const products = await getProducts()
    const companies = await (await customerApi.get('companies')).json()
    const seller = companies.find((company) => company.name === SHOP_SELLER)
    const sellerProduct = products.find((product) => product.companyId === seller._id)
    const otherProduct = products.find((product) => product.companyId && product.companyId !== seller._id)
    expect(sellerProduct, 'The seller needs a product.').toBeTruthy()
    expect(otherProduct, 'Another company needs a product.').toBeTruthy()
    const created = await customerApi.post('shop/orders', {
      data: {
        recipientName: uniqueTitle('Cancellation test'),
        deliveryAddress: '1 Test Street, Singapore 000001',
        items: [{ id: sellerProduct.id, quantity: 1 }, { id: otherProduct.id, quantity: 1 }]
      }
    })
    expect(created.status()).toBe(201)
    const orderId = (await created.json())._id

    try {
      // the seller logs in and cancels its items
      await login(page, SHOP_SELLER_LOGIN.username, SHOP_SELLER_LOGIN.password)
      await page.goto('/shop')
      await page.getByRole('link', { name: 'Orders' }).click()

      const companyOrder = page.locator('article').filter({ hasText: orderId })
      await expect(companyOrder.getByText('In progress', { exact: true })).toBeVisible()
      await companyOrder.getByRole('button', { name: 'Cancel order', exact: true }).click()
      await expect(page.getByRole('group', { name: 'Cancel your items' })).toBeVisible()
      await page.getByRole('textbox', { name: 'Reason shown to the customer' }).fill('Out of stock')
      await page.getByRole('button', { name: 'Confirm cancellation' }).click()
      await expect(page.getByText('Cancel your items in this order? Other companies’ deliveries continue.')).toBeVisible()
      await page.getByRole('button', { name: /Yes, Cancel Order/ }).click()

      // after a cancellation the app switches to the cancelled orders list
      await expect(page.getByRole('heading', { name: 'Cancelled management orders' })).toBeVisible()
      await expect(page.getByText('Your items are cancelled. Other companies’ deliveries continue.')).toBeVisible()
      await expect(companyOrder.getByText('Cancelled', { exact: true })).toBeVisible()

      // the other company's item stays active for the customer
      const myOrders = await (await customerApi.get('shop/orders')).json()
      const order = myOrders.find((item) => item._id === orderId)
      expect(order.items.find((item) => item.companyId === seller._id).rejected).toBe(true)
      expect(order.items.find((item) => item.companyId === otherProduct.companyId).rejected).toBe(false)
    } finally {
      await removeOrder(customerApi, orderId)
    }
  })

  test('customer who bought a product can review it', async ({ page }) => {
    const product = productWithUniqueName(await getProducts())
    // only buyers may review, so buy the product first through the API
    const order = await placeOrderByApi(customerApi, product.id)
    // remove a review left by an earlier run (404 when there is none)
    await customerApi.delete(`shop/products/${product.id}/reviews`)

    try {
      await login(page, USERS.customer)
      await page.goto('/shop')
      await productCard(page, product.name).getByRole('button', { name: 'View details' }).click()

      const dialog = page.getByRole('dialog', { name: product.name, exact: true })
      await expect(dialog.getByLabel('Filter reviews', { exact: true })).toBeVisible()
      await dialog.getByRole('textbox', { name: 'Your review', exact: true }).fill(uniqueTitle('E2E review'))
      await dialog.getByRole('button', { name: 'Rate 5 stars', exact: true }).click()
      await dialog.getByRole('button', { name: 'Submit review', exact: true }).click()

      await expect(dialog.getByText('Review added.', { exact: true })).toBeVisible()
      await expect(dialog.locator('article').getByText('Your review', { exact: true })).toBeVisible()
    } finally {
      // delete the review first: a cancelled order no longer counts as a purchase
      await customerApi.delete(`shop/products/${product.id}/reviews`)
      await removeOrder(customerApi, order._id)
    }
  })
})
