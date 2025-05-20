// Digger Game - JavaScript

// Constants for tile size and map dimensions
const TILE_SIZE = 32;
const COLS = 20;
const ROWS = 15;
const CANVAS_WIDTH = COLS * TILE_SIZE;
const CANVAS_HEIGHT = ROWS * TILE_SIZE;

// Key codes
const KEY_LEFT = 'ArrowLeft', KEY_RIGHT = 'ArrowRight', KEY_UP = 'ArrowUp', KEY_DOWN = 'ArrowDown', KEY_SHOOT = ' ';

// Game variables
let canvas, ctx;
let score = 0;
let level = 1;
let gameState = 'title'; // 'title', 'playing', 'levelComplete', 'gameover', 'win'

// Power-up timers (in seconds)
let speedTime = 0, shieldTime = 0, fireTime = 0;

// Player and enemies
let player = null;
let enemies = [];
let bullets = [];

// Map and items
let map = [];
let emeralds = [];
let goldBags = [];
let powerups = [];

// Control state
let keys = {};
let touchState = {up:false, down:false, left:false, right:false, shoot:false};

// Time tracking
let lastTime = 0;
let levelCompleteTimer = 0;

// Initialize the game
function initGame() {
    // Setup canvas
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Setup keyboard event listeners
    window.addEventListener('keydown', function(e) {
        if (e.key === KEY_LEFT || e.key === 'a') keys.left = true;
        if (e.key === KEY_RIGHT || e.key === 'd') keys.right = true;
        if (e.key === KEY_UP || e.key === 'w') keys.up = true;
        if (e.key === KEY_DOWN || e.key === 's') keys.down = true;
        if (e.key === KEY_SHOOT) keys.shoot = true;
        // Start game on Enter if not already playing
        if (gameState !== 'playing' && e.key === 'Enter') {
            startLevel(1);
            gameState = 'playing';
        }
        // Restart to title on game over or win
        if ((gameState === 'gameover' || gameState === 'win') && (e.key === 'Enter' || e.key === KEY_SHOOT)) {
            gameState = 'title';
        }
    });
    window.addEventListener('keyup', function(e) {
        if (e.key === KEY_LEFT || e.key === 'a') keys.left = false;
        if (e.key === KEY_RIGHT || e.key === 'd') keys.right = false;
        if (e.key === KEY_UP || e.key === 'w') keys.up = false;
        if (e.key === KEY_DOWN || e.key === 's') keys.down = false;
        if (e.key === KEY_SHOOT) keys.shoot = false;
    });

    // Touch controls for buttons
    document.getElementById('btn-up').addEventListener('touchstart', e => { touchState.up = true; e.preventDefault(); });
    document.getElementById('btn-up').addEventListener('touchend', e => { touchState.up = false; e.preventDefault(); });
    document.getElementById('btn-down').addEventListener('touchstart', e => { touchState.down = true; e.preventDefault(); });
    document.getElementById('btn-down').addEventListener('touchend', e => { touchState.down = false; e.preventDefault(); });
    document.getElementById('btn-left').addEventListener('touchstart', e => { touchState.left = true; e.preventDefault(); });
    document.getElementById('btn-left').addEventListener('touchend', e => { touchState.left = false; e.preventDefault(); });
    document.getElementById('btn-right').addEventListener('touchstart', e => { touchState.right = true; e.preventDefault(); });
    document.getElementById('btn-right').addEventListener('touchend', e => { touchState.right = false; e.preventDefault(); });
    document.getElementById('btn-fire').addEventListener('touchstart', e => { touchState.shoot = true; e.preventDefault(); });
    document.getElementById('btn-fire').addEventListener('touchend', e => { touchState.shoot = false; e.preventDefault(); });

    // Mouse controls (desktop clicks)
    document.getElementById('btn-up').addEventListener('mousedown', () => { touchState.up = true; });
    document.getElementById('btn-up').addEventListener('mouseup', () => { touchState.up = false; });
    document.getElementById('btn-down').addEventListener('mousedown', () => { touchState.down = true; });
    document.getElementById('btn-down').addEventListener('mouseup', () => { touchState.down = false; });
    document.getElementById('btn-left').addEventListener('mousedown', () => { touchState.left = true; });
    document.getElementById('btn-left').addEventListener('mouseup', () => { touchState.left = false; });
    document.getElementById('btn-right').addEventListener('mousedown', () => { touchState.right = true; });
    document.getElementById('btn-right').addEventListener('mouseup', () => { touchState.right = false; });
    document.getElementById('btn-fire').addEventListener('mousedown', () => { touchState.shoot = true; });
    document.getElementById('btn-fire').addEventListener('mouseup', () => { touchState.shoot = false; });

    // Initial state
    score = 0;
    level = 1;
    gameState = 'title';
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// Start a level
function startLevel(lvl) {
    level = lvl;
    // Reset power-ups
    speedTime = shieldTime = fireTime = 0;
    // Generate new map and items
    generateMap();
    // Create player at bottom center
    player = {
        x: Math.floor(COLS/2) * TILE_SIZE,
        y: (ROWS-1) * TILE_SIZE,
        width: TILE_SIZE,
        height: TILE_SIZE,
        speed: 120
    };
    // Create enemies
    enemies = [];
    let enemyCount = level + 1;
    for (let i = 0; i < enemyCount; i++) {
        let ex, ey;
        do {
            ex = Math.floor(Math.random() * COLS);
            ey = Math.floor(Math.random() * ROWS / 2);
        } while (!isCellEmpty(ex, ey) || (Math.abs(ex - player.x/TILE_SIZE) + Math.abs(ey - player.y/TILE_SIZE) < 5));
        enemies.push({
            x: ex * TILE_SIZE,
            y: ey * TILE_SIZE,
            width: TILE_SIZE,
            height: TILE_SIZE,
            speed: 80 + 10 * level,
            path: [],
            lastPathTime: 0
        });
    }
    bullets = [];
    lastTime = performance.now();
    gameState = 'playing';
}

// Generate map layout, emeralds, bags, power-ups
function generateMap() {
    // Initialize map with dirt
    map = [];
    for (let y = 0; y < ROWS; y++) {
        map[y] = [];
        for (let x = 0; x < COLS; x++) {
            // Border walls
            if (y === ROWS-1 || x === 0 || x === COLS-1) {
                map[y][x] = 1;
            } else {
                map[y][x] = 1;
            }
        }
    }
    // Carve random tunnels from bottom center
    let startX = Math.floor(COLS/2), startY = ROWS-1;
    map[startY][startX] = 0;
    let empties = [{x: startX, y: startY}];
    for (let i = 0; i < 500; i++) {
        let idx = Math.floor(Math.random() * empties.length);
        let cell = empties[idx];
        let dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
        let d = dirs[Math.floor(Math.random() * dirs.length)];
        let nx = cell.x + d.x, ny = cell.y + d.y;
        if (nx > 0 && nx < COLS-1 && ny >= 0 && ny < ROWS-1 && map[ny][nx] === 1) {
            map[ny][nx] = 0;
            empties.push({x: nx, y: ny});
        }
    }
    // Place emeralds in dirt cells
    emeralds = [];
    let emeraldCount = 5 + level * 2;
    for (let i = 0; i < emeraldCount; i++) {
        let ex, ey;
        do {
            ex = Math.floor(Math.random() * (COLS-2)) + 1;
            ey = Math.floor(Math.random() * (ROWS-1));
        } while (map[ey][ex] === 0 || (ex === startX && ey === startY));
        emeralds.push({x: ex, y: ey});
    }
    // Place gold bags
    goldBags = [];
    let bagCount = 3 + level;
    for (let i = 0; i < bagCount; i++) {
        let bx, by;
        do {
            bx = Math.floor(Math.random() * (COLS-2)) + 1;
            by = Math.floor(Math.random() * (ROWS-1));
        } while (map[by][bx] === 0 || (bx === startX && by === startY));
        goldBags.push({x: bx, y: by, falling: false, fallProgress: 0});
    }
    // Place power-ups in empty areas
    powerups = [];
    let types = ['speed','shield','fire'];
    for (let i = 0; i < level; i++) {
        let px, py;
        do {
            px = Math.floor(Math.random() * (COLS-2)) + 1;
            py = Math.floor(Math.random() * (ROWS-1));
        } while (map[py][px] === 1 || emeralds.some(e => e.x === px && e.y === py) || goldBags.some(g => g.x === px && g.y === py));
        powerups.push({x: px, y: py, type: types[i % types.length]});
    }
}

// Check if a tile is empty (no dirt/wall and no gold bag)
function isCellEmpty(x, y) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
    if (map[y][x] === 1) return false;
    if (goldBags.find(b => b.x === x && b.y === y)) return false;
    return true;
}

