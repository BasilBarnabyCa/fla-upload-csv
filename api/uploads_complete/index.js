import { app } from '@azure/functions';
import { validateAuth } from '../shared/auth.js';
import { handleCORS } from '../shared/cors.js';
import { validateCompletionRequest } from '../shared/validate.js';
import { getPrismaClient } from '../shared/prisma.js';
import { logAuditEvent } from '../shared/audit.js';
import { handleError, ValidationError } from '../shared/errors.js';

app.http('uploads_complete', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'uploads/complete',
  handler: async (request, context) => {
    let uploadIdForAudit = null;
    try {
      // Handle CORS preflight
      const corsResult = handleCORS(request);
      if (corsResult.status) {
        return corsResult;
      }

      // Validate auth
      validateAuth(request);

      // Parse and validate request body
      let body;
      try {
        body = await request.json();
      } catch (parseError) {
        throw new ValidationError('Invalid JSON in request body');
      }
      const { uploadId, etag, sha256 } = validateCompletionRequest(body);
      uploadIdForAudit = uploadId;

      // Update upload session
      const prisma = getPrismaClient();
      const uploadSession = await prisma.uploadSession.findUnique({
        where: { id: uploadId },
        include: { files: true }
      });

      if (!uploadSession) {
        throw new ValidationError('Upload session not found');
      }

      if (uploadSession.status !== 'PENDING') {
        throw new ValidationError(`Upload session is ${uploadSession.status}, cannot complete`);
      }

      const uploadFile = uploadSession.files[0];
      if (!uploadFile) {
        throw new ValidationError('Upload file not found');
      }

      // Update file and session
      await prisma.uploadFile.update({
        where: { id: uploadFile.id },
        data: {
          etag,
          sha256,
          uploadedAt: new Date()
        }
      });

      await prisma.uploadSession.update({
        where: { id: uploadId },
        data: {
          status: 'UPLOADED'
        }
      });

      // Audit log
      await logAuditEvent({
        action: 'UPLOAD_COMPLETE',
        uploadSessionId: uploadId,
        request,
        details: {
          blobPath: uploadFile.blobPath,
          etag
        }
      });

      return {
        status: 200,
        headers: corsResult.headers,
        jsonBody: {
          ok: true
        }
      };
    } catch (error) {
      const corsResult = handleCORS(request);
      const errorResponse = handleError(error, 'uploads_complete');
      
      // Log failed upload if we have an uploadId
      if (uploadIdForAudit) {
        try {
          await logAuditEvent({
            action: 'UPLOAD_FAILED',
            uploadSessionId: uploadIdForAudit,
            request,
            details: { error: error.message }
          });
        } catch (auditError) {
          // Ignore audit errors
        }
      }

      return {
        ...errorResponse,
        headers: corsResult.headers || {}
      };
    }
  }
});

