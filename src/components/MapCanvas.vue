
<template>
  <div ref="el" class="map"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import L from 'leaflet'
import { getMediaBlob } from '../services/mediaDb'
import { useThemeStore } from '../stores/themeStore'

const emit = defineEmits(['map-click', 'pin-click'])

const el = ref(null)
let map = null
let tileLayer = null

let previewMarker = null
let pinsLayer = null
let markersById = null

var theme = useThemeStore()

// ObjectURLs merken, damit wir sie später revoken können
let markerObjectUrls = []

function ensureMapDestroyed() {
  if (map) {
    map.off()
    map.remove()
    map = null
  }
  tileLayer = null
}

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

/**
 * Map soll bei "contrast" NICHT zwangsläufig dark sein.
 * Wir nutzen bei contrast die normale Basis (normalTheme),
 * sonst direkt theme.theme.
 */
var mapMode = computed(function () {
  return theme.theme === 'light' ? 'light' : 'dark'
})


function getTileUrlForMode(mode) {
  var m = String(mode || 'dark')
  if (m === 'light') {
    return 'https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png'
  }
  return 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png'
}

function setBaseLayer(mode) {
  if (!map) return

  var url = getTileUrlForMode(mode)

  if (tileLayer) {
    try {
      map.removeLayer(tileLayer)
    } catch (e) {
      // ignore
    }
    tileLayer = null
  }

  tileLayer = L.tileLayer(url, {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19,
    noWrap: true
  })

  tileLayer.addTo(map)
}

function initMap() {
  if (!el.value) return

  // Hot-Reload / Re-mount Safety:
  if (el.value && el.value._leaflet_id) {
    try {
      delete el.value._leaflet_id
    } catch (e) {
      // ignore
    }
  }

  ensureMapDestroyed()

  map = L.map(el.value, {
    zoomControl: false,
    worldCopyJump: false,
    maxBounds: L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180)),
    maxBoundsViscosity: 1.0,
    minZoom: 2,
    maxZoom: 19
  }).setView([52.52, 13.405], 5)

  // Tile layer abhängig vom Theme (richtig!)
  setBaseLayer(mapMode.value)

  // Zoom Buttons unten rechts
  L.control.zoom({ position: 'bottomright' }).addTo(map)

  // Wenn Zoom geändert wird: Asset-Pins neu skalieren
  map.on('zoomend', function () {
    updateAssetMarkerIconsForZoom()
  })

  pinsLayer = L.layerGroup().addTo(map)
  markersById = {}

  map.on('click', function (event) {
    emit('map-click', { lat: event.latlng.lat, lng: event.latlng.lng })
  })

  // Layout-Glitch vermeiden
  setTimeout(function () {
    if (map) map.invalidateSize()
  }, 0)
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
  // Nur Titel anzeigen (Beschreibung nicht auf der Karte)
  var title = pin && pin.title ? String(pin.title).trim() : ''
  if (title) return title
  return 'Ohne Titel'
}


function escapeHtml(str) {
  var s = String(str ?? '')
  s = s.replaceAll('&', '&amp;')
  s = s.replaceAll('<', '&lt;')
  s = s.replaceAll('>', '&gt;')
  s = s.replaceAll('"', '&quot;')
  s = s.replaceAll("'", '&#39;')
  return s
}

function getAssetPinSize(zoom) {
  var z = Number(zoom)
  if (z <= 4) return { w: 90, h: 110 }
  if (z <= 7) return { w: 110, h: 130 }
  return { w: 140, h: 160 }
}

function makeLoadingIcon() {
  var html =
    '<div class="asset-pin loading">' +
      '<div class="asset-frame"></div>' +
      '<div class="asset-caption">Lade…</div>' +
      '<div class="asset-needle"></div>' +
    '</div>'

  return L.divIcon({
    className: 'asset-pin-wrapper',
    html: html,
    iconSize: [110, 130],
    iconAnchor: [55, 130]
  })
}

function makeImageIcon(imageUrl, caption, width, height) {
  var w = Number(width)
  var h = Number(height)
  var frameH = Math.round(h * 0.69)

  var html =
    '<div class="asset-pin" style="width:' + w + 'px">' +
      '<div class="asset-frame" style="width:' + w + 'px; height:' + frameH + 'px">' +
        '<img class="asset-img" src="' + imageUrl + '" />' +
      '</div>' +
      '<div class="asset-caption">' + escapeHtml(caption) + '</div>' +
      '<div class="asset-needle"></div>' +
    '</div>'

  return L.divIcon({
    className: 'asset-pin-wrapper',
    html: html,
    iconSize: [w, h],
    iconAnchor: [Math.round(w / 2), h]
  })
}

function makeVideoIcon(caption, width, height) {
  var w = Number(width)
  var h = Number(height)
  var frameH = Math.round(h * 0.69)

  var html =
    '<div class="asset-pin video" style="width:' + w + 'px">' +
      '<div class="asset-frame" style="width:' + w + 'px; height:' + frameH + 'px">' +
        '<div class="video-badge">VIDEO</div>' +
        '<div class="video-play">▶</div>' +
      '</div>' +
      '<div class="asset-caption">' + escapeHtml(caption) + '</div>' +
      '<div class="asset-needle"></div>' +
    '</div>'

  return L.divIcon({
    className: 'asset-pin-wrapper',
    html: html,
    iconSize: [w, h],
    iconAnchor: [Math.round(w / 2), h]
  })
}

