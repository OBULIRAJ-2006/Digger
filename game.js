// --- Canvas & Resize ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

// --- Screens & Buttons ---
const startScreen = document.getElementById('startScreen');
const gameContainer = document.getElementById('gameContainer');
const winScreen = document.getElementById('winScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const scoreDisplay = document.getElementById('scoreDisplay');
const livesDisplay = document.getElementById('livesDisplay');
const powerupDisplay = document.getElementById('powerupDisplay');
const winScore = document.getElementById('winScore');
startButton.onclick = startGame;
restartButton.onclick = startGame;

// --- Assets ---
const images = { player:new Image(), enemy:new Image() };
images.player.src = 'digger.png'; images.enemy.src = 'enemy.png';
const audioCtx = new (window.AudioContext||window.webkitAudioContext)();
const sounds = {};
function loadSound(name,url){fetch(url).then(r=>r.arrayBuffer()).then(d=>audioCtx.decodeAudioData(d,b=>sounds[name]=b));}
function play(name){ if(!sounds[name])return; let s=audioCtx.createBufferSource();s.buffer=sounds[name];s.connect(audioCtx.destination);s.start(); }
['fire','boom','coin','powerup'].forEach(n=>loadSound(n,`${n}.mp3`));

// --- Input ---
let keys={}, touchDir=null, touchFire=false;
['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].forEach(k=>{window.addEventListener('keydown',e=>keys[e.key]=true);window.addEventListener('keyup',e=>keys[e.key]=false);});
['up','down','left','right'].forEach(dir=>{let btn=document.getElementById(dir+'Btn');btn.addEventListener('touchstart',()=>touchDir=dir);btn.addEventListener('touchend',()=>touchDir=null);});
document.getElementById('fireBtn').addEventListener('touchstart',()=>touchFire=true);document.getElementById('fireBtn').addEventListener('touchend',()=>touchFire=false);

// --- Game State ---
const STATE_MENU=0,STATE_PLAY=1,STATE_LEVELUP=2,STATE_GAMEOVER=3;
let gameState=STATE_MENU, currentLevel,score,lives,lastTime;
let map,coinMap,player, enemies, bullets, powerUps;

// --- Classes ---
class Player{constructor(x,y){Object.assign(this,{x,y,size:32,speed:100,direction:'right',fireCD:0,shield:false,multi:false,boost:false});}
 update(dt){let mx=0,my=0; if(keys['ArrowUp']||touchDir==='up')my=-1,this.direction='up'; if(keys['ArrowDown']||touchDir==='down')my=1,this.direction='down'; if(keys['ArrowLeft']||touchDir==='left')mx=-1,this.direction='left'; if(keys['ArrowRight']||touchDir==='right')mx=1,this.direction='right'; if(mx&&my){mx*=0.7071;my*=0.7071;} let v=this.speed*(this.boost?2:1); this.x+=mx*v*dt;this.y+=my*v*dt; this.x=clamp(this.x,0,canvas.width-this.size);this.y=clamp(this.y,0,canvas.height-this.size);
  // dig & coins
  let tx=floor((this.x+this.size/2)/32), ty=floor((this.y+this.size/2)/32);
  if(map[ty]?.[tx]===1){map[ty][tx]=0; if(coinMap[ty][tx]){score+=100;play('coin');coinMap[ty][tx]=0;}}
  // shoot
  if((keys[' ']||touchFire)&&this.fireCD<=0){this.shoot();this.fireCD=0.5;} if(this.fireCD>0)this.fireCD-=dt;
 }
 draw(){if(images.player.complete)ctx.drawImage(images.player,this.x,this.y,this.size,this.size);else{ctx.fillStyle='yellow';ctx.fillRect(this.x,this.y,this.size,this.size);} if(this.shield){ctx.strokeStyle='cyan';ctx.lineWidth=3;ctx.strokeRect(this.x-2,this.y-2,this.size+4,this.size+4);} }
 shoot(){let bx=this.x+this.size/2,by=this.y+this.size/2,spd=300,dx=0,dy=0; if(this.direction==='up')dy=-1; if(this.direction==='down')dy=1; if(this.direction==='left')dx=-1; if(this.direction==='right')dx=1; if(dx||dy){bullets.push(new Bullet(bx,by,dx*spd,dy*spd)); if(this.multi){bullets.push(new Bullet(bx,by,dx*spd-dy*spd,dy*spd+dx*spd));bullets.push(new Bullet(bx,by,dx*spd+dy*spd,dy*spd-dx*spd));} play('fire'); }} }
class Enemy{constructor(x,y){this.x=x;this.y=y;this.size=32;this.speed=50+currentLevel*10;this.dx=0;this.dy=0;}
 update(dt){// smart A*
  let ang=Math.atan2(player.y-this.y,player.x-this.x);this.dx=Math.cos(ang);this.dy=Math.sin(ang);
  this.x+=this.dx*this.speed*dt;this.y+=this.dy*this.speed*dt;
  this.x=clamp(this.x,0,canvas.width-this.size);this.y=clamp(this.y,0,canvas.height-this.size);
  // dig
  let tx=floor((this.x+this.size/2)/32), ty=floor((this.y+this.size/2)/32);
  if(map[ty]?.[tx]===1){map[ty][tx]=0;coinMap[ty][tx]=0;}
  // collide
  if(!player.shield && overlap(this,player)){lives--;play('boom'); lives<=0?showGameOver():spawnPlayer();}
 }
 draw(){if(images.enemy.complete)ctx.drawImage(images.enemy,this.x,this.y,this.size,this.size);else{ctx.fillStyle='red';ctx.fillRect(this.x,this.y,this.size,this.size);} }
}
class Bullet{constructor(x,y,vx,vy){Object.assign(this,{x,y,vx,vy,size:8,dead:false});}
 update(dt){this.x+=this.vx*dt;this.y+=this.vy*dt; if(this.x<0||this.y<0||this.x>canvas.width||this.y>canvas.height){this.dead=true;return;}for(let i=enemies.length-1;i>=0;i--){let e=enemies[i];if(Math.abs(this.x-e.x)<e.size&&Math.abs(this.y-e.y)<e.size){enemies.splice(i,1);this.dead=true;play('boom');score+=500;break;}}}
 draw(){ctx.fillStyle='orange';ctx.beginPath();ctx.arc(this.x,this.y,this.size,0,2*Math.PI);ctx.fill();}
}
class PowerUp{constructor(x,y,type){Object.assign(this,{x,y,type,size:24,col:false});}
 update(dt){if(overlap(this,player)){this.apply();this.col=true;}}
 apply(){play('powerup');if(this.type==='speed'){player.boost=true;setTimeout(()=>player.boost=false,5000);}else if(this.type==='shield'){player.shield=true;setTimeout(()=>player.shield=false,5000);}else if(this.type==='fire'){player.multi=true;setTimeout(()=>player.multi=false,5000);}}
 draw(){ctx.fillStyle=this.type==='speed'?'blue':this.type==='shield'?'cyan':'magenta';ctx.fillRect(this.x,this.y,this.size,this.size);} }

// --- Helpers ---
function clamp(v,min,max){return v<min?min:v>max?max:v;}function floor(v){return Math.floor(v);}function overlap(a,b){return a.x<b.x+b.size&&a.x+a.size>b.x&&a.y<b.y+b.size&&a.y+a.size>b.y;}

// --- Level & Spawn ---
function spawnPlayer(){player=new Player(32,32);}function spawnPower(type){let r=map.length,c=map[0].length,x,y;do{x=floor(Math.random()*(c-2)+1);y=floor(Math.random()*(r-2)+1);}while(map[y][x]||coinMap[y][x]);powerUps.push(new PowerUp(x*32,y*32,type));}

function initLevel(){// grid dims
 let cols=15+(currentLevel-1)*5,rows=12+(currentLevel-1)*4;map=[];coinMap=[];enemies=[];bullets=[];powerUps=[];
 for(let y=0;y<rows;y++){map[y]=[];coinMap[y]=[];for(let x=0;x<cols;x++){map[y][x]=(x==0||y==0||x==cols-1||y==rows-1)?0:1;coinMap[y][x]=0;}}
 // carve
 [[1,1],[1,2],[2,1],[2,2]].forEach(([y,x])=>map[y][x]=0);
 [[rows-2,cols-2],[rows-3,cols-2],[rows-2,cols-3]].forEach(([y,x])=>map[y][x]=0);
 // coins
 let cnt=5+currentLevel*2;while(cnt--){let x,y;do{x=floor(Math.random()*(cols-2)+1);y=floor(Math.random()*(rows-2)+1);}while(map[y][x]===0||coinMap[y][x]);coinMap[y][x]=1;}
 spawnPlayer();for(let i=0;i< currentLevel;i++){enemies.push(new Enemy((cols-2)*32,(rows-2)*32));}
 setTimeout(()=>spawnPower('speed'),10000);setTimeout(()=>spawnPower('shield'),20000);setTimeout(()=>spawnPower('fire'),30000);
 updateHUD();}

// --- HUD ---
function updateHUD(){scoreDisplay.textContent=`Score: ${score}`;livesDisplay.textContent=`Lives: ${lives}`;}

// --- Game Flow ---
function startGame(){startScreen.classList.add('hidden');winScreen.classList.add('hidden');gameContainer.classList.remove('hidden');currentLevel=1;score=0;lives=3;initLevel();gameState=STATE_PLAY;lastTime=Date.now();requestAnimationFrame(loop);}
function showWin(){gameContainer.classList.add('hidden');winScore.textContent=`Final Score: ${score}`;winScreen.classList.remove('hidden');}
function showGameOver(){gameState=STATE_GAMEOVER;gameContainer.classList.add('hidden');winScore.textContent=`Game Over! Score: ${score}`;winScreen.classList.remove('hidden');}

// --- Main Loop ---
function loop(){if(gameState!==STATE_PLAY) return;let now=Date.now(),dt=(now-lastTime)/1000;lastTime=now;
 player.update(dt);enemies.forEach(e=>e.update(dt));bullets.forEach(b=>b.update(dt));bullets=bullets.filter(b=>!b.dead);powerUps.forEach(p=>p.update(dt));powerUps=powerUps.filter(p=>!p.col);
 // win?
 if(coinMap.flat().every(c=>c===0)){gameState=STATE_LEVELUP;showWin();return;}
 // draw
 ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
 map.forEach((row,y)=>row.forEach((t,x)=>{if(t){ctx.fillStyle='saddlebrown';ctx.fillRect(x*32,y*32,32,32);}if(coinMap[y][x]){ctx.fillStyle='gold';ctx.fillRect(x*32+10,y*32+10,12,12);}}));
 powerUps.forEach(p=>p.draw());player.draw();enemies.forEach(e=>e.draw());bullets.forEach(b=>b.draw());updateHUD();
 requestAnimationFrame(loop);
}