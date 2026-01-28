
<template>
  <div class="page">
    <h1 class="title">{{ pin && pin.title ? pin.title : 'Pin-Details' }}</h1>

    <div v-if="!pin" class="hint">Pin nicht gefunden.</div>

    <div v-if="pin" class="card">
      <div class="row">
        <div class="label">Titel</div>
        <div class="value">
          <span v-if="pin.title">{{ pin.title }}</span>
          <span v-else>Ohne Titel</span>
        </div>
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
          <span v-if="formattedRange">{{ formattedRange }}</span>
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

        <div class="value" v-if="!pin.media || pin.media.length === 0">
          <span class="muted">Keine Medien</span>
        </div>

        <div v-if="pin.media && pin.media.length > 0">
          <div class="media-status" v-if="isLoadingMedia">Medien werden geladen…</div>

          <div class="media-status error" v-if="mediaError">
            {{ mediaError }}
          </div>

          <div class="media-grid" v-if="mediaItems.length > 0">
            <div class="media-card" v-for="m in mediaItems" :key="m.id">
              <div class="media-top">
                <div class="media-type">
                  <span v-if="m.type === 'image'">Bild</span>
                  <span v-else-if="m.type === 'video'">Video</span>
                  <span v-else>Datei</span>
                  <span v-if="m.name"> · {{ m.name }}</span>
                </div>

                <button
                  class="btnx tiny danger"
                  @click="removeOneMedia(m.id)"
                  :disabled="isMutatingMedia"
                >
                  Entfernen
                </button>
              </div>

              <img
                v-if="m.type === 'image' && m.objectUrl"
                class="media-img"
                :src="m.objectUrl"
                alt="Bild"
              />

              <video
                v-if="m.type === 'video' && m.objectUrl"
                class="media-video"
                :src="m.objectUrl"
                controls
              ></video>

              <div class="media-missing" v-if="!m.objectUrl">
                Datei nicht verfügbar (vielleicht gelöscht).
              </div>
            </div>
          </div>
        </div>

        <!-- Medien hinzufügen -->
        <div class="media-add">
          <div class="media-add-title">Medien hinzufügen</div>

          <input
            ref="fileInputRef"
            class="input"
            type="file"
            multiple
            accept="image/*,video/*"
            @change="onAddFilesSelected"
            :disabled="isMutatingMedia"
          />

          <div class="media-add-hint">
            Du kannst Fotos und Videos nachträglich hinzufügen. Max. 50 MB pro Datei.
          </div>

          <div class="media-status error" v-if="addMediaError">
            {{ addMediaError }}
          </div>

          <div class="media-status" v-if="isMutatingMedia">
            Änderung wird gespeichert…
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="btnx" @click="openOnMap(pin.id)">Auf Karte anzeigen</button>
        <button class="btnx" @click="openEdit">Bearbeiten</button>
        <button class="btnx secondary" @click="goBack">Zurück</button>
        <button class="btnx danger" @click="deleteThisPin(pin.id)">Löschen</button>
      </div>
    </div>

    <!-- Edit Overlay -->
    <div class="backdrop" v-if="isEditOpen" @click="closeEdit"></div>

    <div class="modal" v-if="isEditOpen" role="dialog" aria-modal="true">
      <div class="modal-title">Pin bearbeiten</div>

      <div class="row">
        <div class="label">Titel <span class="req">(Pflicht)</span></div>
        <input class="input" type="text" v-model="editTitle" />
      </div>

      <div class="row">
        <div class="label">Beschreibung <span class="opt">(optional)</span></div>
        <input class="input" type="text" v-model="editDescription" />
      </div>

      <div class="row">
        <div class="label">Zeitraum <span class="opt">(optional)</span></div>

        <div class="date-row">
          <div class="date-field">
            <div class="date-label">Von</div>
            <input class="input date" type="date" v-model="editDateFrom" />
          </div>

          <div class="date-field">
            <div class="date-label">Bis</div>
            <input class="input date" type="date" v-model="editDateTo" />
          </div>
        </div>

        <div class="date-hint">Tipp: Du kannst auch nur „Von“ setzen.</div>
      </div>

      <div class="row">
        <div class="label">Album</div>
        <select class="input" v-model="editTripId">
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

// cleanup object urls
var objectUrls = []

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

