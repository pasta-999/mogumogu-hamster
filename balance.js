// All foods are edible. Foods larger than the hamster take increasingly longer to finish.
function startEat(f){
  if(eating)return;
  eating=true;
  eatFood=f;
  eatStart=performance.now();
  const hamArea=hamSize*hamSize;
  const foodArea=f.type.w*f.type.h;
  const ratio=Math.max(1,foodArea/hamArea);
  // Larger targets become dramatically slower: 1x1 hamster vs 4x4 watermelon is ~32s.
  eatDuration=Math.round(1000*(0.55+0.75*Math.pow(ratio,1.35)));
  flash(`${f.type.emoji} ${f.type.name} をモグモグ…`);
}

function checkFood(){
  if(eating)return;
  const hs=hamPx();
  for(let i=foods.length-1;i>=0;i--){
    const f=foods[i],r=rect(f);
    if(!overlaps(hamX,hamY,hs,hs,r.x,r.y,r.w,r.h))continue;
    // No size/level restriction: every food can be eaten.
    if(smallEnough(f)){
      reward(f,'パクッ！');
      continue;
    }
    startEat(f);
    return;
  }
}
