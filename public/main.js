function getCookie(name) {
  var value = `; ${document.cookie}`;
  var parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
}

function setFieldError(id, hasError) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('error', !!hasError);
}

// ── CURSOR ────────────────────────────────────────────────
// Skip the custom cursor entirely on touch/coarse-pointer devices —
// there is no mouse to track, so save the animation frame budget.
var isTouchDevice = window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches;
const $c=document.getElementById('cur'),$o=document.getElementById('cur-o');
if(!isTouchDevice){
  let mx=0,my=0,ox=0,oy=0;
  document.addEventListener('mousemove',function(e){
    mx=e.clientX;my=e.clientY;
    $c.style.left=mx+'px';$c.style.top=my+'px';
  });
  (function ol(){ox+=(mx-ox)*.12;oy+=(my-oy)*.12;
    $o.style.left=ox+'px';$o.style.top=oy+'px';
    requestAnimationFrame(ol);
  })();
}

// ── NAV ───────────────────────────────────────────────────
window.addEventListener('scroll',function(){
  document.getElementById('nav').classList.toggle('stuck',window.scrollY>60);
});

// ── MOBILE NAV ────────────────────────────────────────────
(function(){
  var toggle=document.getElementById('nav-toggle');
  var panel=document.getElementById('nav-mobile');
  if(!toggle||!panel) return;

  function closeMenu(){
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden','true');
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-label','Open menu');
    document.body.style.overflow='';
  }
  function openMenu(){
    panel.classList.add('open');
    panel.setAttribute('aria-hidden','false');
    toggle.setAttribute('aria-expanded','true');
    toggle.setAttribute('aria-label','Close menu');
    document.body.style.overflow='hidden';
  }

  toggle.addEventListener('click',function(){
    var isOpen=toggle.getAttribute('aria-expanded')==='true';
    if(isOpen) closeMenu(); else openMenu();
  });

  panel.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click',closeMenu);
  });

  document.addEventListener('keydown',function(e){
    if(e.key==='Escape') closeMenu();
  });

  window.addEventListener('resize',function(){
    if(window.innerWidth>860) closeMenu();
  });
})();

// ── REVEAL ON SCROLL ──────────────────────────────────────
var rvIO=new IntersectionObserver(function(es){
  es.forEach(function(e){if(e.isIntersecting)e.target.classList.add('in');});
},{threshold:.08});
document.querySelectorAll('.rv').forEach(function(el){rvIO.observe(el);});

// ── ENGRAVING STUDIO ──────────────────────────────────────
// Canonical implementation lives further down this file, right
// after the enquiry-form helpers, alongside the CSP event bindings.
let currentTab = 'initials';

// ── THE COLLECTION — 5 silhouettes, each with its own dimensions ──
var MODELS = [
  { id:'heritage',  name:'The Heritage',  tag:'The original silhouette — soft, rounded, and iconic.', badge:'Most Loved' },
  { id:'sovereign', name:'The Sovereign', tag:'A full-bodied decanter, wide and generous — presence for grand tables.', badge:'Grand Format' },
  { id:'aria',      name:'The Aria',      tag:'A slender teardrop, faceted and light — quietly elegant.', badge:null },
  { id:'palazzo',   name:'The Palazzo',   tag:'Tall and graceful, inspired by fine hospitality glassware.', badge:null },
  { id:'meridian',  name:'The Meridian',  tag:'Clean, architectural, and minimal — a modern conical form.', badge:'New' }
];
var MODELS_BY_ID = {};
MODELS.forEach(function(m){ MODELS_BY_ID[m.id] = m; });

// Which sizes each silhouette is offered in — not every shape suits every size.
var MODEL_SIZES = {
  heritage:  ['250','330','500','750'],
  sovereign: ['330','500','750'],
  aria:      ['250','330','500'],
  palazzo:   ['330','500','750'],
  meridian:  ['250','330','500']
};

// Universal size tier names/descriptions, shared across every model.
var SIZE_META = {
  '250': { name:'The Petite',  desc:'A jewel-sized vessel for intimate tables and delicate settings.' },
  '330': { name:'The Classic', desc:'The signature size — the most requested across every silhouette.' },
  '500': { name:'The Grand',   desc:'For longer tables and longer drives — a fuller presence throughout.' },
  '750': { name:'The Prestige',desc:'Reserved for the most elevated commissions and grand-format tables.' }
};

// On-screen scale + comparison figures per ml — shared across all silhouettes.
var SIZE_DIMS = {
  '250':{w:66, h:195, waterY:270, barW:'35%', mm:'145mm', label:'250 ml'},
  '330':{w:88, h:260, waterY:200, barW:'52%', mm:'185mm', label:'330 ml'},
  '500':{w:100,h:310, waterY:155, barW:'66%', mm:'220mm', label:'500 ml'},
  '750':{w:112,h:365, waterY:105, barW:'80%', mm:'258mm', label:'750 ml'}
};

// Hand-drawn silhouette geometry per model, all sharing the same 0 0 120 420
// viewBox. Each is built as its own vector identity — a different house's
// interpretation of "bottle" — not one curve wearing different widths.
// Left/right symmetry about x=60 is exact (verified programmatically).
var MODEL_SHAPES = {
  // The quiet classic — kept close to its original form, barely touched.
  // A soft apothecary curve with the faintest belly and a generous heel.
  heritage: {
    body:'M44,80 Q30,90 28,108 Q26,130 27,150 L27,340 Q27,368 33,378 Q40,386 60,386 Q80,386 87,378 Q93,368 93,340 L93,150 Q94,130 92,108 Q90,90 76,80 Z',
    shoulder:'M32,116 Q60,106 88,116',
    edges:{x1:27,x2:93,y1:150,y2:338},
    ring:{cx:60,cy:250,rx:26,ry:36},
    floorRx:34
  },
  // A true crystal decanter — short aristocratic neck, a generous round
  // belly (the widest silhouette in the collection by far), drawn down to
  // a small precise foot. Built to look heavy on a whisky tray.
  sovereign: {
    body:'M60,70 Q42,72 33,92 Q18,116 14,155 Q11,195 14,232 Q18,270 30,302 Q38,326 42,346 Q45,362 46,374 Q47,382 60,384 Q73,382 74,374 Q75,362 78,346 Q82,326 90,302 Q102,270 106,232 Q109,195 106,155 Q102,116 87,92 Q78,72 60,70 Z',
    shoulder:'M33,108 Q60,94 87,108',
    edges:{x1:14,x2:106,y1:155,y2:346},
    ring:{cx:60,cy:205,rx:36,ry:50},
    floorRx:42
  },
  // A faceted teardrop, cut like a gemstone — the upper bulb is a genuine
  // angular polygon (straight edges only), not a curve with lines drawn
  // over it. Drawn down into a long, slender, jewel-like base.
  aria: {
    body:'M60,84 L46,92 L36,110 L30,134 L28,160 L34,190 L42,220 L46,254 L47,290 L45,322 L42,350 L45,372 L52,384 L60,386 L68,384 L75,372 L78,350 L75,322 L73,290 L74,254 L78,220 L86,190 L92,160 L90,134 L84,110 L74,92 Z',
    shoulder:'M36,102 L60,92 L84,102',
    edges:{x1:28,x2:92,y1:160,y2:372},
    ring:{cx:60,cy:140,rx:24,ry:30},
    floorRx:22
  },
  // A tall hospitality flute with a genuine waist — the outline actually
  // pinches in at the collar before flaring back out into the body, the
  // way a hand-blown stemmed glass narrows at the hand.
  palazzo: {
    body:'M46,64 Q40,78 40,92 Q40,106 48,128 Q54,142 46,158 Q40,178 40,220 Q40,280 40,320 Q41,352 44,364 Q46,378 50,383 Q55,386 60,386 Q65,386 70,383 Q74,378 76,364 Q79,352 80,320 Q80,280 80,220 Q80,178 74,158 Q66,142 72,128 Q80,106 80,92 Q80,78 74,64 Z',
    shoulder:'M40,92 Q60,84 80,92',
    edges:{x1:40,x2:80,y1:178,y2:364},
    ring:{cx:60,cy:240,rx:18,ry:48},
    floorRx:24
  },
  // Fully architectural — every edge a straight line, no curves anywhere.
  // A chamfered, stepped silhouette, cold and geometric, like sculpture.
  meridian: {
    body:'M44,80 L36,100 L32,120 L32,360 L38,380 L44,384 L76,384 L82,380 L88,360 L88,120 L84,100 L76,80 Z',
    shoulder:'M32,120 L88,120',
    edges:{x1:32,x2:88,y1:120,y2:360},
    ring:{cx:60,cy:240,rx:26,ry:30},
    floorRx:30
  }
};

