// JavaScript: game.js

// Constants
const tileSize = 32;  // size of each tile in pixels
let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');

// Game state variables
let currentLevel = 0;
let score = 0, lives = 3;
let gameOver = false, levelComplete = false;

// Player object
let player = {
    x: 1 * tileSize, y: 1 * tileSize,
    dx: 0, dy: 0,
    speed: 2,
    hasShield: false, shieldTimer: 0,
    hasSpeed: false, speedTimer: 0,
    hasFire: false, fireTimer: 0,
    shootCooldown: 0
};

// Array of enemy objects
let enemies = [];
// Array of bullet objects
let bullets = [];

// Level definitions: 0=empty,1=dirt,2=emerald,3=gold bag,4=speed,5=shield,6=fire
let levels = [
    {
        map: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,2,0,0,0,0,0,0,0,0,0,0,0,2,1],
            [1,0,1,1,0,3,3,3,0,1,1,1,0,0,1],
            [1,0,1,1,0,0,0,0,0,1,1,1,0,5,1],
            [1,0,0,0,0,2,0,2,0,0,0,0,0,0,1],
            [1,0,1,1,0,0,0,0,0,1,1,1,0,0,1],
            [1,0,1,1,0,3,3,3,0,1,1,1,0,0,1],
            [1,6,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,7,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        spawn: [{x:13,y:1},{x:12,y:8}]
    },
    {
        map: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,2,0,3,0,0,0,3,0,2,0,0,2,1],
            [1,1,1,0,1,1,0,1,1,0,1,1,0,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
            [1,0,0,0,0,0,4,0,0,0,0,0,0,0,1],
            [1,2,0,1,3,0,0,0,3,0,1,0,0,7,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        spawn: [{x:13,y:1},{x:1,y:8},{x:13,y:8}]
    },
    {
        map: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,2,0,0,3,0,0,2,0,0,3,0,0,2,1],
            [1,1,1,0,1,1,0,1,0,1,1,0,1,1,1],
            [1,0,0,0,0,0,5,0,4,0,0,0,0,0,1],
            [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
            [1,0,0,6,0,0,0,0,0,0,7,0,0,0,1],
            [1,2,0,0,3,0,0,2,0,0,3,0,0,2,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        spawn: [{x:7,y:1},{x:7,y:8},{x:1,y:4},{x:13,y:4}]
    }
];

// Copy current level map for gameplay
let map = JSON.parse(JSON.stringify(levels[currentLevel].map));
let width = map[0].length, height = map.length;
canvas.width = width * tileSize;
canvas.height = height * tileSize;

// Asset loading with fallback
let assets = {};
function loadAssets() {
    assets.player = new Image(); assets.player.src = 'player.png';
    assets.player.onerror = () => { assets.player = null; };
    assets.enemy = new Image(); assets.enemy.src = 'enemy.png';
    assets.enemy.onerror = () => { assets.enemy = null; };
    assets.emerald = new Image(); assets.emerald.src = 'emerald.png';
    assets.emerald.onerror = () => { assets.emerald = null; };
    assets.gold = new Image(); assets.gold.src = 'gold.png';
    assets.gold.onerror = () => { assets.gold = null; };
    assets.speed = new Image(); assets.speed.src = 'powerup_speed.png';
    assets.speed.onerror = () => { assets.speed = null; };
    assets.shield = new Image(); assets.shield.src = 'powerup_shield.png';
    assets.shield.onerror = () => { assets.shield = null; };
    assets.fire = new Image(); assets.fire.src = 'powerup_fire.png';
    assets.fire.onerror = () => { assets.fire = null; };
}
loadAssets();

// Example sound with fallback
let sounds = {};
sounds.shoot = new Audio('shoot.wav');
sounds.shoot.onerror = () => { console.log('Shoot sound load error'); };

// Input handling
let keys = {};
window.addEventListener('keydown', e => { keys[e.key] = true; });
window.addEventListener('keyup', e => { keys[e.key] = false; });

// Simple touch controls (divide screen into regions)
let touchDirection = null;
window.addEventListener('touchstart', e => {
    let t = e.touches[0];
    let x = t.clientX, y = t.clientY;
    if (x < window.innerWidth/3) touchDirection = 'left';
    else if (x > window.innerWidth*2/3) touchDirection = 'right';
    else if (y < window.innerHeight/2) touchDirection = 'up';
    else touchDirection = 'down';
});
window.addEventListener('touchend', e => { touchDirection = null; });

// Main game loop
function gameLoop() {
    if (gameOver) {
        // Draw Game Over screen
        ctx.fillStyle = 'black';
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '20px sans-serif';
        ctx.fillText('Game Over - Final Score: ' + score, 50, canvas.height/2);
        return;
    }
    if (levelComplete) {
        // Draw Level Complete screen
        ctx.fillStyle = 'black';
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '20px sans-serif';
        ctx.fillText('Level ' + (currentLevel+1) + ' Complete! Score: ' + score, 50, canvas.height/2);
        ctx.fillText('Press Space to continue', 50, canvas.height/2 + 30);
        if (keys[' ']) {
            nextLevel();
        }
        requestAnimationFrame(gameLoop);
        return;
    }
    update();  // Update game state
    draw();    // Render
    requestAnimationFrame(gameLoop);
}

// Update game state
function update() {
    // Update timers
    if (player.shootCooldown > 0) player.shootCooldown--;
    if (player.shieldTimer > 0) player.shieldTimer--; else player.hasShield = false;
    if (player.speedTimer > 0) player.speedTimer--; else { player.hasSpeed = false; player.speed = 2; }
    if (player.fireTimer > 0) player.fireTimer--; else player.hasFire = false;

    // Player movement input
    let moveX = 0, moveY = 0;
    if (keys['ArrowLeft'] || keys['a'] || touchDirection=='left')  moveX = -1;
    if (keys['ArrowRight']|| keys['d'] || touchDirection=='right') moveX =  1;
    if (keys['ArrowUp']   || keys['w'] || touchDirection=='up')    moveY = -1;
    if (keys['ArrowDown'] || keys['s'] || touchDirection=='down')  moveY =  1;
    // Prevent diagonal speed boost
    if (moveX !== 0 && moveY !== 0) moveX = 0;

    // Apply speed power-up
    let moveSpeed = player.hasSpeed ? 4 : 2;
    player.dx = moveX * moveSpeed;
    player.dy = moveY * moveSpeed;
    // Move player and handle digging/collecting
    movePlayer();

    // Shooting input
    if ((keys[' '] || keys['f']) && player.hasFire && player.shootCooldown === 0) {
        fireBullet();
        player.shootCooldown = 20; // cooldown frames
    }

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.dx; b.y += b.dy;
        // Remove if out of bounds
        if (b.x < 0 || b.y < 0 || b.x > canvas.width || b.y > canvas.height) {
            bullets.splice(i,1); continue;
        }
        // Remove if hit dirt wall
        let tx = Math.floor(b.x / tileSize), ty = Math.floor(b.y / tileSize);
        if (map[ty][tx] === 1) {
            bullets.splice(i,1); continue;
        }
        // Check enemy hit
        for (let j = enemies.length - 1; j >= 0; j--) {
            let e = enemies[j];
            if (Math.abs(b.x - (e.x*tileSize + tileSize/2)) < tileSize/2 &&
                Math.abs(b.y - (e.y*tileSize + tileSize/2)) < tileSize/2) {
                enemies.splice(j,1);
                bullets.splice(i,1);
                score += 250;
                break;
            }
        }
    }

    // Enemy movement (simple chasing towards player)
    for (let e of enemies) {
        enemyChase(e);
    }

    // Collision: enemy vs player
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        if (Math.abs(player.x - e.x*tileSize) < tileSize/2 &&
            Math.abs(player.y - e.y*tileSize) < tileSize/2) {
            if (player.hasShield) {
                enemies.splice(i,1);
                score += 250;
                player.hasShield = false;
                player.shieldTimer = 0;
            } else {
                lives--;
                if (lives <= 0) {
                    gameOver = true;
                }
                player.x = tileSize; player.y = tileSize; // reset position
                break;
            }
        }
    }

    // Gold bag falling logic
    for (let y = height-2; y > 0; y--) {
        for (let x = 1; x < width-1; x++) {
            if (map[y][x] === 3 && map[y+1][x] === 0) {
                // Drop one row
                map[y][x] = 0;
                // Check if it will break (two in a row of free)
                if (y+2 < height-1 && map[y+2][x] === 0) {
                    // Break and release emerald in second row below
                    map[y+2][x] = 2;
                } else {
                    // Just move bag down one
                    map[y+1][x] = 3;
                }
                // Check collision at new position
                if (Math.abs(player.x - x*tileSize) < tileSize/2 &&
                    Math.abs(player.y - (y+1)*tileSize) < tileSize/2) {
                    if (player.hasShield) {
                        player.hasShield = false; player.shieldTimer = 0;
                    } else {
                        lives--;
                        if (lives <= 0) gameOver = true;
                        player.x = tileSize; player.y = tileSize;
                    }
                }
                for (let j = enemies.length - 1; j >= 0; j--) {
                    let e2 = enemies[j];
                    if (Math.abs(e2.x - x) < 0.5 && Math.abs(e2.y - (y+1)) < 0.5) {
                        enemies.splice(j,1);
                        score += 250;
                    }
                }
            }
        }
    }

    // Check if level is complete (no emeralds left)
    let emeraldCount = 0;
    for (let row of map) {
        emeraldCount += row.filter(v => v === 2).length;
    }
    if (emeraldCount === 0) {
        levelComplete = true;
    }
}

