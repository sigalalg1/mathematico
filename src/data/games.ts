import type { Game } from '../types';

export const coordinateSystemGames: Game[] = [
  {
    id: 'coordinateVocabulary',
    enabled: true,
    path: '/grade/7/coordinate-system/coordinate-vocabulary',
    nameKey: 'vocabulary.gameName',
    descriptionKey: 'vocabulary.gameDescription',
  },
  {
    id: 'meetTheAxes',
    enabled: true,
    path: '/grade/7/coordinate-system/meet-the-axes',
    nameKey: 'exercises.meetTheAxes.name',
    descriptionKey: 'exercises.meetTheAxes.description',
  },
  {
    id: 'hitTheTarget',
    enabled: true,
    path: '/grade/7/coordinate-system/hit-the-target',
    nameKey: 'games.hitTheTarget.name',
    descriptionKey: 'games.hitTheTarget.description',
  },
  {
    id: 'launchTheSpaceship',
    enabled: true,
    path: '/grade/7/coordinate-system/launch-the-spaceship',
    nameKey: 'games.launchTheSpaceship.name',
    descriptionKey: 'games.launchTheSpaceship.description',
  },
  {
    id: 'findThePoint',
    enabled: false,
    nameKey: 'games.findThePoint.name',
    descriptionKey: 'games.findThePoint.description',
  },
  {
    id: 'findTheMistake',
    enabled: false,
    nameKey: 'games.findTheMistake.name',
    descriptionKey: 'games.findTheMistake.description',
  },
  {
    id: 'drawByCoordinates',
    enabled: false,
    nameKey: 'games.drawByCoordinates.name',
    descriptionKey: 'games.drawByCoordinates.description',
  },
];
