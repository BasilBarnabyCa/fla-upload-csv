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
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed: network error'));
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

