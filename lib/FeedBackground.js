// Default 2 feed "calling cards": dot-matrix scenes drawn on a canvas behind a feed post.
import { useEffect, useRef } from "react";

const PITCH=5, COLS=72, ROWS=42;
const G="#34C759", O="#ff6600", W="#ffffff", GR="#8e8e93", Y="#ffd60a";
const B4=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]].map(r=>r.map(v=>(v+.5)/16));
const bay=(x,y)=>B4[y&3][x&3];
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// Each scene gets put(x,y,a,color): a grid position, brightness 0..1, color.
// Dot skies: purple dots that thin out and fade toward black, using the same ordered dither as the hills.
const mixc=(c1,c2,k)=>{const h=v=>[1,3,5].map(i=>parseInt(v.slice(i,i+2),16));const a=h(c1),b=h(c2);return"#"+a.map((v,i)=>Math.round(v+(b[i]-v)*k).toString(16).padStart(2,"0")).join("")};
function skyCity(put){
  for(let y=0;y<ROWS;y++){
    const f=Math.pow(y/(ROWS-1),1.05);                 // 0 at the top (black), 1 at the skyline (deep purple)
    const col=mixc("#5b21a0","#a35ae6",f);
    for(let x=0;x<COLS;x++){const inten=0.03+1.05*f;if(inten>bay(x,y))put(x,y,0.3+0.5*f,col)}
  }
}
function skyDusk(put,sx,sy){
  const yh=ROWS*0.46;
  for(let y=0;y<ROWS;y++){
    const k=y<yh?y/yh:1;                                    // black at the top, densest at the horizon
    for(let x=0;x<COLS;x++){
      const g=Math.max(0,1-Math.hypot((x-sx)*0.7,(y-sy))/(ROWS*0.42)); // soft glow around the sun
      const inten=Math.min(1,0.03+0.95*Math.pow(k,1.6)+0.25*g*g);
      const col=g>0.45?mixc("#a35ae6","#e0609f",Math.min(1,(g-0.45)*1.6)):mixc("#4a1a88","#a35ae6",Math.min(1,k*1.15));
      if(inten>bay(x,y))put(x,y,0.28+0.5*inten,col);
    }
  }
}
const SCENES=[
{id:"skyline",title:"Skyline",unlock:"New all-time high",msg:"New all-time high",tag:"ATH",draw(put,t){
  const r=rng(7),n=14;
  for(let i=0;i<n;i++){
    const h=Math.round(ROWS*(0.16+0.5*Math.pow(i/(n-1),1.15))+(r()-.5)*5)+(i===n-1?4:0);
    const x0=1+i*5, last=i===n-1;
    for(let k=0;k<h;k++){const y=ROWS-1-k;for(let dx=0;dx<4;dx++){
      const edge=k===h-1;
      let a=edge?1:0.22+0.45*(k/h);
      if((k+dx)%2&&!edge)a*=0.72;
      put(x0+dx,y,a,edge?(last?O:W):G);
    }}
  }
  for(let x=0;x<COLS;x+=2)put(x,ROWS-1,0.45,GR);
}},
{id:"sunrise",title:"Sunrise",unlock:"Streak milestones",msg:"12 week streak",tag:"STREAK",draw(put,t){
  const yh=Math.round(ROWS*0.7), cx=Math.round(COLS*0.7), R=Math.round(ROWS*0.28);
  const bob=Math.sin(t/1600)*0.6;
  for(let y=0;y<yh;y++)for(let x=0;x<COLS;x++){
    const dx=x-cx,dy=y-yh-bob,d=Math.hypot(dx,dy);
    if(d<R){put(x,y,1-d/R*0.25,O);continue}
    if(d<R+1.4){put(x,y,0.55,Y);continue}
    if(d<R*2.8){
      const ang=Math.atan2(dy,dx),s=Math.floor((ang+Math.PI)/(Math.PI/14));
      if(s%2===0&&((x+y)&1)===0)put(x,y,0.5*(1-(d-R)/(R*1.8)),O);
    }
  }
  for(let x=0;x<COLS;x++)if(x%2===0)put(x,yh,0.55,GR);
  for(let k=1;k<ROWS-yh;k++){
    const wid=R*(1-k/(ROWS-yh))*1.05;
    for(let x=Math.round(cx-wid);x<=Math.round(cx+wid);x++){
      if(Math.sin(x*0.7+k*1.4+t/700)>0.35)put(x,yh+k,0.62-k*0.045,O);
    }
  }
}},
{id:"bull",title:"Bull run",unlock:"Strength up 25%+",msg:"Squat est. max up 6% this month",tag:"GROWTH",draw(put,t){
  const r=rng(21),pts=[];let lvl=0.2;
  for(let i=0;i<36;i++){lvl+=0.016+(r()<0.22?-0.07*r():0.03*r());lvl=Math.max(0.12,Math.min(0.86,lvl));pts.push(lvl)}
  const ylOf=c=>Math.round((ROWS-3)*(1-pts[Math.min(35,Math.floor(c/2))]))+2;
  let prev=null;
  for(let c=0;c<COLS;c++){
    const yl=ylOf(c);
    for(let y=yl+1;y<ROWS-1;y++){const f=1-(y-yl)/(ROWS-yl);if(((c+y)&1)===0||f>0.65)put(c,y,0.1+0.5*f*f,G)}
    put(c,yl,1,G);
    if(prev!==null&&prev!==yl){const a=Math.min(prev,yl),b=Math.max(prev,yl);for(let y=a;y<=b;y++)put(c,y,1,G)}
    prev=yl;
  }
  const ey=ylOf(COLS-1),pulse=0.6+0.4*Math.sin(t/300);
  for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)if(Math.hypot(dx,dy)<=2.2)put(COLS-3+dx,ey+dy-1,pulse,O);
  for(let x=0;x<COLS;x+=2)put(x,ROWS-1,0.5,GR);
}},
{id:"burst",title:"Burst",unlock:"New personal record",msg:"New bench PR, 185 x 5",tag:"PR",draw(put,t){
  const cx=Math.round(COLS*0.72),cy=Math.round(ROWS*0.56);
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    const dx=x-cx,dy=(y-cy),d=Math.hypot(dx,dy);
    if(d<3.2){put(x,y,1,O);continue}
    const ph=(t/1400)%1;
    for(let k=0;k<5;k++){
      const rad=((k/5+ph)%1)*44+3;
      if(Math.abs(d-rad)<0.62){put(x,y,Math.max(0.12,1-rad/46),k%2?W:O);break}
    }
    const ang=Math.atan2(dy,dx);
    const sp=Math.round((ang+Math.PI)/(Math.PI/10));
    if(Math.abs(ang+Math.PI-sp*Math.PI/10)<0.03&&d>5&&d<30&&((x+y)%3===0))put(x,y,0.55*(1-d/32),G);
  }
}},
{id:"ridge",title:"Ridgeline",unlock:"Consistency milestones",msg:"50 workouts logged",tag:"50",draw(put,t){
  skyDusk(put,Math.round(COLS*0.7),Math.round(ROWS*0.3));
  const layers=[{base:0.46,amp:5,f:0.13,ph:1.2,c:GR,den:0.4},{base:0.62,amp:6,f:0.17,ph:3.1,c:G,den:0.5},{base:0.8,amp:3,f:0.2,ph:5.4,c:G,den:0.7}];
  for(let x=0;x<COLS;x++){
    for(let li=0;li<layers.length;li++){
      const L=layers[li];
      const yr=Math.round(ROWS*L.base+L.amp*Math.sin(x*L.f+L.ph)+1.0*Math.sin(x*L.f*2.3+L.ph*1.7));
      const nxt=li<layers.length-1?1:0;
      for(let y=yr;y<ROWS;y++){
        const f=1-(y-yr)/(ROWS-yr);
        const inten=L.den*(0.16+0.7*f);
        put(x,y,0,"#000");
        if(y===yr)put(x,y,1,L.c===GR?W:L.c);
        else if(inten>bay(x,y))put(x,y,0.25+0.55*f,L.c);
      }
    }
  }
  const mx=Math.round(COLS*0.7),my=Math.round(ROWS*0.3);
  for(let dx=-4;dx<=4;dx++)for(let dy=-4;dy<=4;dy++)if(Math.hypot(dx,dy)<=4.1)put(mx+dx,my+dy,1,O);
}},
{id:"waves",title:"Waves",unlock:"Weekly goal hit",msg:"4 of 4 workouts this week",tag:"GOAL",draw(put,t){
  const L=[{y:0.5,a:5,f:0.16,c:G,al:1},{y:0.62,a:5,f:0.14,c:G,al:0.7},{y:0.74,a:4,f:0.18,c:O,al:0.85},{y:0.86,a:3,f:0.2,c:GR,al:0.6}];
  L.forEach((w,i)=>{
    for(let x=0;x<COLS;x++){
      const y=ROWS*w.y+w.a*Math.sin(x*w.f+i*1.7+t/900*(i%2?-1:1));
      const yy=Math.round(y);
      put(x,yy,w.al,w.c);
      put(x,yy+1,w.al*0.7,w.c);
      for(let k=2;k<12;k++){const yk=yy+k;if(yk<ROWS&&bay(x,yk)<0.22*(1-k/12)&&i===0)put(x,yk,0.35,w.c)}
    }
  });
}},
{id:"plates",title:"Plates",unlock:"Volume milestones",msg:"A week of 2 F-150s",tag:"VOLUME",draw(put,t){
  const cx=Math.round(COLS*0.78),cy=Math.round(ROWS*0.63),R=Math.round(ROWS*0.35);
  const radii=[R,R*0.74,R*0.5,R*0.3];
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    const d=Math.hypot(x-cx,y-cy);
    if(d<3){continue}
    if(Math.abs(d-radii[0])<0.75){put(x,y,1,O);continue}
    if(Math.abs(d-radii[1])<0.6){put(x,y,0.85,W);continue}
    if(Math.abs(d-radii[2])<0.6){put(x,y,0.7,GR);continue}
    if(Math.abs(d-radii[3])<0.6){put(x,y,0.6,GR);continue}
    if(d<radii[0]&&d>radii[1]&&bay(x,y)<0.34)put(x,y,0.4,O);
    if(d<radii[1]&&d>radii[2]&&bay(x,y)<0.2)put(x,y,0.3,GR);
  }
  for(let x=0;x<cx-R+3;x++)if(x>COLS*0.3&&x%2===0)put(x,cy,0.5,GR);
  const rot=t/900;
  for(let k=0;k<6;k++){const a=rot+k*Math.PI/3;for(let s=3.4;s<radii[3];s+=1)put(Math.round(cx+Math.cos(a)*s),Math.round(cy+Math.sin(a)*s),0.7,Y)}
}},
{id:"close",title:"Market close",unlock:"Rest day, back on schedule",msg:"Back after a rest day",tag:"BACK",draw(put,t){
  const r=rng(314),sr=rng(5);
  skyCity(put);
  // stars: each has its own speed and phase, so they twinkle at different times; the brightest ones flash a small cross
  for(let i=0;i<70;i++){
    const x=Math.floor(sr()*COLS),y=Math.floor(sr()*ROWS*0.6),ph=sr()*6.28,per=2400+sr()*3600,big=sr()<0.25;
    const w=0.5+0.5*Math.sin(t/per*6.28+ph),a=Math.pow(w,3);
    if(a<0.05)continue;
    put(x,y,0.12+0.88*a,W);
    if(big&&a>0.55){put(x-1,y,a*0.6,W);put(x+1,y,a*0.6,W);put(x,y-1,a*0.6,W);put(x,y+1,a*0.6,W)}
  }
  // moon
  const mx=Math.round(COLS*0.76),my=Math.round(ROWS*0.3);
  for(let dx=-4;dx<=4;dx++)for(let dy=-4;dy<=4;dy++)if(Math.hypot(dx,dy)<=4.1&&Math.hypot(dx-2.2,dy-1)>3.3)put(mx+dx,my+dy,0.95,W);
  // buildings: widths and heights vary a lot, some have a stepped top or an antenna
  const widths=[4,5,6,7,9,11,13];
  let x=0;
  while(x<COLS){
    const w=widths[Math.floor(r()*widths.length)];
    const tall=r()<0.25;
    const h=Math.round(ROWS*(tall?0.5+0.22*r():0.12+0.3*r()));
    const step=w>=9&&h>ROWS*0.3&&r()<0.6;
    const ant=tall&&w<=6&&r()<0.7;
    for(let k=0;k<h;k++){
      const y=ROWS-1-k;
      const inset=(step&&k>=h-4)?2:0;
      for(let dx=inset;dx<w-1-inset;dx++){
        const edge=k===h-1||dx===inset||dx===w-2-inset||(step&&k===h-5&&inset===0);
        put(x+dx,y,0,"#000");
        put(x+dx,y,edge?0.5:0.07,GR);
        if(!edge&&k>1&&k<h-2&&dx%2===1&&k%3===0){
          const slot=Math.floor(t/3500),id=x*13+k*7+dx;
          const lit=((id+(((id*31)%11)===0?slot:0))%4)!==0;
          if(lit)put(x+dx,y,0.95,((x+k)%5===0)?O:Y);
        }
      }
    }
    if(ant&&!(x+w/2>COLS*0.66&&x+w/2<COLS*0.88)){const ax=x+Math.floor((w-1)/2);for(let k=0;k<4;k++)put(ax,ROWS-1-h-k,k===3?(0.5+0.5*Math.sin(t/800)>0.5?1:0.2):0.5,k===3?O:GR)}
    x+=w;
  }
}}
];

