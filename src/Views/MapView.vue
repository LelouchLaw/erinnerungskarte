<!-- src/views/MapView.vue -->
<template>
  <div>
    <div class="map-wrap">
      <div class="map-filter">
        <div class="map-filter-label">Album-Filter</div>
        <select class="pin-input" v-model="selectedTripFilterId" @change="rerenderPins">
          <option value="">Alle</option>
          <option v-for="t in tripsStore.trips" :key="t.id" :value="t.id">
            {{ t.name }}
          </option>
        </select>
      </div>

      <MapCanvas
        ref="mapRef"
        @map-click="onMapClick"
        @pin-click="openPinDetails"
      />

      <!-- Pin Formular -->
      <div class="pin-form" v-if="isFormOpen">
        <div class="pin-form-title">Neuer Pin</div>

        <div class="pin-form-row">
          <div class="pin-form-label">Titel (Pflicht)</div>
          <input class="pin-input" type="text" v-model="formTitle" placeholder="z. B. Rom – Tag 1" />
        </div>

        <div class="pin-form-row">
          <div class="pin-form-label">Beschreibung (Pflicht)</div>
          <input class="pin-input" type="text" v-model="formDescription" placeholder="z. B. Sonnenuntergang am Strand" />
        </div>

        <div class="pin-form-row">
          <div class="pin-form-label">Datum (optional)</div>
          <input class="pin-input" type="date" v-model="formDate" />
        </div>

        <div class="pin-form-row">
          <div class="pin-form-label">Album</div>
          <select class="pin-input" v-model="formTripId">
            <option value="">Kein Album</option>
            <option v-for="t in tripsStore.trips" :key="t.id" :value="t.id">
              {{ t.name }}
            </option>
          </select>
        </div>

        <div class="pin-form-row">
          <div class="pin-form-label">Medien hochladen (Foto/Video)</div>
          <input class="pin-input" type="file" multiple accept="image/*,video/*" @change="onFilesSelected" />

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
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MapCanvas from '../components/MapCanvas.vue'
import { usePinsStore } from '../stores/pinsStore.js'
import { saveMediaFile } from '../services/mediaDb'
import { useTripsStore } from '../stores/tripsStore'
import { useUiStore } from '../stores/uiStore'

var tripsStore = useTripsStore()
var pinsStore = usePinsStore()
var ui = useUiStore()

var route = useRoute()
var router = useRouter()

var mapRef = ref(null)

// Pin-Erstellung
var selectedLatLng = ref(null)
var isFormOpen = ref(false)

var formTitle = ref('')
var formDescription = ref('')
var formDate = ref('')
var formTripId = ref('')
var formError = ref('')

// Upload state
var selectedFiles = ref([])
var isSaving = ref(false)

// Filter state
var selectedTripFilterId = ref('')

onMounted(function () {
  pinsStore.loadPins()
  tripsStore.loadTrips()

  applyAlbumFromRoute()

  if (mapRef.value && mapRef.value.renderAllPins) {
    mapRef.value.renderAllPins(filteredPins.value)
  }

  focusPinFromRoute()
})

function applyAlbumFromRoute() {
  var albumId = route.query && route.query.albumId ? String(route.query.albumId) : ''
  if (!albumId) return

  var exists = tripsStore.trips.some(function (t) {
    return String(t.id) === albumId
  })
  if (!exists) return

  formTripId.value = albumId
}

watch(
  function () {
    return ui.mapSelectedLocation
  },
  function (loc) {
    if (!loc) return
    if (mapRef.value && mapRef.value.setView) {
      mapRef.value.setView(loc.latitude, loc.longitude, 12)
    }
    ui.setMapSuggestions([])
  }
)

