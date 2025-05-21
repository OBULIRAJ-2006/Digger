// script.js

// Canvas and rendering context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI elements
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const fullscreenButton = document.getElementById('fullscreenButton');
const endScreen = document.getElementById('endScreen');
const endTitle = document.getElementById('endTitle');
const restartButton = document.getElementById('restartButton');
const powerupStatus = document.getElementById('powerupStatus');

// Game state variables
let gameState = 'START';
let level = 1;
let player = {x: 1, y: 1};    // Player grid position
let enemy  = {x: 8, y: 8};    // Enemy grid position
let powerUps = { speedBoost: false };

// Make canvas fill the window (responsive resizing)5.
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();  // initial sizing

// Full-screen support: toggle on button press6.
fullscreenButton.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        canvas.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
});

// Start the game: hide start screen and switch to PLAYING state.
startButton.addEventListener('click', () => {
    startScreen.style.display = 'none';
    gameState = 'PLAYING';
});

// Restart from Game Over or Victory by reloading the page.
restartButton.addEventListener('click', () => {
    location.reload();
});

// Sample key events: 'P' to toggle a power-up, 'G' to force Game Over.
document.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') {
        powerUps.speedBoost = !powerUps.speedBoost;
    }
    if (e.key === 'g' || e.key === 'G') {
        gameOver();
    }
});

// A* pathfinding implementation for grid-based movement7.
function findPathAStar(grid, start, goal) {
    const width = grid[0].length, height = grid.length;
    const openSet = [], closedSet = new Set();
    const cameFrom = {};
    const gScore = {}, fScore = {};
    const startKey = `${start.x},${start.y}`;
    const goalKey = `${goal.x},${goal.y}`;
    
    function heuristic(a, b) {
        // Manhattan distance (grid-based)
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
    function getNeighbors(node) {
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        const result = [];
        for (const [dx, dy] of dirs) {
            const nx = node.x + dx, ny = node.y + dy;
            if (nx>=0 && nx<width && ny>=0 && ny<height && grid[ny][nx] === 0) {
                result.push({x: nx, y: ny});
            }
        }
        return result;
    }
    
    gScore[startKey] = 0;
    fScore[startKey] = heuristic(start, goal);
    openSet.push(start);
    
    while (openSet.length) {
        // Node in openSet with lowest fScore
        openSet.sort((a,b) => (fScore[`${a.x},${a.y}`] || Infinity) - (fScore[`${b.x},${b.y}`] || Infinity));
        const current = openSet.shift();
        const currentKey = `${current.x},${current.y}`;
        
        if (currentKey === goalKey) {
            // Reconstruct path backwards
            const path = [];
            let ck = currentKey;
            while (ck !== startKey) {
                const [cx, cy] = ck.split(',').map(Number);
                path.push({x: cx, y: cy});
                ck = cameFrom[ck];
            }
            return path.reverse();
        }
        
        closedSet.add(currentKey);
        for (const neighbor of getNeighbors(current)) {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            if (closedSet.has(neighborKey)) continue;
            const tentativeG = gScore[currentKey] + 1;
            if (!(neighborKey in gScore) || tentativeG < gScore[neighborKey]) {
                cameFrom[neighborKey] = currentKey;
                gScore[neighborKey] = tentativeG;
                fScore[neighborKey] = tentativeG + heuristic(neighbor, goal);
                if (!openSet.some(n => n.x===neighbor.x && n.y===neighbor.y)) {
                    openSet.push(neighbor);
                }
            }
        }
    }
    return [];  // no path found
}

// Example level grid (0=walkable, 1=wall) for Levels 2 & 3.
const levelGrid = [
    [0,0,0,0,0,0,0,0,0,0],
    [0,1,1,1,0,0,1,1,1,0],
    [0,0,0,1,0,0,0,0,1,0],
    [0,1,0,0,0,1,1,0,1,0],
    [0,1,0,1,0,0,0,0,0,0],
    [0,0,0,1,0,1,1,1,0,0],
    [0,1,1,1,0,0,0,1,0,0],
    [0,0,0,0,0,1,0,0,0,0],
    [0,1,1,0,0,1,0,1,1,0],
    [0,0,0,0,0,0,0,0,0,0]
];

// Main game loop
function gameLoop() {
    if (gameState === 'PLAYING') {
        // Clear the entire canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw player (placeholder circle)
        ctx.fillStyle = 'blue';
        ctx.beginPath();
        ctx.arc(player.x*50+25, player.y*50+25, 20, 0, Math.PI*2);
        ctx.fill();

        // Enemy AI: use A* path if level >= 28.
        if (level >= 2) {
            const path = findPathAStar(levelGrid, enemy, player);
            if (path.length > 0) {
                // Move enemy one step along path
                enemy = path[0];
            }
        }
        // Draw enemy (placeholder circle)
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(enemy.x*50+25, enemy.y*50+25, 20, 0, Math.PI*2);
        ctx.fill();

        // Display active power-up text in HUD (could also use canvas text via fillText9)
        let puText = '';
        if (powerUps.speedBoost) {
            puText = 'Speed Boost Active';
        }
        powerupStatus.textContent = puText;
    }
    requestAnimationFrame(gameLoop);
}

// Show Game Over screen
function gameOver() {
    gameState = 'GAMEOVER';
    endTitle.textContent = 'Game Over';
    endScreen.classList.remove('hidden');
}

// Show Victory/Congratulations screen after Level 3
function victory() {
    gameState = 'VICTORY';
    endTitle.textContent = 'Congratulations!';
    endScreen.classList.remove('hidden');
}

// Simulate level progression for demonstration: advance levels and trigger victory
setTimeout(() => { level = 2; }, 5000);
setTimeout(() => { level = 3; }, 10000);
setTimeout(() => { victory(); }, 15000);

// Start the game loop
gameLoop();