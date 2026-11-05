<script setup>
import { ref, computed } from 'vue'
import api from '@/api'
import { formatTime, relativeDay } from '@/utils/sgTime'
import { HOME_PROBLEMS, CONFIDENCE, VERDICTS, verdict } from '@/utils/homeProblems'

const props = defineProps({
  companies: { type: Array, default: () => [] },
  nextFree: { type: Array, default: () => [] }, // [{ companyId, start }]
})

const OTHER = 'other'

const step = ref(1) // 1 problem, 2 symptom, 3 confidence, 4 result
const problem = ref(null) // a HOME_PROBLEMS entry, or OTHER
const symptom = ref(null)
const otherText = ref('')
const otherQuery = ref('')

// fetched once on the first result, then reused after "Start again"
const posts = ref(null)
const postsFailed = ref(false)
const tools = ref(null)
const toolsFailed = ref(false)

const heading = ref(null)
defineExpose({ focus: () => heading.value?.focus() })

const level = ref('')
const verdictInfo = computed(() => VERDICTS[level.value])
const reason = computed(() => symptom.value?.reason || verdictInfo.value?.text)

function chooseProblem(choice) {
  problem.value = choice
  step.value = 2
}

function chooseSymptom(choice) {
  symptom.value = choice
  step.value = 3
}

function chooseConfidence(value) {
  level.value = verdict(symptom.value, value)
  showResult()
}

function submitOther() {
  otherQuery.value = otherText.value.trim()
  if (!otherQuery.value) return
  level.value = ''
  showResult()
}

function showResult() {
  step.value = 4
  loadPreviews()
}

function back() {
  step.value = step.value === 4 && problem.value === OTHER ? 2 : step.value - 1
}

function restart() {
  problem.value = null
  symptom.value = null
  otherText.value = ''
  otherQuery.value = ''
  level.value = ''
  step.value = 1
}

async function loadPreviews() {
  if (posts.value === null && !postsFailed.value) {
    api.get('/forum')
      .then((response) => { posts.value = response.data })
      .catch(() => { postsFailed.value = true })
  }
  if (tools.value === null && !toolsFailed.value) {
    api.get('/shop/products')
      .then((response) => { tools.value = response.data })
      .catch(() => { toolsFailed.value = true })
  }
}

const isOther = computed(() => problem.value === OTHER)
const searchWord = computed(() => (isOther.value ? otherQuery.value : problem.value?.companiesQ ?? ''))

function offersService(company, word) {
  const lower = word.toLowerCase()
  return (company.services ?? []).some((category) =>
    category.details.some((detail) => detail.service.toLowerCase().includes(lower)),
  )
}

function lowestPrice(company) {
  const prices = (company.services ?? []).flatMap((category) => category.details.map((detail) => detail.startingPrice))
  return prices.length > 0 ? Math.min(...prices) : null
}

// the two matching companies with the earliest free slot
const pros = computed(() => {
  if (!searchWord.value) return []
  const byId = new Map(props.companies.map((company) => [company._id, company]))
  return [...props.nextFree]
    .filter((slot) => byId.has(slot.companyId) && offersService(byId.get(slot.companyId), searchWord.value))
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, 2)
    .map((slot) => {
      const company = byId.get(slot.companyId)
      return {
        id: company._id,
        name: company.name,
        slot: `${relativeDay(slot.start)} ${formatTime(slot.start)}`,
        fromPrice: lowestPrice(company),
      }
    })
})

// top three posts in the category by likes, then by replies
const forumPosts = computed(() => {
  if (!posts.value) return []
  const matches = isOther.value
    ? (post) => `${post.title} ${post.content}`.toLowerCase().includes(otherQuery.value.toLowerCase())
    : (post) => post.category === problem.value.forumCategory
  return posts.value
    .filter(matches)
    .sort((a, b) => b.likes.length - a.likes.length || b.replies.length - a.replies.length)
    .slice(0, 3)
})

// one product for each name (several companies sell the same tool), cheapest first
const shopTools = computed(() => {
  const words = isOther.value ? [] : problem.value?.shopWords ?? []
  if (!tools.value || words.length === 0) return []
  const cheapest = new Map()
  for (const tool of tools.value) {
    const name = tool.name.toLowerCase()
    if (!words.some((word) => name.includes(word))) continue
    const seen = cheapest.get(name)
    if (!seen || tool.price < seen.price) cheapest.set(name, tool)
  }
  return [...cheapest.values()].sort((a, b) => a.price - b.price).slice(0, 3)
})

