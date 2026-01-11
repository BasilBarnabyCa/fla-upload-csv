import { createHash } from 'crypto';

/**
 * Hash an IP address for audit logging (PII-safe)
 */
export function hashIP(ip) {
  if (!ip) return 'unknown';
  return createHash('sha256').update(ip).digest('hex');
}

/**
 * Compute SHA-256 hash of file content (for Node.js)
 */
export function computeSHA256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