var filteredPins = computed(function () {
  var all = pinsStore.pins
  var t = String(selectedTripFilterId.value ?? '').trim()
  if (!t) return all

  return all.filter(function (p) {
    return String(p.tripId ?? '') === t
  })
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

function openPinDetails(id) {
  if (!id) return
  router.push({ path: '/pin/' + String(id) })
}

function onMapClick(payload) {
  selectedLatLng.value = payload

  if (mapRef.value && mapRef.value.setPreviewMarker) {
    mapRef.value.setPreviewMarker(payload.lat, payload.lng)
  }

  isFormOpen.value = true
  formError.value = ''

  formTitle.value = ''
  formDescription.value = ''
  formDate.value = ''
  selectedFiles.value = []

  var albumId = route.query && route.query.albumId ? String(route.query.albumId) : ''
  formTripId.value = albumId ? albumId : ''
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

  var title = String(formTitle.value ?? '').trim()
  if (!title) {
    formError.value = 'Bitte gib einen Titel ein.'
    return
  }

  var desc = String(formDescription.value ?? '').trim()
  if (!desc) {
    formError.value = 'Bitte gib eine Beschreibung ein.'
    return
  }

  if (!selectedLatLng.value) {
    formError.value = 'Kein Ort ausgewählt.'
    return
  }

  if (!selectedFiles.value || selectedFiles.value.length === 0) {
    formError.value = 'Bitte mindestens ein Foto oder Video hochladen.'
    return
  }

  isSaving.value = true
  formError.value = ''

  try {
    var lat = selectedLatLng.value.lat
    var lng = selectedLatLng.value.lng

    var mediaRefs = []
    var i
    for (i = 0; i < selectedFiles.value.length; i = i + 1) {
      var file = selectedFiles.value[i]
      if (!file) continue

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

    if (mediaRefs.length === 0) {
      throw new Error('Upload fehlgeschlagen. Keine Dateien gespeichert.')
    }

    var pin = createPin(lat, lng, title, desc, formDate.value, mediaRefs)
    pinsStore.addPin(pin)

    if (mapRef.value && mapRef.value.renderAllPins) {
      mapRef.value.renderAllPins(filteredPins.value)
    }

    if (mapRef.value && mapRef.value.focusPin) {
      mapRef.value.focusPin(pin)
    }

    if (mapRef.value && mapRef.value.clearPreviewMarker) {
      mapRef.value.clearPreviewMarker()
    }

    isFormOpen.value = false
    selectedLatLng.value = null
    formTitle.value = ''
    formDescription.value = ''
    formDate.value = ''
    selectedFiles.value = []

    var albumId = route.query && route.query.albumId ? String(route.query.albumId) : ''
    formTripId.value = albumId ? albumId : ''
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
  formTitle.value = ''
  formDescription.value = ''
  formDate.value = ''
  formError.value = ''
  selectedFiles.value = []

  var albumId = route.query && route.query.albumId ? String(route.query.albumId) : ''
  formTripId.value = albumId ? albumId : ''
}

function createPin(lat, lng, title, description, dateValue, mediaArray) {
  var id = crypto.randomUUID()

  var t = String(title ?? '').trim()
  var text = String(description ?? '').trim()

  var d = String(dateValue ?? '').trim()
  if (!d) d = null

  var media = Array.isArray(mediaArray) ? mediaArray : []

  return {
    id: id,
    lat: Number(lat),
    lng: Number(lng),
    title: t,
    description: text,
    date: d,
    tripId: formTripId.value ? String(formTripId.value) : null,
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    visibility: 'private',
    media: media
  }
}

function rerenderPins() {
  if (mapRef.value && mapRef.value.renderAllPins) {
    mapRef.value.renderAllPins(filteredPins.value)
  }
}
</script>

<style scoped>
.map-wrap {
  position: relative;
}

/* Pin-Form Overlay */
.pin-form {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 4500;
  width: 380px;
  max-width: calc(100vw - 24px);

  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px;
  color: var(--fg);

  box-shadow: 0 12px 24px var(--shadow);
}

.pin-form-title {
  font-size: 14px;
  margin-bottom: 10px;
  font-weight: 700;
}

.pin-form-row {
  margin-bottom: 10px;
}

.pin-form-label {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 6px;
}

.pin-input {
  width: 100%;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--panel-2);
  color: var(--fg);
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
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--panel-2);
}

.media-text {
  display: flex;
  gap: 8px;
  align-items: center;
  overflow: hidden;
}

.badge {
  font-size: 11px;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 2px 8px;
  color: var(--fg);
  opacity: 0.9;
}

.url {
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.media-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--muted);
}

.pin-form-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.btn {
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--btn);
  color: var(--fg);
  cursor: pointer;
}

.btn:hover {
  background: var(--btn-hover);
}

.btn.secondary {
  background: transparent;
}

.btn.secondary:hover {
  background: var(--panel-2);
}

.btn.small {
  height: 32px;
  padding: 0 10px;
}

.pin-form-hint {
  margin-top: 10px;
  font-size: 12px;
  color: var(--danger-fg);
}

/* Filter */
.map-filter {
  position: absolute;
  left: 12px;
  top: 12px;
  z-index: 5000;
  width: 220px;

  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  color: var(--fg);

  box-shadow: 0 12px 24px var(--shadow);
}

.map-filter-label {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 6px;
}
</style>
