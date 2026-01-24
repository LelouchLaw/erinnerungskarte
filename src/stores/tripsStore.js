// src/stores/tripsStore.js
import { defineStore } from 'pinia'

var STORAGE_KEY = 'memorymap_trips_v1'

function normalizeTrip(t) {
  if (!t) return null
  var id = t.id ? String(t.id) : ''
  var name = String(t.name ?? '').trim()
  if (!id || !name) return null

  var createdAt = Number(t.createdAt || 0)
  if (!createdAt) createdAt = Date.now()

  return { id: id, name: name, createdAt: createdAt }
}

export const useTripsStore = defineStore('trips', {
  state: function () {
    return {
      trips: [] // { id, name, createdAt }
    }
  },

  actions: {
    loadTrips: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY)
        var data = raw ? JSON.parse(raw) : []
        if (!Array.isArray(data)) {
          this.trips = []
          return
        }

        var cleaned = []
        var i
        for (i = 0; i < data.length; i = i + 1) {
          var x = normalizeTrip(data[i])
          if (x) cleaned.push(x)
        }

        // optional: stable sort (newest first)
        cleaned.sort(function (a, b) {
          return (b.createdAt || 0) - (a.createdAt || 0)
        })

        this.trips = cleaned
      } catch (e) {
        this.trips = []
      }
    },

    saveTrips: function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.trips))
      } catch (e) {
        // ignore
      }
    },

    addTrip: function (name) {
      var n = String(name ?? '').trim()
      if (!n) return null

      // optional: Duplikate verhindern (case-insensitive)
      var exists = this.trips.some(function (t) {
        return String(t.name ?? '').trim().toLowerCase() === n.toLowerCase()
      })
      if (exists) return null

      var trip = {
        id: crypto.randomUUID(),
        name: n,
        createdAt: Date.now()
      }

      this.trips.unshift(trip) // neue oben
      this.saveTrips()
      return trip
    },

    removeTripById: function (id) {
      var key = String(id ?? '')
      if (!key) return false

      var idx = this.trips.findIndex(function (t) {
        return String(t.id) === key
      })

      if (idx >= 0) {
        this.trips.splice(idx, 1)
        this.saveTrips()
        return true
      }
      return false
    },

    renameTrip: function (id, newName) {
      var key = String(id ?? '')
      var n = String(newName ?? '').trim()
      if (!key || !n) return false

      var idx = this.trips.findIndex(function (t) {
        return String(t.id) === key
      })
      if (idx < 0) return false

      // optional: Duplikate verhindern
      var exists = this.trips.some(function (t) {
        if (String(t.id) === key) return false
        return String(t.name ?? '').trim().toLowerCase() === n.toLowerCase()
      })
      if (exists) return false

      this.trips[idx].name = n
      this.saveTrips()
      return true
    },

    getTripById: function (id) {
      var key = String(id ?? '')
      if (!key) return null
      var t = this.trips.find(function (x) {
        return String(x.id) === key
      })
      return t || null
    },

    getTripNameById: function (id) {
      var t = this.getTripById(id)
      return t ? t.name : ''
    }
  }
})
