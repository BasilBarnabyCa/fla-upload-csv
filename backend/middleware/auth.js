import { validateJWT } from '../shared/jwt.js';
import { ForbiddenError } from '../shared/errors.js';

/**
 * Express middleware to validate JWT authentication
 */
export function requireAuth(req, res, next) {
  try {
    const tokenPayload = validateJWT(req);
    req.user = tokenPayload;
    next();
  } catch (error) {
    res.status(401).json({
      error: {
        code: 'AUTH_ERROR',
        message: error.message || 'Authentication required'
      }
    });
  }
}

/**
 * Express middleware to require ADMIN or SUPERADMIN role
 */
export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Only administrators can access this resource'
        }
      });
    }
    next();
  });
}

/**
 * Express middleware to require SUPERADMIN role
 */
export function requireSuperAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'SUPERADMIN') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Only super administrators can access this resource'
        }
      });
    }
    next();
  });
}

