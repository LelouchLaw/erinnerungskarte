<template>
  <AppHeader @search="onSearch" />
  <MapCanvas ref="mapRef" />
</template>

<script setup>
import { ref } from 'vue'
import AppHeader from './components/AppHeader.vue'
import MapCanvas from './components/MapCanvas.vue'

const mapRef = ref(null)

async function onSearch(text) {
  try {
    const query = String(text ?? '').trim()
    if (!query) return
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=de&format=json`
    const res = await fetch(url)
    if (!res.ok) {
      alert('Die Suche ist gerade nicht erreichbar.')
      return
    }
    const data = await res.json()
    const hit = data?.results?.[0]
    if (!hit) {
      alert(`Kein Treffer für: ${query}`)
      return
    }
    mapRef.value?.setView(hit.latitude, hit.longitude, 12)
  } catch {
    alert('Netzwerkfehler? Bitte später erneut versuchen.')
  }
}
</script>
