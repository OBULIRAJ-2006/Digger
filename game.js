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
diggerImg.src = "digger.png";
const enemyImg = new Image();
enemyImg.src = "enemy.png";
const goldImg = new Image();
goldImg.src = "gold.png";
const emeraldImg = new Image();
emeraldImg.src = "emerald.png";
const dugSandImg = new Image();
dugSandImg.src = "dug-sand.png";

// Load Sounds
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
let bulletCooldown = 0;
let shootSlowTimer = 0;

const cellSize = 40;
const cols = canvas.width / cellSize;
const rows = canvas.height / cellSize;
let terrain = [];
let tunnelRow = 0;

function initTerrain() {
  terrain = [];
  for (let r = 0; r < rows; r++) {
    terrain[r] = [];
    for (let c = 0; c < cols; c++) {
      terrain[r][c] = true; // true indicates undug dirt
    }
  }
}

function generateTunnel() {
  let currentRow = Math.floor(Math.random() * rows);
  for (let c = 0; c < cols; c++) {
    terrain[currentRow][c] = false;
    if (Math.random() < 0.3) {
      if (currentRow > 0 && Math.random() < 0.5) currentRow--;
      else if (currentRow < rows - 1) currentRow++;
      terrain[currentRow][c] = false;
    }
  }
  tunnelRow = currentRow;
}

// ==================================================================
// A* Pathfinding Helper Functions
// ==================================================================
function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function findPath(start, goal) {
  function key(node) { return `${node.x},${node.y}`; }
  let openSet = [start], cameFrom = {}, gScore = {}, fScore = {};
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let k = `${c},${r}`;
      gScore[k] = Infinity;
      fScore[k] = Infinity;
    }
  }

  gScore[key(start)] = 0;
  fScore[key(start)] = heuristic(start, goal);
  while (openSet.length > 0) {
    let current = openSet.reduce((a, b) => fScore[key(a)] < fScore[key(b)] ? a : b);
    if (current.x === goal.x && current.y === goal.y) {
      let path = [current];
      while (key(current) in cameFrom) {
        current = cameFrom[key(current)];
        path.push(current);
      }
      return path.reverse();
    }
    openSet = openSet.filter(n => !(n.x === current.x && n.y === current.y));
    let neighbors = [
      { x: current.x, y: current.y - 1 },
      { x: current.x, y: current.y + 1 },
      { x: current.x - 1, y: current.y },
      { x: current.x + 1, y: current.y }
    ];
    for (let neighbor of neighbors) {
      if (neighbor.x < 0 || neighbor.x >= cols || neighbor.y < 0 || neighbor.y >= rows) continue;
      if (terrain[neighbor.y][neighbor.x] === true) continue; // Walk only on dug cells
      let tentativeG = gScore[key(current)] + 1;
      if (tentativeG < gScore[key(neighbor)]) {
        cameFrom[key(neighbor)] = current;
        gScore[key(neighbor)] = tentativeG;
        fScore[key(neighbor)] = tentativeG + heuristic(neighbor, goal);
        if (!openSet.find(n => n.x === neighbor.x && n.y === neighbor.y)) {
          openSet.push(neighbor);
        }
      }
    }
  }
  return [];
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

function spawnGoldBags() {
  goldBags = [];
  let count = 0;
  while (count < 3) {
    let col = Math.floor(Math.random() * cols);
    let row = Math.floor(Math.random() * rows);
    goldBags.push({
      x: col * cellSize,
      y: row * cellSize,
      width: cellSize,
      height: cellSize,
      falling: false,
      vy: 0,
      startFallY: null
    });
    count++;
  }
}

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
    speed: 1,
    dx: 0,
    dy: 0
  });
}

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
function drawTerrain() {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (terrain[r][c]) {
        ctx.fillStyle = "#8B4513"; // Brown dirt
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      } else {
        ctx.drawImage(dugSandImg, c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }
  }
}

function drawPlayer() {
  ctx.drawImage(player.sprite, player.x, player.y, player.width, player.height);
}

