import { app } from '@azure/functions';
import { validateAuth } from '../shared/auth.js';
import { getUserByUsername } from '../shared/users.js';
import { handleCORS } from '../shared/cors.js';
import { validateUploadRequest } from '../shared/validate.js';
import { generateBlobPath, generateSASUrl } from '../shared/blob.js';
import { getPrismaClient } from '../shared/prisma.js';
import { logAuditEvent } from '../shared/audit.js';
import { handleError } from '../shared/errors.js';

app.http('uploads_sas', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'uploads/sas',
  handler: async (request, context) => {
    try {
      // Handle CORS preflight
      const corsResult = handleCORS(request);
      if (corsResult.status) {
        return corsResult;
      }

      // Validate auth and get user
      const tokenPayload = validateAuth(request);
      const user = await getUserByUsername(tokenPayload.username);

      // Parse and validate request body
      const body = await request.json();
      const { originalName, sizeBytes, mimeType } = validateUploadRequest(body);

      // Generate blob path and SAS
      const blobPath = generateBlobPath(originalName);
      const { sasUrl, expiresAt } = generateSASUrl(blobPath);

      // Create upload session in database
      const prisma = getPrismaClient();
      const uploadSession = await prisma.uploadSession.create({
        data: {
          status: 'PENDING',
          createdBy: user?.username || 'internal',
          userId: user?.id || null,
          files: {
            create: {
              originalName,
              mimeType,
              sizeBytes,
              blobPath
            }
          }
        },
        include: {
          files: true
        }
      });

      const uploadFile = uploadSession.files[0];

      // Audit log
      await logAuditEvent({
        action: 'ISSUE_SAS',
        uploadSessionId: uploadSession.id,
        request,
        details: {
          blobPath,
          sizeBytes,
          expiresAt
        }
      });

      return {
        status: 200,
        headers: corsResult.headers,
        jsonBody: {
          uploadId: uploadSession.id,
          blobPath,
          sasUrl,
          expiresAt
        }
      };
    } catch (error) {
      const corsResult = handleCORS(request);
      const errorResponse = handleError(error, 'uploads_sas');
      return {
        ...errorResponse,
        headers: corsResult.headers || {}
      };
    }
  }
});