// ── Deriving the story-section's large-scale geometry ──────────────────
// Rather than hand-duplicating every curve at a second scale (error-prone,
// and the two versions drift apart over time), the pinned scroll section's
// bottle is generated from the exact same MODEL_SHAPES data via a plain
// affine transform. Same silhouette, guaranteed, at both scales.
function roundTo(n, places){
  var f = Math.pow(10, places || 2);
  return Math.round(n * f) / f;
}
function transformPathD(d, sx, sy, ox, oy){
  return d.replace(/([MLQCZ])([^MLQCZ]*)/g, function(_, cmd, nums){
    if (cmd === 'Z') return 'Z';
    var trimmed = nums.trim();
    if (!trimmed) return cmd;
    var parts = trimmed.split(/[\s,]+/).map(Number);
    var out = [];
    for (var i = 0; i < parts.length; i += 2) {
      out.push(roundTo(parts[i] * sx + ox, 2) + ',' + roundTo(parts[i + 1] * sy + oy, 2));
    }
    return cmd + out.join(' ');
  });
}
function transformShape(shape, sx, sy, ox, oy){
  return {
    body: transformPathD(shape.body, sx, sy, ox, oy),
    shoulder: transformPathD(shape.shoulder, sx, sy, ox, oy),
    edges: {
      x1: roundTo(shape.edges.x1 * sx + ox, 2), x2: roundTo(shape.edges.x2 * sx + ox, 2),
      y1: roundTo(shape.edges.y1 * sy + oy, 2), y2: roundTo(shape.edges.y2 * sy + oy, 2)
    },
    ring: {
      cx: roundTo(shape.ring.cx * sx + ox, 2), cy: roundTo(shape.ring.cy * sy + oy, 2),
      rx: roundTo(shape.ring.rx * sx, 2), ry: roundTo(shape.ring.ry * sy, 2)
    },
    floorRx: roundTo(shape.floorRx * sx, 2)
  };
}

// Story canvas is 0 0 240 520 — 2× the width of the 0 0 120 420 gallery
// canvas, with a vertical scale/offset chosen so every silhouette's
// shoulder and heel land inside the section's existing fixed decoration
// (label plaque, dashed lines, floor plate) without needing to touch it.
var STORY_SCALE_X = 2;
var STORY_SCALE_Y = (466 - 100) / (386 - 80);
var STORY_OFFSET_X = 0;
var STORY_OFFSET_Y = 100 - 80 * STORY_SCALE_Y;

var STORY_SHAPES = {};
Object.keys(MODEL_SHAPES).forEach(function(id){
  STORY_SHAPES[id] = transformShape(MODEL_SHAPES[id], STORY_SCALE_X, STORY_SCALE_Y, STORY_OFFSET_X, STORY_OFFSET_Y);
});

var activeModel = 'heritage';
var activeSize = '330';
var ALL_MODEL_IDS = MODELS.map(function(m){ return m.id; });

// Swaps the story section's (pinned scroll) bottle to the same silhouette —
// clicking any model in the Collection updates both the configurator and
// the storytelling bottle, so they're never showing two different shapes.
function applyStoryShape(modelId){
  var s = STORY_SHAPES[modelId];
  if (!s) return;

  var outline = document.getElementById('story-outline');
  var clip = document.getElementById('story-clip');
  var shoulder = document.getElementById('story-shoulder');
  var edgeL = document.getElementById('story-edge-l');
  var edgeR = document.getElementById('story-edge-r');
  var ringOuter = document.getElementById('story-ring-outer');
  var ringInner = document.getElementById('story-ring-inner');
  var engText = document.getElementById('eng-initials-text');
  var engSub = document.getElementById('story-eng-sub');
  var floor = document.getElementById('story-floor');
  var stage = document.getElementById('bottle-stage');

  if (outline) outline.setAttribute('d', s.body);
  if (clip) clip.setAttribute('d', s.body);
  if (shoulder) shoulder.setAttribute('d', s.shoulder);
  if (edgeL) { edgeL.setAttribute('x1', s.edges.x1); edgeL.setAttribute('x2', s.edges.x1); edgeL.setAttribute('y1', s.edges.y1); edgeL.setAttribute('y2', s.edges.y2); }
  if (edgeR) { edgeR.setAttribute('x1', s.edges.x2); edgeR.setAttribute('x2', s.edges.x2); edgeR.setAttribute('y1', s.edges.y1); edgeR.setAttribute('y2', s.edges.y2); }
  if (ringOuter) { ringOuter.setAttribute('cx', s.ring.cx); ringOuter.setAttribute('cy', s.ring.cy); ringOuter.setAttribute('rx', s.ring.rx); ringOuter.setAttribute('ry', s.ring.ry); }
  if (ringInner) { ringInner.setAttribute('cx', s.ring.cx); ringInner.setAttribute('cy', s.ring.cy); ringInner.setAttribute('rx', s.ring.rx * 0.82); ringInner.setAttribute('ry', s.ring.ry * 0.82); }
  if (engText) { engText.setAttribute('x', s.ring.cx); engText.setAttribute('y', s.ring.cy + 10); }
  if (engSub) { engSub.setAttribute('x', s.ring.cx); engSub.setAttribute('y', s.ring.cy + 40); }
  if (floor) { floor.setAttribute('cx', s.ring.cx); floor.setAttribute('rx', s.floorRx); }

  if (stage) {
    ALL_MODEL_IDS.forEach(function(id){ stage.classList.remove('model-' + id); });
    stage.classList.add('model-' + modelId);
  }
}

// ── THE COLLECTION — 3D Cover Flow gallery ─────────────────
// A private-gallery presentation of the five silhouettes: one active
// exhibit centred and in focus, neighbours pushed back along a curved
// platform, blurred and dimmed. Navigable by arrows, wheel, touch swipe,
// keyboard, or by clicking a side bottle.

var galleryIndex = 0;          // index into MODELS of the active exhibit
var galleryWheelLocked = false;

// Builds one bottle's SVG markup. Every instance gets its own gradient/
// clip ids (uid) since several sit in the DOM together.
function diamondAccent(cx, cy){
  return '<rect x="' + (cx - 2.6) + '" y="' + (cy - 2.6) + '" width="5.2" height="5.2" transform="rotate(45,' + cx + ',' + cy + ')" fill="none" stroke="rgba(201,168,76,0.3)" stroke-width="0.5"/>';
}

// ── Bespoke caps — each model gets its own closure fully designed
// alongside its body, not one generic cap swapped between silhouettes.

// Heritage: the familiar fluted metal cap — collar, barrel, domed crown.
function capHeritage(cId, ctId){
  return ''
    + '<ellipse cx="60" cy="41" rx="17" ry="4" fill="rgba(90,58,8,0.55)" stroke="rgba(201,168,76,0.3)" stroke-width="0.5"/>'
    + '<rect x="43" y="9" width="34" height="31" rx="2" fill="url(#' + cId + ')" stroke="rgba(248,222,140,0.4)" stroke-width="0.6"/>'
    + '<line x1="49" y1="9" x2="49" y2="40" stroke="rgba(90,55,6,0.22)" stroke-width="0.5"/>'
    + '<line x1="55" y1="9" x2="55" y2="40" stroke="rgba(90,55,6,0.22)" stroke-width="0.5"/>'
    + '<line x1="60" y1="9" x2="60" y2="40" stroke="rgba(90,55,6,0.22)" stroke-width="0.5"/>'
    + '<line x1="65" y1="9" x2="65" y2="40" stroke="rgba(90,55,6,0.22)" stroke-width="0.5"/>'
    + '<line x1="71" y1="9" x2="71" y2="40" stroke="rgba(90,55,6,0.22)" stroke-width="0.5"/>'
    + '<path d="M43,9 Q43,1 60,1 Q77,1 77,9" fill="url(#' + cId + ')" stroke="rgba(255,244,192,0.55)" stroke-width="0.7"/>'
    + '<ellipse cx="60" cy="9" rx="17" ry="5" fill="url(#' + ctId + ')" stroke="rgba(255,244,192,0.5)" stroke-width="0.6"/>'
    + '<ellipse cx="53" cy="5.5" rx="5.5" ry="1.9" fill="rgba(255,252,228,0.42)" transform="rotate(-14,53,5.5)"/>'
    + '<ellipse cx="60" cy="40" rx="17" ry="4.5" fill="rgba(90,58,8,0.78)" stroke="rgba(201,168,76,0.35)" stroke-width="0.6"/>'
    + '<text x="60" y="26" text-anchor="middle" dominant-baseline="middle" font-family="Cormorant Garamond, Georgia, serif" font-size="9" font-weight="300" font-style="italic" fill="rgba(6,3,0,0.5)">R&#183;S</text>';
}

// Sovereign: a true decanter stopper — flared flange, short stem, a heavy
// round crystal knob cut from the same glass gradient as the body itself.
function capSovereign(gId){
  return ''
    + '<ellipse cx="60" cy="69" rx="21" ry="5" fill="rgba(20,20,10,0.28)"/>'
    + '<ellipse cx="60" cy="66" rx="19" ry="5.5" fill="url(#' + gId + ')" stroke="rgba(201,168,76,0.4)" stroke-width="0.7"/>'
    + '<path d="M48,66 Q46,52 48,40 L72,40 Q74,52 72,66 Z" fill="url(#' + gId + ')" stroke="rgba(201,168,76,0.4)" stroke-width="0.7"/>'
    + '<ellipse cx="60" cy="24" rx="26" ry="24" fill="url(#' + gId + ')" stroke="rgba(201,168,76,0.5)" stroke-width="1"/>'
    + '<ellipse cx="60" cy="24" rx="26" ry="24" fill="none" stroke="rgba(255,252,236,0.16)" stroke-width="0.6"/>'
    + '<ellipse cx="50" cy="14" rx="8" ry="10" fill="rgba(255,255,255,0.32)" transform="rotate(-18,50,14)"/>'
    + '<ellipse cx="72" cy="32" rx="4" ry="6" fill="rgba(255,255,255,0.14)" transform="rotate(20,72,32)"/>'
    + '<circle cx="60" cy="24" r="3" fill="rgba(120,86,10,0.4)"/>';
}