// A* pathfinding from (startX,startY) to (goalX,goalY)
function findPath(startX, startY, goalX, goalY) {
    // Adjust goal if blocked
    if (!isCellEmpty(goalX, goalY)) {
        let neighbors = [
            {x: goalX+1, y: goalY}, {x: goalX-1, y: goalY},
            {x: goalX, y: goalY+1}, {x: goalX, y: goalY-1}
        ];
        for (let n of neighbors) {
            if (isCellEmpty(n.x, n.y)) {
                goalX = n.x;
                goalY = n.y;
                break;
            }
        }
    }
    let cols = COLS, rows = ROWS;
    let start = {x: startX, y: startY};
    let goal = {x: goalX, y: goalY};
    let closed = Array(rows).fill(0).map(() => Array(cols).fill(false));
    let openSet = [];
    let cameFrom = {};
    openSet.push({
        x: start.x, y: start.y,
        g: 0,
        f: Math.abs(start.x - goal.x) + Math.abs(start.y - goal.y)
    });
    while (openSet.length > 0) {
        // Sort by f-score
        openSet.sort((a, b) => a.f - b.f);
        let node = openSet.shift();
        if (closed[node.y][node.x]) continue;
        closed[node.y][node.x] = true;
        if (node.x === goal.x && node.y === goal.y) {
            // Reconstruct path
            let path = [], key = node.x + ',' + node.y, cur = node;
            path.push({x: cur.x, y: cur.y});
            while (cameFrom[key]) {
                cur = cameFrom[key];
                path.push({x: cur.x, y: cur.y});
                key = cur.x + ',' + cur.y;
            }
            path.reverse();
            path.shift(); // remove start
            return path;
        }
        // Explore neighbors
        let dirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
        for (let d of dirs) {
            let nx = node.x + d.dx, ny = node.y + d.dy;
            if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
            if (closed[ny][nx]) continue;
            if (!isCellEmpty(nx, ny) && !(nx === goal.x && ny === goal.y)) continue;
            let g = node.g + 1;
            let h = Math.abs(nx - goal.x) + Math.abs(ny - goal.y);
            let f = g + h;
            let existing = openSet.find(n => n.x === nx && n.y === ny);
            if (!existing || g < existing.g) {
                openSet.push({x: nx, y: ny, g: g, f: f});
                cameFrom[nx+','+ny] = {x: node.x, y: node.y};
            }
        }
    }
    return [];
}

