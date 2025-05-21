// game.js
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreSpan = document.getElementById("score");
const levelSpan = document.getElementById("level");
const powerupsSpan = document.getElementById("powerups");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

let keysPressed = {};
let player, bullets = [], enemies = [], gems = [], powerUps = [];
let lastTime = 0, lastBullet = 0;
let score = 0, level = 1;
let gameRunning = false;
let bgMusic, shootSound, gemSound, hitSound, audioCtx;

// Power-up states
let shieldActive = false, speedActive = false, rapidActive = false;
let shieldTimer = 0, speedTimer = 0, rapidTimer = 0;

// Level configuration (increasing difficulty)
const levels = [
    {numEnemies: 3, numGems: 5, spawnInterval: 3000},
    {numEnemies: 5, numGems: 7, spawnInterval: 2500},
    {numEnemies: 7, numGems: 10, spawnInterval: 2000}
];

// Utility: random between min and max
function rand(min, max) { return Math.random() * (max - min) + min; }

// --- Classes for game entities ---

class Player {
    constructor() {
        this.x = canvas.width/2; this.y = canvas.height - 50;
        this.size = 20; this.speed = 150; // base speed
        this.dirX = 0; this.dirY = -1;   // initial facing up
    }
    update(dt) {
        // Movement input
        let moveX = 0, moveY = 0;
        if (keysPressed["ArrowLeft"] || keysPressed["a"]) moveX = -1;
        if (keysPressed["ArrowRight"]|| keysPressed["d"]) moveX =  1;
        if (keysPressed["ArrowUp"]   || keysPressed["w"]) moveY = -1;
        if (keysPressed["ArrowDown"] || keysPressed["s"]) moveY =  1;
        if (moveX!==0 || moveY!==0) {
            let mag = Math.hypot(moveX, moveY);
            moveX /= mag; moveY /= mag;
            let sp = speedActive ? this.speed*2 : this.speed;
            this.x += moveX * sp * dt;
            this.y += moveY * sp * dt;
            this.dirX = moveX; this.dirY = moveY;
        }
        // Boundary clamp
        this.x = Math.max(this.size, Math.min(canvas.width - this.size, this.x));
        this.y = Math.max(this.size, Math.min(canvas.height - this.size, this.y));

        // Collect gems
        for (let i = gems.length-1; i >= 0; i--) {
            let g = gems[i];
            let dist = Math.hypot(this.x - g.x, this.y - g.y);
            if (dist < this.size + g.size) {
                gems.splice(i,1);
                score += 10; scoreSpan.textContent = score;
                gemSound && gemSound.play();
                if (Math.random() < 0.2) spawnPowerUp();
                if (gems.length === 0) {
                    nextLevel();
                }
            }
        }
        // Pickup power-ups
        for (let i = powerUps.length-1; i >= 0; i--) {
            let p = powerUps[i];
            let dist = Math.hypot(this.x - p.x, this.y - p.y);
            if (dist < this.size + p.size) {
                powerUps.splice(i,1);
                activatePowerUp(p.type);
            }
        }
        // Enemy collision
        for (let i = enemies.length-1; i >= 0; i--) {
            let e = enemies[i];
            let dist = Math.hypot(this.x - e.x, this.y - e.y);
            if (dist < this.size + e.size) {
                if (shieldActive) {
                    enemies.splice(i,1);
                    score += 5;
                    hitSound && hitSound.play();
                } else {
                    stopGame();
                    return;
                }
            }
        }
    }
    draw() {
        ctx.fillStyle = shieldActive ? "#0ff" : "#0f0";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
        ctx.fill();
    }
    shoot() {
        let now = performance.now();
        if (now - lastBullet > (rapidActive ? 100 : 500)) {
            let speed = 300;
            let vx = this.dirX, vy = this.dirY;
            if (vx===0 && vy===0) { vy = -1; } // default up
            let b = new Bullet(this.x, this.y, vx, vy, speed);
            bullets.push(b);
            shootSound && shootSound.play();
            lastBullet = now;
        }
    }
}

class Bullet {
    constructor(x,y,dx,dy,speed) {
        this.x = x; this.y = y;
        this.dx = dx; this.dy = dy;
        this.speed = speed;
        this.size = 5;
    }
    update(dt) {
        this.x += this.dx * this.speed * dt;
        this.y += this.dy * this.speed * dt;
        // Remove if off-screen
        if (this.x < -10 || this.x > canvas.width+10 || this.y < -10 || this.y > canvas.height+10) {
            bullets.splice(bullets.indexOf(this),1);
            return;
        }
        // Hit enemies
        for (let i = enemies.length-1; i >= 0; i--) {
            let e = enemies[i];
            let dist = Math.hypot(this.x - e.x, this.y - e.y);
            if (dist < this.size + e.size) {
                enemies.splice(i,1);
                bullets.splice(bullets.indexOf(this),1);
                score += 10;
                scoreSpan.textContent = score;
                hitSound && hitSound.play();
                break;
            }
        }
    }
    draw() {
        ctx.fillStyle = "#ff0";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
        ctx.fill();
    }
}

class Enemy {
    constructor() {
        this.size = 15;
        const edge = Math.floor(rand(0,4));
        if (edge === 0) { this.x = rand(0,canvas.width); this.y = -this.size; }
        if (edge === 1) { this.x = rand(0,canvas.width); this.y = canvas.height+this.size; }
        if (edge === 2) { this.y = rand(0,canvas.height); this.x = -this.size; }
        if (edge === 3) { this.y = rand(0,canvas.height); this.x = canvas.width+this.size; }
        this.speed = rand(50, 100) + level*10;
    }
    update(dt) {
        let dx = player.x - this.x;
        let dy = player.y - this.y;
        let dist = Math.hypot(dx, dy);
        if (dist > 0) {
            this.x += (dx/dist) * this.speed * dt;
            this.y += (dy/dist) * this.speed * dt;
        }
    }
    draw() {
        ctx.fillStyle = "#f00";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
        ctx.fill();
    }
}

