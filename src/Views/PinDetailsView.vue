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

        <div class="media-grid" v-if="pin.media && pin.media.length > 0">
          <div class="media-card" v-for="(m, i) in pin.media" :key="i">
            <div class="media-type">{{ m.type }}</div>

            <img
              v-if="m.type === 'image'"
              class="media-img"
              :src="m.url"
              alt="Bild"
            />

            <video
              v-if="m.type === 'video'"
              class="media-video"
              :src="m.url"
              controls
            ></video>

            <div class="media-url">{{ m.url }}</div>
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
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePinsStore } from '../stores/pinsStore.js'

var route = useRoute()
var router = useRouter()
var pinsStore = usePinsStore()

onMounted(function () {
  pinsStore.loadPins()
})

var pin = computed(function () {
  var id = route.params && route.params.id ? String(route.params.id) : ''
  if (!id) return null
  return pinsStore.getPinById(id)
})

function openOnMap(id) {
  router.push({ path: '/map', query: { pinId: id } })
}

function goBack() {
  router.back()
}

function deleteThisPin(id) {
  var ok = window.confirm('Diesen Pin wirklich löschen?')
  if (!ok) return

  pinsStore.removePinById(id)
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
  max-width: 860px;
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
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
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
  opacity: 0.85;
  margin-bottom: 8px;
}

.media-img {
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid rgba(43, 55, 99, 0.6);
}

.media-video {
  width: 100%;
  height: 160px;
  border-radius: 10px;
  border: 1px solid rgba(43, 55, 99, 0.6);
  background: #000;
}

.media-url {
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
