export interface Grade {
  id: number;
  enabled: boolean;
}

export interface Topic {
  id: string;
  gradeId: number;
  enabled: boolean;
  path?: string;
}

export interface Game {
  id: string;
  enabled: boolean;
  path?: string;
  nameKey: string;
  descriptionKey: string;
  icon: string;
}
