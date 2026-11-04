<script setup>
// Purpose: one confirmation design for shop product, review and order removals.
// Styling follows Forum.vue; native dialog/showModal are the already approved popup APIs.
import { ref, onMounted } from 'vue'
const props = defineProps({ title: String, message: String, note: String, confirmLabel: String, busy: Boolean, error: String })
const emit = defineEmits(['cancel', 'confirm'])
const confirmation = ref(null)
function cancelWithEscape(event) {
  if (props.busy) event.preventDefault()
  else emit('cancel')
}
onMounted(() => { confirmation.value.showModal() })
</script>

<template>
  <dialog ref="confirmation" class="shop-confirm" :aria-label="title" @cancel="cancelWithEscape">
    <header class="confirmation-header">
      <span aria-hidden="true">🗑</span><h2>{{ title }}</h2>
      <button type="button" class="confirmation-close" aria-label="Close confirmation" :disabled="busy" @click="emit('cancel')">×</button>
    </header>
    <div class="confirmation-body">
      <p class="confirmation-warning"><span class="warning-icon" aria-hidden="true">!</span><span>{{ message }}</span></p>
      <p v-if="note" class="confirmation-note">{{ note }}</p>
      <p v-if="error" class="small text-danger mt-2 mb-0">{{ error }}</p>
    </div>
    <footer class="confirmation-actions">
      <button type="button" class="btn btn-secondary" :disabled="busy" autofocus @click="emit('cancel')">Cancel</button>
      <button type="button" class="btn btn-success" :disabled="busy" @click="emit('confirm')">{{ busy ? 'Please wait...' : confirmLabel }}</button>
    </footer>
  </dialog>
</template>

<style scoped>
/* These colours and sections match the existing forum confirmation. */
.shop-confirm { padding: 0; width: calc(100vw - 2rem); max-width: 470px; max-height: 90vh; overflow: auto; border: 3px solid #c8201c; border-radius: 8px; background: #fff1f0; color: var(--ink); }
.shop-confirm::backdrop { background: rgba(0, 0, 0, 0.5); }
.confirmation-header { display: flex; align-items: center; gap: 8px; padding: 12px; background: #c8201c; color: white; }
.confirmation-header h2 { flex: 1; margin: 0; font-size: 16px; }
.confirmation-close { min-width: 36px; min-height: 36px; border: 0; background: transparent; color: white; font-size: 24px; box-shadow: none; }
.confirmation-body { padding: 16px; }
.confirmation-warning { display: flex; gap: 10px; margin: 0; padding: 12px; border: 1px solid #f0a8a5; border-radius: 6px; color: #244b38; font-size: 14px; }
.warning-icon { width: 20px; height: 20px; flex-shrink: 0; border-radius: 50%; background: #a31916; color: white; text-align: center; font-weight: bold; }
.confirmation-note { margin: 12px 0 0; color: #68758a; font-size: 12px; font-style: italic; }
.confirmation-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid #f0a8a5; background: #fee2e2; }
</style>
