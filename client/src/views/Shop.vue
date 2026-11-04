<script setup>
defineOptions({ name: 'ShopView' })
import api from '@/api'
import ShopOrderManagement from '@/components/shop/ShopOrderManagement.vue'
import ShopReviewManagement from '@/components/shop/ShopReviewManagement.vue'
import ShopCheckout from '@/components/shop/ShopCheckout.vue'
import ShopOrders from '@/components/shop/ShopOrders.vue'
import ShopProductDetails from '@/components/shop/ShopProductDetails.vue'
import ShopConfirmDialog from '@/components/shop/ShopConfirmDialog.vue'
import ShopRatingSummary from '@/components/shop/ShopRatingSummary.vue'
import { useAuthStore } from '@/stores/auth'
import { RouterLink, useRoute,useRouter } from 'vue-router'
import { ref, computed, onMounted, onUnmounted, watch  } from 'vue'

// Reuse the existing login store and configured Axios client (api).
const auth = useAuthStore()
// The URL decides whether we display the catalogue or the cart.
const route = useRoute()
const router = useRouter()

const tools = ref([])
// Do not mount the sliders until their final limits and starting values are ready.
const productsLoading = ref(true)
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
const cartSaved = ref(false)

//creates sliders
const priceLimit = computed(() => {
  let highest = 1
  for (const tool of tools.value) if (tool.price > highest) highest = tool.price
  return Math.ceil(highest)
})
const priceTrack = computed(() => {
  const low = minimumPrice.value / priceLimit.value * 100
  const high = Number(maximumPrice.value) / priceLimit.value * 100
  return 'linear-gradient(to right, #b8bdc2 ' + low + '%, #1477bd ' + low + '%, #1477bd ' + high + '%, #b8bdc2 ' + high + '%)'
})

const productName = ref('')
const productPrice = ref('')
const productDescription = ref('')
const productSpecifications = ref('')
const productImageUrl = ref('')
const selectedProduct = ref(null)
const searchText = ref('')
const companyFilter = ref('')
const minimumPrice = ref(0)
const maximumPrice = ref(0)
const minimumRating = ref('')
const catalogueSort = ref('name')
const reviewSummaries = ref([])
const ratingsMessage = ref('')
const productBusy = ref(false)
const productMessage = ref('')
const editingProductId = ref(0)
const pendingRemovalId = ref(0)
const companies = ref([])
const selectedCompanyId = ref('')
const companiesLoading = ref(false)
const companiesMessage = ref('')
const canManageProducts = computed(() => {
  if (!auth.user) return false
  return auth.user.role === 'admin' || (auth.user.role === 'business' && !!auth.user.companyId)
})
let loginChecked = false
let shopActive = true
let ordersTimer
// A button selects the order list shown beside the left navigation.
const orderPage = ref('active')
const managementSection = computed(() => {
  if (orderPage.value === 'manage-history') return 'history'
  if (orderPage.value === 'manage-cancelled') return 'cancelled'
  return 'active'
})
const viewingManagement = computed(() => orderPage.value === 'manage-active' || orderPage.value === 'manage-history' || orderPage.value === 'manage-cancelled')

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
  cartSaved.value= false
  cartMessage.value = ''
  try {
    if (owner) {
      const response = await api.put('/shop/cart', { items: cart.value })

      //display product name and price confirmed by the server
      if (currentUserId() === owner) cart.value = response.data
      
      // Guest items have now been included in the account cart.
      sessionStorage.removeItem('shopCart')
    } else {
      sessionStorage.setItem('shopCart', JSON.stringify(cart.value))
    }
    cartUnsaved.value=false
    cartSaved.value=true
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
  cartSaved.value = false
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

    //also a update on session cart on latest price even if not log in
    if (!owner) {
      for (const item of items) {
        for (const tool of tools.value) {
          if (item.id === tool.id) {
            item.name = tool.name
            item.price = tool.price
          }}}}
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
  orderPage.value = 'active'
  loadingOrders.value = false
  ordersMessage.value=''
  receipt.value = null
  selectedProduct.value=null
  resetProductForm()
  productMessage.value = ''
  companies.value = []
  companiesMessage.value = ''
  getCompanies()
  orders.value = []
  deliveryNotification.value = ''
  loadCart()
  getMyOrders()
})


