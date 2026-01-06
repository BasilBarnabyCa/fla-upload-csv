import { generatorHandler } from '@prisma/generator-helper';
import { generateClient } from '@prisma/generator-helper/dist/generatorHandler';
import { getSchema } from '@prisma/internals';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generate() {
  try {
    const schemaPath = join(__dirname, '..', 'prisma', 'schema.prisma');
    const schema = await fs.readFile(schemaPath, 'utf-8');
    
    // Use Prisma's internal generator
    const { PrismaClientGenerator } = await import('@prisma/generator-helper');
    console.log('Generating Prisma client...');
    
    // Fallback: use prisma CLI with modified environment
    const { execSync } = await import('child_process');
    execSync('npx --yes prisma@5.22.0 generate --schema=../prisma/schema.prisma', {
      stdio: 'inherit',
      cwd: __dirname,
      env: { ...process.env, npm_config_legacy_peer_deps: 'true' }
    });
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

generate();
