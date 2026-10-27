import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Companies from '../views/Companies.vue'
import CompanyDetails from '@/views/CompanyDetails.vue'
import Forum from '@/views/Forum.vue'
import Shop from '@/views/Shop.vue'
import Login from '@/views/Login.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
      // fullWidth: App.vue skips its page container, so the hero can span the screen
      meta: { fullWidth: true },
    },
    {
      path: '/companies',
      name: 'companies',
      component: Companies,
    },
    {
      path: '/companies/:companyId',
      name: 'companyDetails',
      component: CompanyDetails,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      
      // component: () => import('../views/AboutView.vue'),
    },
        {
      path: '/forum',
      name: 'forum',
      component: Forum,
    },
    {
      path: '/shop',
      name: 'shop',
      component: Shop,
    },
    {
     path: '/shop/cart',
     name: 'shop-cart',
     component: Shop,
    },
    {
      path: '/shop/checkout',
      name: 'shop-checkout',
      component: Shop,
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
    },

  ],
})

export default router