// Main game loop
function gameLoop(timestamp) {
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    update(dt);
    draw();
    requestAnimationFrame(gameLoop);
}

// Update game logic
function update(dt) {
    // Update from touch input
    keys.left = touchState.left || keys.left;
    keys.right = touchState.right || keys.right;
    keys.up = touchState.up || keys.up;
    keys.down = touchState.down || keys.down;
    keys.shoot = touchState.shoot || keys.shoot;

    if (gameState === 'playing') {
        // Update timers
        speedTime = Math.max(0, speedTime - dt);
        shieldTime = Math.max(0, shieldTime - dt);
        fireTime = Math.max(0, fireTime - dt);

        updatePlayer(dt);
        updateBullets(dt);
        updateEnemies(dt);
        updateGoldBags(dt);

        // Check player collision with enemies
        enemies.forEach(en => {
            if (Math.floor(en.x/TILE_SIZE) === Math.floor(player.x/TILE_SIZE) &&
                Math.floor(en.y/TILE_SIZE) === Math.floor(player.y/TILE_SIZE)) {
                if (shieldTime <= 0) gameState = 'gameover';
                else enemies = enemies.filter(e => e !== en);
            }
        });
        // Collect emeralds
        for (let i = emeralds.length - 1; i >= 0; i--) {
            let em = emeralds[i];
            if (em.x === Math.floor(player.x/TILE_SIZE) && em.y === Math.floor(player.y/TILE_SIZE)) {
                emeralds.splice(i, 1);
                score += 10;
            }
        }
        // Collect power-ups
        for (let i = powerups.length - 1; i >= 0; i--) {
            let pu = powerups[i];
            if (pu.x === Math.floor(player.x/TILE_SIZE) && pu.y === Math.floor(player.y/TILE_SIZE)) {
                if (pu.type === 'speed') speedTime = 10;
                if (pu.type === 'shield') shieldTime = 10;
                if (pu.type === 'fire') fireTime = 10;
                powerups.splice(i, 1);
            }
        }
        // Check level completion
        if (emeralds.length === 0) {
            if (level < 3) {
                gameState = 'levelComplete';
                levelCompleteTimer = 2.0;
            } else {
                gameState = 'win';
            }
        }
    }
    // Transition after level complete
    if (gameState === 'levelComplete') {
        levelCompleteTimer -= dt;
        if (levelCompleteTimer <= 0) {
            startLevel(level + 1);
        }
    }
}

