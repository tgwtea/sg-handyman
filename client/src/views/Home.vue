<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import { formatDay, formatTime } from '@/utils/sgTime'

const router = useRouter()

const query = ref('')

// label: what an urgent user says; q: the search word that matches the seeded services
const urgentProblems = [
  { label: 'Leaking pipe', q: 'leak' },
  { label: 'Choked toilet or drain', q: 'choke' },
  { label: 'Aircon not cold', q: 'aircon' },
  { label: 'Power trip', q: 'power trip' },
  { label: 'Locked out', q: 'lock' },
]

const moveInJobs = [
  { label: 'Aircon installation', q: 'aircon installation' },
  { label: 'Lights and power points', q: 'light' },
  { label: 'Curtains and blinds', q: 'curtain' },
  { label: 'Shelves and TV mounting', q: 'mount' },
  { label: 'Water heater', q: 'heater' },
  { label: 'Digital door lock', q: 'lock' },
]

const companies = ref([])
const nextFree = ref([]) // [{ companyId, start }] from GET /timeslots/next-free
const loadFailed = ref(false)
const loaded = ref(false)
const todayOnly = ref(true)

const todayLabel = formatDay(new Date())
const tomorrowLabel = formatDay(Date.now() + 24 * 60 * 60 * 1000)

// "Today", "Tomorrow", or the date, in Singapore time
function dayName(start) {
  const day = formatDay(start)
  if (day === todayLabel) return 'Today'
  if (day === tomorrowLabel) return 'Tomorrow'
  return day
}

function lowestPrice(company) {
  const prices = (company.services ?? []).flatMap((category) =>
    category.details.map((detail) => detail.startingPrice),
  )
  return prices.length > 0 ? Math.min(...prices) : null
}

// the four companies with the earliest free slot, earliest first
// SAMPLE: the panel says "near you", but there is no location filter yet (OneMap is not wired in)
const availablePros = computed(() => {
  const byId = new Map(companies.value.map((company) => [company._id, company]))
  return nextFree.value
    .filter((slot) => byId.has(slot.companyId))
    .filter((slot) => !todayOnly.value || formatDay(slot.start) === todayLabel)
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, 4)
    .map((slot) => {
      const company = byId.get(slot.companyId)
      return {
        id: company._id,
        name: company.name,
        slot: `${dayName(slot.start)} ${formatTime(slot.start)}`,
        fromPrice: lowestPrice(company),
        // pubLicenceNo is planned (see README "Planned work"); the badge shows once it exists
        pubLicensed: Boolean(company.pubLicenceNo),
      }
    })
})

async function loadHome() {
  try {
    const [companiesResponse, nextFreeResponse] = await Promise.all([
      api.get('/companies'),
      api.get('/timeslots/next-free'),
    ])
    companies.value = companiesResponse.data
    nextFree.value = nextFreeResponse.data
  } catch {
    loadFailed.value = true
  } finally {
    loaded.value = true
  }
}

function searchFor(q) {
  const trimmed = q.trim()
  router.push({ path: '/companies', query: trimmed ? { q: trimmed } : {} })
}

onMounted(loadHome)
</script>

