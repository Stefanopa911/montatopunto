console.log("montato: split layout + vertical carousel ✅");

const $ = (id) => document.getElementById(id);
const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function splitOnceCaseInsensitive(text, needle){
  const t = String(text);
  const n = String(needle);
  const idx = t.toLowerCase().indexOf(n.toLowerCase());
  if(idx < 0) return [t,"",""];
  return [t.slice(0, idx), t.slice(idx, idx + n.length), t.slice(idx + n.length)];
}
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

/* elements */
const stage = $("stage");
const halo = $("halo");
const metaLine = $("metaLine");

const countBlock = $("countBlock");
const cd1 = $("cd1");
const cd2 = $("cd2");
const targetLine = $("targetLine");

const vviewport = $("vviewport");
const vtrack = $("vtrack");

/* cursor */
const cursor = document.createElement("div");
cursor.className = "custom-cursor";
document.body.appendChild(cursor);

on(document, "mousemove", (e) => {
  cursor.style.left = e.clientX + "px";
  cursor.style.top  = e.clientY + "px";
});

/* data */
const presets = [
  { a:"sopra la", b:"media", c:"senza sforzo", accent:"sforzo" },
  { a:"zero rumore", b:"presenza", c:"tutto è chiaro", accent:"chiaro" },
  { a:"stesso sole", b:"altra aura", c:"nessuna spiegazione", accent:"spiegazione" },
  { a:"estate addosso", b:"sempre", c:"anche quando piove", accent:"sempre" },
  { a:"non inseguo", b:"arriva", c:"chi mi capisce", accent:"arriva" }
];

/* drop meta + countdown target */
const TARGET_HOUR = 18, TARGET_MIN = 0;
function getNextThursday(now = new Date()){
  const THU = 4;
  let daysAhead = (THU - now.getDay() + 7) % 7;
  if(daysAhead === 0) daysAhead = 7;
  const t = new Date(now);
  t.setDate(now.getDate() + daysAhead);
  t.setHours(TARGET_HOUR, TARGET_MIN, 0, 0);
  return t;
}
const target = getNextThursday();
const pretty = new Intl.DateTimeFormat("it-IT", {
  weekday:"long", day:"2-digit", month:"long", hour:"2-digit", minute:"2-digit"
}).format(target);
if(metaLine) metaLine.textContent = `drop 01 — ${pretty}`;

function pad(n){ return String(n).padStart(2,"0"); }
function tick(){
  const now = new Date();
  const diff = target - now;
  if(diff <= 0){
    if(cd1) cd1.textContent = "LIVE";
    if(cd2) cd2.textContent = "NOW";
    if(targetLine) targetLine.textContent = "drop 01 · live";
    return;
  }
  const total = Math.floor(diff/1000);
  const d = Math.floor(total/86400);
  const h = Math.floor((total%86400)/3600);
  const m = Math.floor((total%3600)/60);
  const s = total%60;
  if(cd1) cd1.textContent = `${pad(d)}D ${pad(h)}H`;
  if(cd2) cd2.textContent = `${pad(m)}M ${pad(s)}S`;
}
tick();
setInterval(tick, 200);

/* pastel */
const pastelColors = ["#5FA6C7","#A8D8EA","#F7C8E0","#D8B4F8","#B9F3E4","#FFD6A5","#CDEAC0"];
function hexToRgb(hex){
  const h = hex.replace("#","");
  return { r:parseInt(h.slice(0,2),16), g:parseInt(h.slice(2,4),16), b:parseInt(h.slice(4,6),16) };
}
function lerp(a,b,t){ return a + (b-a)*t; }
function mixHex(a,b,t){
  const A=hexToRgb(a), B=hexToRgb(b);
  return `rgb(${Math.round(lerp(A.r,B.r,t))},${Math.round(lerp(A.g,B.g,t))},${Math.round(lerp(A.b,B.b,t))})`;
}
let baseIndex=0, baseT=0, boost=0;

