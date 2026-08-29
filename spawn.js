// Spawn-density tuning.
// Keep larger foods sparse while making sunflower seeds clearly more common.
const SPAWN_MIN=4;
const SPAWN_VARIATION=3; // 4, 5, or 6 rolled foods
const EXTRA_SEEDS_PER_CHUNK=1; // guaranteed extra seed without increasing large-food clutter

function spawnTypeByRoll(roll){
  const byName=name=>TYPES.find(t=>t.name===name);
  if(roll<0.68)return byName('ひまわりの種')||TYPES[0];
  if(roll<0.86)return byName('クッキー')||TYPES[0];
  if(roll<0.96)return byName('食パン')||TYPES[0];
  if(roll<0.993)return byName('スイカ')||TYPES[0];
  return byName('ホールケーキ')||TYPES[0]; // 0.7%
}

generateChunk=function(cx,cy){
  const k=key(cx,cy);
  if(chunks.has(k))return;
  chunks.add(k);

  const placed=[];
  const count=SPAWN_MIN+Math.floor(hash(cx,cy,1)*SPAWN_VARIATION);
  const queue=[];
  for(let i=0;i<count;i++)queue.push({type:spawnTypeByRoll(hash(cx,cy,100+i)),slot:i});

  // One guaranteed seed per chunk. This increases only seed density.
  const seedType=TYPES.find(t=>t.name==='ひまわりの種');
  for(let s=0;s<EXTRA_SEEDS_PER_CHUNK;s++)if(seedType)queue.push({type:seedType,slot:count+s});

  for(const entry of queue){
    const type=entry.type;
    const i=entry.slot;
    if(!type)continue;

    let chosen=null;
    for(let a=0;a<14;a++){
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
