// src/stores/themeStore.js
import { defineStore } from 'pinia'

var STORAGE_KEY = 'memorymap_theme_v1'

// allowed: 'dark' | 'light' | 'contrast'
function normalizeTheme(v) {
  var x = String(v || '').toLowerCase()
  if (x === 'light') return 'light'
  if (x === 'contrast') return 'contrast'
  return 'dark'
}

// allowed: 'dark' | 'light'  (normalTheme darf nie contrast sein)
function normalizeNormal(v) {
  var x = String(v || '').toLowerCase()
  return x === 'light' ? 'light' : 'dark'
}

export const useThemeStore = defineStore('theme', {
  state: function () {
    return {
      // applied to <html data-theme="...">
      theme: 'dark',        // 'dark' | 'light' | 'contrast'
      // last non-contrast theme
      normalTheme: 'dark'   // 'dark' | 'light'
    }
  },

  actions: {
    loadTheme: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY)

        if (!raw) {
          this.theme = 'dark'
          this.normalTheme = 'dark'
          this.applyThemeToDom()
          return
        }

        var data = JSON.parse(raw)

        var t = normalizeTheme(data && data.theme)
        var n = normalizeNormal(data && data.normalTheme)

        this.theme = t

        // normalTheme soll immer der letzte "normale" Mode sein
        if (t === 'contrast') {
          this.normalTheme = n
        } else {
          this.normalTheme = t === 'light' ? 'light' : 'dark'
        }

        this.applyThemeToDom()
      } catch (e) {
        this.theme = 'dark'
        this.normalTheme = 'dark'
        this.applyThemeToDom()
      }
    },

    saveTheme: function () {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            theme: this.theme,
            normalTheme: this.normalTheme
          })
        )
      } catch (e) {
        // ignore
      }
    },

    applyThemeToDom: function () {
      var root = document.documentElement
      if (!root) return
      root.setAttribute('data-theme', this.theme)
    },

    // Toggle Dark <-> Light
    // If in contrast: toggle only normalTheme (base preference), keep DOM in contrast
    toggleMode: function () {
      if (this.theme === 'contrast') {
        this.normalTheme = this.normalTheme === 'dark' ? 'light' : 'dark'
        this.saveTheme()
        return
      }

      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      this.normalTheme = this.theme
      this.saveTheme()
      this.applyThemeToDom()
    },

    // Toggle Contrast ON/OFF
    toggleContrast: function () {
      if (this.theme === 'contrast') {
        // back to last normal mode
        this.theme = this.normalTheme === 'light' ? 'light' : 'dark'
        this.saveTheme()
        this.applyThemeToDom()
        return
      }

      // enter contrast; remember current normal mode
      this.normalTheme = this.theme === 'light' ? 'light' : 'dark'
      this.theme = 'contrast'
      this.saveTheme()
      this.applyThemeToDom()
    }
  }
})
