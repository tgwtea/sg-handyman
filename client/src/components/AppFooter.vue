<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <footer class="app-footer">
    <div class="brick-strip" aria-hidden="true"></div>
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
            <p class="footer-heading text-sky">EXPLORE</p>
            <ul class="list-unstyled d-flex flex-column gap-1">
              <li><RouterLink to="/companies">Companies</RouterLink></li>
              <li><RouterLink to="/shop">Shop</RouterLink></li>
              <li><RouterLink to="/forum">DIY Forum</RouterLink></li>
            </ul>
          </div>
          <div class="col-6 col-md-3">
            <p class="footer-heading text-green">ACCOUNT</p>
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
.footer-body {
  background: var(--ink);
  color: var(--cream);
}

.footer-brand {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--coin);
}

.footer-text {
  color: #d9d6cc;
  max-width: 24rem;
}

.footer-heading {
  font-family: var(--font-display);
  margin-bottom: 0.5rem;
}

.text-sky {
  color: var(--sky);
}

.text-green {
  color: var(--green);
}

.footer-body a {
  color: var(--cream);
  text-decoration: none;
}

.footer-body a:hover {
  color: var(--coin);
  text-decoration: underline;
}

.footer-small {
  font-size: 0.8rem;
  color: #a9a6b8;
}
</style>
