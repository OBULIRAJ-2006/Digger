// game.js

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
ctx.imageSmoothingEnabled = false;

// Load images
const images = {};
images.player = new Image();
images.player.src = 'digger.png';
images.enemy = new Image();
images.enemy.src = 'enemy.png';

// Audio setup
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const sounds = {};
function loadSound(name, url) {
    fetch(url).then(res => res.arrayBuffer())
      .then(data => audioCtx.decodeAudioData(data, buffer => sounds[name] = buffer));
}
function playSound(name) {
    let buffer = sounds[name];
    if (!buffer) return;
    let src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(audioCtx.destination);
    src.start(0);
}

// Game states
const STATE_MENU = 0;
const STATE_PLAY = 1;
const STATE_LEVELUP = 2;
const STATE_GAMEOVER = 3;
let gameState = STATE_MENU;

// Game variables
let currentLevel = 1;
let score = 0;
let lives = 3;

// Game entities
let map = [];
let coinMap = [];
let enemies = [];
let bullets = [];
let powerUps = [];
let player;
let lastTime = 0;

// Player class
class Player {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.size = 32;
        this.speed = 100;
        this.direction = 'right';
        this.fireCooldown = 0;
        this.shield = false;
        this.multiFire = false;
        this.speedBoost = false;
    }
    update(dt) {
        let moveX = 0, moveY = 0;
        if (keys['ArrowUp'] || keys['w'] || touchDir === 'up') { moveY = -1; this.direction = 'up'; }
        if (keys['ArrowDown'] || keys['s'] || touchDir === 'down') { moveY = 1; this.direction = 'down'; }
        if (keys['ArrowLeft'] || keys['a'] || touchDir === 'left') { moveX = -1; this.direction = 'left'; }
        if (keys['ArrowRight'] || keys['d'] || touchDir === 'right') { moveX = 1; this.direction = 'right'; }
        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.7071;
            moveY *= 0.7071;
        }
        let vel = this.speed * (this.speedBoost ? 2 : 1);
        this.x += moveX * vel * dt;
        this.y += moveY * vel * dt;
        if (this.x < 0) this.x = 0;
        if (this.y < 0) this.y = 0;
        if (this.x > CANVAS_WIDTH - this.size) this.x = CANVAS_WIDTH - this.size;
        if (this.y > CANVAS_HEIGHT - this.size) this.y = CANVAS_HEIGHT - this.size;
        // Dig tile under player
        let tileX = Math.floor((this.x + this.size/2) / 32);
        let tileY = Math.floor((this.y + this.size/2) / 32);
        if (map[tileY] && map[tileY][tileX] === 1) {
            map[tileY][tileX] = 0;
            if (coinMap[tileY][tileX]) {
                score += 100;
                playSound('coin');
                coinMap[tileY][tileX] = 0;
            }
        }
        // Shooting
        if ((keys[' '] || keys['Enter'] || touchFire) && this.fireCooldown <= 0) {
            this.shoot();
            this.fireCooldown = 0.5;
        }
        if (this.fireCooldown > 0) {
            this.fireCooldown -= dt;
        }
    }
    draw() {
        if (images.player && images.player.complete) {
            ctx.drawImage(images.player, this.x, this.y, this.size, this.size);
        } else {
            ctx.fillStyle = 'yellow';
            ctx.fillRect(this.x, this.y, this.size, this.size);
        }
        if (this.shield) {
            ctx.strokeStyle = 'cyan';
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x-2, this.y-2, this.size+4, this.size+4);
        }
    }
    shoot() {
        let bx = this.x + this.size/2;
        let by = this.y + this.size/2;
        let speed = 300;
        let dx = 0, dy = 0;
        if (this.direction === 'up') dy = -1;
        if (this.direction === 'down') dy = 1;
        if (this.direction === 'left') dx = -1;
        if (this.direction === 'right') dx = 1;
        if (dx !== 0 || dy !== 0) {
            bullets.push(new Bullet(bx, by, dx*speed, dy*speed));
            if (this.multiFire) {
                bullets.push(new Bullet(bx, by, dx*speed - dy*speed, dy*speed + dx*speed));
                bullets.push(new Bullet(bx, by, dx*speed + dy*speed, dy*speed - dx*speed));
            }
            playSound('fire');
        }
    }
}

