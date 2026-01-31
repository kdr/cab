const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const chipsEl = document.getElementById('chips');
const betEl = document.getElementById('bet');
const messageEl = document.getElementById('message');

// Game constants
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 400;
const CARD_WIDTH = 60;
const CARD_HEIGHT = 84;
const CARD_SPACING = 20;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Card suits and values
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_SYMBOLS = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
const SUIT_COLORS = { hearts: '#e22', diamonds: '#e22', clubs: '#222', spades: '#222' };

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

function playDeal() {
  playSound(800, 0.05, 'sine');
}

function playChip() {
  playSound(1200, 0.03, 'sine');
}

function playWin() {
  playSound(523, 0.1, 'sine');
  setTimeout(() => playSound(659, 0.1, 'sine'), 100);
  setTimeout(() => playSound(784, 0.15, 'sine'), 200);
}

function playLose() {
  playSound(300, 0.1, 'sine');
  setTimeout(() => playSound(250, 0.15, 'sine'), 100);
}

function playBlackjack() {
  playSound(523, 0.1, 'sine');
  setTimeout(() => playSound(659, 0.1, 'sine'), 100);
  setTimeout(() => playSound(784, 0.1, 'sine'), 200);
  setTimeout(() => playSound(1047, 0.2, 'sine'), 300);
}

// Game state
let gameState = 'betting'; // 'betting', 'playing', 'dealerTurn', 'roundOver'
let chips = 1000;
let currentBet = 10;
let deck = [];
let playerHand = [];
let dealerHand = [];
let resultMessage = '';

// Create and shuffle deck
function createDeck() {
  deck = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit: suit, value: value, hidden: false });
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function drawCardFromDeck() {
  if (deck.length === 0) createDeck();
  return deck.pop();
}

function getCardValue(card) {
  if (card.value === 'A') return 11;
  if (['K', 'Q', 'J'].includes(card.value)) return 10;
  return parseInt(card.value);
}

function getHandValue(hand) {
  let value = 0;
  let aces = 0;

  for (const card of hand) {
    if (card.hidden) continue;
    value += getCardValue(card);
    if (card.value === 'A') aces++;
  }

  // Adjust for aces
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return value;
}

function isBlackjack(hand) {
  return hand.length === 2 && getHandValue(hand) === 21;
}

function updateHUD() {
  chipsEl.textContent = chips;
  betEl.textContent = currentBet;
}

// Input handling - WASD and Arrow keys
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();

  // SPACE or ENTER for deal/continue
  if (key === ' ' || e.code === 'Space' || key === 'enter') {
    e.preventDefault();
    if (gameState === 'betting') {
      initAudio();
      placeBet();
    } else if (gameState === 'roundOver') {
      startNewRound();
    }
    return;
  }

  // Betting state - adjust bet with arrows/WASD
  if (gameState === 'betting') {
    if (key === 'arrowup' || key === 'w') {
      adjustBet(10);
    } else if (key === 'arrowdown' || key === 's') {
      adjustBet(-10);
    } else if (key === 'arrowright' || key === 'd') {
      adjustBet(50);
    } else if (key === 'arrowleft' || key === 'a') {
      adjustBet(-50);
    }
    return;
  }

  // Playing state - W=Hit, S=Stand, E or A/D=Double
  if (gameState === 'playing') {
    if (key === 'w' || key === 'arrowup') {
      hit();
    } else if (key === 's' || key === 'arrowdown') {
      stand();
    } else if (key === 'e' || key === 'a' || key === 'd' || key === 'arrowleft' || key === 'arrowright') {
      doubleDown();
    }
  }
});

function adjustBet(amount) {
  const newBet = currentBet + amount;
  if (newBet >= 10 && newBet <= chips) {
    currentBet = newBet;
    playChip();
    updateHUD();
  }
}

function placeBet() {
  if (currentBet < 10) {
    currentBet = Math.min(10, chips);
  }
  if (currentBet > chips) {
    currentBet = chips;
  }
  if (chips < 10) {
    resultMessage = 'NOT ENOUGH CHIPS!';
    gameState = 'roundOver';
    messageEl.textContent = 'GAME OVER - PRESS SPACE';
    messageEl.classList.remove('hidden');
    return;
  }

  chips -= currentBet;
  updateHUD();
  dealCards();
}

