import { app } from '@azure/functions';
import { handleCORS } from '../../shared/cors.js';
import { validateAuth } from '../../shared/auth.js';
import { deleteTodaysBlobs } from '../../shared/blob.js';
import { handleError, ValidationError } from '../../shared/errors.js';
import { logAuditEvent } from '../../shared/audit.js';
import { getBusinessDate } from '../../shared/timezone.js';

app.http('uploads_delete_today', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'uploads/delete-today',
  handler: async (request, context) => {
    try {
      // Handle CORS preflight
      const corsResult = handleCORS(request);
      if (corsResult.status) {
        return corsResult;
      }

      // Validate auth
      const tokenPayload = validateAuth(request);

      // Parse request body (optional date, defaults to today)
      let body = {};
      try {
        body = await request.json().catch(() => ({}));
      } catch {
        // Empty body is okay
      }

      const { date } = body; // Optional: YYYY-MM-DD format in business timezone

      // Delete blobs for specified date (or today in business timezone)
      const deletedCount = await deleteTodaysBlobs(date);
      const todayDate = date || getBusinessDate();

      // Audit log
      await logAuditEvent({
        action: 'UPLOAD_DELETED',
        request,
        details: {
          deletedBy: tokenPayload.username,
          date: todayDate,
          deletedCount
        }
      });

      return {
        status: 200,
        headers: corsResult.headers,
        jsonBody: {
          deleted: deletedCount,
          date: todayDate,
          message: `Deleted ${deletedCount} file${deletedCount !== 1 ? 's' : ''}`
        }
      };
    } catch (error) {
      const corsResult = handleCORS(request);
      const errorResponse = handleError(error, 'uploads_delete_today');
      return {
        ...errorResponse,
        headers: corsResult.headers || {}
      };
    }
  }
});

