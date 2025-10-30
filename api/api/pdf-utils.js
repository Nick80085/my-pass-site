// api/pdf-utils.js
import PDFDocument from 'pdfkit';

/**
 * Vytvoří PDF certifikát ve stylu "Digital Pass"
 * @param {{name: string, monthLabel: string}} data
 * @returns {Promise<Buffer>}
 */
export function makePassPdf({ name, monthLabel }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // === Styl certifikátu ===
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // Pozadí – černé
      doc.rect(0, 0, pageWidth, pageHeight).fill('#000000');

      // Rámeček – bílý okraj uvnitř
      const borderMargin = 30;
      doc
        .lineWidth(4)
        .strokeColor('#ffffff')
        .rect(
          borderMargin,
          borderMargin,
          pageWidth - 2 * borderMargin,
          pageHeight - 2 * borderMargin
        )
        .stroke();

      // Titulek
      doc
        .fillColor('#ffffff')
        .fontSize(42)
        .font('Helvetica-Bold')
        .text('DIGITAL PASS', 0, 130, { align: 'center' });

      // Podtitul
      doc
        .fontSize(18)
        .font('Helvetica-Oblique')
        .text('Official Digital Access Certificate', 0, 180, { align: 'center' });

      // Linie pro oddělení
      const lineY = 220;
      doc
        .moveTo(200, lineY)
        .lineTo(pageWidth - 200, lineY)
        .lineWidth(1)
        .strokeColor('#888888')
        .stroke();

      // Text "Issued to"
      doc
        .fontSize(24)
        .fillColor('#ffffff')
        .font('Helvetica')
        .text(`Issued to: ${name}`, 0, 280, { align: 'center' });

      // Text s měsícem
      doc
        .fontSize(20)
        .fillColor('#cccccc')
        .text(`Valid for: ${monthLabel}`, 0, 330, { align: 'center' });

      // Další čára
      doc
        .moveTo(200, 380)
        .lineTo(pageWidth - 200, 380)
        .lineWidth(1)
        .strokeColor('#888888')
        .stroke();

      // Malý podpis / poznámka
      doc
        .fontSize(12)
        .fillColor('#999999')
        .text('Certified and issued electronically', 0, 430, { align: 'center' });

      // Dolní text
      doc
        .fontSize(10)
        .fillColor('#666666')
        .text('Generated automatically — all rights reserved.', 0, pageHeight - 60, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
