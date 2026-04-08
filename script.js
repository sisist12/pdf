document.addEventListener('DOMContentLoaded', () => {
    const uploadInput = document.getElementById('upload-pdf');
    const pdfPreview = document.getElementById('pdf-preview');
    const editControls = document.getElementById('edit-controls');
    const addTextInput = document.getElementById('add-text-input');
    const addTextBtn = document.getElementById('add-text-btn');

    let currentPdfBytes = null;
    let originalFileName = "document.pdf";

    // Handle PDF Upload
    uploadInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        originalFileName = file.name;
        
        // Read the file as an ArrayBuffer
        currentPdfBytes = await file.arrayBuffer();

        // Create a blob URL to display in the iframe
        const blob = new Blob([currentPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        pdfPreview.src = url;

        // Show the edit controls now that a file is loaded
        editControls.classList.remove('hidden');
    });

    // Handle Adding Text and Saving
    addTextBtn.addEventListener('click', async () => {
        if (!currentPdfBytes) return;

        const textToAdd = addTextInput.value;
        if (!textToAdd) {
            alert("Please enter some text to add!");
            return;
        }

        try {
            // Load the existing PDF document
            const pdfDoc = await PDFLib.PDFDocument.load(currentPdfBytes);

            // Get the first page of the document
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];

            // Get the width and height of the page
            const { width, height } = firstPage.getSize();

            // Draw text near the top left corner 
            // (You can adjust x and y coordinates later to move it around)
            firstPage.drawText(textToAdd, {
                x: 50,
                y: height - 100,
                size: 24,
                color: PDFLib.rgb(0.95, 0.1, 0.1), // Red text
            });

            // Serialize the PDFDocument to bytes (a Uint8Array)
            const modifiedPdfBytes = await pdfDoc.save();

            // Trigger the download
            downloadPdf(modifiedPdfBytes, `modified_${originalFileName}`);
            
            alert("Text added and PDF downloaded successfully!");

        } catch (error) {
            console.error("Error modifying PDF:", error);
            alert("There was an error modifying the PDF.");
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
});
