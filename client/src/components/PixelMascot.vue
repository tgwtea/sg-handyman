<script setup>
// Fixie, the site mascot: a 16 x 17 pixel-art handyman drawn with SVG rects
defineProps({
  size: {
    type: Number,
    default: 160
  }
})

// each entry is one rect: [x, y, width, height, color]
const pixels = [
  [5, 0, 6, 1, '#FBD000'],
  [4, 1, 8, 1, '#FBD000'],
  [3, 2, 10, 1, '#FBD000'],
  [7, 1, 2, 2, '#E0A800'],
  [2, 3, 12, 1, '#E0A800'],
  [4, 4, 8, 3, '#E8A36B'],
  [5, 7, 6, 1, '#E8A36B'],
  [6, 5, 1, 1, '#1A1A2E'],
  [9, 5, 1, 1, '#1A1A2E'],
  [5, 6, 1, 1, '#F28C8C'],
  [10, 6, 1, 1, '#F28C8C'],
  [7, 7, 2, 1, '#1A1A2E'],
  [6, 8, 4, 1, '#C97F4A'],
  [3, 9, 10, 1, '#C8201C'],
  [2, 10, 12, 2, '#C8201C'],
  [5, 9, 1, 1, '#2E5BD8'],
  [10, 9, 1, 1, '#2E5BD8'],
  [4, 10, 8, 2, '#2E5BD8'],
  [5, 10, 1, 1, '#FFFFFF'],
  [10, 10, 1, 1, '#FFFFFF'],
  [2, 12, 2, 1, '#E8A36B'],
  [12, 12, 3, 1, '#E8A36B'],
  [4, 12, 8, 1, '#B4521E'],
  [7, 12, 2, 1, '#FBD000'],
  [4, 13, 8, 1, '#2E5BD8'],
  [4, 14, 3, 2, '#2E5BD8'],
  [9, 14, 3, 2, '#2E5BD8'],
  [3, 16, 4, 1, '#1A1A2E'],
  [9, 16, 4, 1, '#1A1A2E'],
  [13, 6, 1, 1, '#9AA3B5'],
  [15, 6, 1, 1, '#9AA3B5'],
  [13, 7, 3, 1, '#9AA3B5'],
  [14, 8, 1, 4, '#9AA3B5']
]
</script>

<template>
  <svg
    :width="size"
    :height="Math.round((size * 17) / 16)"
    viewBox="0 0 16 17"
    shape-rendering="crispEdges"
    role="img"
    aria-label="Fixie, the SG Handyman mascot"
  >
    <rect
      v-for="(p, i) in pixels"
      :key="i"
      :x="p[0]"
      :y="p[1]"
      :width="p[2]"
      :height="p[3]"
      :fill="p[4]"
    />
  </svg>
</template>