const forumLink = computed(() =>
  isOther.value
    ? { path: '/forum', query: { q: otherQuery.value } }
    : { path: '/forum', query: { category: problem.value?.forumCategory } },
)
const companiesLink = computed(() => ({ path: '/companies', query: { q: searchWord.value } }))
const shopLink = computed(() => ({ path: '/shop', query: { q: problem.value?.shopWords?.[0] } }))
const showTools = computed(() => !isOther.value && problem.value?.shopWords.length > 0)

// a pro verdict puts the pros first; any other verdict puts the forum and the tools first
const blockOrder = computed(() => (level.value === 'pro' ? ['pros', 'forum', 'tools'] : ['forum', 'tools', 'pros']))

const stepLabel = computed(() => {
  if (step.value === 4) return 'Your result'
  if (isOther.value) return `Step ${step.value} of 2`
  return `Step ${step.value} of 3`
})
</script>

<template>
  <section class="helper pixel-card mt-4" aria-labelledby="helper-title">
    <div class="helper-head">
      <h2 id="helper-title" ref="heading" class="h5 mb-0" tabindex="-1">Fix it yourself, or call a pro?</h2>
      <span class="helper-step">{{ stepLabel }}</span>
    </div>

    <div class="p-3">
      <Transition name="helper-fade" mode="out-in">
        <!-- step 1: the problem -->
        <fieldset v-if="step === 1" key="problem">
          <legend class="helper-question">What needs fixing?</legend>
          <div class="problem-grid">
            <button
              v-for="choice in HOME_PROBLEMS"
              :key="choice.label"
              type="button"
              class="problem-tile"
              @click="chooseProblem(choice)"
            >
              <span class="problem-icon" aria-hidden="true">{{ choice.icon }}</span>
              {{ choice.label }}
            </button>
            <button type="button" class="problem-tile" @click="chooseProblem(OTHER)">
              <span class="problem-icon" aria-hidden="true">🛠️</span>
              Something else
            </button>
          </div>
        </fieldset>

        <!-- step 2: what the problem looks like, or a description for "Something else" -->
        <div v-else-if="step === 2" key="symptom">
          <form v-if="isOther" @submit.prevent="submitOther">
            <label for="helper-other" class="helper-question d-block">Describe the problem</label>
            <input
              id="helper-other"
              v-model="otherText"
              class="form-control"
              maxlength="80"
              placeholder="e.g. cabinet door will not close"
              required
            />
            <button type="submit" class="btn btn-success w-100 mt-2">Show me help</button>
          </form>
          <fieldset v-else>
            <legend class="helper-question">{{ problem.icon }} What does it look like?</legend>
            <button
              v-for="choice in problem.symptoms"
              :key="choice.label"
              type="button"
              class="answer-row"
              @click="chooseSymptom(choice)"
            >
              {{ choice.label }}
            </button>
          </fieldset>
          <button type="button" class="btn btn-light w-100 mt-2" @click="back">Back</button>
        </div>

        <!-- step 3: DIY confidence -->
        <div v-else-if="step === 3" key="confidence">
          <fieldset>
            <legend class="helper-question">Have you fixed this before?</legend>
            <button
              v-for="choice in CONFIDENCE"
              :key="choice.value"
              type="button"
              class="answer-row"
              @click="chooseConfidence(choice.value)"
            >
              {{ choice.label }}
            </button>
          </fieldset>
          <button type="button" class="btn btn-light w-100 mt-2" @click="back">Back</button>
        </div>

        <!-- step 4: verdict and previews from the companies, the forum and the shop -->
        <div v-else key="result" class="d-flex flex-column gap-3">
          <div v-if="verdictInfo" :class="['verdict', `verdict-${level}`]" role="status">
            <strong class="verdict-title">{{ verdictInfo.title }}</strong>
            <span>{{ reason }}</span>
          </div>
          <p v-else class="fw-semibold mb-0" role="status">Here is help for "{{ otherQuery }}".</p>

          <template v-for="block in blockOrder" :key="block">
            <div v-if="block === 'pros'" class="preview">
              <h3 class="preview-title">Pros free soonest</h3>
              <RouterLink
                v-for="pro in pros"
                :key="pro.id"
                :to="{ path: `/companies/${pro.id}`, hash: '#book-a-slot' }"
                class="preview-row"
              >
                <span class="fw-bold">{{ pro.name }}</span>
                <span class="preview-meta">
                  <span class="pro-slot">{{ pro.slot }}</span>
                  <span v-if="pro.fromPrice !== null"> · from ${{ pro.fromPrice }}</span>
                </span>
              </RouterLink>
              <p v-if="pros.length === 0" class="preview-empty">No free slot found yet. See all pros for this job.</p>
              <RouterLink :to="companiesLink" class="preview-link">Book a pro →</RouterLink>
            </div>

            <div v-else-if="block === 'forum'" class="preview">
              <h3 class="preview-title">From the DIY forum</h3>
              <RouterLink v-for="post in forumPosts" :key="post._id" :to="forumLink" class="preview-row">
                <span class="fw-bold">{{ post.title }}</span>
                <span class="preview-meta">{{ post.replies.length }} {{ post.replies.length === 1 ? 'reply' : 'replies' }}</span>
              </RouterLink>
              <p v-if="postsFailed" class="preview-empty">Could not load forum posts.</p>
              <p v-else-if="posts === null" class="preview-empty">Loading posts…</p>
              <p v-else-if="forumPosts.length === 0" class="preview-empty">No posts yet. Be the first to ask.</p>
              <RouterLink :to="forumLink" class="preview-link">Ask the forum →</RouterLink>
            </div>

            <div v-else-if="showTools" class="preview">
              <h3 class="preview-title">Tools for this job</h3>
              <RouterLink v-for="tool in shopTools" :key="tool.name" :to="shopLink" class="preview-row">
                <span class="fw-bold">{{ tool.name }}</span>
                <span class="coin-badge">${{ tool.price }}</span>
              </RouterLink>
              <p v-if="toolsFailed" class="preview-empty">Could not load tools.</p>
              <p v-else-if="tools === null" class="preview-empty">Loading tools…</p>
              <p v-else-if="shopTools.length === 0" class="preview-empty">No tools in the shop for this yet.</p>
              <RouterLink :to="shopLink" class="preview-link">Shop the tools →</RouterLink>
            </div>
          </template>

          <div class="d-flex gap-2">
            <button type="button" class="btn btn-light flex-fill" @click="back">Back</button>
            <button type="button" class="btn btn-light flex-fill" @click="restart">Start again</button>
          </div>
        </div>
      </Transition>
    </div>
  </section>
