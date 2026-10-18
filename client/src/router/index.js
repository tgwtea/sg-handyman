import { createRouter, createWebHistory } from 'vue-router'
import Companies from '../views/Companies.vue'
import CompanyDetails from '@/views/CompanyDetails.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/companies'
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
  ],
})

export default router
