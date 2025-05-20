// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let canvasWidth, canvasHeight;
let gridCols, gridRows, cellSize = 40; // Grid cell size in pixels
let grid = []; // 2D array to track dirt (true = dirt present)

// Player state
let player = {
    x: 0, y: 0,
    size: 20,
    speed: 120, // base speed in pixels/second
    lastDir: { x: 0, y: 0 },
    shieldActive: false,
    speedActive: false,
    fireActive: false
};
let score = 0;
let currentLevel = 3; // Start at level 3 (easiest, as per spec)
let gameState = 'menu'; // 'menu', 'playing', 'levelComplete', 'gameover'

// Enemies, bullets, and power-ups
let enemies = [];
let bullets = [];
let powerUps = []; // {x, y, type, spawnTime}

// Timing
let lastTimestamp = 0;

// Key input tracking
const keys = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    Space: false
};

// DOM elements for overlay and HUD
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMessage = document.getElementById('overlay-message');
const overlayButton = document.getElementById('overlay-button');
const hudScore = document.getElementById('score');
const hudLevel = document.getElementById('level');
const hudPowers = document.getElementById('powers');

// Set canvas to full screen
function resizeCanvas() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    // Calculate grid based on cellSize
    gridCols = Math.floor(canvasWidth / cellSize);
    gridRows = Math.floor(canvasHeight / cellSize);
    // Reset grid if in menu or level change
    if (gameState === 'playing') initGrid();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/* Initialize or reset the grid of dirt blocks.
   The border is kept empty (no dirt) so player/enemies spawn/move easily. */
function initGrid() {
    grid = new Array(gridCols);
    for (let x = 0; x < gridCols; x++) {
        grid[x] = new Array(gridRows);
        for (let y = 0; y < gridRows; y++) {
            // Border cells: no dirt
            if (x === 0 || y === 0 || x === gridCols - 1 || y === gridRows - 1) {
                grid[x][y] = false;
            } else {
                grid[x][y] = true; // dirt present
            }
        }
    }
    // Dig out the player's starting cell
    const startX = Math.floor(gridCols / 2);
    const startY = Math.floor(gridRows / 2);
    grid[startX][startY] = false;
    player.x = startX * cellSize + cellSize/2;
    player.y = startY * cellSize + cellSize/2;
}

/* Initialize a level: set up player, enemies, score, etc. */
function startLevel(level) {
    currentLevel = level;
    // Reset player state
    player.shieldActive = false;
    player.speedActive = false;
    player.fireActive = false;
    player.lastDir = { x: 1, y: 0 };
    player.speed = 120;
    score = 0;
    // Initialize grid (dirt)
    initGrid();
    // Spawn enemies based on level difficulty
    enemies = [];
    let numEnemies = level === 3 ? 3 : (level === 2 ? 5 : 7);
    let enemySpeed = (level === 3 ? 60 : (level === 2 ? 100 : 150));
    for (let i = 0; i < numEnemies; i++) {
        // Spawn at a random border cell
        let ex, ey;
        if (Math.random() < 0.5) {
            // Top or bottom border
            ex = Math.floor(Math.random() * gridCols);
            ey = (Math.random() < 0.5 ? 1 : gridRows - 2);
        } else {
            // Left or right border
            ex = (Math.random() < 0.5 ? 1 : gridCols - 2);
            ey = Math.floor(Math.random() * gridRows);
        }
        enemies.push({
            x: ex * cellSize + cellSize/2,
            y: ey * cellSize + cellSize/2,
            size: 20,
            speed: enemySpeed,
            dx: 0,
            dy: 0
        });
    }
    bullets = [];
    powerUps = [];
    // Update HUD
    hudScore.textContent = `Score: ${score}`;
    hudLevel.textContent = `Level: ${currentLevel}`;
    hudPowers.textContent = `Power-up: None`;
    // Enter playing state
    gameState = 'playing';
    overlay.style.display = 'none';
}

/* Check for game-over condition or level completion. */
function checkGameStatus() {
    // Level complete: all dirt is dug
    let anyDirt = false;
    for (let x = 0; x < gridCols; x++) {
        for (let y = 0; y < gridRows; y++) {
            if (grid[x][y]) { anyDirt = true; break; }
        }
        if (anyDirt) break;
    }
    if (!anyDirt) {
        gameState = 'levelComplete';
        overlayTitle.textContent = `Level ${currentLevel} Complete!`;
        overlayMessage.textContent = 'Click to continue';
        overlayButton.textContent = (currentLevel > 1 ? 'Next Level' : 'Restart Game');
        overlay.style.display = 'block';
    }
}

