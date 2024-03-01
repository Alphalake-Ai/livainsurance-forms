import crypto from "crypto";
import fs from "fs/promises";

export async function checkAndGenerateSecret() {
    try {
        fs.readFile('secret.txt');
    } catch (error) {
        const secret = crypto.randomBytes(32);
        fs.writeFile('secret.txt', secret);
    }
}