// ===============================
// Initialization & Asset Loading
// ===============================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
ctx.imageSmoothingEnabled = false;

// DOM elements
const startScreen = document.getElementById("startScreen");
const startBtn = document.getElementById("startBtn");
const gameOverScreen = document.getElementById("gameOver");
const restartBtn = document.getElementById("restartBtn");
const levelUpScreen = document.getElementById("levelUp");
const nextLevelBtn = document.getElementById("nextLevelBtn");
const hud = document.getElementById("hud");
const scoreDisplay = document.getElementById("score");
const livesDisplay = document.getElementById("lives");
const finalScoreDisplay = document.getElementById("finalScore");

// Load Images
const images = {
  player: new Image(),
  enemy: new Image(),
  gold: new Image(),
  emerald: new Image(),
  dugSand: new Image()
};
images.player.src = "digger.png";
images.enemy.src = "enemy.png";
images.gold.src = "gold.png";
images.emerald.src = "emerald.png";
images.dugSand.src = "dug-sand.png";

// Load Sounds (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const sounds = {};
function loadSound(name, url) {
  fetch(url).then(res => res.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data, buffer => sounds[name] = buffer));
}
function playSound(name) {
  let buffer = sounds[name];
  if (!buffer) return;
  let src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(audioCtx.destination);
  src.start(0);
}
loadSound('move', 'move.mp3');
loadSound('coin', 'coin.mp3');
loadSound('fire', 'fire.mp3');
loadSound('boom', 'boom.mp3');
loadSound('powerup', 'powerup.mp3');

// ===============================
// Game State Variables
// ===============================
const cellSize = 40;
let currentLevel, score, lives, gameState, lastTime;
let map = [], coinMap = [], enemies = [], bullets = [], powerUps = [], player;
const STATE_MENU = 0, STATE_PLAY = 1, STATE_LEVELUP = 2, STATE_GAMEOVER = 3;

// ===============================
// Player Class
// ===============================
class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.size = 32;
    this.speed = 150;
    this.baseSpeed = 150;
    this.direction = 'right';
    this.fireCooldown = 0;
    this.shield = false;
    this.multiFire = false;
    this.speedBoost = false;
  }
  update(dt) {
    let moveX = 0, moveY = 0;
    if (keys['ArrowUp'] || touchDir === 'up') { moveY = -1; this.direction = 'up'; }
    if (keys['ArrowDown'] || touchDir === 'down') { moveY = 1; this.direction = 'down'; }
    if (keys['ArrowLeft'] || touchDir === 'left') { moveX = -1; this.direction = 'left'; }
    if (keys['ArrowRight'] || touchDir === 'right') { moveX = 1; this.direction = 'right'; }
    if (moveX !== 0 && moveY !== 0) { moveX *= 0.7071; moveY *= 0.7071; }
    let vel = this.speed * (this.speedBoost ? 1.5 : 1);
    this.x += moveX * vel * dt;
    this.y += moveY * vel * dt;
    this.x = Math.max(0, Math.min(CANVAS_WIDTH - this.size, this.x));
    this.y = Math.max(0, Math.min(CANVAS_HEIGHT - this.size, this.y));
    // Dig tile under player
    let tileX = Math.floor((this.x + this.size/2) / cellSize);
    let tileY = Math.floor((this.y + this.size/2) / cellSize);
    if (map[tileY] && map[tileY][tileX] === 1) {
      map[tileY][tileX] = 0;
      if (coinMap[tileY][tileX]) {
        score += 100;
        playSound('coin');
        coinMap[tileY][tileX] = 0;
      }
    }
    // Shooting
    if ((keys[' '] || touchFire) && this.fireCooldown <= 0) {
      this.shoot();
      this.fireCooldown = this.multiFire ? 0.2 : 0.5;
    }
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
  }
  draw() {
    if (images.player && images.player.complete) {
      ctx.drawImage(images.player, this.x, this.y, this.size, this.size);
    } else {
      ctx.fillStyle = 'yellow';
      ctx.fillRect(this.x, this.y, this.size, this.size);
    }
    if (this.shield) {
      ctx.strokeStyle = 'cyan';
      ctx.lineWidth = 3;
      ctx.strokeRect(this.x-2, this.y-2, this.size+4, this.size+4);
    }
  }
  shoot() {
    let bx = this.x + this.size/2, by = this.y + this.size/2, speed = 450;
    let dx = 0, dy = 0;
    if (this.direction === 'up') dy = -1;
    if (this.direction === 'down') dy = 1;
    if (this.direction === 'left') dx = -1;
    if (this.direction === 'right') dx = 1;
    if (dx !== 0 || dy !== 0) {
      bullets.push(new Bullet(bx, by, dx*speed, dy*speed));
      if (this.multiFire) {
        bullets.push(new Bullet(bx, by, dx*speed - dy*speed, dy*speed + dx*speed));
        bullets.push(new Bullet(bx, by, dx*speed + dy*speed, dy*speed - dx*speed));
      }
      playSound('fire');
    }
  }
}

