const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

const digger = {
    x: 400,
    y: 300,
    width: 32,
    height: 32,
    speed: 4,
    dx: 0,
    dy: 0,
    sprite: new Image()
};
digger.sprite.src = 'digger.png';

const enemies = [];
const treasures = [];
const sounds = {
    move: new Audio('move.mp3'),
    collect: new Audio('collect.mp3'),
    hit: new Audio('hit.mp3')
};

function drawDigger() {
    ctx.drawImage(digger.sprite, digger.x, digger.y, digger.width, digger.height);
}

function drawEnemies() {
    ctx.fillStyle = 'red';
    enemies.forEach(enemy => ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height));
}

function drawTreasures() {
    ctx.fillStyle = 'gold';
    treasures.forEach(treasure => ctx.fillRect(treasure.x, treasure.y, treasure.width, treasure.height));
}

function update() {
    digger.x += digger.dx;
    digger.y += digger.dy;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTreasures();
    drawEnemies();
    drawDigger();
    requestAnimationFrame(update);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') { digger.dy = -digger.speed; sounds.move.play(); }
    if (e.key === 'ArrowDown') { digger.dy = digger.speed; sounds.move.play(); }
    if (e.key === 'ArrowLeft') { digger.dx = -digger.speed; sounds.move.play(); }
    if (e.key === 'ArrowRight') { digger.dx = digger.speed; sounds.move.play(); }
});

document.addEventListener('keyup', () => {
    digger.dx = 0;
    digger.dy = 0;
});

function spawnEnemies() {
    for (let i = 0; i < 3; i++) {
        enemies.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, width: 32, height: 32 });
    }
}

function spawnTreasures() {
    for (let i = 0; i < 5; i++) {
        treasures.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, width: 16, height: 16 });
    }
}

spawnEnemies();
spawnTreasures();
update();