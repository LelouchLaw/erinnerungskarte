<template>
  <header class="topbar">
    <input
      v-model="q"
      @keydown.enter.prevent="emit('search', q)"
      placeholder="Ort suchen…"
      class="search"
    />
  </header>
</template>

<script setup>
import { ref } from 'vue';

// 1) Event-Emitter für 'search'
const emit = defineEmits(['search'])

// 2) (Two-Way Binding mit v-model)
const q = ref('')
</script>

<style scoped>
.topbar { height:56px; display:flex; align-items:center; padding:8px 12px; background:#0b1020; }
.search {
  flex:1; max-width:560px; height:40px;
  background:#121a33; color:#e8eefc; border:1px solid #2b3763;
  border-radius:999px; padding:0 14px; outline:none;
}
</style>
