#!/usr/bin/env node

/**
 * Utility script to create a super admin user
 * Usage: cd api && node scripts-create-superadmin.js
 * 
 * Requires DATABASE_URL environment variable
 */

import pkg from './generated/prisma/index.js';
const { PrismaClient } = pkg;
import argon2 from 'argon2';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory (same approach as scripts-create-user.js)
try {
  const envPath = join(__dirname, '.env');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0 && !key.startsWith('#')) {
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
} catch (error) {
  // .env file not found, rely on existing env vars
}

// Prisma client will use DATABASE_URL from environment
const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    const username = 'super admin';
    
    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    });

    if (existing) {
      console.error(`\n❌ User "${username}" already exists!\n`);
      process.exit(1);
    }

    // Generate secure password
    const password = generatePassword(16);
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4
    });

    // Create super admin user
    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        passwordHash,
        role: 'SUPERADMIN',
        isActive: true,
        protected: true
      }
    });

    console.log('\n✅ Super Admin created successfully!\n');
    console.log(`Username: ${user.username}`);
    console.log(`Role: ${user.role}`);
    console.log(`Protected: ${user.protected}`);
    console.log(`ID: ${user.id}`);
    console.log(`\n🔑 Generated Password: ${password}`);
    console.log('\n⚠️  IMPORTANT: Save this password now - it cannot be retrieved!\n');
  } catch (error) {
    console.error('Error creating super admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function generatePassword(length = 16) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += special[crypto.randomInt(special.length)];
  
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }
  
  return password.split('').sort(() => crypto.randomInt(3) - 1).join('');
}

createSuperAdmin();

