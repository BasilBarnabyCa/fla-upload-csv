import { PrismaClient } from '@prisma/client';

let prisma;

export function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
    });
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

