<script setup>
import { ref, computed } from 'vue'

// Shop.vue supplies the total and whether an order is being sent.
const props = defineProps({ total: Number, placingOrder: Boolean })
const emit = defineEmits(['place-order'])
const recipientName = ref('')
const deliveryAddress = ref('')
const deliveryNote = ref('')
const cardholderName = ref('')
const cardNumber = ref('')
const expiryMonth = ref('')
const expiryYear = ref('')
const securityCode = ref('')
const cardTouched = ref(false)
const paymentMessage = ref('')

// Allow spaces between digits, but do not silently remove letters or punctuation.
const cardDigits = computed(() => cardNumber.value.split(' ').join(''))

function containsOnlyDigits(text) {
  if (text.length === 0) return false
  for (const character of text) {
    if (character < '0' || character > '9') return false
  }
  return true
}

// Starting digits identify a network; this does not prove a card is genuine.
const cardBrand = computed(() => {
  const number = cardDigits.value
  if (!containsOnlyDigits(number)) return ''
  if (number[0] === '4') return 'Visa'
  const firstTwo = Number(number.slice(0, 2))
  const firstFour = Number(number.slice(0, 4))
  if (firstTwo === 34 || firstTwo === 37) return 'American Express'
  if ((firstTwo >= 51 && firstTwo <= 55) ||
      (number.length >= 4 && firstFour >= 2221 && firstFour <= 2720)) return 'Mastercard'
  return ''
})

// This lesson checks supported prefixes and length, not bank approval or a checksum.
const cardIsValid = computed(() => {
  if (cardBrand.value === 'American Express') return cardDigits.value.length === 15
  if (cardBrand.value === 'Visa' || cardBrand.value === 'Mastercard') {
    return cardDigits.value.length === 16
  }
  return false
})

function submitCheckout() {
  if (props.placingOrder) return
  cardTouched.value = true
  paymentMessage.value = ''
  if (!recipientName.value.trim() || !deliveryAddress.value.trim() || !cardholderName.value.trim()) {
    paymentMessage.value = 'Enter the recipient, delivery address and cardholder name.'
    return
  }
  if (!cardIsValid.value) {
    paymentMessage.value = 'Invalid card. Check the supported network and number length.'
    return
  }
  const month = Number(expiryMonth.value)
  const year = Number(expiryYear.value)
  const today = new Date()
  if (!containsOnlyDigits(String(expiryMonth.value)) ||
      !containsOnlyDigits(String(expiryYear.value)) || String(expiryYear.value).length !== 4 ||
      month < 1 || month > 12 || year < today.getFullYear() ||
      (year === today.getFullYear() && month < today.getMonth() + 1)) {
    paymentMessage.value = 'Enter a valid expiry month and year that have not passed.'
    return
  }
  let requiredLength = 3
  if (cardBrand.value === 'American Express') requiredLength = 4
  if (!containsOnlyDigits(securityCode.value) || securityCode.value.length !== requiredLength) {
    paymentMessage.value = 'Enter a ' + requiredLength + '-digit security code.'
    return
  }
  // Send delivery details to the parent. Never send or save card numbers/security codes.
  emit('place-order', {
    recipientName: recipientName.value.trim(),
    deliveryAddress: deliveryAddress.value.trim(),
    deliveryNote: deliveryNote.value.trim()
  })
}
</script>

<template>
  <form @submit.prevent="submitCheckout">
    <fieldset :disabled="placingOrder">
      <legend>Delivery and payment details</legend>
      <label for="recipient-name" class="form-label">Recipient name</label>
      <input id="recipient-name" v-model.trim="recipientName" class="form-control mb-3" maxlength="80" autocomplete="shipping name" required />
      <label for="delivery-address" class="form-label">Delivery address</label>
      <textarea id="delivery-address" v-model.trim="deliveryAddress" class="form-control mb-3" maxlength="300" autocomplete="shipping street-address" required></textarea>
      <label for="delivery-note" class="form-label">Delivery note (optional)</label>
      <input id="delivery-note" v-model.trim="deliveryNote" class="form-control mb-3" maxlength="200" />

      <p class="alert alert-info">Card checks only; no payment is taken. Use test numbers, not real card details.</p>
      <label for="cardholder-name" class="form-label">Cardholder name</label>
      <input id="cardholder-name" v-model.trim="cardholderName" class="form-control mb-3" maxlength="80" autocomplete="off" required />
      <label for="card-number" class="form-label">Card number</label>
      <!-- The shared theme styles form-control; this wrapper places logos inside its border. -->
      <div class="form-control d-flex flex-wrap align-items-center gap-2 mb-2">
        <input id="card-number" v-model="cardNumber" class="card-number-input" inputmode="numeric" maxlength="23" autocomplete="off" aria-describedby="card-help card-error" :aria-invalid="cardTouched && !cardIsValid" @blur="cardTouched = true" required />
        <span class="d-flex align-items-center gap-1">
          <img v-if="!cardDigits || cardBrand === 'Visa'" src="/card-logos/visa.png" alt="Visa" class="card-logo" />
          <img v-if="!cardDigits || cardBrand === 'Mastercard'" src="/card-logos/mastercard.png" alt="Mastercard" class="card-logo" />
          <img v-if="!cardDigits || cardBrand === 'American Express'" src="/card-logos/american-express.jpg" alt="American Express" class="card-logo" />
        </span>
      </div>
      <!-- blur means the user left the input; only then show the inline error. -->
      <p id="card-error" class="text-danger" aria-live="polite"><span v-if="cardTouched && !cardIsValid">Invalid card</span></p>
      <p id="card-help" class="small">Visa/Mastercard: 16 digits. American Express: 15 digits. Test numbers: 4242424242424242, 5555555555554444, 378282246310005.</p>
      <div class="row g-3 mb-3">
        <div class="col-sm-4">
          <label for="expiry-month" class="form-label">Expiry month</label>
          <input id="expiry-month" v-model="expiryMonth" class="form-control" inputmode="numeric" maxlength="2" placeholder="MM" autocomplete="off" required />
        </div>
        <div class="col-sm-4">
          <label for="expiry-year" class="form-label">Expiry year</label>
          <input id="expiry-year" v-model="expiryYear" class="form-control" inputmode="numeric" maxlength="4" placeholder="YYYY" autocomplete="off" required />
        </div>
        <div class="col-sm-4">
          <label for="security-code" class="form-label">Security code</label>
          <input id="security-code" v-model="securityCode" class="form-control" type="password" inputmode="numeric" maxlength="4" autocomplete="off" required />
        </div>
      </div>
      <p class="fw-bold">Total: ${{ total }}</p>
      <p v-if="paymentMessage" class="text-danger" role="alert">{{ paymentMessage }}</p>
      <button type="submit" class="btn btn-success">{{ placingOrder ? 'Submitting order...' : 'Place order' }}</button>
    </fieldset>
  </form>
</template>

<style scoped>
/* Keep the project's colours/fonts; only size the input and card logos. */
.card-number-input {
  flex: 1;
  min-width: 150px;
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}
.card-logo {
  width: 38px;
  height: 25px;
  object-fit: contain;
}
</style>
