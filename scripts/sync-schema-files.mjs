import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const siteRoot = '/home/magnus/Code/Private/website';
const sourceRoot = '/home/magnus/Code/Private/schemas';

for (const version of ['v0.2', 'v0.3']) {
  mkdirSync(resolve(siteRoot, version), { recursive: true });
  cpSync(resolve(sourceRoot, version), resolve(siteRoot, version), { recursive: true });
}

console.log('Schema JSON files synced into site root.');
