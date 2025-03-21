document.addEventListener("DOMContentLoaded", () => {
    // Get canvas and context
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 800;
    canvas.height = 600;
  
    // Game Score
    let score = 0;
    document.getElementById("scoreDisplay").innerText = "Score: " + score;
  
    // Load the digger sprite image (ensure digger.png exists in your project)
    const diggerSprite = new Image();
    diggerSprite.src = "digger.png";
  
    // Sound Effects (place appropriate sound files in your project)
    const soundMove = new Audio("move.mp3");
    const soundCollect = new Audio("collect.mp3");
    const soundEnemyHit = new Audio("hit.mp3");
  
    // Player (Digger) Object
    const player = {
      x: canvas.width / 2 - 16,
      y: canvas.height / 2 - 16,
      width: 32,
      height: 32,
      speed: 4,
      dx: 0,
      dy: 0,
      sprite: diggerSprite,
    };
  
    // Arrays for Enemies and Treasures
    let enemies = [];
    let treasures = [];
  
    // Spawn Enemies at random positions
    function spawnEnemies() {
      enemies = [];
      for (let i = 0; i < 3; i++) {
        enemies.push({
          x: Math.random() * (canvas.width - 32),
          y: Math.random() * (canvas.height - 32),
          width: 32,
          height: 32,
          speed: 2,
        });
      }
    }
  
    // Spawn Treasures at random positions
    function spawnTreasures() {
      treasures = [];
      for (let i = 0; i < 5; i++) {
        treasures.push({
          x: Math.random() * (canvas.width - 16),
          y: Math.random() * (canvas.height - 16),
          width: 16,
          height: 16,
        });
      }
    }
  
    // Draw the Player (Digger)
    function drawPlayer() {
      ctx.drawImage(player.sprite, player.x, player.y, player.width, player.height);
    }
  
    // Draw Enemies
    function drawEnemies() {
      ctx.fillStyle = "red";
      enemies.forEach((enemy) => {
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      });
    }
  
    // Draw Treasures
    function drawTreasures() {
      ctx.fillStyle = "gold";
      treasures.forEach((treasure) => {
        ctx.fillRect(treasure.x, treasure.y, treasure.width, treasure.height);
      });
    }
  
    // Collision detection between two objects
    function checkCollision(a, b) {
      return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
      );
    }
  
    // Update game objects
    function update() {
      // Update player position
      player.x += player.dx;
      player.y += player.dy;
  
      // Boundary check for player
      if (player.x < 0) player.x = 0;
      if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
      if (player.y < 0) player.y = 0;
      if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
  
      // Check collision with treasures
      treasures.forEach((treasure, index) => {
        if (checkCollision(player, treasure)) {
          treasures.splice(index, 1);
          score += 10;
          document.getElementById("scoreDisplay").innerText = "Score: " + score;
          soundCollect.play();
        }
      });
  
      // Update enemy positions to chase the player
      enemies.forEach((enemy) => {
        if (enemy.x < player.x) enemy.x += enemy.speed;
        else if (enemy.x > player.x) enemy.x -= enemy.speed;
        if (enemy.y < player.y) enemy.y += enemy.speed;
        else if (enemy.y > player.y) enemy.y -= enemy.speed;
  
        // Collision with enemy resets score and player position
        if (checkCollision(player, enemy)) {
          score = 0;
          document.getElementById("scoreDisplay").innerText = "Score: " + score;
          soundEnemyHit.play();
          player.x = canvas.width / 2 - player.width / 2;
          player.y = canvas.height / 2 - player.height / 2;
        }
      });
    }
  
    // Main Game Loop
    function gameLoop() {
      update();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawTreasures();
      drawEnemies();
      drawPlayer();
      requestAnimationFrame(gameLoop);
    }
  
    // Keyboard Controls for Desktop
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp") {
        player.dy = -player.speed;
        soundMove.play();
      }
      if (e.key === "ArrowDown") {
        player.dy = player.speed;
        soundMove.play();
      }
      if (e.key === "ArrowLeft") {
        player.dx = -player.speed;
        soundMove.play();
      }
      if (e.key === "ArrowRight") {
        player.dx = player.speed;
        soundMove.play();
      }
    });
  
    document.addEventListener("keyup", (e) => {
      if (["ArrowUp", "ArrowDown"].includes(e.key)) player.dy = 0;
      if (["ArrowLeft", "ArrowRight"].includes(e.key)) player.dx = 0;
    });
  
    // Virtual Joystick for Mobile
    const joystickContainer = document.getElementById("joystickContainer");
    const joystickBase = document.getElementById("joystickBase");
    const joystickHandle = document.getElementById("joystickHandle");
    let joystickActive = false;
    let joystickCenter = { x: 0, y: 0 };
  
    joystickHandle.addEventListener("touchstart", (e) => {
      joystickActive = true;
      const rect = joystickBase.getBoundingClientRect();
      joystickCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    });
  
    joystickContainer.addEventListener("touchmove", (e) => {
      if (!joystickActive) return;
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - joystickCenter.x;
      const dy = touch.clientY - joystickCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = joystickBase.offsetWidth / 2;
  
      // Normalize the values
      let normX = dx / maxDistance;
      let normY = dy / maxDistance;
      if (distance > maxDistance) {
        normX = Math.max(-1, Math.min(1, normX));
        normY = Math.max(-1, Math.min(1, normY));
      }
  
      // Update joystick handle position visually
      joystickHandle.style.transform = `translate(${normX * maxDistance}px, ${normY * maxDistance}px)`;
  
      // Update player movement based on joystick input
      player.dx = normX * player.speed;
      player.dy = normY * player.speed;
    });
  
    joystickContainer.addEventListener("touchend", (e) => {
      joystickActive = false;
      joystickHandle.style.transform = `translate(0px, 0px)`;
      player.dx = 0;
      player.dy = 0;
    });
  
    // Initialize and start game
    spawnEnemies();
    spawnTreasures();
    gameLoop();
  });