// Update player movement and shooting
function updatePlayer(dt) {
    if (!player) return;
    let moveX = 0, moveY = 0;
    let sp = player.speed * (speedTime > 0 ? 1.5 : 1.0);
    if (keys.left) moveX = -sp;
    if (keys.right) moveX = sp;
    if (keys.up) moveY = -sp;
    if (keys.down) moveY = sp;
    if (moveX !== 0 && moveY !== 0) {
        moveX *= 0.7071; moveY *= 0.7071;
    }
    // Horizontal move
    if (moveX !== 0) {
        let newX = player.x + moveX * dt;
        let targetCol = Math.floor((newX + (moveX>0? player.width-1:0)) / TILE_SIZE);
        let row = Math.floor(player.y / TILE_SIZE);
        if (targetCol < 0 || targetCol >= COLS) {
            newX = player.x;
        } else if (map[row][targetCol] === 1) {
            map[row][targetCol] = 0; // Dig dirt
            newX = player.x + moveX * dt;
        } else if (goldBags.find(b => b.x === targetCol && b.y === row)) {
            newX = player.x;
        }
        player.x = newX;
    }
    // Vertical move
    if (moveY !== 0) {
        let newY = player.y + moveY * dt;
        let targetRow = Math.floor((newY + (moveY>0? player.height-1:0)) / TILE_SIZE);
        let col = Math.floor(player.x / TILE_SIZE);
        if (targetRow < 0 || targetRow >= ROWS) {
            newY = player.y;
        } else if (map[targetRow][col] === 1) {
            map[targetRow][col] = 0; // Dig dirt
            newY = player.y + moveY * dt;
        } else if (goldBags.find(b => b.x === col && b.y === targetRow)) {
            newY = player.y;
        }
        player.y = newY;
    }
    // Shooting bullets
    if (keys.shoot && bullets.length < 3) {
        let dx = 0, dy = 0;
        if (keys.left) dx = -1;
        else if (keys.right) dx = 1;
        else if (keys.up) dy = -1;
        else if (keys.down) dy = 1;
        else dx = 1;
        let bx = player.x + player.width/2;
        let by = player.y + player.height/2;
        bullets.push({x: bx, y: by, vx: dx * 200, vy: dy * 200, width: 5, height: 5});
        // Prevent continuous firing
        keys.shoot = false;
        touchState.shoot = false;
    }
}

