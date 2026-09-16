export interface Grade {
  id: number;
  enabled: boolean;
}

export interface Topic {
  id: string;
  gradeId: number;
  enabled: boolean;
  /**
   * Keeps the topic (and its route and code) in place while taking it out of
   * the student-facing list — used for units that have no activities to open
   * yet, which would otherwise lead to an empty screen. A `false` `enabled`
   * still lists the topic as a greyed-out "coming soon" teaser.
   */
  hidden?: boolean;
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