// Aria: a faceted crown — straight-edged hexagonal barrel rising into
// jewel-cut triangular peaks, echoing the body's real angular geometry.
function capAria(cId){
  return ''
    + '<path d="M46,80 L44,60 L48,44 L72,44 L76,60 L74,80 Z" fill="url(#' + cId + ')" stroke="rgba(248,222,140,0.4)" stroke-width="0.6"/>'
    + '<line x1="52" y1="46" x2="52" y2="78" stroke="rgba(90,55,6,0.2)" stroke-width="0.5"/>'
    + '<line x1="60" y1="44" x2="60" y2="80" stroke="rgba(90,55,6,0.22)" stroke-width="0.5"/>'
    + '<line x1="68" y1="46" x2="68" y2="78" stroke="rgba(90,55,6,0.2)" stroke-width="0.5"/>'
    + '<path d="M48,44 L54,26 L60,38 L66,26 L72,44 Z" fill="url(#' + cId + ')" stroke="rgba(255,244,192,0.5)" stroke-width="0.6"/>'
    + '<path d="M54,26 L58,12 L60,20 L62,12 L66,26 L60,38 Z" fill="url(#' + cId + ')" stroke="rgba(255,244,192,0.55)" stroke-width="0.6"/>'
    + '<path d="M58,12 L60,4 L62,12 Z" fill="url(#' + cId + ')" stroke="rgba(255,248,214,0.6)" stroke-width="0.5"/>'
    + '<path d="M48,44 L54,26 L60,38 Z" fill="rgba(255,252,228,0.24)"/>'
    + '<path d="M60,20 L62,12 L66,26 Z" fill="rgba(255,252,228,0.16)"/>'
    + '<ellipse cx="60" cy="80" rx="15" ry="3.5" fill="rgba(90,58,8,0.7)" stroke="rgba(201,168,76,0.32)" stroke-width="0.5"/>';
}

// Palazzo: a slim tapered collar — no dome, just a quiet, precise cone of
// brushed metal, the way a fine hotel's stemware is finished at the rim.
function capPalazzo(cId){
  return ''
    + '<path d="M50,64 Q46,50 48,20 Q49,10 60,9 Q71,10 72,20 Q74,50 70,64 Z" fill="url(#' + cId + ')" stroke="rgba(248,222,140,0.38)" stroke-width="0.6"/>'
    + '<line x1="54" y1="18" x2="52" y2="60" stroke="rgba(90,55,6,0.18)" stroke-width="0.4"/>'
    + '<line x1="60" y1="12" x2="60" y2="62" stroke="rgba(90,55,6,0.2)" stroke-width="0.5"/>'
    + '<line x1="66" y1="18" x2="68" y2="60" stroke="rgba(90,55,6,0.18)" stroke-width="0.4"/>'
    + '<ellipse cx="60" cy="9" rx="12" ry="3.6" fill="url(#' + cId + ')" stroke="rgba(255,244,192,0.5)" stroke-width="0.6"/>'
    + '<ellipse cx="56" cy="7" rx="4" ry="1.4" fill="rgba(255,252,228,0.4)" transform="rotate(-10,56,7)"/>'
    + '<ellipse cx="60" cy="64" rx="15" ry="3.6" fill="rgba(90,58,8,0.72)" stroke="rgba(201,168,76,0.32)" stroke-width="0.5"/>';
}

// Meridian: a chamfered architectural block — every edge straight, a flat
// bevelled top face, cold and geometric like machined stone.
function capMeridian(cId){
  return ''
    + '<path d="M42,78 L40,58 L44,40 L76,40 L80,58 L78,78 Z" fill="url(#' + cId + ')" stroke="rgba(248,222,140,0.35)" stroke-width="0.6"/>'
    + '<path d="M44,40 L50,26 L70,26 L76,40 Z" fill="url(#' + cId + ')" stroke="rgba(248,222,140,0.4)" stroke-width="0.6"/>'
    + '<path d="M50,26 L54,14 L66,14 L70,26 Z" fill="url(#' + cId + ')" stroke="rgba(255,244,192,0.5)" stroke-width="0.6"/>'
    + '<rect x="54" y="8" width="12" height="6" fill="url(#' + cId + ')" stroke="rgba(255,248,214,0.55)" stroke-width="0.6"/>'
    + '<path d="M50,26 L54,14 L60,14 L57,26 Z" fill="rgba(255,252,228,0.18)"/>'
    + '<line x1="42" y1="58" x2="78" y2="58" stroke="rgba(90,55,6,0.16)" stroke-width="0.5"/>'
    + '<path d="M40,78 L42,82 L78,82 L80,78 Z" fill="rgba(90,58,8,0.75)" stroke="rgba(201,168,76,0.32)" stroke-width="0.5"/>';
}

function bottleSVG(modelId, ml, uid){
  var s = MODEL_SHAPES[modelId];
  var d = SIZE_DIMS[ml] || SIZE_DIMS['330'];
  var gId = 'svg-' + uid, wId = 'svw-' + uid, cId = 'svc-' + uid, clId = 'svcl-' + uid, flId = 'svfl-' + uid;
  var rgId = 'svrg-' + uid, rmId = 'svrm-' + uid, ctId = 'svct-' + uid;

  var ringOuter = s.ring, ringInnerRx = roundTo(s.ring.rx * 0.8, 1), ringInnerRy = roundTo(s.ring.ry * 0.8, 1);
  var diagOffX = roundTo(s.ring.rx * 0.72, 1), diagOffY = roundTo(s.ring.ry * 0.72, 1);

  var capMarkup = modelId === 'sovereign' ? capSovereign(gId)
    : modelId === 'aria' ? capAria(cId)
    : modelId === 'palazzo' ? capPalazzo(cId)
    : modelId === 'meridian' ? capMeridian(cId)
    : capHeritage(cId, ctId);

  return ''
    + '<svg class="sv-svg" viewBox="0 0 120 420" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">'
    +   '<defs>'
    // Glass gradient — a genuine two-band highlight: one bright primary
    // catch-light and a dimmer secondary one, asymmetric, as light off a
    // single source actually falls across a curved surface (not a
    // mirrored pair of fake sheens).
    +     '<linearGradient id="' + gId + '" x1="0%" y1="0%" x2="100%" y2="0%">'
    +       '<stop offset="0%" stop-color="#C9A84C" stop-opacity="0.11"/>'
    +       '<stop offset="9%" stop-color="#FFFCF2" stop-opacity="0.4"/>'
    +       '<stop offset="19%" stop-color="#FFF8E8" stop-opacity="0.05"/>'
    +       '<stop offset="50%" stop-color="#E8E0D0" stop-opacity="0.018"/>'
    +       '<stop offset="70%" stop-color="#E8E0D0" stop-opacity="0.02"/>'
    +       '<stop offset="77%" stop-color="#FFF6E4" stop-opacity="0.2"/>'
    +       '<stop offset="87%" stop-color="#FFF6E4" stop-opacity="0.04"/>'
    +       '<stop offset="100%" stop-color="#C9A84C" stop-opacity="0.11"/>'
    +     '</linearGradient>'
    +     '<linearGradient id="' + wId + '" x1="0%" y1="0%" x2="0%" y2="100%">'
    +       '<stop offset="0%" stop-color="#AEE0FA" stop-opacity="0.24"/>'
    +       '<stop offset="100%" stop-color="#3684D6" stop-opacity="0.26"/>'
    +     '</linearGradient>'
    +     '<linearGradient id="' + cId + '" x1="0%" y1="0%" x2="100%" y2="100%">'
    +       '<stop offset="0%" stop-color="#FFF6C8" stop-opacity="0.98"/>'
    +       '<stop offset="30%" stop-color="#EFCB6E" stop-opacity="0.97"/>'
    +       '<stop offset="55%" stop-color="#C9A84C" stop-opacity="0.96"/>'
    +       '<stop offset="100%" stop-color="#6E4C0C" stop-opacity="0.94"/>'
    +     '</linearGradient>'
    +     '<radialGradient id="' + ctId + '" cx="35%" cy="32%" r="68%">'
    +       '<stop offset="0%" stop-color="#FFFAE0" stop-opacity="0.98"/>'
    +       '<stop offset="45%" stop-color="#DCAE3A" stop-opacity="0.95"/>'
    +       '<stop offset="100%" stop-color="#553A08" stop-opacity="0.88"/>'
    +     '</radialGradient>'
    +     '<clipPath id="' + clId + '"><path class="sv-clip" d="' + s.body + '"/></clipPath>'
    +     '<radialGradient id="' + flId + '" cx="50%" cy="50%" r="50%">'
    +       '<stop offset="0%" stop-color="#C9A84C" stop-opacity="0.22"/>'
    +       '<stop offset="100%" stop-color="#C9A84C" stop-opacity="0"/>'
    +     '</radialGradient>'
    +     '<linearGradient id="' + rgId + '" x1="0" y1="0" x2="0" y2="1">'
    +       '<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.4"/>'
    +       '<stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>'
    +     '</linearGradient>'
    +     '<mask id="' + rmId + '"><rect x="0" y="384" width="120" height="34" fill="url(#' + rgId + ')"/></mask>'
    +   '</defs>'

    // grounded reflection — a soft, faded mirror of the base, like product
    // photography under a spotlight. No lines, no texture, just a fade.
    +   '<g transform="translate(0,768) scale(1,-1)" mask="url(#' + rmId + ')">'
    +     '<path d="' + s.body + '" fill="rgba(201,168,76,0.14)"/>'
    +   '</g>'
    +   '<ellipse class="sv-floor" cx="60" cy="396" rx="' + s.floorRx + '" ry="8" fill="url(#' + flId + ')"/>'

    // water fill
    +   '<rect class="sv-water" x="32" y="' + d.waterY + '" width="56" height="' + Math.max(0, 384 - d.waterY) + '" fill="url(#' + wId + ')" clip-path="url(#' + clId + ')"/>'
    +   '<ellipse class="sv-wsurf" cx="60" cy="' + d.waterY + '" rx="24" ry="3.5" fill="rgba(215,246,255,0.3)"/>'

    // glass body — the two-band gradient above does all the "shine" work;
    // no separate highlight lines or streaks are drawn over the front.
    +   '<path class="sv-outline" d="' + s.body + '" fill="url(#' + gId + ')" stroke="rgba(201,168,76,0.5)" stroke-width="1.1"/>'
    +   '<path d="' + s.shoulder + '" fill="none" stroke="rgba(255,252,236,0.14)" stroke-width="1.1"/>'

    // per-model surface flourishes — genuine physical details (a decanter's
    // cut heel, a bottle's punt, an architectural panel seam), not fake
    // cuts standing in for geometry the path itself now already has.
    +   '<ellipse class="sv-detail sv-detail-sovereign" cx="60" cy="350" rx="19" ry="4.2" fill="none" stroke="rgba(201,168,76,0.34)" stroke-width="1"/>'
    +   '<ellipse class="sv-detail sv-detail-palazzo" cx="60" cy="380" rx="12" ry="2.3" fill="rgba(0,0,0,0.18)"/>'
    +   '<line class="sv-detail sv-detail-meridian" x1="60" y1="120" x2="60" y2="384" stroke="rgba(255,255,255,0.045)" stroke-width="8"/>'

    // engraving plaque — double ring, corner accents, monogram + date
    +   '<ellipse cx="' + ringOuter.cx + '" cy="' + ringOuter.cy + '" rx="' + ringOuter.rx + '" ry="' + ringOuter.ry + '" fill="none" stroke="rgba(201,168,76,0.46)" stroke-width="0.8"/>'
    +   '<ellipse cx="' + ringOuter.cx + '" cy="' + ringOuter.cy + '" rx="' + ringInnerRx + '" ry="' + ringInnerRy + '" fill="none" stroke="rgba(201,168,76,0.18)" stroke-width="0.5"/>'
    +   diamondAccent(ringOuter.cx - diagOffX, ringOuter.cy - diagOffY)
    +   diamondAccent(ringOuter.cx + diagOffX, ringOuter.cy - diagOffY)
    +   diamondAccent(ringOuter.cx - diagOffX, ringOuter.cy + diagOffY)
    +   diamondAccent(ringOuter.cx + diagOffX, ringOuter.cy + diagOffY)
    +   '<text x="' + ringOuter.cx + '" y="' + (ringOuter.cy + 5) + '" text-anchor="middle" dominant-baseline="middle" font-family="Cormorant Garamond, Georgia, serif" font-size="17" font-weight="300" font-style="italic" fill="rgba(201,168,76,0.88)">R&amp;S</text>'
    +   '<text x="' + ringOuter.cx + '" y="' + (ringOuter.cy + 22) + '" text-anchor="middle" dominant-baseline="middle" font-family="Montserrat, sans-serif" font-size="4.5" font-weight="200" letter-spacing="2" fill="rgba(201,168,76,0.55)">14 &middot; II &middot; 2026</text>'

    // stable foot
    +   '<ellipse cx="60" cy="384" rx="' + Math.max(14, s.floorRx - 6) + '" ry="5" fill="rgba(201,168,76,0.04)" stroke="rgba(201,168,76,0.2)" stroke-width="0.8"/>'

    // bespoke cap, unique to this silhouette
    +   capMarkup
    + '</svg>';
}

