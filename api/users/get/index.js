import { app } from '@azure/functions';
import { handleCORS } from '../../shared/cors.js';
import { validateAuth } from '../../shared/auth.js';
import { getPrismaClient } from '../../shared/prisma.js';
import { handleError, ValidationError, ForbiddenError } from '../../shared/errors.js';

app.http('users_get', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'users/{id}',
  handler: async (request, context) => {
    try {
      const corsResult = handleCORS(request);
      if (corsResult.status) {
        return corsResult;
      }

      // Validate auth (require ADMIN or SUPERADMIN role)
      const tokenPayload = validateAuth(request);
      
      if (tokenPayload.role !== 'ADMIN' && tokenPayload.role !== 'SUPERADMIN') {
        throw new ForbiddenError('Only administrators can view user details');
      }

      const userId = request.params.id;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const prisma = getPrismaClient();
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          role: true,
          isActive: true,
          protected: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        throw new ValidationError('User not found');
      }

      // Hide SUPERADMIN users from regular admins
      if (user.role === 'SUPERADMIN' && tokenPayload.role !== 'SUPERADMIN') {
        throw new ValidationError('User not found');
      }

      return {
        status: 200,
        headers: corsResult.headers,
        jsonBody: {
          id: user.id,
          username: user.username,
          role: user.role,
          isActive: user.isActive,
          protected: user.protected,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString()
        }
      };
    } catch (error) {
      const corsResult = handleCORS(request);
      const errorResponse = handleError(error, 'users_get');
      return {
        ...errorResponse,
        headers: corsResult.headers || {}
      };
    }
  }
});

