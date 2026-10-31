<script setup>
// import Carousel from '@/components/Carousel.vue';
import axios from 'axios'
import { ref, computed } from 'vue';
import { onMounted } from 'vue'
import constantUrls from '../../constants/urls.js';
import CompanyCard from '@/components/CompanyCard.vue';
import PixelMascot from '@/components/PixelMascot.vue';
import { useRoute } from 'vue-router'

const route = useRoute()

// axios defaults timeout not examinable, FYI
// prevent website from hanging for too long if promise takes too long to fulfill (exceeds timeout)
axios.defaults.timeout = 3000

const serverUrl = constantUrls.serverUrl;

let companies = ref([]);
let filteredCompanies = ref([]);
let searchStr = ref('');
const reviewSummaries = ref([]);


async function getCompanies() {
  try {
    const response = await axios.get(`${serverUrl}/companies`)
    console.log(response.data)

    companies.value = response.data
    // filteredCompanies.value = JSON.parse(JSON.stringify(companies.value));
    filteredCompanies.value = filterCompaniesByRouteQuery();
  } catch (error) {
    console.log(error.message)
    companies.value[0] = error.message
  }
}

// the cards still show without ratings if this fails
async function getReviewSummaries() {
  try {
    const response = await axios.get(`${serverUrl}/reviews/summary`)
    reviewSummaries.value = response.data
  } catch (error) {
    console.log(error.message)
  }
}

onMounted(() => {
  getCompanies();
  getReviewSummaries();
})

const summaryByCompany = computed(() => new Map(reviewSummaries.value.map((summary) => [summary.companyId, summary])))

// search text from the home page, e.g. /companies?q=leaking tap
const searchQuery = computed(() => String(route.query.q ?? '').trim())

// a company matches when every word of the query appears in its name, a category or a service
// const filteredCompanies = computed(() => {
//   const words = searchQuery.value.toLowerCase().split(/\s+/).filter(Boolean)
//   if (words.length === 0) return companies.value

//   return companies.value.filter((company) => {
//     const services = company.services ?? []
//     const text = [
//       company.name,
//       ...services.map((category) => category.category),
//       ...services.flatMap((category) => category.details.map((detail) => detail.service)),
//     ].join(' ').toLowerCase()
//     return words.every((word) => text.includes(word))
//   })
// })

function filterCompaniesByRouteQuery() {
  const words = searchQuery.value.toLowerCase().split(/\s+/).filter(Boolean)
  searchStr.value = words
  JSON.parse(JSON.stringify(companies.value));
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
}

function filterCompanies() {
  let key = searchStr.value.trim().toLowerCase();
filteredCompanies.value = companies.value.filter(company => {
  return (
    company.name.toLowerCase().includes(key) ||
    company.services.some(service =>
      service.category.toLowerCase().includes(key)
    )
  );
});

  console.log(filteredCompanies.value)
}

function resetListings() {
  filteredCompanies.value = JSON.parse(JSON.stringify(companies.value));
  searchStr.value = '';
}

</script>

<template>
  <!-- <Carousel /> -->
   <h1 class="mb-4">SG Handyman Booking</h1>

   <!-- <div v-if="searchQuery" class="d-flex flex-wrap align-items-center gap-2 mb-3"> -->
  <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
    <span class="fw-bold">
     {{ filteredCompanies.length }} {{ filteredCompanies.length === 1 ? 'company' : 'companies' }} found
    </span>
    <!-- <RouterLink to="/companies" class="btn btn-light btn-sm">Clear search</RouterLink> -->
    <button class="btn btn-light btn-sm" @click="resetListings">Reset listings</button>
   </div>

   <form class="form-inline my-2 my-lg-0">
    <input v-model="searchStr" @input="filterCompanies"
      class="form-control mr-sm-2"
      type="search"
      placeholder="Search"
      aria-label="Search"
    />
    <!-- <button class="btn btn-outline-success my-2 my-sm-0" type="submit">Search</button> -->
  </form>
  <br><br>

   <div v-if="searchQuery && filteredCompanies.length === 0 && companies.length > 0" class="pixel-card d-flex flex-wrap align-items-center gap-4 p-4">
    <PixelMascot :size="88" />
    <div>
     <h2 class="h4">No companies match that</h2>
     <p class="mb-0 text-body-secondary">Try another word, or clear the search to see every company.</p>
    </div>
   </div>

   <!-- App.vue already wraps the page in .container, so the row sits directly inside it -->
   <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4">
    <div v-for="company in filteredCompanies" :key="company._id" class="col">
     <CompanyCard :companyId="company._id" :name=company.name :description=company.description :services="company.services"
      :rating="summaryByCompany.get(company._id)?.average" :reviewCount="summaryByCompany.get(company._id)?.count" />
    </div>
   </div>

</template>
