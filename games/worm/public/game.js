const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const lengthEl = document.getElementById('length');
const speedEl = document.getElementById('speed');
const messageEl = document.getElementById('message');

const COLS = 24;
const ROWS = 18;
const CELL_SIZE = 24;
const CANVAS_WIDTH = COLS * CELL_SIZE;
const CANVAS_HEIGHT = ROWS * CELL_SIZE;
const BASE_TICK_MS = 150;
const MIN_TICK_MS = 70;
const SPEED_STEP_MS = 10;
const SPEED_STEP_FOOD = 3;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(frequency, duration, type = 'square', volume = 0.08) {
  if (!audioCtx) return;

  try {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

function playStartSound() {
  playSound(420, 0.08);
  setTimeout(() => playSound(560, 0.12), 80);
}

function playEatSound() {
  playSound(720, 0.05, 'triangle', 0.06);
}

function playDeathSound() {
  playSound(260, 0.08, 'sawtooth');
  setTimeout(() => playSound(180, 0.1, 'sawtooth'), 70);
  setTimeout(() => playSound(120, 0.16, 'sawtooth'), 140);
}

let gameState = 'waiting'; // waiting | playing | gameover
let snake = [];
let direction = 'right';
let queuedDirection = null;
let food = null;
let score = 0;
let foodsEaten = 0;

let lastFrameTime = 0;
let accumulator = 0;

function resetSnake() {
  const centerX = Math.floor(COLS / 2);
  const centerY = Math.floor(ROWS / 2);
  snake = [
    { x: centerX, y: centerY },
    { x: centerX - 1, y: centerY },
    { x: centerX - 2, y: centerY },
  ];
  direction = 'right';
  queuedDirection = null;
}

function resetGame() {
  score = 0;
  foodsEaten = 0;
  resetSnake();
  spawnFood();
  updateHUD();
  gameState = 'waiting';
  messageEl.textContent = 'PRESS SPACE TO START';
  messageEl.classList.remove('hidden');
}

function startGame() {
  if (gameState === 'gameover') {
    score = 0;
    foodsEaten = 0;
    resetSnake();
    spawnFood();
    updateHUD();
  }

  if (gameState === 'waiting') {
    score = 0;
    foodsEaten = 0;
    resetSnake();
    spawnFood();
    updateHUD();
  }

  gameState = 'playing';
  messageEl.classList.add('hidden');
  playStartSound();
}

function getSpeedLevel() {
  return Math.floor(foodsEaten / SPEED_STEP_FOOD) + 1;
}

function getTickInterval() {
  return Math.max(MIN_TICK_MS, BASE_TICK_MS - (getSpeedLevel() - 1) * SPEED_STEP_MS);
}

function updateHUD() {
  scoreEl.textContent = String(score);
  lengthEl.textContent = String(snake.length);
  speedEl.textContent = String(getSpeedLevel());
}

function positionKey(pos) {
  return `${pos.x},${pos.y}`;
}

function spawnFood() {
  const occupied = new Set(snake.map(positionKey));
  const freeCells = [];

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) {
        freeCells.push({ x, y });
      }
    }
  }

  if (freeCells.length === 0) {
    gameState = 'gameover';
    messageEl.textContent = 'YOU WIN - PRESS SPACE';
    messageEl.classList.remove('hidden');
    return;
  }

  const randomIndex = Math.floor(Math.random() * freeCells.length);
  food = freeCells[randomIndex];
}

function queueDirection(nextDirection) {
  if (gameState !== 'playing') return;
  if (!DIRECTIONS[nextDirection]) return;
  if (nextDirection === direction) return;
  if (OPPOSITE[direction] === nextDirection) return;
  queuedDirection = nextDirection;
}

function setGameOver() {
  gameState = 'gameover';
  messageEl.textContent = 'GAME OVER - PRESS SPACE';
  messageEl.classList.remove('hidden');
  playDeathSound();
}

function stepGame() {
  if (queuedDirection && OPPOSITE[direction] !== queuedDirection) {
    direction = queuedDirection;
  }
  queuedDirection = null;

  const velocity = DIRECTIONS[direction];
  const nextHead = {
    x: snake[0].x + velocity.x,
    y: snake[0].y + velocity.y,
  };

  if (nextHead.x < 0 || nextHead.x >= COLS || nextHead.y < 0 || nextHead.y >= ROWS) {
    setGameOver();
    return;
  }

  const eatsFood = food && nextHead.x === food.x && nextHead.y === food.y;
  const nextSnake = [nextHead, ...snake];
  if (!eatsFood) {
    nextSnake.pop();
  }

  const headKey = positionKey(nextHead);
  for (let i = 1; i < nextSnake.length; i++) {
    if (positionKey(nextSnake[i]) === headKey) {
      setGameOver();
      return;
    }
  }

  snake = nextSnake;

  if (eatsFood) {
    foodsEaten += 1;
    score += 10;
    playEatSound();
    spawnFood();
  }

  updateHUD();
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(36, 182, 77, 0.16)';
  ctx.lineWidth = 1;

  for (let x = 1; x < COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL_SIZE, 0);
    ctx.lineTo(x * CELL_SIZE, CANVAS_HEIGHT);
    ctx.stroke();
  }

  for (let y = 1; y < ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL_SIZE);
    ctx.lineTo(CANVAS_WIDTH, y * CELL_SIZE);
    ctx.stroke();
  }
}

function drawSnake() {
  snake.forEach((segment, index) => {
    const x = segment.x * CELL_SIZE;
    const y = segment.y * CELL_SIZE;
    const isHead = index === 0;

    ctx.fillStyle = isHead ? '#8dff9f' : '#3dd85f';
    ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);

    if (isHead) {
      ctx.fillStyle = '#d7ffe0';
      ctx.fillRect(x + 6, y + 6, CELL_SIZE - 12, CELL_SIZE - 12);
    }
  });
}

function drawFood() {
  if (!food) return;
  const x = food.x * CELL_SIZE;
  const y = food.y * CELL_SIZE;

  ctx.fillStyle = '#ffde59';
  ctx.fillRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8);
  ctx.fillStyle = '#fff3b0';
  ctx.fillRect(x + 8, y + 8, CELL_SIZE - 16, CELL_SIZE - 16);
}

function draw() {
  ctx.fillStyle = '#030603';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawGrid();
  drawFood();
  drawSnake();
}

function gameLoop(timestamp) {
  if (!lastFrameTime) {
    lastFrameTime = timestamp;
  }

  const delta = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  if (gameState === 'playing') {
    accumulator += delta;
    const tickInterval = getTickInterval();

    while (accumulator >= tickInterval && gameState === 'playing') {
      accumulator -= tickInterval;
      stepGame();
    }
  } else {
    accumulator = 0;
  }

  draw();
  requestAnimationFrame(gameLoop);
}

function keyToDirection(key) {
  switch (key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      return 'up';
    case 'ArrowDown':
    case 's':
    case 'S':
      return 'down';
    case 'ArrowLeft':
    case 'a':
    case 'A':
      return 'left';
    case 'ArrowRight':
    case 'd':
    case 'D':
      return 'right';
    default:
      return null;
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    initAudio();
    if (gameState === 'waiting' || gameState === 'gameover') {
      startGame();
    }
    return;
  }

  const nextDirection = keyToDirection(e.key);
  if (!nextDirection) return;

  e.preventDefault();
  initAudio();
  queueDirection(nextDirection);
});

resetGame();
requestAnimationFrame(gameLoop);