var formattedRange = computed(function () {
  if (!pin.value) return ''

  var from = pin.value.dateFrom ? String(pin.value.dateFrom) : ''
  var to = pin.value.dateTo ? String(pin.value.dateTo) : ''

  if (!from && !to) return ''
  if (from && !to) return formatDateDE(from)
  if (!from && to) return formatDateDE(to)
  if (from === to) return formatDateDE(from)

  return formatDateDE(from) + ' – ' + formatDateDE(to)
})

function formatDateDE(iso) {
  // iso: YYYY-MM-DD
  try {
    var s = String(iso || '')
    if (!s) return ''
    var parts = s.split('-')
    if (parts.length !== 3) return s
    var yyyy = parts[0]
    var mm = parts[1]
    var dd = parts[2]
    return dd + '.' + mm + '.' + yyyy
  } catch (e) {
    return String(iso || '')
  }
}

function cleanupObjectUrls() {
  var i
  for (i = 0; i < objectUrls.length; i = i + 1) {
    try {
      URL.revokeObjectURL(objectUrls[i])
    } catch (e) {
      // ignore
    }
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
    var i

    for (i = 0; i < pin.value.media.length; i = i + 1) {
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

      items.push({
        id: id,
        type: type,
        name: name,
        mime: mime,
        objectUrl: objectUrl
      })
    }

    mediaItems.value = items
  } catch (e) {
    mediaError.value = e && e.message ? e.message : 'Medien konnten nicht geladen werden.'
  } finally {
    isLoadingMedia.value = false
  }
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

function normalizeDateRange(fromValue, toValue) {
  var from = String(fromValue ?? '').trim()
  var to = String(toValue ?? '').trim()
  if (!from) from = ''
  if (!to) to = ''

  if (from && to && from > to) {
    var tmp = from
    from = to
    to = tmp
  }

  return {
    from: from ? from : null,
    to: to ? to : null
  }
}

function saveEdit() {
  if (!editId.value) return

  var title = String(editTitle.value ?? '').trim()
  if (!title) {
    editError.value = 'Bitte gib einen Titel ein.'
    return
  }

  var desc = String(editDescription.value ?? '').trim() // optional

  var range = normalizeDateRange(editDateFrom.value, editDateTo.value)

  pinsStore.updatePin(editId.value, {
    title: title,
    description: desc,
    dateFrom: range.from,
    dateTo: range.to,
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

    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }

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
.page {
  padding: 12px;
}

.title {
  margin: 6px 0 10px;
}

.hint {
  margin-top: 10px;
  opacity: 0.9;
  color: var(--muted);
}

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

.row {
  margin-bottom: 12px;
}

.label {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 6px;
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.value {
  font-size: 14px;
}

.muted {
  color: var(--muted);
}

/* Actions */
.actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.btnx {
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--btn);
  color: var(--fg);
  cursor: pointer;
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

.btnx.danger {
  border-color: var(--danger-border);
  background: var(--danger-bg);
  color: var(--fg);
}

.btnx.danger:hover {
  filter: brightness(1.06);
}

/* Medien */
.media-status {
  font-size: 12px;
  color: var(--muted);
  margin: 6px 0 10px 0;
}

.media-status.error,
.error {
  color: var(--danger-fg);
}

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
  gap: 8px;
  margin-bottom: 8px;
}

.media-type {
  font-size: 12px;
  color: var(--muted);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-img {
  width: 100%;
  height: 170px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid var(--border);
}

.media-video {
  width: 100%;
  height: 170px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg);
}

.media-missing {
  font-size: 12px;
  margin-top: 6px;
  color: var(--danger-fg);
}

.media-add {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.media-add-title {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 8px;
}

.media-add-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--muted);
}

/* tiny buttons */
.btnx.tiny {
  height: 28px;
  padding: 0 10px;
  border-radius: 10px;
}

/* Modal */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
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

.modal-title {
  font-size: 14px;
  font-weight: 800;
  margin-bottom: 10px;
}

.req {
  color: var(--danger-fg);
  font-weight: 700;
}
.opt {
  opacity: 0.9;
}

.input {
  width: 100%;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--panel-2);
  color: var(--fg);
  padding: 0 10px;
  outline: none;
}

.modal-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.date-row {
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

.input.date {
  padding-right: 44px;
}

.date-hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
}

.input, select, button {
  box-sizing: border-box;
  min-width: 0;
}

.modal {
  max-width: min(520px, calc(100vw - 24px));
}

</style>
