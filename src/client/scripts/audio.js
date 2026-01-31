// Audio manager for cabinet UI sounds
class AudioManager {
  constructor() {
    this.audioCtx = null;
    this.muted = false;
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  setMuted(muted) {
    this.muted = muted;
  }

  isMuted() {
    return this.muted;
  }

  playSound(frequency, duration, type = 'square', volume = 0.1) {
    if (!this.audioCtx || this.muted) return;
    try {
      const oscillator = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gainNode.gain.setValueAtTime(volume, this.audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
      oscillator.start(this.audioCtx.currentTime);
      oscillator.stop(this.audioCtx.currentTime + duration);
    } catch (e) {}
  }

  // Boot sound - ascending tones
  playBoot() {
    this.playSound(220, 0.15);
    setTimeout(() => this.playSound(330, 0.15), 100);
    setTimeout(() => this.playSound(440, 0.15), 200);
    setTimeout(() => this.playSound(550, 0.2), 300);
  }

  // Power on click
  playPowerOn() {
    this.playSound(150, 0.1, 'sine', 0.15);
    setTimeout(() => this.playSound(300, 0.2, 'sine', 0.1), 50);
  }

  // Power off
  playPowerOff() {
    this.playSound(300, 0.1, 'sine', 0.1);
    setTimeout(() => this.playSound(150, 0.2, 'sine', 0.15), 50);
  }

  // Menu navigation
  playMenuMove() {
    this.playSound(440, 0.05, 'square', 0.08);
  }

  // Menu select
  playMenuSelect() {
    this.playSound(660, 0.08);
    setTimeout(() => this.playSound(880, 0.12), 80);
  }

  // Button click
  playClick() {
    this.playSound(800, 0.03, 'sine', 0.1);
  }
}

export const audioManager = new AudioManager();
