// Main game script

// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let score = 0, lives = 3, level = 1;

// Tile map (0=dirt, 1=empty, 2=emerald, 3=gold bag, 4=dug floor)
const TILE_SIZE = 16;
const MAP_W = canvas.width / TILE_SIZE;
const MAP_H = canvas.height / TILE_SIZE;
let mapGrid = [];

// Player object
class Player {
  constructor() {
    this.x = 5; this.y = 5;
    this.dir = {x:0, y:0};
    this.fireReady = true;
    this.speed = 2; // speed tiles/sec
  }
  move(dx, dy) {
    // Attempt to dig or move
    let nx = this.x + dx, ny = this.y + dy;
    if (nx>=0 && nx<MAP_W && ny>=0 && ny<MAP_H) {
      if (mapGrid[ny][nx] !== 1) {
        // Dig dirt (if present)
        mapGrid[ny][nx] = 1; // make empty floor
      }
      this.x = nx; this.y = ny;
    }
  }
  update() {
    // Move player by direction
    if (this.dir.x !== 0 || this.dir.y !== 0) {
      this.move(this.dir.x, this.dir.y);
    }
  }
  draw() {
    // Draw Digger sprite at this.x,this.y
    ctx.fillStyle = '#ff0';
    ctx.fillRect(this.x*TILE_SIZE, this.y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }
}
const player = new Player();

// Simple Enemy class with A* pathfinding
class Enemy {
  constructor(x,y) {
    this.x = x; this.y = y;
  }
  update() {
    // Find path towards player (A*), move 1 step along path
    let path = findPath(this.x, this.y, player.x, player.y);
    if (path.length > 1) {
      // path[0] is current, path[1] is next
      this.x = path[1].x;
      this.y = path[1].y;
    }
    // Check collision with player
    if (this.x === player.x && this.y === player.y) {
      lives--;
      resetPlayer();
    }
  }
  draw() {
    ctx.fillStyle = '#f00';
    ctx.fillRect(this.x*TILE_SIZE, this.y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }
}
const enemies = [ new Enemy(15, 2) ];

// Very basic A* on grid
function findPath(sx, sy, tx, ty) {
  // This is a placeholder for actual A* algorithm implementation.
  // Assume we return a list of grid cells from (sx,sy) to (tx,ty).
  // For brevity, here we just move directly (no obstacles).
  return [ {x:sx, y:sy}, {x: sx + Math.sign(tx-sx), y: sy + Math.sign(ty-sy)} ];
}

// Initialize map
function initMap() {
  mapGrid = [];
  for (let y = 0; y < MAP_H; y++) {
    mapGrid[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      if (y === 0 || y === MAP_H-1 || x === 0 || x === MAP_W-1) {
        mapGrid[y][x] = 1; // border empty
      } else {
        mapGrid[y][x] = 0; // dirt
      }
    }
  }
  // Place some emeralds and gold
  for (let i = 0; i < 20; i++) {
    let ex = 2 + Math.floor(Math.random()*(MAP_W-4));
    let ey = 2 + Math.floor(Math.random()*(MAP_H-4));
    mapGrid[ey][ex] = 2; // emerald
  }
  for (let i = 0; i < 5; i++) {
    let gx = 2 + Math.floor(Math.random()*(MAP_W-4));
    let gy = 2 + Math.floor(Math.random()*(MAP_H-4));
    mapGrid[gy][gx] = 3; // gold bag
  }
}
initMap();

// Handle keyboard input
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === ' ' && player.fireReady) {
    fireBullet();
    player.fireReady = false;
    setTimeout(() => player.fireReady = true, 1000);
  }
});
window.addEventListener('keyup', e => { keys[e.key] = false; });
function handleInput() {
  player.dir = {x:0, y:0};
  if (keys['ArrowUp'] || keys['w']) player.dir.y = -1;
  if (keys['ArrowDown'] || keys['s']) player.dir.y = 1;
  if (keys['ArrowLeft'] || keys['a']) player.dir.x = -1;
  if (keys['ArrowRight'] || keys['d']) player.dir.x = 1;
}

// Placeholder bullet firing
function fireBullet() {
  // Play fire sound, draw effect, check collision with enemies, etc.
  console.log("Fire!");
}

// Reset player after death
function resetPlayer() {
  player.x = 5; player.y = 5;
}

// Main game loop
function gameLoop() {
  // Update logic
  handleInput();
  player.update();
  enemies.forEach(e => e.update());
  // Clear and draw
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw map tiles
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      let tile = mapGrid[y][x];
      if (tile === 0) { // dirt
        ctx.fillStyle = '#a52';
        ctx.fillRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
      } else if (tile === 2) { // emerald
        ctx.fillStyle = '#0f0';
        ctx.fillRect(x*TILE_SIZE+4, y*TILE_SIZE+4, TILE_SIZE-8, TILE_SIZE-8);
      } else if (tile === 3) { // gold bag
        ctx.fillStyle = '#ff0';
        ctx.fillRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }
  // Draw player and enemies
  player.draw();
  enemies.forEach(e => e.draw());
  // Update HUD
  document.getElementById('score').textContent = `Score: ${score}`;
  document.getElementById('lives').textContent = `Lives: ${lives}`;
  // Request next frame
  window.requestAnimationFrame(gameLoop);
}

// Start the loop
gameLoop();