const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const playerImg = new Image();
playerImg.src = "digger.png";

const enemyImg = new Image();
enemyImg.src = "enemy.png";

const goldImg = new Image();
goldImg.src = "gold.png";

const emeraldImg = new Image();
emeraldImg.src = "emerald.png";

let player = { x: 100, y: 100, width: 40, height: 40, speed: 3 };
let enemies = [{ x: 500, y: 200, speed: 2 }];
let goldBags = [{ x: 300, y: 300 }];
let emeralds = [{ x: 400, y: 400 }];

let keys = {};

document.addEventListener("keydown", (event) => {
    keys[event.key] = true;
});

document.addEventListener("keyup", (event) => {
    keys[event.key] = false;
});

function movePlayer() {
    if (keys["ArrowUp"]) player.y -= player.speed;
    if (keys["ArrowDown"]) player.y += player.speed;
    if (keys["ArrowLeft"]) player.x -= player.speed;
    if (keys["ArrowRight"]) player.x += player.speed;
}

function moveEnemies() {
    enemies.forEach((enemy) => {
        if (player.x > enemy.x) enemy.x += enemy.speed;
        if (player.x < enemy.x) enemy.x -= enemy.speed;
        if (player.y > enemy.y) enemy.y += enemy.speed;
        if (player.y < enemy.y) enemy.y -= enemy.speed;
    });
}

function checkCollisions() {
    enemies.forEach((enemy) => {
        if (
            player.x < enemy.x + 40 &&
            player.x + 40 > enemy.x &&
            player.y < enemy.y + 40 &&
            player.y + 40 > enemy.y
        ) {
            alert("Game Over!");
            resetGame();
        }
    });

    goldBags.forEach((gold, index) => {
        if (
            player.x < gold.x + 40 &&
            player.x + 40 > gold.x &&
            player.y < gold.y + 40 &&
            player.y + 40 > gold.y
        ) {
            goldBags.splice(index, 1);
            alert("You collected gold!");
        }
    });

    emeralds.forEach((emerald, index) => {
        if (
            player.x < emerald.x + 40 &&
            player.x + 40 > emerald.x &&
            player.y < emerald.y + 40 &&
            player.y + 40 > emerald.y
        ) {
            emeralds.splice(index, 1);
            alert("You collected an emerald!");
        }
    });
}


function resetGame() {
    player.x = 100;
    player.y = 100;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
    
    enemies.forEach((enemy) => {
        ctx.drawImage(enemyImg, enemy.x, enemy.y, 40, 40);
    });

    goldBags.forEach((gold) => {
        ctx.drawImage(goldImg, gold.x, gold.y, 40, 40);
    });

    emeralds.forEach((emerald) => {
        ctx.drawImage(emeraldImg, emerald.x, emerald.y, 40, 40);
    });

    movePlayer();
    moveEnemies();
    checkCollisions();

    requestAnimationFrame(draw);
}

document.getElementById("start-button").addEventListener("click", () => {
    document.getElementById("start-screen").style.display = "none";
    draw();
});