import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Companies from '../views/Companies.vue'
import CompanyDetails from '@/views/CompanyDetails.vue'
import Forum from '@/views/Forum.vue'
import Shop from '@/views/Shop.vue'
import Login from '@/views/Login.vue'
import Signup from '@/views/Signup.vue'
import MyBookings from '@/views/MyBookings.vue'
import NotFound from '@/views/NotFound.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
      // fullWidth: App.vue skips its page container, so the hero can span the screen
      meta: { title: 'Home', fullWidth: true },
    },
    {
      path: '/companies',
      name: 'companies',
      component: Companies,
      meta: { title: 'Companies' },
    },
    {
      path: '/companies/:companyId',
      name: 'companyDetails',
      component: CompanyDetails,
      meta: { title: 'Company' },
    },
    {
      path: '/forum',
      name: 'forum',
      component: Forum,
      meta: { title: 'DIY Forum' },
    },
    {
      path: '/shop',
      name: 'shop',
      component: Shop,
      meta: { title: 'Shop' },
    },
    {
      path: '/shop/cart',
      name: 'shop-cart',
      component: Shop,
      meta: { title: 'Cart' },
    },
    {
      path: '/shop/checkout',
      name: 'shop-checkout',
      component: Shop,
      meta: { title: 'Checkout' },
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: { title: 'Log in' },
    },
    {
      path: '/sign-up',
      name: 'sign-up',
      component: Signup,
      meta: { title: 'Sign up' },
    },
    {
      path: '/my-bookings',
      name: 'my-bookings',
      component: MyBookings,
      meta: { title: 'My Bookings' },
    },
    {
      path: '/shop/orders',
      name: 'shop-orders',
      component: Shop,
      meta: { title: 'Orders' },
    },
    // any other path: a friendly 404 page instead of an empty page
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFound,
      meta: { title: 'Page not found' },
    },
  ],
})

// each page names itself in the browser tab
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | SG Handyman` : 'SG Handyman'
})

export default router
