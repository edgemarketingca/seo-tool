/* ==========================================================================
   EDGE · SEO VISUALS
   Turns the SEO client pages into pictures: ranking health, the average
   position over time, who moved, every keyword on one position map, and the
   AI Visibility tab's own story in charts. Reads the same data the tables use.
   ========================================================================== */
(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
  const BANDS = [
    {k: 't3', l: 'Top 3', c: '#0E7A4F', t: r => r >= 1 && r <= 3},
    {k: 't10', l: '4 – 10', c: '#3FB37F', t: r => r >= 4 && r <= 10},
    {k: 't20', l: '11 – 20', c: '#F5A524', t: r => r >= 11 && r <= 20},
    {k: 't50', l: '21 – 50', c: '#F07A3C', t: r => r >= 21 && r <= 50},
    {k: 't100', l: '51 – 100', c: '#D9443F', t: r => r >= 51},
    {k: 'none', l: 'Not ranking', c: '#C9D2D6', t: r => !(r > 0)}
  ];
  const bandOf = r => BANDS.find(b => b.t(r)) || BANDS[5];
  const ord = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  const seoClient = () => { try{ return (state.seoClients || []).find(c => c.id === state.activeSeoClientId) || null; }catch(e){ return null; } };
  const rowsOf = c => { const out = []; ((c && c.keywords) || []).forEach(k => (k.locations || []).forEach(l => out.push({kw: k.text, loc: l.label || '', rank: l.rank == null ? null : Number(l.rank), prev: l.prevRank == null ? null : Number(l.prevRank), hist: (l.history || []).filter(h => h && h.checkedAt)}))); return out; };
  const day = t => new Date(t).toISOString().slice(0, 10);

  /* ---------- pieces ---------- */
  function donut(rows){
    const n = rows.length || 1, counts = BANDS.map(b => rows.filter(r => b.t(r.rank)).length);
    const ranked = rows.filter(r => r.rank > 0), avg = ranked.length ? Math.round(ranked.reduce((t, r) => t + r.rank, 0) / ranked.length) : null;
    const R = 62, C = 2 * Math.PI * R; let off = 0;
    const segs = counts.map((v, i) => { if (!v) return ''; const len = v / n * C; const s = '<circle r="' + R + '" cx="80" cy="80" fill="none" stroke="' + BANDS[i].c + '" stroke-width="22" stroke-dasharray="' + (len - 2).toFixed(2) + ' ' + (C - len + 2).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" style="--d:' + (i * 90) + 'ms"/>'; off += len; return s; }).join('');
    return '<div class="ev-card ev-donut"><div class="ev-h"><b>Ranking health</b><span>' + rows.length + ' keyword' + (rows.length === 1 ? '' : 's') + '</span></div><div class="ev-donut-b">' +
      '<div class="ev-ring"><svg viewBox="0 0 160 160"><circle r="' + R + '" cx="80" cy="80" fill="none" stroke="#EEF2F2" stroke-width="22"/>' + segs + '</svg><div><b>' + (avg == null ? '—' : esc(String(avg))) + (avg == null ? '' : '<sup>' + ord(avg).replace(String(avg), '') + '</sup>') + '</b><small>avg. position</small></div></div>' +
      '<ul class="ev-leg">' + BANDS.map((b, i) => '<li><i style="background:' + b.c + '"></i><span>' + b.l + '</span><b>' + counts[i] + '</b><em>' + Math.round(counts[i] / n * 100) + '%</em></li>').join('') + '</ul></div></div>';
  }
  function trend(rows){
    /* Average position on each day a keyword was checked, carrying each keyword's last known rank forward. */
    const days = Array.from(new Set(rows.flatMap(r => r.hist.map(h => day(h.checkedAt))))).sort().slice(-40);
    const pts = days.map(d => { const vals = rows.map(r => { let v = null; r.hist.forEach(h => { if (day(h.checkedAt) <= d) v = Number(h.rank); }); return v; }).filter(v => v > 0); return {d, v: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null, n: vals.length}; }).filter(p => p.v != null);
    let body;
    if (pts.length < 2) body = '<div class="ev-empty">The line appears after a second scan.</div>';
    else {
      const W = 560, H = 190, P = 26, max = Math.max(10, Math.ceil(Math.max(...pts.map(p => p.v)) / 5) * 5), min = 1;
      const x = i => P + i * (W - P * 2) / (pts.length - 1), y = v => P / 2 + (v - min) / (max - min) * (H - P * 1.6);
      const line = pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');
      const area = line + ' L' + x(pts.length - 1).toFixed(1) + ' ' + (H - P / 2) + ' L' + x(0).toFixed(1) + ' ' + (H - P / 2) + ' Z';
      const ticks = [1, Math.round(max / 2), max].map(v => '<g><line x1="' + P + '" x2="' + (W - P) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '" class="ev-grid"/><text x="4" y="' + (y(v) + 4).toFixed(1) + '">#' + v + '</text></g>').join('');
      const last = pts[pts.length - 1], first = pts[0], better = last.v < first.v;
      body = '<svg class="ev-trend" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none"><defs><linearGradient id="evg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#E87721" stop-opacity=".32"/><stop offset="1" stop-color="#E87721" stop-opacity="0"/></linearGradient></defs>' + ticks +
        '<path d="' + area + '" fill="url(#evg)"/><path d="' + line + '" class="ev-line"/>' + pts.map((p, i) => '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.v).toFixed(1) + '" r="' + (i === pts.length - 1 ? 5 : 2.6) + '" class="ev-dot' + (i === pts.length - 1 ? ' now' : '') + '"><title>' + esc(p.d) + ': average #' + p.v.toFixed(1) + '</title></circle>').join('') + '</svg>' +
        '<div class="ev-trend-f"><span>' + esc(new Date(first.d + 'T12:00:00').toLocaleDateString('en-CA', {month: 'short', day: 'numeric'})) + '</span><b class="' + (better ? 'up' : last.v > first.v ? 'down' : '') + '">' + (better ? '▲ ' : last.v > first.v ? '▼ ' : '') + 'from #' + first.v.toFixed(1) + ' to #' + last.v.toFixed(1) + '</b><span>' + esc(new Date(last.d + 'T12:00:00').toLocaleDateString('en-CA', {month: 'short', day: 'numeric'})) + '</span></div>';
    }
    return '<div class="ev-card ev-trendc"><div class="ev-h"><b>Average position over time</b><span>higher is better</span></div>' + body + '</div>';
  }
  function movers(rows){
    const mv = rows.filter(r => r.rank != null && r.prev != null).map(r => { const a = r.rank > 0 ? r.rank : 101, b = r.prev > 0 ? r.prev : 101; return Object.assign({d: b - a}, r); }).filter(r => r.d);
    const up = mv.filter(r => r.d > 0).sort((a, b) => b.d - a.d).slice(0, 4), dn = mv.filter(r => r.d < 0).sort((a, b) => a.d - b.d).slice(0, 3);
    const li = r => '<li class="' + (r.d > 0 ? 'up' : 'down') + '"><span class="ev-mk">' + (r.d > 0 ? '▲' : '▼') + '</span><span class="t"><b>' + esc(r.kw) + '</b><small>' + esc(r.loc) + '</small></span><span class="ev-pill" style="--c:' + bandOf(r.rank).c + '">' + (r.rank > 0 ? '#' + r.rank : '—') + '</span><em>' + (r.d > 0 ? '+' : '') + (Math.abs(r.d) > 90 ? (r.d > 0 ? 'new' : 'lost') : r.d) + '</em></li>';
    return '<div class="ev-card ev-movers"><div class="ev-h"><b>Movers</b><span>since the check before</span></div>' +
      (up.length || dn.length ? '<ul>' + up.map(li).join('') + dn.map(li).join('') + '</ul>' : '<div class="ev-empty">No movement since the last check. Steady.</div>') + '</div>';
  }
  function posmap(rows){
    /* Every keyword as a dot on one track, 1 on the left to 20+ on the right. */
    const W = 100, slot = r => r > 0 ? Math.min(21, r) : 22;
    const byslot = {}; rows.forEach(r => { const s = slot(r.rank); (byslot[s] = byslot[s] || []).push(r); });
    const dots = Object.keys(byslot).map(s => byslot[s].map((r, i) => { const xp = ((s - 1) / 21) * 96 + 2; return '<span class="ev-pd" style="left:' + xp.toFixed(2) + '%;bottom:' + (14 + i * 18) + 'px;--c:' + bandOf(r.rank).c + ';--d:' + (i * 40 + Number(s) * 15) + 'ms" title="' + esc(r.kw + (r.loc ? ' · ' + r.loc : '') + ' — ' + (r.rank > 0 ? '#' + r.rank : 'not ranking')) + '"></span>'; }).join('')).join('');
    const tall = Math.max(...Object.values(byslot).map(a => a.length), 1);
    const scale = [1, 3, 5, 10, 15, 20].map(v => '<span style="left:' + (((v - 1) / 21) * 96 + 2).toFixed(2) + '%">#' + v + '</span>').join('') + '<span style="left:' + ((20 / 21) * 96 + 2).toFixed(2) + '%">20+</span><span style="left:' + ((21 / 21) * 96 + 2).toFixed(2) + '%">—</span>';
    return '<div class="ev-card ev-map"><div class="ev-h"><b>Every keyword at a glance</b><span>hover a dot · first page is the green zone</span></div>' +
      '<div class="ev-track" style="height:' + Math.min(260, 40 + tall * 18) + 'px"><div class="ev-zone" style="width:' + ((10 / 21) * 96 + 2).toFixed(2) + '%"></div>' + dots + '</div><div class="ev-scale">' + scale + '</div></div>';
  }
  function band(c, compact){
    const rows = rowsOf(c);
    if (!rows.length) return '<section class="ev ev-emptyband"><div><b>Add keywords to see this client in pictures.</b><span>Ranking health, the trend, the movers and a map of every keyword appear here after the first scan.</span></div></section>';
    return '<section class="ev' + (compact ? ' compact' : '') + '">' + (compact ? donut(rows) + posmap(rows) + movers(rows) : donut(rows) + trend(rows) + movers(rows) + posmap(rows)) + '</section>';
  }

  /* ---------- AI Visibility, pictured ---------- */
  function aiBand(feed){
    const U = window.AIVis && window.AIVis.ui; if (!U || !U.model) return '';
    let M; try{ M = U.model(feed, 90); }catch(e){ return ''; }
    const ser = (M.ai && M.ai.series) || [], labels = M.labels || [];
    const W = 640, H = 170, P = 14, mx = Math.max(1, ...ser);
    const x = i => P + i * (W - P * 2) / Math.max(1, ser.length - 1), y = v => H - P - v / mx * (H - P * 2.2);
    const line = ser.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
    const area = ser.length > 1 ? line + ' L' + x(ser.length - 1).toFixed(1) + ' ' + (H - P) + ' L' + x(0).toFixed(1) + ' ' + (H - P) + ' Z' : '';
    const plats = (M.plats || []).filter(p => p.s > 0).sort((a, b) => b.s - a.s).slice(0, 6), tot = plats.reduce((t, p) => t + p.s, 0) || 1;
    const PC = (U.PCOL || {}), cols = ['#5CBAE6', '#B6D957', '#FAC364', '#8CD3FF', '#D97757', '#C3A6E6'];
    const R = 52, C = 2 * Math.PI * R; let off = 0;
    const segs = plats.map((p, i) => { const len = p.s / tot * C; const s = '<circle r="' + R + '" cx="70" cy="70" fill="none" stroke="' + (PC[p.name] || cols[i % cols.length]) + '" stroke-width="18" stroke-dasharray="' + Math.max(0, len - 2).toFixed(2) + ' ' + (C - len + 2).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '"/>'; off += len; return s; }).join('');
    const chg = M.ai && M.ai.ps ? Math.round((M.ai.s - M.ai.ps) / M.ai.ps * 100) : null;
    const stat = (v, l, d) => '<div class="ev-ai-s"><b>' + v + '</b><small>' + l + '</small>' + (d != null ? '<em class="' + (d >= 0 ? 'up' : 'down') + '">' + (d >= 0 ? '▲ ' : '▼ ') + Math.abs(d) + '%</em>' : '') + '</div>';
    return '<section class="ev-ai"><span class="ev-ai-orb"></span><div class="ev-ai-l"><span class="ev-ai-eye">AI visibility · last 90 days</span>' +
      '<div class="ev-ai-stats">' + stat(U.fmt(M.ai.s || 0), 'visits from AI', chg) + stat(U.fmt(M.ai.k || 0), 'conversions from AI') + stat(U.fmt((M.google && M.google.n) || 0), 'times Google’s AI showed the site') + '</div>' +
      (ser.length > 1 ? '<svg class="ev-ai-chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none"><defs><linearGradient id="evai" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#A8E6EE" stop-opacity=".55"/><stop offset="1" stop-color="#A8E6EE" stop-opacity="0"/></linearGradient></defs><path d="' + area + '" fill="url(#evai)"/><path d="' + line + '" fill="none" stroke="#A8E6EE" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/></svg>' +
        '<div class="ev-ai-x"><span>' + esc(labels[0] || '') + '</span><span>' + esc(labels[labels.length - 1] || '') + '</span></div>' : '') + '</div>' +
      '<div class="ev-ai-r"><div class="ev-ai-ring"><svg viewBox="0 0 140 140"><circle r="' + R + '" cx="70" cy="70" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="18"/>' + segs + '</svg><div><b>' + plats.length + '</b><small>AI sources</small></div></div>' +
        '<ul>' + plats.map((p, i) => '<li><i style="background:' + (PC[p.name] || cols[i % cols.length]) + '"></i><span>' + esc(p.name) + '</span><b>' + U.fmt(p.s) + '</b></li>').join('') + '</ul></div>' +
      /* one small ring per assistant: its share of all AI visits */
      (plats.length ? '<div class="ev-ai-minis">' + plats.map((p, i) => { const f = p.s / tot, r = 17, c2 = 2 * Math.PI * r, col = PC[p.name] || cols[i % cols.length];
        return '<div class="ev-ai-mini" style="--i:' + i + '"><svg viewBox="0 0 44 44"><circle r="' + r + '" cx="22" cy="22" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="5"/><circle r="' + r + '" cx="22" cy="22" fill="none" stroke="' + col + '" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + (f * c2).toFixed(2) + ' ' + c2.toFixed(2) + '" transform="rotate(-90 22 22)" class="ev-ai-arc"/></svg><b>' + Math.round(f * 100) + '%</b><span>' + esc(p.name) + '</span></div>'; }).join('') + '</div>' : '') + '</section>';
  }

  /* ---------- placement ---------- */
  const V = {
    t: 0,
    soon(){ clearTimeout(this.t); this.t = setTimeout(() => this.paint(), 180); },
    place(id, anchorSel, html, before){
      const host = $(id + '-host') || (() => { const d = document.createElement('div'); d.id = id + '-host'; d.className = 'ev-host'; return d; })();
      const a = typeof anchorSel === 'string' ? document.querySelector(anchorSel) : anchorSel; if (!a) return;
      if (before){ if (a.previousSibling !== host) a.parentNode.insertBefore(host, a); }
      else if (a.nextSibling !== host) a.parentNode.insertBefore(host, a.nextSibling);
      if (host.__html !== html){ host.__html = html; host.innerHTML = html; }
    },
    paint(){
      if (!document.body.classList.contains('os-sec-seo')) return;
      const c = seoClient(); if (!c) return;
      const sig = c.id + ':' + JSON.stringify(rowsOf(c).map(r => [r.rank, r.prev, r.hist.length]));
      const dv = $('seoDashboardView');
      if (dv && dv.style.display !== 'none'){ const hr = $('seoStatsGrid') || dv.querySelector('.seo-dash-head-row'); if (hr){ this.place('evDash', hr, band(c, false)); this.aiDash(c); } }
      const kv = $('seoKeywordsView');
      if (kv && kv.style.display !== 'none'){ const tb = kv.querySelector('.seo-kw-toolbar'); if (tb) this.place('evKw', tb, band(c, true), true); }
      this.ai(c);
      this.sig = sig;
    },
    ai(c){
      const v = $('seoview-ai'); if (!v || !v.classList.contains('on')) return;
      const head = v.querySelector('.aiv-head'); if (!head) return;
      const AV = window.AIVis; if (!AV || !AV.getFeed || !AV.normDomain) return;
      const dom = AV.normDomain(c.website || ''); if (!dom || dom.indexOf('.') < 0) return;
      const have = AV.cacheGet && AV.cacheGet(dom);
      const draw = feed => { const h = aiBand(feed); if (h && v.querySelector('.aiv-head')) this.place('evAi', v.querySelector('.aiv-head'), h); };
      if (have && have.feed) draw(have.feed);
      else if (!this._aiBusy){ this._aiBusy = true; AV.getFeed(dom).then(f => { this._aiBusy = false; draw(f); }, () => { this._aiBusy = false; }); }
    },
    /* The dashboard also shows the AI picture, under the ranking visuals, when the tracker has data. */
    aiDash(c){
      const AV = window.AIVis; if (!AV || !AV.normDomain || !AV.cacheGet) return;
      const dom = AV.normDomain(c.website || ''); if (!dom || dom.indexOf('.') < 0) return;
      const anchor = $('evDash-host'); if (!anchor) return;
      const draw = feed => { const h = aiBand(feed); if (h) this.place('evDashAi', anchor, h); };
      const have = AV.cacheGet(dom);
      if (have && have.feed) draw(have.feed);
      else if (AV.getFeed && AV.tracker && AV.tracker().url && !this._dBusy){ this._dBusy = true; AV.getFeed(dom).then(f => { this._dBusy = false; draw(f); }, () => { this._dBusy = false; }); }
    },
    init(){
      const st = $('seoStage'); if (!st || this.mo) return;
      this.mo = new MutationObserver(ms => { if (ms.every(m => { const t = m.target; return t.closest && t.closest('.ev-host'); })) return; this.soon(); });
      this.mo.observe(st, {childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class']});
      this.soon();
    }
  };
  V.aiBand = aiBand; V.band = band;
  window.EDGE_viz = V;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => V.init()); else V.init();
  setTimeout(() => V.init(), 1500);
})();
