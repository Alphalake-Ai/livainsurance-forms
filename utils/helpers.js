export function getToday() {
    let today = new Date();

    // Format date as YYYY-MM-DD
    let dd = String(today.getDate()).padStart(2, '0');
    let mm = String(today.getMonth() + 1).padStart(2, '0');
    let yyyy = today.getFullYear();

    return `${yyyy}-${mm}-${dd}`;
}

export function bufferToDataURL(buffer, mimeType) {
    if (!mimeType) {
        throw new Error('MIME type is required for converting buffer to data URL.');
    }
    const base64 = buffer.toString('base64');
    const dataURL = `data:${mimeType};base64,${base64}`;
    return dataURL;
}

export function formatDateForGMIR(date){
    return date.replace(/\-/g,"").split("");
}

