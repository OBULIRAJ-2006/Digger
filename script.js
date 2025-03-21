document.addEventListener("DOMContentLoaded", () => {
  // Setup canvas
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 800;
  canvas.height = 600;
  
  // Game state
  let score = 0;
  let gameOver = false;
  document.getElementById("scoreDisplay").innerText = "Score: " + score;
  
  // Terrain grid: cells of 40x40 pixels
  const cellSize = 40;
  const cols = canvas.width / cellSize;
  const rows = canvas.height / cellSize;
  let terrain = [];
  for (let r = 0; r < rows; r++) {
    terrain[r] = [];
    for (let c = 0; c < cols; c++) {
      terrain[r][c] = true; // true = dirt exists
    }
  }
  // Generate a random tunnel (clear cells) across the grid
  function generateTunnelPath() {
    let currentRow = Math.floor(Math.random() * rows);
    for (let c = 0; c < cols; c++) {
      terrain[currentRow][c] = false;
      if (Math.random() < 0.3) {
        if (currentRow > 0 && Math.random() < 0.5) currentRow--;
        else if (currentRow < rows - 1) currentRow++;
      }
    }
  }
  generateTunnelPath();
  
  // Load assets
  const diggerSprite = new Image();
  diggerSprite.src = "digger.png"; // 32x32 pixel art
  const soundMove = new Audio("move.mp3");
  const soundCollect = new Audio("collect.mp3");
  const soundEnemyHit = new Audio("hit.mp3");
  const soundFire = new Audio("fire.mp3");
  const soundPowerUp = new Audio("powerup.mp3");
  
  // Determine player's starting position near the tunnel's left edge:
  let startingRow = 0;
  for (let r = 0; r < rows; r++) {
    if (!terrain[r][0]) { startingRow = r; break; }
  }
  const player = {
    x: 0 * cellSize + (cellSize - 32) / 2,
    y: startingRow * cellSize + (cellSize - 32) / 2,
    width: 32,
    height: 32,
    baseSpeed: 4,
    speed: 4,
    dx: 0,
    dy: 0,
    sprite: diggerSprite,
    powerupTime: 0,
    lastDirection: { x: 1, y: 0 }
  };
  
  let enemies = [];
  let emeralds = [];    // collectibles (emeralds)
  let goldBags = [];    // gold bags that may fall
  let powerups = [];
  let bullets = [];
  
  // Spawn an enemy on a clear cell that is at least 100px away from the player, and limit to 3 at a time
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
  
  // Spawn collectibles: 10 emeralds and 3 gold bags
  function spawnCollectibles() {
    emeralds = [];
    goldBags = [];
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
  
  // Spawn power-up (speed boost)
  function spawnPowerup() {
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
  
  // Draw terrain (only cells with dirt)
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
  
  // Player "digs" by clearing the cell under its center
  function digTerrain() {
    let col = Math.floor((player.x + player.width/2) / cellSize);
    let row = Math.floor((player.y + player.height/2) / cellSize);
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      terrain[row][col] = false;
    }
  }
  
  // Drawing routines
  function drawPlayer() {
    ctx.drawImage(player.sprite, player.x, player.y, player.width, player.height);
  }
  function drawEnemies() {
    ctx.fillStyle = "red";
    enemies.forEach(enemy => {
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    });
  }
  function drawEmeralds() {
    ctx.fillStyle = "lime";
    emeralds.forEach(e => {
      ctx.fillRect(e.x, e.y, e.width, e.height);
    });
  }
  function drawGoldBags() {
    ctx.fillStyle = "gold";
    goldBags.forEach(bag => {
      ctx.fillRect(bag.x, bag.y, bag.width, bag.height);
    });
  }
  function drawPowerups() {
    ctx.fillStyle = "cyan";
    powerups.forEach(pu => {
      ctx.fillRect(pu.x, pu.y, pu.width, pu.height);
    });
  }
  function drawBullets() {
    ctx.fillStyle = "white";
    bullets.forEach(b => {
      ctx.fillRect(b.x, b.y, b.width, b.height);
    });
  }
  
  // Update bullets: movement and enemy collision
  function updateBullets() {
    bullets.forEach((b, i) => {
      b.x += b.dx;
      b.y += b.dy;
      if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
        bullets.splice(i, 1);
      }
      enemies.forEach((enemy, j) => {
        if (checkCollision(b, enemy)) {
          enemies.splice(j, 1);
          bullets.splice(i, 1);
          score += 20;
          document.getElementById("scoreDisplay").innerText = "Score: " + score;
          soundEnemyHit.play();
        }
      });
    });
  }
  
  // Update gold bags: simulate falling if below cell is clear
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
          if (checkCollision(bag, enemy)) {
            enemies.splice(idx, 1);
            score += 20;
            document.getElementById("scoreDisplay").innerText = "Score: " + score;
            soundEnemyHit.play();
          }
        });
      }
    });
  }
  
  // Collision detection helper
  function checkCollision(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }
  
  // Enemies move only along dug cells (tunnel) toward the player
  function canEnemyMove(enemy, dx, dy) {
    let nextX = enemy.x + dx + enemy.width/2;
    let nextY = enemy.y + dy + enemy.height/2;
    let col = Math.floor(nextX / cellSize);
    let row = Math.floor(nextY / cellSize);
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      return terrain[row][col] === false;
    }
    return false;
  }
  
  function updateGame() {
    // Update player position
    player.x += player.dx;
    player.y += player.dy;
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
    
    // Update last movement direction if moving
    if (player.dx !== 0 || player.dy !== 0) {
      player.lastDirection.x = player.dx !== 0 ? player.dx / Math.abs(player.dx) : player.lastDirection.x;
      player.lastDirection.y = player.dy !== 0 ? player.dy / Math.abs(player.dy) : player.lastDirection.y;
    }
    
    digTerrain();
    
    // Collect emeralds
    emeralds.forEach((e, i) => {
      if (checkCollision(player, e)) {
        emeralds.splice(i, 1);
        score += 10;
        document.getElementById("scoreDisplay").innerText = "Score: " + score;
        soundCollect.play();
      }
    });
    
    // Collect power-ups
    powerups.forEach((pu, i) => {
      if (checkCollision(player, pu)) {
        powerups.splice(i, 1);
        if (pu.type === "speed") {
          player.speed = player.baseSpeed * 1.5;
          player.powerupTime = 300;
          soundPowerUp.play();
        }
      }
    });
    
    if (player.powerupTime > 0) {
      player.powerupTime--;
      if (player.powerupTime === 0) player.speed = player.baseSpeed;
    }
    
    // Enemies chase player along the tunnel
    enemies.forEach(enemy => {
      let dx = 0, dy = 0;
      if (enemy.x < player.x && canEnemyMove(enemy, enemy.speed, 0)) dx = enemy.speed;
      else if (enemy.x > player.x && canEnemyMove(enemy, -enemy.speed, 0)) dx = -enemy.speed;
      if (enemy.y < player.y && canEnemyMove(enemy, 0, enemy.speed)) dy = enemy.speed;
      else if (enemy.y > player.y && canEnemyMove(enemy, 0, -enemy.speed)) dy = -enemy.speed;
      enemy.x += dx;
      enemy.y += dy;
      if (checkCollision(player, enemy)) {
        gameOver = true;
        soundEnemyHit.play();
      }
    });
    
    updateBullets();
    updateGoldBags();
  }
  
  function gameLoop() {
    if (gameOver) {
      document.getElementById("restartButton").style.display = "block";
      return;
    }
    updateGame();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTerrain();
    drawEmeralds();
    drawGoldBags();
    drawPowerups();
    drawEnemies();
    drawBullets();
    drawPlayer();
    requestAnimationFrame(gameLoop);
  }
  
  function fireBullet() {
    let bullet = {
      x: player.x + player.width/2 - 4,
      y: player.y + player.height/2 - 4,
      width: 8,
      height: 8,
      dx: player.lastDirection.x * 8,
      dy: player.lastDirection.y * 8
    };
    bullets.push(bullet);
    soundFire.play();
  }
  
  function restartGame() {
    score = 0;
    document.getElementById("scoreDisplay").innerText = "Score: " + score;
    gameOver = false;
    // Reset player to left edge of tunnel
    player.x = 0 * cellSize + (cellSize - player.width)/2;
    player.y = startingRow * cellSize + (cellSize - player.height)/2;
    player.dx = 0;
    player.dy = 0;
    player.speed = player.baseSpeed;
    player.powerupTime = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        terrain[r][c] = true;
      }
    }
    generateTunnelPath();
    spawnCollectibles();
    spawnPowerup();
    enemies = [];
    bullets = [];
    spawnEnemy();
    document.getElementById("restartButton").style.display = "none";
    gameLoop();
  }
  
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
      player.dy = -player.speed;
      soundMove.play();
    }
    if (e.key === "ArrowDown") {
      player.dy = player.speed;
      soundMove.play();
    }
    if (e.key === "ArrowLeft") {
      player.dx = -player.speed;
      soundMove.play();
    }
    if (e.key === "ArrowRight") {
      player.dx = player.speed;
      soundMove.play();
    }
    if (e.key === " " || e.key.toLowerCase() === "f") {
      fireBullet();
    }
  });
  document.addEventListener("keyup", (e) => {
    if (["ArrowUp", "ArrowDown"].includes(e.key)) player.dy = 0;
    if (["ArrowLeft", "ArrowRight"].includes(e.key)) player.dx = 0;
  });
  
  // Mobile on-screen controls
  const upBtn = document.getElementById("upBtn");
  const downBtn = document.getElementById("downBtn");
  const leftBtn = document.getElementById("leftBtn");
  const rightBtn = document.getElementById("rightBtn");
  const fireBtn = document.getElementById("fireBtn");
  upBtn.addEventListener("touchstart", () => { player.dy = -player.speed; });
  upBtn.addEventListener("touchend", () => { player.dy = 0; });
  downBtn.addEventListener("touchstart", () => { player.dy = player.speed; });
  downBtn.addEventListener("touchend", () => { player.dy = 0; });
  leftBtn.addEventListener("touchstart", () => { player.dx = -player.speed; });
  leftBtn.addEventListener("touchend", () => { player.dx = 0; });
  rightBtn.addEventListener("touchstart", () => { player.dx = player.speed; });
  rightBtn.addEventListener("touchend", () => { player.dx = 0; });
  fireBtn.addEventListener("touchstart", () => { fireBullet(); });
  
  document.getElementById("restartButton").addEventListener("click", restartGame);
  
  spawnCollectibles();
  spawnPowerup();
  spawnEnemy();
  // Spawn additional enemy every 15 seconds (if less than 3 exist)
  setInterval(() => { if (!gameOver) spawnEnemy(); }, 15000);
  
  gameLoop();
});