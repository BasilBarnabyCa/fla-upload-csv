export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTH_ERROR');
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export function handleError(error, context) {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      jsonBody: {
        error: {
          code: error.code,
          message: error.message
        }
      }
    };
  }

  // Log unexpected errors (without secrets)
  console.error(`[${context}] Unexpected error:`, {
    message: error.message,
    name: error.name,
    stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    ...(error.code && { code: error.code }),
    ...(error.cause && { cause: error.cause })
  });

  // In development, return more details
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    status: 500,
    jsonBody: {
      error: {
        code: 'INTERNAL_ERROR',
        message: isDevelopment ? error.message : 'An unexpected error occurred',
        ...(isDevelopment && { details: error.stack?.split('\n').slice(0, 3) })
      }
    }
  };
}

// Express-compatible error handler middleware
export function errorHandler(err, req, res, next) {
  const errorResponse = handleError(err, req.path);
  res.status(errorResponse.status || 500).json(errorResponse.jsonBody);
}

