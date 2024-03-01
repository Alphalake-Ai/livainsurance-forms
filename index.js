import express from "express";
import multer from "multer";
import fs from "fs/promises";
import uuid from "uuidv4";
import { Worker } from "worker_threads";
import { toDataURL, formatDateForGMIR, getToday } from "./utils/helpers.js";
import { gmirSchema } from "./utils/validation-schema.js";
import dotenv from "dotenv";
dotenv.config();

// import csurf from "csurf";
// import cookieParser from "cookie-parser";
import cors from "cors";
import { decrypt, encrypt } from "./utils/crypt.js";
import { sendFormLinkMail } from "./utils/mail.js";
import { checkAndGenerateSecret } from "./secret.js";

const app = express();
const port = 3000;

// const csrfProtection = csurf({ cookie: { secure: true } });
// app.use(csrfProtection);

// app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
// app.use((req, res, next) => {
//     res.locals.csrfToken = req.csrfToken();
//     next();
// });


const csrfMiddleware = (req, res, next) => {
    if (!req.csrfToken || !req.body._csrf || req.csrfToken() !== req.body._csrf) {
        return res.status(403).send('Invalid CSRF token');
    }
    next()
}
// app.use((err, req, res, next) => {
//     if (err.code === 'EBADCSRFTOKEN') {
//         CSRF token validation failed
//         res.status(403).send('CSRF Token Invalid');
//     } else {
//         next(err);
//     }
// });


app.set('view engine', 'ejs');
app.set('views', 'views');
app.use(express.static('public'))


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, `uploads/${req.params.id}`); // Destination folder for uploaded files
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); // Rename files if needed
    }
});
const upload = multer({ storage: storage }).any();

async function validateIdAndToken(req, res, next) {
    const { id } = req.params;
    if (!uuid.isUuid(id)) return res.render('error', { details: "Invalid Form URL!" });

    const token = req.query.token;
    if (!token) return res.render('error', { details: "Token missing in query" });

    const str = await decrypt(token);
    let dc = { email: "", id: "" };
    try {
        dc = JSON.parse(str);
        if(dc.id !== id) return res.render('error', { details: "Token Malformed!" });
        req.tokenPayload = dc;
        next();
    } catch (error) {
        return res.render('error', { details: "Token Malformed!" });
    }
}

app.get("/", (req, res) => {
    res.render("index");
})
app.post("/", async (req, res) => {
    const { email, form_name } = req.body;
    if(!email || !form_name) return res.render('error', { details: "Please provide both fields!" });

    const id = uuid.uuid();
    const token = await encrypt(JSON.stringify({ email, id }));
    const formLink = `${process.env.PUBLIC_URL}/${form_name}/${id}?token=${token}`;
    console.log(formLink);
    try {
        await sendFormLinkMail([email], formLink);
        return res.render("alert")
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error });
    }
});

app.get('/clrc/:id', validateIdAndToken, (req, res) => {
    return res.render('clrc');
});

app.post("/clrc/:id", validateIdAndToken, async (req, res) => {
    // extract form data from the page
    const dc = req.tokenPayload;
    let formData = req.body;
    let pdfName = "clrc_" + dc.id + ".pdf";
    let template = "clrc.html";

    try {
        await generatePDF({ template, data: formData, pdfName });
        return res.render('thank-you', { file_url: pdfName });
    } catch (error) {
        return res.status(500).send(`An error occurred: ${error}`);
    }
});


app.get("/gmir/:id", validateIdAndToken, (req, res) => {
    return res.render('gmir', { currencies });
});


