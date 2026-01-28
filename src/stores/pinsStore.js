
import { defineStore } from 'pinia'
import { deleteMedia, saveMediaFile } from '../services/mediaDb'

var STORAGE_KEY = 'memorymap_pins_v1'

function now() {
  return Date.now()
}

function toTrimmedString(v) {
  return String(v ?? '').trim()
}

function normalizeVisibility(v) {
  var s = toTrimmedString(v)
  if (!s) return 'private'
  // MVP: nur private/public akzeptieren, sonst fallback
  if (s !== 'private' && s !== 'public') return 'private'
  return s
}

function normalizeMedia(media) {
  if (!Array.isArray(media)) return []

  // sanitize refs
  var out = []
  var i
  for (i = 0; i < media.length; i = i + 1) {
    var m = media[i]
    if (!m || !m.id) continue

    var id = toTrimmedString(m.id)
    if (!id) continue

    var mime = toTrimmedString(m.mime)
    var name = toTrimmedString(m.name)

    var type = toTrimmedString(m.type) || 'file'
    if (type !== 'image' && type !== 'video' && type !== 'file') type = 'file'

    out.push({
      id: id,
      type: type,
      mime: mime,
      name: name
    })
  }

  return out
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return []
  // strings trimmen, leere raus, unique (case-insensitive optional)
  var out = []
  var seen = {}
  var i
  for (i = 0; i < tags.length; i = i + 1) {
    var t = toTrimmedString(tags[i])
    if (!t) continue
    var key = t.toLowerCase()
    if (seen[key]) continue
    seen[key] = true
    out.push(t)
  }
  return out
}

function normalizeTripId(tripId) {
  if (tripId === null || tripId === undefined) return null
  var s = toTrimmedString(tripId)
  return s ? s : null
}

function normalizeDateString(dateValue) {
  var d = toTrimmedString(dateValue)
  return d ? d : null
}

function normalizeDateRange(fromValue, toValue) {
  var from = normalizeDateString(fromValue)
  var to = normalizeDateString(toValue)

  // Wenn beide gesetzt sind, aber Reihenfolge falsch: tauschen
  if (from && to && from > to) {
    var tmp = from
    from = to
    to = tmp
  }

  return { from: from, to: to }
}


// Normalisiert ein Pin-Objekt robust
function normalizePin(pin) {
  var p = pin && typeof pin === 'object' ? pin : {}

  var created = Number(p.createdAt)
  if (!created || isNaN(created)) created = now()

  var updated = Number(p.updatedAt)
  if (!updated || isNaN(updated)) updated = created

  // Abwärtskompatibel: alte Pins mit p.date werden zu dateFrom
  var range = normalizeDateRange(p.dateFrom ?? p.date ?? null, p.dateTo ?? null)

  return {
    id: toTrimmedString(p.id) || crypto.randomUUID(),

    lat: Number(p.lat),
    lng: Number(p.lng),

    title: toTrimmedString(p.title),
    description: toTrimmedString(p.description),

    dateFrom: range.from,
    dateTo: range.to,

    tripId: normalizeTripId(p.tripId),
    visibility: normalizeVisibility(p.visibility),
    tags: normalizeTags(p.tags),

    createdAt: created,
    updatedAt: updated,

    media: normalizeMedia(p.media),
    coverMediaId: toTrimmedString(p.coverMediaId) || null,

  }
}

