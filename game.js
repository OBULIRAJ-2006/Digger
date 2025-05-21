// game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');
const hudScore = document.getElementById('score');
const hudLevel = document.getElementById('level');
const hudLives = document.getElementById('lives');
const hudPowerups = document.getElementById('powerups');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreSpan = document.getElementById('finalScore');

let levelMap = [], currentLevel = 1;
let player = { x: 5, y: 5, speed: 2, lives: 3, score: 0 };
let enemies = [], bullets = [], powerUps = [];
let activePowerups = { shield: false, speed: false, rapid: false };
let powerupTimers = { shield: 0, speed: 0, rapid: 0 };
let keys = {}, canShoot = true, shootCooldown = 500;
let devicePixelRatio = window.devicePixelRatio || 1;

// Load levels (2D arrays: 0=empty,1=dirt,2=diamond,3=enemy spawn,4=powerup spawn)
const levels = {
  1: [
    [1,1,1,1,1,1,1,1,1,1],
    [1,0,0,2,0,0,2,0,0,1],
    [1,0,1,1,1,1,1,1,0,1],
    [1,2,1,0,0,0,0,1,2,1],
    [1,0,1,0,1,1,0,1,0,1],
    [1,0,0,0,1,1,0,0,0,1],
    [1,0,1,0,0,0,0,1,0,1],
    [1,2,1,1,1,1,1,1,2,1],
    [1,0,0,0,2,0,2,0,0,1],
    [1,1,1,1,1,1,1,1,1,1]
  ],
  2: [
    /* more complex map with more diamonds/enemies */
    // (Same size 10x10 for simplicity; larger levels could scroll, omitted for brevity)
    [1,1,1,1,1,1,1,1,1,1],
    [1,2,0,0,0,0,0,0,2,1],
    [1,0,1,1,1,1,1,1,0,1],
    [1,0,1,0,2,0,2,1,0,1],
    [1,0,1,0,1,1,0,1,0,1],
    [1,0,0,0,1,1,0,0,0,1],
    [1,2,1,0,0,0,0,1,2,1],
    [1,0,1,1,1,1,1,1,0,1],
    [1,2,0,0,0,0,0,0,2,1],
    [1,1,1,1,1,1,1,1,1,1]
  ],
  3: [
    [1,1,1,1,1,1,1,1,1,1],
    [1,2,0,1,0,1,0,1,0,1],
    [1,0,1,1,1,1,1,1,0,1],
    [1,0,1,0,2,0,2,1,0,1],
    [1,0,1,0,1,1,0,1,0,1],
    [1,2,0,0,1,1,0,0,2,1],
    [1,0,1,0,0,0,0,1,0,1],
    [1,0,1,1,1,1,1,1,0,1],
    [1,2,0,0,2,0,0,0,2,1],
    [1,1,1,1,1,1,1,1,1,1]
  ]
};

// Audio setup (Web Audio API)
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
let bgBuffer, shootBuffer, enemyDieBuffer, powerupBuffer;
async function loadSound(url) {
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  return audioCtx.decodeAudioData(arrayBuffer);
}
// Load audio files (place bg.mp3, shoot.wav, etc. locally)
Promise.all([
  loadSound('bg.mp3'),
  loadSound('shoot.wav'),
  loadSound('enemy_die.wav'),
  loadSound('powerup.wav')
]).then(buffers => {
  [bgBuffer, shootBuffer, enemyDieBuffer, powerupBuffer] = buffers;
  playBackgroundMusic();
});
function playBackgroundMusic() {
  if (!bgBuffer) return;
  const src = audioCtx.createBufferSource();
  src.buffer = bgBuffer;
  src.loop = true;
  src.connect(audioCtx.destination);
  src.start();
}
function playSound(buffer) {
  if (!buffer) return;
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(audioCtx.destination);
  src.start();
}

// Resize canvas for high-DPI displays25
function resizeCanvas() {
  const rect = gameContainer.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Input: keyboard
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
  if (e.key === 'ArrowRight'|| e.key === 'd') keys.right = true;
  if (e.key === 'ArrowUp'   || e.key === 'w') keys.up = true;
  if (e.key === 'ArrowDown' || e.key === 's') keys.down = true;
  if (e.key === ' ') keys.fire = true;
  if (e.key === 'r' || e.key === 'R') startGame();
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
  if (e.key === 'ArrowRight'|| e.key === 'd') keys.right = false;
  if (e.key === 'ArrowUp'   || e.key === 'w') keys.up = false;
  if (e.key === 'ArrowDown' || e.key === 's') keys.down = false;
  if (e.key === ' ') keys.fire = false;
});

