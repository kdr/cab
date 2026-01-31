const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const highScoreDisplay = document.getElementById('high-score');
const messageDisplay = document.getElementById('message');

// Tile size
const TILE = 20;
const COLS = 28;
const ROWS = 31;

canvas.width = COLS * TILE;
canvas.height = ROWS * TILE;

// Map layout: 0=empty, 1=wall, 2=dot, 3=power pellet, 4=ghost house
const MAP_TEMPLATE = [
  '1111111111111111111111111111',
  '1222222222222112222222222221',
  '1211112111112112111121111121',
  '1311112111112112111121111131',
  '1211112111112112111121111121',
  '1222222222222222222222222221',
  '1211112112111111211211112121',
  '1211112112111111211211112121',
  '1222222112222112222211222221',
  '1111112111110110111121111111',
  '0000012111110110111121000000',
  '0000012110000000001121000000',
  '0000012110111441101121000000',
  '1111112110100001011121111111',
  '0000002000100001010002000000',
  '1111112110100001011121111111',
  '0000012110111111101121000000',
  '0000012110000000001121000000',
  '0000012110111111101121000000',
  '1111112110111111101121111111',
  '1222222222222112222222222221',
  '1211112111112112111121111121',
  '1211112111112112111121111121',
  '1322112222222002222222112231',
  '1112112112111111211211211211',
  '1112112112111111211211211211',
  '1222222112222112222211222221',
  '1211111111112112111111111121',
  '1211111111112112111111111121',
  '1222222222222222222222222221',
  '1111111111111111111111111111'
];

// Game state
let gameState = 'waiting';
let score = 0;
let lives = 3;
let highScore = parseInt(localStorage.getItem('pacmanHighScore') || '0');
highScoreDisplay.textContent = highScore;
let map = [];
let dotsRemaining = 0;

// Pacman
const pacman = {
  x: 14,
  y: 23,
  direction: 'left',
  nextDirection: 'left',
  mouthOpen: 0,

  reset() {
    this.x = 14;
    this.y = 23;
    this.direction = 'left';
    this.nextDirection = 'left';
  }
};

// Ghosts
const GHOST_COLORS = {
  blinky: '#FF0000',
  pinky: '#FFB8FF',
  inky: '#00FFFF',
  clyde: '#FFB852'
};

let ghosts = [];

function createGhosts() {
  ghosts = [
    { name: 'blinky', x: 14, y: 11, direction: 'left', mode: 'scatter', frightened: false, color: GHOST_COLORS.blinky },
    { name: 'pinky', x: 13, y: 14, direction: 'up', mode: 'scatter', frightened: false, color: GHOST_COLORS.pinky },
    { name: 'inky', x: 14, y: 14, direction: 'up', mode: 'scatter', frightened: false, color: GHOST_COLORS.inky },
    { name: 'clyde', x: 15, y: 14, direction: 'up', mode: 'scatter', frightened: false, color: GHOST_COLORS.clyde }
  ];
}

// Frightened mode timer
let frightenedTimer = 0;
const FRIGHTENED_DURATION = 8000;

// Initialize map
function initMap() {
  map = [];
  dotsRemaining = 0;
  for (let row = 0; row < ROWS; row++) {
    map[row] = [];
    for (let col = 0; col < COLS; col++) {
      const char = MAP_TEMPLATE[row][col];
      map[row][col] = parseInt(char);
      if (char === '2' || char === '3') {
        dotsRemaining++;
      }
    }
  }
}

// Check if position is a wall
function isWall(x, y) {
  // Handle tunnel wrap
  if (x < 0 || x >= COLS) return false;
  if (y < 0 || y >= ROWS) return true;
  return map[y][x] === 1;
}

// Get opposite direction
function oppositeDir(dir) {
  const opposite = { left: 'right', right: 'left', up: 'down', down: 'up' };
  return opposite[dir];
}

// Move in direction
function moveInDirection(x, y, dir) {
  switch (dir) {
    case 'left': return { x: x - 1, y };
    case 'right': return { x: x + 1, y };
    case 'up': return { x, y: y - 1 };
    case 'down': return { x, y: y + 1 };
  }
  return { x, y };
}

