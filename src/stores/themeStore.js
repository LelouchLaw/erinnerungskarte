
import { defineStore } from 'pinia'

var STORAGE_KEY = 'memorymap_theme_v1'

function safeTrim(v) {
  return String(v ?? '').trim()
}

function normalizeTheme(v) {
  var t = safeTrim(v).toLowerCase()
  if (t !== 'dark' && t !== 'light') return 'dark'
  return t
}

export const useThemeStore = defineStore('theme', {
  state: function () {
    return {
      theme: 'dark' // 'dark' | 'light'
    }
  },

  actions: {
    loadTheme: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) {
          this.theme = 'dark'
          this.applyThemeToDom()
          return
        }

        var data = JSON.parse(raw)
        this.theme = normalizeTheme(data && data.theme)
        this.applyThemeToDom()
      } catch (e) {
        this.theme = 'dark'
        this.applyThemeToDom()
      }
    },

    saveTheme: function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: this.theme }))
      } catch (e) {
        // ignore
      }
    },

    applyThemeToDom: function () {
      try {
        var html = document.documentElement
        if (!html) return

        html.setAttribute('data-theme', this.theme)

        // Falls früher gesetzt: Skin entfernen, damit nix „hängen bleibt“
        html.removeAttribute('data-skin')

        // Native Controls passend rendern
        html.style.colorScheme = this.theme === 'light' ? 'light' : 'dark'
      } catch (e) {
        // ignore
      }
    },

    setTheme: function (nextTheme) {
      this.theme = normalizeTheme(nextTheme)
      this.saveTheme()
      this.applyThemeToDom()
    },

    toggleTheme: function () {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      this.saveTheme()
      this.applyThemeToDom()
    }
  }
})
