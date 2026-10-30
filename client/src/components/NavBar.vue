<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BrandIcon from './BrandIcon.vue'

const auth = useAuthStore()
const router = useRouter()

async function logout() {
  await auth.logout()
  router.push('/companies')
}
</script>

<template>
  <nav class="navbar navbar-expand-lg app-nav">
    <div class="container">
      <RouterLink class="navbar-brand d-flex align-items-center gap-2" to="/">
        <span class="brand-icon">
          <BrandIcon :size="24" />
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
        </ul>

        <div v-if="auth.isLoggedIn" class="d-flex flex-wrap gap-2 align-items-center">
          <span class="user-chip">{{ auth.user.username }} · {{ auth.user.role }}</span>
          <button class="btn btn-light" type="button" @click="logout">Log out</button>
        </div>
        <div v-else class="d-flex flex-wrap gap-2">
          <RouterLink class="btn btn-ghost" to="/login">Log in</RouterLink>
          <button class="btn btn-accent" type="button">Sign up</button>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.app-nav {
  background: var(--surface);
  border-bottom: var(--line);
  box-shadow: var(--shadow-sm);
}

.brand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--primary);
  color: var(--surface);
  border-radius: var(--radius);
}

.brand-text {
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: var(--ink);
}

.nav-link {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink-muted);
  padding: 0.4rem 0.9rem !important;
  border-radius: 999px;
  transition: color 0.12s ease-out, background-color 0.12s ease-out;
}

.nav-link:hover {
  color: var(--primary);
}

/* active page: a soft blue pill */
.nav-link.active {
  color: var(--primary-dark) !important;
  background: var(--primary-soft);
}

.navbar-toggler {
  border: var(--line);
}

.btn-ghost {
  --bs-btn-color: var(--primary);
  --bs-btn-bg: transparent;
  --bs-btn-border-color: transparent;
  --bs-btn-hover-color: var(--primary-dark);
  --bs-btn-hover-bg: var(--primary-soft);
  --bs-btn-hover-border-color: transparent;
  --bs-btn-active-color: var(--primary-dark);
  --bs-btn-active-bg: var(--primary-soft);
  box-shadow: none;
}

.user-chip {
  padding: 0.35rem 0.8rem;
  background: var(--bg);
  color: var(--ink);
  border: var(--line);
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.9rem;
}
</style>
