import { validateJWT } from './jwt.js';

/**
 * Validate JWT authentication
 * Replaces the old shared secret auth
 */
export function validateAuth(request) {
  return validateJWT(request);
}

