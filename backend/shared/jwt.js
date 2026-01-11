import jwt from 'jsonwebtoken';
import { AuthError } from './errors.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY_HOURS = parseInt(process.env.JWT_EXPIRY_HOURS || '24', 10);

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(userId, username, role) {
  return jwt.sign(
    {
      userId,
      username,
      role,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    {
      expiresIn: `${JWT_EXPIRY_HOURS}h`
    }
  );
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthError('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AuthError('Invalid token');
    }
    throw new AuthError('Token verification failed');
  }
}

/**
 * Extract token from Authorization header (Express compatible)
 */
export function extractToken(req) {
  const authHeader = req.headers.authorization || req.headers.get?.('authorization');
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Validate JWT token from request (Express compatible)
 */
export function validateJWT(req) {
  const token = extractToken(req);
  
  if (!token) {
    throw new AuthError('Missing or invalid Authorization header');
  }

  return verifyToken(token);
}

