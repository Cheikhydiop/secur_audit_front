// src/services/pdf-generators/PdfBaseGenerator.ts - Classe de base pour les générateurs PDF

import jsPDF from 'jspdf';
import { PDF_COLORS, PDF_DIMENSIONS, FONTS, FONT_SIZES } from './PdfConstants';
import type { PdfColors, PdfDimensions } from './PdfTypes';

export abstract class PdfBaseGenerator {
  protected colors: PdfColors = PDF_COLORS;
  protected dimensions: PdfDimensions = PDF_DIMENSIONS;

  /**
   * Applique une couleur de remplissage
   */
  protected setFillColor(doc: jsPDF, color: [number, number, number]): void {
    doc.setFillColor(color[0], color[1], color[2]);
  }

  /**
   * Applique une couleur de contour
   */
  protected setStrokeColor(doc: jsPDF, color: [number, number, number]): void {
    doc.setDrawColor(color[0], color[1], color[2]);
  }

  /**
   * Applique un style de texte standard
   */
  protected setTextStyle(
    doc: jsPDF,
    size: number = FONT_SIZES.body,
    color: [number, number, number] = this.colors.darkGray,
    font: string = FONTS.regular,
    style: string = 'normal'
  ): void {
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont(font, style);
  }

  /**
   * Dessine un rectangle avec style
   */
  protected drawRect(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor?: [number, number, number],
    strokeColor?: [number, number, number],
    lineWidth: number = 0.5
  ): void {
    if (fillColor) {
      doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    }
    if (strokeColor) {
      doc.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2]);
      doc.setLineWidth(lineWidth);
    }

    const style = fillColor && strokeColor ? 'FD' : fillColor ? 'F' : 'S';
    doc.rect(x, y, width, height, style);
  }

  /**
   * Dessine une ligne
   */
  protected drawLine(
    doc: jsPDF,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: [number, number, number] = this.colors.mediumGray,
    width: number = 0.5
  ): void {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(width);
    doc.line(x1, y1, x2, y2);
  }

  /**
   * Ajoute du texte avec gestion du débordement
   */
  protected addText(
    doc: jsPDF,
    text: string,
    x: number,
    y: number,
    options?: {
      width?: number;
      align?: 'left' | 'center' | 'right';
      truncate?: boolean;
      maxLength?: number;
    }
  ): void {
    let finalText = text;

    if (options?.truncate && options?.maxLength && text.length > options.maxLength) {
      finalText = text.substring(0, options.maxLength - 3) + '...';
    }

    const textOptions: any = {};
    if (options?.align) textOptions.align = options.align;
    if (options?.width) {
      finalText = doc.splitTextToSize(finalText, options.width);
    }

    doc.text(finalText, x, y, textOptions);
  }

  /**
   * Vérifie si une nouvelle page est nécessaire
   */
  protected checkNewPage(doc: jsPDF, currentY: number, requiredSpace: number): number {
    const pageBottomMargin = this.dimensions.pageHeight - this.dimensions.margin;

    if (currentY + requiredSpace > pageBottomMargin) {
      doc.addPage();
      return this.dimensions.margin;
    }

    return currentY;
  }

  /**
   * Calcule la largeur du texte
   */
  protected getTextWidth(doc: jsPDF, text: string): number {
    return doc.getTextWidth(text);
  }

  /**
   * Formate une date en français
   */
  protected formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('fr-FR');
  }

  /**
   * Formate un nombre avec séparateurs français
   */
  protected formatNumber(num: number, decimals: number = 1): string {
    return num.toFixed(decimals).replace(/\./g, ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  /**
   * Dessine un rectangle avec des coins arrondis
   */
  protected drawRoundedRect(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fillColor?: [number, number, number],
    strokeColor?: [number, number, number]
  ): void {
    if (fillColor) {
      doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    }
    if (strokeColor) {
      doc.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2]);
    }

    const style = fillColor && strokeColor ? 'FD' : fillColor ? 'F' : 'S';
    doc.roundedRect(x, y, width, height, radius, radius, style);
  }
}