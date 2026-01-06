import { ForbiddenError } from './errors.js';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

if (ALLOWED_ORIGINS.length === 0) {
  throw new Error('ALLOWED_ORIGINS environment variable is required');
}

/**
 * Validate CORS origin and set appropriate headers
 */
export function handleCORS(request) {
  const origin = request.headers.get('origin');
  
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };

  if (request.method === 'OPTIONS') {
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
    }
    return {
      status: 204,
      headers
    };
  }

  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    throw new ForbiddenError('Origin not allowed');
  }

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return { headers };
}