// Renders the five exhibits into the track. Each starts on its own
// signature size (330ml where offered) — only the active exhibit's size
// changes further, via the chip selector in the panel below.
function renderGalleryItems(){
  var track = document.getElementById('gallery-track');
  if (!track) return;
  track.innerHTML = MODELS.map(function(m, i){
    var avail = MODEL_SIZES[m.id] || [];
    var defaultMl = avail.indexOf('330') !== -1 ? '330' : avail[0];
    return '<div class="gallery-item model-' + m.id + '" data-index="' + i + '" data-model="' + m.id + '" role="button" tabindex="-1" aria-label="' + m.name + '">'
      + '<div class="gallery-item-glow"></div>'
      + bottleSVG(m.id, defaultMl, 'gi' + i)
      + '<div class="gallery-item-shadow"></div>'
      + '<span class="gallery-item-label">' + m.name + '</span>'
      + '</div>';
  }).join('');

  track.querySelectorAll('.gallery-item').forEach(function(item){
    item.addEventListener('click', function(){
      goToGalleryIndex(parseInt(item.getAttribute('data-index'), 10));
    });
  });
}

// Positions every exhibit along the curved platform relative to the
// active index — centred and sharp at offset 0, pushed back, scaled
// down, blurred and dimmed the further they sit from the spotlight.
function updateGalleryTransforms(){
  document.querySelectorAll('.gallery-item').forEach(function(item){
    var idx = parseInt(item.getAttribute('data-index'), 10);
    var offset = idx - galleryIndex;
    var abs = Math.abs(offset);
    var visible = abs <= 2;

    item.classList.toggle('is-active', offset === 0);

    var tx = offset * 168;
    var tz = offset === 0 ? 30 : -150 - (abs - 1) * 76;
    var rot = offset === 0 ? 0 : (offset > 0 ? -36 : 36);
    var scale = offset === 0 ? 1 : Math.max(0.5, 1 - abs * 0.22);
    var ty = offset === 0 ? 0 : 24;
    var blur = offset === 0 ? 0 : Math.min(6, 1.6 + abs * 1.8);
    var bright = offset === 0 ? 1 : Math.max(0.32, 1 - abs * 0.28);
    var op = offset === 0 ? 1 : (visible ? Math.max(0, 0.6 - (abs - 1) * 0.34) : 0);

    item.style.transform = 'translate3d(-50%,-50%,0) translateX(' + tx + 'px) translateY(' + ty + 'px) translateZ(' + tz + 'px) rotateY(' + rot + 'deg) scale(' + scale + ')';
    item.style.filter = 'blur(' + blur + 'px) brightness(' + bright + ')';
    item.style.opacity = op;
    item.style.zIndex = String(100 - abs);
    item.style.pointerEvents = visible && offset !== 0 ? 'auto' : 'none';
  });
}

// Renders the content panel for whichever exhibit is active — only the
// centred bottle's story, name, and size options are ever shown.
function renderGalleryPanel(){
  var panel = document.getElementById('gallery-panel');
  if (!panel) return;
  var model = MODELS[galleryIndex];
  var avail = MODEL_SIZES[model.id] || [];
  if (avail.indexOf(activeSize) === -1) activeSize = avail.indexOf('330') !== -1 ? '330' : avail[0];
  var dims = SIZE_DIMS[activeSize] || SIZE_DIMS['330'];

  var chips = avail.map(function(ml){
    var mm = SIZE_META[ml];
    return '<button type="button" class="gp-chip' + (ml === activeSize ? ' on' : '') + '" data-ml="' + ml + '">'
      + '<span class="gp-chip-ml">' + ml + '</span><span class="gp-chip-name">' + mm.name + '</span>'
      + '</button>';
  }).join('');

  panel.innerHTML = ''
    + '<div class="gp-eyebrow">Exhibit ' + String(galleryIndex + 1).padStart(2, '0') + ' <span>/ ' + String(MODELS.length).padStart(2, '0') + '</span></div>'
    + (model.badge ? '<div class="gp-badge">' + model.badge + '</div>' : '')
    + '<h3 class="gp-name">' + model.name + '</h3>'
    + '<p class="gp-tag">' + model.tag + '</p>'
    + '<div class="gp-line"></div>'
    + '<div class="gp-sizes">'
    +   '<p class="gp-sizes-lbl">Select a size</p>'
    +   '<div class="gp-chips" id="gp-chips">' + chips + '</div>'
    + '</div>'
    + '<div class="gp-compare">'
    +   '<p class="gp-cmp-title">Size comparison</p>'
    +   '<div class="gp-cmp-row"><span>iPhone 15</span><div class="gp-cmp-bar-wrap"><div class="gp-cmp-bar-fill" style="width:28%"></div></div><span>150mm</span></div>'
    +   '<div class="gp-cmp-row"><span>' + model.name + '</span><div class="gp-cmp-bar-wrap"><div class="gp-cmp-bar-fill active" style="width:' + dims.barW + '"></div></div><span>' + dims.mm + '</span></div>'
    +   '<div class="gp-cmp-row"><span>Wine bottle</span><div class="gp-cmp-bar-wrap"><div class="gp-cmp-bar-fill" style="width:100%"></div></div><span>300mm</span></div>'
    + '</div>'
    + '<p class="gp-detail">' + dims.label + ' &middot; Borosilicate &middot; ' + model.name + '</p>'
    + '<a href="#bespoke" class="gp-cta">Commission This Silhouette &#8594;</a>';

  panel.querySelectorAll('.gp-chip').forEach(function(chip){
    chip.addEventListener('click', function(){ selectGallerySize(chip.getAttribute('data-ml')); });
  });

  panel.classList.remove('gp-in');
  void panel.offsetWidth;
  panel.classList.add('gp-in');
}