app.post("/gmir/:id", validateIdAndToken, async (req, res) => {
    const { id } = req.params;
    try {
        await fs.readdir(`uploads/${id}`);
    } catch (error) {
        await fs.mkdir(`uploads/${id}`);
    }

    upload(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            return res.render('error', { details: err.message });
        } else if (err) {
            console.log(err);
            return res.render('error', { details: 'Something went wrong!' });
        }

        let formData = req.body;
        const { error, value } = gmirSchema.validate(req.body);
        if (error) {
            return res.render('error', { details: error });
        }
        formData = value;

        const dc = req.tokenPayload;
        if (dc.email !== formData["email"]) return res.render("error", { details: "Token malformed!" });
        
        try {
            const emplSign = req.files.find(f => f.fieldname === "employee_sign");
            let employeeSign = await fs.readFile(`${emplSign.destination}/${emplSign.filename}`);
            // const employerSign = req.files.find(f => f.fieldName === "employer_sign");
            const employeeSignDataUrl = toDataURL(employeeSign, emplSign.mimetype);
            // const employerSignDataUrl = bufferToDataURL(employerSign.buffer, employerSign.mimetype);

            const [currency, country] = formData["treatment_country"].split("#");

            formData["currency"] = currency;
            formData["treatment_country"] = country;
            formData["date_from"] = formatDateForGMIR(formData["date_from"]);
            formData["date_to"] = formatDateForGMIR(formData["date_to"]);
            formData["employee_sign"] = employeeSignDataUrl || "";
            formData["employee_sign_date"] = formatDateForGMIR(getToday());
            formData["member_id"] = formData["member_id"].split("");
            formData["policy_no"] = formData["policy_no"].split("");

            await fs.writeFile(`submissions/${id}.json`, JSON.stringify({ ...req.body, attachments: req.files }), { encoding: "utf8" });

            let pdfName = "gmir_" + id + ".pdf";
            let template = "gmir.html";

            await generatePDF({ template, data: formData, pdfName, saveRaw: true });
            return res.render('thank-you', { file_url: pdfName });
        } catch (error) {
            console.log(error);
            return res.render('error', { details: "Internal Error" });
        }
    })
})


app.listen(port, (err) => {
    if(err) {
        console.log(err);
    } else {
        checkAndGenerateSecret();
        console.log(`Server is running at http://localhost:${port}`);
    }
});


function generatePDF({ template, data, pdfName, saveRaw = false }) {
    const worker = new Worker("./generator.js", {
        workerData: {
            template, data, pdfName, saveRaw
        }
    });
    return new Promise((resolve, reject) => {
        worker.once('message', (data) => {
            worker.terminate();
            if (data.error) {
                reject();
            } else {
                resolve(data);
            }
        })
    })
}

