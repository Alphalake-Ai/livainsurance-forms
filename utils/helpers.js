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

export function formatDateForGMIR(date){
    return date.replace(/\-/g,"").split("");
}

