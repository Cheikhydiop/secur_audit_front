// src/services/pdf-generators/PdfInspectionGenerator.ts

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { PdfSonatelGenerator } from './PdfSonatelGenerator';
import type { InspectionReportData } from './PdfTypes';

// Extend jsPDF for autotable support
interface jsPDFWithAutoTable extends jsPDF {
    autoTable: (options: any) => jsPDF;
}

/**
 * PdfInspectionGenerator - Report specifically for site audits and inspections.
 */
export class PdfInspectionGenerator extends PdfSonatelGenerator {

    /**
     * Génère le rapport d'audit complet pour une inspection de site
     */
    public generateInspectionPDF(data: InspectionReportData): jsPDF {
        const doc = new jsPDF() as jsPDFWithAutoTable;
        let currentY = 20;

        // 1. En-tête Branded (Hérité de PdfSonatelGenerator)
        currentY = this.addBrandedHeader(
            doc,
            "RAPPORT D'AUDIT DE SITE",
            `Référence: ${data.id.substring(0, 8).toUpperCase()}`
        );

        // 2. Informations du Site (Cards)
        currentY = this.generateSiteInfo(doc, data, currentY + 15);

        // 3. Résumé de l'Audit (Score Global)
        currentY = this.generateAuditSummary(doc, data, currentY + 15);

        // 4. Détails par Rubrique (Scores)
        currentY = this.generateRubriqueDetails(doc, data, currentY + 15);

        // 5. Tableau des Non-Conformités
        if (data.nonConformites.length > 0) {
            if (currentY > 200) {
                doc.addPage();
                currentY = 20;
            }
            currentY = this.generateNonConformitiesTable(doc, data, currentY + 15);
        }

        // 6. Signatures et Validation
        currentY = this.generateSignatureSection(doc, currentY + 20);

        // 7. Pied de page (sur chaque page - Hérité de PdfSonatelGenerator)
        this.addBrandedFooter(doc);

        return doc;
    }

    private generateSiteInfo(doc: jsPDF, data: InspectionReportData, startY: number): number {
        this.drawSectionTitle(doc, "INFORMATIONS GÉNÉRALES", startY);

        let currentY = startY + 15;

        // Carte d'info du site
        this.drawRoundedRect(doc, 15, currentY, 85, 40, 3, this.colors.lightGray);
        this.setTextStyle(doc, 8, this.colors.sonatelMediumGray, 'helvetica', 'bold');
        doc.text("SITE TECHNIQUE", 20, currentY + 8);

        this.setTextStyle(doc, 12, this.colors.sonatelGray, 'helvetica', 'bold');
        doc.text(data.site.nom, 20, currentY + 18);
        this.setTextStyle(doc, 9, this.colors.sonatelOrange, 'helvetica', 'bold');
        doc.text(`Code: ${data.site.code}`, 20, currentY + 26);
        this.setTextStyle(doc, 9, this.colors.sonatelGray, 'helvetica', 'normal');
        doc.text(`${data.site.zone} • ${data.site.type}`, 20, currentY + 33);

        // Carte d'info de l'auditeur
        this.drawRoundedRect(doc, 110, currentY, 85, 40, 3, this.colors.lightGray);
        this.setTextStyle(doc, 8, this.colors.sonatelMediumGray, 'helvetica', 'bold');
        doc.text("AUDITEUR / INSPECTEUR", 115, currentY + 8);

        this.setTextStyle(doc, 11, this.colors.sonatelGray, 'helvetica', 'bold');
        doc.text(data.inspecteur.name, 115, currentY + 18);
        this.setTextStyle(doc, 9, this.colors.sonatelGray, 'helvetica', 'normal');
        const email = data.inspecteur.email || "N/A";
        doc.text(email, 115, currentY + 26);
        doc.text(`Entité: ${data.inspecteur.entite}`, 115, currentY + 33);

        return currentY + 50;
    }

