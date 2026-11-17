/* ==========================================================================
   EDGE · QUIET — behaviour for quiet.css
   Presentational and defensive, like calm.js: it never calls into the app,
   never changes saved data, and every effect is wrapped so a failure here
   can't stop a click from reaching the tool. Respects "reduce motion" and
   does nothing on published reports or embeds.

     · keyword rows open and close on a click, and stay open through a re-draw
     · a rank badge pops (and the row flashes) when its position changes
     · the button you pressed shows a spinner while its request is out
     · the screen you open arrives top to bottom
     · tooltips that match the tool instead of the browser's yellow box
     · the hub greets whoever is signed in
   ========================================================================== */
(function(){
'use strict';
const RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : {matches:false};
const safe = fn => function(){ try{ return fn.apply(this, arguments); }catch(e){ /* never in the way */ } };
const offApp = () => { const b = document.body; return !b || b.classList.contains('report-mode') || b.classList.contains('embed-mode'); };

/* ------------------------------------------------ keyword rows open/close */
/* The working-out under a keyword (reads, domains seen, coordinates) is one
   clipped line until the row is clicked. Which rows are open is remembered
   here by the row's own key, because the list is rebuilt on every save. */
const openRows = new Set();
const INTERACTIVE = 'a, button, input, select, textarea, label, summary, details, [role="button"], [contenteditable="true"]';
document.addEventListener('click', safe(e => {
  if (offApp()) return;
  const row = e.target.closest && e.target.closest('#seoview-keywords .seo-lg-row');
  if (!row || e.target.closest(INTERACTIVE)) return;
  const sel = window.getSelection && String(window.getSelection());
  if (sel) return;                                   /* selecting text is not a click */
  const key = row.dataset.scankey || '';
  const open = !row.classList.contains('q-open');
  row.classList.toggle('q-open', open);
  if (key){ if (open) openRows.add(key); else openRows.delete(key); }
}));
/* Enter or Space on a focused row does the same. */
document.addEventListener('keydown', safe(e => {
  if (offApp() || (e.key !== 'Enter' && e.key !== ' ')) return;
  const row = e.target.classList && e.target.classList.contains('seo-lg-row') ? e.target : null;
  if (!row) return;
  e.preventDefault();
  row.click();
}));

/* ------------------------------------------ rank badges react to a change */
const lastRank = new Map();
let rankSeeded = false;
const rankNum = t => { const m = /^#?(\d+)$/.exec(String(t || '').trim()); return m ? +m[1] : null; };
const sweepRows = safe(() => {
  const list = document.getElementById('seoKeywordList');
  if (!list || offApp()) return;
  const rows = list.querySelectorAll('.seo-lg-row[data-scankey]');
  const fresh = [];
  rows.forEach(row => {
    const key = row.dataset.scankey;
    if (openRows.has(key)) row.classList.add('q-open');
    if (!row.hasAttribute('tabindex')) row.setAttribute('tabindex', '0');
    const pill = row.querySelector('.seo-lg-metrics .rank-pill');
    if (!pill) return;
    const now = pill.textContent.trim();
    const was = lastRank.get(key);
    lastRank.set(key, now);
    if (rankSeeded && was === undefined){ fresh.push(row); return; }
    if (!rankSeeded || was === undefined || was === now || RM.matches) return;
    const a = rankNum(was), b = rankNum(now);
    pill.classList.remove('q-pop', 'q-up', 'q-down'); void pill.offsetWidth;
    pill.classList.add('q-pop');
    if (b != null && (a == null || b < a)) pill.classList.add('q-up');
    else if (a != null && (b == null || b > a)) pill.classList.add('q-down');
    row.classList.remove('q-flash'); void row.offsetWidth; row.classList.add('q-flash');
    setTimeout(() => { pill.classList.remove('q-pop', 'q-up', 'q-down'); row.classList.remove('q-flash'); }, 1600);
  });
  /* One or two rows that weren't here a moment ago were just added, and slide
     in. A whole group of them is a location being opened, which isn't news. */
  if (fresh.length && fresh.length <= 2 && !RM.matches) fresh.forEach(row => {
    row.classList.add('q-new');
    setTimeout(() => row.classList.remove('q-new'), 900);
  });
  rankSeeded = rankSeeded || rows.length > 0;
});
let sweepQueued = false;
const queueSweep = () => { if (sweepQueued) return; sweepQueued = true; requestAnimationFrame(() => { sweepQueued = false; sweepRows(); }); };
/* Switching client is a new list, not a set of changes to celebrate. */
let seededFor = null;
const watchList = safe(() => {
  const list = document.getElementById('seoKeywordList');
  if (!list || list._quietWatched) return;
  list._quietWatched = true;
  new MutationObserver(safe(() => {
    const first = list.querySelector('.seo-lg-row[data-scankey]');
    const owner = first ? String(first.dataset.scankey).split('|')[0] : null;
    if (owner !== seededFor){ seededFor = owner; rankSeeded = false; lastRank.clear(); }
    queueSweep();
  })).observe(list, {childList:true, subtree:true});
  queueSweep();
});

/* --------------------------------- the button you pressed shows it is busy */
/* Counts requests that leave the page (not the cloud-sync channel, tiles or
   icons). A button that is followed by one within a moment gets a spinner
   until the count comes back down, or eight seconds, whichever is first.
   Scans have their own progress screen, so their buttons are left alone. */
const QUIET_URL = /firestore\.googleapis|google\.firestore|identitytoolkit|securetoken|\/__fakefs\/|favicons|tile|arcgisonline|fonts\.g/i;
const NO_BUSY = /scan|stop|cancel|close|done|sign ?out|delete|remove/i;
let out = 0, armed = null;
const busyEnd = el => { if (el && el._quietBusy){ clearTimeout(el._quietBusy); el._quietBusy = null; el.classList.remove('q-busy'); } };
function reqStart(){
  out++;
  const a = armed; armed = null;
  if (!a || !a.el.isConnected || performance.now() - a.t > 160 || a.el._quietBusy) return;
  a.el.classList.add('q-busy');
  a.el._quietBase = out - 1;
  a.el._quietBusy = setTimeout(() => busyEnd(a.el), 8000);
  busy.add(a.el);
}
const busy = new Set();
function reqEnd(){
  out = Math.max(0, out - 1);
  busy.forEach(el => { if (out <= (el._quietBase || 0) || !el.isConnected){ busyEnd(el); busy.delete(el); } });
}
if (window.fetch){
  const f0 = window.fetch;
  window.fetch = function(input){
    let url = '';
    try{ url = typeof input === 'string' ? input : (input && input.url) || ''; }catch(e){}
    const track = !QUIET_URL.test(url);
    if (track) try{ reqStart(); }catch(e){}
    let p;
    try{ p = f0.apply(this, arguments); }
    catch(err){ if (track) try{ reqEnd(); }catch(e){} throw err; }
    if (track && p && typeof p.finally === 'function') p.finally(() => { try{ reqEnd(); }catch(e){} }).catch(() => {});
    return p;
  };
}
document.addEventListener('click', safe(e => {
  if (offApp()) return;
  const b = e.target.closest && e.target.closest('.btn, .mt-btn');
  if (!b || b.disabled || b.closest('.so-card, .leaflet-container')) return;
  const label = (b.innerText || b.title || '') + ' ' + b.id;
  if (NO_BUSY.test(label)) return;
  armed = {el: b, t: performance.now()};
}), true);

/* -------------------------------------- a screen arrives top to bottom */
const NAV_SEL = '.tn-mod, .tn-home, .hub-card, .modes > button, .seo-mode, .mt-tabs > button, .gmode, [data-go]';
function stageOf(){
  const hub = document.getElementById('hubScreen');
  if (hub && hub.classList.contains('on')) return document.getElementById('hubGrid');
  const panels = Array.from(document.querySelectorAll('#appShell .panels')).find(p => p.offsetParent && p.getBoundingClientRect().width > 300);
  if (!panels) return null;
  /* the open view inside the stage, when the stage has views; else the stage */
  const view = Array.from(panels.children).find(c => c.offsetParent && (c.classList.contains('on') || c.classList.contains('active')) && c.children.length > 1);
  return view || panels;
}
const cascade = safe(() => {
  if (RM.matches || offApp()) return;
  const host = stageOf();
  if (!host) return;
  let i = 0;
  Array.from(host.children).forEach(k => {
    if (!k.offsetParent || i > 9) { k.style.removeProperty('--q-i'); return; }
    k.style.setProperty('--q-i', i++);
  });
  host.classList.remove('q-cascade'); void host.offsetWidth; host.classList.add('q-cascade');
  clearTimeout(host._quietT);
  host._quietT = setTimeout(() => host.classList.remove('q-cascade'), 1100);
});
document.addEventListener('click', safe(e => {
  if (offApp() || !(e.target.closest && e.target.closest(NAV_SEL))) return;
  setTimeout(cascade, 50);
  setTimeout(watchList, 120);
}), true);
document.addEventListener('keydown', safe(e => { if (e.altKey && !offApp()) setTimeout(cascade, 70); }), true);

/* ------------------------------------------------------------ tooltips */
/* The same words the tool already puts in title="", shown in its own style
   after a short pause. The title is taken off only while the pointer is on
   the element (so the browser's own box doesn't show as well) and put back
   the moment it leaves. Keyboard and screen-reader users are unaffected:
   focus never removes it. */
let tip = null, tipFor = null, tipTimer = null, tipText = '';
function tipHide(){
  clearTimeout(tipTimer); tipTimer = null;
  if (tipFor){
    if (tipFor.isConnected && !tipFor.hasAttribute('title') && tipText) tipFor.setAttribute('title', tipText);
    tipFor = null;
  }
  if (tip) tip.classList.remove('on');
}
function tipShow(el, text){
  if (!tip){
    tip = document.createElement('div');
    tip.className = 'q-tip'; tip.setAttribute('role', 'tooltip'); tip.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tip);
  }
  tip.textContent = text;
  tip.style.left = '0px'; tip.style.top = '0px';
  tip.classList.remove('below');
  const r = el.getBoundingClientRect(), t = tip.getBoundingClientRect();
  let x = r.left + r.width / 2 - t.width / 2, y = r.top - t.height - 9;
  if (y < 8){ y = r.bottom + 9; tip.classList.add('below'); }
  x = Math.max(8, Math.min(x, window.innerWidth - t.width - 8));
  tip.style.left = Math.round(x) + 'px'; tip.style.top = Math.round(y) + 'px';
  tip.classList.add('on');
}
document.addEventListener('pointerover', safe(e => {
  if (offApp() || e.pointerType === 'touch') return;
  const el = e.target.closest && e.target.closest('[title]');
  if (el === tipFor) return;
  tipHide();
  if (!el || el.closest('.leaflet-container, iframe') || /^(INPUT|SELECT|TEXTAREA|OPTION|IFRAME)$/.test(el.tagName)) return;
  const text = (el.getAttribute('title') || '').trim();
  if (!text || text.length > 320) return;
  tipFor = el; tipText = text;
  el.removeAttribute('title');
  tipTimer = setTimeout(safe(() => { if (tipFor === el && el.isConnected) tipShow(el, text); }), 420);
}), true);
document.addEventListener('pointerout', safe(e => {
  if (!tipFor) return;
  const to = e.relatedTarget;
  if (to && tipFor.contains(to)) return;
  tipHide();
}), true);
['pointerdown', 'keydown', 'scroll', 'blur'].forEach(ev => window.addEventListener(ev, safe(tipHide), true));

/* ------------------------------------- cards light up under the pointer */
document.addEventListener('pointermove', safe(e => {
  const c = e.target.closest && e.target.closest('.mt-card, .kpi');
  if (!c || offApp()) return;
  const r = c.getBoundingClientRect();
  c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  c.style.setProperty('--my', (e.clientY - r.top) + 'px');
}), {passive:true});

/* ---------------------------------------------------------- hub greeting */
const greet = safe(() => {
  const h = document.querySelector('#hubScreen .hub-hero h2');
  if (!h || offApp()) return;
  let name = '';
  try{ name = (localStorage.getItem('edge-presence-name') || '').trim().split(/\s+/)[0] || ''; }catch(e){}
  const hr = new Date().getHours();
  const part = hr < 5 ? 'Working late' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const text = part + (name ? ', ' + name : '') + '.';
  if (h.textContent !== text) h.textContent = text;
  const eb = document.querySelector('#hubScreen .hub-hero .hub-eyebrow');
  if (eb && eb.textContent !== 'Where to?') eb.textContent = 'Where to?';
  const p = document.querySelector('#hubScreen .hub-hero p');
  const sub = 'Everything here is shared with your team and saved as you go.';
  if (p && p.textContent !== sub) p.textContent = sub;
});

/* ----------------------------------------------------------------- boot */
function boot(){
  greet(); watchList(); cascade();
  const hub = document.getElementById('hubScreen');
  if (hub) new MutationObserver(safe(() => { if (hub.classList.contains('on')) greet(); })).observe(hub, {attributes:true, attributeFilter:['class']});
  /* the keyword list is created with the SEO tool; pick it up when it appears */
  let tries = 0;
  const t = setInterval(() => { watchList(); if (++tries > 40 || (document.getElementById('seoKeywordList') || {})._quietWatched) clearInterval(t); }, 500);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
