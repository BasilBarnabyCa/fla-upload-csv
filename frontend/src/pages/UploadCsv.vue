<template>
  <div class="bg-white rounded-lg shadow-sm p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-6">Upload CSV File</h2>

    <Alert v-if="alertMessage" :message="alertMessage" :type="alertType" />

    <div v-if="!uploadComplete">
      <FilePicker
        :disabled="uploading || validating"
        input-id="csv-upload"
        @file-selected="handleFileSelected"
        @error="handleFileError"
      />

      <div v-if="selectedFile" class="mt-6">
        <!-- Validation Results -->
        <div v-if="validationResult" class="mb-6">
          <div v-if="validationResult.valid" class="bg-green-50 border border-green-200 rounded-md p-4">
            <div class="flex items-start">
              <svg class="w-5 h-5 text-green-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div class="flex-1">
                <h3 class="text-sm font-semibold text-green-900 mb-1">File validation passed</h3>
                <p class="text-sm text-green-700">
                  <span v-if="validationResult.rowCount !== undefined && validationResult.rowCount !== null">
                    Found {{ validationResult.rowCount.toLocaleString() }} data row(s).
                  </span>
                  <span v-else>
                    File ready for upload.
                  </span>
                  <span v-if="validationResult.suggestedFilename" class="ml-1">
                    File will be renamed to <strong>{{ validationResult.suggestedFilename }}</strong>.
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div v-else class="bg-red-50 border border-red-200 rounded-md p-4">
            <h3 class="text-sm font-semibold text-red-900 mb-2">
              Validation failed
              <span v-if="validationResult.errors && validationResult.errors.length > 0" class="text-xs font-normal text-red-600">
                ({{ validationResult.errors.length }} error{{ validationResult.errors.length !== 1 ? 's' : '' }})
              </span>
            </h3>
            <div v-if="validationResult.errors && validationResult.errors.length > 0" class="max-h-64 overflow-y-auto">
              <ul class="list-disc list-inside space-y-1 text-sm text-red-700">
                <li v-for="(error, index) in validationResult.errors.slice(0, 20)" :key="index">{{ error }}</li>
                <li v-if="validationResult.errors.length > 20" class="text-red-600 font-medium">
                  ... and {{ validationResult.errors.length - 20 }} more error{{ validationResult.errors.length - 20 !== 1 ? 's' : '' }}
                </li>
              </ul>
            </div>
            <p v-else class="text-sm text-red-700">Please check your CSV file format.</p>
          </div>

          <div v-if="validationResult.warnings && validationResult.warnings.length > 0" class="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <h3 class="text-sm font-semibold text-yellow-900 mb-2">Warnings</h3>
            <ul class="list-disc list-inside space-y-1 text-sm text-yellow-700">
              <li v-for="(warning, index) in validationResult.warnings" :key="index">{{ warning }}</li>
            </ul>
          </div>
        </div>

        <!-- Validating indicator -->
        <div v-if="validating" class="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div class="flex items-center">
            <svg class="animate-spin h-5 w-5 text-blue-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-sm text-blue-700">Validating file...</span>
          </div>
        </div>

        <!-- Upload Progress Steps -->
        <div v-if="uploading" class="mb-6 space-y-4">
          <!-- Step 1: Request SAS URL -->
          <div v-if="uploadStep >= 0">
            <div class="flex justify-between text-xs text-gray-600 mb-1">
              <span>Requesting upload URL...</span>
              <span v-if="uploadStep >= 1">✓</span>
            </div>
            <div v-if="uploadStep === 0" class="w-full bg-gray-200 rounded-full h-1.5">
              <div class="bg-blue-600 h-1.5 rounded-full animate-pulse" style="width: 30%"></div>
            </div>
            <div v-else class="w-full bg-green-200 rounded-full h-1.5">
              <div class="bg-green-600 h-1.5 rounded-full" style="width: 100%"></div>
            </div>
          </div>

          <!-- Step 2: Upload to Blob Storage -->
          <div v-if="uploadStep >= 1">
            <div class="flex justify-between text-xs text-gray-600 mb-1">
              <span>Uploading file to Azure Storage...</span>
              <span v-if="uploadStep >= 2">✓</span>
              <span v-else-if="uploadStep === 1">{{ Math.round(uploadProgress) }}%</span>
            </div>
            <ProgressBar v-if="uploadStep === 1" :progress="uploadProgress" :show="true" />
            <div v-else-if="uploadStep > 1" class="w-full bg-green-200 rounded-full h-1.5">
              <div class="bg-green-600 h-1.5 rounded-full" style="width: 100%"></div>
            </div>
          </div>

          <!-- Step 3: Compute Hash -->
          <div v-if="uploadStep >= 2">
            <div class="flex justify-between text-xs text-gray-600 mb-1">
              <span>Computing file hash...</span>
              <span v-if="uploadStep >= 3">✓</span>
            </div>
            <div v-if="uploadStep === 2" class="w-full bg-gray-200 rounded-full h-1.5">
              <div class="bg-blue-600 h-1.5 rounded-full animate-pulse" style="width: 50%"></div>
            </div>
            <div v-else class="w-full bg-green-200 rounded-full h-1.5">
              <div class="bg-green-600 h-1.5 rounded-full" style="width: 100%"></div>
            </div>
          </div>

          <!-- Step 4: Validate CSV -->
          <div v-if="uploadStep >= 3">
            <div class="flex justify-between text-xs text-gray-600 mb-1">
              <span>Validating CSV file...</span>
              <span v-if="uploadStep >= 4">✓</span>
            </div>
            <div v-if="uploadStep === 3" class="w-full bg-gray-200 rounded-full h-1.5">
              <div class="bg-blue-600 h-1.5 rounded-full animate-pulse" style="width: 75%"></div>
            </div>
            <div v-else class="w-full bg-green-200 rounded-full h-1.5">
              <div class="bg-green-600 h-1.5 rounded-full" style="width: 100%"></div>
            </div>
          </div>

          <!-- Step 5: Finalize -->
          <div v-if="uploadStep >= 4">
            <div class="flex justify-between text-xs text-gray-600 mb-1">
              <span>Finalizing upload...</span>
              <span v-if="uploadStep >= 5">✓</span>
            </div>
            <div v-if="uploadStep === 4" class="w-full bg-gray-200 rounded-full h-1.5">
              <div class="bg-blue-600 h-1.5 rounded-full animate-pulse" style="width: 90%"></div>
            </div>
            <div v-else class="w-full bg-green-200 rounded-full h-1.5">
              <div class="bg-green-600 h-1.5 rounded-full" style="width: 100%"></div>
            </div>
          </div>
        </div>

        <!-- Existing Uploads Warning -->
        <div v-if="existingUploads && existingUploads.count > 0 && !uploading" class="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <div class="flex-1">
              <h3 class="text-sm font-semibold text-yellow-900 mb-1">
                {{ existingUploads.count }} file{{ existingUploads.count !== 1 ? 's' : '' }} already uploaded today
              </h3>
              <p class="text-sm text-yellow-700 mb-3">
                Multiple uploads per day are allowed (for audit trail). If you want to replace today's uploads, check the box below.
              </p>
              <label class="flex items-center">
                <input
                  v-model="replaceTodaysUploads"
                  type="checkbox"
                  class="mr-2"
                />
                <span class="text-sm text-yellow-800">Replace today's uploads (delete existing files before uploading)</span>
              </label>
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button
            type="button"
            :disabled="uploading || validating || !selectedFile || (validationResult && !validationResult.valid)"
            :class="[
              'px-4 py-2 rounded-md font-medium text-sm',
              uploading || validating || !selectedFile || (validationResult && !validationResult.valid)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            ]"
            @click="handleUpload"
          >
            {{ validating ? 'Validating...' : 'Upload' }}
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
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import FilePicker from '../components/FilePicker.vue';
import ProgressBar from '../components/ProgressBar.vue';
import Alert from '../components/Alert.vue';
import {
  validateCSVFile,
  requestSAS,
  uploadToBlob,
  computeSHA256,
  completeUpload,
  getUpload,
  checkTodaysUploads,
  deleteTodaysUploads
} from '../apiClient.js';
import { formatBusinessDateTime, getBusinessDate } from '../utils/timezone.js';

