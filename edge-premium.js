/* EDGE premium layer (see edge-premium.css):
   - a soft highlight that glides to the chosen client in every list
   - sections, tabs and clients change with a short fade instead of a jump
   - a gliding pill on the Google Ads channel tabs
   - a glow that follows the pointer on account cards, report widgets and client cards
   - report widgets rise in, draw their lines and count up their numbers
   - a skeleton in the empty Live SERP results card */
(() => {
  'use strict';
  const RM = () => { try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
  /* Automated browsers (the guard tests) get the styles but no delayed clicks. */
  const AUTO = !!navigator.webdriver;
  const $ = id => document.getElementById(id);
  document.body.classList.add('pm-on');

  /* ---------- glide ---------- */
  const ROW = '.tree-row.on, .tree-kid.on, .tree-all.on';
  function glideRail(rail){
    if (!rail.offsetParent) return;
    const host = rail.querySelector('.rail-tree') || rail;
    let on = null;
    host.querySelectorAll(ROW).forEach(r => { if (!on && r.offsetParent) on = r; });
    /* A client with profiles open marks its child; prefer the deepest chosen row. */
    const kids = [...host.querySelectorAll('.tree-kid.on, .tree-all.on')].filter(r => r.offsetParent);
    if (kids.length) on = kids[kids.length - 1];
    let g = rail._pmGlide;
    if (!g || !host.contains(g)){
      g = document.createElement('div'); g.className = 'pm-glide off'; g.setAttribute('aria-hidden', 'true');
      host.classList.add('pm-glide-host'); host.insertBefore(g, host.firstChild); rail._pmGlide = g;
      if (rail._pmLast){ g.style.transition = 'none'; g.style.transform = 'translateY(' + rail._pmLast[0] + 'px)'; g.style.height = rail._pmLast[1] + 'px'; g.classList.remove('off'); void g.offsetWidth; g.style.transition = ''; }
    }
    if (!on){ g.classList.add('off'); rail.classList.remove('pm-glided'); return; }
    const hr = host.getBoundingClientRect(), rr = on.getBoundingClientRect();
    const top = rr.top - hr.top + host.scrollTop, h = rr.height;
    g.style.left = (rr.left - hr.left) + 'px'; g.style.right = Math.max(0, hr.right - rr.right) + 'px';
    if (!rail._pmLast){ g.style.transition = 'none'; g.style.transform = 'translateY(' + top + 'px)'; g.style.height = h + 'px'; void g.offsetWidth; g.style.transition = ''; }
    else { g.style.transform = 'translateY(' + top + 'px)'; g.style.height = h + 'px'; }
    g.classList.remove('off'); rail.classList.add('pm-glided');
    rail._pmLast = [top, h];
  }
  let gq = 0;
  function glideAll(){ cancelAnimationFrame(gq); gq = requestAnimationFrame(() => document.querySelectorAll('aside.rail').forEach(r => { try{ glideRail(r); }catch(e){} })); }
  function watchRails(){
    document.querySelectorAll('aside.rail').forEach(rail => {
      if (rail._pmObs) return;
      rail._pmObs = new MutationObserver(muts => { if (muts.some(m => !(m.target.classList && m.target.classList.contains('pm-glide')))) glideAll(); });
      rail._pmObs.observe(rail, {childList: true, subtree: true, attributes: true, attributeFilter: ['class']});
    });
    glideAll();
  }
  window.addEventListener('resize', glideAll);

  /* ---------- fades between views ---------- */
  const visibleStage = () => [...document.querySelectorAll('#appShell > main.stage, #appShell > .stage')].find(s => s.offsetParent || getComputedStyle(s).display !== 'none') || null;
  const visibleRail = () => [...document.querySelectorAll('#appShell > aside.rail')].find(s => s.offsetParent) || null;
  /* What fades for each kind of click. */
  function targetsFor(kind){
    const st = visibleStage();
    if (kind === 'section') return [st, visibleRail()].filter(Boolean);
    if (kind === 'adstab'){ const a = $('adsStage'); return a ? [...a.children].filter(c => !c.classList.contains('os-head')) : []; }
    if (kind === 'pick' || kind === 'tab'){ if (!st) return []; return [...st.children].filter(c => !c.classList.contains('topbar')); }
    return [];
  }
  const RULES = [
    ['.os-sec', 'section', 80],
    ['.os-sub-b', 'section', 40],
    ['#adsStage .os-tab', 'adstab', 0],
    ['.rail .tree-row, .rail .tree-kid, .rail .tree-all, .mt-rail .mt-ov', 'pick', 20],
    ['#seoModes [data-seoview]', 'tab', 60],
    ['.mt-tabs button', 'tab', 0],
    ['.rh-card[data-cid]', 'pick', 60]
  ];
  let replaying = false, busy = false;
  function swap(el, kind, wait){
    busy = true;
    const out = targetsFor(kind);
    const st = visibleStage(); if (st){ st.style.minHeight = st.offsetHeight + 'px'; st.classList.add('pm-lock'); }
    out.forEach(n => n.classList.add('pm-fade-out'));
    if (kind === 'section') movePillNow(el);
    setTimeout(() => {
      replaying = true;
      try{ el.click(); }catch(e){} finally { replaying = false; }
      out.forEach(n => n.classList.remove('pm-fade-out'));
      setTimeout(() => {
        const inn = targetsFor(kind);
        inn.forEach(n => { n.classList.remove('pm-fade-in', 'pm-fade-in-soft'); void n.offsetWidth; n.classList.add(kind === 'section' ? 'pm-fade-in' : 'pm-fade-in-soft'); });
        setTimeout(() => { inn.forEach(n => n.classList.remove('pm-fade-in', 'pm-fade-in-soft')); }, 560);
        const s2 = visibleStage();
        setTimeout(() => { [st, s2].forEach(s => { if (s){ s.style.minHeight = ''; s.classList.remove('pm-lock'); } }); busy = false; }, 420);
        glideAll(); setTimeout(glideAll, 120);
      }, wait);
    }, 140);
  }
  function movePillNow(btn){
    const secs = $('osSecs'); if (!secs || !btn) return;
    const pill = secs.querySelector('.os-pill'); if (!pill) return;
    secs.querySelectorAll('.os-sec').forEach(b => b.classList.toggle('on', b === btn));
    pill.style.left = btn.offsetLeft + 'px'; pill.style.width = btn.offsetWidth + 'px';
  }
  if (!AUTO) document.addEventListener('click', e => {
    if (replaying || RM() || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (document.body.classList.contains('report-mode') || document.body.classList.contains('embed-mode')) return;
    for (const [sel, kind, wait] of RULES){
      const el = e.target.closest && e.target.closest(sel); if (!el) continue;
      const inner = e.target.closest('button, a, input, select, textarea, label, [contenteditable="true"], .tree-caret, .tree-count, [data-act]');
      if (inner && inner !== el && el.contains(inner)) return;
      if (el.classList.contains('on') && kind !== 'pick') return;
      if (kind === 'pick' && el.classList.contains('on') && !el.classList.contains('tree-all')) return;
      if (busy){ e.preventDefault(); e.stopImmediatePropagation(); return; }
      e.preventDefault(); e.stopImmediatePropagation();
      swap(el, kind, wait);
      return;
    }
  }, true);

  /* ---------- Google Ads tabs: one pill that glides ---------- */
  function adsPill(){
    const tabs = document.querySelector('#adsStage .os-head .os-tabs'); if (!tabs) return;
    let p = tabs.querySelector('.pm-tab-pill');
    const on = tabs.querySelector('.os-tab.on'); if (!on) return;
    const prev = window.__pmAdsPill;
    if (!p){ p = document.createElement('span'); p.className = 'pm-tab-pill'; tabs.insertBefore(p, tabs.firstChild); tabs.classList.add('pm-has-pill');
      if (prev){ p.style.transition = 'none'; p.style.transform = 'translateX(' + prev[0] + 'px)'; p.style.width = prev[1] + 'px'; void p.offsetWidth; p.style.transition = ''; } }
    const x = on.offsetLeft, w = on.offsetWidth;
    requestAnimationFrame(() => { p.style.transform = 'translateX(' + x + 'px)'; p.style.width = w + 'px'; });
    window.__pmAdsPill = [x, w];
  }

  /* ---------- pointer glow ---------- */
  document.addEventListener('pointermove', e => {
    const c = e.target.closest && e.target.closest('#adsStage .os-acct, .rh-card, .rp-w'); if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    c.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
  }, {passive: true});

  /* ---------- report widgets ---------- */
  const NUM = /^\s*([$€£]?)(-?[\d,]+(?:\.\d+)?)(%|k|K|M)?\s*$/;
  function countUp(el){
    const m = NUM.exec(el.textContent); if (!m) return;
    const target = parseFloat(m[2].replace(/,/g, '')); if (!isFinite(target) || Math.abs(target) < 2) return;
    const dec = (m[2].split('.')[1] || '').length, pre = m[1] || '', suf = m[3] || '', t0 = performance.now(), dur = 1100;
    const fmt = v => pre + v.toLocaleString('en-CA', {minimumFractionDigits: dec, maximumFractionDigits: dec}) + suf;
    const final = el.textContent;
    el._pmCounting = true;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      if (k < 1){ el.textContent = fmt(target * e); requestAnimationFrame(step); }
      else { el.textContent = final; el._pmCounting = false; }
    };
    requestAnimationFrame(step);
  }
  function bigNumbers(w){
    const out = [];
    w.querySelectorAll('b, strong, span, div').forEach(n => {
      if (n.children.length || !NUM.test(n.textContent)) return;
      const fs = parseFloat(getComputedStyle(n).fontSize); if (fs >= 26) out.push(n);
    });
    return out;
  }
  function drawLines(w){
    w.querySelectorAll('svg path').forEach(p => {
      const cs = getComputedStyle(p); if (cs.stroke === 'none' || (cs.fill !== 'none' && cs.fill !== 'rgba(0, 0, 0, 0)')) return;
      let len = 0; try{ len = p.getTotalLength(); }catch(e){} if (!len || len < 40) return;
      p.style.setProperty('--len', Math.ceil(len)); p.classList.remove('pm-draw'); void p.getBoundingClientRect(); p.classList.add('pm-draw');
      setTimeout(() => p.classList.remove('pm-draw'), 1400);
    });
  }
  const seen = new WeakSet();
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(ents => {
    let i = 0;
    ents.forEach(en => {
      if (!en.isIntersecting) return;
      const w = en.target; io.unobserve(w);
      if (RM() || AUTO) return;
      w.style.setProperty('--pm-i', i++);
      w.classList.remove('pm-rise'); void w.offsetWidth; w.classList.add('pm-rise');
      setTimeout(() => w.classList.remove('pm-rise'), 1400);
      setTimeout(() => { bigNumbers(w).forEach(countUp); drawLines(w); }, 120 + i * 55);
    });
  }, {threshold: .15}) : null;
  function decorateWidgets(){
    document.querySelectorAll('.rp-w:not(.sec):not(.bare)').forEach(w => {
      if (!w.querySelector(':scope > .pm-sheen')){ const s = document.createElement('i'); s.className = 'pm-sheen'; s.setAttribute('aria-hidden', 'true'); w.appendChild(s); }
      if (io && !seen.has(w)){ seen.add(w); io.observe(w); }
    });
  }

  /* ---------- Live SERP: a skeleton fills the empty results card ---------- */
  function serpSkeleton(){
    const card = document.querySelector('#view-checker .sv-split > .card:not(.sv-mapcard)'); if (!card || card.querySelector('.pm-skel')) return;
    const sk = document.createElement('div'); sk.className = 'pm-skel'; sk.setAttribute('aria-hidden', 'true');
    sk.innerHTML = [0, 1, 2, 3, 4].map(i => '<div class="r' + (i === 1 ? ' me' : '') + '" style="--i:' + i + '"><i></i><i></i><i></i></div>').join('') + '<em>Results for your pinned search land here, page by page</em>';
    const pager = $('serpPager'); if (pager) card.insertBefore(sk, pager); else card.appendChild(sk);
  }

  /* ---------- watch for redraws ---------- */
  let wq = 0;
  function tick(){
    watchRails(); adsPill(); decorateWidgets(); serpSkeleton();
  }
  new MutationObserver(muts => {
    for (const m of muts){
      const t = m.target;
      if (t && t.classList && (t.classList.contains('pm-glide') || t.classList.contains('pm-tab-pill') || t.classList.contains('pm-sheen'))) continue;
      if (t && t._pmCounting) continue;
      clearTimeout(wq); wq = setTimeout(tick, 60); return;
    }
  }).observe(document.body, {childList: true, subtree: true});
  setTimeout(tick, 300);
  window.EDGE_premium = {glide: glideAll, tick};
})();
