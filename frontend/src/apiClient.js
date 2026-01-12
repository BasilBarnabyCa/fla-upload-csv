const API_BASE = import.meta.env.VITE_API_BASE || '/api';

function getToken() {
  return localStorage.getItem('auth_token');
}

function setToken(token) {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function isAuthenticated() {
  return !!getToken();
}

export function logout() {
  setToken(null);
}

export async function login(username, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  setToken(data.token);
  return data;
}

function getHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Validate CSV file before upload
 * @param {File} file - File object to validate
 * @returns {Promise<Object>} Validation result with errors, warnings, and suggested filename
 */
export async function validateCSVFile(file) {
  // Read file as base64
  const fileContent = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result contains data URL (data:text/csv;base64,...)
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const response = await fetch(`${API_BASE}/uploads/validate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      fileContent,
      filename: file.name
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function requestSAS(originalName, sizeBytes, mimeType) {
  const response = await fetch(`${API_BASE}/uploads/sas`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ originalName, sizeBytes, mimeType })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function uploadToBlob(file, sasUrl, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress((e.loaded / e.total) * 100);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          etag: xhr.getResponseHeader('ETag')?.replace(/"/g, '') || null
        });
      } else {
        // Check for CORS error
        if (xhr.status === 0) {
          reject(new Error('Upload failed: CORS error. Please configure CORS on your Azure Storage Account. See docs/AZURE_SETUP.md for instructions.'));
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      }
    });

    xhr.addEventListener('error', (e) => {
      // Check if it's a CORS error
      if (xhr.status === 0 || xhr.readyState === 0) {
        reject(new Error('Upload failed: CORS error. Please configure CORS on your Azure Storage Account to allow requests from your origin. See docs/AZURE_SETUP.md for instructions.'));
      } else {
        reject(new Error(`Upload failed: network error (${xhr.status})`));
      }
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.open('PUT', sasUrl);
    xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

export async function computeSHA256(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function completeUpload(uploadId, etag, sha256 = null) {
  const response = await fetch(`${API_BASE}/uploads/complete`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ uploadId, etag, sha256 })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function getUpload(uploadId) {
  const response = await fetch(`${API_BASE}/uploads/${uploadId}`, {
    method: 'GET',
    headers: getHeaders()
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Check if there are existing uploads for today
 */
export async function checkTodaysUploads() {
  const response = await fetch(`${API_BASE}/uploads/check-today`, {
    method: 'GET',
    headers: getHeaders()
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Delete all uploads for today (or specified date)
 */
export async function deleteTodaysUploads(date = null) {
  const response = await fetch(`${API_BASE}/uploads/today`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: date ? JSON.stringify({ date }) : undefined
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// User Management (Admin only)
export async function getUsers() {
  const response = await fetch(`${API_BASE}/users`, {
    method: 'GET',
    headers: getHeaders()
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function getUser(userId) {
  const response = await fetch(`${API_BASE}/users/get/${userId}`, {
    method: 'GET',
    headers: getHeaders()
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function createUser(username, role = 'USER') {
  const response = await fetch(`${API_BASE}/users/create`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ username, role })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function updateUser(userId, updates) {
  const response = await fetch(`${API_BASE}/users/update/${userId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function deleteUser(userId) {
  const response = await fetch(`${API_BASE}/users/delete/${userId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function resetUserPassword(userId) {
  const response = await fetch(`${API_BASE}/users/${userId}/reset-password`, {
    method: 'POST',
    headers: getHeaders()
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export function getUserRole() {
  const token = getToken();
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role;
  } catch {
    return null;
  }
}

export function isAdmin() {
  const role = getUserRole();
  return role === 'ADMIN' || role === 'SUPERADMIN';
}

export async function getAuditLogs(queryParams = '') {
  const url = `${API_BASE}/audit/list${queryParams ? `?${queryParams}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders()
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }
  return response.json();
}