function drawEnemies() {
  enemies.forEach(enemy => {
    ctx.drawImage(enemyImg, enemy.x, enemy.y, enemy.width, enemy.height);
  });
}

function drawEmeralds() {
  emeralds.forEach(e => {
    if (!e.collected) {
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = "lime";
      ctx.drawImage(emeraldImg, e.x, e.y, e.width, e.height);
      ctx.restore();
    }
  });
}

function drawGoldBags() {
  goldBags.forEach(bag => {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = "gold";
    ctx.drawImage(goldImg, bag.x, bag.y, bag.width, bag.height);
    ctx.restore();
  });
}

function drawPowerups() {
  powerups.forEach(pu => {
    ctx.save();
    if (pu.type === "speed") ctx.fillStyle = "orange";
    else if (pu.type === "shield") ctx.fillStyle = "lightblue";
    else if (pu.type === "firepower") ctx.fillStyle = "purple";
    ctx.shadowBlur = 8;
    ctx.shadowColor = ctx.fillStyle;
    ctx.fillRect(pu.x, pu.y, pu.width, pu.height);
    ctx.restore();
  });
}

function drawBullets() {
  ctx.fillStyle = "white";
  bullets.forEach(b => {
    ctx.fillRect(b.x, b.y, b.width, b.height);
  });
}

// ==================================================================
// Update Functions
// ==================================================================
function updatePlayer() {
  player.x += player.dx;
  player.y += player.dy;
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
  if (player.y < 0) player.y = 0;
  if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
  
  if (shootSlowTimer > 0) {
    player.speed = player.baseSpeed * 0.5;
    shootSlowTimer--;
  } else {
    player.speed = player.baseSpeed;
  }
  
  if (player.dx !== 0 || player.dy !== 0) {
    player.lastDirection = {
      x: player.dx !== 0 ? player.dx / Math.abs(player.dx) : 0,
      y: player.dy !== 0 ? player.dy / Math.abs(player.dy) : 0
    };
  }
  
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

// -------------------- Enhanced Enemy AI --------------------
// This version predicts the player's future position based on current velocity,
// computes an A* path toward that predicted cell, and moves along the path.
// If no path is found, it defaults to random movement.
function updateEnemies() {
  enemies.forEach(enemy => {
    let predictionFactor = 40;
    let predictedX = player.x + player.dx * predictionFactor;
    let predictedY = player.y + player.dy * predictionFactor;
    predictedX = Math.max(0, Math.min(canvas.width - player.width, predictedX));
    predictedY = Math.max(0, Math.min(canvas.height - player.height, predictedY));
    
    let start = { x: Math.floor(enemy.x / cellSize), y: Math.floor(enemy.y / cellSize) };
    let goal = { x: Math.floor((predictedX + player.width / 2) / cellSize), y: Math.floor((predictedY + player.height / 2) / cellSize) };
    let path = findPath(start, goal);
    
    if (path.length > 1) {
      let nextStep = path[1];
      let targetX = nextStep.x * cellSize;
      let targetY = nextStep.y * cellSize;
      let dx = targetX - enemy.x;
      let dy = targetY - enemy.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        enemy.x += (dx / dist) * enemy.speed;
        enemy.y += (dy / dist) * enemy.speed;
      }
    } else {
      enemy.dx = (Math.random() * 2 - 1) * enemy.speed;
      enemy.dy = (Math.random() * 2 - 1) * enemy.speed;
      let newX = enemy.x + enemy.dx;
      let newY = enemy.y + enemy.dy;
      if (!cellBlocked(newX, enemy.y)) enemy.x = newX;
      if (!cellBlocked(enemy.x, newY)) enemy.y = newY;
    }
    
    if (isColliding(player, enemy)) {
      if (player.shieldTime <= 0) {
        gameOver = true;
        soundEnemyHit.play();
      }
    }
  });
}
// -------------------------------------------------------------

function cellBlocked(x, y) {
  let col = Math.floor(x / cellSize);
  let row = Math.floor(y / cellSize);
  if (row < 0 || row >= rows || col < 0 || col >= cols) return true;
  return terrain[row][col];
}