<template>
  <div class="home">
    <!-- hero: describe the problem, or tap a common one -->
    <section class="hero">
      <div class="container hero-inner">
        <div class="row g-5 align-items-start">
          <div class="col-lg-7 d-flex flex-column gap-3">
            <span class="hero-tag align-self-start">
              <span class="live-dot" aria-hidden="true"></span>
              LIVE SLOTS, UPDATED EVERY SECOND
            </span>
            <h1 class="hero-title">What needs fixing at home?</h1>
            <p class="hero-lead">
              Compare handymen and plumbers by earliest free slot and starting price. Book a slot
              here, with no WhatsApp back-and-forth.
            </p>

            <form class="search-box bold-tile p-3 d-flex flex-wrap gap-3" role="search" @submit.prevent="searchFor(query)">
              <label for="home-search" class="visually-hidden">Describe the problem</label>
              <input
                id="home-search"
                v-model="query"
                type="search"
                class="form-control hero-input"
                placeholder="Describe the problem, e.g. kitchen sink leaking"
              />
              <button type="submit" class="btn btn-accent btn-lg px-4">Search</button>
            </form>

            <div class="d-flex flex-column gap-2">
              <span id="urgent-label" class="urgent-label">COMMON URGENT PROBLEMS</span>
              <div class="d-flex flex-wrap gap-2" role="group" aria-labelledby="urgent-label">
                <button
                  v-for="problem in urgentProblems"
                  :key="problem.label"
                  type="button"
                  class="chip"
                  @click="searchFor(problem.q)"
                >
                  {{ problem.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- the companies with the earliest free slots -->
          <div class="col-lg-5">
            <aside class="surface-card overflow-hidden" aria-labelledby="free-title">
              <div class="panel-head">
                <h2 id="free-title" class="h4 mb-0">
                  {{ todayOnly ? 'Free today near you' : 'Earliest free slots near you' }}
                </h2>
                <button
                  type="button"
                  :class="['today-toggle', { 'today-on': todayOnly }]"
                  :aria-pressed="todayOnly"
                  @click="todayOnly = !todayOnly"
                >
                  Today only
                </button>
              </div>

              <div class="px-3 pb-3">
                <!-- SAMPLE: "near you" is not real yet. The slots are real, but the list is not
                     sorted by distance, because location (OneMap) is not wired in. -->
                <p class="sample-note mt-3 mb-0">
                  Sample: "near you" is not wired in yet. These are the earliest free slots across
                  Singapore, not sorted by distance.
                </p>
                <p v-if="loadFailed" class="alert alert-warning mt-3 mb-0">Could not load free slots right now.</p>
                <p v-else-if="loaded && availablePros.length === 0" class="text-body-secondary fw-semibold mt-3 mb-0">
                  {{ todayOnly ? 'No free slots left today. Turn off "Today only" to see the next ones.' : 'No free slots right now.' }}
                </p>

                <RouterLink
                  v-for="pro in availablePros"
                  :key="pro.id"
                  :to="{ path: `/companies/${pro.id}`, hash: '#book-a-slot' }"
                  class="pro-row"
                >
                  <span class="d-flex justify-content-between align-items-center gap-2">
                    <span class="fw-bold">{{ pro.name }}</span>
                    <span class="pro-slot">{{ pro.slot }}</span>
                  </span>
                  <span class="d-flex flex-wrap gap-2">
                    <span v-if="pro.fromPrice !== null" class="pill-badge">from ${{ pro.fromPrice }}</span>
                    <span v-if="pro.pubLicensed" class="pub-badge">PUB Licensed</span>
                  </span>
                </RouterLink>

                <RouterLink to="/companies" class="btn btn-light w-100 mt-3">See all companies</RouterLink>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>

    <!-- triage: fix it yourself, or book a pro -->
    <section class="container py-5">
      <p class="eyebrow mb-1">Pick your path</p>
      <h2 class="section-title mb-2">Small fix, or call a pro?</h2>
      <p class="text-body-secondary fw-semibold mb-4">
        Some jobs take 10 minutes with the right tool. Others legally need a licensed professional.
      </p>
      <div class="row g-4">
        <div class="col-md-6">
          <div class="surface-card h-100 p-4 d-flex flex-column gap-3">
            <p class="promo-tag mb-0 diy-tag">DIY</p>
            <h3 class="h3 mb-0">Try it yourself</h3>
            <ul class="path-list">
              <li>Replace a tap, mixer or showerhead</li>
              <li>Clear a slow sink with a plunger</li>
              <li>Tighten a loose cabinet hinge</li>
              <li>Reset a tripped circuit breaker once</li>
            </ul>
            <div class="d-flex flex-wrap gap-2 mt-auto">
              <RouterLink to="/forum" class="btn btn-success">Ask the DIY forum</RouterLink>
              <RouterLink to="/shop" class="btn btn-light">Buy the tools</RouterLink>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="surface-card h-100 p-4 d-flex flex-column gap-3 pro-path">
            <p class="promo-tag mb-0 pro-tag">PROFESSIONAL</p>
            <h3 class="h3 mb-0">Book a pro</h3>
            <ul class="path-list">
              <li>Regulated plumbing work: this needs a PUB-licensed plumber</li>
              <li>A leak into your neighbour's ceiling</li>
              <li>Aircon installation or a gas top-up</li>
              <li>A breaker that keeps tripping, or new power points</li>
            </ul>
            <div class="mt-auto">
              <RouterLink to="/companies" class="btn btn-primary">Find a pro</RouterLink>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- new BTO owners: move-in jobs -->
    <section class="bto">
      <div class="container py-5">
        <div class="row g-4 align-items-start">
          <div class="col-lg-4">
            <p class="eyebrow mb-1">New BTO owners</p>
            <h2 class="section-title">Just collected your keys?</h2>
            <p class="text-body-secondary fw-semibold mb-0">
              Your whole block gets keys in the same few weeks, and everyone needs the same jobs.
              Book your move-in jobs early, before the slots near you fill up.
            </p>
          </div>
          <div class="col-lg-8">
            <div class="row row-cols-2 row-cols-md-3 g-3">
              <div v-for="(job, index) in moveInJobs" :key="job.label" class="col">
                <RouterLink
                  :to="{ path: '/companies', query: { q: job.q } }"
                  :class="['move-in-tile', 'bold-tile', 'lift-hover', `tile-tint-${index % 3}`]"
                >
                  <span class="fw-bold">{{ job.label }}</span>
                  <span class="browse">Browse pros →</span>
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- why book here: one answer per pain point in the proposal -->
    <section class="container py-5">
      <h2 class="section-title mb-4">Why book here</h2>
      <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-4">
        <div class="col">
          <div class="surface-card h-100 p-4">
            <span class="reason-icon" style="background: var(--success-soft); color: var(--success-dark)" aria-hidden="true">⏱</span>
            <h3 class="h5 mt-3">Live slots</h3>
            <p class="text-body-secondary mb-0">See real free times. Once you book a slot, nobody else can take it.</p>
          </div>
        </div>
        <div class="col">
          <div class="surface-card h-100 p-4">
            <span class="reason-icon" style="background: var(--accent-soft); color: var(--accent-text)" aria-hidden="true">★</span>
            <h3 class="h5 mt-3">Verified reviews only</h3>
            <p class="text-body-secondary mb-0">Only customers who booked a company can review it.</p>
          </div>
        </div>
        <div class="col">
          <div class="surface-card h-100 p-4">
            <span class="reason-icon" style="background: var(--danger-soft); color: var(--danger-dark)" aria-hidden="true">$</span>
            <h3 class="h5 mt-3">Clear starting prices</h3>
            <p class="text-body-secondary mb-0">Every service shows a "from $X" price, so you can compare before you call.</p>
          </div>
        </div>
        <div class="col">
          <div class="surface-card h-100 p-4">
            <span class="reason-icon" style="background: var(--primary-soft); color: var(--primary-dark)" aria-hidden="true">✓</span>
            <h3 class="h5 mt-3">PUB Licensed badge</h3>
            <p class="text-body-secondary mb-0">See which plumbers hold a PUB licence.</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* the one bold colour block on the site */
.hero {
  background: var(--primary);
  color: var(--surface);
}

.hero-inner {
  padding-top: 3.5rem;
  padding-bottom: 3.5rem;
}

.hero-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.8rem;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 999px;
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 1px;
}

.live-dot {
  width: 8px;
  height: 8px;
  background: #5ee08f;
  border-radius: 50%;
  animation: pulse 1.6s ease-in-out infinite;
}

@keyframes pulse {
  50% { opacity: 0.35; }
}

.hero-title {
  font-size: clamp(2.4rem, 6vw, 4rem);
  line-height: 1.05;
  color: var(--surface);
  margin: 0;
}

.hero-lead {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--on-primary-muted);
  max-width: 35rem;
  margin: 0;
}