// Get distance between two points
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Ghost AI - get target tile
function getGhostTarget(ghost) {
  if (ghost.frightened) {
    // Random movement when frightened
    return { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  }

  if (ghost.mode === 'scatter') {
    // Scatter to corners
    switch (ghost.name) {
      case 'blinky': return { x: COLS - 3, y: 0 };
      case 'pinky': return { x: 2, y: 0 };
      case 'inky': return { x: COLS - 1, y: ROWS - 1 };
      case 'clyde': return { x: 0, y: ROWS - 1 };
    }
  }

  // Chase mode
  switch (ghost.name) {
    case 'blinky':
      // Direct chase
      return { x: pacman.x, y: pacman.y };

    case 'pinky':
      // Target 4 tiles ahead of pacman
      let ahead = moveInDirection(pacman.x, pacman.y, pacman.direction);
      for (let i = 0; i < 3; i++) {
        ahead = moveInDirection(ahead.x, ahead.y, pacman.direction);
      }
      return ahead;

    case 'inky':
      // Complex targeting based on Blinky
      const blinky = ghosts.find(g => g.name === 'blinky');
      const pivot = moveInDirection(pacman.x, pacman.y, pacman.direction);
      const pivotX = moveInDirection(pivot.x, pivot.y, pacman.direction).x;
      const pivotY = moveInDirection(pivot.x, pivot.y, pacman.direction).y;
      return {
        x: pivotX + (pivotX - blinky.x),
        y: pivotY + (pivotY - blinky.y)
      };

    case 'clyde':
      // Chase if far, scatter if close
      const dist = distance(ghost.x, ghost.y, pacman.x, pacman.y);
      if (dist > 8) {
        return { x: pacman.x, y: pacman.y };
      }
      return { x: 0, y: ROWS - 1 };
  }

  return { x: pacman.x, y: pacman.y };
}

// Move ghost
function moveGhost(ghost) {
  const target = getGhostTarget(ghost);
  const directions = ['up', 'down', 'left', 'right'];
  let bestDir = ghost.direction;
  let bestDist = Infinity;

  for (const dir of directions) {
    // Can't reverse direction (unless frightened)
    if (dir === oppositeDir(ghost.direction) && !ghost.frightened) continue;

    const next = moveInDirection(ghost.x, ghost.y, dir);

    // Check if valid move
    if (isWall(next.x, next.y)) continue;

    // Don't enter ghost house unless going home
    if (map[next.y] && map[next.y][next.x] === 4) continue;

    const dist = distance(next.x, next.y, target.x, target.y);
    if (dist < bestDist) {
      bestDist = dist;
      bestDir = dir;
    }
  }

  ghost.direction = bestDir;
  const next = moveInDirection(ghost.x, ghost.y, ghost.direction);

  // Handle tunnel
  if (next.x < 0) next.x = COLS - 1;
  if (next.x >= COLS) next.x = 0;

  if (!isWall(next.x, next.y)) {
    ghost.x = next.x;
    ghost.y = next.y;
  }
}

// Move pacman
function movePacman() {
  // Try next direction first
  const nextPos = moveInDirection(pacman.x, pacman.y, pacman.nextDirection);
  if (!isWall(nextPos.x, nextPos.y)) {
    pacman.direction = pacman.nextDirection;
  }

  // Move in current direction
  const pos = moveInDirection(pacman.x, pacman.y, pacman.direction);

  // Handle tunnel
  if (pos.x < 0) pos.x = COLS - 1;
  if (pos.x >= COLS) pos.x = 0;

  if (!isWall(pos.x, pos.y)) {
    pacman.x = pos.x;
    pacman.y = pos.y;
  }

  // Eat dots
  if (map[pacman.y][pacman.x] === 2) {
    map[pacman.y][pacman.x] = 0;
    score += 10;
    dotsRemaining--;
    scoreDisplay.textContent = score;
  }

  // Eat power pellet
  if (map[pacman.y][pacman.x] === 3) {
    map[pacman.y][pacman.x] = 0;
    score += 50;
    dotsRemaining--;
    scoreDisplay.textContent = score;
    activateFrightenedMode();
  }

  // Check win
  if (dotsRemaining === 0) {
    gameState = 'won';
    messageDisplay.textContent = 'YOU WIN! PRESS SPACE';
    messageDisplay.classList.remove('hidden');
    updateHighScore();
  }
}

// Activate frightened mode
function activateFrightenedMode() {
  frightenedTimer = FRIGHTENED_DURATION;
  for (const ghost of ghosts) {
    ghost.frightened = true;
    ghost.direction = oppositeDir(ghost.direction);
  }
}

// Check collision with ghosts
function checkGhostCollision() {
  for (const ghost of ghosts) {
    if (ghost.x === pacman.x && ghost.y === pacman.y) {
      if (ghost.frightened) {
        // Eat ghost
        ghost.x = 14;
        ghost.y = 14;
        ghost.frightened = false;
        score += 200;
        scoreDisplay.textContent = score;
      } else {
        // Pacman dies
        lives--;
        livesDisplay.textContent = lives;

        if (lives <= 0) {
          gameState = 'gameover';
          messageDisplay.textContent = 'GAME OVER - PRESS SPACE';
          messageDisplay.classList.remove('hidden');
          updateHighScore();
        } else {
          // Reset positions
          pacman.reset();
          createGhosts();
        }
        return;
      }
    }
  }
}

// Update high score
function updateHighScore() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('pacmanHighScore', highScore.toString());
    highScoreDisplay.textContent = highScore;
  }
}

