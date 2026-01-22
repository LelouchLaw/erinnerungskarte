import { defineStore } from 'pinia'
import { deleteMedia } from '../services/mediaDb'


var STORAGE_KEY = 'memorymap_pins_v1'

export const usePinsStore = defineStore('pins', {
  state: function () {
    return {
      pins: []
    }
  },

  actions: {
    // Beim App-Start oder beim Laden einer View aufrufen
    loadPins: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) {
          this.pins = []
          return
        }

        var data = JSON.parse(raw)

        if (Array.isArray(data)) {
        // Normalisieren: alte Pins abwärtskompatibel halten
var i
for (i = 0; i < data.length; i = i + 1) {
  if (!Array.isArray(data[i].media)) {
    data[i].media = []
  }

  // neu: tripId
  if (data[i].tripId === undefined) {
    data[i].tripId = null
  }

  // optional sinnvoll (für später Timeline/Sorting)
  if (data[i].createdAt === undefined) {
    data[i].createdAt = Date.now()
  }
  if (data[i].updatedAt === undefined) {
    data[i].updatedAt = data[i].createdAt
  }
}

        this.pins = data
        } else {
        this.pins = []
        }

      } catch (e) {
        this.pins = []
      }
    },

    // Intern: nach jeder Änderung speichern
    savePins: function () {
      try {
        var raw = JSON.stringify(this.pins)
        localStorage.setItem(STORAGE_KEY, raw)
      } catch (e) {
        // falls Speicher voll/gesperrt: ignorieren
      }
    },

    addPin: function (pin) {
      this.pins.push(pin)
      this.savePins()
    },

    // Optional (für später)
    removePinById: function (id) {
      var i
      for (i = 0; i < this.pins.length; i = i + 1) {
        if (this.pins[i].id === id) {
          this.pins.splice(i, 1)
          this.savePins()
          return
        }
      }
    },

    // Optional (für später)
    clearPins: function () {
      this.pins = []
      this.savePins()
    },

    getPinById: function (id) {
      var i
      for (i = 0; i < this.pins.length; i = i + 1) {
        if (this.pins[i].id === id) {
          return this.pins[i]
        }
      }
      return null
    },

        updatePin: function (id, updates) {
    var i
    for (i = 0; i < this.pins.length; i = i + 1) {
        if (this.pins[i].id === id) {
        // Nur bekannte Felder aktualisieren
        if (updates && updates.description !== undefined) {
            this.pins[i].description = String(updates.description ?? '').trim()
        }
        if (updates && updates.date !== undefined) {
            var d = String(updates.date ?? '').trim()
            this.pins[i].date = d ? d : null
        }

        this.savePins()
        return
        }
    }
    },

    deletePinAndMedia: async function (id) {
    // 1) Pin finden
    var pin = this.getPinById(id)
    if (!pin) return

    // 2) Medien löschen (falls vorhanden)
    if (pin.media && Array.isArray(pin.media)) {
      var i
      for (i = 0; i < pin.media.length; i = i + 1) {
        var m = pin.media[i]
        if (m && m.id) {
          try {
            await deleteMedia(String(m.id))
          } catch (e) {
            // Wenn das Löschen fehlschlägt, löschen wir trotzdem den Pin.
            // Optional könntest du hier später eine Warnung anzeigen.
          }
        }
      }
    }

    // 3) Pin aus Store entfernen
    var idx = -1
    var j
    for (j = 0; j < this.pins.length; j = j + 1) {
      if (this.pins[j].id === id) {
        idx = j
        break
      }
    }

    if (idx >= 0) {
      this.pins.splice(idx, 1)
      this.savePins()
    }
  }
  }
})
