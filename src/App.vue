<template>
  <div class="min-h-screen bg-gray-50">
    <header v-if="showHeader" class="bg-white shadow-sm">
      <div class="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 class="text-2xl font-semibold text-gray-900">FLA CSV Upload Tool</h1>
        <button
          @click="handleLogout"
          class="text-sm text-gray-600 hover:text-gray-900 focus:outline-none"
        >
          Logout
        </button>
      </div>
    </header>
    <main class="max-w-4xl mx-auto px-4 py-8">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { logout, isAuthenticated } from './apiClient.js';

const router = useRouter();
const route = useRoute();

const showHeader = computed(() => route.path !== '/login');

function handleLogout() {
  logout();
  router.push('/login');
}
</script>

