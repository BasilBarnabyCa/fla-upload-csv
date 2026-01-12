import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import './style.css';
import UploadCsv from './pages/UploadCsv.vue';
import Login from './pages/Login.vue';
import Users from './pages/Users.vue';
import AuditTrail from './pages/AuditTrail.vue';
import { isAuthenticated, isAdmin } from './apiClient.js';

const routes = [
  { 
    path: '/login', 
    component: Login,
    meta: { requiresAuth: false, title: 'Login - Status Portal' }
  },
  { 
    path: '/', 
    component: UploadCsv,
    meta: { requiresAuth: true, title: 'Upload - Status Portal' }
  },
  {
    path: '/users',
    component: Users,
    meta: { requiresAuth: true, requiresAdmin: true, title: 'Users - Status Portal' }
  },
  {
    path: '/audit',
    component: AuditTrail,
    meta: { requiresAuth: true, requiresAdmin: true, title: 'Audit Trail - Status Portal' }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  // Update document title
  if (to.meta.title) {
    document.title = to.meta.title;
  } else {
    document.title = 'Status Portal';
  }
  
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next('/login');
  } else if (to.meta.requiresAdmin && !isAdmin()) {
    next('/');
  } else if (to.path === '/login' && isAuthenticated()) {
    next('/');
  } else {
    next();
  }
});

const app = createApp(App);
app.use(router);
app.mount('#app');

