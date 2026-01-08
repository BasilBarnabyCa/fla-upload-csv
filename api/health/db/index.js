import { app } from '@azure/functions';
import { handleCORS } from '../../shared/cors.js';
import { getPrismaClient } from '../../shared/prisma.js';
import { handleError } from '../../shared/errors.js';

app.http('health_db', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'health/db',
  handler: async (request, context) => {
    try {
      const corsResult = handleCORS(request);
      if (corsResult.status) {
        return corsResult;
      }

      const prisma = getPrismaClient();
      
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;
      
      // Test if users table exists and get count
      const userCount = await prisma.user.count();
      
      // Test if we can query a user
      const testUser = await prisma.user.findFirst({
        select: { id: true, username: true, role: true }
      });

      return {
        status: 200,
        headers: corsResult.headers,
        jsonBody: {
          status: 'ok',
          database: 'connected',
          userCount,
          sampleUser: testUser ? {
            id: testUser.id,
            username: testUser.username,
            role: testUser.role
          } : null,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      const corsResult = handleCORS(request);
      const errorResponse = handleError(error, 'health_db');
      return {
        ...errorResponse,
        headers: corsResult.headers || {},
        jsonBody: {
          ...errorResponse.jsonBody,
          errorDetails: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      };
    }
  }
});