// Adjusts only the active exhibit's fill level and overall scale for the
// chosen size — neighbours keep their own reference silhouette untouched.
function selectGallerySize(ml){
  var avail = MODEL_SIZES[activeModel] || [];
  if (avail.indexOf(ml) === -1) ml = avail[0];
  activeSize = ml;

  var d = SIZE_DIMS[ml] || SIZE_DIMS['330'];
  var base = SIZE_DIMS['330'];

  var activeItem = document.querySelector('.gallery-item.is-active');
  if (activeItem) {
    var svg = activeItem.querySelector('.sv-svg');
    var water = activeItem.querySelector('.sv-water');
    var wsurf = activeItem.querySelector('.sv-wsurf');
    if (svg) svg.style.transform = 'scale(' + (d.h / base.h).toFixed(3) + ')';
    if (water) { water.setAttribute('y', d.waterY); water.setAttribute('height', Math.max(0, 384 - d.waterY)); }
    if (wsurf) wsurf.setAttribute('cy', d.waterY);
  }

  document.querySelectorAll('.gp-chip').forEach(function(c){
    c.classList.toggle('on', c.getAttribute('data-ml') === ml);
  });
  var detail = document.querySelector('.gp-detail');
  var model = MODELS_BY_ID[activeModel];
  if (detail) detail.innerHTML = d.label + ' &middot; Borosilicate &middot; ' + (model ? model.name : '');

  var cmpFill = document.querySelector('.gp-cmp-row .gp-cmp-bar-fill.active');
  if (cmpFill) {
    cmpFill.style.width = d.barW;
    var cmpRow = cmpFill.closest('.gp-cmp-row');
    var mmSpan = cmpRow ? cmpRow.querySelector('span:last-child') : null;
    if (mmSpan) mmSpan.textContent = d.mm;
  }

  var formSel = document.getElementById('f-size');
  if (formSel) {
    var opts = formSel.options;
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].text.indexOf(d.label.split(' ')[0] + ' ml') !== -1) { formSel.selectedIndex = i; break; }
    }
  }
}

function renderGalleryDots(){
  var wrap = document.getElementById('gallery-dots');
  if (!wrap) return;
  wrap.innerHTML = MODELS.map(function(m, i){
    return '<button type="button" class="gdot' + (i === galleryIndex ? ' on' : '') + '" data-index="' + i + '" aria-label="Go to ' + m.name + '"></button>';
  }).join('');
  wrap.querySelectorAll('.gdot').forEach(function(dot){
    dot.addEventListener('click', function(){ goToGalleryIndex(parseInt(dot.getAttribute('data-index'), 10)); });
  });
}

function updateGalleryDotsAndIndex(){
  document.querySelectorAll('.gdot').forEach(function(dot){
    dot.classList.toggle('on', parseInt(dot.getAttribute('data-index'), 10) === galleryIndex);
  });
  var idxEl = document.getElementById('gallery-index');
  if (idxEl) idxEl.textContent = String(galleryIndex + 1).padStart(2, '0') + ' / ' + String(MODELS.length).padStart(2, '0');
}

function updateGalleryArrows(){
  var prev = document.getElementById('gal-prev');
  var next = document.getElementById('gal-next');
  if (prev) prev.classList.toggle('disabled', galleryIndex === 0);
  if (next) next.classList.toggle('disabled', galleryIndex === MODELS.length - 1);
}

function announceGallery(name){
  var live = document.getElementById('gallery-announce');
  if (live) live.textContent = name + ' — now viewing';
}

// The single entry point for changing exhibits — keeps the stage, panel,
// dots, form, and the storytelling-section bottle all in sync.
function goToGalleryIndex(idx){
  if (idx < 0 || idx >= MODELS.length || idx === galleryIndex) return;
  galleryIndex = idx;
  var model = MODELS[idx];
  activeModel = model.id;

  var avail = MODEL_SIZES[activeModel] || [];
  activeSize = avail.indexOf(activeSize) !== -1 ? activeSize : (avail.indexOf('330') !== -1 ? '330' : avail[0]);

  updateGalleryTransforms();
  renderGalleryPanel();
  selectGallerySize(activeSize);
  applyStoryShape(activeModel);
  updateGalleryDotsAndIndex();
  updateGalleryArrows();
  announceGallery(model.name);
}

function nextGalleryItem(){ goToGalleryIndex(Math.min(MODELS.length - 1, galleryIndex + 1)); }
function prevGalleryItem(){ goToGalleryIndex(Math.max(0, galleryIndex - 1)); }

function bindGalleryArrows(){
  var prev = document.getElementById('gal-prev');
  var next = document.getElementById('gal-next');
  if (prev) prev.addEventListener('click', prevGalleryItem);
  if (next) next.addEventListener('click', nextGalleryItem);
}

function bindGalleryKeys(){
  var stage = document.getElementById('gallery-stage');
  if (!stage) return;
  stage.addEventListener('keydown', function(e){
    if (e.key === 'ArrowRight') { e.preventDefault(); nextGalleryItem(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prevGalleryItem(); }
  });
}

// One wheel gesture (trackpad swipe or mouse wheel) advances one exhibit,
// with a short cooldown so a single gesture doesn't skip several at once.
function bindGalleryWheel(){
  var stage = document.getElementById('gallery-stage');
  if (!stage) return;
  stage.addEventListener('wheel', function(e){
    e.preventDefault();
    if (galleryWheelLocked) return;
    var delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 10) return;
    galleryWheelLocked = true;
    if (delta > 0) nextGalleryItem(); else prevGalleryItem();
    setTimeout(function(){ galleryWheelLocked = false; }, 640);
  }, { passive: false });
}

// Touch swipe — the dominant gesture axis is decided on first movement so
// a mostly-vertical touch still lets the page scroll normally.
function bindGalleryTouch(){
  var stage = document.getElementById('gallery-stage');
  if (!stage) return;
  var startX = 0, startY = 0, tracking = false, decided = false, horizontal = false;

  stage.addEventListener('touchstart', function(e){
    var t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    tracking = true; decided = false; horizontal = false;
  }, { passive: true });

  stage.addEventListener('touchmove', function(e){
    if (!tracking) return;
    var t = e.touches[0];
    var dx = t.clientX - startX, dy = t.clientY - startY;
    if (!decided && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      decided = true;
      horizontal = Math.abs(dx) > Math.abs(dy);
    }
    if (horizontal) e.preventDefault();
  }, { passive: false });

  stage.addEventListener('touchend', function(e){
    if (!tracking) return;
    tracking = false;
    var t = e.changedTouches[0];
    var dx = t.clientX - startX;
    if (horizontal && Math.abs(dx) > 44) { if (dx < 0) nextGalleryItem(); else prevGalleryItem(); }
  });
}

function initGallery(){
  renderGalleryItems();
  renderGalleryDots();
  updateGalleryTransforms();
  renderGalleryPanel();
  selectGallerySize(activeSize);
  updateGalleryArrows();
  bindGalleryArrows();
  bindGalleryKeys();
  bindGalleryWheel();
  bindGalleryTouch();
}

initGallery();
bindEnquiryFieldValidation();

// ── FORM SUBMISSION — FIXED ───────────────────────────────
// FIX: Proper field IDs, email field included, clean data gathering
// FIX: Falls back to mailto if server not running (opens locally without backend)
function setFieldError(id, hasError){
  var el=document.getElementById(id);
  if(el) el.classList.toggle('error', !!hasError);
}

function parseDateInput(value){
  if(!value) return null;

  var trimmed = (value || '').trim();

  // Accept DD/MM/YYYY, DD-MM-YYYY or DD.MM.YYYY
  var match = /^(\d{2})[.\-/](\d{2})[.\-/](\d{4})$/.exec(trimmed);

  if(!match) return null;

  var day = Number(match[1]);
  var month = Number(match[2]);
  var year = Number(match[3]);

  // Restrict ranges
  if(day < 1 || day > 31) return null;
  if(month < 1 || month > 12) return null;
  if(year < 2026 || year > 2030) return null;

  return {
    day: day,
    month: month,
    year: year
  };
}

function isValidDateValue(value){
  var parsed = parseDateInput(value);
  if(!parsed) return false;

  var dt = new Date(
    parsed.year,
    parsed.month - 1,
    parsed.day
  );

  return (
    dt.getFullYear() === parsed.year &&
    dt.getMonth() === parsed.month - 1 &&
    dt.getDate() === parsed.day &&
    parsed.year >= 2026 &&
    parsed.year <= 2030
  );
}

function normalizeDateValue(value){
  var parsed=parseDateInput(value);
  if(!parsed) return '';
  return parsed.year+'-'+String(parsed.month).padStart(2,'0')+'-'+String(parsed.day).padStart(2,'0');
}

function normalizeBottleSize(value){
  var trimmed=(value||'').trim();
  if(!trimmed) return '';
  var normalized=trimmed.replace(/\s+/g,' ').replace(/[–—−]/g,'-');
  var lower=normalized.toLowerCase();
  if(/250/.test(lower) && /ml/.test(lower)) return '250 ml - The Petite';
  if(/330/.test(lower) && /ml/.test(lower)) return '330 ml - The Classic';
  if(/500/.test(lower) && /ml/.test(lower)) return '500 ml - The Grand';
  if(/750/.test(lower) && /ml/.test(lower)) return '750 ml - The Prestige';
  if(/consultation/i.test(lower)) return 'Consultation first';
  return normalized;
}

function validateEnquiryField(id){
  var el=document.getElementById(id);
  if(!el) return;
  var value=(el.value||'').trim();
  var isValid=true;

  switch(id){
    case 'f-name':
      isValid=value.length >= 2 && !(/[<>]/.test(value));
      break;
    case 'f-email':
      isValid=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      break;
    case 'f-phone':
      isValid=!value || /^[0-9+\-() ]{7,20}$/.test(value);
      break;
    case 'f-date':
      isValid=!value || isValidDateValue(value);
      break;
    case 'f-guests':
      isValid=!!value;
      break;
    case 'f-size':
      isValid=!!normalizeBottleSize(value);
      break;
    case 'f-engraving':
      isValid=!value || (value.length <= 200 && !/[<>]/.test(value));
      break;
    case 'f-vision':
      isValid=!value || (value.length <= 2000 && !/[<>]/.test(value));
      break;
  }

  setFieldError(id, !isValid);
  return isValid;
}