// ===============================
// Enemy, Bullet, PowerUp Classes
// ===============================
class Enemy {
  constructor(x, y) {
    this.x = x; this.y = y; this.size = 32;
    this.speed = 70 + currentLevel*10;
    this.dirX = 0; this.dirY = 0;
  }
  update(dt) {
    let angle = Math.atan2(player.y - this.y, player.x - this.x);
    this.dirX = Math.cos(angle);
    this.dirY = Math.sin(angle);
    this.x += this.dirX * this.speed * dt;
    this.y += this.dirY * this.speed * dt;
    this.x = Math.max(0, Math.min(CANVAS_WIDTH - this.size, this.x));
    this.y = Math.max(0, Math.min(CANVAS_HEIGHT - this.size, this.y));
    // Dig tile
    let tileX = Math.floor((this.x + this.size/2) / cellSize);
    let tileY = Math.floor((this.y + this.size/2) / cellSize);
    if (map[tileY] && map[tileY][tileX] === 1) map[tileY][tileX] = 0;
    // Collision with player
    if (!player.shield && Math.abs(this.x - player.x) < this.size && Math.abs(this.y - player.y) < this.size) {
      lives--;
      playSound('boom');
      if (lives <= 0) showGameOver();
      else spawnPlayer();
    }
  }
  draw() {
    if (images.enemy && images.enemy.complete) {
      ctx.drawImage(images.enemy, this.x, this.y, this.size, this.size);
    } else {
      ctx.fillStyle = 'red';
      ctx.fillRect(this.x, this.y, this.size, this.size);
    }
  }
}
class Bullet {
  constructor(x, y, vx, vy) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy; this.size = 8; this.dead = false;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < 0 || this.y < 0 || this.x > CANVAS_WIDTH || this.y > CANVAS_HEIGHT) this.dead = true;
    for (let i = enemies.length - 1; i >= 0; i--) {
      let e = enemies[i];
      if (Math.abs(this.x - e.x) < e.size && Math.abs(this.y - e.y) < e.size) {
        enemies.splice(i, 1);
        this.dead = true;
        playSound('boom');
        score += 500;
        break;
      }
    }
  }
  draw() {
    ctx.fillStyle = 'orange';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, 2*Math.PI);
    ctx.fill();
  }
}
class PowerUp {
  constructor(x, y, type) {
    this.x = x; this.y = y; this.type = type; this.size = 24; this.collected = false;
  }
  update(dt) {
    if (Math.abs(player.x - this.x) < player.size && Math.abs(player.y - this.y) < player.size) {
      this.apply();
      this.collected = true;
    }
  }
  apply() {
    playSound('powerup');
    if (this.type === 'speed') {
      player.speedBoost = true; setTimeout(() => player.speedBoost = false, 5000);
    } else if (this.type === 'shield') {
      player.shield = true; setTimeout(() => player.shield = false, 5000);
    } else if (this.type === 'fire') {
      player.multiFire = true; setTimeout(() => player.multiFire = false, 5000);
    }
  }
  draw() {
    ctx.fillStyle = (this.type === 'speed' ? 'blue' : (this.type === 'shield' ? 'cyan' : 'magenta'));
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}

// ===============================
// Input Handling
// ===============================
let keys = {}, touchDir = null, touchFire = false;
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);
document.getElementById('upBtn').addEventListener('touchstart', () => { touchDir = 'up'; });
document.getElementById('upBtn').addEventListener('touchend', () => { touchDir = null; });
document.getElementById('downBtn').addEventListener('touchstart', () => { touchDir = 'down'; });
document.getElementById('downBtn').addEventListener('touchend', () => { touchDir = null; });
document.getElementById('leftBtn').addEventListener('touchstart', () => { touchDir = 'left'; });
document.getElementById('leftBtn').addEventListener('touchend', () => { touchDir = null; });
document.getElementById('rightBtn').addEventListener('touchstart', () => { touchDir = 'right'; });
document.getElementById('rightBtn').addEventListener('touchend', () => { touchDir = null; });
document.getElementById('fireBtn').addEventListener('touchstart', () => { touchFire = true; });
document.getElementById('fireBtn').addEventListener('touchend', () => { touchFire = false; });

