/* WSafe AI + Axis Communications — clickable concept prototype (planned design, not yet deployed).
   All data below is ILLUSTRATIVE SAMPLE DATA. No network calls; nothing connects to any Axis device, VMS, or Procore.
   Every screen is WSafe AI's own (concept) console. None of it copies Axis software UI, and no Axis logos or marks are used;
   "Axis", "AXIS OS", "VAPIX", "ACAP", and "AXIS Object Analytics" are named only to describe the planned integration,
   using terminology from Axis's public developer documentation (developer.axis.com).
   Hazard taxonomy reused from the WSafe AI + Genetec prototype (patent provisional 63/992,261 + OSHA construction topics).
   MVP = PPE (hard hat, hi-vis) + exclusion-zone entry; everything else is planned. */
(function(){
"use strict";
const $ = s => document.querySelector(s);
const LOGO = "assets/wsafeai-logo.png";

/* ---------- walkthrough script (also used for the PDF captions) ---------- */
const STEPS = [
 {t:"WSafe AI + Axis Communications — concept prototype walkthrough", c:"", one:"", api:[]},
 {t:"Axis camera fleet — devices connected via VAPIX + RTSP",
  one:"WSafe AI's device list for a sample jobsite: Axis cameras added over VAPIX, video pulled over RTSP, and device events subscribed over MQTT, with per-camera hazard coverage.",
  c:"Each Axis camera is added with a dedicated service account. WSafe reads device info over VAPIX, pulls video over RTSP, and subscribes to device events (MQTT Event Bridge). ACAP edge app is Phase 2.",
  api:[["ax","VAPIX · basicdeviceinfo.cgi"],["ax","RTSP · axis-media/media.amp"],["ax","MQTT Event Bridge"]]},
 {t:"Live view — WSafe AI detection overlays on Axis streams",
  one:"Live Axis streams with WSafe AI overlays: hazard boxes, class chips, confidence, and the exclusion-zone polygon drawn on each camera.",
  c:"WSafe draws its detections over the Axis RTSP streams in its own console. Click a tile to focus it. Drawing boxes on the camera's own stream (ACAP Bounding Box API) is Phase 2.",
  api:[["ax","RTSP H.264 in"],["ws","Hazard inference · 10 classes"],["ph2","On-camera overlay · ACAP"]]},
 {t:"Alert raised — Axis device event + WSafe AI verification",
  one:"An AXIS Object Analytics “Object in area” event on the crane-pick camera arrives over MQTT; WSafe AI verifies it (person in EZ-3, hard hat missing) and raises a P1 alert.",
  c:"The camera's own analytic (AXIS Object Analytics · Object in area) fires; WSafe receives the event over MQTT, checks the frame for PPE and zone context, and raises one alert. Edge-only path via ACAP shown as Phase 2.",
  api:[["ax","AOA · Object in area"],["ax","MQTT event"],["ws","PPE + zone verification"],["ph2","ACAP WSafe AI Edge"]]},
 {t:"Reviewer decision — approve or reject with evidence clip",
  one:"Human in the loop: a Competent Person plays the evidence clip, then approves or rejects each finding; only approved findings go out to alerts, the VMS, or Procore.",
  c:"Every finding carries a short evidence clip from the Axis stream, the class, confidence, and a suggested OSHA reference. A person approves or rejects; nothing is sent until they decide.",
  api:[["ws","Review queue"],["ws","Evidence clip ±6 s"],["none","No output until a human decides"]]},
 {t:"Site risk heat map — by zone, camera, and hazard class",
  one:"Approved findings roll up by zone, Axis camera, and hazard class into a relative risk map for targeting walk-downs and toolbox talks.",
  c:"Filter by hazard class to see where approved findings concentrate; each zone breaks down by class and camera. It shows where hazards were seen, not a prediction.",
  api:[["ws","Approved findings only"],["ax","Camera placement + coverage"],["ph2","Dashboard · Phase 2"]]},
 {t:"Integration architecture — Axis → WSafe AI → alerts, VMS, Procore",
  one:"How the pieces connect: Axis cameras send RTSP video and VAPIX/MQTT events (or, later, ACAP edge events) to WSafe AI, which sends reviewed alerts to people, the VMS, and Procore.",
  c:"MVP: RTSP video + MQTT/VAPIX events into WSafe AI's cloud. Phase 2: a WSafe AI Edge ACAP app sends only hazard events + snapshots. Click a block for details.",
  api:[["ax","VAPIX"],["ax","RTSP"],["ax","MQTT"],["ph2","ACAP"],["pc","Procore"]]}
];
const LAST = STEPS.length-1;
window.STEPS = STEPS;

/* ---------- hazard taxonomy (same as the Genetec prototype) ---------- */
/* ---------- hazard taxonomy ---------- */
const STL = {mvp:"MVP", p2:"Phase 2", later:"Planned", res:"Research"};
const PW = {1:2, 2:1.5, 3:1, 4:.6};               // severity weight for heat map
const PRC = {1:"Urgent", 2:"High", 3:"Medium", 4:"Low"}; // Procore priority mapping (illustrative)
const HC = [
 {id:"fall", s:"Falls", code:"FALL", l:"Falls & fall protection", ff:true, pri:1, st:"p2", col:"#e5533d", pc:"Fall protection", trade:"Concrete / Steel",
  sig:"Person + edge/opening segmentation; guardrail, harness and ladder-geometry detection",
  subs:[["Unprotected side / leading edge","1926.501(b)(1)","p2"],["Missing or incomplete guardrail","1926.502(b)","p2"],["Uncovered floor hole / opening","1926.501(b)(4)","p2"],["No tie-off at height","1926.502(d)","later"],["Ladder misuse (rails < 3 ft above landing, top step)","1926.1053(b)","p2"],["Scaffold missing guardrail / toe board","1926.451(g)","later"]]},
 {id:"struck", s:"Struck-by", code:"STRUCK", l:"Struck-by", ff:true, pri:1, st:"p2", col:"#ef7d22", pc:"Struck-by", trade:"Crane / Earthwork",
  sig:"Equipment detection + tracking; swing-radius polygons; hook/load detection; person-to-vehicle distance",
  subs:[["Worker in equipment swing radius / travel path","1926.1424(a) · Subpart O","p2"],["Worker under suspended load","1926.1425","p2"],["Vehicle–pedestrian proximity / backing","1926.601(b)(4)","p2"],["Falling objects / unsecured materials at height","1926.502(j)","later"]]},
 {id:"caught", s:"Caught-in / between", code:"CAUGHT", l:"Caught-in / between", ff:true, pri:1, st:"later", col:"#a8673a", pc:"Caught-in/between", trade:"Earthwork",
  sig:"Excavation segmentation; shoring / trench-box detection; edge setback; moving-part proximity",
  subs:[["Trench ≥ 5 ft without protective system","1926.652(a)(1)","later"],["Spoil / materials within 2 ft of edge","1926.651(j)(2)","later"],["Pinch points near moving equipment","Subpart O","later"]]},
 {id:"elec", s:"Electrical", code:"ELEC", l:"Electrical", ff:true, pri:1, st:"later", col:"#e3b51e", dark:true, pc:"Electrical", trade:"Electrical",
  sig:"Panel-door state; arc-flash suit detection; person-to-panel proximity; LOTO boundary polygon",
  subs:[["Open panel / energized work without arc-flash PPE","1910.333 · 1926.416(a)","later"],["Exposed live conductors","Subpart K","later"],["Damaged cords / cables","1926.416(e)(1)","later"],["Entry into LOTO / energized-work boundary","1910.147 · 1926.417","later"]]},
 {id:"ppe", s:"PPE", code:"PPE", l:"Personal protective equipment", pri:3, st:"mvp", col:"#24a39a", pc:"PPE", trade:"Camera default",
  sig:"Person detection + PPE attribute classifiers (head, torso, hands, eyes); P2 when ≥ 2 items missing or near equipment",
  subs:[["Hard hat missing","1926.100(a)","mvp"],["Hi-vis vest missing","Site rule · 1926.651(d)","mvp"],["Eye / face protection missing","1926.102(a)(1)","later"],["Gloves / hand protection missing","1926.95 · 1910.138","later"],["Harness not worn where required","1926.502(d)","later"]]},
 {id:"zone", s:"Exclusion-zone intrusion", code:"ZONE", l:"Restricted / exclusion-zone intrusion", pri:2, st:"mvp", col:"#8e6ad8", pc:"Struck-by / restricted area", trade:"Camera default",
  sig:"Person detection inside customer-drawn polygons per camera, with optional schedules",
  subs:[["Person inside configured exclusion zone","Site rule · 1926.1424(a)(2)","mvp"],["Unauthorized / after-hours area entry","Site rule","p2"]]},
 {id:"house", s:"Housekeeping & slip/trip", code:"HOUSE", l:"Housekeeping & slip / trip", pri:3, st:"p2", col:"#5b97d6", pc:"Housekeeping", trade:"General Contractor",
  sig:"Walkway polygons + clutter / object segmentation; liquid-sheen detection",
  subs:[["Debris / materials in walkway","1926.25(a)","p2"],["Cords / hoses across walkway","1926.25(a)","p2"],["Standing water / spill","Subpart C (1926.25)","later"]]},
 {id:"fire", s:"Fire & hot work", code:"FIRE", l:"Fire & hot work", pri:1, st:"later", col:"#d6336c", pc:"Fire prevention", trade:"Mechanical / Steel",
  sig:"Smoke / flame classifier with VLM confirmation; spark detection + fire-watch presence; extinguisher occlusion",
  subs:[["Smoke or open flame","Subpart F","later"],["Hot work without fire watch","1926.352","later"],["Blocked / missing fire extinguisher","1926.150(c)","later"]]},
 {id:"egress", s:"Confined space & egress", code:"EGRESS", l:"Confined space & egress", pri:2, st:"later", col:"#3fb36b", pc:"Egress / confined space", trade:"Mechanical",
  sig:"Exit / door-area occlusion; confined-space portal + attendant presence",
  subs:[["Blocked exit / egress route","1926.34(c)","later"],["Confined-space entry without attendant","Subpart AA (1926.1209) · 1910.146","later"]]},
 {id:"health", s:"Ergonomics & heat stress", code:"HEALTH", l:"Ergonomics & heat stress", pri:4, st:"res", col:"#8d9aa3", pc:"Ergonomics", trade:"Camera default",
  sig:"Pose estimation (lift posture, arms-overhead duration); heat indicators need ambient data (research)",
  subs:[["Improper lift / manual-handling posture","No specific standard · General Duty Clause","res"],["Sustained overhead work posture","General Duty Clause","res"],["Heat-stress indicators","General Duty Clause · OSHA heat NEP","res"]]}
];
const HCM = Object.fromEntries(HC.map(h=>[h.id,h]));
const NSUB = HC.reduce((s,h)=>s+h.subs.length,0);
window.HC = HC;
const hchip = (id,extra)=>{const h=HCM[id];return `<span class="hc" style="background:${h.col};color:${h.dark?"#1d1a0a":"#fff"}">${h.code}${extra?` ${extra}`:""}</span>`;};
const stp = st=>`<span class="stp ${st}">${STL[st]}</span>`;

/* ---------- illustrative sample data ---------- */
const ST = {step:0, arrived:false, sel:"WS-2051", dismissed:{}, ok:{}, approved:false, focus:"AX-06", evsrc:"aoa", devSel:"AX-06",
  hm:{win:30,cls:"all",zone:null}, play:false, pf:3, arch:"aoa", archPath:"all"};
/* Axis devices (models are real Axis product names used as SAMPLE inventory; specs not asserted) */
const CAMS = [
 {id:"AX-01", n:"North laydown", scene:"house", model:"AXIS P1468-LE", type:"Bullet", ip:"10.20.3.11", os:"12.x", aoa:["Walkway · Object in area"], edge:"cloud", fps:15},
 {id:"AX-02", n:"Generator yard", scene:"genyard", model:"AXIS Q1656-LE", type:"Box", ip:"10.20.3.12", os:"12.x", aoa:["Yard gate · Line crossing"], edge:"plan", fps:15},
 {id:"AX-03", n:"Level 2 deck east", scene:"edge", model:"AXIS Q6135-LE", type:"PTZ", ip:"10.20.3.13", os:"12.x", aoa:["Deck edge · Object in area"], edge:"cloud", fps:12},
 {id:"AX-04", n:"Gate 2 · Haul road", scene:"gate", model:"AXIS Q1808-LE", type:"Bullet", ip:"10.20.3.14", os:"12.x", aoa:["Haul road · Line crossing"], edge:"cloud", fps:15},
 {id:"AX-05", n:"Electrical room B", scene:"elec", model:"AXIS M3088-V", type:"Dome", ip:"10.20.3.15", os:"12.x", aoa:[], edge:"cloud", fps:10},
 {id:"AX-06", n:"Crane pick zone", scene:"excl", model:"AXIS Q6135-LE", type:"PTZ", ip:"10.20.3.16", os:"12.x", aoa:["EZ-3 load path · Object in area","Pick zone · Occupancy in area"], edge:"plan", fps:15}
];
const SPK = {id:"AX-07", n:"Gate 2 horn speaker", model:"AXIS C1310-E", type:"Network horn speaker", ip:"10.20.3.21"};
const cam = id => CAMS.find(c=>c.id===id)||{id,n:id};
const camN = id => ({"AX-07":"East utility trench"})[id] || (CAMS.find(c=>c.id===id)||{}).n || id;
const SRC = {aoa:"AXIS Object Analytics event + WSafe check", cloud:"WSafe AI cloud · RTSP stream", edge:"ACAP WSafe AI Edge (Phase 2)"};
/* review candidates */
const DET = [
 {id:"WS-2051", cls:"zone", sub:0, hz:"Person inside EZ-3 during pick · hard hat missing", cam:"AX-06", scene:"excl", o:{nh:true}, conf:0.81, conf2:0.84, t:"10:42:30 AM", pri:1, src:"aoa", note:"Worker crossed into EZ-3 load path during an active pick, no hard hat. Rigger lead notified by radio."},
 {id:"WS-2050", cls:"ppe", sub:0, hz:"Hard hat + hi-vis vest missing", cam:"AX-02", scene:"genyard", conf:0.87, conf2:0.79, t:"10:41:07 AM", pri:2, src:"cloud", note:"Worker in generator yard without hard hat or vest."},
 {id:"WS-2049", cls:"fall", sub:0, hz:"Worker at unprotected deck edge", cam:"AX-03", scene:"edge", conf:0.90, t:"10:38:44 AM", pri:1, src:"cloud", note:"Guardrail section removed at L2 east edge; worker within 6 ft."},
 {id:"WS-2048", cls:"struck", sub:1, hz:"Worker under suspended load", cam:"AX-06", scene:"load", conf:0.84, t:"10:36:10 AM", pri:1, src:"cloud", note:"Worker passed under the load during the pick."},
 {id:"WS-2047", cls:"struck", sub:2, hz:"Pedestrian in truck path at Gate 2", cam:"AX-04", scene:"gate", conf:0.78, t:"10:33:15 AM", pri:2, src:"aoa", note:"Pedestrian crossed the haul road behind a backing truck."},
 {id:"WS-2046", cls:"elec", sub:0, hz:"Open panel, no arc-flash PPE", cam:"AX-05", scene:"elec", conf:0.79, t:"10:31:02 AM", pri:1, src:"cloud", note:"Panel PP-3B open with worker in front, no arc-flash suit visible."},
 {id:"WS-2045", cls:"house", sub:1, hz:"Cords / hoses across walkway", cam:"AX-01", scene:"house", conf:0.76, t:"10:19:40 AM", pri:3, src:"cloud", note:"Extension cords across the main walkway near the container."}
];
const det = id => DET.find(d=>d.id===(id||ST.sel))||DET[0];
const HERO = "WS-2051";
/* Axis device event feed (sample; topics follow Axis event-topic naming, abbreviated) */
const EVF = [
 ["10:42:29","AX-06","ObjectAnalytics/Device1Scenario1","EZ-3 load path · Object in area","active=1",true],
 ["10:42:12","AX-06","ObjectAnalytics/Device1Scenario2","Pick zone · Occupancy in area","count=3"],
 ["10:41:55","AX-04","ObjectAnalytics/Device1Scenario1","Haul road · Line crossing","human"],
 ["10:41:20","AX-02","ObjectAnalytics/Device1Scenario1","Yard gate · Line crossing","human"],
 ["10:40:48","AX-01","ObjectAnalytics/Device1Scenario1","Walkway · Object in area","active=0"],
 ["10:40:02","AX-03","VMD/Camera1ProfileANY","Motion (VMD)","active=1"],
 ["10:39:31","AX-05","Device/Status/SystemReady","Heartbeat","ready=1"]
];
/* ---------- placeholder imagery (generic, faceless SVG figures; no real people or sites) ---------- */
function worker(x,y,o={}){
  const s=o.s||1, hat=o.hat!==false, vest=o.vest!==false;
  return `<g transform="translate(${x},${y}) scale(${s})">
   <rect x="-9" y="-40" width="7" height="40" rx="3" fill="#3b4750"/><rect x="2" y="-40" width="7" height="40" rx="3" fill="#3b4750"/>
   <rect x="-13" y="-82" width="26" height="45" rx="7" fill="${o.suit||(vest?"#c6d63a":"#6a5f57")}"/>${vest&&!o.suit?`<rect x="-13" y="-62" width="26" height="4" fill="#e9eef0" opacity=".85"/>`:""}
   <rect x="-20" y="-80" width="7" height="34" rx="3" fill="#56636c" transform="rotate(${o.arm||8} -16 -80)"/><rect x="13" y="-80" width="7" height="34" rx="3" fill="#56636c" transform="rotate(${-(o.arm2??o.arm??8)} 16 -80)"/>
   <circle cx="0" cy="-94" r="11" fill="#a9b3b9"/>
   ${hat?`<path d="M-13 -96 a13 12 0 0 1 26 0 z" fill="${o.hc||"#F28A1E"}"/><rect x="-15" y="-97" width="30" height="3.5" rx="1.5" fill="#d9750f"/>`:""}
  </g>`;
}
function box(x,y,w,h,txt,col,pos){
  col=col||"#ff5a36"; const lw=txt.length*7+14;
  const lx = pos==="right"? x+w+4 : pos==="left" ? x-lw-4 : x, ly = pos==="right"||pos==="left" ? y : y-22;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${col}" stroke-width="3" rx="4"/>
   <rect x="${lx}" y="${ly}" width="${lw}" height="20" fill="${col}" rx="3"/>
   <text x="${lx+7}" y="${ly+14}" font-family="Arial" font-weight="700" font-size="12" fill="#fff">${txt}</text>`;
}
function scene(kind, o={}){
  const bb = !!o.boxes, K=kind+(o.k||"");
  const sky=(a,b)=>`<defs><linearGradient id="sk${K}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="640" height="360" fill="url(#sk${K})"/>`;
  let g="";
  if(kind==="genyard"){
    g+=sky("#9db7c6","#e3eaee")+`<rect x="0" y="232" width="640" height="128" fill="#b9ad96"/><rect x="0" y="232" width="640" height="10" fill="#a39880"/>
     ${[30,190].map(x=>`<g><rect x="${x}" y="118" width="140" height="116" fill="#d7dcdf" stroke="#8d989e" stroke-width="2"/>
       ${[0,1,2,3,4,5].map(i=>`<line x1="${x+14}" y1="${136+i*12}" x2="${x+126}" y2="${136+i*12}" stroke="#9aa5ab" stroke-width="2"/>`).join("")}
       <rect x="${x+104}" y="82" width="14" height="38" fill="#7d878d"/><rect x="${x+8}" y="210" width="40" height="18" fill="#f2c94c" stroke="#a5821f"/></g>`).join("")}
     <rect x="470" y="176" width="150" height="60" rx="28" fill="#cfd5d8" stroke="#8d989e" stroke-width="2"/><rect x="480" y="230" width="10" height="10" fill="#7d878d"/><rect x="598" y="230" width="10" height="10" fill="#7d878d"/>
     <g fill="#e8632b">${[360,520,600].map(x=>`<polygon points="${x},300 ${x+8},276 ${x+16},300"/>`).join("")}</g>
     ${worker(300,318,{s:1.1})}${worker(420,318,{s:1.15,hat:false,vest:false,arm:14})}`;
    if(bb) g+=box(398,192,44,36,"No hard hat · 0.87")+box(398,228,44,52,"No hi-vis vest · 0.79","#ff8a1e","right");
  } else if(kind==="excl"||kind==="load"){
    g+=sky("#a7bfcc","#e6ecef")+`<rect x="0" y="210" width="640" height="150" fill="#b7a98e"/>
     <rect x="30" y="40" width="10" height="170" fill="#e1a21a"/><line x1="35" y1="44" x2="330" y2="24" stroke="#e1a21a" stroke-width="7"/><line x1="35" y1="44" x2="0" y2="52" stroke="#e1a21a" stroke-width="7"/>`;
    if(kind==="excl"){
      g+=`<line x1="250" y1="28" x2="250" y2="120" stroke="#3a3a3a" stroke-width="2"/><rect x="222" y="120" width="56" height="26" fill="#8a6a45" stroke="#5c4429"/>
       <polygon points="150,236 510,236 610,348 50,348" fill="rgba(255,90,54,.16)" stroke="#ff5a36" stroke-width="2.5" stroke-dasharray="12 7"/>
       <text x="330" y="226" font-family="Arial" font-size="11" font-weight="700" fill="#b23a1c" text-anchor="middle">EZ-3 · configured exclusion zone (load path)</text>
       <g fill="#e8632b">${[[150,236],[510,236],[50,346],[600,346]].map(([x,y])=>`<polygon points="${x-8},${y} ${x},${y-22} ${x+8},${y}"/>`).join("")}</g>
       <g><rect x="420" y="250" width="150" height="34" rx="6" fill="#e1a21a"/><rect x="500" y="214" width="46" height="38" rx="4" fill="#d18f10"/><rect x="508" y="220" width="30" height="20" fill="#9cc3d4"/>
        <circle cx="446" cy="290" r="14" fill="#2d2d2d"/><circle cx="548" cy="290" r="14" fill="#2d2d2d"/><line x1="440" y1="256" x2="360" y2="200" stroke="#d18f10" stroke-width="10"/></g>
       ${worker(o.wx??270,330,{s:1.05,arm:18,hat:!o.nh})}${worker(90,226,{s:.6})}`;
      const wx=o.wx??270, inz=wx>=200;
      if(bb&&inz) g+=box(wx-26,206,54,130,"Inside EZ-3 · 0.81","#ff5a36","right")+(o.nh?box(wx-17,213,34,30,"No hard hat · 0.84","#24a39a","left"):"");
      else if(o.ov) g+=`<rect x="${wx-26}" y="206" width="54" height="130" fill="none" stroke="#3fb36b" stroke-width="2" stroke-dasharray="6 4" rx="4"/><text x="${wx-24}" y="200" font-family="Arial" font-size="11" font-weight="700" fill="#3fb36b">person · tracking</text>`;
    } else {
      g+=`<line x1="300" y1="26" x2="300" y2="150" stroke="#3a3a3a" stroke-width="2"/><path d="M294 150 q6 10 12 0" stroke="#3a3a3a" stroke-width="3" fill="none"/>
       <line x1="300" y1="156" x2="250" y2="176" stroke="#3a3a3a" stroke-width="1.5"/><line x1="300" y1="156" x2="350" y2="176" stroke="#3a3a3a" stroke-width="1.5"/>
       <rect x="230" y="176" width="140" height="22" fill="#7f8b93" stroke="#55606a"/><rect x="230" y="198" width="140" height="10" fill="#6c7780"/>
       <ellipse cx="300" cy="330" rx="90" ry="14" fill="rgba(0,0,0,.18)"/>
       ${worker(300,334,{s:1.05,arm:20})}${worker(520,300,{s:.85,arm:40,arm2:40})}`;
      if(bb) g+=box(222,168,156,48,"Suspended load · 0.84","#ef7d22")+box(276,222,50,116,"Worker below","#e5533d","right");
    }
  } else if(kind==="edge"||kind==="hot"){
    g+=sky("#9db7c6","#e3eaee")+`<rect x="0" y="250" width="640" height="110" fill="#b9a98f"/>
     <g fill="#c9cdd0"><rect x="40" y="90" width="18" height="160"/><rect x="200" y="90" width="18" height="160"/><rect x="360" y="90" width="18" height="160"/></g>
     <polygon points="0,205 470,205 470,222 0,222" fill="#9aa2a7"/><polygon points="0,180 470,180 470,205 0,205" fill="#d4d7d9"/><rect x="0" y="70" width="470" height="20" fill="#a7afb4"/>
     <rect x="470" y="180" width="170" height="70" fill="url(#sk${K})" opacity=".6"/><rect x="520" y="230" width="90" height="20" fill="#8d969b"/>`;
    if(kind==="edge"){
      g+=`<g stroke="#e8c20f" stroke-width="4"><line x1="0" y1="150" x2="300" y2="150"/><line x1="0" y1="166" x2="300" y2="166"/></g><g stroke="#e8c20f" stroke-width="5"><line x1="300" y1="140" x2="300" y2="182"/></g>
       ${worker(150,182,{s:.9})}${worker(440,182,{s:.95,arm:20})}`;
      if(bb) g+=box(300,96,180,94,"Unprotected edge · 0.90","#e5533d");
    } else {
      g+=`<g stroke="#e8c20f" stroke-width="4"><line x1="0" y1="150" x2="470" y2="150"/><line x1="0" y1="166" x2="470" y2="166"/></g>
       ${worker(330,182,{s:.95,arm:60,suit:"#4b5a63",hc:"#2f3b44"})}<rect x="354" y="120" width="10" height="10" fill="#ffd25a"/>
       ${Array.from({length:22},(_,i)=>{const a=(i*37)%100/100, x=360+((i*53)%60)-20, y=130+((i*29)%100);return `<circle cx="${x}" cy="${y+a*40}" r="${1.5+a*1.5}" fill="#ffb02e"/>`;}).join("")}
       <rect x="330" y="215" width="60" height="30" fill="#c08a3e" opacity=".8"/>`;
      if(bb) g+=box(300,104,110,140,"Hot work · 0.72","#d6336c")+box(60,120,180,60,"No fire watch seen","#d6336c");
    }
  } else if(kind==="house"){
    g+=sky("#9fb6c3","#e5ebee")+`<rect x="0" y="230" width="640" height="130" fill="#c2b08f"/>
     <polygon points="200,230 440,230 560,360 80,360" fill="#d9ccb0"/><text x="320" y="246" font-family="Arial" font-size="10" font-weight="700" fill="#8a7a55" text-anchor="middle">MAIN WALKWAY</text>
     <g fill="#6e7c86"><rect x="20" y="140" width="170" height="92"/><rect x="28" y="150" width="154" height="10" fill="#8a98a1"/></g>
     <g fill="#b1784a"><rect x="460" y="206" width="160" height="12"/><rect x="460" y="220" width="160" height="12"/></g>
     <path d="M60 300 C 200 280, 260 330, 400 300 S 560 320, 620 290" stroke="#f28a1e" stroke-width="5" fill="none"/><path d="M40 320 C 180 340, 300 300, 600 335" stroke="#2f6db5" stroke-width="5" fill="none"/>
     <rect x="280" y="262" width="40" height="14" fill="#8f9aa1" transform="rotate(12 300 270)"/><rect x="350" y="282" width="30" height="10" fill="#9c7a52"/>
     ${worker(470,300,{s:.9})}`;
    if(bb) g+=box(60,272,560,74,"Cords / hoses across walkway · 0.76","#5b97d6");
  } else if(kind==="gate"){
    g+=sky("#a3bac7","#e7edf0")+`<rect x="0" y="200" width="640" height="160" fill="#b3ab9b"/><polygon points="250,200 390,200 640,360 0,360" fill="#7f868b"/>
     <line x1="320" y1="210" x2="320" y2="360" stroke="#e8e8e8" stroke-width="4" stroke-dasharray="18 14"/>
     <rect x="96" y="150" width="70" height="60" fill="#d6dde1" stroke="#8a97a0"/><rect x="106" y="162" width="24" height="18" fill="#9cc3d4"/>
     <g><rect x="330" y="180" width="160" height="60" fill="#e8e9ea" stroke="#8a97a0"/><rect x="490" y="196" width="50" height="44" fill="#2f6db5"/><rect x="502" y="204" width="28" height="16" fill="#9cc3d4"/><circle cx="360" cy="246" r="12" fill="#2d2d2d"/><circle cx="460" cy="246" r="12" fill="#2d2d2d"/><circle cx="520" cy="246" r="12" fill="#2d2d2d"/></g>
     ${worker(300,262,{s:.8})}`;
    if(bb) g+=box(282,176,40,90,"Pedestrian · 0.78","#ef7d22","left")+box(330,178,212,80,"Truck backing","#e5533d");
  } else if(kind==="elec"){
    g+=`<rect width="640" height="360" fill="#d0d5d8"/><rect x="0" y="0" width="640" height="150" fill="#c3c9cc"/><rect x="0" y="300" width="640" height="60" fill="#a5adb1"/>
     <g fill="#59656c"><rect x="60" y="120" width="90" height="180"/><rect x="160" y="120" width="90" height="180"/></g>
     <rect x="300" y="110" width="120" height="190" fill="#7d8a92" stroke="#4b565d" stroke-width="2"/><rect x="312" y="124" width="96" height="160" fill="#2a3238"/>
     ${Array.from({length:6},(_,i)=>`<rect x="322" y="${134+i*24}" width="76" height="12" fill="#c9a227"/>`).join("")}
     <polygon points="420,110 470,124 470,290 420,300" fill="#97a3aa" stroke="#4b565d" stroke-width="2"/>
     <polygon points="300,96 340,70 380,96 340,104" fill="#f2c230" stroke="#9b7a10"/><text x="340" y="94" font-family="Arial" font-size="16" font-weight="900" fill="#222" text-anchor="middle">⚡</text>
     ${worker(520,300,{s:1,arm:-30,arm2:50})}`;
    if(bb) g+=box(296,106,180,198,"Panel open · 0.79","#e3b51e")+box(490,176,60,128,"No arc-flash PPE","#e5533d","left");
  } else if(kind==="trench"){
    g+=sky("#a9bfcb","#e5ebee")+`<rect x="0" y="170" width="640" height="190" fill="#b49a76"/>
      <polygon points="140,200 500,200 470,330 170,330" fill="#7a6248"/><polygon points="170,330 470,330 470,345 170,345" fill="#5f4b36"/>
      <path d="M520 205 q50 -70 110 0 z" fill="#9c8262"/>
      <rect x="40" y="140" width="80" height="40" rx="4" fill="#e1a21a"/><rect x="90" y="120" width="10" height="30" fill="#e1a21a" transform="rotate(30 95 120)"/>
      ${worker(320,325,{s:.9})}`;
    if(bb) g+=box(160,198,320,140,"No protective system · 0.74","#a8673a");
  }
  return `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">${g}</svg>`;
}

/* ---------- helpers ---------- */
const KN = {ax:"AXIS", ws:"WSAFE", pc:"PROCORE", none:"—", ph2:"PHASE 2"};
const chip = (k,txt)=>`<span class="chip c-${k}"><i>${KN[k]}</i>${txt?` ${txt}`:""}</span>`;
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.toggle("top",ST.step===4||ST.step===6);t.classList.add("on");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("on"),3200);}
const isDone = x => ST.dismissed[x.id]||ST.ok[x.id]||(ST.approved&&x.id===HERO);
const srcTag = k => `<span class="srct s-${k}">${k==="aoa"?"Axis analytic → WSafe":k==="edge"?"ACAP edge · Phase 2":"WSafe cloud · RTSP"}</span>`;

