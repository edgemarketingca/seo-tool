/* ==========================================================================
   EDGE · CALM UI — motion layer
   Purely presentational and defensive: it never calls into the app, never
   changes data, and every effect is wrapped so a failure here can't stop a
   click from reaching the tool. Respects "reduce motion".
     · ripple + spring press on buttons
     · a pill that slides between tabs (top nav, rank grid/compare, SEO tabs…)
     · screens settle in when you change tool, tab or client
     · a thin progress bar while lookups and scans are talking to the network
     · a small confetti burst when a scan finishes
     · figures count up when a screen opens
   ========================================================================== */
(function(){
'use strict';
const RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : {matches:false};
const safe = fn => function(){ try{ return fn.apply(this, arguments); }catch(e){ /* never in the way */ } };
/* Published reports and embeds render in this same page: none of this runs there. */
const offApp = () => { const b = document.body; return !b || b.classList.contains('report-mode') || b.classList.contains('embed-mode'); };
const raf = cb => requestAnimationFrame(() => requestAnimationFrame(cb));

/* ---------------------------------------------------------------- ripple */
const RIPPLE_SEL = 'button, .btn, [role="button"], .tree-row, .tree-kid, .tree-all, .rail-nav-btn, .recent-row, .hub-card, .gbp-tab, .mt-ov';
document.addEventListener('pointerdown', safe(e => {
  if (RM.matches || e.button !== 0 || offApp()) return;
  const t = e.target.closest(RIPPLE_SEL);
  if (!t || t.disabled || t.closest('.leaflet-container, .calm-noripple')) return;
  const r = t.getBoundingClientRect();
  if (r.width < 8 || r.height < 8 || r.width > 900) return;
  const cs = getComputedStyle(t);
  const host = document.createElement('span');
  host.className = 'calm-ripple-host';
  host.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;border-radius:' + cs.borderRadius + ';color:' + cs.color;
  const size = Math.hypot(r.width, r.height) * 2;
  const dot = document.createElement('i');
  dot.className = 'calm-ripple';
  dot.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - r.left - size / 2) + 'px;top:' + (e.clientY - r.top - size / 2) + 'px';
  host.appendChild(dot);
  document.body.appendChild(host);
  setTimeout(() => host.remove(), 650);
}), true);

/* ------------------------------------------------------ sliding tab pill */
const TAB_SEL = '.tn-mod, .modes > button, .seo-mode, .mt-tabs > button, .ws-seg > button';
const pills = new Map();
function groupOf(btn){ return btn.parentElement; }
const placePill = safe(group => {
  if (offApp()) return;
  const on = Array.from(group.children).find(b => b.matches && b.matches(TAB_SEL) && b.classList.contains('on') && b.offsetParent);
  let pill = pills.get(group);
  if (!on){ if (pill) pill.style.opacity = '0'; return; }
  if (!pill || !pill.isConnected){
    pill = document.createElement('span');
    pill.className = 'calm-pill'; pill.setAttribute('aria-hidden', 'true');
    pill.style.opacity = '0';
    if (getComputedStyle(group).position === 'static') group.style.position = 'relative';
    group.appendChild(pill);
    pills.set(group, pill);
    pill.style.transition = 'none';
  }
  const x = on.offsetLeft, y = on.offsetTop;
  pill.style.width = on.offsetWidth + 'px'; pill.style.height = on.offsetHeight + 'px';
  pill.style.transform = 'translate(' + x + 'px,' + y + 'px)';
  pill.style.opacity = '1';
  group.classList.add('calm-slid');
  if (pill.style.transition === 'none') raf(() => { pill.style.transition = ''; });
});
let pillQueued = false;
function refreshPills(){
  if (pillQueued) return; pillQueued = true;
  requestAnimationFrame(safe(() => {
    pillQueued = false;
    const groups = new Set();
    document.querySelectorAll(TAB_SEL).forEach(b => { const g = groupOf(b); if (g) groups.add(g); });
    groups.forEach(placePill);
    pills.forEach((p, g) => { if (!g.isConnected) pills.delete(g); });
  }));
}
window.addEventListener('resize', refreshPills);

/* ---------------------------------------------- screens settle into place */
const NAV_SEL = '.tn-mod, .tn-home, .hub-card, .modes > button, .seo-mode, .mt-tabs > button, .ws-seg > button, .tree-row, .tree-kid, .tree-all, .rail-nav-btn, .recent-row, .gbp-tab, .mt-ov, [data-gview], [data-go]';
function visibleMain(){
  const hub = document.getElementById('hubScreen');
  if (hub && hub.classList.contains('on')) return hub.querySelector('.hub-inner') || hub;
  const stages = Array.from(document.querySelectorAll('#appShell main, #appShell .stage, #appShell .mt-stage')).filter(el => el.offsetParent || el.getClientRects().length);
  const st = stages.find(s => s.getBoundingClientRect().width > 300);
  if (!st) return null;
  return st.querySelector(':scope > .panels') || st.querySelector('.panels') || st;
}
function settle(el){
  if (!el || RM.matches) return;
  el.classList.remove('calm-enter'); void el.offsetWidth; el.classList.add('calm-enter');
  clearTimeout(el._calmT); el._calmT = setTimeout(() => el.classList.remove('calm-enter'), 520);
}
function stagger(container, max){
  if (!container || RM.matches) return;
  const kids = Array.from(container.children).filter(k => k.offsetParent).slice(0, max || 14);
  kids.forEach((k, i) => {
    k.style.animation = 'calmEnter .42s var(--c-ease) both';
    k.style.animationDelay = (i * 32) + 'ms';
    setTimeout(() => { k.style.animation = ''; k.style.animationDelay = ''; }, 460 + i * 32);
  });
}
let lastMain = null;
document.addEventListener('click', safe(e => {
  if (offApp()) return;
  const t = e.target.closest(NAV_SEL);
  if (!t) return;
  setTimeout(safe(() => {
    refreshPills();
    const main = visibleMain();
    if (main){
      settle(main);
      const isTool = t.matches('.tn-mod, .tn-home, .hub-card, [data-go]');
      if (isTool){
        const hub = document.getElementById('hubScreen');
        if (hub && hub.classList.contains('on')) stagger(document.getElementById('hubGrid'), 6);
        else document.querySelectorAll('.rail-tree, #clientTree, #seoClientTree').forEach(tree => { if (tree.offsetParent) stagger(tree, 12); });
        window.scrollTo({top: 0});
      }
      if (isTool || main !== lastMain) countUp(main);
      lastMain = main;
    }
  }), 40);
}), true);

/* keyboard shortcuts (Alt+1/2/3/H/M) change tools too */
document.addEventListener('keydown', safe(e => {
  if (!e.altKey || offApp()) return;
  setTimeout(safe(() => { refreshPills(); settle(visibleMain()); }), 60);
}), true);

/* ------------------------------------------------- figures count up */
const COUNT_SEL = '.seo-stat-value, .hub-meta b, .hub-meta span b, .kpi b, .kpi-v, .sum-v, .stat-v, .mt-sum b, .mt-big';
function countUp(root){
  if (RM.matches || !root || offApp()) return;
  root.querySelectorAll(COUNT_SEL).forEach(el => {
    if (el._calmCounting || el.children.length) return;
    const txt = el.textContent.trim();
    const m = /^(\d{1,6})$/.exec(txt);
    if (!m) return;
    const end = +m[1];
    if (end < 2) return;
    el._calmCounting = true;
    el.classList.add('calm-counting');
    const t0 = performance.now(), dur = Math.min(900, 380 + end * 6);
    let aborted = false;
    const mo = new MutationObserver(() => { if (el.textContent !== shown) aborted = true; });
    let shown = '0';
    el.textContent = shown;
    mo.observe(el, {characterData:true, childList:true, subtree:true});
    const step = now => {
      if (aborted){ finish(false); return; }
      const p = Math.min(1, (now - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
      shown = String(v); el.textContent = shown;
      if (p < 1) requestAnimationFrame(step); else finish(true);
    };
    const finish = ok => {
      mo.disconnect();
      if (ok) el.textContent = txt;           /* always land on the app's own text */
      el._calmCounting = false; el.classList.remove('calm-counting');
    };
    requestAnimationFrame(step);
  });
}

/* ------------------------------------------------ network progress bar */
const bar = document.createElement('div');
bar.className = 'calm-bar'; bar.innerHTML = '<i></i>';
let inflight = 0, barTimer = null, barOff = null;
const QUIET = /firestore\.googleapis|google\.firestore|identitytoolkit|securetoken|\/__fakefs\/|favicons|tile|arcgisonline|fonts\.g/i;
function barStart(){
  if (offApp()) return;
  inflight++;
  clearTimeout(barOff);
  if (inflight === 1 && !barTimer) barTimer = setTimeout(() => {
    barTimer = null;
    if (!inflight) return;
    if (!bar.isConnected) document.body.appendChild(bar);
    bar.classList.remove('done'); void bar.offsetWidth; bar.classList.add('on');
  }, 180);
}
function barEnd(){
  if (!inflight) return;
  inflight = Math.max(0, inflight - 1);
  if (inflight) return;
  clearTimeout(barTimer); barTimer = null;
  if (!bar.classList.contains('on')) return;
  bar.classList.add('done');
  barOff = setTimeout(() => { bar.classList.remove('on', 'done'); }, 380);
}
if (window.fetch){
  const f0 = window.fetch;
  window.fetch = function(input){
    let url = '';
    try{ url = typeof input === 'string' ? input : (input && input.url) || ''; }catch(e){}
    const track = !QUIET.test(url);
    if (track) try{ barStart(); }catch(e){}
    let p;
    try{ p = f0.apply(this, arguments); }
    catch(err){ if (track) try{ barEnd(); }catch(e){} throw err; }
    if (track && p && typeof p.finally === 'function') p.finally(() => { try{ barEnd(); }catch(e){} }).catch(() => {});
    return p;
  };
}

/* --------------------------------------------- celebrate a finished job */
const COLORS = ['#e8772a', '#f6a35c', '#12805c', '#3aa57f', '#f2c14e', '#1d2127'];
function burst(x, y, n){
  if (RM.matches || offApp()) return;
  const b = document.createElement('div');
  b.className = 'calm-burst'; b.style.left = x + 'px'; b.style.top = y + 'px';
  for (let i = 0; i < (n || 18); i++){
    const a = (Math.PI * 2 * i) / (n || 18) + Math.random() * .4, d = 34 + Math.random() * 46;
    const p = document.createElement('i');
    p.style.background = COLORS[i % COLORS.length];
    p.style.setProperty('--dx', Math.cos(a) * d + 'px');
    p.style.setProperty('--dy', (Math.sin(a) * d - 18) + 'px');
    p.style.setProperty('--r', (Math.random() * 540 - 270) + 'deg');
    p.style.animationDelay = (Math.random() * 60) + 'ms';
    if (i % 3 === 0) p.style.borderRadius = '50%';
    b.appendChild(p);
  }
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 1100);
}
window.calmBurst = burst;
const CELEBRATE = /(scan complete|all \d+ points read|maintenance (marked )?done|published|report (sent|shared)|all done)/i;
const watchToasts = safe(() => {
  const host = document.getElementById('toasts');
  if (!host || host._calmWatched) return;
  host._calmWatched = true;
  new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType !== 1 || !n.classList.contains('toast') || n.classList.contains('err')) return;
    if (!CELEBRATE.test(n.textContent || '')) return;
    setTimeout(safe(() => { const r = n.getBoundingClientRect(); burst(r.left + 22, r.top + r.height / 2, 20); }), 260);
  }))).observe(host, {childList:true});
});

