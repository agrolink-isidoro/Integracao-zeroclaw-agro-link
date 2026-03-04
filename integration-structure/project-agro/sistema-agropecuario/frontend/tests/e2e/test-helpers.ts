import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Helper to get __dirname equivalent in ES modules
export function getDirname(importMetaUrl: string): string {
  return dirname(fileURLToPath(importMetaUrl));
}

// Helper to resolve fixture paths
export function getFixturePath(importMetaUrl: string, fixtureName: string): string {
  const testDir = getDirname(importMetaUrl);
  return resolve(testDir, '../fixtures', fixtureName);
}