/* ---------- WSafe AI ops console (dark) — WSafe's own UI, not Axis software ---------- */
function ops(task, inner, extra){
  const tabs=[["live","Live view",2],["alerts","Alerts",3],["map","Site risk map",5]];
  const open=DET.filter(d=>!isDone(d)).length;
  return `<div class="sd fade-in">
   <div class="sd-top"><div class="sd-app"><span class="lchip"><img src="${LOGO}" alt="WSafe AI"></span>Ops <small>concept</small></div>
    ${tabs.map(([k,l,g])=>`<div class="sd-tab ${task===k?"on":""}" data-go="${g}">${l}${k==="alerts"&&ST.arrived&&open?` <span class="cnt">${open}</span>`:""}</div>`).join("")}
    <div class="sd-sp"></div>
    <div class="sd-meta"><span><b>Sample DC Campus · Hall 3</b></span><span class="clk">${extra&&extra.clock||"10:42:31 AM CT"}</span><span class="av" title="Site safety lead (sample)">SL</span></div></div>
   <div class="sd-rib">⚠ WSafe AI's own console (concept mock). Not Axis software; no Axis logos; no endorsement. Sample data; classes beyond PPE + exclusion zone are planned.<span class="sp"></span><span class="wslink"><i></i>6 Axis cameras · RTSP + MQTT (mock)</span></div>
   <div class="sd-body">${inner}</div></div>`;
}
/* ---------- WSafe web console (light, brand) ---------- */
function wsc(active, inner){
  const pend = DET.filter(d=>!isDone(d)).length;
  return `<div class="wsc fade-in"><div class="ws-head"><img src="${LOGO}" alt="WSafe AI">
   <div class="tabs"><a class="${active==="dev"?"on":""}" data-go="1">Axis devices</a><a class="${active==="rev"?"on":""}" data-go="4">Review queue ${pend?`<span class="b">${pend}</span>`:""}</a><a data-go="5">Site risk map</a><a class="${active==="arch"?"on":""}" data-go="6">Integration</a></div>
   <div class="sp"></div>
   <span class="illus">Sample data</span>
   <div class="conn"><i></i>Axis · VAPIX / RTSP / MQTT <span class="tag gray">mock</span></div>
   <div class="user"><div class="avatar">CP</div><div><b>Competent Person</b><div class="muted" style="font-size:11px">sample reviewer · Safety</div></div></div></div>
   <div class="ws-body">${inner}</div></div>`;
}
function tile(c, o={}){
  const ds=DET.filter(d=>d.cam===c.id&&!(d.id===HERO&&!ST.arrived)), top=ds.sort((a,b)=>a.pri-b.pri)[0];
  const sc = c.id==="AX-06" ? scene("excl",{boxes:ST.arrived,ov:!ST.arrived,nh:true,wx:ST.arrived?270:110,k:"t"+c.id}) : scene(c.scene,{boxes:!!top,k:"t"+c.id});
  return `<div class="tile ${o.alarm?"alarm":""} ${o.sel?"sel":""}" data-focus="${c.id}">${sc}
   <div class="tl"><span class="rec"></span>${c.id} · ${c.n}<span class="sp"></span><span class="smp">SAMPLE</span></div>
   <div class="bl">${top?`<span class="tbadge">${hchip(top.cls)} <span class="pri p${top.pri}">P${top.pri}</span> ${top.conf.toFixed(2)}</span>`:`<span class="tbadge" style="color:#86d3a2">● No hazards</span>`}<span class="sp"></span>${c.model.replace("AXIS ","")} · ${c.fps} fps</div></div>`;
}

