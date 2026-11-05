<script setup>
import { useId, ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  message: { type: String, required: true },
  note: { type: String, default: '' },
  confirmLabel: { type: String, required: true },
  busy: { type: Boolean, default: false },
  title: { type: String, default: 'Confirm Deletion' },
  busyLabel: { type: String, default: 'Deleting...' },
})
const emit = defineEmits(['cancel', 'confirm'])

// two pages can show this dialog, so the ids that label it must be unique
const id = useId()

const dialog = ref(null)
const cancelButton = ref(null)
// the button that opened the dialog gets focus back when it closes
let opener = null

onMounted(() => {
  opener = document.activeElement
  cancelButton.value?.focus()
})

onBeforeUnmount(() => {
  if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
})

// Escape closes; Tab and Shift+Tab stay inside the dialog
function onKeydown(event) {
  if (event.key === 'Escape') {
    if (!props.busy) emit('cancel')
    return
  }
  if (event.key !== 'Tab') return
  const buttons = [...dialog.value.querySelectorAll('button:not([disabled])')]
  if (!buttons.length) return
  const first = buttons[0]
  const last = buttons[buttons.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <!-- .self cancels when you click the area outside the dialog -->
  <div class="delete-dialog-backdrop" @click.self="$emit('cancel')" @keydown="onKeydown">
    <section
      ref="dialog"
      class="delete-dialog"
      role="alertdialog"
      aria-modal="true"
      :aria-labelledby="`${id}-title`"
      :aria-describedby="`${id}-message`"
    >
      <header class="delete-dialog-header">
        <span aria-hidden="true">🗑</span>
        <h2 :id="`${id}-title`">{{ title }}</h2>
        <button
          type="button"
          class="close-button"
          :disabled="busy"
          aria-label="Close confirmation"
          @click="$emit('cancel')"
        >
          ×
        </button>
      </header>
      <div class="delete-dialog-body">
        <p :id="`${id}-message`" class="delete-warning">
          <span class="warning-icon" aria-hidden="true">!</span>
          <span>{{ message }}</span>
        </p>
        <p v-if="note" class="delete-dialog-note">{{ note }}</p>
      </div>
      <footer class="delete-dialog-actions">
        <button
          type="button"
          class="btn btn-secondary"
          ref="cancelButton"
          :disabled="busy"
          @click="$emit('cancel')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn btn-success"
          :disabled="busy"
          @click="$emit('confirm')"
        >
          {{ busy ? busyLabel : confirmLabel }}
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.delete-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.5);
}

.delete-dialog {
  width: 100%;
  max-width: 440px;
  overflow: hidden;
  border: 3px solid #c8201c;
  border-radius: 8px;
  background: #fff1f0;
}

.delete-dialog-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #c8201c;
  color: white;
}

.delete-dialog-header h2 {
  flex: 1;
  margin: 0;
  font-size: 18px;
}

.close-button {
  margin: 0;
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: white;
  font-size: 24px;
}

.delete-dialog-body {
  padding: 16px;
  background: #fff1f0;
}

.delete-warning {
  display: flex;
  gap: 10px;
  margin: 0;
  padding: 12px;
  border: 1px solid #f0a8a5;
  border-radius: 6px;
  background: #fff1f0;
  color: #244b38;
  font-size: 14px;
}

.warning-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #a31916;
  color: white;
  text-align: center;
  font-weight: bold;
}

.delete-dialog-note {
  margin: 12px 0 0;
  color: #68758a;
  font-size: 12px;
  font-style: italic;
}

.delete-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #f0a8a5;
  background: #fee2e2;
}

/* same size as the rest of the forum's buttons */
.delete-dialog-actions .btn {
  margin: 4px 6px 4px 0;
  padding: 8px 12px;
}
</style>