/* Main game update loop (called via requestAnimationFrame). */
function update(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = (timestamp - lastTimestamp) / 1000; // seconds
    lastTimestamp = timestamp;

    if (gameState === 'playing') {
        // Player movement
        let moveX = 0, moveY = 0;
        if (keys.ArrowLeft)  moveX -= 1;
        if (keys.ArrowRight) moveX += 1;
        if (keys.ArrowUp)    moveY -= 1;
        if (keys.ArrowDown)  moveY += 1;
        // Normalize diagonal speed
        if (moveX !== 0 && moveY !== 0) {
            moveX *= Math.SQRT1_2;
            moveY *= Math.SQRT1_2;
        }
        let currentSpeed = player.speed * (player.speedActive ? 2 : 1);
        player.x += moveX * currentSpeed * delta;
        player.y += moveY * currentSpeed * delta;
        // Keep player inside bounds
        player.x = Math.max(0, Math.min(canvasWidth, player.x));
        player.y = Math.max(0, Math.min(canvasHeight, player.y));
        // Update last direction if moving
        if (moveX !== 0 || moveY !== 0) {
            player.lastDir = { x: Math.sign(moveX), y: Math.sign(moveY) };
        }
        // Digging: remove dirt under player
        const cellX = Math.floor(player.x / cellSize);
        const cellY = Math.floor(player.y / cellSize);
        if (grid[cellX] && grid[cellX][cellY]) {
            grid[cellX][cellY] = false;
            score += 10;
            hudScore.textContent = `Score: ${score}`;
        }

        // Enemy AI and movement
        enemies.forEach(enemy => {
            // Decide direction: smarter per level
            let dx = player.x - enemy.x;
            let dy = player.y - enemy.y;
            const dist = Math.hypot(dx, dy);
            if (currentLevel === 1 || (currentLevel === 2 && dist < 200) || (currentLevel === 3 && dist < 100)) {
                // Chase player (normalize direction)
                if (dist > 0) {
                    enemy.dx = (dx / dist) * enemy.speed;
                    enemy.dy = (dy / dist) * enemy.speed;
                }
            } else {
                // Random wandering: occasionally change direction
                if (Math.random() < 0.01) {
                    const angle = Math.random() * 2 * Math.PI;
                    enemy.dx = Math.cos(angle) * enemy.speed;
                    enemy.dy = Math.sin(angle) * enemy.speed;
                }
            }
            // Move enemy
            enemy.x += enemy.dx * delta;
            enemy.y += enemy.dy * delta;
            // Bounce off borders
            if (enemy.x < 0 || enemy.x > canvasWidth) enemy.dx *= -1;
            if (enemy.y < 0 || enemy.y > canvasHeight) enemy.dy *= -1;
            // Check collision with player
            const px = player.x - enemy.x, py = player.y - enemy.y;
            if (Math.hypot(px, py) < (player.size + enemy.size) / 2) {
                if (player.shieldActive) {
                    // Lose shield instead of game over
                    player.shieldActive = false;
                    hudPowers.textContent = `Power-up: None`;
                } else {
                    // Game over
                    gameState = 'gameover';
                    overlayTitle.textContent = 'Game Over!';
                    overlayMessage.textContent = 'Click to restart';
                    overlayButton.textContent = 'Restart';
                    overlay.style.display = 'block';
                }
            }
        });

        // Shooting: handle spacebar trigger
        if (keys.Space) {
            // Create a bullet if Space just pressed (debounce)
            if (!player._spacePressed) {
                player._spacePressed = true;
                shootBullet();
            }
        } else {
            player._spacePressed = false;
        }

        // Update bullets
        bullets.forEach((bullet, b) => {
            bullet.x += bullet.dx * bullet.speed * delta;
            bullet.y += bullet.dy * bullet.speed * delta;
            // Remove if off-screen
            if (bullet.x < 0 || bullet.x > canvasWidth || bullet.y < 0 || bullet.y > canvasHeight) {
                bullets.splice(b, 1);
            } else {
                // Check collision with enemies
                enemies.forEach((enemy, e) => {
                    const bx = bullet.x - enemy.x, by = bullet.y - enemy.y;
                    if (Math.hypot(bx, by) < enemy.size/2) {
                        // Hit enemy
                        enemies.splice(e, 1);
                        bullets.splice(b, 1);
                        score += 100;
                        hudScore.textContent = `Score: ${score}`;
                        // Possibly drop a power-up at this location
                        if (Math.random() < 0.3) {
                            const puX = Math.floor(enemy.x / cellSize) * cellSize + cellSize/2;
                            const puY = Math.floor(enemy.y / cellSize) * cellSize + cellSize/2;
                            const types = ['shield', 'speed', 'fire'];
                            const type = types[Math.floor(Math.random() * types.length)];
                            powerUps.push({ x: puX, y: puY, type: type, spawnTime: performance.now() });
                        }
                    }
                });
            }
        });

        // Update power-ups (spawn from kills or random)
        powerUps.forEach((pu, i) => {
            // Auto-expire after 10 seconds
            if (performance.now() - pu.spawnTime > 10000) {
                powerUps.splice(i, 1);
            }
            // Check pickup by player
            const dx = player.x - pu.x, dy = player.y - pu.y;
            if (Math.hypot(dx, dy) < player.size) {
                // Activate corresponding power-up
                if (pu.type === 'speed') {
                    player.speedActive = true;
                    setTimeout(() => { player.speedActive = false; hudPowers.textContent = `Power-up: None`; }, 5000);
                    hudPowers.textContent = `Power-up: Speed`;
                } else if (pu.type === 'shield') {
                    player.shieldActive = true;
                    setTimeout(() => { player.shieldActive = false; hudPowers.textContent = `Power-up: None`; }, 5000);
                    hudPowers.textContent = `Power-up: Shield`;
                } else if (pu.type === 'fire') {
                    player.fireActive = true;
                    setTimeout(() => { player.fireActive = false; hudPowers.textContent = `Power-up: None`; }, 5000);
                    hudPowers.textContent = `Power-up: Fire`;
                }
                powerUps.splice(i, 1);
            }
        });

        // Check if level is complete (all dirt gone)
        checkGameStatus();
    }

    drawGame();

    // Loop
    requestAnimationFrame(update);
}

