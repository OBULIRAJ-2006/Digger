// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
function resize() { canvas.width = window.innerWidth * 0.8; canvas.height = window.innerHeight * 0.8; canvas.style.marginTop = ((window.innerHeight - canvas.height)/2)+'px'; canvas.style.marginLeft = ((window.innerWidth - canvas.width)/2)+'px'; }
window.addEventListener('resize', resize); resize();

// Screens & Buttons
const startScreen    = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const levelUpScreen  = document.getElementById('levelUpScreen');
const gameContainer  = document.getElementById('gameContainer');
const startBtn       = document.getElementById('startBtn');
const restartBtn     = document.getElementById('restartBtn');
const nextLevelBtn   = document.getElementById('nextLevelBtn');
const scoreDisplay   = document.getElementById('scoreDisplay');
const livesDisplay   = document.getElementById('livesDisplay');
const powerupDisplay = document.getElementById('powerupDisplay');
const overScore      = document.getElementById('overScore');

// Images
const diggerImg = new Image(), enemyImg = new Image(), goldImg = new Image(), emeraldImg = new Image(), dugSandImg = new Image();
diggerImg.src='digger.png';enemyImg.src='enemy.png';goldImg.src='gold.png';emeraldImg.src='emerald.png';dugSandImg.src='dug-sand.png';

// Audio
const audioCtx = new (window.AudioContext||window.webkitAudioContext)();
const sounds = {};
function loadSound(name,url){fetch(url).then(r=>r.arrayBuffer()).then(d=>audioCtx.decodeAudioData(d,b=>sounds[name]=b));}
function playSound(name){if(!sounds[name])return;const src=audioCtx.createBufferSource();src.buffer=sounds[name];src.connect(audioCtx.destination);src.start();}
['move.mp3','collect.mp3','hit.mp3','fire.mp3','powerup.mp3','coin.mp3','boom.mp3'].forEach(f=>loadSound(f.replace('.mp3',''),f));

// Game State
let currentLevel, score, lives, gameState, lastTime;
const STATE_MENU=0, STATE_PLAY=1, STATE_LEVELUP=2, STATE_GAMEOVER=3;

// Grid
const cellSize=32;
let cols, rows, terrain, coinMap, tunnelRow;

// Entities
let player, enemies, bullets, powerUps;

