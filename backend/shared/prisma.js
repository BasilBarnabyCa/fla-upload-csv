// Import PrismaClient using CommonJS-compatible pattern for ES modules
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

let prisma;

export function getPrismaClient() {
  if (!prisma) {
    try {
      prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
      });
    } catch (error) {
      console.error('Failed to create PrismaClient:', error);
      throw new Error('Failed to initialize Prisma Client. Ensure prisma generate has been run.');
    }
  }
  return prisma;
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });
}

