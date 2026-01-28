import { createRouter, createWebHistory } from 'vue-router'

import HomeView from '../views/HomeView.vue'
import MapView from '../views/MapView.vue'
import PinsView from '../views/PinsView.vue'
import TripsView from '../views/TripsView.vue'
import PinDetailsView from '../views/PinDetailsView.vue'
import TripDetailsView from '../views/TripDetailsView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/map' },

    { path: '/map', name: 'map', component: MapView },
    { path: '/home', name: 'home', component: HomeView },

    { path: '/pins', name: 'pins', component: PinsView },
    { path: '/trips', name: 'trips', component: TripsView },

    { path: '/pin/:id', name: 'pin-details', component: PinDetailsView },
    { path: '/trips/:id', name: 'trip-details', component: TripDetailsView }
  ]
})

export default router
