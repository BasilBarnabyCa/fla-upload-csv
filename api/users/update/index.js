import { app } from '@azure/functions';
import { handleCORS } from '../../shared/cors.js';
import { validateAuth } from '../../shared/auth.js';
import { updateUser, getUserById } from '../../shared/users.js';
import { handleError, ValidationError, ForbiddenError } from '../../shared/errors.js';
import { logAuditEvent } from '../../shared/audit.js';

app.http('users_update', {
  methods: ['PUT', 'OPTIONS'],
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
        throw new ForbiddenError('Only administrators can update users');
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

      // Special protection for "admin" username: only SUPERADMIN or the user itself can edit
      const isAdminUser = existingUser.username.toLowerCase() === 'admin';
      const isSelfEdit = existingUser.username.toLowerCase() === tokenPayload.username.toLowerCase();
      
      if (isAdminUser && tokenPayload.role !== 'SUPERADMIN' && !isSelfEdit) {
        throw new ForbiddenError('The admin user can only be edited by super administrators or itself');
      }

      // Prevent editing protected users (unless you're SUPERADMIN or it's self-edit for admin)
      if (existingUser.protected && tokenPayload.role !== 'SUPERADMIN' && !(isAdminUser && isSelfEdit)) {
        throw new ForbiddenError('Protected users cannot be edited by regular administrators');
      }

      // Parse request body
      let body;
      try {
        body = await request.json();
      } catch {
        throw new ValidationError('Invalid JSON in request body');
      }

      const { role, isActive, password } = body;

      // Validate role if provided
      if (role !== undefined && role !== 'USER' && role !== 'ADMIN' && role !== 'SUPERADMIN') {
        throw new ValidationError('Role must be USER, ADMIN, or SUPERADMIN');
      }

      // Only SUPERADMIN can assign SUPERADMIN role
      if (role === 'SUPERADMIN' && tokenPayload.role !== 'SUPERADMIN') {
        throw new ForbiddenError('Only super administrators can assign SUPERADMIN role');
      }

      // Validate isActive if provided
      if (isActive !== undefined && typeof isActive !== 'boolean') {
        throw new ValidationError('isActive must be a boolean');
      }

      // Validate password if provided
      if (password !== undefined) {
        if (typeof password !== 'string' || password.length < 8) {
          throw new ValidationError('Password must be at least 8 characters');
        }
      }

      // Update user
      const updatedUser = await updateUser(userId, { role, isActive, password });

      // Log user update
      await logAuditEvent({
        action: 'USER_UPDATED',
        request,
        details: {
          updatedBy: tokenPayload.username,
          userId: updatedUser.id,
          username: updatedUser.username,
          changes: {
            role: role !== undefined ? role : undefined,
            isActive: isActive !== undefined ? isActive : undefined,
            passwordChanged: password !== undefined
          }
        }
      });

      return {
        status: 200,
        headers: corsResult.headers,
        jsonBody: {
          id: updatedUser.id,
          username: updatedUser.username,
          role: updatedUser.role,
          isActive: updatedUser.isActive,
          createdAt: updatedUser.createdAt.toISOString(),
          updatedAt: updatedUser.updatedAt.toISOString()
        }
      };
    } catch (error) {
      const corsResult = handleCORS(request);
      const errorResponse = handleError(error, 'users_update');
      return {
        ...errorResponse,
        headers: corsResult.headers || {}
      };
    }
  }
});

