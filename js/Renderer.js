import { GRID_SIZE, COLS, ROWS, COLORS, TROUT_SPRITE, TROUT_PALETTE } from './constants.js';

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

    // Draw body segments (grey feathers fading to white)
    segments.forEach((seg, i) => {
      const ratio = 1 - i / segments.length;
      const grey = Math.round(160 + ratio * 80);
      ctx.fillStyle = `rgb(${grey}, ${grey}, ${Math.min(255, grey + 20)})`;

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

    // Draw head details: beak + eye
    this.drawBeak(snake.head, direction);
    this.drawEye(snake.head, direction);
  }

  drawBeak(head, direction) {
    const { ctx } = this;
    const cx = head.x * GRID_SIZE + GRID_SIZE / 2;
    const cy = head.y * GRID_SIZE + GRID_SIZE / 2;

    ctx.fillStyle = '#f0a500';
    ctx.beginPath();

    if (direction.x === 1) {
      // right
      ctx.moveTo(cx + 6, cy - 2);
      ctx.lineTo(cx + 14, cy);
      ctx.lineTo(cx + 6, cy + 2);
    } else if (direction.x === -1) {
      // left
      ctx.moveTo(cx - 6, cy - 2);
      ctx.lineTo(cx - 14, cy);
      ctx.lineTo(cx - 6, cy + 2);
    } else if (direction.y === -1) {
      // up
      ctx.moveTo(cx - 2, cy - 6);
      ctx.lineTo(cx, cy - 14);
      ctx.lineTo(cx + 2, cy - 6);
    } else {
      // down
      ctx.moveTo(cx - 2, cy + 6);
      ctx.lineTo(cx, cy + 14);
      ctx.lineTo(cx + 2, cy + 6);
    }

    ctx.closePath();
    ctx.fill();
  }

  drawEye(head, direction) {
    const { ctx } = this;
    ctx.fillStyle = COLORS.heronEye;
    const size = 3;

    const positions = {
      right: [[11, 5], [11, 12]],
      left:  [[ 6, 5], [ 6, 12]],
      up:    [[ 5, 6], [12,  6]],
      down:  [[ 5, 11],[12, 11]],
    };

    let key = 'right';
    if (direction.x === -1) key = 'left';
    else if (direction.y === -1) key = 'up';
    else if (direction.y === 1)  key = 'down';

    for (const [ox, oy] of positions[key]) {
      ctx.beginPath();
      ctx.arc(head.x * GRID_SIZE + ox, head.y * GRID_SIZE + oy, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawTrout(food) {
    const { ctx } = this;
    const cx = food.x * GRID_SIZE + GRID_SIZE / 2;
    const cy = food.y * GRID_SIZE + GRID_SIZE / 2;
    const w = GRID_SIZE - 4;
    const h = GRID_SIZE / 2 - 1;

    // Fish body
    ctx.fillStyle = '#7eb8d0';
    ctx.shadowColor = '#7eb8d0';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Tail fin
    ctx.fillStyle = '#5a9ab5';
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, cy);
    ctx.lineTo(cx - w / 2 - 4, cy - 4);
    ctx.lineTo(cx - w / 2 - 4, cy + 4);
    ctx.closePath();
    ctx.fill();

    // Spots (trout pattern)
    ctx.fillStyle = '#c45c3a';
    const spots = [[cx - 2, cy - 1], [cx + 3, cy], [cx - 1, cy + 1]];
    for (const [sx, sy] of spots) {
      ctx.beginPath();
      ctx.arc(sx, sy, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eye
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(cx + w / 4, cy - 1, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ---------- Pixel-art trout ---------- */

  drawPixelTrout(x, y, pixelSize = 4, flip = false) {
    const { ctx } = this;

    for (let row = 0; row < TROUT_SPRITE.length; row++) {
      const cols = TROUT_SPRITE[row];
      for (let col = 0; col < cols.length; col++) {
        const val = cols[col];
        if (val === 0) continue;

        const drawCol = flip ? (cols.length - 1 - col) : col;
        ctx.fillStyle = TROUT_PALETTE[val];
        ctx.fillRect(
          x + drawCol * pixelSize,
          y + row * pixelSize,
          pixelSize,
          pixelSize,
        );
      }
    }
  }

  drawTitleScreen(troutList, bubbles) {
    this.clear();
    this.drawGrid();

    for (const t of troutList) {
      this.drawPixelTrout(t.x, t.y, t.size, t.flip);
    }

    // Draw bubbles
    const { ctx } = this;
    ctx.fillStyle = 'rgba(126, 184, 208, 0.4)';
    for (const b of bubbles) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  render(snake, food) {
    this.clear();
    this.drawGrid();
    this.drawHeron(snake);
    this.drawTrout(food);
  }
}
