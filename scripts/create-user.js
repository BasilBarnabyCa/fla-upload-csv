#!/usr/bin/env node

/**
 * Utility script to create a user in the database
 * Usage: npm run create-user <username> <password> [role]
 * Or: cd api && node ../scripts/create-user.js <username> <password> [role]
 * 
 * Requires DATABASE_URL environment variable
 */

import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

// Prisma client will use DATABASE_URL from environment
const prisma = new PrismaClient();

const [username, password, role = 'USER'] = process.argv.slice(2);

if (!username || !password) {
  console.error('Usage: node scripts/create-user.js <username> <password> [role]');
  console.error('Role options: USER (default) or ADMIN');
  process.exit(1);
}

if (role !== 'USER' && role !== 'ADMIN') {
  console.error('Error: Role must be USER or ADMIN');
  process.exit(1);
}

async function createUser() {
  try {
    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    });

    if (existing) {
      console.error(`\n❌ User "${username}" already exists!\n`);
      process.exit(1);
    }

    // Hash password
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        passwordHash,
        role,
        isActive: true
      }
    });

    console.log('\n✅ User created successfully!\n');
    console.log(`Username: ${user.username}`);
    console.log(`Role: ${user.role}`);
    console.log(`ID: ${user.id}`);
    console.log(`Created: ${user.createdAt.toISOString()}\n`);
  } catch (error) {
    console.error('Error creating user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();

