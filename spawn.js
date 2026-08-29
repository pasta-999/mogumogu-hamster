// Spawn-density tuning prototype.
// Keep sunflower seeds roughly as common as before while reducing larger-food clutter.
// 4-6 foods per chunk, weighted toward seeds.

const SPAWN_MIN=4;
const SPAWN_VARIATION=3; // 4, 5, or 6

function spawnTypeByRoll(roll){
  const byName=name=>TYPES.find(t=>t.name===name);
  if(roll<0.60)return byName('ひまわりの種')||TYPES[0];
  if(roll<0.78)return byName('クッキー')||TYPES[0];
  if(roll<0.89)return byName('食パン')||TYPES[0];
  if(roll<0.96)return byName('ケーキ')||TYPES[0];
  return byName('スイカ')||TYPES[0];
}

generateChunk=function(cx,cy){
  const k=key(cx,cy);
  if(chunks.has(k))return;
  chunks.add(k);

  const placed=[];
  const count=SPAWN_MIN+Math.floor(hash(cx,cy,1)*SPAWN_VARIATION);

  for(let i=0;i<count;i++){
    const type=spawnTypeByRoll(hash(cx,cy,100+i));
    if(!type)continue;

    let chosen=null;
    for(let a=0;a<10;a++){
      const gx=cx*CHUNK+Math.floor(hash(cx,cy,400+i*11+a)*Math.max(1,CHUNK-type.w));
      const gy=cy*CHUNK+Math.floor(hash(cx,cy,500+i*13+a)*Math.max(1,CHUNK-type.h));
      if(!placed.some(p=>overlaps(gx,gy,type.w,type.h,p.gx,p.gy,p.w,p.h))){
        chosen={gx,gy};
        break;
      }
    }
    if(!chosen)continue;

    placed.push({gx:chosen.gx,gy:chosen.gy,w:type.w,h:type.h});
    const id=`${cx}:${cy}:${i}`;
    if(!eatenIds.has(id))foods.push({id,gx:chosen.gx,gy:chosen.gy,type});
  }
};

// Rebuild the title-screen preview using the new density immediately.
foods=[];
chunks.clear();
ensureChunks();
