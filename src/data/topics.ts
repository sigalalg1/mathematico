import type { Topic } from '../types';

export const topics: Topic[] = [
  {
    id: 'divisionWithRemainder',
    gradeId: 4,
    enabled: true,
    path: '/grade/4/division-with-remainder',
  },
  {
    id: 'simpleFractions',
    gradeId: 4,
    enabled: true,
    path: '/grade/4/simple-fractions',
  },
  {
    id: 'fractionsPart1',
    gradeId: 4,
    enabled: true,
    path: '/grade/4/fractions-part-1',
  },
  {
    id: 'multiplication',
    gradeId: 4,
    enabled: true,
    path: '/grade/4/multiplication',
  },
  {
    id: 'penaltyShootout',
    gradeId: 4,
    enabled: true,
    path: '/grade/4/penalty-shootout',
  },
  {
    id: 'coordinateSystem',
    gradeId: 7,
    enabled: true,
    path: '/grade/7/coordinate-system',
  },
  {
    id: 'fractions',
    gradeId: 7,
    enabled: false,
  },
  {
    id: 'geometry',
    gradeId: 7,
    enabled: false,
  },
  {
    id: 'algebraBasics',
    gradeId: 7,
    enabled: false,
  },
];

export function getTopicsForGrade(gradeId: number): Topic[] {
  return topics.filter((topic) => topic.gradeId === gradeId);
}
