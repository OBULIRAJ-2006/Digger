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
const cellSize = 40;
const cols = canvas.width / cellSize;
const rows = canvas.height / cellSize;
let terrain = [];
let tunnelRow = 0;

// Initialize terrain
function initTerrain() {
  terrain = [];
  for (let r = 0; r < rows; r++) {
    terrain[r] = [];
    for (let c = 0; c < cols; c++) {
      terrain[r][c] = true;
    }
  }
}

// Generate a tunnel for enemy movement
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
// Game Objects
// ==================================================================
let player = {
  x: 50,
  y: 50,
  width: 32,
  height: 32,
  speed: 2,  // Lowered speed
  baseSpeed: 2,
  dx: 0,
  dy: 0,
  sprite: diggerImg,
  shieldTime: 0,
};

let enemies = [];
let emeralds = [];
let goldBags = [];
let powerups = [];
let bullets = [];
let enemyBullets = [];

// ==================================================================
// Enemy AI - Random Movement and Shooting
// ==================================================================
function updateEnemies() {
  enemies.forEach(enemy => {
    if (Math.random() < 0.05) {  // 5% chance to change direction
      enemy.dx = (Math.random() < 0.5 ? -1 : 1) * enemy.speed;
      enemy.dy = (Math.random() < 0.5 ? -1 : 1) * enemy.speed;
    }
    
    let newX = enemy.x + enemy.dx;
    let newY = enemy.y + enemy.dy;
    
    if (!cellBlocked(newX, enemy.y)) enemy.x = newX;
    if (!cellBlocked(enemy.x, newY)) enemy.y = newY;

    if (Math.random() < 0.02) {  // 2% chance per frame to shoot
      enemyBullets.push({
        x: enemy.x + enemy.width / 2 - 2,
        y: enemy.y + enemy.height / 2,
        width: 4,
        height: 10,
        dy: Math.random() < 0.5 ? -4 : 4 // Shoot up or down randomly
      });
      soundFire.play();
    }

    if (isColliding(player, enemy)) {
      if (player.shieldTime <= 0) {
        gameOver = true;
        soundEnemyHit.play();
      }
    }
  });
}

// ==================================================================
// Bullet Handling (Player & Enemy)
// ==================================================================
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

  enemyBullets.forEach((bullet, index) => {
    bullet.y += bullet.dy;

    if (bullet.y < 0 || bullet.y > canvas.height) {
      enemyBullets.splice(index, 1);
    }

    if (isColliding(player, bullet)) {
      if (player.shieldTime <= 0) {
        gameOver = true;
        soundEnemyHit.play();
      }
      enemyBullets.splice(index, 1);
    }
  });
}

// ==================================================================
// Rendering Functions
// ==================================================================
function drawEnemies() {
  enemies.forEach(enemy => {
    ctx.drawImage(enemyImg, enemy.x, enemy.y, enemy.width, enemy.height);
  });
}

function drawBullets() {
  ctx.fillStyle = "white";
  bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

  ctx.fillStyle = "red";
  enemyBullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));
}

// ==================================================================
// Utility Functions
// ==================================================================
function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function cellBlocked(x, y) {
  let col = Math.floor(x / cellSize);
  let row = Math.floor(y / cellSize);
  if (row < 0 || row >= rows || col < 0 || col >= cols) return true;
  return terrain[row][col];
}

// ==================================================================
// Game Loop
// ==================================================================
function update() {
  if (gameOver) return;
  updateEnemies();
  updateBullets();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawEnemies();
  drawBullets();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// ==================================================================
// Start Game
// ==================================================================
function startGame() {
  gameOver = false;
  score = 0;
  scoreDisplay.innerText = "Score: " + score;
  initTerrain();
  generateTunnel();
  enemies = [{ x: 700, y: tunnelRow * cellSize, width: 32, height: 32, speed: 1, dx: 0, dy: 0 }];
  bullets = [];
  enemyBullets = [];
  gameLoop();
}

// Attach start button event
startButton.addEventListener("click", () => {
  startScreen.style.display = "none";
  gameScreen.style.display = "block";
  startGame();
});

// Attach restart button event
restartButton.addEventListener("click", () => {
  startGame();
});