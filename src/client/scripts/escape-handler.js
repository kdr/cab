export class EscapeHandler {
  constructor(config, onEscape) {
    this.config = config;
    this.onEscape = onEscape;
    this.progressElement = null;
    this.progressBar = null;
    this.isHolding = false;
    this.holdStartTime = 0;
    this.holdAnimationFrame = null;
    this.rapidPresses = [];
    this.rapidPressWindow = 1000; // 1 second window

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.updateHoldProgress = this.updateHoldProgress.bind(this);
  }

  attach(progressElement) {
    this.progressElement = progressElement;
    this.progressBar = progressElement.querySelector('.escape-bar');

    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  detach() {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.cancelHold();
  }

  handleKeyDown(e) {
    if (e.key !== this.config.key) return;
    if (e.repeat) return; // Ignore key repeat

    // Start hold detection
    if (!this.isHolding) {
      this.isHolding = true;
      this.holdStartTime = Date.now();
      this.showProgress();
      this.updateHoldProgress();
    }

    // Rapid press detection
    const now = Date.now();
    this.rapidPresses.push(now);

    // Remove old presses outside the window
    this.rapidPresses = this.rapidPresses.filter(
      (t) => now - t < this.rapidPressWindow
    );

    if (this.rapidPresses.length >= this.config.rapidPressCount) {
      this.triggerEscape();
    }
  }

  handleKeyUp(e) {
    if (e.key !== this.config.key) return;
    this.cancelHold();
  }

  updateHoldProgress() {
    if (!this.isHolding) return;

    const elapsed = Date.now() - this.holdStartTime;
    const progress = Math.min(elapsed / this.config.holdDuration, 1);

    if (this.progressBar) {
      this.progressBar.style.setProperty('--progress', `${progress * 100}%`);
    }

    if (progress >= 1) {
      this.triggerEscape();
    } else {
      this.holdAnimationFrame = requestAnimationFrame(this.updateHoldProgress);
    }
  }

  showProgress() {
    if (this.progressElement) {
      this.progressElement.classList.remove('hidden');
    }
  }

  hideProgress() {
    if (this.progressElement) {
      this.progressElement.classList.add('hidden');
    }
    if (this.progressBar) {
      this.progressBar.style.setProperty('--progress', '0%');
    }
  }

  cancelHold() {
    this.isHolding = false;
    if (this.holdAnimationFrame) {
      cancelAnimationFrame(this.holdAnimationFrame);
      this.holdAnimationFrame = null;
    }
    this.hideProgress();
  }

  triggerEscape() {
    this.cancelHold();
    this.rapidPresses = [];
    this.onEscape();
  }
}
