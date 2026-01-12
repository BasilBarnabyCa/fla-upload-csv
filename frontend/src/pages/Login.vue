<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Application Status Updater
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Sign in to manage application status updates
        </p>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <Alert v-if="errorMessage" :message="errorMessage" type="error" />
        
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="username" class="sr-only">Username</label>
            <input
              id="username"
              v-model="username"
              name="username"
              type="text"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Username"
              :disabled="loading"
            />
          </div>
          <div>
            <label for="password" class="sr-only">Password</label>
            <input
              id="password"
              v-model="password"
              name="password"
              type="password"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Password"
              :disabled="loading"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            :disabled="loading"
            :class="[
              'group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            ]"
          >
            <span v-if="loading">Signing in...</span>
            <span v-else>Sign in</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '../apiClient.js';
import Alert from '../components/Alert.vue';

const router = useRouter();
const username = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref(null);

async function handleLogin() {
  if (!username.value || !password.value) {
    errorMessage.value = 'Please enter username and password';
    return;
  }

  loading.value = true;
  errorMessage.value = null;

  try {
    await login(username.value, password.value);
    router.push('/');
  } catch (error) {
    errorMessage.value = error.message || 'Login failed. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

