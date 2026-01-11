#!/usr/bin/env node

/**
 * Utility script to create a user in the database
 * Usage: npm run create-user <username> <password> [role]
 * 
 * Requires DATABASE_URL environment variable (from root .env file)
 */

import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import argon2 from 'argon2';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory
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