/* ---------- screens ---------- */
const S = {};
S[0]=()=>`<div class="cover fade-in"><div class="box">
  <div><img class="logo" src="${LOGO}" alt="WSafe AI">
   <h1>WSafe AI + Axis Communications<br><span>Axis camera events → verified hazard alerts</span></h1>
   <p>Clickable concept prototype of how WSafe AI would work with Axis network cameras already installed on a jobsite. Video comes in over <b>RTSP</b>, device events (including <b>AXIS Object Analytics</b>) arrive over <b>MQTT / VAPIX</b>, and WSafe AI checks them across <b>${HC.length} hazard classes and ${NSUB} sub-hazards</b> (PPE, exclusion zones, fall exposure, equipment proximity, and more). A Competent Person approves each finding before it reaches people, the VMS, or Procore. A WSafe AI Edge app on the camera (<b>ACAP</b>) is shown as Phase 2.</p>
   <div class="note orange" style="margin:10px 0"><span class="ic">!</span><div><b>Concept prototype. Illustrative sample data.</b> WSafe AI is not yet deployed and this Axis integration has not been built or tested. WorkSafeAgent is pre-revenue, with no customers or pilots. The MVP covers PPE (hard hat, hi-vis) and exclusion-zone entry; other classes are planned. Camera models are sample inventory only. Built from Axis's public developer documentation; <b>no Axis partnership, certification, or endorsement</b> is claimed or implied.</div></div>
   <div style="display:flex;gap:12px;align-items:center;margin-top:12px"><button class="btn orange" data-go="1" style="font-size:14.5px;padding:10px 20px">Start walkthrough →</button><span class="muted" style="font-size:12px">Next / Back, ← → keys, or click the highlighted items.</span></div>
   <div class="legal">WorkSafeAgent LLC (WSafe AI) · Abilene, TX · Patent pending (US 63/992,261) · Draft, Oct 2026. Also available: <a href="wsafeai-axis-prototype-walkthrough.pdf" target="_blank" rel="noopener">walkthrough PDF</a>.<br>"Axis", "AXIS OS", "VAPIX", "ACAP", "AXIS Object Analytics", and "Procore" are referenced by name only to describe the planned integration. All screens are WSafe AI concept mocks, not Axis or Procore software, and imply no endorsement.</div>
  </div>
  <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);font-weight:800;margin:4px 0 8px">Walkthrough</div>
   <ol>${STEPS.slice(1).map((s,i)=>{const w=[["w-ws","WSafe · Axis devices"],["w-sd","WSafe Ops"],["w-sd","Axis event → WSafe"],["w-ws","WSafe review"],["w-sd","WSafe Ops"],["w-pc","Architecture"]][i];return `<li data-go="${i+1}"><b>${i+1}</b>${s.t.split(" — ")[0]}<em class="${w[0]}">${w[1]}</em></li>`;}).join("")}</ol>
   <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);font-weight:800;margin:12px 0 6px">Hazard classes</div>
   <div class="hcwrap">${HC.map(h=>`<span class="hcl">${hchip(h.id)}<span>${h.l}</span>${h.st==="mvp"?'<em class="stp mvp">MVP</em>':""}</span>`).join("")}</div>
   <div class="flow"><span class="d">Axis cameras · RTSP + MQTT events</span>→<span>WSafe AI cloud</span>→<span>Human review</span>→<span class="p">Alerts · VMS · Procore</span></div>
  </div></div></div>`;

