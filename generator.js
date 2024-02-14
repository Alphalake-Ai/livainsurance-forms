import puppeteer from "puppeteer";
import mustache from "mustache";
import fs from 'fs';
import { workerData, parentPort } from "worker_threads";

async function generate({ template, data, pdfName, saveRaw }) {
    const templateFile = fs.readFileSync(`./template/${template}`, { encoding: 'utf8' });
    const renderedTemplate = mustache.render(templateFile, data);
    if (saveRaw) {
        fs.writeFileSync(`./raw/${pdfName.replace(/\.pdf$/, ".html")}`, renderedTemplate, { encoding: "utf8" })
    }
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    try {
        const pdfPath = `./public/${pdfName}`;
        await page.setContent(renderedTemplate, { waitUntil: "domcontentloaded" });
        // await sleep(20000)
        await page.waitForNetworkIdle();
        await page.pdf({
            path: pdfPath,
            format: 'A4',
            landscape: false,
            printBackground: true,
            margin: {
                top: '0px',
                right: '0px',
                bottom: '0px',
                left: '0px'
            }
        });
        page.close();
        browser.close();
        parentPort.postMessage({ error: false, message: `PDF generated at ${pdfPath}`, fileName: pdfName });
    } catch (error) {
        console.log(error);
        parentPort.postMessage({ error: true, message: `Error generating PDF: ${error.message}` });
    }
}

// sleep function
function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
}
// const file_prefix = `http://localhost:3000`;
generate(workerData);

const data = {
    "member_id": [
        "1",
        "2",
        "1",
        "2",
        "1",
        "2",
        "1",
        "2",
        "1",
        "2",
        "1",
        "2",
        "1",
        "2",
        "1",
        "2"
    ],
    "staff_id": "12",
    "employer_name": "Nischay Chandra",
    "policy_no": [
        "1",
        "2",
        "1",
        "2",
        "1",
        "2",
        "1",
        "2",
        "1",
        "2",
        "1",
        "2",
        "1",
        "2"
    ],
    "employee_name": "Nischay Chandra",
    "claim_ref": "asdfsd",
    "patient_name": "sdfsdf",
    "relationship": "sdfsd",
    "email": "nischay.chandra@alphalake.ai",
    "gsm": "45-1234567890",
    "date_from": [
        "2",
        "0",
        "2",
        "4",
        "0",
        "2",
        "0",
        "1"
    ],
    "date_to": [
        "2",
        "0",
        "2",
        "4",
        "0",
        "2",
        "0",
        "3"
    ],
    "treatment_country": "India",
    "hospital_name": "Nischay Chandra",
    "diagnosis": "df fgfh fgggyu df sfghj a;fjs dsdgsdfg asl;uaw ihasf has;dfh",
    "fr_cf": "12",
    "omr_cf": "12",
    "fr_cec": "12",
    "omr_cec": "12",
    "fr_mc": "12",
    "omr_mc": "12",
    "fr_tc": "12",
    "omr_tc": "12",
    "no_of_days": "2",
    "rate": "4",
    "fr_cos": "12",
    "fr_hrr": "12",
    "fr_sf": "12",
    "fr_cos_otr": "21",
    "omr_cos": "12",
    "omr_hrr": "12",
    "omr_sf": "21",
    "omr_cos_otr": "21",
    "fr_otr": "22",
    "omr_otr": "22",
    "fr_ta": "22",
    "omr_ta": "222",
    "fr_ded": "2",
    "omr_ded": "22",
    "fr_balance": "2",
    "omr_balance": "2",
    "account_number": "31sdfsd",
    "bank_name": "dsfasdf",
    "bank_branch": "sdfsdg",
    "account_holder": "Nischay Chandra",
    "ip_r": "✔",
    "ip_pa": "✔",
    "ip_pc": "✔",
    "ip_mc": "✔",
    "op_r": "✔",
    "op_mc": "✔",
    "op_ir": "✔",
    "no_of_documents": "3",
    "employee_sign_date": [
        "2",
        "0",
        "2",
        "4",
        "0",
        "2",
        "1",
        "4"
    ],
    "currency": "INR",
    "employee_sign": "data:image/png;base64,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"
}

// generate({ template: "gmir.html", data, pdfName: "test.pdf", saveRaw: true })