const selectedFile = ref(null);
const uploading = ref(false);
const validating = ref(false);
const uploadProgress = ref(0);
const uploadComplete = ref(false);
const uploadReceipt = ref(null);
const alertMessage = ref(null);
const alertType = ref('info');
const validationResult = ref(null);
const validatedFilename = ref(null);
const uploadStep = ref(0); // 0=requesting SAS, 1=uploading, 2=computing hash, 3=validating, 4=finalizing, 5=complete
const existingUploads = ref(null);
const replaceTodaysUploads = ref(false);

// Warn user before leaving page during upload
function handleBeforeUnload(e) {
  if (uploading.value) {
    e.preventDefault();
    e.returnValue = 'Upload in progress. Are you sure you want to leave?';
    return e.returnValue;
  }
}

// Add/remove beforeunload listener when upload starts/stops
watch(uploading, (isUploading) => {
  if (isUploading) {
    window.addEventListener('beforeunload', handleBeforeUnload);
  } else {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});

onMounted(async () => {
  try {
    existingUploads.value = await checkTodaysUploads();
  } catch (error) {
    console.error('Error checking today\'s uploads:', error);
    existingUploads.value = null;
  }
});

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return formatBusinessDateTime(dateString);
}

function showAlert(message, type = 'error') {
  alertMessage.value = message;
  alertType.value = type;
  setTimeout(() => {
    alertMessage.value = null;
  }, 10000);
}

