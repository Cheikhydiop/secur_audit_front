// src/services/pdf-generators/PdfConstants.ts

export const PDF_COLORS = {
  // Couleurs SONATEL
  sonatelOrange: [255, 102, 0] as [number, number, number],    // Orange Sonatel
  sonatelGray: [51, 51, 51] as [number, number, number],      // Gris foncé
  sonatelLightOrange: [255, 152, 0] as [number, number, number],
  sonatelMediumGray: [119, 119, 119] as [number, number, number],

  // Palette harmonisée
  primary: [255, 102, 0] as [number, number, number],
  secondary: [51, 51, 51] as [number, number, number],
  lightBlue: [225, 245, 254] as [number, number, number],
  lightGray: [245, 245, 245] as [number, number, number],
  mediumGray: [120, 120, 120] as [number, number, number],
  darkGray: [51, 51, 51] as [number, number, number],
  success: [46, 204, 113] as [number, number, number],
  warning: [241, 196, 15] as [number, number, number],
  danger: [231, 76, 60] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export const PDF_DIMENSIONS = {
  pageWidth: 595.28,    // A4 width in points
  pageHeight: 841.89,   // A4 height in points
  margin: 50,
  get contentWidth() {
    return this.pageWidth - (2 * this.margin);
  }
};

export const FONTS = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  italic: 'Helvetica-Oblique'
};

export const FONT_SIZES = {
  title: 24,
  heading: 18,
  subheading: 14,
  body: 10,
  small: 8,
  large: 32
};

export const SPACING = {
  xs: 5,
  sm: 10,
  md: 15,
  lg: 20,
  xl: 30,
  xxl: 40
};

export const REPORT_TYPE_LABELS: { [key: string]: string } = {
  daily: 'Rapport Quotidien',
  weekly: 'Rapport Hebdomadaire',
  monthly: 'Rapport Mensuel',
  custom: 'Rapport Personnalisé',
  sonatel: 'Rapport d\'Audit de Site Sonatel'
};