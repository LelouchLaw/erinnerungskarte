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

      <!-- Klick-Koordinaten Overlay -->
      <div class="overlay" v-if="lastClick">
        <div class="overlay-title">Letzter Klick</div>
        <div class="overlay-text">
          lat: {{ formatNumber(lastClick.lat) }}<br />
          lng: {{ formatNumber(lastClick.lng) }}
        </div>
      </div>

      <!-- Pin Formular -->
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

        <!-- Echter Upload -->
        <div class="pin-form-row">
          <div class="pin-form-label">Medien hochladen (Foto/Video)</div>

          <input
            class="pin-input"
            type="file"
            multiple
            accept="image/*,video/*"
            @change="onFilesSelected"
          />

          <div class="media-list" v-if="selectedFiles.length > 0">
            <div class="media-item" v-for="(f, i) in selectedFiles" :key="i">
              <div class="media-text">
                <span class="badge">{{ fileTypeLabel(f.type) }}</span>
                <span class="url">{{ f.name }}</span>
              </div>
              <button class="btn small secondary" @click="removeSelectedFile(i)">
                Entfernen
              </button>
            </div>
          </div>

          <div class="media-hint" v-if="selectedFiles.length > 0">
            Hinweis: Dateien werden im Browser (IndexedDB) gespeichert.
          </div>
        </div>

        <div class="pin-form-actions">
          <button class="btn" @click="savePin" :disabled="isSaving">
            {{ isSaving ? 'Speichern…' : 'Speichern' }}
          </button>
          <button class="btn secondary" @click="cancelPin" :disabled="isSaving">
            Abbrechen
          </button>
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
import { saveMediaFile } from '../services/mediaDb'

var route = useRoute()
var pinsStore = usePinsStore()

var suggestions = ref([])
var query = ref('')
var mapRef = ref(null)
var showAlbumModal = ref(false)

var debounceId = null

// Klick overlay
var lastClick = ref(null)

// Für Pin-Erstellung
var selectedLatLng = ref(null)
var isFormOpen = ref(false)
var formDescription = ref('')
var formDate = ref('')
var formError = ref('')

// Upload state
var selectedFiles = ref([])
var isSaving = ref(false)

onMounted(function () {
  // 1) Pins laden
  pinsStore.loadPins()

  // 2) Marker rendern
  if (mapRef.value && mapRef.value.renderAllPins) {
    mapRef.value.renderAllPins(pinsStore.pins)
  }

  // 3) Falls /map?pinId=... gesetzt ist -> Pin fokussieren
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

  // Formular öffnen + Felder reset
  isFormOpen.value = true
  formError.value = ''
  formDescription.value = ''
  formDate.value = ''
  selectedFiles.value = []
}

function onFilesSelected(event) {
  var files = event && event.target && event.target.files ? event.target.files : null
  if (!files) return

  var arr = []
  var i
  for (i = 0; i < files.length; i = i + 1) {
    arr.push(files[i])
  }

  selectedFiles.value = arr
}

function removeSelectedFile(index) {
  selectedFiles.value.splice(index, 1)
}

function fileTypeLabel(mime) {
  var t = String(mime || '')
  if (t.indexOf('image/') === 0) return 'image'
  if (t.indexOf('video/') === 0) return 'video'
  return 'file'
}

async function savePin() {
  if (isSaving.value) return

  var desc = String(formDescription.value ?? '').trim()
  if (!desc) {
    formError.value = 'Bitte gib eine Beschreibung ein.'
    return
  }
  if (!selectedLatLng.value) {
    formError.value = 'Kein Ort ausgewählt.'
    return
  }

  isSaving.value = true
  formError.value = ''

  try {
    var lat = selectedLatLng.value.lat
    var lng = selectedLatLng.value.lng

    // 1) Upload in IndexedDB -> Media Refs sammeln
    var mediaRefs = []
    var i
    for (i = 0; i < selectedFiles.value.length; i = i + 1) {
      var file = selectedFiles.value[i]

      // einfache Größenbegrenzung (MVP)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('Eine Datei ist größer als 50MB. Bitte kleinere Datei wählen.')
      }

      var meta = await saveMediaFile(file)

      var mime = String(meta.mime || '')
      var type = 'file'
      if (mime.indexOf('image/') === 0) type = 'image'
      if (mime.indexOf('video/') === 0) type = 'video'

      mediaRefs.push({
        id: meta.id,
        type: type,
        mime: meta.mime,
        name: meta.name
      })
    }

    // 2) Pin erzeugen (mit mediaRefs)
    var pin = createPin(lat, lng, desc, formDate.value, mediaRefs)

    // 3) Pin speichern (Pinia + LocalStorage)
    pinsStore.addPin(pin)

    // 4) Marker neu rendern
    if (mapRef.value && mapRef.value.renderAllPins) {
      mapRef.value.renderAllPins(pinsStore.pins)
    }

    // 5) Preview weg + UI reset
    if (mapRef.value && mapRef.value.clearPreviewMarker) {
      mapRef.value.clearPreviewMarker()
    }

    isFormOpen.value = false
    selectedLatLng.value = null
    formDescription.value = ''
    formDate.value = ''
    selectedFiles.value = []
  } catch (e) {
    formError.value = e && e.message ? e.message : 'Speichern fehlgeschlagen.'
  } finally {
    isSaving.value = false
  }
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
  selectedFiles.value = []
}

function createPin(lat, lng, description, dateValue, mediaArray) {
  var id = crypto.randomUUID()
  var latitude = Number(lat)
  var longitude = Number(lng)
  var text = String(description).trim()

  var d = String(dateValue ?? '').trim()
  if (!d) d = null

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
  width: 380px;
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
  max-width: 200px;
}

.media-hint {
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.8;
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
