// ==================================================================
// Game Variables and Initialization
// ==================================================================
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const gameScreen = document.getElementById('gameScreen');
const gameContainer = document.getElementById('gameContainer');
const gameCanvas = document.getElementById('gameCanvas');
const ctx = gameCanvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const restartButton = document.getElementById('restartButton');

gameCanvas.width = 800;
gameCanvas.height = 600;

let gameRunning = false;
let score = 0;
let gameOver = false;

// ==================================================================
// Asset Loading (Images and Sounds)
// ==================================================================
const diggerSprite = new Image();
diggerSprite.src = "digger.png"; // 32x32 pixel art for player

// Sound placeholders (ensure these files exist)
const soundMove = new Audio("move.mp3");
const soundCollect = new Audio("collect.mp3");
const soundEnemyHit = new Audio("hit.mp3");
const soundFire = new Audio("fire.mp3");
const soundPowerUp = new Audio("powerup.mp3");

// ==================================================================
// Game Objects and Level Data
// ==================================================================
const cellSize = 40;
const cols = gameCanvas.width / cellSize;
const rows = gameCanvas.height / cellSize;
let terrain = [];

// Initialize terrain (all cells filled with "dirt")
function initTerrain() {
  terrain = [];
  for (let r = 0; r < rows; r++) {
    terrain[r] = [];
    for (let c = 0; c < cols; c++) {
      terrain[r][c] = true; // true = dirt present
    }
  }
}

// Generate a random tunnel (clear cells) across the grid
function generateTunnel() {
  let currentRow = Math.floor(Math.random() * rows);
  for (let c = 0; c < cols; c++) {
    terrain[currentRow][c] = false;
    if (Math.random() < 0.3) {
      if (currentRow > 0 && Math.random() < 0.5) currentRow--;
      else if (currentRow < rows - 1) currentRow++;
    }
  }
}

// Player Object
let player = {
  x: 0,
  y: 0,
  width: 32,
  height: 32,
  speed: 4,
  baseSpeed: 4,
  dx: 0,
  dy: 0,
  sprite: diggerSprite,
  powerupTime: 0,
  lastDirection: { x: 1, y: 0 }
};

// Arrays for enemies, collectibles, gold bags, power-ups, and bullets
let enemies = [];
let emeralds = [];    // Collectible emeralds
let goldBags = [];    // Falling gold bags
let powerups = [];
let bullets = [];

// ==================================================================
// Helper Functions
// ==================================================================

// Draw Terrain (dirt cells)
function drawTerrain() {
  ctx.fillStyle = "#654321";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (terrain[r][c]) {
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }
  }
}

// Player digs terrain as they move
function digTerrain() {
  let col = Math.floor((player.x + player.width/2) / cellSize);
  let row = Math.floor((player.y + player.height/2) / cellSize);
  if (row >= 0 && row < rows && col >= 0 && col < cols) {
    terrain[row][col] = false;
  }
}

// Draw Player
function drawPlayer() {
  ctx.drawImage(player.sprite, player.x, player.y, player.width, player.height);
}

// Draw Enemies
function drawEnemies() {
  ctx.fillStyle = "red";
  enemies.forEach(enemy => {
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
  });
}

// Draw Emeralds
function drawEmeralds() {
  ctx.fillStyle = "lime";
  emeralds.forEach(e => {
    ctx.fillRect(e.x, e.y, e.width, e.height);
  });
}

// Draw Gold Bags
function drawGoldBags() {
  ctx.fillStyle = "gold";
  goldBags.forEach(bag => {
    ctx.fillRect(bag.x, bag.y, bag.width, bag.height);
  });
}

// Draw Power-ups
function drawPowerups() {
  ctx.fillStyle = "cyan";
  powerups.forEach(pu => {
    ctx.fillRect(pu.x, pu.y, pu.width, pu.height);
  });
}

// Draw Bullets
function drawBullets() {
  ctx.fillStyle = "white";
  bullets.forEach(b => {
    ctx.fillRect(b.x, b.y, b.width, b.height);
  });
}

// Collision detection
function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// ==================================================================
// Spawning Functions
// ==================================================================

// Spawn enemies on dug cells away from the player (max 3 per round)
function spawnEnemy() {
  if (enemies.length >= 3) return;
  let possible = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!terrain[r][c]) {
        let ex = c * cellSize + (cellSize - 32) / 2;
        let ey = r * cellSize + (cellSize - 32) / 2;
        if (Math.hypot(ex - player.x, ey - player.y) > 100) {
          possible.push({ r, c });
        }
      }
    }
  }
  if (possible.length > 0) {
    const cell = possible[Math.floor(Math.random() * possible.length)];
    enemies.push({
      x: cell.c * cellSize + (cellSize - 32) / 2,
      y: cell.r * cellSize + (cellSize - 32) / 2,
      width: 32,
      height: 32,
      speed: 1
    });
  }
}