async function handleFileSelected(file) {
  selectedFile.value = file;
  alertMessage.value = null;
  validationResult.value = null;
  validatedFilename.value = null;
  replaceTodaysUploads.value = false;

  // Check for existing uploads today
  try {
    existingUploads.value = await checkTodaysUploads();
  } catch (error) {
    console.warn('Could not check existing uploads:', error);
    existingUploads.value = null;
  }

  // Auto-validate when file is selected
  await validateFile(file);
}

async function validateFile(file) {
  if (!file) return;

  validating.value = true;
  
  // For large files (>50MB), skip full validation before upload
  // We'll validate after upload from blob storage
  const fileSizeMB = file.size / (1024 * 1024);
  const LARGE_FILE_THRESHOLD_MB = 50;
  
  if (fileSizeMB > LARGE_FILE_THRESHOLD_MB) {
    // Basic validation only for large files
    // For large files, we can't send the entire file for validation due to request size limits
    // Full validation will happen after upload from blob storage
    const businessDate = getBusinessDate();
    const [year, month, day] = businessDate.split('-');
    const suggestedFilename = `${year}${month}${day}.csv`;
    
    // Try to read first chunk to count rows (up to 5MB for better accuracy)
    let rowCount = null;
    try {
      const chunkSize = Math.min(5 * 1024 * 1024, file.size); // Read up to 5MB
      const chunk = file.slice(0, chunkSize);
      const text = await chunk.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      
      if (lines.length > 0) {
        // Check if first line looks like a header (has column names)
        const firstLine = lines[0];
        const hasHeader = firstLine.includes('appli_no') || firstLine.includes(',');
        
        if (hasHeader && lines.length > 1) {
          // Subtract header row
          rowCount = lines.length - 1;
          
          // If we read a chunk, estimate total rows based on file size
          if (chunkSize < file.size) {
            const rowsPerMB = rowCount / (chunkSize / (1024 * 1024));
            const estimatedTotalRows = Math.floor(rowsPerMB * fileSizeMB);
            rowCount = estimatedTotalRows; // Use estimated total
          }
        } else if (lines.length > 0) {
          // No clear header, assume all lines are data
          rowCount = lines.length;
          if (chunkSize < file.size) {
            const rowsPerMB = rowCount / (chunkSize / (1024 * 1024));
            const estimatedTotalRows = Math.floor(rowsPerMB * fileSizeMB);
            rowCount = estimatedTotalRows;
          }
        }
      }
    } catch (error) {
      // If we can't read the chunk, that's okay
      console.warn('Could not read file chunk for row count:', error);
    }
    
    validationResult.value = {
      valid: true,
      errors: [],
      warnings: [
        `Large file (${Math.round(fileSizeMB)}MB) - full validation will occur after upload`,
        rowCount !== null ? `Estimated ${rowCount.toLocaleString()} data rows (from file preview)` : 'Row count will be determined after upload'
      ],
      suggestedFilename,
      rowCount: rowCount // Show estimated count
    };
    validatedFilename.value = suggestedFilename;
    validating.value = false;
    return;
  }

  // Full validation for smaller files
  try {
    const result = await validateCSVFile(file);
    validationResult.value = result;
    
    // If validation passes, store the suggested filename
    if (result.valid && result.suggestedFilename) {
      validatedFilename.value = result.suggestedFilename;
    }
  } catch (error) {
    console.error('Validation error:', error);
    showAlert(error.message || 'Validation failed. Please try again.', 'error');
    validationResult.value = {
      valid: false,
      errors: [error.message || 'Validation failed'],
      warnings: [],
      suggestedFilename: null
    };
  } finally {
    validating.value = false;
  }
}

