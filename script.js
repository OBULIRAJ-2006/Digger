document.addEventListener("DOMContentLoaded", () => {
    // Get canvas and context
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 800;
    canvas.height = 600;
    
    // Game Score and state
    let score = 0;
    let gameOver = false;
    document.getElementById("scoreDisplay").innerText = "Score: " + score;
    
    // Grid (terrain) settings for digging
    const cellSize = 40; // 20 columns x 15 rows for 800x600 canvas
    const cols = canvas.width / cellSize;
    const rows = canvas.height / cellSize;
    let terrain = [];
    // Initialize terrain (all cells filled)
    for (let r = 0; r < rows; r++) {
      terrain[r] = [];
      for (let c = 0; c < cols; c++) {
        terrain[r][c] = true;
      }
    }
    
    // Load assets
    const diggerSprite = new Image();
    diggerSprite.src = "digger.png"; // Ensure this file exists
    const soundMove = new Audio("move.mp3");
    const soundCollect = new Audio("collect.mp3");
    const soundEnemyHit = new Audio("hit.mp3");
    const soundFire = new Audio("fire.mp3");
    const soundPowerUp = new Audio("powerup.mp3");
    
    // Player (Digger) Object
    const player = {
      x: canvas.width / 2 - 16,
      y: canvas.height / 2 - 16,
      width: 32,
      height: 32,
      speed: 4,
      baseSpeed: 4,
      dx: 0,
      dy: 0,
      sprite: diggerSprite,
      powerupTime: 0, // countdown for speed boost
      lastDirection: { x: 1, y: 0 } // default facing right
    };
    
    // Arrays for game objects
    let enemies = [];
    let treasures = [];
    let powerups = [];
    let bullets = [];
    
    // Spawn Enemies at random positions
    function spawnEnemies() {
      enemies = [];
      for (let i = 0; i < 3; i++) {
        enemies.push({
          x: Math.random() * (canvas.width - 32),
          y: Math.random() * (canvas.height - 32),
          width: 32,
          height: 32,
          speed: 2
        });
      }
    }
    
    // Spawn Treasures at random positions
    function spawnTreasures() {
      treasures = [];
      for (let i = 0; i < 5; i++) {
        treasures.push({
          x: Math.random() * (canvas.width - 16),
          y: Math.random() * (canvas.height - 16),
          width: 16,
          height: 16
        });
      }
    }
    
    // Spawn Powerups (e.g., speed boost)
    function spawnPowerup() {
      powerups = [];
      // 50% chance to spawn a powerup on each restart
      if (Math.random() < 0.5) {
        powerups.push({
          x: Math.random() * (canvas.width - 16),
          y: Math.random() * (canvas.height - 16),
          width: 16,
          height: 16,
          type: "speed"
        });
      }
    }
    
    // Draw terrain (only cells that have not been dug)
    function drawTerrain() {
      ctx.fillStyle = "#654321"; // brown color for earth
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (terrain[r][c]) {
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
          }
        }
      }
    }
    
    // "Dig" the terrain as the player moves (clear the cell)
    function digTerrain() {
      let col = Math.floor((player.x + player.width / 2) / cellSize);
      let row = Math.floor((player.y + player.height / 2) / cellSize);
      if (row >= 0 && row < rows && col >= 0 && col < cols) {
        terrain[row][col] = false;
      }
    }
    
    // Draw the Player (Digger)
    function drawPlayer() {
      ctx.drawImage(player.sprite, player.x, player.y, player.width, player.height);
    }
    
    // Draw Enemies
    function drawEnemies() {
      ctx.fillStyle = "red";
      enemies.forEach((enemy) => {
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      });
    }
    
    // Draw Treasures
    function drawTreasures() {
      ctx.fillStyle = "gold";
      treasures.forEach((treasure) => {
        ctx.fillRect(treasure.x, treasure.y, treasure.width, treasure.height);
      });
    }
    
    // Draw Powerups
    function drawPowerups() {
      ctx.fillStyle = "cyan";
      powerups.forEach((powerup) => {
        ctx.fillRect(powerup.x, powerup.y, powerup.width, powerup.height);
      });
    }
    
    // Draw Bullets
    function drawBullets() {
      ctx.fillStyle = "white";
      bullets.forEach((bullet) => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      });
    }
    
    // Update bullets (move and check collisions with enemies)
    function updateBullets() {
      bullets.forEach((bullet, index) => {
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;
        // Remove bullet if it goes off-screen
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
          bullets.splice(index, 1);
        }
        // Check collision with enemies
        enemies.forEach((enemy, eIndex) => {
          if (checkCollision(bullet, enemy)) {
            enemies.splice(eIndex, 1);
            bullets.splice(index, 1);
            score += 20;
            document.getElementById("scoreDisplay").innerText = "Score: " + score;
            soundEnemyHit.play();
          }
        });
      });
    }
    
    // Collision detection between two objects
    function checkCollision(a, b) {
      return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
      );
    }
    
    // Restart Game Function
    function restartGame() {
      score = 0;
      document.getElementById("scoreDisplay").innerText = "Score: " + score;
      gameOver = false;
      // Reset player position and attributes
      player.x = canvas.width / 2 - player.width / 2;
      player.y = canvas.height / 2 - player.height / 2;
      player.dx = 0;
      player.dy = 0;
      player.speed = player.baseSpeed;
      player.powerupTime = 0;
      // Reset terrain (all cells filled)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          terrain[r][c] = true;
        }
      }
      spawnEnemies();
      spawnTreasures();
      spawnPowerup();
      bullets = [];
      document.getElementById("restartButton").style.display = "none";
      gameLoop();
    }
    
    // Update game objects
    function update() {
      // Update player position
      player.x += player.dx;
      player.y += player.dy;
      // Boundary checks
      if (player.x < 0) player.x = 0;
      if (player.x + player.width > canvas.width)
        player.x = canvas.width - player.width;
      if (player.y < 0) player.y = 0;
      if (player.y + player.height > canvas.height)
        player.y = canvas.height - player.height;
    
      // Update last movement direction if moving
      if (player.dx !== 0 || player.dy !== 0) {
        player.lastDirection.x = player.dx !== 0 ? player.dx / Math.abs(player.dx) : player.lastDirection.x;
        player.lastDirection.y = player.dy !== 0 ? player.dy / Math.abs(player.dy) : player.lastDirection.y;
      }
    
      // "Dig" terrain as player moves
      digTerrain();
    
      // Check collision with treasures
      treasures.forEach((treasure, index) => {
        if (checkCollision(player, treasure)) {
          treasures.splice(index, 1);
          score += 10;
          document.getElementById("scoreDisplay").innerText = "Score: " + score;
          soundCollect.play();
        }
      });
    
      // Check collision with powerups
      powerups.forEach((powerup, index) => {
        if (checkCollision(player, powerup)) {
          powerups.splice(index, 1);
          if (powerup.type === "speed") {
            player.speed = player.baseSpeed * 1.5;
            player.powerupTime = 300; // lasts 300 frames
            soundPowerUp.play();
          }
        }
      });
    
      // Decrement powerup timer and reset speed when finished
      if (player.powerupTime > 0) {
        player.powerupTime--;
        if (player.powerupTime === 0) {
          player.speed = player.baseSpeed;
        }
      }
    
      // Enemies chase the player
      enemies.forEach((enemy) => {
        if (enemy.x < player.x) enemy.x += enemy.speed;
        else if (enemy.x > player.x) enemy.x -= enemy.speed;
        if (enemy.y < player.y) enemy.y += enemy.speed;
        else if (enemy.y > player.y) enemy.y -= enemy.speed;
    
        // Collision with enemy -> game over
        if (checkCollision(player, enemy)) {
          gameOver = true;
          soundEnemyHit.play();
        }
      });
    
      // Update bullets
      updateBullets();
    }
    
    // Main Game Loop
    function gameLoop() {
      if (gameOver) {
        document.getElementById("restartButton").style.display = "block";
        return;
      }
      update();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawTerrain();
      drawTreasures();
      drawPowerups();
      drawEnemies();
      drawBullets();
      drawPlayer();
      requestAnimationFrame(gameLoop);
    }
    
    // Fire bullet function (using player's last direction)
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
    
    // Keyboard Controls for Desktop
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
      // Fire with spacebar or 'f'
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
    
    // Restart button handler
    document.getElementById("restartButton").addEventListener("click", restartGame);
    
    // Initialize game objects and start the game loop
    spawnEnemies();
    spawnTreasures();
    spawnPowerup();
    gameLoop();
  });