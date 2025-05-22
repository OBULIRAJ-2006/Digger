// Game constants
const TILE_SIZE = 32;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Load images
const emeraldImage = new Image();
emeraldImage.src = 'emeralds.png';

// Game state variables
let canvas, ctx;
let player, enemies = [], emeralds = [], mapGrid = [];
let gameInterval;

// Represents a tile grid: 0 = empty (tunnel), 1 = dirt
// This example uses a simple empty grid for demonstration.
const ROWS = CANVAS_HEIGHT / TILE_SIZE;
const COLS = CANVAS_WIDTH / TILE_SIZE;
for (let r = 0; r < ROWS; r++) {
  mapGrid[r] = [];
  for (let c = 0; c < COLS; c++) {
    mapGrid[r][c] = 1; // Initialize all as dirt
  }
}

// Helper: convert pixel coordinate to grid coordinate
function toGridCoord(x) {
  return Math.floor(x / TILE_SIZE);
}

// Initialize the game when 'Start Game' is clicked
document.getElementById('startButton').addEventListener('click', () => {
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  initGame();
});

// Player object
class Player {
  constructor() {
    this.x = TILE_SIZE * 5;
    this.y = TILE_SIZE * 5;
    this.speed = 2;
    this.width = TILE_SIZE;
    this.height = TILE_SIZE;
  }
  move(dx, dy) {
    // Move player and dig out dirt (set to empty)
    this.x += dx * this.speed;
    this.y += dy * this.speed;
    let gx = toGridCoord(this.x);
    let gy = toGridCoord(this.y);
    // Dig tunnel in current cell
    if (gy >= 0 && gx >= 0 && gy < ROWS && gx < COLS) {
      mapGrid[gy][gx] = 0;
    }
  }
  draw() {
    ctx.fillStyle = 'blue';
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

// Enemy object
class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = TILE_SIZE;
    this.height = TILE_SIZE;
    this.speed = 1;
  }
  update() {
    // Pathfinding: find next step towards player through tunnels
    let start = { x: toGridCoord(this.x), y: toGridCoord(this.y) };
    let goal = { x: toGridCoord(player.x), y: toGridCoord(player.y) };
    let path = findPath(mapGrid, start, goal);
    if (path && path.length > 1) {
      let next = path[1];
      // Move enemy one step toward next tile (center to center)
      this.x = next.x * TILE_SIZE;
      this.y = next.y * TILE_SIZE;
    }
    // If path is null (no reachable path), the enemy can idle or roam (not implemented)
  }
  draw() {
    ctx.fillStyle = 'red';
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

// Breadth-first search pathfinding on the grid of tunnels
function findPath(grid, start, goal) {
  let queue = [start];
  let visited = new Set();
  let parent = {};
  visited.add(start.x + ',' + start.y);

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 }
  ];

  while (queue.length > 0) {
    let current = queue.shift();
    if (current.x === goal.x && current.y === goal.y) {
      // Reached goal; reconstruct path
      let path = [];
      let node = current.x + ',' + current.y;
      while (node) {
        let parts = node.split(',');
        path.push({ x: parseInt(parts[0]), y: parseInt(parts[1]) });
        node = parent[node];
      }
      return path.reverse();
    }
    for (let {dx, dy} of directions) {
      let nx = current.x + dx;
      let ny = current.y + dy;
      if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS) {
        // Only move through dug tunnels (grid[ny][nx] === 0)
        if (grid[ny][nx] === 0) {
          let neighborKey = nx + ',' + ny;
          if (!visited.has(neighborKey)) {
            visited.add(neighborKey);
            parent[neighborKey] = current.x + ',' + current.y;
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }
  }
  return null; // No path found
}

// Game initialization
function initGame() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  player = new Player();
  enemies = [new Enemy(TILE_SIZE * 10, TILE_SIZE * 10)]; // Example enemy
  // Place some emeralds on the map (random positions for demo)
  emeralds = [
    { x: 15, y: 8 },
    { x: 20, y: 12 }
  ];
  // Initial digging at player start position
  mapGrid[toGridCoord(player.y)][toGridCoord(player.x)] = 0;

  // Start main game loop
  gameInterval = setInterval(gameLoop, 1000 / 30);
}

// Main game loop
function gameLoop() {
  update();
  draw();
}

// Update game state
function update() {
  // For demo, move player randomly or by some control (not implemented)
  // Here we skip player movement code for brevity.

  // Update enemies
  enemies.forEach(enemy => enemy.update());

  // Check for player-emerald collisions
  let playerGridX = toGridCoord(player.x);
  let playerGridY = toGridCoord(player.y);
  emeralds = emeralds.filter(e => {
    if (e.x === playerGridX && e.y === playerGridY) {
      // Player collected an emerald (increase score)
      // score++;
      return false; // remove from array
    }
    return true;
  });
}

// Draw everything
function draw() {
  // Clear canvas
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw map (dirt as gray, tunnels as light)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (mapGrid[r][c] === 1) {
        ctx.fillStyle = '#888'; // dirt
        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.fillStyle = '#ccccaa'; // dug tunnel
        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // Draw emeralds
  emeralds.forEach(e => {
    ctx.drawImage(emeraldImage, e.x * TILE_SIZE, e.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  });

  // Draw player and enemies
  player.draw();
  enemies.forEach(enemy => enemy.draw());
}