import argon2 from 'argon2';
import crypto from 'crypto';
import { getPrismaClient } from './prisma.js';

/**
 * Generate a secure random password
 * @param {number} length - Password length (default: 16)
 * @returns {string} Generated password
 */
export function generatePassword(length = 16) {
  // Use alphanumeric + special characters for strong passwords
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + special;
  
  // Ensure at least one character from each set
  let password = '';
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += special[crypto.randomInt(special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }
  
  // Shuffle the password to avoid predictable patterns
  return password.split('').sort(() => crypto.randomInt(3) - 1).join('');
}

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
 * @param {string} username - Username
 * @param {string|null} password - Password (if null, will be auto-generated)
 * @param {string} role - User role (default: 'USER')
 * @param {boolean} isProtected - Whether user is protected (default: false)
 * @returns {Promise<{user: object, password: string}>} Created user and password (plaintext for display)
 */
export async function createUser(username, password = null, role = 'USER', isProtected = false) {
  const prisma = getPrismaClient();
  
  // Generate password if not provided
  const plainPassword = password || generatePassword(16);
  const passwordHash = await hashPassword(plainPassword);
  
  const user = await prisma.user.create({
    data: {
      username: username.toLowerCase(),
      passwordHash,
      role,
      isActive: true,
      protected: isProtected
    },
    select: { id: true, username: true, role: true, protected: true, createdAt: true }
  });
  
  return {
    user,
    password: plainPassword // Return plaintext password for display
  };
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
 * @param {string} requestingUserRole - Role of the user making the request
 * @returns {Promise<Array>} List of users (SUPERADMIN users hidden unless requester is SUPERADMIN)
 */
export async function getAllUsers(requestingUserRole = 'USER') {
  const prisma = getPrismaClient();
  
  // Build where clause - hide SUPERADMIN users unless requester is SUPERADMIN
  // Fetch all and filter in JS to avoid enum import issues
  const allUsers = await prisma.user.findMany({
    select: { id: true, username: true, role: true, isActive: true, protected: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });
  
  if (requestingUserRole !== 'SUPERADMIN') {
    return allUsers.filter(user => user.role !== 'SUPERADMIN');
  }
  
  return allUsers;
}

/**
 * Get user by ID
 */
export async function getUserById(userId) {
  const prisma = getPrismaClient();
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      role: true,
      isActive: true,
      protected: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

/**
 * Update user (role, isActive, password, username)
 * @param {string} userId - User ID
 * @param {object} updates - Update fields
 * @param {string} requestingUserRole - Role of user making the request (for validation)
 * @returns {Promise<object>} Updated user
 */
export async function updateUser(userId, updates, requestingUserRole = 'USER') {
  const prisma = getPrismaClient();
  
  const updateData = {};
  if (updates.username !== undefined) {
    updateData.username = updates.username.toLowerCase();
  }
  if (updates.role !== undefined) {
    updateData.role = updates.role;
  }
  if (updates.isActive !== undefined) {
    updateData.isActive = updates.isActive;
  }
  if (updates.password) {
    updateData.passwordHash = await hashPassword(updates.password);
  }
  
  return await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      username: true,
      role: true,
      isActive: true,
      protected: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

/**
 * Delete user (soft delete by setting isActive=false)
 */
export async function deleteUser(userId) {
  const prisma = getPrismaClient();
  return await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
    select: {
      id: true,
      username: true,
      isActive: true
    }
  });
}

/**
 * Reset user password (generates new password and returns plaintext)
 * @param {string} userId - User ID
 * @returns {Promise<{password: string}>} New password in plaintext
 */
export async function resetUserPassword(userId) {
  const prisma = getPrismaClient();
  
  // Generate new password
  const newPassword = generatePassword(16);
  const passwordHash = await hashPassword(newPassword);
  
  // Update user password
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  });
  
  return { password: newPassword };
}

