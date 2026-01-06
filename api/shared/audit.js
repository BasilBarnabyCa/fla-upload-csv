import { getPrismaClient } from './prisma.js';
import { hashIP } from './hash.js';

/**
 * Log an audit event
 */
export async function logAuditEvent({
  action,
  uploadSessionId = null,
  request,
  details = null
}) {
  const prisma = getPrismaClient();
  
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown';
    const userAgent = request.headers.get('user-agent')?.substring(0, 500) || null;

    await prisma.auditLog.create({
      data: {
        action,
        uploadSessionId,
        ipHash: hashIP(ip),
        userAgent,
        detailsJson: details ? JSON.parse(JSON.stringify(details)) : null
      }
    });
  } catch (error) {
    // Don't fail the request if audit logging fails, but log it
    console.error('[Audit] Failed to log event:', {
      action,
      error: error.message
    });
  }
}

