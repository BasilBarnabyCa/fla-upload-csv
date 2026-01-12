<template>
  <div class="max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-900 mb-6">Audit Trail</h1>

    <Alert v-if="errorMessage" :message="errorMessage" type="error" class="mb-4" />

    <!-- Filters -->
    <div class="bg-white shadow-sm rounded-lg p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Action</label>
          <select
            v-model="filters.action"
            @change="loadLogs"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Upload Actions</option>
            <option value="UPLOAD_COMPLETE">Upload Complete</option>
            <option value="UPLOAD_FAILED">Upload Failed</option>
            <option value="UPLOAD_DELETED">Upload Deleted</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Limit</label>
          <select
            v-model="filters.limit"
            @change="loadLogs"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option :value="50">50</option>
            <option :value="100">100</option>
            <option :value="200">200</option>
            <option :value="500">500</option>
          </select>
        </div>
        <div class="flex items-end">
          <button
            @click="loadLogs"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-2 text-sm text-gray-600">Loading audit logs...</p>
    </div>

    <!-- Audit Logs Table -->
    <div v-else class="bg-white shadow-sm rounded-lg overflow-hidden">
      <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <p class="text-sm text-gray-600">
          Showing {{ logs.length }} of {{ pagination.total }} log entries
        </p>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upload Session</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatDateTime(log.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getActionBadgeClass(log.action)"
                      class="px-2 py-1 rounded-full text-xs font-medium">
                  {{ formatAction(log.action) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>
                  <div v-if="log.uploadSession">{{ log.uploadSession.createdBy }}</div>
                  <div v-else class="text-gray-400">N/A</div>
                  <div class="text-xs text-gray-400 mt-1">
                    IP: {{ log.ipHash.substring(0, 8) }}...
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">
                <div v-if="log.uploadSession">
                  <div class="font-mono text-xs">{{ log.uploadSession.id.substring(0, 8) }}...</div>
                  <div class="text-xs mt-1">
                    <span :class="getStatusBadgeClass(log.uploadSession.status)"
                          class="px-2 py-0.5 rounded text-xs">
                      {{ log.uploadSession.status }}
                    </span>
                  </div>
                </div>
                <span v-else class="text-gray-400">N/A</span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">
                <div v-if="log.uploadSession && log.uploadSession.files && log.uploadSession.files.length > 0">
                  {{ log.uploadSession.files[0].originalName }}
                </div>
                <span v-else class="text-gray-400">N/A</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.total > filters.limit" class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
        <button
          @click="loadMore"
          :disabled="!pagination.hasMore || loading"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md font-medium text-sm"
        >
          Load More
        </button>
        <p class="text-sm text-gray-600">
          Showing {{ logs.length }} of {{ pagination.total }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Alert from '../components/Alert.vue';
import { getAuditLogs } from '../apiClient.js';
import { formatBusinessDateTime } from '../utils/timezone.js';

const logs = ref([]);
const loading = ref(false);
const errorMessage = ref(null);
const pagination = ref({
  total: 0,
  limit: 100,
  offset: 0,
  hasMore: false
});

const filters = ref({
  action: '',
  limit: 100
});

function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  return formatBusinessDateTime(dateString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatAction(action) {
  return action.replace(/_/g, ' ').toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase());
}

function getActionBadgeClass(action) {
  const classes = {
    'ISSUE_SAS': 'bg-blue-100 text-blue-800',
    'UPLOAD_COMPLETE': 'bg-green-100 text-green-800',
    'UPLOAD_FAILED': 'bg-red-100 text-red-800',
    'UPLOAD_DELETED': 'bg-orange-100 text-orange-800',
    'LOGIN_SUCCESS': 'bg-green-100 text-green-800',
    'LOGIN_FAILED': 'bg-red-100 text-red-800',
    'USER_CREATED': 'bg-blue-100 text-blue-800',
    'USER_UPDATED': 'bg-yellow-100 text-yellow-800',
    'USER_DELETED': 'bg-red-100 text-red-800',
    'USER_PASSWORD_RESET': 'bg-purple-100 text-purple-800'
  };
  return classes[action] || 'bg-gray-100 text-gray-800';
}

function getStatusBadgeClass(status) {
  const classes = {
    'PENDING': 'bg-yellow-100 text-yellow-800',
    'UPLOADED': 'bg-green-100 text-green-800',
    'FAILED': 'bg-red-100 text-red-800',
    'EXPIRED': 'bg-gray-100 text-gray-800'
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
}

async function loadLogs(reset = true) {
  if (reset) {
    pagination.value.offset = 0;
    logs.value = [];
  }

  loading.value = true;
  errorMessage.value = null;

  try {
    const params = new URLSearchParams({
      limit: filters.value.limit.toString(),
      offset: pagination.value.offset.toString(),
      uploadsOnly: 'true' // Only fetch upload-related actions
    });
    
    if (filters.value.action) {
      params.append('action', filters.value.action);
    }

    const response = await getAuditLogs(params.toString());
    
    if (reset) {
      logs.value = response.logs;
    } else {
      logs.value.push(...response.logs);
    }
    pagination.value = response.pagination;
  } catch (error) {
    console.error('Error loading audit logs:', error);
    errorMessage.value = error.message || 'Failed to load audit logs';
  } finally {
    loading.value = false;
  }
}

function loadMore() {
  pagination.value.offset += filters.value.limit;
  loadLogs(false);
}

onMounted(() => {
  loadLogs();
});
</script>

