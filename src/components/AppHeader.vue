<template>
<header class="topbar">
  <div class="search-wrap">
    <input
      v-model="q"
      @input="emit('input', q)"
      @keydown.enter.prevent="emit('search', q)"
      placeholder="Ort suchen…"
      class="search"
    />

    <div v-if="props.suggestions.length" class="suggestions">
      <ul>
        <li
          v-for="(s, i) in props.suggestions"
          :key="i"
          @click="emit('select', s)"
        >
          {{ s.name }}<span v-if="s.country">, {{ s.country }}</span>
        </li>
      </ul>
    </div>
  </div>

  <button class="icon" @click="emit('open-album')" aria-label="Foto hochladen">📷</button>
</header>

</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  suggestions: {
    type: Array,
    default: () => [],   // falls noch nichts geliefert wird
  },
})

// 1) Event-Emitter für 'search'
const emit = defineEmits(['search', 'input', 'select', 'open-album'])

// 2) (Two-Way Binding mit v-model)
const q = ref('')
</script>

<style scoped>
.topbar {
  height:56px; display:flex; align-items:center; gap:8px;
  padding:8px 12px; background:#0b1020;
  position: sticky; top: 0;          /* bleibt oben kleben */
  z-index: 2000;                      /* über der Karte */
}

/* Der Anker für die Dropdown-Position */
.search-wrap {
  position: relative;                 /* macht neuen Positionierungskontext */
  flex: 1; max-width: 560px;
}

/* Das Eingabefeld selbst */
.search {
  width: 100%; height: 40px;
  background:#121a33; color:#e8eefc; border:1px solid #2b3763;
  border-radius:999px; padding:0 14px; outline:none;
}

/* Die Dropdown-Liste */
.suggestions {
  position: absolute;
  left: 0; right: 0;                  /* gleiche Breite wie die .search-wrap */
  top: calc(100% + 6px);              /* direkt unter dem Input */
  background: #0e142a;
  border: 1px solid #2b3763;
  border-radius: 10px;
  overflow: hidden;
  z-index: 3000;                      /* sicher über Leaflet-Controls (800) */
  box-shadow: 0 12px 24px rgba(0,0,0,.35);
}

.suggestions ul { list-style: none; margin: 0; padding: 4px; }
.suggestions li {
  padding: 10px 12px; cursor: pointer;
}
.suggestions li:hover { background: #121a33; }

.icon{
  background:transparent; border:0; color:#e8eefc; font-size:18px; cursor:pointer; margin-left:40px;
}

</style>
