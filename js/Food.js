import { COLS, ROWS } from './constants.js';

export default class Food {
  constructor() {
    this.x = 0;
    this.y = 0;
  }

  spawn(snake) {
    let x, y;
    do {
      x = Math.floor(Math.random() * COLS);
      y = Math.floor(Math.random() * ROWS);
    } while (snake.occupies(x, y));

    this.x = x;
    this.y = y;
  }

  isAt(x, y) {
    return this.x === x && this.y === y;
  }
}
