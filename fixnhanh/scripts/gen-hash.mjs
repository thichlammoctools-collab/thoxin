// One-off: generate PBKDF2 hash for the demo password, matching src/auth.ts format.
import crypto from 'node:crypto';

const password = process.argv[2] || 'fixnhanh123';
const salt = Buffer.from('aaaaaaaaaaaaaaaa'); // deterministic for verification only
const h = crypto.pbkdf2Sync(password, salt, 25000, 32, 'sha256');
console.log(`pbkdf2$25000$${salt.toString('base64')}$${h.toString('base64')}`);