function dealCards() {
  gameState = 'playing';
  messageEl.classList.add('hidden');
  resultMessage = '';

  createDeck();
  playerHand = [];
  dealerHand = [];

  // Deal cards with slight delay for visual effect
  const card1 = drawCardFromDeck();
  const card2 = drawCardFromDeck();
  const card3 = drawCardFromDeck();
  const card4 = drawCardFromDeck();
  card4.hidden = true;

  playerHand.push(card1);
  dealerHand.push(card2);
  playerHand.push(card3);
  dealerHand.push(card4);

  playDeal();

  // Check for blackjack
  if (isBlackjack(playerHand)) {
    dealerHand[1].hidden = false;
    if (isBlackjack(dealerHand)) {
      resultMessage = 'PUSH - BOTH BLACKJACK';
      chips += currentBet;
      playChip();
    } else {
      resultMessage = 'BLACKJACK! YOU WIN!';
      chips += currentBet + Math.floor(currentBet * 1.5);
      playBlackjack();
    }
    endRound();
  }
}

function hit() {
  if (gameState !== 'playing') return;

  const newCard = drawCardFromDeck();
  playerHand.push(newCard);
  playDeal();

  const value = getHandValue(playerHand);
  if (value > 21) {
    resultMessage = 'BUST! YOU LOSE';
    playLose();
    endRound();
  } else if (value === 21) {
    stand();
  }
}

function stand() {
  if (gameState !== 'playing') return;

  gameState = 'dealerTurn';
  dealerHand[1].hidden = false;
  playDeal();

  dealerPlay();
}

function doubleDown() {
  if (gameState !== 'playing') return;
  if (playerHand.length !== 2) return;
  if (chips < currentBet) return;

  chips -= currentBet;
  currentBet *= 2;
  updateHUD();

  const newCard = drawCardFromDeck();
  playerHand.push(newCard);
  playDeal();

  const value = getHandValue(playerHand);
  if (value > 21) {
    resultMessage = 'BUST! YOU LOSE';
    playLose();
    endRound();
  } else {
    // After double down, automatically stand
    gameState = 'dealerTurn';
    dealerHand[1].hidden = false;
    dealerPlay();
  }
}

function dealerPlay() {
  const dealerLoop = () => {
    const dealerValue = getHandValue(dealerHand);
    const playerValue = getHandValue(playerHand);

    if (dealerValue < 17) {
      const newCard = drawCardFromDeck();
      dealerHand.push(newCard);
      playDeal();
      setTimeout(dealerLoop, 500);
    } else {
      // Determine winner
      if (dealerValue > 21) {
        resultMessage = 'DEALER BUSTS! YOU WIN!';
        chips += currentBet * 2;
        playWin();
      } else if (dealerValue > playerValue) {
        resultMessage = 'DEALER WINS';
        playLose();
      } else if (playerValue > dealerValue) {
        resultMessage = 'YOU WIN!';
        chips += currentBet * 2;
        playWin();
      } else {
        resultMessage = 'PUSH';
        chips += currentBet;
        playChip();
      }
      endRound();
    }
  };

  setTimeout(dealerLoop, 500);
}

function endRound() {
  gameState = 'roundOver';
  updateHUD();
  messageEl.textContent = chips > 0 ? 'PRESS SPACE TO CONTINUE' : 'GAME OVER - PRESS SPACE';
  messageEl.classList.remove('hidden');
}

function startNewRound() {
  if (chips <= 0) {
    chips = 1000;
  }
  currentBet = Math.min(currentBet, chips);
  if (currentBet < 10) currentBet = Math.min(10, chips);
  gameState = 'betting';
  playerHand = [];
  dealerHand = [];
  resultMessage = '';
  updateHUD();
  messageEl.textContent = 'PRESS SPACE TO DEAL';
  messageEl.classList.remove('hidden');
}

