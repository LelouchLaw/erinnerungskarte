<template>
<AppHeader
  :suggestions="suggestions"
  @input="onHeaderInput"
  @select="onSelectSuggestion"
  @search="onSearch"
  @open-album="showAlbumModal = true"
/>
  <MapCanvas ref="mapRef" />
</template>

<script setup>
import { ref } from 'vue'
import AppHeader from './components/AppHeader.vue'
import MapCanvas from './components/MapCanvas.vue'

const suggestions = ref([])   // [{ name, country, latitude, longitude }, ...]
const query = ref('')         // letzter getippter Text

const mapRef = ref(null)

async function onSearch(text) {
  // 1) falls schon Vorschläge da: ersten nehmen
  if (suggestions.value.length > 0) {
    const first = suggestions.value[0]
    suggestions.value = []
    mapRef.value?.setView(first.latitude, first.longitude, 12)
    return
  }

  // 2) sonst dein bisheriger 1-Treffer-Fetch
  try {
    const query = String(text ?? '').trim()
    if (!query) return
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=de&format=json`
    const res = await fetch(url)
    if (!res.ok) return
    const data = await res.json()
    const hit = data?.results?.[0]
    if (!hit) return
    mapRef.value?.setView(hit.latitude, hit.longitude, 12)
  } catch { /* still */ }
}




const showAlbumModal = ref(false) // wir nutzen es später fürs Modal

let debounceId = null

function onHeaderInput(text) {
  query.value = String(text ?? '')
  clearTimeout(debounceId)
  debounceId = setTimeout(() => {
    fetchSuggestions(query.value)
  }, 250)
}
async function fetchSuggestions(text) {
  const q = String(text ?? '').trim()
  if (!q) { suggestions.value = []; return }

  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(q)}` +
    `&count=5&language=de&format=json`

  try {
    const res = await fetch(url)
    if (!res.ok) { suggestions.value = []; return }

    const data = await res.json()
    const list = Array.isArray(data?.results) ? data.results : []

    // auf das Nötige reduzieren
    suggestions.value = list.map(r => ({
      name: r.name,
      country: r.country ?? '',
      latitude: r.latitude,
      longitude: r.longitude,
    }))
  } catch {
    suggestions.value = []
  }
}
function onSelectSuggestion(item) {
  suggestions.value = []
  if (!item) return
  mapRef.value?.setView(item.latitude, item.longitude, 12)
}

</script>
