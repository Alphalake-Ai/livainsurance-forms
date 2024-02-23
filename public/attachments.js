document.querySelector('#attach-btn').addEventListener('click', () => {
    document.querySelector('#attach-in').click()
});

function addAttachments(target) {
    const fileList = target.files;
    const fileListContainer = document.getElementById('attachmentList');
    const fileInputContainer = document.getElementById('attachments');

    let alreadyAttached = fileListContainer.children.length;

    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        let targetName = `attach_${i + alreadyAttached}`;

        const listItem = document.createElement('li');
        listItem.id = targetName;
        listItem.innerHTML = `
        <button type="button" onclick="removeAttachment(this)" data-target="${targetName}">X</button>
        <div>
            ${file.name} <br>
            <small>${bytesToSize(file.size)}</small>
        </div>
        `;
        fileListContainer.appendChild(listItem);

        const inputItem = document.createElement('input');
        inputItem.type = "file";
        inputItem.name = targetName;
        inputItem.id = inputItem.name;
        const inputFileList = new DataTransfer();
        inputFileList.items.add(file);
        inputItem.files = inputFileList.files;
        fileInputContainer.appendChild(inputItem);

        document.querySelector('input[name="no_of_documents"]').value = 1 + fileInputContainer.children.length;
    }
}

function removeAttachment(target) {
    const inputTarget = target.getAttribute("data-target");

    const fileListContainer = document.getElementById('attachmentList');
    const fileInputContainer = document.getElementById('attachments');

    fileListContainer.removeChild(document.querySelector(`li#${inputTarget}`));
    fileInputContainer.removeChild(document.querySelector(`input#${inputTarget}`));
    document.querySelector('input[name="no_of_documents"]').value = 1 + fileInputContainer.children.length;
}

function bytesToSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}