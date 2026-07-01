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

function updateMono(v) {
  var d = document.getElementById('mono-disp');
  if (d) d.textContent = v.trim() || 'R&S';
  var engT = document.getElementById('eng-initials-text');
  if (engT) engT.textContent = v.trim() || 'R & S';
}

function handleInput(input) {
  var value = input.value;
  if (currentTab === 'date') {
    value = value.replace(/\D/g, '');
    value = value.substring(0, 8);
    if (value.length > 4) {
      value = value.replace(/^(\d{2})(\d{2})(\d{0,4})$/, '$1.$2.$3');
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{0,2})$/, '$1.$2');
    }
    input.value = value;
  }
  updateMono(input.value);
}

function triggerEngPreview() {
  var input = document.getElementById('mono-in');
  if (!input) return;
  var v = input.value;
  if (!v.trim()) {
    input.value = 'R & S';
    updateMono('R & S');
  } else {
    updateMono(v);
  }
  var ring = document.querySelector('.mono-ring');
  if (ring) {
    ring.style.boxShadow = '0 0 0 2px rgba(201,168,76,.5)';
    setTimeout(function () { ring.style.boxShadow = ''; }, 600);
  }
}

function setTab(t, el) {
  currentTab = t;
  document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('on'); });
  if (el) el.classList.add('on');
  var input = document.getElementById('mono-in');
  if (!input) return;
  if (t === 'initials') {
    input.placeholder = 'e.g. R & S';
    input.maxLength = 8;
  } else if (t === 'date') {
    input.placeholder = 'DD (01-31).MM (01-12).YYYY (2026-2030 only)';
    input.maxLength = 10;
  } else if (t === 'verse') {
    input.placeholder = 'e.g. Forever begins today';
    input.maxLength = 50;
  }
  input.value = '';
  updateMono('');
}

function setChip(s, el) {
  document.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('on'); });
  if (el) el.classList.add('on');
  var d = document.getElementById('mono-disp');
  var l = document.getElementById('mono-lbl');
  if (!d || !l) return;
  var m = {
    italic: { style: 'italic', weight: '300', ls: '-0.03em', lbl: 'Live preview · Italic Script' },
    serif: { style: 'normal', weight: '400', ls: '0.05em', lbl: 'Live preview · Classic Serif' },
    modern: { style: 'normal', weight: '300', ls: '0.22em', lbl: 'Live preview · Modern Roman' },
    nastaliq: { style: 'italic', weight: '300', ls: '0.02em', lbl: 'Live preview · Nastaliq Style' }
  };
  if (!m[s]) return;
  d.style.fontStyle = m[s].style;
  d.style.fontWeight = m[s].weight;
  d.style.letterSpacing = m[s].ls;
  l.textContent = m[s].lbl;
}

var currentTab = 'initials';
var SZ = {
  '250': { w: 66, h: 195, waterY: 270, barW: '35%', mm: '145mm', label: '250 ml' },
  '330': { w: 88, h: 260, waterY: 200, barW: '52%', mm: '185mm', label: '330 ml' },
  '500': { w: 100, h: 310, waterY: 155, barW: '66%', mm: '220mm', label: '500 ml' },
  '750': { w: 112, h: 365, waterY: 105, barW: '80%', mm: '258mm', label: '750 ml' },
  'inf': { w: 120, h: 400, waterY: 60, barW: '93%', mm: 'Custom', label: 'Custom' }
};

function selectSize(card, ml, detail) {
  document.querySelectorAll('.sz-card').forEach(function (c) { c.classList.remove('active-sz'); });
  if (card) card.classList.add('active-sz');
  var d = SZ[ml] || SZ['330'];
  var nameTxt = card ? (card.getAttribute('data-name') || card.querySelector('.sz-name').textContent) : 'The Classic';
  var detailTxt = detail || (card ? (card.getAttribute('data-detail') || '') : '');
  var svName = document.getElementById('sv-name');
  if (svName) svName.textContent = nameTxt;
  var svMl = document.getElementById('sv-ml');
  if (svMl) svMl.textContent = d.label;
  var svDet = document.getElementById('sv-det');
  if (svDet) svDet.textContent = detailTxt;
  var svLbl = document.getElementById('sv-lbl');
  if (svLbl) svLbl.textContent = nameTxt;
  var svMm = document.getElementById('sv-mm');
  if (svMm) svMm.textContent = d.mm;
  var svg = document.getElementById('sv-svg');
  if (svg) {
    svg.style.width = d.w + 'px';
    svg.style.height = d.h + 'px';
  }
  var water = document.getElementById('sv-water');
  var wsurf = document.getElementById('sv-wsurf');
  if (water) {
    water.setAttribute('y', d.waterY);
    water.setAttribute('height', 384 - d.waterY);
  }
  if (wsurf) wsurf.setAttribute('cy', d.waterY);
  var bar = document.getElementById('sv-bar');
  if (bar) bar.style.width = d.barW;
  var formSel = document.getElementById('f-size');
  if (formSel) {
    var opts = formSel.options;
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].text.includes(d.label.split(' ')[0] + ' ml') || opts[i].text.toLowerCase().includes(nameTxt.toLowerCase())) {
        formSel.selectedIndex = i;
        break;
      }
    }
  }
}

