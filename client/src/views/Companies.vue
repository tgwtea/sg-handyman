<script setup>
defineOptions({ name: 'CompaniesView' })
import api from '@/api'
import { ref, computed, watch, onMounted } from 'vue';
import CompanyCard from '@/components/CompanyCard.vue';
import PixelMascot from '@/components/PixelMascot.vue';
import SkeletonCard from '@/components/SkeletonCard.vue';
import { useRoute, useRouter } from 'vue-router'
import { searchTerms, searchScore } from '@/utils/companySearch.js';

const route = useRoute()
const router = useRouter()



const SORT_OPTIONS = ['default', 'earliest-slot', 'highest-rating', 'latest-review', 'name-asc', 'name-desc'];
const PUB_OPTIONS = ['all', 'true', 'false'];
// the route this page lives on; watchers ignore route changes after the user leaves
const ownPath = route.path;

const companies = ref([]);
const status = ref('loading'); // 'loading' | 'error' | 'ready' (covers GET /companies only)
const searchStr = ref('');
const selectedCategories = ref([]);
const pubLicenseFilter = ref('all'); // 'all' | 'true' | 'false'
const sortBy = ref('default'); // one of SORT_OPTIONS
const reviewSummaries = ref([]);
const nextFreeTimeslots = ref([]);

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

const summaryByCompany = computed(() => new Map(reviewSummaries.value.map((summary) => [summary.companyId, summary])));

const nextFreeByCompany = computed(() => {
  const map = new Map();
  for (const slot of nextFreeTimeslots.value) {
    if (slot.companyId && slot.start) {
      map.set(slot.companyId, new Date(slot.start).getTime());
    }
  }
  return map;
});

