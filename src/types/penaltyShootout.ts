export type GoalTarget = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
export type MissOutcome = 'save' | 'post' | 'wide';

export interface ShootoutChoice {
  value: number;
  target: GoalTarget;
}

export interface ShootoutQuestion {
  id: string;
  left: number;
  right: number;
  answer: number;
  choices: ShootoutChoice[];
  wrongOutcomes: Record<GoalTarget, MissOutcome>;
  keeperDive: 'left' | 'right';
}

export interface ShootoutAnswer {
  value: number;
}
