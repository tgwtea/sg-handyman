<script setup>
defineOptions({ name: 'HomeView' })
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import { formatDay, formatTime, relativeDay } from '@/utils/sgTime'
import HomeHelper from '@/components/HomeHelper.vue'

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
const nearby = ref(null) // [{ companyId, start, distanceKm, estimated }] nearest first, or null with no location
const nearLabel = ref('') // "your location" or the postal code
const postalInput = ref('')
const locating = ref(false)
const locationError = ref('')
const loadFailed = ref(false)
const loaded = ref(false)
const todayOnly = ref(true)

const todayLabel = formatDay(new Date())
const helper = ref(null)

function lowestPrice(company) {
  const prices = (company.services ?? []).flatMap((category) =>
    category.details.map((detail) => detail.startingPrice),
  )
  return prices.length > 0 ? Math.min(...prices) : null
}

const POSTAL_KEY = 'home.postalCode'

function readSavedPostalCode() {
  try {
    return localStorage.getItem(POSTAL_KEY) ?? ''
  } catch {
    return ''
  }
}

function savePostalCode(postalCode) {
  try {
    if (postalCode) localStorage.setItem(POSTAL_KEY, postalCode)
    else localStorage.removeItem(POSTAL_KEY)
  } catch {
    // storage blocked: the visitor types the postal code again next time
  }
}

// "3.2 km", or "~3.2 km" when the server could not get a driving route
function distanceText(slot) {
  if (slot.distanceKm === null || slot.distanceKm === undefined) return ''
  return `${slot.estimated ? '~' : ''}${slot.distanceKm} km`
}