// Enemy class
class Enemy {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.size = 32;
        this.speed = 50 + currentLevel*10;
        this.dirX = 0; this.dirY = 0;
    }
    update(dt) {
        if (currentLevel === 2) {
            let angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.dirX = Math.cos(angle);
            this.dirY = Math.sin(angle);
        } else if (currentLevel === 3) {
            if (Math.random() < 0.05) {
                this.dirX = Math.floor(Math.random()*3)-1;
                this.dirY = Math.floor(Math.random()*3)-1;
            }
        } else {
            if (Math.random() < 0.02) {
                this.dirX = Math.floor(Math.random()*3)-1;
                this.dirY = Math.floor(Math.random()*3)-1;
            }
        }
        this.x += this.dirX * this.speed * dt;
        this.y += this.dirY * this.speed * dt;
        if (this.x < 0) this.x = 0;
        if (this.y < 0) this.y = 0;
        if (this.x > CANVAS_WIDTH - this.size) this.x = CANVAS_WIDTH - this.size;
        if (this.y > CANVAS_HEIGHT - this.size) this.y = CANVAS_HEIGHT - this.size;
        // Dig tile
        let tileX = Math.floor((this.x + this.size/2) / 32);
        let tileY = Math.floor((this.y + this.size/2) / 32);
        if (map[tileY] && map[tileY][tileX] === 1) {
            map[tileY][tileX] = 0;
            if (coinMap[tileY][tileX]) {
                coinMap[tileY][tileX] = 0;
            }
        }
        // Collision with player
        if (!player.shield && Math.abs(this.x - player.x) < this.size && Math.abs(this.y - player.y) < this.size) {
            lives--;
            playSound('boom');
            if (lives <= 0) {
                showGameOver();
            } else {
                spawnPlayer();
            }
        }
    }
    draw() {
        if (images.enemy && images.enemy.complete) {
            ctx.drawImage(images.enemy, this.x, this.y, this.size, this.size);
        } else {
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x, this.y, this.size, this.size);
        }
    }
}

// Bullet class
class Bullet {
    constructor(x, y, vx, vy) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.size = 8;
        this.dead = false;
    }
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.x < 0 || this.y < 0 || this.x > CANVAS_WIDTH || this.y > CANVAS_HEIGHT) {
            this.dead = true;
            return;
        }
        for (let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];
            if (Math.abs(this.x - e.x) < e.size && Math.abs(this.y - e.y) < e.size) {
                enemies.splice(i, 1);
                this.dead = true;
                playSound('boom');
                score += 500;
                break;
            }
        }
    }
    draw() {
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, 2*Math.PI);
        ctx.fill();
    }
}