function bindSizeCards() {
  document.querySelectorAll('.sz-card').forEach(function (card) {
    card.addEventListener('click', function () {
      var ml = card.getAttribute('data-ml') || '330';
      var name = card.getAttribute('data-name') || '';
      var detail = card.getAttribute('data-detail') || '';
      selectSize(card, ml, detail, name);
    });
  });
}

function submitEnquiry() {
  var btn = document.getElementById('form-submit-btn');
  var successEl = document.getElementById('form-success');
  var errorEl = document.getElementById('form-error');
  var errMsg = document.getElementById('form-error-msg');
  if (successEl) successEl.style.display = 'none';
  if (errorEl) errorEl.style.display = 'none';
  if (!errMsg || !btn) return;

  var validation = validateEnquiryForm();
  if (!validation.ok) {
    errMsg.textContent = validation.errors.join(' ');
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Sending…';
  var formData = new FormData();
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
  var uploadEl = document.getElementById('f-attachments');
  if (uploadEl && uploadEl.files) {
    Array.from(uploadEl.files).forEach(function (file) { formData.append('attachments', file); });
  }

  fetch('/api/enquiry', {
    method: 'POST',
    headers: { 'x-csrf-token': getCookie('XSRF-TOKEN') },
    body: formData
  }).then(function (res) {
    return res.json().then(function (json) { return { res: res, json: json }; });
  }).then(function (result) {
    if (result.res.ok) {
      successEl.style.display = 'block';
      document.getElementById('form-success-msg').textContent = result.json.message || 'We will be in touch within 24 hours.';
      document.getElementById('form-success-ref').textContent = result.json.ref ? ('Reference: ' + result.json.ref) : '';
      btn.style.display = 'none';
      ['f-name', 'f-email', 'f-phone', 'f-date', 'f-engraving', 'f-vision'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
      });
      return;
    }
    var msg = result.json.errors ? result.json.errors.map(function (e) { return e.msg; }).join(' · ') : (result.json.error || 'Submission failed. Please try again.');
    errMsg.textContent = msg;
    errorEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Request a Design Consultation →';
  }).catch(function () {
    createMailtoFallback(validation);
    btn.disabled = false;
    btn.textContent = 'Request a Design Consultation →';
  });
}

function onPageReady() {
  bindEnquiryFieldValidation();
  bindSizeCards();
  var tabs = document.querySelectorAll('[data-tab]');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      setTab(tab.dataset.tab, tab);
    });
  });
  var monoIn = document.getElementById('mono-in');
  if (monoIn) {
    monoIn.addEventListener('input', function () { handleInput(monoIn); });
  }
  var previewBtn = document.getElementById('preview-btn');
  if (previewBtn) previewBtn.addEventListener('click', triggerEngPreview);
  var chips = document.querySelectorAll('[data-chip]');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () { setChip(chip.dataset.chip, chip); });
  });
  var submitBtn = document.getElementById('form-submit-btn');
  if (submitBtn) submitBtn.addEventListener('click', function (event) {
    event.preventDefault();
    submitEnquiry();
  });
  var navLinks = document.querySelectorAll('nav a[href^="#"]');
  navLinks.forEach(function (link) {
    if (link.getAttribute('href') === '#') return;
    link.addEventListener('click', function (event) {
      if (link.hash) {
        event.preventDefault();
        var target = document.querySelector(link.hash);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
  window.addEventListener('scroll', function () {
    document.getElementById('nav').classList.toggle('stuck', window.scrollY > 60);
  });
  document.querySelectorAll('.rv').forEach(function (el) { rvIO.observe(el); });
  var card = document.querySelector('.sz-card.active-sz');
  if (card) selectSize(card, '330', '330 ml · Borosilicate · Three cap finishes');
  tick();
}

var rvIO = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) entry.target.classList.add('in');
  });
}, { threshold: 0.08 });

