#!/usr/bin/env node
// Build script to ensure Prisma client is generated before deployment
const { execSync } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');

// In CommonJS, __dirname is automatically available
const apiDir = __dirname;

const schemaPath = join(apiDir, '../prisma/schema.prisma');
const clientPath = join(apiDir, 'node_modules/@prisma/client');

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
    cwd: apiDir
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

