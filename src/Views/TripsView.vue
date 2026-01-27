<!-- src/views/TripsView.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTripsStore } from '../stores/tripsStore'
import { usePinsStore } from '../stores/pinsStore'
import { useRouter } from 'vue-router'

var tripsStore = useTripsStore()
var pinsStore = usePinsStore()
var router = useRouter()

var newTripName = ref('')
var errorMsg = ref('')

var editingTripId = ref('')
var editingName = ref('')

onMounted(function () {
  tripsStore.loadTrips()
  pinsStore.loadPins()
})

var tripsWithCounts = computed(function () {
  return tripsStore.trips
    .slice()
    .sort(function (a, b) {
      return (b.createdAt || 0) - (a.createdAt || 0)
    })
    .map(function (t) {
      var count = pinsStore.pins.filter(function (p) {
        return String(p.tripId ?? '') === String(t.id)
      }).length
      return { trip: t, count: count }
    })
})

function createTrip() {
  errorMsg.value = ''
  var name = String(newTripName.value ?? '').trim()

  if (!name) {
    errorMsg.value = 'Bitte einen Album-Namen eingeben.'
    return
  }

  var exists = tripsStore.trips.some(function (t) {
    return String(t.name ?? '').trim().toLowerCase() === name.toLowerCase()
  })
  if (exists) {
    errorMsg.value = 'Ein Album mit diesem Namen existiert bereits.'
    return
  }

  tripsStore.addTrip(name)
  newTripName.value = ''
}

function openAlbum(id) {
  router.push({ path: '/trips/' + String(id) })
}

function startEditTrip(trip) {
  if (!trip) return
  editingTripId.value = trip.id
  editingName.value = trip.name || ''
  errorMsg.value = ''
}

function cancelEditTrip() {
  editingTripId.value = ''
  editingName.value = ''
  errorMsg.value = ''
}

function saveEditTrip(tripId) {
  errorMsg.value = ''
  var name = String(editingName.value ?? '').trim()

  if (!name) {
    errorMsg.value = 'Name darf nicht leer sein.'
    return
  }

  var exists = tripsStore.trips.some(function (t) {
    if (String(t.id) === String(tripId)) return false
    return String(t.name ?? '').trim().toLowerCase() === name.toLowerCase()
  })
  if (exists) {
    errorMsg.value = 'Ein Album mit diesem Namen existiert bereits.'
    return
  }

  tripsStore.renameTrip(tripId, name)
  cancelEditTrip()
}

function deleteTrip(tripId) {
  errorMsg.value = ''

  var hasPins = pinsStore.pins.some(function (p) {
    return String(p.tripId ?? '') === String(tripId)
  })

  var ok = true
  if (hasPins) {
    ok = window.confirm(
      'Dieses Album hat Pins. Wenn du löschst, werden diese Pins auf "Kein Album" gesetzt. Fortfahren?'
    )
  } else {
    ok = window.confirm('Album wirklich löschen?')
  }

  if (!ok) return

  // Pins entkoppeln
  var i
  for (i = 0; i < pinsStore.pins.length; i = i + 1) {
    if (String(pinsStore.pins[i].tripId ?? '') === String(tripId)) {
      pinsStore.updatePin(pinsStore.pins[i].id, { tripId: null })
    }
  }

  tripsStore.removeTripById(tripId)
}
</script>

<template>
  <div class="page">
    <h1>Alben</h1>

    <div class="card">
      <div class="row">
        <input
          class="input"
          v-model="newTripName"
          placeholder="Neues Album erstellen (z. B. Italien 2025)"
          @keyup.enter="createTrip"
        />
        <button class="btnx" @click="createTrip">Erstellen</button>
      </div>

      <div v-if="errorMsg" class="error">{{ errorMsg }}</div>
    </div>

    <div class="card">
      <div v-if="tripsWithCounts.length === 0" class="empty">
        Noch keine Alben erstellt.
      </div>

      <ul v-else class="list">
        <li v-for="x in tripsWithCounts" :key="x.trip.id" class="list-item">
          <div class="left">
            <div v-if="editingTripId !== x.trip.id">
              <div class="title">{{ x.trip.name }}</div>
              <div class="meta">
                Erstellt: {{ new Date(x.trip.createdAt).toLocaleDateString() }} ·
                Pins: {{ x.count }}
              </div>
            </div>

            <div v-else class="edit-row">
              <input
                class="input"
                v-model="editingName"
                @keyup.enter="saveEditTrip(x.trip.id)"
              />
              <button class="btnx" @click="saveEditTrip(x.trip.id)">Speichern</button>
              <button class="btnx secondary" @click="cancelEditTrip">Abbrechen</button>
            </div>
          </div>

          <div class="actions" v-if="editingTripId !== x.trip.id">
            <button class="btnx" @click="openAlbum(x.trip.id)">Ansehen</button>
            <button class="btnx secondary" @click="startEditTrip(x.trip)">Umbenennen</button>
            <button class="btnx danger" @click="deleteTrip(x.trip.id)">Löschen</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 920px;
  margin: 0 auto;
  padding: 16px;
}

h1 {
  margin: 6px 0 14px;
}

.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 14px;
  box-shadow: 0 12px 24px var(--shadow);
  color: var(--fg);
}

.row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.input {
  flex: 1;
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--panel-2);
  color: var(--fg);
  padding: 0 12px;
  outline: none;
}

.btnx {
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--btn);
  color: var(--fg);
  padding: 0 12px;
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
  color: var(--danger-fg);
}

.btnx.danger:hover {
  filter: brightness(1.05);
}

.error {
  margin-top: 10px;
  color: var(--danger-fg);
  font-size: 13px;
}

.empty {
  color: var(--muted);
  font-size: 13px;
  padding: 6px 2px;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.list-item {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 6px;
  border-bottom: 1px solid var(--border);
}

.list-item:last-child {
  border-bottom: none;
}

.left {
  min-width: 0;
}

.title {
  font-weight: 700;
  line-height: 1.2;
}

.meta {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.edit-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
</style>
