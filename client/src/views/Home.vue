<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import PixelMascot from '@/components/PixelMascot.vue'

const router = useRouter()

const query = ref('')
const popularFixes = ['Leaking tap', 'Aircon servicing', 'Power trip', 'Door lock', 'Wall mounting']

const companies = ref([])
const loadFailed = ref(false)

// header colors for the featured cards, in order
const cardColors = ['var(--sky)', 'var(--green)', 'var(--red)', 'var(--coin)']

const featured = computed(() =>
  companies.value.slice(0, 4).map((company, i) => {
    const prices = (company.services ?? []).flatMap((category) =>
      category.details.map((detail) => detail.startingPrice),
    )
    return {
      id: company._id,
      name: company.name,
      initial: company.name.charAt(0),
      category: company.services?.[0]?.category ?? 'Repairs',
      fromPrice: prices.length > 0 ? Math.min(...prices) : null,
      color: cardColors[i % cardColors.length],
    }
  }),
)

async function loadCompanies() {
  try {
    const response = await api.get('/companies')
    companies.value = response.data
  } catch {
    loadFailed.value = true
  }
}

function search() {
  const q = query.value.trim()
  router.push({ path: '/companies', query: q ? { q } : {} })
}

function pickFix(fix) {
  query.value = fix
}

onMounted(loadCompanies)
</script>

<template>
  <div class="home">
    <!-- hero -->
    <section class="hero">
      <div class="container hero-inner">
        <div class="row align-items-center g-5">
          <div class="col-lg-7">
            <span class="hero-tag">PRESS START TO FIX</span>
            <h1 class="hero-title">Something broken? Book a fix in 3 moves.</h1>
            <p class="hero-lead">
              Find a repair company near you, pick a free timeslot, and you are done. Or grab the
              tools and fix it yourself.
            </p>

            <form class="d-flex flex-wrap gap-3 mb-3" role="search" @submit.prevent="search">
              <label for="home-search" class="visually-hidden">What needs fixing?</label>
              <input
                id="home-search"
                v-model="query"
                type="search"
                class="form-control hero-input"
                placeholder="What needs fixing? e.g. leaking tap"
              />
              <button type="submit" class="btn btn-primary btn-lg px-4">Search</button>
            </form>

            <div class="d-flex flex-wrap align-items-center gap-2" role="group" aria-label="Popular fixes">
              <span class="fw-bold">Popular:</span>
              <button
                v-for="fix in popularFixes"
                :key="fix"
                type="button"
                :class="['chip', { 'chip-on': query === fix }]"
                :aria-pressed="query === fix"
                @click="pickFix(fix)"
              >
                {{ fix }}
              </button>
            </div>
          </div>

          <div class="col-lg-5 d-flex flex-column align-items-center">
            <div class="float">
              <PixelMascot :size="200" />
            </div>
            <div class="question-block" aria-hidden="true">?</div>
          </div>
        </div>
      </div>
      <div class="brick-strip" aria-hidden="true"></div>
    </section>

    <!-- how it works -->
    <section class="container py-5">
      <p class="eyebrow mb-1">How it works</p>
      <h2 class="section-title mb-4">Three moves to a fixed home</h2>
      <div class="row g-4">
        <div class="col-md-4">
          <div class="pixel-card bounce-hover h-100 p-4">
            <span class="step-num" style="background: var(--sky)">1</span>
            <h3 class="h4 mt-3">Pick a company</h3>
            <p class="text-body-secondary mb-0">
              Compare plumbers, electricians and aircon services by what they fix and their
              starting price.
            </p>
          </div>
        </div>
        <div class="col-md-4">
          <div class="pixel-card bounce-hover h-100 p-4">
            <span class="step-num" style="background: var(--coin)">2</span>
            <h3 class="h4 mt-3">Grab a timeslot</h3>
            <p class="text-body-secondary mb-0">
              Green slots are free. The grid updates live, so you never book a slot someone else
              just took.
            </p>
          </div>
        </div>
        <div class="col-md-4">
          <div class="pixel-card bounce-hover h-100 p-4">
            <span class="step-num" style="background: var(--green)">3</span>
            <h3 class="h4 mt-3">Level cleared</h3>
            <p class="text-body-secondary mb-0">
              Your booking shows on the company page. Change your mind? Cancel it in one click.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- featured companies -->
    <section class="container pb-5">
      <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
        <div>
          <p class="eyebrow mb-1">Featured</p>
          <h2 class="section-title mb-0">Companies ready to help</h2>
        </div>
        <RouterLink to="/companies" class="see-all">See all companies →</RouterLink>
      </div>

      <p v-if="loadFailed" class="alert alert-warning">Could not load companies right now.</p>

      <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-4">
        <div v-for="company in featured" :key="company.id" class="col">
          <RouterLink :to="`/companies/${company.id}`" class="company-card pixel-card bounce-hover h-100">
            <div class="company-head" :style="{ background: company.color }">
              <span class="company-initial">{{ company.initial }}</span>
              <span class="company-category">{{ company.category }}</span>
            </div>
            <div class="p-3 d-flex flex-column gap-2">
              <h3 class="h5 mb-0">{{ company.name }}</h3>
              <span v-if="company.fromPrice !== null" class="coin-badge align-self-start">
                from ${{ company.fromPrice }}
              </span>
            </div>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- shop and forum -->
    <section class="container pb-5">
      <div class="row g-4">
        <div class="col-md-6">
          <div class="promo pixel-card h-100 p-4" style="background: var(--green)">
            <p class="promo-tag">POWER-UP</p>
            <h2 class="section-title">Fix it yourself</h2>
            <p>Buy common repair tools straight from the companies that use them every day.</p>
            <RouterLink to="/shop" class="btn btn-light">Visit the shop</RouterLink>
          </div>
        </div>
        <div class="col-md-6">
          <div class="promo pixel-card h-100 p-4" style="background: var(--coin)">
            <p class="promo-tag">CO-OP MODE</p>
            <h2 class="section-title">Ask the DIY forum</h2>
            <p>Share a fix, ask a question, and learn from neighbours who solved the same problem.</p>
            <RouterLink to="/forum" class="btn btn-light">Open the forum</RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  background: var(--sky);
  border-bottom: 4px solid var(--ink);
}

