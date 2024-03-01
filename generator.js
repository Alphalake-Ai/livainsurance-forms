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

generate(workerData);

