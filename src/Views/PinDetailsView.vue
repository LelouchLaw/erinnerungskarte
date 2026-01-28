<!-- src/views/PinDetailsView.vue -->
<template>
  <div class="page">
    <h1 class="title">{{ pin && pin.title ? pin.title : 'Pin-Details' }}</h1>

    <div v-if="!pin" class="hint">Pin nicht gefunden.</div>

    <div v-if="pin" class="card">
      <div class="row">
        <div class="label">Titel</div>
        <div class="value">{{ pin.title || 'Ohne Titel' }}</div>
      </div>

      <div class="row">
        <div class="label">Beschreibung</div>
        <div class="value">
          <span v-if="pin.description">{{ pin.description }}</span>
          <span v-else class="muted">Keine Beschreibung</span>
        </div>
      </div>

      <div class="row">
        <div class="label">Zeitraum</div>
        <div class="value">
          <span v-if="rangeText">{{ rangeText }}</span>
          <span v-else class="muted">Kein Zeitraum</span>
        </div>
      </div>

      <div class="row">
        <div class="label">Album</div>
        <div class="value">
          <span v-if="pin.tripId">{{ tripsStore.getTripNameById(pin.tripId) }}</span>
          <span v-else class="muted">Kein Album</span>
        </div>
      </div>

      <!-- Medien -->
      <div class="row">
        <div class="label">Medien</div>

        <div class="value" v-if="!pin.media || pin.media.length === 0">Keine Medien</div>

        <div v-else>
          <div class="media-status" v-if="isLoadingMedia">Medien werden geladen…</div>
          <div class="media-status error" v-if="mediaError">{{ mediaError }}</div>

          <div class="media-grid" v-if="mediaItems.length > 0">
            <div class="media-card" v-for="m in mediaItems" :key="m.id">
              <div class="media-top">
                <div class="media-type">
                  <span v-if="m.type === 'image'">Foto</span>
                  <span v-else-if="m.type === 'video'">Video</span>
                  <span v-else>Datei</span>
                  <span v-if="m.name"> · {{ m.name }}</span>
                </div>

                <div class="media-actions">
                  <button
                    class="btnx tiny"
                    type="button"
                    @click="setAsCover(m.id)"
                    :disabled="isMutatingMedia"
                    v-if="m.type === 'image' || m.type === 'video'"
                  >
                    {{ isCover(m.id) ? 'Cover' : 'Als Cover' }}
                  </button>

                  <button
                    class="btnx tiny danger"
                    type="button"
                    @click="removeOneMedia(m.id)"
                    :disabled="isMutatingMedia"
                  >
                    Entfernen
                  </button>
                </div>
              </div>

              <!-- Click-to-zoom -->
              <button
                v-if="m.type === 'image' && m.objectUrl"
                class="media-preview"
                type="button"
                @click="openLightbox(m)"
                aria-label="Foto vergrößern"
              >
                <img class="media-img" :src="m.objectUrl" alt="Foto" />
              </button>

              <button
                v-if="m.type === 'video' && m.objectUrl"
                class="media-preview"
                type="button"
                @click="openLightbox(m)"
                aria-label="Video vergrößern"
              >
                <video class="media-video" :src="m.objectUrl" muted playsinline></video>
                <div class="play-hint">▶</div>
              </button>

              <div class="media-missing" v-if="!m.objectUrl">
                Datei nicht verfügbar (vielleicht gelöscht).
              </div>
            </div>
          </div>

          <!-- Cover entfernen -->
          <div class="cover-row" v-if="pin.coverMediaId">
            <div class="cover-text">
              Cover gesetzt.
            </div>
            <button class="btnx secondary" type="button" @click="clearCover" :disabled="isMutatingMedia">
              Cover entfernen
            </button>
          </div>
        </div>

        <!-- Medien hinzufügen -->
        <div class="media-add">
          <div class="media-add-title">Medien hinzufügen</div>

          <input
            ref="fileInputRef"
            class="inputx"
            type="file"
            multiple
            accept="image/*,video/*"
            @change="onAddFilesSelected"
            :disabled="isMutatingMedia"
          />

          <div class="media-add-hint">
            Du kannst Fotos und Videos nachträglich hinzufügen. Max. 50MB pro Datei.
          </div>

          <div class="media-status error" v-if="addMediaError">{{ addMediaError }}</div>
          <div class="media-status" v-if="isMutatingMedia">Änderung wird gespeichert…</div>
        </div>
      </div>

      <div class="actions">
        <button class="btnx" @click="openOnMap(pin.id)">Auf Karte anzeigen</button>
        <button class="btnx" @click="openEdit">Bearbeiten</button>
        <button class="btnx secondary" @click="goBack">Zurück</button>
        <button class="btnx danger" @click="deleteThisPin(pin.id)">Löschen</button>
      </div>
    </div>

    <!-- Lightbox -->
    <div class="lb-backdrop" v-if="lightboxOpen" @click="closeLightbox"></div>
    <div class="lb-modal" v-if="lightboxOpen" role="dialog" aria-modal="true">
      <div class="lb-top">
        <div class="lb-title">
          <span v-if="lightboxItem && lightboxItem.name">{{ lightboxItem.name }}</span>
          <span v-else>Vorschau</span>
        </div>
        <button class="btnx small secondary" type="button" @click="closeLightbox">Schließen</button>
      </div>

      <img
        v-if="lightboxItem && lightboxItem.type === 'image' && lightboxItem.objectUrl"
        class="lb-img"
        :src="lightboxItem.objectUrl"
        alt="Foto groß"
      />

      <video
        v-if="lightboxItem && lightboxItem.type === 'video' && lightboxItem.objectUrl"
        class="lb-video"
        :src="lightboxItem.objectUrl"
        controls
        autoplay
      ></video>
    </div>

    <!-- Edit Overlay -->
    <div class="backdrop" v-if="isEditOpen" @click="closeEdit"></div>

    <div class="modal" v-if="isEditOpen" role="dialog" aria-modal="true">
      <div class="modal-title">Pin bearbeiten</div>

      <div class="row">
        <div class="label">Titel (Pflicht)</div>
        <input class="inputx" type="text" v-model="editTitle" />
      </div>

      <div class="row">
        <div class="label">Beschreibung (optional)</div>
        <input class="inputx" type="text" v-model="editDescription" />
      </div>

      <div class="row">
        <div class="label">Zeitraum (optional)</div>
        <div class="range-grid">
          <div>
            <div class="mini-label">Von</div>
            <input class="inputx" type="date" v-model="editDateFrom" />
          </div>
          <div>
            <div class="mini-label">Bis</div>
            <input class="inputx" type="date" v-model="editDateTo" />
          </div>
        </div>
        <div class="mini-hint">Du kannst auch nur ein Datum setzen.</div>
      </div>

      <div class="row">
        <div class="label">Album</div>
        <select class="inputx" v-model="editTripId">
          <option value="">Kein Album</option>
          <option v-for="t in tripsStore.trips" :key="t.id" :value="t.id">
            {{ t.name }}
          </option>
        </select>
      </div>

      <div class="modal-actions">
        <button class="btnx" @click="saveEdit">Speichern</button>
        <button class="btnx secondary" @click="closeEdit">Abbrechen</button>
      </div>

      <div class="error" v-if="editError">{{ editError }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePinsStore } from '../stores/pinsStore.js'
