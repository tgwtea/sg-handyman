<script setup>
// import Carousel from '@/components/Carousel.vue';
import axios from 'axios'
import { ref, computed } from 'vue';
import { onMounted } from 'vue'
import constantUrls from '../../constants/urls.js';
import CompanyCard from '@/components/CompanyCard.vue';

// axios defaults timeout not examinable, FYI
// prevent website from hanging for too long if promise takes too long to fulfill (exceeds timeout)
axios.defaults.timeout = 3000

const serverUrl = constantUrls.serverUrl;

let companies = ref([]);

async function getCompanies() {
  try {
    const response = await axios.get(`${serverUrl}/companies`)
    console.log(response.data)

    companies.value = response.data
  } catch (error) {
    console.log(error.message)
    companies.value[0] = error.message
  }
}

onMounted(() => {
  getCompanies();
})

</script>

<template>
  <!-- <Carousel /> -->
   <h1>SG Handyman Booking</h1>
   <div class="container">
    <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4">
     <div v-for="company in companies" :key="company._id" class="col">
      <CompanyCard :companyId="company._id" :name=company.name :description=company.description />
     </div>
    </div>
   </div>

</template>