var dustEl = document.getElementById('dust-layer');
if (dustEl) {
  for (var i = 0; i < 30; i++) {
    var p = document.createElement('div');
    p.className = 'dust-p spark spark-' + (i % 4 + 1);
    p.style.animationDelay = (Math.random() * 8) + 's';
    p.style.animationDuration = (6 + Math.random() * 6) + 's';
    p.style.width = (1 + Math.random() * 2) + 'px';
    p.style.height = (1 + Math.random() * 2) + 'px';
    dustEl.appendChild(p);
  }
}

var storyEl = document.getElementById('story');
var svgBottle = document.getElementById('svg-bottle');
var svgCap = document.getElementById('svg-cap');
var capBody = document.getElementById('cap-body');
var capTopdown = document.getElementById('cap-topdown');
var svgWater2 = document.getElementById('svg-water');
var svgWaterSurf = document.getElementById('svg-water-surf');
var svgEngraving = document.getElementById('svg-engraving');
var svgLaserDot = document.getElementById('svg-laser-dot');
var svgLaserTrail = document.getElementById('svg-laser-trail');
var floorRef = document.getElementById('floor-ref');
var zoomRing = document.getElementById('zoom-ring');
var laserWrap = document.getElementById('laser-wrap');
var engLabel = document.getElementById('eng-label');
var rimLight = document.querySelector('.rim-light');
var panels = [1,2,3,4,5].map(function (i) { return document.getElementById('sp' + i); });
var dots = [0,1,2,3,4].map(function (i) { return document.getElementById('d' + i); });
var phaseWordEl = document.getElementById('story-phase');
var phaseNames = ['The Vessel', 'The Cap Descends', 'The Seal', 'Cut by Light', 'The Gift'];
var lastPh = -1;

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function ss(lo, hi, v) { var t = clamp((v - lo) / (hi - lo), 0, 1); return t * t * (3 - 2 * t); }
function lerp(a, b, t) { return a + (b - a) * t; }

function getP() {
  if (!storyEl) return 0;
  var r = storyEl.getBoundingClientRect();
  var total = storyEl.offsetHeight - window.innerHeight;
  if (total <= 0) return 0;
  return clamp(-r.top / total, 0, 1);
}

