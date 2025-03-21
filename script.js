// Select elements
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const gameContainer = document.getElementById('gameContainer');
const gameCanvas = document.getElementById('gameCanvas');
const ctx = gameCanvas.getContext('2d');
const gameOverScreen = document.getElementById('gameOverScreen');
const restartButton = document.getElementById('restartButton');

gameCanvas.width = 800;
gameCanvas.height = 600;

// Player object
let player = {
    x: 400,
    y: 500,
    width: 40,
    height: 40,
    speed: 5,
    color: 'yellow'
};

// Enemies
let enemies = [
    { x: 100, y: 100, width: 40, height: 40, speed: 2 },
    { x: 600, y: 200, width: 40, height: 40, speed: 2 }
];

// Power-ups
let emeralds = [
    { x: 200, y: 300, width: 20, height: 20 },
    { x: 500, y: 400, width: 20, height: 20 }
];

// Move Player
document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp') player.y -= player.speed;
    if (event.key === 'ArrowDown') player.y += player.speed;
    if (event.key === 'ArrowLeft') player.x -= player.speed;
    if (event.key === 'ArrowRight') player.x += player.speed;
});

// Draw Player
function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

// Draw Enemies
function drawEnemies() {
    ctx.fillStyle = 'red';
    enemies.forEach(enemy => {
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        enemy.y += enemy.speed;

        // Collision with Player
        if (player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y) {
            endGame();
        }
    });
}

// Draw Emeralds
function drawEmeralds() {
    ctx.fillStyle = 'green';
    emeralds.forEach(emerald => {
        ctx.fillRect(emerald.x, emerald.y, emerald.width, emerald.height);
    });
}

// Game Loop
function gameLoop() {
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    drawPlayer();
    drawEnemies();
    drawEmeralds();
    requestAnimationFrame(gameLoop);
}

// Start Game
startButton.addEventListener('click', () => {
    startScreen.style.display = 'none';
    gameContainer.style.display = 'flex';
    gameLoop();
});

// End Game
function endGame() {
    gameContainer.style.display = 'none';
    gameOverScreen.style.display = 'flex';
}

// Restart Game
restartButton.addEventListener('click', () => {
    player.x = 400;
    player.y = 500;
    gameOverScreen.style.display = 'none';
    gameContainer.style.display = 'flex';
    gameLoop();
});