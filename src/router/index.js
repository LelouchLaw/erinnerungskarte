import {createRouter, createWebHistory} from 'vue-router';
import HomeView from '../Views/HomeView.vue';
import MapView from '../Views/MapView.vue';
import PinsView from '../Views/PinsView.vue';
import PinDetailsView from '../Views/PinDetailsView.vue';

const router = createRouter({
    history: createWebHistory(),
    routes: [{
        path: '/',
        name: 'home',
        component: HomeView
    }, {
        path: '/map',
        name: 'map',
        component: MapView
    }, {
        path: '/pins',
        name: 'pins',
        component: PinsView
    }, {
        path: '/pin/:id',
        name: 'pin-details',
        component: PinDetailsView,
    }
    ]
});
export default router;