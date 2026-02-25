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
    this.food.x = Math.floor(this.snake.head.x + 5);
    this.food.y = this.snake.head.y;
    this.renderer.render(this.snake, this.food);
  }
}
