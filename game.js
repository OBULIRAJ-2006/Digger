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
const powerupDisplay = document.getElementById("powerupDisplay");

// Load Images
const diggerImg = new Image();
diggerImg.src = "digger.png"; // Player sprite
const enemyImg = new Image();
enemyImg.src = "enemy.png";   // Enemy sprite
const goldImg = new Image();
goldImg.src = "gold.png";     // Gold bag sprite
const emeraldImg = new Image();
emeraldImg.src = "emerald.png"; // Emerald sprite
const dugSandImg = new Image();
dugSandImg.src = "dug-sand.png"; // Cleared sand image (40x40 px)

// Load Sounds (ensure these files exist)
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
let bulletCooldown = 0; // frames until next bullet can be fired (e.g., 60 = 1 second)

// Terrain grid: each cell is 40x40 pixels
const cellSize = 40;
const cols = canvas.width / cellSize;
const rows = canvas.height / cellSize;
let terrain = [];

// Global variable to store tunnel row for enemy spawn
let tunnelRow = 0;

// Initialize terrain: true = dirt is present
function initTerrain() {
  terrain = [];
  for (let r = 0; r < rows; r++) {
    terrain[r] = [];
    for (let c = 0; c < cols; c++) {
      terrain[r][c] = true;
    }
  }
}

// Generate a continuous tunnel from left to right (clearing cells)
// so the enemy has a clear path from its spawn to the player.
function generateTunnel() {
  let currentRow = Math.floor(Math.random() * rows);
  for (let c = 0; c < cols; c++) {
    terrain[currentRow][c] = false;
    // Allow slight vertical deviation for natural tunnel shape
    if (Math.random() < 0.3) {
      if (currentRow > 0 && Math.random() < 0.5) currentRow--;
      else if (currentRow < rows - 1) currentRow++;
      terrain[currentRow][c] = false;
    }
  }
  tunnelRow = currentRow;
}

