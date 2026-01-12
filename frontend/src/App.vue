<template>
  <div class="min-h-screen bg-gray-50">
    <header v-if="showHeader" class="bg-white shadow-sm">
      <div class="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <div class="flex items-center space-x-4">
          <img :src="logo" alt="Logo" class="h-10 w-auto" />
          <h1 class="text-2xl font-semibold text-gray-900">Status Portal</h1>
          <nav class="flex space-x-4 ml-6">
            <router-link
              to="/"
              class="text-sm text-gray-600 hover:text-gray-900 focus:outline-none"
              active-class="text-blue-600 font-medium"
            >
              Upload
            </router-link>
            <router-link
              v-if="isAdmin()"
              to="/users"
              class="text-sm text-gray-600 hover:text-gray-900 focus:outline-none"
              active-class="text-blue-600 font-medium"
            >
              Users
            </router-link>
            <router-link
              v-if="isAdmin()"
              to="/audit"
              class="text-sm text-gray-600 hover:text-gray-900 focus:outline-none"
              active-class="text-blue-600 font-medium"
            >
              Audit Trail
            </router-link>
          </nav>
        </div>
        <button
          @click="handleLogout"
          class="text-sm text-gray-600 hover:text-gray-900 focus:outline-none"
        >
          Logout
        </button>
      </div>
    </header>
    <main class="max-w-6xl mx-auto px-4 py-8 flex-1">
      <RouterView />
    </main>
    <footer class="bg-white border-t border-gray-200 mt-auto">
      <div class="max-w-6xl mx-auto px-4 py-4 text-center text-sm text-gray-600">
        <p>&copy; {{ new Date().getFullYear() }} Status Portal. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { logout, isAuthenticated, isAdmin } from './apiClient.js';
import logo from './assets/logo.png';

const router = useRouter();
const route = useRoute();

const showHeader = computed(() => route.path !== '/login');

function handleLogout() {
  logout();
  router.push('/login');
}
</script>

