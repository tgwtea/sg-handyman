<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  sections: { type: Array, required: true }, // [{ id, label }], top of the page first
})

const activeId = ref(props.sections[0].id)

let observer = null

// the click scrolls, not a hash watcher: clicking the current link again does not change the hash
function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

onMounted(() => {
  // a band just below the sticky nav; the topmost section crossing it is the current one,
  // so a short section is not skipped when the next one also reaches the band
  const crossing = new Set()
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) crossing.add(entry.target.id)
        else crossing.delete(entry.target.id)
      }
      const current = props.sections.find((section) => crossing.has(section.id))
      if (current) activeId.value = current.id
    },
    { rootMargin: '-100px 0px -80% 0px' },
  )
  for (const section of props.sections) {
    const element = document.getElementById(section.id)
    if (element) observer.observe(element)
  }
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<template>
  <nav class="company-nav pixel-card" aria-label="Company page sections">
    <!-- replace: Back should leave the page, not step through the sections -->
    <RouterLink
      v-for="section in sections"
      :key="section.id"
      :to="{ hash: `#${section.id}` }"
      replace
      :class="['company-nav-link', { active: section.id === activeId }]"
      :aria-current="section.id === activeId ? 'location' : undefined"
      @click="scrollToSection(section.id)"
    >
      {{ section.label }}
    </RouterLink>
  </nav>
</template>

<style scoped>
.company-nav {
  display: flex;
  gap: 0.25rem;
  padding: 0.5rem;
}

.company-nav-link {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0.25rem;
  border-radius: var(--radius);
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 0.875rem;
  line-height: 1.15;
  text-align: center;
  text-decoration: none;
}

.company-nav-link:hover {
  background: var(--stone);
  color: var(--ink);
}

.company-nav-link.active {
  background: var(--coin);
  color: var(--ink);
}

/* Bootstrap's lg breakpoint, where CompanyDetails.vue puts the nav in its own column */
@media (min-width: 992px) {
  .company-nav {
    flex-direction: column;
  }

  .company-nav-link {
    flex: none;
    justify-content: flex-start;
    padding: 0.25rem 0.75rem;
    font-size: 1rem;
    text-align: left;
  }
}
</style>
