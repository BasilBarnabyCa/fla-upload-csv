import { app } from '@azure/functions';
import { handleCORS } from '../../shared/cors.js';
import { validateAuth } from '../../shared/auth.js';
import { getContainerClient } from '../../shared/blob.js';
import { handleError } from '../../shared/errors.js';

app.http('uploads_check_today', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'uploads/check-today',
  handler: async (request, context) => {
    try {
      // Handle CORS preflight
      const corsResult = handleCORS(request);
      if (corsResult.status) {
        return corsResult;
      }

      // Validate auth
      validateAuth(request);

      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      const prefix = `${today}/`;

      // List blobs for today
      const containerClient = getContainerClient();
      const blobs = [];
      
      try {
        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
          blobs.push({
            name: blob.name,
            size: blob.properties.contentLength,
            lastModified: blob.properties.lastModified?.toISOString()
          });
        }
      } catch (error) {
        context.log('Error listing blobs:', error);
        // Return empty array if error
      }

      return {
        status: 200,
        headers: corsResult.headers,
        jsonBody: {
          date: today,
          count: blobs.length,
          files: blobs
        }
      };
    } catch (error) {
      const corsResult = handleCORS(request);
      const errorResponse = handleError(error, 'uploads_check_today');
      return {
        ...errorResponse,
        headers: corsResult.headers || {}
      };
    }
  }
});

