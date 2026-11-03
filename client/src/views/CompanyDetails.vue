<script setup>
// import Carousel from '@/components/Carousel.vue';
import api from '@/api'
import { ref, reactive, computed, nextTick } from 'vue';
import { onMounted } from 'vue'
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
// console.log(route.params.companyId)



let company = ref({});

const serviceNames = computed(() =>
  (company.value.services ?? []).flatMap((category) => category.details.map((detail) => detail.service))
);

async function getCompanyById() {
  try {
    // console.log(route.params.companyId)
    let companyId = route.params.companyId;
    const response = await api.get(`/companies/${companyId}`);
    console.log(response.data);

    company.value = response.data;
  } catch (error) {
    console.log(error.message);
    company.value = error.message;
  }
}

// the page would otherwise open at the companies list's scroll position, then slide to the hash
// scroll to the hash only after the data loads, because the service tables push the timeslots down
onMounted(async () => {
  window.scrollTo({ top: 0, behavior: 'instant' });
  await getCompanyById();
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
  <div class="company-layout row g-4">
    <aside class="col-lg-3 company-nav-column">
      <CompanySideNav :sections="sections" />
    </aside>

    <div class="col-lg-9">
      <section id="details" class="company-section">
        <header class="pixel-card p-4 mb-4">
          <h2>{{ company.name }}</h2>
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
          <a :href="company.website">{{ company.website }}</a>
        </header>

        <div v-for="category in company.services" :key="category._id || category.category">
          <h3 class="text-center">{{ category.category }}</h3>
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
          <!-- <hr> -->
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
      <p v-if="company.website"><a :href="company.website">{{ company.website }}</a></p>

      <!-- OneMap - amanda -->
      <OneMap ref="oneMap" v-if="company.address" :address="company.address"/>
      <!-- <div :address="address">test</div> -->
      <!-- <div :address="company.address">test</div> -->
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

  <div>
    <!-- Access route params directly in the template without useRoute -->
    <!-- <p>User ID: {{ $route.params.companyId }}</p> -->
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
