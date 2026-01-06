import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // Use the installed prisma binary directly
  const prismaPath = join(__dirname, 'node_modules', 'prisma', 'build', 'index.js');
  execSync(`node "${prismaPath}" generate --schema=../prisma/schema.prisma`, {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env, PRISMA_SKIP_POSTINSTALL_GENERATE: 'true' }
  });
  console.log('✅ Prisma client generated successfully');
} catch (error) {
  console.error('Failed to generate Prisma client:', error.message);
  process.exit(1);
}
