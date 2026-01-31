const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const timeEl = document.getElementById('time');
const messageEl = document.getElementById('message');

// Game constants - grid based
const COLS = 14;
const ROWS = 13;
const CELL_SIZE = 40;
const CANVAS_WIDTH = COLS * CELL_SIZE;  // 560
const CANVAS_HEIGHT = ROWS * CELL_SIZE; // 520

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Row definitions (from top to bottom)
// Row 0: Goal row (lily pads)
// Rows 1-5: Water/river (logs and turtles)
// Row 6: Safe zone (middle)
// Rows 7-11: Road (cars and trucks)
// Row 12: Start zone

// Audio context
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(frequency, duration, type = 'square', volume = 0.1) {
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

function playHop() {
  playSound(300, 0.05);
}

function playScore() {
  playSound(440, 0.1);
  setTimeout(() => playSound(550, 0.1), 100);
  setTimeout(() => playSound(660, 0.15), 200);
}

function playDeath() {
  playSound(200, 0.1);
  setTimeout(() => playSound(150, 0.1), 100);
  setTimeout(() => playSound(100, 0.2), 200);
}

function playWin() {
  playSound(440, 0.1);
  setTimeout(() => playSound(550, 0.1), 150);
  setTimeout(() => playSound(660, 0.1), 300);
  setTimeout(() => playSound(880, 0.2), 450);
}

// Game state
let gameState = 'waiting'; // 'waiting', 'playing', 'dying', 'gameover', 'won'
let score = 0;
let lives = 3;
let timeLeft = 30;
let level = 1;
let frogsHome = [false, false, false, false, false]; // 5 lily pads

// Frog
const frog = {
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
  riding: null // reference to log/turtle being ridden
};

// Moving objects
let cars = [];
let logs = [];
let turtles = [];

// Input handling
let canMove = true;

document.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    if (gameState === 'waiting' || gameState === 'gameover' || gameState === 'won') {
      initAudio();
      startGame();
    }
    return;
  }

  if (gameState !== 'playing' || !canMove) return;

  let moved = false;
  if ((e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') && frog.y > 0) {
    frog.y--;
    moved = true;
  } else if ((e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') && frog.y < ROWS - 1) {
    frog.y++;
    moved = true;
  } else if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && frog.x > 0) {
    frog.x--;
    moved = true;
  } else if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && frog.x < COLS - 1) {
    frog.x++;
    moved = true;
  }

  if (moved) {
    playHop();
    canMove = false;
    setTimeout(() => { canMove = true; }, 150);

    // Score for moving forward
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
      score += 10;
      updateHUD();
    }
  }
});

function startGame() {
  if (gameState === 'gameover' || gameState === 'won') {
    score = 0;
    lives = 3;
    level = 1;
    frogsHome = [false, false, false, false, false];
  }
  gameState = 'playing';
  messageEl.classList.add('hidden');
  initLevel();
}

function initLevel() {
  // Reset frog
  resetFrog();

  // Reset timer
  timeLeft = 30;

  // Create cars (rows 7-11, bottom to top)
  cars = [];
  const carRows = [
    { row: 11, speed: 1.5, count: 3, width: 1, gap: 4, dir: 1 },
    { row: 10, speed: -2, count: 3, width: 2, gap: 5, dir: -1 },
    { row: 9, speed: 1.8, count: 4, width: 1, gap: 3, dir: 1 },
    { row: 8, speed: -1.2, count: 2, width: 3, gap: 7, dir: -1 },
    { row: 7, speed: 2.5, count: 3, width: 1, gap: 4, dir: 1 }
  ];

  for (const rowDef of carRows) {
    for (let i = 0; i < rowDef.count; i++) {
      cars.push({
        x: i * (rowDef.width + rowDef.gap) * CELL_SIZE,
        y: rowDef.row * CELL_SIZE,
        width: rowDef.width * CELL_SIZE,
        height: CELL_SIZE - 8,
        speed: rowDef.speed * (1 + (level - 1) * 0.1),
        color: rowDef.width === 1 ? '#ff0' : rowDef.width === 2 ? '#f00' : '#00f'
      });
    }
  }

  // Create logs (rows 1-3, 5)
  logs = [];
  const logRows = [
    { row: 5, speed: 1, count: 3, width: 3, gap: 3 },
    { row: 4, speed: -1.5, count: 4, width: 2, gap: 3 },
    { row: 2, speed: 1.2, count: 3, width: 4, gap: 4 },
    { row: 1, speed: -0.8, count: 4, width: 2, gap: 3 }
  ];

  for (const rowDef of logRows) {
    for (let i = 0; i < rowDef.count; i++) {
      logs.push({
        x: i * (rowDef.width + rowDef.gap) * CELL_SIZE,
        y: rowDef.row * CELL_SIZE,
        width: rowDef.width * CELL_SIZE,
        height: CELL_SIZE - 4,
        speed: rowDef.speed * (1 + (level - 1) * 0.1)
      });
    }
  }

  // Create turtles (row 3)
  turtles = [];
  for (let i = 0; i < 4; i++) {
    turtles.push({
      x: i * 4 * CELL_SIZE,
      y: 3 * CELL_SIZE,
      width: 2 * CELL_SIZE,
      height: CELL_SIZE - 4,
      speed: -1.3 * (1 + (level - 1) * 0.1),
      diveTimer: Math.random() * 200,
      diving: false
    });
  }

  updateHUD();
}

