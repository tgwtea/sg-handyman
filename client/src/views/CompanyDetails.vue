<script setup>
// import Carousel from '@/components/Carousel.vue';
import axios from 'axios'
import { ref, computed } from 'vue';
import { onMounted } from 'vue'
import constantUrls from '../../constants/urls.js';
import CompanyCard from '@/components/CompanyCard.vue';
import TimeslotGrid from '@/components/TimeslotGrid.vue';
import TimeslotManager from '@/components/TimeslotManager.vue';
import { useAuthStore } from '@/stores/auth';
import { useRoute } from 'vue-router'

// for getting companyId via route params
const route = useRoute()
const auth = useAuthStore()

const companyId = route.params.companyId;
// console.log(route.params.companyId)

// axios defaults timeout
// prevent website from hanging for too long if promise takes too long to fulfill (exceeds timeout)
axios.defaults.timeout = 3000

const serverUrl = constantUrls.serverUrl;

let company = ref({});

const serviceNames = computed(() =>
  (company.value.services ?? []).flatMap((category) => category.details.map((detail) => detail.service))
);

async function getCompanyById() {
  try {
    // console.log(route.params.companyId)
    let companyId = route.params.companyId;
    const response = await axios.get(`${serverUrl}/companies/${companyId}`);
    console.log(response.data);

    company.value = response.data;
  } catch (error) {
    console.log(error.message);
    company.value = error.message;
  }
}

onMounted(() => {
  getCompanyById();
})

</script>

<template>
  <h2>{{ company.name }}</h2>
  <p>{{ company.description }}</p>
  <a :href="company.website">{{ company.website }}</a>
  <br><br><br>
  <div v-for="category in company.services">
    <h3>{{ category.category }}</h3>
    <table class="table">
      <thead>
        <tr>
          <th scope="col">Service</th>
          <th scope="col">Starting Price</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="service in category.details">
          <td>{{ service.service }}</td>
          <td>{{ service.startingPrice }}</td>
        </tr>
      </tbody>
    </table>
    <!-- <hr> -->
  </div>

  <TimeslotGrid :companyId="companyId" :services="serviceNames" />
  <TimeslotManager v-if="auth.canManage(companyId)" :companyId="companyId" />

  <div>
    <!-- Access route params directly in the template without useRoute -->
    <!-- <p>User ID: {{ $route.params.companyId }}</p> -->
  </div>

</template>
