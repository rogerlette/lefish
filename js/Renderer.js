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

  drawHeron(snake) {
    const { ctx } = this;
    const { segments, direction } = snake;

    segments.forEach((seg, i) => {
      const ratio = 1 - i / segments.length;
      const r = Math.round(140 + ratio * 50);
      const g = Math.round(150 + ratio * 60);
      const b = Math.round(170 + ratio * 70);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

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

    this.drawBeak(snake.head, direction);
    this.drawEyes(snake.head, direction);
  }

  drawBeak(head, direction) {
    const { ctx } = this;
    ctx.fillStyle = '#ffaa00';

    const cx = head.x * GRID_SIZE + GRID_SIZE / 2;
    const cy = head.y * GRID_SIZE + GRID_SIZE / 2;

    ctx.beginPath();
    if (direction.x === 1) {
      ctx.moveTo(cx + 8, cy);
      ctx.lineTo(cx + 14, cy);
      ctx.lineTo(cx + 8, cy - 2);
      ctx.lineTo(cx + 8, cy + 2);
    } else if (direction.x === -1) {
      ctx.moveTo(cx - 8, cy);
      ctx.lineTo(cx - 14, cy);
      ctx.lineTo(cx - 8, cy - 2);
      ctx.lineTo(cx - 8, cy + 2);
    } else if (direction.y === -1) {
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx, cy - 14);
      ctx.lineTo(cx - 2, cy - 8);
      ctx.lineTo(cx + 2, cy - 8);
    } else {
      ctx.moveTo(cx, cy + 8);
      ctx.lineTo(cx, cy + 14);
      ctx.lineTo(cx - 2, cy + 8);
      ctx.lineTo(cx + 2, cy + 8);
    }
    ctx.closePath();
    ctx.fill();
  }

  drawEyes(head, direction) {
    const { ctx } = this;
    ctx.fillStyle = COLORS.heronEye;
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
      ctx.beginPath();
      ctx.arc(head.x * GRID_SIZE + ox + 1, head.y * GRID_SIZE + oy + 1, size / 2 + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawTrout(food) {
    const { ctx } = this;
    const cx = food.x * GRID_SIZE + GRID_SIZE / 2;
    const cy = food.y * GRID_SIZE + GRID_SIZE / 2;

    ctx.shadowColor = '#88bbff';
    ctx.shadowBlur = 8;

    // Body
    ctx.fillStyle = COLORS.trout;
    ctx.beginPath();
    ctx.ellipse(cx, cy, GRID_SIZE / 2 - 2, GRID_SIZE / 3 - 1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail fin
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy);
    ctx.lineTo(cx - 12, cy - 5);
    ctx.lineTo(cx - 12, cy + 5);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;

    // Spots
    ctx.fillStyle = COLORS.troutSpots;
    ctx.beginPath();
    ctx.arc(cx + 2, cy - 1, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - 2, cy + 1, 1, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(cx + 5, cy - 1, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  render(snake, food) {
    this.clear();
    this.drawGrid();
    this.drawHeron(snake);
    this.drawTrout(food);
  }
}
