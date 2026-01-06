import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import './style.css';
import UploadCsv from './pages/UploadCsv.vue';
import Login from './pages/Login.vue';
import { isAuthenticated } from './apiClient.js';

const routes = [
  { 
    path: '/login', 
    component: Login,
    meta: { requiresAuth: false }
  },
  { 
    path: '/', 
    component: UploadCsv,
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next('/login');
  } else if (to.path === '/login' && isAuthenticated()) {
    next('/');
  } else {
    next();
  }
});

const app = createApp(App);
app.use(router);
app.mount('#app');