// ===============================
// Level & Map Initialization
// ===============================
function initLevel() {
  let cols = 15 + (currentLevel-1)*3;
  let rows = 12 + (currentLevel-1)*2;
  map = []; coinMap = []; enemies = []; bullets = []; powerUps = [];
  for (let y = 0; y < rows; y++) {
    map[y] = []; coinMap[y] = [];
    for (let x = 0; x < cols; x++) {
      map[y][x] = (x === 0 || y === 0 || x === cols-1 || y === rows-1) ? 0 : 1;
      coinMap[y][x] = 0;
    }
  }
  // Carve spawn areas
  map[1][1] = 0; map[1][2] = 0; map[2][1] = 0; map[2][2] = 0;
  map[rows-2][cols-2] = 0; map[rows-3][cols-2] = 0; map[rows-2][cols-3] = 0;
  // Place coins
  let coinCount = 5 + currentLevel*2;
  while (coinCount > 0) {
    let x = Math.floor(Math.random() * (cols-2)) + 1;
    let y = Math.floor(Math.random() * (rows-2)) + 1;
    if (map[y][x] === 1 && coinMap[y][x] === 0) {
      coinMap[y][x] = 1; coinCount--;
    }
  }
  spawnPlayer();
  for (let i = 0; i < currentLevel; i++) {
    let ex = (cols-2)*cellSize;
    let ey = (rows-2)*cellSize;
    enemies.push(new Enemy(ex, ey));
  }
  setTimeout(() => spawnPowerUp('speed'), 10000);
  setTimeout(() => spawnPowerUp('shield'), 20000);
  setTimeout(() => spawnPowerUp('fire'), 30000);
  updateHUD();
}
function spawnPlayer() {
  player = new Player(cellSize, cellSize);
}
function spawnPowerUp(type) {
  let rows = map.length, cols = map[0].length, x, y;
  do {
    x = Math.floor(Math.random()*(cols-2))+1;
    y = Math.floor(Math.random()*(rows-2))+1;
  } while (map[y][x] !== 0 || coinMap[y][x] !== 0);
  powerUps.push(new PowerUp(x*cellSize, y*cellSize, type));
}

// ===============================
// HUD & Screen Management
// ===============================
function updateHUD() {
  scoreDisplay.textContent = 'Score: ' + score;
  livesDisplay.textContent = 'Lives: ' + lives;
}
function showGameOver() {
  gameState = STATE_GAMEOVER;
  gameOverScreen.style.display = 'block';
  finalScoreDisplay.textContent = 'Final Score: ' + score;
  canvas.style.display = 'none';
  hud.style.display = 'none';
}
function allCoinsCollected() {
  for (let y = 0; y < coinMap.length; y++)
    for (let x = 0; x < coinMap[y].length; x++)
      if (coinMap[y][x] > 0) return false;
  return true;
}

// ===============================
// Drawing
// ===============================
function drawGame() {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] === 1) {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x*cellSize, y*cellSize, cellSize, cellSize);
      }
      if (coinMap[y][x] > 0) {
        ctx.fillStyle = 'gold';
        ctx.fillRect(x*cellSize+10, y*cellSize+10, 12, 12);
      }
    }
  }
  powerUps.forEach(p => p.draw());
  player.draw();
  enemies.forEach(e => e.draw());
  bullets.forEach(b => b.draw());
}

// ===============================
// Main Game Loop
// ===============================
function gameLoop() {
  if (gameState === STATE_PLAY) {
    let now = Date.now(), dt = (now - lastTime) / 1000;
    lastTime = now;
    player.update(dt);
    enemies.forEach(e => e.update(dt));
    bullets.forEach(b => b.update(dt));
    bullets = bullets.filter(b => !b.dead);
    powerUps.forEach(p => p.update(dt));
    powerUps = powerUps.filter(p => !p.collected);
    if (allCoinsCollected()) {
      gameState = STATE_LEVELUP;
      levelUpScreen.style.display = 'block';
      return;
    }
    drawGame();
    updateHUD();
    requestAnimationFrame(gameLoop);
  }
}

// ===============================
// Game Start & UI Events
// ===============================
function startLevel() {
  startScreen.style.display = 'none';
  gameOverScreen.style.display = 'none';
  levelUpScreen.style.display = 'none';
  canvas.style.display = 'block';
  hud.style.display = 'block';
  initLevel();
  gameState = STATE_PLAY;
  lastTime = Date.now();
  requestAnimationFrame(gameLoop);
}
function initGame() {
  startScreen.style.display = 'block';
  gameOverScreen.style.display = 'none';
  levelUpScreen.style.display = 'none';
  canvas.style.display = 'none';
  hud.style.display = 'none';
  startBtn.addEventListener('click', () => {
    currentLevel = 1;
    score = 0;
    lives = 3;
    startLevel();
  });
  nextLevelBtn.addEventListener('click', () => {
    levelUpScreen.style.display = 'none';
    if (currentLevel < 3) {
      currentLevel++;
      startLevel();
    } else showGameOver();
  });
  restartBtn.addEventListener('click', () => {
    gameOverScreen.style.display = 'none';
    startScreen.style.display = 'block';
  });
  updateHUD();
}

// ===============================
// Start the Game
// ===============================
window.onload = () => { initGame(); };