<template>
  <div v-if="show" class="w-full">
    <div class="flex justify-between text-sm text-gray-600 mb-1">
      <span>Uploading...</span>
      <span>{{ Math.round(progress) }}%</span>
    </div>
    <div class="w-full bg-gray-200 rounded-full h-2.5">
      <div
        class="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
        :style="{ width: `${progress}%` }"
        role="progressbar"
        :aria-valuenow="progress"
        aria-valuemin="0"
        aria-valuemax="100"
      ></div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  progress: {
    type: Number,
    default: 0,
    validator: (value) => value >= 0 && value <= 100
  },
  show: {
    type: Boolean,
    default: false
  }
});
</script>

