<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import PixelMascot from './PixelMascot.vue'

const auth = useAuthStore()
const router = useRouter()

async function logout() {
  await auth.logout()
  router.push('/companies')
}
</script>

<template>
  <nav class="navbar navbar-expand-lg app-nav" data-bs-theme="dark">
    <div class="container">
      <RouterLink class="navbar-brand d-flex align-items-center gap-2" to="/">
        <span class="brand-icon">
          <PixelMascot :size="30" />
        </span>
        <span class="brand-text">SG HANDYMAN</span>
      </RouterLink>

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
        <ul class="navbar-nav me-auto mb-2 mb-lg-0 gap-lg-1">
          <li class="nav-item">
            <RouterLink class="nav-link" exact-active-class="active" to="/">Home</RouterLink>
          </li>

          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active" to="/companies">
              Companies
            </RouterLink>
          </li>

          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active" to="/forum">
              DIY Forum
            </RouterLink>
          </li>

          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active" to="/shop">
              Shop
            </RouterLink>
          </li>
          
          <li v-if="auth.user?.role === 'customer'" class="nav-item">
            <RouterLink class="nav-link" active-class="active" to="/my-bookings">
              My Bookings
            </RouterLink>
          </li>

        </ul>

        <div v-if="auth.isLoggedIn" class="d-flex flex-wrap gap-2 align-items-center">
          <span class="user-chip">{{ auth.user.username }} · {{ auth.user.role }}</span>
          <button class="btn btn-light" type="button" @click="logout">Log out</button>
        </div>
        <div v-else class="d-flex flex-wrap gap-2">
          <RouterLink class="btn btn-ghost" to="/login">Log in</RouterLink>
          <RouterLink class="btn btn-primary" to="/sign-up">Sign up</RouterLink>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.app-nav {
  background: var(--red);
  border-bottom: 4px solid var(--ink);
}

.brand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: var(--sky);
  border: var(--line);
  border-radius: var(--radius);
}

.brand-text {
  font-family: var(--font-display);
  font-size: 1.5rem;
  letter-spacing: 1px;
  color: var(--white);
  text-shadow: 2px 2px 0 var(--ink);
}

.nav-link {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--white);
  padding: 0.4rem 0.9rem !important;
  border: 3px solid transparent;
  border-radius: var(--radius);
  transition: transform 0.12s ease;
}

.nav-link:hover {
  color: var(--coin);
  transform: translateY(-2px);
}

/* active page: a coin-yellow chip */
.nav-link.active {
  color: var(--ink) !important;
  background: var(--coin);
  border-color: var(--ink);
  box-shadow: var(--shadow-sm);
}

.navbar-toggler {
  border: var(--line);
  background: var(--coin);
}

.navbar-toggler-icon {
  filter: invert(1);
}

.btn-ghost {
  --bs-btn-color: var(--white);
  --bs-btn-bg: transparent;
  --bs-btn-border-color: var(--white);
  --bs-btn-hover-color: var(--ink);
  --bs-btn-hover-bg: var(--white);
  --bs-btn-hover-border-color: var(--ink);
  --bs-btn-active-color: var(--ink);
  --bs-btn-active-bg: var(--cream);
  box-shadow: none;
}

.user-chip {
  padding: 0.35rem 0.8rem;
  background: var(--white);
  color: var(--ink);
  border: var(--line);
  border-radius: 999px;
  font-weight: 800;
  font-size: 0.9rem;
}
</style>
