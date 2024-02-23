const signOverlay = document.getElementById('sign_overlay');
let targetId = "";
let previewTargetId = "";
let targetDateId = "";

function openDialog(target) {
    targetId = target.getAttribute("data-target");
    previewTargetId = target.getAttribute("data-preview");
    targetDateId = target.getAttribute("data-date");
    signOverlay.style.display = "grid";
}
function closeDialog() {
    signOverlay.style.display = "none";
}

const panelInput = document.querySelector('#upload-panel-input');
const panelInputPreview = document.querySelector('#panel-preview')
panelInput.addEventListener("change", (e) => {
    const fileList = e.target.files;
    if (!fileList) return;

    const file = fileList[0];
    if (file.type !== "image/png") {
        alert("Selected file is not a PNG file.");
        return;
    } else {
        let url = URL.createObjectURL(file);
        panelInputPreview.setAttribute("src", url);
    }
})

const clientWidth = document.body.clientWidth;
const signCanvas = document.querySelector("canvas#signature");

signCanvas.width = clientWidth > 420 ? 420 : clientWidth - 20;
signCanvas.height = Math.floor(signCanvas.width * 0.32);

const signaturePad = new SignaturePad(signCanvas);

function clearSignature() {
    panelInputPreview.setAttribute("src", "");
    panelInput.value = null;
    signaturePad.clear();
}

const uploadPanelSwitch = document.getElementById('upload-panel-switch');
function saveSignature() {
    if (uploadPanelSwitch.checked) {
        document.getElementById(targetId).files = panelInput.files;
        showTargetPreview(panelInputPreview.getAttribute("src"));
    }
    else if (signaturePad.isEmpty()) {
        showTargetPreview("");
        selectDataUrlAsFile("", targetId);
    } else {
        const dataURL = signaturePad.toDataURL('image/png');
        showTargetPreview(dataURL)
        selectDataUrlAsFile(dataURL, targetId);
    }
    let today = getToday();
    document.querySelector(`input[name="${targetDateId}"]`).value = today;
    document.getElementById(targetDateId).innerText = today;
    closeDialog();
}

function showTargetPreview(src) {
    document.getElementById(previewTargetId).setAttribute("src", src);
}

function selectDataUrlAsFile(dataUrl, targetElementId) {
    let fileInput = document.getElementById(targetElementId);

    if (!dataUrl) {
        fileInput.value = null;
        return;
    }

    // Create a Blob from the data URL
    let blob = dataURLToBlob(dataUrl);

    // Create a File object from the Blob
    let file = new File([blob], 'signature.png', { type: "image/png" });

    // Create a new FileList object with the File
    let filesList = new DataTransfer();
    filesList.items.add(file);

    // Set the files property of the file input to the FileList object
    fileInput.files = filesList.files;
}
function dataURLToBlob(dataUrl) {
    let parts = dataUrl.split(';base64,');
    let contentType = parts[0].split(':')[1];
    let raw = window.atob(parts[1]);
    let rawLength = raw.length;
    let uint8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
        uint8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uint8Array], { type: contentType });
}

function fileToDataUrl(file) {
    if (!window.FileReader) {
        throw new Error('FileReader API is not supported by your browser.');
    }

    const reader = new FileReader();

    const promise = new Promise((resolve, reject) => {
        reader.onload = (event) => {
            resolve(event.target.result);
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsDataURL(file);
    });

    return promise;
}

function getToday() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
    const year = today.getFullYear();

    return day + month + year;
}

function selectCurrency(target) {
    const curr = target.value.split("#")[0];
    document.querySelector('input[name="currency"]').value = curr;
}

function submit() {
    let form = document.getElementById("form");
    // check if the file input field with id 'employee_sign' holds any file or not
    if (!document.getElementById('employee_sign_input').files?.length) {
        alert('Please upload/draw employee signature before submitting the form.');
        return;
    }

    document.getElementById('real_submit').click();
}