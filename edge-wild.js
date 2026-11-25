/* EDGE — visual layer for the SEO tool.
   Purely presentational: it reads what the app already rendered and decorates it.
   - numbers count up when they appear or change
   - keyword rows get a position meter and medal-style rank pills
   - each location group gets a rank-mix bar
   - client details become icon tiles
   - cards fade/slide in as they scroll into view
   Nothing here writes to the app's data. */
(function(){
  'use strict';
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- count-up ---------- */
  const NUM_SEL = '.seo-stat-value, .sv-stats b, .adv-k b, .ev-big, .ev-donut-c b, .mt-hero-stats b, .ew-count';
  const parseNum = t => { const m = String(t).trim().match(/^([^\d\-]*)(-?[\d,]+(?:\.\d+)?)([^\d]*)$/); if (!m) return null; const n = parseFloat(m[2].replace(/,/g, '')); return isNaN(n) ? null : {pre: m[1], n, post: m[3], dec: (m[2].split('.')[1] || '').length, comma: m[2].indexOf(',') > -1}; };
  const fmt = (p, v) => { let s = p.dec ? v.toFixed(p.dec) : String(Math.round(v)); if (p.comma || Math.abs(v) >= 10000) s = Number(s).toLocaleString('en-CA', {minimumFractionDigits: p.dec, maximumFractionDigits: p.dec}); return p.pre + s + p.post; };
  function countUp(el){
    if (reduce || el._ewBusy) return;
    const txt = el.textContent, p = parseNum(txt);
    if (!p || el._ewLast === txt || p.n === 0) { el._ewLast = txt; return; }
    el._ewLast = txt; el._ewBusy = true;
    const t0 = performance.now(), dur = Math.min(1100, 420 + Math.log10(Math.abs(p.n) + 1) * 220);
    const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(p, p.n * e);
      if (k < 1) requestAnimationFrame(step); else { el.textContent = txt; el._ewBusy = false; el.classList.add('ew-pop'); setTimeout(() => el.classList.remove('ew-pop'), 500); } };
    requestAnimationFrame(step);
  }

  /* ---------- keyword rows ---------- */
  const rankOf = el => { const m = (el && el.textContent || '').match(/#\s*(\d+)/); return m ? +m[1] : null; };
  const tier = r => r == null ? 'none' : r === 1 ? 'gold' : r <= 3 ? 'top3' : r <= 10 ? 'top10' : r <= 20 ? 'p2' : r <= 50 ? 'deep' : 'far';
  function decorateKeywords(root){
    root.querySelectorAll('.rank-pill').forEach(p => { const r = rankOf(p); const t = tier(r); if (p.dataset.ewTier !== t){ p.dataset.ewTier = t; p.classList.add('ew-medal'); } });
    root.querySelectorAll('.seo-lg-row').forEach(row => {
      const r = rankOf(row.querySelector('.rank-pill'));
      const v = r == null ? 0 : Math.max(4, 101 - Math.min(r, 100));
      if (row.style.getPropertyValue('--ew-pos-k') !== String(v / 100)){ row.style.setProperty('--ew-pos-k', String(v / 100)); row.dataset.ewTier = tier(r); }
      row.classList.add('ew-row');
    });
    root.querySelectorAll('.seo-lg-card').forEach(card => {
      const head = card.querySelector('.seo-lg-head'); if (!head) return;
      const rs = [...card.querySelectorAll('.seo-lg-row .rank-pill')].map(rankOf);
      const c = {gold: 0, top3: 0, top10: 0, p2: 0, deep: 0, far: 0, none: 0}; rs.forEach(r => c[tier(r)]++);
      const key = JSON.stringify(c); if (head._ewMix === key) return; head._ewMix = key;
      let bar = head.querySelector('.ew-mix'); if (!bar){ bar = document.createElement('div'); bar.className = 'ew-mix'; head.appendChild(bar); }
      const n = rs.length || 1;
      bar.innerHTML = ['gold', 'top3', 'top10', 'p2', 'deep', 'far', 'none'].filter(k => c[k]).map(k => '<i class="t-' + k + '" style="flex:' + c[k] + '" title="' + c[k] + ' keyword' + (c[k] > 1 ? 's' : '') + '"></i>').join('');
      bar.title = rs.filter(r => r && r <= 3).length + ' of ' + n + ' in the top 3';
    });
  }

  /* ---------- client details as icon tiles ---------- */
  const ICONS = {
    lead: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z"/>',
    cms: '<path d="M8.3 7.3 3.6 12l4.7 4.7 1.4-1.4L6.4 12l3.3-3.3-1.4-1.4zm7.4 0-1.4 1.4 3.3 3.3-3.3 3.3 1.4 1.4 4.7-4.7-4.7-4.7z"/>',
    web: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.9a15.6 15.6 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a8.2 8.2 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4H4.3zm.8 2h2.9c.3 1.3.8 2.5 1.4 3.6A8 8 0 0 1 5.1 16zM8 8H5.1a8 8 0 0 1 4.3-3.6C8.8 5.5 8.4 6.7 8 8zm4 12c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4zm.3 5.6c.6-1.1 1.1-2.3 1.4-3.6h2.9a8 8 0 0 1-4.3 3.6zm1.7-5.6a16.5 16.5 0 0 0 0-4h3.4a8.2 8.2 0 0 1 0 4h-3.4z"/>',
    hours: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.4V7h-2v6.4l4.6 2.7 1-1.7-3.6-2z"/>',
    money: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15.9V19h-2v-1.1c-1.6-.3-3-1.4-3.1-3.1h1.9c.1.9.9 1.6 2.2 1.6 1.4 0 1.8-.7 1.8-1.2 0-.7-.4-1.3-2.1-1.7-2-.5-3.4-1.3-3.4-3 0-1.4 1.1-2.4 2.6-2.7V6.6h2v1.2c1.6.4 2.4 1.6 2.4 2.9h-1.9c0-.9-.5-1.6-1.8-1.6-1.2 0-1.9.5-1.9 1.3 0 .6.5 1.1 2.1 1.5 1.6.4 3.4 1.1 3.4 3.2 0 1.5-1.1 2.5-2.7 2.8z"/>',
    call: '<path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.2c1.1.4 2.3.6 3.6.6a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.3.2 2.5.6 3.6a1 1 0 0 1-.2 1l-2.3 2.2z"/>',
    any: '<path d="M12 2 2 7l10 5 10-5-10-5zm0 13L4.2 11.1 2 12.2l10 5 10-5-2.2-1.1L12 15zm0 5-7.8-3.9L2 17.2l10 5 10-5-2.2-1.1L12 20z"/>'
  };
  const iconFor = l => { l = l.toLowerCase(); return /lead|owner|manager/.test(l) ? 'lead' : /cms|platform/.test(l) ? 'cms' : /web|site|url/.test(l) ? 'web' : /hour/.test(l) ? 'hours' : /progress|budget|fee|retainer|monthly/.test(l) ? 'money' : /call|meeting/.test(l) ? 'call' : 'any'; };
  function decorateFields(root){
    root.querySelectorAll('.seo-view-field').forEach((f, i) => {
      if (f.querySelector('.ew-fic')) return;
      const lab = f.querySelector('.seo-view-label'); if (!lab) return;
      const k = iconFor(lab.textContent || ''), ic = document.createElement('span');
      ic.className = 'ew-fic ew-c' + (i % 6); ic.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">' + ICONS[k] + '</svg>';
      f.insertBefore(ic, f.firstChild); f.classList.add('ew-field');
    });
  }

  /* ---------- entrance on scroll ---------- */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('ew-in'); io.unobserve(e.target); } }), {rootMargin: '0px 0px -40px 0px'}) : null;
  const CARD_SEL = '.seo-panel, .seo-stat, .ev-card, .seo-lg-card, .sv-mapcard, .mt-card, .adv-card, .os-soc';
  function watchCards(root){
    if (!io || reduce) return;
    root.querySelectorAll(CARD_SEL).forEach((c, i) => { if (c._ewSeen) return; c._ewSeen = 1; c.classList.add('ew-rise'); c.style.setProperty('--ew-d', (i % 8) * 45 + 'ms'); io.observe(c); });
  }


  /* ---------- client list: trend line + health dot per client ---------- */
  const clients = () => { try{ return (typeof state !== 'undefined' && Array.isArray(state.seoClients)) ? state.seoClients : []; }catch(e){ return []; } };
  function clientSeries(c){
    const byDay = {};
    (c.keywords || []).forEach(k => (k.locations || []).forEach(l => (l.history || []).forEach(h => {
      if (!h || !h.checkedAt) return; const d = new Date(h.checkedAt).toISOString().slice(0, 10), r = h.rank > 0 ? Math.min(h.rank, 100) : 101;
      (byDay[d] = byDay[d] || []).push(r);
    })));
    return Object.keys(byDay).sort().slice(-10).map(d => byDay[d].reduce((a, b) => a + b, 0) / byDay[d].length);
  }
  function clientHealth(c){
    const rs = []; (c.keywords || []).forEach(k => (k.locations || []).forEach(l => { if (l.rank > 0) rs.push(l.rank); else if (l.checkedAt) rs.push(101); }));
    if (!rs.length) return 'none';
    const avg = rs.reduce((a, b) => a + b, 0) / rs.length;
    return avg <= 3 ? 'great' : avg <= 10 ? 'good' : avg <= 20 ? 'ok' : 'weak';
  }
  let sparkN = 0;
  function smoothPath(pts){
    if (pts.length < 2) return '';
    let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (let i = 0; i < pts.length - 1; i++){
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ' C' + c1.map(n => n.toFixed(1)).join(' ') + ' ' + c2.map(n => n.toFixed(1)).join(' ') + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }
  /* A soft, smoothed line with a faint fill: green when the average position improved, muted rose when it slipped. */
  function sparkSvg(ser){
    if (!ser.length) return '';
    const v = ser.length === 1 ? [ser[0], ser[0]] : ser, mx = Math.max(...v), mn = Math.min(...v);
    const pts = v.map((r, i) => [1 + i * 42 / (v.length - 1), mx === mn ? 9 : 3 + (r - mn) / (mx - mn) * 11]);
    const better = v[v.length - 1] <= v[0], cls = better ? 'u' : 'd', id = 'ewsp' + (++sparkN), line = smoothPath(pts), last = pts[pts.length - 1];
    return '<svg viewBox="0 0 44 18" preserveAspectRatio="none"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="' + cls + '" stop-opacity=".28"/><stop offset="1" class="' + cls + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path class="a" fill="url(#' + id + ')" d="' + line + ' L' + last[0].toFixed(1) + ' 18 L1 18 Z"/><path class="l ' + cls + '" d="' + line + '"/><circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="1.9" class="' + cls + '"/></svg>';
  }
  function decorateTree(){
    const tree = document.getElementById('seoClientTree'); if (!tree) return;
    const cs = clients(); if (!cs.length) return;
    tree.querySelectorAll('.tree-row').forEach(row => {
      const nm = (row.querySelector('.tree-name') || {}).textContent; const c = cs.find(x => (x.name || 'Untitled') === nm); if (!c) return;
      const ser = clientSeries(c), key = ser.join(',') + '|' + clientHealth(c);
      if (row._ewTree === key && row.querySelector('.ew-tspark')) return; row._ewTree = key;
      let sp = row.querySelector('.ew-tspark'); if (!sp){ sp = document.createElement('span'); sp.className = 'ew-tspark'; const cnt = row.querySelector('.tree-count'); row.insertBefore(sp, cnt || null); }
      sp.innerHTML = sparkSvg(ser); sp.title = ser.length ? 'Average position over the last ' + ser.length + ' scan days' : 'No scans yet';
      row.dataset.ewHealth = clientHealth(c); row.classList.add('ew-tile');
    });
  }

  /* ---------- celebrate: confetti when a keyword reaches #1, a badge when it climbs ---------- */
  const lastRank = new Map();
  function burst(el){
    if (reduce) return;
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const cols = ['#F6C744', '#E8772E', '#34A853', '#4285F4', '#EA4335', '#A142F4'];
    for (let i = 0; i < 26; i++){
      const p = document.createElement('i'); p.className = 'ew-confetti'; p.style.background = cols[i % cols.length];
      p.style.left = cx + 'px'; p.style.top = cy + 'px'; document.body.appendChild(p);
      const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 90, dx = Math.cos(a) * d, dy = Math.sin(a) * d - 40;
      p.animate([{transform: 'translate(-50%,-50%) rotate(0)', opacity: 1}, {transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + (dy + 70) + 'px)) rotate(' + (Math.random() * 540) + 'deg)', opacity: 0}],
        {duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards'}).onfinish = () => p.remove();
    }
  }
  function climb(el, n){
    const b = document.createElement('span'); b.className = 'ew-climb'; b.textContent = '▲ ' + n;
    el.style.position = el.style.position || 'relative'; el.appendChild(b); setTimeout(() => b.remove(), 1600);
  }
  function celebrate(){
    document.querySelectorAll('.seo-lg-card').forEach(card => {
      const loc = ((card.querySelector('.seo-lg-label') || {}).textContent || '').trim();
      card.querySelectorAll('.seo-lg-row').forEach(row => {
        const kw = ((row.querySelector('.seo-lg-text') || {}).textContent || '').trim(), pill = row.querySelector('.rank-pill'); if (!kw || !pill) return;
        const key = loc + '|' + kw, r = rankOf(pill), was = lastRank.get(key);
        if (was !== undefined && r != null && was !== r){
          const before = was == null ? 101 : was;
          if (r === 1 && before !== 1) burst(pill);
          else if (r < before) climb(pill, before - r);
        }
        lastRank.set(key, r);
      });
    });
  }

  /* ---------- Ranking match: tag chips instead of one-per-line boxes ---------- */
  function chipEditors(){
    const card = document.getElementById('seoMatchCard'); if (!card) return;
    card.querySelectorAll('textarea').forEach(ta => {
      let box = ta._ewChips;
      if (!box || !box.isConnected){
        box = document.createElement('div'); box.className = 'ew-chips';
        box.innerHTML = '<div class="ew-chip-list"></div><input type="text" class="ew-chip-in" placeholder="' + ((ta.getAttribute('placeholder') || '').split('\n')[0] ? 'Add, e.g. ' + (ta.getAttribute('placeholder') || '').split('\n')[0] : 'Type and press Enter') + '"/>';
        ta.parentElement.insertBefore(box, ta); ta.classList.add('ew-ta-hidden'); ta._ewChips = box;
        const inp = box.querySelector('input');
        const commit = () => { const v = inp.value.split(/[,\n]/).map(x => x.trim()).filter(Boolean); if (!v.length) return; const cur = ta.value.split('\n').map(x => x.trim()).filter(Boolean);
          v.forEach(x => { if (cur.indexOf(x) < 0) cur.push(x); }); write(ta, cur); inp.value = ''; };
        inp.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ','){ e.preventDefault(); commit(); } else if (e.key === 'Backspace' && !inp.value){ const cur = ta.value.split('\n').map(x => x.trim()).filter(Boolean); cur.pop(); write(ta, cur); } });
        inp.addEventListener('blur', commit);
        box.addEventListener('click', e => { const x = e.target.closest('[data-ew-x]'); if (x){ const cur = ta.value.split('\n').map(v => v.trim()).filter(Boolean); cur.splice(+x.dataset.ewX, 1); write(ta, cur); } else if (e.target === box) inp.focus(); });
      }
      if (box._ewVal !== ta.value) paintChips(ta, box);
    });
  }
  function write(ta, list){ ta.value = list.join('\n'); ta.dispatchEvent(new Event('input', {bubbles: true})); ta.dispatchEvent(new Event('change', {bubbles: true})); paintChips(ta, ta._ewChips); }
  function paintChips(ta, box){
    box._ewVal = ta.value;
    const list = ta.value.split('\n').map(x => x.trim()).filter(Boolean);
    box.querySelector('.ew-chip-list').innerHTML = list.map((v, i) => '<span class="ew-chip" style="--i:' + i + '"><span>' + v.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c])) + '</span><button type="button" data-ew-x="' + i + '" aria-label="Remove">×</button></span>').join('');
  }

  /* ---------- empty charts: a ghost line that draws itself instead of stripes ---------- */
  function ghosts(){
    document.querySelectorAll('.ev-empty').forEach(e => {
      if (e.querySelector('.ew-ghost')) return;
      const g = document.createElement('div'); g.className = 'ew-ghost';
      g.innerHTML = '<svg viewBox="0 0 300 80" preserveAspectRatio="none"><path d="M0 60 C 30 58, 45 30, 75 34 S 120 62, 150 48 S 200 14, 230 22 S 280 40, 300 30"/><circle r="4"><animateMotion dur="3.2s" repeatCount="indefinite" path="M0 60 C 30 58, 45 30, 75 34 S 120 62, 150 48 S 200 14, 230 22 S 280 40, 300 30"/></circle></svg>';
      e.insertBefore(g, e.firstChild); e.classList.add('ew-has-ghost');
    });
  }


  /* ---------- AI Visibility connect screen: assistants orbiting the client ---------- */
  function aiConnect(){
    document.querySelectorAll('.aiv-msg').forEach(m => {
      if (!m.querySelector('#aivUrl') || m.querySelector('.ew-orbit')) return;
      const o = document.createElement('div'); o.className = 'ew-orbit';
      o.innerHTML = '<div class="ew-orbit-core">Your client</div>' + ['ChatGPT', 'Gemini', 'Perplexity', 'Copilot', 'Claude', 'AI Overviews'].map((n, i) => { const a = (i * 60 - 90) * Math.PI / 180; return '<span class="ew-orbit-p" style="left:' + (50 + Math.cos(a) * 42).toFixed(1) + '%;top:' + (50 + Math.sin(a) * 42).toFixed(1) + '%;--i:' + i + '">' + n + '</span>'; }).join('') +
        '<div class="ew-orbit-ring r1"></div><div class="ew-orbit-ring r2"></div>';
      m.insertBefore(o, m.firstChild); m.classList.add('ew-aiconnect');
    });
  }

  /* ---------- run ---------- */
  let queued = false;
  function pass(){
    queued = false;
    const root = document.body;
    try{ decorateKeywords(root); celebrate(); }catch(e){}
    try{ decorateTree(); }catch(e){}
    try{ chipEditors(); }catch(e){}
    try{ ghosts(); }catch(e){}
    try{ aiConnect(); }catch(e){}
    try{ decorateFields(root); }catch(e){}
    try{ watchCards(root); }catch(e){}
    try{ root.querySelectorAll(NUM_SEL).forEach(el => { if (el.offsetParent && el._ewLast !== el.textContent) countUp(el); }); }catch(e){}
  }
  let timer = 0;
  const schedule = () => { if (queued) return; queued = true; clearTimeout(timer); timer = setTimeout(() => (window.requestIdleCallback || setTimeout)(pass, {timeout: 400}), 220); };
  function start(){
    document.body.classList.add('ew-on');
    pass();
    // Ignore our own changes (count-up frames, mix bars, icons) so the watcher stays quiet.
    new MutationObserver(muts => { for (const m of muts){ const t = m.target; if (!t || t._ewBusy || (t.closest && t.closest('.ew-mix, .ew-fic, .ew-tspark, .ew-chips, .ew-ghost, .ew-climb, .ew-orbit'))) continue; schedule(); return; } }).observe(document.body, {childList: true, subtree: true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 400)); else setTimeout(start, 400);
  window.EDGE_wild = {pass};
})();
