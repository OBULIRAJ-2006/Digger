const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 600;
canvas.height = 400;

const digger = {
    x: 300,
    y: 200,
    size: 20,
    speed: 5,
    color: "yellow"
};

const enemies = [
    { x: 100, y: 100, size: 20, speed: 2, color: "red" }
];

const goldBags = [
    { x: 200, y: 250, size: 20, color: "gold" }
];

const emeralds = [
    { x: 400, y: 150, size: 15, color: "green" }
];

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw digger
    ctx.fillStyle = digger.color;
    ctx.fillRect(digger.x, digger.y, digger.size, digger.size);

    // Draw enemies
    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.size, enemy.size);
    });

    // Draw gold bags
    goldBags.forEach(gold => {
        ctx.fillStyle = gold.color;
        ctx.fillRect(gold.x, gold.y, gold.size, gold.size);
    });

    // Draw emeralds
    emeralds.forEach(emerald => {
        ctx.fillStyle = emerald.color;
        ctx.fillRect(emerald.x, emerald.y, emerald.size, emerald.size);
    });
}

function moveEnemies() {
    enemies.forEach(enemy => {
        if (digger.x > enemy.x) enemy.x += enemy.speed;
        if (digger.x < enemy.x) enemy.x -= enemy.speed;
        if (digger.y > enemy.y) enemy.y += enemy.speed;
        if (digger.y < enemy.y) enemy.y -= enemy.speed;
    });
}

function gameLoop() {
    moveEnemies();
    draw();
    requestAnimationFrame(gameLoop);
}

document.getElementById("up").addEventListener("click", () => digger.y -= digger.speed);
document.getElementById("down").addEventListener("click", () => digger.y += digger.speed);
document.getElementById("left").addEventListener("click", () => digger.x -= digger.speed);
document.getElementById("right").addEventListener("click", () => digger.x += digger.speed);

gameLoop();