function updateBullets() {
  bullets.forEach((bullet, index) => {
    let nextX = bullet.x + bullet.dx;
    let nextY = bullet.y + bullet.dy;
    let col = Math.floor(nextX / cellSize);
    let row = Math.floor(nextY / cellSize);
    if (row >= 0 && row < rows && col >= 0 && col < cols && terrain[row][col]) {
      bullets.splice(index, 1);
      return;
    }
    bullet.x = nextX;
    bullet.y = nextY;
    if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
      bullets.splice(index, 1);
    }
    enemies.forEach((enemy, eIndex) => {
      if (isColliding(bullet, enemy)) {
        enemies.splice(eIndex, 1);
        bullets.splice(index, 1);
        score += 20;
        scoreDisplay.innerText = "Score: " + score;
        soundEnemyHit.play();
      }
    });
  });
}

function updateGoldBags() {
  goldBags.forEach(bag => {
    let col = Math.floor(bag.x / cellSize);
    let rowBelow = Math.floor((bag.y + bag.height) / cellSize);
    if (rowBelow < rows && terrain[rowBelow][col] === true) {
      bag.falling = false;
      bag.vy = 0;
      bag.startFallY = null;
    } else {
      if (!bag.falling) {
        bag.falling = true;
        bag.startFallY = bag.y;
      }
      bag.vy += 0.2;
      bag.y += bag.vy;
      if (bag.y + bag.height >= canvas.height) {
        bag.y = canvas.height - bag.height;
        bag.vy = 0;
        bag.falling = false;
      }
      if (bag.startFallY !== null && (bag.y - bag.startFallY > 80)) {
        enemies.forEach((enemy, idx) => {
          if (isColliding(bag, enemy)) {
            enemies.splice(idx, 1);
            score += 20;
            scoreDisplay.innerText = "Score: " + score;
            soundEnemyHit.play();
          }
        });
        if (isColliding(bag, player) && player.shieldTime <= 0) {
          gameOver = true;
          soundEnemyHit.play();
        }
      }
    }
  });
}

function updatePowerups() {
  powerups.forEach((pu, index) => {
    if (isColliding(player, pu)) {
      powerups.splice(index, 1);
      if (pu.type === "speed") {
        player.speed = player.baseSpeed * 1.5;
        player.powerupTime = 300;
      } else if (pu.type === "shield") {
        player.shieldTime = 300;
      } else if (pu.type === "firepower") {
        player.firepowerTime = 300;
      }
      soundPowerUp.play();
    }
  });
  let displayText = "";
  if (player.powerupTime > 0) {
    player.powerupTime--;
    displayText += "Speed: " + Math.ceil(player.powerupTime/60) + "s ";
    if (player.powerupTime === 0) player.speed = player.baseSpeed;
  }
  if (player.shieldTime > 0) {
    player.shieldTime--;
    displayText += "Shield: " + Math.ceil(player.shieldTime/60) + "s ";
  }
  if (player.firepowerTime > 0) {
    player.firepowerTime--;
    displayText += "Firepower: " + Math.ceil(player.firepowerTime/60) + "s";
  }
  powerupDisplay.innerText = displayText;
}

function isColliding(a, b) {
  return (a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y);
}

function updateBulletCooldown() {
  if (bulletCooldown > 0) bulletCooldown--;
}

function gameLoop() {
  if (gameOver) { endGame(); return; }
  updatePlayer();
  updateEnemies();
  updateBullets();
  updateGoldBags();
  updatePowerups();
  updateBulletCooldown();
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTerrain();
  drawEmeralds();
  drawGoldBags();
  drawPowerups();
  drawEnemies();
  drawBullets();
  drawPlayer();
  
  let win = emeralds.every(e => e.collected);
  if (win) {
    gameOver = true;
    alert("You Won! All emeralds collected.");
    endGame();
    return;
  }
  
  requestAnimationFrame(gameLoop);
}

function drawEmeralds() {
  emeralds.forEach(e => {
    if (!e.collected) {
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = "lime";
      ctx.drawImage(emeraldImg, e.x, e.y, e.width, e.height);
      ctx.restore();
    }
  });
}

function fireBullet() {
  if (bulletCooldown > 0) return;
  let direction = { x: player.lastDirection.x, y: player.lastDirection.y };
  if (direction.x === 0 && direction.y === 0) { direction.x = -1; direction.y = 0; }
  let speedMultiplier = (player.firepowerTime > 0) ? 16 : 8;
  let bullet = {
    x: player.x + player.width / 2 - 4,
    y: player.y + player.height / 2 - 4,
    width: 8,
    height: 8,
    dx: direction.x * speedMultiplier,
    dy: direction.y * speedMultiplier
  };
  bullets.push(bullet);
  bulletCooldown = 60;
  shootSlowTimer = 30;
  soundFire.play();
}

function endGame() {
  if (!emeralds.every(e => e.collected)) { alert("Game Over! Digger was caught."); }
  restartButton.style.display = "block";
  gameScreen.style.display = "none";
}

function resetGame() {
  score = 0;
  scoreDisplay.innerText = "Score: " + score;
  gameOver = false;
  bulletCooldown = 0;
  shootSlowTimer = 0;
  player.x = 50;
  player.y = 50;
  player.dx = 0;
  player.dy = 0;
  player.speed = player.baseSpeed;
  player.powerupTime = 0;
  player.shieldTime = 0;
  player.firepowerTime = 0;
  initTerrain();
  generateTunnel();
  spawnEmeralds();
  spawnGoldBags();
  spawnPowerups();
  enemies = [];
  bullets = [];
  spawnEnemy();
  restartButton.style.display = "none";
  gameScreen.style.display = "block";
  gameLoop();
}

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") { player.dy = -player.speed; soundMove.play(); }
  if (e.key === "ArrowDown") { player.dy = player.speed; soundMove.play(); }
  if (e.key === "ArrowLeft") { player.dx = -player.speed; soundMove.play(); }
  if (e.key === "ArrowRight") { player.dx = player.speed; soundMove.play(); }
  if (e.key === " " || e.key.toLowerCase() === "f") { fireBullet(); }
});

document.addEventListener("keyup", (e) => {
  if (["ArrowUp", "ArrowDown"].includes(e.key)) player.dy = 0;
  if (["ArrowLeft", "ArrowRight"].includes(e.key)) player.dx = 0;
});

document.getElementById("upBtn").addEventListener("touchstart", () => { player.dy = -player.speed; });
document.getElementById("upBtn").addEventListener("touchend", () => { player.dy = 0; });
document.getElementById("downBtn").addEventListener("touchstart", () => { player.dy = player.speed; });
document.getElementById("downBtn").addEventListener("touchend", () => { player.dy = 0; });
document.getElementById("leftBtn").addEventListener("touchstart", () => { player.dx = -player.speed; });
document.getElementById("leftBtn").addEventListener("touchend", () => { player.dx = 0; });
document.getElementById("rightBtn").addEventListener("touchstart", () => { player.dx = player.speed; });
document.getElementById("rightBtn").addEventListener("touchend", () => { player.dx = 0; });
document.getElementById("fireButton").addEventListener("touchstart", () => { fireBullet(); });

startButton.addEventListener("click", () => {
  startScreen.style.display = "none";
  gameScreen.style.display = "block";
  initTerrain();
  generateTunnel();
  spawnEmeralds();
  spawnGoldBags();
  spawnPowerups();
  spawnEnemy();
  gameLoop();
});

restartButton.addEventListener("click", resetGame);

setInterval(() => { if (!gameOver && enemies.length < 3) { spawnEnemy(); } }, 15000);