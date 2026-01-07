#!/usr/bin/env node

/**
 * Utility script to check a user and verify password
 * Usage: node scripts-check-user.js <username> <password>
 */

import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import argon2 from 'argon2';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from root directory
try {
  const envPath = join(__dirname, '..', '.env');
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

// Also try loading from local.settings.json
try {
  const settingsPath = join(__dirname, 'local.settings.json');
  const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
  if (settings.Values && settings.Values.DATABASE_URL) {
    process.env.DATABASE_URL = settings.Values.DATABASE_URL;
  }
} catch (error) {
  // local.settings.json not found
}

const prisma = new PrismaClient();

const [username, password] = process.argv.slice(2);

if (!username || !password) {
  console.error('Usage: node scripts-check-user.js <username> <password>');
  process.exit(1);
}

async function checkUser() {
  try {
    console.log(`\n🔍 Checking user: ${username}\n`);
    
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    if (!user) {
      console.error('❌ User not found in database!');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Created: ${user.createdAt.toISOString()}`);
    console.log(`   Password Hash: ${user.passwordHash.substring(0, 20)}...`);

    if (!user.isActive) {
      console.error('\n❌ User is not active!');
      process.exit(1);
    }

    console.log('\n🔐 Verifying password...');
    const isValid = await argon2.verify(user.passwordHash, password);
    
    if (isValid) {
      console.log('✅ Password is CORRECT!');
    } else {
      console.error('❌ Password is INCORRECT!');
      console.error('\n💡 Try resetting the password:');
      console.error(`   npm run create-user ${username} <new-password> ${user.role}`);
      process.exit(1);
    }

    console.log('\n✅ All checks passed! User should be able to login.\n');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();