// Add a new cart row, or increase the quantity of an existing row.
function addToCart(tool, quantity=1) {
  if (cartBusy.value || !cartReady.value) return
  for (const item of cart.value) {
    if (item.id === tool.id) {
      item.quantity += quantity
      saveCart()
      return
    }
  }

  cart.value.push({
    id: tool.id,
    name: tool.name,
    price: tool.price,
    quantity: quantity
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
  productsLoading.value = true
  try {
    const response = await api.get('/shop/products')
    tools.value = response.data
    maximumPrice.value = priceLimit.value
  } catch (error) {
    message.value = 'Could not load tools: ' + error.message
  } finally { productsLoading.value = false }
}

async function getCompanies() {
  const owner = currentUserId()
  companiesLoading.value =true
  companiesMessage.value = ''
  try{
    const response = await api.get('/companies')
    if(currentUserId() === owner) companies.value = response.data
  } catch{
    if ( currentUserId() === owner) companiesMessage.value = 'Could not load companies. Please retry'
  } finally{
    if (currentUserId() === owner) companiesLoading.value = false
  }
}

// Plain lookup functions keep the template readable.:D
function companyName(companyId) {
  for (const company of companies.value) {
    if (company._id === companyId) return company.name
  }
  return 'Unassigned seller'
}

function productRating(productId) {
  for (const summary of reviewSummaries.value) {
    if (summary.productId === productId) return summary
  }
  return { average: 0, count: 0 }
}

async function getReviewSummaries() {
  ratingsMessage.value = ''
  try {
    const response = await api.get('/shop/reviews/summary')
    reviewSummaries.value = response.data
  } catch {
    ratingsMessage.value = 'Could not load ratings. You can still browse products.'
  }
}

const filteredTools = computed(() => {
  const result = []
  const search = searchText.value.trim().toLowerCase()
  for (const tool of tools.value) {
    if (search && !tool.name.toLowerCase().includes(search)) continue
    if (companyFilter.value && (tool.companyId || 'unassigned') !== companyFilter.value) continue
    if (minimumPrice.value !== '' && tool.price < Number(minimumPrice.value)) continue
    if (maximumPrice.value !== '' && tool.price > Number(maximumPrice.value)) continue
    if (minimumRating.value && productRating(tool.id).average < Number(minimumRating.value)) continue
    result.push(tool)
  }

  // const A = [20, 5, 12, 8]
// A.sort((a, b) => a - b)
// console.log(A) // [5, 8, 12, 20]
  result.sort((a, b) => {
    if (catalogueSort.value === 'price-low') return a.price - b.price
    if (catalogueSort.value === 'price-high') return b.price - a.price
    if (catalogueSort.value === 'rating') return productRating(b.id).average - productRating(a.id).average
    const first = a.name.toLowerCase()
    const second = b.name.toLowerCase()
    if (first < second) return -1
    if (first > second) return 1
    return 0
  })
  return result
})

function clearFilters() {
  searchText.value = ''
  companyFilter.value = ''
  minimumPrice.value = 0
  maximumPrice.value = priceLimit.value
  minimumRating.value = ''
  catalogueSort.value = 'name'
}

//when url change it close product popup, and get my order when go order page
watch(() => route.path, () => {
  selectedProduct.value = null
  if (route.path === '/shop/orders' && loginChecked) getMyOrders()
})


//checking companyrole and whether they own the tool
function canManageProduct(tool) {
  if (!auth.user) return false
   return auth.user.role === 'admin' || (auth.user.role === 'business' && !!auth.user.companyId && tool.companyId === auth.user.companyId)
}

//clear everything except productmessage
function resetProductForm() {
  productName.value = ''
  productPrice.value = ''
  productDescription.value=''
  productSpecifications.value=''
  productImageUrl.value=''
  editingProductId.value = 0
  pendingRemovalId.value = 0
  selectedCompanyId.value = ''
}

function startEditingProduct(tool) {
  if (productBusy.value || !canManageProduct(tool)) return
  editingProductId.value = tool.id
  productName.value = tool.name
  productPrice.value = tool.price
  productDescription.value = tool.description || ''
  productSpecifications.value = tool.specifications || ''
  productImageUrl.value = tool.imageUrl || ''
  productMessage.value = ''
  pendingRemovalId.value = 0
}

async function saveProduct() {
  if (productBusy.value) return
  if (!canManageProducts.value) return
  const owner = currentUserId()
  const id = editingProductId.value
  productBusy.value = true
  productMessage.value = ''
  try {
    const details = { name: productName.value, price: productPrice.value,description: productDescription.value, specifications: productSpecifications.value,
      imageUrl: productImageUrl.value  }
    if (id === 0) {
      if (auth.user.role ===  'admin')details.companyId = selectedCompanyId.value
      const response = await api.post('/shop/products', details)
      tools.value.push(response.data)
    } else {
      const response = await api.put('/shop/products/' + id, details)
      for (const tool of tools.value) {
        if (tool.id === id) {
          tool.name = response.data.name
          tool.price = response.data.price
          tool.description = response.data.description
          tool.specifications = response.data.specifications
          tool.imageUrl = response.data.imageUrl
        }
      }
      // Refresh this page's cart display too
      for (const item of cart.value) {
        if (item.id === id) {
          item.name = response.data.name
          item.price = response.data.price
        }
      }
    }
    if (currentUserId() === owner) {
      resetProductForm()
      productMessage.value = id === 0 ? 'Product added.' : 'Product updated.'
    }
  } catch (error) {
    if (currentUserId() === owner) {
      if (error.response && error.response.data.message) {
        productMessage.value = error.response.data.message
      } else {
        productMessage.value = 'Could not save the product. Please try again.'
      }
    }
  } finally {
    productBusy.value = false
  }
}

// This is called only after the user clicks the inline Confirm remove button.
async function removeProduct(tool) {
  if (productBusy.value || !canManageProduct(tool)) return
  const owner = currentUserId()
  productBusy.value = true
  productMessage.value = ''
  try {
    await api.delete('/shop/products/' + tool.id)
    const remainingTools = []
    for (const item of tools.value) {
      if (item.id !== tool.id) remainingTools.push(item)
    }
    tools.value = remainingTools
    if (currentUserId() === owner) {
      if (editingProductId.value === tool.id) resetProductForm()
      pendingRemovalId.value = 0
      productMessage.value = 'Product removed.'
    }
  } catch (error) {
    if (currentUserId() === owner) {
      if (error.response && error.response.data.message) {
        productMessage.value = error.response.data.message
      } else {
        productMessage.value = 'Could not remove the product. Please try again.'
      }
    }
  } finally {
    productBusy.value = false
  }
}

// A removed product may still be in an older saved cart. Let its owner remove it.
function isProductAvailable(id) {
  for (const tool of tools.value) {
    if (tool.id === id) return true
  }
  return false
}

const cartHasUnavailableProducts = computed(() => {
  for (const item of cart.value) {
    if (!isProductAvailable(item.id)) return true
  }
  return false
})

// Refresh the parent list after a child hides an order; clear its temporary receipt too.
function orderRemoved(orderId) {
  if (receipt.value && receipt.value._id === orderId) receipt.value = null
  getMyOrders()
}

// POST sends our form data to the server. Clear the cart only after success.
async function placeOrder(deliveryDetails) {
   if (cartBusy.value || !cartReady.value || cartUnsaved.value || cartHasUnavailableProducts.value || cart.value.length === 0) return
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
    if (currentUserId() === owner) await router.push('/shop/orders')
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
  if (!auth.isLoggedIn) { orders.value = []; return }
  if (loadingOrders.value) return
  const owner = currentUserId()
  loadingOrders.value = true
  ordersMessage.value = ''
  try {
    const response = await api.get('/shop/orders')
    if (currentUserId() !== owner) return
    const notices = []
    for (const order of response.data) {
      let previous
      for (const existing of orders.value) if (existing._id === order._id) previous = existing
      if (previous) {
        for (const update of order.updates || []) {
          let seen = false
          for (const old of previous.updates || []) if (old._id === update._id) seen = true
          if (!seen) notices.push(update.message)
        }
      }
    }
    orders.value = response.data
    if (notices.length && route.path === '/shop/orders') deliveryNotification.value = notices.join(' ')
  } catch (error) {
    if (currentUserId() === owner) ordersMessage.value = 'Could not load order history: ' + error.message
  } finally {
    if (currentUserId() === owner) loadingOrders.value = false
  }
}
// The login check must finish before we request personal order history.
onMounted(async () => {
  // a link such as /shop?q=wrench from the Home helper starts with that search
  if (route.path === '/shop' && typeof route.query.q === 'string') searchText.value = route.query.q.trim()
  await getProducts()
  if (!shopActive) return
  await auth.fetchMe()
  if (!shopActive) return
  loginChecked= true
  getCompanies()
  getReviewSummaries()
  ordersTimer = setInterval(() => {
    if (route.path === '/shop/orders' && auth.isLoggedIn) getMyOrders()
  }, 10000)  
  await loadCart()
  if (auth.isLoggedIn) {
    getMyOrders()
  }
})

onUnmounted(() => {
  shopActive = false
  clearInterval(ordersTimer)
  cartReady.value = false
})
</script>

<template>
  <div class="container mt-4">
    <!-- Both URLs use this component, keeping the cart available while switching views. -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
      <h1 v-if="route.path === '/shop/cart'">Your cart</h1>
      <h1 v-else-if="route.path === '/shop/checkout'">Checkout</h1>
      <h1 v-else-if="route.path === '/shop/orders'">Orders and delivery</h1>
      <h1 v-else>DIY tools shop</h1>
      <div class="d-flex flex-wrap gap-2 ms-auto">
      <RouterLink to="/shop/orders" class="btn btn-outline-primary">Orders</RouterLink>
      <RouterLink to="/shop/cart" class="btn btn-outline-primary">
        <span aria-hidden="true">🛒</span> Cart ({{ cartCount }})
      </RouterLink>
    </div></div>
    <RouterLink v-if="route.path === '/shop/cart' || route.path === '/shop/orders'" to="/shop">Continue shopping</RouterLink>
    <p v-if="cartMessage" class="text-danger">{{ cartMessage }}</p>
    <div class="cart-save-status small mb-3" role="status">
    <span v-if="cartLoading">Loading cart...</span>
    <span v-else-if="cartSaving">Saving cart...</span>
    <span v-else-if="cartSaved && !cartUnsaved">Saved</span>
    </div>
    <button v-if="!cartReady && !cartBusy" class="btn btn-outline-primary mb-3" @click="loadCart">Retry loading cart</button>

    <p v-if="message" class="text-danger">{{ message }}</p>

    <section v-if="route.path === '/shop'">

  <!-- Only a linked business account sees the form-->
      <form v-if="canManageProducts" class="border rounded p-3 mb-4" @submit.prevent="saveProduct">
        <fieldset :disabled="productBusy">
          <legend>{{ editingProductId ? 'Edit product' : 'Add a product' }}</legend>

          <div v-if="auth.user.role === 'admin' && !editingProductId" class="mb-3">
            <label for="product-company" class="form-label">Company</label>
            <select id="product-company" v-model="selectedCompanyId" class="form-select" :disabled="companiesLoading" required>
              <option disabled value="">Choose a company</option>
              <option v-for="company in companies" :key="company._id" :value="company._id">{{ company.name }}</option>
            </select>
            <p v-if="companiesLoading" class="mt-2">Loading companies...</p>
            <p v-else-if="companies.length === 0 && !companiesMessage" class="mt-2">No companies are available. A company is needed before adding a product.</p>
            <p v-if="companiesMessage" class="text-danger">{{ companiesMessage }}</p>
            <button v-if="companiesMessage" type="button" class="btn btn-outline-secondary" @click="getCompanies">Retry loading companies</button>
          </div>

          <label for="product-name" class="form-label">Product name</label>
          <input id="product-name" v-model.trim="productName" class="form-control mb-3" maxlength="100" required />
          <label for="product-price" class="form-label">Product price (SGD)</label>
          <input id="product-price" v-model.number="productPrice" class="form-control mb-3" type="number" min="0" max="1000000" step="0.01" required />
          <label for="product-description" class="form-label">Description (optional)</label>
          <textarea id="product-description" v-model.trim="productDescription" class="form-control mb-3" rows="3" maxlength="1000"></textarea>
          <label for="product-specifications" class="form-label">Specifications (optional)</label>
          <textarea id="product-specifications" v-model.trim="productSpecifications" class="form-control mb-3" rows="2" maxlength="500" placeholder="Size, material, suitable uses..."></textarea>
          <label for="product-image-url" class="form-label">Product image link (optional)</label>
          <input id="product-image-url" v-model.trim="productImageUrl" type="url" class="form-control mb-3" maxlength="500" placeholder="https://..." />
          <button type="submit" class="btn btn-primary">{{ productBusy ? 'Please wait...' : editingProductId ? 'Save changes' : 'Add product' }}</button>
          <button v-if="editingProductId" type="button" class="btn btn-outline-secondary ms-2" @click="resetProductForm">Cancel edit</button>
        </fieldset>

        <p v-if="productMessage" class="mt-2 mb-0" role="status">{{ productMessage }}</p>
      </form>
      <p v-else-if="auth.user && auth.user.role === 'business'" class="text-muted">Your account must be linked to a company before you can add products.</p>

      <div class="border rounded p-3 mb-4">
        <div class="row g-3">
          <div class="col-md-6 col-xl-4">
            <div class="position-relative">
              <label for="tool-search" class="form-label">Search tools</label>
              <input id="tool-search" v-model="searchText" type="search" class="form-control" placeholder="Search by product name" />
              <button v-if="searchText" type="button" class="shop-search-clear position-absolute top-0 end-0 h-100" aria-label="Clear search" @click="searchText = ''">×</button>
            </div>
          </div>  
          <div class="col-md-6 col-xl-4">
            <label for="tool-company" class="form-label">Seller</label>
            <select id="tool-company" v-model="companyFilter" class="form-select" :disabled="companiesLoading">
              <option value="">All sellers</option>
              <option v-for="company in companies" :key="company._id" :value="company._id">{{ company.name }}</option>
              <option value="unassigned">Unassigned seller</option>
            </select>
          </div>
          <div class="col-md-6 col-xl-4">
            <label for="tool-sort" class="form-label">Sort products</label>
            <select id="tool-sort" v-model="catalogueSort" class="form-select">
              <option value="name">Name A–Z</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="rating">Highest rated</option>
            </select>
          </div>
          <div class="col-md-8">
            <div v-if="!productsLoading && tools.length">
            <p class="form-label mb-1">Price range: <strong>S${{ Number(minimumPrice).toFixed(2) }} – S${{ Number(maximumPrice).toFixed(2) }}</strong></p>
            <div class="shop-price-range position-relative">
              <div class="shop-price-track" :style="{ background: priceTrack }"></div>
              <label for="tool-min-price" class="visually-hidden">Minimum price ($)</label>
              <input id="tool-min-price" v-model.number="minimumPrice" type="range" min="0" :max="priceLimit" step="0.1" class="shop-range-input" @input="minimumPrice = Math.min(minimumPrice, Number(maximumPrice))" />
              <label for="tool-max-price" class="visually-hidden">Maximum price ($)</label>
              <input id="tool-max-price" v-model.number="maximumPrice" type="range" min="0" :max="priceLimit" step="0.1" class="shop-range-input" @input="maximumPrice = Math.max(maximumPrice, minimumPrice)" />
            </div>
            </div>
            <p v-else class="small mb-0 py-3">{{ productsLoading ? 'Loading price range...' : 'No price range available.' }}</p>
          </div>
          <div class="col-md-4">
            <label for="tool-min-rating" class="form-label">Minimum rating</label>
            <select id="tool-min-rating" v-model="minimumRating" class="form-select"><option value="">Any rating</option><option value="4">4 stars and above</option><option value="3">3 stars and above</option></select>
          </div>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-3 mt-3">
          <button type="button" class="btn btn-outline-secondary" @click="clearFilters">Clear filters</button>
          <span role="status">{{ filteredTools.length }} of {{ tools.length }} products</span>
        </div>
        <p v-if="companiesMessage" class="text-danger mt-2">{{ companiesMessage }}</p>
        <button v-if="companiesMessage" type="button" class="btn btn-outline-secondary btn-sm" @click="getCompanies">Retry seller list</button>
        <p v-if="ratingsMessage" class="text-danger mt-2">{{ ratingsMessage }}</p>
        <button v-if="ratingsMessage" type="button" class="btn btn-outline-secondary btn-sm" @click="getReviewSummaries">Retry product ratings</button>
      </div>


    <p v-if="!productsLoading && tools.length === 0 && !message">No tools are available yet.</p>
    <p v-else-if="filteredTools.length === 0">No products match your filters. Try Clear filters.</p>

      <div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3">
        <div v-for="tool in filteredTools" :key="tool.id" class="col">
          <div class="card h-100">
            <img v-if="tool.imageUrl" :src="tool.imageUrl" :alt="tool.name" class="card-img-top shop-product-image" />
            <div v-else class="shop-product-image d-flex align-items-center justify-content-center text-muted small">No product photo yet</div>
            <div class="card-body d-flex flex-column p-2 p-sm-3">
        <h2 class="h5 card-title">{{ tool.name }}</h2>
        <p class="small mb-1">{{ companyName(tool.companyId) }}</p>
              <div class="mb-3"><ShopRatingSummary v-if="productRating(tool.id).count" :average="productRating(tool.id).average" :count="productRating(tool.id).count" :ratings="productRating(tool.id).ratings" /><p v-else class="small text-muted mb-0">No reviews yet</p></div>
        <p class="card-text">Price: ${{ tool.price.toFixed(2) }}</p>
        <button type="button" class="btn btn-outline-primary w-100 mb-2" @click="selectedProduct = tool">View details</button>
        <button class="btn btn-primary w-100 mt-auto" :disabled="cartBusy || !cartReady" @click="addToCart(tool)">
          Add to cart
        </button>
                <div v-if="canManageProduct(tool)" class="d-flex flex-wrap gap-2 mt-3">
          <button type="button" class="btn btn-outline-primary btn-sm" :disabled="productBusy" @click="startEditingProduct(tool)">Edit</button>
          <button type="button" class="btn btn-outline-danger btn-sm" :disabled="productBusy" @click="pendingRemovalId = tool.id">Remove product</button>
          <ShopConfirmDialog v-if="pendingRemovalId === tool.id" title="Confirm removal" :message="'Remove ' + tool.name + ' from the shop?'" note="The product will no longer be available to buy. Existing orders and reviews stay saved." confirm-label="✓ Yes, Remove Product" :busy="productBusy" @cancel="pendingRemovalId = 0" @confirm="removeProduct(tool)" />
        </div>
      </div></div></div></div>
      

    </section>


    <!-- CART SECTIONS -->
    <section v-if="route.path === '/shop/cart'" class="border rounded p-3 my-4">
      <h2>Your cart</h2>
      <p v-if="cart.length === 0">Your cart is empty.</p>

      <div v-for="item in cart" :key="item.id" class="border-bottom py-3">
        <h3 class="h5">{{ item.name }}</h3>
                <p v-if="!isProductAvailable(item.id)" class="text-danger">This tool is unavailable. Remove it from your cart to continue.</p>
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
<RouterLink v-if="cart.length > 0 && auth.isLoggedIn && cartReady && !cartBusy && !cartUnsaved && !cartHasUnavailableProducts" to="/shop/checkout" class="btn btn-success">
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
      <p v-else-if="cartHasUnavailableProducts" class="text-danger">Your cart contains an unavailable tool. Go back to the cart and remove it.</p>
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
    <section v-if="route.path === '/shop/orders' && receipt && auth.isLoggedIn" class="alert alert-success">
      <h2 class="h4">Order saved</h2>
      <p>Recipient: {{ receipt.recipientName }}</p>
      <p>Total: ${{ receipt.total }}</p>
      <p class="mb-0">Your order is saved. No payment has been taken.</p>
    </section>

    <p v-if="route.path === '/shop/orders' && !auth.isLoggedIn && !cartLoading">
      <RouterLink to="/login?redirect=/shop/orders">Log in to view your orders</RouterLink>.
    </p>
    <!-- The left navigation changes a ref, not the URL. v-show preserves delivery trackers. -->
    <section v-if="auth.isLoggedIn" v-show="route.path === '/shop/orders'" class="row g-4 my-3">
      <aside class="col-12 col-lg-3">
        <nav class="border rounded p-3" aria-label="Order sections">
          <h2 class="h6 mb-3">My purchases</h2>
          <div class="d-grid gap-2">
            <button type="button" class="btn text-start" :class="orderPage === 'active' ? 'btn-primary' : 'btn-outline-secondary'" @click="orderPage = 'active'">Active orders</button>
            <button type="button" class="btn text-start" :class="orderPage === 'history' ? 'btn-primary' : 'btn-outline-secondary'" @click="orderPage = 'history'">Order history</button>
            <button type="button" class="btn text-start" :class="orderPage === 'cancelled' ? 'btn-primary' : 'btn-outline-secondary'" @click="orderPage = 'cancelled'">Cancelled orders</button>
          </div>
          <template v-if="canManageProducts">
            <h2 class="h6 mt-4 mb-3">{{ auth.user.role === 'admin' ? 'Administration' : 'Company orders' }}</h2>
            <div class="d-grid gap-2">
              <button type="button" class="btn text-start" :class="orderPage === 'manage-active' ? 'btn-primary' : 'btn-outline-secondary'" @click="orderPage = 'manage-active'">Manage active orders</button>
              <button type="button" class="btn text-start" :class="orderPage === 'manage-history' ? 'btn-primary' : 'btn-outline-secondary'" @click="orderPage = 'manage-history'">Manage order history</button>
              <button type="button" class="btn text-start" :class="orderPage === 'manage-cancelled' ? 'btn-primary' : 'btn-outline-secondary'" @click="orderPage = 'manage-cancelled'">Manage cancelled orders</button>
              <button v-if="auth.user.role === 'admin'" type="button" class="btn text-start" :class="orderPage === 'reviews' ? 'btn-primary' : 'btn-outline-secondary'" @click="orderPage = 'reviews'">Manage reviews</button>
            </div>
          </template>
        </nav>
      </aside>
      <div class="col-12 col-lg-9">
        <ShopOrders v-show="!viewingManagement && orderPage !== 'reviews'" :key="currentUserId()" :orders="orders" :loading="loadingOrders" :message="ordersMessage" :section="orderPage" @refresh="getMyOrders" @removed="orderRemoved" @delivery-update="showDeliveryNotification" />
        <ShopOrderManagement v-if="viewingManagement && canManageProducts" :key="currentUserId()" :section="managementSection" @removed="orderRemoved" />
        <ShopReviewManagement v-if="orderPage === 'reviews' && auth.user.role === 'admin'" :key="currentUserId()" @reviews-changed="getReviewSummaries" />
      </div>
    </section>
    <ShopProductDetails v-if="selectedProduct" :key="selectedProduct.id" :tool="selectedProduct" :company-name="companyName(selectedProduct.companyId)" :cart-disabled="cartBusy || !cartReady" @close="selectedProduct = null" @add-to-cart="addToCart" @reviews-changed="getReviewSummaries" />
    <div v-if="deliveryNotification && auth.isLoggedIn" class="delivery-notification alert alert-success shadow" role="status">
      <p>{{ deliveryNotification }}</p>
      <button type="button" class="btn btn-outline-secondary btn-sm" @click="deliveryNotification = ''">Dismiss</button>
    </div>

  </div>
</template>

<style scoped>
/* Approved extra: overlapping native range inputs share a coloured track.
   Ignore pointer events on each input except its thumb, so both handles can be dragged. */
.shop-price-range { height: 44px; }
.shop-price-track { position: absolute; left: 0; right: 0; top: 19px; height: 6px; border-radius: 3px; }
.shop-range-input { appearance: none; -webkit-appearance: none; pointer-events: none; position: absolute; left: 0; top: 0; width: 100%; height: 44px; margin: 0; background: transparent; }
.shop-range-input::-webkit-slider-runnable-track { height: 6px; background: transparent; }
.shop-range-input::-moz-range-track { height: 6px; background: transparent; }
.shop-range-input::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; pointer-events: auto; width: 26px; height: 26px; margin-top: -10px; border: 5px solid #1477bd; border-radius: 50%; background: white; cursor: pointer; }
.shop-range-input::-moz-range-thumb { pointer-events: auto; width: 16px; height: 16px; border: 5px solid #1477bd; border-radius: 50%; background: white; cursor: pointer; }
.shop-range-input:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

/* Equal image heights align cards; contain keeps the whole tool visible. */
.shop-product-image { width: 100%; height: 170px; object-fit: contain; padding: 0.75rem; }
/* One clear control with a 44px-wide target replaces the tiny native search x. */
.shop-search-input { padding-right: 3.5rem; }
.shop-search-clear { width: 44px; min-height: 44px; border: 0; background: transparent; color: var(--ink); font-size: 1.5rem; box-shadow: none; border-radius: 0; }
.shop-search-clear:focus-visible { outline: 2px solid currentColor; outline-offset: -4px; }

.cart-save-status {
  min-height: 1.5rem;
}
.delivery-notification {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  max-width: min(360px, calc(100vw - 2rem));
  z-index: 1080;
}
</style>

