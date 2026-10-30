<script setup>
import router from '@/router';
import { computed } from 'vue';
const props = defineProps(['companyId', 'name', 'description', 'services', 'rating', 'reviewCount']);

// one tag per service category, e.g. "Toilets"
const categories = computed(() => (props.services ?? []).map((category) => category.category));

const stars = computed(() => {
  const filled = Math.round(props.rating ?? 0);
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
});

// function redirectToDetails(companyId) {
//   router.push(`/companies/${companyId}`);
// }

</script>

<template>
  <div class="card h-100">
    <!-- <img src="..." class="card-img-top" alt="..." /> -->
    <div class="card-body d-flex flex-column">
      <!-- <p>{{ companyId }}</p> -->
      <h5 class="card-title">{{ name }}</h5>
      <p class="card-text">
        {{ description }}
      </p>
      <p v-if="reviewCount" class="mb-3">
        <span class="text-warning" :aria-label="`${rating.toFixed(1)} out of 5 stars`">{{ stars }}</span>
        <strong class="ms-1">{{ rating.toFixed(1) }}</strong>
        <span class="text-muted ms-1">({{ reviewCount }} review{{ reviewCount === 1 ? '' : 's' }})</span>
      </p>
      <p v-else class="small text-muted mb-3">No reviews yet</p>
      <div v-if="categories.length" class="d-flex flex-wrap gap-1 mb-3">
        <span v-for="category in categories" :key="category" class="badge rounded-pill text-bg-light border">
          {{ category }}
        </span>
      </div>
      <!-- <a class="btn btn-primary" @click="redirectToDetails(companyId)">Details</a> -->
      <div class="mt-auto d-flex flex-wrap gap-2">
        <RouterLink class="btn btn-primary" :to="{ path: `/companies/${companyId}` }">
          Details
        </RouterLink>
        <!-- CompanyDetails.vue scrolls to this anchor after the company loads -->
        <RouterLink class="btn btn-outline-primary" :to="{ path: `/companies/${companyId}`, hash: '#book-a-slot' }">
          Book a slot
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
