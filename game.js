// Constants
const TILE = 32;
const ROWS = 15;
const COLS = 20;
const WIDTH = COLS * TILE;
const HEIGHT = ROWS * TILE;
const INV_DURATION = 5000; // ms

// Predefined level layouts (0=dirt,1=wall)
const LEVELS = [
  // Level 1: border only
  Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => (r===0||r===ROWS-1||c===0||c===COLS-1)?1:0)
  ),
  // Level 2: simple maze
  [
    // 15 rows of 20 columns; 1=wall,0=dirt
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1],
    [1,0,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
    [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,0,1],
    [1,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1],
    [1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,0,1],
    [1,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1],
    [1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ],
  // Level 3: random walls (~25%)
  Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) =>
      (r===0||r===ROWS-1||c===0||c===COLS-1) ? 1 : (Math.random()<0.25?1:0)
    )
  )
];

// Globals\let canvas, ctx;
let map, player, enemies, score, levelIndex, invTimer;
let images = {}, sounds = {};

window.onload = () => {
  // Setup canvas
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  // Load images
  const assets = [
    { id: 'digger', src: 'digger.png' },
    { id: 'enemy', src: 'enemy.png' },
    { id: 'emerald', src: 'emerald.png' },
    { id: 'inv', src: 'invincible.png' },
    { id: 'bg', src: 'classic-bg.png' }
  ];
  let loaded = 0;
  assets.forEach(a => {
    const img = new Image();
    img.src = a.src;
    img.onload = () => {
      images[a.id] = img;
      if (++loaded === assets.length) initGame();
    };
  });

  // Load sounds
  sounds.pick = new Audio('powerup.mp3');
  sounds.hit = new Audio('hit.mp3');
  sounds.bg = new Audio('fire.mp3');
  sounds.bg.loop = true;
};

function initGame() {
  score = 0;
  levelIndex = 0;
  sounds.bg.play();
  setupInput();
  startLevel();
}

function setupInput() {
  document.addEventListener('keydown', e => movePlayer(e.key));
  document.getElementById('controls').addEventListener('click', e => {
    const dir = e.target.dataset.dir;
    if (dir) movePlayer(dir);
  });
}

function startLevel() {
  // Deep-copy map
  map = LEVELS[levelIndex].map(r => r.slice());
  // Place emeralds (2) and invincibility (3)
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      if (map[y][x] === 0) {
        const r = Math.random();
        if (r < 0.05) map[y][x] = 3;
        else if (r < 0.20) map[y][x] = 2;
      }
    }
  }
  player = { x: 1, y: 1, inv: false };
  invTimer = 0;
  enemies = [
    { x: COLS-2, y: ROWS-2 },
    { x: COLS-2, y: 1 }
  ];
  hideMessage();
  updateUI();
  requestAnimationFrame(gameLoop);
}

function movePlayer(key) {
  const dirs = {
    ArrowUp: [0,-1], ArrowDown: [0,1],
    ArrowLeft: [-1,0], ArrowRight: [1,0]
  };
  const d = dirs[key];
  if (!d) return;
  const [dx, dy] = d;
  const nx = player.x + dx, ny = player.y + dy;
  if (map[ny][nx] !== 1) {
    player.x = nx;
    player.y = ny;
    const tile = map[ny][nx];
    if (tile === 2) {
      score += 10;
      map[ny][nx] = 0;
      sounds.pick.play();
      updateUI();
    }
    if (tile === 3) {
      player.inv = true;
      invTimer = INV_DURATION;
      map[ny][nx] = 0;
      sounds.pick.play();
      document.getElementById('inv-status').classList.remove('hidden');
    }
  }
}

function gameLoop(ts) {
  // Invincibility countdown
  if (player.inv) {
    invTimer -= 16;
    if (invTimer <= 0) {
      player.inv = false;
      document.getElementById('inv-status').classList.add('hidden');
    }
  }

  moveEnemies();
  draw();

  if (checkVictory()) return showMessage('You Win!', advanceLevel);
  if (checkGameOver()) return showMessage('Game Over', initGame);

  requestAnimationFrame(gameLoop);
}

function draw() {
  // Clear
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  // Draw map
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = map[y][x];
      switch (t) {
        case 1: ctx.drawImage(images.bg, x*TILE, y*TILE, TILE, TILE); break;
        case 0: ctx.drawImage(images.bg, x*TILE, y*TILE, TILE, TILE); break;
        case 2: ctx.drawImage(images.emerald, x*TILE, y*TILE, TILE, TILE); break;
        case 3: ctx.drawImage(images.inv, x*TILE, y*TILE, TILE, TILE); break;
      }
    }
  }
  // Draw player
  ctx.globalAlpha = player.inv ? 0.6 : 1;
  ctx.drawImage(images.digger, player.x*TILE, player.y*TILE, TILE, TILE);
  ctx.globalAlpha = 1;
  // Draw enemies
  enemies.forEach(e => ctx.drawImage(images.enemy, e.x*TILE, e.y*TILE, TILE, TILE));
}

// BFS pathfinding
function moveEnemies() {
  enemies.forEach(e => {
    const [dx, dy] = getNextStep(e.x, e.y);
    if (dx||dy) { e.x += dx; e.y += dy; }
  });
}
function getNextStep(sx, sy) {
  const queue = [[sx, sy]];
  const prev = Array.from({length:ROWS}, () => Array(COLS).fill(null));
  prev[sy][sx] = [sx, sy];
  while (queue.length) {
    const [x, y] = queue.shift();
    if (x===player.x && y===player.y) break;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy]) => {
      const nx = x+dx, ny = y+dy;
      if (ny>=0 && ny<ROWS && nx>=0 && nx<COLS && prev[ny][nx]===null && map[ny][nx]!==1) {
        prev[ny][nx] = [x, y];
        queue.push([nx, ny]);
      }
    });
  }
  let cx = player.x, cy = player.y;
  if (!prev[cy][cx]) return [0,0];
  while (prev[cy][cx][0]!==sx || prev[cy][cx][1]!==sy) {
    [cx, cy] = prev[cy][cx];
  }
  return [cx-sx, cy-sy];
}

function checkVictory() {
  return !map.flat().includes(2);
}

function checkGameOver() {
  return enemies.some(e => e.x===player.x && e.y===player.y) && !player.inv;
}

function showMessage(text, callback) {
  const msg = document.getElementById('message');
  msg.textContent = text;
  msg.classList.remove('hidden');
  setTimeout(() => { msg.classList.add('hidden'); callback(); }, 1500);
}

function hideMessage() {
  document.getElementById('message').classList.add('hidden');
}

function advanceLevel() {
  levelIndex++;
  if (levelIndex >= LEVELS.length) {
    return showMessage('All Levels Complete!', initGame);
  }
  updateUI();
  startLevel();
}

function updateUI() {
  document.getElementById('score').textContent = 'Score: ' + score;
  document.getElementById('level').textContent = 'Level: ' + (levelIndex+1);
}