// the four companies to show: nearest first with a location, else earliest first
const availablePros = computed(() => {
  const byId = new Map(companies.value.map((company) => [company._id, company]))
  const slots = nearby.value ?? [...nextFree.value].sort((a, b) => new Date(a.start) - new Date(b.start))
  return slots
    .filter((slot) => byId.has(slot.companyId))
    .filter((slot) => !todayOnly.value || formatDay(slot.start) === todayLabel)
    .slice(0, 4)
    .map((slot) => {
      const company = byId.get(slot.companyId)
      return {
        id: company._id,
        name: company.name,
        slot: `${relativeDay(slot.start)} ${formatTime(slot.start)}`,
        distance: distanceText(slot),
        fromPrice: lowestPrice(company),
        pubLicensed: Boolean(company.isPubLicensed),
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

const panelTitle = computed(() => {
  const near = nearby.value ? ' near you' : ''
  return todayOnly.value ? `Free today${near}` : `Earliest free slots${near}`
})

// body: { postalCode } or { lat, lng }; the server sorts the companies by driving distance
async function findNear(body, label) {
  locating.value = true
  locationError.value = ''
  try {
    const response = await api.post('/timeslots/next-free/near', body)
    nearby.value = response.data
    nearLabel.value = label
    if (body.postalCode) savePostalCode(body.postalCode)
  } catch (error) {
    locationError.value = error.response?.data?.message ?? 'Could not find slots near you right now.'
  } finally {
    locating.value = false
  }
}

function useMyLocation() {
  if (!navigator.geolocation) {
    locationError.value = 'Your browser cannot share its location. Type your postal code.'
    return
  }
  locating.value = true
  locationError.value = ''
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => findNear({ lat: coords.latitude, lng: coords.longitude }, 'your location'),
    () => {
      locating.value = false
      locationError.value = 'Location is blocked or not available. Type your postal code.'
    },
    { timeout: 10_000, maximumAge: 5 * 60 * 1000 },
  )
}

function searchPostalCode() {
  const postalCode = postalInput.value.trim()
  findNear({ postalCode }, postalCode)
}

function clearLocation() {
  nearby.value = null
  nearLabel.value = ''
  postalInput.value = ''
  locationError.value = ''
  savePostalCode('')
}

function searchFor(q) {
  const trimmed = q.trim()
  router.push({ path: '/companies', query: trimmed ? { q: trimmed } : {} })
}

onMounted(() => {
  loadHome()
  const saved = readSavedPostalCode()
  if (saved) {
    postalInput.value = saved
    findNear({ postalCode: saved }, saved)
  }
})
</script>

<template>
  <div class="home">
    <!-- hero: describe the problem, or tap a common one -->
    <section class="hero">
      <div class="container hero-inner">
        <div class="row g-4 g-lg-5 align-items-start">
          <div class="col-lg-7 d-flex flex-column gap-3">
            <span class="hero-tag align-self-start">
              <span class="live-dot" aria-hidden="true"></span>
              LIVE AVAILABILITY, UPDATED EVERY SECOND
            </span>
            <h1 class="hero-title">What needs fixing at home?</h1>
            <p class="hero-lead">
              Compare local professionals by their next free slot, distance, and starting price. Book an appointment through our website in just a few clicks. Small fix? Get tips in the DIY forum and the right tools from our shop.
            </p>

            <form class="pixel-card p-3 d-flex flex-wrap gap-3" role="search" @submit.prevent="searchFor(query)">
              <label for="home-search" class="visually-hidden">Describe the problem</label>
              <input
                id="home-search"
                v-model="query"
                type="search"
                class="form-control hero-input"
                placeholder="Describe the problem, e.g. kitchen sink leaking"
              />
              <button type="submit" class="btn btn-primary btn-lg px-4">Search</button>
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
            <aside class="pixel-card overflow-hidden" aria-labelledby="free-title">
              <div class="panel-head">
                <h2 id="free-title" class="h4 mb-0">{{ panelTitle }}</h2>
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
                <!-- location: browser location first, typed postal code as the fallback -->
                <div v-if="nearby" class="near-bar mt-3">
                  <span class="fw-semibold">Nearest to {{ nearLabel }}, by driving distance</span>
                  <button type="button" class="btn btn-light btn-sm" @click="clearLocation">Change</button>
                </div>
                <div v-else class="d-flex flex-column gap-2 mt-3">
                  <button type="button" class="btn btn-success" :disabled="locating" @click="useMyLocation">
                    {{ locating ? 'Finding slots near you…' : 'Use my location' }}
                  </button>
                  <form class="d-flex gap-2" @submit.prevent="searchPostalCode">
                    <label for="home-postal" class="visually-hidden">Postal code</label>
                    <input
                      id="home-postal"
                      v-model="postalInput"
                      class="form-control"
                      inputmode="numeric"
                      pattern="[0-9]{6}"
                      maxlength="6"
                      required
                      placeholder="or postal code, e.g. 569933"
                    />
                    <button type="submit" class="btn btn-light" :disabled="locating">Go</button>
                  </form>
                </div>
                <p v-if="locationError" class="alert alert-warning mt-3 mb-0" role="alert">{{ locationError }}</p>
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
                  <span class="d-flex flex-wrap align-items-center gap-2">
                    <span v-if="pro.distance" class="pro-distance">{{ pro.distance }}</span>
                    <span v-if="pro.fromPrice !== null" class="coin-badge">from ${{ pro.fromPrice }}</span>
                    <span v-if="pro.pubLicensed" class="pub-badge">PUB Licensed</span>
                  </span>
                </RouterLink>

                <RouterLink to="/companies" class="btn btn-light w-100 mt-3">See all companies</RouterLink>
              </div>
            </aside>

            <HomeHelper ref="helper" :companies="companies" :next-free="nextFree" />
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
          <div class="pixel-card h-100 p-4 d-flex flex-column gap-3">
            <p class="promo-tag mb-0 text-danger">POWER-UP</p>
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
          <div class="pixel-card h-100 p-4 d-flex flex-column gap-3 pro-path">
            <p class="promo-tag mb-0">CALL FOR BACKUP</p>
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
              <div v-for="job in moveInJobs" :key="job.label" class="col">
                <RouterLink
                  :to="{ path: '/companies', query: { q: job.q } }"
                  class="move-in-tile pixel-card bounce-hover"
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
          <div class="pixel-card h-100 p-4">
            <span class="reason-icon" style="background: var(--green)" aria-hidden="true">⏱</span>
            <h3 class="h5 mt-3">Live slots</h3>
            <p class="text-body-secondary mb-0">See real free times. Once you book a slot, nobody else can take it.</p>
          </div>
        </div>
        <div class="col">
          <div class="pixel-card h-100 p-4">
            <span class="reason-icon" style="background: var(--coin)" aria-hidden="true">★</span>
            <h3 class="h5 mt-3">Verified reviews only</h3>
            <p class="text-body-secondary mb-0">Only customers who booked a company can review it.</p>
          </div>
        </div>
        <div class="col">
          <div class="pixel-card h-100 p-4">
            <span class="reason-icon" style="background: var(--white)" aria-hidden="true">$</span>
            <h3 class="h5 mt-3">Clear starting prices</h3>
            <p class="text-body-secondary mb-0">Every service shows a "from $X" price, so you can compare before you call.</p>
          </div>
        </div>
        <div class="col">
          <div class="pixel-card h-100 p-4">
            <span class="reason-icon" style="background: var(--sky)" aria-hidden="true">✓</span>
            <h3 class="h5 mt-3">PUB Licensed badge</h3>
            <p class="text-body-secondary mb-0">See which plumbers hold a PUB licence.</p>
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
  padding-top: 3.5rem;
  padding-bottom: 3.5rem;
}

.hero-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.75rem;
  background: var(--white);
  border: var(--line);
  border-radius: var(--radius);
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: 1px;
}

.live-dot {
  width: 10px;
  height: 10px;
  background: var(--green);
  border: 2px solid var(--ink);
  animation: blink 1.2s steps(2, start) infinite;
}

@keyframes blink {
  to { visibility: hidden; }
}

.hero-title {
  font-size: clamp(2.5rem, 6vw, 4.25rem);
  line-height: 1;
  color: var(--white);
  text-shadow: 4px 4px 0 var(--ink);
  margin: 0;
}

.hero-lead {
  font-size: 1.2rem;
  font-weight: 600;
  max-width: 35rem;
  margin: 0;
}

.hero-input {
  flex: 1 1 260px;
  min-height: 56px;
  font-size: 1.05rem;
}

.urgent-label {
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: 2px;
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
  background: var(--coin);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--coin);
  border-bottom: var(--line);
}

.today-toggle {
  min-height: 44px;
  padding: 0 0.9rem;
  background: var(--white);
  border: var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  font-weight: 800;
  color: var(--ink);
}

.today-on {
  background: var(--red);
  color: var(--white);
}

.near-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.9rem;
}

.pro-distance {
  font-weight: 800;
  white-space: nowrap;
}

.pro-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.85rem 0;
  border-bottom: 2px dashed var(--stone);
  color: var(--ink);
  text-decoration: none;
}

.pro-row:hover .fw-bold {
  text-decoration: underline;
}

/* --green-dark keeps 4.5:1 contrast on white */
.pro-slot {
  color: var(--green-dark);
  font-weight: 800;
  white-space: nowrap;
}

.pub-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  background: var(--sky);
  border: 2px solid var(--ink);
  border-radius: 999px;
  font-weight: 800;
  font-size: 0.875rem;
}

.section-title {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
}

.promo-tag {
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 3px;
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
  background: #e3edff;
}

.bto {
  background: var(--white);
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
  background: var(--cream);
  color: var(--ink);
  text-decoration: none;
}

.browse {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--red-dark);
}

.reason-icon {
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: var(--line);
  border-radius: var(--radius);
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
}

.helper-link {
  padding: 0;
  background: none;
  border: 0;
  font-weight: 800;
  color: var(--ink);
  text-align: left;
  text-decoration: underline;
}
</style>
