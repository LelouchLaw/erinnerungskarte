import { defineStore } from 'pinia'

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
        // Normalisieren: alte Pins ohne media unterstützen
        var i
        for (i = 0; i < data.length; i = i + 1) {
            if (!Array.isArray(data[i].media)) {
            data[i].media = []
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
    }

  }
})