S[1]=()=>{const c=cam(ST.devSel), ds=DET.filter(d=>d.cam===c.id);
 const edgeT={cloud:'<span class="tag gray">Cloud only</span>', plan:'<span class="tag purple">Planned · Phase 2</span>'};
 return wsc("dev",`
  <div style="flex:1.45;min-width:0;display:flex;flex-direction:column;gap:8px">
   <div style="display:flex;align-items:center;gap:10px"><div><div style="font-size:18px;font-weight:800">Axis devices <span class="tag gray" style="vertical-align:3px">Sample DC Campus · Hall 3 expansion</span></div><div class="muted" style="font-size:12.3px">Cameras already on site. WSafe connects to each one with a dedicated service account; no new hardware.</div></div>
    <button class="btn orange" id="btnAddDev" style="margin-left:auto">+ Add Axis device</button></div>
   <div class="hkp"><div><div class="v">6 <small>cameras</small></div><div class="l">+1 horn speaker (output)</div></div><div><div class="v" style="color:var(--green)">6/6</div><div class="l">RTSP streams healthy</div></div><div><div class="v">7</div><div class="l">AOA scenarios subscribed</div></div><div><div class="v">0 <small>of 2</small></div><div class="l">ACAP edge (Phase 2)</div></div></div>
   <div class="card" style="padding:0;overflow:hidden;flex:1;min-height:0">
    <table class="t dev"><thead><tr><th>Device</th><th>Model (sample)</th><th>AXIS OS</th><th>Video</th><th>Events</th><th>AOA scenarios</th><th>ACAP WSafe AI Edge</th><th>Hazards today</th></tr></thead><tbody>
     ${CAMS.map(x=>{const n=DET.filter(d=>d.cam===x.id);return `<tr class="click ${x.id===c.id?"sel":""}" data-dev="${x.id}"><td><b>${x.id}</b> <span class="muted">${x.n}</span></td><td>${x.model} <span class="muted">· ${x.type}</span></td><td>${x.os}</td><td><span class="okd"></span>RTSP · ${x.fps} fps</td><td><span class="okd"></span>MQTT</td><td>${x.aoa.length||'<span class="muted">—</span>'}</td><td>${edgeT[x.edge]}</td><td>${n.map(d=>hchip(d.cls)).join(" ")||'<span class="muted">none</span>'}</td></tr>`;}).join("")}
     <tr class="spk"><td><b>${SPK.id}</b> <span class="muted">${SPK.n}</span></td><td>${SPK.model} <span class="muted">· horn speaker</span></td><td>12.x</td><td class="muted">— (audio output)</td><td><span class="okd"></span>VAPIX</td><td class="muted">—</td><td class="muted">n/a</td><td><span class="tag purple">Audio · planned</span></td></tr>
    </tbody></table>
    <div class="muted" style="font-size:11px;padding:5px 10px;border-top:1px solid var(--line)">Model names are sample inventory for illustration; WSafe would read the real model, firmware, and capabilities from each device over VAPIX. IPs are private sample addresses.</div></div>
  </div>
  <div class="card devd">
   <div style="display:flex;align-items:center;gap:8px"><b style="font-size:15px">${c.id} · ${c.n}</b><span class="tag green" style="margin-left:auto">● Connected (mock)</span></div>
   <div class="shot" style="margin:7px 0">${scene(c.scene==="excl"?"excl":c.scene,{k:"dv",ov:c.id==="AX-06",wx:110})}<div class="cap">${c.model} · ${c.ip} · sample frame<span class="sp"></span>live</div></div>
   <dl class="kv lt"><dt>Connect</dt><dd>VAPIX over HTTPS · digest auth · service account <span class="muted">wsafe-svc</span></dd>
    <dt>Device info</dt><dd><span class="mono">/axis-cgi/basicdeviceinfo.cgi</span> <span class="muted">getAllProperties</span></dd>
    <dt>Video</dt><dd><span class="mono">rtsp://${c.ip}/axis-media/media.amp</span> <span class="muted">H.264 · 1080p · ${c.fps} fps</span></dd>
    <dt>Events</dt><dd>MQTT Event Bridge → <span class="mono">mqtts://broker.wsafeai.example</span> <span class="muted">(or WebSocket event stream)</span></dd>
    <dt>AOA scenarios</dt><dd>${c.aoa.length?c.aoa.map(a=>`<div>${a}</div>`).join(""):'<span class="muted">none · WSafe cloud detection only</span>'}</dd>
    <dt>Edge app</dt><dd>${c.edge==="plan"?"WSafe AI Edge (ACAP) · <b>planned, Phase 2</b> · not built":"Cloud detection (RTSP)"}</dd>
    <dt>Coverage</dt><dd>${c.id==="AX-06"?`${hchip("zone")} ${hchip("struck")} ${hchip("ppe")}`:c.id==="AX-03"?`${hchip("fall")} ${hchip("ppe")} ${hchip("fire")}`:c.id==="AX-05"?`${hchip("elec")} ${hchip("egress")}`:`${hchip("ppe")} ${hchip("house")} ${hchip("struck")}`}</dd></dl>
   <div style="display:flex;gap:6px;margin-top:auto;padding-top:6px"><button class="btn" id="btnTestDev" style="padding:6px 10px;font-size:12px">Test connection</button><button class="btn primary" data-go="2" style="padding:6px 10px;font-size:12px;margin-left:auto">Open live view →</button></div>
  </div>`);};

S[2]=()=>{const f=cam(ST.focus), al=ST.arrived, fd=DET.filter(d=>d.cam===f.id&&!(d.id===HERO&&!al));
 const big = f.id==="AX-06" ? scene("excl",{boxes:al,ov:!al,nh:true,wx:al?270:110,k:"bg"}) : scene(f.scene,{boxes:fd.length>0,k:"bg"});
 return ops("live",`
  <div class="pane" style="flex:1.3;min-width:0"><div class="pane-h">Live view · Hall 3 (6 Axis cameras)<span class="sp"></span><span class="tg">WSafe overlays on · sample frames</span></div>
   <div class="tiles">${CAMS.map(c=>tile(c,{alarm:al&&c.id==="AX-06",sel:c.id===f.id})).join("")}</div></div>
  <div class="pane" style="flex:1;min-width:0;padding:8px;gap:6px">
   <div class="dshot">${big}<div class="tl">${f.id} · ${f.n}<span class="sp"></span><span class="smp">ILLUSTRATIVE PLACEHOLDER</span></div><div class="bl">${f.model} · RTSP H.264 · WSafe overlay<span class="sp"></span>● LIVE (sample)</div></div>
   <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.8px;color:var(--d-mu);font-weight:700">WSafe detections on ${f.id}</div>
   <div class="dlist">${fd.length?fd.map(d=>`<div class="drow ${d.id===HERO?"hot":""}">${hchip(d.cls)}<span class="dn">${d.hz}</span><span class="pri p${d.pri}">P${d.pri}</span><b>${d.conf.toFixed(2)}</b></div>`).join(""):`<div class="drow"><span class="dn" style="color:#86d3a2">${f.id==="AX-06"?"Person tracked outside EZ-3 · no hazard":"No hazards in view"}</span></div>`}</div>
   <div class="dnote b">Overlays are drawn in WSafe's console over the Axis stream. Drawing them on the camera's own stream with an ACAP app (Bounding Box API) is Phase 2.</div>
  </div>
  ${al?`<div class="newal" data-go="3"><div class="h"><span class="pri p1">P1</span>Axis event → WSafe alert ${hchip("zone")}${hchip("ppe")}</div><div class="t">Person inside EZ-3 during pick · no hard hat</div><div class="s">AX-06 · AXIS Object Analytics “Object in area” → verified by WSafe AI · 10:42:30 AM CT</div><div style="display:flex;gap:8px;margin-top:8px"><button class="dbtn or" data-go="3">View alert ›</button><span style="font-size:10.5px;color:#9aa8b1;align-self:center">Event received over MQTT (mock)</span></div></div>`:""}`,{clock:al?"10:42:31 AM CT":"10:42:24 AM CT"});};

