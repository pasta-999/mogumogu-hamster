// Universal eating rule: every remaining food is edible from the start.
// Strawberry is removed for this prototype.
const strawberryIndex=TYPES.findIndex(type=>type.name==='いちご');
if(strawberryIndex>=0)TYPES.splice(strawberryIndex,1);

// Neutralize the legacy size gate kept in game.js.
for(const type of TYPES){type.need=1;}

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

  // A 2x2 cookie should feel like a real mouthful for the starting 2x2 hamster.
  if(f.type.name==='クッキー'&&hamSize<=2){
    eatDuration=Math.max(eatDuration,2300);
  }
  flash(`${f.type.emoji||'🥜'} ${f.type.name} をモグモグ…`);
};

checkFood=function(){
  if(eating)return;
  const hs=hamPx();
  for(let i=foods.length-1;i>=0;i--){
    const f=foods[i],r=rect(f);
    if(!overlaps(hamX,hamY,hs,hs,r.x,r.y,r.w,r.h))continue;

    const cookieNeedsChewing=f.type.name==='クッキー'&&hamSize<=2;
    if(smallEnough(f)&&!cookieNeedsChewing){
      reward(f,'パクッ！');
      continue;
    }
    startEat(f);
    return;
  }
};

// Purge preview food generated before this override so removed foods cannot remain onscreen.
hamSize=2;
hamX=hamY=-CELL;
foods=[];
chunks.clear();
ensureChunks();
