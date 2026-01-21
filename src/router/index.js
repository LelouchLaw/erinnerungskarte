import {createRouter, createWebHistory} from 'vue-router';
import HomeView from '../views/HomeView.vue';
import MapView from '../views/MapView.vue';
import PinsView from '../views/PinsView.vue';
import PinDetailsView from '../views/PinDetailsView.vue';

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