// Move player and handle tile interactions
function movePlayer() {
    let newX = player.x + player.dx;
    let newY = player.y + player.dy;
    // Boundaries check (stay inside)
    if (newX < tileSize) newX = tileSize;
    if (newY < tileSize) newY = tileSize;
    if (newX > (width-2)*tileSize) newX = (width-2)*tileSize;
    if (newY > (height-2)*tileSize) newY = (height-2)*tileSize;
    // Tile coordinates
    let tx = Math.floor(newX / tileSize), ty = Math.floor(newY / tileSize);
    let tile = map[ty][tx];
    if (tile === 1) {
        // Dig dirt
        map[ty][tx] = 0;
    }
    if (tile === 2) {
        // Collect emerald
        score += 25;
        map[ty][tx] = 0;
    }
    if (tile === 4) {
        // Speed power-up
        player.hasSpeed = true;
        player.speedTimer = 600; // duration
        map[ty][tx] = 0;
        player.speed = 4;
    }
    if (tile === 5) {
        // Shield power-up
        player.hasShield = true;
        player.shieldTimer = 600;
        map[ty][tx] = 0;
    }
    if (tile === 6) {
        // Fire power-up
        player.hasFire = true;
        player.fireTimer = 600;
        map[ty][tx] = 0;
    }
    if (tile === 3) {
        // Pushing gold bag horizontally
        if (player.dx !== 0) {
            let dir = player.dx > 0 ? 1 : -1;
            if (map[ty][tx + dir] === 0) {
                map[ty][tx] = 0;
                map[ty][tx + dir] = 3;
            } else {
                return; // cannot push, do not move into bag
            }
        } else {
            return; // vertical movement into bag not allowed
        }
    }
    // Apply movement
    player.x = newX;
    player.y = newY;
}

