// Universal eating rule: every food is edible from the start.
// Neutralize the legacy size gate kept in game.js.
for(const type of TYPES){ type.need=1; }

// Size baseline: sunflower seed is 1x1, hamster starts at 2x2 (4 cells).
updateSize=function(){
  hamSize=level>=10?5:level>=7?4:level>=4?3:2;
};

reset=function(){
  score=eaten=0;
  level=1;
  xp=0;
  hamSize=2;
  maxFood='-';
  maxArea=0;
  hamX=hamY=-CELL;
  facing='down';
  moving=false;
  cameraX=cameraY=0;
  foods=[];
  chunks.clear();
  eatenIds.clear();
  eating=false;
  eatFood=null;
  lvEl.textContent='1';
  scoreEl.textContent='0';
  fill.style.width='0%';
  timerEl.textContent='2:00';
  hideStick();
  ensureChunks();
};

startEat=function(f){
  if(eating)return;
  eating=true;
  eatFood=f;
  eatStart=performance.now();
  const hamArea=hamSize*hamSize;
  const foodArea=f.type.w*f.type.h;
  const ratio=Math.max(1,foodArea/hamArea);
  eatDuration=Math.round(1000*(0.55+0.75*Math.pow(ratio,1.35)));
  flash(`${f.type.emoji} ${f.type.name} をモグモグ…`);
};

checkFood=function(){
  if(eating)return;
  const hs=hamPx();
  for(let i=foods.length-1;i>=0;i--){
    const f=foods[i],r=rect(f);
    if(!overlaps(hamX,hamY,hs,hs,r.x,r.y,r.w,r.h))continue;
    if(smallEnough(f)){
      reward(f,'パクッ！');
      continue;
    }
    startEat(f);
    return;
  }
};

// Keep the title-state preview consistent before the first run starts.
hamSize=2;
hamX=hamY=-CELL;
ensureChunks();