/* Shoot a bullet from the player. Support multiple bullets if 'fire' power-up active. */
function shootBullet() {
    // Determine bullet directions
    const dirs = [];
    const dir = player.lastDir;
    if (dir.x === 0 && dir.y === 0) {
        // No movement direction; default to up
        dirs.push({x: 0, y: -1});
    } else {
        dirs.push({x: dir.x, y: dir.y});
        // If fire power-up, add spread bullets
        if (player.fireActive) {
            if (dir.x !== 0) {
                // Shooting left/right -> add up-left and down-left or up-right/down-right
                dirs.push({x: dir.x, y: 0.5});
                dirs.push({x: dir.x, y: -0.5});
            } else {
                // Shooting up/down -> add left/up-left and right/up-right
                dirs.push({x: 0.5, y: dir.y});
                dirs.push({x: -0.5, y: dir.y});
            }
        }
    }
    // Create bullet(s)
    dirs.forEach(d => {
        const mag = Math.hypot(d.x, d.y);
        bullets.push({
            x: player.x,
            y: player.y,
            dx: d.x / mag,
            dy: d.y / mag,
            speed: 300,
            size: 5
        });
    });
}

/* Draw all game elements on the canvas. */
function drawGame() {
    // Clear
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw dirt blocks
    ctx.fillStyle = '#654321';
    for (let x = 0; x < gridCols; x++) {
        for (let y = 0; y < gridRows; y++) {
            if (grid[x][y]) {
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }

    // Draw power-ups
    powerUps.forEach(pu => {
        if (pu.type === 'speed') ctx.fillStyle = 'cyan';
        else if (pu.type === 'shield') ctx.fillStyle = 'yellow';
        else if (pu.type === 'fire') ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, 12, 0, 2*Math.PI);
        ctx.fill();
    });

    // Draw player
    ctx.fillStyle = player.shieldActive ? '#FFD700' : '#00FF00';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size/2, 0, 2*Math.PI);
    ctx.fill();

    // Draw enemies
    ctx.fillStyle = '#FF0000';
    enemies.forEach(enemy => {
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size/2, 0, 2*Math.PI);
        ctx.fill();
    });

    // Draw bullets
    ctx.fillStyle = '#FFFFFF';
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, 2*Math.PI);
        ctx.fill();
    });
}

// Start the animation loop
requestAnimationFrame(update);

/* === Event Handlers === */

// Keyboard input
window.addEventListener('keydown', function(e) {
    if (e.code in keys) {
        keys[e.code] = true;
        e.preventDefault();
    }
    // Restart with 'R'
    if (e.key === 'r' || e.key === 'R') {
        if (gameState !== 'playing') startLevel(3);
    }
});
window.addEventListener('keyup', function(e) {
    if (e.code in keys) {
        keys[e.code] = false;
        e.preventDefault();
    }
});

// Overlay button (Start/Next/Restart)
overlayButton.addEventListener('click', () => {
    if (gameState === 'menu' || gameState === 'gameover') {
        startLevel(3);
    } else if (gameState === 'levelComplete') {
        if (currentLevel > 1) {
            startLevel(currentLevel - 1);
        } else {
            // Completed last level -> restart from easiest
            startLevel(3);
        }
    }
});

// On-screen touch controls: map to keys
const controlMap = {
    up:    ['ArrowUp'],
    down:  ['ArrowDown'],
    left:  ['ArrowLeft'],
    right: ['ArrowRight'],
    fire:  ['Space']
};
for (let id in controlMap) {
    const btn = document.getElementById(id);
    btn.addEventListener('touchstart', e => { e.preventDefault(); controlMap[id].forEach(k => keys[k] = true); });
    btn.addEventListener('touchend',   e => { e.preventDefault(); controlMap[id].forEach(k => keys[k] = false); });
    btn.addEventListener('mousedown',  e => { e.preventDefault(); controlMap[id].forEach(k => keys[k] = true); });
    btn.addEventListener('mouseup',    e => { e.preventDefault(); controlMap[id].forEach(k => keys[k] = false); });
}