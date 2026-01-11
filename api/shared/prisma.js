import { PrismaClient } from '@prisma/client';

let prisma;

// Ensure Prisma client is generated before importing
try {
  // This will throw if Prisma client hasn't been generated
  if (typeof PrismaClient === 'undefined') {
    throw new Error('PrismaClient is undefined - run prisma generate');
  }
} catch (error) {
  console.error('Prisma Client initialization error:', error);
  throw new Error('Prisma Client not initialized. Ensure prisma generate has been run.');
}

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