function setPastel(colorCss){
  document.documentElement.style.setProperty("--pastel", colorCss);
  document.documentElement.style.setProperty(
    "--pastelGlow",
    colorCss.replace("rgb(","rgba(").replace(")",",0.22)")
  );
}
function bump(amount){
  boost = Math.min(1, boost + amount);
  cursor.classList.add("pastel");
  clearTimeout(bump._t);
  bump._t = setTimeout(()=> cursor.classList.remove("pastel"), 220);
}
function pastelLoop(){
  boost *= 0.92;
  baseT += 0.0022 + boost * 0.01;
  if(baseT >= 1){
    baseT = 0;
    baseIndex = (baseIndex + 1) % pastelColors.length;
  }
  const a = pastelColors[baseIndex];
  const b = pastelColors[(baseIndex + 1) % pastelColors.length];
  setPastel(mixHex(a,b,baseT));
  requestAnimationFrame(pastelLoop);
}
requestAnimationFrame(pastelLoop);

/* parallax: moves halo + subtle count drift */
let raf=null, last={x:innerWidth/2,y:innerHeight/2};
function applyParallax(nx, ny){
  // halo
  if(halo){
    const cx = innerWidth/2 + nx * 160;
    const cy = innerHeight/2 + ny * 120;
    halo.style.left = cx + "px";
    halo.style.top  = cy + "px";
  }
  // count drift
  if(countBlock){
    countBlock.style.setProperty("--tx", (nx*26).toFixed(2) + "px");
    countBlock.style.setProperty("--ty", (ny*18).toFixed(2) + "px");
  }
}
on(stage, "mousemove", (e)=>{
  last.x=e.clientX; last.y=e.clientY;
  bump(0.04);
  if(raf) return;
  raf = requestAnimationFrame(()=>{
    const cx=innerWidth/2, cy=innerHeight/2;
    applyParallax((last.x-cx)/cx, (last.y-cy)/cy);
    raf=null;
  });
});

/* gyroscope */
const gyroWrap = $("gyroWrap");
const gyroBtn  = $("gyroBtn");
function isMobile(){ return matchMedia("(max-width: 960px)").matches; }
function hasDeviceOrientation(){ return typeof DeviceOrientationEvent !== "undefined"; }
let sx=0, sy=0;
function handleOrientation(e){
  const g = (e.gamma ?? 0);
  const b = (e.beta  ?? 0);
  const nx = clamp(g/25, -1, 1);
  const ny = clamp((b-10)/25, -1, 1);
  sx += (nx - sx)*0.12;
  sy += (ny - sy)*0.12;
  bump(0.03);
  applyParallax(sx, sy);
}
async function enableGyro(){
  if(!hasDeviceOrientation()) return;
  if(typeof DeviceOrientationEvent.requestPermission === "function"){
    try{
      const res = await DeviceOrientationEvent.requestPermission();
      if(res !== "granted") return;
    }catch(e){ return; }
  }
  window.addEventListener("deviceorientation", handleOrientation, true);
  if(gyroBtn){
    gyroBtn.textContent = "movimento attivo";
    gyroBtn.disabled = true;
    gyroBtn.style.opacity = ".6";
  }
}
if(isMobile() && hasDeviceOrientation()){
  if(gyroWrap) gyroWrap.style.display = "block";
} else {
  if(gyroWrap) gyroWrap.style.display = "none";
}
on(gyroBtn, "click", enableGyro);

/* =========================
   VERTICAL CAROUSEL ENGINE
========================= */
let activeIndex = 0;
let y = 0;
let isDown = false;
let lastY = 0;
let seqHeight = 0;

function buildCarousel(){
  if(!vtrack) return;
  vtrack.innerHTML = "";

  const seq = document.createElement("div");
  seq.style.display = "flex";
  seq.style.flexDirection = "column";
  seq.style.gap = "46px";

  presets.forEach((p,i)=>{
    const el = document.createElement("div");
    el.className = "vitem";
    el.dataset.index = String(i);

    const parts = p.accent && p.c.toLowerCase().includes(p.accent.toLowerCase())
      ? splitOnceCaseInsensitive(p.c, p.accent)
      : [p.c,"",""];

    const cHtml = parts[1]
      ? `${escapeHtml(parts[0])}<span class="vGlow">${escapeHtml(parts[1])}</span>${escapeHtml(parts[2])}`
      : escapeHtml(p.c);

    el.innerHTML = `
      <div class="vA">${escapeHtml(p.a)}</div>
      <div class="vB">${escapeHtml(p.b)}</div>
      <div class="vC">${cHtml}</div>
    `;

    on(el, "click", ()=> { snapToIndex(i); bump(0.16); });
    seq.appendChild(el);
  });

  const seq2 = seq.cloneNode(true);
  seq2.querySelectorAll(".vitem").forEach((n)=>{
    const i = Number(n.dataset.index);
    on(n, "click", ()=> { snapToIndex(i); bump(0.16); });
  });

  vtrack.appendChild(seq);
  vtrack.appendChild(seq2);

  requestAnimationFrame(()=>{
    seqHeight = seq.getBoundingClientRect().height;
    y = 0;
    applyY();
    setActive(0);
	kickActiveAnimation();
    updatePresence();
  });
}

