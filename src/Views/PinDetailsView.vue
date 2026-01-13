<template>
  <div class="page">
    <h1>Pin-Details</h1>

    <div v-if="!pin" class="hint">
      Pin nicht gefunden.
    </div>

    <div v-if="pin" class="card">
      <div class="row">
        <div class="label">Beschreibung</div>
        <div class="value">{{ pin.description }}</div>
      </div>

      <div class="row">
        <div class="label">Datum</div>
        <div class="value">
          <span v-if="pin.date">{{ pin.date }}</span>
          <span v-if="!pin.date">Kein Datum</span>
        </div>
      </div>

      <div class="row">
        <div class="label">Koordinaten</div>
        <div class="value">{{ formatNumber(pin.lat) }}, {{ formatNumber(pin.lng) }}</div>
      </div>

      <div class="row">
        <div class="label">Medien</div>

        <div class="value" v-if="!pin.media || pin.media.length === 0">
          Keine Medien
        </div>

        <div v-if="pin.media && pin.media.length > 0">
          <div class="media-status" v-if="isLoadingMedia">
            Medien werden geladen…
          </div>

          <div class="media-status error" v-if="mediaError">
            {{ mediaError }}
          </div>

          <div class="media-grid" v-if="mediaItems.length > 0">
            <div class="media-card" v-for="m in mediaItems" :key="m.id">
              <div class="media-type">
                {{ m.type }}<span v-if="m.name"> · {{ m.name }}</span>
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
      </div>

      <div class="actions">
        <button class="btn" @click="openOnMap(pin.id)">Auf Karte anzeigen</button>
        <button class="btn secondary" @click="goBack">Zurück</button>
        <button class="btn danger" @click="deleteThisPin(pin.id)">Löschen</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePinsStore } from '../stores/pinsStore.js'
import { getMediaBlob } from '../services/mediaDb'

var route = useRoute()
var router = useRouter()
var pinsStore = usePinsStore()

// UI-State für Medien
var isLoadingMedia = ref(false)
var mediaError = ref('')
var mediaItems = ref([]) // [{ id, type, name, mime, objectUrl }]

// zum Aufräumen der ObjectURLs
var objectUrls = []

onMounted(function () {
  pinsStore.loadPins()
  loadMediaForCurrentPin()
})

// Wenn sich die Route ändert (anderer Pin), neu laden
watch(
  function () {
    return route.params && route.params.id ? String(route.params.id) : ''
  },
  function () {
    loadMediaForCurrentPin()
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

function formatNumber(n) {
  return Number(n).toFixed(5)
}
</script>

<style scoped>
.page { padding: 12px; }
.hint { margin-top: 10px; opacity: 0.8; }

.card {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #2b3763;
  border-radius: 12px;
  background: #0e142a;
  color: #e8eefc;
  max-width: 980px;
}

.row { margin-bottom: 12px; }
.label { font-size: 12px; opacity: 0.85; margin-bottom: 6px; }
.value { font-size: 14px; }

.actions { display: flex; gap: 8px; margin-top: 10px; }

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
.btn.danger { background: transparent; border-color: #6b2b2b; }

/* Medien */
.media-status {
  font-size: 12px;
  opacity: 0.85;
  margin: 6px 0 10px 0;
}
.media-status.error {
  color: #ffd1d1;
  opacity: 1;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
  margin-top: 8px;
}

.media-card {
  border: 1px solid #2b3763;
  border-radius: 12px;
  padding: 10px;
  background: rgba(18, 26, 51, 0.6);
}

.media-type {
  font-size: 12px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.media-img {
  width: 100%;
  height: 170px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid rgba(43, 55, 99, 0.6);
}

.media-video {
  width: 100%;
  height: 170px;
  border-radius: 10px;
  border: 1px solid rgba(43, 55, 99, 0.6);
  background: #000;
}

.media-missing {
  font-size: 12px;
  color: #ffd1d1;
  margin-top: 6px;
}

.media-meta {
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.85;
}
</style>
