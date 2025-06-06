  const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    const startScreen = document.getElementById("startScreen");
    const gameScreen = document.getElementById("gameScreen");
    const startButton = document.getElementById("startButton");
    const scoreDisplay = document.getElementById("scoreDisplay");
    const livesDisplay = document.getElementById("livesDisplay");
    const levelDisplay = document.getElementById("levelDisplay");
    const restartButton = document.getElementById("restartButton");
    const powerupElements = {
      speed: document.querySelector('.powerup.speed div:last-child'),
      shield: document.querySelector('.powerup.shield div:last-child'),
      firepower: document.querySelector('.powerup.firepower div:last-child')
    };
    
    // Game constants
    const CELL_SIZE = 40;
    const COLS = Math.floor(canvas.width / CELL_SIZE);
    const ROWS = Math.floor(canvas.height / CELL_SIZE);
    const PLAYER_SPEED = 5;
    const ENEMY_SPEED = 2.5;
    const BULLET_SPEED = 10;
    
    // Game state
    let score = 0;
    let level = 1;
    let lives = 3;
    let gameOver = false;
    let gameActive = false;
    let terrain = [];
    let enemies = [];
    let emeralds = [];
    let goldBags = [];
    let powerups = [];
    let bullets = [];
    let particles = [];
    let lastTime = 0;
    let enemySpawnTimer = 0;
    let tunnelRow = 0;
    
    // Player object
    const player = {
      x: CELL_SIZE * 2,
      y: CELL_SIZE * 2,
      width: CELL_SIZE - 10,
      height: CELL_SIZE - 10,
      dx: 0,
      dy: 0,
      lastDirection: { x: 1, y: 0 },
      baseSpeed: PLAYER_SPEED,
      speed: PLAYER_SPEED,
      powerupTime: 0,
      shieldTime: 0,
      firepowerTime: 0,
      shootCooldown: 0,
      shootSlowTimer: 0,
      color: '#FFD166'
    };
    
    // ==================================================================
    // Game Initialization
    // ==================================================================
    function initGame() {
      startButton.addEventListener('click', startGame);
      restartButton.addEventListener('click', startGame);
      
      // Touch controls
      document.getElementById("upBtn").addEventListener("touchstart", () => { player.dy = -player.speed; });
      document.getElementById("upBtn").addEventListener("touchend", () => { player.dy = 0; });
      document.getElementById("downBtn").addEventListener("touchstart", () => { player.dy = player.speed; });
      document.getElementById("downBtn").addEventListener("touchend", () => { player.dy = 0; });
      document.getElementById("leftBtn").addEventListener("touchstart", () => { player.dx = -player.speed; });
      document.getElementById("leftBtn").addEventListener("touchend", () => { player.dx = 0; });
      document.getElementById("rightBtn").addEventListener("touchstart", () => { player.dx = player.speed; });
      document.getElementById("rightBtn").addEventListener("touchend", () => { player.dx = 0; });
      document.getElementById("fireButton").addEventListener("touchstart", fireBullet);
      
      // Keyboard controls
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("keyup", handleKeyUp);
      
      // Initialize game
      startGame();
    }
    
    function startGame() {
      startScreen.classList.add('hidden');
      gameScreen.classList.remove('hidden');
      restartButton.classList.add('hidden');
      
      // Reset game state
      score = 0;
      level = 1;
      lives = 3;
      gameOver = false;
      gameActive = true;
      enemies = [];
      emeralds = [];
      goldBags = [];
      powerups = [];
      bullets = [];
      particles = [];
      
      // Reset player
      player.x = CELL_SIZE * 2;
      player.y = CELL_SIZE * 2;
      player.dx = 0;
      player.dy = 0;
      player.speed = player.baseSpeed;
      player.powerupTime = 0;
      player.shieldTime = 0;
      player.firepowerTime = 0;
      player.shootCooldown = 0;
      player.shootSlowTimer = 0;
      
      // Initialize terrain
      initTerrain();
      generateTunnel();
      
      // Spawn game objects
      spawnEmeralds();
      spawnGoldBags();
      spawnPowerups();
      spawnEnemy();
      
      // Update HUD
      updateHUD();
      
      // Start game loop
      lastTime = performance.now();
      requestAnimationFrame(gameLoop);
    }
    
    function initTerrain() {
      terrain = [];
      for (let r = 0; r < ROWS; r++) {
        terrain[r] = [];
        for (let c = 0; c < COLS; c++) {
          terrain[r][c] = true; // true indicates undug dirt
        }
      }
    }
    
    function generateTunnel() {
      let currentRow = Math.floor(Math.random() * ROWS);
      for (let c = 0; c < COLS; c++) {
        terrain[currentRow][c] = false;
        if (Math.random() < 0.3) {
          if (currentRow > 0 && Math.random() < 0.5) currentRow--;
          else if (currentRow < ROWS - 1) currentRow++;
          terrain[currentRow][c] = false;
        }
      }
      tunnelRow = currentRow;
    }
    
    // ==================================================================
    // Spawning Functions
    // ==================================================================
    function spawnEmeralds() {
      emeralds = [];
      let count = 5 + level * 2;
      while (count > 0) {
        let col = Math.floor(Math.random() * COLS);
        let row = Math.floor(Math.random() * ROWS);
        if (terrain[row][col] === true) {
          emeralds.push({
            x: col * CELL_SIZE + (CELL_SIZE - 20) / 2,
            y: row * CELL_SIZE + (CELL_SIZE - 20) / 2,
            width: 20,
            height: 20,
            collected: false,
            color: '#06D6A0'
          });
          count--;
        }
      }
    }
    
    function spawnGoldBags() {
      goldBags = [];
      let count = 3 + level;
      while (count > 0) {
        let col = Math.floor(Math.random() * COLS);
        let row = Math.floor(Math.random() * ROWS);
        if (terrain[row][col] === true) {
          goldBags.push({
            x: col * CELL_SIZE,
            y: row * CELL_SIZE,
            width: CELL_SIZE,
            height: CELL_SIZE,
            falling: false,
            vy: 0,
            startFallY: null,
            color: '#FFD166'
          });
          count--;
        }
      }
    }
    
    function spawnEnemy() {
      if (enemies.length >= 2 + level) return;
      
      let spawnX = canvas.width - CELL_SIZE - 10;
      let spawnY = tunnelRow * CELL_SIZE + (CELL_SIZE - 30) / 2;
      let col = Math.floor(spawnX / CELL_SIZE);
      let row = Math.floor(spawnY / CELL_SIZE);
      
      if (terrain[row][col]) terrain[row][col] = false;
      
      enemies.push({
        x: spawnX,
        y: spawnY,
        width: 30,
        height: 30,
        speed: ENEMY_SPEED + level * 0.2,
        dx: 0,
        dy: 0,
        color: '#EF476F'
      });
    }
    
    function spawnPowerups() {
      powerups = [];
      if (Math.random() < 0.3) {
        let col = Math.floor(Math.random() * COLS);
        let row = Math.floor(Math.random() * ROWS);
        const types = ["speed", "shield", "firepower"];
        const type = types[Math.floor(Math.random() * types.length)];
        
        powerups.push({
          x: col * CELL_SIZE + (CELL_SIZE - 20) / 2,
          y: row * CELL_SIZE + (CELL_SIZE - 20) / 2,
          width: 20,
          height: 20,
          type: type,
          color: type === "speed" ? '#118AB2' : 
                 type === "shield" ? '#FFD166' : 
                 '#EF476F'
        });
      }
    }
    
    function createParticles(x, y, color, count) {
      for (let i = 0; i < count; i++) {
        particles.push({
          x: x,
          y: y,
          size: Math.random() * 5 + 2,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          color: color,
          life: Math.random() * 30 + 20
        });
      }
    }
    
    // ==================================================================
    // Game Logic
    // ==================================================================
    function updatePlayer(deltaTime) {
      // Apply movement
      player.x += player.dx * deltaTime;
      player.y += player.dy * deltaTime;
      
      // Boundary checks
      player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
      player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
      
      // Shooting slowdown
      if (player.shootSlowTimer > 0) {
        player.speed = player.baseSpeed * 0.5;
        player.shootSlowTimer -= deltaTime;
      } else {
        player.speed = player.baseSpeed;
      }
      
      // Update direction
      if (player.dx !== 0 || player.dy !== 0) {
        player.lastDirection = {
          x: player.dx !== 0 ? Math.sign(player.dx) : 0,
          y: player.dy !== 0 ? Math.sign(player.dy) : 0
        };
      }
      
      // Dig terrain at player position
      let col = Math.floor((player.x + player.width / 2) / CELL_SIZE);
      let row = Math.floor((player.y + player.height / 2) / CELL_SIZE);
      
      if (row >= 0 && row < ROWS && col >= 0 && col < COLS && terrain[row][col]) {
        terrain[row][col] = false;
        createParticles(
          col * CELL_SIZE + CELL_SIZE / 2, 
          row * CELL_SIZE + CELL_SIZE / 2,
          '#8B4513',
          10
        );
      }
      
      // Collect emeralds
      emeralds.forEach(emerald => {
        if (!emerald.collected && isColliding(player, emerald)) {
          emerald.collected = true;
          score += 10;
          createParticles(
            emerald.x + emerald.width / 2,
            emerald.y + emerald.height / 2,
            '#06D6A0',
            15
          );
          updateHUD();
        }
      });
      
      // Cooldown timers
      if (player.shootCooldown > 0) {
        player.shootCooldown -= deltaTime;
      }
    }
    
    function updateEnemies(deltaTime) {
      enemies.forEach((enemy, index) => {
        // Simple AI: Move towards player
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
          enemy.dx = (dx / dist) * enemy.speed;
          enemy.dy = (dy / dist) * enemy.speed;
        }
        
        // Apply movement
        enemy.x += enemy.dx * deltaTime;
        enemy.y += enemy.dy * deltaTime;
        
        // Boundary checks
        enemy.x = Math.max(0, Math.min(canvas.width - enemy.width, enemy.x));
        enemy.y = Math.max(0, Math.min(canvas.height - enemy.height, enemy.y));
        
        // Collision with player
        if (isColliding(player, enemy)) {
          if (player.shieldTime <= 0) {
            lives--;
            createParticles(
              player.x + player.width / 2,
              player.y + player.height / 2,
              '#EF476F',
              30
            );
            updateHUD();
            
            if (lives <= 0) {
              gameOver = true;
            } else {
              // Respawn player
              player.x = CELL_SIZE * 2;
              player.y = CELL_SIZE * 2;
              player.dx = 0;
              player.dy = 0;
            }
          }
          enemies.splice(index, 1);
          createParticles(
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2,
            '#EF476F',
            20
          );
        }
      });
    }
    
    function updateBullets(deltaTime) {
      bullets.forEach((bullet, index) => {
        // Apply movement
        bullet.x += bullet.dx * deltaTime;
        bullet.y += bullet.dy * deltaTime;
        
        // Boundary check
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
          bullets.splice(index, 1);
          return;
        }
        
        // Terrain collision
        const col = Math.floor(bullet.x / CELL_SIZE);
        const row = Math.floor(bullet.y / CELL_SIZE);
        
        if (row >= 0 && row < ROWS && col >= 0 && col < COLS && terrain[row][col]) {
          bullets.splice(index, 1);
          createParticles(
            bullet.x,
            bullet.y,
            '#118AB2',
            10
          );
          return;
        }
        
        // Enemy collision
        enemies.forEach((enemy, eIndex) => {
          if (isColliding(bullet, enemy)) {
            bullets.splice(index, 1);
            enemies.splice(eIndex, 1);
            score += 20;
            createParticles(
              enemy.x + enemy.width / 2,
              enemy.y + enemy.height / 2,
              '#EF476F',
              20
            );
            updateHUD();
          }
        });
      });
    }
    
    function updateGoldBags(deltaTime) {
      goldBags.forEach((bag, index) => {
        // Check if bag should fall
        const col = Math.floor(bag.x / CELL_SIZE);
        let rowBelow = Math.floor((bag.y + bag.height) / CELL_SIZE);
        
        if (rowBelow < ROWS && terrain[rowBelow][col]) {
          bag.falling = false;
          bag.vy = 0;
          bag.startFallY = null;
        } else {
          if (!bag.falling) {
            bag.falling = true;
            bag.startFallY = bag.y;
          }
          
          // Apply gravity
          bag.vy += 0.5;
          bag.y += bag.vy * deltaTime;
          
          // Bottom boundary
          if (bag.y + bag.height >= canvas.height) {
            bag.y = canvas.height - bag.height;
            bag.vy = 0;
            bag.falling = false;
          }
          
          // Check if falling more than 2 cells
          if (bag.startFallY !== null && (bag.y - bag.startFallY > CELL_SIZE * 2)) {
            // Check collision with enemies
            enemies.forEach((enemy, eIndex) => {
              if (isColliding(bag, enemy)) {
                enemies.splice(eIndex, 1);
                score += 25;
                createParticles(
                  enemy.x + enemy.width / 2,
                  enemy.y + enemy.height / 2,
                  '#EF476F',
                  20
                );
                updateHUD();
                goldBags.splice(index, 1);
              }
            });
            
            // Check collision with player
            if (isColliding(bag, player) && player.shieldTime <= 0) {
              lives--;
              createParticles(
                player.x + player.width / 2,
                player.y + player.height / 2,
                '#EF476F',
                30
              );
              updateHUD();
              
              if (lives <= 0) {
                gameOver = true;
              }
              
              goldBags.splice(index, 1);
            }
          }
        }
      });
    }
    
    function updatePowerups(deltaTime) {
      powerups.forEach((powerup, index) => {
        if (isColliding(player, powerup)) {
          // Apply powerup effect
          switch (powerup.type) {
            case "speed":
              player.speed = player.baseSpeed * 1.5;
              player.powerupTime = 300;
              break;
            case "shield":
              player.shieldTime = 300;
              break;
            case "firepower":
              player.firepowerTime = 300;
              break;
          }
          
          createParticles(
            powerup.x + powerup.width / 2,
            powerup.y + powerup.height / 2,
            powerup.color,
            20
          );
          
          powerups.splice(index, 1);
        }
      });
      
      // Update powerup timers
      if (player.powerupTime > 0) {
        player.powerupTime -= deltaTime;
        powerupElements.speed.textContent = `Speed: ${Math.ceil(player.powerupTime/60)}s`;
        if (player.powerupTime <= 0) {
          player.speed = player.baseSpeed;
          powerupElements.speed.textContent = "Speed: 0s";
        }
      }
      
      if (player.shieldTime > 0) {
        player.shieldTime -= deltaTime;
        powerupElements.shield.textContent = `Shield: ${Math.ceil(player.shieldTime/60)}s`;
        if (player.shieldTime <= 0) {
          powerupElements.shield.textContent = "Shield: 0s";
        }
      }
      
      if (player.firepowerTime > 0) {
        player.firepowerTime -= deltaTime;
        powerupElements.firepower.textContent = `Firepower: ${Math.ceil(player.firepowerTime/60)}s`;
        if (player.firepowerTime <= 0) {
          powerupElements.firepower.textContent = "Firepower: 0s";
        }
      }
    }
    
    function updateParticles(deltaTime) {
      particles.forEach((particle, index) => {
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
        particle.life -= deltaTime;
        
        if (particle.life <= 0) {
          particles.splice(index, 1);
        }
      });
    }
    
    function fireBullet() {
      if (player.shootCooldown > 0) return;
      
      const direction = player.lastDirection;
      const speedMultiplier = (player.firepowerTime > 0) ? BULLET_SPEED * 1.5 : BULLET_SPEED;
      
      bullets.push({
        x: player.x + player.width / 2 - 4,
        y: player.y + player.height / 2 - 4,
        width: 8,
        height: 8,
        dx: direction.x * speedMultiplier,
        dy: direction.y * speedMultiplier,
        color: '#118AB2'
      });
      
      player.shootCooldown = 0.5;
      player.shootSlowTimer = 0.2;
      
      createParticles(
        player.x + player.width / 2,
        player.y + player.height / 2,
        '#118AB2',
        10
      );
    }
    
    function checkLevelComplete() {
      const allEmeraldsCollected = emeralds.every(e => e.collected);
      if (allEmeraldsCollected) {
        level++;
        updateHUD();
        spawnEmeralds();
        spawnGoldBags();
        spawnPowerups();
        spawnEnemy();
      }
    }
    
    function isColliding(a, b) {
      return a.x < b.x + b.width &&
             a.x + a.width > b.x &&
             a.y < b.y + b.height &&
             a.y + a.height > b.y;
    }
    
    function updateHUD() {
      scoreDisplay.textContent = `SCORE: ${score}`;
      livesDisplay.textContent = `LIVES: ${lives}`;
      levelDisplay.textContent = `LEVEL: ${level}`;
    }
    
    // ==================================================================
    // Rendering
    // ==================================================================
    function drawTerrain() {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (terrain[r][c]) {
            // Draw dirt
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            
            // Draw dirt pattern
            ctx.fillStyle = '#6B2D00';
            for (let i = 0; i < 4; i++) {
              const x = c * CELL_SIZE + Math.random() * CELL_SIZE;
              const y = r * CELL_SIZE + Math.random() * CELL_SIZE;
              ctx.beginPath();
              ctx.arc(x, y, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            // Draw dug sand
            ctx.fillStyle = '#C2B280';
            ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          }
        }
      }
    }
    
    function drawPlayer() {
      // Draw player
      ctx.fillStyle = player.color;
      ctx.fillRect(player.x, player.y, player.width, player.height);
      
      // Draw player details
      ctx.fillStyle = '#1A1A2E';
      ctx.fillRect(player.x + 8, player.y + 8, player.width - 16, player.height - 16);
      
      // Draw shield if active
      if (player.shieldTime > 0) {
        ctx.strokeStyle = 'rgba(255, 209, 102, 0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(
          player.x + player.width / 2,
          player.y + player.height / 2,
          player.width / 2 + 5,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
    }
    
    function drawEnemies() {
      enemies.forEach(enemy => {
        // Draw enemy
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        // Draw enemy eyes
        ctx.fillStyle = '#1A1A2E';
        ctx.fillRect(enemy.x + 8, enemy.y + 8, 6, 6);
        ctx.fillRect(enemy.x + enemy.width - 14, enemy.y + 8, 6, 6);
      });
    }
    
    function drawEmeralds() {
      emeralds.forEach(emerald => {
        if (!emerald.collected) {
          // Draw emerald
          ctx.fillStyle = emerald.color;
          ctx.beginPath();
          ctx.moveTo(emerald.x, emerald.y + emerald.height / 2);
          ctx.lineTo(emerald.x + emerald.width / 2, emerald.y);
          ctx.lineTo(emerald.x + emerald.width, emerald.y + emerald.height / 2);
          ctx.lineTo(emerald.x + emerald.width / 2, emerald.y + emerald.height);
          ctx.closePath();
          ctx.fill();
          
          // Draw shine
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.beginPath();
          ctx.moveTo(emerald.x + emerald.width * 0.3, emerald.y + emerald.height * 0.3);
          ctx.lineTo(emerald.x + emerald.width * 0.4, emerald.y + emerald.height * 0.2);
          ctx.lineTo(emerald.x + emerald.width * 0.5, emerald.y + emerald.height * 0.3);
          ctx.closePath();
          ctx.fill();
        }
      });
    }
    
    function drawGoldBags() {
      goldBags.forEach(bag => {
        // Draw gold bag
        ctx.fillStyle = bag.color;
        ctx.fillRect(bag.x, bag.y, bag.width, bag.height);
        
        // Draw bag details
        ctx.fillStyle = '#D4A017';
        ctx.fillRect(bag.x + 5, bag.y + 5, bag.width - 10, bag.height - 10);
        
        ctx.fillStyle = '#B8860B';
        ctx.fillRect(bag.x, bag.y + bag.height - 10, bag.width, 5);
      });
    }
    
    function drawPowerups() {
      powerups.forEach(powerup => {
        // Draw powerup
        ctx.fillStyle = powerup.color;
        ctx.beginPath();
        ctx.arc(
          powerup.x + powerup.width / 2,
          powerup.y + powerup.height / 2,
          powerup.width / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
        
        // Draw icon based on type
        ctx.fillStyle = '#1A1A2E';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (powerup.type === "speed") {
          ctx.fillText('S', powerup.x + powerup.width / 2, powerup.y + powerup.height / 2);
        } else if (powerup.type === "shield") {
          ctx.fillText('D', powerup.x + powerup.width / 2, powerup.y + powerup.height / 2);
        } else if (powerup.type === "firepower") {
          ctx.fillText('F', powerup.x + powerup.width / 2, powerup.y + powerup.height / 2);
        }
      });
    }
    
    function drawBullets() {
      bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.width / 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    
    function drawParticles() {
      particles.forEach(particle => {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life / 50;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;
    }
    
    // ==================================================================
    // Game Loop
    // ==================================================================
    function gameLoop(timestamp) {
      if (!lastTime) lastTime = timestamp;
      const deltaTime = (timestamp - lastTime) / 16.666; // Normalize to 60fps
      lastTime = timestamp;
      
      if (gameActive) {
        // Update game state
        updatePlayer(deltaTime);
        updateEnemies(deltaTime);
        updateBullets(deltaTime);
        updateGoldBags(deltaTime);
        updatePowerups(deltaTime);
        updateParticles(deltaTime);
        
        // Spawn enemies periodically
        enemySpawnTimer += deltaTime;
        if (enemySpawnTimer > 150) {
          spawnEnemy();
          enemySpawnTimer = 0;
        }
        
        // Check level completion
        checkLevelComplete();
        
        // Check game over
        if (gameOver) {
          endGame();
          return;
        }
        
        // Draw everything
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawTerrain();
        drawEmeralds();
        drawGoldBags();
        drawPowerups();
        drawEnemies();
        drawBullets();
        drawParticles();
        drawPlayer();
      }
      
      requestAnimationFrame(gameLoop);
    }
    
    // ==================================================================
    // Input Handling
    // ==================================================================
    function handleKeyDown(e) {
      switch (e.key) {
        case "ArrowUp":
          player.dy = -player.speed;
          break;
        case "ArrowDown":
          player.dy = player.speed;
          break;
        case "ArrowLeft":
          player.dx = -player.speed;
          break;
        case "ArrowRight":
          player.dx = player.speed;
          break;
        case " ":
        case "f":
          fireBullet();
          break;
      }
    }
    
    function handleKeyUp(e) {
      switch (e.key) {
        case "ArrowUp":
        case "ArrowDown":
          player.dy = 0;
          break;
        case "ArrowLeft":
        case "ArrowRight":
          player.dx = 0;
          break;
      }
    }
    
    function endGame() {
      gameActive = false;
      restartButton.classList.remove('hidden');
      
      // Draw game over message
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#EF476F';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);
      
      ctx.fillStyle = '#FFD166';
      ctx.font = '36px Arial';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
    }
    
    // Initialize game when page loads
    window.addEventListener('load', initGame);
