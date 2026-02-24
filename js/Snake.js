import { COLS, ROWS, DIRECTIONS } from './constants.js';

export default class Snake {
  constructor() {
    this.reset();
  }

  reset() {
    const startX = Math.floor(COLS / 2);
    const startY = Math.floor(ROWS / 2);

    this.segments = [
      { x: startX,     y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ];
    this.direction     = { ...DIRECTIONS.RIGHT };
    this.nextDirection = { ...DIRECTIONS.RIGHT };
  }

  get head() {
    return this.segments[0];
  }

  setDirection(dir) {
    const isOpposite =
      dir.x === -this.direction.x && dir.y === -this.direction.y;
    if (!isOpposite) {
      this.nextDirection = { ...dir };
    }
  }

  move() {
    this.direction = { ...this.nextDirection };

    const newHead = {
      x: this.head.x + this.direction.x,
      y: this.head.y + this.direction.y,
    };

    this.segments.unshift(newHead);
    return newHead;
  }

  trimTail() {
    this.segments.pop();
  }

  collidesWithWall() {
    const { x, y } = this.head;
    return x < 0 || x >= COLS || y < 0 || y >= ROWS;
  }

  collidesWithSelf() {
    const { x, y } = this.head;
    return this.segments.slice(1).some(s => s.x === x && s.y === y);
  }

  occupies(x, y) {
    return this.segments.some(s => s.x === x && s.y === y);
  }
}