// Fire a bullet in the player's moving direction
function fireBullet() {
    let dirX = (player.dx !== 0) ? Math.sign(player.dx) : 0;
    let dirY = (player.dy !== 0) ? Math.sign(player.dy) : 0;
    if (dirX === 0 && dirY === 0) return; // no direction
    bullets.push({
        x: player.x + tileSize/2,
        y: player.y + tileSize/2,
        dx: dirX * 5,
        dy: dirY * 5
    });
    // sounds.shoot.play(); // optional sound
}

// Simple enemy chase AI (select best neighbor towards player)
function enemyChase(enemy) {
    // Determine target as player position (could add prediction)
    let targetX = Math.floor(player.x / tileSize);
    let targetY = Math.floor(player.y / tileSize);
    // Check neighbors
    let bestDist = Infinity;
    let bestDir = [0,0];
    let dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for (let d of dirs) {
        let nx = Math.floor(enemy.x) + d[0];
        let ny = Math.floor(enemy.y) + d[1];
        // Stay within bounds
        if (nx < 1 || ny < 1 || nx >= width-1 || ny >= height-1) continue;
        // Can move on empty or emerald
        if (map[ny][nx] === 0 || map[ny][nx] === 2) {
            let dist = Math.hypot(targetX - nx, targetY - ny);
            if (dist < bestDist) {
                bestDist = dist;
                bestDir = d;
            }
        }
    }
    // Move enemy
    enemy.x += bestDir[0] * 0.1; // small step
    enemy.y += bestDir[1] * 0.1;
}

