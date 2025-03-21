document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 800;
    canvas.height = 600;

    let score = 0;
    let gameOver = false;
    document.getElementById("scoreDisplay").innerText = `Score: ${score}`;

    const cellSize = 40;
    const cols = canvas.width / cellSize;
    const rows = canvas.height / cellSize;
    let terrain = Array.from({ length: rows }, () => Array(cols).fill(true));
    
    function generateRandomPath() {
        let currentRow = Math.floor(Math.random() * rows);
        for (let c = 0; c < cols; c++) {
            terrain[currentRow][c] = false;
            if (Math.random() < 0.3) {
                if (currentRow > 0 && Math.random() < 0.5) currentRow--;
                else if (currentRow < rows - 1) currentRow++;
            }
        }
    }
    generateRandomPath();

    const assets = {
        digger: new Image(),
        soundMove: new Audio("move.mp3"),
        soundCollect: new Audio("collect.mp3"),
        soundEnemyHit: new Audio("hit.mp3"),
        soundFire: new Audio("fire.mp3"),
        soundPowerUp: new Audio("powerup.mp3"),
    };
    assets.digger.src = "digger.png";

    const player = {
        x: canvas.width / 2 - 16,
        y: canvas.height / 2 - 16,
        width: 32,
        height: 32,
        speed: 4,
        dx: 0,
        dy: 0,
        lastDirection: { x: 1, y: 0 },
        shield: false,
    };

    let enemies = [], treasures = [], powerups = [], bullets = [];

    function spawnEnemy() {
        let possible = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!terrain[r][c]) possible.push({ r, c });
            }
        }
        if (possible.length) {
            const { r, c } = possible[Math.floor(Math.random() * possible.length)];
            enemies.push({
                x: c * cellSize + (cellSize - 32) / 2,
                y: r * cellSize + (cellSize - 32) / 2,
                width: 32,
                height: 32,
                speed: Math.random() < 0.3 ? 2 : 1,
            });
        }
    }

    function spawnTreasures() {
        treasures = Array.from({ length: 5 }, () => ({
            x: Math.random() * (canvas.width - 16),
            y: Math.random() * (canvas.height - 16),
            width: 16,
            height: 16,
        }));
    }

    function spawnPowerup() {
        if (Math.random() < 0.5) {
            powerups.push({
                x: Math.random() * (canvas.width - 16),
                y: Math.random() * (canvas.height - 16),
                width: 16,
                height: 16,
                type: Math.random() < 0.5 ? "speed" : "shield",
            });
        }
    }

    function checkCollision(a, b) {
        return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    }

    function updateGame() {
        player.x += player.dx;
        player.y += player.dy;

        if (player.x < 0) player.x = 0;
        if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
        if (player.y < 0) player.y = 0;
        if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;

        treasures.forEach((treasure, i) => {
            if (checkCollision(player, treasure)) {
                treasures.splice(i, 1);
                score += 10;
                document.getElementById("scoreDisplay").innerText = `Score: ${score}`;
                assets.soundCollect.play();
            }
        });

        powerups.forEach((powerup, i) => {
            if (checkCollision(player, powerup)) {
                powerups.splice(i, 1);
                if (powerup.type === "speed") {
                    player.speed = 6;
                    setTimeout(() => player.speed = 4, 5000);
                } else if (powerup.type === "shield") {
                    player.shield = true;
                    setTimeout(() => player.shield = false, 5000);
                }
                assets.soundPowerUp.play();
            }
        });

        enemies.forEach((enemy, i) => {
            if (checkCollision(player, enemy)) {
                if (player.shield) {
                    enemies.splice(i, 1);
                    player.shield = false;
                } else {
                    gameOver = true;
                    assets.soundEnemyHit.play();
                }
            }
        });
    }

    function gameLoop() {
        if (gameOver) {
            document.getElementById("restartButton").style.display = "block";
            return;
        }
        updateGame();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        requestAnimationFrame(gameLoop);
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp") player.dy = -player.speed;
        if (e.key === "ArrowDown") player.dy = player.speed;
        if (e.key === "ArrowLeft") player.dx = -player.speed;
        if (e.key === "ArrowRight") player.dx = player.speed;
    });
    document.addEventListener("keyup", (e) => {
        if (["ArrowUp", "ArrowDown"].includes(e.key)) player.dy = 0;
        if (["ArrowLeft", "ArrowRight"].includes(e.key)) player.dx = 0;
    });

    document.getElementById("restartButton").addEventListener("click", () => {
        score = 0;
        document.getElementById("scoreDisplay").innerText = `Score: ${score}`;
        gameOver = false;
        enemies = [];
        spawnTreasures();
        spawnPowerup();
        spawnEnemy();
        gameLoop();
    });

    spawnTreasures();
    spawnPowerup();
    spawnEnemy();
    gameLoop();
});
