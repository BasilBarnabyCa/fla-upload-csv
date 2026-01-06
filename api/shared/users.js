import argon2 from 'argon2';
import { getPrismaClient } from './prisma.js';

/**
 * Hash a password using Argon2
 */
export async function hashPassword(password) {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
  });
}

/**
 * Verify password against database
 */
export async function verifyPassword(username, password) {
  const prisma = getPrismaClient();
  
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { passwordHash: true, isActive: true }
  });

  if (!user || !user.isActive) {
    // Use a dummy hash to prevent timing attacks
    await argon2.verify('$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy', 'dummy');
    return false;
  }

  try {
    return await argon2.verify(user.passwordHash, password);
  } catch (error) {
    return false;
  }
}

/**
 * Get user by username
 */
export async function getUserByUsername(username) {
  const prisma = getPrismaClient();
  return await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true, username: true, role: true, isActive: true, createdAt: true }
  });
}

/**
 * Create a new user
 */
export async function createUser(username, password, role = 'USER') {
  const prisma = getPrismaClient();
  
  const passwordHash = await hashPassword(password);
  
  return await prisma.user.create({
    data: {
      username: username.toLowerCase(),
      passwordHash,
      role,
      isActive: true
    },
    select: { id: true, username: true, role: true, createdAt: true }
  });
}

/**
 * Update user password
 */
export async function updateUserPassword(username, newPassword) {
  const prisma = getPrismaClient();
  
  const passwordHash = await hashPassword(newPassword);
  
  return await prisma.user.update({
    where: { username: username.toLowerCase() },
    data: { passwordHash, updatedAt: new Date() },
    select: { id: true, username: true }
  });
}

/**
 * Check if username exists
 */
export async function userExists(username) {
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true }
  });
  return !!user;
}

/**
 * Get all users (for admin purposes)
 */
export async function getAllUsers() {
  const prisma = getPrismaClient();
  return await prisma.user.findMany({
    select: { id: true, username: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });
}

