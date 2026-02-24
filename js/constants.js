export const GRID_SIZE = 20;
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 400;
export const COLS = CANVAS_WIDTH / GRID_SIZE;
export const ROWS = CANVAS_HEIGHT / GRID_SIZE;

export const BASE_SPEED = 130;
export const MIN_SPEED = 60;
export const SPEED_INCREMENT = 2;

export const COLORS = {
  background: '#16213e',
  gridLine: 'rgba(255, 255, 255, 0.03)',
  snakeEye: '#1a1a2e',
  food: '#ff6b6b',
};

export const DIRECTIONS = {
  UP:    { x:  0, y: -1 },
  DOWN:  { x:  0, y:  1 },
  LEFT:  { x: -1, y:  0 },
  RIGHT: { x:  1, y:  0 },
};
