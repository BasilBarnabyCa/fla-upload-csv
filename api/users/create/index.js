import { app } from '@azure/functions';
import { handleCORS } from '../../shared/cors.js';
import { validateAuth } from '../../shared/auth.js';
import { createUser, userExists } from '../../shared/users.js';
import { handleError, ValidationError, ForbiddenError } from '../../shared/errors.js';
import { logAuditEvent } from '../../shared/audit.js';

app.http('users_create', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'users/create',
  handler: async (request, context) => {
    try {
      // Handle CORS preflight
      const corsResult = handleCORS(request);
      if (corsResult.status) {
        return corsResult;
      }

      // Validate auth (require ADMIN or SUPERADMIN role)
      const tokenPayload = validateAuth(request);
      
      if (tokenPayload.role !== 'ADMIN' && tokenPayload.role !== 'SUPERADMIN') {
        throw new ForbiddenError('Only administrators can create users');
      }

      // Parse request body
      let body;
      try {
        body = await request.json();
      } catch {
        throw new ValidationError('Invalid JSON in request body');
      }

      const { username, role = 'USER' } = body;

      if (!username || typeof username !== 'string' || username.length < 3) {
        throw new ValidationError('Username must be at least 3 characters');
      }

      // Validate role
      if (role !== 'USER' && role !== 'ADMIN' && role !== 'SUPERADMIN') {
        throw new ValidationError('Role must be USER, ADMIN, or SUPERADMIN');
      }

      // Only admins can create other admins
      if (role === 'ADMIN' && tokenPayload.role !== 'ADMIN' && tokenPayload.role !== 'SUPERADMIN') {
        throw new ForbiddenError('Only administrators can create admin users');
      }

      // Only SUPERADMIN can create SUPERADMIN users
      if (role === 'SUPERADMIN' && tokenPayload.role !== 'SUPERADMIN') {
        throw new ForbiddenError('Only super administrators can create SUPERADMIN users');
      }

      // Check if user already exists
      if (await userExists(username)) {
        throw new ValidationError('Username already exists');
      }

      // Auto-protect "admin" username
      const isAdminUsername = username.toLowerCase() === 'admin';
      const shouldProtect = isAdminUsername;

      // Create user (password will be auto-generated)
      const { user, password: generatedPassword } = await createUser(username, null, role, shouldProtect);

      // Log user creation
      await logAuditEvent({
        action: 'USER_CREATED',
        request,
        details: {
          createdBy: tokenPayload.username,
          newUsername: user.username
        }
      });

      return {
        status: 201,
        headers: corsResult.headers,
        jsonBody: {
          id: user.id,
          username: user.username,
          role: user.role,
          password: generatedPassword, // Return generated password
          createdAt: user.createdAt.toISOString()
        }
      };
    } catch (error) {
      const corsResult = handleCORS(request);
      const errorResponse = handleError(error, 'users_create');
      return {
        ...errorResponse,
        headers: corsResult.headers || {}
      };
    }
  }
});