// Input
let keys={}, touchDir=null, touchFire=false;
['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].forEach(k=>{window.addEventListener('keydown',e=>keys[e.key]=true);window.addEventListener('keyup',e=>keys[e.key]=false);});
['up','down','left','right'].forEach(dir=>{const btn=document.getElementById(dir+'Btn');btn.addEventListener('touchstart',()=>touchDir=dir);btn.addEventListener('touchend',()=>touchDir=null);});
document.getElementById('fireBtn').addEventListener('touchstart',()=>touchFire=true);document.getElementById('fireBtn').addEventListener('touchend',()=>touchFire=false);

// Classes
class Player{constructor(x,y){Object.assign(this,{x,y,w:32,h:32,speed:100,direction:'right',fireCD:0,shield:false,multi:false,boost:false});}
 update(dt){let mx=0,my=0;if(keys['ArrowUp']||touchDir==='up')my=-1,this.direction='up';if(keys['ArrowDown']||touchDir==='down')my=1,this.direction='down'; if(keys['ArrowLeft']||touchDir==='left')mx=-1,this.direction='left';if(keys['ArrowRight']||touchDir==='right')mx=1,this.direction='right'; if(mx&&my){mx*=0.7071;my*=0.7071;} let v=this.speed*(this.boost?2:1);this.x+=mx*v*dt;this.y+=my*v*dt; this.x=Math.max(0,Math.min(canvas.width-this.w,this.x));this.y=Math.max(0,Math.min(canvas.height-this.h,this.y));
  // Dig & coins
  const tx=Math.floor((this.x+this.w/2)/cellSize), ty=Math.floor((this.y+this.h/2)/cellSize);
  if(terrain[ty]?.[tx]===1){terrain[ty][tx]=0;if(coinMap[ty][tx]){score+=100;playSound('coin');coinMap[ty][tx]=0;uploadHUD();}}
  // Shoot
  if((keys[' ']||touchFire)&&this.fireCD<=0){this.shoot();this.fireCD=0.5;} if(this.fireCD>0)this.fireCD-=dt; }
 draw(){ctx.drawImage(diggerImg,this.x,this.y,this.w,this.h); if(this.shield){ctx.strokeStyle='cyan';ctx.lineWidth=3;ctx.strokeRect(this.x-2,this.y-2,this.w+4,this.h+4);} }
 shoot(){const bx=this.x+this.w/2, by=this.y+this.h/2, sp=300; let dx=0,dy=0; if(this.direction==='up')dy=-1; if(this.direction==='down')dy=1; if(this.direction==='left')dx=-1; if(this.direction==='right')dx=1; if(dx||dy){bullets.push(new Bullet(bx,by,dx*sp,dy*sp)); if(this.multi){bullets.push(new Bullet(bx,by,dx*sp-dy*sp,dy*sp+dx*sp));bullets.push(new Bullet(bx,by,dx*sp+dy*sp,dy*sp-dx*sp));}playSound('fire');} }}
class Enemy{constructor(x,y){Object.assign(this,{x,y,w:32,h:32,speed:50+currentLevel*10});}
 update(dt){const ang=Math.atan2(player.y-this.y,player.x-this.x);this.x+=Math.cos(ang)*this.speed*dt;this.y+=Math.sin(ang)*this.speed*dt;this.x=Math.max(0,Math.min(canvas.width-this.w,this.x));this.y=Math.max(0,Math.min(canvas.height-this.h,this.y)); const tx=Math.floor((this.x+this.w/2)/cellSize), ty=Math.floor((this.y+this.h/2)/cellSize); if(terrain[ty]?.[tx]===1){terrain[ty][tx]=0;coinMap[ty][tx]=0;} if(Math.abs(this.x-player.x)<this.w&&Math.abs(this.y-player.y)<this.h&&!player.shield){lives--;playSound('boom');lives<=0?showScreen('gameOver'):spawnPlayer();updateHUD();}} draw(){ctx.drawImage(enemyImg,this.x,this.y,this.w,this.h);} }
class Bullet{constructor(x,y,vx,vy){Object.assign(this,{x,y,vx,vy,w:8,h:8,dead:false});} update(dt){this.x+=this.vx*dt;this.y+=this.vy*dt; if(this.x<0||this.y<0||this.x>canvas.width||this.y>canvas.height){this.dead=true;return;} enemies.forEach((e,i)=>{if(Math.abs(this.x-e.x)<e.w&&Math.abs(this.y-e.y)<e.h){score+=500;playSound('boom');enemies.splice(i,1);this.dead=true;updateHUD();}});} draw(){ctx.fillStyle='orange';ctx.fillRect(this.x,this.y,this.w,this.h);} }

// Helpers
function updateHUD(){scoreDisplay.textContent=`Score: ${score}`;livesDisplay.textContent=`Lives: ${lives}`;}
function showScreen(name){[startScreen,gameContainer,gameOverScreen,levelUpScreen].forEach(s=>s.classList.add('hidden')); if(name==='play')gameContainer.classList.remove('hidden'); if(name==='gameOver'){overScore.textContent=`Score: ${score}`;gameOverScreen.classList.remove('hidden')} if(name==='levelUp')levelUpScreen.classList.remove('hidden');}
function spawnPlayer(){player=new Player(32,32);}
function initGrid(){cols=Math.floor(canvas.width/cellSize);rows=Math.floor(canvas.height/cellSize);terrain=Array(rows).fill().map(()=>Array(cols).fill(1));coinMap=terrain.map(r=>r.map(()=>0));}
function generateTunnel(){let r=Math.floor(Math.random()*rows);for(let c=0;c<cols;c++){terrain[r][c]=0; if(Math.random()<0.3){r=(r>0&&Math.random()<0.5?r-1:(r<rows-1?r+1:r));terrain[r][c]=0;}} tunnelRow=r;}
function spawnCoins(){let n=5+currentLevel*2;while(n--){let x,y;do{x=Math.floor(Math.random()*cols);y=Math.floor(Math.random()*rows);}while(terrain[y][x]||coinMap[y][x]);coinMap[y][x]=1;}}
function spawnEnemies(){enemies=[];for(let i=0;i<currentLevel;i++){enemies.push(new Enemy((cols-1)*cellSize,(rows-1)*cellSize));}}
function spawnPowerUps(){powerUps=[];['speed','shield','multi'].forEach((t,i)=>setTimeout(()=>powerUps.push({x:Math.random()*(cols-2)*cellSize,y:Math.random()*(rows-2)*cellSize,type:t}),5000*(i+1)))}

// Flow
startBtn.onclick=()=>{currentLevel=1;score=0;lives=3;initGrid();generateTunnel();spawnCoins();spawnPlayer();spawnEnemies();spawnPowerUps();updateHUD();showScreen('play');lastTime=Date.now();requestAnimationFrame(loop);};
nextLevelBtn.onclick=()=>{if(currentLevel<3){currentLevel++;initGrid();generateTunnel();spawnCoins();spawnPlayer();spawnEnemies();spawnPowerUps();showScreen('play');lastTime=Date.now();requestAnimationFrame(loop);}else showScreen('gameOver');};
restartBtn.onclick=()=>{showScreen('play');currentLevel=1;score=0;lives=3;initGrid();generateTunnel();spawnCoins();spawnPlayer();spawnEnemies();spawnPowerUps();updateHUD();lastTime=Date.now();requestAnimationFrame(loop);};

// Main Loop
function loop(){if(gameState===STATE_MENU)return;const now=Date.now(),dt=(now-lastTime)/1000;lastTime=now;player.update(dt);enemies.forEach(e=>e.update(dt));bullets.forEach(b=>b.update(dt));bullets=bullets.filter(b=>!b.dead); if(coinMap.flat().every(c=>c===0)){showScreen('levelUp');return;} // draw
 ctx.clearRect(0,0,canvas.width,canvas.height);terrain.forEach((r,y)=>r.forEach((t,x)=>t?ctx.fillStyle='#8B4513':ctx.drawImage(dugSandImg,x*cellSize,y*cellSize,cellSize,cellSize),t&&ctx.fillRect(x*cellSize,y*cellSize,cellSize,cellSize))); // coins
 coinMap.forEach((r,y)=>r.forEach((c,x)=>c&& (ctx.fillStyle='gold',ctx.fillRect(x*cellSize+8,y*cellSize+8,cellSize-16,cellSize-16))));player.draw();enemies.forEach(e=>e.draw());bullets.forEach(b=>b.draw());powerUps.forEach(p=>ctx.fillStyle=p.type==='speed'?'blue':p.type==='shield'?'cyan':'magenta',ctx.fillRect(p.x,p.y,24,24));updateHUD();requestAnimationFrame(loop);}