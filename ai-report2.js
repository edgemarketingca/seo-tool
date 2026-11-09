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
.ar-h{font-size:14px;font-weight:600;margin:0 0 4px}
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
    const ms = months(6), cur = ms[5], prev = ms[4];
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
    const goEv = r => [r[0], GN, r[1], r[2], r[3]];
    const sources = (gOn ? [{name: GN, s: G.s || 0, k: G.k || 0, ps: GP.s || 0, pk: GP.k || 0}] : [])
      .concat(plats.map(p => ({name: p.name, s: p.s, k: p.k, ps: p.ps, pk: p.pk})));
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
    if (aio.length) L.push('When people search for the topics we track, Google’s AI mentions the business in <b>' + fmt(mentioned) + ' of ' + fmt(aio.length) + '</b> searches.');

    /* ---------- KPIs ---------- */
    const kpi = (label, val, cur0, prev0, foot) => '<div class="ar-card ar-kpi"><div class="ar-kpi-l">' + esc(label) + '</div><div class="ar-kpi-v">' + val + '</div>' +
      '<div class="ar-kpi-f">' + (prev0 != null ? change(cur0, prev0) + '<span>vs ' + esc(prev.label) + ' (' + fmt(prev0) + ')</span>' : '') + (foot ? '<span>' + foot + '</span>' : '') + '</div></div>';
    const kpis = kpi('Visits from AI', fmt(tot.s), tot.s, tot.ps) +
      kpi('Conversions from AI', fmt(tot.k), tot.k, tot.pk) +
      (gHas ? kpi('Times Google’s AI Showed the Site', fmt(M.google.n), M.google.n, gComplete ? prevG : null, gComplete ? '' : 'data to ' + esc(U.shortDate(gLast))) : '') +
      (aio.length ? kpi('Mentioned in Google’s AI', fmt(mentioned) + '<span style="font-size:18px;color:' + C.ink3 + ';font-weight:500"> / ' + fmt(aio.length) + '</span>', null, null, 'tracked searches') : '');

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
      '<div class="ar-convs"><div class="ar-conv-big"><div><div class="ar-kpi-l">Total conversions</div><div class="ar-kpi-v">' + fmt(tot.k) + '</div><div class="ar-kpi-f">' + change(tot.k, tot.pk) + '<span>vs ' + esc(prev.label) + ' (' + fmt(tot.pk) + ')</span></div></div>' + convBars + '</div>' +
      '<div>' + matrix + '</div></div></div>';

    /* ---------- Pages AI brought visitors to ---------- */
    const pm = {};
    const addPg = (u, src, s0, k0) => { const k = pageKey(u); if (k === 'Landing page not recorded') return; const o = pm[k] = pm[k] || {k, s: 0, c: 0, by: {}}; o.s += s0; o.c += k0; o.by[src] = (o.by[src] || 0) + s0; };
    M.cur.forEach(r => addPg(r[3], r[1], Number(r[4]) || 0, Number(r[6]) || 0));
    if (gOn) ((feed.gorg && feed.gorg.rows) || []).filter(r => r[0] >= cur.since && r[0] <= cur.end).forEach(r => addPg(r[1], GN, Number(r[2]) || 0, Number(r[4]) || 0));
    const pages = Object.values(pm).sort((a, b) => b.s - a.s).slice(0, 8);

    /* ---------- Google AI Overviews ---------- */
    const lbl = c => c.cited ? '<span class="ar-tag y">Linked to the site</span>' : c.named ? '<span class="ar-tag y">Business named</span>' : c.shown ? '<span class="ar-tag m">Not mentioned</span>' : '<span class="ar-tag n">No AI answer</span>';
    const aioSorted = aio.slice().sort((a, b) => (b.cited ? 3 : b.named ? 2 : b.shown ? 1 : 0) - (a.cited ? 3 : a.named ? 2 : a.shown ? 1 : 0));
    const aioCard = aio.length ? '<div class="ar-card"><h2 class="ar-h">Is the Business in Google’s AI Answers?</h2><p class="ar-cap">For the searches we track, does Google’s AI answer mention the business? Checked ' + esc(U.prettyDate(M.aioRun || '')) + '.</p>' +
      '<table class="ar-t"><thead><tr><th>Search</th><th>Location</th><th>Result</th></tr></thead><tbody>' +
      aioSorted.slice(0, 8).map(c => '<tr><td>' + esc(c.k) + '</td><td>' + esc(c.loc || '') + '</td><td>' + lbl(c) + '</td></tr>').join('') + '</tbody></table>' +
      (aio.length > 8 ? '<p class="ar-note" style="margin:8px 0 0">and ' + (aio.length - 8) + ' more tracked searches.</p>' : '') + '</div>' : '';

    /* Monthly visits from AI (Google AI Search + assistants) */
    const monthlyV = ms.map(x => { const Mx = model(feed, {since: x.since, end: x.end}); const has = (ga4Start && ga4Start <= x.end) || (gStart && gStart <= x.end);
      return {label: x.label, name: x.name, v: has ? (Mx.ai.s || 0) + (gOn && Mx.gorg ? Mx.gorg.s || 0 : 0) : null}; });

    root.innerHTML = '<div class="ar">' +
      '<div class="ar-card ar-head"><div><h1 class="ar-title">' + esc(opts.title || ((feed.name || feed.domain) + ' — AI Visibility')) + '</h1><div class="ar-sub">How people found the website through AI</div></div><span class="ar-badge">' + esc(cur.name) + '</span></div>' +
      '<div class="ar-card ar-sum"><h2 class="ar-h">' + esc(cur.name) + ' at a glance</h2><ul>' + L.map(l => '<li>' + l + '</li>').join('') + '</ul></div>' +
      '<div class="ar-kpis">' + kpis + '</div>' +
      '<div class="ar-card"><h2 class="ar-h">Where AI Visitors Came From</h2><p class="ar-cap">Visits and conversions from each AI source in ' + esc(cur.name) + ', compared with ' + esc(prev.name.split(' ')[0]) + '.</p>' +
        (srcCards ? '<div class="ar-asst">' + srcCards + '</div>' : '<div class="ar-empty">No visits from AI this month.</div>') +
        (gOn ? '<p class="ar-note" style="margin:12px 0 0">' + icon(GN, 14) + ' <b style="color:' + C.ink2 + '">Google AI Search</b> counts Google visitors to the pages Google’s AI featured. Google doesn’t report AI clicks separately, so it also includes regular Google search clicks on those pages.</p>' : '') + '</div>' +
      convCard +
      '<div class="ar-g2"><div class="ar-card"><h2 class="ar-h">Visits from AI by Month</h2><p class="ar-cap">Full months only.</p>' + bars(monthlyV, '#4285F4', {label: 'Visits from AI by month'}) + '</div>' +
        (gHas ? '<div class="ar-card"><h2 class="ar-h">Times Google’s AI Showed the Site by Month</h2><p class="ar-cap">AI Overviews and AI Mode, from Google Search Console.' + (monthly.some(x => x.gPart) ? ' Part months are striped.' : '') + '</p>' + bars(monthly.map(x => ({label: x.label, name: x.name, v: x.g, part: x.gPart, note: x.gNote})), '#8fbf2f', {label: 'Google AI impressions by month'}) + '</div>' : '<div></div>') + '</div>' +
      '<div class="ar-card"><h2 class="ar-h">Pages AI Brought Visitors To</h2><p class="ar-cap">The pages visitors from AI landed on in ' + esc(cur.name) + ', and where they came from.</p>' +
        (pages.length ? '<table class="ar-t"><thead><tr><th>Page</th><th>From</th><th class="n">Visits</th><th class="n">Conversions</th></tr></thead><tbody>' + pages.map(p => '<tr><td class="pg" title="' + esc(p.k) + '">' + esc(p.k) + '</td><td><span class="ar-icons">' + Object.keys(p.by).sort((a, b) => p.by[b] - p.by[a]).map(n => '<span title="' + esc(n + ': ' + p.by[n] + ' visit' + (p.by[n] === 1 ? '' : 's')) + '">' + icon(n, 20) + '</span>').join('') + '</span></td><td class="n">' + fmt(p.s) + '</td><td class="n">' + fmt(p.c) + '</td></tr>').join('') + '</tbody></table>' : '<div class="ar-empty">No visits from AI this month.</div>') + '</div>' +
      aioCard +
      '<div class="ar-foot">' + esc(opts.foot || '') + '</div></div>';
  }

  window.AIReport2 = {render};
})();