// Spawn many emeralds (e.g., 10)
function spawnEmeralds() {
  emeralds = [];
  for (let i = 0; i < 10; i++) {
    let col = Math.floor(Math.random() * cols);
    let row = Math.floor(Math.random() * rows);
    if (!terrain[row][col]) {
      emeralds.push({
        x: col * cellSize + (cellSize - 16) / 2,
        y: row * cellSize + (cellSize - 16) / 2,
        width: 16,
        height: 16
      });
    }
  }
}

// Spawn gold bags (e.g., 3) that may fall if unsupported
function spawnGoldBags() {
  goldBags = [];
  for (let i = 0; i < 3; i++) {
    let col = Math.floor(Math.random() * cols);
    let row = Math.floor(Math.random() * rows);
    if (!terrain[row][col]) {
      goldBags.push({
        x: col * cellSize + (cellSize - 16) / 2,
        y: row * cellSize + (cellSize - 16) / 2,
        width: 16,
        height: 16,
        falling: false,
        vy: 0
      });
    }
  }
}

// Spawn power-ups (speed boost)
function spawnPowerups() {
  powerups = [];
  if (Math.random() < 0.5) {
    let col = Math.floor(Math.random() * cols);
    let row = Math.floor(Math.random() * rows);
    if (!terrain[row][col]) {
      powerups.push({
        x: col * cellSize + (cellSize - 16) / 2,
        y: row * cellSize + (cellSize - 16) / 2,
        width: 16,
        height: 16,
        type: "speed"
      });
    }
  }
}

// ==================================================================
// Update Functions
// ==================================================================

// Update player position and dig terrain
function updatePlayer() {
  player.x += player.dx;
  player.y += player.dy;
  // Boundary check
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > gameCanvas.width) player.x = gameCanvas.width - player.width;
  if (player.y < 0) player.y = 0;
  if (player.y + player.height > gameCanvas.height) player.y = gameCanvas.height - player.height;
  // Update last direction if moving
  if (player.dx !== 0 || player.dy !== 0) {
    player.lastDirection.x = player.dx !== 0 ? player.dx / Math.abs(player.dx) : player.lastDirection.x;
    player.lastDirection.y = player.dy !== 0 ? player.dy / Math.abs(player.dy) : player.lastDirection.y;
  }
  // Dig the terrain as the player moves
  digTerrain();
}

// Update enemies: move them toward player along dug cells
function updateEnemies() {
  enemies.forEach(enemy => {
    let dx = 0, dy = 0;
    if (enemy.x < player.x) dx = enemy.speed;
    else if (enemy.x > player.x) dx = -enemy.speed;
    if (enemy.y < player.y) dy = enemy.speed;
    else if (enemy.y > player.y) dy = -enemy.speed;
    enemy.x += dx;
    enemy.y += dy;
    if (isColliding(player, enemy)) {
      gameOver = true;
      soundEnemyHit.play();
    }
  });
}

// Update bullets: move them and check collisions with enemies
function updateBullets() {
  bullets.forEach((bullet, index) => {
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;
    if (bullet.x < 0 || bullet.x > gameCanvas.width || bullet.y < 0 || bullet.y > gameCanvas.height) {
      bullets.splice(index, 1);
    }
    enemies.forEach((enemy, eIndex) => {
      if (isColliding(bullet, enemy)) {
        enemies.splice(eIndex, 1);
        bullets.splice(index, 1);
        score += 20;
        scoreDisplay.innerText = "Score: " + score;
        soundEnemyHit.play();
      }
    });
  });
}

// Update gold bags: simulate falling if no support below
function updateGoldBags() {
  goldBags.forEach(bag => {
    let col = Math.floor(bag.x / cellSize);
    let row = Math.floor((bag.y + bag.height) / cellSize);
    if (row < rows && terrain[row][col] === false) {
      bag.falling = true;
    }
    if (bag.falling) {
      bag.vy += 0.2;
      bag.y += bag.vy;
      if (bag.y + bag.height >= gameCanvas.height) {
        bag.y = gameCanvas.height - bag.height;
        bag.vy = 0;
        bag.falling = false;
      }
      enemies.forEach((enemy, idx) => {
        if (isColliding(bag, enemy)) {
          enemies.splice(idx, 1);
          score += 20;
          scoreDisplay.innerText = "Score: " + score;
          soundEnemyHit.play();
        }
      });
    }
  });
}

