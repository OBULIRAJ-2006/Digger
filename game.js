// ==================================================================
// Initialization and Asset Loading
// ==================================================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 600;

const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");
const gameScreen = document.getElementById("gameScreen");
const scoreDisplay = document.getElementById("scoreDisplay");
const restartButton = document.getElementById("restartButton");

// Load Images
const diggerImg = new Image();
diggerImg.src = "digger.png";  // Player sprite
const enemyImg = new Image();
enemyImg.src = "enemy.png";    // Enemy sprite (provide your own)
const goldImg = new Image();
goldImg.src = "gold.png";      // Gold bag sprite
const emeraldImg = new Image();
emeraldImg.src = "emerald.png"; // Emerald sprite

// Load Sound Effects (ensure files exist)
const soundMove = new Audio("move.mp3");
const soundCollect = new Audio("collect.mp3");
const soundEnemyHit = new Audio("hit.mp3");
const soundFire = new Audio("fire.mp3");
const soundPowerUp = new Audio("powerup.mp3");

// ==================================================================
// Game State and Terrain Setup
// ==================================================================
let score = 0;
let gameOver = false;

// Terrain grid (each cell 40x40)
const cellSize = 40;
const cols = canvas.width / cellSize;
const rows = canvas.height / cellSize;
let terrain = [];

