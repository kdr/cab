const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreLeftEl = document.getElementById('score-left');
const scoreRightEl = document.getElementById('score-right');
const messageEl = document.getElementById('message');

// Game constants - sized to fit within cabinet screen
const CANVAS_WIDTH = 680;
const CANVAS_HEIGHT = 380;
const MARGIN = 25; // Play area margin from edges
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 60;
const PADDLE_SPEED = 6;
const BALL_SIZE = 10;
const BALL_SPEED = 5;
const WINNING_SCORE = 11;

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
  playSound(220, 0.1);
}

function playScore() {
  playSound(150, 0.3);
}

function playStart() {
  playSound(660, 0.1);
  setTimeout(() => playSound(880, 0.15), 100);
}

// Game state
let gameState = 'waiting'; // 'waiting', 'playing', 'scored', 'gameover'
let scoreLeft = 0;
let scoreRight = 0;

// Paddles - positioned further from edges
const leftPaddle = {
  x: MARGIN + 10,
  y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
  dy: 0,
};

const rightPaddle = {
  x: CANVAS_WIDTH - MARGIN - 10 - PADDLE_WIDTH,
  y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
  dy: 0,
};

// Ball
const ball = {
  x: CANVAS_WIDTH / 2,
  y: CANVAS_HEIGHT / 2,
  dx: BALL_SPEED,
  dy: 0,
};

// Input handling
const keys = {};

document.addEventListener('keydown', (e) => {
  keys[e.key] = true;

  if (e.key === ' ' && (gameState === 'waiting' || gameState === 'scored')) {
    initAudio();
    startRound();
  }

  if (e.key === ' ' && gameState === 'gameover') {
    resetGame();
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

function startRound() {
  gameState = 'playing';
  messageEl.classList.add('hidden');
  playStart();

  // Reset ball position
  ball.x = CANVAS_WIDTH / 2;
  ball.y = CANVAS_HEIGHT / 2;

  // Random direction
  ball.dx = (Math.random() > 0.5 ? 1 : -1) * BALL_SPEED;
  ball.dy = (Math.random() - 0.5) * BALL_SPEED;
}

function resetGame() {
  scoreLeft = 0;
  scoreRight = 0;
  updateScoreboard();
  gameState = 'waiting';
  messageEl.textContent = 'PRESS SPACE TO START';
  messageEl.classList.remove('hidden');

  // Reset paddles
  leftPaddle.y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
  rightPaddle.y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
}

function updateScoreboard() {
  scoreLeftEl.textContent = scoreLeft;
  scoreRightEl.textContent = scoreRight;
}

function update() {
  // Update paddle positions based on input
  if (keys['w'] || keys['W']) {
    leftPaddle.dy = -PADDLE_SPEED;
  } else if (keys['s'] || keys['S']) {
    leftPaddle.dy = PADDLE_SPEED;
  } else {
    leftPaddle.dy = 0;
  }

  if (keys['ArrowUp']) {
    rightPaddle.dy = -PADDLE_SPEED;
  } else if (keys['ArrowDown']) {
    rightPaddle.dy = PADDLE_SPEED;
  } else {
    rightPaddle.dy = 0;
  }

  // Move paddles
  leftPaddle.y += leftPaddle.dy;
  rightPaddle.y += rightPaddle.dy;

  // Clamp paddles to play area
  leftPaddle.y = Math.max(MARGIN, Math.min(CANVAS_HEIGHT - MARGIN - PADDLE_HEIGHT, leftPaddle.y));
  rightPaddle.y = Math.max(MARGIN, Math.min(CANVAS_HEIGHT - MARGIN - PADDLE_HEIGHT, rightPaddle.y));

  if (gameState !== 'playing') return;

  // Move ball
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Ball collision with top/bottom (with margin)
  if (ball.y <= MARGIN || ball.y >= CANVAS_HEIGHT - MARGIN - BALL_SIZE) {
    ball.dy = -ball.dy;
    ball.y = Math.max(MARGIN, Math.min(CANVAS_HEIGHT - MARGIN - BALL_SIZE, ball.y));
    playWallHit();
  }

  // Ball collision with paddles
  // Left paddle
  if (
    ball.x <= leftPaddle.x + PADDLE_WIDTH &&
    ball.x + BALL_SIZE >= leftPaddle.x &&
    ball.y + BALL_SIZE >= leftPaddle.y &&
    ball.y <= leftPaddle.y + PADDLE_HEIGHT
  ) {
    ball.dx = Math.abs(ball.dx); // Ensure ball goes right
    const hitPos = (ball.y + BALL_SIZE / 2 - leftPaddle.y) / PADDLE_HEIGHT;
    ball.dy = (hitPos - 0.5) * BALL_SPEED * 2;
    playPaddleHit();
  }

  // Right paddle
  if (
    ball.x + BALL_SIZE >= rightPaddle.x &&
    ball.x <= rightPaddle.x + PADDLE_WIDTH &&
    ball.y + BALL_SIZE >= rightPaddle.y &&
    ball.y <= rightPaddle.y + PADDLE_HEIGHT
  ) {
    ball.dx = -Math.abs(ball.dx); // Ensure ball goes left
    const hitPos = (ball.y + BALL_SIZE / 2 - rightPaddle.y) / PADDLE_HEIGHT;
    ball.dy = (hitPos - 0.5) * BALL_SPEED * 2;
    playPaddleHit();
  }

  // Scoring
  if (ball.x <= MARGIN) {
    scoreRight++;
    updateScoreboard();
    handleScore();
    playScore();
  } else if (ball.x >= CANVAS_WIDTH - MARGIN) {
    scoreLeft++;
    updateScoreboard();
    handleScore();
    playScore();
  }
}

function handleScore() {
  if (scoreLeft >= WINNING_SCORE) {
    gameState = 'gameover';
    messageEl.textContent = 'PLAYER 1 WINS! PRESS SPACE';
    messageEl.classList.remove('hidden');
  } else if (scoreRight >= WINNING_SCORE) {
    gameState = 'gameover';
    messageEl.textContent = 'PLAYER 2 WINS! PRESS SPACE';
    messageEl.classList.remove('hidden');
  } else {
    gameState = 'scored';
    messageEl.textContent = 'PRESS SPACE';
    messageEl.classList.remove('hidden');
  }
}

function draw() {
  // Clear canvas
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw play area border
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.strokeRect(MARGIN, MARGIN, CANVAS_WIDTH - MARGIN * 2, CANVAS_HEIGHT - MARGIN * 2);

  // Draw center line
  ctx.strokeStyle = '#444';
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH / 2, MARGIN);
  ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT - MARGIN);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw paddles
  ctx.fillStyle = '#fff';
  ctx.fillRect(leftPaddle.x, leftPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);
  ctx.fillRect(rightPaddle.x, rightPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);

  // Draw ball
  ctx.fillRect(ball.x, ball.y, BALL_SIZE, BALL_SIZE);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Start game loop
gameLoop();
