<script setup>
defineOptions({ name: 'NotFoundView' })
</script>

<template>
  <div class="text-center py-5">
    <h1 class="mb-3">Page not found</h1>
    <p class="text-muted mb-4">The page you opened does not exist or has moved.</p>
    <div class="d-flex flex-wrap justify-content-center gap-2">
      <RouterLink class="btn btn-primary" to="/">Go to Home</RouterLink>
      <RouterLink class="btn btn-outline-secondary" to="/companies">Browse companies</RouterLink>
    </div>
  </div>
</template>
