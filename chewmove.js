// Moving chew system + persistent lightweight bite progress.
// Large foods never block movement. Chewing progresses slowly while moving,
// quickly while stopped, and pauses when the hamster leaves the food.

const MOVING_CHEW_RATE=0.35;
const STOPPED_CHEW_RATE=1.0;
const CHEW_NEAR_MARGIN=CELL*0.55;
const chewProgressById=new Map();
let chewLastTick=performance.now();

function foodArea(f){return f.type.areaCells??(f.type.w*f.type.h);}

function needsChewing(f){
  if(hamSize<=2)return f.type.name!=='ひまわりの種';
  return foodArea(f)>hamSize*hamSize;
}

function chewDurationFor(f){
  const hamArea=hamSize*hamSize;
  const area=foodArea(f);
  const ratio=Math.max(1,area/hamArea);
  let duration=Math.round(1000*(0.55+0.75*Math.pow(ratio,1.35)));
  if(f.type.name==='クッキー'&&hamSize<=2)duration=Math.max(duration,2300);
  if(f.type.name==='食パン'&&hamSize<=2)duration=Math.max(duration,2300);
  if(f.type.name==='スイカ'&&hamSize<=2)duration=Math.max(duration,3600);
  if(f.type.name==='ホールケーキ'&&hamSize<=2)duration=Math.max(duration,11500);
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

  for(const f of candidates){
    if(!foods.some(v=>v.id===f.id))continue;
    if(!needsChewing(f))reward(f,'パクッ！');
  }

  if(eating)return;

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

// Keep the familiar v13-style emoji presentation for ordinary foods.
function foodVisualBox(f,w,h){
  if(f.type.name==='クッキー')return {vw:w*.82,vh:h*.82};
  if(f.type.name==='食パン')return {vw:w*.82,vh:h*.76};
  if(f.type.name==='スイカ')return {vw:w*.86,vh:h*.78};
  if(f.type.name==='ホールケーキ')return {vw:w*.86,vh:h*.86};
  return {vw:w*.80,vh:h*.76};
}

// Persistent lightweight bite marks. The food's visible area shrinks to about
// 50% by the time chewing reaches 100%, while its gameplay footprint stays fixed.
function foodChewScale(p){
  return Math.sqrt(Math.max(.50,1-p*.50));
}

function drawChewBites(cx,cy,vw,vh,p){
  if(p<=0)return;
  const shrink=foodChewScale(p);
  const sw=vw*shrink,sh=vh*shrink;
  const count=Math.min(6,Math.max(1,Math.ceil(p*6)));
  const radius=Math.max(5,Math.min(sw,sh)*(.055+p*.024));
  ctx.save();
  ctx.fillStyle='#f0d7ac';
  for(let i=0;i<count;i++){
    const bx=cx+sw*(.25+(i%3)*.09);
    const by=cy+sh*(-.24+Math.floor(i/3)*.25);
    ctx.beginPath();ctx.arc(bx,by,radius,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}

// Lightweight round whole-cake drawing inspired by a classic strawberry celebration cake.
// It stays Canvas-only so adding the rare cake does not add image-loading or per-frame texture cost.
function drawWholeCake(cx,cy,size,shrink){
  ctx.save();
  ctx.translate(cx,cy);
  ctx.scale(shrink,shrink);
  const rx=size*.43,ry=size*.25,sideH=size*.28;

  ctx.fillStyle='#eeb64f';
  ctx.beginPath();ctx.ellipse(0,sideH*.20,rx,ry,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff4df';
  ctx.fillRect(-rx,0,rx*2,sideH*.62);
  ctx.fillStyle='#f8a5bd';
  ctx.fillRect(-rx,sideH*.50,rx*2,sideH*.14);

  ctx.fillStyle='#fff8ed';
  ctx.beginPath();ctx.ellipse(0,-sideH*.05,rx,ry,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#e5bca7';ctx.lineWidth=Math.max(2,size*.018);ctx.stroke();

  ctx.fillStyle='#f59ab7';
  for(let i=0;i<12;i++){
    const a=(Math.PI*2*i)/12;
    const px=Math.cos(a)*rx*.83,py=-sideH*.05+Math.sin(a)*ry*.80;
    ctx.beginPath();ctx.arc(px,py,size*.035,0,Math.PI*2);ctx.fill();
  }

  ctx.fillStyle='#fffdf7';
  for(let i=0;i<6;i++){
    const a=(Math.PI*2*i)/6+Math.PI/6;
    const px=Math.cos(a)*rx*.55,py=-sideH*.05+Math.sin(a)*ry*.48;
    ctx.beginPath();ctx.arc(px,py,size*.062,0,Math.PI*2);ctx.fill();
  }

  for(let i=0;i<4;i++){
    const a=(Math.PI*2*i)/4+Math.PI/4;
    const px=Math.cos(a)*rx*.62,py=-sideH*.05+Math.sin(a)*ry*.54;
    ctx.save();ctx.translate(px,py);ctx.rotate(a+Math.PI/2);
    ctx.fillStyle='#f24e59';
    ctx.beginPath();ctx.ellipse(0,0,size*.045,size*.060,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#65a846';
    ctx.beginPath();ctx.moveTo(0,-size*.060);ctx.lineTo(-size*.025,-size*.082);ctx.lineTo(0,-size*.073);ctx.lineTo(size*.025,-size*.082);ctx.closePath();ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle='#d93343';
  const cherries=[[-.045,.005],[.045,.010],[0,.065]];
  for(const [px,py] of cherries){ctx.beginPath();ctx.arc(size*px,size*py-sideH*.05,size*.042,0,Math.PI*2);ctx.fill();}
  ctx.strokeStyle='#5d8736';ctx.lineWidth=Math.max(2,size*.012);
  ctx.beginPath();ctx.moveTo(-size*.045,-sideH*.05);ctx.quadraticCurveTo(-size*.020,-size*.11,0,-size*.14);ctx.stroke();
  ctx.beginPath();ctx.moveTo(size*.045,-sideH*.045);ctx.quadraticCurveTo(size*.020,-size*.11,0,-size*.14);ctx.stroke();

  ctx.restore();
}

drawFood=function(f,now){
  const r=rect(f),x=r.x-cameraX,y=r.y-cameraY,w=r.w,h=r.h;
  const p=Math.max(0,Math.min(1,chewProgressById.get(f.id)||0));
  const shrink=foodChewScale(p);

  if(f.type.name==='ひまわりの種'){
    drawSunflowerSeed(x+w/2,y+h/2,Math.min(w,h)*.82,1);
    return;
  }

  const {vw,vh}=foodVisualBox(f,w,h);
  const cx=x+w/2,cy=y+h/2;

  if(f.type.name==='ホールケーキ'){
    drawWholeCake(cx,cy,Math.min(vw,vh),shrink);
  }else{
    const fontSize=Math.max(20,vh*.98);
    const stretchX=Math.max(.82,Math.min(2.15,vw/fontSize));
    ctx.save();
    ctx.translate(cx,cy);
    ctx.scale(shrink*stretchX,shrink);
    ctx.font=`${fontSize}px system-ui`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(f.type.emoji,0,-2);
    ctx.restore();
  }

  drawChewBites(cx,cy,vw,vh,p);

  if(foodArea(f)>1){
    ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#432e1fc7';ctx.fillText(`${foodArea(f)}マス`,x+w/2,y+h-10);
  }
};
