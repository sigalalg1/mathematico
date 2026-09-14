export type LaunchStageId = 'stage1' | 'stage2' | 'stage3' | 'stage4';

/** Which axis the student is currently solving in guided mode. */
export type GuidedPhase = 'x' | 'y' | 'arrived';

export type FlightStatus = 'idle' | 'flying' | 'landedCorrect' | 'landedIncorrect';
