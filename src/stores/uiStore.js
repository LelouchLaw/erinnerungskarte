import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: function () {
    return {
      mapSearchQuery: '',
      mapSuggestions: [],
      mapSelectedLocation: null // { name, country, latitude, longitude }
    }
  },

  actions: {
    setMapQuery: function (q) {
      this.mapSearchQuery = String(q ?? '')
    },

    setMapSuggestions: function (list) {
      this.mapSuggestions = Array.isArray(list) ? list : []
    },

    selectMapLocation: function (loc) {
      this.mapSelectedLocation = loc ? loc : null
    },

    clearMapSearch: function () {
      this.mapSearchQuery = ''
      this.mapSuggestions = []
      this.mapSelectedLocation = null
    }
  }
})
