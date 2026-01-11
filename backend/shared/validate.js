import { ValidationError } from './errors.js';

// Convert MB to bytes for validation
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '150', 10);
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['text/csv', 'application/vnd.ms-excel'];
const ALLOWED_EXTENSIONS = ['.csv'];

/**
 * Validate file upload request
 */
export function validateUploadRequest(body) {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Invalid request body');
  }

  const { originalName, sizeBytes, mimeType } = body;

  if (!originalName || typeof originalName !== 'string') {
    throw new ValidationError('originalName is required');
  }

  if (typeof sizeBytes !== 'number' || sizeBytes <= 0) {
    throw new ValidationError('sizeBytes must be a positive number');
  }

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    const maxSizeMB = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
    const fileSizeMB = Math.round(sizeBytes / (1024 * 1024));
    throw new ValidationError(`File size (${fileSizeMB}MB) exceeds maximum of ${maxSizeMB}MB`);
  }

  if (!mimeType || typeof mimeType !== 'string') {
    throw new ValidationError('mimeType is required');
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new ValidationError(`MIME type ${mimeType} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }

  const ext = originalName.toLowerCase().substring(originalName.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new ValidationError(`File extension ${ext} is not allowed. Only .csv files are accepted`);
  }

  return { originalName, sizeBytes, mimeType };
}

/**
 * Validate completion request
 */
export function validateCompletionRequest(body) {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Invalid request body');
  }

  const { uploadId, etag, sha256 } = body;

  if (!uploadId || typeof uploadId !== 'string') {
    throw new ValidationError('uploadId is required');
  }

  if (!etag || typeof etag !== 'string') {
    throw new ValidationError('etag is required');
  }

  if (sha256 && (typeof sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(sha256))) {
    throw new ValidationError('sha256 must be a valid 64-character hex string');
  }

  return { uploadId, etag, sha256: sha256 || null };
}

