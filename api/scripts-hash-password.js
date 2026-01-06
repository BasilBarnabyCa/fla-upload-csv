#!/usr/bin/env node

/**
 * Generate Argon2 hash for a password
 * Usage: node scripts-hash-password.js <password>
 */

import argon2 from 'argon2';

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts-hash-password.js <password>');
  process.exit(1);
}

try {
  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
  });
  
  console.log('\nPassword:', password);
  console.log('Hash:', hash);
  console.log('');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

