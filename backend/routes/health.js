import express from 'express';
import { getPrismaClient } from '../shared/prisma.js';
import { handleError } from '../shared/errors.js';

const router = express.Router();

router.get('/db', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    
    await prisma.$queryRaw`SELECT 1`;
    
    const userCount = await prisma.user.count();
    
    const testUser = await prisma.user.findFirst({
      select: { id: true, username: true, role: true }
    });

    res.json({
      status: 'ok',
      database: 'connected',
      userCount,
      sampleUser: testUser ? {
        id: testUser.id,
        username: testUser.username,
        role: testUser.role
      } : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const errorResponse = handleError(error, 'health_db');
    res.status(errorResponse.status || 500).json({
      ...errorResponse.jsonBody,
      errorDetails: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;

