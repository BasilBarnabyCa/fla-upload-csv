import { app } from '@azure/functions';
import { handleCORS } from '../../shared/cors.js';
import { validateAuth } from '../../shared/auth.js';
import { getUserById, updateUser, generatePassword } from '../../shared/users.js';
import { handleError, ValidationError, ForbiddenError } from '../../shared/errors.js';
import { logAuditEvent } from '../../shared/audit.js';

app.http('users_reset_password', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'users/{id}/reset-password',
  handler: async (request, context) => {
    try {
      const corsResult = handleCORS(request);
      if (corsResult.status) {
        return corsResult;
      }

      // Validate auth (require ADMIN or SUPERADMIN role)
      const tokenPayload = validateAuth(request);
      
      if (tokenPayload.role !== 'ADMIN' && tokenPayload.role !== 'SUPERADMIN') {
        throw new ForbiddenError('Only administrators can reset passwords');
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

      // Special protection for "admin" username: only SUPERADMIN or the user itself can reset password
      const isAdminUser = existingUser.username.toLowerCase() === 'admin';
      const isSelfReset = existingUser.username.toLowerCase() === tokenPayload.username.toLowerCase();
      
      if (isAdminUser && tokenPayload.role !== 'SUPERADMIN' && !isSelfReset) {
        throw new ForbiddenError('The admin user password can only be reset by super administrators or itself');
      }

      // Prevent resetting protected users (unless you're SUPERADMIN or it's self-reset for admin)
      if (existingUser.protected && tokenPayload.role !== 'SUPERADMIN' && !(isAdminUser && isSelfReset)) {
        throw new ForbiddenError('Protected users cannot have their passwords reset by regular administrators');
      }

      // Generate new password
      const newPassword = generatePassword(16);
      
      // Update user password
      const updatedUser = await updateUser(userId, { password: newPassword });

      // Log password reset
      await logAuditEvent({
        action: 'USER_PASSWORD_RESET',
        request,
        details: {
          resetBy: tokenPayload.username,
          userId: updatedUser.id,
          username: updatedUser.username
        }
      });

      return {
        status: 200,
        headers: corsResult.headers,
        jsonBody: {
          id: updatedUser.id,
          username: updatedUser.username,
          password: newPassword, // Return new password (shown once)
          message: 'Password reset successfully'
        }
      };
    } catch (error) {
      const corsResult = handleCORS(request);
      const errorResponse = handleError(error, 'users_reset_password');
      return {
        ...errorResponse,
        headers: corsResult.headers || {}
      };
    }
  }
});