.search-box {
  background: var(--surface);
}

.hero-input {
  flex: 1 1 260px;
  min-height: 56px;
  font-size: 1.05rem;
}

.urgent-label {
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: var(--on-primary-muted);
}

.chip {
  min-height: 44px;
  padding: 0 1rem;
  background: var(--surface);
  border: 1px solid transparent;
  border-radius: 999px;
  box-shadow: var(--shadow-sm);
  font-weight: 700;
  color: var(--ink);
  transition: background-color 0.12s ease-out, transform 0.12s ease-out;
}

.chip:hover {
  transform: translateY(-1px);
  background: var(--accent);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--primary-soft);
  border-bottom: var(--line);
  color: var(--ink);
}

.today-toggle {
  min-height: 40px;
  padding: 0 0.9rem;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  font-weight: 700;
  color: var(--ink);
  white-space: nowrap;
}

.today-on {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--surface);
}

.sample-note {
  padding: 0.4rem 0.6rem;
  background: var(--accent-soft);
  border: 1px dashed var(--accent-dark);
  border-radius: var(--radius);
  color: var(--ink);
  font-size: 0.85rem;
  font-weight: 700;
}

.pro-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.85rem 0;
  border-bottom: var(--line);
  color: var(--ink);
  text-decoration: none;
}

.pro-row:hover .fw-bold {
  text-decoration: underline;
}

/* --success-dark keeps 4.5:1 contrast on white */
.pro-slot {
  color: var(--success-dark);
  font-weight: 800;
  white-space: nowrap;
}

.pub-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  background: var(--primary-soft);
  color: var(--primary-dark);
  border: 1px solid var(--primary);
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.875rem;
}

.section-title {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
}

.promo-tag {
  align-self: flex-start;
  padding: 2px 10px;
  border-radius: 999px;
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 1.5px;
}

.diy-tag {
  background: var(--success-soft);
  color: var(--success-dark);
}

.pro-tag {
  background: var(--primary);
  color: var(--surface);
}

.path-list {
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-weight: 600;
}

.pro-path {
  background: var(--primary-soft);
  border-color: #c9d9f7;
}

.bto {
  background: var(--surface);
  border-top: var(--line);
  border-bottom: var(--line);
}

.move-in-tile {
  min-height: 104px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--ink);
  text-decoration: none;
}

.tile-tint-0 { background: var(--accent-soft); }
.tile-tint-1 { background: var(--primary-soft); }
.tile-tint-2 { background: var(--success-soft); }

.browse {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--primary-dark);
}

.reason-icon {
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 800;
}
</style>
