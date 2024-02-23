import nodemailer from "nodemailer";
import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";

dotenv.config();

const oAuthClient = new OAuth2Client({
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    redirectUri: process.env.GMAIL_REDIRECT_URI
})

oAuthClient.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

let accessToken = null;
let lastFetchedToken = null;

async function getAccessToken(){
    if(accessToken && ((lastFetchedToken - Date.now()) < (59*60*1000))){
        return accessToken;
    } else {
        accessToken = await oAuthClient.getAccessToken();
        lastFetchedToken = Date.now();
        return accessToken;
    }
}

export async function sendFormLinkMail(to, formLink) {
    const accessToken = await getAccessToken();
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: process.env.GMAIL_USER,
            clientId: process.env.GMAIL_CLIENT_ID,
            clientSecret: process.env.GMAIL_CLIENT_SECRET,
            refreshToken: process.env.GMAIL_REFRESH_TOKEN,
            accessToken: accessToken
        }
    })

    try {
        await transporter.sendMail({
            to: to.join(", "),
            from: `Liva Insurance<${process.env.GMAIL_USER}>`,
            subject: "Insurace Claim Form",
            html: `
            <h3>Dear Customer,</h3>
            <p>Please fill up the below form to raise claim.</p>
            <p>Archive Link: <a href="${formLink}">Claim Form</a></p>
            `,
        });
        return;
    } catch (error) {
        throw new Error("Sending form email: "+ error)
    }
}

