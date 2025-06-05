import { test, expect } from '@playwright/test';
import { runTests } from 'vscode-test';
import * as path from 'path';

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

  expect(exitCode).toBeUndefined();
});
