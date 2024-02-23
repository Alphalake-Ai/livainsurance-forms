const canvas = document.getElementById('pdf-canvas');
const pdfUrl = canvas.getAttribute("data-pdf");

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

pdfjsLib.getDocument(pdfUrl).promise.then(function (pdf) {

    pdf.getPage(1).then(function (page) {
        const context = canvas.getContext('2d');

        function renderPage(scale) {
            const viewport = page.getViewport({ scale: scale });
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            page.render(renderContext);
        }

        renderPage(2);

        document.getElementById("scale")?.addEventListener("change", (e) => updateScale(e.target.value))
        function updateScale(newScale) {
            let root = document.documentElement;
            root.style.setProperty('--scale', parseFloat(parseFloat(newScale) / 2));
            renderPage(parseFloat(newScale))
        }
    })
}).catch(e => { console.log(e) });