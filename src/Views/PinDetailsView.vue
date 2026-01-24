<!-- src/views/PinDetailsView.vue -->
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
        <div class="value">{{ pin.description }}</div>
      </div>

      <div class="row">
        <div class="label">Datum</div>
        <div class="value">
          <span v-if="pin.date">{{ pin.date }}</span>
          <span v-else>Kein Datum</span>
        </div>
      </div>

      <div class="row">
        <div class="label">Album</div>
        <div class="value">
          <span v-if="pin.tripId">{{ tripsStore.getTripNameById(pin.tripId) }}</span>
          <span v-else>Kein Album</span>
        </div>
      </div>

      <!-- Medien -->
      <div class="row">
        <div class="label">Medien</div>

        <div class="value" v-if="!pin.media || pin.media.length === 0">Keine Medien</div>

        <div v-if="pin.media && pin.media.length > 0">
          <div class="media-status" v-if="isLoadingMedia">Medien werden geladen…</div>

          <div class="media-status error" v-if="mediaError">
            {{ mediaError }}
          </div>

          <div class="media-grid" v-if="mediaItems.length > 0">
            <div class="media-card" v-for="m in mediaItems" :key="m.id">
              <div class="media-top">
                <div class="media-type">
                  {{ m.type }}<span v-if="m.name"> · {{ m.name }}</span>
                </div>

                <button
                  class="btn tiny danger"
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

              <div class="media-meta">
                <div v-if="m.mime">MIME: {{ m.mime }}</div>
                <div>ID: {{ m.id }}</div>
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
            Du kannst Fotos und Videos nachträglich hinzufügen. Max 50MB pro Datei.
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
        <button class="btn" @click="openOnMap(pin.id)">Auf Karte anzeigen</button>
        <button class="btn" @click="openEdit" v-if="pin">Bearbeiten</button>
        <button class="btn secondary" @click="goBack">Zurück</button>
        <button class="btn danger" @click="deleteThisPin(pin.id)">Löschen</button>
      </div>
    </div>

    <!-- Edit Overlay -->
    <div class="backdrop" v-if="isEditOpen" @click="closeEdit"></div>

    <div class="modal" v-if="isEditOpen" role="dialog" aria-modal="true">
      <div class="modal-title">Pin bearbeiten</div>

      <div class="row">
        <div class="label">Titel (Pflicht)</div>
        <input class="input" type="text" v-model="editTitle" />
      </div>

      <div class="row">
        <div class="label">Beschreibung (Pflicht)</div>
        <input class="input" type="text" v-model="editDescription" />
      </div>

      <div class="row">
        <div class="label">Datum (optional)</div>
        <input class="input" type="date" v-model="editDate" />
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
        <button class="btn" @click="saveEdit">Speichern</button>
        <button class="btn secondary" @click="closeEdit">Abbrechen</button>
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

// UI-State für Medien
var isLoadingMedia = ref(false)
var mediaError = ref('')
var mediaItems = ref([]) // [{ id, type, name, mime, objectUrl }]

// Media Mutations (add/remove)
var isMutatingMedia = ref(false)
var addMediaError = ref('')
var fileInputRef = ref(null)

// zum Aufräumen der ObjectURLs
var objectUrls = []

/* --- Edit State --- */
var isEditOpen = ref(false)
var editId = ref('')
var editTitle = ref('')
var editDescription = ref('')
var editDate = ref('')
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
  editDate.value = pin.value.date || ''
  editTripId.value = pin.value.tripId ? String(pin.value.tripId) : ''
}

function closeEdit() {
  isEditOpen.value = false
  editError.value = ''
  editId.value = ''
  editTitle.value = ''
  editDescription.value = ''
  editDate.value = ''
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
  if (!desc) {
    editError.value = 'Bitte gib eine Beschreibung ein.'
    return
  }

  pinsStore.updatePin(editId.value, {
    title: title,
    description: desc,
    date: editDate.value,
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
}

.value {
  font-size: 14px;
}

/* Actions */
.actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
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

/* Danger buttons: gleicher Hintergrundtoken, Text bleibt normal var(--fg) */
.btn.danger {
  border-color: var(--danger-border);
  background: var(--danger-bg);
  color: var(--fg);
}

.btn.danger:hover {
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

.media-meta {
  margin-top: 8px;
  font-size: 12px;
  color: var(--muted);
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
.btn.tiny {
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
  font-weight: 700;
  margin-bottom: 10px;
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
</style>