export const usePinsStore = defineStore('pins', {
  state: function () {
    return {
      pins: []
    }
  },

  actions: {
    loadPins: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) {
          this.pins = []
          return
        }

        var data = JSON.parse(raw)
        if (!Array.isArray(data)) {
          this.pins = []
          return
        }

        // Normalisierung: macht Demo-sicher und abwärtskompatibel
        var out = []
        var i
        for (i = 0; i < data.length; i = i + 1) {
          out.push(normalizePin(data[i]))
        }

        this.pins = out
        this.savePins() // optional: einmal sauber zurückschreiben
      } catch (e) {
        this.pins = []
      }
    },

    savePins: function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.pins))
      } catch (e) {
        // ignore
      }
    },

    addPin: function (pin) {
      // immer normalisiert ablegen
      var p = normalizePin(pin)
      this.pins.push(p)
      this.savePins()
      return p
    },

    removePinById: function (id) {
      var target = toTrimmedString(id)
      if (!target) return

      var i
      for (i = 0; i < this.pins.length; i = i + 1) {
        if (this.pins[i].id === target) {
          this.pins.splice(i, 1)
          this.savePins()
          return
        }
      }
    },

    clearPins: function () {
      this.pins = []
      this.savePins()
    },

    getPinById: function (id) {
      var target = toTrimmedString(id)
      if (!target) return null

      var i
      for (i = 0; i < this.pins.length; i = i + 1) {
        if (this.pins[i].id === target) return this.pins[i]
      }
      return null
    },

    updatePin: function (id, updates) {
      var target = toTrimmedString(id)
      if (!target) return false

      var patch = updates && typeof updates === 'object' ? updates : {}

      var i
      for (i = 0; i < this.pins.length; i = i + 1) {
        var p = this.pins[i]
        if (p.id !== target) continue

        // Titel
        if (patch.title !== undefined) {
          p.title = toTrimmedString(patch.title)
        }
        
        if (patch.coverMediaId !== undefined) {
          var v = patch.coverMediaId === null ? null : String(patch.coverMediaId ?? '').trim()
          p.coverMediaId = v ? v : null
        }

        // Beschreibung
        if (patch.description !== undefined) {
          p.description = toTrimmedString(patch.description)
        }

        // Datum
      if (patch.dateFrom !== undefined || patch.dateTo !== undefined) {
        var nextFrom = patch.dateFrom !== undefined ? patch.dateFrom : p.dateFrom
        var nextTo = patch.dateTo !== undefined ? patch.dateTo : p.dateTo
        var r = normalizeDateRange(nextFrom, nextTo)
        p.dateFrom = r.from
        p.dateTo = r.to
      }

        // Album/Trip
        if (patch.tripId !== undefined) {
          p.tripId = normalizeTripId(patch.tripId)
        }

        // Visibility
        if (patch.visibility !== undefined) {
          p.visibility = normalizeVisibility(patch.visibility)
        }

        // Tags
        if (patch.tags !== undefined) {
          p.tags = normalizeTags(patch.tags)
        }

        // media patchen wir bewusst nicht hier (dafür add/remove Media)
        p.updatedAt = now()

        this.savePins()
        return true
      }

      return false
      
    },

    deletePinAndMedia: async function (id) {
      var pin = this.getPinById(id)
      if (!pin) return

      // Medien löschen
      if (pin.media && Array.isArray(pin.media)) {
        var i
        for (i = 0; i < pin.media.length; i = i + 1) {
          var m = pin.media[i]
          if (m && m.id) {
            try {
              await deleteMedia(String(m.id))
            } catch (e) {
              // ignore (MVP)
            }
          }
        }
      }

      // Pin entfernen
      this.removePinById(pin.id)
    },

    addMediaToPin: async function (pinId, files) {
      var pin = this.getPinById(pinId)
      if (!pin) return []

      if (!pin.media || !Array.isArray(pin.media)) {
        pin.media = []
      }

      // Files normalisieren
      var list = []
      if (files && files.length !== undefined) {
        var i
        for (i = 0; i < files.length; i = i + 1) {
          list.push(files[i])
        }
      }
      if (list.length === 0) return []

      var added = []
      var j
      for (j = 0; j < list.length; j = j + 1) {
        var file = list[j]
        if (!file) continue

        if (file.size > 50 * 1024 * 1024) {
          throw new Error('Eine Datei ist größer als 50MB. Bitte kleinere Datei wählen.')
        }

        var meta = await saveMediaFile(file)

        var mime = String(meta.mime || '')
        var type = 'file'
        if (mime.indexOf('image/') === 0) type = 'image'
        if (mime.indexOf('video/') === 0) type = 'video'

        var ref = {
          id: String(meta.id),
          type: type,
          mime: meta.mime,
          name: meta.name
        }

        pin.media.push(ref)
        added.push(ref)
      }

      pin.media = normalizeMedia(pin.media) // sanitize
      pin.updatedAt = now()
      this.savePins()

      return added
    },

    removeMediaFromPin: async function (pinId, mediaId) {
      var pin = this.getPinById(pinId)
      if (!pin) return false
      if (!pin.media || !Array.isArray(pin.media)) return false

      var id = toTrimmedString(mediaId)
      if (!id) return false

      // 1) Blob löschen
      try {
        await deleteMedia(id)
      } catch (e) {
        // ignore (MVP)
      }

      // 2) Ref entfernen
      var idx = -1
      var i
      for (i = 0; i < pin.media.length; i = i + 1) {
        if (pin.media[i] && String(pin.media[i].id) === id) {
          idx = i
          break
        }
      }

      if (idx >= 0) {
        pin.media.splice(idx, 1)
        pin.media = normalizeMedia(pin.media)
        pin.updatedAt = now()
        this.savePins()
        return true
      }

      return false
    }
  }
})