// Draw wall
function drawWall(x, y) {
  ctx.fillStyle = '#2121DE';
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE);

  // Add some depth
  ctx.fillStyle = '#0000AA';
  ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
}

// Draw dot
function drawDot(x, y) {
  ctx.fillStyle = '#FFB8AE';
  ctx.beginPath();
  ctx.arc(x * TILE + TILE / 2, y * TILE + TILE / 2, 2, 0, Math.PI * 2);
  ctx.fill();
}

// Draw power pellet
function drawPowerPellet(x, y) {
  ctx.fillStyle = '#FFB8AE';
  const pulse = Math.sin(Date.now() / 200) * 2;
  ctx.beginPath();
  ctx.arc(x * TILE + TILE / 2, y * TILE + TILE / 2, 6 + pulse, 0, Math.PI * 2);
  ctx.fill();
}

// Draw pacman
function drawPacman() {
  const x = pacman.x * TILE + TILE / 2;
  const y = pacman.y * TILE + TILE / 2;

  // Mouth animation
  pacman.mouthOpen += 0.3;
  const mouthAngle = Math.abs(Math.sin(pacman.mouthOpen)) * 0.5;

  // Direction angle
  let angle = 0;
  switch (pacman.direction) {
    case 'right': angle = 0; break;
    case 'down': angle = Math.PI / 2; break;
    case 'left': angle = Math.PI; break;
    case 'up': angle = -Math.PI / 2; break;
  }

  ctx.fillStyle = '#FFFF00';
  ctx.beginPath();
  ctx.arc(x, y, TILE / 2 - 2, angle + mouthAngle, angle + Math.PI * 2 - mouthAngle);
  ctx.lineTo(x, y);
  ctx.fill();
}

// Draw ghost
function drawGhost(ghost) {
  const x = ghost.x * TILE + TILE / 2;
  const y = ghost.y * TILE + TILE / 2;
  const size = TILE / 2 - 2;

  // Body color
  if (ghost.frightened) {
    // Blink when about to end
    if (frightenedTimer < 2000) {
      ctx.fillStyle = Math.floor(Date.now() / 200) % 2 ? '#2121DE' : '#FFFFFF';
    } else {
      ctx.fillStyle = '#2121DE';
    }
  } else {
    ctx.fillStyle = ghost.color;
  }

  // Ghost body
  ctx.beginPath();
  ctx.arc(x, y - 2, size, Math.PI, 0);
  ctx.lineTo(x + size, y + size - 2);

  // Wavy bottom
  const wave = Math.sin(Date.now() / 100) * 2;
  for (let i = 0; i < 4; i++) {
    const wx = x + size - (i * size / 2);
    const wy = y + size - 2 + (i % 2 ? wave : -wave);
    ctx.lineTo(wx, wy);
  }
  ctx.lineTo(x - size, y + size - 2);
  ctx.closePath();
  ctx.fill();

  // Eyes
  if (!ghost.frightened) {
    // White of eyes
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(x - 4, y - 3, 4, 0, Math.PI * 2);
    ctx.arc(x + 4, y - 3, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pupils (look toward pacman)
    const dx = pacman.x - ghost.x;
    const dy = pacman.y - ghost.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const pupilX = (dx / dist) * 2;
    const pupilY = (dy / dist) * 2;

    ctx.fillStyle = '#00F';
    ctx.beginPath();
    ctx.arc(x - 4 + pupilX, y - 3 + pupilY, 2, 0, Math.PI * 2);
    ctx.arc(x + 4 + pupilX, y - 3 + pupilY, 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Frightened face
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(x - 4, y - 3, 2, 0, Math.PI * 2);
    ctx.arc(x + 4, y - 3, 2, 0, Math.PI * 2);
    ctx.fill();

    // Wavy mouth
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 3);
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(x - 6 + i * 3, y + 3 + (i % 2 ? -2 : 2));
    }
    ctx.stroke();
  }
}

