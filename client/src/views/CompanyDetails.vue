<script setup>
// import Carousel from '@/components/Carousel.vue';
import axios from 'axios'
import { ref, computed } from 'vue';
import { onMounted } from 'vue'
import constantUrls from '../../constants/urls.js';
import CompanyCard from '@/components/CompanyCard.vue';
import { useRoute } from 'vue-router'

// for getting companyId via route params
const route = useRoute()
// console.log(route.params.companyId)

// axios defaults timeout
// prevent website from hanging for too long if promise takes too long to fulfill (exceeds timeout)
axios.defaults.timeout = 3000

const serverUrl = constantUrls.serverUrl;

let company = ref({});

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
  <div>
  <h2>{{ company.name }}</h2>
  <p>{{ company.description }}</p>
  </div>

  <div>
    <!-- Access route params directly in the template without useRoute -->
    <!-- <p>User ID: {{ $route.params.companyId }}</p> -->
  </div>

</template>
