// Fixed top-down camera zoom prototype.
// The world is rendered at 0.5x so the hamster and all food keep their true relative sizes.
const CAMERA_ZOOM=0.5;
const MOVE_SPEED_MULTIPLIER=2;

updateMove=function(dt){
  moving=false;
  if(!playing||eating)return;
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

draw=function(now){
  const screenW=game.clientWidth;
  const screenH=game.clientHeight;
  const worldW=screenW/CAMERA_ZOOM;
  const worldH=screenH/CAMERA_ZOOM;

  // Keep the hamster around the center while showing twice as much world in each screen dimension.
  cameraX+=(centerX()-worldW/2-cameraX)*.16;
  cameraY+=(centerY()-worldH/2-cameraY)*.16;

  ctx.save();
  ctx.scale(CAMERA_ZOOM,CAMERA_ZOOM);

  drawGrid(worldW,worldH);

  const pad=CELL*3;
  for(const f of foods){
    const r=rect(f),x=r.x-cameraX,y=r.y-cameraY;
    if(x+r.w<-pad||y+r.h<-pad||x>worldW+pad||y>worldH+pad)continue;
    drawFood(f,now);
  }
  drawHam(now);

  ctx.restore();
};
