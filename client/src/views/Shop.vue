<script setup>
import api from '@/api'
import ShopCheckout from '@/components/shop/ShopCheckout.vue'
import ShopDeliveryTracker from '@/components/shop/ShopDeliveryTracker.vue'
import { useAuthStore } from '@/stores/auth'
import { RouterLink, useRoute } from 'vue-router'
import { ref, computed, onMounted, watch  } from 'vue'

// Reuse the existing login store and configured Axios client (api).
const auth = useAuthStore()
// The URL decides whether we display the catalogue or the cart.
const route = useRoute()

const tools = ref([])
const message = ref('')
const cart = ref([])
const placingOrder = ref(false)
const receipt = ref(null)
const orders = ref([])
const loadingOrders = ref(false)
const ordersMessage = ref('')
const cartMessage = ref('')
const deliveryNotification = ref('')
const cartLoading = ref(true)
const cartSaving = ref(false)
const cartReady = ref(false)
const cartUnsaved = ref(false)
const cartBusy = computed(() => placingOrder.value || cartLoading.value || cartSaving.value)
let loginChecked = false

//get the current user _id
function currentUserId() {
  if (auth.user) return auth.user._id
  return ''
}

//update the deliverNotifcation
function showDeliveryNotification(message) {
  deliveryNotification.value = message
}
// Save only cart items for this tab session not browser. JSON.stringify turns the array into text.
async function saveCart() {
  if (cartSaving.value || !cartReady.value) return
  const owner = currentUserId()
  cartSaving.value = true
  cartUnsaved.value = true
  cartMessage.value = ''
  try {
    if (owner) {
      await api.put('/shop/cart', { items: cart.value })
      // Guest items have now been included in the account cart.
      sessionStorage.removeItem('shopCart')
    } else {
      sessionStorage.setItem('shopCart', JSON.stringify(cart.value))
    }
    if (currentUserId() === owner) cartUnsaved.value = false
  } catch {
    if (currentUserId() === owner) {
      cartMessage.value = 'Your cart changes were not saved. Retry before leaving this page.'
    }
  } finally {
    if (currentUserId() === owner) cartSaving.value = false
  }
}

// Return the guest cart without copying account data into browser storage.
function readGuestCart() {
  const savedCart = sessionStorage.getItem('shopCart')
  if (!savedCart) return []

  let items
  try{
  items = JSON.parse(savedCart)
  } catch {
    return null
  }
  if (!Array.isArray(items)) return null
  for (const item of items) {
    if (!item || typeof item.id !== 'number' || typeof item.name !== 'string' ||
        typeof item.price !== 'number' || item.price < 0 ||
        typeof item.quantity !== 'number' || item.quantity < 1 || item.quantity % 1 !== 0) {
      return null
    }
  }
  return items
}

// Login loads the account cart; logout starts with the guest cart, never the old account's items.
async function loadCart() {
  const owner = currentUserId()
  cartLoading.value = true
  cartReady.value = false
  cartSaving.value = false
  cartUnsaved.value = false
  cart.value = []
  cartMessage.value = ''
  try {
    const guestItems = readGuestCart()
    if (guestItems === null) {
    cartMessage.value = 'Your saved guest cart is invalid. Please clear it and add your items again.'
    return
    }
    let items = guestItems
    if (owner) {
      const response = await api.get('/shop/cart')
      if (currentUserId() !== owner) return
      items = response.data
      // Keep the larger quantity for matching tools, so retrying the merge cannot double them.
      for (const guestItem of guestItems) {
        let existingItem
        for (const item of items) {
          if (item.id === guestItem.id) existingItem = item
        }
        if (existingItem) {
          existingItem.quantity = Math.max(existingItem.quantity, guestItem.quantity)
        } else {
          items.push(guestItem)
        }
      }
    }
    if (currentUserId() !== owner) return
    cart.value = items
    cartReady.value = true
    if (owner && guestItems.length > 0) await saveCart()
  } catch {
    if (currentUserId() === owner) cartMessage.value = 'Could not load the cart. Retry loading before adding items.'
  } finally {
    if (currentUserId() === owner) cartLoading.value = false
  }
}


watch(currentUserId, () => {
  if (!loginChecked) return
  receipt.value = null
  orders.value = []
  deliveryNotification.value = ''
  loadCart()
  getMyOrders()
})

// Add a new cart row, or increase the quantity of an existing row.
function addToCart(tool) {
  if (cartBusy.value || !cartReady.value) return
  for (const item of cart.value) {
    if (item.id === tool.id) {
      item.quantity += 1
      saveCart()
      return
    }
  }

  cart.value.push({
    id: tool.id,
    name: tool.name,
    price: tool.price,
    quantity: 1
  })
  saveCart()
}

