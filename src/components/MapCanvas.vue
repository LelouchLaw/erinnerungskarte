<template>
  <div ref="el" class="map"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import { getMediaBlob } from '../services/mediaDb'

const emit = defineEmits(['map-click'])

const el = ref(null)
let map

let previewMarker = null
let pinsLayer = null
let markersById = null

// ObjectURLs merken, damit wir sie später revoken können
let markerObjectUrls = []

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
    emit('map-click', { lat: event.latlng.lat, lng: event.latlng.lng })
  })

  setTimeout(function () {
    if (map) map.invalidateSize()
  }, 0)
})

function cleanupMarkerObjectUrls() {
  var i
  for (i = 0; i < markerObjectUrls.length; i = i + 1) {
    try {
      URL.revokeObjectURL(markerObjectUrls[i])
    } catch (e) {
      // ignore
    }
  }
  markerObjectUrls = []
}

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

function buildCaption(pin) {
  // Du kannst das später schöner machen.
  // Beispiel: "Beschreibung, 2021"
  var year = ''
  if (pin.date) {
    var s = String(pin.date)
    if (s.length >= 4) year = s.slice(0, 4)
  }

  if (year) return String(pin.description) + ', ' + year
  return String(pin.description)
}

function makePhotoIcon(imageUrl, caption) {
  // DivIcon: HTML + CSS
  var html =
    '<div class="photo-pin">' +
      '<div class="photo-frame">' +
        '<img class="photo-img" src="' + imageUrl + '" />' +
      '</div>' +
      '<div class="photo-caption">' + escapeHtml(caption) + '</div>' +
      '<div class="photo-needle"></div>' +
    '</div>'

  return L.divIcon({
    className: 'photo-pin-wrapper',
    html: html,
    iconSize: [140, 160],
    iconAnchor: [70, 160] // unten Mitte sitzt auf Koordinate
  })
}

function escapeHtml(str) {
  // Minimal: verhindert, dass HTML in description kaputt macht
  var s = String(str ?? '')
  s = s.replaceAll('&', '&amp;')
  s = s.replaceAll('<', '&lt;')
  s = s.replaceAll('>', '&gt;')
  s = s.replaceAll('"', '&quot;')
  s = s.replaceAll("'", '&#39;')
  return s
}

function addPinMarker(pin) {
  if (!pinsLayer) return
  if (!markersById) markersById = {}

  // Default marker erst mal
  var m = L.marker([pin.lat, pin.lng])

  // Popup (optional)
  var text = pin.description
  if (pin.date) {
    text = text + '<br />' + pin.date
  }
  m.bindPopup(text)

  pinsLayer.addLayer(m)
  markersById[pin.id] = m

  // Wenn Pin ein Bild-Medium hat -> später Icon austauschen
  setMarkerPhotoIfPossible(m, pin)
}

async function setMarkerPhotoIfPossible(marker, pin) {
  try {
    if (!pin || !pin.media || !Array.isArray(pin.media)) return
    if (pin.media.length === 0) return

    // Wir nehmen das erste Bild aus media
    var i
    var media = null
    for (i = 0; i < pin.media.length; i = i + 1) {
      var m = pin.media[i]
      if (m && m.type === 'image' && m.id) {
        media = m
        break
      }
    }
    if (!media) return

    var blob = await getMediaBlob(String(media.id))
    if (!blob) return

    var url = URL.createObjectURL(blob)
    markerObjectUrls.push(url)

    var caption = buildCaption(pin)
    var icon = makePhotoIcon(url, caption)

    marker.setIcon(icon)
  } catch (e) {
    // wenn etwas schiefgeht: Marker bleibt normal
  }
}

function renderAllPins(pins) {
  if (!pinsLayer) return

  pinsLayer.clearLayers()
  markersById = {}
  cleanupMarkerObjectUrls()

  var i
  for (i = 0; i < pins.length; i = i + 1) {
    addPinMarker(pins[i])
  }
}

function focusPin(pin) {
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
  cleanupMarkerObjectUrls()
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

/* --- Foto-Pin Styling --- */
:global(.photo-pin-wrapper) {
  background: transparent;
  border: 0;
}

:global(.photo-pin) {
  width: 140px;
  user-select: none;
  pointer-events: auto;
  transform: translateY(-6px);
}

:global(.photo-frame) {
  width: 140px;
  height: 110px;
  border-radius: 10px;
  overflow: hidden;
  background: #ffffff;
  border: 3px solid #ffffff;
  box-shadow: 0 12px 24px rgba(0,0,0,0.25);
}

:global(.photo-img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

:global(.photo-caption) {
  margin-top: 8px;
  background: rgba(255,255,255,0.95);
  color: #111827;
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  box-shadow: 0 10px 18px rgba(0,0,0,0.18);
}

:global(.photo-needle) {
  width: 12px;
  height: 12px;
  background: #e11d48; /* roter Pin */
  border-radius: 999px;
  margin: 8px auto 0 auto;
  box-shadow: 0 6px 10px rgba(0,0,0,0.25);
  position: relative;
}

:global(.photo-needle:after) {
  content: '';
  position: absolute;
  left: 50%;
  top: 10px;
  transform: translateX(-50%);
  width: 2px;
  height: 18px;
  background: rgba(0,0,0,0.25);
  border-radius: 2px;
}
</style>
