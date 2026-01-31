import { renderAsciiArt } from './ascii-art.js';
import { Menu } from './menu.js';
import { GameFrame } from './game-frame.js';
import { EscapeHandler } from './escape-handler.js';
import { audioManager } from './audio.js';

class Cabinet {
  constructor() {
    this.state = 'off';
    this.config = null;
    this.currentGame = null;

    // DOM elements
    this.screenOff = document.getElementById('screen-off');
    this.screenBoot = document.getElementById('screen-boot');
    this.screenMenu = document.getElementById('screen-menu');
    this.screenGame = document.getElementById('screen-game');
    this.tvScreen = document.querySelector('.tv-screen');
    this.asciiArt = document.getElementById('ascii-art');
    this.bootMessage = document.querySelector('.boot-message');
    this.pressStart = document.querySelector('.press-start');
    this.instructionsPanel = document.getElementById('game-instructions');
    this.instructionsText = this.instructionsPanel.querySelector('.instructions-text');
    this.instructionsExpand = this.instructionsPanel.querySelector('.instructions-expand');

    this.powerBtn = document.getElementById('btn-power');
    this.exitBtn = document.getElementById('btn-exit');
    this.restartBtn = document.getElementById('btn-restart');
    this.muteBtn = document.getElementById('btn-mute');

    // Initialize components
    const gameList = document.getElementById('game-list');
    const gameIframe = document.getElementById('game-frame');

    this.menu = new Menu(
      gameList,
      (game) => this.startGame(game),
      (game) => this.onGameHighlight(game)
    );
    this.gameFrame = new GameFrame(gameIframe);
    this.escapeHandler = null;

    // Bind button events
    this.powerBtn.addEventListener('click', () => this.togglePower());
    this.exitBtn.addEventListener('click', () => this.exitToMenu());
    this.restartBtn.addEventListener('click', () => this.restartGame());
    this.muteBtn.addEventListener('click', () => this.toggleMute());

    // Instructions expand button
    this.instructionsExpand.addEventListener('click', () => {
      this.instructionsPanel.classList.toggle('expanded');
      this.instructionsExpand.textContent =
        this.instructionsPanel.classList.contains('expanded') ? 'Less' : '...';
    });

    // Load config and initialize
    this.loadConfig();
  }

  async loadConfig() {
    try {
      const response = await fetch('/api/config');
      this.config = await response.json();

      // Initialize escape handler with config
      this.escapeHandler = new EscapeHandler(
        this.config.escapeSequence,
        () => this.exitToMenu()
      );
    } catch (error) {
      console.error('Failed to load config:', error);
      // Use defaults
      this.config = {
        cabinetName: 'CAB',
        escapeSequence: { key: 'Escape', holdDuration: 1500, rapidPressCount: 3 },
      };
      this.escapeHandler = new EscapeHandler(
        this.config.escapeSequence,
        () => this.exitToMenu()
      );
    }
  }

  toggleMute() {
    audioManager.init();
    const muted = !audioManager.isMuted();
    audioManager.setMuted(muted);
    this.muteBtn.classList.toggle('muted', muted);
    this.muteBtn.querySelector('.btn-icon').innerHTML = muted ? '&#x1F507;' : '&#x1F50A;';
    if (!muted) {
      audioManager.playClick();
    }
  }

  onGameHighlight(game) {
    audioManager.playMenuMove();
    this.updateInstructions(game);
  }

  updateInstructions(game) {
    if (game && game.instructions) {
      this.instructionsText.textContent = game.instructions;
      this.instructionsPanel.classList.remove('hidden');
      this.instructionsPanel.classList.remove('expanded');
      this.instructionsExpand.textContent = '...';

      // Check if text is truncated and show expand button
      setTimeout(() => {
        const isOverflowing = this.instructionsText.scrollWidth > this.instructionsText.clientWidth;
        this.instructionsExpand.classList.toggle('hidden', !isOverflowing);
      }, 10);
    } else {
      this.instructionsPanel.classList.add('hidden');
    }
  }

  showInstructions(game) {
    this.updateInstructions(game);
  }

  hideInstructions() {
    this.instructionsPanel.classList.add('hidden');
  }

  setScreen(screen) {
    this.screenOff.classList.remove('active');
    this.screenBoot.classList.remove('active');
    this.screenMenu.classList.remove('active');
    this.screenGame.classList.remove('active');

    switch (screen) {
      case 'off':
        this.screenOff.classList.add('active');
        this.hideInstructions();
        break;
      case 'boot':
        this.screenBoot.classList.add('active');
        this.hideInstructions();
        break;
      case 'menu':
        this.screenMenu.classList.add('active');
        // Instructions will be shown by menu highlight
        break;
      case 'playing':
        this.screenGame.classList.add('active');
        this.showInstructions(this.currentGame);
        break;
    }

    this.state = screen;
  }

  async togglePower() {
    audioManager.init();
    if (this.state === 'off') {
      await this.powerOn();
    } else {
      await this.powerOff();
    }
  }

  async powerOn() {
    audioManager.playPowerOn();
    this.powerBtn.classList.add('on');
    this.tvScreen.classList.remove('power-off');
    this.tvScreen.classList.add('power-on');

    // Wait for power-on animation
    await this.delay(500);

    // Show boot screen
    this.setScreen('boot');

    // Play boot sound
    audioManager.playBoot();

    // Render ASCII art with typewriter effect
    await renderAsciiArt(this.asciiArt);

    // Show loading message
    this.bootMessage.textContent = 'SYSTEM READY';
    await this.delay(500);

    // Show press start
    this.pressStart.classList.remove('hidden');

    // Wait for any key to continue
    await this.waitForKeyPress();

    // Go to menu
    audioManager.playMenuSelect();
    this.pressStart.classList.add('hidden');
    this.setScreen('menu');
    await this.menu.loadGames();
    this.menu.attach();
  }

  async powerOff() {
    audioManager.playPowerOff();

    // Unload any running game
    if (this.state === 'playing') {
      this.gameFrame.unload();
      this.currentGame = null;
    }

    this.menu.detach();
    if (this.escapeHandler) {
      this.escapeHandler.detach();
    }

    this.tvScreen.classList.remove('power-on');
    this.tvScreen.classList.add('power-off');
    this.powerBtn.classList.remove('on');

    await this.delay(300);
    this.setScreen('off');
    this.tvScreen.classList.remove('power-off');
  }

  startGame(game) {
    audioManager.playMenuSelect();
    this.menu.detach();
    this.currentGame = game;

    // Load game directly by URL
    this.setScreen('playing');
    this.gameFrame.load(game.url);
    this.gameFrame.focus();

    // Attach escape handler
    const escapeProgress = document.getElementById('escape-progress');
    if (this.escapeHandler) {
      this.escapeHandler.attach(escapeProgress);
    }
  }

  exitToMenu() {
    if (this.state !== 'playing') return;

    audioManager.playClick();
    if (this.escapeHandler) {
      this.escapeHandler.detach();
    }
    this.gameFrame.unload();
    this.currentGame = null;
    this.setScreen('menu');
    this.menu.reset();
    this.menu.attach();
  }

  restartGame() {
    if (this.state !== 'playing') return;
    audioManager.playClick();
    this.gameFrame.reload();
    this.gameFrame.focus();
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  waitForKeyPress() {
    return new Promise((resolve) => {
      const handler = (e) => {
        document.removeEventListener('keydown', handler);
        resolve();
      };
      document.addEventListener('keydown', handler);
    });
  }
}

// Initialize cabinet when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new Cabinet();
});
