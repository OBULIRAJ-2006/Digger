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
  
  // Terrain grid setup (each cell 40x40)
  const cellSize = 40;
  const cols = canvas.width / cellSize;
  const rows = canvas.height / cellSize;
  let terrain = [];
  for (let r = 0; r < rows; r++) {
    terrain[r] = [];
    for (let c = 0; c < cols; c++) {
      terrain[r][c] = true; // true means "dirt" exists
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
  // Sound effects (ensure these files exist)
  const soundMove = new Audio("move.mp3");
  const soundCollect = new Audio("collect.mp3");
  const soundEnemyHit = new Audio("hit.mp3");
  const soundFire = new Audio("fire.mp3");
  const soundPowerUp = new Audio("powerup.mp3");
  
  // Player (Digger)
  const player = {
    x: canvas.width / 2 - 16,
    y: canvas.height / 2 - 16,
    width: 32,
    height: 32,
    baseSpeed: 4,
    speed: 4,
    dx: 0,
    dy: 0,
    sprite: diggerSprite,
    powerupTime: 0,
    lastDirection: { x: 1, y: 0 } // default facing right
  };
  
  // Game objects arrays
  let enemies = [];
  let emeralds = [];    // collectibles (emeralds)
  let goldBags = [];    // gold bags that might fall
  let powerups = [];
  let bullets = [];
  
  // Spawn an enemy on a dug cell along the tunnel
  function spawnEnemy() {
    let possible = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!terrain[r][c]) possible.push({ r, c });
      }
    }
    if (possible.length > 0) {
      const cell = possible[Math.floor(Math.random() * possible.length)];
      enemies.push({
        x: cell.c * cellSize + (cellSize - 32) / 2,
        y: cell.r * cellSize + (cellSize - 32) / 2,
        width: 32,
        height: 32,
        speed: 1  // slow speed
      });
    }
  }
  
  // Spawn collectibles: emeralds and gold bags
  function spawnCollectibles() {
    emeralds = [];
    goldBags = [];
    for (let i = 0; i < 4; i++) {
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
  
  // Spawn a power-up (speed boost)
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
  
  // Draw terrain (only cells still with dirt)
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
  
  // "Dig" the terrain as player moves
  function digTerrain() {
    let col = Math.floor((player.x + player.width/2) / cellSize);
    let row = Math.floor((player.y + player.height/2) / cellSize);
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      terrain[row][col] = false;
    }
  }
  
  // Draw player
  function drawPlayer() {
    ctx.drawImage(player.sprite, player.x, player.y, player.width, player.height);
  }
  
  // Draw enemies
  function drawEnemies() {
    ctx.fillStyle = "red";
    enemies.forEach(enemy => {
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    });
  }
  
  // Draw emeralds
  function drawEmeralds() {
    ctx.fillStyle = "lime";
    emeralds.forEach(e => {
      ctx.fillRect(e.x, e.y, e.width, e.height);
    });
  }
  
  // Draw gold bags
  function drawGoldBags() {
    ctx.fillStyle = "gold";
    goldBags.forEach(bag => {
      ctx.fillRect(bag.x, bag.y, bag.width, bag.height);
    });
  }
  
  // Draw power-ups
  function drawPowerups() {
    ctx.fillStyle = "cyan";
    powerups.forEach(pu => {
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
  
  // Update bullets (movement and collision with enemies)
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
  
  // Update gold bags (simulate falling)
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
  
  // Restrict enemy movement to dug terrain
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
  
  // Update all game objects
  function updateGame() {
    player.x += player.dx;
    player.y += player.dy;
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
    
    // Update last movement direction
    if (player.dx !== 0 || player.dy !== 0) {
      player.lastDirection.x = player.dx !== 0 ? player.dx/Math.abs(player.dx) : player.lastDirection.x;
      player.lastDirection.y = player.dy !== 0 ? player.dy/Math.abs(player.dy) : player.lastDirection.y;
    }
    
    // Player digs terrain as they move
    digTerrain();
    
    // Check collisions with emeralds
    emeralds.forEach((e, i) => {
      if (checkCollision(player, e)) {
        emeralds.splice(i, 1);
        score += 10;
        document.getElementById("scoreDisplay").innerText = "Score: " + score;
        soundCollect.play();
      }
    });
    
    // Check collisions with power-ups
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
    
    // Decrement power-up timer
    if (player.powerupTime > 0) {
      player.powerupTime--;
      if (player.powerupTime === 0) player.speed = player.baseSpeed;
    }
    
    // Enemies chase player along dug path
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
  
  // Main game loop
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
  
  // Fire bullet function (uses player's last direction)
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
  
  // Restart game function
  function restartGame() {
    score = 0;
    document.getElementById("scoreDisplay").innerText = "Score: " + score;
    gameOver = false;
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height / 2 - player.height / 2;
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
  
  // Keyboard controls
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
  
  // Restart button event
  document.getElementById("restartButton").addEventListener("click", restartGame);
  
  // Spawn initial objects and start loop
  spawnCollectibles();
  spawnPowerup();
  spawnEnemy();
  // Spawn additional enemy every 15 seconds
  setInterval(() => { if (!gameOver) spawnEnemy(); }, 15000);
  
  gameLoop();
});