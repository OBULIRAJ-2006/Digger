function updateEnemies() {
  enemies.forEach(enemy => {
    // Calculate player's predicted future position
    let predictionFactor = 40; // maximum prediction (tweak as desired)
    let predictedX = player.x + player.dx * predictionFactor;
    let predictedY = player.y + player.dy * predictionFactor;
    predictedX = Math.max(0, Math.min(canvas.width - player.width, predictedX));
    predictedY = Math.max(0, Math.min(canvas.height - player.height, predictedY));
    
    // Determine grid positions for enemy and predicted position
    let start = { x: Math.floor(enemy.x / cellSize), y: Math.floor(enemy.y / cellSize) };
    let goal = { x: Math.floor((predictedX + player.width/2) / cellSize), y: Math.floor((predictedY + player.height/2) / cellSize) };
    let path = findPath(start, goal);
    
    if (path.length > 1) {
      let nextStep = path[1];
      let targetX = nextStep.x * cellSize;
      let targetY = nextStep.y * cellSize;
      let dx = targetX - enemy.x;
      let dy = targetY - enemy.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        enemy.x += (dx / dist) * enemy.speed;
        enemy.y += (dy / dist) * enemy.speed;
      }
    } else {
      // Fallback random movement if no path is found
      enemy.dx = (Math.random() * 2 - 1) * enemy.speed;
      enemy.dy = (Math.random() * 2 - 1) * enemy.speed;
      let newX = enemy.x + enemy.dx;
      let newY = enemy.y + enemy.dy;
      if (!cellBlocked(newX, enemy.y)) enemy.x = newX;
      if (!cellBlocked(enemy.x, newY)) enemy.y = newY;
    }
    
    if (isColliding(player, enemy)) {
      if (player.shieldTime <= 0) {
        gameOver = true;
        soundEnemyHit.play();
      }
    }
  });
}