function applyY(){ vtrack.style.transform = `translate3d(0,${y}px,0)`; }

function setActive(i){
  activeIndex = clamp(i, 0, presets.length - 1);
  vtrack.querySelectorAll(".vitem").forEach((n)=>{
    n.classList.toggle("is-active", Number(n.dataset.index) === activeIndex);
  });
}

function updatePresence(){
  if(!vviewport || !vtrack) return;
  const vr = vviewport.getBoundingClientRect();
  const centerY = vr.top + vr.height/2;

  vtrack.querySelectorAll(".vitem").forEach((el)=>{
    const r = el.getBoundingClientRect();
    const mid = r.top + r.height/2;
    const dist = Math.abs(mid - centerY) / (vr.height/2);
    const op = clamp(1 - dist*0.95, 0.18, 1);
    const sc = clamp(1 - dist*0.08, 0.92, 1.02);
    el.style.setProperty("--op", op.toFixed(3));
    el.style.setProperty("--sc", sc.toFixed(3));
  });
}

function nearestIndexToCenter(){
  const vr = vviewport.getBoundingClientRect();
  const centerY = vr.top + vr.height/2;
  let best = { i:0, d:Infinity };

  vtrack.querySelectorAll(".vitem").forEach((el)=>{
    const r = el.getBoundingClientRect();
    const mid = r.top + r.height/2;
    const d = Math.abs(mid - centerY);
    const idx = Number(el.dataset.index);
    if(d < best.d){ best = { i: idx, d }; }
  });

  return best.i;
}

function snapToIndex(i){
  setActive(i);

  const targetEl = [...vtrack.querySelectorAll(".vitem")].find(n => Number(n.dataset.index) === i);
  if(!targetEl || !vviewport) return;

  const vr = vviewport.getBoundingClientRect();
  const centerY = vr.top + vr.height/2;

  const r = targetEl.getBoundingClientRect();
  const mid = r.top + r.height/2;

  y += (centerY - mid);
  applyY();
  updatePresence();

  kickActiveAnimation();   // ✅ NEW: blur→sharp + snap
}


/* drag */
on(vviewport, "pointerdown", (e)=>{
  vviewport.setPointerCapture?.(e.pointerId);
  isDown = true;
  lastY = e.clientY;
});
on(vviewport, "pointermove", (e)=>{
  if(!isDown) return;
  const dy = e.clientY - lastY;
  lastY = e.clientY;
  y += dy;
  applyY();
  updatePresence();
  bump(0.03);
});
function endDrag(){
  if(!isDown) return;
  isDown = false;
  snapToIndex(nearestIndexToCenter());
}
on(vviewport, "pointerup", endDrag);
on(vviewport, "pointercancel", endDrag);

/* wheel */
on(vviewport, "wheel", (e)=>{
  e.preventDefault();
  y -= e.deltaY * 0.9;
  applyY();
  updatePresence();
  bump(0.03);

  clearTimeout(endDrag._t);
  endDrag._t = setTimeout(()=> snapToIndex(nearestIndexToCenter()), 120);
}, { passive:false });

/* keep y bounded (infinite wrap) */
function wrapLoop(){
  if(seqHeight > 0){
    if(y <= -seqHeight) y += seqHeight;
    if(y >= 0) y -= seqHeight;
    applyY();
  }
  requestAnimationFrame(wrapLoop);
}
function kickActiveAnimation(){
  if(!vtrack) return;

  // prendi il primo elemento attivo (la prima occorrenza)
  const activeEl = [...vtrack.querySelectorAll(".vitem")]
    .find(n => n.classList.contains("is-active"));

  if(!activeEl) return;

  // reset animazione
  activeEl.classList.remove("kick");
  // force reflow (riavvia l’animazione)
  void activeEl.offsetWidth;
  activeEl.classList.add("kick");

  clearTimeout(kickActiveAnimation._t);
  kickActiveAnimation._t = setTimeout(()=> activeEl.classList.remove("kick"), 720);
}


/* init */
buildCarousel();
requestAnimationFrame(wrapLoop);
