<template>
  <div class="bg-white rounded-lg shadow-sm p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-6">Upload CSV File</h2>

    <Alert v-if="alertMessage" :message="alertMessage" :type="alertType" />

    <div v-if="!uploadComplete">
      <FilePicker
        :disabled="uploading"
        input-id="csv-upload"
        @file-selected="handleFileSelected"
        @error="handleFileError"
      />

      <div v-if="selectedFile" class="mt-6">
        <ProgressBar v-if="uploading" :progress="uploadProgress" :show="true" />

        <div class="mt-6 flex justify-end">
          <button
            type="button"
            :disabled="uploading || !selectedFile"
            :class="[
              'px-4 py-2 rounded-md font-medium text-sm',
              uploading || !selectedFile
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            ]"
            @click="handleUpload"
          >
            {{ uploading ? 'Uploading...' : 'Upload' }}
          </button>
        </div>
      </div>
    </div>

    <div v-else class="mt-6">
      <div class="bg-green-50 border border-green-200 rounded-md p-4">
        <h3 class="text-lg font-semibold text-green-900 mb-4">Upload Successful</h3>
        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt class="text-sm font-medium text-gray-500">Upload ID</dt>
            <dd class="mt-1 text-sm text-gray-900 font-mono">{{ uploadReceipt.id }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">Uploaded At</dt>
            <dd class="mt-1 text-sm text-gray-900">
              {{ formatDate(uploadReceipt.createdAt) }}
            </dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">Original Filename</dt>
            <dd class="mt-1 text-sm text-gray-900">{{ uploadReceipt.file?.originalName }}</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">File Size</dt>
            <dd class="mt-1 text-sm text-gray-900">
              {{ formatFileSize(uploadReceipt.file?.sizeBytes || 0) }}
            </dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-sm font-medium text-gray-500">Blob Path</dt>
            <dd class="mt-1 text-sm text-gray-900 font-mono break-all">
              {{ uploadReceipt.file?.blobPath }}
            </dd>
          </div>
        </dl>
      </div>

      <div class="mt-6 flex justify-end">
        <button
          type="button"
          class="px-4 py-2 bg-blue-600 text-white rounded-md font-medium text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          @click="resetUpload"
        >
          Upload Another File
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import FilePicker from '../components/FilePicker.vue';
import ProgressBar from '../components/ProgressBar.vue';
import Alert from '../components/Alert.vue';
import {
  requestSAS,
  uploadToBlob,
  computeSHA256,
  completeUpload,
  getUpload
} from '../apiClient.js';

const selectedFile = ref(null);
const uploading = ref(false);
const uploadProgress = ref(0);
const uploadComplete = ref(false);
const uploadReceipt = ref(null);
const alertMessage = ref(null);
const alertType = ref('info');

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
}

function showAlert(message, type = 'error') {
  alertMessage.value = message;
  alertType.value = type;
  setTimeout(() => {
    alertMessage.value = null;
  }, 10000);
}

function handleFileSelected(file) {
  selectedFile.value = file;
  alertMessage.value = null;
}

function handleFileError(error) {
  showAlert(error, 'error');
}

async function handleUpload() {
  if (!selectedFile.value || uploading.value) return;

  uploading.value = true;
  uploadProgress.value = 0;
  alertMessage.value = null;

  try {
    // Step 1: Request SAS URL
    const sasResponse = await requestSAS(
      selectedFile.value.name,
      selectedFile.value.size,
      selectedFile.value.type || 'text/csv'
    );

    // Step 2: Upload file to blob storage
    const uploadResult = await uploadToBlob(
      selectedFile.value,
      sasResponse.sasUrl,
      (progress) => {
        uploadProgress.value = progress;
      }
    );

    // Step 3: Compute SHA-256 (optional but recommended)
    let sha256 = null;
    try {
      sha256 = await computeSHA256(selectedFile.value);
    } catch (hashError) {
      console.warn('Failed to compute SHA-256:', hashError);
    }

    // Step 4: Complete upload
    await completeUpload(sasResponse.uploadId, uploadResult.etag, sha256);

    // Step 5: Fetch receipt
    const receipt = await getUpload(sasResponse.uploadId);
    uploadReceipt.value = receipt;
    uploadComplete.value = true;
    showAlert('File uploaded successfully!', 'success');
  } catch (error) {
    console.error('Upload error:', error);
    showAlert(error.message || 'Upload failed. Please try again.', 'error');
    uploadProgress.value = 0;
  } finally {
    uploading.value = false;
  }
}

function resetUpload() {
  selectedFile.value = null;
  uploadComplete.value = false;
  uploadReceipt.value = null;
  uploadProgress.value = 0;
  alertMessage.value = null;
}
</script>

