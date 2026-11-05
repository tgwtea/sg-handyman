<!-- youtube tutorial: https://www.youtube.com/watch?v=_c4z1GeKi_4 -->
<!-- OneMap WMS doc: https://www.onemap.gov.sg/docs/maps/ -->

<script setup>
import { ref } from 'vue';
import L from 'leaflet';
import api from '@/api'

const props = defineProps(['address']);
let currentMarker = ref()
// shown under the map instead of a blocking alert()
const mapMessage = ref('')

// the popup is HTML, so text from the API is escaped first
function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

// Explicitly expose function to the parent
defineExpose({
  initialiseOneMap,
  pinPostalCode
})

const map = ref();
const mapContainer = ref();
let sw = L.latLng(1.144, 103.535);
let ne = L.latLng(1.494, 104.502);
let bounds = L.latLngBounds(sw, ne);

async function initialiseOneMap() {
  // OneMap WMS view 
  map.value = L.map(mapContainer.value).setView([1.2868108, 103.8545349], 16).setMaxBounds(bounds);
  L.tileLayer.wms('https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png', {
    layers: 'Default',
    format: "image/png",
    version: "1.0.0",
    WMTVER:  "1.0.0",
    crs: L.CRS.EPSG4326,
    maxZoom: 18,
    minZoom: 11,
    /** DO NOT REMOVE the OneMap attribution below **/
    attribution: '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" alt="OneMap logo" style="height:20px;width:20px;"/>&nbsp;<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>&nbsp;&copy;&nbsp;contributors&nbsp;&#124;&nbsp;<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>'
  }).addTo(map.value);
}

// Programmatically fetch coordinates from OneMap API and update the map marker
async function pinPostalCode() {
  mapMessage.value = '';
  const postalCode = props.address?.match(/\b(\d{6})\b\s*$/)?.[1];

  if (!postalCode) {
    mapMessage.value = 'This address has no 6-digit postal code, so the map cannot show it.';
    return;
  }

  try {
    const response = await api.get(`/map/${postalCode}`);
    const data = response.data;

    if (data.results && data.results.length > 0) {
      // OneMap returns the most relevant matching location details at index 0
      const result = data.results[0];
      const lat = parseFloat(result.LATITUDE);
      const lng = parseFloat(result.LONGITUDE);
      const address = result.ADDRESS;

      // 2. Remove previous marker if it exists to keep map clear
      if (currentMarker.value) {
        map.value.removeLayer(currentMarker.value);
      }

      // 3. Drop a new marker at the geocoded coordinates and bind a popup window
      currentMarker.value = L.marker([lat, lng])
        .addTo(map.value)
        .bindPopup(`<b>${escapeHtml(result.BUILDING || 'Location')}</b><br>${escapeHtml(address)}`)
        .openPopup();

      // 4. Pan and zoom smoothly to focus directly onto the pinned area
      map.value.setView([lat, lng], 17);
    } else {
      mapMessage.value = 'OneMap found no location for this postal code.';
    }
  } catch (error) {
    console.error('Failed to geocode postal code via OneMap:', error);
    mapMessage.value = 'The map could not load this address right now.';
  }
}

</script>

<template>
  <div ref="mapContainer" class="onemap" role="region" aria-label="Map of the company address"></div>
  <p v-if="mapMessage" class="text-muted small mt-2" role="status">{{ mapMessage }}</p>
  <br>
  <button class="btn btn-outline-primary" id="pinPostalCodeBtn" @click="pinPostalCode">Reset map</button>
</template>

<style scoped>

</style>
