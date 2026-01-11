<template>
  <div class="max-w-6xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-900">User Management</h1>
      <button
        @click="showCreateModal = true"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
      >
        + Add User
      </button>
    </div>

    <Alert v-if="errorMessage" :message="errorMessage" type="error" class="mb-4" />
    <Alert v-if="successMessage" :message="successMessage" type="success" class="mb-4" />

    <!-- Users Table -->
    <div class="bg-white shadow-sm rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              {{ user.username }}
              <span v-if="user.protected" class="ml-2 text-xs text-yellow-600" title="Protected user">🔒</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <span :class="getRoleBadgeClass(user.role)" 
                    class="px-2 py-1 rounded-full text-xs font-medium">
                {{ user.role }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <span :class="user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                    class="px-2 py-1 rounded-full text-xs font-medium">
                {{ user.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDate(user.createdAt) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <button
                @click="editUser(user)"
                :disabled="!canEditUser(user)"
                :class="!canEditUser(user) ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-900'"
                class="mr-3"
              >
                Edit
              </button>
              <button
                @click="confirmResetPassword(user)"
                :disabled="!canResetPassword(user)"
                :class="!canResetPassword(user) ? 'text-gray-400 cursor-not-allowed' : 'text-yellow-600 hover:text-yellow-900'"
                class="mr-3"
                title="Reset password"
              >
                Reset Password
              </button>
              <button
                @click="confirmDelete(user)"
                :disabled="!canDeleteUser(user)"
                :class="!canDeleteUser(user) ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-900'"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create/Edit User Modal -->
    <div v-if="showCreateModal || editingUser" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click.self="closeModal">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 class="text-lg font-bold text-gray-900 mb-4">
          {{ editingUser ? 'Edit User' : 'Create User' }}
        </h3>
        
        <form @submit.prevent="saveUser">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              v-model="formData.username"
              type="text"
              required
              :disabled="!!editingUser"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          <div v-if="editingUser" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              v-model="formData.password"
              type="password"
              placeholder="Leave blank to keep current password"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="text-xs text-gray-500 mt-1">Leave blank to keep current password</p>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              v-model="formData.role"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
              <option v-if="currentUserRole === 'SUPERADMIN'" value="SUPERADMIN">SUPERADMIN</option>
            </select>
          </div>

          <div class="mb-4">
            <label class="flex items-center">
              <input
                v-model="formData.isActive"
                type="checkbox"
                class="mr-2"
              />
              <span class="text-sm text-gray-700">Active</span>
            </label>
          </div>

          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {{ loading ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Generated Password Modal -->
    <div v-if="showPasswordModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click.self="closePasswordModal">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 class="text-lg font-bold text-gray-900 mb-4">Password Generated</h3>
        <p class="text-sm text-gray-600 mb-4">
          A new password has been generated. <strong>Copy it now</strong> - you won't be able to see it again!
        </p>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Generated Password</label>
          <div class="flex items-center space-x-2">
            <input
              :value="generatedPassword"
              type="text"
              readonly
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm"
            />
            <button
              @click="copyPassword"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              title="Copy password to clipboard"
            >
              📋 Copy
            </button>
          </div>
        </div>
        <div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p class="text-xs text-yellow-800 mb-2">
            <strong>⚠️ Security Notice:</strong> Download credentials file for secure distribution. 
            Store securely and delete after sending to user.
          </p>
          <button
            @click="downloadCredentialsCSV"
            class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
          >
            📥 Download Credentials CSV
          </button>
        </div>
        <div class="flex justify-end">
          <button
            @click="closePasswordModal"
            class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Reset Password Confirmation Modal -->
    <div v-if="userToResetPassword" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click.self="userToResetPassword = null">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 class="text-lg font-bold text-gray-900 mb-4">Reset Password</h3>
        <p class="text-sm text-gray-600 mb-4">
          Are you sure you want to reset the password for <strong>{{ userToResetPassword.username }}</strong>? 
          A new password will be generated and shown once.
        </p>
        <div class="flex justify-end space-x-3">
          <button
            @click="userToResetPassword = null"
            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="handleResetPassword"
            :disabled="loading"
            class="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400"
          >
            {{ loading ? 'Resetting...' : 'Reset Password' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="userToDelete" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click.self="userToDelete = null">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 class="text-lg font-bold text-gray-900 mb-4">Delete User</h3>
        <p class="text-sm text-gray-600 mb-4">
          Are you sure you want to deactivate <strong>{{ userToDelete.username }}</strong>? 
          This will prevent them from logging in.
        </p>
        <div class="flex justify-end space-x-3">
          <button
            @click="userToDelete = null"
            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="handleDelete"
            :disabled="loading"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
          >
            {{ loading ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getUsers, createUser, updateUser, deleteUser, resetUserPassword, getUserRole } from '../apiClient.js';
import Alert from '../components/Alert.vue';

function getRoleBadgeClass(role) {
  if (role === 'SUPERADMIN') return 'bg-red-100 text-red-800';
  if (role === 'ADMIN') return 'bg-purple-100 text-purple-800';
  return 'bg-blue-100 text-blue-800';
}

const users = ref([]);
const loading = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
const showCreateModal = ref(false);
const editingUser = ref(null);
const userToDelete = ref(null);
const userToResetPassword = ref(null);
const currentUsername = ref(null);
const currentUserRole = ref(null);

const formData = ref({
  username: '',
  password: '',
  role: 'USER',
  isActive: true
});

const generatedPassword = ref(null);
const showPasswordModal = ref(false);
const passwordUserInfo = ref(null); // Store username/role for CSV download

onMounted(async () => {
  await loadUsers();
  // Get current user's username and role from token
  const token = localStorage.getItem('auth_token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      currentUsername.value = payload.username;
      currentUserRole.value = payload.role;
    } catch {}
  }
});

async function loadUsers() {
  try {
    loading.value = true;
    errorMessage.value = null;
    const data = await getUsers();
    users.value = data.users;
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

function editUser(user) {
  editingUser.value = user;
  formData.value = {
    username: user.username,
    password: '',
    role: user.role,
    isActive: user.isActive
  };
}

function confirmDelete(user) {
  userToDelete.value = user;
}

function confirmResetPassword(user) {
  userToResetPassword.value = user;
}

async function handleDelete() {
  if (!userToDelete.value) return;
  
  try {
    loading.value = true;
    errorMessage.value = null;
    await deleteUser(userToDelete.value.id);
    successMessage.value = `User ${userToDelete.value.username} deactivated successfully`;
    userToDelete.value = null;
    await loadUsers();
    setTimeout(() => successMessage.value = null, 3000);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

async function handleResetPassword() {
  if (!userToResetPassword.value) return;
  
  try {
    loading.value = true;
    errorMessage.value = null;
    const result = await resetUserPassword(userToResetPassword.value.id);
    generatedPassword.value = result.password;
    passwordUserInfo.value = {
      username: result.username,
      role: userToResetPassword.value.role
    };
    showPasswordModal.value = true;
    userToResetPassword.value = null;
    await loadUsers();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

async function saveUser() {
  try {
    loading.value = true;
    errorMessage.value = null;
    successMessage.value = null;

    if (editingUser.value) {
      // Update existing user
      const updates = {
        role: formData.value.role,
        isActive: formData.value.isActive
      };
      if (formData.value.password) {
        updates.password = formData.value.password;
      }
      await updateUser(editingUser.value.id, updates);
      successMessage.value = 'User updated successfully';
      closeModal();
      await loadUsers();
      setTimeout(() => successMessage.value = null, 3000);
    } else {
      // Create new user (password auto-generated)
      const result = await createUser(formData.value.username, formData.value.role);
      generatedPassword.value = result.password;
      passwordUserInfo.value = {
        username: result.username,
        role: result.role
      };
      showPasswordModal.value = true;
      closeModal();
      await loadUsers();
    }
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

function closeModal() {
  showCreateModal.value = false;
  editingUser.value = null;
  formData.value = {
    username: '',
    password: '',
    role: 'USER',
    isActive: true
  };
}

function closePasswordModal() {
  showPasswordModal.value = false;
  generatedPassword.value = null;
  passwordUserInfo.value = null;
}

function downloadCredentialsCSV() {
  if (!generatedPassword.value || !passwordUserInfo.value) return;
  
  // Create CSV content (matching AWS IAM format)
  const csvContent = [
    ['User name', 'Password', 'Access key ID', 'Secret access key', 'Console login link'],
    [
      passwordUserInfo.value.username,
      generatedPassword.value,
      'N/A', // We don't have access keys in this system
      'N/A',
      window.location.origin + '/login'
    ]
  ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `credentials_${passwordUserInfo.value.username}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Show success message
  successMessage.value = 'Credentials CSV downloaded successfully';
  setTimeout(() => successMessage.value = null, 3000);
}

function copyPassword() {
  if (generatedPassword.value) {
    navigator.clipboard.writeText(generatedPassword.value);
    successMessage.value = 'Password copied to clipboard!';
    setTimeout(() => successMessage.value = null, 2000);
  }
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function canEditUser(user) {
  // SUPERADMIN can edit anyone
  if (currentUserRole.value === 'SUPERADMIN') return true;
  
  // Admin user can edit itself
  if (user.username.toLowerCase() === 'admin' && user.username.toLowerCase() === currentUsername.value?.toLowerCase()) {
    return true;
  }
  
  // Regular admins can't edit protected users
  if (user.protected) return false;
  
  return true;
}

function canResetPassword(user) {
  // SUPERADMIN can reset anyone's password
  if (currentUserRole.value === 'SUPERADMIN') return true;
  
  // Admin user can reset its own password
  if (user.username.toLowerCase() === 'admin' && user.username.toLowerCase() === currentUsername.value?.toLowerCase()) {
    return true;
  }
  
  // Regular admins can't reset protected users' passwords
  if (user.protected) return false;
  
  return true;
}

function canDeleteUser(user) {
  // Can't delete yourself
  if (user.username.toLowerCase() === currentUsername.value?.toLowerCase()) return false;
  
  // SUPERADMIN can delete anyone (except themselves)
  if (currentUserRole.value === 'SUPERADMIN') return true;
  
  // Admin user cannot be deleted by regular admins
  if (user.username.toLowerCase() === 'admin') return false;
  
  // Regular admins can't delete protected users
  if (user.protected) return false;
  
  return true;
}
</script>

