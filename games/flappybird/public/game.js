const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('high-score');
const messageDisplay = document.getElementById('message');

// Canvas dimensions (vertical format)
canvas.width = 400;
canvas.height = 500;

// Game constants
const GRAVITY = 0.5;
const FLAP_STRENGTH = -8;
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;
const PIPE_SPEED = 3;
const PIPE_SPACING = 200;

// Game state
let gameState = 'waiting'; // waiting, playing, gameover
let score = 0;
let highScore = parseInt(localStorage.getItem('flappyHighScore') || '0');
highScoreDisplay.textContent = highScore;

// Bird
const bird = {
  x: 80,
  y: canvas.height / 2,
  width: 34,
  height: 24,
  velocity: 0,

  reset() {
    this.y = canvas.height / 2;
    this.velocity = 0;
  },

  flap() {
    this.velocity = FLAP_STRENGTH;
  },

  update() {
    this.velocity += GRAVITY;
    this.y += this.velocity;
  },

  draw() {
    // 8-bit style bird
    const pixelSize = 4;

    // Bird body (yellow)
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(this.x, this.y, 28, 20);

    // Wing (darker yellow)
    ctx.fillStyle = '#DAA520';
    const wingOffset = Math.sin(Date.now() / 50) * 2;
    ctx.fillRect(this.x + 4, this.y + 8 + wingOffset, 12, 8);

    // Eye (white + black)
    ctx.fillStyle = '#FFF';
    ctx.fillRect(this.x + 20, this.y + 4, 8, 8);
    ctx.fillStyle = '#000';
    ctx.fillRect(this.x + 24, this.y + 6, 4, 4);

    // Beak (orange)
    ctx.fillStyle = '#FF6600';
    ctx.fillRect(this.x + 28, this.y + 10, 8, 6);

    // Tail (darker yellow)
    ctx.fillStyle = '#DAA520';
    ctx.fillRect(this.x - 6, this.y + 6, 6, 8);
  }
};

// Pipes
let pipes = [];

function createPipe() {
  const minHeight = 60;
  const maxHeight = canvas.height - PIPE_GAP - minHeight - 80; // Leave room for ground
  const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

  pipes.push({
    x: canvas.width,
    topHeight: topHeight,
    bottomY: topHeight + PIPE_GAP,
    passed: false
  });
}

function updatePipes() {
  // Move pipes
  for (let pipe of pipes) {
    pipe.x -= PIPE_SPEED;

    // Check if bird passed pipe
    if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
      pipe.passed = true;
      score++;
      scoreDisplay.textContent = score;
    }
  }

  // Remove off-screen pipes
  pipes = pipes.filter(p => p.x + PIPE_WIDTH > 0);

  // Add new pipes
  const lastPipe = pipes[pipes.length - 1];
  if (!lastPipe || lastPipe.x < canvas.width - PIPE_SPACING) {
    createPipe();
  }
}

function drawPipes() {
  ctx.fillStyle = '#228B22'; // Forest green

  for (let pipe of pipes) {
    // Top pipe
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
    // Top pipe cap
    ctx.fillStyle = '#32CD32'; // Lighter green
    ctx.fillRect(pipe.x - 4, pipe.topHeight - 20, PIPE_WIDTH + 8, 20);
    ctx.fillStyle = '#228B22';

    // Bottom pipe
    const bottomHeight = canvas.height - pipe.bottomY - 60; // Ground is 60px
    ctx.fillRect(pipe.x, pipe.bottomY, PIPE_WIDTH, bottomHeight);
    // Bottom pipe cap
    ctx.fillStyle = '#32CD32';
    ctx.fillRect(pipe.x - 4, pipe.bottomY, PIPE_WIDTH + 8, 20);
    ctx.fillStyle = '#228B22';
  }
}

// Collision detection
function checkCollision() {
  // Ground collision
  if (bird.y + bird.height > canvas.height - 60) {
    return true;
  }

  // Ceiling collision
  if (bird.y < 0) {
    return true;
  }

  // Pipe collision
  for (let pipe of pipes) {
    if (bird.x + bird.width > pipe.x && bird.x < pipe.x + PIPE_WIDTH) {
      if (bird.y < pipe.topHeight || bird.y + bird.height > pipe.bottomY) {
        return true;
      }
    }
  }

  return false;
}

// Draw ground
function drawGround() {
  // Ground base
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

  // Grass top
  ctx.fillStyle = '#228B22';
  ctx.fillRect(0, canvas.height - 60, canvas.width, 15);

  // Grass detail
  ctx.fillStyle = '#32CD32';
  for (let x = 0; x < canvas.width; x += 20) {
    ctx.fillRect(x, canvas.height - 60, 10, 8);
  }
}

// Draw background
function drawBackground() {
  // Sky gradient effect (8-bit style banding)
  const bands = [
    { y: 0, h: 100, color: '#87CEEB' },
    { y: 100, h: 100, color: '#98D8EB' },
    { y: 200, h: 100, color: '#B0E0E6' },
    { y: 300, h: 140, color: '#C8E8F0' }
  ];

  for (let band of bands) {
    ctx.fillStyle = band.color;
    ctx.fillRect(0, band.y, canvas.width, band.h);
  }

  // Clouds (simple 8-bit)
  ctx.fillStyle = '#FFF';
  drawCloud(50, 60);
  drawCloud(200, 100);
  drawCloud(320, 40);
}

function drawCloud(x, y) {
  ctx.fillRect(x, y, 40, 20);
  ctx.fillRect(x - 10, y + 10, 60, 15);
  ctx.fillRect(x + 10, y - 10, 20, 15);
}

// Game loop
function gameLoop() {
  // Draw background
  drawBackground();
  drawGround();

  if (gameState === 'playing') {
    bird.update();
    updatePipes();

    if (checkCollision()) {
      gameState = 'gameover';
      if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyHighScore', highScore.toString());
        highScoreDisplay.textContent = highScore;
      }
      messageDisplay.textContent = 'GAME OVER - PRESS SPACE';
      messageDisplay.classList.remove('hidden');
    }
  }

  drawPipes();
  bird.draw();

  requestAnimationFrame(gameLoop);
}

// Controls
function handleKeyDown(e) {
  if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
    e.preventDefault();

    if (gameState === 'waiting' || gameState === 'gameover') {
      // Start new game
      gameState = 'playing';
      score = 0;
      scoreDisplay.textContent = '0';
      bird.reset();
      pipes = [];
      messageDisplay.classList.add('hidden');
      bird.flap();
    } else if (gameState === 'playing') {
      bird.flap();
    }
  }
}

document.addEventListener('keydown', handleKeyDown);

// Start game loop
gameLoop();
