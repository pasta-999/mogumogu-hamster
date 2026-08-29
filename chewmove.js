// Moving chew system + persistent lightweight bite progress.
// Large foods never block movement. Chewing progresses slowly while moving,
// quickly while stopped, and pauses when the hamster leaves the food.

const MOVING_CHEW_RATE=0.35;
const STOPPED_CHEW_RATE=1.0;
const CHEW_NEAR_MARGIN=CELL*0.55;
const chewProgressById=new Map();
let chewLastTick=performance.now();

function foodArea(f){return f.type.w*f.type.h;}

function needsChewing(f){
  // At the starting 2x2 size, only the 1-cell sunflower seed is an instant pickup.
  // Once the hamster grows, foods no larger than the hamster become instant pickups.
  if(hamSize<=2)return f.type.name!=='ひまわりの種';
  return foodArea(f)>hamSize*hamSize;
}

function chewDurationFor(f){
  const hamArea=hamSize*hamSize;
  const area=foodArea(f);
  const ratio=Math.max(1,area/hamArea);
  let duration=Math.round(1000*(0.55+0.75*Math.pow(ratio,1.35)));
  if(area===4&&hamSize<=2)duration=Math.max(duration,2300);
  return duration;
}

function isFoodNear(f){
  const hs=hamPx(),r=rect(f),m=CHEW_NEAR_MARGIN;
  return overlaps(hamX,hamY,hs,hs,r.x-m,r.y-m,r.w+m*2,r.h+m*2);
}

function beginChew(f){
  eating=true;
  eatFood=f;
  eatDuration=chewDurationFor(f);
  eatStart=performance.now();
  chewLastTick=eatStart;
  if(!chewProgressById.has(f.id))chewProgressById.set(f.id,0);
  flash(`${f.type.emoji||'🌰'} ${f.type.name} をモグモグ…`);
}

startEat=function(f){
  if(eating&&eatFood&&eatFood.id===f.id)return;
  beginChew(f);
};

eatProgress=function(){
  if(!eatFood)return 0;
  return Math.max(0,Math.min(1,chewProgressById.get(eatFood.id)||0));
};

function overlappingFoodsSmallestFirst(){
  const hs=hamPx(),hcX=centerX(),hcY=centerY();
  const candidates=[];
  for(const f of foods){
    const r=rect(f);
    if(!overlaps(hamX,hamY,hs,hs,r.x,r.y,r.w,r.h))continue;
    const fcX=r.x+r.w/2,fcY=r.y+r.h/2;
    candidates.push({f,area:foodArea(f),dist:(fcX-hcX)*(fcX-hcX)+(fcY-hcY)*(fcY-hcY)});
  }
  candidates.sort((a,b)=>a.area-b.area||a.dist-b.dist);
  return candidates.map(v=>v.f);
}

updateMove=function(dt){
  moving=false;
  if(!playing)return;
  const q=input();
  if(!q.p)return;
  moving=true;
  facing=Math.abs(q.nx)>Math.abs(q.ny)?(q.nx<0?'left':'right'):(q.ny<0?'up':'down');
  const speed=(SPEED_MIN+(SPEED_MAX-SPEED_MIN)*q.p)*MOVE_SPEED_MULTIPLIER;
  hamX+=q.nx*speed*dt/1000;
  hamY+=q.ny*speed*dt/1000;
  ensureChunks();

  // Always check pickups while moving, even if a larger food is already being chewed.
  // This lets a seed beside/under bread get picked up instead of being hidden by it.
  checkFood();
};

updateEating=function(now){
  if(!eating||!eatFood){chewLastTick=now;return;}
  const f=eatFood;
  if(!foods.some(v=>v.id===f.id)){
    eating=false;eatFood=null;chewLastTick=now;return;
  }
  if(!isFoodNear(f)){
    eating=false;eatFood=null;chewLastTick=now;return;
  }

  const dt=Math.min(50,Math.max(0,now-chewLastTick));
  chewLastTick=now;
  const q=input();
  const rate=q.p>0.04?MOVING_CHEW_RATE:STOPPED_CHEW_RATE;
  const current=chewProgressById.get(f.id)||0;
  const next=Math.min(1,current+(dt/eatDuration)*rate);
  chewProgressById.set(f.id,next);

  if(next>=1){
    chewProgressById.delete(f.id);
    const done=f;
    eating=false;eatFood=null;
    reward(done,'ごちそうさま！');
  }
};

checkFood=function(){
  const candidates=overlappingFoodsSmallestFirst();
  if(!candidates.length)return;

  // First collect every instant small pickup in size order.
  // This works even while a larger food is already being chewed.
  for(const f of candidates){
    if(!foods.some(v=>v.id===f.id))continue;
    if(!needsChewing(f))reward(f,'パクッ！');
  }

  // Do not switch the active large food merely because another large food overlaps.
  if(eating)return;

  // Then start chewing the smallest remaining chewable food.
  for(const f of candidates){
    if(!foods.some(v=>v.id===f.id))continue;
    if(needsChewing(f)){
      beginChew(f);
      return;
    }
  }
};

const chewResetBase=reset;
reset=function(){
  chewProgressById.clear();
  chewLastTick=performance.now();
  chewResetBase();
};

// Lightweight persistent bite marks. No per-food offscreen canvas is created.
function drawChewBites(x,y,w,h,p){
  if(p<=0)return;
  const count=Math.min(4,Math.max(1,Math.ceil(p*4)));
  const radius=Math.max(5,Math.min(w,h)*(.055+p*.018));
  ctx.save();
  ctx.fillStyle='#f0d7ac';
  for(let i=0;i<count;i++){
    const bx=x+w*(.69+(i%2)*.11);
    const by=y+h*(.25+Math.floor(i/2)*.20);
    ctx.beginPath();ctx.arc(bx,by,radius,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}

drawFood=function(f,now){
  const r=rect(f),x=r.x-cameraX,y=r.y-cameraY,w=r.w,h=r.h;
  const p=Math.max(0,Math.min(1,chewProgressById.get(f.id)||0));
  const shrink=1-p*.10;

  if(f.type.name==='ひまわりの種'){
    drawSunflowerSeed(x+w/2,y+h/2,Math.min(w,h)*.82,1);
    return;
  }

  ctx.save();
  ctx.translate(x+w/2,y+h/2);
  ctx.scale(shrink,shrink);
  ctx.font=`${Math.min(w,h)*.58}px system-ui`;
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(f.type.emoji,0,-2);
  ctx.restore();

  drawChewBites(x,y,w,h,p);

  if(foodArea(f)>1){
    ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#432e1fc7';ctx.fillText(`${foodArea(f)}マス`,x+w/2,y+h-10);
  }
};