S[3]=()=>{const d=det(HERO), aoa=ST.evsrc==="aoa";
 return ops("alerts",`
  <div class="pane" style="width:262px;flex:0 0 262px"><div class="pane-h">Axis device events<span class="sp"></span><span class="tg">MQTT · live (sample)</span></div>
   <div class="evf">${EVF.map(e=>`<div class="ev ${e[5]?"hot":""}"><div><span class="tm">${e[0]}</span><b>${e[1]}</b>${e[5]?'<span class="wsb" style="margin-left:auto">→ WSafe alert</span>':""}</div><div class="tp">${e[2]}</div><div class="ds">${e[3]} · <span class="mono">${e[4]}</span></div></div>`).join("")}</div>
   <div class="more">Topics abbreviated from <span class="mono">axis/&lt;serial&gt;/event/CameraApplicationPlatform/…</span></div></div>
  <div class="pane" style="flex:1.15;min-width:0"><div class="pane-h">Alert A-3108 · WSafe AI<span class="sp"></span><span class="st act" style="text-transform:none;letter-spacing:0"><i></i>Awaiting review</span></div>
   <div style="padding:8px 10px;display:flex;flex-direction:column;gap:7px;min-height:0">
    <div class="dshot">${scene("excl",{boxes:true,nh:true,k:"al"})}<div class="tl">AX-06 · Crane pick zone<span class="sp"></span><span class="smp">ILLUSTRATIVE PLACEHOLDER</span></div><div class="bl">Snapshot · 10:42:30 AM CT · sample frame, not real footage<span class="sp"></span>boxes by WSafe</div></div>
    <div style="display:flex;align-items:center;gap:7px"><span class="pri p1">P1</span>${hchip("zone")}${hchip("ppe")}<b style="font-size:13.5px;color:#fff">Person inside EZ-3 during pick · hard hat missing</b></div>
    <div class="evl">
     <div class="e"><span class="tm">10:42:29.4</span><span class="d o"></span><span class="x">AXIS Object Analytics · Object in area (Human) active on AX-06<small>Scenario “EZ-3 load path”, received over MQTT Event Bridge</small></span></div>
     <div class="e"><span class="tm">10:42:29.6</span><span class="d"></span><span class="x">WSafe grabs frames from the RTSP stream (−2 s … +2 s)<small>No continuous upload needed for this check</small></span></div>
     <div class="e"><span class="tm">10:42:30.2</span><span class="d o"></span><span class="x">WSafe AI verifies: person in EZ-3 (0.81) · no hard hat (0.84)<small>Crane pick active (Occupancy in area = 3) → raised to P1</small></span></div>
     <div class="e"><span class="tm">10:42:30.5</span><span class="d g"></span><span class="x">Alert A-3108 raised · queued for Competent Person review</span></div>
    </div>
    <div style="display:flex;gap:7px;margin-top:auto"><button class="dbtn or" id="btnOpenReview">Open review with evidence clip ↗</button><button class="dbtn" id="btnRadio">Notify rigger lead (radio)</button></div>
   </div></div>
  <div class="pane" style="flex:1;min-width:0"><div class="pane-h">How this alert was raised<span class="sp"></span><span class="tg">sample payloads</span></div>
   <div style="padding:8px 10px;display:flex;flex-direction:column;gap:7px;min-height:0;overflow:hidden">
    <div class="seg"><button data-evsrc="aoa" class="${aoa?"on":""}">Axis analytic + WSafe · MVP</button><button data-evsrc="edge" class="${!aoa?"on":""}">ACAP WSafe AI Edge · Phase 2</button></div>
    ${aoa?`<div class="dnote b" style="margin:0">The camera's built-in <b>AXIS Object Analytics</b> watches the EZ-3 area. Its event is published to WSafe's MQTT broker by the camera's <b>MQTT Event Bridge</b>; WSafe then adds PPE and context checks.</div>
     <div class="code"><div class="ch">MQTT topic</div>axis/B8A44F0000A6/event/CameraApplicationPlatform/<br>&nbsp;&nbsp;ObjectAnalytics/Device1Scenario1</div>
     <div class="code"><div class="ch">Payload (abbreviated sample)</div>{ "topic": "…/ObjectAnalytics/Device1Scenario1",<br>&nbsp;&nbsp;"timestamp": 1791387749400,<br>&nbsp;&nbsp;"message": { "source": {}, "key": {},<br>&nbsp;&nbsp;&nbsp;&nbsp;"data": { "active": "1" } } }</div>
     <div class="code"><div class="ch">Set up once over VAPIX</div>/axis-cgi/mqtt/client.cgi · configureClient, activateClient<br>/axis-cgi/mqtt/event.cgi · configureEventPublication</div>`
    :`<div class="dnote b" style="margin:0"><b>Planned, not built.</b> A WSafe AI Edge app (ACAP Native SDK) on capable cameras would read frames with the <b>VDO</b> API, run the PPE / zone model with <b>Larod</b> on the camera's deep-learning processor, and publish only hazard events + a snapshot, so no continuous video leaves the site.</div>
     <div class="code"><div class="ch">Event (planned app event · sample)</div>topic: CameraApplicationPlatform/WSafeAIEdge/HazardDetected<br>{ "class": "zone", "sub": "person_in_ez", "conf": 0.81,<br>&nbsp;&nbsp;"ppe": { "hard_hat": false, "conf": 0.84 },<br>&nbsp;&nbsp;"snapshot": "evidence/2051.jpg" }</div>
     <div class="code"><div class="ch">Packaging</div>.eap package · manifest.json · Event API (axevent) · MQTT out</div>
     <div class="dnote" style="margin:0">Best for jobsites with limited uplink. The cloud path (first tab) stays the MVP.</div>`}
   </div></div>`,{clock:"10:42:33 AM CT"});};

const FR=[{wx:10,l:"−6 s"},{wx:80,l:"−4 s"},{wx:160,l:"−2 s"},{wx:270,l:"detection"},{wx:300,l:"+2 s"},{wx:330,l:"+4 s"}];
function clipView(d){
  if(d.scene!=="excl"||d.id!==HERO) return `<div class="shot">${scene(d.scene,{boxes:true,k:"r"+d.id})}<div class="cap">${d.cam} · ${camN(d.cam)} · ${d.t} CT<span class="sp"></span>sample frame · not real footage</div></div>`;
  const f=FR[ST.pf];
  return `<div class="shot clip">${scene("excl",{boxes:true,nh:true,wx:f.wx,ov:true,k:"clip"})}<div class="cap"><span class="pbtn" id="btnPlay">${ST.play?"❚❚":"▶"}</span>&nbsp;Evidence clip · AX-06 · ${f.l}<span class="sp"></span>sample · not real footage</div></div>
   <div class="scrub">${FR.map((x,i)=>`<span class="${i===ST.pf?"on":""} ${i===3?"det":""}" data-pf="${i}">${x.l}</span>`).join("")}</div>`;
}
S[4]=()=>{const d=det(), h=HCM[d.cls], sb=h.subs[d.sub]||h.subs[0], done=isDone;
 const pend=DET.filter(x=>!done(x)).length, heroOk=ST.approved;
 return wsc("rev",`
  <div class="qcol">
   <div class="qh"><span>Review queue · ${pend} open</span><span class="muted" style="font-weight:600;text-transform:none;letter-spacing:0">${new Set(DET.map(x=>x.cls)).size} classes</span></div>
   ${DET.map(x=>{const dn=done(x), hx=HCM[x.cls], sx=hx.subs[x.sub]||hx.subs[0];return `<div class="qi ${x.id===d.id?"on":""} ${dn?"done":""}" data-sel="${x.id}" title="${x.hz} · ${x.cam}"><div class="th">${scene(x.scene,{boxes:true,nh:x.o&&x.o.nh,k:"q"+x.id})}</div>
     <div class="m"><b>${hchip(x.cls)}<span class="qt">${x.id===HERO?"Inside EZ-3 + no hard hat":sx[0]}</span></b><span>${x.cam} · ${x.conf.toFixed(2)} · <span class="pri p${x.pri} lt">P${x.pri}</span> ${dn?`<span class="tag ${ST.dismissed[x.id]?"gray":"green"}" style="font-size:9.5px;padding:0 6px">${ST.dismissed[x.id]?"Rejected":"Approved"}</span>`:hx.st==="mvp"?'<em class="stp mvp">MVP</em>':'<em class="stp later">Planned</em>'}</span></div></div>`;}).join("")}
  </div>
  <div style="flex:1.15;min-width:0;display:flex;flex-direction:column;gap:7px">
   <div style="display:flex;align-items:center;gap:8px;min-width:0"><div style="font-size:15.5px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.id} · ${d.hz}</div><span class="tag ${done(d)?(ST.dismissed[d.id]?"gray":"green"):"orange"}">${done(d)?(ST.dismissed[d.id]?"Rejected":"Approved"):"Needs review"}</span></div>
   ${clipView(d)}
   <div style="display:flex;gap:6px;align-items:center;font-size:11.5px;flex-wrap:wrap">${srcTag(d.src)}<span class="muted">${d.cam} · ${cam(d.cam).model||""} · ${d.t} CT</span></div>
   <div class="card" style="padding:8px 11px"><dl class="kv lt"><dt>Evidence</dt><dd>${d.id===HERO?"12 s clip (−6 s … +6 s) cut from the AX-06 RTSP stream + snapshot":"Snapshot + short clip from the camera's RTSP stream"}</dd><dt>Trigger</dt><dd>${d.src==="aoa"?"AXIS Object Analytics event (MQTT), verified by WSafe AI":"WSafe AI detection on the live stream"}</dd><dt>Full video</dt><dd>Stays on site (camera edge storage or the site's VMS)</dd></dl></div>
   ${h.st!=="mvp"?`<div class="note orange" style="font-size:11.5px;padding:6px 10px"><span class="ic">!</span><div><b>${h.l}</b> is a planned class (${STL[h.st]}), shown with sample data. It is not in the MVP model.</div></div>`:`<div class="note" style="font-size:11.5px;padding:6px 10px"><span class="ic">i</span><div><b>${h.l}</b> is in the MVP (with ${d.cls==="zone"?"PPE":"exclusion-zone entry"}).</div></div>`}
  </div>
  <div class="card" style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px;padding:10px 12px">
   ${d.id===HERO&&heroOk?`<h3 style="margin:0">Decision posted <span class="tag green">✓ Approved 10:44 AM</span></h3>
    <div class="steps fade-in">
     <div class="step"><div class="ok">✓</div><div><div class="s-t">Alert to superintendent + rigger lead</div><div class="s-d">SMS / email / app push (sample recipients)</div></div>${chip("ws","notify")}</div>
     <div class="step"><div class="ok">✓</div><div><div class="s-t">Event + bookmark in the site's VMS</div><div class="s-d">Optional, if the site uses a VMS integration</div></div>${chip("ws","VMS")}</div>
     <div class="step"><div class="ok">✓</div><div><div class="s-t">Procore Safety Observation (draft)</div><div class="s-d">Optional, per site · snapshot + clip link</div></div>${chip("pc","create")}</div>
     <div class="step"><div class="ok skip">·</div><div><div class="s-t">Audio warning on AX-07 horn speaker</div><div class="s-d">Planned, site opt-in · triggered over VAPIX</div></div>${chip("ph2","planned")}</div></div>
    <div class="note" style="font-size:11.3px;padding:6px 10px"><span class="ic">i</span><div>Rejected findings close as false positives and help tune that camera's thresholds. Video stays on site except the short evidence clip.</div></div>
    <div style="display:flex;gap:8px;margin-top:auto"><button class="btn primary" data-go="5" style="margin-left:auto">Next: site risk map →</button></div>`
   :`<h3 style="margin:0">Reviewer decision <span class="tag gray">AI suggests · a person decides</span></h3>
   <div style="font-size:12px;display:flex;gap:14px"><span><span class="muted">Confidence</span> <b>${d.conf.toFixed(2)}</b>${d.conf2?` · ${d.id===HERO?"hard hat":"vest"} ${d.conf2.toFixed(2)}`:""}</span><span><span class="muted">Source</span> <b>${d.src==="aoa"?"Axis AOA event":"RTSP stream"}</b></span></div>
   <div class="grid2">
    <div><label class="fl">Hazard class</label><select class="f">${HC.map(x=>`<option ${x.id===d.cls?"selected":""}>${x.code} · ${x.l}</option>`).join("")}</select></div>
    <div><label class="fl">Sub-hazard</label><select class="f">${h.subs.map((s,i)=>`<option ${i===d.sub?"selected":""}>${s[0]}</option>`).join("")}</select></div>
    <div><label class="fl">Suggested OSHA ref.</label><input class="f" value="${/^\d/.test(sb[1])?"29 CFR "+sb[1]:sb[1]}" readonly></div>
    <div><label class="fl">Severity</label><select class="f">${[1,2,3,4].map(p=>`<option ${p===d.pri?"selected":""}>P${p}${p===h.pri?" (class default)":""}</option>`).join("")}</select></div>
   </div>
   ${d.id===HERO?`<label class="chk on"><input type="checkbox" checked><div><b>Also confirm: hard hat missing</b> <span class="muted">(PPE · 0.84 · 1926.100(a))</span></div></label>`:""}
   <div><label class="fl">Reviewer note</label><textarea class="f" rows="2">${d.note}</textarea></div>
   <div style="display:flex;gap:8px;margin-top:auto">${done(d)?`<span class="muted" style="font-size:12px;align-self:center">Decision recorded.</span><button class="btn" data-sel="${HERO}" style="margin-left:auto">Back to ${HERO}</button>`:`<button class="btn danger" id="btnDismiss">✕ Reject (false positive)</button><button class="btn orange" id="btnApprove" style="margin-left:auto">✓ Approve finding</button>`}</div>`}
  </div>`);};
