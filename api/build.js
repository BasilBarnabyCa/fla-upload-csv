#!/usr/bin/env node
// Build script to ensure Prisma client is generated before deployment
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const schemaPath = join(__dirname, '../prisma/schema.prisma');
const clientPath = join(__dirname, 'node_modules/@prisma/client');

console.log('Building Azure Functions API...');
console.log(`Schema path: ${schemaPath}`);
console.log(`Client path: ${clientPath}`);

// Check if schema exists
if (!existsSync(schemaPath)) {
  console.error(`ERROR: Schema file not found at ${schemaPath}`);
  process.exit(1);
}

// Generate Prisma client
console.log('Generating Prisma client...');
try {
  execSync(`npx prisma generate --schema=${schemaPath}`, {
    stdio: 'inherit',
    cwd: __dirname
  });
} catch (error) {
  console.error('Failed to generate Prisma client:', error);
  process.exit(1);
}

// Verify Prisma client was generated
if (!existsSync(clientPath)) {
  console.error(`ERROR: Prisma client not found at ${clientPath}`);
  console.error('Prisma generation may have failed');
  process.exit(1);
}

console.log('✓ Prisma client generated successfully');
console.log('✓ Build complete');

