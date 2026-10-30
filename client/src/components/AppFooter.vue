<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <footer class="app-footer">
        <div class="footer-body">
      <div class="container py-4">
        <div class="row g-4">
          <div class="col-md-6">
            <p class="footer-brand mb-2">SG HANDYMAN</p>
            <p class="footer-text mb-0">
              Book trusted repair companies in Singapore, buy the right tools, and learn DIY fixes
              from the community.
            </p>
          </div>
          <div class="col-6 col-md-3">
            <p class="footer-heading text-heading">EXPLORE</p>
            <ul class="list-unstyled d-flex flex-column gap-1">
              <li><RouterLink to="/companies">Companies</RouterLink></li>
              <li><RouterLink to="/shop">Shop</RouterLink></li>
              <li><RouterLink to="/forum">DIY Forum</RouterLink></li>
            </ul>
          </div>
          <div class="col-6 col-md-3">
            <p class="footer-heading text-heading">ACCOUNT</p>
            <ul class="list-unstyled d-flex flex-column gap-1">
              <li><RouterLink to="/login">Log in</RouterLink></li>
            </ul>
          </div>
        </div>
        <p class="footer-small mt-3 mb-0">IS216 group project · Built with Vue 3 and Bootstrap 5</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/* solid blue band with a sunflower stripe on top */
.footer-body {
  background: var(--primary-dark);
  border-top: 4px solid var(--accent);
  color: var(--surface);
}

.footer-brand {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--surface);
}

.footer-text {
  color: var(--on-primary-muted);
  max-width: 24rem;
}

.footer-heading {
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 0.5rem;
}

.text-heading {
  color: var(--accent);
}

.footer-body a {
  color: var(--surface);
  text-decoration: none;
}

.footer-body a:hover {
  color: var(--accent);
  text-decoration: underline;
}

.footer-small {
  font-size: 0.8rem;
  color: var(--on-primary-muted);
}
</style>
