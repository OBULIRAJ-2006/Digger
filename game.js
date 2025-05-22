// game.js

// Game constants
const TILE_SIZE = 40;
const MAP_COLS = 10;
const MAP_ROWS = 10;

// Level definitions (0=sand, 1=open tunnel, 2=emerald)
const levels = [
  {
    map: [
      [1,1,1,1,1,1,1,1,1,1],
      [1,0,0,2,0,0,0,0,2,1],
      [1,0,0,0,0,0,2,0,0,1],
      [1,0,2,0,0,0,0,0,0,1],
      [1,0,0,0,0,2,0,0,0,1],
      [1,0,0,0,0,0,0,2,0,1],
      [1,2,0,0,0,0,0,0,0,1],
      [1,0,0,0,2,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1]
    ],
    playerStart: {x:5, y:5},
    enemies: [{x:1,y:1}, {x:8,y:8}]
  },
  {
    map: [
      [1,1,1,1,1,1,1,1,1,1],
      [1,2,0,0,0,0,0,0,2,1],
      [1,0,1,0,0,0,0,1,0,1],
      [1,0,0,1,0,0,1,0,0,1],
      [1,0,0,0,1,1,0,0,0,1],
      [1,0,0,0,1,1,0,0,0,1],
      [1,0,0,1,0,0,1,0,0,1],
      [1,0,1,0,0,0,0,1,0,1],
      [1,2,0,0,0,0,0,0,2,1],
      [1,1,1,1,1,1,1,1,1,1]
    ],
    playerStart: {x:5, y:5},
    enemies: [{x:2,y:2}, {x:7,y:7}]
  }
];

let currentLevel = 0;
let gameMap, player, enemies, score;
let gameRunning = false;

// Get DOM elements
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const startBtn = document.getElementById('start-button');
const restartBtn = document.getElementById('restart-button');
const nextBtn = document.getElementById('next-level-button');
const fireBtn = document.getElementById('fire-button');
const upBtn = document.getElementById('up-button');
const leftBtn = document.getElementById('left-button');
const rightBtn = document.getElementById('right-button');
const downBtn = document.getElementById('down-button');

// Initialize event listeners
startBtn.addEventListener('click', () => startGame());
restartBtn.addEventListener('click', () => resetGame());
nextBtn.addEventListener('click', () => nextLevel());
fireBtn.addEventListener('click', () => {
  // Placeholder for fire action
  console.log('Fire button pressed');
});
upBtn.addEventListener('click', () => movePlayer(0, -1));
downBtn.addEventListener('click', () => movePlayer(0, 1));
leftBtn.addEventListener('click', () => movePlayer(-1, 0));
rightBtn.addEventListener('click', () => movePlayer(1, 0));
window.addEventListener('keydown', (e) => {
  if (!gameRunning) return;
  switch(e.key) {
    case 'ArrowUp':    movePlayer(0, -1); break;
    case 'ArrowDown':  movePlayer(0, 1); break;
    case 'ArrowLeft':  movePlayer(-1, 0); break;
    case 'ArrowRight': movePlayer(1, 0); break;
  }
});

// Start or restart the game
function startGame() {
  const level = levels[currentLevel];
  // Deep copy the map so we can modify it
  gameMap = level.map.map(row => row.slice());
  player = { x: level.playerStart.x, y: level.playerStart.y };
  enemies = level.enemies.map(e => ({ x: e.x, y: e.y }));
  score = 0;
  scoreEl.textContent = score;
  gameRunning = true;
  startBtn.style.display = 'none';
  restartBtn.style.display = 'none';
  nextBtn.style.display = 'none';
  requestAnimationFrame(gameLoop);
}

// Move player by (dx, dy) in grid units
function movePlayer(dx, dy) {
  if (!gameRunning) return;
  const nx = player.x + dx;
  const ny = player.y + dy;
  // Check bounds
  if (nx < 0 || nx >= MAP_COLS || ny < 0 || ny >= MAP_ROWS) return;
  const cell = gameMap[ny][nx];
  if (cell === 0) {
    // Dig sand (0->1)
    gameMap[ny][nx] = 1;
    player.x = nx; player.y = ny;
  } else if (cell === 1) {
    player.x = nx; player.y = ny;
  } else if (cell === 2) {
    // Collect emerald
    gameMap[ny][nx] = 1;
    player.x = nx; player.y = ny;
    score++;
    scoreEl.textContent = score;
    checkLevelComplete();
  }
  // After player moves, move enemies and check collisions
  moveEnemies();
  checkCollisions();
}