    private generateAuditSummary(doc: jsPDF, data: InspectionReportData, startY: number): number {
        const scoreColor = data.metadata.score >= 80 ? this.colors.success : data.metadata.score >= 50 ? this.colors.warning : this.colors.danger;

        this.drawRoundedRect(doc, 15, startY, 180, 25, 4, scoreColor);

        this.setTextStyle(doc, 12, this.colors.white, 'helvetica', 'bold');
        doc.text("SCORE DE CONFORMITÉ GLOBAL", 25, startY + 14);

        this.setTextStyle(doc, 24, this.colors.white, 'helvetica', 'bold');
        doc.text(`${data.metadata.score}%`, 185, startY + 17, { align: 'right' });

        return startY + 35;
    }

    private generateRubriqueDetails(doc: jsPDF, data: InspectionReportData, startY: number): number {
        this.drawSectionTitle(doc, "DÉTAILS PAR RUBRIQUE", startY);

        let currentY = startY + 15;

        data.scoresParRubrique.forEach((rub, index) => {
            const x = index % 2 === 0 ? 15 : 110;
            const rowY = currentY + Math.floor(index / 2) * 20;

            this.drawRect(doc, x, rowY, 85, 15, undefined, this.colors.lightGray);
            this.drawLine(doc, x, rowY, x, rowY + 15, this.colors.sonatelOrange, 2);

            this.setTextStyle(doc, 8, this.colors.sonatelGray, 'helvetica', 'bold');
            doc.text(rub.nom.toUpperCase(), x + 5, rowY + 6);

            this.setTextStyle(doc, 7, this.colors.sonatelMediumGray, 'helvetica', 'normal');
            doc.text(`${rub.questionsConformes}/${rub.totalQuestions} Points de contrôle`, x + 5, rowY + 11);

            this.setTextStyle(doc, 12, this.colors.sonatelOrange, 'helvetica', 'bold');
            doc.text(`${rub.score}%`, x + 80, rowY + 10, { align: 'right' });
        });

        return currentY + Math.ceil(data.scoresParRubrique.length / 2) * 25;
    }

    private generateNonConformitiesTable(doc: jsPDF, data: InspectionReportData, startY: number): number {
        this.drawSectionTitle(doc, "NON-CONFORMITÉS ET RECOMMANDATIONS", startY);

        const tableData = data.nonConformites.map(nc => [
            nc.criticite.toUpperCase(),
            nc.rubrique,
            nc.question,
            nc.observation || 'N/A',
            nc.recommendation || 'N/A'
        ]);

        (doc as jsPDFWithAutoTable).autoTable({
            startY: startY + 15,
            head: [['CRITICITÉ', 'RUBRIQUE', 'POINT AUDITÉ', 'OBSERVATION', 'ACTION CORRECTIVE']],
            body: tableData,
            theme: 'striped',
            headStyles: {
                fillColor: this.colors.sonatelOrange,
                textColor: 255,
                fontSize: 8,
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 20, fontStyle: 'bold' },
                1: { cellWidth: 30 },
                2: { cellWidth: 40 },
                3: { cellWidth: 45 },
                4: { cellWidth: 'auto' }
            },
            styles: {
                fontSize: 8,
                cellPadding: 4
            },
            didParseCell: (dataCell: any) => {
                if (dataCell.section === 'body' && dataCell.column.index === 0) {
                    const crit = dataCell.cell.raw.toString().toLowerCase();
                    if (crit.includes('critique')) dataCell.cell.styles.textColor = [231, 76, 60];
                    else if (crit.includes('majeur')) dataCell.cell.styles.textColor = [255, 152, 0];
                }
            }
        });

        return (doc as any).lastAutoTable.finalY + 20;
    }

    private generateSignatureSection(doc: jsPDF, startY: number): number {
        if (startY > 240) {
            doc.addPage();
            startY = 20;
        }

        this.drawLine(doc, 15, startY, 80, startY, this.colors.sonatelGray);
        this.drawLine(doc, 130, startY, 195, startY, this.colors.sonatelGray);

        this.setTextStyle(doc, 8, this.colors.sonatelGray, 'helvetica', 'bold');
        doc.text("Signature Auditeur", 47.5, startY + 5, { align: 'center' });
        doc.text("Validation Superviseur", 162.5, startY + 5, { align: 'center' });

        return startY + 20;
    }
}