function draw() {
  // Clear canvas with green felt
  ctx.fillStyle = '#062';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw table markings
  ctx.strokeStyle = '#0a4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT + 100, 280, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  // Draw dealer area label
  ctx.fillStyle = '#fff';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('DEALER', CANVAS_WIDTH / 2, 30);

  // Draw dealer hand
  if (dealerHand.length > 0) {
    const dealerX = (CANVAS_WIDTH - (dealerHand.length * (CARD_WIDTH + CARD_SPACING) - CARD_SPACING)) / 2;
    for (let i = 0; i < dealerHand.length; i++) {
      drawCard(dealerHand[i], dealerX + i * (CARD_WIDTH + CARD_SPACING), 45);
    }

    // Draw dealer score (only if no hidden cards)
    if (!dealerHand.some(c => c.hidden)) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(getHandValue(dealerHand).toString(), CANVAS_WIDTH / 2, 150);
    }
  }

  // Draw player area label
  ctx.fillStyle = '#fff';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PLAYER', CANVAS_WIDTH / 2, 185);

  // Draw player hand
  if (playerHand.length > 0) {
    const playerX = (CANVAS_WIDTH - (playerHand.length * (CARD_WIDTH + CARD_SPACING) - CARD_SPACING)) / 2;
    for (let i = 0; i < playerHand.length; i++) {
      drawCard(playerHand[i], playerX + i * (CARD_WIDTH + CARD_SPACING), 200);
    }

    // Draw player score
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(getHandValue(playerHand).toString(), CANVAS_WIDTH / 2, 305);
  }

  // Draw result message
  if (resultMessage) {
    ctx.fillStyle = '#fd0';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(resultMessage, CANVAS_WIDTH / 2, 355);
  }

  // Draw betting info in betting state
  if (gameState === 'betting') {
    ctx.fillStyle = '#fd0';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('W/S or UP/DOWN: +/- $10', CANVAS_WIDTH / 2, 150);
    ctx.fillText('A/D or LEFT/RIGHT: +/- $50', CANVAS_WIDTH / 2, 175);
    ctx.fillText('CURRENT BET: $' + currentBet, CANVAS_WIDTH / 2, 220);

    // Draw chip stacks visualization
    drawChipStack(CANVAS_WIDTH / 2, 280, currentBet);
  }

  // Draw action hints during play
  if (gameState === 'playing') {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    const canDouble = playerHand.length === 2 && chips >= currentBet;
    ctx.fillText('W/UP: Hit   S/DOWN: Stand' + (canDouble ? '   E: Double' : ''), CANVAS_WIDTH / 2, 380);
  }
}

function drawCard(card, x, y) {
  // Card background - white rounded rectangle
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;

  // Draw rounded rectangle
  const radius = 5;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + CARD_WIDTH - radius, y);
  ctx.quadraticCurveTo(x + CARD_WIDTH, y, x + CARD_WIDTH, y + radius);
  ctx.lineTo(x + CARD_WIDTH, y + CARD_HEIGHT - radius);
  ctx.quadraticCurveTo(x + CARD_WIDTH, y + CARD_HEIGHT, x + CARD_WIDTH - radius, y + CARD_HEIGHT);
  ctx.lineTo(x + radius, y + CARD_HEIGHT);
  ctx.quadraticCurveTo(x, y + CARD_HEIGHT, x, y + CARD_HEIGHT - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (card.hidden) {
    // Draw card back - blue with pattern
    ctx.fillStyle = '#22c';
    ctx.fillRect(x + 4, y + 4, CARD_WIDTH - 8, CARD_HEIGHT - 8);

    // Diamond pattern
    ctx.strokeStyle = '#118';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 8; j++) {
        const cx = x + 10 + i * 8;
        const cy = y + 10 + j * 9;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 3);
        ctx.lineTo(cx + 3, cy);
        ctx.lineTo(cx, cy + 3);
        ctx.lineTo(cx - 3, cy);
        ctx.closePath();
        ctx.stroke();
      }
    }
    return;
  }

  // Get suit color and symbol
  const color = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];

  // Draw value and suit in top-left
  ctx.fillStyle = color;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(card.value, x + 5, y + 16);
  ctx.font = '14px serif';
  ctx.fillText(symbol, x + 5, y + 30);

  // Draw value and suit in bottom-right (upside down)
  ctx.save();
  ctx.translate(x + CARD_WIDTH - 5, y + CARD_HEIGHT - 8);
  ctx.rotate(Math.PI);
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(card.value, 0, 0);
  ctx.font = '14px serif';
  ctx.fillText(symbol, 0, 14);
  ctx.restore();

  // Draw large center suit symbol
  ctx.font = 'bold 32px serif';
  ctx.textAlign = 'center';
  ctx.fillText(symbol, x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2 + 10);
}

function drawChipStack(x, y, amount) {
  const chipColors = ['#e22', '#0a0', '#22e', '#222', '#808'];
  const chipValues = [5, 25, 50, 100, 500];

  let remaining = amount;
  let stackX = x - 60;

  for (let i = chipValues.length - 1; i >= 0; i--) {
    const count = Math.floor(remaining / chipValues[i]);
    remaining %= chipValues[i];

    for (let j = 0; j < Math.min(count, 5); j++) {
      // Draw chip
      ctx.fillStyle = chipColors[i];
      ctx.beginPath();
      ctx.ellipse(stackX, y - j * 4, 18, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Chip edge
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(stackX, y - j * 4, 18, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (count > 0) stackX += 45;
  }
}

function gameLoop() {
  draw();
  requestAnimationFrame(gameLoop);
}

// Initialize
updateHUD();
gameLoop();