class Gem {
    constructor() {
        this.size = 8;
        this.x = rand(this.size, canvas.width - this.size);
        this.y = rand(this.size, canvas.height - this.size);
    }
    draw() {
        ctx.fillStyle = "#00f";
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.size);
        ctx.lineTo(this.x + this.size, this.y);
        ctx.lineTo(this.x, this.y + this.size);
        ctx.lineTo(this.x - this.size, this.y);
        ctx.closePath();
        ctx.fill();
    }
}

class PowerUp {
    constructor(type) {
        this.type = type; // 'shield', 'speed', or 'rapid'
        this.size = 10;
        this.x = rand(this.size, canvas.width - this.size);
        this.y = rand(this.size, canvas.height - this.size);
    }
    draw() {
        if (this.type === 'shield') ctx.fillStyle = "#0ff";
        if (this.type === 'speed')  ctx.fillStyle = "#ff0";
        if (this.type === 'rapid')  ctx.fillStyle = "#f0f";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
        ctx.fill();
    }
}

// --- Game setup functions ---

function spawnEnemies(num) {
    for (let i = 0; i < num; i++) enemies.push(new Enemy());
}
function spawnGems(num) {
    for (let i = 0; i < num; i++) gems.push(new Gem());
}
function spawnPowerUp() {
    const types = ['shield','speed','rapid'];
    let type = types[Math.floor(rand(0, types.length))];
    powerUps.push(new PowerUp(type));
}
function activatePowerUp(type) {
    if (type === 'shield') { shieldActive = true; shieldTimer = 5000; }
    if (type === 'speed')  { speedActive  = true; speedTimer  = 5000; }
    if (type === 'rapid')  { rapidActive  = true; rapidTimer  = 5000; }
}

function nextLevel() {
    if (level < levels.length) {
        level++;
        levelSpan.textContent = level;
        initLevel();
    } else {
        alert("You win! Score: " + score);
        stopGame();
    }
}

function initLevel() {
    // Reset entities
    bullets = []; enemies = []; gems = []; powerUps = [];
    player.x = canvas.width/2; player.y = canvas.height - 50;
    let cfg = levels[level-1];
    spawnEnemies(cfg.numEnemies);
    spawnGems(cfg.numGems);
}

// --- Game start/stop ---

function startGame() {
    if (!gameRunning) {
        gameRunning = true;
        startBtn.disabled = true;
        restartBtn.disabled = false;
        score = 0; level = 1;
        scoreSpan.textContent = score;
        levelSpan.textContent = level;
        player = new Player();
        initLevel();
        lastTime = performance.now();
        // Initialize audio context and sounds on first start
        if (!audioCtx) {
            audioCtx = new (window.AudioContext||window.webkitAudioContext)();
            function playBeep(freq) {
                let osc = audioCtx.createOscillator();
                let gain = audioCtx.createGain();
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.frequency.value = freq;
                osc.start();
                gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
                osc.stop(audioCtx.currentTime + 0.3);
            }
            shootSound = { play: () => playBeep(600) };
            gemSound   = { play: () => playBeep(900) };
            hitSound   = { play: () => playBeep(300) };
            // Background music oscillator
            bgMusic = audioCtx.createOscillator();
            let bgGain = audioCtx.createGain();
            bgMusic.type = 'sine'; bgMusic.frequency.value = 220;
            bgMusic.connect(bgGain);
            bgGain.connect(audioCtx.destination);
            bgGain.gain.value = 0.02;
            bgMusic.start();
        }
        requestAnimationFrame(gameLoop);
    }
}

function stopGame() {
    gameRunning = false;
    startBtn.disabled = false;
    restartBtn.disabled = true;
    if (bgMusic) { bgMusic.stop(); bgMusic = null; }
}

// --- Event listeners ---

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", () => { stopGame(); startGame(); });
window.addEventListener("keydown", (e) => {
    keysPressed[e.key] = true;
    if (e.key === " ") {
        player && player.shoot();
    }
});
window.addEventListener("keyup", (e) => { keysPressed[e.key] = false; });

// Touch controls (as shown earlier)

// --- Main game loop ---

function gameLoop(timestamp) {
    if (!gameRunning) return;
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Update power-up timers
    if (shieldActive) { shieldTimer -= dt*1000; if (shieldTimer <= 0) shieldActive = false; }
    if (speedActive)  { speedTimer  -= dt*1000; if (speedTimer  <= 0) speedActive  = false; }
    if (rapidActive)  { rapidTimer  -= dt*1000; if (rapidTimer  <= 0) rapidActive  = false; }
    // Update/draw all entities
    player.update(dt); player.draw();
    gems.forEach(g => g.draw());
    powerUps.forEach(p => p.draw());
    enemies.forEach(e => { e.update(dt); e.draw(); });
    bullets.forEach(b => { b.update(dt); b.draw(); });
    // Update HUD power-ups display
    let pu = [];
    if (shieldActive) pu.push("Shield");
    if (speedActive)  pu.push("Speed");
    if (rapidActive)  pu.push("Rapid");
    powerupsSpan.textContent = pu.join(", ") || "None";
    // Next frame
    requestAnimationFrame(gameLoop);
}