// Input: touch (simple swipe and second-finger fire)26
let touchStartX = 0, touchStartY = 0;
canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length > 1) {
    keys.fire = true;
  } else {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
  e.preventDefault();
});
canvas.addEventListener('touchmove', (e) => {
  const touch = e.touches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  if (Math.abs(dx) > Math.abs(dy)) {
    keys.right = dx > 0;
    keys.left = dx < 0;
    keys.up = keys.down = false;
  } else {
    keys.down = dy > 0;
    keys.up = dy < 0;
    keys.left = keys.right = false;
  }
  e.preventDefault();
});
canvas.addEventListener('touchend', (e) => {
  keys.left = keys.right = keys.up = keys.down = keys.fire = false;
});

// Start game or next level
function startGame() {
  player.score = 0;
  player.lives = 3;
  currentLevel = 1;
  loadLevel(currentLevel);
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
}

// Load a level map
function loadLevel(n) {
  levelMap = JSON.parse(JSON.stringify(levels[n])); // deep copy
  // Reset player position
  player.x = 1 * tilesize + tilesize/2;
  player.y = 1 * tilesize + tilesize/2;
  // Spawn enemies (one per '3' tile, if any)
  enemies = [];
  for (let y = 0; y < levelMap.length; y++) {
    for (let x = 0; x < levelMap[y].length; x++) {
      if (levelMap[y][x] === 3) {
        enemies.push({x: x*tilesize+tilesize/2, y: y*tilesize+tilesize/2, dir: 0});
        levelMap[y][x] = 0;
      }
    }
  }
  bullets = [];
  powerUps = [];
  activePowerups = { shield: false, speed: false, rapid: false };
  hudLevel.textContent = `Level: ${n}`;
}

// Game loop (using requestAnimationFrame)27
function gameLoop() {
  requestAnimationFrame(gameLoop);
  updateGame();
  renderGame();
}
gameLoop();

