const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const highScoreEl = document.getElementById('high-score');
const messageEl = document.getElementById('message');

// Game constants
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 20;
const PLAYER_SPEED = 5;
const BULLET_WIDTH = 3;
const BULLET_HEIGHT = 10;
const BULLET_SPEED = 8;
const ALIEN_ROWS = 5;
const ALIEN_COLS = 11;
const ALIEN_WIDTH = 32;
const ALIEN_HEIGHT = 24;
const ALIEN_PADDING = 8;
const ALIEN_DROP = 20;
const SHIELD_COUNT = 4;
const SHIELD_WIDTH = 60;
const SHIELD_HEIGHT = 40;
const UFO_WIDTH = 48;
const UFO_HEIGHT = 20;
const UFO_SPEED = 2;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

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

function playShoot() {
  playSound(880, 0.1);
}

function playExplosion() {
  playSound(100, 0.2, 'sawtooth', 0.15);
}

function playAlienHit() {
  playSound(200, 0.1);
}

function playPlayerHit() {
  playSound(80, 0.4, 'sawtooth', 0.2);
}

function playUFO() {
  playSound(440, 0.05, 'sine');
}

function playStart() {
  playSound(440, 0.1);
  setTimeout(() => playSound(550, 0.1), 100);
  setTimeout(() => playSound(660, 0.15), 200);
}

// Game state
let gameState = 'waiting'; // 'waiting', 'playing', 'gameover'
let score = 0;
let highScore = 0;
let lives = 3;
let level = 1;

// Player
const player = {
  x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
  y: CANVAS_HEIGHT - 50,
  dx: 0
};

// Bullets
let playerBullets = [];
let alienBullets = [];

// Aliens
let aliens = [];
let alienDirection = 1;
let alienSpeed = 1;
let alienMoveTimer = 0;
let alienMoveInterval = 30; // frames between alien movements

// Shields
let shields = [];

// UFO
let ufo = null;
let ufoTimer = 0;
let ufoInterval = 600; // frames between UFO spawns

// Input handling
const keys = {};

document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  keys[e.code] = true;

  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    if (gameState === 'waiting' || gameState === 'gameover') {
      initAudio();
      startGame();
    } else if (gameState === 'playing') {
      shoot();
    }
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
  keys[e.code] = false;
});

function startGame() {
  if (gameState === 'gameover') {
    score = 0;
    lives = 3;
    level = 1;
  }
  gameState = 'playing';
  messageEl.classList.add('hidden');
  initLevel();
  playStart();
}

function initLevel() {
  // Reset player
  player.x = CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2;
  playerBullets = [];
  alienBullets = [];

  // Create aliens
  aliens = [];
  const startX = (CANVAS_WIDTH - (ALIEN_COLS * (ALIEN_WIDTH + ALIEN_PADDING))) / 2;
  const startY = 60;

  for (let row = 0; row < ALIEN_ROWS; row++) {
    for (let col = 0; col < ALIEN_COLS; col++) {
      aliens.push({
        x: startX + col * (ALIEN_WIDTH + ALIEN_PADDING),
        y: startY + row * (ALIEN_HEIGHT + ALIEN_PADDING),
        type: row < 1 ? 2 : row < 3 ? 1 : 0, // Different alien types
        alive: true
      });
    }
  }

  // Reset alien movement
  alienDirection = 1;
  alienSpeed = 1 + (level - 1) * 0.2;
  alienMoveInterval = Math.max(10, 30 - (level - 1) * 3);
  alienMoveTimer = 0;

  // Create shields
  shields = [];
  const shieldSpacing = CANVAS_WIDTH / (SHIELD_COUNT + 1);
  for (let i = 0; i < SHIELD_COUNT; i++) {
    shields.push(createShield(shieldSpacing * (i + 1) - SHIELD_WIDTH / 2, CANVAS_HEIGHT - 120));
  }

  // Reset UFO
  ufo = null;
  ufoTimer = 0;

  updateHUD();
}