function bindEnquiryFieldValidation(){
  ['f-name','f-email','f-phone','f-date','f-guests','f-size','f-engraving','f-script','f-palette','f-packaging','f-custom-message','f-vision'].forEach(function(id){
    var el=document.getElementById(id);
    if(!el) return;
    var eventName=id==='f-guests' || id==='f-size' ? 'change' : 'input';
    el.addEventListener(eventName, function(){ validateEnquiryField(id); });
  });
}

function validateEnquiryForm(){
  var name=(document.getElementById('f-name')||{}).value||'';
  var email=(document.getElementById('f-email')||{}).value||'';
  var phone=(document.getElementById('f-phone')||{}).value||'';
  var wDate=(document.getElementById('f-date')||{}).value||'';
  var guests=(document.getElementById('f-guests')||{}).value||'';
  var size=normalizeBottleSize((document.getElementById('f-size')||{}).value||'');
  var engraving=(document.getElementById('f-engraving')||{}).value||'';
  var script=(document.getElementById('f-script')||{}).value||'';
  var palette=(document.getElementById('f-palette')||{}).value||'';
  var packaging=(document.getElementById('f-packaging')||{}).value||'';
  var customMessage=(document.getElementById('f-custom-message')||{}).value||'';
  var vision=(document.getElementById('f-vision')||{}).value||'';

  name=name.trim(); email=email.trim(); phone=phone.trim(); engraving=engraving.trim(); script=script.trim(); palette=palette.trim(); packaging=packaging.trim(); customMessage=customMessage.trim(); vision=vision.trim();

  var errs=[];
  var normalizedDate=normalizeDateValue(wDate);
  if(!name || name.length < 2) errs.push('Please enter your full name.');
  if(!email) errs.push('Please enter your email address.');
  else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('Please enter a valid email address.');
  if(phone && !/^[0-9+\-() ]{7,20}$/.test(phone)) errs.push('Please enter a valid phone number.');
  if(wDate && !isValidDateValue(wDate)) errs.push('Please enter a valid wedding date.');
  if(!guests) errs.push('Please choose an estimated guest count.');
  if(!size) errs.push('Please choose a bottle size.');
  if(engraving && engraving.length > 200) errs.push('Engraving text is too long.');
  if(script && script.length > 80) errs.push('Script choice is too long.');
  if(palette && palette.length > 200) errs.push('Palette notes are too long.');
  if(packaging && packaging.length > 80) errs.push('Packaging choice is too long.');
  if(customMessage && customMessage.length > 1000) errs.push('Custom message is too long.');
  if(vision && vision.length > 2000) errs.push('Vision notes are too long.');
  if(/[<>]/.test(name) || /[<>]/.test(engraving) || /[<>]/.test(script) || /[<>]/.test(palette) || /[<>]/.test(packaging) || /[<>]/.test(customMessage) || /[<>]/.test(vision)) errs.push('Please remove unsupported characters from your message.');

  ['f-name','f-email','f-phone','f-date','f-guests','f-size','f-engraving','f-script','f-palette','f-packaging','f-custom-message','f-vision'].forEach(function(id){ setFieldError(id,false); });
  if(!errs.length){ return {ok:true, name:name, email:email, phone:phone, wedding_date:wDate, guest_count:guests, bottle_size:size, engraving_text:engraving, script_choice:script, palette:palette, packaging:packaging, custom_message:customMessage, vision:vision}; }
  if(!name || name.length < 2) setFieldError('f-name', true);
  if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) setFieldError('f-email', true);
  if(phone && !/^[0-9+\-() ]{7,20}$/.test(phone)) setFieldError('f-phone', true);
  if(wDate && !/^\d{4}-\d{2}-\d{2}$/.test(wDate)) setFieldError('f-date', true);
  if(!guests) setFieldError('f-guests', true);
  if(!size) setFieldError('f-size', true);
  if(engraving && engraving.length > 200) setFieldError('f-engraving', true);
  if(script && script.length > 80) setFieldError('f-script', true);
  if(palette && palette.length > 200) setFieldError('f-palette', true);
  if(packaging && packaging.length > 80) setFieldError('f-packaging', true);
  if(customMessage && customMessage.length > 1000) setFieldError('f-custom-message', true);
  if(vision && vision.length > 2000) setFieldError('f-vision', true);

  return {ok:false, errors:errs};
}
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(';').shift();
  }
}
async function submitEnquiry(){
  var btn=document.getElementById('form-submit-btn');
  var successEl=document.getElementById('form-success');
  var errorEl=document.getElementById('form-error');
  var errMsg=document.getElementById('form-error-msg');
  successEl.style.display='none';
  errorEl.style.display='none';

  var validation=validateEnquiryForm();
  if(!validation.ok){
    errMsg.textContent=validation.errors.join(' ');
    errorEl.style.display='block';
    return;
  }

  btn.disabled=true;
  btn.textContent='Sending\u2026';

  var formData=new FormData();
  formData.append('name', validation.name);
  formData.append('email', validation.email);
  formData.append('phone', validation.phone);
  formData.append('wedding_date', normalizeDateValue(validation.wedding_date));
  formData.append('guest_count', validation.guest_count);
  formData.append('bottle_size', validation.bottle_size);
  formData.append('engraving_text', validation.engraving_text);
  formData.append('script_choice', validation.script_choice || '');
  formData.append('palette', validation.palette || '');
  formData.append('packaging', validation.packaging || '');
  formData.append('custom_message', validation.custom_message || '');
  formData.append('vision', validation.vision || '');
  var uploadEl=document.getElementById('f-attachments');
  if(uploadEl && uploadEl.files){ Array.from(uploadEl.files).forEach(function(file){ formData.append('attachments', file); }); }

  // Try the backend API first
  try {
  const res = await fetch('/api/enquiry', {
  method: 'POST',
  headers: {
    'x-csrf-token': decodeURIComponent(getCookie('XSRF-TOKEN'))
  },
  body: formData
});
    var json=await res.json();

    if(res.ok){
      successEl.style.display='block';
      document.getElementById('form-success-msg').textContent=
        json.message||'We will be in touch within 24 hours.';
      document.getElementById('form-success-ref').textContent=
        json.ref?('Reference: '+json.ref):'';
      btn.style.display='none';
      ['f-name','f-email','f-phone','f-date','f-engraving','f-vision'].forEach(function(id){
        var el=document.getElementById(id); if(el) el.value='';
      });
      return;
    }

    var msg=json.errors?json.errors.map(function(e){return e.msg;}).join(' \u00b7 '):(json.error||'Submission failed. Please try again.');
    errMsg.textContent=msg;
    errorEl.style.display='block';
    btn.disabled=false;
    btn.textContent='Request a Design Consultation \u2192';

  }catch(fetchErr){
    // Backend not running — open mailto as fallback
    var subject='Aqua V\u00e9rit\u00e9 Enquiry \u2014 '+validation.name;
    var body='Name: '+validation.name+'\nEmail: '+validation.email+'\nPhone: '+validation.phone+
      '\nWedding Date: '+validation.wedding_date+'\nGuests: '+validation.guest_count+'\nBottle Size: '+validation.bottle_size+
      '\nEngraving: '+validation.engraving_text+'\nVision: '+validation.vision;
    window.location.href='mailto:hello@aquaventera.com?subject='+
      encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
    btn.disabled=false;
    btn.textContent='Request a Design Consultation \u2192';
  }
}

// ── GOLD DUST PARTICLES ───────────────────────────────────
var dustEl=document.getElementById('dust-layer');
for(var i=0;i<30;i++){
  var p=document.createElement('div');
  p.className='dust-p';
  p.style.left=Math.random()*100+'%';
  p.style.top=Math.random()*100+'%';
  p.style.animationDelay=Math.random()*8+'s';
  p.style.animationDuration=(6+Math.random()*6)+'s';
  p.style.width=(1+Math.random()*2)+'px';
  p.style.height=(1+Math.random()*2)+'px';
  dustEl.appendChild(p);
}

// ── SCROLL STORY ──────────────────────────────────────────
var storyEl=document.getElementById('story');
var svgBottle=document.getElementById('svg-bottle');
var svgCap=document.getElementById('svg-cap');
var capBody=document.getElementById('cap-body');
var capTopdown=document.getElementById('cap-topdown');
var svgWater2=document.getElementById('svg-water');
var svgWaterSurf=document.getElementById('svg-water-surf');
var svgEngraving=document.getElementById('svg-engraving');
var svgLaserDot=document.getElementById('svg-laser-dot');
var svgLaserTrail=document.getElementById('svg-laser-trail');
var floorRef=document.getElementById('floor-ref');
var zoomRing=document.getElementById('zoom-ring');
var laserWrap=document.getElementById('laser-wrap');
var engLabel=document.getElementById('eng-label');
var rimLight=document.querySelector('.rim-light');
var panels=[1,2,3,4,5].map(function(i){return document.getElementById('sp'+i);});
var dots=[0,1,2,3,4].map(function(i){return document.getElementById('d'+i);});
var phaseWordEl=document.getElementById('story-phase');
var phaseNames=['The Vessel','The Cap Descends','The Seal','Cut by Light','The Gift'];
var lastPh=-1;

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function ss(lo,hi,v){var t=clamp((v-lo)/(hi-lo),0,1);return t*t*(3-2*t);}
function lerp(a,b,t){return a+(b-a)*t;}

function getP(){
  var r=storyEl.getBoundingClientRect();
  var total=storyEl.offsetHeight-window.innerHeight;
  if(total<=0) return 0;
  return clamp(-r.top/total,0,1);
}

