<template>
  <header class="topbar">
    <div class="brand" @click="go('/')">
      MemoryMap
    </div>

    <nav class="tabs">
      <RouterLink to="/" class="tab" active-class="active">Home</RouterLink>
      <RouterLink to="/map" class="tab" active-class="active">Map</RouterLink>
      <RouterLink to="/pins" class="tab" active-class="active">Pins</RouterLink>
    </nav>

    <button class="primary" @click="go('/map')">Neuer Pin</button>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'

var router = useRouter()

function go(path) {
  router.push({ path: path })
}
</script>

<style scoped>
.topbar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  background: #0b1020;
  border-bottom: 1px solid #2b3763;
  position: sticky;
  top: 0;
  z-index: 2500;
}

.brand {
  font-weight: 600;
  color: #e8eefc;
  cursor: pointer;
  user-select: none;
}

.tabs {
  display: flex;
  gap: 6px;
  background: #121a33;
  border: 1px solid #2b3763;
  border-radius: 999px;
  padding: 4px;
}

.tab {
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  color: #cfd8f6;
  text-decoration: none;
  font-size: 13px;
}

.tab.active {
  background: #1a2447;
  color: #e8eefc;
}

.primary {
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid #2b3763;
  background: #1a2447;
  color: #e8eefc;
  cursor: pointer;
}
</style>
