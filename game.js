window.onload = function() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Make canvas full-screen and adjust on resize
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Game state variables
  let score = 0, level = 1;
  let gameState = 'start'; // 'start', 'playing', 'gameover'

  // Player properties
  const player = {
    x: 0, y: 0,
    radius: 15,
    speed: 200,
    facing: 'up',
    shieldActive: false,
    speedActive: false,
    rapidActive: false,
    shieldEnd: 0,
    speedEnd: 0,
    rapidEnd: 0
  };

  // Entity arrays
  let enemies = [], bullets = [], powerups = [];

  // Input flags
  let upPressed = false, downPressed = false, leftPressed = false, rightPressed = false;
  let firePressed = false;
  let joystickTouchId = null, fireTouchId = null;
  const touchCenterX = () => canvas.width * 0.75;
  const touchCenterY = () => canvas.height * 0.5;

  // Constants
  const BULLET_SPEED = 400;
  const BULLET_COOLDOWN = 500; // milliseconds
  const POWERUP_DURATION = 5000; // ms
  const POWERUP_CHANCE = 0.3;    // 30% chance to spawn

  let lastShotTime = 0;
  let lastTime = 0;

  // HUD elements
  const scoreEl = document.getElementById('score');
  const levelEl = document.getElementById('level');
  const finalScoreEl = document.getElementById('finalScore');
  const shieldTimerEl = document.getElementById('shieldTimer');
  const speedTimerEl = document.getElementById('speedTimer');
  const rapidTimerEl = document.getElementById('rapidTimer');
  const startScreen = document.getElementById('startScreen');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const startButton = document.getElementById('startButton');
  const restartButton = document.getElementById('restartButton');

  // Start and restart buttons
  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', function() {
    gameOverScreen.classList.add('hidden');
    startGame();
  });

  // Keyboard controls
  window.addEventListener('keydown', function(e) {
    if (e.code === 'ArrowUp' || e.key === 'w')    { upPressed = true; player.facing = 'up'; }
    if (e.code === 'ArrowDown' || e.key === 's')  { downPressed = true; player.facing = 'down'; }
    if (e.code === 'ArrowLeft' || e.key === 'a')  { leftPressed = true; player.facing = 'left'; }
    if (e.code === 'ArrowRight' || e.key === 'd') { rightPressed = true; player.facing = 'right'; }
    if (e.code === 'Space')                       { firePressed = true; }
  });
  window.addEventListener('keyup', function(e) {
    if (e.code === 'ArrowUp' || e.key === 'w')    upPressed = false;
    if (e.code === 'ArrowDown' || e.key === 's')  downPressed = false;
    if (e.code === 'ArrowLeft' || e.key === 'a')  leftPressed = false;
    if (e.code === 'ArrowRight' || e.key === 'd') rightPressed = false;
    if (e.code === 'Space')                       firePressed = false;
  });

  // Touch controls for mobile
  canvas.addEventListener('touchstart', function(e) {
    for (let touch of e.changedTouches) {
      const x = touch.clientX, y = touch.clientY;
      // Fire button (left half)
      if (x < canvas.width / 2 && fireTouchId === null) {
        fireTouchId = touch.identifier;
        firePressed = true;
      }
      // Joystick (right half)
      else if (x >= canvas.width / 2 && joystickTouchId === null) {
        joystickTouchId = touch.identifier;
        // Set initial direction based on touch position
        const dx = x - touchCenterX();
        const dy = y - touchCenterY();
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) {
            leftPressed = false; rightPressed = true;
            upPressed = false; downPressed = false;
            player.facing = 'right';
          } else {
            leftPressed = true; rightPressed = false;
            upPressed = false; downPressed = false;
            player.facing = 'left';
          }
        } else {
          if (dy > 0) {
            upPressed = false; downPressed = true;
            leftPressed = false; rightPressed = false;
            player.facing = 'down';
          } else {
            upPressed = true; downPressed = false;
            leftPressed = false; rightPressed = false;
            player.facing = 'up';
          }
        }
      }
    }
  });
  canvas.addEventListener('touchmove', function(e) {
    for (let touch of e.changedTouches) {
      if (touch.identifier === joystickTouchId) {
        const dx = touch.clientX - touchCenterX();
        const dy = touch.clientY - touchCenterY();
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) {
            leftPressed = false; rightPressed = true;
            upPressed = false; downPressed = false;
            player.facing = 'right';
          } else {
            leftPressed = true; rightPressed = false;
            upPressed = false; downPressed = false;
            player.facing = 'left';
          }
        } else {
          if (dy > 0) {
            upPressed = false; downPressed = true;
            leftPressed = false; rightPressed = false;
            player.facing = 'down';
          } else {
            upPressed = true; downPressed = false;
            leftPressed = false; rightPressed = false;
            player.facing = 'up';
          }
        }
      }
    }
  });
  canvas.addEventListener('touchend', function(e) {
    for (let touch of e.changedTouches) {
      if (touch.identifier === joystickTouchId) {
        joystickTouchId = null;
        upPressed = downPressed = leftPressed = rightPressed = false;
      }
      if (touch.identifier === fireTouchId) {
        fireTouchId = null;
        firePressed = false;
      }
    }
  });
  canvas.addEventListener('touchcancel', function(e) {
    for (let touch of e.changedTouches) {
      if (touch.identifier === joystickTouchId) {
        joystickTouchId = null;
        upPressed = downPressed = leftPressed = rightPressed = false;
      }
      if (touch.identifier === fireTouchId) {
        fireTouchId = null;
        firePressed = false;
      }
    }
  });

  // Start or restart the game
  function startGame() {
    score = 0;
    level = 1;
    gameState = 'playing';
    player.shieldActive = player.speedActive = player.rapidActive = false;
    // Reset any game-over text
    document.querySelector('#gameOverScreen h1').textContent = 'Game Over';
    lastShotTime = 0;
    spawnLevel();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    lastTime = performance.now();
  }

  // Prepare a level: spawn enemies, reset player
  function spawnLevel() {
    enemies = [];
    bullets = [];
    powerups = [];
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.facing = 'up';
    player.shieldActive = player.speedActive = player.rapidActive = false;
    // Determine enemy count and speed for this level
    let numEnemies = 3 + (level - 1) * 2;       // 3, 5, 7
    let enemySpeed = 100 + (level - 1) * 50;    // 100, 150, 200
    for (let i = 0; i < numEnemies; i++) {
      spawnEnemy(enemySpeed);
    }
    updateHUD();
  }

  // Create a single enemy at a random edge
  function spawnEnemy(speed) {
    const enemy = { x: 0, y: 0, radius: 12, speed: speed };
    const side = Math.floor(Math.random() * 4);
    if (side === 0) {           // Top edge
      enemy.x = Math.random() * canvas.width;
      enemy.y = -enemy.radius;
    } else if (side === 1) {    // Bottom
      enemy.x = Math.random() * canvas.width;
      enemy.y = canvas.height + enemy.radius;
    } else if (side === 2) {    // Left
      enemy.x = -enemy.radius;
      enemy.y = Math.random() * canvas.height;
    } else {                    // Right
      enemy.x = canvas.width + enemy.radius;
      enemy.y = Math.random() * canvas.height;
    }
    enemies.push(enemy);
  }

  // Update score and level display
  function updateHUD() {
    scoreEl.textContent = 'Score: ' + score;
    levelEl.textContent = 'Level: ' + level;
    finalScoreEl.textContent = score;
  }

  // Main update function (called each frame)
  function update(dt) {
    if (gameState !== 'playing') return;

    // --- Player movement ---
    let dx = 0, dy = 0;
    if (upPressed) dy -= 1;
    if (downPressed) dy += 1;
    if (leftPressed) dx -= 1;
    if (rightPressed) dx += 1;
    // Normalize diagonal speed
    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }
    let moveSpeed = player.speed * (player.speedActive ? 2 : 1);
    player.x += dx * moveSpeed * dt;
    player.y += dy * moveSpeed * dt;
    // Keep player on-screen
    if (player.x < player.radius) player.x = player.radius;
    if (player.x > canvas.width - player.radius) player.x = canvas.width - player.radius;
    if (player.y < player.radius) player.y = player.radius;
    if (player.y > canvas.height - player.radius) player.y = canvas.height - player.radius;

    // --- Shooting ---
    const now = performance.now();
    const cooldown = player.rapidActive ? BULLET_COOLDOWN / 2 : BULLET_COOLDOWN;
    if (firePressed && now - lastShotTime > cooldown) {
      shootBullet();
      lastShotTime = now;
    }

    // --- Update bullets ---
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      // Remove off-screen bullets
      if (b.x < -b.radius || b.x > canvas.width + b.radius ||
          b.y < -b.radius || b.y > canvas.height + b.radius) {
        bullets.splice(i, 1);
      }
    }

    // --- Update enemies ---
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      // Move towards the player
      const diffX = player.x - e.x;
      const diffY = player.y - e.y;
      const dist = Math.hypot(diffX, diffY);
      if (dist > 0) {
        e.x += (diffX / dist) * e.speed * dt;
        e.y += (diffY / dist) * e.speed * dt;
      }
      // Check collision with player
      if (Math.hypot(e.x - player.x, e.y - player.y) < e.radius + player.radius) {
        if (player.shieldActive) {
          // Destroy enemy instead of ending game
          enemies.splice(i, 1);
          score += 10;
          updateHUD();
        } else {
          // Trigger game over
          gameState = 'gameover';
          gameOverScreen.classList.remove('hidden');
          finalScoreEl.textContent = score;
          return;
        }
      }
    }

    // --- Bullet-enemy collisions ---
    for (let i = bullets.length - 1; i >= 0; i--) {
      for (let j = enemies.length - 1; j >= 0; j--) {
        const b = bullets[i];
        const e = enemies[j];
        if (Math.hypot(b.x - e.x, b.y - e.y) < b.radius + e.radius) {
          // Hit detected: remove both bullet and enemy
          bullets.splice(i, 1);
          enemies.splice(j, 1);
          score += 10;
          updateHUD();
          // Possibly spawn a power-up where the enemy died
          if (Math.random() < POWERUP_CHANCE) {
            spawnPowerup(e.x, e.y);
          }
          break;
        }
      }
    }

    // --- Power-up collection ---
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      if (Math.hypot(p.x - player.x, p.y - player.y) < p.radius + player.radius) {
        // Activate power-up
        if (p.type === 'shield') {
          player.shieldActive = true;
          player.shieldEnd = now + POWERUP_DURATION;
        } else if (p.type === 'speed') {
          player.speedActive = true;
          player.speedEnd = now + POWERUP_DURATION;
        } else if (p.type === 'rapid') {
          player.rapidActive = true;
          player.rapidEnd = now + POWERUP_DURATION;
        }
        powerups.splice(i, 1);
      }
    }

    // --- Power-up duration timers ---
    if (player.shieldActive && now > player.shieldEnd)   player.shieldActive = false;
    if (player.speedActive && now > player.speedEnd)     player.speedActive = false;
    if (player.rapidActive && now > player.rapidEnd)     player.rapidActive = false;

    // --- Level progression ---
    if (gameState === 'playing' && enemies.length === 0) {
      level++;
      if (level > 3) {
        // Completed all levels: player wins
        gameState = 'gameover';
        document.querySelector('#gameOverScreen h1').textContent = 'You Win!';
        gameOverScreen.classList.remove('hidden');
        finalScoreEl.textContent = score;
        return;
      } else {
        // Next level
        spawnLevel();
      }
    }

    // --- Update power-up timers in HUD ---
    shieldTimerEl.textContent = player.shieldActive
      ? 'Shield: ' + Math.ceil((player.shieldEnd - now)/1000) + 's' : '';
    speedTimerEl.textContent = player.speedActive
      ? 'Speed: ' + Math.ceil((player.speedEnd - now)/1000) + 's' : '';
    rapidTimerEl.textContent = player.rapidActive
      ? 'Rapid: ' + Math.ceil((player.rapidEnd - now)/1000) + 's' : '';
  }

  // Create a bullet based on player's facing direction
  function shootBullet() {
    const bullet = { x: player.x, y: player.y, vx: 0, vy: 0, radius: 5 };
    if (player.facing === 'up')    bullet.vy = -BULLET_SPEED;
    if (player.facing === 'down')  bullet.vy =  BULLET_SPEED;
    if (player.facing === 'left')  bullet.vx = -BULLET_SPEED;
    if (player.facing === 'right') bullet.vx =  BULLET_SPEED;
    bullets.push(bullet);
  }

  // Spawn a random power-up at (x,y)
  function spawnPowerup(x, y) {
    const types = ['shield', 'speed', 'rapid'];
    const type = types[Math.floor(Math.random() * types.length)];
    const powerup = { x: x, y: y, radius: 10, type: type };
    powerups.push(powerup);
  }

  // Draw all game elements
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'playing') {
      // Draw player
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2);
      ctx.fill();
      // Draw shield outline
      if (player.shieldActive) {
        ctx.strokeStyle = '#00f';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 5, 0, Math.PI*2);
        ctx.stroke();
      }
      // Draw speed effect
      if (player.speedActive) {
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 10, 0, Math.PI*2);
        ctx.stroke();
      }
      // Draw rapid-fire effect
      if (player.rapidActive) {
        ctx.strokeStyle = '#ff0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 15, 0, Math.PI*2);
        ctx.stroke();
      }
      ctx.restore();

      // Draw enemies
      ctx.fillStyle = '#f00';
      for (const e of enemies) {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI*2);
        ctx.fill();
      }

      // Draw bullets
      ctx.fillStyle = '#fff';
      for (const b of bullets) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI*2);
        ctx.fill();
      }

      // Draw power-ups
      for (const p of powerups) {
        if (p.type === 'shield') ctx.fillStyle = '#00f';
        if (p.type === 'speed')  ctx.fillStyle = '#0f0';
        if (p.type === 'rapid')  ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
        ctx.fill();
      }
    }
  }

  // Main game loop
  function gameLoop(timestamp) {
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    update(dt);
    draw();
    window.requestAnimationFrame(gameLoop);
  }
  window.requestAnimationFrame(gameLoop);
};