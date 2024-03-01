import crypto from "crypto";
import fs from "fs/promises";

let cachedSecret = null;
async function getSecret() {
    if (cachedSecret) return cachedSecret;
    cachedSecret = await fs.readFile("secret.txt");
    return cachedSecret;
}

export async function encrypt(text) {
    const secret = await getSecret();
    let iv = crypto.randomBytes(16);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secret), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export async function decrypt(text) {
    const secret = await getSecret();
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secret), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}
