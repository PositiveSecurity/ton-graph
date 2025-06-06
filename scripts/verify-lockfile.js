const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');
const path = require('path');

const lockfile = path.join(__dirname, '..', 'package-lock.json');
const signaturePath = path.join(__dirname, '..', 'package-lock.json.sig');

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function sign() {
  const payload = fs.readFileSync(lockfile);
  const hash = sha256(payload);
  fs.writeFileSync(signaturePath, hash);
  console.log('Lockfile hash stored in', signaturePath);
}

function verify() {
  if (!fs.existsSync(signaturePath)) {
    console.error('Signature file not found. Run npm run sign-lockfile first.');
    process.exit(1);
  }
  const expected = fs.readFileSync(signaturePath, 'utf8').trim();
  const actual = sha256(fs.readFileSync(lockfile));
  if (expected !== actual) {
    console.error('package-lock.json hash mismatch');
    process.exit(1);
  }
  // Check dependencies list via vsce
  try {
    execSync('npx vsce ls --dependencies', { stdio: 'inherit' });
  } catch (err) {
    console.error('vsce ls failed');
    process.exit(1);
  }
  console.log('Lockfile verified');
}

const mode = process.argv[2];
if (mode === 'sign') {
  sign();
} else if (mode === 'verify') {
  verify();
} else {
  console.error('Usage: node verify-lockfile.js <sign|verify>');
  process.exit(1);
}
