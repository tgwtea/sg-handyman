import { test, expect } from '@playwright/test'

// Check that a visitor can open the shop screen.
test('shop displays its heading', async ({ page }) => {
  // Open the shop using the base URL in playwright.config.js.
  await page.goto('/shop')

  // Find the heading and check that it is visible.
  await expect(
    page.getByRole('heading', { name: 'DIY tools shop', exact: true })
  ).toBeVisible()
})

//check search bar
test('testsearchbar', async ({ page }) => {
  await page.goto('/shop');
  await page.getByRole('textbox', { name: 'Search tools' }).click();
  await page.getByRole('textbox', { name: 'Search tools' }).fill('hammer');
  await page.getByRole('button', { name: 'View details' }).first().click();
  await expect(
  page.getByRole('dialog', { name: 'Claw hammer', exact: true })
  ).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Add to cart' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Add to cart' }).press('Escape');
});

//check seller filter
test('testsearchfilter', async ({ page }) => {
  await page.goto('/shop');
  await page.getByLabel('Seller').selectOption('6ae5d20eb16741a0c6a6d1dd');
  await expect(page.getByText('No products match your')).toBeVisible();
  await page.getByLabel('Seller').selectOption('6ae5d20eb16741a0c6a6d1e6');
  await expect(page.getByText('Tan Repair').nth(1)).toBeVisible();
});

//check sorting
test('products can be sorted by price', async ({ page }) => {
  await page.goto('/shop');

  // Wait until products have loaded.
  const priceLabels = page.locator('.card .card-text');
  await expect(priceLabels.first()).toBeVisible();

  // Lowest to highest.
  await page.getByLabel('Sort products').selectOption('price-low');

  let prices = await priceLabels.allTextContents();

  for (let i = 1; i < prices.length; i++) {
    const previous = Number(prices[i - 1].replace('Price: $', ''));
    const current = Number(prices[i].replace('Price: $', ''));

    expect(current).toBeGreaterThanOrEqual(previous);
  }

  // Highest to lowest.
  await page.getByLabel('Sort products').selectOption('price-high');

  prices = await priceLabels.allTextContents();

  for (let i = 1; i < prices.length; i++) {
    const previous = Number(prices[i - 1].replace('Price: $', ''));
    const current = Number(prices[i].replace('Price: $', ''));

    expect(current).toBeLessThanOrEqual(previous);
  }
});

//rating filter
test('minimum rating filter shows only qualifying products', async ({ page }) => {
  await page.goto('/shop')
  const cards = page.locator('.card')
  const ratingLabels = cards.locator('.rating-trigger strong')
  // At least one rated product is needed for a meaningful rating test.
  await expect(ratingLabels.first()).toBeVisible()
  const originalCount = await cards.count()
  const originalRatings = await ratingLabels.allTextContents()

  // Check every available threshold: 4, 3 and 2 stars and above.
  for (const minimumRating of [4, 3, 2]) {
    await page.getByLabel('Minimum rating', { exact: true }).selectOption(String(minimumRating))

    let expectedCount = 0
    for (const text of originalRatings) {
      if (Number(text) >= minimumRating) expectedCount++
    }
    await expect(cards).toHaveCount(expectedCount)
    // Unrated products must not appear when a minimum rating is selected.
    await expect(ratingLabels).toHaveCount(expectedCount)

    const visibleRatings = await ratingLabels.allTextContents()
    for (const text of visibleRatings) {
      expect(Number(text)).toBeGreaterThanOrEqual(minimumRating)
    }
    if (expectedCount === 0) {
      await expect(page.getByText('No products match your filters. Try Clear filters.', { exact: true })).toBeVisible()
    }
  }

  // Any rating restores rated and unrated products.
  await page.getByLabel('Minimum rating', { exact: true }).selectOption('')
  await expect(cards).toHaveCount(originalCount)
})

