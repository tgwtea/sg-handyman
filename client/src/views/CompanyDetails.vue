<script setup>
import api, { errorMessage } from '@/api'
import { ref, reactive, computed, nextTick, onMounted } from 'vue';
import TimeslotGrid from '@/components/TimeslotGrid.vue';
import TimeslotManager from '@/components/TimeslotManager.vue';
import ReviewSection from '@/components/ReviewSection.vue';
import CompanySideNav from '@/components/CompanySideNav.vue';
import { useAuthStore } from '@/stores/auth';
import { useRoute } from 'vue-router'

// OneMap - amanda
import { useTemplateRef } from 'vue'
import OneMap from '../components/OneMap.vue';
const oneMapRef = useTemplateRef('oneMap')

// for getting companyId via route params
const route = useRoute()
const auth = useAuthStore()

const companyId = route.params.companyId;

const sections = [
  { id: 'details', label: 'Details & Pricing' },
  { id: 'book-a-slot', label: 'Book a Slot' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'contact', label: 'Contact' },
];
const company = ref({});
// 'loading' | 'ready' | 'not-found' | 'error'
const status = ref('loading');
const loadError = ref('');

// only http(s) links: a stored "javascript:" URL must never run on click
const safeWebsite = computed(() => (/^https?:\/\//i.test(company.value.website ?? '') ? company.value.website : ''));

const serviceNames = computed(() =>
  (company.value.services ?? []).flatMap((category) => category.details.map((detail) => detail.service))
);

async function getCompanyById() {
  status.value = 'loading';
  try {
    const response = await api.get(`/companies/${companyId}`);
    company.value = response.data;
    status.value = 'ready';
  } catch (error) {
    const code = error.response?.status;
    status.value = code === 404 || code === 400 ? 'not-found' : 'error';
    loadError.value = errorMessage(error);
  }
}

// the page would otherwise open at the companies list's scroll position, then slide to the hash
// scroll to the hash only after the data loads, because the service tables push the timeslots down
onMounted(async () => {
  window.scrollTo({ top: 0, behavior: 'instant' });
  await getCompanyById();
  if (status.value !== 'ready') return;
  await nextTick();
  if (route.hash) {
    await nextTick();
    document.getElementById(route.hash.slice(1))?.scrollIntoView({ behavior: 'instant' });
  }

  // OneMap - amanda
  oneMapRef.value?.initialiseOneMap();
  oneMapRef.value?.pinPostalCode();
})

// demo contact form, not sent to the server
// the browser blocks submit until every field passes its built-in validation
const contactForm = reactive({ name: '', email: '', phone: '', message: '' });
const contactSent = ref(false);
const reviewSection = useTemplateRef('reviewSection');

function submitContact() {
  contactSent.value = true;
}

function resetContact() {
  Object.assign(contactForm, { name: '', email: '', phone: '', message: '' });
  contactSent.value = false;
}

</script>

<template>
  <div v-if="status === 'loading'" class="text-center py-5" role="status">
    <div class="spinner-border" aria-hidden="true"></div>
    <p class="mt-2">Loading company…</p>
  </div>

  <div v-else-if="status === 'not-found'" class="text-center py-5">
    <h1 class="mb-3">Company not found</h1>
    <p class="text-muted mb-4">This company does not exist or was removed.</p>
    <RouterLink class="btn btn-primary" to="/companies">Browse companies</RouterLink>
  </div>

  <div v-else-if="status === 'error'" class="alert alert-danger d-flex flex-wrap align-items-center gap-2" role="alert">
    <span>Could not load this company: {{ loadError }}</span>
    <button type="button" class="btn btn-outline-danger btn-sm" @click="getCompanyById">Retry</button>
  </div>

  <div v-else class="company-layout row g-4">
    <aside class="col-lg-3 company-nav-column">
      <CompanySideNav :sections="sections" />
    </aside>

    <div class="col-lg-9">
      <section id="details" class="company-section">
        <header class="pixel-card p-4 mb-4">
          <h1 class="h2">{{ company.name }}</h1>
          <div class="d-flex flex-wrap gap-1 mb-3">
            <span v-for="category in company.services" :key="category._id || category.category" class="badge rounded-pill text-bg-light border">
              {{ category.category }}
            </span>
          </div>
          <span v-if="company.isPubLicensed" class="badge rounded-pill text-bg-danger border">PUB Licensed</span>
          <span v-else class="badge rounded-pill text-bg-dark border">Not PUB Licensed</span>
          <br><br>
          <p class="mb-2">{{ company.description }}</p>
          <p class="mb-2">{{ company.address }}</p>
          <a v-if="safeWebsite" :href="safeWebsite" target="_blank" rel="noopener">{{ company.website }}</a>
        </header>

        <div v-for="category in company.services" :key="category._id || category.category">
          <h3 class="text-center">{{ category.category }}</h3>
          <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th class="col-5 text-end">Service</th>
                <th class="col-5 text-start">Starting Price</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="service in category.details" :key="service._id || service.service">
                <td class="col-5 text-end">{{ service.service }}</td>
                <td class="col-5 text-start">${{ service.startingPrice }}</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </section>

    <div id="book-a-slot" class="company-section">
      <TimeslotGrid :companyId="companyId" :services="serviceNames" @bookings-changed="reviewSection?.loadReviews()" />
      <TimeslotManager v-if="auth.canManage(companyId)" :companyId="companyId" />
    </div>
    <ReviewSection ref="reviewSection" class="company-section" :companyId="companyId" />

    <section id="contact" class="company-section mt-5">
      <h3>Contact</h3>
      <p class="mb-1" v-if="company.address">{{ company.address }}</p>
      <p v-if="safeWebsite"><a :href="safeWebsite" target="_blank" rel="noopener">{{ company.website }}</a></p>

      <!-- OneMap - amanda -->
      <OneMap ref="oneMap" v-if="company.address" :address="company.address" :location="company.location"/>
      <br><br>

      <div v-if="contactSent" class="alert alert-success" role="status">
        <p>Thanks, {{ contactForm.name }}. {{ company.name }} will contact you at {{ contactForm.email }}.</p>
        <button type="button" class="btn btn-outline-success btn-sm" @click="resetContact">Send another</button>
      </div>

      <form v-else @submit.prevent="submitContact" style="max-width: 32rem">
        <div class="mb-3">
          <label for="contact-name" class="form-label">Name</label>
          <input id="contact-name" v-model.trim="contactForm.name" type="text" class="form-control" required autocomplete="name">
        </div>
        <div class="mb-3">
          <label for="contact-email" class="form-label">Email</label>
          <input id="contact-email" v-model.trim="contactForm.email" type="email" class="form-control" required autocomplete="email">
        </div>
        <div class="mb-3">
          <label for="contact-phone" class="form-label">Phone</label>
          <input id="contact-phone" v-model.trim="contactForm.phone" type="tel" class="form-control" required
            pattern="[689][0-9]{7}" title="8-digit Singapore number that starts with 6, 8 or 9" autocomplete="tel">
        </div>
        <div class="mb-3">
          <label for="contact-message" class="form-label">Message</label>
          <textarea id="contact-message" v-model.trim="contactForm.message" class="form-control" rows="4" required></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Send</button>
      </form>
    </section>
    </div>
  </div>

</template>

<style scoped>
/* sticks inside the row, so it stays on screen for the whole page */
.company-nav-column {
  position: sticky;
  top: 0;
  z-index: 1010; /* above the map's controls, below the delete dialog */
  align-self: flex-start;
}

/* keeps the sticky bar from covering a section's heading after a jump */
.company-section {
  scroll-margin-top: 5.5rem;
}

@media (min-width: 992px) {
  /* widens the row to the left, into the page margin, but never past the window's edge */
  .company-layout {
    margin-left: max(-3.75rem, calc((100% - 100vw) / 2));
  }

  .company-nav-column {
    top: 1.5rem;
  }

  .company-section {
    scroll-margin-top: 1.5rem;
  }
}
</style>
