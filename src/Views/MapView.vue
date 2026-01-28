
<template>
  <div>
    <div class="map-wrap">
      <!-- Filter -->
      <div class="map-filter">
        <div class="map-filter-label">Album-Filter</div>
        <select class="pin-input" v-model="selectedTripFilterId" @change="rerenderPins">
          <option value="">Alle</option>
          <option v-for="t in tripsStore.trips" :key="t.id" :value="t.id">
            {{ t.name }}
          </option>
        </select>
      </div>

      <MapCanvas ref="mapRef" @map-click="onMapClick" @pin-click="openPinDetails" />

      <!-- Pin Formular -->
      <div class="pin-form" v-if="isFormOpen">
        <div class="pin-form-title">Neuer Pin</div>

        <!-- Fehlerbox: bleibt im Formular -->
        <div class="form-error" v-if="formError">
          {{ formError }}
        </div>

        <div class="pin-form-body">
          <div class="pin-form-row">
            <div class="pin-form-label">Titel <span class="req">(Pflicht)</span></div>
            <input
              class="pin-input"
              type="text"
              v-model="formTitle"
              placeholder="z. B. Rom – Tag 1"
            />
          </div>

          <div class="pin-form-row">
            <div class="pin-form-label">Beschreibung <span class="opt">(optional)</span></div>
            <input
              class="pin-input"
              type="text"
              v-model="formDescription"
              placeholder="z. B. Sonnenuntergang am Strand"
            />
          </div>

          <div class="pin-form-row">
            <div class="pin-form-label">Zeitraum <span class="opt">(optional)</span></div>

            <div class="date-grid">
              <div class="date-field">
                <div class="date-label">Von</div>
                <input class="pin-input date" type="date" v-model="formDateFrom" />
              </div>

              <div class="date-field">
                <div class="date-label">Bis</div>
                <input class="pin-input date" type="date" v-model="formDateTo" />
              </div>
            </div>

            <div class="date-hint">
              Tipp: Du kannst auch nur „Von“ setzen (z. B. einzelner Tag).
            </div>
          </div>

          <div class="pin-form-row">
            <div class="pin-form-label">Album</div>

            <div class="album-row">
              <select class="pin-input" v-model="formTripId">
                <option value="">Kein Album</option>
                <option v-for="t in tripsStore.trips" :key="t.id" :value="t.id">
                  {{ t.name }}
                </option>
              </select>

              <button class="btnx secondary" type="button" @click="openInlineAlbumCreate">
                + Neues Album
              </button>
            </div>

            <div class="album-create" v-if="isAlbumCreateOpen">
              <input
                class="pin-input"
                type="text"
                v-model="newAlbumName"
                placeholder="Album-Name (z. B. Italien 2025)"
                @keydown.enter.prevent="createAlbumInline"
              />

              <div class="album-create-actions">
                <button class="btnx" type="button" @click="createAlbumInline">Erstellen</button>
                <button class="btnx secondary" type="button" @click="closeInlineAlbumCreate">
                  Abbrechen
                </button>
              </div>

              <div class="album-create-hint" v-if="albumCreateError">
                {{ albumCreateError }}
              </div>
            </div>
          </div>

          <div class="pin-form-row">
            <div class="pin-form-label">Medien hochladen <span class="req">(Pflicht)</span></div>

            <input
              class="pin-input file"
              type="file"
              multiple
              accept="image/*,video/*"
              @change="onFilesSelected"
            />

            <div class="media-list" v-if="selectedFiles.length > 0">
              <div class="media-item" v-for="(f, i) in selectedFiles" :key="i">
                <div class="media-text">
                  <span class="badge">{{ fileTypeLabel(f.type) }}</span>
                  <span class="filename">{{ f.name }}</span>
                </div>
                <button class="btnx small secondary" type="button" @click="removeSelectedFile(i)">
                  Entfernen
                </button>
              </div>
            </div>

            <div class="media-hint" v-if="selectedFiles.length > 0">
              Hinweis: Dateien werden im Browser (IndexedDB) gespeichert.
            </div>
          </div>
        </div>

        <div class="pin-form-actions">
          <button class="btnx" type="button" @click="savePin" :disabled="isSaving">
            {{ isSaving ? 'Speichern…' : 'Speichern' }}
          </button>
          <button class="btnx secondary" type="button" @click="cancelPin" :disabled="isSaving">
            Abbrechen
          </button>
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
var formDateFrom = ref('') 
var formDateTo = ref('')     
var formTripId = ref('')
var formError = ref('')

