import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getUserByUsername } from '../shared/users.js';
import { validateUploadRequest, validateCompletionRequest } from '../shared/validate.js';
import { generateBlobPath, generateSASUrl, getContainerClient } from '../shared/blob.js';
import prisma from '../shared/db.js';
import { logAuditEvent } from '../shared/audit.js';
import { handleError, ValidationError } from '../shared/errors.js';
import { validateCSV } from '../shared/csvValidator.js';
import { Readable } from 'stream';

const router = express.Router();

// Helper to convert stream to buffer
async function streamToBuffer(readableStream) {
  const chunks = [];
  for await (const chunk of readableStream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// All routes require authentication
router.use(requireAuth);

// Validate CSV file
router.post('/validate', async (req, res) => {
  try {
    const { fileContent, filename } = req.body;

    if (!fileContent) {
      throw new ValidationError('fileContent is required');
    }

    if (!filename) {
      throw new ValidationError('filename is required');
    }

    // Convert base64 to buffer
    let buffer;
    try {
      const base64Content = fileContent.includes(',') 
        ? fileContent.split(',')[1] 
        : fileContent;
      buffer = Buffer.from(base64Content, 'base64');
    } catch (error) {
      throw new ValidationError('Invalid file content encoding');
    }

    const validationResult = validateCSV(buffer, filename);

    res.json({
      valid: validationResult.valid,
      errors: validationResult.errors || [],
      warnings: validationResult.warnings || [],
      suggestedFilename: validationResult.suggestedFilename,
      rowCount: validationResult.rowCount || 0
    });
  } catch (error) {
    const errorResponse = handleError(error, 'uploads_validate');
    res.status(errorResponse.status || 500).json(errorResponse.jsonBody);
  }
});

// Get SAS URL for upload
router.post('/sas', async (req, res) => {
  try {
    const user = await getUserByUsername(req.user.username);
    const { originalName, sizeBytes, mimeType } = validateUploadRequest(req.body);

    const blobPath = generateBlobPath(originalName);
    const { sasUrl, expiresAt } = generateSASUrl(blobPath);
    
    // expiresAt is already an ISO string from generateSASUrl
    const expiresAtISO = typeof expiresAt === 'string' ? expiresAt : expiresAt.toISOString();

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

    await logAuditEvent({
      action: 'ISSUE_SAS',
      uploadSessionId: uploadSession.id,
      request: req,
      details: {
        filename: originalName,
        sizeBytes
      }
    });

    res.json({
      uploadId: uploadSession.id,
      fileId: uploadFile.id,
      sasUrl,
      expiresAt: expiresAtISO,
      blobPath
    });
  } catch (error) {
    // Log full error details for debugging
    console.error('[uploads_sas] Full error:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      ...(error.code && { code: error.code })
    });
    const errorResponse = handleError(error, 'uploads_sas');
    res.status(errorResponse.status || 500).json(errorResponse.jsonBody);
  }
});

// Check today's uploads (must come before /:id route)
router.get('/check-today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const uploads = await prisma.uploadSession.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        },
        status: 'UPLOADED'
      },
      include: {
        files: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      hasUploads: uploads.length > 0,
      count: uploads.length,
      uploads: uploads.map(upload => ({
        id: upload.id,
        createdAt: upload.createdAt.toISOString(),
        files: upload.files.map(f => ({
          originalName: f.originalName,
          blobPath: f.blobPath
        }))
      }))
    });
  } catch (error) {
    const errorResponse = handleError(error, 'uploads_check_today');
    res.status(errorResponse.status || 500).json(errorResponse.jsonBody);
  }
});

// Get upload by ID
router.get('/:id', async (req, res) => {
  try {
    const uploadSession = await prisma.uploadSession.findUnique({
      where: { id: req.params.id },
      include: {
        files: true
      }
    });

    if (!uploadSession) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Upload session not found' }
      });
    }

    res.json({
      id: uploadSession.id,
      status: uploadSession.status,
      createdAt: uploadSession.createdAt.toISOString(),
      createdBy: uploadSession.createdBy,
      files: uploadSession.files.map(file => ({
        id: file.id,
        originalName: file.originalName,
        blobPath: file.blobPath,
        sizeBytes: file.sizeBytes,
        mimeType: file.mimeType
      }))
    });
  } catch (error) {
    const errorResponse = handleError(error, 'uploads_get');
    res.status(errorResponse.status || 500).json(errorResponse.jsonBody);
  }
});

