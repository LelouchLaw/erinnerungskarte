<template>
  <div>
    <AppHeader
      :suggestions="suggestions"
      @input="onHeaderInput"
      @select="onSelectSuggestion"
      @search="onSearch"
      @open-album="showAlbumModal = true"
    />

    <div class="map-wrap">
      <MapCanvas ref="mapRef" @map-click="onMapClick" />

      <div class="overlay" v-if="lastClick">
        <div class="overlay-title">Letzter Klick</div>
        <div class="overlay-text">
          lat: {{ formatNumber(lastClick.lat) }}<br />
          lng: {{ formatNumber(lastClick.lng) }}
        </div>
      </div>

      <!-- Formular Overlay -->
      <div class="pin-form" v-if="isFormOpen">
        <div class="pin-form-title">Neuer Pin</div>

        <div class="pin-form-row">
          <div class="pin-form-label">Beschreibung (Pflicht)</div>
          <input
            class="pin-input"
            type="text"
            v-model="formDescription"
            placeholder="z. B. Sonnenuntergang am Strand"
          />
        </div>

        <div class="pin-form-row">
          <div class="pin-form-label">Datum (optional)</div>
          <input class="pin-input" type="date" v-model="formDate" />
        </div>

        <!-- Medien (neu) -->
        <div class="pin-form-row">
          <div class="pin-form-label">Medium hinzufügen (URL)</div>

          <div class="media-add">
            <select class="pin-input small" v-model="mediaType">
              <option value="image">Bild</option>
              <option value="video">Video</option>
            </select>

            <input
              class="pin-input"
              type="text"
              v-model="mediaUrl"
              placeholder="https://..."
            />

            <button class="btn small" @click="addMediaUrl">Hinzufügen</button>
          </div>

          <div class="media-list" v-if="mediaList.length > 0">
            <div class="media-item" v-for="(m, i) in mediaList" :key="i">
              <div class="media-text">
                <span class="badge">{{ m.type }}</span>
                <span class="url">{{ m.url }}</span>
              </div>
              <button class="btn small secondary" @click="removeMedia(i)">Entfernen</button>
            </div>
          </div>
        </div>

        <div class="pin-form-actions">
          <button class="btn" @click="savePin">Speichern</button>
          <button class="btn secondary" @click="cancelPin">Abbrechen</button>
        </div>

        <div class="pin-form-hint" v-if="formError">
          {{ formError }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import MapCanvas from '../components/MapCanvas.vue'
import { usePinsStore } from '../stores/pinsStore.js'

var route = useRoute()
var pinsStore = usePinsStore()

var suggestions = ref([])
var query = ref('')
var mapRef = ref(null)
var showAlbumModal = ref(false)

var debounceId = null

var lastClick = ref(null)

var selectedLatLng = ref(null)
var isFormOpen = ref(false)
var formDescription = ref('')
var formDate = ref('')
var formError = ref('')

// Medien-State (neu)
var mediaType = ref('image')
var mediaUrl = ref('')
var mediaList = ref([]) // [{ type, url }, ...]

onMounted(function () {
  pinsStore.loadPins()

  if (mapRef.value && mapRef.value.renderAllPins) {
    mapRef.value.renderAllPins(pinsStore.pins)
  }

  focusPinFromRoute()
})

function focusPinFromRoute() {
  var pinId = route.query && route.query.pinId ? String(route.query.pinId) : ''
  if (!pinId) return

  var pin = pinsStore.getPinById(pinId)
  if (!pin) return

  if (mapRef.value && mapRef.value.focusPin) {
    mapRef.value.focusPin(pin)
  }
}

function onMapClick(payload) {
  lastClick.value = payload
  selectedLatLng.value = payload

  if (mapRef.value && mapRef.value.setPreviewMarker) {
    mapRef.value.setPreviewMarker(payload.lat, payload.lng)
  }

  // Formular öffnen + reset
  isFormOpen.value = true
  formError.value = ''
  formDescription.value = ''
  formDate.value = ''

  mediaType.value = 'image'
  mediaUrl.value = ''
  mediaList.value = []
}

function addMediaUrl() {
  var url = String(mediaUrl.value ?? '').trim()
  if (!url) return

  // Minimalprüfung: muss wie URL aussehen (sehr grob)
  if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) {
    formError.value = 'Bitte eine URL mit http:// oder https:// eingeben.'
    return
  }

  formError.value = ''

  mediaList.value.push({
    type: String(mediaType.value),
    url: url
  })

  mediaUrl.value = ''
}

function removeMedia(index) {
  mediaList.value.splice(index, 1)
}

function savePin() {
  var desc = String(formDescription.value ?? '').trim()
  if (!desc) {
    formError.value = 'Bitte gib eine Beschreibung ein.'
    return
  }
  if (!selectedLatLng.value) {
    formError.value = 'Kein Ort ausgewählt.'
    return
  }

  var lat = selectedLatLng.value.lat
  var lng = selectedLatLng.value.lng

  var pin = createPin(lat, lng, desc, formDate.value, mediaList.value)

  pinsStore.addPin(pin)

  if (mapRef.value && mapRef.value.renderAllPins) {
    mapRef.value.renderAllPins(pinsStore.pins)
  }

  if (mapRef.value && mapRef.value.clearPreviewMarker) {
    mapRef.value.clearPreviewMarker()
  }

  isFormOpen.value = false
  selectedLatLng.value = null
  formDescription.value = ''
  formDate.value = ''
  formError.value = ''

  mediaType.value = 'image'
  mediaUrl.value = ''
  mediaList.value = []
}