import { useTripsStore } from '../stores/tripsStore'
import { getMediaBlob } from '../services/mediaDb'

var route = useRoute()
var router = useRouter()
var pinsStore = usePinsStore()
var tripsStore = useTripsStore()

// Medien UI
var isLoadingMedia = ref(false)
var mediaError = ref('')
var mediaItems = ref([]) // [{ id, type, name, mime, objectUrl }]

// Media Mutations
var isMutatingMedia = ref(false)
var addMediaError = ref('')
var fileInputRef = ref(null)

// ObjectURLs cleanup
var objectUrls = []

// Lightbox
var lightboxOpen = ref(false)
var lightboxItem = ref(null)

/* --- Edit State --- */
var isEditOpen = ref(false)
var editId = ref('')
var editTitle = ref('')
var editDescription = ref('')
var editDateFrom = ref('')
var editDateTo = ref('')
var editTripId = ref('')
var editError = ref('')

onMounted(function () {
  pinsStore.loadPins()
  tripsStore.loadTrips()
  loadMediaForCurrentPin()
})

watch(
  function () {
    return route.params && route.params.id ? String(route.params.id) : ''
  },
  function () {
    loadMediaForCurrentPin()
    closeEdit()
    closeLightbox()
  }
)

onBeforeUnmount(function () {
  cleanupObjectUrls()
})

var pin = computed(function () {
  var id = route.params && route.params.id ? String(route.params.id) : ''
  if (!id) return null
  return pinsStore.getPinById(id)
})

