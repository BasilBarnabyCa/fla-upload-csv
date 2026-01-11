import express from 'express';
import { verifyPassword, getUserByUsername } from '../shared/users.js';
import { generateToken } from '../shared/jwt.js';
import { handleError, ValidationError } from '../shared/errors.js';
import { logAuditEvent } from '../shared/audit.js';

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || typeof username !== 'string') {
      throw new ValidationError('Username is required');
    }

    if (!password || typeof password !== 'string') {
      throw new ValidationError('Password is required');
    }

    // Verify password
    const isValid = await verifyPassword(username, password);

    if (!isValid) {
      // Log failed login attempt
      logAuditEvent({
        action: 'LOGIN_FAILED',
        request: req,
        details: { username: username.toLowerCase() }
      }).catch(() => {});

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
      request: req,
      details: { username: username.toLowerCase() }
    });

    res.json({
      token,
      username
    });
  } catch (error) {
    const errorResponse = handleError(error, 'auth_login');
    res.status(errorResponse.status || 500).json(errorResponse.jsonBody);
  }
});

export default router;