// Update power-ups and apply their effects
function updatePowerups() {
  powerups.forEach((pu, index) => {
    if (isColliding(player, pu)) {
      powerups.splice(index, 1);
      if (pu.type === "speed") {
        player.speed = player.baseSpeed * 1.5;
        player.powerupTime = 300;
        soundPowerUp.play();
      }
    }
  });
  if (player.powerupTime > 0) {
    player.powerupTime--;
    if (player.powerupTime === 0) {
      player.speed = player.baseSpeed;
    }
  }
}

// ==================================================================
// Main Game Loop
// ==================================================================
function gameLoop() {
  if (gameOver) {
    endGame();
    return;
  }
  updatePlayer();
  updateEnemies();
  updateBullets();
  updateGoldBags();
  updatePowerups();
  ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
  drawTerrain();
  drawEmeralds();
  drawGoldBags();
  drawPowerups();
  drawEnemies();
  drawBullets();
  drawPlayer();
  requestAnimationFrame(gameLoop);
}

// ==================================================================
// Firing Mechanic
// ==================================================================
function fireBullet() {
  let bullet = {
    x: player.x + player.width / 2 - 4,
    y: player.y + player.height / 2 - 4,
    width: 8,
    height: 8,
    dx: player.lastDirection.x * 8,
    dy: player.lastDirection.y * 8
  };
  bullets.push(bullet);
  soundFire.play();
}

// ==================================================================
// Game Over and Restart
// ==================================================================
function endGame() {
  gameContainer.style.display = "none";
  gameOverScreen.style.display = "flex";
}

function restartGame() {
  score = 0;
  scoreDisplay.innerText = "Score: " + score;
  gameOver = false;
  player.x = 0;
  player.y = 0;
  player.dx = 0;
  player.dy = 0;
  player.speed = player.baseSpeed;
  player.powerupTime = 0;
  initTerrain();
  generateTunnel();
  spawnEmeralds();
  spawnGoldBags();
  spawnPowerups();
  enemies = [];
  bullets = [];
  spawnEnemy();
  gameOverScreen.style.display = "none";
  gameContainer.style.display = "block";
  gameLoop();
}

// ==================================================================
// Input Handling (Keyboard and On-screen Controls)
// ==================================================================
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") { player.dy = -player.speed; soundMove.play(); }
  if (e.key === "ArrowDown") { player.dy = player.speed; soundMove.play(); }
  if (e.key === "ArrowLeft") { player.dx = -player.speed; soundMove.play(); }
  if (e.key === "ArrowRight") { player.dx = player.speed; soundMove.play(); }
  if (e.key === " " || e.key.toLowerCase() === "f") { fireBullet(); }
});

document.addEventListener("keyup", (e) => {
  if (["ArrowUp", "ArrowDown"].includes(e.key)) player.dy = 0;
  if (["ArrowLeft", "ArrowRight"].includes(e.key)) player.dx = 0;
});

// On-screen controls for mobile
document.getElementById("upBtn").addEventListener("touchstart", () => { player.dy = -player.speed; });
document.getElementById("upBtn").addEventListener("touchend", () => { player.dy = 0; });
document.getElementById("downBtn").addEventListener("touchstart", () => { player.dy = player.speed; });
document.getElementById("downBtn").addEventListener("touchend", () => { player.dy = 0; });
document.getElementById("leftBtn").addEventListener("touchstart", () => { player.dx = -player.speed; });
document.getElementById("leftBtn").addEventListener("touchend", () => { player.dx = 0; });
document.getElementById("rightBtn").addEventListener("touchstart", () => { player.dx = player.speed; });
document.getElementById("rightBtn").addEventListener("touchend", () => { player.dx = 0; });
document.getElementById("fireBtn").addEventListener("touchstart", () => { fireBullet(); });

// ==================================================================
// Start and Restart Handlers
// ==================================================================
startButton.addEventListener("click", () => {
  startScreen.style.display = "none";
  gameContainer.style.display = "block";
  initTerrain();
  generateTunnel();
  spawnEmeralds();
  spawnGoldBags();
  spawnPowerups();
  spawnEnemy();
  gameLoop();
});

restartButton.addEventListener("click", restartGame);

// ==================================================================
// Additional Enemy Spawn Timer
// ==================================================================
setInterval(() => {
  if (!gameOver && enemies.length < 3) {
    spawnEnemy();
  }
}, 15000);