var rangeText = computed(function () {
  if (!pin.value) return ''
  var a = pin.value.dateFrom ? String(pin.value.dateFrom) : ''
  var b = pin.value.dateTo ? String(pin.value.dateTo) : ''
  if (a && b) return a + ' bis ' + b
  if (a) return 'ab ' + a
  if (b) return 'bis ' + b
  return ''
})

function cleanupObjectUrls() {
  for (var i = 0; i < objectUrls.length; i = i + 1) {
    try { URL.revokeObjectURL(objectUrls[i]) } catch (e) {}
  }
  objectUrls = []
}

async function loadMediaForCurrentPin() {
  cleanupObjectUrls()

  mediaItems.value = []
  mediaError.value = ''

  if (!pin.value) return
  if (!pin.value.media || pin.value.media.length === 0) return

  isLoadingMedia.value = true

  try {
    var items = []
    for (var i = 0; i < pin.value.media.length; i = i + 1) {
      var refItem = pin.value.media[i]
      var id = refItem && refItem.id ? String(refItem.id) : ''
      if (!id) continue

      var type = refItem.type ? String(refItem.type) : 'file'
      var name = refItem.name ? String(refItem.name) : ''
      var mime = refItem.mime ? String(refItem.mime) : ''

      var blob = await getMediaBlob(id)

      var objectUrl = null
      if (blob) {
        objectUrl = URL.createObjectURL(blob)
        objectUrls.push(objectUrl)
      }

      items.push({ id: id, type: type, name: name, mime: mime, objectUrl: objectUrl })
    }

    mediaItems.value = items
  } catch (e) {
    mediaError.value = e && e.message ? e.message : 'Medien konnten nicht geladen werden.'
  } finally {
    isLoadingMedia.value = false
  }
}

function openLightbox(m) {
  if (!m || !m.objectUrl) return
  lightboxItem.value = m
  lightboxOpen.value = true
}
function closeLightbox() {
  lightboxOpen.value = false
  lightboxItem.value = null
}

function openOnMap(id) {
  router.push({ path: '/map', query: { pinId: id } })
}

function goBack() {
  router.back()
}

async function deleteThisPin(id) {
  var ok = window.confirm('Diesen Pin wirklich löschen?')
  if (!ok) return
  await pinsStore.deletePinAndMedia(id)
  router.push({ path: '/pins' })
}

/* --- Cover --- */
function isCover(mediaId) {
  if (!pin.value) return false
  return String(pin.value.coverMediaId ?? '') === String(mediaId ?? '')
}

function setAsCover(mediaId) {
  if (!pin.value) return
  isMutatingMedia.value = true
  try {
    pinsStore.updatePin(pin.value.id, { coverMediaId: String(mediaId) })
  } finally {
    isMutatingMedia.value = false
  }
}

function clearCover() {
  if (!pin.value) return
  isMutatingMedia.value = true
  try {
    pinsStore.updatePin(pin.value.id, { coverMediaId: null })
  } finally {
    isMutatingMedia.value = false
  }
}

/* --- Editing --- */
function openEdit() {
  if (!pin.value) return

  isEditOpen.value = true
  editError.value = ''

  editId.value = pin.value.id
  editTitle.value = pin.value.title || ''
  editDescription.value = pin.value.description || ''
  editDateFrom.value = pin.value.dateFrom || ''
  editDateTo.value = pin.value.dateTo || ''
  editTripId.value = pin.value.tripId ? String(pin.value.tripId) : ''
}

function closeEdit() {
  isEditOpen.value = false
  editError.value = ''
  editId.value = ''
  editTitle.value = ''
  editDescription.value = ''
  editDateFrom.value = ''
  editDateTo.value = ''
  editTripId.value = ''
}

function saveEdit() {
  if (!editId.value) return

  var title = String(editTitle.value ?? '').trim()
  if (!title) {
    editError.value = 'Bitte gib einen Titel ein.'
    return
  }

  var desc = String(editDescription.value ?? '').trim()

  pinsStore.updatePin(editId.value, {
    title: title,
    description: desc,
    dateFrom: editDateFrom.value,
    dateTo: editDateTo.value,
    tripId: editTripId.value ? String(editTripId.value) : null
  })

  closeEdit()
}

