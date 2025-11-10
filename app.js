const V = {
  v: (x=0,y=0)=>({x,y}),
  add: (a,b)=>({x:a.x+b.x, y:a.y+b.y}),
  sub: (a,b)=>({x:a.x-b.x, y:a.y-b.y}),
  mul: (p,s)=>({x:p.x*s, y:p.y*s}),
  len: p=>Math.hypot(p.x,p.y),
  norm: p=>{const L=Math.hypot(p.x,p.y);return L===0?{x:0,y:0}:{x:p.x/L,y:p.y/L}},
  lerp: (a,b,t)=>a+(b-a)*t
};

const canvas=document.getElementById('stage');
const ctx=canvas.getContext('2d');
const ui={
  k:document.getElementById('k'),
  d:document.getElementById('d'),
  tLen:document.getElementById('tLen'),
  samples:document.getElementById('samples'),
  kVal:document.getElementById('kVal'),
  dVal:document.getElementById('dVal'),
  tLenVal:document.getElementById('tLenVal'),
  samplesVal:document.getElementById('samplesVal'),
  fps:document.getElementById('fps'),
  reset:document.getElementById('reset'),
  toggleTang:document.getElementById('toggleTang')
};

let W=0,H=0;
function fit(){
  const ratio=window.devicePixelRatio||1;
  W=canvas.clientWidth=Math.max(1,window.innerWidth-320);
  H=canvas.clientHeight=Math.max(1,window.innerHeight);
  canvas.width=Math.floor(W*ratio);
  canvas.height=Math.floor(H*ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);
}
window.addEventListener('resize',fit);
fit();

let leftAnchor,rightAnchor,ctrlA,ctrlB;
function resetPoints(){
  const cx=W*0.5,cy=H*0.5,span=Math.max(260,W*0.32);
  leftAnchor={pos:V.v(cx-span/2,cy),vel:V.v(),target:V.v(cx-span/2,cy)};
  rightAnchor={pos:V.v(cx+span/2,cy),vel:V.v(),target:V.v(cx+span/2,cy)};
  ctrlA={pos:V.v(cx-span/6,cy-70),vel:V.v(),target:V.v(cx-span/6,cy-70)};
  ctrlB={pos:V.v(cx+span/6,cy+70),vel:V.v(),target:V.v(cx+span/6,cy+70)};
}
resetPoints();

ui.toggleTang.addEventListener('click',()=>{
  ui.toggleTang.dataset.visible=ui.toggleTang.dataset.visible==='1'?'0':'1';
  ui.toggleTang.textContent=ui.toggleTang.dataset.visible==='1'?'Hide tangents':'Show tangents';
});
ui.k.addEventListener('input',()=>ui.kVal.textContent=ui.k.value);
ui.d.addEventListener('input',()=>ui.dVal.textContent=ui.d.value);
ui.tLen.addEventListener('input',()=>ui.tLenVal.textContent=ui.tLen.value);
ui.samples.addEventListener('input',()=>ui.samplesVal.textContent=ui.samples.value);
ui.reset.addEventListener('click',resetPoints);

function bezierPoint(A,B,C,D,t){
  const u=1-t,u3=u*u*u,u2t=3*u*u*t,ut2=3*u*t*t,t3=t*t*t;
  return{x:u3*A.x+u2t*B.x+ut2*C.x+t3*D.x,y:u3*A.y+u2t*B.y+ut2*C.y+t3*D.y};
}
function bezierTangent(A,B,C,D,t){
  const u=1-t,a=V.mul(V.sub(B,A),3*u*u),b=V.mul(V.sub(C,B),6*u*t),c=V.mul(V.sub(D,C),3*t*t);
  return V.add(V.add(a,b),c);
}

let mouse=V.v(W*0.5,H*0.5),isDown=false,dragging=null;
canvas.addEventListener('mousemove',e=>{
  const r=canvas.getBoundingClientRect();
  mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;
  if(isDown&&dragging){dragging.pos.x=mouse.x;dragging.pos.y=mouse.y;dragging.vel.x=0;dragging.vel.y=0;}
});
canvas.addEventListener('mousedown',e=>{
  isDown=true;
  const r=canvas.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
  for(const p of [leftAnchor,ctrlA,ctrlB,rightAnchor]) if(V.len(V.sub(p.pos,{x:mx,y:my}))<16){dragging=p;return;}
});
window.addEventListener('mouseup',()=>{isDown=false;dragging=null;});
canvas.addEventListener('touchstart',e=>{
  e.preventDefault();
  const t=e.touches[0],r=canvas.getBoundingClientRect();
  mouse.x=t.clientX-r.left;mouse.y=t.clientY-r.top;isDown=true;
});
canvas.addEventListener('touchmove',e=>{
  e.preventDefault();
  const t=e.touches[0],r=canvas.getBoundingClientRect();
  mouse.x=t.clientX-r.left;mouse.y=t.clientY-r.top;
  if(dragging){dragging.pos.x=mouse.x;dragging.pos.y=mouse.y;dragging.vel.x=0;dragging.vel.y=0;}
});
canvas.addEventListener('touchend',()=>{isDown=false;dragging=null;});

