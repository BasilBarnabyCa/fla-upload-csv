<template>
  <div
    v-if="message"
    :class="[
      'rounded-md p-4 mb-4',
      type === 'error' ? 'bg-red-50 border border-red-200' : '',
      type === 'success' ? 'bg-green-50 border border-green-200' : '',
      type === 'info' ? 'bg-blue-50 border border-blue-200' : '',
      type === 'warning' ? 'bg-yellow-50 border border-yellow-200' : ''
    ]"
    role="alert"
  >
    <div class="flex">
      <div class="flex-shrink-0">
        <svg
          v-if="type === 'error'"
          class="h-5 w-5 text-red-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clip-rule="evenodd"
          />
        </svg>
        <svg
          v-else-if="type === 'success'"
          class="h-5 w-5 text-green-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
            clip-rule="evenodd"
          />
        </svg>
        <svg
          v-else
          class="h-5 w-5 text-blue-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
      <div class="ml-3">
        <p
          :class="[
            'text-sm font-medium',
            type === 'error' ? 'text-red-800' : '',
            type === 'success' ? 'text-green-800' : '',
            type === 'info' ? 'text-blue-800' : '',
            type === 'warning' ? 'text-yellow-800' : ''
          ]"
        >
          {{ message }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  message: String,
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['error', 'success', 'info', 'warning'].includes(value)
  }
});
</script>