// Draw map
function drawMap() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      switch (map[row][col]) {
        case 1: drawWall(col, row); break;
        case 2: drawDot(col, row); break;
        case 3: drawPowerPellet(col, row); break;
      }
    }
  }
}

// Game timing
let lastUpdate = 0;
const PACMAN_SPEED = 150;
const GHOST_SPEED = 180;
let lastGhostMove = 0;

// Mode switching
let modeTimer = 0;
let isChaseMode = false;
const SCATTER_TIME = 7000;
const CHASE_TIME = 20000;

// Game loop
function gameLoop(time) {
  if (gameState === 'playing') {
    // Update frightened timer
    if (frightenedTimer > 0) {
      frightenedTimer -= time - lastUpdate;
      if (frightenedTimer <= 0) {
        for (const ghost of ghosts) {
          ghost.frightened = false;
        }
      }
    }

    // Mode switching
    modeTimer += time - lastUpdate;
    const modeTime = isChaseMode ? CHASE_TIME : SCATTER_TIME;
    if (modeTimer > modeTime && frightenedTimer <= 0) {
      modeTimer = 0;
      isChaseMode = !isChaseMode;
      for (const ghost of ghosts) {
        ghost.mode = isChaseMode ? 'chase' : 'scatter';
        ghost.direction = oppositeDir(ghost.direction);
      }
    }

    // Move pacman
    if (time - lastUpdate > PACMAN_SPEED) {
      movePacman();
      checkGhostCollision();
      lastUpdate = time;
    }

    // Move ghosts
    const ghostSpeed = frightenedTimer > 0 ? GHOST_SPEED * 1.5 : GHOST_SPEED;
    if (time - lastGhostMove > ghostSpeed) {
      for (const ghost of ghosts) {
        moveGhost(ghost);
      }
      checkGhostCollision();
      lastGhostMove = time;
    }
  }

  // Draw
  drawMap();
  drawPacman();
  for (const ghost of ghosts) {
    drawGhost(ghost);
  }

  requestAnimationFrame(gameLoop);
}

// Input
function handleKeyDown(e) {
  if (gameState === 'waiting' || gameState === 'gameover' || gameState === 'won') {
    if (e.code === 'Space') {
      e.preventDefault();
      startGame();
    }
    return;
  }

  switch (e.code) {
    case 'KeyW':
    case 'ArrowUp':
      e.preventDefault();
      pacman.nextDirection = 'up';
      break;
    case 'KeyS':
    case 'ArrowDown':
      e.preventDefault();
      pacman.nextDirection = 'down';
      break;
    case 'KeyA':
    case 'ArrowLeft':
      e.preventDefault();
      pacman.nextDirection = 'left';
      break;
    case 'KeyD':
    case 'ArrowRight':
      e.preventDefault();
      pacman.nextDirection = 'right';
      break;
  }
}

document.addEventListener('keydown', handleKeyDown);

// Start game
function startGame() {
  gameState = 'playing';
  score = 0;
  lives = 3;
  scoreDisplay.textContent = '0';
  livesDisplay.textContent = '3';
  messageDisplay.classList.add('hidden');
  initMap();
  pacman.reset();
  createGhosts();
  isChaseMode = false;
  modeTimer = 0;
  frightenedTimer = 0;
  lastUpdate = performance.now();
  lastGhostMove = performance.now();
}

// Initialize
initMap();
createGhosts();
drawMap();
drawPacman();
for (const ghost of ghosts) {
  drawGhost(ghost);
}
requestAnimationFrame(gameLoop);