function tick(){
  requestAnimationFrame(tick);
  var p=getP();
  var ph=0;

  if(p<0.15){
    var t=ss(0,0.15,p); ph=0;
    svgBottle.style.transform='translateY('+lerp(120,0,t)+'px)';
    svgBottle.style.opacity=t;
    var wy=lerp(480,300,t*0.7);
    svgWater2.setAttribute('y',wy);
    svgWater2.setAttribute('height', Math.max(0, 384 - (wy || 0)));
    svgWater2.style.opacity=t*0.9;
    svgWaterSurf.setAttribute('cy',wy);
    svgWaterSurf.style.opacity=t*0.8;
    svgCap.style.transform='translateY(-300px)';
    svgCap.style.opacity='0';
    svgEngraving.style.opacity='0';
    svgLaserDot.style.opacity='0';
    svgLaserTrail.style.opacity='0';
    zoomRing.classList.remove('show');
    laserWrap.classList.remove('show');
    engLabel.classList.remove('show');
    floorRef.style.opacity=t*0.8;
    rimLight.style.opacity=t*0.5;
  }
  else if(p<0.32){
    var t=ss(0.15,0.32,p); ph=1;
    svgBottle.style.transform='translateY(0px)';
    svgBottle.style.opacity='1';
    svgWater2.style.opacity='0.85';
    svgCap.style.transform='translateY('+lerp(-260,-10,t)+'px) scaleX('+lerp(1.4,1,t)+')';
    svgCap.style.opacity=Math.min(1,t*2);
    capTopdown.style.opacity=Math.min(1,t*1.5);
    capBody.style.opacity=Math.max(0,1-t*2);
    svgEngraving.style.opacity='0';
    svgLaserDot.style.opacity='0';
    svgLaserTrail.style.opacity='0';
    zoomRing.classList.remove('show');
    laserWrap.classList.remove('show');
    engLabel.classList.remove('show');
    floorRef.style.opacity='0.8';
    rimLight.style.opacity='0.5';
  }
  else if(p<0.48){
    var t=ss(0.32,0.48,p); ph=2;
    svgBottle.style.transform='translateY(0px)';
    svgBottle.style.opacity='1';
    var bounce=t<0.85?lerp(-10,-2,ss(0,0.85,t)):lerp(-2,0,ss(0.85,1,t));
    svgCap.style.transform='translateY('+bounce+'px)';
    svgCap.style.opacity='1';
    capTopdown.style.opacity=Math.max(0,1-t*1.5);
    capBody.style.opacity=Math.min(1,t*1.5);
    svgEngraving.style.opacity='0';
    svgLaserDot.style.opacity='0';
    svgLaserTrail.style.opacity='0';
    zoomRing.classList.remove('show');
    laserWrap.classList.remove('show');
    engLabel.classList.remove('show');
    floorRef.style.opacity='1';
    rimLight.style.opacity='0.8';
  }
  else if(p<0.58){
    var t=ss(0.48,0.58,p); ph=3;
    var sc=lerp(1,1.5,t);
    var ty=lerp(0,60,t);
    svgBottle.style.transform='translateY('+ty+'px) scale('+sc+')';
    svgCap.style.transform='translateY('+ty+'px) scale('+sc+')';
    svgEngraving.style.opacity=t;
    zoomRing.classList.toggle('show',t>0.4);
    engLabel.classList.toggle('show',t>0.6);
    laserWrap.classList.remove('show');
    svgLaserDot.style.opacity='0';
    svgLaserTrail.style.opacity='0';
    floorRef.style.opacity='1';
    rimLight.style.opacity='1';
  }
  else if(p<0.80){
    var t=ss(0.58,0.80,p); ph=3;
    var sk=Math.sin(t*Math.PI*2)*6;
    svgBottle.style.transform='translateY(60px) scale(1.5) skewY('+(sk*0.4)+'deg)';
    svgCap.style.transform='translateY(60px) scale(1.5) skewY('+(sk*0.4)+'deg)';
    svgEngraving.style.opacity='1';
    laserWrap.classList.add('show');
    svgLaserDot.style.opacity='1';
    svgLaserTrail.style.opacity='1';
    zoomRing.classList.add('show');
    engLabel.classList.add('show');
    floorRef.style.opacity='1';
    rimLight.style.opacity=''+(0.8+Math.sin(t*Math.PI*4)*0.2);
  }
  else{
    var t=ss(0.80,1.0,p); ph=4;
    var sc=lerp(1.5,1.05,t);
    var ty=lerp(60,-20,t);
    svgBottle.style.transform='translateY('+ty+'px) scale('+sc+')';
    svgCap.style.transform='translateY('+ty+'px) scale('+sc+')';
    svgEngraving.style.opacity='1';
    laserWrap.classList.remove('show');
    svgLaserDot.style.opacity='0';
    svgLaserTrail.style.opacity='0';
    zoomRing.classList.remove('show');
    engLabel.classList.add('show');
    floorRef.style.opacity=lerp(1,0.6,t);
    rimLight.style.opacity=lerp(1,1.5,t);
  }

 

  // ── SAFE PANEL & DOT TOGGLES ──────────────────────────
  panels.forEach(function(el, i) {
    if (el) el.classList.toggle('show', i === ph);
  });

  dots.forEach(function(el, i) {
    if (el) el.classList.toggle('on', i === ph);
  });

  if (ph !== lastPh) {
    if (phaseWordEl) phaseWordEl.textContent = phaseNames[ph];
    lastPh = ph;
  }
} // End of tick()
tick();

// Collection init (model + size selection) now happens where MODELS is
// defined, right after bindEnquiryFieldValidation() is set up.


function parseDateInput(value) {
  if (!value) return null;
  var trimmed = (value || '').trim();
  var match = /^([0-9]{2})[.\-/]([0-9]{2})[.\-/]([0-9]{4})$/.exec(trimmed);
  if (!match) return null;
  var day = Number(match[1]);
  var month = Number(match[2]);
  var year = Number(match[3]);
  if (day < 1 || day > 31) return null;
  if (month < 1 || month > 12) return null;
  if (year < 2026 || year > 2030) return null;
  return { day: day, month: month, year: year };
}

function isValidDateValue(value) {
  var parsed = parseDateInput(value);
  if (!parsed) return false;
  var dt = new Date(parsed.year, parsed.month - 1, parsed.day);
  return dt.getFullYear() === parsed.year && dt.getMonth() === parsed.month - 1 && dt.getDate() === parsed.day && parsed.year >= 2026 && parsed.year <= 2030;
}

function normalizeDateValue(value) {
  var parsed = parseDateInput(value);
  if (!parsed) return '';
  return parsed.year + '-' + String(parsed.month).padStart(2, '0') + '-' + String(parsed.day).padStart(2, '0');
}

function normalizeBottleSize(value) {
  var trimmed = (value || '').trim();
  if (!trimmed) return '';
  var normalized = trimmed.replace(/\s+/g, ' ').replace(/[–—−]/g, '-');
  var lower = normalized.toLowerCase();
  if (/250/.test(lower) && /ml/.test(lower)) return '250 ml - The Petite';
  if (/330/.test(lower) && /ml/.test(lower)) return '330 ml - The Classic';
  if (/500/.test(lower) && /ml/.test(lower)) return '500 ml - The Grand';
  if (/750/.test(lower) && /ml/.test(lower)) return '750 ml - The Prestige';
  if (/consultation/i.test(lower)) return 'Consultation first';
  return normalized;
}

function validateEnquiryField(id) {
  var el = document.getElementById(id);
  if (!el) return true;
  var value = (el.value || '').trim();
  var isValid = true;
  switch (id) {
    case 'f-name':
      isValid = value.length >= 2 && !(/[<>]/.test(value));
      break;
    case 'f-email':
      isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      break;
    case 'f-phone':
      isValid = !value || /^[0-9+\-() ]{7,20}$/.test(value);
      break;
    case 'f-date':
      isValid = !value || isValidDateValue(value);
      break;
    case 'f-guests':
      isValid = !!value;
      break;
    case 'f-size':
      isValid = !!normalizeBottleSize(value);
      break;
    case 'f-engraving':
      isValid = !value || (value.length <= 200 && !/[<>]/.test(value));
      break;
    case 'f-vision':
      isValid = !value || (value.length <= 2000 && !/[<>]/.test(value));
      break;
  }
  setFieldError(id, !isValid);
  return isValid;
}

function bindEnquiryFieldValidation() {
  ['f-name', 'f-email', 'f-phone', 'f-date', 'f-guests', 'f-size', 'f-engraving', 'f-script', 'f-palette', 'f-packaging', 'f-custom-message', 'f-vision'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    var eventName = id === 'f-guests' || id === 'f-size' ? 'change' : 'input';
    el.addEventListener(eventName, function () { validateEnquiryField(id); });
  });
}

