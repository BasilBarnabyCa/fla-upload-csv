import { app } from '@azure/functions';
import { handleCORS } from '../../shared/cors.js';
import { validateAuth } from '../../shared/auth.js';
import { validateCSV } from '../../shared/csvValidator.js';
import { handleError, ValidationError } from '../../shared/errors.js';

app.http('uploads_validate', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'uploads/validate',
  handler: async (request, context) => {
    try {
      // Handle CORS preflight
      const corsResult = handleCORS(request);
      if (corsResult.status) {
        return corsResult;
      }

      // Validate auth
      validateAuth(request);

      // Parse request body
      let body;
      try {
        body = await request.json();
      } catch {
        throw new ValidationError('Invalid JSON in request body');
      }

      const { fileContent, filename } = body;

      if (!fileContent) {
        throw new ValidationError('fileContent is required');
      }

      if (!filename) {
        throw new ValidationError('filename is required');
      }

      // Convert base64 to buffer
      let buffer;
      try {
        // Remove data URL prefix if present (data:text/csv;base64,...)
        const base64Content = fileContent.includes(',') 
          ? fileContent.split(',')[1] 
          : fileContent;
        buffer = Buffer.from(base64Content, 'base64');
      } catch (error) {
        throw new ValidationError('Invalid file content encoding');
      }

      // Validate CSV
      const validationResult = validateCSV(buffer, filename);

      return {
        status: 200,
        headers: corsResult.headers,
        jsonBody: {
          valid: validationResult.valid,
          errors: validationResult.errors || [],
          warnings: validationResult.warnings || [],
          suggestedFilename: validationResult.suggestedFilename,
          rowCount: validationResult.rowCount || 0
        }
      };
    } catch (error) {
      const corsResult = handleCORS(request);
      const errorResponse = handleError(error, 'uploads_validate');
      return {
        ...errorResponse,
        headers: corsResult.headers || {}
      };
    }
  }
});

