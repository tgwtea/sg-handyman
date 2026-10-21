import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import api from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isLoggedIn = computed(() => user.value !== null)

  async function fetchMe() {
    try {
      const response = await api.get('/auth/me')
      user.value = response.data
    } catch {
      user.value = null
    }
  }

  async function login(username, password) {
    const response = await api.post('/auth/login', { username, password })
    user.value = response.data
  }

  async function logout() {
    await api.post('/auth/logout')
    user.value = null
  }

  // admin manages every company; a business user manages only their own
  function canManage(companyId) {
    if (!user.value) return false
    if (user.value.role === 'admin') return true
    return user.value.role === 'business' && user.value.companyId === companyId
  }

  return { user, isLoggedIn, fetchMe, login, logout, canManage }
})
