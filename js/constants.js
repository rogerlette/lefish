export const GRID_SIZE = 20;
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 400;
export const COLS = CANVAS_WIDTH / GRID_SIZE;
export const ROWS = CANVAS_HEIGHT / GRID_SIZE;

export const BASE_SPEED = 130;
export const MIN_SPEED = 60;
export const SPEED_INCREMENT = 2;

export const COLORS = {
  background: '#1a3a4a',
  gridLine: 'rgba(255, 255, 255, 0.03)',
  heronEye: '#1a1a2e',
  trout: '#c0c0c0',
};

export const DIRECTIONS = {
  UP:    { x:  0, y: -1 },
  DOWN:  { x:  0, y:  1 },
  LEFT:  { x: -1, y:  0 },
  RIGHT: { x:  1, y:  0 },
};

/* ---------- Pixel-art trout sprite (14 x 9) ---------- */
// 0 = transparent, 1 = body, 2 = outline, 3 = belly, 4 = spots, 5 = tail, 6 = eye
export const TROUT_SPRITE = [
  [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
  [0,0,0,0,2,1,1,1,1,2,2,0,0,0],
  [0,0,0,2,1,1,4,1,1,1,1,2,0,0],
  [5,5,2,1,1,1,1,1,1,1,1,1,2,0],
  [5,5,2,3,3,3,3,1,6,1,1,1,1,2],
  [5,5,2,1,1,4,1,1,1,1,1,1,2,0],
  [0,0,0,2,1,1,1,4,1,1,1,2,0,0],
  [0,0,0,0,2,1,1,1,1,2,2,0,0,0],
  [0,0,0,0,0,2,2,2,2,0,0,0,0,0],
];

export const TROUT_PALETTE = {
  1: '#7eb8d0', // body
  2: '#2a5a6a', // outline
  3: '#a8d8ea', // belly
  4: '#c45c3a', // spots
  5: '#4a8a9a', // tail
  6: '#1a1a2e', // eye
};