function cancelPin() {
  if (mapRef.value && mapRef.value.clearPreviewMarker) {
    mapRef.value.clearPreviewMarker()
  }

  isFormOpen.value = false
  selectedLatLng.value = null
  formDescription.value = ''
  formDate.value = ''
  formError.value = ''

  mediaType.value = 'image'
  mediaUrl.value = ''
  mediaList.value = []
}

function createPin(lat, lng, description, dateValue, mediaArray) {
  var id = crypto.randomUUID()
  var latitude = Number(lat)
  var longitude = Number(lng)
  var text = String(description).trim()

  var d = String(dateValue ?? '').trim()
  if (!d) d = null

  // mediaArray sollte eine Liste sein
  var media = Array.isArray(mediaArray) ? mediaArray : []

  return {
    id: id,
    lat: latitude,
    lng: longitude,
    description: text,
    date: d,
    media: media
  }
}

function formatNumber(n) {
  return Number(n).toFixed(5)
}

/* Suche / Suggestions */
function onHeaderInput(text) {
  query.value = String(text ?? '')
  clearTimeout(debounceId)
  debounceId = setTimeout(function () {
    fetchSuggestions(query.value)
  }, 250)
}

function onSelectSuggestion(item) {
  suggestions.value = []
  if (!item) return
  if (mapRef.value && mapRef.value.setView) {
    mapRef.value.setView(item.latitude, item.longitude, 12)
  }
}

async function onSearch(text) {
  if (suggestions.value.length > 0) {
    var first = suggestions.value[0]
    suggestions.value = []
    if (mapRef.value && mapRef.value.setView) {
      mapRef.value.setView(first.latitude, first.longitude, 12)
    }
    return
  }

  try {
    var q = String(text ?? '').trim()
    if (!q) return

    var url =
      'https://geocoding-api.open-meteo.com/v1/search' +
      '?name=' + encodeURIComponent(q) +
      '&count=1&language=de&format=json'

    var res = await fetch(url)
    if (!res.ok) return

    var data = await res.json()
    var hit = data && data.results && data.results[0]
    if (!hit) return

    if (mapRef.value && mapRef.value.setView) {
      mapRef.value.setView(hit.latitude, hit.longitude, 12)
    }
  } catch (e) {
    // still
  }
}

async function fetchSuggestions(text) {
  var q = String(text ?? '').trim()
  if (!q) {
    suggestions.value = []
    return
  }

  var url =
    'https://geocoding-api.open-meteo.com/v1/search' +
    '?name=' + encodeURIComponent(q) +
    '&count=5&language=de&format=json'

  try {
    var res = await fetch(url)
    if (!res.ok) {
      suggestions.value = []
      return
    }

    var data = await res.json()
    var list = Array.isArray(data && data.results) ? data.results : []

    suggestions.value = list.map(function (r) {
      return {
        name: r.name,
        country: r.country ?? '',
        latitude: r.latitude,
        longitude: r.longitude
      }
    })
  } catch (e) {
    suggestions.value = []
  }
}
</script>

<style scoped>
.map-wrap { position: relative; }

/* Klick Overlay */
.overlay {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 4000;
  background: rgba(14, 20, 42, 0.92);
  border: 1px solid rgba(43, 55, 99, 0.9);
  border-radius: 12px;
  padding: 10px 12px;
  color: #e8eefc;
  min-width: 180px;
  box-shadow: 0 12px 24px rgba(0,0,0,.35);
}
.overlay-title { font-size: 12px; opacity: 0.85; margin-bottom: 6px; }
.overlay-text { font-size: 13px; line-height: 1.35; }

/* Pin-Form Overlay */
.pin-form {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 4500;
  width: 360px;
  background: rgba(14, 20, 42, 0.96);
  border: 1px solid rgba(43, 55, 99, 0.9);
  border-radius: 14px;
  padding: 12px;
  color: #e8eefc;
  box-shadow: 0 12px 24px rgba(0,0,0,.35);
}
.pin-form-title { font-size: 14px; margin-bottom: 10px; }
.pin-form-row { margin-bottom: 10px; }
.pin-form-label { font-size: 12px; opacity: 0.85; margin-bottom: 6px; }

.pin-input {
  width: 100%;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #2b3763;
  background: #121a33;
  color: #e8eefc;
  padding: 0 10px;
  outline: none;
}
.pin-input.small {
  width: 90px;
  flex: 0 0 90px;
}

.media-add {
  display: flex;
  gap: 8px;
  align-items: center;
}

.media-list {
  margin-top: 10px;
  display: grid;
  gap: 8px;
}

.media-item {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 8px;
  border: 1px solid #2b3763;
  border-radius: 12px;
  background: rgba(18, 26, 51, 0.6);
}

.media-text {
  display: flex;
  gap: 8px;
  align-items: center;
  overflow: hidden;
}

.badge {
  font-size: 11px;
  border: 1px solid #2b3763;
  border-radius: 999px;
  padding: 2px 8px;
  opacity: 0.9;
}

.url {
  font-size: 12px;
  opacity: 0.9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.pin-form-actions { display: flex; gap: 8px; margin-top: 6px; }

.btn {
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid #2b3763;
  background: #1a2447;
  color: #e8eefc;
  cursor: pointer;
}
.btn.secondary { background: transparent; }
.btn.small { height: 32px; padding: 0 10px; }

.pin-form-hint { margin-top: 10px; font-size: 12px; color: #ffd1d1; }
</style>