// Complete upload
router.post('/complete', async (req, res) => {
  let uploadIdForAudit = null;
  try {
    const { uploadId, etag, sha256 } = validateCompletionRequest(req.body);
    uploadIdForAudit = uploadId;

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

    // Validate CSV file from blob storage
    let blobClient = null;
    try {
      const containerClient = getContainerClient();
      blobClient = containerClient.getBlobClient(uploadFile.blobPath);
      const downloadResponse = await blobClient.download();
      const buffer = await streamToBuffer(downloadResponse.readableStreamBody);
      const validationResult = validateCSV(buffer, uploadFile.originalName);
      
      if (!validationResult.valid) {
        try {
          await blobClient.delete();
        } catch (deleteError) {
          console.error(`Warning: Could not delete invalid blob: ${deleteError.message}`);
        }
        
        await prisma.uploadSession.update({
          where: { id: uploadId },
          data: { status: 'FAILED' }
        });

        await logAuditEvent({
          action: 'UPLOAD_FAILED',
          uploadSessionId: uploadId,
          request: req,
          details: {
            errors: validationResult.errors,
            filename: uploadFile.originalName
          }
        });

        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'CSV validation failed',
            errors: validationResult.errors
          }
        });
      }

      // Update session to completed
      await prisma.uploadSession.update({
        where: { id: uploadId },
        data: {
          status: 'UPLOADED',
          files: {
            update: {
              where: { id: uploadFile.id },
              data: {
                etag,
                sha256,
                validatedAt: new Date()
              }
            }
          }
        }
      });

      await logAuditEvent({
        action: 'UPLOAD_COMPLETE',
        uploadSessionId: uploadId,
        request: req,
        details: {
          filename: uploadFile.originalName,
          sizeBytes: uploadFile.sizeBytes,
          rowCount: validationResult.rowCount
        }
      });

      res.json({
        success: true,
        uploadId,
        filename: uploadFile.originalName,
        rowCount: validationResult.rowCount
      });
    } catch (blobError) {
      await prisma.uploadSession.update({
        where: { id: uploadId },
        data: { status: 'FAILED' }
      });

      await logAuditEvent({
        action: 'UPLOAD_FAILED',
        uploadSessionId: uploadId,
        request: req,
        details: {
          error: blobError.message,
          filename: uploadFile.originalName
        }
      });

      throw new ValidationError(`Failed to validate uploaded file: ${blobError.message}`);
    }
  } catch (error) {
    const errorResponse = handleError(error, 'uploads_complete');
    res.status(errorResponse.status || 500).json(errorResponse.jsonBody);
  }
});

// Delete today's uploads
router.delete('/today', async (req, res) => {
  try {
    const containerClient = getContainerClient();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const uploads = await prisma.uploadSession.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        files: true
      }
    });

    let deletedCount = 0;
    for (const upload of uploads) {
      for (const file of upload.files) {
        try {
          const blobClient = containerClient.getBlobClient(file.blobPath);
          await blobClient.delete();
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete blob ${file.blobPath}:`, error.message);
        }
      }
      await prisma.uploadSession.delete({
        where: { id: upload.id }
      });
    }

    await logAuditEvent({
      action: 'UPLOAD_DELETED',
      request: req,
      details: {
        deletedBy: req.user.username,
        deletedCount,
        date: today.toISOString().split('T')[0]
      }
    });

    res.json({
      success: true,
      deletedCount
    });
  } catch (error) {
    const errorResponse = handleError(error, 'uploads_delete_today');
    res.status(errorResponse.status || 500).json(errorResponse.jsonBody);
  }
});

export default router;