// Update enemies (pathfinding and movement)
function updateEnemies(dt) {
    enemies.forEach(enemy => {
        // Recalculate path occasionally
        if (enemy.path.length === 0 || performance.now() - enemy.lastPathTime > 500) {
            enemy.lastPathTime = performance.now();
            let pCol = Math.floor(player.x / TILE_SIZE);
            let pRow = Math.floor(player.y / TILE_SIZE);
            // Predict player movement
            let tCol = pCol, tRow = pRow;
            if (keys.left) tCol--;
            if (keys.right) tCol++;
            if (keys.up) tRow--;
            if (keys.down) tRow++;
            tCol = Math.max(0, Math.min(COLS-1, tCol));
            tRow = Math.max(0, Math.min(ROWS-1, tRow));
            enemy.path = findPath(Math.floor(enemy.x / TILE_SIZE), Math.floor(enemy.y / TILE_SIZE), tCol, tRow);
        }
        // Move along path
        if (enemy.path.length > 0) {
            let next = enemy.path[0];
            let eCol = Math.floor(enemy.x / TILE_SIZE);
            let eRow = Math.floor(enemy.y / TILE_SIZE);
            let dx = (next.x > eCol) ? 1 : (next.x < eCol ? -1 : 0);
            let dy = (next.y > eRow) ? 1 : (next.y < eRow ? -1 : 0);
            let speed = enemy.speed * dt;
            enemy.x += dx * speed;
            enemy.y += dy * speed;
            if ((dx !== 0 && Math.abs(enemy.x / TILE_SIZE - next.x) < 0.1) ||
                (dy !== 0 && Math.abs(enemy.y / TILE_SIZE - next.y) < 0.1)) {
                enemy.x = next.x * TILE_SIZE;
                enemy.y = next.y * TILE_SIZE;
                enemy.path.shift();
            }
        }
    });
}

// Update bullets (movement and collisions)
function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        // Remove if out of bounds
        if (b.x < 0 || b.x > CANVAS_WIDTH || b.y < 0 || b.y > CANVAS_HEIGHT) {
            bullets.splice(i, 1);
            continue;
        }
        let bCol = Math.floor(b.x / TILE_SIZE);
        let bRow = Math.floor(b.y / TILE_SIZE);
        // Hit dirt
        if (map[bRow] && map[bRow][bCol] === 1) {
            if (fireTime > 0) {
                map[bRow][bCol] = 0;
            }
            bullets.splice(i, 1);
            continue;
        }
        // Hit gold bag
        let bag = goldBags.find(g => g.x === bCol && g.y === bRow);
        if (bag) {
            bullets.splice(i, 1);
            continue;
        }
        // Hit emerald
        for (let j = emeralds.length - 1; j >= 0; j--) {
            let em = emeralds[j];
            if (em.x === bCol && em.y === bRow) {
                emeralds.splice(j, 1);
                score += 10;
            }
        }
        // Hit enemy
        for (let j = enemies.length - 1; j >= 0; j--) {
            let en = enemies[j];
            if (Math.floor(en.x/TILE_SIZE) === bCol && Math.floor(en.y/TILE_SIZE) === bRow) {
                enemies.splice(j, 1);
                bullets.splice(i, 1);
                break;
            }
        }
    }
}

