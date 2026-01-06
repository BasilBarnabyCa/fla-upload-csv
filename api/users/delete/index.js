import { app } from '@azure/functions';
import { handleCORS } from '../../shared/cors.js';
import { validateAuth } from '../../shared/auth.js';
import { deleteUser, getUserById } from '../../shared/users.js';
import { handleError, ValidationError, ForbiddenError } from '../../shared/errors.js';
import { logAuditEvent } from '../../shared/audit.js';

app.http('users_delete', {
  methods: ['DELETE', 'OPTIONS'],
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
        throw new ForbiddenError('Only administrators can delete users');
      }

      const userId = request.params.id;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      // Check if user exists
      const existingUser = await getUserById(userId);
      if (!existingUser) {
        throw new ValidationError('User not found');
      }

      // Hide SUPERADMIN users from regular admins
      if (existingUser.role === 'SUPERADMIN' && tokenPayload.role !== 'SUPERADMIN') {
        throw new ValidationError('User not found');
      }

      // Special protection for "admin" username: cannot be deleted by regular admins
      const isAdminUser = existingUser.username.toLowerCase() === 'admin';
      if (isAdminUser && tokenPayload.role !== 'SUPERADMIN') {
        throw new ForbiddenError('The admin user can only be deleted by super administrators');
      }

      // Prevent deleting protected users (unless you're SUPERADMIN)
      if (existingUser.protected && tokenPayload.role !== 'SUPERADMIN') {
        throw new ForbiddenError('Protected users cannot be deleted by regular administrators');
      }

      // Prevent self-deletion
      if (existingUser.username.toLowerCase() === tokenPayload.username.toLowerCase()) {
        throw new ValidationError('Cannot delete your own account');
      }

      // Soft delete (set isActive=false)
      const deletedUser = await deleteUser(userId);

      // Log user deletion
      await logAuditEvent({
        action: 'USER_DELETED',
        request,
        details: {
          deletedBy: tokenPayload.username,
          userId: deletedUser.id,
          username: deletedUser.username
        }
      });

      return {
        status: 200,
        headers: corsResult.headers,
        jsonBody: {
          id: deletedUser.id,
          username: deletedUser.username,
          isActive: deletedUser.isActive,
          message: 'User deactivated successfully'
        }
      };
    } catch (error) {
      const corsResult = handleCORS(request);
      const errorResponse = handleError(error, 'users_delete');
      return {
        ...errorResponse,
        headers: corsResult.headers || {}
      };
    }
  }
});