</template>

<style scoped>
.helper {
  background: var(--white);
  overflow: hidden;
}

.helper-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--green);
  border-bottom: var(--line);
}

.helper-head h2:focus {
  outline: none;
}

.helper-step {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.85rem;
  white-space: nowrap;
}

fieldset {
  border: 0;
  margin: 0;
  padding: 0;
}

.helper-question {
  margin-bottom: 0.75rem;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.05rem;
}

.problem-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.problem-tile,
.answer-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 48px;
  padding: 0.5rem 0.75rem;
  background: var(--cream);
  border: var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  color: var(--ink);
  font-weight: 700;
  text-align: left;
  transition: transform 0.12s ease, background 0.12s ease;
}

.answer-row + .answer-row {
  margin-top: 0.5rem;
}

.problem-tile:hover,
.answer-row:hover,
.problem-tile:focus-visible,
.answer-row:focus-visible {
  transform: translateY(-2px);
  background: var(--coin);
}

.problem-icon {
  font-size: 1.3rem;
}

.verdict {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  border: var(--line);
  border-radius: var(--radius);
  font-weight: 600;
}

.verdict-title {
  font-family: var(--font-display);
  font-size: 1.2rem;
}

.verdict-diy {
  background: var(--green);
}

.verdict-maybe {
  background: var(--coin);
}

.verdict-pro {
  background: var(--red);
  color: var(--white);
}

.preview {
  display: flex;
  flex-direction: column;
}

.preview-title {
  margin-bottom: 0.25rem;
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 2px dashed var(--stone);
  color: var(--ink);
  text-decoration: none;
}

.preview-row:hover .fw-bold {
  text-decoration: underline;
}

.preview-meta {
  font-size: 0.85rem;
  font-weight: 700;
  white-space: nowrap;
}

/* --green-dark keeps 4.5:1 contrast on white */
.pro-slot {
  color: var(--green-dark);
}

.preview-empty {
  margin: 0.5rem 0 0;
  color: var(--ink-muted);
  font-size: 0.9rem;
}

.preview-link {
  align-self: flex-start;
  margin-top: 0.5rem;
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--red-dark);
}

.helper-fade-enter-active,
.helper-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.helper-fade-enter-from {
  opacity: 0;
  transform: translateX(8px);
}

.helper-fade-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

@media (prefers-reduced-motion: reduce) {
  .helper-fade-enter-active,
  .helper-fade-leave-active {
    transition: none;
  }
}
</style>