// Render the game
function draw() {
    // Clear screen
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw map tiles
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let v = map[y][x];
            if (v === 1) {
                // Dirt block
                ctx.fillStyle = '#663300';
                ctx.fillRect(x*tileSize, y*tileSize, tileSize, tileSize);
            }
            else if (v === 2) {
                // Emerald
                if (assets.emerald) {
                    ctx.drawImage(assets.emerald, x*tileSize, y*tileSize, tileSize, tileSize);
                } else {
                    ctx.fillStyle = 'cyan';
                    ctx.fillRect(x*tileSize+8, y*tileSize+8, tileSize-16, tileSize-16);
                }
            }
            else if (v === 3) {
                // Gold bag
                if (assets.gold) {
                    ctx.drawImage(assets.gold, x*tileSize, y*tileSize, tileSize, tileSize);
                } else {
                    ctx.fillStyle = 'orange';
                    ctx.beginPath();
                    ctx.arc(x*tileSize+tileSize/2, y*tileSize+tileSize/2, tileSize/2-4, 0, 2*Math.PI);
                    ctx.fill();
                }
            }
            else if (v === 4 && assets.speed) {
                ctx.drawImage(assets.speed, x*tileSize, y*tileSize, tileSize, tileSize);
            }
            else if (v === 5 && assets.shield) {
                ctx.drawImage(assets.shield, x*tileSize, y*tileSize, tileSize, tileSize);
            }
            else if (v === 6 && assets.fire) {
                ctx.drawImage(assets.fire, x*tileSize, y*tileSize, tileSize, tileSize);
            }
        }
    }
    // Draw bullets
    ctx.fillStyle = 'yellow';
    for (let b of bullets) {
        ctx.fillRect(b.x-2, b.y-2, 4, 4);
    }
    // Draw player
    if (assets.player) {
        ctx.drawImage(assets.player, player.x - (player.x%tileSize), player.y - (player.y%tileSize), tileSize, tileSize);
    } else {
        ctx.fillStyle = 'cyan';
        ctx.fillRect(player.x-12, player.y-12, 24, 24);
    }
    // Draw enemies
    if (assets.enemy) {
        for (let e of enemies) {
            ctx.drawImage(assets.enemy, Math.floor(e.x)*tileSize, Math.floor(e.y)*tileSize, tileSize, tileSize);
        }
    } else {
        ctx.fillStyle = 'red';
        for (let e of enemies) {
            ctx.fillRect(e.x*tileSize, e.y*tileSize, tileSize, tileSize);
        }
    }
    // Draw UI text
    ctx.fillStyle = 'white';
    ctx.font = '16px sans-serif';
    ctx.fillText('Score: ' + score, 10, 20);
    ctx.fillText('Lives: ' + lives, 10, 40);
}

// Initialize or restart a level
function startLevel() {
    map = JSON.parse(JSON.stringify(levels[currentLevel].map));
    width = map[0].length; height = map.length;
    canvas.width = width * tileSize;
    canvas.height = height * tileSize;
    player.x = tileSize; player.y = tileSize;
    enemies = [];
    for (let sp of levels[currentLevel].spawn) {
        enemies.push({ x: sp.x, y: sp.y });
    }
    levelComplete = false;
}

// Proceed to next level or end game
function nextLevel() {
    currentLevel++;
    if (currentLevel >= levels.length) {
        gameOver = true;
    } else {
        startLevel();
    }
}

// Start the game
startLevel();
gameLoop();