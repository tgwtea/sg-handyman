<script setup>
import { RouterView, useRoute } from 'vue-router'
import NavBar from './components/NavBar.vue'
import AppFooter from './components/AppFooter.vue'

const route = useRoute()
</script>

<template>
  <div class="app-shell">
    <NavBar />

    <!-- the wrapper div gives multi-root views a single element to animate -->
    <div :class="['app-main', { 'container py-4': !route.meta.fullWidth }]">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <div :key="route.path === '/shop' || route.path === '/shop/cart' || route.path === '/shop/checkout' || route.path === '/shop/orders' ? 'shop' : route.path">
            <component :is="Component" />
          </div>
        </Transition>
      </RouterView>
    </div>

    <AppFooter />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex-grow: 1;
}
</style>