function tick() {
  requestAnimationFrame(tick);
  var p = getP();
  var ph = 0;
  if (p < 0.15) {
    var t = ss(0, 0.15, p); ph = 0;
    if (svgBottle) { svgBottle.style.transform = 'translateY(' + lerp(120, 0, t) + 'px)'; svgBottle.style.opacity = t; }
    if (svgWater2) { svgWater2.setAttribute('y', lerp(480, 300, t)); svgWater2.setAttribute('height', Math.max(0, 384 - (lerp(480, 300, t) || 0))); svgWater2.style.opacity = t * 0.9; }
    if (svgWaterSurf) { svgWaterSurf.setAttribute('cy', lerp(480, 300, t)); svgWaterSurf.style.opacity = t * 0.8; }
    if (svgCap) { svgCap.style.transform = 'translateY(-300px)'; svgCap.style.opacity = '0'; }
    if (svgEngraving) svgEngraving.style.opacity = '0';
    if (svgLaserDot) svgLaserDot.style.opacity = '0';
    if (svgLaserTrail) svgLaserTrail.style.opacity = '0';
    if (zoomRing) zoomRing.classList.remove('show');
    if (laserWrap) laserWrap.classList.remove('show');
    if (engLabel) engLabel.classList.remove('show');
    if (floorRef) floorRef.style.opacity = t * 0.8;
    if (rimLight) rimLight.style.opacity = t * 0.5;
  } else if (p < 0.32) {
    var t = ss(0.15, 0.32, p); ph = 1;
    if (svgBottle) { svgBottle.style.transform = 'translateY(0px)'; svgBottle.style.opacity = '1'; }
    if (svgWater2) svgWater2.style.opacity = '0.85';
    if (svgCap) { svgCap.style.transform = 'translateY(' + lerp(-260, -10, t) + 'px) scaleX(' + lerp(1.4,1,t) + ')'; svgCap.style.opacity = Math.min(1,t*2); }
    if (capTopdown) capTopdown.style.opacity = Math.min(1,t*1.5);
    if (capBody) capBody.style.opacity = Math.max(0,1-t*2);
    if (svgEngraving) svgEngraving.style.opacity = '0';
    if (svgLaserDot) svgLaserDot.style.opacity = '0';
    if (svgLaserTrail) svgLaserTrail.style.opacity = '0';
    if (zoomRing) zoomRing.classList.remove('show');
    if (laserWrap) laserWrap.classList.remove('show');
    if (engLabel) engLabel.classList.remove('show');
    if (floorRef) floorRef.style.opacity = '0.8';
    if (rimLight) rimLight.style.opacity = '0.5';
  } else if (p < 0.48) {
    var t = ss(0.32, 0.48, p); ph = 2;
    if (svgBottle) { svgBottle.style.transform = 'translateY(0px)'; svgBottle.style.opacity = '1'; }
    if (svgCap) { var bounce = t < 0.85 ? lerp(-10, -2, ss(0,0.85,t)) : lerp(-2,0,ss(0.85,1,t)); svgCap.style.transform = 'translateY(' + bounce + 'px)'; svgCap.style.opacity = '1'; }
    if (capTopdown) capTopdown.style.opacity = Math.max(0,1-t*1.5);
    if (capBody) capBody.style.opacity = Math.min(1,t*1.5);
    if (svgEngraving) svgEngraving.style.opacity = '0';
    if (svgLaserDot) svgLaserDot.style.opacity = '0';
    if (svgLaserTrail) svgLaserTrail.style.opacity = '0';
    if (zoomRing) zoomRing.classList.remove('show');
    if (laserWrap) laserWrap.classList.remove('show');
    if (engLabel) engLabel.classList.remove('show');
    if (floorRef) floorRef.style.opacity = '1';
    if (rimLight) rimLight.style.opacity = '0.8';
  } else if (p < 0.58) {
    var t = ss(0.48, 0.58, p); ph = 3;
    if (svgBottle) svgBottle.style.transform = 'translateY(' + lerp(0,60,t) + 'px) scale(' + lerp(1,1.5,t) + ')';
    if (svgCap) svgCap.style.transform = 'translateY(' + lerp(0,60,t) + 'px) scale(' + lerp(1,1.5,t) + ')';
    if (svgEngraving) svgEngraving.style.opacity = t;
    if (zoomRing) zoomRing.classList.toggle('show', t>0.4);
    if (engLabel) engLabel.classList.toggle('show', t>0.6);
    if (laserWrap) laserWrap.classList.remove('show');
    if (svgLaserDot) svgLaserDot.style.opacity = '0';
    if (svgLaserTrail) svgLaserTrail.style.opacity = '0';
    if (floorRef) floorRef.style.opacity = '1';
    if (rimLight) rimLight.style.opacity = '1';
  } else if (p < 0.80) {
    var t = ss(0.58, 0.80, p); ph = 3;
    if (svgBottle) svgBottle.style.transform = 'translateY(60px) scale(1.5) skewY(' + (Math.sin(t * Math.PI * 2) * 6 * 0.4) + 'deg)';
    if (svgCap) svgCap.style.transform = 'translateY(60px) scale(1.5) skewY(' + (Math.sin(t * Math.PI * 2) * 6 * 0.4) + 'deg)';
    if (svgEngraving) svgEngraving.style.opacity = '1';
    if (laserWrap) laserWrap.classList.add('show');
    if (svgLaserDot) svgLaserDot.style.opacity = '1';
    if (svgLaserTrail) svgLaserTrail.style.opacity = '1';
    if (zoomRing) zoomRing.classList.add('show');
    if (engLabel) engLabel.classList.add('show');
    if (floorRef) floorRef.style.opacity = '1';
    if (rimLight) rimLight.style.opacity = '' + (0.8 + Math.sin(t * Math.PI * 4) * 0.2);
  } else {
    var t = ss(0.80, 1.0, p); ph = 4;
    if (svgBottle) svgBottle.style.transform = 'translateY(' + lerp(60, -20, t) + 'px) scale(' + lerp(1.5, 1.05, t) + ')';
    if (svgCap) svgCap.style.transform = 'translateY(' + lerp(60, -20, t) + 'px) scale(' + lerp(1.5, 1.05, t) + ')';
    if (svgEngraving) svgEngraving.style.opacity = '1';
    if (laserWrap) laserWrap.classList.remove('show');
    if (svgLaserDot) svgLaserDot.style.opacity = '0';
    if (svgLaserTrail) svgLaserTrail.style.opacity = '0';
    if (zoomRing) zoomRing.classList.remove('show');
    if (engLabel) engLabel.classList.add('show');
    if (floorRef) floorRef.style.opacity = '' + lerp(1, 0.6, t);
    if (rimLight) rimLight.style.opacity = '' + lerp(1, 1.5, t);
  }
  panels.forEach(function (el, i) { if (el) el.classList.toggle('show', i === ph); });
  dots.forEach(function (el, i) { if (el) el.classList.toggle('on', i === ph); });
  if (ph !== lastPh && phaseWordEl) phaseWordEl.textContent = phaseNames[ph];
  lastPh = ph;
}

document.addEventListener('DOMContentLoaded', onPageReady);