function createShield(x, y) {
  // Create shield as pixel data
  const pixels = [];
  const rows = 8;
  const cols = 12;
  const pixelW = SHIELD_WIDTH / cols;
  const pixelH = SHIELD_HEIGHT / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Create arch shape
      const isEdge = (r < 2 && (c < 2 || c >= cols - 2)) ||
                     (r >= rows - 3 && c >= 4 && c < cols - 4);
      if (!isEdge) {
        pixels.push({
          x: x + c * pixelW,
          y: y + r * pixelH,
          w: pixelW,
          h: pixelH,
          alive: true
        });
      }
    }
  }
  return pixels;
}

function shoot() {
  // Limit player bullets
  if (playerBullets.length < 1) {
    playerBullets.push({
      x: player.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
      y: player.y,
      dy: -BULLET_SPEED
    });
    playShoot();
  }
}

function updateHUD() {
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  highScoreEl.textContent = highScore;
}

function update() {
  if (gameState !== 'playing') return;

  // Player movement
  player.dx = 0;
  if (keys['a'] || keys['A'] || keys['ArrowLeft']) {
    player.dx = -PLAYER_SPEED;
  }
  if (keys['d'] || keys['D'] || keys['ArrowRight']) {
    player.dx = PLAYER_SPEED;
  }

  player.x += player.dx;
  player.x = Math.max(20, Math.min(CANVAS_WIDTH - 20 - PLAYER_WIDTH, player.x));

  // Update player bullets
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    const bullet = playerBullets[i];
    bullet.y += bullet.dy;
    if (bullet.y < 0) {
      playerBullets.splice(i, 1);
    }
  }

  // Update alien bullets
  for (let i = alienBullets.length - 1; i >= 0; i--) {
    const bullet = alienBullets[i];
    bullet.y += bullet.dy;
    if (bullet.y > CANVAS_HEIGHT) {
      alienBullets.splice(i, 1);
    }
  }

  // Alien movement
  alienMoveTimer++;
  if (alienMoveTimer >= alienMoveInterval) {
    alienMoveTimer = 0;
    moveAliens();
  }

  // Alien shooting
  if (Math.random() < 0.02 * alienSpeed) {
    alienShoot();
  }

  // UFO logic
  ufoTimer++;
  if (!ufo && ufoTimer >= ufoInterval) {
    spawnUFO();
  }
  if (ufo) {
    ufo.x += ufo.dx;
    if (ufoTimer % 10 === 0) playUFO();
    if (ufo.x < -UFO_WIDTH || ufo.x > CANVAS_WIDTH) {
      ufo = null;
    }
  }

  // Collision detection
  checkCollisions();

  // Check win condition
  if (aliens.filter(a => a.alive).length === 0) {
    level++;
    initLevel();
  }
}

function moveAliens() {
  let shouldDrop = false;
  const aliveAliens = aliens.filter(a => a.alive);

  // Check if aliens hit edge
  for (const alien of aliveAliens) {
    if ((alienDirection > 0 && alien.x + ALIEN_WIDTH >= CANVAS_WIDTH - 20) ||
        (alienDirection < 0 && alien.x <= 20)) {
      shouldDrop = true;
      break;
    }
  }

  if (shouldDrop) {
    alienDirection *= -1;
    for (const alien of aliens) {
      alien.y += ALIEN_DROP;
    }
    // Speed up slightly
    alienMoveInterval = Math.max(5, alienMoveInterval - 1);
  } else {
    for (const alien of aliens) {
      alien.x += alienDirection * (4 + alienSpeed);
    }
  }

  // Check if aliens reached player
  for (const alien of aliveAliens) {
    if (alien.y + ALIEN_HEIGHT >= player.y) {
      gameOver();
      return;
    }
  }
}

function alienShoot() {
  const aliveAliens = aliens.filter(a => a.alive);
  if (aliveAliens.length === 0) return;

  // Get bottom-most aliens in each column
  const columns = {};
  for (const alien of aliveAliens) {
    const col = Math.floor(alien.x / (ALIEN_WIDTH + ALIEN_PADDING));
    if (!columns[col] || alien.y > columns[col].y) {
      columns[col] = alien;
    }
  }

  const shooters = Object.values(columns);
  const shooter = shooters[Math.floor(Math.random() * shooters.length)];

  alienBullets.push({
    x: shooter.x + ALIEN_WIDTH / 2,
    y: shooter.y + ALIEN_HEIGHT,
    dy: 4 + level * 0.5
  });
}

