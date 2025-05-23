const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const tileSize = 48;
const cols = Math.floor(canvas.width / tileSize);
const rows = Math.floor(canvas.height / tileSize);

// Start & end overlays
const startScreen = document.getElementById("startScreen");
const congratsScreen = document.getElementById("congratsScreen");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

startBtn.addEventListener("click", () => {
  startScreen.style.display = "none";
  initGame();
});

restartBtn.addEventListener("click", () => {
  congratsScreen.style.display = "none";
  initGame();
});

let map = [];
let player = { x: 1, y: 1, gold: 0 };
let enemies = [];
let goldCount = 0;

function initGame() {
  map = [];
  goldCount = 0;
  player = { x: 1, y: 1, gold: 0 };
  enemies = [];

  // Generate map
  for (let y = 0; y < rows; y++) {
    map[y] = [];
    for (let x = 0; x < cols; x++) {
      let tile = 0;
      if (Math.random() < 0.05) {
        tile = 2; // gold
        goldCount++;
      } else if (Math.random() < 0.05) {
        tile = 3; // rock
      }
      map[y][x] = tile;
    }
  }

  // Carve player's start
  map[player.y][player.x] = 1;

  // Add enemies
  for (let i = 0; i < 3; i++) {
    enemies.push({
      x: Math.floor(Math.random() * cols),
      y: Math.floor(Math.random() * rows),
    });
  }

  requestAnimationFrame(gameLoop);
}

function drawTile(x, y, type) {
  switch (type) {
    case 0:
      ctx.fillStyle = "#5c3d2e"; // Dirt
      break;
    case 1:
      ctx.fillStyle = "#d1cfcf"; // Dug path
      break;
    case 2:
      ctx.fillStyle = "gold";
      break;
    case 3:
      ctx.fillStyle = "gray";
      break;
  }
  ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
}

function drawPlayer() {
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.arc(
    player.x * tileSize + tileSize / 2,
    player.y * tileSize + tileSize / 2,
    tileSize / 3,
    0,
    2 * Math.PI
  );
  ctx.fill();
}

function drawEnemies() {
  ctx.fillStyle = "green";
  enemies.forEach((e) => {
    ctx.beginPath();
    ctx.arc(
      e.x * tileSize + tileSize / 2,
      e.y * tileSize + tileSize / 2,
      tileSize / 3,
      0,
      2 * Math.PI
    );
    ctx.fill();
  });
}

function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`Gold: ${player.gold}/${goldCount}`, 10, 30);
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw map
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      drawTile(x, y, map[y][x]);
    }
  }

  // Draw player & enemies
  drawPlayer();
  drawEnemies();
  drawHUD();

  // Win condition
  if (player.gold >= goldCount) {
    congratsScreen.style.display = "flex";
    return;
  }

  moveEnemies();
  checkEnemyCollision();

  requestAnimationFrame(gameLoop);
}

function checkEnemyCollision() {
  for (let enemy of enemies) {
    if (enemy.x === player.x && enemy.y === player.y) {
      alert("Game Over!");
      startScreen.style.display = "flex";
      return;
    }
  }
}

function moveEnemies() {
  for (let enemy of enemies) {
    let dx = player.x - enemy.x;
    let dy = player.y - enemy.y;

    let moveX = 0;
    let moveY = 0;

    if (Math.abs(dx) > Math.abs(dy)) {
      moveX = Math.sign(dx);
    } else {
      moveY = Math.sign(dy);
    }

    const newX = enemy.x + moveX;
    const newY = enemy.y + moveY;

    if (
      newX >= 0 &&
      newX < cols &&
      newY >= 0 &&
      newY < rows &&
      map[newY][newX] !== 3
    ) {
      enemy.x = newX;
      enemy.y = newY;
    }
  }
}

document.addEventListener("keydown", (e) => {
  let moved = false;

  let newX = player.x;
  let newY = player.y;

  if (e.key === "ArrowUp") newY--;
  if (e.key === "ArrowDown") newY++;
  if (e.key === "ArrowLeft") newX--;
  if (e.key === "ArrowRight") newX++;

  if (
    newX >= 0 &&
    newX < cols &&
    newY >= 0 &&
    newY < rows &&
    map[newY][newX] !== 3
  ) {
    player.x = newX;
    player.y = newY;

    // Dig and collect
    if (map[newY][newX] === 2) {
      player.gold++;
    }
    map[newY][newX] = 1;
  }
});