// Keep at least one unit in a row. The Remove button deletes the row.
function changeQuantity(item, amount) {
  if (cartBusy.value || !cartReady.value) return
  const newQuantity = item.quantity + amount
  if (newQuantity >= 1) {
    item.quantity = newQuantity
    saveCart()
  }
}

// Build a list containing every cart row except the selected one.
function removeFromCart(id) {
  if (cartBusy.value || !cartReady.value) return
  const remainingItems = []
  for (const item of cart.value) {
    if (item.id !== id) {
      remainingItems.push(item)
    }
  }
  cart.value = remainingItems
  saveCart()
}

// Recalculate these values automatically whenever the cart changes.
const cartCount = computed(() => {
  let count = 0
  for (const item of cart.value) {
    count += item.quantity
  }
  return count
})

const cartTotal = computed(() => {
  let total = 0
  for (const item of cart.value) {
    total += item.price * item.quantity
  }
  return total
})

// Ask the server for tools, then store its reply for the template.
async function getProducts() {
  try {
    const response = await api.get('/shop/products')
    tools.value = response.data
  } catch (error) {
    message.value = 'Could not load tools: ' + error.message
  }
}

// POST sends our form data to the server. Clear the cart only after success.
async function placeOrder(deliveryDetails) {
   if (cartBusy.value || !cartReady.value || cartUnsaved.value || cart.value.length === 0) return
  if (!auth.isLoggedIn) {
    message.value = 'Please log in before placing an order.'
    return
  }

  const owner = currentUserId()
  placingOrder.value = true
  message.value = ''
  receipt.value = null

  try {
    const response = await api.post('/shop/orders', {
      recipientName: deliveryDetails.recipientName,
      deliveryAddress: deliveryDetails.deliveryAddress,
      deliveryNote: deliveryDetails.deliveryNote,
      items: cart.value
    })
    if (currentUserId() !== owner) return
    receipt.value = response.data
    cart.value = []
    
    await saveCart()
    await getMyOrders()
  } catch (error) {
    if (error.response && error.response.data.message) {
      message.value = error.response.data.message
    } else {
      message.value = 'Could not submit order: ' + error.message
    }
  } finally {
    placingOrder.value = false
  }
}

// Read the signed-in account's saved orders. History failures do not undo a successful purchase.
async function getMyOrders() {
  if (!auth.isLoggedIn) {
    orders.value = []
    return
  }
  if (loadingOrders.value) return
 const owner = currentUserId()
  loadingOrders.value = true
  ordersMessage.value = ''
  try {
    const response = await api.get('/shop/orders')
    if (currentUserId() === owner) orders.value = response.data
  } catch (error) {
    ordersMessage.value = 'Could not load order history: ' + error.message
  } finally {
    loadingOrders.value = false
  }
}

// The login check must finish before we request personal order history.
onMounted(async () => {
  getProducts()
  await auth.fetchMe()
  loginChecked= true
  await loadCart()
  if (auth.isLoggedIn) {
    getMyOrders()
  }
})
</script>