function addPinMarker(pin) {
  if (!pinsLayer) return
  if (!markersById) markersById = {}

  var marker = L.marker([pin.lat, pin.lng], { icon: makeLoadingIcon() })

  marker.on('click', function () {
    if (pin && pin.id) {
      emit('pin-click', pin.id)
    }
  })

  pinsLayer.addLayer(marker)
  markersById[pin.id] = marker

  setMarkerAssetIcon(marker, pin)
}

async function setMarkerAssetIcon(marker, pin) {
  try {
    if (!pin || !pin.media || !Array.isArray(pin.media)) return
    if (pin.media.length === 0) return

    var media = null
    var i

    for (i = 0; i < pin.media.length; i = i + 1) {
      var m1 = pin.media[i]
      if (m1 && m1.type === 'image' && m1.id) {
        media = m1
        break
      }
    }

    if (!media) {
      for (i = 0; i < pin.media.length; i = i + 1) {
        var m2 = pin.media[i]
        if (m2 && m2.type === 'video' && m2.id) {
          media = m2
          break
        }
      }
    }

    if (!media) return

    var caption = buildCaption(pin)

    var currentZoom = 8
    if (map && map.getZoom) currentZoom = map.getZoom()
    var size = getAssetPinSize(currentZoom)

    if (media.type === 'image') {
      var blob = await getMediaBlob(String(media.id))
      if (!blob) return

      var url = URL.createObjectURL(blob)
      markerObjectUrls.push(url)

      marker.__assetData = {
        type: 'image',
        imageUrl: url,
        caption: caption
      }

      marker.setIcon(makeImageIcon(url, caption, size.w, size.h))
      return
    }

    if (media.type === 'video') {
      marker.__assetData = {
        type: 'video',
        caption: caption
      }

      marker.setIcon(makeVideoIcon(caption, size.w, size.h))
      return
    }
  } catch (e) {
    // bleibt Loading-Icon
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

}

function updateAssetMarkerIconsForZoom() {
  if (!map) return
  if (!markersById) return

  var size = getAssetPinSize(map.getZoom())
  var ids = Object.keys(markersById)

  var i
  for (i = 0; i < ids.length; i = i + 1) {
    var id = ids[i]
    var marker = markersById[id]
    if (!marker) continue

    if (marker.__assetData && marker.__assetData.type === 'image' && marker.__assetData.imageUrl) {
      marker.setIcon(makeImageIcon(marker.__assetData.imageUrl, marker.__assetData.caption, size.w, size.h))
      continue
    }

    if (marker.__assetData && marker.__assetData.type === 'video') {
      marker.setIcon(makeVideoIcon(marker.__assetData.caption, size.w, size.h))
      continue
    }
  }
}

defineExpose({
  setView: setView,
  setPreviewMarker: setPreviewMarker,
  clearPreviewMarker: clearPreviewMarker,
  addPinMarker: addPinMarker,
  renderAllPins: renderAllPins,
  focusPin: focusPin,
  setBaseLayer: setBaseLayer
})

onMounted(function () {
  initMap()
})

onBeforeUnmount(function () {
  cleanupMarkerObjectUrls()
  ensureMapDestroyed()
})

/**
 * WICHTIG:
 * Theme-Änderungen direkt im Canvas beobachten.
 * Dann musst du das nicht in MapView "durchreichen".
 */
watch(
  function () {
    return mapMode.value
  },
  function (mode) {
    setBaseLayer(mode)
  }
)
</script>

<style scoped>
.map {
  height: calc(100vh - 56px);
  width: 100%;
  z-index: 0;
}

/* Wrapper muss transparent sein */
:global(.asset-pin-wrapper) {
  background: transparent;
  border: 0;
}

/* Pin-Container */
:global(.asset-pin) {
  user-select: none;
  pointer-events: auto;
  transform: translateY(-6px);
}

/* Frame */
:global(.asset-frame) {
  border-radius: 10px;
  overflow: hidden;
  background: var(--panel);
  border: 3px solid var(--panel);
  box-shadow: 0 12px 24px var(--shadow);
  position: relative;
}

:global(.asset-img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

:global(.asset-caption) {
  margin-top: 8px;
  background: var(--panel);
  color: var(--fg);
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  box-shadow: 0 10px 18px var(--shadow);
}

:global(.asset-needle) {
  width: 12px;
  height: 12px;
  background: #e11d48;;
  border-radius: 999px;
  margin: 8px auto 0 auto;
  box-shadow: 0 6px 10px var(--shadow);
  position: relative;
}

:global(.asset-needle:after) {
  content: '';
  position: absolute;
  left: 50%;
  top: 10px;
  transform: translateX(-50%);
  width: 2px;
  height: 18px;
  background: var(--border);
  border-radius: 2px;
  background: rgba(0,0,0,0.35);
}

/* Loading State */
:global(.asset-pin.loading .asset-frame) {
  background: linear-gradient(90deg, var(--panel-2), var(--panel), var(--panel-2));
}

/* Video Styling */
:global(.asset-pin.video .asset-frame) {
  background: var(--bg);
  border-color: var(--panel);
}

:global(.video-badge) {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.65);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 6px;
  border-radius: 8px;
}

:global(.video-play) {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

</style>