function spawnUFO() {
  ufoTimer = 0;
  const fromLeft = Math.random() > 0.5;
  ufo = {
    x: fromLeft ? -UFO_WIDTH : CANVAS_WIDTH,
    y: 30,
    dx: fromLeft ? UFO_SPEED : -UFO_SPEED,
    points: [50, 100, 150, 300][Math.floor(Math.random() * 4)]
  };
}

function checkCollisions() {
  // Player bullets vs aliens
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    const bullet = playerBullets[i];

    for (const alien of aliens) {
      if (alien.alive &&
          bullet.x < alien.x + ALIEN_WIDTH &&
          bullet.x + BULLET_WIDTH > alien.x &&
          bullet.y < alien.y + ALIEN_HEIGHT &&
          bullet.y + BULLET_HEIGHT > alien.y) {
        alien.alive = false;
        playerBullets.splice(i, 1);
        score += (alien.type + 1) * 10;
        updateHUD();
        playAlienHit();
        break;
      }
    }

    // Player bullets vs UFO
    if (ufo && bullet.x < ufo.x + UFO_WIDTH &&
        bullet.x + BULLET_WIDTH > ufo.x &&
        bullet.y < ufo.y + UFO_HEIGHT &&
        bullet.y + BULLET_HEIGHT > ufo.y) {
      score += ufo.points;
      updateHUD();
      playExplosion();
      ufo = null;
      playerBullets.splice(i, 1);
    }
  }

  // Player bullets vs shields
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    const bullet = playerBullets[i];
    if (checkShieldCollision(bullet)) {
      playerBullets.splice(i, 1);
    }
  }

  // Alien bullets vs shields
  for (let i = alienBullets.length - 1; i >= 0; i--) {
    const bullet = alienBullets[i];
    if (checkShieldCollision(bullet)) {
      alienBullets.splice(i, 1);
    }
  }

  // Alien bullets vs player
  for (let i = alienBullets.length - 1; i >= 0; i--) {
    const bullet = alienBullets[i];
    if (bullet.x < player.x + PLAYER_WIDTH &&
        bullet.x + BULLET_WIDTH > player.x &&
        bullet.y < player.y + PLAYER_HEIGHT &&
        bullet.y + 8 > player.y) {
      alienBullets.splice(i, 1);
      playerHit();
      break;
    }
  }

  // Aliens vs shields
  for (const alien of aliens) {
    if (!alien.alive) continue;
    for (const shield of shields) {
      for (const pixel of shield) {
        if (pixel.alive &&
            alien.x < pixel.x + pixel.w &&
            alien.x + ALIEN_WIDTH > pixel.x &&
            alien.y < pixel.y + pixel.h &&
            alien.y + ALIEN_HEIGHT > pixel.y) {
          pixel.alive = false;
        }
      }
    }
  }
}

function checkShieldCollision(bullet) {
  for (const shield of shields) {
    for (const pixel of shield) {
      if (pixel.alive &&
          bullet.x < pixel.x + pixel.w &&
          bullet.x + BULLET_WIDTH > pixel.x &&
          bullet.y < pixel.y + pixel.h &&
          bullet.y + BULLET_HEIGHT > pixel.y) {
        pixel.alive = false;
        // Destroy nearby pixels too
        for (const p2 of shield) {
          if (p2.alive && Math.abs(p2.x - pixel.x) < pixel.w * 2 && Math.abs(p2.y - pixel.y) < pixel.h * 2) {
            if (Math.random() < 0.3) p2.alive = false;
          }
        }
        return true;
      }
    }
  }
  return false;
}

function playerHit() {
  lives--;
  updateHUD();
  playPlayerHit();

  if (lives <= 0) {
    gameOver();
  } else {
    // Brief invincibility - reset player position
    player.x = CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2;
    alienBullets = [];
  }
}