function validateEnquiryForm() {
  var name = (document.getElementById('f-name') || {}).value || '';
  var email = (document.getElementById('f-email') || {}).value || '';
  var phone = (document.getElementById('f-phone') || {}).value || '';
  var wDate = (document.getElementById('f-date') || {}).value || '';
  var guests = (document.getElementById('f-guests') || {}).value || '';
  var size = normalizeBottleSize((document.getElementById('f-size') || {}).value || '');
  var engraving = (document.getElementById('f-engraving') || {}).value || '';
  var script = (document.getElementById('f-script') || {}).value || '';
  var palette = (document.getElementById('f-palette') || {}).value || '';
  var packaging = (document.getElementById('f-packaging') || {}).value || '';
  var customMessage = (document.getElementById('f-custom-message') || {}).value || '';
  var vision = (document.getElementById('f-vision') || {}).value || '';
  name = name.trim();
  email = email.trim();
  phone = phone.trim();
  engraving = engraving.trim();
  script = script.trim();
  palette = palette.trim();
  packaging = packaging.trim();
  customMessage = customMessage.trim();
  vision = vision.trim();

  var errs = [];
  if (!name || name.length < 2) errs.push('Please enter your full name.');
  if (!email) errs.push('Please enter your email address.');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('Please enter a valid email address.');
  if (phone && !/^[0-9+\-() ]{7,20}$/.test(phone)) errs.push('Please enter a valid phone number.');
  if (wDate && !isValidDateValue(wDate)) errs.push('Please enter a valid wedding date.');
  if (!guests) errs.push('Please choose an estimated guest count.');
  if (!size) errs.push('Please choose a bottle size.');
  if (engraving && engraving.length > 200) errs.push('Engraving text is too long.');
  if (script && script.length > 80) errs.push('Script choice is too long.');
  if (palette && palette.length > 200) errs.push('Palette notes are too long.');
  if (packaging && packaging.length > 80) errs.push('Packaging choice is too long.');
  if (customMessage && customMessage.length > 1000) errs.push('Custom message is too long.');
  if (vision && vision.length > 2000) errs.push('Vision notes are too long.');
  if (/[<>]/.test(name) || /[<>]/.test(engraving) || /[<>]/.test(script) || /[<>]/.test(palette) || /[<>]/.test(packaging) || /[<>]/.test(customMessage) || /[<>]/.test(vision)) errs.push('Please remove unsupported characters from your message.');
  ['f-name', 'f-email', 'f-phone', 'f-date', 'f-guests', 'f-size', 'f-engraving', 'f-script', 'f-palette', 'f-packaging', 'f-custom-message', 'f-vision'].forEach(function (id) { setFieldError(id, false); });
  if (!errs.length) {
    return { ok: true, name: name, email: email, phone: phone, wedding_date: wDate, guest_count: guests, bottle_size: size, engraving_text: engraving, script_choice: script, palette: palette, packaging: packaging, custom_message: customMessage, vision: vision };
  }
  if (!name || name.length < 2) setFieldError('f-name', true);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) setFieldError('f-email', true);
  if (phone && !/^[0-9+\-() ]{7,20}$/.test(phone)) setFieldError('f-phone', true);
  if (wDate && !/^\d{4}-\d{2}-\d{2}$/.test(wDate)) setFieldError('f-date', true);
  if (!guests) setFieldError('f-guests', true);
  if (!size) setFieldError('f-size', true);
  if (engraving && engraving.length > 200) setFieldError('f-engraving', true);
  if (script && script.length > 80) setFieldError('f-script', true);
  if (palette && palette.length > 200) setFieldError('f-palette', true);
  if (packaging && packaging.length > 80) setFieldError('f-packaging', true);
  if (customMessage && customMessage.length > 1000) setFieldError('f-custom-message', true);
  if (vision && vision.length > 2000) setFieldError('f-vision', true);
  return { ok: false, errors: errs };
}

function createMailtoFallback(validation) {
  var subject = 'Aqua Vèntèra Enquiry — ' + validation.name;
  var body = 'Name: ' + validation.name + '\nEmail: ' + validation.email + '\nPhone: ' + validation.phone + '\nWedding Date: ' + validation.wedding_date + '\nGuests: ' + validation.guest_count + '\nBottle Size: ' + validation.bottle_size + '\nEngraving: ' + validation.engraving_text + '\nVision: ' + validation.vision;
  window.location.href = 'mailto:hello@aquaventera.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}

// Per-tab memory so switching Initials → Wedding Date → Custom Verse
// never wipes out what was already typed in another tab.
var tabValues = { initials: '', date: '', verse: '' };
var tabDefaults = { initials: 'R&S', date: '14.02.2026', verse: 'Forever begins today' };
var tabConfig = {
  initials: { placeholder: 'e.g. R & S', maxLength: 8 },
  date: { placeholder: 'DD.MM.YYYY (auto-formatted, years 2026–2030)', maxLength: 10 },
  verse: { placeholder: 'e.g. Forever begins today', maxLength: 50 }
};
var currentFont = 'italic';
var FONTS = {
  italic: { style: 'italic', weight: '300', ls: '-0.03em', transform: 'none', family: "var(--f-serif)", lbl: 'Italic Script' },
  serif: { style: 'normal', weight: '400', ls: '0.05em', transform: 'none', family: "var(--f-serif)", lbl: 'Classic Serif' },
  modern: { style: 'normal', weight: '300', ls: '0.22em', transform: 'uppercase', family: "var(--f-sans)", lbl: 'Modern Roman' },
  nastaliq: { style: 'italic', weight: '300', ls: '0.02em', transform: 'none', family: "var(--f-serif)", lbl: 'Nastaliq Style' },
  deco: { style: 'normal', weight: '500', ls: '0.3em', transform: 'uppercase', family: "var(--f-sans)", lbl: 'Art Deco' }
};

// Scales the live-preview glyph to fit whatever is typed, and switches
// the ring to an elongated "plaque" shape for longer custom verses.
function sizeMonoDisplay(text) {
  var ring = document.querySelector('.mono-ring');
  var d = document.getElementById('mono-disp');
  if (!ring || !d) return;
  var len = (text || '').length;

  if (currentTab === 'verse') {
    ring.classList.add('mono-plaque');
    d.style.whiteSpace = 'normal';
    d.style.fontSize = (len > 30 ? 15 : len > 20 ? 17 : len > 12 ? 19 : 22) + 'px';
  } else {
    ring.classList.remove('mono-plaque');
    d.style.whiteSpace = 'nowrap';
    if (currentTab === 'date') {
      d.style.fontSize = (len > 8 ? 28 : 34) + 'px';
    } else {
      d.style.fontSize = (len > 6 ? 52 : len > 4 ? 68 : 92) + 'px';
    }
  }
}

// Live preview update
function updateMono(v) {
  var d = document.getElementById('mono-disp');
  var text = (v || '').trim() || tabDefaults[currentTab];
  if (d) d.textContent = text;
  sizeMonoDisplay(text);

  // Update SVG engraving text live (initials tab only — that's what the bottle shows)
  var engT = document.getElementById('eng-initials-text');
  if (engT) engT.textContent = (currentTab === 'initials' && v && v.trim()) ? v.trim() : 'R & S';
}

// Handles typing in the input box
function handleInput(input) {
  var value = input.value;

  // Wedding Date: digits only, auto-insert dots as DD.MM.YYYY — never a native date input
  if (currentTab === 'date') {
    value = value.replace(/\D/g, '').substring(0, 8);
    if (value.length > 4) {
      value = value.replace(/^(\d{2})(\d{2})(\d{0,4})$/, '$1.$2.$3');
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{0,2})$/, '$1.$2');
    }
    input.value = value;
  }

  tabValues[currentTab] = input.value;
  updateMono(input.value);
}

// Preview button — pulses the ring and forces the current value to render
function triggerEngPreview() {
  var input = document.getElementById('mono-in');
  if (!input) return;
  if (!input.value.trim()) {
    input.value = tabDefaults[currentTab];
    tabValues[currentTab] = input.value;
  }
  updateMono(input.value);

  var ring = document.querySelector('.mono-ring');
  if (ring) {
    ring.style.boxShadow = '0 0 0 2px rgba(201,168,76,.55), 0 0 44px rgba(201,168,76,.25)';
    setTimeout(function () { ring.style.boxShadow = ''; }, 600);
  }
}

// Tab switching — restores whatever was already typed on that tab
function setTab(t, el) {
  var input = document.getElementById('mono-in');
  if (input) tabValues[currentTab] = input.value;

  currentTab = t;
  document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('on'); });
  if (el) el.classList.add('on');
  else {
    var match = document.querySelector('.tab[data-tab="' + t + '"]');
    if (match) match.classList.add('on');
  }

  if (!input) return;
  var cfg = tabConfig[t] || tabConfig.initials;
  input.placeholder = cfg.placeholder;
  input.maxLength = cfg.maxLength;
  input.value = tabValues[t] || '';
  updateMono(input.value);
}

// Font style selection
function setChip(s, el) {
  if (!FONTS[s]) return;
  document.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('on'); });
  if (el) el.classList.add('on');

  currentFont = s;
  var d = document.getElementById('mono-disp');
  var l = document.getElementById('mono-lbl');
  if (!d || !l) return;

  var f = FONTS[s];
  d.style.fontStyle = f.style;
  d.style.fontWeight = f.weight;
  d.style.letterSpacing = f.ls;
  d.style.textTransform = f.transform;
  d.style.fontFamily = f.family;
  l.textContent = 'Live preview · ' + f.lbl;
}

// ===== CSP Event Listeners =====

// Tabs
document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", function () {
        setTab(this.dataset.tab, this);
    });
});

// Font chips
document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", function () {
        setChip(this.dataset.font, this);
    });
});

// Preview button
document.getElementById("preview-btn")
?.addEventListener("click", triggerEngPreview);

// Input
document.getElementById("mono-in")
?.addEventListener("input", function () {
    handleInput(this);
});

// Initialize the studio in its default state (Initials tab, Italic Script font)
(function initEngravingStudio() {
  var input = document.getElementById('mono-in');
  if (input) {
    input.placeholder = tabConfig.initials.placeholder;
    input.maxLength = tabConfig.initials.maxLength;
  }
  updateMono('');
})();

// Submit
document.getElementById("form-submit-btn")?.addEventListener("click", function () {
    console.log("Button clicked");
    submitEnquiry();
});