/* ---------- zones (shared by analytics + heat map; approved findings, last 30 days, sample) ---------- */
const ZONES=[
 {id:"Z1",n:"Generator yard",cam:"AX-02",poly:"720,150 905,150 905,345 720,345",c:[812,248],e:[150,120],hrs:300,tr:1.35,k:{ppe:30,zone:9,elec:4,house:6,fire:2}},
 {id:"Z2",n:"Crane pick zone",cam:"AX-06",poly:"440,24 700,24 700,128 440,128",c:[570,76],e:[150,75],hrs:260,tr:1.2,k:{struck:17,zone:16,ppe:9,fall:3}},
 {id:"Z3",n:"Hall 3 · Level 2 deck",cam:"AX-03",poly:"420,152 700,152 700,345 540,345 540,262 420,262",c:[620,230],e:[150,110],hrs:280,tr:1.3,k:{fall:30,ppe:14,house:8,struck:6,health:5,fire:3}},
 {id:"Z4",n:"North laydown",cam:"AX-01",poly:"215,24 420,24 420,128 215,128",c:[318,76],e:[140,75],hrs:300,tr:.85,k:{house:15,ppe:16,struck:4,health:4,zone:3}},
 {id:"Z5",n:"Gate 2 · Haul road",cam:"AX-04",poly:"215,392 985,392 985,462 215,462",c:[600,427],e:[300,52],hrs:310,tr:1.1,k:{struck:9,zone:5,ppe:9,house:3}},
 {id:"Z6",n:"Electrical room B",cam:"AX-05",poly:"420,262 540,262 540,345 420,345",c:[480,304],e:[90,70],hrs:260,tr:1.05,k:{elec:15,egress:6,fire:4,ppe:6,house:4}},
 {id:"Z7",n:"East utility trench",cam:"AX-07",poly:"925,40 985,40 985,380 925,380",c:[955,210],e:[70,150],hrs:240,tr:.95,k:{caught:12,house:3,fall:4,ppe:4,zone:2}},
 {id:"Z8",n:"Hall 2 perimeter (operating)",cam:"AX-05",poly:"25,60 195,60 195,380 25,380",c:[110,220],e:[90,140],hrs:330,tr:1,k:{ppe:2,egress:2,zone:1}}
];
const ACT={fall:["Fall-protection walk-down","Walk the edge and openings with the trade foreman; check guardrail continuity before the next shift."],
 struck:["Lift / traffic plan review","Confirm exclusion barricades and a spotter during picks; separate pedestrian and equipment routes."],
 caught:["Competent Person trench inspection","Check the protective system, spoil setback, and access/egress before entry."],
 elec:["Electrical safety stand-down","Review energized-work permits, arc-flash PPE, and LOTO boundaries with the electrical foreman."],
 ppe:["PPE spot-check + toolbox talk","PPE check at the zone entry at shift start; post a hard hat / hi-vis sign."],
 zone:["Barricade + briefing","Re-mark the exclusion zone and brief crews on the load path."],
 house:["Housekeeping blitz","15-minute clean-up; route cords overhead and clear walkways."],
 fire:["Hot-work permit audit","Check permits, fire watch, and extinguisher placement for hot work in this area."],
 egress:["Egress walk","Clear exit routes; verify confined-space attendant coverage."],
 health:["Ergonomics review (research)","Consider lift aids and task rotation; data is research-grade."]};
