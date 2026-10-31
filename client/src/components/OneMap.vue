<!-- youtube tutorial: https://www.youtube.com/watch?v=_c4z1GeKi_4 -->
<!-- OneMap WMS doc: https://www.onemap.gov.sg/docs/maps/ -->

<script setup>
import { ref } from 'vue';
import L from 'leaflet';
import axios from 'axios'
import constantUrls from '../../constants/urls.js';

const serverUrl = constantUrls.serverUrl;
const props = defineProps(['address']);
let currentMarker = ref()

// Explicitly expose function to the parent
defineExpose({
  initialiseOneMap,
  pinPostalCode
})

// const lat = ref(0);
// const lng = ref(0);

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
    attribution: '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;"/>&nbsp;<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>&nbsp;&copy;&nbsp;contributors&nbsp;&#124;&nbsp;<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>'
  }).addTo(map.value);
}

// Programmatically fetch coordinates from OneMap API and update the map marker
async function pinPostalCode() {
  // console.log(props.address);
  let addressArray = props.address?.split(' ');
  let postalCode = addressArray[addressArray.length - 1];
  // console.log(postalCode);

  if (!postalCode || postalCode.length !== 6) {
    alert('Invalid 6-digit postal code.');
    return;
  }

  try {
    const response = await axios.get(`${serverUrl}/map/${postalCode}`);
    // console.log(response.data);
    const data = response.data;
    // const data = await response.json();

    if (data.results && data.results.length > 0) {
      // OneMap returns the most relevant matching location details at index 0
      const result = data.results[0];
      const lat = parseFloat(result.LATITUDE);
      const lng = parseFloat(result.LONGITUDE);
      const address = result.ADDRESS;

      // 2. Remove previous marker if it exists to keep map clear
      if (currentMarker.value) {
        map.value.removeLayer(currentMarker);
      }

      // 3. Drop a new marker at the geocoded coordinates and bind a popup window
      currentMarker.value = L.marker([lat, lng])
        .addTo(map.value)
        .bindPopup(`<b>${result.BUILDING || 'Location'}</b><br>${address}`)
        .openPopup();

      // 4. Pan and zoom smoothly to focus directly onto the pinned area
      map.value.setView([lat, lng], 17);
    } else {
      alert('No matching location found for this postal code.');
    }
  } catch (error) {
    console.error('Failed to geocode postal code via OneMap:', error);
  }
}

// function getLocation() {
//   if (navigator.geolocation) {
//     navigator.geolocation.getCurrentPosition((position) => {
//       lat.value = position.coords.latitude;
//       lng.value = position.coords.longitude;
//     })
//   }
// }

</script>

<template>
  <!-- <div ref="mapContainer" style="width: 100vw; height: 100vh"></div> -->
  <div ref="mapContainer" style="width: 75vw; height: 75vh"></div>
  <br>
  <button class="btn btn-outline-primary" id="pinPostalCodeBtn" @click="pinPostalCode">Reset map</button>
</template>

<style scoped>

</style>
