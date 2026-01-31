const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const messageEl = document.getElementById('message');

// Game constants
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 500;
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 12;
const PADDLE_SPEED = 8;
const BALL_RADIUS = 8;
const BALL_SPEED = 5;
const BRICK_ROWS = 5;
const BRICK_COLS = 10;
const BRICK_WIDTH = 54;
const BRICK_HEIGHT = 20;
const BRICK_PADDING = 4;
const BRICK_OFFSET_TOP = 50;
const BRICK_OFFSET_LEFT = 15;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Audio context for sound effects
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(frequency, duration, type = 'square') {
  if (!audioCtx) return;
  try {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

function playPaddleHit() {
  playSound(440, 0.1);
}

function playWallHit() {
  playSound(220, 0.08);
}

function playBrickHit(points) {
  // Higher pitched for higher value bricks
  playSound(300 + points * 5, 0.1);
}

function playLoseLife() {
  playSound(100, 0.4, 'sawtooth');
}

function playWin() {
  playSound(523, 0.15);
  setTimeout(() => playSound(659, 0.15), 150);
  setTimeout(() => playSound(784, 0.3), 300);
}

function playStart() {
  playSound(440, 0.1);
  setTimeout(() => playSound(550, 0.15), 100);
}

// Colors for brick rows
const BRICK_COLORS = ['#f55', '#f95', '#ff5', '#5f5', '#5ff'];

// Game state
let gameState = 'waiting'; // 'waiting', 'playing', 'won', 'gameover'
let score = 0;
let lives = 3;

// Paddle
const paddle = {
  x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
  y: CANVAS_HEIGHT - 30,
  width: PADDLE_WIDTH,
  height: PADDLE_HEIGHT,
  dx: 0,
};

// Ball
const ball = {
  x: CANVAS_WIDTH / 2,
  y: paddle.y - BALL_RADIUS,
  radius: BALL_RADIUS,
  dx: BALL_SPEED,
  dy: -BALL_SPEED,
  launched: false,
};

// Bricks
let bricks = [];

function createBricks() {
  bricks = [];
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      bricks.push({
        x: BRICK_OFFSET_LEFT + col * (BRICK_WIDTH + BRICK_PADDING),
        y: BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_PADDING),
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        color: BRICK_COLORS[row],
        alive: true,
        points: (BRICK_ROWS - row) * 10,
      });
    }
  }
}

createBricks();

// Input handling
const keys = {};

document.addEventListener('keydown', (e) => {
  keys[e.key] = true;

  if (e.key === ' ') {
    initAudio();
    if (gameState === 'waiting') {
      startGame();
    } else if (gameState === 'playing' && !ball.launched) {
      launchBall();
    } else if (gameState === 'won' || gameState === 'gameover') {
      resetGame();
    }
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

function startGame() {
  gameState = 'playing';
  messageEl.classList.add('hidden');
  playStart();
}

function launchBall() {
  ball.launched = true;
  ball.dx = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
  ball.dy = -BALL_SPEED;
  playStart();
}

function resetBall() {
  ball.launched = false;
  ball.x = paddle.x + paddle.width / 2;
  ball.y = paddle.y - ball.radius;
}

function resetGame() {
  score = 0;
  lives = 3;
  updateHUD();
  createBricks();
  paddle.x = CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2;
  resetBall();
  gameState = 'waiting';
  messageEl.textContent = 'PRESS SPACE TO START';
  messageEl.classList.remove('hidden');
}

function updateHUD() {
  scoreEl.textContent = score;
  livesEl.textContent = lives;
}

function update() {
  // Update paddle position based on input
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
    paddle.dx = -PADDLE_SPEED;
  } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
    paddle.dx = PADDLE_SPEED;
  } else {
    paddle.dx = 0;
  }

  // Move paddle
  paddle.x += paddle.dx;

  // Clamp paddle to screen
  paddle.x = Math.max(0, Math.min(CANVAS_WIDTH - paddle.width, paddle.x));

  if (gameState !== 'playing') return;

  // Move ball with paddle if not launched
  if (!ball.launched) {
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - ball.radius;
    return;
  }

  // Move ball
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Ball collision with walls
  if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= CANVAS_WIDTH) {
    ball.dx = -ball.dx;
    ball.x = Math.max(ball.radius, Math.min(CANVAS_WIDTH - ball.radius, ball.x));
    playWallHit();
  }

  // Ball collision with top
  if (ball.y - ball.radius <= 0) {
    ball.dy = -ball.dy;
    ball.y = ball.radius;
    playWallHit();
  }

  // Ball collision with paddle
  if (
    ball.y + ball.radius >= paddle.y &&
    ball.y - ball.radius <= paddle.y + paddle.height &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.width
  ) {
    ball.dy = -Math.abs(ball.dy);
    // Add spin based on where ball hit paddle
    const hitPos = (ball.x - paddle.x) / paddle.width;
    ball.dx = BALL_SPEED * 2 * (hitPos - 0.5);
    ball.y = paddle.y - ball.radius;
    playPaddleHit();
  }

  // Ball collision with bricks
  for (const brick of bricks) {
    if (!brick.alive) continue;

    if (
      ball.x + ball.radius > brick.x &&
      ball.x - ball.radius < brick.x + brick.width &&
      ball.y + ball.radius > brick.y &&
      ball.y - ball.radius < brick.y + brick.height
    ) {
      brick.alive = false;
      score += brick.points;
      updateHUD();
      playBrickHit(brick.points);

      // Determine which side was hit
      const overlapLeft = ball.x + ball.radius - brick.x;
      const overlapRight = brick.x + brick.width - (ball.x - ball.radius);
      const overlapTop = ball.y + ball.radius - brick.y;
      const overlapBottom = brick.y + brick.height - (ball.y - ball.radius);

      const minOverlapX = Math.min(overlapLeft, overlapRight);
      const minOverlapY = Math.min(overlapTop, overlapBottom);

      if (minOverlapX < minOverlapY) {
        ball.dx = -ball.dx;
      } else {
        ball.dy = -ball.dy;
      }

      break;
    }
  }

  // Check win condition
  if (bricks.every((b) => !b.alive)) {
    gameState = 'won';
    messageEl.textContent = 'YOU WIN! PRESS SPACE';
    messageEl.classList.remove('hidden');
    playWin();
  }

  // Ball fell off bottom
  if (ball.y - ball.radius > CANVAS_HEIGHT) {
    lives--;
    updateHUD();
    playLoseLife();

    if (lives <= 0) {
      gameState = 'gameover';
      messageEl.textContent = 'GAME OVER! PRESS SPACE';
      messageEl.classList.remove('hidden');
    } else {
      resetBall();
    }
  }
}

function draw() {
  // Clear canvas
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw bricks
  for (const brick of bricks) {
    if (!brick.alive) continue;
    ctx.fillStyle = brick.color;
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);

    // Brick highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(brick.x, brick.y, brick.width, 3);
  }

  // Draw paddle
  ctx.fillStyle = '#fff';
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

  // Draw ball
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.closePath();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Start game loop
gameLoop();