// Initialize terrain (true = dirt present)
function initTerrain() {
  terrain = [];
  for (let r = 0; r < rows; r++) {
    terrain[r] = [];
    for (let c = 0; c < cols; c++) {
      terrain[r][c] = true;
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

// ==================================================================
// Game Objects
// ==================================================================
let player = {
  x: 50,
  y: 50,
  width: 32,
  height: 32,
  speed: 4,
  baseSpeed: 4,
  dx: 0,
  dy: 0,
  sprite: diggerImg,
  powerupTime: 0,
  lastDirection: { x: 1, y: 0 }
};

let enemies = [];
let emeralds = [];
let goldBags = [];
let powerups = [];
let bullets = [];

// ==================================================================
// Spawning Functions
// ==================================================================

// Spawn exactly 10 emeralds
function spawnEmeralds() {
  emeralds = [];
  let count = 0;
  while (count < 10) {
    let col = Math.floor(Math.random() * cols);
    let row = Math.floor(Math.random() * rows);
    if (!terrain[row][col]) {
      emeralds.push({
        x: col * cellSize + (cellSize - 16) / 2,
        y: row * cellSize + (cellSize - 16) / 2,
        width: 16,
        height: 16,
        collected: false
      });
      count++;
    }
  }
}

// Spawn exactly 3 gold bags that remain until ground is dug below
function spawnGoldBags() {
  goldBags = [];
  let count = 0;
  while (count < 3) {
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
      count++;
    }
  }
}

// Spawn enemy: maximum 3 per round; spawn enemy in a single cell away from player
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

// Spawn power-up (speed boost)
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
// Drawing Functions
// ==================================================================

// Draw terrain: only draw cells with dirt
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

// Draw player using sprite
function drawPlayer() {
  ctx.drawImage(player.sprite, player.x, player.y, player.width, player.height);
}

// Draw enemies
function drawEnemies() {
  enemies.forEach(enemy => {
    ctx.drawImage(enemyImg, enemy.x, enemy.y, enemy.width, enemy.height);
  });
}

// Draw emeralds
function drawEmeralds() {
  emeralds.forEach(e => {
    if (!e.collected) {
      ctx.drawImage(emeraldImg, e.x, e.y, e.width, e.height);
    }
  });
}

// Draw gold bags
function drawGoldBags() {
  goldBags.forEach(bag => {
    ctx.drawImage(goldImg, bag.x, bag.y, bag.width, bag.height);
  });
}

// Draw power-ups
function drawPowerups() {
  powerups.forEach(pu => {
    ctx.fillStyle = "cyan";
    ctx.fillRect(pu.x, pu.y, pu.width, pu.height);
  });
}

// Draw bullets
function drawBullets() {
  ctx.fillStyle = "white";
  bullets.forEach(b => {
    ctx.fillRect(b.x, b.y, b.width, b.height);
  });
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
  if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
  if (player.y < 0) player.y = 0;
  if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
  // Update last movement direction
  if (player.dx !== 0 || player.dy !== 0) {
    player.lastDirection.x = player.dx !== 0 ? player.dx / Math.abs(player.dx) : player.lastDirection.x;
    player.lastDirection.y = player.dy !== 0 ? player.dy / Math.abs(player.dy) : player.lastDirection.y;
  }
  // Dig the cell under player's center
  let col = Math.floor((player.x + player.width / 2) / cellSize);
  let row = Math.floor((player.y + player.height / 2) / cellSize);
  if (row >= 0 && row < rows && col >= 0 && col < cols) {
    terrain[row][col] = false;
  }
}

// Update enemies: they only move on dug terrain
function updateEnemies() {
  enemies.forEach(enemy => {
    let dx = 0, dy = 0;
    // Only move if the next cell is already dug
    if (enemy.x < player.x && !cellBlocked(enemy.x + enemy.speed, enemy.y)) dx = enemy.speed;
    else if (enemy.x > player.x && !cellBlocked(enemy.x - enemy.speed, enemy.y)) dx = -enemy.speed;
    if (enemy.y < player.y && !cellBlocked(enemy.x, enemy.y + enemy.speed)) dy = enemy.speed;
    else if (enemy.y > player.y && !cellBlocked(enemy.x, enemy.y - enemy.speed)) dy = -enemy.speed;
    enemy.x += dx;
    enemy.y += dy;
    if (isColliding(player, enemy)) {
      gameOver = true;
      soundEnemyHit.play();
    }
  });
}

// Check if a point is blocked (i.e. cell is not dug)
function cellBlocked(x, y) {
  let col = Math.floor(x / cellSize);
  let row = Math.floor(y / cellSize);
  if (row >= 0 && row < rows && col >= 0 && col < cols) {
    return terrain[row][col];
  }
  return true;
}

// Update bullets: move and check collisions with enemies
function updateBullets() {
  bullets.forEach((bullet, index) => {
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;
    if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
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

// Update gold bags: they fall only when the cell below is dug
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
      if (bag.y + bag.height >= canvas.height) {
        bag.y = canvas.height - bag.height;
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

// Update power-ups: apply effect if collected
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
// Collision Detection
// ==================================================================
function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTerrain();
  drawEmeralds();
  drawGoldBags();
  drawPowerups();
  drawEnemies();
  drawBullets();
  drawPlayer();
  
  // Check win condition: all emeralds collected
  let allCollected = emeralds.every(e => e.collected);
  if (allCollected) {
    gameOver = true;
    alert("Level Complete! You collected all emeralds!");
    // You could load a new level here instead.
    endGame();
    return;
  }
  
  requestAnimationFrame(gameLoop);
}

// ==================================================================
// Additional Drawing Functions
// ==================================================================
function drawEmeralds() {
  emeralds.forEach(e => {
    if (!e.collected) {
      ctx.drawImage(emeraldImg, e.x, e.y, e.width, e.height);
    }
  });
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
  restartButton.style.display = "block";
  gameScreen.style.display = "none";
}

function resetGame() {
  score = 0;
  scoreDisplay.innerText = "Score: " + score;
  gameOver = false;
  player.x = 50;
  player.y = 50;
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
  restartButton.style.display = "none";
  gameScreen.style.display = "block";
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

// On-screen mobile controls
document.getElementById("upBtn").addEventListener("touchstart", () => { player.dy = -player.speed; });
document.getElementById("upBtn").addEventListener("touchend", () => { player.dy = 0; });
document.getElementById("downBtn").addEventListener("touchstart", () => { player.dy = player.speed; });
document.getElementById("downBtn").addEventListener("touchend", () => { player.dy = 0; });
document.getElementById("leftBtn").addEventListener("touchstart", () => { player.dx = -player.speed; });
document.getElementById("leftBtn").addEventListener("touchend", () => { player.dx = 0; });
document.getElementById("rightBtn").addEventListener("touchstart", () => { player.dx = player.speed; });
document.getElementById("rightBtn").addEventListener("touchend", () => { player.dx = 0; });
document.getElementById("fireButton").addEventListener("touchstart", () => { fireBullet(); });

// ==================================================================
// Start and Restart Handlers
// ==================================================================
startButton.addEventListener("click", () => {
  startScreen.style.display = "none";
  gameScreen.style.display = "block";
  initTerrain();
  generateTunnel();
  spawnEmeralds();
  spawnGoldBags();
  spawnPowerups();
  spawnEnemy();
  gameLoop();
});

restartButton.addEventListener("click", resetGame);

// ==================================================================
// Additional Enemy Spawn Timer (Spawn new enemy every 15 seconds if less than 3 exist)
// ==================================================================
setInterval(() => { if (!gameOver && enemies.length < 3) { spawnEnemy(); } }, 15000);