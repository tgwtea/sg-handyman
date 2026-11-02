<script setup>
// Grey placeholder with the same shape as CompanyCard; Companies.vue shows it while status is 'loading'
</script>

<template>
  <!-- not a .card, so E2E card counts never match a placeholder -->
  <div class="skeleton-card h-100 border rounded p-3 d-flex flex-column" aria-hidden="true">
    <div class="skeleton-line mb-3" style="width: 70%; height: 1.25rem;"></div>
    <div class="skeleton-line mb-2"></div>
    <div class="skeleton-line mb-2"></div>
    <div class="skeleton-line mb-3" style="width: 55%;"></div>
    <div class="skeleton-line mb-3" style="width: 40%;"></div>
    <div class="d-flex gap-1 mb-3">
      <div class="skeleton-line skeleton-pill"></div>
      <div class="skeleton-line skeleton-pill"></div>
    </div>
    <div class="mt-auto d-flex gap-2">
      <div class="skeleton-line skeleton-button"></div>
      <div class="skeleton-line skeleton-button"></div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-card {
  min-height: 260px;
  background: var(--bs-body-bg, #fff);
}

.skeleton-line {
  height: 0.8rem;
  border-radius: 4px;
  background: linear-gradient(90deg, #e9ecef 25%, #f8f9fa 50%, #e9ecef 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s linear infinite;
}

.skeleton-pill {
  width: 4.5rem;
  height: 1.25rem;
  border-radius: 999px;
}

.skeleton-button {
  width: 5.5rem;
  height: 2.25rem;
}

@keyframes shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-line {
    animation: none;
  }
}
</style>