// ==================================================================
// Game Objects
// ==================================================================
let player = {
  x: 50,
  y: 50,
  width: 32,
  height: 32,
  speed: 1,
  baseSpeed: 4,
  dx: 0,
  dy: 0,
  sprite: diggerImg,
  powerupTime: 0,
  shieldTime: 0,
  firepowerTime: 0,
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

// Spawn exactly 10 emeralds (placed randomly)
function spawnEmeralds() {
  emeralds = [];
  let count = 0;
  while (count < 10) {
    let col = Math.floor(Math.random() * cols);
    let row = Math.floor(Math.random() * rows);
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

// Spawn exactly 3 gold bags; they remain until the cell below is cleared, then fall
function spawnGoldBags() {
  goldBags = [];
  let count = 0;
  while (count < 3) {
    let col = Math.floor(Math.random() * cols);
    let row = Math.floor(Math.random() * rows);
    goldBags.push({
      x: col * cellSize + (cellSize - 16) / 2,
      y: row * cellSize + (cellSize - 16) / 2,
      width: 16,
      height: 16,
      falling: false,
      vy: 0,
      startFallY: null
    });
    count++;
  }
}

// Spawn enemy at a fixed location along the tunnel (top-right of tunnel)
function spawnEnemy() {
  if (enemies.length >= 3) return;
  let spawnX = canvas.width - cellSize - 10;
  let spawnY = tunnelRow * cellSize + (cellSize - 32) / 2;
  let col = Math.floor(spawnX / cellSize);
  let row = Math.floor(spawnY / cellSize);
  if (terrain[row][col]) terrain[row][col] = false;
  enemies.push({
    x: spawnX,
    y: spawnY,
    width: 32,
    height: 32,
    speed: 1
  });
}

// Spawn power-up: randomly choose one of three types: "speed", "shield", "firepower"
function spawnPowerups() {
  powerups = [];
  if (Math.random() < 0.5) {
    let col = Math.floor(Math.random() * cols);
    let row = Math.floor(Math.random() * rows);
    const types = ["speed", "shield", "firepower"];
    const type = types[Math.floor(Math.random() * types.length)];
    powerups.push({
      x: col * cellSize + (cellSize - 16) / 2,
      y: row * cellSize + (cellSize - 16) / 2,
      width: 16,
      height: 16,
      type: type
    });
  }
}

// ==================================================================
// Drawing Functions
// ==================================================================

// Draw terrain: if cell is still dirt, draw dug-sand transition
function drawTerrain() {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (terrain[r][c]) {
        // Draw undug sand as brown
        ctx.fillStyle = "#a0522d";
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      } else {
        // Draw cleared cell with dug-sand.png
        ctx.drawImage(dugSandImg, c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }
  }
}

// Draw player using sprite
function drawPlayer() {
  ctx.drawImage(player.sprite, player.x, player.y, player.width, player.height);
}

// Draw enemies using enemy sprite
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

// Draw power-ups with colors per type
function drawPowerups() {
  powerups.forEach(pu => {
    if (pu.type === "speed") ctx.fillStyle = "orange";
    else if (pu.type === "shield") ctx.fillStyle = "lightblue";
    else if (pu.type === "firepower") ctx.fillStyle = "purple";
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

// Update player: move, update last direction, dig terrain, collect emeralds
function updatePlayer() {
  player.x += player.dx;
  player.y += player.dy;
  // Boundary checks
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
  if (player.y < 0) player.y = 0;
  if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
  // Update last direction; default to left if no movement
  if (player.dx === 0 && player.dy === 0) {
    if (player.lastDirection.x === 0) player.lastDirection = { x: -1, y: 0 };
  } else {
    if (player.dx !== 0) {
      player.lastDirection.x = player.dx / Math.abs(player.dx);
      player.lastDirection.y = 0;
    }
  }
  // Dig the cell under player's center and collect emeralds
  let col = Math.floor((player.x + player.width / 2) / cellSize);
  let row = Math.floor((player.y + player.height / 2) / cellSize);
  if (row >= 0 && row < rows && col >= 0 && col < cols) {
    terrain[row][col] = false;
    emeralds.forEach(e => {
      let eCol = Math.floor(e.x / cellSize);
      let eRow = Math.floor(e.y / cellSize);
      if (eRow === row && eCol === col && !e.collected) {
        e.collected = true;
        score += 10;
        scoreDisplay.innerText = "Score: " + score;
        soundCollect.play();
      }
    });
  }
}

// Update enemies: use simple AI to follow the tunnel (move only on cleared cells)
function updateEnemies() {
  enemies.forEach(enemy => {
    let dx = 0, dy = 0;
    if (enemy.x < player.x && !cellBlocked(enemy.x + enemy.speed, enemy.y)) {
      dx = enemy.speed;
    } else if (enemy.x > player.x && !cellBlocked(enemy.x - enemy.speed, enemy.y)) {
      dx = -enemy.speed;
    }
    if (enemy.y < player.y && !cellBlocked(enemy.x, enemy.y + enemy.speed)) {
      dy = enemy.speed;
    } else if (enemy.y > player.y && !cellBlocked(enemy.x, enemy.y - enemy.speed)) {
      dy = -enemy.speed;
    }
    enemy.x += dx;
    enemy.y += dy;
    if (isColliding(player, enemy)) {
      if (player.shieldTime <= 0) {
        gameOver = true;
        soundEnemyHit.play();
      }
    }
  });
}

// Check if a point is blocked (cell still has dirt)
function cellBlocked(x, y) {
  let col = Math.floor(x / cellSize);
  let row = Math.floor(y / cellSize);
  if (row < 0 || row >= rows || col < 0 || col >= cols) return true;
  return terrain[row][col];
}

// Update bullets: move them and check collisions with enemies
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

// Update gold bags: remain still until the cell below is cleared, then fall
function updateGoldBags() {
  goldBags.forEach(bag => {
    let col = Math.floor(bag.x / cellSize);
    let row = Math.floor((bag.y + bag.height) / cellSize);
    if (row < rows && terrain[row][col] === false) {
      bag.falling = true;
      if (bag.startFallY === null) bag.startFallY = bag.y;
    }
    if (bag.falling) {
      bag.vy += 0.2;
      bag.y += bag.vy;
      if (bag.y + bag.height >= canvas.height) {
        bag.y = canvas.height - bag.height;
        bag.vy = 0;
        bag.falling = false;
      }
      // If bag has fallen more than 80px and collides with enemy or player
      if (bag.startFallY !== null && (bag.y - bag.startFallY > 80)) {
        enemies.forEach((enemy, idx) => {
          if (isColliding(bag, enemy)) {
            enemies.splice(idx, 1);
            score += 20;
            scoreDisplay.innerText = "Score: " + score;
            soundEnemyHit.play();
          }
        });
        if (isColliding(bag, player) && player.shieldTime <= 0) {
          gameOver = true;
          soundEnemyHit.play();
        }
      }
    }
  });
}

// Update power-ups: if collected, apply effect and display remaining time
function updatePowerups() {
  powerups.forEach((pu, index) => {
    if (isColliding(player, pu)) {
      powerups.splice(index, 1);
      if (pu.type === "speed") {
        player.speed = player.baseSpeed * 1.5;
        player.powerupTime = 300;
      } else if (pu.type === "shield") {
        player.shieldTime = 300;
      } else if (pu.type === "firepower") {
        player.firepowerTime = 300;
      }
      soundPowerUp.play();
    }
  });
  // Decrement timers and update display
  let displayText = "";
  if (player.powerupTime > 0) {
    player.powerupTime--;
    displayText += "Speed: " + Math.ceil(player.powerupTime/60) + "s ";
    if (player.powerupTime === 0) player.speed = player.baseSpeed;
  }
  if (player.shieldTime > 0) {
    player.shieldTime--;
    displayText += "Shield: " + Math.ceil(player.shieldTime/60) + "s ";
  }
  if (player.firepowerTime > 0) {
    player.firepowerTime--;
    displayText += "Firepower: " + Math.ceil(player.firepowerTime/60) + "s";
  }
  powerupDisplay.innerText = displayText;
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
// Bullet Cooldown Update
// ==================================================================
function updateBulletCooldown() {
  if (bulletCooldown > 0) bulletCooldown--;
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
  updateBulletCooldown();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTerrain();
  drawEmeralds();
  drawGoldBags();
  drawPowerups();
  drawEnemies();
  drawBullets();
  drawPlayer();
  
  // Check win condition: if all emeralds are collected
  let win = emeralds.every(e => e.collected);
  if (win) {
    gameOver = true;
    alert("You Won! All emeralds collected.");
    endGame();
    return;
  }
  
  requestAnimationFrame(gameLoop);
}

// ==================================================================
// Additional Drawing: Emeralds
// ==================================================================
function drawEmeralds() {
  emeralds.forEach(e => {
    if (!e.collected) {
      ctx.drawImage(emeraldImg, e.x, e.y, e.width, e.height);
    }
  });
}

// ==================================================================
// Firing Mechanic: Allow shooting in all four directions (default left if none)
// Also, enforce a bullet cooldown (e.g., 60 frames)
function fireBullet() {
  if (bulletCooldown > 0) return; // Cannot shoot yet
  let direction = { x: player.lastDirection.x, y: player.lastDirection.y };
  if (direction.x === 0 && direction.y === 0) {
    direction.x = -1;
    direction.y = -1;
  }
  let speedMultiplier = (player.firepowerTime > 0) ? 16 : 8;
  let bullet = {
    x: player.x + player.width / 2 - 4,
    y: player.y + player.height / 2 - 4,
    width: 8,
    height: 8,
    dx: direction.x * speedMultiplier,
    dy: direction.y * speedMultiplier,
  };
  bullets.push(bullet);
  bulletCooldown = 60; // Cooldown for approx 1 second at 60fps
  soundFire.play();
}

// ==================================================================
// Game Over and Restart Functions
// ==================================================================
function endGame() {
  if (!emeralds.every(e => e.collected)) {
    alert("Game Over! Digger was caught.");
  }
  restartButton.style.display = "block";
  gameScreen.style.display = "none";
}

function resetGame() {
  score = 0;
  scoreDisplay.innerText = "Score: " + score;
  gameOver = false;
  bulletCooldown = 0;
  player.x = 50;
  player.y = 50;
  player.dx = 0;
  player.dy = 0;
  player.speed = player.baseSpeed;
  player.powerupTime = 0;
  player.shieldTime = 0;
  player.firepowerTime = 0;
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
// Additional Enemy Spawn Timer (every 15 seconds if less than 3 enemies exist)
// ==================================================================
setInterval(() => { if (!gameOver && enemies.length < 3) { spawnEnemy(); } }, 15000);