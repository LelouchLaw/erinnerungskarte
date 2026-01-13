<template>
  <div class="page">
    <h1>Pins</h1>

    <div class="hint" v-if="pins.length === 0">
      Noch keine Pins. Erstelle welche auf der Map.
    </div>

    <ul class="list" v-if="pins.length > 0">
      <li class="item" v-for="p in pins" :key="p.id">
        <div class="main">
          <div class="desc">{{ p.description }}</div>
          <div class="meta">
            <span v-if="p.date">{{ p.date }}</span>
            <span v-if="!p.date">Kein Datum</span>
            <span> · </span>
            <span>{{ formatNumber(p.lat) }}, {{ formatNumber(p.lng) }}</span>
          </div>
        </div>

        <div class="actions">
          <button class="btn" @click="openOnMap(p.id)">Auf Karte</button>
          <button class="btn" @click="openEdit(p)">Bearbeiten</button>
          <button class="btn danger" @click="deletePin(p.id)">Löschen</button>
          <button class="btn" @click="openDetails(p.id)">Details</button>
        </div>
      </li>
    </ul>

    <!-- Edit Overlay -->
    <div class="backdrop" v-if="isEditOpen" @click="closeEdit"></div>

    <div class="modal" v-if="isEditOpen">
      <div class="modal-title">Pin bearbeiten</div>

      <div class="row">
        <div class="label">Beschreibung (Pflicht)</div>
        <input class="input" type="text" v-model="editDescription" />
      </div>

      <div class="row">
        <div class="label">Datum (optional)</div>
        <input class="input" type="date" v-model="editDate" />
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
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePinsStore } from '../stores/pinsStore.js'

var router = useRouter()
var pinsStore = usePinsStore()

onMounted(function () {
  pinsStore.loadPins()
})

var pins = computed(function () {
  return pinsStore.pins
})

function openOnMap(id) {
  router.push({ path: '/map', query: { pinId: id } })
}

async function deletePin(id) {
  var ok = window.confirm('Diesen Pin wirklich löschen?')
  if (!ok) return

  await pinsStore.deletePinAndMedia(id)
}

/* --- Edit State --- */
var isEditOpen = ref(false)
var editId = ref('')
var editDescription = ref('')
var editDate = ref('')
var editError = ref('')

function openEdit(pin) {
  if (!pin) return

  isEditOpen.value = true
  editError.value = ''
  editId.value = pin.id
  editDescription.value = pin.description || ''
  editDate.value = pin.date || '' // date input erwartet String oder ''
}

function closeEdit() {
  isEditOpen.value = false
  editError.value = ''
  editId.value = ''
  editDescription.value = ''
  editDate.value = ''
}

function saveEdit() {
  var desc = String(editDescription.value ?? '').trim()
  if (!desc) {
    editError.value = 'Bitte gib eine Beschreibung ein.'
    return
  }

  pinsStore.updatePin(editId.value, {
    description: desc,
    date: editDate.value
  })

  closeEdit()
}

function formatNumber(n) {
  return Number(n).toFixed(5)
}

function openDetails(id) {
  router.push({ path: '/pins/' + id })
}

</script>

<style scoped>
.page {
  padding: 12px;
}

.hint {
  margin-top: 10px;
  opacity: 0.8;
}

.list {
  list-style: none;
  padding: 0;
  margin: 12px 0 0 0;
  display: grid;
  gap: 10px;
}

.item {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #2b3763;
  border-radius: 12px;
  background: #0e142a;
  color: #e8eefc;
}

.desc {
  font-size: 14px;
  margin-bottom: 6px;
}

.meta {
  font-size: 12px;
  opacity: 0.85;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn {
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid #2b3763;
  background: #1a2447;
  color: #e8eefc;
  cursor: pointer;
}

.btn.secondary {
  background: transparent;
}

.btn.danger {
  background: transparent;
  border-color: #6b2b2b;
}

/* Modal */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 6000;
}

.modal {
  position: fixed;
  left: 50%;
  top: 20%;
  transform: translateX(-50%);
  width: 360px;
  background: rgba(14, 20, 42, 0.98);
  border: 1px solid rgba(43, 55, 99, 0.95);
  border-radius: 14px;
  padding: 12px;
  color: #e8eefc;
  z-index: 6500;
  box-shadow: 0 18px 40px rgba(0,0,0,.45);
}

.modal-title {
  font-size: 14px;
  margin-bottom: 10px;
}

.row {
  margin-bottom: 10px;
}

.label {
  font-size: 12px;
  opacity: 0.85;
  margin-bottom: 6px;
}

.input {
  width: 100%;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #2b3763;
  background: #121a33;
  color: #e8eefc;
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
  color: #ffd1d1;
}
</style>
