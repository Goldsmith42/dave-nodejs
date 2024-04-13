import * as fs from 'fs';
import * as path from 'path';

/** Gets an assets path, creating it if needed. */
export function getAssetsDir(subdirectory?: string) {
  const args = ['assets/'];
  if (subdirectory) {
    args.push(subdirectory);
  }
  const result = path.join(...args);
  fs.mkdirSync(result, { recursive: true })
  return result;
}