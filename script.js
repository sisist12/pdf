// Tell PDF.js where to find its worker script (required for it to run properly)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// Initialize the Fabric canvas
const canvas = new fabric.Canvas('pdf-canvas');
let originalFileName = "edited_document.pdf";

// DOM Elements
const uploadInput = document.getElementById('upload-pdf');
const editControls = document.getElementById('edit-controls');
const whiteoutBtn = document.getElementById('whiteout-btn');
const textBtn = document.getElementById('text-btn');
const exportBtn = document.getElementById('export-btn');

// Handle PDF Upload
uploadInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
        alert('Please upload a valid PDF file.');
        return;
    }

    originalFileName = file.name.replace('.pdf', '_edited.pdf');

    const fileReader = new FileReader();
    fileReader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        
        // Load the PDF via PDF.js
        pdfjsLib.getDocument(typedarray).promise.then(pdf => {
            // For this simple app, we only render the first page (page 1)
            renderPage(pdf, 1);
            editControls.classList.remove('hidden');
        }).catch(err => {
            console.error(err);
            alert("Could not read this PDF.");
        });
    };
    fileReader.readAsArrayBuffer(file);
});

// Render PDF Page to Canvas
function renderPage(pdfDoc, pageNum) {
    pdfDoc.getPage(pageNum).then(page => {
        // Set scale (1.5 gives better resolution)
        const viewport = page.getViewport({ scale: 1.5 });
        
        // Create an invisible, temporary HTML canvas to draw the PDF onto
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        tempCanvas.height = viewport.height;
        tempCanvas.width = viewport.width;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };

        // Tell PDF.js to draw the page onto our temporary canvas
        page.render(renderContext).promise.then(() => {
            // Resize our interactive Fabric canvas to match the PDF dimensions
            canvas.setWidth(viewport.width);
            canvas.setHeight(viewport.height);

            // Convert the temporary canvas to an image and set it as the Fabric background
            fabric.Image.fromURL(tempCanvas.toDataURL(), function(img) {
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
            });
        });
    });
}

// Tool: Add Whiteout Box
whiteoutBtn.addEventListener('click', () => {
    const rect = new fabric.Rect({
        left: 50,
        top: 50,
        fill: 'white',
        width: 150,
        height: 25,
        borderColor: '#3498db',
        cornerColor: '#3498db',
        cornerSize: 8,
        transparentCorners: false
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
});

// Tool: Add Editable Text
textBtn.addEventListener('click', () => {
    const text = new fabric.IText('Type here...', {
        left: 50,
        top: 100,
        fontFamily: 'Helvetica',
        fill: '#000000',
        fontSize: 20,
        borderColor: '#3498db',
        cornerColor: '#3498db',
        cornerSize: 8,
        transparentCorners: false
    });
    canvas.add(text);
    canvas.setActiveObject(text);
});

// Export Canvas back to PDF
exportBtn.addEventListener('click', () => {
    // Deselect objects so selection borders don't show up in the final PDF
    canvas.discardActiveObject();
    canvas.renderAll();

    // Grab the canvas as a high-quality JPEG
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const { jsPDF } = window.jspdf;
    
    // Initialize jsPDF with the exact dimensions of our canvas
    const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
    });

    // Paste the image into the PDF and save
    pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
    pdf.save(originalFileName);
});
