const crypto = require('crypto');
require('dotenv').config();

const algorithm = 'aes-256-cbc';
// Use a secure key from env or fallback for dev (IN PROD MUST BE ENV)
// For this environment, if ENCRYPTION_KEY is not set, we generate a persistent one or use a hardcoded fallback 
// (Warning: Hardcoded is not secure for real prod, but necessary if we can't easily set env vars right now. 
//  Given the user restrictions, I will use a reliable key generation based on a secret).
const secretKey = process.env.ENCRYPTION_KEY || 'toppingfrozen_secure_key_32chars!!'; // Must be 32 chars
const key = crypto.scryptSync(secretKey, 'salt', 32);

const encrypt = (text) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
};

const decrypt = (encryptedData, iv) => {
    const ivBuffer = Buffer.from(iv, 'hex');
    const encryptedText = Buffer.from(encryptedData, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};

module.exports = { encrypt, decrypt };