//pricerange test
test('price range bar filters products within its limits', async ({ page }) => {
  await page.goto('/shop')
  const minimumSlider = page.getByLabel('Minimum price ($)', { exact: true })
  const maximumSlider = page.getByLabel('Maximum price ($)', { exact: true })
  const cards = page.locator('.card')
  await expect(maximumSlider).toBeVisible()
  expect(await cards.count()).toBeGreaterThanOrEqual(2)

  const priceTexts = await cards.locator('.card-text').allTextContents()
  const originalPrices = []
  for (const text of priceTexts) originalPrices.push(Number(text.replace('Price: $', '')))

  let lowest = originalPrices[0]
  let highest = originalPrices[0]
  for (const price of originalPrices) {
    if (price < lowest) lowest = price
    if (price > highest) highest = price
  }
  // Different prices are needed to prove that filtering excludes products.
  expect(highest).toBeGreaterThan(lowest)
  const middle = (lowest + highest) / 2
  const lowerLimit = Math.floor(middle * 10) / 10
  const upperLimit = Math.ceil(middle * 10) / 10
  const originalMaximum = Number(await maximumSlider.inputValue())

  // Our helper checks both the number of results and every displayed price.
  async function checkDisplayedPrices(minimum, maximum) {
    let expectedCount = 0
    for (const price of originalPrices) {
      if (price >= minimum && price <= maximum) expectedCount++
    }
    await expect(cards).toHaveCount(expectedCount)
    const visiblePrices = await cards.locator('.card-text').allTextContents()
    for (const text of visiblePrices) {
      const price = Number(text.replace('Price: $', ''))
      expect(price).toBeGreaterThanOrEqual(minimum)
      expect(price).toBeLessThanOrEqual(maximum)
    }
  }

  // Raise the minimum, keeping the original maximum.
  await minimumSlider.fill(String(lowerLimit))
  await expect(minimumSlider).toHaveValue(String(lowerLimit))
  await checkDisplayedPrices(lowerLimit, originalMaximum)

  // Reset the minimum, then lower the maximum.
  await minimumSlider.fill('0')
  await maximumSlider.fill(String(upperLimit))
  await expect(maximumSlider).toHaveValue(String(upperLimit))
  await checkDisplayedPrices(0, upperLimit)

  // Clearing filters restores the original product list.
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(cards).toHaveCount(originalPrices.length)
  await expect(minimumSlider).toHaveValue('0')
  await expect(maximumSlider).toHaveValue(String(originalMaximum))
})