// Update game state
function updateGame() {
  // Player movement
  let moveSpeed = player.speed;
  if (activePowerups.speed) moveSpeed *= 2;
  if (keys.left)  player.x -= moveSpeed;
  if (keys.right) player.x += moveSpeed;
  if (keys.up)    player.y -= moveSpeed;
  if (keys.down)  player.y += moveSpeed;
  // Keep player inside bounds
  player.x = Math.max(tilesize/2, Math.min(canvas.width/devicePixelRatio - tilesize/2, player.x));
  player.y = Math.max(tilesize/2, Math.min(canvas.height/devicePixelRatio - tilesize/2, player.y));

  // Digging (turn tile to empty)
  let px = Math.floor(player.x / tilesize);
  let py = Math.floor(player.y / tilesize);
  if (levelMap[py] && levelMap[py][px] === 1) {
    levelMap[py][px] = 0;
    player.score += 10;
  }
  // Collect diamonds (tile '2')
  if (levelMap[py] === undefined || levelMap[py][px] === undefined) { /* outside map */ }
  else if (levelMap[py][px] === 2) {
    levelMap[py][px] = 0;
    player.score += 50;
    playSound(powerupBuffer);
  }
  // Collect power-ups (tile '4' for example)
  // ... (omitted: code would spawn actual power-up objects on map)

  // Handle shooting
  if (keys.fire && canShoot) {
    // Determine direction vector (we use last move direction or default right)
    let dir = {x:1, y:0};
    if (keys.up)    dir = {x:0, y:-1};
    if (keys.down)  dir = {x:0, y: 1};
    if (keys.left)  dir = {x:-1,y: 0};
    if (keys.right) dir = {x:1, y: 0};
    bullets.push({ x: player.x, y: player.y, dir: dir });
    playSound(shootBuffer);
    canShoot = false;
    setTimeout(() => { canShoot = true; }, shootCooldown / (activePowerups.rapid ? 2 : 1));
  }

  // Update bullets
  bullets = bullets.filter(b => {
    b.x += b.dir.x * 5;
    b.y += b.dir.y * 5;
    // Check bounds
    if (b.x < 0 || b.x > canvas.width/devicePixelRatio || b.y < 0 || b.y > canvas.height/devicePixelRatio) {
      return false;
    }
    // Check collision with enemies
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (Math.hypot(b.x - e.x, b.y - e.y) < 16) {
        enemies.splice(i, 1);
        playSound(enemyDieBuffer);
        player.score += 100;
        return false;
      }
    }
    return true;
  });

  // Update enemies (simple chase)
  enemies.forEach(e => {
    // Move towards player if no wall in direct path (line-of-sight simple)
    let dx = player.x - e.x;
    let dy = player.y - e.y;
    let step = 1.5;
    if (Math.abs(dx) > Math.abs(dy)) {
      e.x += (dx > 0 ? step : -step);
    } else {
      e.y += (dy > 0 ? step : -step);
    }
    // Collision with player
    if (Math.hypot(player.x - e.x, player.y - e.y) < 16) {
      if (activePowerups.shield) {
        activePowerups.shield = false;
      } else {
        player.lives--;
      }
      // Reset player position briefly
      player.x = 1.5*tilesize; player.y = 1.5*tilesize;
    }
  });

  // Update power-up timers
  Object.keys(powerupTimers).forEach(k => {
    if (powerupTimers[k] > 0) {
      powerupTimers[k]--;
      if (powerupTimers[k] === 0) {
        activePowerups[k] = false;
      }
    }
  });

  // Update HUD
  hudScore.textContent = `Score: ${player.score}`;
  hudLives.textContent = `Lives: ${player.lives}`;
  let puText = [];
  if (activePowerups.shield) puText.push("Shield");
  if (activePowerups.speed) puText.push("Speed");
  if (activePowerups.rapid) puText.push("Rapid");
  hudPowerups.textContent = `Power-ups: ${puText.join(', ') || 'None'}`;

  // Check win/lose conditions
  if (player.lives <= 0) {
    // Game over
    finalScoreSpan.textContent = player.score;
    gameOverScreen.classList.remove('hidden');
  }
  // Check all diamonds collected (win level)
  if (player.lives > 0 && allDiamondsCollected()) {
    currentLevel++;
    if (currentLevel > 3) {
      // No more levels, win game - show game over as win
      finalScoreSpan.textContent = player.score;
      gameOverScreen.querySelector('h1').textContent = "You Win!";
      gameOverScreen.classList.remove('hidden');
    } else {
      loadLevel(currentLevel);
    }
  }
}

function allDiamondsCollected() {
  for (let row of levelMap) {
    if (row.includes(2)) return false;
  }
  return true;
}

// Rendering function
function renderGame() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw map (dirt and diamonds)
  for (let y = 0; y < levelMap.length; y++) {
    for (let x = 0; x < levelMap[y].length; x++) {
      let tile = levelMap[y][x];
      if (tile === 1) {
        ctx.fillStyle = '#885511'; // dirt color
        ctx.fillRect(x*tilesize, y*tilesize, tilesize, tilesize);
      } else if (tile === 2) {
        // diamond (simple blue square for demo)
        ctx.fillStyle = '#55f';
        ctx.fillRect(x*tilesize+8, y*tilesize+8, tilesize-16, tilesize-16);
      }
    }
  }
  // Draw player (green square)
  ctx.fillStyle = '#0f0';
  ctx.fillRect(player.x-16, player.y-16, 32, 32);
  // Draw enemies (red squares)
  ctx.fillStyle = '#f00';
  enemies.forEach(e => {
    ctx.fillRect(e.x-16, e.y-16, 32, 32);
  });
  // Draw bullets (yellow small)
  ctx.fillStyle = '#ff0';
  bullets.forEach(b => {
    ctx.fillRect(b.x-4, b.y-4, 8, 8);
  });
}

// Start the game on first input
document.addEventListener('keydown', () => {
  if (startScreen && !startScreen.classList.contains('hidden')) startGame();
}, {once: true});
canvas.addEventListener('touchstart', () => {
  if (startScreen && !startScreen.classList.contains('hidden')) startGame();
}, {once: true});