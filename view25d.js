// Fixed 2.5D presentation layer for Mogumogu Hamster.
// Camera never rotates or zooms; only the world is rendered with a fixed oblique projection.
const VIEW_Y=0.62, VIEW_SHEAR=0.20;

function projectPoint(wx,wy){
  const vw=game.clientWidth,vh=game.clientHeight;
  const worldCx=cameraX+vw/2;
  const worldCy=cameraY+vh/(2*VIEW_Y);
  const dx=wx-worldCx,dy=wy-worldCy;
  return {x:vw/2+dx+dy*VIEW_SHEAR,y:vh/2+dy*VIEW_Y};
}

function updateSize(){
  // v0.1 visual prototype: starts at 2x2. Existing level breakpoints are kept for now.
  hamSize=level>=10?5:level>=7?4:level>=4?3:2;
}

function reset(){
  score=eaten=0;level=1;xp=0;hamSize=2;maxFood='-';maxArea=0;
  hamX=hamY=-CELL;facing='down';moving=false;cameraX=cameraY=0;
  foods=[];chunks.clear();eatenIds.clear();eating=false;eatFood=null;
  lvEl.textContent='1';scoreEl.textContent='0';fill.style.width='0%';timerEl.textContent='2:00';
  hideStick();ensureChunks();
}

