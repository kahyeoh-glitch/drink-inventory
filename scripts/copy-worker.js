import { copyFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const workerDir = join(root, 'worker');

for (const file of readdirSync(workerDir)) {
  if (file.endsWith('.js')) {
    copyFileSync(join(workerDir, file), join(root, 'dist', file));
  }
}
