import crypto from "crypto";
import fs from "fs";

const secret = crypto.randomBytes(32);

// Write the secret to a text file
fs.writeFile('secret.txt', secret, (err) => {
    if (err) throw err;
    console.log('The secret has been saved!');
});
