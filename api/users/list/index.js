import { app } from '@azure/functions';
import { handleCORS } from '../../shared/cors.js';
import { validateAuth } from '../../shared/auth.js';
import { getAllUsers } from '../../shared/users.js';
import { handleError, ForbiddenError } from '../../shared/errors.js';

app.http('users_list', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'users',
  handler: async (request, context) => {
    try {
      const corsResult = handleCORS(request);
      if (corsResult.status) {
        return corsResult;
      }

      // Validate auth (require ADMIN or SUPERADMIN role)
      const tokenPayload = validateAuth(request);
      
      if (tokenPayload.role !== 'ADMIN' && tokenPayload.role !== 'SUPERADMIN') {
        throw new ForbiddenError('Only administrators can view users');
      }

      // Pass user role to filter out SUPERADMIN users for regular admins
      const users = await getAllUsers(tokenPayload.role);

      return {
        status: 200,
        headers: corsResult.headers,
        jsonBody: {
          users: users.map(user => ({
            id: user.id,
            username: user.username,
            role: user.role,
            isActive: user.isActive,
            protected: user.protected,
            createdAt: user.createdAt.toISOString()
          }))
        }
      };
    } catch (error) {
      const corsResult = handleCORS(request);
      const errorResponse = handleError(error, 'users_list');
      return {
        ...errorResponse,
        headers: corsResult.headers || {}
      };
    }
  }
});

