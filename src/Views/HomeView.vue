<template>
  <div class="page">
    <div class="hero">
      <div class="title">MemoryMap</div>
      <div class="subtitle">
        Speichere Erinnerungen als Pins auf einer Weltkarte – mit Beschreibung, Datum und Medien.
      </div>

      <div class="hero-actions">
        <button class="btn primary" @click="goToMap">Zur Karte</button>
        <button class="btn" @click="goToPins">Pins ansehen</button>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">Übersicht</div>

        <div class="stats">
          <div class="stat">
            <div class="stat-label">Pins</div>
            <div class="stat-value">{{ pinsCount }}</div>
          </div>

          <div class="stat">
            <div class="stat-label">Medien</div>
            <div class="stat-value">{{ mediaCount }}</div>
          </div>
        </div>

        <div class="hint" v-if="pinsCount === 0">
          Noch keine Pins vorhanden. Gehe zur Karte und setze deinen ersten Pin.
        </div>
      </div>

      <div class="card">
        <div class="card-title">Zuletzt hinzugefügt</div>

        <div class="hint" v-if="recentPins.length === 0">
          Keine Pins vorhanden.
        </div>

        <ul class="list" v-if="recentPins.length > 0">
          <li class="item" v-for="p in recentPins" :key="p.id">
            <div class="item-main">
              <div class="item-desc">{{ p.description }}</div>
              <div class="item-meta">
                <span v-if="p.date">{{ p.date }}</span>
                <span v-if="!p.date">Kein Datum</span>
                <span> · </span>
                <span>{{ formatNumber(p.lat) }}, {{ formatNumber(p.lng) }}</span>
              </div>
            </div>

            <div class="item-actions">
              <button class="btn small" @click="openDetail(p.id)">Details</button>
              <button class="btn small secondary" @click="openOnMap(p.id)">Auf Karte</button>
            </div>
          </li>
        </ul>

        <div class="footer-actions" v-if="pinsCount > 0">
          <button class="btn" @click="goToPins">Alle Pins anzeigen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePinsStore } from '../stores/pinsStore.js'

var router = useRouter()
var pinsStore = usePinsStore()

onMounted(function () {
  // nach Reload sicher laden
  pinsStore.loadPins()
})

var pinsCount = computed(function () {
  return pinsStore.pins.length
})

var mediaCount = computed(function () {
  var total = 0
  var i
  for (i = 0; i < pinsStore.pins.length; i = i + 1) {
    var p = pinsStore.pins[i]
    if (p && Array.isArray(p.media)) {
      total = total + p.media.length
    }
  }
  return total
})

var recentPins = computed(function () {
  // letzte 5 Pins (Array-Reihenfolge = Erstell-Reihenfolge in deinem Store)
  var arr = pinsStore.pins.slice()
  arr = arr.slice(Math.max(0, arr.length - 5))
  // neueste oben
  arr.reverse()
  return arr
})

function goToMap() {
  router.push({ path: '/map' })
}

function goToPins() {
  router.push({ path: '/pins' })
}

function openDetail(id) {
  router.push({ path: '/pins/' + id })
}

function openOnMap(id) {
  router.push({ path: '/map', query: { pinId: id } })
}

function formatNumber(n) {
  return Number(n).toFixed(5)
}
</script>

<style scoped>
.page {
  padding: 14px;
  max-width: 1100px;
  margin: 0 auto;
}

.hero {
  border: 1px solid #2b3763;
  background: #0e142a;
  border-radius: 16px;
  padding: 16px;
  color: #e8eefc;
}

.title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 6px;
}

.subtitle {
  opacity: 0.85;
  line-height: 1.35;
  max-width: 720px;
}

.hero-actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.card {
  border: 1px solid #2b3763;
  background: #0e142a;
  border-radius: 16px;
  padding: 14px;
  color: #e8eefc;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.stat {
  border: 1px solid rgba(43, 55, 99, 0.65);
  border-radius: 14px;
  background: rgba(18, 26, 51, 0.55);
  padding: 12px;
}

.stat-label {
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 6px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
}

.hint {
  margin-top: 10px;
  font-size: 13px;
  opacity: 0.8;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}

.item {
  border: 1px solid rgba(43, 55, 99, 0.65);
  border-radius: 14px;
  background: rgba(18, 26, 51, 0.55);
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.item-desc {
  font-size: 14px;
  margin-bottom: 6px;
}

.item-meta {
  font-size: 12px;
  opacity: 0.85;
}

.item-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.footer-actions {
  margin-top: 12px;
}

.btn {
  height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid #2b3763;
  background: #1a2447;
  color: #e8eefc;
  cursor: pointer;
}

.btn.primary {
  background: #22306a;
}

.btn.secondary {
  background: transparent;
}

.btn.small {
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
}
</style>
