import { build } from 'esbuild';
import { minify } from 'terser';
import { writeFile, mkdir } from 'fs/promises';
import logger from '../src/logging/logger';

async function bundle() {
  const result = await build({
    entryPoints: ['src/webview/index.ts'],
    bundle: true,
    treeShaking: true,
    minify: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2018',
    write: false,
  });

  const code = result.outputFiles[0].text;
  const minified = await minify(code, { format: { comments: false } });
  await mkdir('dist', { recursive: true });
  await writeFile('dist/webview.js', minified.code || '');
}

bundle().catch(err => {
  logger.error(err);
  process.exit(1);
});
