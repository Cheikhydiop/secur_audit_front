// src/services/pdf-generators/PdfTypes.ts

export interface PdfColors {
  // Couleurs Sonatel pour en-têtes et structures
  sonatelOrange: [number, number, number];
  sonatelGray: [number, number, number];
  sonatelLightOrange: [number, number, number];
  sonatelMediumGray: [number, number, number];

  // Couleurs harmonisées pour contenu
  primary: [number, number, number];
  secondary: [number, number, number];
  lightBlue: [number, number, number];
  lightGray: [number, number, number];
  mediumGray: [number, number, number];
  darkGray: [number, number, number];
  success: [number, number, number];
  warning: [number, number, number];
  danger: [number, number, number];
  white: [number, number, number];
}

export interface PdfDimensions {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
}

export interface MetricCard {
  icon: string;
  label: string;
  value: string;
  color: [number, number, number];
  bgColor: [number, number, number];
}

export interface PdfPosition {
  x: number;
  y: number;
}

export interface PdfSize {
  width: number;
  height: number;
}

// Types pour les données d'inspection Sonatel
export interface InspectionReportData {
  id: string;
  site: {
    nom: string;
    code: string;
    zone: string;
    type: string;
    localisation?: string;
  };
  inspecteur: {
    name: string;
    email: string;
    entite: string;
  };
  metadata: {
    date: string;
    score: number;
    statut: string;
    duree?: string;
  };
  scoresParRubrique: Array<{
    nom: string;
    score: number;
    totalQuestions: number;
    questionsConformes: number;
  }>;
  nonConformites: Array<{
    rubrique: string;
    question: string;
    criticite: string;
    observation?: string;
    recommendation?: string;
    photoUrl?: string;
  }>;
}

export interface ReportData {
  metadata: {
    type: string;
    generatedAt: Date;
  };
  period: {
    startDate: Date;
    endDate: Date;
  };
  organization: {
    name: string;
  };
}
