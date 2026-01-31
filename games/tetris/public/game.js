const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const linesDisplay = document.getElementById('lines');
const messageDisplay = document.getElementById('message');

// Grid dimensions
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 22;

// Canvas setup
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;
nextCanvas.width = 80;
nextCanvas.height = 80;

// Tetromino definitions
const TETROMINOES = {
  I: {
    shape: [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
    color: '#00FFFF'
  },
  O: {
    shape: [[1,1], [1,1]],
    color: '#FFFF00'
  },
  T: {
    shape: [[0,1,0], [1,1,1], [0,0,0]],
    color: '#AA00FF'
  },
  S: {
    shape: [[0,1,1], [1,1,0], [0,0,0]],
    color: '#00FF00'
  },
  Z: {
    shape: [[1,1,0], [0,1,1], [0,0,0]],
    color: '#FF0000'
  },
  J: {
    shape: [[1,0,0], [1,1,1], [0,0,0]],
    color: '#0000FF'
  },
  L: {
    shape: [[0,0,1], [1,1,1], [0,0,0]],
    color: '#FF8800'
  }
};

const PIECE_NAMES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// Game state
let gameState = 'waiting';
let grid = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let dropInterval = 1000;
let lastDrop = 0;

// Scoring
const LINE_SCORES = [0, 40, 100, 300, 1200];

// Initialize grid
function initGrid() {
  grid = [];
  for (let row = 0; row < ROWS; row++) {
    grid.push(new Array(COLS).fill(null));
  }
}

// Get random piece
function getRandomPiece() {
  const name = PIECE_NAMES[Math.floor(Math.random() * PIECE_NAMES.length)];
  const tetromino = TETROMINOES[name];
  return {
    shape: tetromino.shape.map(row => [...row]),
    color: tetromino.color,
    x: Math.floor(COLS / 2) - Math.floor(tetromino.shape[0].length / 2),
    y: 0
  };
}

// Rotate piece
function rotate(piece) {
  const n = piece.shape.length;
  const rotated = [];
  for (let i = 0; i < n; i++) {
    rotated.push([]);
    for (let j = 0; j < n; j++) {
      rotated[i][j] = piece.shape[n - 1 - j][i];
    }
  }
  return rotated;
}

// Check collision
function isValidMove(piece, offsetX, offsetY, newShape) {
  const shape = newShape || piece.shape;
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const newX = piece.x + col + offsetX;
        const newY = piece.y + row + offsetY;

        if (newX < 0 || newX >= COLS || newY >= ROWS) {
          return false;
        }
        if (newY >= 0 && grid[newY][newX]) {
          return false;
        }
      }
    }
  }
  return true;
}

// Wall kick - try offsets when rotation fails
function tryRotation(piece) {
  const rotated = rotate(piece);

  // Try normal rotation
  if (isValidMove(piece, 0, 0, rotated)) {
    return rotated;
  }

  // Wall kick offsets
  const kicks = [[-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]];
  for (let [dx, dy] of kicks) {
    if (isValidMove(piece, dx, dy, rotated)) {
      piece.x += dx;
      piece.y += dy;
      return rotated;
    }
  }

  return null;
}

// Lock piece into grid
function lockPiece() {
  for (let row = 0; row < currentPiece.shape.length; row++) {
    for (let col = 0; col < currentPiece.shape[row].length; col++) {
      if (currentPiece.shape[row][col]) {
        const y = currentPiece.y + row;
        const x = currentPiece.x + col;
        if (y >= 0) {
          grid[y][x] = currentPiece.color;
        }
      }
    }
  }
}

// Clear completed lines
function clearLines() {
  let cleared = 0;

  for (let row = ROWS - 1; row >= 0; row--) {
    if (grid[row].every(cell => cell !== null)) {
      grid.splice(row, 1);
      grid.unshift(new Array(COLS).fill(null));
      cleared++;
      row++; // Check same row again
    }
  }

  if (cleared > 0) {
    lines += cleared;
    score += LINE_SCORES[cleared] * level;
    scoreDisplay.textContent = score;
    linesDisplay.textContent = lines;

    // Level up every 10 lines
    const newLevel = Math.floor(lines / 10) + 1;
    if (newLevel > level) {
      level = newLevel;
      levelDisplay.textContent = level;
      dropInterval = Math.max(100, 1000 - (level - 1) * 100);
    }
  }
}

// Get ghost piece Y position
function getGhostY() {
  let ghostY = currentPiece.y;
  while (isValidMove(currentPiece, 0, ghostY - currentPiece.y + 1)) {
    ghostY++;
  }
  return ghostY;
}

// Spawn new piece
function spawnPiece() {
  currentPiece = nextPiece || getRandomPiece();
  nextPiece = getRandomPiece();
  drawNextPiece();

  if (!isValidMove(currentPiece, 0, 0)) {
    gameState = 'gameover';
    messageDisplay.textContent = 'GAME OVER - PRESS SPACE';
    messageDisplay.classList.remove('hidden');
  }
}

