<!-- src/components/AppNav.vue -->
<template>
  <header class="nav">
    <div class="brand" @click="goTo('/')">MemoryMap</div>

    <!-- Suche nur auf der Karte -->
    <div v-if="isMap" class="search-wrap">
      <input
        v-model="q"
        @input="onInput"
        @keydown.enter.prevent="onEnter"
        placeholder="Ort suchen…"
        class="search"
      />

      <div v-if="ui.mapSuggestions.length" class="suggestions">
        <ul>
          <li v-for="(s, i) in ui.mapSuggestions" :key="i" @click="selectSuggestion(s)">
            {{ s.name }}<span v-if="s.country">, {{ s.country }}</span>
          </li>
        </ul>
      </div>
    </div>

    <nav class="tabs">
      <RouterLink to="/" class="tab" active-class="active">Start</RouterLink>
      <RouterLink to="/map" class="tab" active-class="active">Karte</RouterLink>
      <RouterLink to="/pins" class="tab" active-class="active">Pins</RouterLink>
      <RouterLink to="/trips" class="tab" active-class="active">Alben</RouterLink>
    </nav>

    <div class="tools">
      <button class="toolbtn" type="button" @click="theme.toggleTheme()">
        {{ theme.theme === 'dark' ? 'Hell' : 'Dunkel' }}
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '../stores/uiStore'
import { useThemeStore } from '../stores/themeStore'

var router = useRouter()
var route = useRoute()

var ui = useUiStore()
var theme = useThemeStore()

var isMap = computed(function () {
  return route.path === '/map'
})

var q = ref('')
var debounceId = null

function goTo(path) {
  router.push({ path: path })
}

function onInput() {
  ui.setMapQuery(q.value)
  clearTimeout(debounceId)
  debounceId = setTimeout(function () {
    fetchSuggestions(q.value)
  }, 250)
}

function onEnter() {
  if (ui.mapSuggestions.length > 0) {
    selectSuggestion(ui.mapSuggestions[0])
    return
  }
  searchOne(q.value)
}

function selectSuggestion(s) {
  ui.setMapSuggestions([])
  ui.selectMapLocation(s)
}

async function searchOne(text) {
  try {
    var query = String(text ?? '').trim()
    if (!query) return

    var url =
      'https://geocoding-api.open-meteo.com/v1/search' +
      '?name=' + encodeURIComponent(query) +
      '&count=1&language=de&format=json'

    var res = await fetch(url)
    if (!res.ok) return

    var data = await res.json()
    var hit = data && data.results && data.results[0]
    if (!hit) return

    ui.selectMapLocation({
      name: hit.name,
      country: hit.country ?? '',
      latitude: hit.latitude,
      longitude: hit.longitude
    })
  } catch (e) {
    // ignore
  }
}

async function fetchSuggestions(text) {
  var query = String(text ?? '').trim()
  if (!query) {
    ui.setMapSuggestions([])
    return
  }

  var url =
    'https://geocoding-api.open-meteo.com/v1/search' +
    '?name=' + encodeURIComponent(query) +
    '&count=5&language=de&format=json'

  try {
    var res = await fetch(url)
    if (!res.ok) {
      ui.setMapSuggestions([])
      return
    }

    var data = await res.json()
    var list = Array.isArray(data && data.results) ? data.results : []

    ui.setMapSuggestions(
      list.map(function (r) {
        return {
          name: r.name,
          country: r.country ?? '',
          latitude: r.latitude,
          longitude: r.longitude
        }
      })
    )
  } catch (e) {
    ui.setMapSuggestions([])
  }
}
</script>

<style scoped>
.nav {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;

  background: var(--panel);
  border-bottom: 1px solid var(--border);

  position: sticky;
  top: 0;
  z-index: 2500;
}

.brand {
  color: var(--fg);
  font-weight: 800;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.tabs {
  display: flex;
  gap: 6px;

  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px;

  white-space: nowrap;
}

.tab {
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;

  color: var(--fg);
  text-decoration: none;
  font-size: 13px;
  line-height: 1;
  opacity: 0.9;
}

.tab.active {
  background: var(--btn);
  color: var(--fg);
  opacity: 1;
}

.tab:hover {
  background: rgba(0, 0, 0, 0.06);
}

/* Suche */
.search-wrap {
  position: relative;
  flex: 1;
  max-width: 520px;
}

.search {
  width: 100%;
  height: 40px;

  background: var(--panel-2);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0 14px;
  outline: none;
}

.suggestions {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);

  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;

  z-index: 3000;
  box-shadow: 0 12px 24px var(--shadow);
}

.suggestions ul {
  list-style: none;
  margin: 0;
  padding: 4px;
}

.suggestions li {
  padding: 10px 12px;
  cursor: pointer;
  color: var(--fg);
}

.suggestions li:hover {
  background: var(--panel-2);
}

/* Tools */
.tools {
  display: flex;
  gap: 10px;
  align-items: center;
}

.toolbtn {
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--border);

  background: var(--btn);
  color: var(--fg);
  cursor: pointer;
  font-weight: 650;
}

.toolbtn:hover {
  background: var(--btn-hover);
}
</style>
