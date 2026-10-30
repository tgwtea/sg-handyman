<script setup>
// SG Handyman logo mark: a house outline with a wrench inside, drawn in currentColor
defineProps({
  size: {
    type: Number,
    default: 24
  }
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    role="img"
    aria-label="SG Handyman logo"
  >
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9v11h14V9" />
    <path d="M14.5 11.5a2.5 2.5 0 0 0-3.2 3.2L8.5 17.5l1 1 2.8-2.8a2.5 2.5 0 0 0 3.2-3.2l-1.5 1.5-1-1z" />
  </svg>
</template>