/* --- Media: hinzufügen & entfernen --- */
async function onAddFilesSelected(event) {
  if (!pin.value) return
  var files = event && event.target && event.target.files ? event.target.files : null
  if (!files || files.length === 0) return

  addMediaError.value = ''
  isMutatingMedia.value = true

  try {
    await pinsStore.addMediaToPin(pin.value.id, files)
    if (fileInputRef.value) fileInputRef.value.value = ''
    await loadMediaForCurrentPin()
  } catch (e) {
    addMediaError.value = e && e.message ? e.message : 'Medien konnten nicht hinzugefügt werden.'
  } finally {
    isMutatingMedia.value = false
  }
}

async function removeOneMedia(mediaId) {
  if (!pin.value) return
  var ok = window.confirm('Dieses Medium wirklich entfernen?')
  if (!ok) return

  addMediaError.value = ''
  isMutatingMedia.value = true

  try {
    // wenn Cover gelöscht wird -> Cover entfernen
    if (isCover(mediaId)) {
      pinsStore.updatePin(pin.value.id, { coverMediaId: null })
    }

    await pinsStore.removeMediaFromPin(pin.value.id, mediaId)
    await loadMediaForCurrentPin()
  } catch (e) {
    addMediaError.value = e && e.message ? e.message : 'Medium konnte nicht entfernt werden.'
  } finally {
    isMutatingMedia.value = false
  }
}
</script>

<style scoped>
.page { padding: 12px; }
.title { margin: 6px 0 10px; }

.hint { margin-top: 10px; opacity: 0.9; color: var(--muted); }
.muted { color: var(--muted); }

.card {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--panel);
  color: var(--fg);
  max-width: 980px;
  box-shadow: 0 12px 24px var(--shadow);
}

.row { margin-bottom: 12px; }

.label {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 6px;
}

.value { font-size: 14px; }

/* actions */
.actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }

/* Inputs (nutzt deine globale inputx, falls du eine hast) */
.inputx {
  width: 100%;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--panel-2);
  color: var(--fg);
  padding: 0 10px;
  outline: none;
}

/* Medien */
.media-status { font-size: 12px; color: var(--muted); margin: 6px 0 10px 0; }
.media-status.error, .error { color: var(--danger-fg); }

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
  margin-top: 8px;
}

.media-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px;
  background: var(--panel-2);
}

.media-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.media-actions { display: flex; gap: 8px; align-items: center; }

.media-type {
  font-size: 12px;
  color: var(--muted);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-preview {
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
  position: relative;
}

.media-img {
  width: 100%;
  height: 170px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid var(--border);
  display: block;
}

.media-video {
  width: 100%;
  height: 170px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg);
  display: block;
}

.play-hint {
  position: absolute;
  left: 10px;
  top: 10px;
  background: rgba(0,0,0,0.55);
  color: #fff;
  border-radius: 999px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  font-weight: 800;
}

.media-missing { font-size: 12px; margin-top: 6px; color: var(--danger-fg); }

.cover-row {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}
.cover-text { font-size: 12px; color: var(--muted); }

.media-add {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.media-add-title { font-size: 13px; font-weight: 700; margin-bottom: 8px; }
.media-add-hint { margin-top: 8px; font-size: 12px; color: var(--muted); }

.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 6000;
}

.modal {
  position: fixed;
  left: 50%;
  top: 18%;
  transform: translateX(-50%);
  width: 380px;
  max-width: calc(100vw - 24px);
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px;
  color: var(--fg);
  z-index: 6500;
  box-shadow: 0 18px 40px var(--shadow);
}

.modal-title { font-size: 14px; font-weight: 700; margin-bottom: 10px; }
.modal-actions { display: flex; gap: 8px; margin-top: 6px; }

.range-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.mini-label { font-size: 11px; color: var(--muted); margin-bottom: 4px; }
.mini-hint { margin-top: 6px; font-size: 12px; color: var(--muted); }

/* Lightbox */
.lb-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.68);
  z-index: 8000;
}

.lb-modal {
  position: fixed;
  left: 50%;
  top: 6%;
  transform: translateX(-50%);
  width: min(980px, calc(100vw - 24px));
  max-height: calc(100vh - 70px);
  overflow: auto;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px;
  color: var(--fg);
  z-index: 8500;
  box-shadow: 0 18px 50px var(--shadow);
}

.lb-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.lb-title { font-weight: 700; font-size: 13px; color: var(--fg); }

.lb-img {
  width: 100%;
  height: auto;
  border-radius: 12px;
  border: 1px solid var(--border);
  display: block;
}

.lb-video {
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--border);
  display: block;
}
</style>
