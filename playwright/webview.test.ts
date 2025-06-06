import { test, expect } from '@playwright/test';
import { runTests } from 'vscode-test';
import * as path from 'path';
import { promises as fs } from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

test('webview contains mermaid', async () => {
  const extensionDevelopmentPath = path.resolve(__dirname, '..');
  const extensionTestsPath = path.resolve(__dirname, 'verifyWebview.js');

  const exitCode = await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: [
      '--disable-extensions',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--skip-release-notes',
      '--skip-welcome'
    ]
  });

  expect(exitCode).toBe(0);
});

test('graph screenshot matches golden', async ({ page }, testInfo) => {
  const extensionDevelopmentPath = path.resolve(__dirname, '..');
  const extensionTestsPath = path.resolve(__dirname, 'verifyWebview.js');
  const htmlPath = path.join(testInfo.outputDir, 'webview.html');

  const exitCode = await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: [
      '--disable-extensions',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--skip-release-notes',
      '--skip-welcome'
    ],
    testRunnerEnv: { OUTPUT_HTML: htmlPath }
  });

  expect(exitCode).toBe(0);

  await page.goto('file://' + htmlPath);
  await page.waitForSelector('.mermaid svg');

  const screenshotPath = path.join(testInfo.outputDir, 'graph.png');
  await page.locator('.mermaid-container').screenshot({ path: screenshotPath });

  const goldenBase64 = await fs.readFile(
    path.resolve(__dirname, 'goldens', 'graph.b64'),
    'utf8'
  );
  const actual = PNG.sync.read(await fs.readFile(screenshotPath));
  const expected = PNG.sync.read(Buffer.from(goldenBase64, 'base64'));
  const diff = pixelmatch(expected.data, actual.data, null, expected.width, expected.height, { threshold: 0.1 });

  expect(diff).toBe(0);
});