function clsAgg(id){ // 30-day review outcomes per class (sample; planned classes simulated)
  const ok=ZONES.reduce((s,z)=>s+(z.k[id]||0),0), a=AN[id], cand=Math.round(ok/a.rate), top=ZONES.slice().sort((x,y)=>(y.k[id]||0)-(x.k[id]||0))[0];
  return {ok,cand,dis:cand-ok,rate:ok/cand,fp:(cand-ok)/cand,tr:a.tr,sp:a.sp,top};
}
function spark(v,col,w=90,h=22){const mx=Math.max(...v),mn=Math.min(...v),r=(mx-mn)||1;const pts=v.map((y,i)=>`${(i/(v.length-1)*w).toFixed(1)},${(h-2-(y-mn)/r*(h-4)).toFixed(1)}`).join(" ");
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/></svg>`;}
const trH = t=>`<span class="trd ${t>5?"up":t<-5?"dn":""}">${t>5?"▲":t<-5?"▼":"■"} ${Math.abs(t)}%</span>`;
/* ---------- Site risk heat map (Phase 2, illustrative) ---------- */
const HCAMS=[{id:"AX-01",x:228,y:136,d:-35},{id:"AX-02",x:712,y:356,d:-40},{id:"AX-03",x:705,y:160,d:150},{id:"AX-04",x:205,y:470,d:-8},{id:"AX-05",x:430,y:356,d:-50},{id:"AX-06",x:430,y:138,d:-30},{id:"AX-07",x:915,y:390,d:-80}];
function zCount(z,c,win){const n=z.k[c]||0; return win===7?Math.round(n*.26*z.tr):win===90?Math.round(n*2.8/Math.pow(z.tr,.35)):n;}
function zRaw(z,f){const {win}=ST.hm, cs=f==="all"?HC.map(h=>h.id):[f]; return cs.reduce((s,c)=>s+zCount(z,c,win)*PW[HCM[c].pri],0)*300/z.hrs;}
function zStats(z){const {win,cls}=ST.hm, cs=cls==="all"?HC.map(h=>h.id):[cls];
  const by=cs.map(c=>[c,zCount(z,c,win)]).filter(b=>b[1]>0).sort((a,b)=>b[1]-a[1]);
  const ref=Math.max(...ZONES.map(q=>zRaw(q,cls)))||1, n=by.reduce((s,b)=>s+b[1],0);
  return {score:zRaw(z,cls)/ref,n,by,dis:Math.round(n*.25),trend:Math.round((z.tr-1)*55)};}
const lvl=s=>s>=.75?"High":s>=.5?"Elevated":s>=.22?"Moderate":"Low";
function heatCol(s){const st=[[0,[63,179,107]],[.4,[241,196,15]],[.7,[243,140,24]],[1,[229,83,61]]];let k=1;while(k<st.length-1&&s>st[k][0])k++;const [a0,c0]=st[k-1],[a1,c1]=st[k],f=Math.max(0,Math.min(1,(s-a0)/(a1-a0)));return `rgb(${c0.map((v,i)=>Math.round(v+(c1[i]-v)*f)).join(",")})`;}
function siteMap(){
  const sel=ST.hm.zone, zs=ZONES.map(z=>[z,zStats(z)]);
  return `<svg class="hm-plan" viewBox="0 0 1000 480" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <defs>${zs.map(([z,s],i)=>`<radialGradient id="hg${i}"><stop offset="0" stop-color="${heatCol(s.score)}" stop-opacity="${s.n?(.22+.6*s.score).toFixed(2):0}"/><stop offset=".55" stop-color="${heatCol(s.score)}" stop-opacity="${s.n?(.1+.3*s.score).toFixed(2):0}"/><stop offset="1" stop-color="${heatCol(s.score)}" stop-opacity="0"/></radialGradient>`).join("")}
   <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#2c3842" stroke-width="3"/></pattern></defs>
  <rect width="1000" height="480" fill="#182026"/>
  <rect x="6" y="6" width="988" height="468" fill="none" stroke="#3a4852" stroke-width="2" stroke-dasharray="10 6"/>
  <rect x="0" y="392" width="1000" height="70" fill="#1f2930"/><line x1="0" y1="427" x2="1000" y2="427" stroke="#4b5a64" stroke-width="2" stroke-dasharray="16 12"/>
  <rect x="25" y="60" width="170" height="320" fill="#25313a" stroke="#4b5a64" stroke-width="2"/><text x="110" y="90" class="pl" text-anchor="middle">HALL 2</text><text x="110" y="105" class="pl sm" text-anchor="middle">OPERATING · LIVE</text>
  <rect x="420" y="152" width="280" height="193" fill="url(#hatch)" stroke="#5a6b76" stroke-width="2"/><text x="560" y="372" class="pl lg" text-anchor="middle">HALL 3 · UNDER CONSTRUCTION</text>
  <circle cx="570" cy="140" r="130" fill="none" stroke="#4b5a64" stroke-width="1.4" stroke-dasharray="4 6"/>
  <rect x="925" y="40" width="60" height="340" fill="url(#hatch)" stroke="#6b5640"/>
  <rect x="740" y="170" width="60" height="40" fill="#2a3640" stroke="#4b5a64"/><rect x="820" y="170" width="60" height="40" fill="#2a3640" stroke="#4b5a64"/><rect x="740" y="232" width="60" height="40" fill="#2a3640" stroke="#4b5a64"/><rect x="820" y="232" width="60" height="40" fill="#2a3640" stroke="#4b5a64"/>
  <text x="900" y="420" class="pl sm" text-anchor="end">HAUL ROAD</text><text x="226" y="455" class="pl sm">GATE 2</text>
  ${zs.map(([z,s],i)=>`<ellipse cx="${z.c[0]}" cy="${z.c[1]}" rx="${z.e[0]}" ry="${z.e[1]}" fill="url(#hg${i})" pointer-events="none"/>`).join("")}
  ${HCAMS.map(c=>{const a0=(c.d-28)*Math.PI/180,a1=(c.d+28)*Math.PI/180,r=100;return `<path d="M${c.x} ${c.y} L${(c.x+r*Math.cos(a0)).toFixed(1)} ${(c.y+r*Math.sin(a0)).toFixed(1)} A${r} ${r} 0 0 1 ${(c.x+r*Math.cos(a1)).toFixed(1)} ${(c.y+r*Math.sin(a1)).toFixed(1)} Z" fill="rgba(74,163,223,.07)" stroke="rgba(74,163,223,.3)" stroke-width="1" stroke-dasharray="4 4" pointer-events="none"/>
    <g transform="translate(${c.x},${c.y})"><rect x="-9" y="-7" width="15" height="14" rx="2" fill="#4aa3df" stroke="#0f1418" stroke-width="1.5"/><text x="0" y="-11" class="zl" style="font-size:9.5px" text-anchor="middle">${c.id}</text></g>`;}).join("")}
  ${zs.map(([z,s],i)=>`<g class="zone ${sel===z.id?"on":""}" data-zone="${z.id}"><polygon class="zp" points="${z.poly}" fill="rgba(255,255,255,.015)"/>
    <circle cx="${z.c[0]}" cy="${z.c[1]}" r="11" class="zb"/><text x="${z.c[0]}" y="${z.c[1]+4}" class="zn" text-anchor="middle">${i+1}</text>
    ${z.id==="Z7"?"":`<text x="${z.c[0]}" y="${z.c[1]+27}" class="zl" text-anchor="middle">${z.n}</text>`}</g>`).join("")}
  <text x="955" y="30" class="zl" text-anchor="middle">TRENCH</text>
  </svg>`;}
function heatPanel(){
  const z=ZONES.find(q=>q.id===ST.hm.zone), f=ST.hm.cls;
  if(!z){const r=ZONES.map(q=>[q,zStats(q)]).sort((a,b)=>b[1].score-a[1].score);
    return `<div class="pane-h">Zones · ${f==="all"?"all classes":HCM[f].code}<span class="sp"></span><span class="tg">${ST.hm.win} days</span></div><div style="padding:7px;overflow:auto">
     ${r.map(([q,s])=>`<div class="hz-row" data-zone="${q.id}"><span class="zb2">${ZONES.indexOf(q)+1}</span><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:12px">${q.n}</div><div style="font-size:10.5px;color:var(--d-mu);display:flex;gap:3px;align-items:center">${s.n} approved · ${s.by.slice(0,3).map(b=>hchip(b[0])).join("")}</div></div><span class="lv ${lvl(s.score)}">${s.n?lvl(s.score):"None"}</span></div>`).join("")}</div>`;}
  const s=zStats(z), all=ZONES.map(q=>q), byAll=HC.map(h=>[h.id,zCount(z,h.id,ST.hm.win)]).filter(b=>b[1]>0).sort((a,b)=>b[1]-a[1]), mx=Math.max(1,...byAll.map(b=>b[1])), top=(f==="all"?byAll[0]:[f])[0]||"ppe";
  return `<div class="pane-h">Zone ${ZONES.indexOf(z)+1} · ${z.cam}<span class="sp"></span><button class="dbtn" id="btnHmClose" style="padding:1px 7px;font-size:11px">✕</button></div>
   <div style="padding:8px 11px;overflow:auto">
    <div style="font-size:15px;font-weight:800;color:#fff">${z.n}</div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:5px"><span style="font-size:11px;color:var(--d-mu);font-weight:700;width:92px">Risk${f==="all"?"":" · "+HCM[f].code}</span><div class="dbar" style="flex:1"><i style="width:${Math.round(s.score*100)}%"></i></div><b>${s.score.toFixed(2)}</b><span class="lv ${lvl(s.score)}">${lvl(s.score)}</span></div>
    <div class="dk"><div><div class="v">${byAll.reduce((t,b)=>t+b[1],0)}</div><div class="l">Approved (all classes)</div></div><div><div class="v" style="color:${s.trend>5?"#ff8a6e":s.trend<-5?"#7dd3a0":"#fff"}">${s.trend>5?"▲":s.trend<-5?"▼":"■"} ${Math.abs(s.trend)}%</div><div class="l">vs prior period</div></div><div><div class="v">${byAll.length}</div><div class="l">Classes seen</div></div></div>
    <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.8px;color:var(--d-mu);font-weight:700;margin:3px 0 3px">Breakdown by hazard class</div>
    ${byAll.map(([c,n])=>`<div class="hb ${f!=="all"&&f!==c?"dim":""}"><span>${hchip(c)} <span class="hbl">${HCM[c].l.split(" (")[0].split(" & ")[0]}</span></span><div class="dbar"><i style="width:${n/mx*100}%;background:${HCM[c].col}"></i></div><b>${n}</b></div>`).join("")}
    <div class="dnote" style="margin-top:7px"><b style="color:#ffd08a">Suggested: ${ACT[top][0]}</b><div>${ACT[top][1]}</div></div>
    <div style="display:flex;gap:6px;margin-top:7px"><button class="dbtn or" id="btnWalk">Schedule walk-down</button><button class="dbtn" id="btnZoneAl">Show alerts</button></div>
   </div>`;}
S[5]=()=>{const h=ST.hm, n=ZONES.reduce((s,z)=>s+zStats(z).n,0);
 return ops("map",`
  <div class="pane" style="flex:1;min-width:0">
   <div class="hm-ctl"><span style="font-size:12.5px;font-weight:800;color:#fff">Hall 3 expansion · site risk map</span><span class="lv" style="background:#4b3f86;color:#e6e0ff">Dashboard · Phase 2 (planned)</span><span style="flex:1"></span>
    <div class="seg">${[7,30,90].map(w=>`<button data-hmwin="${w}" class="${h.win===w?"on":""}">${w} days</button>`).join("")}</div></div>
   <div class="hm-cls"><span class="lbl">Hazard class</span><button data-hmcls="all" class="${h.cls==="all"?"on":""}">All</button>${HC.map(x=>`<button data-hmcls="${x.id}" class="${h.cls===x.id?"on":""}" title="${x.l}"><i style="background:${x.col}"></i>${x.code}</button>`).join("")}</div>
   <div class="kpirow"><div><div class="v">${n}</div><div class="l">Approved · ${h.cls==="all"?"all classes":HCM[h.cls].s} · ${h.win} d</div></div><div><div class="v">${Math.round(n*.33)}</div><div class="l">Rejected as false positive</div></div><div><div class="v">3.1 min</div><div class="l">Median event → review (sample)</div></div><div><div class="v">${Math.round(n*.41)}</div><div class="l">Raised from Axis AOA events</div></div></div>
   <div class="hm-wrap">${siteMap()}</div>
   <div class="hm-foot"><div class="lgbar"></div><span>Low → High, relative within the filter (illustrative)</span><span style="flex:1"></span><span>Score = approved findings × class severity ÷ camera hours. Planned classes simulated. Not a prediction.</span></div>
  </div>
  <div class="pane hm-panel">${heatPanel()}</div>`,{clock:"2:00:00 PM CT"});};

/* ---------- integration architecture ---------- */
const ARCH={
 aoa:{t:"AXIS Object Analytics (on camera)",st:"MVP input",k:"ax",b:["Axis's built-in analytic; the site configures scenarios such as <b>Object in area</b>, <b>Line crossing</b>, and <b>Occupancy in area</b> (e.g. EZ-3 load path).","WSafe treats these events as triggers and still checks the frame itself (PPE, zone context) before raising an alert.","Configured in the camera, or over the VAPIX AXIS Object Analytics API."]},
 evs:{t:"Event system → MQTT client",st:"MVP input",k:"ax",b:["Device events (AOA scenarios, motion, system status) are published to WSafe's MQTT broker by the <b>MQTT Event Bridge</b> over TLS.","Set up over VAPIX: <span class='mono'>/axis-cgi/mqtt/client.cgi</span> (configureClient, activateClient) and <span class='mono'>/axis-cgi/mqtt/event.cgi</span> (configureEventPublication).","Alternatives per site: VAPIX event streaming over WebSocket (<span class='mono'>/vapix/ws-data-stream?sources=events</span>) or the RTSP event stream."]},
 vid:{t:"Video · RTSP",st:"MVP input",k:"ax",b:["WSafe pulls H.264 from <span class='mono'>rtsp://&lt;camera&gt;/axis-media/media.amp</span> with a read-only service account.","Continuous for cameras on cloud detection; on demand (a few seconds around an event) where uplink is limited.","Scene metadata over RTSP (ONVIF) could add object tracks later."]},
 acap:{t:"WSafe AI Edge · ACAP app",st:"Phase 2 · not built",k:"ph2",b:["Planned app built with the <b>ACAP Native SDK</b>, installed as an .eap package on capable cameras.","Reads frames with the VDO API, runs the PPE / zone model with Larod on the camera's deep-learning processor, and sends events with axevent.","Only hazard events + a snapshot leave the site; WSafe's cloud model can double-check the snapshot before review.","Model conversion and device support to be validated."]},
 spk:{t:"Axis network horn speaker",st:"Planned · site opt-in",k:"ph2",b:["After a reviewer approves (or, if the site chooses, for P1 zone events), WSafe could play a pre-recorded warning over VAPIX.","Off by default; the site decides wording, hours, and which zones."]},
 ing:{t:"Ingest · stream + event router",st:"MVP",k:"ws",b:["Terminates RTSP pulls and the MQTT broker; maps every event to camera, zone, and AOA scenario.","Health checks per device (stream up, last event, clock drift).","An optional on-site connector can relay streams outbound-only when cameras aren't reachable from the cloud."]},
 inf:{t:"Hazard inference · 10 classes",st:"MVP: PPE + exclusion zone",k:"ws",b:["Same taxonomy as the Genetec and Procore prototypes: 10 classes, 35 sub-hazards.","MVP: PPE (hard hat, hi-vis) + exclusion-zone entry. Fall exposure, equipment proximity, electrical, and others are planned."]},
 rev:{t:"Human review queue",st:"MVP",k:"ws",b:["A Competent Person approves or rejects each finding with its evidence clip.","Nothing goes to people, the VMS, or Procore until a person decides. Rejections tune per-camera thresholds."]},
 evd:{t:"Evidence store",st:"MVP",k:"ws",b:["Keeps the snapshot and a short clip (about ±6 s) per finding, with retention set per customer.","Continuous video stays on site, in the cameras' own storage or the VMS."]},
 ana:{t:"Analytics · site risk map",st:"Phase 2",k:"ws",b:["Approved findings by zone, camera, and class; 7 / 30 / 90-day views.","Used to target walk-downs and toolbox talks. Shows where hazards were seen, not a prediction."]},
 alr:{t:"Alerts to people",st:"MVP",k:"out",b:["SMS, email, or app push to the superintendent, safety lead, or foreman by zone and severity."]},
 vms:{t:"Customer VMS",st:"Optional",k:"out",b:["If the site runs a VMS, WSafe can post an event + bookmark there (for example Genetec Security Center; see the separate WSafe AI + Genetec prototype)."]},
 pc:{t:"Procore",st:"Optional · per site",k:"pc",b:["Approved findings can become Safety Observations with the snapshot and clip link (see the WSafe AI + Procore prototype)."]}
};
function archSvg(){
  const P=ST.archPath, on=ps=>P==="all"||ps.includes(P);
  const col={ax:["#1f2a33","#4aa3df","#e8eef1"],ws:["#E6F0F3","#14566E","#0d3d4f"],out:["#FDEBD8","#c8690a","#7a4206"],pc:["#fbe9dc","#b8561a","#7a3a10"],ph2:["#f3eefb","#6d5bb5","#4a3a8a"]};
  const N=(id,x,y,w,h,t,s,ps)=>{const k=ARCH[id].k,c=col[k];return `<g class="an ${ST.arch===id?"on":""} ${on(ps)?"":"dim"}" data-arch="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${c[0]}" stroke="${c[1]}" stroke-width="${ST.arch===id?3:1.6}" ${k==="ph2"?'stroke-dasharray="6 4"':""}/><text x="${x+10}" y="${y+19}" class="at" fill="${c[2]}">${t}</text>${s?`<text x="${x+10}" y="${y+35}" class="as" fill="${c[2]}">${s}</text>`:""}</g>`;};
  const E=(d,l,lx,ly,k,ps)=>`<g class="ae ${on(ps)?"":"dim"}"><path d="${d}" fill="none" stroke="${k==="ph2"?"#6d5bb5":k==="ax"?"#2f6db5":"#14566E"}" stroke-width="2.2" ${k==="ph2"?'stroke-dasharray="7 5"':""} marker-end="url(#ar${k})"/>${l?`<text x="${lx}" y="${ly}" class="al" fill="${k==="ph2"?"#5a47a8":"#2f5f9e"}">${l}</text>`:""}</g>`;
  return `<svg class="arch" viewBox="0 0 1000 440" xmlns="http://www.w3.org/2000/svg">
   <defs>${["ax","ws","ph2"].map(k=>`<marker id="ar${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${k==="ph2"?"#6d5bb5":k==="ax"?"#2f6db5":"#14566E"}"/></marker>`).join("")}</defs>
   <rect x="10" y="10" width="250" height="420" rx="12" fill="#f4f6f8" stroke="#cfd8de" stroke-dasharray="6 5"/><text x="24" y="32" class="ag">JOBSITE · AXIS DEVICES (sample)</text>
   <rect x="22" y="44" width="226" height="282" rx="10" fill="#141a1f" stroke="#3a4852"/><text x="34" y="64" class="at" fill="#cfe3ef">Axis network camera · AXIS OS</text>
   ${N("aoa",34,76,202,46,"AXIS Object Analytics","Object in area · Line crossing",["cloud"])}
   ${N("evs",34,130,202,46,"Event system → MQTT client","MQTT Event Bridge (TLS)",["cloud"])}
   ${N("vid",34,184,202,46,"Video encoder · RTSP","H.264 · axis-media/media.amp",["cloud"])}
   ${N("acap",34,262,202,52,"WSafe AI Edge · ACAP app","Phase 2 · VDO → Larod → axevent",["edge"])}
   ${N("spk",22,350,226,50,"Axis network horn speaker","Audio warning · planned, opt-in",["out"])}
   <rect x="380" y="10" width="330" height="420" rx="12" fill="#f2f8fa" stroke="#9fc1cd" stroke-dasharray="6 5"/><text x="394" y="32" class="ag" fill="#14566E">WSAFE AI CLOUD (planned)</text>
   ${N("ing",395,46,300,46,"Ingest · stream + event router","RTSP pulls · MQTT broker · device health",["cloud","edge"])}
   ${N("inf",395,118,300,46,"Hazard inference · 10 classes","MVP: PPE + exclusion zone",["cloud","edge"])}
   ${N("rev",395,190,300,46,"Human review queue","Competent Person approves / rejects",["cloud","edge","out"])}
   ${N("evd",395,262,145,46,"Evidence store","snapshot + ±6 s clip",["cloud","edge"])}
   ${N("ana",550,262,145,46,"Analytics","site risk map",["cloud","edge"])}
   <rect x="760" y="10" width="230" height="420" rx="12" fill="#fffaf4" stroke="#f6cf9f" stroke-dasharray="6 5"/><text x="774" y="32" class="ag" fill="#a24c15">OUTPUTS (approved only)</text>
   ${N("alr",774,56,202,46,"Alerts to people","SMS · email · app push",["out","cloud","edge"])}
   ${N("vms",774,128,202,46,"Customer VMS (optional)","event + bookmark",["out","cloud","edge"])}
   ${N("pc",774,200,202,46,"Procore (optional)","Safety Observation",["out","cloud","edge"])}
   ${E("M236 153 C300 153 330 69 393 69","MQTT · events","268","104","ax",["cloud"])}
   ${E("M236 207 C310 207 320 75 393 75","RTSP · video","288","196","ax",["cloud"])}
   ${E("M236 288 C320 288 330 82 393 82","MQTT · hazard events + snapshot","262","312","ph2",["edge"])}
   ${E("M393 60 C330 60 300 99 238 99","VAPIX · config","300","56","ax",["cloud"])}
   ${E("M545 92 L545 116","","","","ws",["cloud","edge"])}
   ${E("M545 164 L545 188","","","","ws",["cloud","edge"])}
   ${E("M520 236 L480 260","","","","ws",["cloud","edge"])}
   ${E("M570 236 L610 260","","","","ws",["cloud","edge"])}
   ${E("M695 205 C730 205 740 79 772 79","","","","ws",["out","cloud","edge"])}
   ${E("M695 213 C735 213 740 151 772 151","","","","ws",["out","cloud","edge"])}
   ${E("M695 221 L772 223","","","","ws",["out","cloud","edge"])}
   ${E("M393 226 C320 250 330 375 250 375","VAPIX · play clip (planned)","262","418","ph2",["out"])}
   <text x="774" y="290" class="as" fill="#7a4206">Outbound only after review.</text><text x="774" y="306" class="as" fill="#7a4206">Continuous video stays on site.</text>
   <text x="395" y="340" class="as" fill="#14566E">Credentials: per-site service accounts,</text><text x="395" y="355" class="as" fill="#14566E">encrypted at rest (planned).</text>
  </svg>`;
}
S[6]=()=>{const a=ARCH[ST.arch], P=ST.archPath;
 return wsc("arch",`
  <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:8px">
   <div style="display:flex;align-items:center;gap:10px"><div><div style="font-size:18px;font-weight:800">Integration architecture <span class="tag gray" style="vertical-align:3px">planned design</span></div><div class="muted" style="font-size:12.3px">Axis camera → VAPIX / RTSP / MQTT (or ACAP) → WSafe AI cloud → alerts, VMS, Procore. Click a block for details.</div></div>
    <div class="seg lt" style="margin-left:auto">${[["all","All"],["cloud","Cloud path · MVP"],["edge","Edge path · ACAP (Phase 2)"],["out","Outputs"]].map(([k,l])=>`<button data-apath="${k}" class="${P===k?"on":""}">${l}</button>`).join("")}</div></div>
   <div class="card" style="flex:1;min-height:0;padding:6px;position:relative">${archSvg()}</div>
  </div>
  <div class="card archd">
   <div style="display:flex;align-items:center;gap:6px">${chip(a.k==="out"?"ws":a.k,a.k==="ax"?"device":a.k==="ph2"?"":a.k==="pc"?"":"")}<span class="tag ${/Phase 2|Planned/.test(a.st)?"purple":/Optional/.test(a.st)?"gray":"green"}">${a.st}</span></div>
   <div style="font-size:16px;font-weight:800;margin:6px 0 4px">${a.t}</div>
   <ul class="ab">${a.b.map(x=>`<li>${x}</li>`).join("")}</ul>
   <div class="note orange" style="font-size:11px;padding:6px 9px;margin-top:auto"><span class="ic">!</span><div>Design intent only; nothing here is built or tested. Interface names come from Axis's public developer docs (developer.axis.com) and will be validated against real devices.</div></div>
   <div style="display:flex;gap:6px;margin-top:8px"><button class="btn" data-go="0" style="padding:6px 10px;font-size:12px">↺ Back to start</button></div>
  </div>`);};

/* ---------- router ---------- */
let arriveT=null, playT=null;
function render(){
  const n=ST.step, s=STEPS[n];
  $("#stage").innerHTML=S[n]();
  const wb=$("#wbar"); wb.classList.toggle("cover",n===0);
  $("#wNum").textContent=n; $("#wTtl").textContent=s.t; $("#wCap").textContent=s.c;
  $("#wApi").innerHTML=s.api.map(a=>chip(a[0],a[1])).join("");
  $("#bStep").textContent=n?`Walkthrough step ${n} of ${LAST}`:"Walkthrough";
  $("#prev").disabled=n<=1; $("#next").textContent=n>=LAST?"Restart ↺":"Next →";
  $("#dots").innerHTML=STEPS.slice(1).map((_,i)=>`<span class="${i+1===n?"on":""}" data-go="${i+1}"></span>`).join("");
  document.title=`WSafe AI + Axis prototype · ${n?n+". ":""}${s.t}`;
}
function stopPlay(){clearInterval(playT);playT=null;ST.play=false;}
function go(n){
  n=Math.max(0,Math.min(LAST,+n));
  clearTimeout(arriveT); stopPlay();
  if(n>=3) ST.arrived=true;
  if(n>=5) ST.approved=true;
  if(n<5){ST.approved=false;}
  if(n<3) ST.arrived=false;
  if(n===4){ST.sel=HERO; ST.pf=3;}
  if(n===2){ST.focus="AX-06"; arriveT=setTimeout(()=>{ if(ST.step===2){ST.arrived=true;render();toast("Axis event on AX-06 (Object in area · EZ-3) → WSafe verified: no hard hat. P1 alert raised (sample)");}}, window.__arriveMs ?? 2200); }
  ST.step=n; if(location.hash!=="#s"+n) history.replaceState(null,"","#s"+n); render();
}
window.go=go; window.ST=ST; window.render=render;
document.addEventListener("click",e=>{
  const g=e.target.closest("[data-go]"); if(g){go(g.dataset.go);return;}
  const fc=e.target.closest("[data-focus]"); if(fc){ST.focus=fc.dataset.focus;render();return;}
  const dv=e.target.closest("[data-dev]"); if(dv){ST.devSel=dv.dataset.dev;render();return;}
  const es=e.target.closest("[data-evsrc]"); if(es){ST.evsrc=es.dataset.evsrc;render();return;}
  const sl=e.target.closest("[data-sel]"); if(sl){stopPlay();ST.sel=sl.dataset.sel;ST.pf=3;render();return;}
  const pf=e.target.closest("[data-pf]"); if(pf){stopPlay();ST.pf=+pf.dataset.pf;render();return;}
  const ar=e.target.closest("[data-arch]"); if(ar){ST.arch=ar.dataset.arch;render();return;}
  const ap=e.target.closest("[data-apath]"); if(ap){ST.archPath=ap.dataset.apath;render();return;}
  const hw=e.target.closest("[data-hmwin]"); if(hw){ST.hm.win=+hw.dataset.hmwin;render();return;}
  const hcl=e.target.closest("[data-hmcls]"); if(hcl){ST.hm.cls=hcl.dataset.hmcls;render();return;}
  const hz=e.target.closest("[data-zone]"); if(hz){ST.hm.zone=hz.dataset.zone;render();return;}
  const pb=e.target.closest("#btnPlay"); if(pb){ if(ST.play){stopPlay();render();return;} ST.play=true; if(ST.pf>=FR.length-1)ST.pf=0; render();
    playT=setInterval(()=>{ if(ST.step!==4){stopPlay();return;} ST.pf++; if(ST.pf>=FR.length-1){ST.pf=FR.length-1;stopPlay();} render();},650); return;}
  const id=e.target.closest("button")&&e.target.closest("button").id;
  if(id==="btnAddDev"){toast("Add device: enter IP + service account → WSafe reads model and firmware over VAPIX (basicdeviceinfo.cgi), then lists streams and AOA scenarios (mock)");}
  if(id==="btnTestDev"){toast(`${ST.devSel}: VAPIX ✓ · RTSP ✓ · MQTT ✓ (mock connection test)`);}
  if(id==="btnOpenReview"){toast("Opening the review with the evidence clip (mock)");setTimeout(()=>go(4),500);}
  if(id==="btnRadio"){toast("Logged: rigger lead notified by radio. The approve/reject decision stays with the reviewer.");}
  const nextOpen=()=>{const n=DET.find(x=>!isDone(x)&&x.id!==HERO); return n?n.id:HERO;};
  if(id==="btnDismiss"){const d=det(); if(d.id===HERO){toast("In this walkthrough, approve "+HERO+". Try rejecting another finding instead.");} else {ST.dismissed[d.id]=true;ST.sel=nextOpen();render();toast(`${d.id} rejected as a false positive. Nothing sent; threshold feedback logged for ${d.cam}.`);}}
  if(id==="btnApprove"){const d=det(); if(d.id!==HERO){ST.ok[d.id]=true;ST.sel=nextOpen();render();toast(`${d.id} approved (${HCM[d.cls].code}): alert sent to the site contacts (mock)`);return;}
    const b=$("#btnApprove"); b.textContent="Posting decision…"; b.disabled=true; setTimeout(()=>{ST.approved=true;render();toast("Approved: alert sent · VMS event + bookmark · Procore draft (mock)");},800);}
  if(id==="btnHmClose"){ST.hm.zone=null;render();}
  if(id==="btnWalk"){toast("Walk-down task drafted for the safety lead (planned, mock)");}
  if(id==="btnZoneAl"){toast("Would open Alerts filtered to this zone's Axis cameras (planned)");}
});
document.addEventListener("keydown",e=>{if(["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName))return;
  if(e.key==="ArrowRight")go(ST.step>=LAST?0:ST.step+1); if(e.key==="ArrowLeft"&&ST.step>1)go(ST.step-1);});
$("#prev").onclick=()=>go(ST.step-1); $("#next").onclick=()=>go(ST.step>=LAST?0:ST.step+1);
if(/[?&]shots=1/.test(location.search)) document.body.classList.add("shots");
const m=location.hash.match(/#s(\d)/); go(m?+m[1]:0);
window.addEventListener("hashchange",()=>{const m=location.hash.match(/#s(\d)/);if(m&&+m[1]!==ST.step)go(+m[1]);});
})();