function drawGrid(w,h){
  ctx.fillStyle='#efd3a2';ctx.fillRect(0,0,w,h);

  const worldCx=cameraX+w/2;
  const worldCy=cameraY+h/(2*VIEW_Y);
  const halfX=w/2+Math.abs((h/(2*VIEW_Y))*VIEW_SHEAR)+CELL*3;
  const halfY=h/(2*VIEW_Y)+CELL*3;
  const minGX=Math.floor((worldCx-halfX)/CELL)-1;
  const maxGX=Math.ceil((worldCx+halfX)/CELL)+1;
  const minGY=Math.floor((worldCy-halfY)/CELL)-1;
  const maxGY=Math.ceil((worldCy+halfY)/CELL)+1;

  // Soft alternating ground tiles make the fixed angle easier to read.
  for(let gy=minGY;gy<=maxGY;gy++){
    for(let gx=minGX;gx<=maxGX;gx++){
      if(((gx+gy)&1)!==0)continue;
      const p1=projectPoint(gx*CELL,gy*CELL);
      const p2=projectPoint((gx+1)*CELL,gy*CELL);
      const p3=projectPoint((gx+1)*CELL,(gy+1)*CELL);
      const p4=projectPoint(gx*CELL,(gy+1)*CELL);
      ctx.fillStyle='rgba(255,248,226,.16)';
      ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.lineTo(p3.x,p3.y);ctx.lineTo(p4.x,p4.y);ctx.closePath();ctx.fill();
    }
  }

  ctx.strokeStyle='rgba(100,72,45,.20)';ctx.lineWidth=1;
  for(let gx=minGX;gx<=maxGX;gx++){
    const a=projectPoint(gx*CELL,minGY*CELL),b=projectPoint(gx*CELL,maxGY*CELL);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  for(let gy=minGY;gy<=maxGY;gy++){
    const a=projectPoint(minGX*CELL,gy*CELL),b=projectPoint(maxGX*CELL,gy*CELL);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
}

function drawFood(f,now){
  const r=rect(f),base=projectPoint(r.x+r.w/2,r.y+r.h/2);
  const being=eating&&eatFood&&eatFood.id===f.id;
  const p=being?eatProgress(now):0;
  const area=f.type.w*f.type.h;
  const drawW=r.w*.92,drawH=Math.max(CELL*.72,r.h*.72);
  const lift=Math.min(38,7+Math.sqrt(area)*7);
  const scale=1-p*.16;

  // Ground shadow = the main depth cue. No border around the food itself.
  ctx.save();
  ctx.globalAlpha=.18;
  ctx.fillStyle='#563b25';
  ctx.beginPath();
  ctx.ellipse(base.x+lift*.18,base.y+Math.min(18,drawH*.12),drawW*.34,Math.max(5,drawH*.075),0,0,Math.PI*2);
  ctx.fill();
  ctx.restore();

  const fw=Math.max(32,Math.ceil(drawW)),fh=Math.max(32,Math.ceil(drawH));
  biteCanvas.width=fw;biteCanvas.height=fh;biteCtx.clearRect(0,0,fw,fh);
  biteCtx.font=`${Math.min(drawW,drawH)*.70}px system-ui`;
  biteCtx.textAlign='center';biteCtx.textBaseline='middle';
  biteCtx.shadowColor='rgba(50,30,10,.22)';biteCtx.shadowBlur=5;biteCtx.shadowOffsetY=4;
  biteCtx.fillText(f.type.emoji,fw/2,fh/2);
  biteCtx.shadowColor='transparent';
  if(being){
    biteCtx.globalCompositeOperation='destination-out';
    const bites=Math.floor(p*9),rad=Math.max(7,Math.min(drawW,drawH)*.095);
    for(let i=0;i<bites;i++){
      const row=Math.floor(i/3),col=i%3;
      const bx=fw*(.66+col*.075),by=fh*(.23+row*.20);
      biteCtx.beginPath();biteCtx.arc(bx,by,rad*(.9+(i%2)*.22),0,Math.PI*2);biteCtx.fill();
    }
    biteCtx.globalCompositeOperation='source-over';
  }

  ctx.save();
  ctx.translate(base.x,base.y-lift);
  ctx.scale(scale,scale);
  ctx.drawImage(biteCanvas,-drawW/2,-drawH/2,drawW,drawH);
  ctx.restore();

  ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='rgba(67,46,31,.72)';
  ctx.fillText(`${f.type.w}×${f.type.h}`,base.x,base.y+16);
}

function drawHam(now){
  const s=hamPx(),base=projectPoint(centerX(),centerY());
  const m=eating?Math.sin((now-eatStart)/55):0;
  const bob=moving?Math.sin(now/70)*2.4:eating?m*1.8:0;
  const bodyY=base.y-s*.13+bob;

  ctx.save();
  ctx.globalAlpha=.20;ctx.fillStyle='#4c3424';
  ctx.beginPath();ctx.ellipse(base.x+s*.03,base.y+s*.19,s*.34,s*.085,0,0,Math.PI*2);ctx.fill();
  ctx.restore();

  ctx.save();ctx.translate(base.x,bodyY);
  if(eating)ctx.scale(1/(1+m*.035),1+m*.035);
  ctx.fillStyle='#c9935f';ctx.strokeStyle='#8e633f';ctx.lineWidth=Math.max(3,s*.018);
  if(facing==='left'||facing==='right'){
    ctx.scale(facing==='left'?-1:1,1);
    ctx.beginPath();ctx.ellipse(0,0,s*.42,s*.31,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(s*.14,-s*.25,s*.10,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#f3b3a5';ctx.beginPath();ctx.arc(s*.14,-s*.25,s*.055,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#24170f';ctx.beginPath();ctx.arc(s*.22,-s*.07,s*.04,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#df7a75';ctx.beginPath();ctx.arc(s*.42,s*.01,s*.045,0,Math.PI*2);ctx.fill();
    if(eating){ctx.fillStyle='#5a3327';ctx.beginPath();ctx.ellipse(s*.39,s*.10,s*.05,s*(.03+Math.abs(m)*.04),0,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#efd2aa';ctx.beginPath();ctx.arc(-s*.42,s*.04,s*.075,0,Math.PI*2);ctx.fill();
  }else{
    ctx.beginPath();ctx.ellipse(0,0,s*.37,s*.39,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(-s*.22,-s*.29,s*.11,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(s*.22,-s*.29,s*.11,0,Math.PI*2);ctx.fill();ctx.stroke();
    if(facing==='up'){
      ctx.fillStyle='#efd2aa';ctx.beginPath();ctx.arc(s*.18,s*.25,s*.08,0,Math.PI*2);ctx.fill();
    }else{
      ctx.fillStyle='#24170f';ctx.beginPath();ctx.arc(-s*.13,-s*.08,s*.04,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(s*.13,-s*.08,s*.04,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#df7a75';ctx.beginPath();ctx.arc(0,s*.02,s*.045,0,Math.PI*2);ctx.fill();
      if(eating){ctx.fillStyle='#5a3327';ctx.beginPath();ctx.ellipse(0,s*.105,s*.06,s*(.035+Math.abs(m)*.045),0,0,Math.PI*2);ctx.fill();}
    }
  }
  ctx.restore();

  if(eating&&eatFood){
    const p=eatProgress(now),bw=Math.max(78,Math.min(s,170)),bx=base.x-bw/2,by=bodyY-s*.48;
    ctx.fillStyle='rgba(76,52,36,.78)';ctx.fillRect(bx,by,bw,10);
    ctx.fillStyle='#fff0ca';ctx.fillRect(bx+2,by+2,(bw-4)*p,6);
    ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillStyle='#4c3424';ctx.fillText('もぐもぐ…',base.x,by-5);
  }
}

function draw(now){
  const w=game.clientWidth,h=game.clientHeight;
  // Fixed camera: follow only. No rotation and no zoom.
  cameraX+=(centerX()-w/2-cameraX)*.16;
  cameraY+=(centerY()-h/(2*VIEW_Y)-cameraY)*.16;
  drawGrid(w,h);

  // Painter's order by world Y lets big foreground food overlap the hamster naturally.
  const items=[];
  for(const f of foods){
    const r=rect(f),p=projectPoint(r.x+r.w/2,r.y+r.h/2);
    if(p.x<-CELL*5||p.y<-CELL*5||p.x>w+CELL*5||p.y>h+CELL*5)continue;
    items.push({y:r.y+r.h,kind:'food',f});
  }
  items.push({y:centerY()+hamPx()/2,kind:'ham'});
  items.sort((a,b)=>a.y-b.y);
  for(const it of items){if(it.kind==='food')drawFood(it.f,now);else drawHam(now);}
}

// Sync the already-rendered title-state with the 2x2 starting-size spec.
hamSize=2;hamX=hamY=-CELL;ensureChunks();
