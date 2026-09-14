import type { Topic } from '../types';

export const topics: Topic[] = [
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