/* finishing a whole maintenance checklist earns a burst from its progress ring */
document.addEventListener('click', safe(e => {
  if (offApp()) return;
  const it = e.target.closest && e.target.closest('.mt-item');
  if (!it) return;
  setTimeout(safe(() => {
    const items = document.querySelectorAll('.mt-item');
    if (items.length > 3 && Array.from(items).every(x => x.classList.contains('on'))){
      const ring = document.querySelector('.mt-ring, .mt-pct, .mt-prog') || it;
      const r = ring.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 28);
    }
  }), 120);
}), true);

/* scan-finished dialogs show a tick: give it a little burst too */
const watchOverlays = safe(() => {
  new MutationObserver(muts => {
    for (const m of muts){
      const t = m.target;
      if (m.type === 'attributes' && t.classList && (t.classList.contains('done') || t.classList.contains('ok')) &&
          t.matches('.eui-orb, .so-orb, .scan-orb, [class*="orb"]') && !t._calmBurst){
        t._calmBurst = true;
        const r = t.getBoundingClientRect();
        if (r.width) setTimeout(() => burst(r.left + r.width / 2, r.top + r.height / 2, 24), 180);
      }
    }
  }).observe(document.body, {subtree:true, attributes:true, attributeFilter:['class']});
});

/* ------------------------------------------- top bars lift on scroll */
const onScroll = safe(() => {
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  document.querySelectorAll('.topbar').forEach(tb => tb.classList.toggle('calm-scrolled', y > 6));
});
window.addEventListener('scroll', onScroll, {passive:true});
document.addEventListener('scroll', safe(e => {
  const el = e.target;
  if (el && el.nodeType === 1 && el.classList && (el.classList.contains('stage') || el.classList.contains('panels'))){
    const tb = el.querySelector('.topbar') || (el.closest('.stage') && el.closest('.stage').querySelector('.topbar'));
    if (tb) tb.classList.toggle('calm-scrolled', el.scrollTop > 6);
  }
}), true);

/* --------------------------------------- hub cards follow the pointer */
document.addEventListener('pointermove', safe(e => {
  const c = e.target.closest && e.target.closest('.hub-card');
  if (!c) return;
  const r = c.getBoundingClientRect();
  c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  c.style.setProperty('--my', (e.clientY - r.top) + 'px');
}), {passive:true});

/* ------------------------------------------------------------- boot */
function boot(){
  watchToasts(); watchOverlays(); refreshPills();
  /* tab groups get rebuilt by the app; keep the pill on the right tab */
  new MutationObserver(safe(muts => {
    for (const m of muts){
      const t = m.target;
      if (m.type === 'attributes'){
        if (t.matches && (t.matches(TAB_SEL) || t.id === 'hubScreen' || t.id === 'appShell' || t.classList.contains('view') || t.classList.contains('stage') || t.classList.contains('rail'))){ refreshPills(); return; }
      } else if (m.addedNodes.length){
        for (const n of m.addedNodes){ if (n.nodeType === 1 && (n.matches(TAB_SEL) || (n.querySelector && n.querySelector(TAB_SEL)))){ refreshPills(); return; } }
      }
    }
  })).observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['class', 'hidden']});
  if (!document.getElementById('toasts')) setTimeout(watchToasts, 1500);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
