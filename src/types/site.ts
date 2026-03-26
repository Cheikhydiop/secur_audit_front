// Types for Site Management (DetailSites page)

export interface Card {
  id?: string | number;
  name: string;
  date: string;
  count: number;
  countLabel?: string;
  status: string;
  type: 'batiment' | 'agent' | 'agent-dispo' | 'agent-libre-site' | 'site';
  noSociety?: boolean;
  noSite?: boolean;
  agents?: string[];
}

export interface Guard {
  id: string;
  user?: {
    prenom: string;
    nom: string;
  };
  societe_gardinage_id?: string;
  statut?: string;
  affectations_batiments?: any[];
}

export interface Column {
  title: string;
  count: number;
  cards: Card[];
}

export interface SiteDetail {
  id: string;
  nom_site: string;
  status: string;
  code?: string;
  zone?: string;
  localisation?: string;
  region?: {
    id: number;
    nom_region: string;
  };
  batiments?: Batiment[];
  agents?: Guard[];
  societes_gardiennage?: Societe[];
  createdAt?: string;
}

export interface Batiment {
  id: string;
  nom_batiment: string;
  site_id: string;
  points_controle?: PointControle[];
  affectations_agents?: AffectationAgent[];
}

export interface PointControle {
  id: string;
  nom: string;
  batiment_id: string;
}

export interface AffectationAgent {
  id: string;
  agent_id: string;
  batiment_id: string;
  agent?: Guard;
  planning?: any;
}

export interface Societe {
  id: string;
  nom: string;
  contact?: string;
}

export interface Planning {
  id: string;
  agent_id: string;
  batiment_id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  type: string;
}
