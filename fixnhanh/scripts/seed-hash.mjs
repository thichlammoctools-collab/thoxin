import crypto from 'crypto';

const password = 'fixnhanh123';
const iterations = 25000;
const salt = crypto.randomBytes(16);

const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');

const saltB64 = salt.toString('base64');
const hashB64 = hash.toString('base64');

const fullHash = `pbkdf2$25000$${saltB64}$${hashB64}`;
console.log('Password:', password);
console.log('Hash:', fullHash);
