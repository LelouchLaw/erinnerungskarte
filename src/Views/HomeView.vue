<!-- src/views/HomeView.vue -->
<template>
  <div class="page">
    <div class="hero">
      <div class="title">MemoryMap</div>
      <div class="subtitle">
        Speichere Erinnerungen als Pins auf einer Weltkarte – mit Beschreibung, Datum, Album und Medien.
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
              <div class="item-desc">
                <span class="pin-title" v-if="p.title">{{ p.title }}</span>
                <span class="pin-title" v-else>Ohne Titel</span>
                <span class="sep">·</span>
                <span class="pin-desc">{{ p.description }}</span>
              </div>

              <div class="item-meta">
                <span v-if="p.date">{{ p.date }}</span>
                <span v-else>Kein Datum</span>
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
  var arr = pinsStore.pins.slice()
  arr = arr.slice(Math.max(0, arr.length - 5))
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
  router.push({ path: '/pin/' + id })
}

function openOnMap(id) {
  router.push({ path: '/map', query: { pinId: id } })
}
</script>

<style scoped>
.page {
  padding: 14px;
  max-width: 1100px;
  margin: 0 auto;
}

.hero {
  border: 1px solid var(--border);
  background: var(--panel);
  border-radius: 16px;
  padding: 16px;
  color: var(--fg);
  box-shadow: 0 12px 24px var(--shadow);
}

.title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 6px;
}

.subtitle {
  color: var(--muted);
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
  .grid { grid-template-columns: 1fr; }
}

.card {
  border: 1px solid var(--border);
  background: var(--panel);
  border-radius: 16px;
  padding: 14px;
  color: var(--fg);
  box-shadow: 0 12px 24px var(--shadow);
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
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--panel-2);
  padding: 12px;
}

.stat-label {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 6px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
}

.hint {
  margin-top: 10px;
  font-size: 13px;
  color: var(--muted);
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}

.item {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--panel-2);
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.item-desc {
  font-size: 14px;
  margin-bottom: 6px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pin-title { font-weight: 700; }
.pin-desc { color: var(--muted); }
.sep { color: var(--muted); }

.item-meta {
  font-size: 12px;
  color: var(--muted);
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
  border: 1px solid var(--border);
  background: var(--btn);
  color: var(--fg);
  cursor: pointer;
}
.btn:hover { background: var(--btn-hover); }

.btn.primary {
  border-color: var(--border);
  background: var(--btn-hover);
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