.hero-inner {
  padding-top: 4rem;
  padding-bottom: 3rem;
}

.hero-tag {
  display: inline-block;
  padding: 0.3rem 0.75rem;
  margin-bottom: 1.25rem;
  background: var(--white);
  border: var(--line);
  border-radius: var(--radius);
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: 2px;
}

.hero-title {
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  line-height: 1;
  color: var(--white);
  text-shadow: 4px 4px 0 var(--ink);
  margin-bottom: 1.25rem;
}

.hero-lead {
  font-size: 1.2rem;
  max-width: 35rem;
  margin-bottom: 1.5rem;
}

.hero-input {
  flex: 1 1 280px;
  min-height: 56px;
  font-size: 1.05rem;
  box-shadow: var(--shadow);
}

.chip {
  min-height: 44px;
  padding: 0 0.9rem;
  background: var(--white);
  border: var(--line);
  border-radius: 999px;
  box-shadow: var(--shadow-sm);
  font-weight: 800;
  color: var(--ink);
  transition: transform 0.12s ease;
}

.chip:hover {
  transform: translateY(-2px);
}

.chip-on {
  background: var(--coin);
}

/* the mascot bobs above a "?" block */
.float {
  animation: float 2.4s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.question-block {
  width: 96px;
  height: 96px;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--coin);
  border: 4px solid var(--ink);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
  font-family: var(--font-display);
  font-size: 3.5rem;
  font-weight: 700;
}

.section-title {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
}

.step-num {
  width: 56px;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: var(--line);
  border-radius: var(--radius);
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
}

.see-all {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--ink);
}

.company-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--ink);
  text-decoration: none;
}

.company-head {
  height: 96px;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  border-bottom: var(--line);
}

.company-initial {
  width: 52px;
  height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--coin);
  border: var(--line);
  border-radius: var(--radius);
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 700;
}

.company-category {
  padding: 0.15rem 0.6rem;
  background: var(--white);
  border: 2px solid var(--ink);
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: capitalize;
}

.promo-tag {
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 3px;
  margin-bottom: 0.5rem;
}
</style>