// PowerUp class
class PowerUp {
    constructor(x, y, type) {
        this.x = x; this.y = y;
        this.type = type;
        this.size = 24;
        this.collected = false;
    }
    update(dt) {
        if (Math.abs(player.x - this.x) < player.size && Math.abs(player.y - this.y) < player.size) {
            this.apply();
            this.collected = true;
        }
    }
    apply() {
        playSound('powerup');
        if (this.type === 'speed') {
            player.speedBoost = true;
            setTimeout(() => player.speedBoost = false, 5000);
        } else if (this.type === 'shield') {
            player.shield = true;
            setTimeout(() => player.shield = false, 5000);
        } else if (this.type === 'fire') {
            player.multiFire = true;
            setTimeout(() => player.multiFire = false, 5000);
        }
    }
    draw() {
        ctx.fillStyle = (this.type === 'speed' ? 'blue' : (this.type === 'shield' ? 'cyan' : 'magenta'));
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

// Input handling
let keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);
let touchDir = null;
let touchFire = false;
document.getElementById('upBtn').addEventListener('touchstart', () => { touchDir = 'up'; });
document.getElementById('upBtn').addEventListener('touchend', () => { touchDir = null; });
document.getElementById('downBtn').addEventListener('touchstart', () => { touchDir = 'down'; });
document.getElementById('downBtn').addEventListener('touchend', () => { touchDir = null; });
document.getElementById('leftBtn').addEventListener('touchstart', () => { touchDir = 'left'; });
document.getElementById('leftBtn').addEventListener('touchend', () => { touchDir = null; });
document.getElementById('rightBtn').addEventListener('touchstart', () => { touchDir = 'right'; });
document.getElementById('rightBtn').addEventListener('touchend', () => { touchDir = null; });
document.getElementById('fireBtn').addEventListener('touchstart', () => { touchFire = true; });
document.getElementById('fireBtn').addEventListener('touchend', () => { touchFire = false; });

// Game initialization
function initGame() {
    document.getElementById('menu').style.display = 'block';
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('levelUp').style.display = 'none';
    canvas.style.display = 'none';
    document.getElementById('hud').style.display = 'none';
    document.getElementById('startBtn').addEventListener('click', () => {
        currentLevel = 1;
        score = 0;
        lives = 3;
        startLevel();
    });
    document.getElementById('nextLevelBtn').addEventListener('click', () => {
        document.getElementById('levelUp').style.display = 'none';
        if (currentLevel < 3) {
            currentLevel++;
            startLevel();
        } else {
            showGameOver();
        }
    });
    document.getElementById('restartBtn').addEventListener('click', () => {
        document.getElementById('gameOver').style.display = 'none';
        document.getElementById('menu').style.display = 'block';
    });
    updateHUD();
}

// Start level
function startLevel() {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('levelUp').style.display = 'none';
    canvas.style.display = 'block';
    document.getElementById('hud').style.display = 'block';
    initLevel();
    gameState = STATE_PLAY;
    lastTime = Date.now();
    requestAnimationFrame(gameLoop);
}

// Initialize level
function initLevel() {
    let cols = 15 + (currentLevel - 1)*5;
    let rows = 12 + (currentLevel - 1)*4;
    map = [];
    coinMap = [];
    enemies = [];
    bullets = [];
    powerUps = [];
    for (let y = 0; y < rows; y++) {
        map[y] = [];
        coinMap[y] = [];
        for (let x = 0; x < cols; x++) {
            if (x === 0 || y === 0 || x === cols-1 || y === rows-1) {
                map[y][x] = 0;
            } else {
                map[y][x] = 1;
            }
            coinMap[y][x] = 0;
        }
    }
    // Carve spawn areas
    map[1][1] = 0; map[1][2] = 0; map[2][1] = 0; map[2][2] = 0;
    map[rows-2][cols-2] = 0; map[rows-3][cols-2] = 0; map[rows-2][cols-3] = 0;
    // Place coins
    let coinCount = 5 + currentLevel*2;
    while (coinCount > 0) {
        let x = Math.floor(Math.random()*(cols-2))+1;
        let y = Math.floor(Math.random()*(rows-2))+1;
        if (map[y][x] === 1 && coinMap[y][x] === 0) {
            coinMap[y][x] = 1;
            coinCount--;
        }
    }
    spawnPlayer();
    for (let i = 0; i < currentLevel; i++) {
        let ex = (cols-2)*32;
        let ey = (rows-2)*32;
        enemies.push(new Enemy(ex, ey));
    }
    setTimeout(() => spawnPowerUp('speed'), 10000);
    setTimeout(() => spawnPowerUp('shield'), 20000);
    setTimeout(() => spawnPowerUp('fire'), 30000);
    updateHUD();
}

// Spawn player at start
function spawnPlayer() {
    player = new Player(32, 32);
}

// Spawn power-up at random position
function spawnPowerUp(type) {
    let rows = map.length, cols = map[0].length;
    let x, y;
    do {
        x = Math.floor(Math.random()*(cols-2))+1;
        y = Math.floor(Math.random()*(rows-2))+1;
    } while (map[y][x] !== 0 || coinMap[y][x] !== 0);
    powerUps.push(new PowerUp(x*32, y*32, type));
}

// Update HUD
function updateHUD() {
    document.getElementById('score').textContent = 'Score: ' + score;
    document.getElementById('lives').textContent = 'Lives: ' + lives;
}

// Game loop
function gameLoop() {
    if (gameState === STATE_PLAY) {
        let now = Date.now();
        let dt = (now - lastTime) / 1000;
        lastTime = now;
        player.update(dt);
        enemies.forEach(e => e.update(dt));
        bullets.forEach(b => b.update(dt));
        bullets = bullets.filter(b => !b.dead);
        powerUps.forEach(p => p.update(dt));
        powerUps = powerUps.filter(p => !p.collected);
        if (allCoinsCollected()) {
            gameState = STATE_LEVELUP;
            document.getElementById('levelUp').style.display = 'block';
            return;
        }
        drawGame();
        updateHUD();
        requestAnimationFrame(gameLoop);
    }
}

// Check if level complete
function allCoinsCollected() {
    for (let y = 0; y < coinMap.length; y++) {
        for (let x = 0; x < coinMap[y].length; x++) {
            if (coinMap[y][x] > 0) return false;
        }
    }
    return true;
}

// Draw everything
function drawGame() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            if (map[y][x] === 1) {
                ctx.fillStyle = 'saddlebrown';
                ctx.fillRect(x*32, y*32, 32, 32);
            }
            if (coinMap[y][x] > 0) {
                ctx.fillStyle = 'gold';
                ctx.fillRect(x*32+10, y*32+10, 12, 12);
            }
        }
    }
    powerUps.forEach(p => p.draw());
    player.draw();
    enemies.forEach(e => e.draw());
    bullets.forEach(b => b.draw());
}

// Show game over screen
function showGameOver() {
    gameState = STATE_GAMEOVER;
    document.getElementById('gameOver').style.display = 'block';
    document.getElementById('finalScore').textContent = 'Final Score: ' + score;
    canvas.style.display = 'none';
    document.getElementById('hud').style.display = 'none';
}

// Load sounds
loadSound('fire', 'fire.mp3');
loadSound('boom', 'boom.mp3');
loadSound('powerup', 'powerup.mp3');
loadSound('coin', 'coin.mp3');

// Start
window.onload = () => {
    initGame();
};