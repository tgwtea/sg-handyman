<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

async function logout() {
  await auth.logout()
  router.push('/companies')
}

// defineProps({
//   msg: {
//     type: String,
//     required: true,
//   },
// })
</script>

<template>
  <nav class="navbar navbar-expand-lg bg-body-tertiary">
    <div class="container-fluid">
      <RouterLink class="navbar-brand" to="/">SG Handyman Booking</RouterLink>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarSupportedContent"
        aria-controls="navbarSupportedContent"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarSupportedContent">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active" to="/companies">
              Companies
            </RouterLink>
          </li>

          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active" to="/forum">
              Forum
            </RouterLink>
          </li>
          
          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active" to="/shop">
              Shop
            </RouterLink>
          </li>

        </ul>

        <div v-if="auth.isLoggedIn" class="d-flex gap-2 align-items-center">
          <span class="navbar-text">{{ auth.user.username }} ({{ auth.user.role }})</span>
          <button class="btn btn-outline-secondary" type="button" @click="logout">Log out</button>
        </div>
        <div v-else class="d-flex gap-2">
          <RouterLink class="btn btn-outline-primary" to="/login">Log in</RouterLink>
          <button class="btn btn-primary" type="button">Sign up</button>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped></style>
