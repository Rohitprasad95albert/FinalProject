// backend/utils/certificateGenerator.js
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

async function generateCertificate(studentName, eventTitle, eventDate, templatePath) {
    const templateBytes = await fs.readFile(path.join(__dirname, `../${templatePath}`));
    const pdfDoc = await PDFDocument.load(templateBytes);
    const [page] = pdfDoc.getPages();
    const { width, height } = page.getSize();
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.drawText(studentName, {
        x: width / 2 - (studentName.length * 15),
        y: height / 2,
        font: helveticaBoldFont,
        size: 36,
        color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(`for participating in ${eventTitle}`, {
        x: width / 2 - (`for participating in ${eventTitle}`.length * 5),
        y: height / 2 - 50,
        size: 20,
        color: rgb(0.2, 0.2, 0.2),
    });
    const formattedDate = new Date(eventDate).toLocaleDateString();
     page.drawText(`on ${formattedDate}`, {
        x: width / 2 - (`on ${formattedDate}`.length * 4),
        y: height / 2 - 80,
        size: 16,
        color: rgb(0.3, 0.3, 0.3),
    });
    return await pdfDoc.save();
}

async function generateDefaultCertificate(studentName, eventTitle) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    page.drawText('Certificate of Participation', { size: 25, align: 'center' });
    page.moveDown();
    page.drawText(`This is to certify that ${studentName} has successfully participated in ${eventTitle}.`, { align: 'center' });
    return await pdfDoc.save();
}

module.exports = { generateCertificate, generateDefaultCertificate };