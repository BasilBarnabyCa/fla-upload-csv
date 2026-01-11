<template>
  <div>
    <div
      @dragover.prevent="handleDragOver"
      @dragenter.prevent="handleDragEnter"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
      :class="[
        'flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg',
        isDragging ? 'border-blue-400 bg-blue-50' : error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100',
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      ]"
    >
      <label
        :for="inputId"
        class="flex flex-col items-center justify-center w-full h-full cursor-pointer"
      >
        <div class="flex flex-col items-center justify-center pt-5 pb-6">
          <svg
            class="w-10 h-10 mb-3 text-gray-400"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p class="mb-2 text-sm text-gray-500">
            <span class="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p class="text-xs text-gray-500">CSV files only (MAX. 150MB)</p>
        </div>
        <input
          :id="inputId"
          type="file"
          accept=".csv,text/csv"
          class="hidden"
          :disabled="disabled"
          @change="handleFileChange"
        />
      </label>
    </div>
    <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
    <p v-if="selectedFile && !error" class="mt-2 text-sm text-gray-600">
      Selected: <span class="font-medium">{{ selectedFile.name }}</span>
      ({{ formatFileSize(selectedFile.size) }})
    </p>
  </div>
</template>

<script setup>
import { ref, defineEmits, defineProps } from 'vue';

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  },
  inputId: {
    type: String,
    default: 'file-upload'
  }
});

const emit = defineEmits(['file-selected', 'error']);

const selectedFile = ref(null);
const error = ref(null);
const isDragging = ref(false);

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function processFile(file) {
  if (!file) return;

  // Validate file type
  const validMimeTypes = ['text/csv', 'application/vnd.ms-excel'];
  const validExtensions = ['.csv'];
  const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

  if (!validExtensions.includes(ext) && !validMimeTypes.includes(file.type)) {
    error.value = 'Only CSV files are allowed';
    emit('error', error.value);
    return;
  }

  // Validate file size (150MB)
  const maxSize = 150 * 1024 * 1024;
  if (file.size > maxSize) {
    const fileSizeMB = Math.round(file.size / (1024 * 1024));
    error.value = `File size (${fileSizeMB}MB) exceeds 150MB limit`;
    emit('error', error.value);
    return;
  }

  selectedFile.value = file;
  emit('file-selected', file);
}

function handleFileChange(event) {
  error.value = null;
  selectedFile.value = null;
  const file = event.target.files?.[0];
  processFile(file);
}

function handleDragOver(event) {
  if (props.disabled) return;
  event.preventDefault();
  if (!isDragging.value) {
    isDragging.value = true;
  }
}

function handleDragEnter(event) {
  if (props.disabled) return;
  event.preventDefault();
  isDragging.value = true;
}

function handleDragLeave(event) {
  // Only set isDragging to false if we're leaving the drop zone itself
  // (not just moving to a child element)
  if (event.currentTarget === event.target) {
    isDragging.value = false;
  }
}

function handleDrop(event) {
  isDragging.value = false;
  error.value = null;
  selectedFile.value = null;

  if (props.disabled) return;

  const file = event.dataTransfer?.files?.[0];
  processFile(file);
}
</script>

