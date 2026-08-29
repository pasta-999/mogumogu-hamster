// Lightweight rendering + small visual polish.
// Only the food currently being chewed uses the offscreen bite canvas.

let cheekPuffUntil=0;
let cheekPuffArea=1;

const rewardBase=reward;
reward=function(f,msg){
  rewardBase(f,msg);
  cheekPuffUntil=performance.now()+2600;
  cheekPuffArea=f.type.w*f.type.h;
};

const resetBase=reset;
reset=function(){
  cheekPuffUntil=0;
  cheekPuffArea=1;
  resetBase();
};

function drawSunflowerSeed(cx,cy,size,scale=1){
  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(-0.42);
  ctx.scale(scale,scale);
  const rx=size*.17,ry=size*.36;
  ctx.fillStyle='#d6b071';
  ctx.strokeStyle='#6b5136';
  ctx.lineWidth=Math.max(1.5,size*.035);
  ctx.beginPath();
  ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle='rgba(83,59,38,.78)';
  ctx.lineWidth=Math.max(1,size*.024);
  ctx.beginPath();
  ctx.moveTo(-rx*.45,-ry*.72);ctx.lineTo(-rx*.18,ry*.72);
  ctx.moveTo(rx*.25,-ry*.76);ctx.lineTo(rx*.48,ry*.60);
  ctx.stroke();
  ctx.restore();
}

drawFood=function(f,now){
  const r=rect(f),x=r.x-cameraX,y=r.y-cameraY,w=r.w,h=r.h;
  const being=eating&&eatFood&&eatFood.id===f.id;
  const p=being?eatProgress(now):0;
  const shrink=1-p*.16;

  if(f.type.name==='ひまわりの種'){
    drawSunflowerSeed(x+w/2,y+h/2,Math.min(w,h)*.82,shrink);
    return;
  }

  if(!being){
    ctx.save();
    ctx.font=`${Math.min(w,h)*.58}px system-ui`;
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText(f.type.emoji,x+w/2,y+h/2-2);
    ctx.restore();
  }else{
    // Expensive offscreen work is limited to the single food currently being eaten.
    const fw=Math.max(24,Math.ceil(w)),fh=Math.max(24,Math.ceil(h));
    if(biteCanvas.width!==fw)biteCanvas.width=fw;
    if(biteCanvas.height!==fh)biteCanvas.height=fh;
    biteCtx.clearRect(0,0,fw,fh);
    biteCtx.font=`${Math.min(w,h)*.58}px system-ui`;
    biteCtx.textAlign='center';
    biteCtx.textBaseline='middle';
    biteCtx.fillText(f.type.emoji,w/2,h/2-2);
    biteCtx.globalCompositeOperation='destination-out';
    const bites=Math.floor(p*8),base=Math.max(7,Math.min(w,h)*.10);
    for(let i=0;i<bites;i++){
      const row=Math.floor(i/3),col=i%3;
      const bx=w*(.70+col*.07),by=h*(.26+row*.18),br=base*(.9+(i%2)*.25);
      biteCtx.beginPath();biteCtx.arc(bx,by,br,0,Math.PI*2);biteCtx.fill();
    }
    biteCtx.globalCompositeOperation='source-over';
    ctx.save();
    ctx.translate(x+w/2,y+h/2);
    ctx.scale(shrink,shrink);
    ctx.translate(-w/2,-h/2);
    ctx.drawImage(biteCanvas,0,0,w,h);
    ctx.restore();
  }

  // Tiny 1x1 labels add little value at the pulled-back camera, so only label larger foods.
  if(f.type.w*f.type.h>1){
    ctx.font='bold 11px system-ui';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillStyle='#432e1fc7';
    ctx.fillText(`${f.type.w}×${f.type.h}`,x+w/2,y+h-10);
  }
};

const drawHamBase=drawHam;
drawHam=function(now){
  drawHamBase(now);
  if(now>=cheekPuffUntil)return;

  const remaining=cheekPuffUntil-now;
  const fade=Math.min(1,remaining/450);
  const s=hamPx(),x=hamX-cameraX,y=hamY-cameraY;
  const bob=moving?Math.sin(now/70)*2.2:0;
  const cx=x+s/2,cy=y+s/2+bob;
  const foodBoost=Math.min(.035,Math.max(0,cheekPuffArea-1)*.0035);
  const r=s*(.095+foodBoost);

  ctx.save();
  ctx.globalAlpha=.92*fade;
  ctx.fillStyle='#dda173';
  ctx.strokeStyle='#9b6a48';
  ctx.lineWidth=Math.max(1.5,s*.012);

  if(facing==='down'){
    for(const side of [-1,1]){
      ctx.beginPath();ctx.arc(cx+side*s*.22,cy+s*.10,r,0,Math.PI*2);ctx.fill();ctx.stroke();
    }
  }else if(facing==='up'){
    for(const side of [-1,1]){
      ctx.beginPath();ctx.arc(cx+side*s*.34,cy+s*.02,r*.78,0,Math.PI*2);ctx.fill();ctx.stroke();
    }
  }else{
    const side=facing==='right'?1:-1;
    ctx.beginPath();ctx.arc(cx+side*s*.29,cy+s*.09,r,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(cx-side*s*.18,cy+s*.08,r*.66,0,Math.PI*2);ctx.fill();ctx.stroke();
  }
  ctx.restore();
};

// Lower the backing-store resolution a little on high-DPI phones.
// CSS size stays identical, reducing pixel work without changing game coordinates.
function applyLightCanvasResolution(){
  const cap=1.5;
  dpr=Math.max(1,Math.min(cap,devicePixelRatio||1));
  const r=game.getBoundingClientRect();
  canvas.width=Math.floor(r.width*dpr);
  canvas.height=Math.floor(r.height*dpr);
  canvas.style.width=r.width+'px';
  canvas.style.height=r.height+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
applyLightCanvasResolution();
addEventListener('resize',()=>requestAnimationFrame(applyLightCanvasResolution));