//check customisable view detail add cart number + '+'/'-' button and remove button in cart
test('testaddcart', async ({ page }) => {
  await page.goto('/shop');
  await page.locator('#navbarSupportedContent').getByRole('link', { name: 'Log in' }).click();
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('test-customer-1');
  await page.getByRole('textbox', { name: 'Username' }).press('Tab');
  await page.getByLabel('Password', { exact: true }).fill('test-password-123');
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page).toHaveURL(/\/companies$/);
  await page.locator('#navbarSupportedContent').getByRole('link', { name: 'Shop' }).click();
  await expect(page).toHaveURL(/\/shop$/);

  // Start this test with an empty saved cart, even if an earlier test failed.
  await expect(page.getByRole('button', { name: 'Add to cart', exact: true }).first()).toBeEnabled();
  await page.getByRole('link', { name: /Cart \(/ }).click();
  const removeButtons = page.getByRole('button', { name: 'Remove', exact: true });
  while (await removeButtons.count() > 0) {
    const previousCount = await removeButtons.count();
    await removeButtons.first().click();
    await expect(removeButtons).toHaveCount(previousCount - 1);
  }
  await expect(page.getByText('Your cart is empty.', { exact: true })).toBeVisible();
  await page.locator('#navbarSupportedContent').getByRole('link', { name: 'Shop', exact: true }).click();
  await page.getByRole('button', { name: 'View details' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog', { name: 'Adjustable wrench' }).click();
  await page.getByRole('spinbutton', { name: 'Quantity' }).click();
  await page.getByRole('spinbutton', { name: 'Quantity' }).click();
  await page.getByRole('spinbutton', { name: 'Quantity' }).fill('100');
  await page.getByRole('dialog').getByRole('button', { name: 'Add to cart', exact: true }).click();
  await page.getByRole('button', { name: 'Close product details' }).click();
  await expect(page.getByRole('link', { name: 'Cart (100)' })).toBeVisible();
  await page.getByRole('link', { name: 'Cart (100)' }).click();
  await page.getByRole('button', { name: '+' }).click();
  await expect(page.getByRole('link', { name: 'Cart (101)' })).toBeVisible();
  await page.getByRole('button', { name: '-' }).click();
  await expect(page.getByRole('link', { name: 'Cart (100)' })).toBeVisible();
  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText('Your cart is empty.')).toBeVisible();
});

//check order process
test('testorder', async ({ page }) => {
  await page.goto('/shop');
  await page.locator('#navbarSupportedContent').getByRole('link', { name: 'Log in' }).click();
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('test-customer-1');
  await page.getByRole('textbox', { name: 'Username' }).press('Tab');
  await page.getByLabel('Password', { exact: true }).fill('test-password-123');
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page).toHaveURL(/\/companies$/);
  await page.locator('#navbarSupportedContent').getByRole('link', { name: 'Shop' }).click();
  await expect(page).toHaveURL(/\/shop$/);

  // Start this test with an empty saved cart, even if an earlier test failed.
  await expect(page.getByRole('button', { name: 'Add to cart', exact: true }).first()).toBeEnabled();
  await page.getByRole('link', { name: /Cart \(/ }).click();
  const removeButtons = page.getByRole('button', { name: 'Remove', exact: true });
  while (await removeButtons.count() > 0) {
    const previousCount = await removeButtons.count();
    await removeButtons.first().click();
    await expect(removeButtons).toHaveCount(previousCount - 1);
  }
  await expect(page.getByText('Your cart is empty.', { exact: true })).toBeVisible();
  await page.locator('#navbarSupportedContent').getByRole('link', { name: 'Shop', exact: true }).click();
  await page.getByRole('button', { name: 'Add to cart' }).first().click();
  await page.getByRole('link', { name: 'Cart (1)' }).click();
  await page.getByRole('link', { name: 'Continue to checkout' }).click();
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Recipient name' }).click();
  await page.getByRole('textbox', { name: 'Recipient name' }).fill('test');
  await page.getByRole('textbox', { name: 'Delivery address' }).click();
  await page.getByRole('textbox', { name: 'Delivery address' }).fill('test');
  await page.getByRole('textbox', { name: 'Delivery note (optional)' }).click();
  await page.getByRole('textbox', { name: 'Delivery note (optional)' }).fill('test');
  await page.getByRole('textbox', { name: 'Cardholder name' }).click();
  await page.getByRole('textbox', { name: 'Cardholder name' }).fill('test');
  await page.getByRole('textbox', { name: 'Card number' }).click();
  await page.getByRole('textbox', { name: 'Card number' }).fill('4242');
  await expect(page.getByRole('img', { name: 'Visa' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Card number' }).click();
  await page.getByRole('textbox', { name: 'Card number' }).fill('55');
  await expect(page.getByRole('img', { name: 'Mastercard' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Card number' }).click();
  await page.getByRole('textbox', { name: 'Card number' }).fill('37');
  await expect(page.getByRole('img', { name: 'American Express' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Card number' }).click();
  await page.getByRole('textbox', { name: 'Card number' }).fill('4242 4242 4242 4242');
  await page.getByRole('textbox', { name: 'Expiry month' }).click();
  await page.getByRole('textbox', { name: 'Expiry month' }).fill('12');
  await page.getByRole('textbox', { name: 'Expiry year' }).click();
  await page.getByRole('textbox', { name: 'Expiry year' }).fill('2222');
  await page.getByRole('textbox', { name: 'Security code' }).click();
  await page.getByRole('textbox', { name: 'Security code' }).fill('123');
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.getByRole('heading', { name: 'Order saved' })).toBeVisible();
});

test('company cancels the order just placed', async ({ page }) => {
  // Give this order a unique recipient so we can find its reference on screen.
  const recipientName = 'Cancellation test ' + Date.now();
  await page.goto('/shop');
  await page.locator('#navbarSupportedContent').getByRole('link', { name: 'Log in' }).click();
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('test-customer-1');
  await page.getByRole('textbox', { name: 'Username' }).press('Tab');
  await page.getByLabel('Password', { exact: true }).fill('test-password-123');
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page).toHaveURL(/\/companies$/);
  await page.locator('#navbarSupportedContent').getByRole('link', { name: 'Shop' }).click();
  await expect(page).toHaveURL(/\/shop$/);

  // Start this test with an empty saved cart, even if an earlier test failed.
  await expect(page.getByRole('button', { name: 'Add to cart', exact: true }).first()).toBeEnabled();
  await page.getByRole('link', { name: /Cart \(/ }).click();
  const removeButtons = page.getByRole('button', { name: 'Remove', exact: true });
  while (await removeButtons.count() > 0) {
    const previousCount = await removeButtons.count();
    await removeButtons.first().click();
    await expect(removeButtons).toHaveCount(previousCount - 1);
  }
  await expect(page.getByText('Your cart is empty.', { exact: true })).toBeVisible();
  await page.locator('#navbarSupportedContent').getByRole('link', { name: 'Shop', exact: true }).click();
  // Buy from the company that will log in later.
  await page.getByLabel('Seller', { exact: true }).selectOption({ label: 'Arctic Air Aircon' });
  await page.getByRole('button', { name: 'Add to cart', exact: true }).first().click();
  await page.getByRole('link', { name: 'Cart (1)' }).click();
  await page.getByRole('link', { name: 'Continue to checkout' }).click();
  await page.getByRole('textbox', { name: 'Recipient name' }).click();
  await page.getByRole('textbox', { name: 'Recipient name' }).fill(recipientName);
  await page.getByRole('textbox', { name: 'Delivery address' }).click();
  await page.getByRole('textbox', { name: 'Delivery address' }).fill('testt');
  await page.getByRole('textbox', { name: 'Delivery note (optional)' }).click();
  await page.getByRole('textbox', { name: 'Delivery note (optional)' }).fill('test');
  await page.getByRole('textbox', { name: 'Cardholder name' }).click();
  await page.getByRole('textbox', { name: 'Cardholder name' }).fill('test');
  await page.getByRole('textbox', { name: 'Card number' }).click();
  await page.getByRole('textbox', { name: 'Card number' }).fill('4242 4242 4242 4242');
  await page.getByRole('textbox', { name: 'Expiry month' }).click();
  await page.getByRole('textbox', { name: 'Expiry month' }).fill('12');
  await page.getByRole('textbox', { name: 'Expiry year' }).click();
  await page.getByRole('textbox', { name: 'Expiry year' }).fill('2222');
  await page.getByRole('textbox', { name: 'Security code' }).click();
  await page.getByRole('textbox', { name: 'Security code' }).fill('123');
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.getByRole('heading', { name: 'Order saved' })).toBeVisible();
  // Read the reference belonging to this order, rather than choosing the first order.
  const customerOrder = page.locator('article').filter({ hasText: recipientName });
  await expect(customerOrder).toBeVisible();
  const orderReference = await customerOrder.getByRole('heading', { level: 3 }).textContent();
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/companies$/);
  await page.locator('#navbarSupportedContent').getByRole('link', { name: 'Log in' }).click();
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('arcticair');
  await page.getByRole('textbox', { name: 'Username' }).press('Tab');
  await page.getByLabel('Password', { exact: true }).fill('arcticair123');
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page).toHaveURL(/\/companies$/);
  await page.locator('#navbarSupportedContent').getByRole('link', { name: 'Shop' }).click();
  await expect(page).toHaveURL(/\/shop$/);
  await page.getByRole('link', { name: 'Orders' }).click();
  const companyOrder = page.locator('article').filter({ hasText: orderReference.trim() });
  await expect(companyOrder.getByText('In progress', { exact: true })).toBeVisible();
  await companyOrder.getByRole('button', { name: 'Cancel order', exact: true }).click();
  await page.getByRole('textbox', { name: 'Reason shown to the customer' }).click();
  await page.getByRole('textbox', { name: 'Reason shown to the customer' }).fill('test');
  await page.getByRole('button', { name: 'Confirm cancellation' }).click();
  await expect(page.getByRole('heading', { name: 'Confirm Cancellation', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '✓ Yes, Cancel Order' }).click();
  await expect(companyOrder).toBeHidden();
  await page.getByRole('button', { name: 'Manage cancelled orders', exact: true }).click();
  await expect(companyOrder.getByText('Cancelled', { exact: true })).toBeVisible();
});


test('testreviewrating', async ({ page }) => {
  await page.goto('/shop');
  await page.locator('#navbarSupportedContent').getByRole('link', { name: 'Log in', exact: true }).click();
  await page.getByLabel('Username', { exact: true }).fill('test-customer-1');
  await page.getByLabel('Password', { exact: true }).fill('test-password-123');
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page).toHaveURL(/\/companies$/);
  await page.locator('#navbarSupportedContent').getByRole('link', { name: 'Shop', exact: true }).click();
  await expect(page).toHaveURL(/\/shop$/);
  // This account must already have purchased the first product.
  await page.getByRole('button', { name: 'View details', exact: true }).first().click();
  const productDialog = page.getByRole('dialog');
  await expect(productDialog).toBeVisible();
  // The filter appears once the product's reviews finish loading.
  await expect(productDialog.getByLabel('Filter reviews', { exact: true })).toBeVisible();

  // A previous run may have left a review. Delete it only if one exists.
  const deleteReview = productDialog.getByRole('button', { name: 'Delete review', exact: true });
  if (await deleteReview.count() > 0) {
    await deleteReview.click();
    await expect(page.getByRole('heading', { name: 'Confirm Deletion', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '✓ Yes, Delete Review', exact: true }).click();
  }

  await expect(productDialog.getByRole('button', { name: 'Submit review', exact: true }),
    'This test account must have purchased this product before reviewing it.').toBeVisible();
  await productDialog.getByRole('textbox', { name: 'Your review', exact: true }).fill('test');
  await productDialog.getByRole('button', { name: 'Rate 5 stars', exact: true }).click();
  await productDialog.getByRole('button', { name: 'Submit review', exact: true }).click();
  await expect(productDialog.getByText('Review added.', { exact: true })).toBeVisible();
  await expect(productDialog.locator('article').getByText('Your review', { exact: true })).toBeVisible();
});
