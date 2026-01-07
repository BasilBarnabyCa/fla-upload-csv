import { app } from '@azure/functions';
import { handleCORS } from '../../shared/cors.js';
import { validateAuth } from '../../shared/auth.js';
import { getPrismaClient } from '../../shared/prisma.js';
import { handleError, ForbiddenError } from '../../shared/errors.js';
import { Prisma } from '@prisma/client';

app.http('audit_list', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'audit/list',
  handler: async (request, context) => {
    try {
      const corsResult = handleCORS(request);
      if (corsResult.status) {
        return corsResult;
      }

      const tokenPayload = validateAuth(request);
      
      // Only ADMIN or SUPERADMIN can view audit logs
      if (tokenPayload.role !== 'ADMIN' && tokenPayload.role !== 'SUPERADMIN') {
        throw new ForbiddenError('Only administrators can view audit logs');
      }

      // Parse query parameters
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '100', 10);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);
      const action = url.searchParams.get('action'); // Optional filter by action
      const uploadSessionId = url.searchParams.get('uploadSessionId'); // Optional filter by upload session
      const uploadsOnly = url.searchParams.get('uploadsOnly') === 'true'; // Filter to only upload-related actions

      // Validate limit (max 1000)
      const validLimit = Math.min(Math.max(limit, 1), 1000);
      const validOffset = Math.max(offset, 0);

      const prisma = getPrismaClient();
      
      let auditLogs, total;

      if (uploadsOnly && !action) {
        // Use raw SQL query to filter by enum values (Prisma doesn't support 'in' for enums)
        // Exclude ISSUE_SAS - only show actual upload completion/failure/deletion events
        // Get total count using raw SQL
        const countQuery = uploadSessionId
          ? Prisma.sql`SELECT COUNT(*)::int as count FROM audit_logs WHERE action IN ('UPLOAD_COMPLETE', 'UPLOAD_FAILED', 'UPLOAD_DELETED') AND "uploadSessionId" = ${uploadSessionId}`
          : Prisma.sql`SELECT COUNT(*)::int as count FROM audit_logs WHERE action IN ('UPLOAD_COMPLETE', 'UPLOAD_FAILED', 'UPLOAD_DELETED')`;
        const countResult = await prisma.$queryRaw(countQuery);
        total = Number(countResult[0].count);

        // Fetch logs with pagination using raw SQL
        const logsQuery = uploadSessionId
          ? Prisma.sql`
            SELECT 
              al.id,
              al.action,
              al."uploadSessionId",
              al."ipHash",
              al."userAgent",
              al."createdAt",
              al."detailsJson",
              us.id as "session_id",
              us.status as "session_status",
              us."createdBy" as "session_createdBy",
              us."createdAt" as "session_createdAt"
            FROM audit_logs al
            LEFT JOIN upload_sessions us ON al."uploadSessionId" = us.id
            WHERE al.action IN ('UPLOAD_COMPLETE', 'UPLOAD_FAILED', 'UPLOAD_DELETED') AND al."uploadSessionId" = ${uploadSessionId}
            ORDER BY al."createdAt" DESC
            LIMIT ${validLimit}
            OFFSET ${validOffset}
          `
          : Prisma.sql`
            SELECT 
              al.id,
              al.action,
              al."uploadSessionId",
              al."ipHash",
              al."userAgent",
              al."createdAt",
              al."detailsJson",
              us.id as "session_id",
              us.status as "session_status",
              us."createdBy" as "session_createdBy",
              us."createdAt" as "session_createdAt"
            FROM audit_logs al
            LEFT JOIN upload_sessions us ON al."uploadSessionId" = us.id
            WHERE al.action IN ('UPLOAD_COMPLETE', 'UPLOAD_FAILED', 'UPLOAD_DELETED')
            ORDER BY al."createdAt" DESC
            LIMIT ${validLimit}
            OFFSET ${validOffset}
          `;
        const logsResult = await prisma.$queryRaw(logsQuery);

        // Fetch files for each session
        const sessionIds = [...new Set(logsResult.map(log => log.session_id).filter(Boolean))];
        const filesMap = {};
        if (sessionIds.length > 0) {
          const files = await prisma.uploadFile.findMany({
            where: {
              uploadSessionId: { in: sessionIds }
            },
            select: {
              id: true,
              uploadSessionId: true,
              originalName: true,
              blobPath: true,
              sizeBytes: true
            }
          });
          files.forEach(file => {
            if (!filesMap[file.uploadSessionId]) {
              filesMap[file.uploadSessionId] = [];
            }
            filesMap[file.uploadSessionId].push(file);
          });
        }

        // Transform results to match expected format
        auditLogs = logsResult.map(log => ({
          id: log.id,
          action: log.action,
          createdAt: log.createdAt,
          ipHash: log.ipHash,
          userAgent: log.userAgent,
          uploadSessionId: log.uploadSessionId,
          detailsJson: log.detailsJson,
          uploadSession: log.session_id ? {
            id: log.session_id,
            status: log.session_status,
            createdBy: log.session_createdBy,
            createdAt: log.session_createdAt,
            files: filesMap[log.session_id] || []
          } : null
        }));
      } else {
        // Standard Prisma query for single action or all actions
        const where = {};
        if (action) {
          where.action = action;
        }
        if (uploadSessionId) {
          where.uploadSessionId = uploadSessionId;
        }

        [auditLogs, total] = await Promise.all([
          prisma.auditLog.findMany({
            where,
            orderBy: {
              createdAt: 'desc'
            },
            take: validLimit,
            skip: validOffset,
            include: {
              uploadSession: {
                include: {
                  files: {
                    select: {
                      id: true,
                      originalName: true,
                      blobPath: true,
                      sizeBytes: true
                    }
                  }
                }
              }
            }
          }),
          prisma.auditLog.count({ where })
        ]);
      }

      return {
        status: 200,
        headers: corsResult.headers,
        jsonBody: {
          logs: auditLogs.map(log => ({
            id: log.id,
            action: log.action,
            createdAt: log.createdAt.toISOString(),
            ipHash: log.ipHash,
            userAgent: log.userAgent,
            uploadSessionId: log.uploadSessionId,
            uploadSession: log.uploadSession ? {
              id: log.uploadSession.id,
              status: log.uploadSession.status,
              createdBy: log.uploadSession.createdBy,
              createdAt: log.uploadSession.createdAt.toISOString(),
              files: log.uploadSession.files
            } : null,
            details: log.detailsJson
          })),
          pagination: {
            total,
            limit: validLimit,
            offset: validOffset,
            hasMore: validOffset + validLimit < total
          }
        }
      };
    } catch (error) {
      const corsResult = handleCORS(request);
      const errorResponse = handleError(error, 'audit_list');
      return {
        ...errorResponse,
        headers: corsResult.headers || {}
      };
    }
  }
});

