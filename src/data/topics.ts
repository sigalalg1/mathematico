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
    id: 'multiplication',
    gradeId: 4,
    enabled: true,
    path: '/grade/4/multiplication/block-builders',
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
