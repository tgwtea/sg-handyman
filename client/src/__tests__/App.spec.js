import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import App from '../App.vue'

describe('App', () => {
  it('renders the route and customer navigation', async () => {
    const pinia = createPinia()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:pathMatch(.*)*', component: { template: '<h1>Test page</h1>' } }],
    })
    useAuthStore(pinia).user = { _id: 'customer', username: 'Alice', role: 'customer' }
    await router.push('/')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [pinia, router] } })
    expect(wrapper.get('h1').text()).toBe('Test page')
    expect(wrapper.get('nav').text()).toContain('Alice')
    expect(wrapper.get('a[href="/my-bookings"]').text()).toBe('My Bookings')
    wrapper.unmount()
  })
})
