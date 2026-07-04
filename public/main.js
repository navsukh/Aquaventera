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
// viewBox and the same gold cap, so only the body/neck/engraving zone change.
var MODEL_SHAPES = {
  heritage: {
    body:'M42,80 Q34,88 33,98 L32,114 L32,374 Q32,382 38,384 L82,384 Q88,382 88,374 L88,114 L87,98 Q86,88 78,80 Z',
    shoulder:'M37,118 Q60,112 83,118',
    edges:{x1:33,x2:87,y1:118,y2:370},
    ring:{cx:60,cy:260,rx:22,ry:28},
    floorRx:32
  },
  sovereign: {
    body:'M50,68 Q35,80 30,102 Q25,145 25,230 Q25,318 31,354 Q36,378 50,384 L70,384 Q84,378 89,354 Q95,318 95,230 Q95,145 90,102 Q85,80 70,68 Q60,62 50,68 Z',
    shoulder:'M30,140 Q60,132 90,140',
    edges:{x1:27,x2:93,y1:140,y2:356},
    ring:{cx:60,cy:250,rx:28,ry:34},
    floorRx:36
  },
  aria: {
    body:'M34,96 Q26,112 28,132 L30,150 Q30,172 40,194 Q50,224 50,262 Q50,300 46,332 Q42,360 45,378 Q48,384 60,384 Q72,384 75,378 Q78,360 74,332 Q70,300 70,262 Q70,224 80,194 Q90,172 90,150 L92,132 Q94,112 86,96 Q78,80 60,80 Q42,80 34,96 Z',
    shoulder:'M30,108 Q60,102 90,108',
    edges:{x1:29,x2:91,y1:108,y2:376},
    ring:{cx:60,cy:230,rx:18,ry:22},
    floorRx:22
  },
  palazzo: {
    body:'M46,56 Q37,64 35,82 Q33,110 33,162 Q33,262 35,322 Q37,368 44,382 Q48,384 60,384 Q72,384 76,382 Q83,368 85,322 Q87,262 87,162 Q87,110 85,82 Q83,64 74,56 Q67,50 60,50 Q53,50 46,56 Z',
    shoulder:'M35,94 Q60,88 85,94',
    edges:{x1:34,x2:86,y1:94,y2:378},
    ring:{cx:60,cy:245,rx:19,ry:30},
    floorRx:30
  },
  meridian: {
    body:'M34,110 L30,368 Q30,382 39,384 L81,384 Q90,382 90,368 L86,110 Q84,90 74,80 L46,80 Q36,90 34,110 Z',
    shoulder:'M32,120 Q60,114 88,120',
    edges:{x1:31,x2:89,y1:120,y2:366},
    ring:{cx:60,cy:255,rx:26,ry:26},
    floorRx:34
  }
};

var activeModel = 'heritage';
var activeSize = '330';

// Simplified silhouette used for the collection-grid thumbnails — same path
// data as the configurator so the shape a person picks is the shape they get.
function thumbSVG(shape){
  return '<svg viewBox="0 0 120 420" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;overflow:visible;">'
    + '<path d="' + shape.body + '" fill="rgba(201,168,76,0.08)" stroke="rgba(201,168,76,0.55)" stroke-width="2"/>'
    + '<rect x="44" y="10" width="32" height="28" rx="1.5" fill="rgba(201,168,76,0.35)" stroke="rgba(248,222,140,0.4)" stroke-width="1"/>'
    + '<ellipse cx="60" cy="10" rx="16" ry="5" fill="rgba(201,168,76,0.3)"/>'
    + '</svg>';
}

function renderModelThumbs(){
  MODELS.forEach(function(m){
    var el = document.querySelector('.model-thumb[data-thumb="' + m.id + '"]');
    if (el && MODEL_SHAPES[m.id]) el.innerHTML = thumbSVG(MODEL_SHAPES[m.id]);
  });
}

// Swaps the configurator's body/neck/engraving-zone geometry to match the model.
function applyModelShape(modelId){
  var s = MODEL_SHAPES[modelId];
  if (!s) return;

  var outline = document.getElementById('sv-outline');
  var clip = document.getElementById('sv-clip');
  var shoulder = document.getElementById('sv-shoulder');
  var edgeL = document.getElementById('sv-edge-l');
  var edgeR = document.getElementById('sv-edge-r');
  var ring = document.getElementById('sv-ring');
  var engText = document.getElementById('sv-eng-text');
  var engSub = document.getElementById('sv-eng-sub');
  var floor = document.getElementById('sv-floor');

  if (outline) outline.setAttribute('d', s.body);
  if (clip) clip.setAttribute('d', s.body);
  if (shoulder) shoulder.setAttribute('d', s.shoulder);
  if (edgeL) { edgeL.setAttribute('x1', s.edges.x1); edgeL.setAttribute('x2', s.edges.x1); edgeL.setAttribute('y1', s.edges.y1); edgeL.setAttribute('y2', s.edges.y2); }
  if (edgeR) { edgeR.setAttribute('x1', s.edges.x2); edgeR.setAttribute('x2', s.edges.x2); edgeR.setAttribute('y1', s.edges.y1); edgeR.setAttribute('y2', s.edges.y2); }
  if (ring) { ring.setAttribute('cx', s.ring.cx); ring.setAttribute('cy', s.ring.cy); ring.setAttribute('rx', s.ring.rx); ring.setAttribute('ry', s.ring.ry); }
  if (engText) engText.setAttribute('y', s.ring.cy + 5);
  if (engSub) engSub.setAttribute('y', s.ring.cy + 22);
  if (floor) floor.setAttribute('rx', s.floorRx);
}

