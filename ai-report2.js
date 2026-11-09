/* ==========================================================================
   AI VISIBILITY · MONTHLY CLIENT REPORT (AgencyAnalytics style)
   Always the last full calendar month, compared with the month before.
   Monthly bars instead of daily curves, so a part-month never looks like a drop.
   Uses the shared model from ai-visibility.js (window.AIVis.ui.model).
   ========================================================================== */
(function(){
  'use strict';
  const U = window.AIVis && window.AIVis.ui;
  if (!U) return;
  const {esc, fmt, fmtK, pageKey, model, keyEventsOf, keLabel} = U;

  const C = {ink: '#222A30', ink2: '#5b6670', ink3: '#8593a0', line: '#e6eaee', bg: '#f4f6f8',
    blue: '#5CBAE6', green: '#B6D957', yellow: '#FAC364', dark: '#171614', up: '#1f9d55', down: '#d64545'};
  const PCOL = {'Google AI Search': '#4285F4', ChatGPT: '#5CBAE6', Gemini: '#B6D957', Copilot: '#FAC364', Perplexity: '#8CD3FF', Claude: '#D97757', 'Meta AI': '#7FC8A9', Grok: '#C3A6E6', DeepSeek: '#E39FC6'};
  const pc = n => PCOL[n] || '#9DA8B3';
  /* Each assistant's own site icon (as analytics tools show traffic sources), with a coloured letter badge if it can't load. */
  const PDOM = {'Google AI Search': 'google.com', ChatGPT: 'chatgpt.com', Gemini: 'gemini.google.com', Copilot: 'copilot.microsoft.com', Perplexity: 'perplexity.ai', Claude: 'claude.ai', 'Meta AI': 'meta.ai', Grok: 'grok.com', DeepSeek: 'deepseek.com'};
  const icon = (name, size) => {
    size = size || 22;
    const badge = '<span class="ar-ico-b" style="width:' + size + 'px;height:' + size + 'px;background:' + pc(name) + ';font-size:' + Math.round(size * .5) + 'px">' + esc(String(name || '?').charAt(0)) + '</span>';
    const d = PDOM[name];
    if (!d) return '<span class="ar-ico" style="width:' + size + 'px;height:' + size + 'px">' + badge + '</span>';
    return '<span class="ar-ico" style="width:' + size + 'px;height:' + size + 'px"><img src="https://www.google.com/s2/favicons?domain=' + d + '&sz=64" alt="" width="' + size + '" height="' + size + '" loading="eager" referrerpolicy="no-referrer" style="opacity:0" onload="this.style.opacity=1" onerror="this.remove()">' + badge + '</span>';
  };
  const who = (name, size) => '<span class="ar-who">' + icon(name, size) + '<span>' + esc(name) + '</span></span>';
  const pct = (a, b) => b ? (Math.round(a / b * 1000) / 10) + '%' : '—';

  const iso = d => d.toISOString().slice(0, 10);
  const monthRange = (y, m) => ({since: iso(new Date(Date.UTC(y, m, 1, 12))), end: iso(new Date(Date.UTC(y, m + 1, 0, 12)))});
  const monthName = (y, m, short) => new Date(Date.UTC(y, m, 1, 12)).toLocaleDateString('en-CA', {month: short ? 'short' : 'long', year: short ? undefined : 'numeric', timeZone: 'UTC'});
  /* The last full calendar month, and the five before it */
  function months(n){
    const t = new Date(), out = [];
    for (let i = n; i >= 1; i--){ const d = new Date(t.getFullYear(), t.getMonth() - i, 1); out.push({y: d.getFullYear(), m: d.getMonth()}); }
    return out.map(x => Object.assign(x, monthRange(x.y, x.m), {label: monthName(x.y, x.m, true), name: monthName(x.y, x.m)}));
  }
  const change = (cur, prev) => {
    if (prev == null) return '';
    if (!prev && !cur) return '<span class="ar-chg flat">No change</span>';
    if (!prev) return '<span class="ar-chg up">New</span>';
    const p = Math.round((cur - prev) / prev * 100);
    return '<span class="ar-chg ' + (p > 0 ? 'up' : p < 0 ? 'down' : 'flat') + '">' + (p > 0 ? '▲ ' : p < 0 ? '▼ ' : '') + Math.abs(p) + '%</span>';
  };

  function styles(){
    if (document.getElementById('ar2-css')) return;
    const s = document.createElement('style'); s.id = 'ar2-css';
    s.textContent = `
.ar{font-family:Inter,"Helvetica Neue",Arial,sans-serif;color:${C.ink};max-width:1280px;margin:0 auto;padding:4px 2px 10px;display:grid;gap:16px}
.ar *{box-sizing:border-box}
.ar-card{background:#fff;border:1px solid ${C.line};border-radius:8px;padding:18px 20px}
.ar-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}
.ar-title{font-size:20px;font-weight:600;margin:0}
.ar-sub{font-size:13px;color:${C.ink3};margin-top:4px}
.ar-badge{font-size:12px;font-weight:600;color:${C.ink2};background:${C.bg};border:1px solid ${C.line};border-radius:999px;padding:6px 12px}
.ar-h{font-size:14px;font-weight:600;margin:0 0 14px}
.ar-cap{font-size:12px;color:${C.ink3};margin:0 0 12px}
.ar-sum ul{margin:8px 0 0;padding-left:18px;display:grid;gap:6px;font-size:14px;line-height:1.5}
.ar-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
.ar-kpi{display:flex;flex-direction:column;gap:6px}
.ar-kpi-l{font-size:13px;color:${C.ink2};font-weight:500}
.ar-kpi-v{font-size:34px;font-weight:600;letter-spacing:-.5px;line-height:1.1}
.ar-kpi-f{font-size:12px;color:${C.ink3};display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.ar-chg{font-size:12px;font-weight:600;border-radius:4px;padding:2px 6px}
.ar-chg.up{color:${C.up};background:#e8f6ee}.ar-chg.down{color:${C.down};background:#fbecec}.ar-chg.flat{color:${C.ink2};background:${C.bg}}
.ar-g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:16px}
.ar-t{width:100%;border-collapse:collapse;font-size:13px}
.ar-t th{font-size:11.5px;font-weight:600;color:${C.ink3};text-transform:uppercase;letter-spacing:.03em;text-align:left;padding:8px 6px;border-bottom:1px solid ${C.line}}
.ar-t td{padding:9px 6px;border-bottom:1px solid #f0f2f4;vertical-align:middle}
.ar-t tr:last-child td{border-bottom:0}
.ar-t .n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.ar-t .pg{max-width:380px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ar-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px;vertical-align:middle}
.ar-empty{font-size:13px;color:${C.ink3};padding:18px 0;text-align:center}
.ar-trio{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid ${C.line};border-radius:8px;margin-bottom:14px}
.ar-trio>div{padding:14px 16px;border-right:1px solid ${C.line}}.ar-trio>div:last-child{border-right:0}
.ar-trio b{display:block;font-size:24px;font-weight:600;margin:4px 0 2px}
.ar-trio span{font-size:12px;color:${C.ink3}}.ar-trio small{font-size:12.5px;color:${C.ink2};font-weight:500}
.ar-tag{font-size:11.5px;font-weight:600;border-radius:4px;padding:2px 7px;white-space:nowrap}
.ar-tag.y{color:#1f7a45;background:#e8f6ee}.ar-tag.m{color:#8a5a00;background:#fdf3dc}.ar-tag.n{color:${C.ink2};background:${C.bg}}
.ar-note{font-size:11.5px;color:${C.ink3};line-height:1.5}
.ar-ico{position:relative;display:inline-block;flex:none;border-radius:6px;overflow:hidden;vertical-align:middle}
.ar-ico img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#fff;z-index:1;transition:opacity .15s}
.ar-ico-b{position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-weight:700;border-radius:6px}
.ar-who{display:inline-flex;align-items:center;gap:9px;font-weight:500}
.ar-asst{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}
.ar-a{border:1px solid ${C.line};border-radius:8px;padding:14px 16px;display:grid;gap:10px;background:#fff;position:relative;overflow:hidden}
.ar-a:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--c)}
.ar-a-h{display:flex;align-items:center;justify-content:space-between;gap:8px}
.ar-a-n{font-size:14px;font-weight:600}
.ar-a-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.ar-a-row div{font-size:11.5px;color:${C.ink3}}
.ar-a-row2{grid-template-columns:repeat(2,1fr)}
.ar-a-row b{display:block;font-size:22px;font-weight:600;color:${C.ink};margin-top:2px}
.ar-share{height:6px;border-radius:3px;background:${C.bg};overflow:hidden}
.ar-share i{display:block;height:100%;background:var(--c);border-radius:3px}
.ar-a-f{font-size:12px;color:${C.ink2}}
.ar-mx th.c,.ar-mx td.c{text-align:center}
.ar-mx th.c .ar-ico{margin:0 auto}
.ar-pill{display:inline-block;min-width:28px;padding:3px 8px;border-radius:999px;font-weight:600;font-size:12.5px;background:${C.bg};color:${C.ink3}}
.ar-pill.on{background:#e8f6ee;color:#1f7a45}
.ar-icons{display:inline-flex;gap:4px;align-items:center}
.ar-convs{display:grid;grid-template-columns:minmax(260px,1fr) 2fr;gap:20px;align-items:start}
.ar-conv-big{display:flex;flex-direction:column;gap:12px}
.ar-conv-big .ar-kpi-v{font-size:40px}
.ar-bar{display:grid;gap:8px}
.ar-bar div{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;font-size:13px}
.ar-bar .t{height:8px;border-radius:4px;background:${C.bg};overflow:hidden}.ar-bar .t i{display:block;height:100%;border-radius:4px}
@media (max-width:820px){.ar-convs{grid-template-columns:1fr}}
.ar-foot{font-size:11.5px;color:${C.ink3};text-align:right}
/* Client report: no small grey notes (captions, explanations, data-as-of line) */
.ar-cap,.ar-note,.ar-foot{display:none}
.ar{font-family:Geist,"Helvetica Neue",Helvetica,Arial,sans-serif;color:#555;gap:12px}
.ar-card{border:1px solid #ebedf0;border-radius:6px;padding:20px 22px}
.ar-h{font-size:14px;font-weight:400;color:#555;margin:0 0 16px}
.ar-sum ul{font-size:14px;color:#555;gap:8px}.ar-sum b{color:#333}
.ar-kpi{gap:10px}.ar-kpi-l{font-size:14px;font-weight:400;color:#555}
.ar-kpi-v{font-size:56px;font-weight:700;color:#555;letter-spacing:-1px;line-height:1}
.ar-chg{font-size:13px}
.ar-t{font-size:14px;color:#555}.ar-t th{font-size:12px;color:#a1a1aa;font-weight:500}.ar-t td{padding:11px 6px}
.ar-t td b{color:#555}.ar-who{font-weight:400}
.ar-pill{font-size:14px;min-width:34px;padding:4px 10px}
.ar-empty{font-size:14px}
.ar-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
.ar-cell{grid-column:span var(--span,6);display:flex;flex-direction:column;min-width:0}.ar-cell>.ar-card{flex:1}
.ar-ed{position:relative;outline:1px dashed transparent;outline-offset:3px;border-radius:8px}.ar-ed:hover{outline-color:#c4c9d0}
.ar-tools{position:absolute;top:8px;right:8px;z-index:2;display:none;gap:4px}.ar-ed:hover .ar-tools{display:flex}
.ar-tools button{font:500 12px Geist,Arial,sans-serif;color:#555;background:#fff;border:1px solid #ebedf0;border-radius:5px;padding:4px 8px;cursor:pointer}
.ar-tools button:hover:not(:disabled){background:#f4f4f5}.ar-tools button:disabled{opacity:.35;cursor:default}
.ar-tools [data-act=hide]{color:#b42318}
.ar-lib{background:#fff;border:1px dashed #c4c9d0;border-radius:6px;padding:16px 18px}
.ar-lib-h{font-size:14px;color:#555;margin-bottom:12px}
.ar-lib-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.ar-lib-i{display:grid;grid-template-columns:22px 1fr;gap:2px 8px;text-align:left;font:400 13px Geist,Arial,sans-serif;color:#555;background:#fafafa;border:1px solid #ebedf0;border-radius:6px;padding:10px 12px;cursor:pointer}
.ar-lib-i:hover{background:#f4f4f5;border-color:#c4c9d0}.ar-lib-i b{grid-row:span 2;font-size:18px;color:#4285F4;line-height:1}.ar-lib-i small{color:#a1a1aa;font-size:11.5px}
@media (max-width:720px){.ar-cell{grid-column:span 6}}
@media (max-width:720px){.ar-g2{grid-template-columns:1fr}.ar-trio{grid-template-columns:1fr}.ar-trio>div{border-right:0;border-bottom:1px solid ${C.line}}}`;
    document.head.appendChild(s);
  }

  /* Monthly bars: one bar per full month, the report month in the strong colour. */
  function bars(list, color, opts){
    opts = opts || {};
    const W = 560, H = 190, pl = 8, pr = 8, pt = 22, pb = 26, n = list.length;
    const max = Math.max(1, ...list.map(x => x.v || 0));
    const bw = (W - pl - pr) / n, w = Math.min(54, bw * .62);
    let out = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="' + esc(opts.label || 'Monthly totals') + '" style="display:block">' +
      '<defs><pattern id="arStripe' + color.replace(/\W/g, '') + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fff"/><rect width="3" height="6" fill="' + color + '" opacity=".55"/></pattern></defs>';
    out += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + (H - pb) + '" y2="' + (H - pb) + '" stroke="' + C.line + '"/>';
    list.forEach((x, i) => {
      const cx = pl + bw * i + bw / 2, last = i === n - 1;
      if (x.v == null){
        out += '<text x="' + cx + '" y="' + (H - pb - 8) + '" text-anchor="middle" font-size="11" fill="' + C.ink3 + '">no data</text>';
      } else {
        const h = Math.max(x.v ? 3 : 0, (H - pt - pb) * x.v / max), y = H - pb - h;
        out += '<rect x="' + (cx - w / 2) + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" fill="' + (x.part ? 'url(#arStripe' + color.replace(/\W/g, '') + ')' : color) + '" opacity="' + (last || x.part ? 1 : .45) + '"' + (x.part ? ' stroke="' + color + '"' : '') + '><title>' + esc(x.name + ': ' + fmt(x.v) + (x.note ? ' (' + x.note + ')' : '')) + '</title></rect>';
        out += '<text x="' + cx + '" y="' + (y - 6) + '" text-anchor="middle" font-size="11.5" font-weight="' + (last ? 700 : 500) + '" fill="' + C.ink + '">' + esc(fmtK(x.v)) + '</text>';
      }
      out += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11.5" font-weight="' + (last ? 700 : 400) + '" fill="' + (last ? C.ink : C.ink3) + '">' + esc(x.label + (x.note ? '*' : '')) + '</text>';
    });
    return out + '</svg>';
  }

  function render(root, feed, opts){
    opts = opts || {};
    styles();
    const ms = months(3), cur = ms[2], prev = ms[1];   /* the last three full months, ending last month */
    const M = model(feed, {since: cur.since, end: cur.end});
    const P = model(feed, {since: prev.since, end: prev.end});
    const up = feed.updated || {};

    /* Where each source starts, so months before it read "no data", not zero */
    const firstOf = list => list.reduce((m, d) => (d && (!m || d < m)) ? d : m, '');
    const ga4Rows = (feed.ga4 && feed.ga4.rows) || [];
    const ga4Start = firstOf(ga4Rows.map(r => r[0]).concat(((feed.channels && feed.channels.daily) || []).map(r => r.d)));
    const gDaily = (feed.google && feed.google.daily) || [];
    const gStart = firstOf(gDaily.map(r => r.d)), gLast = up.google || '';
    const monthly = ms.map(x => {
      const Mx = model(feed, {since: x.since, end: x.end});
      const gFull = gStart && gStart <= x.since && gLast >= x.end;
      return {label: x.label, name: x.name,
        ai: ga4Start && ga4Start <= x.end ? Mx.ai.s : null,
        g: !gStart || gStart > x.end ? null : Mx.google.n, gPart: !!gStart && !gFull && gStart <= x.end,
        gNote: gStart > x.since && gStart <= x.end ? 'from ' + U.shortDate(gStart) : (gLast && gLast < x.end && gLast >= x.since ? 'to ' + U.shortDate(gLast) : '')};
    });

    const plats = M.plats.filter(p => p.s || p.ps);
    const topP = plats.filter(p => p.s).sort((a, b) => b.s - a.s)[0];
    const gHas = !!up.google;
    const gComplete = gHas && gLast >= cur.end;
    const prevG = gStart && gStart <= prev.since ? P.google.n : null;
    const aio = M.aio || [], mentioned = aio.filter(c => c.cited || c.named).length;

    /* ---------- One list of AI sources: Google AI Search + each AI assistant ----------
       Google AI Search = Google visits to the pages Google's AI featured (Google doesn't separate clicks on
       AI Overviews / AI Mode from ordinary results, so this includes both; the note says so in one line). */
    const GN = 'Google AI Search';
    const G = M.gorg || {}, GP = P.gorg || {};
    const gOn = !!(G.known && (G.s || GP.s || gHas));
    const goEv = r => [r[0], GN, r[2], r[3], r[4]];   /* model gives [date, 'Google', page, event, count] */
    const sources = (gOn ? [{name: GN, s: G.s || 0, k: G.k || 0, ps: GP.s || 0, pk: GP.k || 0}] : [])
      .concat(plats.map(p => { const q = P.plats.find(x => x.name === p.name) || {}; return {name: p.name, s: p.s, k: p.k, ps: q.s || 0, pk: q.k || 0}; }));
    const tot = {s: sources.reduce((t, x) => t + x.s, 0), k: sources.reduce((t, x) => t + x.k, 0),
      ps: sources.reduce((t, x) => t + x.ps, 0), pk: sources.reduce((t, x) => t + x.pk, 0)};
    const evRows = ((M.keyEv && M.keyEv.rows) || []).concat(gOn ? (G.events || []).map(goEv) : []);
    const types = keyEventsOf(evRows);
    const srcSorted = sources.slice().sort((a, b) => b.s - a.s || b.k - a.k);
    const asst = plats.filter(p => p.s), topA = asst.slice().sort((a, b) => b.s - a.s)[0];

    /* ---------- In short ---------- */
    const L = [];
    if (tot.s) L.push('AI brought <b>' + fmt(tot.s) + ' visit' + (tot.s === 1 ? '' : 's') + '</b> to the website in ' + esc(cur.name) +
      (gOn && G.s && M.ai.s ? ': ' + fmt(G.s) + ' from Google’s AI search results and ' + fmt(M.ai.s) + ' from AI assistants' + (topA ? ' like ' + esc(topA.name) : '') : gOn && G.s ? ', all from Google’s AI search results' : topA ? ', from AI assistants like ' + esc(topA.name) : '') + '.' +
      (tot.ps ? ' That is ' + (tot.s === tot.ps ? 'the same as' : tot.s > tot.ps ? fmt(tot.s - tot.ps) + ' more than' : fmt(tot.ps - tot.s) + ' fewer than') + ' ' + esc(prev.name.split(' ')[0]) + '.' : ''));
    else L.push('No visits from AI were recorded in ' + esc(cur.name) + '.');
    L.push(tot.k ? 'Those visitors completed <b>' + fmt(tot.k) + ' conversion' + (tot.k === 1 ? '' : 's') + '</b>' + (types[0] ? ', mostly <b>' + esc(types[0].label.toLowerCase()) + '</b>' : '') + '.' : 'No conversions came from AI visitors this month.');
    if (gHas) L.push('Google’s AI showed the website <b>' + fmt(M.google.n) + ' times</b>' + (gComplete ? '' : ' (data to ' + esc(U.prettyDate(gLast)) + ')') + (prevG != null && gComplete && prevG ? ', ' + (M.google.n >= prevG ? 'up' : 'down') + ' from ' + fmt(prevG) + ' in ' + esc(prev.name.split(' ')[0]) : '') + '.');
    /* tracked-search mention line hidden from the client report */

    /* ---------- KPIs ---------- */
    const kpi = (label, val, cur0, prev0, foot) => '<div class="ar-card ar-kpi"><div class="ar-kpi-l">' + esc(label) + '</div><div class="ar-kpi-v">' + val + '</div>' +
      '<div class="ar-kpi-f">' + (prev0 != null ? change(cur0, prev0) : '') + (foot ? '<span>' + foot + '</span>' : '') + '</div></div>';
    const kpis = kpi('Visits from AI', fmt(tot.s), tot.s, tot.ps) +
      kpi('Conversions from AI', fmt(tot.k), tot.k, tot.pk) +
      (gHas ? kpi('Times Google’s AI Showed the Site', fmt(M.google.n), M.google.n, gComplete ? prevG : null, gComplete ? '' : 'data to ' + esc(U.shortDate(gLast))) : '') +
      '';   /* tracked-search mention box hidden from the client report */

    /* ---------- Where AI visitors came from ---------- */
    const srcCards = srcSorted.map(p => '<div class="ar-a" style="--c:' + pc(p.name) + '"><div class="ar-a-h"><span class="ar-who">' + icon(p.name, 26) + '<span class="ar-a-n">' + esc(p.name) + '</span></span>' + change(p.s, p.ps) + '</div>' +
      '<div class="ar-a-row ar-a-row2"><div>Visits<b>' + fmt(p.s) + '</b></div><div>Conversions<b>' + fmt(p.k) + '</b></div></div>' +
      '<div class="ar-share" title="Share of all visits from AI"><i style="width:' + (tot.s ? Math.max(p.s ? 2 : 0, Math.round(p.s / tot.s * 100)) : 0) + '%"></i></div>' +
      '<div class="ar-a-f">' + (tot.s ? (p.s && p.s / tot.s < .01 ? 'Less than 1%' : Math.round(p.s / tot.s * 100) + '%') + ' of visits from AI' : 'No visits this month') + '</div></div>').join('');

    /* ---------- Conversions ---------- */
    const convSrc = srcSorted.filter(p => p.k || types.some(t => t.plats[p.name]));
    const convMax = Math.max(1, ...convSrc.map(p => p.k));
    const convBars = convSrc.length ? '<div class="ar-bar">' + convSrc.map(p => '<div>' + who(p.name, 20) + '<span class="t"><i style="width:' + (p.k / convMax * 100) + '%;background:' + pc(p.name) + '"></i></span><b>' + fmt(p.k) + '</b></div>').join('') + '</div>' : '';
    const matrix = types.length ? '<table class="ar-t ar-mx"><thead><tr><th>What they did</th>' + convSrc.map(p => '<th class="c" title="' + esc(p.name) + '">' + icon(p.name, 22) + '<div style="margin-top:4px;text-transform:none;letter-spacing:0">' + esc(p.name) + '</div></th>').join('') + '<th class="n">Total</th></tr></thead><tbody>' +
      types.slice(0, 8).map(t => '<tr><td>' + esc(t.label) + '</td>' + convSrc.map(p => '<td class="c"><span class="ar-pill' + (t.plats[p.name] ? ' on' : '') + '">' + fmt(t.plats[p.name] || 0) + '</span></td>').join('') + '<td class="n"><b>' + fmt(t.n) + '</b></td></tr>').join('') + '</tbody></table>'
      : '<div class="ar-empty">' + (tot.k ? 'Conversion types aren’t available for this site yet.' : 'No conversions from AI visitors in ' + esc(cur.name) + (tot.pk ? ' (' + fmt(tot.pk) + ' in ' + esc(prev.name.split(' ')[0]) + ').' : '.')) + '</div>';
    const convCard = '<div class="ar-card"><h2 class="ar-h">Conversions from AI</h2><p class="ar-cap">Calls, forms, emails and other goals completed by visitors who came from AI in ' + esc(cur.name) + '.</p>' +
      matrix + '</div>';

    /* ---------- Pages AI brought visitors to ---------- */
    const pm = {};
    const addPg = (u, src, s0, k0) => { const k = pageKey(u); if (k === 'Landing page not recorded') return; const o = pm[k] = pm[k] || {k, s: 0, c: 0, by: {}}; o.s += s0; o.c += k0; o.by[src] = (o.by[src] || 0) + s0; o.cb = o.cb || {}; o.cb[src] = (o.cb[src] || 0) + k0; };
    M.cur.forEach(r => addPg(r[3], r[1], Number(r[4]) || 0, Number(r[6]) || 0));
    if (gOn) ((feed.gorg && feed.gorg.rows) || []).filter(r => r[0] >= cur.since && r[0] <= cur.end).forEach(r => addPg(r[1], GN, Number(r[2]) || 0, Number(r[4]) || 0));
    const pages = [].concat(...Object.values(pm).map(o => Object.keys(o.by).map(n => ({k: o.k, src: n, s: o.by[n], c: (o.cb || {})[n] || 0})))).filter(p => p.s).sort((a, b) => b.s - a.s).slice(0, 5);

    /* ---------- Google AI Overviews ---------- */
    const lbl = c => c.cited ? '<span class="ar-tag y">Linked to the site</span>' : c.named ? '<span class="ar-tag y">Business named</span>' : c.shown ? '<span class="ar-tag m">Not mentioned</span>' : '<span class="ar-tag n">No AI answer</span>';
    const aioSorted = aio.slice().sort((a, b) => (b.cited ? 3 : b.named ? 2 : b.shown ? 1 : 0) - (a.cited ? 3 : a.named ? 2 : a.shown ? 1 : 0));
    const aioCard = aio.length ? '<div class="ar-card"><h2 class="ar-h">Is the Business in Google’s AI Answers?</h2><p class="ar-cap">For the searches we track, does Google’s AI answer mention the business? Checked ' + esc(U.prettyDate(M.aioRun || '')) + '.</p>' +
      '<table class="ar-t"><thead><tr><th>Search</th><th>Location</th><th>Result</th></tr></thead><tbody>' +
      aioSorted.slice(0, 8).map(c => '<tr><td>' + esc(c.k) + '</td><td>' + esc(c.loc || '') + '</td><td>' + lbl(c) + '</td></tr>').join('') + '</tbody></table>' +
      (aio.length > 8 ? '<p class="ar-note" style="margin:8px 0 0">and ' + (aio.length - 8) + ' more tracked searches.</p>' : '') + '</div>' : '';

    /* Visits from AI for each of the three months, split by source (same counting as the totals above) */
    const srcMonth = ms.map(x => { const Mx = model(feed, {since: x.since, end: x.end});
      const has = (ga4Start && ga4Start <= x.end) || (gStart && gStart <= x.end), by = {};
      if (has){ if (gOn && Mx.gorg) by[GN] = Mx.gorg.s || 0; Mx.plats.forEach(p => { if (p.s) by[p.name] = (by[p.name] || 0) + p.s; }); }
      return {label: x.label, name: x.name, has, by, total: Object.values(by).reduce((t, v) => t + v, 0)}; });
    const srcNames = [...new Set([].concat(...srcMonth.map(m => Object.keys(m.by))))]
      .sort((a, b) => srcMonth.reduce((t, m) => t + (m.by[b] || 0), 0) - srcMonth.reduce((t, m) => t + (m.by[a] || 0), 0));
    const stacked = () => {
      const W = 1200, H = 230, pt = 26, pb = 30, n = srcMonth.length, bw = W / n, w = Math.min(150, bw * .4);
      const max = Math.max(1, ...srcMonth.map(m => m.total));
      let o = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Visits from AI by month and source" style="display:block">' +
        '<line x1="0" x2="' + W + '" y1="' + (H - pb) + '" y2="' + (H - pb) + '" stroke="' + C.line + '"/>';
      srcMonth.forEach((m, i) => {
        const cx = bw * i + bw / 2, last = i === n - 1;
        if (!m.has){ o += '<text x="' + cx + '" y="' + (H - pb - 8) + '" text-anchor="middle" font-size="11" fill="' + C.ink3 + '">no data</text>'; }
        else {
          let y = H - pb;
          srcNames.forEach(nm => { const v = m.by[nm] || 0; if (!v) return; const h = Math.max(2, (H - pt - pb) * v / max); y -= h;
            o += '<rect x="' + (cx - w / 2) + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + pc(nm) + '" opacity="' + (last ? 1 : .55) + '"><title>' + esc(m.name + ' \u00b7 ' + nm + ': ' + fmt(v) + ' visit' + (v === 1 ? '' : 's')) + '</title></rect>'; });
          o += '<text x="' + cx + '" y="' + (y - 7) + '" text-anchor="middle" font-size="16" font-weight="700" fill="#555">' + esc(fmt(m.total)) + '</text>';
        }
        o += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle" font-size="14" font-weight="' + (last ? 600 : 400) + '" fill="' + (last ? '#555' : '#a1a1aa') + '">' + esc(m.name) + '</text>';
      });
      return o + '</svg>';
    };
    const monthTable = srcNames.length ? '<table class="ar-t" style="margin-top:14px"><thead><tr><th>Source</th>' + srcMonth.map((m, i) => '<th class="n"' + (i === srcMonth.length - 1 ? ' style="color:' + C.ink + '"' : '') + '>' + esc(m.label) + '</th>').join('') + '</tr></thead><tbody>' +
      srcNames.map(nm => '<tr><td>' + who(nm, 20) + '</td>' + srcMonth.map((m, i) => '<td class="n">' + (i === srcMonth.length - 1 ? '<b>' : '') + (m.has ? fmt(m.by[nm] || 0) : '\u2014') + (i === srcMonth.length - 1 ? '</b>' : '') + '</td>').join('') + '</tr>').join('') +
      '</tbody></table>' : '';
    const gLine = gHas ? '<p class="ar-note" style="margin:12px 0 0">' + icon(GN, 14) + ' Times Google\u2019s AI showed the site: ' + monthly.map(x => esc(x.label) + ' <b style="color:' + C.ink2 + '">' + (x.g == null ? '\u2014' : fmt(x.g)) + '</b>' + (x.gNote ? ' (' + esc(x.gNote) + ')' : '')).join(' \u00b7 ') + '</p>' : '';

    /* ---------- Widgets (AgencyAnalytics style): each one is a card with a size on a 6-column grid ---------- */
    const card = (title, body, cls) => '<div class="ar-card' + (cls ? ' ' + cls : '') + '"><h2 class="ar-h">' + esc(title) + '</h2>' + body + '</div>';
    const gMonths = monthly.map(x => ({label: x.label, name: x.name, v: x.g, part: x.gPart, note: x.gNote}));
    const W = {
      summary: {t: 'At a glance', size: 6, html: () => '<div class="ar-card ar-sum"><h2 class="ar-h">' + esc(cur.name) + ' at a glance</h2><ul>' + L.map(l => '<li>' + l + '</li>').join('') + '</ul></div>'},
      'kpi-visits': {t: 'Visits from AI', size: 2, html: () => kpi('Visits from AI', fmt(tot.s), tot.s, tot.ps)},
      'kpi-conv': {t: 'Conversions from AI', size: 2, html: () => kpi('Conversions from AI', fmt(tot.k), tot.k, tot.pk)},
      'kpi-gimpr': {t: 'Times Google’s AI Showed the Site', size: 2, ok: gHas, html: () => kpi('Times Google’s AI Showed the Site', fmt(M.google.n), M.google.n, gComplete ? prevG : null, gComplete ? '' : 'data to ' + esc(U.shortDate(gLast)))},
      'conv-types': {t: 'Conversions from AI', size: 6, html: () => convCard},
      'visits-3m': {t: 'Visits from AI — Last 3 Months', size: 6, html: () => card('Visits from AI — Last 3 Months', srcNames.length ? stacked() + monthTable : '<div class="ar-empty">No visits from AI in the last three months.</div>')},
      pages: {t: 'Pages AI Brought Visitors To', size: 6, html: () => card('Pages AI Brought Visitors To',
        pages.length ? '<table class="ar-t"><thead><tr><th>Page</th><th>Source</th><th class="n">Visits</th><th class="n">Conversions</th></tr></thead><tbody>' + pages.map(p => '<tr><td class="pg" title="' + esc(p.k) + '">' + esc(p.k) + '</td><td>' + who(p.src, 20) + '</td><td class="n">' + fmt(p.s) + '</td><td class="n">' + fmt(p.c) + '</td></tr>').join('') + '</tbody></table>' : '<div class="ar-empty">No visits from AI this month.</div>')},
      /* Extra widgets you can add from the tool */
      sources: {t: 'Where AI Visitors Came From', size: 6, html: () => card('Where AI Visitors Came From', srcCards ? '<div class="ar-asst">' + srcCards + '</div>' : '<div class="ar-empty">No visits from AI this month.</div>')},
      'conv-sources': {t: 'Conversions by AI Source', size: 3, html: () => card('Conversions by AI Source', convBars || '<div class="ar-empty">No conversions from AI this month.</div>')},
      'gimpr-3m': {t: 'Times Google’s AI Showed the Site — Last 3 Months', size: 3, ok: gHas, html: () => card('Times Google’s AI Showed the Site — Last 3 Months', bars(gMonths, '#8fbf2f', {label: 'Google AI impressions by month'}))},
      'kpi-mentioned': {t: 'Mentioned in Google’s AI', size: 2, ok: aio.length > 0, html: () => kpi('Mentioned in Google’s AI', fmt(mentioned) + '<span style="font-size:24px;color:#a1a1aa;font-weight:500"> / ' + fmt(aio.length) + '</span>', null, null, 'tracked searches')},
      aio: {t: 'Is the Business in Google’s AI Answers?', size: 6, ok: aio.length > 0, html: () => aioCard}
    };
    const DEFAULT = ['summary', 'kpi-visits', 'kpi-conv', 'kpi-gimpr', 'conv-types', 'visits-3m', 'pages'];
    const layout = (Array.isArray(opts.layout) && opts.layout.length ? opts.layout : DEFAULT).filter((id, k, a) => W[id] && a.indexOf(id) === k);
    const avail = id => W[id].ok !== false;
    const edit = !!opts.edit;
    const cell = (id, k) => {
      const w = W[id];
      const inner = avail(id) ? w.html() : card(w.t, '<div class="ar-empty">No data for this client yet.</div>');
      if (!edit) return avail(id) ? '<div class="ar-cell" style="--span:' + w.size + '">' + inner + '</div>' : '';
      return '<div class="ar-cell ar-ed" style="--span:' + w.size + '" data-w="' + id + '"><div class="ar-tools">' +
        '<button type="button" data-act="left" title="Move earlier"' + (k === 0 ? ' disabled' : '') + '>←</button>' +
        '<button type="button" data-act="right" title="Move later"' + (k === layout.length - 1 ? ' disabled' : '') + '>→</button>' +
        '<button type="button" data-act="hide" title="Hide from the report">Hide</button></div>' + inner + '</div>';
    };
    const lib = edit ? Object.keys(W).filter(id => layout.indexOf(id) < 0) : [];
    root.innerHTML = '<div class="ar' + (edit ? ' ar-editing' : '') + '"><div class="ar-grid">' + layout.map(cell).join('') + '</div>' +
      (edit ? '<div class="ar-lib"><div class="ar-lib-h">Add a widget</div>' + (lib.length ? '<div class="ar-lib-g">' + lib.map(id => '<button type="button" class="ar-lib-i" data-add="' + id + '"' + (avail(id) ? '' : ' title="No data for this client yet"') + '><b>+</b><span>' + esc(W[id].t) + '</span><small>' + ({2: 'Small', 3: 'Half width', 6: 'Full width'})[W[id].size] + (avail(id) ? '' : ' · no data yet') + '</small></button>').join('') + '</div>' : '<div class="ar-empty">Every widget is already on the report.</div>') + '</div>' : '') +
      '<div class="ar-foot">' + esc(opts.foot || '') + '</div></div>';
    if (edit && typeof opts.onLayout === 'function'){
      root.querySelectorAll('[data-w] [data-act]').forEach(b => b.addEventListener('click', () => {
        const id = b.closest('[data-w]').dataset.w, k = layout.indexOf(id), next = layout.slice();
        if (b.dataset.act === 'hide') next.splice(k, 1);
        else { const to = b.dataset.act === 'left' ? k - 1 : k + 1; if (to < 0 || to >= next.length) return; next.splice(k, 1); next.splice(to, 0, id); }
        opts.onLayout(next);
      }));
      root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => opts.onLayout(layout.concat(b.dataset.add))));
    }
  }

  window.AIReport2 = {render, DEFAULT_LAYOUT: ['summary', 'kpi-visits', 'kpi-conv', 'kpi-gimpr', 'conv-types', 'visits-3m', 'pages']};
})();
