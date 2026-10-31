<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { errorMessage } from '@/api'

// Keep in sync with server/controllers/auth-controller.js
const MIN_PASSWORD_LENGTH = 8

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const submitting = ref(false)
const usernameInput = ref(null)

async function submit() {
  error.value = ''
  // fast feedback only; the server repeats the length check
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  submitting.value = true
  try {
    await auth.signup(username.value, password.value)
    router.push(route.query.redirect || '/companies')
  } catch (err) {
    error.value = errorMessage(err)
    password.value = ''
    confirmPassword.value = ''
    if (err.response?.status === 409) {
      username.value = ''
      usernameInput.value?.focus()
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="container py-4" style="max-width: 24rem">
    <h2 class="mb-3">Sign up</h2>
    <form @submit.prevent="submit">
      <div class="mb-3">
        <label for="username" class="form-label">Username</label>
        <input
          id="username"
          ref="usernameInput"
          v-model="username"
          class="form-control"
          autocomplete="username"
          minlength="3"
          maxlength="30"
          required
        />
      </div>
      <div class="mb-3">
        <label for="password" class="form-label">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          class="form-control"
          autocomplete="new-password"
          :minlength="MIN_PASSWORD_LENGTH"
          aria-describedby="password-help"
          required
        />
        <div id="password-help" class="form-text">At least {{ MIN_PASSWORD_LENGTH }} characters.</div>
      </div>
      <div class="mb-3">
        <label for="confirm-password" class="form-label">Confirm password</label>
        <input
          id="confirm-password"
          v-model="confirmPassword"
          type="password"
          class="form-control"
          autocomplete="new-password"
          required
        />
      </div>
      <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
      <button class="btn btn-primary w-100" type="submit" :disabled="submitting">
        {{ submitting ? 'Creating account…' : 'Sign up' }}
      </button>
    </form>
    <p class="mt-3 mb-0 text-center">
      Already have an account?
      <RouterLink :to="{ path: '/login', query: route.query }">Log in</RouterLink>
    </p>
  </div>
</template>
