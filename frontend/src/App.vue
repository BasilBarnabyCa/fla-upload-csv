<template>
  <div class="min-h-screen bg-gray-50">
    <header v-if="showHeader" class="bg-white shadow-sm">
      <div class="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <div class="flex items-center space-x-6">
          <h1 class="text-2xl font-semibold text-gray-900">Application Status Updater</h1>
          <nav class="flex space-x-4">
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
    <main class="max-w-6xl mx-auto px-4 py-8">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { logout, isAuthenticated, isAdmin } from './apiClient.js';

const router = useRouter();
const route = useRoute();

const showHeader = computed(() => route.path !== '/login');

function handleLogout() {
  logout();
  router.push('/login');
}
</script>