function resetFrog() {
  frog.x = Math.floor(COLS / 2);
  frog.y = ROWS - 1;
  frog.riding = null;
}

function updateHUD() {
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  timeEl.textContent = Math.ceil(timeLeft);
}

let lastTime = 0;
let timerAccum = 0;

function update(currentTime) {
  if (!lastTime) lastTime = currentTime;
  const delta = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  if (gameState !== 'playing') return;

  // Update timer
  timerAccum += delta;
  if (timerAccum >= 1) {
    timerAccum = 0;
    timeLeft--;
    updateHUD();
    if (timeLeft <= 0) {
      frogDie();
      return;
    }
  }

  // Update cars
  for (const car of cars) {
    car.x += car.speed;
    if (car.speed > 0 && car.x > CANVAS_WIDTH) {
      car.x = -car.width;
    } else if (car.speed < 0 && car.x + car.width < 0) {
      car.x = CANVAS_WIDTH;
    }
  }

  // Update logs
  for (const log of logs) {
    log.x += log.speed;
    if (log.speed > 0 && log.x > CANVAS_WIDTH) {
      log.x = -log.width;
    } else if (log.speed < 0 && log.x + log.width < 0) {
      log.x = CANVAS_WIDTH;
    }
  }

  // Update turtles
  for (const turtle of turtles) {
    turtle.x += turtle.speed;
    if (turtle.speed > 0 && turtle.x > CANVAS_WIDTH) {
      turtle.x = -turtle.width;
    } else if (turtle.speed < 0 && turtle.x + turtle.width < 0) {
      turtle.x = CANVAS_WIDTH;
    }

    // Diving behavior
    turtle.diveTimer++;
    if (turtle.diveTimer > 300) {
      turtle.diving = !turtle.diving;
      turtle.diveTimer = 0;
    }
  }

  // Check collisions
  checkCollisions();
}

function checkCollisions() {
  const frogX = frog.x * CELL_SIZE;
  const frogY = frog.y * CELL_SIZE;
  const frogW = CELL_SIZE - 8;
  const frogH = CELL_SIZE - 8;
  const frogCenterX = frogX + CELL_SIZE / 2;
  const frogCenterY = frogY + CELL_SIZE / 2;

  // Check goal row (lily pads)
  if (frog.y === 0) {
    // Lily pad positions (5 pads)
    const padPositions = [1, 4, 7, 10, 13];
    let landed = false;

    for (let i = 0; i < padPositions.length; i++) {
      if (frog.x === padPositions[i] && !frogsHome[i]) {
        // Landed on empty lily pad!
        frogsHome[i] = true;
        score += 50 + Math.ceil(timeLeft) * 10;
        playScore();
        updateHUD();
        landed = true;

        // Check if all frogs home
        if (frogsHome.every(f => f)) {
          level++;
          frogsHome = [false, false, false, false, false];
          score += 1000;
          updateHUD();

          if (level > 5) {
            gameState = 'won';
            messageEl.textContent = 'YOU WIN! PRESS SPACE';
            messageEl.classList.remove('hidden');
            playWin();
          } else {
            initLevel();
          }
        } else {
          resetFrog();
          timeLeft = 30;
        }
        break;
      }
    }

    if (!landed) {
      // Missed lily pad or already occupied
      frogDie();
    }
    return;
  }

  // Check car collisions (rows 7-11)
  if (frog.y >= 7 && frog.y <= 11) {
    for (const car of cars) {
      if (frogCenterX > car.x && frogCenterX < car.x + car.width &&
          frogCenterY > car.y && frogCenterY < car.y + car.height + 8) {
        frogDie();
        return;
      }
    }
  }

  // Check water (rows 1-5)
  if (frog.y >= 1 && frog.y <= 5) {
    let onSomething = false;

    // Check logs
    for (const log of logs) {
      if (frogCenterX > log.x && frogCenterX < log.x + log.width &&
          frogCenterY > log.y && frogCenterY < log.y + log.height + 4) {
        onSomething = true;
        // Move with log
        frog.x += log.speed / CELL_SIZE;
        break;
      }
    }

    // Check turtles
    if (!onSomething) {
      for (const turtle of turtles) {
        if (!turtle.diving &&
            frogCenterX > turtle.x && frogCenterX < turtle.x + turtle.width &&
            frogCenterY > turtle.y && frogCenterY < turtle.y + turtle.height + 4) {
          onSomething = true;
          // Move with turtle
          frog.x += turtle.speed / CELL_SIZE;
          break;
        }
      }
    }

    // Clamp frog position
    if (frog.x < 0 || frog.x >= COLS) {
      frogDie();
      return;
    }

    // Drown if not on anything
    if (!onSomething) {
      frogDie();
      return;
    }
  }
}

