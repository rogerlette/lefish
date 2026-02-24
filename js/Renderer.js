import { GRID_SIZE, COLS, ROWS, COLORS } from './constants.js';

export default class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  clear() {
    this.ctx.fillStyle = COLORS.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGrid() {
    const { ctx } = this;
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 0.5;

    for (let i = 0; i <= COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * GRID_SIZE, 0);
      ctx.lineTo(i * GRID_SIZE, this.canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * GRID_SIZE);
      ctx.lineTo(this.canvas.width, i * GRID_SIZE);
      ctx.stroke();
    }
  }

  drawSnake(snake) {
    const { ctx } = this;
    const { segments, direction } = snake;

    segments.forEach((seg, i) => {
      const ratio = 1 - i / segments.length;
      const g = Math.round(180 + ratio * 72);
      const b = Math.round(140 + ratio * 30);
      ctx.fillStyle = `rgb(0, ${g}, ${b})`;

      const padding = i === 0 ? 1 : 2;
      ctx.beginPath();
      ctx.roundRect(
        seg.x * GRID_SIZE + padding,
        seg.y * GRID_SIZE + padding,
        GRID_SIZE - padding * 2,
        GRID_SIZE - padding * 2,
        4,
      );
      ctx.fill();
    });

    this.drawEyes(snake.head, direction);
  }

  drawEyes(head, direction) {
    const { ctx } = this;
    ctx.fillStyle = COLORS.snakeEye;
    const size = 3;

    const positions = {
      right: [[13, 5], [13, 12]],
      left:  [[ 4, 5], [ 4, 12]],
      up:    [[ 5, 4], [12,  4]],
      down:  [[ 5, 13],[12, 13]],
    };

    let key = 'right';
    if (direction.x === -1) key = 'left';
    else if (direction.y === -1) key = 'up';
    else if (direction.y === 1)  key = 'down';

    for (const [ox, oy] of positions[key]) {
      ctx.fillRect(head.x * GRID_SIZE + ox, head.y * GRID_SIZE + oy, size, size);
    }
  }

  drawFood(food) {
    const { ctx } = this;
    ctx.fillStyle = COLORS.food;
    ctx.shadowColor = COLORS.food;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.arc(
      food.x * GRID_SIZE + GRID_SIZE / 2,
      food.y * GRID_SIZE + GRID_SIZE / 2,
      GRID_SIZE / 2 - 3,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  render(snake, food) {
    this.clear();
    this.drawGrid();
    this.drawSnake(snake);
    this.drawFood(food);
  }
}
