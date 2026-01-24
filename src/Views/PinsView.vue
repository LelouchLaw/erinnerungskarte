<!-- src/views/PinsView.vue -->
<template>
  <div class="page">
    <h1 class="title">Pins</h1>

    <div class="toolbar">
      <div class="filter">
        <div class="filter-label">Album-Filter</div>
        <select class="select" v-model="selectedTripId">
          <option value="">Alle Alben</option>
          <option v-for="t in tripsStore.trips" :key="t.id" :value="t.id">
            {{ t.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="hint" v-if="pins.length === 0">
      Noch keine Pins. Erstelle welche auf der Map.
    </div>

    <ul class="list" v-if="pins.length > 0">
      <li class="item" v-for="p in pins" :key="p.id">
        <div class="main">
          <div class="desc">
            <div class="pin-title">{{ p.title || 'Ohne Titel' }}</div>
            <div class="pin-sub">{{ p.description }}</div>
          </div>

          <div class="meta">
            <span v-if="p.date">{{ p.date }}</span>
            <span v-else>Kein Datum</span>

            <span class="dot">·</span>

            <span v-if="tripName(p.tripId)">{{ tripName(p.tripId) }}</span>
            <span v-else>Kein Album</span>
          </div>
        </div>

        <!-- UX: Primär = Auf Karte + Details; Sekundär = Bearbeiten; Danger = Löschen -->
        <div class="actions">
          <button class="btn primary" @click="openOnMap(p.id)">Auf Karte</button>
          <button class="btn primary" @click="openDetails(p.id)">Details</button>

          <button class="btn secondary" @click="openEdit(p)">Bearbeiten</button>
          <button class="btn danger" @click="deletePin(p.id)">Löschen</button>
        </div>
      </li>
    </ul>

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
        <button class="btn primary" @click="saveEdit">Speichern</button>
        <button class="btn secondary" @click="closeEdit">Abbrechen</button>
      </div>

      <div class="error" v-if="editError">{{ editError }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePinsStore } from '../stores/pinsStore.js'
import { useTripsStore } from '../stores/tripsStore'

var router = useRouter()
var pinsStore = usePinsStore()
var tripsStore = useTripsStore()

var selectedTripId = ref('')

onMounted(function () {
  pinsStore.loadPins()
  tripsStore.loadTrips()
})

var pins = computed(function () {
  var all = pinsStore.pins
  var t = String(selectedTripId.value ?? '').trim()
  if (!t) return all

  return all.filter(function (p) {
    return String(p.tripId ?? '') === t
  })
})

function tripName(tripId) {
  if (!tripId) return ''
  return tripsStore.getTripNameById(String(tripId))
}

function openOnMap(id) {
  router.push({ path: '/map', query: { pinId: id } })
}

function openDetails(id) {
  router.push({ path: '/pin/' + id })
}

async function deletePin(id) {
  var ok = window.confirm('Diesen Pin wirklich löschen?')
  if (!ok) return
  await pinsStore.deletePinAndMedia(id)
}

/* --- Edit State --- */
var isEditOpen = ref(false)
var editId = ref('')
var editTitle = ref('')
var editDescription = ref('')
var editDate = ref('')
var editTripId = ref('')
var editError = ref('')

function openEdit(pin) {
  if (!pin) return

  isEditOpen.value = true
  editError.value = ''
  editId.value = pin.id

  editTitle.value = pin.title || ''
  editDescription.value = pin.description || ''
  editDate.value = pin.date || ''
  editTripId.value = pin.tripId ? String(pin.tripId) : ''
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
</script>

<style scoped>
.page {
  padding: 12px;
}

.title {
  margin: 6px 0 10px;
}

.toolbar {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  margin-top: 10px;
}

.filter {
  display: grid;
  gap: 6px;
}

.filter-label {
  font-size: 12px;
  color: var(--muted);
}

.select {
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--panel-2);
  color: var(--fg);
  padding: 0 10px;
  outline: none;
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

.desc {
  display: grid;
  gap: 4px;
}

.pin-title {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.25;
}

.pin-sub {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.3;
  word-break: break-word;
}

.meta {
  margin-top: 8px;
  font-size: 12px;
  color: var(--muted);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.dot {
  opacity: 0.7;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.btn {
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
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

.btn.danger {
  border-color: var(--danger-border);
  background: var(--danger-bg);
  color: var(--danger-fg);
}

.btn.danger:hover {
  filter: brightness(1.06);
}

/* Modal */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
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

.row {
  margin-bottom: 10px;
}

.label {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 6px;
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

.error {
  margin-top: 10px;
  font-size: 12px;
  color: var(--danger-fg);
}
</style>
