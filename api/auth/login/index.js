import { app } from '@azure/functions';
import { handleCORS } from '../../shared/cors.js';
import { verifyPassword, getUserByUsername } from '../../shared/users.js';
import { generateToken } from '../../shared/jwt.js';
import { handleError, ValidationError } from '../../shared/errors.js';
import { logAuditEvent } from '../../shared/audit.js';

app.http('auth_login', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'auth/login',
  handler: async (request, context) => {
    try {
      // Handle CORS preflight
      const corsResult = handleCORS(request);
      if (corsResult.status) {
        return corsResult;
      }

      // Parse request body
      let body;
      try {
        body = await request.json();
      } catch {
        throw new ValidationError('Invalid JSON in request body');
      }

      const { username, password } = body;

      if (!username || typeof username !== 'string') {
        throw new ValidationError('Username is required');
      }

      if (!password || typeof password !== 'string') {
        throw new ValidationError('Password is required');
      }

      // Verify password
      const isValid = await verifyPassword(username, password);

      if (!isValid) {
        // Log failed login attempt (don't await to prevent timing attacks)
        logAuditEvent({
          action: 'LOGIN_FAILED',
          request,
          details: { username: username.toLowerCase() }
        }).catch(() => {});

        // Return generic error to prevent username enumeration
        throw new ValidationError('Invalid username or password');
      }

      // Get user from database
      const user = await getUserByUsername(username);
      if (!user) {
        throw new ValidationError('Invalid username or password');
      }

      // Generate JWT token
      const token = generateToken(user.id, user.username, user.role);

      // Log successful login
      await logAuditEvent({
        action: 'LOGIN_SUCCESS',
        request,
        details: { username: username.toLowerCase() }
      });

      return {
        status: 200,
        headers: corsResult.headers,
        jsonBody: {
          token,
          username
        }
      };
    } catch (error) {
      const corsResult = handleCORS(request);
      const errorResponse = handleError(error, 'auth_login');
      return {
        ...errorResponse,
        headers: corsResult.headers || {}
      };
    }
  }
});

