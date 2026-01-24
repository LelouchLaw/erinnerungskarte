import { createApp } from 'vue'
import App from './App.vue'
import 'leaflet/dist/leaflet.css'
import './styles/global.css'
import router from './router'
import { createPinia } from 'pinia'
import { useThemeStore } from './stores/themeStore'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)

app.use(router)
var theme = useThemeStore(pinia)
theme.loadTheme()
theme.applyThemeToDom()


app.mount('#app')