// Vue re-runs this whenever a filter ref, the companies, or the review/slot data changes
const filteredCompanies = computed(() => {
  const terms = searchTerms(searchStr.value);
  const scores = new Map();
  const selected = selectedCategories.value;

  // 1. Filter
  const result = companies.value.filter((company) => {
    const services = company.services ?? [];

    // Filter by search text: any useful word of the problem matches (see utils/companySearch.js)
    let matchesSearch = true;
    if (terms.length > 0) {
      const score = searchScore(company, terms);
      scores.set(company._id, score);
      matchesSearch = score > 0;
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

  // 2. Sort (default order with a search: the best match first)
  if (sortBy.value === 'default' && terms.length > 0) {
    result.sort((a, b) => (scores.get(b._id) ?? 0) - (scores.get(a._id) ?? 0));
  } else if (sortBy.value === 'earliest-slot') {
    result.sort((a, b) => {
      const timeA = nextFreeByCompany.value.get(a._id) ?? Infinity;
      const timeB = nextFreeByCompany.value.get(b._id) ?? Infinity;
      if (timeA !== timeB) return timeA - timeB;
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  } else if (sortBy.value === 'highest-rating') {
    result.sort((a, b) => {
      const ratingA = summaryByCompany.value.get(a._id)?.average ?? 0;
      const ratingB = summaryByCompany.value.get(b._id)?.average ?? 0;
      if (ratingB !== ratingA) return ratingB - ratingA;
      const countA = summaryByCompany.value.get(a._id)?.count ?? 0;
      const countB = summaryByCompany.value.get(b._id)?.count ?? 0;
      if (countB !== countA) return countB - countA;
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  } else if (sortBy.value === 'latest-review') {
    result.sort((a, b) => {
      const reviewA = summaryByCompany.value.get(a._id)?.latestReview;
      const reviewB = summaryByCompany.value.get(b._id)?.latestReview;
      const timeA = reviewA ? new Date(reviewA).getTime() : -Infinity;
      const timeB = reviewB ? new Date(reviewB).getTime() : -Infinity;
      if (timeB !== timeA) return timeB - timeA;
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  } else if (sortBy.value === 'name-asc') {
    result.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  } else if (sortBy.value === 'name-desc') {
    result.sort((a, b) => (b.name ?? '').localeCompare(a.name ?? ''));
  }

  return result;
});

// --- URL sync: the refs are the source of truth, the query string mirrors them ---

// the query the refs describe; a key is left out when its filter is at the default
const filterQuery = computed(() => {
  const query = {};
  const q = searchStr.value.trim();
  if (q) query.q = q;
  if (selectedCategories.value.length > 0) query.cat = selectedCategories.value.join(',');
  if (pubLicenseFilter.value !== 'all') query.pub = pubLicenseFilter.value;
  if (sortBy.value !== 'default') query.sort = sortBy.value;
  return query;
});

function sameQuery(a, b) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  return keysA.length === keysB.length && keysA.every((key) => String(a[key]) === String(b[key]));
}

// refs -> URL: write only when the URL does not already say the same thing
watch(filterQuery, (query) => {
  if (route.path !== ownPath || sameQuery(query, route.query)) return;
  router.replace({ query });
});

// URL -> refs (first load, Home search, Back/Forward): set a ref only when its value differs
watch(
  () => route.query,
  (query) => {
    if (route.path !== ownPath) return;

    const q = String(query.q ?? '').trim();
    // compare trimmed, so a trailing space the user is typing survives
    if (q !== searchStr.value.trim()) searchStr.value = q;

    const categories = String(query.cat ?? '').split(',').filter(Boolean);
    if (categories.join(',') !== selectedCategories.value.join(',')) selectedCategories.value = categories;

    const pub = PUB_OPTIONS.includes(query.pub) ? query.pub : 'all';
    if (pub !== pubLicenseFilter.value) pubLicenseFilter.value = pub;

    const sort = SORT_OPTIONS.includes(query.sort) ? query.sort : 'default';
    if (sort !== sortBy.value) sortBy.value = sort;
  },
  { immediate: true }
);

async function getCompanies() {
  status.value = 'loading';
  try {
    const response = await api.get(`/companies`);
    companies.value = response.data;
    status.value = 'ready';
  } catch {
    companies.value = [];
    status.value = 'error';
  }
}

// the cards still show without ratings if this fails
async function getReviewSummaries() {
  try {
    const response = await api.get(`/reviews/summary`);
    reviewSummaries.value = response.data;
  } catch {
    // ratings stay hidden
  }
}

// fetch each company's earliest upcoming free timeslot
async function getNextFreeTimeslots() {
  try {
    const response = await api.get(`/timeslots/next-free`);
    nextFreeTimeslots.value = response.data;
  } catch {
    // "next free" stays hidden
  }
}

onMounted(() => {
  getCompanies();
  getReviewSummaries();
  getNextFreeTimeslots();
})

function resetListings() {
  searchStr.value = '';
  selectedCategories.value = [];
  pubLicenseFilter.value = 'all';
  sortBy.value = 'default';
}

function selectAllCategories() {
  selectedCategories.value = [...availableCategories.value];
}

function clearCategories() {
  selectedCategories.value = [];
}

function removeCategory(cat) {
  selectedCategories.value = selectedCategories.value.filter((c) => c !== cat);
}

</script>

<template>
  <h1 class="mb-4">SG Handyman Booking</h1>

  <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
    <div class="d-flex flex-wrap align-items-center gap-2">
      <span v-if="status === 'ready'" class="fw-bold">
        {{ filteredCompanies.length }} {{ filteredCompanies.length === 1 ? 'company' : 'companies' }} found
      </span>
      <button class="btn btn-light btn-sm" @click="resetListings">Reset listings</button>
    </div>

    <!-- Sort by feature -->
    <div class="d-flex align-items-center gap-2 ms-sm-auto">
      <label for="sortCompanies" class="form-label mb-0 fw-bold text-nowrap">Sort by:</label>
      <select
        id="sortCompanies"
        class="form-select form-select-sm"
        style="min-width: 210px; width: auto;"
        v-model="sortBy"
        aria-label="Sort companies"
      >
        <option value="default">Default</option>
        <option value="earliest-slot">Earliest free timeslot</option>
        <option value="highest-rating">Highest rating</option>
        <option value="latest-review">Latest user review</option>
        <option value="name-asc">Ascending (alphabetical)</option>
        <option value="name-desc">Descending (alphabetical)</option>
      </select>
    </div>
  </div>

  <!-- Filters: Search Input, PUB License Toggle & Category Multiselect Checkboxes -->
  <div class="row g-3 mb-4">
    <div class="col-md-6">
      <label for="companySearch" class="form-label fw-bold">Search</label>
      <input
        id="companySearch"
        v-model="searchStr"
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

  <div v-if="status === 'error'" class="alert alert-warning d-flex flex-wrap align-items-center gap-3" role="alert">
    <span>Could not load companies.</span>
    <button type="button" class="btn btn-sm btn-outline-dark" @click="getCompanies">Retry</button>
  </div>

  <div v-if="status === 'ready' && filteredCompanies.length === 0 && companies.length > 0" class="pixel-card d-flex flex-wrap align-items-center gap-4 p-4 mb-4">
    <PixelMascot :size="88" />
    <div>
      <h2 class="h4">No companies match that</h2>
      <p class="mb-2 text-body-secondary">Try another search or clear the filters to see companies.</p>
      <button type="button" class="btn btn-light btn-sm" @click="resetListings">Reset listings</button>
    </div>
  </div>

  <!-- App.vue already wraps the page in .container, so the row sits directly inside it -->
  <div v-if="status === 'loading'" class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4" aria-busy="true" aria-label="Loading companies">
    <div v-for="n in 6" :key="n" class="col">
      <SkeletonCard />
    </div>
  </div>

  <TransitionGroup v-else tag="div" name="fade" class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4">
    <div v-for="company in filteredCompanies" :key="company._id" class="col">
      <CompanyCard :companyId="company._id" :name="company.name" :description="company.description" :services="company.services"
        :rating="summaryByCompany.get(company._id)?.average" :reviewCount="summaryByCompany.get(company._id)?.count"
        :isPubLicensed="company.isPubLicensed" />
    </div>
  </TransitionGroup>

</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active {
    transition: none;
  }
}
</style>