// Upload state
var selectedFiles = ref([])
var isSaving = ref(false)

// Filter state
var selectedTripFilterId = ref('')

// Inline Album Create
var isAlbumCreateOpen = ref(false)
var newAlbumName = ref('')
var albumCreateError = ref('')

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
    return pinsStore.pins.map(function (p) {
      return String(p.id) + ':' + String(p.updatedAt) + ':' + String(p.coverMediaId ?? '')
    }).join('|')
  },
  function () {
    rerenderPins()
  }
)

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
  formDateFrom.value = ''   // ✅ reset
  formDateTo.value = ''     // ✅ reset
  selectedFiles.value = []

  var albumId = route.query && route.query.albumId ? String(route.query.albumId) : ''
  formTripId.value = albumId ? albumId : ''

  closeInlineAlbumCreate()
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
  if (t.indexOf('image/') === 0) return 'Bild'
  if (t.indexOf('video/') === 0) return 'Video'
  return 'Datei'
}

async function savePin() {
  if (isSaving.value) return

  var title = String(formTitle.value ?? '').trim()
  if (!title) {
    formError.value = 'Bitte gib einen Titel ein.'
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

    // Upload in IndexedDB -> Media Refs sammeln
    var mediaRefs = []
    var i
    for (i = 0; i < selectedFiles.value.length; i = i + 1) {
      var file = selectedFiles.value[i]
      if (!file) continue

      if (file.size > 50 * 1024 * 1024) {
        throw new Error('Eine Datei ist größer als 50 MB. Bitte kleinere Datei wählen.')
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

    var pin = createPin(
      lat,
      lng,
      title,
      formDescription.value,
      formDateFrom.value,
      formDateTo.value,
      mediaRefs
    )

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

    // reset UI
    isFormOpen.value = false
    selectedLatLng.value = null
    formTitle.value = ''
    formDescription.value = ''
    formDateFrom.value = ''
    formDateTo.value = ''
    selectedFiles.value = []

    var albumId = route.query && route.query.albumId ? String(route.query.albumId) : ''
    formTripId.value = albumId ? albumId : ''

    closeInlineAlbumCreate()
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
  formDateFrom.value = ''
  formDateTo.value = ''
  formError.value = ''
  selectedFiles.value = []

  var albumId = route.query && route.query.albumId ? String(route.query.albumId) : ''
  formTripId.value = albumId ? albumId : ''

  closeInlineAlbumCreate()
}

function createPin(lat, lng, title, description, dateFromValue, dateToValue, mediaArray) {
  var id = crypto.randomUUID()
  var latitude = Number(lat)
  var longitude = Number(lng)

  var t = String(title ?? '').trim()
  var text = String(description ?? '').trim()

  var from = String(dateFromValue ?? '').trim()
  var to = String(dateToValue ?? '').trim()
  if (!from) from = null
  if (!to) to = null

  // Reihenfolge sichern
  if (from && to && from > to) {
    var tmp = from
    from = to
    to = tmp
  }

  var media = Array.isArray(mediaArray) ? mediaArray : []

  return {
    id: id,
    lat: latitude,
    lng: longitude,
    title: t,
    description: text, // optional
    dateFrom: from,
    dateTo: to,
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

/* --- Inline Album Create --- */
function openInlineAlbumCreate() {
  isAlbumCreateOpen.value = true
  newAlbumName.value = ''
  albumCreateError.value = ''
}

function closeInlineAlbumCreate() {
  isAlbumCreateOpen.value = false
  newAlbumName.value = ''
  albumCreateError.value = ''
}

function createAlbumInline() {
  albumCreateError.value = ''
  var name = String(newAlbumName.value ?? '').trim()
  if (!name) {
    albumCreateError.value = 'Bitte einen Album-Namen eingeben.'
    return
  }

  var exists = tripsStore.trips.some(function (t) {
    return String(t.name ?? '').trim().toLowerCase() === name.toLowerCase()
  })
  if (exists) {
    albumCreateError.value = 'Ein Album mit diesem Namen existiert bereits.'
    return
  }

  var created = tripsStore.addTrip(name)
  if (!created) {
    albumCreateError.value = 'Album konnte nicht erstellt werden.'
    return
  }

  formTripId.value = String(created.id)
  closeInlineAlbumCreate()
}
</script>

<style scoped>
.map-wrap {
  position: relative;
}

/* Pin-Form Overlay */
.pin-form {
  position: absolute;
  right: 14px;
  bottom: 14px;
  z-index: 4500;

  width: 440px;
  max-width: calc(100vw - 28px);

  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 18px;
  color: var(--fg);

  box-shadow: 0 18px 40px var(--shadow);
  backdrop-filter: blur(10px);

  overflow: hidden; /* wichtig: Fehlerbox & Footer sauber */
}

.pin-form-title {
  padding: 14px 14px 10px 14px;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.2px;
}

.pin-form-body {
  padding: 0 14px 12px 14px;
  max-height: 62vh;
  overflow: auto;
}

.pin-form-row {
  margin-bottom: 12px;
}

.pin-form-label {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 6px;
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.req {
  color: var(--danger-fg);
  font-weight: 700;
}
.opt {
  opacity: 0.9;
}

.form-error {
  margin: 0 14px 10px 14px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--danger-border);
  background: var(--danger-bg);
  color: var(--danger-fg);
  font-size: 12px;
  line-height: 1.35;
}

/* Inputs */
.pin-input {
  width: 100%;
  height: 42px;
  border-radius: 12px;

  border: 1px solid var(--border);
  background: var(--panel-2);
  color: var(--fg);

  padding: 0 12px;
  outline: none;

  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.pin-input::placeholder {
  color: var(--muted);
  opacity: 0.9;
}

.pin-input:focus-visible {
  border-color: var(--focus);
  box-shadow: 0 0 0 4px var(--focus-shadow);
}

/* File input */
.pin-input.file {
  padding: 8px 12px;
  height: auto;
}
/* Wichtig gegen "läuft raus" */
.pin-input,
.btnx,
select,
input {
  box-sizing: border-box;
}

/* Inputs dürfen im Grid schrumpfen */
.pin-input {
  min-width: 0;
}

/* Zeitraum schöner: Labels + Abstand + gleiche Breite */
.date-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;              /* mehr Luft */
  align-items: start;
}

.date-col {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.date-label {
  font-size: 12px;
  color: var(--muted);
}

/* Modal/Form darf nie breiter als Screen werden */
.pin-form {
  max-width: min(520px, calc(100vw - 28px));
}

/* Zeitraum */
.date-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.date-field {
  min-width: 0;
}

.date-label {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 6px;
}

/* date input: icon sichtbar + Platz rechts */
.pin-input.date {
  padding-right: 44px;
}

/* WebKit Datepicker Icon: extra sichtbar im scoped Kontext */
:global(html[data-theme="dark"] input[type="date"]::-webkit-calendar-picker-indicator),
:global(html[data-theme="contrast"] input[type="date"]::-webkit-calendar-picker-indicator) {
  filter: invert(1) brightness(1.4);
  opacity: 0.9;
}

:global(html[data-theme="light"] input[type="date"]::-webkit-calendar-picker-indicator) {
  opacity: 0.75;
}

.date-hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
}

/* Album row */
.album-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
}

.album-create {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--panel-2) 70%, transparent);
}

.album-create-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.album-create-hint {
  margin-top: 10px;
  font-size: 12px;
  color: var(--danger-fg);
}

/* Medien list */
.media-list {
  margin-top: 10px;
  display: grid;
  gap: 8px;
}

.media-item {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--panel-2) 70%, transparent);
}

.media-text {
  display: flex;
  gap: 8px;
  align-items: center;
  overflow: hidden;
  min-width: 0;
}

.badge {
  font-size: 11px;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 3px 9px;
  background: color-mix(in srgb, var(--btn) 60%, transparent);
  opacity: 0.95;
}

.filename {
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.media-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--muted);
}

/* Actions: sticky footer */
.pin-form-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  padding: 12px 14px;
  border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--panel) 80%, transparent);
}

.btnx {
  height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--btn);
  color: var(--fg);
  cursor: pointer;
  font-weight: 700;
}

.btnx:hover {
  background: var(--btn-hover);
}

.btnx.secondary {
  background: transparent;
}

.btnx.secondary:hover {
  background: var(--panel-2);
}

.btnx.small {
  height: 34px;
  padding: 0 12px;
  border-radius: 12px;
}

/* Filter */
.map-filter {
  position: absolute;
  left: 14px;
  top: 14px;
  z-index: 5000;
  width: 240px;

  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 12px;
  color: var(--fg);

  box-shadow: 0 18px 40px var(--shadow);
  backdrop-filter: blur(10px);
}

.map-filter-label {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 6px;
}
</style>