<template>
  <div>
    <!-- Both URLs use this component, keeping the cart available while switching views. -->
    <div class="d-flex justify-content-between align-items-center gap-3 mb-3">
      <h1 v-if="route.path === '/shop/cart'">Your cart</h1>
      <h1 v-else-if="route.path === '/shop/checkout'">Checkout</h1>
      <h1 v-else>DIY tools shop</h1>
      <RouterLink to="/shop/cart" class="btn btn-outline-primary">
        <span aria-hidden="true">🛒</span> Cart ({{ cartCount }})
      </RouterLink>
    </div>
    <RouterLink v-if="route.path === '/shop/cart'" to="/shop">Continue shopping</RouterLink>
    <p v-if="cartMessage" class="text-danger">{{ cartMessage }}</p>
    <p v-if="cartLoading">Loading cart...</p>
    <p v-else-if="cartSaving">Saving cart...</p>
    <button v-if="cartUnsaved && !cartBusy" class="btn btn-outline-primary mb-3" @click="saveCart">Retry saving cart</button>
    <button v-if="!cartReady && !cartBusy" class="btn btn-outline-primary mb-3" @click="loadCart">Retry loading cart</button>

    <p v-if="message" class="text-danger">{{ message }}</p>

    <section v-if="route.path === '/shop'">
      <div v-for="tool in tools" :key="tool.id">
        <h2>{{ tool.name }}</h2>
        <p>Price: ${{ tool.price }}</p>
        <button class="btn btn-primary mb-3" :disabled="cartBusy || !cartReady" @click="addToCart(tool)">
          Add to cart
        </button>
      </div>

    </section>


    <!-- CART SECTIONS -->
    <section v-if="route.path === '/shop/cart'" class="border rounded p-3 my-4">
      <h2>Your cart</h2>
      <p v-if="cart.length === 0">Your cart is empty.</p>

      <div v-for="item in cart" :key="item.id" class="border-bottom py-3">
        <h3 class="h5">{{ item.name }}</h3>
        <p>${{ item.price }} each | Subtotal: ${{ item.price * item.quantity }}</p>
        <div class="d-flex gap-2 align-items-center">
          <button
            class="btn btn-outline-secondary"
            :disabled="cartBusy || !cartReady || item.quantity === 1"
            @click="changeQuantity(item, -1)"
          >
            -
          </button>
          <span>Quantity: {{ item.quantity }}</span>
          <button class="btn btn-outline-secondary" :disabled="cartBusy || !cartReady" @click="changeQuantity(item, 1)">
            +
          </button>
          <button class="btn btn-outline-danger" :disabled="cartBusy || !cartReady" @click="removeFromCart(item.id)">
            Remove
          </button>
        </div>
      </div>

      <p class="fw-bold mt-3">Total: ${{ cartTotal }}</p>
      <p v-if="cart.length > 0 && !auth.isLoggedIn">
        <RouterLink to="/login?redirect=/shop/cart">Log in to place an order</RouterLink>.
        Your guest cart will be combined with your saved account cart when you log in.
      </p>
            <RouterLink v-if="cart.length > 0 && auth.isLoggedIn && cartReady && !cartBusy && !cartUnsaved" to="/shop/checkout" class="btn btn-success">
        Continue to checkout
            </RouterLink>
            </section>
      
      <!-- CHECKOUT SECTION -->
      <section v-if="route.path === '/shop/checkout'" class="border rounded p-3 my-4">
      <RouterLink to="/shop/cart" class="d-inline-block mb-3">Back to cart</RouterLink>
      <p v-if="cart.length === 0">Your cart is empty. <RouterLink to="/shop">Browse tools</RouterLink></p>
      <p v-else-if="!auth.isLoggedIn">
        <RouterLink to="/login?redirect=/shop/checkout">Log in to continue checkout</RouterLink>
      </p>
      <ShopCheckout v-else :total="cartTotal" :placing-order="cartBusy || cartUnsaved || !cartReady" @place-order="placeOrder" />
      </section>


      <!-- <form v-if="cart.length > 0 && auth.isLoggedIn" @submit.prevent="placeOrder">
        <label for="recipient-name" class="form-label">Recipient name</label>
        <input
          id="recipient-name"
          v-model.trim="recipientName"
          class="form-control mb-3"
          :disabled="placingOrder"
          maxlength="80"
          required
        />
        <button class="btn btn-success" type="submit" :disabled="placingOrder">
          Place order
        </button>
        <p v-if="placingOrder" class="mt-2">Submitting order...</p>
      </form>
    </section> -->
    <section v-if="receipt && auth.isLoggedIn" class="alert alert-success">
      <h2 class="h4">Order saved</h2>
      <p>Recipient: {{ receipt.recipientName }}</p>
      <p>Total: ${{ receipt.total }}</p>
      <p class="mb-0">Your order is saved. No payment has been taken.</p>
    </section>

    <section v-if="auth.isLoggedIn" class="border rounded p-3 my-4">
      <h2>My orders</h2>
      <button class="btn btn-outline-secondary mb-3" :disabled="loadingOrders || placingOrder" @click="getMyOrders">
        Refresh orders
      </button>
      <p v-if="ordersMessage" class="text-danger">{{ ordersMessage }}</p>
      <p v-if="loadingOrders">Loading order history...</p>
      <p v-else-if="orders.length === 0 && !ordersMessage">No orders yet.</p>
      <div v-for="order in orders" :key="order._id" class="border-top py-3">
        <p>Order reference: {{ order._id }}</p>
        <p>Recipient: {{ order.recipientName }}</p>
        <p v-if="order.deliveryAddress">Delivery address: {{ order.deliveryAddress }}</p>
        <p v-if="order.deliveryNote">Delivery note: {{ order.deliveryNote }}</p>
        <ul>
          <li v-for="item in order.items" :key="item.id">
            {{ item.name }} x {{ item.quantity }} — ${{ item.price * item.quantity }}
          </li>
        </ul>
        <p class="fw-bold">Total: ${{ order.total }}</p>
        
        <!-- part where show delivertrack -->
        <ShopDeliveryTracker v-if="order.deliveryDurationSeconds" :order="order" @delivery-update="showDeliveryNotification" />
        <p v-else class="text-muted">Delivery tracking is unavailable for this older order.</p>
      </div>
    </section>

    <div v-if="deliveryNotification && auth.isLoggedIn" class="delivery-notification alert alert-success shadow" role="status">
      <p>{{ deliveryNotification }}</p>
      <button type="button" class="btn btn-outline-secondary btn-sm" @click="deliveryNotification = ''">Dismiss</button>
    </div>

  </div>
</template>

<style scoped>
.delivery-notification {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  max-width: min(360px, calc(100vw - 2rem));
  z-index: 1080;
}
</style>

