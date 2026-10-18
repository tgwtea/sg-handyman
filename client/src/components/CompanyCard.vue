<script setup>
import router from '@/router';
const props = defineProps(['companyId', 'name', 'description']);

// function redirectToDetails(companyId) {
//   router.push(`/companies/${companyId}`);
// }

</script>

<template>
  <div class="card" style="width: 18rem">
    <!-- <img src="..." class="card-img-top" alt="..." /> -->
    <div class="card-body">
      <!-- <p>{{ companyId }}</p> -->
      <h5 class="card-title">{{ name }}</h5>
      <p class="card-text">
        {{ description }}
      </p>
      <!-- <a class="btn btn-primary" @click="redirectToDetails(companyId)">Details</a> -->
      <RouterLink class="btn btn-primary" :to="{ path: `/companies/${companyId}` }">
        Details
      </RouterLink>
    </div>
  </div>
</template>

<style scoped></style>