function clampMouse(mx,my){
  const cx=W*0.5,cy=H*0.5,vBand=Math.max(120,H*0.32);
  const minY=cy-vBand,maxY=cy+vBand;
  return{x:Math.max(20,Math.min(mx,W-20)),y:Math.max(minY,Math.min(my,maxY))};
}
function integrate(pt,dt,k,d){
  const diff=V.sub(pt.pos,pt.target);
  const accel=V.add(V.mul(diff,-k),V.mul(pt.vel,-d));
  pt.vel.x+=accel.x*dt;pt.vel.y+=accel.y*dt;
  pt.pos.x+=pt.vel.x*dt;pt.pos.y+=pt.vel.y*dt;
}

let last=performance.now(),fpsLast=last,fpsAcc=0,fpsN=0;
requestAnimationFrame(loop);
function loop(now){
  const dt=Math.min(0.032,(now-last)/1000);last=now;
  const k=parseFloat(ui.k.value),d=parseFloat(ui.d.value);
  const safe=clampMouse(mouse.x,mouse.y);
  ctrlA.target.x=V.lerp(ctrlA.target.x,safe.x-Math.min(120,W*0.08),0.12);
  ctrlA.target.y=V.lerp(ctrlA.target.y,safe.y-30,0.12);
  ctrlB.target.x=V.lerp(ctrlB.target.x,safe.x+Math.min(120,W*0.08),0.12);
  ctrlB.target.y=V.lerp(ctrlB.target.y,safe.y+30,0.12);
  if(dragging){dragging.target.x=dragging.pos.x;dragging.target.y=dragging.pos.y;}
  integrate(ctrlA,dt,k,d);integrate(ctrlB,dt,k,d);
  draw();
  fpsAcc+=1/Math.max((now-fpsLast)/1000,1/60);fpsN++;
  if(now-fpsLast>300){ui.fps.textContent=Math.round((fpsAcc/fpsN)*10)/10;fpsAcc=0;fpsN=0;fpsLast=now;}
  requestAnimationFrame(loop);
}

function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle='rgba(10,20,10,0.6)';ctx.lineWidth=18;strokePath(parseInt(ui.samples.value));
  ctx.strokeStyle='#46d07a';ctx.lineWidth=4;strokePath(parseInt(ui.samples.value));
  ctx.strokeStyle='#bfffd3';ctx.lineWidth=1;strokePath(Math.max(40,Math.floor(parseInt(ui.samples.value)*0.5)));
  if(ui.toggleTang.dataset.visible==='1')drawTangents();
  ctx.beginPath();
  ctx.moveTo(leftAnchor.pos.x,leftAnchor.pos.y);
  ctx.lineTo(ctrlA.pos.x,ctrlA.pos.y);
  ctx.lineTo(ctrlB.pos.x,ctrlB.pos.y);
  ctx.lineTo(rightAnchor.pos.x,rightAnchor.pos.y);
  ctx.strokeStyle='rgba(255,255,255,0.06)';
  ctx.lineWidth=1;ctx.stroke();
  [leftAnchor,ctrlA,ctrlB,rightAnchor].forEach(p=>drawPoint(p.pos,'#ffd166'));
}

function strokePath(s){
  ctx.beginPath();
  for(let i=0;i<=s;i++){
    const t=i/s;
    const p=bezierPoint(leftAnchor.pos,ctrlA.pos,ctrlB.pos,rightAnchor.pos,t);
    if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
  }
  ctx.stroke();
}
function drawTangents(){
  const s=30,tlen=parseFloat(ui.tLen.value);
  ctx.lineWidth=2;ctx.strokeStyle='#6ec6ff';
  for(let i=0;i<=s;i++){
    const t=i/s;
    const p=bezierPoint(leftAnchor.pos,ctrlA.pos,ctrlB.pos,rightAnchor.pos,t);
    const T=bezierTangent(leftAnchor.pos,ctrlA.pos,ctrlB.pos,rightAnchor.pos,t);
    const n=V.norm(T);
    ctx.beginPath();
    ctx.moveTo(p.x-n.x*tlen*0.5,p.y-n.y*tlen*0.5);
    ctx.lineTo(p.x+n.x*tlen*0.5,p.y+n.y*tlen*0.5);
    ctx.stroke();
  }
}
function drawPoint(p,color){
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle='rgba(0,0,0,0.4)';
  ctx.arc(p.x+2,p.y+2,10,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(p.x,p.y,8,0,Math.PI*2);
  ctx.fillStyle=color;ctx.fill();
  ctx.lineWidth=2;ctx.strokeStyle='rgba(255,255,255,0.12)';
  ctx.stroke();ctx.restore();
}
window.addEventListener('resize',()=>{fit();resetPoints();});
