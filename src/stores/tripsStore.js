import { defineStore } from 'pinia'

var STORAGE_KEY = 'memorymap_trips_v1'

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
        this.trips = Array.isArray(data) ? data : []
      } catch (e) {
        this.trips = []
      }
    },

    saveTrips: function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.trips))
      } catch (e) {
        // ignorieren
      }
    },

    addTrip: function (name) {
      var n = String(name ?? '').trim()
      if (!n) return null

      var trip = {
        id: crypto.randomUUID(),
        name: n,
        createdAt: Date.now()
      }

      this.trips.push(trip)
      this.saveTrips()
      return trip
    },

    removeTripById: function (id) {
      var idx = this.trips.findIndex(function (t) {
        return t.id === id
      })

      if (idx >= 0) {
        this.trips.splice(idx, 1)
        this.saveTrips()
      }
    },

    renameTrip: function (id, newName) {
      var n = String(newName ?? '').trim()
      if (!n) return false

      var idx = this.trips.findIndex(function (t) {
        return t.id === id
      })
      if (idx < 0) return false

      this.trips[idx].name = n
      this.saveTrips()
      return true
    },

    getTripNameById: function (id) {
      if (!id) return ''
      var t = this.trips.find(function (x) {
        return x.id === id
      })
      return t ? t.name : ''
    }
  }
})
