<template>
  <div ref="el" class="map"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import L from 'leaflet'

const emit = defineEmits(['map-click'])

const el = ref(null)
let map

let previewMarker = null
let pinsLayer = null

// Wichtig: Marker pro Pin-ID merken
let markersById = null

onMounted(function () {
  map = L.map(el.value).setView([52.52, 13.405], 5)

  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png',
    {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 19
    }
  ).addTo(map)

  pinsLayer = L.layerGroup().addTo(map)
  markersById = {}

  map.on('click', function (event) {
    var lat = event.latlng.lat
    var lng = event.latlng.lng
    emit('map-click', { lat: lat, lng: lng })
  })

  setTimeout(function () {
    if (map) map.invalidateSize()
  }, 0)
})

function setView(lat, lng, zoom) {
  var z = zoom
  if (z === undefined || z === null) z = 12
  if (map) map.setView([lat, lng], z)
}

function setPreviewMarker(lat, lng) {
  if (!map) return

  if (!previewMarker) {
    previewMarker = L.marker([lat, lng])
    previewMarker.addTo(map)
  } else {
    previewMarker.setLatLng([lat, lng])
  }
}

function clearPreviewMarker() {
  if (!map) return
  if (previewMarker) {
    map.removeLayer(previewMarker)
    previewMarker = null
  }
}

function addPinMarker(pin) {
  if (!pinsLayer) return
  if (!markersById) markersById = {}

  var text = pin.description
  if (pin.date) {
    text = text + '<br />' + pin.date
  }

  var m = L.marker([pin.lat, pin.lng])
  m.bindPopup(text)
  pinsLayer.addLayer(m)

  // Marker speichern
  markersById[pin.id] = m
}

function renderAllPins(pins) {
  if (!pinsLayer) return

  pinsLayer.clearLayers()
  markersById = {}

  var i
  for (i = 0; i < pins.length; i = i + 1) {
    addPinMarker(pins[i])
  }
}

function focusPin(pin) {
  // pin ist das Pin-Objekt
  if (!map) return
  if (!pin) return
  if (!markersById) return

  var marker = markersById[pin.id]
  map.setView([pin.lat, pin.lng], 13)

  if (marker && marker.openPopup) {
    marker.openPopup()
  }
}

defineExpose({
  setView: setView,
  setPreviewMarker: setPreviewMarker,
  clearPreviewMarker: clearPreviewMarker,
  addPinMarker: addPinMarker,
  renderAllPins: renderAllPins,
  focusPin: focusPin
})

onBeforeUnmount(function () {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.map {
  height: calc(100vh - 56px);
  width: 100%;
  z-index: 0;
}
</style>