function frogDie() {
  lives--;
  updateHUD();
  playDeath();

  if (lives <= 0) {
    gameState = 'gameover';
    messageEl.textContent = 'GAME OVER - PRESS SPACE';
    messageEl.classList.remove('hidden');
  } else {
    resetFrog();
    timeLeft = 30;
  }
}

function draw() {
  // Clear canvas
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw goal row (lily pads)
  ctx.fillStyle = '#006';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CELL_SIZE);

  // Draw lily pads
  const padPositions = [1, 4, 7, 10, 13];
  for (let i = 0; i < padPositions.length; i++) {
    const px = padPositions[i] * CELL_SIZE;
    if (frogsHome[i]) {
      // Draw frog on pad
      ctx.fillStyle = '#0a0';
      ctx.beginPath();
      ctx.ellipse(px + CELL_SIZE / 2, CELL_SIZE / 2, 14, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Draw empty lily pad
      ctx.fillStyle = '#0a4';
      ctx.beginPath();
      ctx.ellipse(px + CELL_SIZE / 2, CELL_SIZE / 2, 16, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw water area (rows 1-5)
  ctx.fillStyle = '#006';
  ctx.fillRect(0, CELL_SIZE, CANVAS_WIDTH, 5 * CELL_SIZE);

  // Draw logs
  ctx.fillStyle = '#840';
  for (const log of logs) {
    ctx.fillRect(log.x, log.y + 2, log.width, log.height);
    // Log texture
    ctx.fillStyle = '#630';
    ctx.fillRect(log.x + 4, log.y + 6, 4, log.height - 8);
    ctx.fillRect(log.x + log.width - 8, log.y + 6, 4, log.height - 8);
    ctx.fillStyle = '#840';
  }

  // Draw turtles
  for (const turtle of turtles) {
    if (turtle.diving) {
      ctx.fillStyle = '#004';
    } else {
      ctx.fillStyle = '#080';
    }
    // Draw 2-3 turtles in a group
    const turtleCount = 3;
    const turtleSize = turtle.width / turtleCount - 4;
    for (let t = 0; t < turtleCount; t++) {
      const tx = turtle.x + t * (turtleSize + 4);
      ctx.beginPath();
      ctx.ellipse(tx + turtleSize / 2, turtle.y + CELL_SIZE / 2, turtleSize / 2 - 2, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw safe zone (row 6)
  ctx.fillStyle = '#080';
  ctx.fillRect(0, 6 * CELL_SIZE, CANVAS_WIDTH, CELL_SIZE);

  // Draw road area (rows 7-11)
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 7 * CELL_SIZE, CANVAS_WIDTH, 5 * CELL_SIZE);

  // Draw road lines
  ctx.strokeStyle = '#ff0';
  ctx.setLineDash([20, 20]);
  for (let row = 8; row <= 11; row++) {
    ctx.beginPath();
    ctx.moveTo(0, row * CELL_SIZE);
    ctx.lineTo(CANVAS_WIDTH, row * CELL_SIZE);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Draw cars
  for (const car of cars) {
    ctx.fillStyle = car.color;
    ctx.fillRect(car.x, car.y + 4, car.width, car.height);
    // Wheels
    ctx.fillStyle = '#000';
    ctx.fillRect(car.x + 4, car.y + car.height, 8, 4);
    ctx.fillRect(car.x + car.width - 12, car.y + car.height, 8, 4);
    // Windows
    ctx.fillStyle = '#8cf';
    if (car.width > CELL_SIZE) {
      ctx.fillRect(car.x + 8, car.y + 8, car.width - 16, 10);
    } else {
      ctx.fillRect(car.x + 6, car.y + 8, car.width - 12, 10);
    }
  }

  // Draw start zone (row 12)
  ctx.fillStyle = '#080';
  ctx.fillRect(0, 12 * CELL_SIZE, CANVAS_WIDTH, CELL_SIZE);

  // Draw frog
  if (gameState === 'playing' || gameState === 'waiting') {
    drawFrog(frog.x * CELL_SIZE + 4, frog.y * CELL_SIZE + 4);
  }

  // Draw time bar
  ctx.fillStyle = '#0f0';
  const timeBarWidth = (timeLeft / 30) * (CANVAS_WIDTH - 20);
  ctx.fillRect(10, CANVAS_HEIGHT - 8, timeBarWidth, 4);
}

function drawFrog(x, y) {
  ctx.fillStyle = '#0f0';

  // Body
  ctx.beginPath();
  ctx.ellipse(x + 16, y + 18, 12, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.ellipse(x + 16, y + 6, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#ff0';
  ctx.beginPath();
  ctx.arc(x + 10, y + 4, 4, 0, Math.PI * 2);
  ctx.arc(x + 22, y + 4, 4, 0, Math.PI * 2);
  ctx.fill();

  // Pupils
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(x + 10, y + 4, 2, 0, Math.PI * 2);
  ctx.arc(x + 22, y + 4, 2, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = '#0f0';
  ctx.fillRect(x + 2, y + 24, 8, 6);
  ctx.fillRect(x + 22, y + 24, 8, 6);
}

function gameLoop(currentTime) {
  update(currentTime);
  draw();
  requestAnimationFrame(gameLoop);
}

// Start game loop
gameLoop();
