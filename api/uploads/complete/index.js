import { app } from '@azure/functions';
import { validateAuth } from '../../shared/auth.js';
import { handleCORS } from '../../shared/cors.js';
import { validateCompletionRequest } from '../../shared/validate.js';
import { getPrismaClient } from '../../shared/prisma.js';
import { logAuditEvent } from '../../shared/audit.js';
import { handleError, ValidationError } from '../../shared/errors.js';
import { getContainerClient } from '../../shared/blob.js';
import { validateCSV } from '../../shared/csvValidator.js';

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

      // Validate CSV file from blob storage (for large files or all files)
      let blobClient = null;
      try {
        const containerClient = getContainerClient();
        blobClient = containerClient.getBlobClient(uploadFile.blobPath);
        const downloadResponse = await blobClient.download();
        const buffer = await streamToBuffer(downloadResponse.readableStreamBody);
        const validationResult = validateCSV(buffer, uploadFile.originalName);
        
        if (!validationResult.valid) {
          // Delete invalid blob file
          try {
            await blobClient.delete();
            context.log(`Deleted invalid blob: ${uploadFile.blobPath}`);
          } catch (deleteError) {
            context.log(`Warning: Could not delete invalid blob: ${deleteError.message}`);
          }
          
          // Mark as failed if validation fails
          await prisma.uploadSession.update({
            where: { id: uploadId },
            data: {
              status: 'FAILED'
            }
          });
          
          // Limit error message length (show first 10 errors + count)
          const errorCount = validationResult.errors.length;
          const displayedErrors = validationResult.errors.slice(0, 10);
          const errorMessage = errorCount > 10
            ? `${displayedErrors.join('; ')} ... and ${errorCount - 10} more errors`
            : validationResult.errors.join('; ');
          
          throw new ValidationError(`CSV validation failed (${errorCount} error${errorCount !== 1 ? 's' : ''}): ${errorMessage}`);
        }
      } catch (validationError) {
        if (validationError instanceof ValidationError) {
          // Ensure blob is deleted on validation failure
          if (blobClient) {
            try {
              await blobClient.delete();
              context.log(`Deleted invalid blob after validation error: ${uploadFile.blobPath}`);
            } catch (deleteError) {
              // Ignore delete errors
            }
          }
          throw validationError;
        }
        // If blob doesn't exist yet or other error, continue (might be timing issue)
        context.log('Warning: Could not validate CSV from blob:', validationError.message);
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

/**
 * Convert a readable stream to a buffer
 */
async function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on('error', reject);
  });
}

