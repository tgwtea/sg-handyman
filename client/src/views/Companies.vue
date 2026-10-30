<script setup>
// import Carousel from '@/components/Carousel.vue';
import axios from 'axios'
import { ref, computed } from 'vue';
import { onMounted } from 'vue'
import constantUrls from '../../constants/urls.js';
import CompanyCard from '@/components/CompanyCard.vue';
import BrandIcon from '@/components/BrandIcon.vue';
import { useRoute } from 'vue-router'

const route = useRoute()

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

// search text from the home page, e.g. /companies?q=leaking tap
const searchQuery = computed(() => String(route.query.q ?? '').trim())

// a company matches when every word of the query appears in its name, a category or a service
const filteredCompanies = computed(() => {
  const words = searchQuery.value.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return companies.value

  return companies.value.filter((company) => {
    const services = company.services ?? []
    const text = [
      company.name,
      ...services.map((category) => category.category),
      ...services.flatMap((category) => category.details.map((detail) => detail.service)),
    ].join(' ').toLowerCase()
    return words.every((word) => text.includes(word))
  })
})

</script>

<template>
  <!-- <Carousel /> -->
   <h1 class="mb-4">SG Handyman Booking</h1>

   <div v-if="searchQuery" class="d-flex flex-wrap align-items-center gap-2 mb-3">
    <span class="fw-bold">
     {{ filteredCompanies.length }} {{ filteredCompanies.length === 1 ? 'company' : 'companies' }} for "{{ searchQuery }}"
    </span>
    <RouterLink to="/companies" class="btn btn-light btn-sm">Clear search</RouterLink>
   </div>

   <div v-if="searchQuery && filteredCompanies.length === 0 && companies.length > 0" class="surface-card d-flex flex-wrap align-items-center gap-4 p-4">
    <span class="text-primary"><BrandIcon :size="64" /></span>
    <div>
     <h2 class="h4">No companies match that</h2>
     <p class="mb-0 text-body-secondary">Try another word, or clear the search to see every company.</p>
    </div>
   </div>

   <!-- App.vue already wraps the page in .container, so the row sits directly inside it -->
   <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4">
    <div v-for="company in filteredCompanies" :key="company._id" class="col">
     <CompanyCard :companyId="company._id" :name=company.name :description=company.description :services="company.services" />
    </div>
   </div>

</template>
