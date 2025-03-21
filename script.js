const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

const gridSize = 40;
const rows = canvas.height / gridSize;
const cols = canvas.width / gridSize;

class Digger {
    constructor() {
        this.x = 100;
        this.y = 100;
        this.speed = 5;
    }

    move(direction) {
        if (direction === "left" && this.x > 0) this.x -= this.speed;
        if (direction === "right" && this.x < canvas.width - gridSize) this.x += this.speed;
        if (direction === "up" && this.y > 0) this.y -= this.speed;
        if (direction === "down" && this.y < canvas.height - gridSize) this.y += this.speed;
    }

    draw() {
        ctx.fillStyle = "yellow";
        ctx.fillRect(this.x, this.y, gridSize, gridSize);
    }
}

let player = new Digger();

document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") player.move("left");
    if (event.key === "ArrowRight") player.move("right");
    if (event.key === "ArrowUp") player.move("up");
    if (event.key === "ArrowDown") player.move("down");
});

let terrain = Array.from({ length: rows }, () => Array(cols).fill(1));

function drawTerrain() {
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (terrain[row][col] === 1) {
                ctx.fillStyle = "brown";
                ctx.fillRect(col * gridSize, row * gridSize, gridSize, gridSize);
            }
        }
    }
}

function dig() {
    let playerRow = Math.floor(player.y / gridSize);
    let playerCol = Math.floor(player.x / gridSize);
    terrain[playerRow][playerCol] = 0;
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 2;
    }

    move() {
        if (this.x < player.x) this.x += this.speed;
        if (this.x > player.x) this.x -= this.speed;
        if (this.y < player.y) this.y += this.speed;
        if (this.y > player.y) this.y -= this.speed;
    }

    draw() {
        ctx.fillStyle = "red";
        ctx.fillRect(this.x, this.y, gridSize, gridSize);
    }
}

let enemies = [new Enemy(500, 300)];

function updateEnemies() {
    enemies.forEach(enemy => {
        enemy.move();
        enemy.draw();
    });
}

let collectibles = [{ x: 200, y: 200 }];
let score = 0;

function drawCollectibles() {
    collectibles.forEach(item => {
        ctx.fillStyle = "green";
        ctx.fillRect(item.x, item.y, gridSize / 2, gridSize / 2);
    });
}

function checkCollect() {
    collectibles = collectibles.filter(item => {
        if (Math.abs(player.x - item.x) < gridSize && Math.abs(player.y - item.y) < gridSize) {
            score += 10;
            document.getElementById("score").innerText = `Score: ${score}`;
            return false;
        }
        return true;
    });
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTerrain();
    dig();
    player.draw();
    updateEnemies();
    drawCollectibles();
    checkCollect();
    requestAnimationFrame(gameLoop);
}

gameLoop();