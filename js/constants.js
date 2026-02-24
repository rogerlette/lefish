export const GRID_SIZE = 20;
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 400;
export const COLS = CANVAS_WIDTH / GRID_SIZE;
export const ROWS = CANVAS_HEIGHT / GRID_SIZE;

export const BASE_SPEED = 130;
export const MIN_SPEED = 60;
export const SPEED_INCREMENT = 2;

export const COLORS = {
  background: '#1a2a3a',
  gridLine: 'rgba(255, 255, 255, 0.03)',
  heronEye: '#ff8800',
  trout: '#c0c0c0',
  troutSpots: '#4a6741',
};

export const DIRECTIONS = {
  UP:    { x:  0, y: -1 },
  DOWN:  { x:  0, y:  1 },
  LEFT:  { x: -1, y:  0 },
  RIGHT: { x:  1, y:  0 },
};

export const TROUT_MESSAGES = [
  'Mmmh, une truite bien fraîche !',
  'Rien ne vaut une bonne truite',
  'La truite, reine des rivières',
  'Délicieuse truite au beurre',
  'Truite grillée, un pur délice',
  'La truite fond dans le bec',
  'Encore une truite savoureuse !',
  'La truite, c\'est la vie',
  'Truite au four, un régal',
  'Quel festin de truite !',
  'La meilleure truite du coin',
  'Truite fraîche du jour, miam',
  'Un héron ne dit jamais non à une truite',
  'Truite à la meunière, exquis !',
  'Cette truite est divine',
  'Vive la truite !',
  'La truite, mon péché mignon',
  'Truite fumée, un délice absolu',
  'Une truite de plus au compteur !',
  'La pêche est bonne aujourd\'hui',
];