export const SCENE_IDS = SCENES.map((s) => s.id);

// Which users get a calling card is random once per app session, so the feed and the profile page agree.
const CARDS = {};
export function assignCards(ids) {
  const fresh = ids.filter((id) => !(id in CARDS));
  if (fresh.length) {
    fresh.forEach((id) => { CARDS[id] = null; });
    // 2 to 4 of them, picked at random, each with a random scene.
    const n = Math.min(fresh.length, 2 + Math.floor(Math.random() * 3));
    const pool = [...fresh];
    for (let k = 0; k < n; k++) CARDS[pool.splice(Math.floor(Math.random() * pool.length), 1)[0]] = SCENE_IDS[Math.floor(Math.random() * SCENE_IDS.length)];
  }
  return CARDS;
}

export default function FeedBackground({ scene, dim = true }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    const sc = SCENES.find((s) => s.id === scene);
    if (!cv || !sc) return;
    const dpr = Math.min(2, window.devicePixelRatio || 2);
    cv.width = COLS * PITCH * dpr; cv.height = ROWS * PITCH * dpr;
    const ctx = cv.getContext("2d");
    const render = (t) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, COLS * PITCH, ROWS * PITCH);
      const put = (x, y, a, col) => {
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
        if (col === "#000") { ctx.globalAlpha = 1; ctx.fillStyle = "#000"; ctx.fillRect(x * PITCH, y * PITCH, PITCH, PITCH); return; }
        if (dim && x < COLS * 0.64 && y < ROWS * 0.5) a *= 0.2;
        if (dim && x >= COLS * 0.64 && y < ROWS * 0.2) a *= 0.4;
        if (a <= 0.02) return;
        ctx.globalAlpha = Math.min(1, 0.18 + 0.82 * a);
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(x * PITCH + PITCH / 2, y * PITCH + PITCH / 2, PITCH * (0.2 + 0.26 * Math.min(1, a + 0.15)), 0, 6.2832); ctx.fill();
      };
      sc.draw(put, t);
      ctx.globalAlpha = 1;
    };
    render(0);
    const mq = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq && mq.matches) return;
    let raf = 0, last = 0, visible = true, stopped = false;
    const loop = (now) => { if (stopped) return; if (visible && now - last > 66) { render(now); last = now; } raf = requestAnimationFrame(loop); };
    let io = null;
    if (window.IntersectionObserver) { io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; }); io.observe(cv); }
    raf = requestAnimationFrame(loop);
    return () => { stopped = true; cancelAnimationFrame(raf); if (io) io.disconnect(); };
  }, [scene, dim]);
  return <canvas ref={ref} className="fp-bg" aria-hidden="true" />;
}