// Draw block
function drawBlock(context, x, y, color, size) {
  // Main color
  context.fillStyle = color;
  context.fillRect(x + 1, y + 1, size - 2, size - 2);

  // Highlight
  context.fillStyle = 'rgba(255, 255, 255, 0.3)';
  context.fillRect(x + 1, y + 1, size - 2, 4);
  context.fillRect(x + 1, y + 1, 4, size - 2);

  // Shadow
  context.fillStyle = 'rgba(0, 0, 0, 0.3)';
  context.fillRect(x + size - 5, y + 1, 4, size - 2);
  context.fillRect(x + 1, y + size - 5, size - 2, 4);
}

// Draw grid
function drawGrid() {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid lines
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  for (let row = 0; row <= ROWS; row++) {
    ctx.beginPath();
    ctx.moveTo(0, row * BLOCK_SIZE);
    ctx.lineTo(canvas.width, row * BLOCK_SIZE);
    ctx.stroke();
  }
  for (let col = 0; col <= COLS; col++) {
    ctx.beginPath();
    ctx.moveTo(col * BLOCK_SIZE, 0);
    ctx.lineTo(col * BLOCK_SIZE, canvas.height);
    ctx.stroke();
  }

  // Locked pieces
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (grid[row][col]) {
        drawBlock(ctx, col * BLOCK_SIZE, row * BLOCK_SIZE, grid[row][col], BLOCK_SIZE);
      }
    }
  }
}

// Draw ghost piece
function drawGhost() {
  if (!currentPiece) return;

  const ghostY = getGhostY();
  ctx.globalAlpha = 0.3;

  for (let row = 0; row < currentPiece.shape.length; row++) {
    for (let col = 0; col < currentPiece.shape[row].length; col++) {
      if (currentPiece.shape[row][col]) {
        const x = (currentPiece.x + col) * BLOCK_SIZE;
        const y = (ghostY + row) * BLOCK_SIZE;
        ctx.fillStyle = currentPiece.color;
        ctx.fillRect(x + 1, y + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
      }
    }
  }

  ctx.globalAlpha = 1;
}

// Draw current piece
function drawPiece() {
  if (!currentPiece) return;

  for (let row = 0; row < currentPiece.shape.length; row++) {
    for (let col = 0; col < currentPiece.shape[row].length; col++) {
      if (currentPiece.shape[row][col]) {
        const x = (currentPiece.x + col) * BLOCK_SIZE;
        const y = (currentPiece.y + row) * BLOCK_SIZE;
        drawBlock(ctx, x, y, currentPiece.color, BLOCK_SIZE);
      }
    }
  }
}

// Draw next piece preview
function drawNextPiece() {
  nextCtx.fillStyle = '#111';
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  if (!nextPiece) return;

  const blockSize = 18;
  const shape = nextPiece.shape;
  const offsetX = (nextCanvas.width - shape[0].length * blockSize) / 2;
  const offsetY = (nextCanvas.height - shape.length * blockSize) / 2;

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        drawBlock(nextCtx, offsetX + col * blockSize, offsetY + row * blockSize, nextPiece.color, blockSize);
      }
    }
  }
}

// Game loop
function gameLoop(time) {
  if (gameState === 'playing') {
    // Auto drop
    if (time - lastDrop > dropInterval) {
      if (isValidMove(currentPiece, 0, 1)) {
        currentPiece.y++;
      } else {
        lockPiece();
        clearLines();
        spawnPiece();
      }
      lastDrop = time;
    }
  }

  drawGrid();
  if (currentPiece && gameState === 'playing') {
    drawGhost();
    drawPiece();
  }

  requestAnimationFrame(gameLoop);
}

// Input handling
function handleKeyDown(e) {
  if (gameState === 'waiting' || gameState === 'gameover') {
    if (e.code === 'Space') {
      e.preventDefault();
      startGame();
    }
    return;
  }

  if (gameState !== 'playing') return;

  switch (e.code) {
    case 'KeyA':
    case 'ArrowLeft':
      e.preventDefault();
      if (isValidMove(currentPiece, -1, 0)) {
        currentPiece.x--;
      }
      break;

    case 'KeyD':
    case 'ArrowRight':
      e.preventDefault();
      if (isValidMove(currentPiece, 1, 0)) {
        currentPiece.x++;
      }
      break;

    case 'KeyW':
    case 'ArrowUp':
      e.preventDefault();
      const rotated = tryRotation(currentPiece);
      if (rotated) {
        currentPiece.shape = rotated;
      }
      break;

    case 'KeyS':
    case 'ArrowDown':
      e.preventDefault();
      if (isValidMove(currentPiece, 0, 1)) {
        currentPiece.y++;
        score += 1;
        scoreDisplay.textContent = score;
      }
      break;

    case 'Space':
      e.preventDefault();
      // Hard drop
      while (isValidMove(currentPiece, 0, 1)) {
        currentPiece.y++;
        score += 2;
      }
      scoreDisplay.textContent = score;
      lockPiece();
      clearLines();
      spawnPiece();
      lastDrop = performance.now();
      break;
  }
}

document.addEventListener('keydown', handleKeyDown);

// Start game
function startGame() {
  gameState = 'playing';
  initGrid();
  score = 0;
  level = 1;
  lines = 0;
  dropInterval = 1000;
  scoreDisplay.textContent = '0';
  levelDisplay.textContent = '1';
  linesDisplay.textContent = '0';
  messageDisplay.classList.add('hidden');
  spawnPiece();
  lastDrop = performance.now();
}

// Initialize
initGrid();
drawGrid();
drawNextPiece();
requestAnimationFrame(gameLoop);