// Move each enemy one step toward the player using BFS pathfinding
function moveEnemies() {
  for (let enemy of enemies) {
    const path = bfs(enemy.x, enemy.y, player.x, player.y);
    if (path.length > 0) {
      // Move one step along the path (path[0] is next step from enemy position)
      enemy.x = path[0].x;
      enemy.y = path[0].y;
    }
  }
}

// Check if any enemy has caught the player
function checkCollisions() {
  for (let enemy of enemies) {
    if (enemy.x === player.x && enemy.y === player.y) {
      gameOver();
      break;
    }
  }
}

// Check if all emeralds are collected
function checkLevelComplete() {
  for (let row of gameMap) {
    if (row.includes(2)) return; // still emeralds left
  }
  // Level complete
  gameRunning = false;
  nextBtn.style.display = 'inline';
}

// End the game (player caught)
function gameOver() {
  gameRunning = false;
  restartBtn.style.display = 'inline';
}

// Reset the game to level 0
function resetGame() {
  currentLevel = 0;
  startBtn.style.display = 'inline';
  restartBtn.style.display = 'none';
  nextBtn.style.display = 'none';
}

// Advance to the next level
function nextLevel() {
  currentLevel++;
  if (currentLevel >= levels.length) {
    // No more levels: just restart the first level
    currentLevel = 0;
  }
  startGame();
}

// The main animation loop
function gameLoop() {
  if (!gameRunning) return;
  // Clear canvas and redraw scene
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw emeralds
  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      if (gameMap[y][x] === 2) {
        // Draw emerald sprite (placeholder: yellow circle)
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(
          x * TILE_SIZE + TILE_SIZE/2,
          y * TILE_SIZE + TILE_SIZE/2,
          TILE_SIZE/4, 0, 2*Math.PI
        );
        ctx.fill();
      }
    }
  }
  // Draw player (blue square)
  ctx.fillStyle = 'blue';
  ctx.fillRect(player.x * TILE_SIZE, player.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  // Draw enemies (red squares)
  ctx.fillStyle = 'red';
  for (let enemy of enemies) {
    ctx.fillRect(enemy.x * TILE_SIZE, enemy.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }
  // Next frame
  requestAnimationFrame(gameLoop);
}

// Breadth-first search on the grid from (sx,sy) to (tx,ty), returning path as list of points
function bfs(sx, sy, tx, ty) {
  const dirs = [
    {dx: 1, dy: 0},
    {dx: -1, dy: 0},
    {dx: 0, dy: 1},
    {dx: 0, dy: -1}
  ];
  // Setup visited and parent trackers
  let visited = Array.from({length: MAP_ROWS}, () => Array(MAP_COLS).fill(false));
  let parent = {};
  let queue = [];
  visited[sy][sx] = true;
  queue.push({x: sx, y: sy});
  parent[sy + "," + sx] = null;
  // BFS loop
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.x === tx && cur.y === ty) break;
    for (let d of dirs) {
      const nx = cur.x + d.dx;
      const ny = cur.y + d.dy;
      // Check bounds and passability
      if (nx >= 0 && nx < MAP_COLS && ny >= 0 && ny < MAP_ROWS) {
        if (!visited[ny][nx] && gameMap[ny][nx] !== 0) {
          visited[ny][nx] = true;
          parent[ny + "," + nx] = {x: cur.x, y: cur.y};
          queue.push({x: nx, y: ny});
        }
      }
    }
  }
  // No path found
  if (!visited[ty][tx]) {
    return [];
  }
  // Reconstruct path from target to start
  let path = [];
  let px = tx, py = ty;
  while (!(px === sx && py === sy)) {
    path.unshift({x: px, y: py});
    const p = parent[py + "," + px];
    px = p.x; py = p.y;
  }
  return path;
}