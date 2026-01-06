import { app } from '@azure/functions';
import { validateAuth } from '../shared/auth.js';
import { handleCORS } from '../shared/cors.js';
import { getPrismaClient } from '../shared/prisma.js';
import { handleError, ValidationError } from '../shared/errors.js';

app.http('uploads_get', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'uploads/{id}',
  handler: async (request, context) => {
    try {
      // Handle CORS preflight
      const corsResult = handleCORS(request);
      if (corsResult.status) {
        return corsResult;
      }

      // Validate auth
      validateAuth(request);

      // Extract upload ID from route parameter
      const uploadId = request.params.id;

      if (!uploadId) {
        throw new ValidationError('Upload ID is required');
      }

      // Fetch upload session
      const prisma = getPrismaClient();
      const uploadSession = await prisma.uploadSession.findUnique({
        where: { id: uploadId },
        include: {
          files: true
        }
      });

      if (!uploadSession) {
        throw new ValidationError('Upload session not found');
      }

      const uploadFile = uploadSession.files[0];

      return {
        status: 200,
        headers: corsResult.headers,
        jsonBody: {
          id: uploadSession.id,
          createdAt: uploadSession.createdAt.toISOString(),
          status: uploadSession.status,
          file: uploadFile ? {
            id: uploadFile.id,
            originalName: uploadFile.originalName,
            mimeType: uploadFile.mimeType,
            sizeBytes: uploadFile.sizeBytes,
            blobPath: uploadFile.blobPath,
            uploadedAt: uploadFile.uploadedAt?.toISOString() || null
          } : null
        }
      };
    } catch (error) {
      const corsResult = handleCORS(request);
      const errorResponse = handleError(error, 'uploads_get');
      return {
        ...errorResponse,
        headers: corsResult.headers || {}
      };
    }
  }
});

