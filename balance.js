// Universal eating rule: every food is edible from the start.
// Also neutralize the legacy `need` gate in game.js so this remains true even if the old check runs.
for(const type of TYPES){ type.need=1; }

window.startEat=function(f){
  if(eating)return;
  eating=true;
  eatFood=f;
  eatStart=performance.now();
  const hamArea=hamSize*hamSize;
  const foodArea=f.type.w*f.type.h;
  const ratio=Math.max(1,foodArea/hamArea);
  // Bigger than the hamster = dramatically slower. 1x1 vs 4x4 is roughly 32 seconds.
  eatDuration=Math.round(1000*(0.55+0.75*Math.pow(ratio,1.35)));
  flash(`${f.type.emoji} ${f.type.name} をモグモグ…`);
};

window.checkFood=function(){
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
