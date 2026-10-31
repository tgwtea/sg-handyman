<script setup>
// import Carousel from '@/components/Carousel.vue';
import axios from 'axios'
import { ref, computed, watch, onMounted } from 'vue';
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
const selectedCategories = ref([]);
const pubLicenseFilter = ref('all'); // 'all' | 'true' | 'false'
const reviewSummaries = ref([]);

// dynamically extract unique service categories from the actual MongoDB data
const availableCategories = computed(() => {
  const categorySet = new Set();
  for (const company of companies.value) {
    if (Array.isArray(company.services)) {
      for (const service of company.services) {
        if (service?.category) {
          categorySet.add(service.category);
        }
      }
    }
  }
  return Array.from(categorySet).sort();
});

function filterCompanies() {
  const query = (typeof searchStr.value === 'string' ? searchStr.value : String(searchStr.value ?? '')).trim().toLowerCase();
  const words = query.split(/\s+/).filter(Boolean);
  const selected = selectedCategories.value;

  filteredCompanies.value = companies.value.filter((company) => {
    const services = company.services ?? [];

    // Filter by search text (company name, category names, or service details)
    let matchesSearch = true;
    if (words.length > 0) {
      const text = [
        company.name ?? '',
        ...services.map((cat) => cat.category ?? ''),
        ...services.flatMap((cat) => (cat.details ?? []).map((detail) => detail.service ?? '')),
      ].join(' ').toLowerCase();

      matchesSearch = words.every((word) => text.includes(word));
    }

    // Filter by multiselected service categories (if none selected, all match)
    let matchesCategory = true;
    if (selected.length > 0) {
      matchesCategory = services.some((service) => selected.includes(service.category));
    }

    // Filter by isPubLicensed (1: true, 2: false, 3: all)
    let matchesPubLicensed = true;
    if (pubLicenseFilter.value === 'true') {
      matchesPubLicensed = Boolean(company.isPubLicensed);
    } else if (pubLicenseFilter.value === 'false') {
      matchesPubLicensed = company.isPubLicensed === false || !company.isPubLicensed;
    }

    return matchesSearch && matchesCategory && matchesPubLicensed;
  });
}