// Update gold bag physics (falling)
function updateGoldBags(dt) {
    for (let bag of goldBags) {
        if (!bag.falling && isCellEmpty(bag.x, bag.y+1)) {
            bag.falling = true;
            bag.fallProgress = 0;
        }
        if (bag.falling) {
            bag.fallProgress += dt * 5;
            if (bag.fallProgress >= 1) {
                bag.fallProgress -= 1;
                bag.y += 1;
                if (!isCellEmpty(bag.x, bag.y+1)) {
                    bag.falling = false;
                    bag.fallProgress = 0;
                }
                // Bag hits player or enemy
                if (Math.floor(player.x/TILE_SIZE) === bag.x && Math.floor(player.y/TILE_SIZE) === bag.y) {
                    if (shieldTime <= 0) gameState = 'gameover';
                }
                for (let i = enemies.length - 1; i >= 0; i--) {
                    let e = enemies[i];
                    if (Math.floor(e.x/TILE_SIZE) === bag.x && Math.floor(e.y/TILE_SIZE) === bag.y) {
                        enemies.splice(i, 1);
                    }
                }
            }
        }
    }
}

// Draw game objects and UI
function draw() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw dirt tiles
    ctx.fillStyle = '#8B4513';
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (map[y][x] === 1) {
                ctx.fillRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
    // Draw emeralds
    for (let em of emeralds) {
        ctx.fillStyle = 'green';
        ctx.beginPath();
        ctx.moveTo((em.x+0.5)*TILE_SIZE, em.y*TILE_SIZE);
        ctx.lineTo(em.x*TILE_SIZE, (em.y+0.5)*TILE_SIZE);
        ctx.lineTo((em.x+0.5)*TILE_SIZE, (em.y+1)*TILE_SIZE);
        ctx.lineTo((em.x+1)*TILE_SIZE, (em.y+0.5)*TILE_SIZE);
        ctx.closePath();
        ctx.fill();
    }
    // Draw power-ups
    powerups.forEach(pu => {
        ctx.fillStyle = (pu.type==='speed'?'yellow': pu.type==='shield'?'cyan':'red');
        ctx.fillRect(pu.x*TILE_SIZE+TILE_SIZE/4, pu.y*TILE_SIZE+TILE_SIZE/4, TILE_SIZE/2, TILE_SIZE/2);
    });
    // Draw gold bags
    ctx.fillStyle = 'gold';
    goldBags.forEach(bag => {
        ctx.fillRect(bag.x*TILE_SIZE, bag.y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
    });
    // Draw player
    if (player) {
        ctx.fillStyle = 'blue';
        ctx.fillRect(player.x, player.y, player.width, player.height);
        if (shieldTime > 0) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.strokeRect(player.x, player.y, player.width, player.height);
        }
    }
    // Draw enemies
    ctx.fillStyle = 'purple';
    enemies.forEach(en => {
        ctx.fillRect(en.x, en.y, en.width, en.height);
    });
    // Draw bullets
    ctx.fillStyle = 'orange';
    bullets.forEach(b => {
        ctx.fillRect(b.x, b.y, b.width, b.height);
    });

    // Draw UI text
    ctx.fillStyle = 'white';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + score, 10, 20);
    ctx.fillText('Speed: ' + Math.ceil(speedTime) + ' Shield: ' + Math.ceil(shieldTime) + ' Fire: ' + Math.ceil(fireTime), 120, 20);

    ctx.textAlign = 'center';
    ctx.font = '32px sans-serif';
    if (gameState === 'title') {
        ctx.fillText('Press ENTER to Start', CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
    } else if (gameState === 'gameover') {
        ctx.fillText('Game Over', CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
        ctx.font = '20px sans-serif';
        ctx.fillText('Press ENTER to Restart', CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 40);
    } else if (gameState === 'win') {
        ctx.fillText('You Win!', CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
        ctx.font = '20px sans-serif';
        ctx.fillText('Final Score: ' + score, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 30);
    } else if (gameState === 'levelComplete') {
        ctx.fillText('Level ' + level + ' Complete!', CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
    }
}

// Start game on window load
window.onload = initGame;