<script setup>
import router from '@/router';
const props = defineProps(['companyId', 'name', 'description']);

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