// Renders the size-card row for whichever model is active.
function renderSizeCards(modelId){
  var wrap = document.getElementById('sz-cards-inner');
  if (!wrap) return;
  var avail = MODEL_SIZES[modelId] || [];
  var model = MODELS_BY_ID[modelId];

  wrap.innerHTML = avail.map(function(ml){
    var meta = SIZE_META[ml];
    var badgeHtml = (model && model.badge && ml === (avail[1] || avail[0])) ? '<div class="sz-badge">' + model.badge + '</div>' : '';
    return '<div class="sz-card' + (ml === activeSize ? ' active-sz' : '') + '" data-ml="' + ml + '">'
      + badgeHtml
      + '<div class="sz-ml">' + ml + '</div><p class="sz-name">' + meta.name + '</p>'
      + '<p class="sz-desc">' + meta.desc + '</p>'
      + '<p class="sz-det">' + ml + ' ml &middot; Borosilicate &middot; ' + (model ? model.name : '') + '</p>'
      + '</div>';
  }).join('');

  wrap.querySelectorAll('.sz-card').forEach(function(card){
    card.addEventListener('click', function(){ selectSize(card.getAttribute('data-ml')); });
  });
}

// Updates the configurator (visualizer panel) for the active model + size.
function selectSize(ml){
  var avail = MODEL_SIZES[activeModel] || [];
  if (avail.indexOf(ml) === -1) ml = avail[0];
  activeSize = ml;

  document.querySelectorAll('#sz-cards-inner .sz-card').forEach(function(c){
    c.classList.toggle('active-sz', c.getAttribute('data-ml') === ml);
  });

  var d = SIZE_DIMS[ml] || SIZE_DIMS['330'];
  var model = MODELS_BY_ID[activeModel];
  var meta = SIZE_META[ml];

  var svName = document.getElementById('sv-name');
  var svMl = document.getElementById('sv-ml');
  var svDet = document.getElementById('sv-det');
  var svLbl = document.getElementById('sv-lbl');
  var svMm = document.getElementById('sv-mm');
  if (svName) svName.textContent = model ? model.name : '';
  if (svMl) svMl.textContent = meta.name + ' · ' + d.label;
  if (svDet) svDet.innerHTML = d.label + ' &middot; Borosilicate &middot; ' + (model ? model.name : '');
  if (svLbl) svLbl.textContent = model ? model.name : 'This bottle';
  if (svMm) svMm.textContent = d.mm;

  var svg = document.getElementById('sv-svg');
  if (svg) { svg.style.width = d.w + 'px'; svg.style.height = d.h + 'px'; }

  var water = document.getElementById('sv-water');
  var wsurf = document.getElementById('sv-wsurf');
  if (water) { water.setAttribute('y', d.waterY); water.setAttribute('height', Math.max(0, 384 - d.waterY)); }
  if (wsurf) wsurf.setAttribute('cy', d.waterY);

  var bar = document.getElementById('sv-bar');
  if (bar) bar.style.width = d.barW;

  applyModelShape(activeModel);

  var formSel = document.getElementById('f-size');
  if (formSel) {
    var opts = formSel.options;
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].text.indexOf(d.label.split(' ')[0] + ' ml') !== -1) { formSel.selectedIndex = i; break; }
    }
  }
}

// Switches the active silhouette, re-renders its size options, and keeps the
// current size if that silhouette still offers it (otherwise falls back).
function selectModel(id){
  if (!MODELS_BY_ID[id]) return;
  activeModel = id;

  document.querySelectorAll('.model-card').forEach(function(c){
    var on = c.getAttribute('data-model') === id;
    c.classList.toggle('active-model', on);
    c.setAttribute('aria-pressed', on ? 'true' : 'false');
  });

  renderSizeCards(id);
  var avail = MODEL_SIZES[id] || [];
  selectSize(avail.indexOf(activeSize) !== -1 ? activeSize : avail[0]);
}

function bindModelCards(){
  document.querySelectorAll('.model-card').forEach(function(card){
    card.addEventListener('click', function(){ selectModel(card.getAttribute('data-model')); });
  });
}

renderModelThumbs();
bindModelCards();
selectModel('heritage');
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