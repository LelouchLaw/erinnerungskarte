<template>
  <div ref="el" class="map"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import L from 'leaflet'

// Referenz auf das DOM-Element der Karte
const el = ref(null)
let map

// Leaflet-Karte initialisieren
onMounted(() => {
  map = L.map(el.value).setView([52.52, 13.405], 5)

  // OpenStreetMap-Kachel-Layer hinzufügen
  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png',
    {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 19,
    }
  ).addTo(map)

  // Sicherheitsnetz: Größe nach erstem Render neu messen
  setTimeout(() => map.invalidateSize(), 0)
})

// Public API für den Elternteil (Komponenten-Ref):
function setView(lat, lng, zoom = 12) {
  if (map) map.setView([lat, lng], zoom)
}

// Parent kann später mapRef.value.setView(...) aufrufen
defineExpose({ setView })

onBeforeUnmount(() => {
  // Aufräumen (gut für Hot-Reload und spätere Routenwechsel)
  if (map) { map.remove(); map = null }
})
</script>

<style scoped>
.map { height: calc(100vh - 56px); width: 100%; }
</style>
