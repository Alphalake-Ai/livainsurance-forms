export function getToday() {
    let today = new Date();

    let dd = String(today.getDate()).padStart(2, '0');
    let mm = String(today.getMonth() + 1).padStart(2, '0');
    let yyyy = today.getFullYear();

    return `${dd}-${mm}-${yyyy}`;
}

export function toDataURL(data, mimeType) {
    if (!mimeType) {
        throw new Error('MIME type is required for converting buffer to data URL.');
    }
    const base64Image = Buffer.from(data).toString('base64');
    const dataURL = `data:${mimeType};base64,${base64Image}`;
    return dataURL;
}

export function formatDateForGMIR(d) {
    let date = new Date(d)
    let day = date.getDate();
    let month = date.getMonth() + 1; // January is 0, so we need to add 1
    let year = date.getFullYear();

    // Ensure two digits for day and month
    if (day < 10) {
        day = '0' + day;
    }
    if (month < 10) {
        month = '0' + month;
    }

    // Format the date as "DD-MM-YYYY"
    let fm = day + month + year;
    return fm.split("")
}

