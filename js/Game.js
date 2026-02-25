import { BASE_SPEED, MIN_SPEED, SPEED_INCREMENT } from './constants.js';
import Snake from './Snake.js';
import Food from './Food.js';
import Renderer from './Renderer.js';
import InputHandler from './InputHandler.js';

export default class Game {
  constructor(canvas) {
    this.renderer = new Renderer(canvas);
    this.snake    = new Snake();
    this.food     = new Food();
    this.input    = new InputHandler(this);

    this.score     = 0;
    this.highScore = parseInt(localStorage.getItem('snake-high-score')) || 0;
    this.running   = false;
    this.loopId    = null;

    this.scoreEl      = document.getElementById('score');
    this.highScoreEl  = document.getElementById('high-score');
    this.overlay      = document.getElementById('overlay');
    this.overlayTitle = document.getElementById('overlay-title');
    this.overlayText  = document.getElementById('overlay-text');
    this.startBtn     = document.getElementById('start-btn');

    this.highScoreEl.textContent = this.highScore;
    this.showInitialScreen();
  }

  /* ---- Public API (called by InputHandler) ---- */

  requestStart() {
    if (!this.running) this.start();
  }

  changeDirection(dir) {
    if (this.running) this.snake.setDirection(dir);
  }

  /* ---- Game lifecycle ---- */

  start() {
    if (this.titleAnimFrame) {
      cancelAnimationFrame(this.titleAnimFrame);
      this.titleAnimFrame = null;
    }
    this.snake.reset();
    this.food.spawn(this.snake);
    this.score = 0;
    this.scoreEl.textContent = this.score;
    this.overlay.classList.add('hidden');
    this.startBtn.textContent = 'REJOUER';
    this.running = true;
    this.scheduleLoop();
  }

  tick() {
    const head = this.snake.move();

    if (this.snake.collidesWithWall() || this.snake.collidesWithSelf()) {
      this.gameOver();
      return;
    }

    if (this.food.isAt(head.x, head.y)) {
      this.score++;
      this.scoreEl.textContent = this.score;
      this.food.spawn(this.snake);
      this.scheduleLoop();
    } else {
      this.snake.trimTail();
    }

    this.renderer.render(this.snake, this.food);
  }

  gameOver() {
    this.running = false;
    clearInterval(this.loopId);

    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.highScoreEl.textContent = this.highScore;
      localStorage.setItem('snake-high-score', this.highScore);
    }

    this.overlayTitle.textContent = 'GAME OVER';
    this.overlayText.textContent =
      `Truites : ${this.score}  —  Appuie sur Espace pour rejouer`;
    this.overlay.classList.remove('hidden');
  }

  /* ---- Helpers ---- */

  scheduleLoop() {
    clearInterval(this.loopId);
    const speed = Math.max(MIN_SPEED, BASE_SPEED - this.score * SPEED_INCREMENT);
    this.loopId = setInterval(() => this.tick(), speed);
  }

  showInitialScreen() {
    this.titleTrout = [
      { x: 20,  baseY: 40,  y: 40,  size: 5, flip: false, speed: 0.3 },
      { x: 260, baseY: 95,  y: 95,  size: 4, flip: true,  speed: 0.5 },
      { x: 50,  baseY: 180, y: 180, size: 6, flip: false, speed: 0.4 },
      { x: 230, baseY: 260, y: 260, size: 5, flip: true,  speed: 0.35 },
      { x: 110, baseY: 320, y: 320, size: 4, flip: false, speed: 0.45 },
      { x: 310, baseY: 170, y: 170, size: 3, flip: true,  speed: 0.55 },
    ];

    this.bubbles = [];
    for (const t of this.titleTrout) {
      const bx = t.flip ? t.x - 4 : t.x + t.size * 14 + 4;
      this.bubbles.push(
        { x: bx,     baseY: t.baseY + t.size * 3, y: 0, r: 3, speed: 0.4 + Math.random() * 0.3, offset: Math.random() * 1000 },
        { x: bx + 6, baseY: t.baseY + t.size * 5, y: 0, r: 2, speed: 0.3 + Math.random() * 0.3, offset: Math.random() * 1000 },
      );
    }

    this.titleAnimFrame = null;
    this.animateTitleScreen();
  }

  animateTitleScreen() {
    const now = Date.now();

    for (const t of this.titleTrout) {
      t.y = t.baseY + Math.sin(now * 0.002 * t.speed) * 8;
    }

    for (const b of this.bubbles) {
      const elapsed = (now + b.offset) * 0.001 * b.speed;
      b.y = b.baseY - (elapsed * 30 % 60);
      b.x += Math.sin(elapsed * 3) * 0.15;
    }

    this.renderer.drawTitleScreen(this.titleTrout, this.bubbles);
    this.titleAnimFrame = requestAnimationFrame(() => this.animateTitleScreen());
  }
}
