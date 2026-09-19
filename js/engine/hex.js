/* 六角格數學（odd-r offset 座標 ↔ axial 座標） */
export const GRID_SIZE = 7;
export const HEX_DIRS = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
export const offsetToAxial = (c,r) => ({q:c-Math.floor(r/2), r});
export const axialToOffset = (q,r) => ({x:q+Math.floor(r/2), y:r});
export function getDistance(x1,y1,x2,y2){
  const a=offsetToAxial(x1,y1), b=offsetToAxial(x2,y2);
  return (Math.abs(a.q-b.q)+Math.abs(a.r-b.r)+Math.abs(a.q+a.r-b.q-b.r))/2;
}
export const inBounds = p => p.x>=0 && p.x<GRID_SIZE && p.y>=0 && p.y<GRID_SIZE;
export function getNeighbors(x,y){
  const a=offsetToAxial(x,y);
  return HEX_DIRS.map(d=>axialToOffset(a.q+d[0],a.r+d[1])).filter(inBounds);
}
export function cellsWithin(cx,cy,r,includeCenter=false){
  const out=[];
  for(let y=0;y<GRID_SIZE;y++) for(let x=0;x<GRID_SIZE;x++){
    const d=getDistance(x,y,cx,cy);
    if(d<=r && (includeCenter||d>0)) out.push({x,y});
  }
  return out;
}
/* 若 (x2,y2) 在 (x1,y1) 的六個直線方向之一，回傳方向向量 [dq,dr]，否則 null */
export function lineDir(x1,y1,x2,y2){
  const a=offsetToAxial(x1,y1), b=offsetToAxial(x2,y2);
  const dq=b.q-a.q, dr=b.r-a.r, n=getDistance(x1,y1,x2,y2);
  if(!n) return null;
  if(dq!==0 && dr!==0 && dq+dr!==0) return null;
  return [dq/n, dr/n];
}
export function stepAlong(x,y,dir,i){ const a=offsetToAxial(x,y); return axialToOffset(a.q+dir[0]*i, a.r+dir[1]*i); }
export const shuffle = arr => { for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; };
