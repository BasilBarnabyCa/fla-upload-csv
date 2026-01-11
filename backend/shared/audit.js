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
    // Support both Express (object) and Azure Functions (Map) headers
    const getHeader = (name) => {
      if (request.headers?.get) {
        return request.headers.get(name);
      }
      return request.headers[name.toLowerCase()] || request.headers[name];
    };
    
    const ip = getHeader('x-forwarded-for')?.split(',')[0]?.trim() ||
               getHeader('x-real-ip') ||
               request.ip ||
               'unknown';
    const userAgent = getHeader('user-agent')?.substring(0, 500) || null;

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

