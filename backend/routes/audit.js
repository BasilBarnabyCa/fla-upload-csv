import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { getPrismaClient } from '../shared/prisma.js';
import { handleError } from '../shared/errors.js';
import pkg from '@prisma/client';
const { Prisma } = pkg;

const router = express.Router();

router.use(requireAdmin);

router.get('/list', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100', 10);
    const offset = parseInt(req.query.offset || '0', 10);
    const action = req.query.action;
    const uploadSessionId = req.query.uploadSessionId;
    const uploadsOnly = req.query.uploadsOnly === 'true';

    const validLimit = Math.min(Math.max(limit, 1), 1000);
    const validOffset = Math.max(offset, 0);

    const prisma = getPrismaClient();
    
    let auditLogs, total;

    if (uploadsOnly && !action) {
      const countQuery = uploadSessionId
        ? Prisma.sql`SELECT COUNT(*)::int as count FROM audit_logs WHERE action IN ('UPLOAD_COMPLETE', 'UPLOAD_FAILED', 'UPLOAD_DELETED') AND "uploadSessionId" = ${uploadSessionId}`
        : Prisma.sql`SELECT COUNT(*)::int as count FROM audit_logs WHERE action IN ('UPLOAD_COMPLETE', 'UPLOAD_FAILED', 'UPLOAD_DELETED')`;
      const countResult = await prisma.$queryRaw(countQuery);
      total = Number(countResult[0].count);

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

    res.json({
      logs: auditLogs.map(log => ({
        id: log.id,
        action: log.action,
        createdAt: log.createdAt?.toISOString ? log.createdAt.toISOString() : log.createdAt,
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
        details: log.detailsJson || log.detailsJson
      })),
      pagination: {
        total,
        limit: validLimit,
        offset: validOffset,
        hasMore: validOffset + validLimit < total
      }
    });
  } catch (error) {
    const errorResponse = handleError(error, 'audit_list');
    res.status(errorResponse.status || 500).json(errorResponse.jsonBody);
  }
});

export default router;

