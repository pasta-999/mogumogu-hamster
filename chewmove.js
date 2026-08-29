// Moving chew system + persistent lightweight bite progress.
// Large foods never block movement. Chewing progresses slowly while moving,
// quickly while stopped, and pauses when the hamster leaves the food.

const MOVING_CHEW_RATE=0.35;
const STOPPED_CHEW_RATE=1.0;
const CHEW_NEAR_MARGIN=CELL*0.55;
const chewProgressById=new Map();
let chewLastTick=performance.now();

function chewDurationFor(f){
  const hamArea=hamSize*hamSize;
  const foodArea=f.type.w*f.type.h;
  const ratio=Math.max(1,foodArea/hamArea);
  let duration=Math.round(1000*(0.55+0.75*Math.pow(ratio,1.35)));
  if(f.type.name==='クッキー'&&hamSize<=2)duration=Math.max(duration,2300);
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
  if(!eating)checkFood();
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
  const hs=hamPx();
  for(let i=foods.length-1;i>=0;i--){
    const f=foods[i],r=rect(f);
    if(!overlaps(hamX,hamY,hs,hs,r.x,r.y,r.w,r.h))continue;

    const cookieNeedsChewing=f.type.name==='クッキー'&&hamSize<=2;
    if(smallEnough(f)&&!cookieNeedsChewing){
      reward(f,'パクッ！');
      continue;
    }
    beginChew(f);
    return;
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

  if(f.type.w*f.type.h>1){
    ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#432e1fc7';ctx.fillText(`${f.type.w}×${f.type.h}`,x+w/2,y+h-10);
  }
};
