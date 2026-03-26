import jsPDF from 'jspdf';
import { PdfBaseGenerator } from './PdfBaseGenerator';
import { PDF_COLORS } from './PdfConstants';
import { InspectionReportData } from './PdfTypes';

/**
 * PdfSonatelGenerator - Base Sonatel-branded generator.
 * Provides Sonatel-specific visual elements (header, footer, etc.)
 * that can be reused across different types of reports.
 */
export class PdfSonatelGenerator extends PdfBaseGenerator {

  protected addBrandedHeader(doc: jsPDF, title: string, subtitle?: string): number {
    // Bande orange Sonatel
    this.drawRect(doc, 0, 0, 210, 15, this.colors.sonatelOrange);

    // Titre du rapport
    this.setTextStyle(doc, 22, this.colors.sonatelOrange, 'helvetica', 'bold');
    doc.text(title, 105, 25, { align: 'center' });

    if (subtitle) {
      this.setTextStyle(doc, 10, this.colors.sonatelMediumGray, 'helvetica', 'normal');
      doc.text(subtitle, 105, 32, { align: 'center' });
    }

    // Logo Sonatel
    try {
      doc.addImage('/logo-sonatel.png', 'PNG', 15, 18, 25, 10);
    } catch (e) {
      // Fallback si image non accessible ou erreur base64
      this.setTextStyle(doc, 18, this.colors.sonatelOrange, 'helvetica', 'bold');
      doc.text("sonatel", 15, 25);
      this.setTextStyle(doc, 7, this.colors.sonatelGray, 'helvetica', 'bold');
      doc.text("groupe orange", 15, 28);
    }

    return 45;
  }

  protected addBrandedFooter(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const y = 285;
      this.drawLine(doc, 15, y, 195, y, this.colors.lightGray);

      this.setTextStyle(doc, 7, this.colors.sonatelMediumGray, 'helvetica', 'normal');
      const footerText = "Propriété de Sonatel - Division Sécurité DG/SECU";
      const dateText = `Généré le ${new Date().toLocaleString()} • Page ${i}/${pageCount}`;

      doc.text(footerText, 105, y + 5, { align: 'center' });
      doc.text(dateText, 105, y + 9, { align: 'center' });
    }
  }

  protected drawSectionTitle(doc: jsPDF, title: string, y: number): void {
    this.setTextStyle(doc, 11, this.colors.sonatelOrange, 'helvetica', 'bold');
    doc.text(title, 15, y);
    this.drawLine(doc, 15, y + 2, 45, y + 2, this.colors.sonatelOrange, 1.5);
  }
}