const currencies = [
    {
        "country": "Afghanistan",
        "currency_code": "AFN"
    },
    {
        "country": "Albania",
        "currency_code": "ALL"
    },
    {
        "country": "Algeria",
        "currency_code": "DZD"
    },
    {
        "country": "American Samoa",
        "currency_code": "USD"
    },
    {
        "country": "Andorra",
        "currency_code": "EUR"
    },
    {
        "country": "Angola",
        "currency_code": "AOA"
    },
    {
        "country": "Anguilla",
        "currency_code": "XCD"
    },
    {
        "country": "Antarctica",
        "currency_code": "XCD"
    },
    {
        "country": "Antigua and Barbuda",
        "currency_code": "XCD"
    },
    {
        "country": "Argentina",
        "currency_code": "ARS"
    },
    {
        "country": "Armenia",
        "currency_code": "AMD"
    },
    {
        "country": "Aruba",
        "currency_code": "AWG"
    },
    {
        "country": "Australia",
        "currency_code": "AUD"
    },
    {
        "country": "Austria",
        "currency_code": "EUR"
    },
    {
        "country": "Azerbaijan",
        "currency_code": "AZN"
    },
    {
        "country": "Bahamas",
        "currency_code": "BSD"
    },
    {
        "country": "Bahrain",
        "currency_code": "BHD"
    },
    {
        "country": "Bangladesh",
        "currency_code": "BDT"
    },
    {
        "country": "Barbados",
        "currency_code": "BBD"
    },
    {
        "country": "Belarus",
        "currency_code": "BYR"
    },
    {
        "country": "Belgium",
        "currency_code": "EUR"
    },
    {
        "country": "Belize",
        "currency_code": "BZD"
    },
    {
        "country": "Benin",
        "currency_code": "XOF"
    },
    {
        "country": "Bermuda",
        "currency_code": "BMD"
    },
    {
        "country": "Bhutan",
        "currency_code": "BTN"
    },
    {
        "country": "Bolivia",
        "currency_code": "BOB"
    },
    {
        "country": "Bosnia and Herzegovina",
        "currency_code": "BAM"
    },
    {
        "country": "Botswana",
        "currency_code": "BWP"
    },
    {
        "country": "Bouvet Island",
        "currency_code": "NOK"
    },
    {
        "country": "Brazil",
        "currency_code": "BRL"
    },
    {
        "country": "British Indian Ocean Territory",
        "currency_code": "USD"
    },
    {
        "country": "Brunei",
        "currency_code": "BND"
    },
    {
        "country": "Bulgaria",
        "currency_code": "BGN"
    },
    {
        "country": "Burkina Faso",
        "currency_code": "XOF"
    },
    {
        "country": "Burundi",
        "currency_code": "BIF"
    },
    {
        "country": "Cambodia",
        "currency_code": "KHR"
    },
    {
        "country": "Cameroon",
        "currency_code": "XAF"
    },
    {
        "country": "Canada",
        "currency_code": "CAD"
    },
    {
        "country": "Cape Verde",
        "currency_code": "CVE"
    },
    {
        "country": "Cayman Islands",
        "currency_code": "KYD"
    },
    {
        "country": "Central African Republic",
        "currency_code": "XAF"
    },
    {
        "country": "Chad",
        "currency_code": "XAF"
    },
    {
        "country": "Chile",
        "currency_code": "CLP"
    },
    {
        "country": "China",
        "currency_code": "CNY"
    },
    {
        "country": "Christmas Island",
        "currency_code": "AUD"
    },
    {
        "country": "Cocos (Keeling) Islands",
        "currency_code": "AUD"
    },
    {
        "country": "Colombia",
        "currency_code": "COP"
    },
    {
        "country": "Comoros",
        "currency_code": "KMF"
    },
    {
        "country": "Congo",
        "currency_code": "XAF"
    },
    {
        "country": "Cook Islands",
        "currency_code": "NZD"
    },
    {
        "country": "Costa Rica",
        "currency_code": "CRC"
    },
    {
        "country": "Croatia",
        "currency_code": "EUR"
    },
    {
        "country": "Cuba",
        "currency_code": "CUP"
    },
    {
        "country": "Cyprus",
        "currency_code": "EUR"
    },
    {
        "country": "Czech Republic",
        "currency_code": "CZK"
    },
    {
        "country": "Denmark",
        "currency_code": "DKK"
    },
    {
        "country": "Djibouti",
        "currency_code": "DJF"
    },
    {
        "country": "Dominica",
        "currency_code": "XCD"
    },
    {
        "country": "Dominican Republic",
        "currency_code": "DOP"
    },
    {
        "country": "East Timor",
        "currency_code": "USD"
    },
    {
        "country": "Ecuador",
        "currency_code": "ECS"
    },
    {
        "country": "Egypt",
        "currency_code": "EGP"
    },
    {
        "country": "El Salvador",
        "currency_code": "SVC"
    },
    {
        "country": "England",
        "currency_code": "GBP"
    },
    {
        "country": "Equatorial Guinea",
        "currency_code": "XAF"
    },
    {
        "country": "Eritrea",
        "currency_code": "ERN"
    },
    {
        "country": "Estonia",
        "currency_code": "EUR"
    },
    {
        "country": "Ethiopia",
        "currency_code": "ETB"
    },
    {
        "country": "Falkland Islands",
        "currency_code": "FKP"
    },
    {
        "country": "Faroe Islands",
        "currency_code": "DKK"
    },
    {
        "country": "Fiji Islands",
        "currency_code": "FJD"
    },
    {
        "country": "Finland",
        "currency_code": "EUR"
    },
    {
        "country": "France",
        "currency_code": "EUR"
    },
    {
        "country": "French Guiana",
        "currency_code": "EUR"
    },
    {
        "country": "French Polynesia",
        "currency_code": "XPF"
    },
    {
        "country": "French Southern territories",
        "currency_code": "EUR"
    },
    {
        "country": "Gabon",
        "currency_code": "XAF"
    },
    {
        "country": "Gambia",
        "currency_code": "GMD"
    },
    {
        "country": "Georgia",
        "currency_code": "GEL"
    },
    {
        "country": "Germany",
        "currency_code": "EUR"
    },
    {
        "country": "Ghana",
        "currency_code": "GHS"
    },
    {
        "country": "Gibraltar",
        "currency_code": "GIP"
    },
    {
        "country": "Greece",
        "currency_code": "EUR"
    },
    {
        "country": "Greenland",
        "currency_code": "DKK"
    },
    {
        "country": "Grenada",
        "currency_code": "XCD"
    },
    {
        "country": "Guadeloupe",
        "currency_code": "EUR"
    },
    {
        "country": "Guam",
        "currency_code": "USD"
    },
    {
        "country": "Guatemala",
        "currency_code": "QTQ"
    },
    {
        "country": "Guinea",
        "currency_code": "GNF"
    },
    {
        "country": "Guinea-Bissau",
        "currency_code": "CFA"
    },
    {
        "country": "Guyana",
        "currency_code": "GYD"
    },
    {
        "country": "Haiti",
        "currency_code": "HTG"
    },
    {
        "country": "Heard Island and McDonald Islands",
        "currency_code": "AUD"
    },
    {
        "country": "Holy See (Vatican City State)",
        "currency_code": "EUR"
    },
    {
        "country": "Honduras",
        "currency_code": "HNL"
    },
    {
        "country": "Hong Kong",
        "currency_code": "HKD"
    },
    {
        "country": "Hungary",
        "currency_code": "HUF"
    },
    {
        "country": "Iceland",
        "currency_code": "ISK"
    },
    {
        "country": "India",
        "currency_code": "INR"
    },
    {
        "country": "Indonesia",
        "currency_code": "IDR"
    },
    {
        "country": "Iran",
        "currency_code": "IRR"
    },
    {
        "country": "Iraq",
        "currency_code": "IQD"
    },
    {
        "country": "Ireland",
        "currency_code": "EUR"
    },
    {
        "country": "Israel",
        "currency_code": "ILS"
    },
    {
        "country": "Italy",
        "currency_code": "EUR"
    },
    {
        "country": "Ivory Coast",
        "currency_code": "XOF"
    },
    {
        "country": "Jamaica",
        "currency_code": "JMD"
    },
    {
        "country": "Japan",
        "currency_code": "JPY"
    },
    {
        "country": "Jordan",
        "currency_code": "JOD"
    },
    {
        "country": "Kazakhstan",
        "currency_code": "KZT"
    },
    {
        "country": "Kenya",
        "currency_code": "KES"
    },
    {
        "country": "Kiribati",
        "currency_code": "AUD"
    },
    {
        "country": "Kuwait",
        "currency_code": "KWD"
    },
    {
        "country": "Kyrgyzstan",
        "currency_code": "KGS"
    },
    {
        "country": "Laos",
        "currency_code": "LAK"
    },
    {
        "country": "Latvia",
        "currency_code": "EUR"
    },
    {
        "country": "Lebanon",
        "currency_code": "LBP"
    },
    {
        "country": "Lesotho",
        "currency_code": "LSL"
    },
    {
        "country": "Liberia",
        "currency_code": "LRD"
    },
    {
        "country": "Libyan Arab Jamahiriya",
        "currency_code": "LYD"
    },
    {
        "country": "Liechtenstein",
        "currency_code": "CHF"
    },
    {
        "country": "Lithuania",
        "currency_code": "EUR"
    },
    {
        "country": "Luxembourg",
        "currency_code": "EUR"
    },
    {
        "country": "Macau",
        "currency_code": "MOP"
    },
    {
        "country": "North Macedonia",
        "currency_code": "MKD"
    },
    {
        "country": "Madagascar",
        "currency_code": "MGF"
    },
    {
        "country": "Malawi",
        "currency_code": "MWK"
    },
    {
        "country": "Malaysia",
        "currency_code": "MYR"
    },
    {
        "country": "Maldives",
        "currency_code": "MVR"
    },
    {
        "country": "Mali",
        "currency_code": "XOF"
    },
    {
        "country": "Malta",
        "currency_code": "EUR"
    },
    {
        "country": "Marshall Islands",
        "currency_code": "USD"
    },
    {
        "country": "Martinique",
        "currency_code": "EUR"
    },
    {
        "country": "Mauritania",
        "currency_code": "MRO"
    },
    {
        "country": "Mauritius",
        "currency_code": "MUR"
    },
    {
        "country": "Mayotte",
        "currency_code": "EUR"
    },
    {
        "country": "Mexico",
        "currency_code": "MXN"
    },
    {
        "country": "Micronesia, Federated States of",
        "currency_code": "USD"
    },
    {
        "country": "Moldova",
        "currency_code": "MDL"
    },
    {
        "country": "Monaco",
        "currency_code": "EUR"
    },
    {
        "country": "Mongolia",
        "currency_code": "MNT"
    },
    {
        "country": "Montserrat",
        "currency_code": "XCD"
    },
    {
        "country": "Morocco",
        "currency_code": "MAD"
    },
    {
        "country": "Mozambique",
        "currency_code": "MZN"
    },
    {
        "country": "Myanmar",
        "currency_code": "MMR"
    },
    {
        "country": "Namibia",
        "currency_code": "NAD"
    },
    {
        "country": "Nauru",
        "currency_code": "AUD"
    },
    {
        "country": "Nepal",
        "currency_code": "NPR"
    },
    {
        "country": "Netherlands",
        "currency_code": "EUR"
    },
    {
        "country": "Netherlands Antilles",
        "currency_code": "ANG"
    },
    {
        "country": "New Caledonia",
        "currency_code": "XPF"
    },
    {
        "country": "New Zealand",
        "currency_code": "NZD"
    },
    {
        "country": "Nicaragua",
        "currency_code": "NIO"
    },
    {
        "country": "Niger",
        "currency_code": "XOF"
    },
    {
        "country": "Nigeria",
        "currency_code": "NGN"
    },
    {
        "country": "Niue",
        "currency_code": "NZD"
    },
    {
        "country": "Norfolk Island",
        "currency_code": "AUD"
    },
    {
        "country": "North Korea",
        "currency_code": "KPW"
    },
    {
        "country": "Northern Ireland",
        "currency_code": "GBP"
    },
    {
        "country": "Northern Mariana Islands",
        "currency_code": "USD"
    },
    {
        "country": "Norway",
        "currency_code": "NOK"
    },
    {
        "country": "Oman",
        "currency_code": "OMR"
    },
    {
        "country": "Pakistan",
        "currency_code": "PKR"
    },
    {
        "country": "Palau",
        "currency_code": "USD"
    },
    {
        "country": "Palestine",
        "currency_code": null
    },
    {
        "country": "Panama",
        "currency_code": "PAB"
    },
    {
        "country": "Papua New Guinea",
        "currency_code": "PGK"
    },
    {
        "country": "Paraguay",
        "currency_code": "PYG"
    },
    {
        "country": "Peru",
        "currency_code": "PEN"
    },
    {
        "country": "Philippines",
        "currency_code": "PHP"
    },
    {
        "country": "Pitcairn Islands",
        "currency_code": "NZD"
    },
    {
        "country": "Poland",
        "currency_code": "PLN"
    },
    {
        "country": "Portugal",
        "currency_code": "EUR"
    },
    {
        "country": "Puerto Rico",
        "currency_code": "USD"
    },
    {
        "country": "Qatar",
        "currency_code": "QAR"
    },
    {
        "country": "Reunion",
        "currency_code": "EUR"
    },
    {
        "country": "Romania",
        "currency_code": "RON"
    },
    {
        "country": "Russian Federation",
        "currency_code": "RUB"
    },
    {
        "country": "Rwanda",
        "currency_code": "RWF"
    },
    {
        "country": "Saint Helena",
        "currency_code": "SHP"
    },
    {
        "country": "Saint Kitts and Nevis",
        "currency_code": "XCD"
    },
    {
        "country": "Saint Lucia",
        "currency_code": "XCD"
    },
    {
        "country": "Saint Pierre and Miquelon",
        "currency_code": "EUR"
    },
    {
        "country": "Saint Vincent and the Grenadines",
        "currency_code": "XCD"
    },
    {
        "country": "Samoa",
        "currency_code": "WST"
    },
    {
        "country": "San Marino",
        "currency_code": "EUR"
    },
    {
        "country": "Sao Tome and Principe",
        "currency_code": "STD"
    },
    {
        "country": "Saudi Arabia",
        "currency_code": "SAR"
    },
    {
        "country": "Scotland",
        "currency_code": "GBP"
    },
    {
        "country": "Senegal",
        "currency_code": "XOF"
    },
    {
        "country": "Serbia",
        "currency_code": "RSD"
    },
    {
        "country": "Seychelles",
        "currency_code": "SCR"
    },
    {
        "country": "Sierra Leone",
        "currency_code": "SLL"
    },
    {
        "country": "Singapore",
        "currency_code": "SGD"
    },
    {
        "country": "Slovakia",
        "currency_code": "EUR"
    },
    {
        "country": "Slovenia",
        "currency_code": "EUR"
    },
    {
        "country": "Solomon Islands",
        "currency_code": "SBD"
    },
    {
        "country": "Somalia",
        "currency_code": "SOS"
    },
    {
        "country": "South Africa",
        "currency_code": "ZAR"
    },
    {
        "country": "South Georgia and the South Sandwich Islands",
        "currency_code": "GBP"
    },
    {
        "country": "South Korea",
        "currency_code": "KRW"
    },
    {
        "country": "South Sudan",
        "currency_code": "SSP"
    },
    {
        "country": "Spain",
        "currency_code": "EUR"
    },
    {
        "country": "Sri Lanka",
        "currency_code": "LKR"
    },
    {
        "country": "Sudan",
        "currency_code": "SDG"
    },
    {
        "country": "Suriname",
        "currency_code": "SRD"
    },
    {
        "country": "Svalbard and Jan Mayen",
        "currency_code": "NOK"
    },
    {
        "country": "Swaziland",
        "currency_code": "SZL"
    },
    {
        "country": "Sweden",
        "currency_code": "SEK"
    },
    {
        "country": "Switzerland",
        "currency_code": "CHF"
    },
    {
        "country": "Syria",
        "currency_code": "SYP"
    },
    {
        "country": "Tajikistan",
        "currency_code": "TJS"
    },
    {
        "country": "Tanzania",
        "currency_code": "TZS"
    },
    {
        "country": "Thailand",
        "currency_code": "THB"
    },
    {
        "country": "The Democratic Republic of Congo",
        "currency_code": "CDF"
    },
    {
        "country": "Togo",
        "currency_code": "XOF"
    },
    {
        "country": "Tokelau",
        "currency_code": "NZD"
    },
    {
        "country": "Tonga",
        "currency_code": "TOP"
    },
    {
        "country": "Trinidad and Tobago",
        "currency_code": "TTD"
    },
    {
        "country": "Tunisia",
        "currency_code": "TND"
    },
    {
        "country": "Turkey",
        "currency_code": "TRY"
    },
    {
        "country": "Turkmenistan",
        "currency_code": "TMT"
    },
    {
        "country": "Turks and Caicos Islands",
        "currency_code": "USD"
    },
    {
        "country": "Tuvalu",
        "currency_code": "AUD"
    },
    {
        "country": "Uganda",
        "currency_code": "UGX"
    },
    {
        "country": "Ukraine",
        "currency_code": "UAH"
    },
    {
        "country": "United Arab Emirates",
        "currency_code": "AED"
    },
    {
        "country": "United Kingdom",
        "currency_code": "GBP"
    },
    {
        "country": "United States",
        "currency_code": "USD"
    },
    {
        "country": "United States Minor Outlying Islands",
        "currency_code": "USD"
    },
    {
        "country": "Uruguay",
        "currency_code": "UYU"
    },
    {
        "country": "Uzbekistan",
        "currency_code": "UZS"
    },
    {
        "country": "Vanuatu",
        "currency_code": "VUV"
    },
    {
        "country": "Venezuela",
        "currency_code": "VEF"
    },
    {
        "country": "Vietnam",
        "currency_code": "VND"
    },
    {
        "country": "Virgin Islands, British",
        "currency_code": "USD"
    },
    {
        "country": "Virgin Islands, U.S.",
        "currency_code": "USD"
    },
    {
        "country": "Wales",
        "currency_code": "GBP"
    },
    {
        "country": "Wallis and Futuna",
        "currency_code": "XPF"
    },
    {
        "country": "Western Sahara",
        "currency_code": "MAD"
    },
    {
        "country": "Yemen",
        "currency_code": "YER"
    },
    {
        "country": "Zambia",
        "currency_code": "ZMW"
    },
    {
        "country": "Zimbabwe",
        "currency_code": "ZWD"
    }
]