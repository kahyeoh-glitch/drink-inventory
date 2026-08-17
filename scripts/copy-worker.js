import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
copyFileSync(join(root, 'worker', '_worker.js'), join(root, 'dist', '_worker.js'));