function updateBullets() {
  bullets.forEach((bullet, index) => {
    let nextX = bullet.x + bullet.dx;
    let nextY = bullet.y + bullet.dy;
    let col = Math.floor(nextX / cellSize);
    let row = Math.floor(nextY / cellSize);
    if (row >= 0 && row < rows && col >= 0 && col < cols && terrain[row][col]) {
      bullets.splice(index, 1);
      return;
    }
    bullet.x = nextX;
    bullet.y = nextY;
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

function updateGoldBags() {
  goldBags.forEach(bag => {
    let col = Math.floor(bag.x / cellSize);
    let rowBelow = Math.floor((bag.y + bag.height) / cellSize);
    if (rowBelow < rows && terrain[rowBelow][col] === true) {
      bag.falling = false;
      bag.vy = 0;
      bag.startFallY = null;
    } else {
      if (!bag.falling) {
        bag.falling = true;
        bag.startFallY = bag.y;
      }
      bag.vy += 0.2;
      bag.y += bag.vy;
      if (bag.y + bag.height >= canvas.height) {
        bag.y = canvas.height - bag.height;
        bag.vy = 0;
        bag.falling = false;
      }
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

function isColliding(a, b) {
  return (a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y);
}

function updateBulletCooldown() {
  if (bulletCooldown > 0) bulletCooldown--;
}

function gameLoop() {
  if (gameOver) { endGame(); return; }
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
  
  let win = emeralds.every(e => e.collected);
  if (win) {
    gameOver = true;
    alert("You Won! All emeralds collected.");
    endGame();
    return;
  }
  
  requestAnimationFrame(gameLoop);
}

function drawEmeralds() {
  emeralds.forEach(e => {
    if (!e.collected) {
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = "lime";
      ctx.drawImage(emeraldImg, e.x, e.y, e.width, e.height);
      ctx.restore();
    }
  });
}

function fireBullet() {
  if (bulletCooldown > 0) return;
  let direction = { x: player.lastDirection.x, y: player.lastDirection.y };
  if (direction.x === 0 && direction.y === 0) { direction.x = -1; direction.y = 0; }
  let speedMultiplier = (player.firepowerTime > 0) ? 16 : 8;
  let bullet = {
    x: player.x + player.width / 2 - 4,
    y: player.y + player.height / 2 - 4,
    width: 8,
    height: 8,
    dx: direction.x * speedMultiplier,
    dy: direction.y * speedMultiplier
  };
  bullets.push(bullet);
  bulletCooldown = 60;
  shootSlowTimer = 30;
  soundFire.play();
}

function endGame() {
  if (!emeralds.every(e => e.collected)) { alert("Game Over! Digger was caught."); }
  restartButton.style.display = "block";
  gameScreen.style.display = "none";
}

function resetGame() {
  score = 0;
  scoreDisplay.innerText = "Score: " + score;
  gameOver = false;
  bulletCooldown = 0;
  shootSlowTimer = 0;
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

document.getElementById("upBtn").addEventListener("touchstart", () => { player.dy = -player.speed; });
document.getElementById("upBtn").addEventListener("touchend", () => { player.dy = 0; });
document.getElementById("downBtn").addEventListener("touchstart", () => { player.dy = player.speed; });
document.getElementById("downBtn").addEventListener("touchend", () => { player.dy = 0; });
document.getElementById("leftBtn").addEventListener("touchstart", () => { player.dx = -player.speed; });
document.getElementById("leftBtn").addEventListener("touchend", () => { player.dx = 0; });
document.getElementById("rightBtn").addEventListener("touchstart", () => { player.dx = player.speed; });
document.getElementById("rightBtn").addEventListener("touchend", () => { player.dx = 0; });
document.getElementById("fireButton").addEventListener("touchstart", () => { fireBullet(); });

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

setInterval(() => { if (!gameOver && enemies.length < 3) { spawnEnemy(); } }, 15000);
