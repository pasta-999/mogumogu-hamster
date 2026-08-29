// Universal eating rule: every remaining food is edible from the start.
// Strawberry is removed for this prototype.
const strawberryIndex=TYPES.findIndex(type=>type.name==='いちご');
if(strawberryIndex>=0)TYPES.splice(strawberryIndex,1);

// Food size progression (effective area in cells): seed 1, cookie 3, bread 4, cake 6, watermelon 8.
// Cookie stays square/round-looking by using sqrt(3) cells on each side instead of an awkward 3x1 footprint.
const FOOD_SIZE_BY_NAME={
  'ひまわりの種':{w:1,h:1,area:1},
  'クッキー':{w:Math.sqrt(3),h:Math.sqrt(3),area:3},
  '食パン':{w:2,h:2,area:4},
  'ケーキ':{w:3,h:2,area:6},
  'スイカ':{w:4,h:2,area:8}
};
for(const type of TYPES){
  const size=FOOD_SIZE_BY_NAME[type.name];
  if(size){type.w=size.w;type.h=size.h;type.areaCells=size.area;}
  type.need=1;
}

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
  const foodArea=f.type.areaCells??(f.type.w*f.type.h);
  const ratio=Math.max(1,foodArea/hamArea);
  eatDuration=Math.round(1000*(0.55+0.75*Math.pow(ratio,1.35)));

  // Cookie should still feel like a real mouthful for the starting 2x2 hamster.
  if(f.type.name==='クッキー'&&hamSize<=2){
    eatDuration=Math.max(eatDuration,2300);
  }
  if(foodArea===4&&hamSize<=2){
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

    const foodArea=f.type.areaCells??(f.type.w*f.type.h);
    const needsChewing=hamSize<=2 ? f.type.name!=='ひまわりの種' : foodArea>hamSize*hamSize;
    if(!needsChewing){
      reward(f,'パクッ！');
      continue;
    }
    startEat(f);
    return;
  }
};

// Purge preview food generated before this override so removed/old-size foods cannot remain onscreen.
hamSize=2;
hamX=hamY=-CELL;
foods=[];
chunks.clear();
ensureChunks();
