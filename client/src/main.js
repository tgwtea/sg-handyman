import { createApp } from 'vue'
import { createPinia } from 'pinia'

import './assets/theme.css'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import api from './api'

const app = createApp(App)

app.use(createPinia())
app.use(router)

const auth = useAuthStore()
auth.fetchMe()

// a 401 while the page thinks a user is logged in means the session ended on the server
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? ''
    if (error.response?.status === 401 && auth.isLoggedIn && !url.startsWith('/auth/')) {
      auth.sessionEnded()
      error.response.data = { message: 'Your session ended. Please log in again.' }
    }
    return Promise.reject(error)
  },
)

app.mount('#app')
