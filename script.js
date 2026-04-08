const uploadInput = document.getElementById('upload-pdf');
const viewerContainer = document.getElementById('viewer-container');
const editControls = document.getElementById('edit-controls');
const addTextBtn = document.getElementById('add-text-btn');
const exportBtn = document.getElementById('export-btn');

let currentPdfBytes = null;
let originalFileName = "document.pdf";
let pdfDocument = null;
const pageContainers = []; // Array to keep track of page DOM elements

// Global state for annotations
let annotations = [];
let isAddingText = false;

// Handle PDF Upload
uploadInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    originalFileName = file.name;

    // Read the file as an ArrayBuffer
    currentPdfBytes = await file.arrayBuffer();

    // Clear previous viewer
    viewerContainer.innerHTML = '';
    pageContainers.length = 0; // clear array
    annotations = []; // clear annotations for new file

    try {
        // Load the PDF via pdf.js for rendering
        const loadingTask = pdfjsLib.getDocument({ data: currentPdfBytes });
        pdfDocument = await loadingTask.promise;

        // Render each page
        for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
            await renderPage(pageNum);
        }

        // Show the edit controls
        editControls.classList.remove('hidden');
    } catch (error) {
        console.error("Error rendering PDF:", error);
        alert("Failed to render PDF.");
    }
});

async function renderPage(pageNum) {
    const page = await pdfDocument.getPage(pageNum);
    const scale = 1.5; // Adjust scale as needed
    const viewport = page.getViewport({ scale });

    // Create a container for the page
    const pageContainer = document.createElement('div');
    pageContainer.className = 'pdf-page-container';
    pageContainer.dataset.pageNumber = pageNum;
    pageContainer.style.width = `${viewport.width}px`;
    pageContainer.style.height = `${viewport.height}px`;

    // Create the canvas for the page
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Append canvas to container
    pageContainer.appendChild(canvas);
    viewerContainer.appendChild(pageContainer);

    // Keep track of the container
    pageContainers.push({
        element: pageContainer,
        viewport: viewport,
        pageNum: pageNum
    });

    // Render the page on the canvas
    const context = canvas.getContext('2d');
    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };

    await page.render(renderContext).promise;
}

// Enable text addition mode
addTextBtn.addEventListener('click', () => {
    isAddingText = true;
    viewerContainer.style.cursor = 'crosshair';
});

// Handle clicking on viewer container to add text
viewerContainer.addEventListener('click', (e) => {
    if (!isAddingText) return;

    // Find the page container that was clicked
    const pageContainer = e.target.closest('.pdf-page-container');
    if (!pageContainer) return;

    // Calculate click position relative to the page container
    const rect = pageContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pageNum = parseInt(pageContainer.dataset.pageNumber);

    createTextAnnotation(pageContainer, x, y, pageNum);

    // Reset adding mode
    isAddingText = false;
    viewerContainer.style.cursor = 'default';
});

function createTextAnnotation(container, x, y, pageNum) {
    const annotDiv = document.createElement('div');
    annotDiv.className = 'text-annotation editing';
    annotDiv.style.left = `${x}px`;
    annotDiv.style.top = `${y}px`;
    annotDiv.style.fontSize = '16px'; // default size

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter text';

    annotDiv.appendChild(input);
    container.appendChild(annotDiv);

    // Focus input and select all text
    input.focus();

    // Store the annotation data
    const annotData = {
        element: annotDiv,
        input: input,
        x: x,
        y: y,
        pageNum: pageNum,
        text: ''
    };
    annotations.push(annotData);

    // Handle blur (finish editing)
    input.addEventListener('blur', () => {
        annotDiv.classList.remove('editing');
        annotData.text = input.value;
        if (!annotData.text.trim()) {
            // Remove empty annotations
            if (annotDiv.cleanup) annotDiv.cleanup();
            annotDiv.remove();
            const index = annotations.indexOf(annotData);
            if (index > -1) {
                annotations.splice(index, 1);
            }
        }
    });

    // Handle double click to edit again
    annotDiv.addEventListener('dblclick', (e) => {
        e.stopPropagation(); // prevent new annotation
        annotDiv.classList.add('editing');
        input.focus();
    });

    // Simple drag functionality
    let isDragging = false;
    let startX, startY;

    annotDiv.addEventListener('mousedown', (e) => {
        if (annotDiv.classList.contains('editing')) return; // don't drag while editing
        isDragging = true;
        startX = e.clientX - annotDiv.offsetLeft;
        startY = e.clientY - annotDiv.offsetTop;
        e.stopPropagation();
    });

    const onMouseMove = (e) => {
        if (!isDragging) return;
        const newX = e.clientX - startX;
        const newY = e.clientY - startY;
        annotDiv.style.left = `${newX}px`;
        annotDiv.style.top = `${newY}px`;
        annotData.x = newX;
        annotData.y = newY;
    };

    const onMouseUp = () => {
        isDragging = false;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // Provide a way to clean up event listeners
    annotDiv.cleanup = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };
}

// Handle Exporting PDF
exportBtn.addEventListener('click', async () => {
    if (!currentPdfBytes) return;

    try {
        // Load the original PDF into pdf-lib
        const pdfDoc = await PDFLib.PDFDocument.load(currentPdfBytes);
        const pages = pdfDoc.getPages();

        // Embed the Helvetica font (matching our CSS default)
        const helveticaFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

        // Iterate through all annotations and add them to the PDF
        for (const annot of annotations) {
            if (!annot.text.trim()) continue;

            // pdf-lib pages are 0-indexed, our UI is 1-indexed
            const pdfPage = pages[annot.pageNum - 1];
            if (!pdfPage) continue;

            // Get the PDF page dimensions
            const { width, height } = pdfPage.getSize();

            // Find the container info to map screen coordinates to PDF coordinates
            const containerInfo = pageContainers.find(pc => pc.pageNum === annot.pageNum);
            if (!containerInfo) continue;

            const scale = containerInfo.viewport.scale;

            // Mapping coordinates:
            // pdf-lib's origin (0,0) is at the bottom-left.
            // HTML DOM origin (0,0) is at the top-left.
            // We need to divide our DOM coordinates by the scale factor to get PDF coordinates.
            const pdfX = annot.x / scale;

            // For Y, we need to invert the axis and account for font size and scale
            // The font size in PDF points is our DOM font size (16px default) / scale
            const fontSizePx = 16;
            const fontSizePt = fontSizePx / scale;
            
            // In HTML DOM, y is from top. In PDF, y is from bottom.
            // DOM y / scale gives us the distance from the top in PDF units.
            // So height - (DOM y / scale) gives us distance from bottom.
            // We also adjust for baseline (approx fontSizePt)
            const pdfY = height - (annot.y / scale) - fontSizePt;

            pdfPage.drawText(annot.text, {
                x: pdfX,
                y: pdfY,
                size: fontSizePt,
                font: helveticaFont,
                color: PDFLib.rgb(1, 0, 0), // Red text to match CSS #ff0000
            });
        }

        // Serialize to bytes
        const modifiedPdfBytes = await pdfDoc.save();

        // Download
        downloadPdf(modifiedPdfBytes, `modified_${originalFileName}`);

        alert("PDF exported successfully!");

    } catch (error) {
        console.error("Error exporting PDF:", error);
        alert("There was an error exporting the PDF.");
    }
});

// Helper function to trigger file download in the browser
function downloadPdf(byteData, filename) {
    const blob = new Blob([byteData], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
