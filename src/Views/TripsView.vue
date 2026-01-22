<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTripsStore } from '../stores/tripsStore'
import { usePinsStore } from '../stores/pinsStore'

var tripsStore = useTripsStore()
var pinsStore = usePinsStore()

var newTripName = ref('')
var errorMsg = ref('')
var editingTripId = ref('')
var editingName = ref('')

onMounted(function () {
  tripsStore.loadTrips()
  pinsStore.loadPins()
})

var tripsWithCounts = computed(function () {
  // Zählt, wie viele Pins zu jedem Trip gehören
  return tripsStore.trips
    .slice()
    .sort(function (a, b) {
      return b.createdAt - a.createdAt
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
    errorMsg.value = 'Bitte einen Trip-Namen eingeben.'
    return
  }

  // Optional: Doppelte Namen vermeiden (case-insensitive)
  var exists = tripsStore.trips.some(function (t) {
    return String(t.name ?? '').trim().toLowerCase() === name.toLowerCase()
  })
  if (exists) {
    errorMsg.value = 'Ein Trip mit diesem Namen existiert bereits.'
    return
  }

  tripsStore.addTrip(name)
  newTripName.value = ''
}

function deleteTrip(tripId) {
  errorMsg.value = ''

  // Wenn Pins existieren, musst du entscheiden: blockieren oder "lösen".
  // Wir machen hier eine sichere, einfache Variante:
  // Trip löschen UND alle Pins, die darauf zeigen, auf "Kein Trip" setzen.
  var hasPins = pinsStore.pins.some(function (p) {
    return String(p.tripId ?? '') === String(tripId)
  })

  var ok = true
  if (hasPins) {
    ok = window.confirm(
      'Dieser Trip hat Pins. Wenn du löschst, werden diese Pins auf "Kein Trip" gesetzt. Fortfahren?'
    )
  } else {
    ok = window.confirm('Trip wirklich löschen?')
  }

  if (!ok) return

  // Pins "entkoppeln"
  var i
  for (i = 0; i < pinsStore.pins.length; i = i + 1) {
    if (String(pinsStore.pins[i].tripId ?? '') === String(tripId)) {
      // updatePin erwartet (id, patch)
      pinsStore.updatePin(pinsStore.pins[i].id, { tripId: null })
    }
  }

  tripsStore.removeTripById(tripId)
}
function startEditTrip(trip) {
  editingTripId.value = trip.id
  editingName.value = trip.name
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

  // optional: Duplikate vermeiden
  var exists = tripsStore.trips.some(function (t) {
    if (t.id === tripId) return false
    return String(t.name ?? '').trim().toLowerCase() === name.toLowerCase()
  })
  if (exists) {
    errorMsg.value = 'Ein Trip mit diesem Namen existiert bereits.'
    return
  }

  tripsStore.renameTrip(tripId, name)
  cancelEditTrip()
}

</script>

<template>
  <div class="page">
    <h1>Trips / Alben</h1>

    <div class="card">
      <div class="row">
        <input
          class="input"
          v-model="newTripName"
          placeholder="Neuen Trip erstellen (z. B. Italien 2025)"
          @keyup.enter="createTrip"
        />
        <button class="btn" @click="createTrip">Erstellen</button>
      </div>

      <div v-if="errorMsg" class="error">{{ errorMsg }}</div>
    </div>

    <div class="card">
      <div v-if="tripsWithCounts.length === 0" class="empty">
        Noch keine Trips erstellt.
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
    <button class="btn" @click="saveEditTrip(x.trip.id)">Speichern</button>
    <button class="btn" @click="cancelEditTrip">Abbrechen</button>
  </div>
</div>

          <div class="actions">
  <button
    v-if="editingTripId !== x.trip.id"
    class="btn"
    @click="startEditTrip(x.trip)"
  >
    Umbenennen
  </button>

  <button class="btn danger" @click="deleteTrip(x.trip.id)">
    Löschen
  </button>
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
  background: rgba(14, 20, 42, 0.92);
  border: 1px solid rgba(43, 55, 99, 0.9);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 14px;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.25);
  color: #e8eefc;
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
  border: 1px solid #2b3763;
  background: #121a33;
  color: #e8eefc;
  padding: 0 12px;
  outline: none;
}

.btn {
  height: 38px;
  border-radius: 10px;
  border: 1px solid #2b3763;
  background: #1a2550;
  color: #e8eefc;
  padding: 0 12px;
  cursor: pointer;
}

.btn:hover {
  filter: brightness(1.08);
}

.btn.danger {
  border-color: rgba(255, 90, 90, 0.55);
  background: rgba(255, 90, 90, 0.12);
}

.error {
  margin-top: 10px;
  color: rgba(255, 140, 140, 0.95);
  font-size: 13px;
}

.empty {
  opacity: 0.85;
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
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
  opacity: 0.85;
  margin-top: 2px;
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.edit-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

</style>
