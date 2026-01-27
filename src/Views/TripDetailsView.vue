<!-- src/views/TripDetailsView.vue -->
<template>
  <div class="page">
    <div class="header">
      <div class="header-left">
        <h1 class="h1">{{ tripName }}</h1>
        <div class="sub" v-if="tripId">
          Pins: {{ pins.length }}
        </div>
      </div>

      <div class="header-actions">
        <button class="btnx" @click="createPinInThisAlbum" :disabled="!tripId">
          Neuen Pin in diesem Album
        </button>
        <button class="btnx secondary" @click="goBack">
          Zurück
        </button>
      </div>
    </div>

    <div class="hint" v-if="!tripId">
      Album nicht gefunden.
    </div>

    <div class="hint" v-else-if="pins.length === 0">
      Keine Pins in diesem Album.
    </div>

    <ul class="list" v-if="tripId && pins.length > 0">
      <li class="item" v-for="p in pins" :key="p.id">
        <div class="main">
          <div class="title">{{ p.title ? p.title : 'Ohne Titel' }}</div>
          <div class="desc" v-if="p.description">{{ p.description }}</div>

          <div class="meta">
            <span v-if="formatDateRange(p)">{{ formatDateRange(p) }}</span>
            <span v-else>Kein Datum</span>
          </div>
        </div>

        <div class="actions">
          <button class="btnx" @click="openDetails(p.id)">Details</button>
          <button class="btnx" @click="openOnMap(p.id)">Auf Karte</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTripsStore } from '../stores/tripsStore'
import { usePinsStore } from '../stores/pinsStore'

var route = useRoute()
var router = useRouter()

var tripsStore = useTripsStore()
var pinsStore = usePinsStore()

onMounted(function () {
  tripsStore.loadTrips()
  pinsStore.loadPins()
})

var tripId = computed(function () {
  return route.params && route.params.id ? String(route.params.id) : ''
})

var tripName = computed(function () {
  if (!tripId.value) return 'Album'
  return tripsStore.getTripNameById(tripId.value) || 'Album'
})

var pins = computed(function () {
  var id = tripId.value
  if (!id) return []

  return pinsStore.pins
    .filter(function (p) {
      return String(p.tripId ?? '') === id
    })
    .slice()
    .sort(function (a, b) {
      return (b.createdAt || 0) - (a.createdAt || 0)
    })
})

function openOnMap(id) {
  router.push({ path: '/map', query: { pinId: id } })
}

function openDetails(id) {
  router.push({ path: '/pin/' + String(id) })
}

function goBack() {
  router.push({ path: '/trips' })
}

function createPinInThisAlbum() {
  var id = tripId.value
  if (!id) return
  router.push({ path: '/map', query: { albumId: id } })
}

function formatDateRange(p) {
  if (!p) return ''
  var from = p.dateFrom ? String(p.dateFrom) : ''
  var to = p.dateTo ? String(p.dateTo) : ''
  if (from && to) return from + ' – ' + to
  if (from) return from
  if (to) return to
  return ''
}

</script>

<style scoped>
.page {
  padding: 16px;
  max-width: 980px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.h1 {
  margin: 0;
}

.sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.hint {
  margin-top: 10px;
  color: var(--muted);
}

.list {
  list-style: none;
  padding: 0;
  margin: 12px 0 0 0;
  display: grid;
  gap: 10px;
}

.item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--panel);
  color: var(--fg);
  box-shadow: 0 12px 24px var(--shadow);
}

.main {
  min-width: 0;
}

.title {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 4px;
}

.desc {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 6px;
  word-break: break-word;
}

.meta {
  font-size: 12px;
  color: var(--muted);
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.btnx {
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
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
</style>
