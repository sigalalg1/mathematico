import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import { buildSignRulesChallenges, SIGN_RULES_TOTAL } from '../data/games/signRulesData';
import { formatSigned } from '../utils/signedNumbers';
import type { SignRuleChallenge } from '../types/signRules';

export function useSignRulesGame() {
  const pool = useMemo(() => buildSignRulesChallenges(), []);

  return useChallengeRound<SignRuleChallenge, number>({
    pool,
    count: pool.length,
    ordered: true,
    getId: (challenge) => challenge.id,
    checkAnswer: (challenge, value) => value === challenge.result,
    formatAnswer: (value) => formatSigned(value),
    formatCorrectAnswer: (challenge) => formatSigned(challenge.result),
  });
}

export const SIGN_RULES_TOTAL_COUNT = SIGN_RULES_TOTAL;