async function getCompanies() {
  try {
    const response = await axios.get(`${serverUrl}/companies`);
    console.log(response.data);

    companies.value = response.data;
    if (route.query.q) {
      searchStr.value = String(route.query.q).trim();
    }
    filterCompanies();
  } catch (error) {
    console.log(error.message);
    companies.value = [];
    filteredCompanies.value = [];
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

watch(
  () => route.query.q,
  (newQ) => {
    searchStr.value = String(newQ ?? '').trim();
    filterCompanies();
  }
);

const summaryByCompany = computed(() => new Map(reviewSummaries.value.map((summary) => [summary.companyId, summary])))

function resetListings() {
  searchStr.value = '';
  selectedCategories.value = [];
  pubLicenseFilter.value = 'all';
  filterCompanies();
}

function selectAllCategories() {
  selectedCategories.value = [...availableCategories.value];
  filterCompanies();
}

function clearCategories() {
  selectedCategories.value = [];
  filterCompanies();
}

function removeCategory(cat) {
  selectedCategories.value = selectedCategories.value.filter((c) => c !== cat);
  filterCompanies();
}

</script>

<template>
  <!-- <Carousel /> -->
  <h1 class="mb-4">SG Handyman Booking</h1>

  <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
    <span class="fw-bold">
      {{ filteredCompanies.length }} {{ filteredCompanies.length === 1 ? 'company' : 'companies' }} found
    </span>
    <button class="btn btn-light btn-sm" @click="resetListings">Reset listings</button>
  </div>

  <!-- Filters: Search Input, PUB License Toggle & Category Multiselect Checkboxes -->
  <div class="row g-3 mb-4">
    <div class="col-md-6">
      <label for="companySearch" class="form-label fw-bold">Search</label>
      <input
        id="companySearch"
        v-model="searchStr"
        @input="filterCompanies"
        class="form-control"
        type="search"
        placeholder="Search by company or service..."
        aria-label="Search"
      />

      <div class="mt-3 p-3 bg-white border rounded">
        <label class="form-label fw-bold mb-2 d-block">Filter by PUB License</label>
        <div class="btn-group w-100" role="group" aria-label="Filter by PUB License">
          <input
            type="radio"
            class="btn-check"
            name="pubLicenseFilter"
            id="pubFilterAll"
            value="all"
            v-model="pubLicenseFilter"
            @change="filterCompanies"
            autocomplete="off"
          />
          <label class="btn btn-outline-secondary" for="pubFilterAll">All</label>

          <input
            type="radio"
            class="btn-check"
            name="pubLicenseFilter"
            id="pubFilterLicensed"
            value="true"
            v-model="pubLicenseFilter"
            @change="filterCompanies"
            autocomplete="off"
          />
          <label class="btn btn-outline-danger" for="pubFilterLicensed">PUB Licensed</label>

          <input
            type="radio"
            class="btn-check"
            name="pubLicenseFilter"
            id="pubFilterUnlicensed"
            value="false"
            v-model="pubLicenseFilter"
            @change="filterCompanies"
            autocomplete="off"
          />
          <label class="btn btn-outline-dark" for="pubFilterUnlicensed">Not Licensed</label>
        </div>
      </div>
    </div>

    <div class="col-md-6">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <label class="form-label fw-bold mb-0">Filter by Service Category</label>
        <div class="small">
          <button
            type="button"
            class="btn btn-link btn-sm p-0 text-decoration-none me-2"
            @click="selectAllCategories"
          >
            Select all
          </button>
          <button
            v-if="selectedCategories.length > 0"
            type="button"
            class="btn btn-link btn-sm p-0 text-decoration-none"
            @click="clearCategories"
          >
            Clear ({{ selectedCategories.length }})
          </button>
        </div>
      </div>

      <!-- Scrollable checkbox list with Bootstrap form-check elements -->
      <div class="border rounded p-3 bg-white" style="max-height: 180px; overflow-y: auto;">
        <div
          v-for="category in availableCategories"
          :key="category"
          class="form-check mb-1"
        >
          <input
            class="form-check-input"
            type="checkbox"
            :id="`category-${category.toLowerCase().replace(/[^a-z0-9]/g, '-')}`"
            :value="category"
            v-model="selectedCategories"
            @change="filterCompanies"
          />
          <label
            class="form-check-label w-100"
            style="cursor: pointer;"
            :for="`category-${category.toLowerCase().replace(/[^a-z0-9]/g, '-')}`"
          >
            {{ category }}
          </label>
        </div>
      </div>

      <div v-if="selectedCategories.length > 0" class="mt-2 d-flex flex-wrap gap-1 align-items-center">
        <span class="small text-muted me-1">Selected:</span>
        <span
          v-for="cat in selectedCategories"
          :key="cat"
          class="badge bg-primary d-inline-flex align-items-center gap-1"
        >
          {{ cat }}
          <button
            type="button"
            class="btn-close btn-close-white"
            style="font-size: 0.55rem;"
            :aria-label="`Remove ${cat}`"
            @click="removeCategory(cat)"
          ></button>
        </span>
        <button
          type="button"
          class="btn btn-link btn-sm p-0 ms-2 text-decoration-none"
          @click="clearCategories"
        >
          Clear categories
        </button>
      </div>
    </div>
  </div>

  <div v-if="(searchStr || selectedCategories.length > 0 || pubLicenseFilter !== 'all') && filteredCompanies.length === 0 && companies.length > 0" class="pixel-card d-flex flex-wrap align-items-center gap-4 p-4 mb-4">
    <PixelMascot :size="88" />
    <div>
      <h2 class="h4">No companies match that</h2>
      <p class="mb-0 text-body-secondary">Try another search or clear the filters to see companies.</p>
    </div>
  </div>

  <!-- App.vue already wraps the page in .container, so the row sits directly inside it -->
  <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4">
    <div v-for="company in filteredCompanies" :key="company._id" class="col">
      <CompanyCard :companyId="company._id" :name="company.name" :description="company.description" :services="company.services"
        :rating="summaryByCompany.get(company._id)?.average" :reviewCount="summaryByCompany.get(company._id)?.count"
        :isPubLicensed="company.isPubLicensed" />
    </div>
  </div>

</template>
