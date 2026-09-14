import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import {
  BLOCK_BUILDERS_MISSION_COUNT,
  buildBlockBuildersSession,
  correctBlockAnswer,
  isBlockAnswerCorrect,
} from '../data/games/blockBuildersData';
import type { BlockAnswer, BlockMission } from '../types/blockBuilders';

export function useBlockBuildersGame() {
  const pool = useMemo(() => buildBlockBuildersSession(), []);
  return useChallengeRound<BlockMission, BlockAnswer>({
    pool,
    count: BLOCK_BUILDERS_MISSION_COUNT,
    ordered: true,
    getId: (mission) => mission.id,
    checkAnswer: isBlockAnswerCorrect,
    formatAnswer: (answer) => answer.value,
    formatCorrectAnswer: correctBlockAnswer,
  });
}
