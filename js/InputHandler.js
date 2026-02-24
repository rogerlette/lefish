import { DIRECTIONS } from './constants.js';

export default class InputHandler {
  constructor(game) {
    this.game = game;
    this.touchStartX = 0;
    this.touchStartY = 0;

    this.bindKeyboard();
    this.bindStartButton();
    this.bindDpad();
    this.bindSwipe();
  }

  /* ---- Keyboard (arrows + ZQSD) ---- */

  bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();

      if (key === ' ' || key === 'enter') {
        e.preventDefault();
        this.game.requestStart();
        return;
      }

      const map = {
        arrowup:    DIRECTIONS.UP,
        z:          DIRECTIONS.UP,
        arrowdown:  DIRECTIONS.DOWN,
        s:          DIRECTIONS.DOWN,
        arrowleft:  DIRECTIONS.LEFT,
        q:          DIRECTIONS.LEFT,
        arrowright: DIRECTIONS.RIGHT,
        d:          DIRECTIONS.RIGHT,
      };

      if (map[key]) {
        this.game.changeDirection(map[key]);
      }
    });
  }

  /* ---- Start / Replay button ---- */

  bindStartButton() {
    document.getElementById('start-btn')
      .addEventListener('click', () => this.game.requestStart());
  }

  /* ---- Mobile d-pad ---- */

  bindDpad() {
    const bindings = [
      ['btn-up',    DIRECTIONS.UP],
      ['btn-down',  DIRECTIONS.DOWN],
      ['btn-left',  DIRECTIONS.LEFT],
      ['btn-right', DIRECTIONS.RIGHT],
    ];

    for (const [id, dir] of bindings) {
      document.getElementById(id).addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!this.game.running) {
          this.game.requestStart();
          return;
        }
        this.game.changeDirection(dir);
      });
    }
  }

  /* ---- Swipe on canvas ---- */

  bindSwipe() {
    const canvas = this.game.renderer.canvas;

    canvas.addEventListener('touchstart', (e) => {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    });

    canvas.addEventListener('touchend', (e) => {
      if (!this.game.running) {
        this.game.requestStart();
        return;
      }

      const dx = e.changedTouches[0].clientX - this.touchStartX;
      const dy = e.changedTouches[0].clientY - this.touchStartY;

      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;

      if (Math.abs(dx) > Math.abs(dy)) {
        this.game.changeDirection(dx > 0 ? DIRECTIONS.RIGHT : DIRECTIONS.LEFT);
      } else {
        this.game.changeDirection(dy > 0 ? DIRECTIONS.DOWN : DIRECTIONS.UP);
      }
    });
  }
}