function gameOver() {
  gameState = 'gameover';
  if (score > highScore) {
    highScore = score;
    updateHUD();
  }
  messageEl.textContent = 'GAME OVER - PRESS SPACE';
  messageEl.classList.remove('hidden');
}

function draw() {
  // Clear canvas
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw player
  ctx.fillStyle = '#0f0';
  // Ship body
  ctx.fillRect(player.x, player.y + 8, PLAYER_WIDTH, 12);
  // Ship cannon
  ctx.fillRect(player.x + PLAYER_WIDTH / 2 - 3, player.y, 6, 12);
  // Ship wings
  ctx.fillRect(player.x - 4, player.y + 14, 8, 6);
  ctx.fillRect(player.x + PLAYER_WIDTH - 4, player.y + 14, 8, 6);

  // Draw aliens
  for (const alien of aliens) {
    if (!alien.alive) continue;
    drawAlien(alien);
  }

  // Draw UFO
  if (ufo) {
    ctx.fillStyle = '#f00';
    // UFO body
    ctx.beginPath();
    ctx.ellipse(ufo.x + UFO_WIDTH / 2, ufo.y + UFO_HEIGHT / 2, UFO_WIDTH / 2, UFO_HEIGHT / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // UFO dome
    ctx.fillStyle = '#f88';
    ctx.beginPath();
    ctx.ellipse(ufo.x + UFO_WIDTH / 2, ufo.y + 6, 12, 8, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  // Draw shields
  ctx.fillStyle = '#0f0';
  for (const shield of shields) {
    for (const pixel of shield) {
      if (pixel.alive) {
        ctx.fillRect(pixel.x, pixel.y, pixel.w - 1, pixel.h - 1);
      }
    }
  }

  // Draw player bullets
  ctx.fillStyle = '#fff';
  for (const bullet of playerBullets) {
    ctx.fillRect(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT);
  }

  // Draw alien bullets
  ctx.fillStyle = '#f00';
  for (const bullet of alienBullets) {
    ctx.fillRect(bullet.x, bullet.y, BULLET_WIDTH, 8);
  }

  // Draw ground line
  ctx.fillStyle = '#0f0';
  ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 2);
}

function drawAlien(alien) {
  const x = alien.x;
  const y = alien.y;

  ctx.fillStyle = alien.type === 2 ? '#f0f' : alien.type === 1 ? '#0ff' : '#0f0';

  if (alien.type === 2) {
    // Small squid alien
    ctx.fillRect(x + 12, y, 8, 4);
    ctx.fillRect(x + 8, y + 4, 16, 4);
    ctx.fillRect(x + 4, y + 8, 24, 4);
    ctx.fillRect(x + 4, y + 12, 4, 4);
    ctx.fillRect(x + 12, y + 12, 8, 4);
    ctx.fillRect(x + 24, y + 12, 4, 4);
    ctx.fillRect(x + 8, y + 16, 4, 4);
    ctx.fillRect(x + 20, y + 16, 4, 4);
  } else if (alien.type === 1) {
    // Medium crab alien
    ctx.fillRect(x + 8, y, 16, 4);
    ctx.fillRect(x + 4, y + 4, 24, 4);
    ctx.fillRect(x, y + 8, 32, 4);
    ctx.fillRect(x, y + 12, 8, 4);
    ctx.fillRect(x + 12, y + 12, 8, 4);
    ctx.fillRect(x + 24, y + 12, 8, 4);
    ctx.fillRect(x + 4, y + 16, 8, 4);
    ctx.fillRect(x + 20, y + 16, 8, 4);
  } else {
    // Large octopus alien
    ctx.fillRect(x + 8, y, 16, 4);
    ctx.fillRect(x + 4, y + 4, 24, 4);
    ctx.fillRect(x, y + 8, 32, 4);
    ctx.fillRect(x, y + 12, 32, 4);
    ctx.fillRect(x + 4, y + 16, 8, 4);
    ctx.fillRect(x + 20, y + 16, 8, 4);
    ctx.fillRect(x + 8, y + 20, 4, 4);
    ctx.fillRect(x + 20, y + 20, 4, 4);
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Start game loop
gameLoop();