function handleFileError(error) {
  showAlert(error, 'error');
}

async function handleUpload() {
  if (!selectedFile.value || uploading.value) return;

  // Ensure file is validated
  if (!validationResult.value) {
    await validateFile(selectedFile.value);
  }

  // Don't proceed if validation failed
  if (!validationResult.value || !validationResult.value.valid) {
    showAlert('Please fix validation errors before uploading.', 'error');
    return;
  }

  uploading.value = true;
  uploadProgress.value = 0;
  uploadStep.value = 0;
  alertMessage.value = null;

  try {
    // Delete today's uploads if requested
    if (replaceTodaysUploads.value && existingUploads.value && existingUploads.value.count > 0) {
      try {
        await deleteTodaysUploads();
        showAlert(`Deleted ${existingUploads.value.count} existing file${existingUploads.value.count !== 1 ? 's' : ''}`, 'success');
        existingUploads.value = { count: 0, files: [] };
      } catch (deleteError) {
        console.error('Failed to delete existing uploads:', deleteError);
        showAlert('Warning: Could not delete existing files. Upload will continue.', 'error');
      }
    }

    // Use validated filename if available, otherwise use original
    const filenameToUse = validatedFilename.value || selectedFile.value.name;

    // Step 1: Request SAS URL
    uploadStep.value = 0;
    const sasResponse = await requestSAS(
      filenameToUse,
      selectedFile.value.size,
      selectedFile.value.type || 'text/csv'
    );
    uploadStep.value = 1;

    // Step 2: Upload file to blob storage
    const uploadResult = await uploadToBlob(
      selectedFile.value,
      sasResponse.sasUrl,
      (progress) => {
        uploadProgress.value = progress;
      }
    );
    uploadStep.value = 2;

    // Step 3: Compute SHA-256 (optional but recommended)
    let sha256 = null;
    try {
      sha256 = await computeSHA256(selectedFile.value);
    } catch (hashError) {
      console.warn('Failed to compute SHA-256:', hashError);
    }
    uploadStep.value = 3;

    // Step 4: Complete upload (includes CSV validation for large files)
    await completeUpload(sasResponse.uploadId, uploadResult.etag, sha256);
    uploadStep.value = 4;

    // Step 5: Fetch receipt
    const receipt = await getUpload(sasResponse.uploadId);
    uploadReceipt.value = receipt;
    uploadStep.value = 5;
    uploadComplete.value = true;
    showAlert('File uploaded successfully!', 'success');
  } catch (error) {
    console.error('Upload error:', error);
    uploadStep.value = 0;
    
    // Extract error message - handle validation errors specially
    let errorMessage = error.message || 'Upload failed. Please try again.';
    
    // If it's a validation error, show it prominently
    if (errorMessage.includes('CSV validation failed')) {
      // Show validation errors in a more user-friendly way
      const errorParts = errorMessage.split(':');
      if (errorParts.length > 1) {
        const mainError = errorParts[0]; // "CSV validation failed (X errors)"
        const details = errorParts.slice(1).join(':').trim();
        
        // Show main error in alert
        showAlert(mainError, 'error');
        
        // Store detailed errors for display
        validationResult.value = {
          valid: false,
          errors: details.split(';').map(e => e.trim()).filter(e => e),
          warnings: [],
          suggestedFilename: validatedFilename.value,
          rowCount: null
        };
      } else {
        showAlert(errorMessage, 'error');
      }
    } else {
      showAlert(errorMessage, 'error');
    }
    
    uploadProgress.value = 0;
  } finally {
    uploading.value = false;
    uploadStep.value = 0;
  }
}

function resetUpload() {
  selectedFile.value = null;
  uploadComplete.value = false;
  uploadReceipt.value = null;
  uploadProgress.value = 0;
  alertMessage.value = null;
  validationResult.value = null;
  validatedFilename.value = null;
  existingUploads.value = null;
  replaceTodaysUploads.value = false;
  
  // Refresh existing uploads count
  checkTodaysUploads().then(result => {
    existingUploads.value = result;
  }).catch(() => {
    existingUploads.value = null;
  });
}
</script>

