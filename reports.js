/* ==========================================================================
   TEAM REPORT and CLIENT REPORT

   Two tabs on every SEO client, beside AI Visibility.

   Team report   Every widget the tool can draw, from every source it tracks:
                 GA4 conversions and traffic (all channels), AI visits,
                 assistants and visitor journeys, Google AI impressions, AI
                 Overview citations, Copilot citations, prompt checks, Search
                 Console, keyword rankings and Google Business Profile grids.
                 Every number opens what is behind it. "Customize" adds,
                 removes, resizes and drags widgets.

   Client report Starts blank. A team widget's "Send to client" puts a copy
                 here, where it has its own order and size. Text and embedded
                 pages (any URL) can be added too. "Share" publishes a link
                 (client-report.html) that shows live numbers.

   Layouts live on the client record (c.reports), so they sync like everything
   else. Data comes from the AI Visibility Tracker (feed, ga4report,
   gscQueries, journeys) and from the client record itself (keywords) and the
   GBP tracker (grids). The renderer is shared with the public page, which
   reads a stored copy first and then live numbers with a read-only token.
   ========================================================================== */
(function(){
'use strict';
const AIV = window.AIVis;
if (!AIV || !AIV.ui) return;
const U = AIV.ui;
const {esc, fmt, fmtK, prettyDate, shortDate, addDays, today, pageKey, shortUrl, safeUrl, linkTo, dotName,
  lineChart, donut, table, barCell, statsRow, delta, keLabel, keyEventsOf, pcol, PLATFORMS} = U;

/* ---------- small helpers ---------- */
const sum = (rows, i) => rows.reduce((t, r) => t + (Number(r[i]) || 0), 0);
const uid = () => 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const pct = (a, b) => b ? (a / b * 100) : 0;
const pctS = (a, b) => b ? (Math.round(a / b * 1000) / 10) + '%' : '—';
const isoDay = d => d.toISOString().slice(0, 10);
const CHC = {'Organic Search': '#2a78d6', Direct: '#1baf7a', 'Paid Search': '#eda100', 'Cross-network': '#6250d6', Referral: '#e87ba4',
  'Organic Social': '#008300', 'Paid Social': '#e34948', Email: '#8a5a00', 'Organic Shopping': '#0b8fa3', 'Organic Video': '#a33ea1',
  Display: '#c96a00', Unassigned: '#8795a1', '(other)': '#8795a1'};
const chColor = ch => ch && ch.indexOf('AI: ') === 0 ? pcol(ch.slice(4)) : (CHC[ch] || '#57646f');
const chName = ch => ch && ch.indexOf('AI: ') === 0 ? ch.slice(4) + ' (AI)' : (ch || 'Unassigned');
const isAi = ch => !!ch && ch.indexOf('AI: ') === 0;
const KW_COL = '#2a78d6';

/* ---------- icons ----------
   Brand marks are the services' own site icons, fetched from Google's public
   favicon service (nothing is redrawn here). If one can't load, a lettered
   badge in the brand colour takes its place. Glyphs are simple line icons. */
const BRAND = {ChatGPT: 'chatgpt.com', Perplexity: 'perplexity.ai', Gemini: 'gemini.google.com', Copilot: 'copilot.microsoft.com', Claude: 'claude.ai',
  'Meta AI': 'meta.ai', Grok: 'grok.com', DeepSeek: 'deepseek.com',
  ga4: 'analytics.google.com', gsc: 'search.google.com', google: 'google.com', gads: 'ads.google.com', bing: 'bing.com', gbp: 'business.google.com', maps: 'maps.google.com',
  facebook: 'facebook.com', instagram: 'instagram.com', linkedin: 'linkedin.com', youtube: 'youtube.com'};
const BRAND_NAME = {ga4: 'Google Analytics', gsc: 'Search Console', google: 'Google', gads: 'Google Ads', bing: 'Bing', gbp: 'Business Profile', maps: 'Google Maps'};
const favUrl = (domain, sz) => 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain) + '&sz=' + (sz || 64);
const brandCol = k => PLATFORMS.indexOf(k) > -1 ? pcol(k) : ({ga4: '#e37400', gsc: '#2a78d6', google: '#2a78d6', gads: '#1baf7a', bing: '#0b8fa3', gbp: '#2a78d6', maps: '#1baf7a'}[k] || '#8795a1');
/* <img> of a brand mark; size in px. */
const logo = (k, sz, extra) => {
  const d = BRAND[k];
  if (!d) return k === 'Other AI' ? glyph('spark', sz, '#8795a1') : '';
  const nm = BRAND_NAME[k] || k;
  return '<img class="rp-logo" src="' + favUrl(d, sz > 24 ? 128 : 64) + '" width="' + sz + '" height="' + sz + '" alt="' + esc(nm) + '" title="' + esc(nm) + '" loading="lazy" decoding="async" referrerpolicy="no-referrer"' +
    ' data-fb="' + esc(nm.charAt(0)) + '" data-fc="' + brandCol(k) + '"' + (extra ? ' ' + extra : '') + '>';
};
/* Overlapping row of brand marks. */
const logoStack = (ks, sz) => '<span class="rp-stack">' + ks.map(k => logo(k, sz || 16)).join('') + '</span>';
const AI_STACK = ['ChatGPT', 'Perplexity', 'Gemini', 'Copilot'];
const GLYPH = {
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  line: 'M3 3v18h18M7 15l4-4 3 3 6-7',
  donut: 'M12 3a9 9 0 1 0 9 9h-9zM15 3.5A9 9 0 0 1 20.5 9H15z',
  table: 'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14',
  users: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  path: 'M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 15V9a4 4 0 0 1 4-4h8M19 9v6a4 4 0 0 1-4 4H9',
  page: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3',
  up: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  bars: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  pin: 'M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  text: 'M4 6h16M4 12h16M4 18h10',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3',
  device: 'M4 5h16v10H4zM2 19h20M9 15v4M15 15v4',
  flag: 'M4 22V4M4 4h13l-2 4 2 4H4',
  quote: 'M7 7h4v4c0 3-2 5-4 5M14 7h4v4c0 3-2 5-4 5',
  cal: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  brush: 'M14 4l6 6-9 9H5v-6zM12 6l6 6',
  resize: 'M21 15l-6 6M21 9L9 21',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'
};
const glyph = (k, sz, color) => '<svg class="rp-gl" viewBox="0 0 24 24" width="' + (sz || 16) + '" height="' + (sz || 16) + '" fill="none" stroke="' + (color || 'currentColor') +
  '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (GLYPH[k] || GLYPH.bars) + '"/></svg>';
/* A lettered badge stands in for a brand mark that didn't load. */
if (!window.__rpLogoFb){
  window.__rpLogoFb = true;
  document.addEventListener('error', e => {
    const t = e.target;
    if (!t || t.tagName !== 'IMG' || !t.classList.contains('rp-logo')) return;
    const s = document.createElement('span');
    s.className = 'rp-logo rp-logo-fb'; s.textContent = t.dataset.fb || '?'; s.title = t.title || '';
    s.style.cssText = 'width:' + t.width + 'px;height:' + t.height + 'px;font-size:' + Math.max(8, Math.round(t.width * 0.58)) + 'px;background:' + (t.dataset.fc || '#8795a1');
    t.replaceWith(s);
  }, true);
}
/* Brand mark for a GA4 channel name, if there is one. */
const chLogo = ch => isAi(ch) ? ch.slice(4) : ({'Organic Search': 'google', 'Paid Search': 'gads', 'Organic Video': 'youtube'}[ch] || '');
const chLabel = (ch, sz) => { const k = chLogo(ch); return k && BRAND[k] ? '<span class="rp-nm">' + logo(k, sz || 14) + esc(chName(ch)) + '</span>' : dotName(chName(ch), chColor(ch)); };
const platLabel = (p, sz) => BRAND[p] ? '<span class="rp-nm">' + logo(p, sz || 14) + esc(p) + '</span>' : dotName(p, pcol(p));

/* Periods. Every widget on a board shares one. */
const PERIODS = [['7', 'Last 7 days', '7 days'], ['30', 'Last 30 days', '30 days'], ['90', 'Last 90 days', '90 days'], ['thisMonth', 'This month', 'This month'],
  ['lastMonth', 'Last month', 'Last month'], ['lastQuarter', 'Last quarter', 'Last quarter'], ['ytd', 'Year to date', 'Year to date'], ['365', 'Last 12 months', '12 months']];
/* What a client report offered before periods could be chosen: kept for reports set up then. */
const CLIENT_PERIODS_DEFAULT = ['30', '90', 'lastMonth', '365'];
const validPeriod = p => PERIODS.some(x => x[0] === String(p));
function rangeOf(p){
  const end0 = addDays(today(), -1);
  let since, end;
  const t = new Date();
  if (p === 'lastMonth'){
    since = isoDay(new Date(Date.UTC(t.getFullYear(), t.getMonth() - 1, 1, 12)));
    end = isoDay(new Date(Date.UTC(t.getFullYear(), t.getMonth(), 0, 12)));
  } else if (p === 'thisMonth'){
    end = end0; since = isoDay(new Date(Date.UTC(t.getFullYear(), t.getMonth(), 1, 12)));
    if (since > end) since = end;
  } else if (p === 'ytd'){
    end = end0; since = isoDay(new Date(Date.UTC(t.getFullYear(), 0, 1, 12)));
    if (since > end) since = end;
  } else if (p === 'lastQuarter'){
    const q = Math.floor(t.getMonth() / 3);
    since = isoDay(new Date(Date.UTC(t.getFullYear(), (q - 1) * 3, 1, 12)));
    end = isoDay(new Date(Date.UTC(t.getFullYear(), q * 3, 0, 12)));
  } else {
    const n = Number(p) || 30;
    end = end0; since = addDays(end, -(n - 1));
  }
  const days = Math.round((Date.parse(end + 'T12:00:00Z') - Date.parse(since + 'T12:00:00Z')) / 86400000) + 1;
  const prevEnd = addDays(since, -1), prevSince = addDays(prevEnd, -(days - 1));
  const label = (PERIODS.find(x => x[0] === String(p)) || [0, ''])[1];
  return {key: String(p), since, end, prevSince, prevEnd, days, weekly: days > 35, label,
    text: prettyDate(since) + ' – ' + prettyDate(end)};
}
/* Day or week buckets for charts over a range. */
function buckets(R){
  const bucket = d => { if (!R.weekly) return d; const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7)); return isoDay(t); };
  const labels = [];
  let first = bucket(R.since);
  if (R.weekly && first < R.since) first = addDays(first, 7);
  for (let d = first; d <= R.end; d = addDays(d, R.weekly ? 7 : 1)) labels.push(d);
  if (R.weekly && labels.length > 1 && addDays(labels[labels.length - 1], 6) > R.end) labels.pop();
  const idx = {}; labels.forEach((d, i) => { idx[d] = i; });
  return {labels, slot: d => idx[bucket(d)], zero: () => labels.map(() => 0)};
}

/* ==========================================================================
   STYLES
   ========================================================================== */
function styles(){
  if (document.getElementById('rpStyles')) return;
  U.injectStyles();
  const st = document.createElement('style');
  st.id = 'rpStyles';
  st.textContent = `
.rp{max-width:1280px;margin:0 auto;}
.rp-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:16px;}
.rp-title{font-family:var(--display,Poppins,Inter,sans-serif);font-size:21px;font-weight:600;letter-spacing:-.01em;margin:0;}
.rp-sub{color:var(--a-ink2);font-size:12.5px;margin-top:4px;}
.rp-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
.rp-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px;align-items:stretch;grid-auto-flow:row dense;}
.rp-w a{color:var(--a-deep);}
.rp-w.plain .rp-wh{display:none;} .rp.editing .rp-w.plain .rp-wh{display:flex;}
.aiv-filters select{font:500 12.5px var(--ui,Inter,sans-serif);border:1px solid var(--a-line);border-radius:9px;padding:7px 10px;background:var(--a-card);color:var(--a-ink);}
.rp-w{grid-column:span var(--c,6);background:var(--a-card);border:1px solid var(--a-line);border-radius:18px;padding:16px 18px;min-width:0;position:relative;
  display:flex;flex-direction:column;box-shadow:0 1px 2px rgba(20,28,36,.04);transition:box-shadow .2s,border-color .2s,transform .2s;animation:rpIn .35s ease both;}
.rp-w:hover{box-shadow:0 10px 28px -14px rgba(20,28,36,.22);}
.rp-w > [data-body]{flex:1;min-height:0;}
.rp-w.fixh > [data-body]{overflow:auto;}
@keyframes rpIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
@media (prefers-reduced-motion:reduce){.rp-w{animation:none;transition:none;}}
.rp-w::before{content:"";position:absolute;left:18px;right:18px;top:0;height:3px;border-radius:0 0 3px 3px;background:var(--tint,var(--a-brand));opacity:.85;}
.rp-w.plain::before,.rp-w.bare::before{display:none;}
.rp-wic{width:30px;height:30px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;flex:none;color:var(--tint,var(--a-brand));
  background:color-mix(in srgb,var(--tint,var(--a-brand)) 13%,transparent);}
.rp-wt{display:flex;gap:10px;align-items:flex-start;min-width:0;}
.rp-src{display:inline-flex;align-items:center;gap:5px;font:600 10.5px var(--ui,Inter,sans-serif);color:var(--a-ink3);background:var(--a-card2);border:1px solid var(--a-line2);
  border-radius:20px;padding:2px 8px 2px 4px;white-space:nowrap;margin-top:5px;}
.rp-logo{display:inline-block;border-radius:4px;flex:none;object-fit:contain;vertical-align:middle;}
.rp-logo-fb{display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-family:var(--ui,Inter,sans-serif);border-radius:50%;line-height:1;}
.rp-stack{display:inline-flex;align-items:center;}
.rp-stack .rp-logo{background:#fff;border-radius:50%;box-shadow:0 0 0 2px var(--a-card);margin-left:-4px;} .rp-stack .rp-logo:first-child{margin-left:0;}
.rp-nm{display:inline-flex;align-items:center;gap:7px;min-width:0;}
.rp-gl{display:block;flex:none;}
.rp-rz{position:absolute;display:none;z-index:3;}
.rp.editing .rp-rz{display:block;}
.rp-rz.e{top:14px;bottom:14px;right:-7px;width:12px;cursor:ew-resize;}
.rp-rz.s{left:14px;right:14px;bottom:-7px;height:12px;cursor:ns-resize;}
.rp-rz.se{right:-6px;bottom:-6px;width:20px;height:20px;cursor:nwse-resize;border-radius:6px;background:var(--a-card);border:1.5px solid var(--a-brand);
  box-shadow:0 2px 6px rgba(20,28,36,.15);display:none;align-items:center;justify-content:center;color:var(--a-brand);}
.rp.editing .rp-rz.se{display:flex;}
.rp-rz.e::after,.rp-rz.s::after{content:"";position:absolute;background:var(--a-brand);border-radius:3px;opacity:0;transition:opacity .15s;}
.rp-rz.e::after{top:30%;bottom:30%;left:4px;width:4px;} .rp-rz.s::after{left:30%;right:30%;top:4px;height:4px;}
.rp-rz:hover::after,.rp-w.resizing .rp-rz::after{opacity:1;}
.rp-w.resizing{box-shadow:0 0 0 2px var(--a-brand),0 18px 40px -18px rgba(20,28,36,.35);transition:none;}
.rp-rzbadge{position:absolute;right:10px;bottom:10px;background:var(--a-ink);color:#fff;font:600 11px var(--ui,Inter,sans-serif);padding:3px 8px;border-radius:7px;z-index:4;pointer-events:none;}
body.rp-resizing{user-select:none;cursor:nwse-resize;}
.rp-brand{display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap;}
.rp-brand img{max-height:var(--logoh,44px);max-width:220px;width:auto;object-fit:contain;display:block;}
.rp-brand .rp-x2{width:1px;height:28px;background:var(--a-line);}
.rp-banner{background:linear-gradient(120deg,color-mix(in srgb,var(--a-brand) 16%,var(--a-card)),var(--a-card) 62%);border:1px solid var(--a-line);border-radius:20px;padding:18px 20px;}
.rp-rank{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:24px;padding:0 7px;border-radius:8px;font:700 12px var(--ui,Inter,sans-serif);color:#fff;background:#8795a1;font-variant-numeric:tabular-nums;}
.rp-rank.t3{background:#0f7a58;} .rp-rank.t10{background:#1baf7a;} .rp-rank.t20{background:#2a78d6;} .rp-rank.t50{background:#eda100;} .rp-rank.t100{background:#eb6834;} .rp-rank.out{background:#c3ccd3;color:#3d4852;}
.rp-kwc{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px;}
.rp-kwc > div{border:1px solid var(--a-line);border-radius:14px;padding:12px 14px;background:var(--a-card);display:flex;flex-direction:column;gap:6px;min-width:0;}
.rp-kwc button{all:unset;cursor:pointer;}
.rp-kwc .k{font-weight:600;font-size:13px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
.rp-kwc .l{font-size:11px;color:var(--a-ink3);display:flex;align-items:center;gap:4px;}
.rp-kwc .r{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.rp-kwc .big{font-family:var(--display,Poppins,Inter,sans-serif);font-size:26px;font-weight:600;line-height:1;}
.rp-kwc svg.sp{width:100%;height:30px;display:block;}
.rp-kwc > a.rp-kwa{border:1px solid var(--a-line);border-radius:14px;padding:12px 14px;background:var(--a-card);display:flex;flex-direction:column;gap:6px;min-width:0;color:inherit;text-decoration:none;transition:border-color .15s,box-shadow .15s,transform .15s;}
.rp-kwc > a.rp-kwa:hover{border-color:var(--a-ink3);box-shadow:0 6px 18px -10px rgba(20,28,36,.35);transform:translateY(-1px);}
.rp-kwc .go{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:11px;font-weight:600;color:var(--a-ink3);margin-top:auto;}
.rp-kwc > a.rp-kwa:hover .go{color:var(--a-deep);}
.rp-aa .rp-kwc > a.rp-kwa{border-radius:6px;border:.8px solid #EBEDF0;}
.rp-dist{display:flex;height:12px;border-radius:7px;overflow:hidden;background:var(--a-line2);margin-top:12px;}
.rp-dist i{display:block;height:100%;}
.rp-kpi-h{display:flex;align-items:center;justify-content:space-between;gap:6px;} .rp-kpi-h .rp-kpi-l{flex:1;min-width:0;}
.rp-legend span.rp-logo,.rp-legend .rp-stack{flex:none;}
.rp-cat-i .rp-wic{width:34px;height:34px;}
.rp-panel{background:var(--a-card);border:1px solid var(--a-line);border-radius:16px;padding:16px 18px;margin-bottom:16px;display:grid;gap:12px;}
.rp-panel h4{margin:0;font-family:var(--display,Poppins,Inter,sans-serif);font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;}
.rp-panel .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
.rp-panel .lbl{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--a-ink3);width:100%;}
.rp-chipx{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--a-line);border-radius:20px;padding:5px 11px;font:600 12px var(--ui,Inter,sans-serif);cursor:pointer;background:var(--a-card);color:var(--a-ink2);user-select:none;}
.rp-chipx input{margin:0;accent-color:var(--a-brand);}
.rp-chipx.on{border-color:var(--a-brand);color:var(--a-deep);background:var(--a-wash);}
.rp-panel select,.rp-panel input[type=text],.rp-panel input[type=url]{font:500 12.5px var(--ui,Inter,sans-serif);border:1px solid var(--a-line);border-radius:9px;padding:7px 10px;background:var(--a-card);color:var(--a-ink);}
.rp-sw{width:26px;height:26px;border-radius:50%;border:2px solid var(--a-card);box-shadow:0 0 0 1px var(--a-line);cursor:pointer;padding:0;}
.rp-sw.on{box-shadow:0 0 0 2px var(--a-ink);}
.rp-lock{display:inline-flex;align-items:center;gap:6px;font:600 12px var(--ui,Inter,sans-serif);color:var(--a-ink2);background:var(--a-line2);border-radius:9px;padding:6px 10px;}
.rp-w.bare{background:none;border:0;padding:0;}
.rp-wh{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px;min-height:20px;flex-wrap:wrap;}
.rp-wh h3{font-family:var(--display,Poppins,Inter,sans-serif);font-size:14.5px;font-weight:600;margin:0;letter-spacing:-.01em;}
.rp-wh p{margin:2px 0 0;color:var(--a-ink3);font-size:11.5px;}
.rp-acts{display:flex;gap:4px;align-items:center;flex-wrap:wrap;justify-content:flex-end;margin-left:auto;opacity:0;transition:opacity .15s;max-width:100%;}
.rp-w:hover .rp-acts,.rp-w:focus-within .rp-acts,.rp.editing .rp-acts{opacity:1;}
.rp-ib{border:1px solid var(--a-line);background:var(--a-card);color:var(--a-ink2);border-radius:8px;font:600 11px var(--ui,Inter,sans-serif);
  padding:3px 7px;cursor:pointer;white-space:nowrap;line-height:1.4;}
.rp-ib:hover{border-color:var(--a-ink3);color:var(--a-ink);}
.rp-ib.on{background:var(--a-goodw);border-color:transparent;color:var(--a-good);}
.rp-ib.go{background:var(--a-brand);border-color:var(--a-brand);color:#fff;}
.rp-ib select{border:0;background:none;font:inherit;color:inherit;padding:0;cursor:pointer;}
.rp-drag{cursor:grab;color:var(--a-ink3);font-size:15px;padding:0 4px;display:none;user-select:none;}
.rp.editing .rp-drag{display:inline;}
.rp.editing .rp-w{outline:1px dashed var(--a-line);outline-offset:3px;}
.rp-w.dragging{opacity:.4;}
.rp-w.dropbefore{box-shadow:-4px 0 0 0 var(--a-brand);}
.rp-edit-only{display:none !important;}
.rp.editing .rp-edit-only{display:inline-flex !important;}
.rp-empty{grid-column:span 12;border:1.5px dashed var(--a-line);border-radius:16px;padding:44px 20px;text-align:center;color:var(--a-ink2);background:var(--a-card);}
.rp-empty h3{font-family:var(--display,Poppins,Inter,sans-serif);color:var(--a-ink);margin:0 0 6px;font-size:16px;}
.rp-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;}
.rp-kpi{border:1px solid var(--a-line);border-radius:14px;position:relative;padding:12px 14px 8px;background:var(--a-card);text-align:left;font:inherit;color:inherit;min-width:0;}
button.rp-kpi{cursor:pointer;} button.rp-kpi:hover{border-color:var(--a-ink3);box-shadow:0 4px 14px -6px rgba(20,28,36,.18);}
.rp-kpi-l{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--a-ink3);font-weight:700;}
.rp-kpi-v{font-family:var(--display,Poppins,Inter,sans-serif);font-size:24px;font-weight:600;margin:4px 0 2px;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;}
.rp-kpi-n{font-size:11.5px;color:var(--a-ink2);min-height:15px;}
.rp-kpi svg{display:block;width:100%;height:26px;margin-top:4px;}
.rp-kpi svg.rp-gl{width:18px;height:18px;margin:0;}
.rp-big{font-family:var(--display,Poppins,Inter,sans-serif);font-size:32px;font-weight:600;line-height:1.1;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;}
.rp-legend{display:flex;flex-direction:column;gap:6px;font-size:12.5px;min-width:0;flex:1;}
.rp-legend button,.rp-legend div{display:flex;align-items:center;gap:8px;border:0;background:none;font:inherit;color:inherit;padding:2px 0;text-align:left;cursor:pointer;min-width:0;}
.rp-legend i{width:10px;height:10px;border-radius:3px;flex:none;}
.rp-legend span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.rp-legend b{font-variant-numeric:tabular-nums;}
.rp-legend em{font-style:normal;color:var(--a-ink3);width:44px;text-align:right;font-size:11.5px;}
.rp-donutrow{display:flex;gap:18px;align-items:center;flex-wrap:wrap;}
.rp-donutrow .aiv-donut{width:140px;height:140px;flex:none;}
.rp-text{font-size:13px;line-height:1.6;color:var(--a-ink2);white-space:pre-wrap;}
.rp-text h2{font-family:var(--display,Poppins,Inter,sans-serif);font-size:19px;color:var(--a-ink);margin:0 0 4px;font-weight:600;}
.rp-frame{width:100%;border:0;border-radius:10px;background:var(--a-card2);display:block;}
.rp-form{display:grid;gap:8px;margin-top:8px;}
.rp-form label{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--a-ink3);}
.rp-form input,.rp-form textarea,.rp-form select{font:500 13px var(--ui,Inter,sans-serif);border:1px solid var(--a-line);border-radius:9px;padding:8px 10px;background:var(--a-card);color:var(--a-ink);width:100%;box-sizing:border-box;}
.rp-form textarea{min-height:90px;resize:vertical;}
.rp-load{color:var(--a-ink3);font-size:12.5px;padding:16px 0;text-align:center;}
.rp-err{color:var(--a-ink3);font-size:12px;padding:14px 4px;text-align:center;line-height:1.5;}
.rp-cat-back{position:fixed;inset:0;background:rgba(20,26,33,.45);z-index:9998;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto;}
.rp-cat{background:var(--a-card2,#f7f9fa);border-radius:18px;width:min(880px,100%);padding:20px 22px 24px;box-shadow:0 30px 60px -20px rgba(0,0,0,.4);}
.rp-cat h2{font-family:var(--display,Poppins,Inter,sans-serif);margin:0 0 4px;font-size:18px;font-weight:600;}
.rp-cat-g{margin-top:16px;}
.rp-cat-g > b{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--a-ink3);margin-bottom:8px;}
.rp-cat-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px;}
.rp-cat-i{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;border:1px solid var(--a-line);border-radius:12px;padding:10px 12px;background:var(--a-card);}
.rp-cat-i div{min-width:0;} .rp-cat-i strong{display:block;font-size:13px;} .rp-cat-i small{color:var(--a-ink3);font-size:11.5px;line-height:1.4;display:block;margin-top:2px;}
.rp-pill{display:inline-block;font-size:10.5px;font-weight:700;border-radius:20px;padding:2px 8px;background:var(--a-line2);color:var(--a-ink2);}
.rp-heat{display:grid;gap:3px;margin-top:8px;}
.rp-heat i{display:block;aspect-ratio:1;border-radius:4px;font:700 9px/1 var(--ui,Inter,sans-serif);color:#fff;display:flex;align-items:center;justify-content:center;font-style:normal;}
.rp-gbp{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px;}
.rp-gbp > div{border:1px solid var(--a-line);border-radius:12px;padding:10px 12px;}
.rp-chk{color:var(--a-good);font-weight:700;} .rp-x{color:var(--a-ink3);}
.rp-share{background:var(--a-card);border:1px solid var(--a-line);border-radius:14px;padding:14px 16px;margin-bottom:16px;display:grid;gap:8px;}
.rp-share input,.rp-share textarea{font:500 12.5px var(--mono,monospace);border:1px solid var(--a-line);border-radius:8px;padding:7px 9px;width:100%;box-sizing:border-box;background:var(--a-card2);}
@media (max-width:1100px){.rp-w.nar{grid-column:span 6;}}
@media (max-width:760px){.rp-w{grid-column:span 12 !important;height:auto !important;} .rp-rz{display:none !important;}}

/* ---------- free layout: every widget has a column, a top, a width and a height ---------- */
.rp-grid.free{display:block;position:relative;min-height:120px;}
.rp-grid.free > .rp-w{position:absolute;margin:0;box-sizing:border-box;
  left:calc((100% - 176px) / 12 * var(--x,0) + 16px * var(--x,0));width:calc((100% - 176px) / 12 * var(--c,6) + 16px * (var(--c,6) - 1));
  top:calc(var(--y,0) * 1px);height:calc(var(--h,320) * 1px);transition:left .18s ease,top .18s ease,width .18s ease,height .18s ease;}
.rp-grid.free > .rp-w > [data-body]{overflow:auto;}
.rp-grid.free > .rp-empty{position:static;}
.rp-ph{position:absolute;border:2px dashed var(--a-brand);background:color-mix(in srgb,var(--a-brand) 7%,transparent);border-radius:18px;pointer-events:none;box-sizing:border-box;
  left:calc((100% - 176px) / 12 * var(--x,0) + 16px * var(--x,0));width:calc((100% - 176px) / 12 * var(--c,6) + 16px * (var(--c,6) - 1));
  top:calc(var(--y,0) * 1px);height:calc(var(--h,320) * 1px);transition:left .12s,top .12s,width .12s,height .12s;}
.rp-grid.free > .rp-w.moving{transition:none !important;z-index:20;box-shadow:0 24px 50px -20px rgba(20,28,36,.45);opacity:.94;cursor:grabbing;}
.rp-grid.free > .rp-w.resizing{transition:none !important;z-index:20;}
.rp.editing .rp-grid.free .rp-wh{cursor:grab;}
.rp.editing .rp-grid.free .rp-wh button,.rp.editing .rp-grid.free .rp-wh select{cursor:pointer;}
.rp-w.placing{outline:2px solid var(--a-brand) !important;}
body.rp-moving,body.rp-moving *{cursor:grabbing !important;user-select:none !important;}
.rp-hint{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#1b222a;color:#fff;font:600 12.5px var(--ui,Inter,sans-serif);padding:9px 14px;border-radius:10px;z-index:10050;box-shadow:0 10px 30px -10px rgba(0,0,0,.5);pointer-events:none;}
@media (max-width:760px){
  .rp-grid.free{display:flex;flex-direction:column;gap:16px;height:auto !important;}
  .rp-grid.free > .rp-w{position:relative;left:auto;top:auto;width:auto;height:auto;min-height:calc(min(var(--h,320),460) * 1px);}
  .rp-ph{display:none;}
}
/* Fill-to-height charts */
.rp-w > [data-body].rp-fillbody{display:flex;flex-direction:column;}
.rp-chwrap{display:flex;flex-direction:column;min-height:0;}
.rp-chwrap.fill{flex:1;}
.rp-chwrap.fill > .aiv-chart{flex:1;min-height:90px;}
.rp-chwrap > .aiv-chips button.aiv-chip{font:600 11.5px var(--ui,Inter,sans-serif);}
.rp-chwrap > .aiv-chips button.aiv-chip.off i{background:transparent !important;box-shadow:inset 0 0 0 1.5px var(--a-ink3);}
.rp-chwrap > .aiv-chips button.aiv-chip.off{text-decoration:line-through;}

/* Content follows the widget's size: --s for numbers and graphics, --t for text (set from the widget's width and height). */
.rp-w.scaled .rp-big{font-size:calc(32px * var(--s,1));}
.rp-w.scaled .rp-kpis{grid-template-columns:repeat(auto-fit,minmax(calc(150px * var(--s,1)),1fr));gap:calc(12px * var(--t,1));}
.rp-w.scaled .rp-kpi-v{font-size:calc(24px * var(--s,1));}
.rp-w.scaled .rp-kpi-l{font-size:calc(10.5px * var(--t,1));}
.rp-w.scaled .rp-kpi-n{font-size:calc(11.5px * var(--t,1));}
.rp-w.scaled .rp-kpi svg{height:calc(26px * var(--s,1));}
.rp-w.scaled .rp-donutrow .aiv-donut{width:calc(140px * var(--s,1));height:calc(140px * var(--s,1));}
.rp-w.scaled .rp-legend{font-size:calc(12.5px * var(--t,1));}
.rp-w.scaled .rp-legend i{width:calc(10px * var(--t,1));height:calc(10px * var(--t,1));}
.rp-w.scaled .aiv-table{font-size:calc(12.5px * var(--t,1));}
.rp-w.scaled .aiv-table th{font-size:calc(10.5px * var(--t,1));}
.rp-w.scaled .aiv-chips .aiv-chip{font-size:calc(11.5px * var(--t,1));}
.rp-w.scaled .rp-kwc{grid-template-columns:repeat(auto-fill,minmax(calc(210px * var(--s,1)),1fr));}
.rp-w.scaled .rp-kwc .big{font-size:calc(26px * var(--s,1));}
.rp-w.scaled .rp-kwc .k{font-size:calc(13px * var(--t,1));}
.rp-w.scaled .rp-text{font-size:calc(13px * var(--t,1));}
.rp-w.scaled .rp-text h2{font-size:calc(19px * var(--s,1));}
.rp-w.scaled .aiv-cap{font-size:calc(12px * var(--t,1));}
.rp-w.scaled .rp-heat i{font-size:calc(9px * var(--t,1));}

/* Section header widget */
.rp-sec{display:flex;flex-direction:column;justify-content:center;height:100%;min-height:44px;gap:4px;}
.rp-sec-t{font-family:var(--display,Poppins,Inter,sans-serif);font-weight:600;font-size:calc(22px * var(--s,1));letter-spacing:-.01em;color:var(--a-ink);line-height:1.2;}
.rp-sec-d{font-size:calc(13px * var(--t,1));color:var(--a-ink2);line-height:1.45;}
/* Team report: a section reads as a heading on the page (orange rule, no card), not as another widget. */
.rp:not(.rp-aa) .rp-w.sec{background:none;border:0;box-shadow:none;padding:6px 4px 6px 16px;animation:none;}
.rp:not(.rp-aa) .rp-w.sec::before{display:block;left:0;right:auto;top:8px;bottom:8px;width:4px;height:auto;border-radius:4px;background:var(--a-brand);opacity:1;}
.rp:not(.rp-aa) .rp-w.sec:hover{box-shadow:none;}
.rp:not(.rp-aa) .rp-w.sec .rp-sec-t{font-size:calc(21px * var(--s,1));}
.rp.editing:not(.rp-aa) .rp-w.sec{outline-offset:0;}
.rp:not(.rp-aa) .rp-w.sec .rp-wh{position:absolute;right:4px;top:4px;margin:0;}

/* ---------- full screen ---------- */
.rp-fsroot{position:fixed !important;inset:0;z-index:9000;overflow:auto;background:var(--paper,#f3f6f8);padding:18px 22px 40px;box-sizing:border-box;display:block !important;}
.rp-fsroot .rp{max-width:none;}
body.rp-fs-on{overflow:hidden;}
.rp-fsbtn{display:inline-flex;align-items:center;gap:6px;}

/* ---------- client report: AgencyAnalytics look ----------
   Sampled from EDGE's AgencyAnalytics dashboards: Geist, a #FDFDFD page, white
   widgets with a 0.8px #EBEDF0 hairline and 6px corners, no shadows, 14px
   #555 titles, bold #555 numerals, a black first line and AA's donut colours. */
.rp.rp-aa{--a-brand:#171614;--a-deep:#171614;--a-wash:#F4F4F5;--a-line:#EBEDF0;--a-line2:#F2F3F5;--a-ink:#222A30;--a-ink2:#55606A;--a-ink3:#8A949C;--a-card:#fff;--a-card2:#FAFAFA;
  font-family:'Geist','Helvetica Neue',Helvetica,Arial,sans-serif;color:#555;-webkit-font-smoothing:antialiased;}
.rp-aa .rp-head{background:#fff;border:.8px solid #EBEDF0;border-radius:6px;padding:14px 18px;margin-bottom:16px;align-items:center;}
.rp-aa .rp-head.rp-banner{background:#fff;}
.rp-aa .rp-title{font-family:inherit;font-size:20px;font-weight:600;color:#222A30;}
.rp-aa .rp-sub{color:#8A949C;font-size:12.5px;}
.rp-aa .aiv-btn{font-family:inherit;font-weight:500;border-radius:5px;border-color:#E4E4E7;color:#3F3F46;}
.rp-aa .aiv-btn:hover{border-color:#171614;color:#171614;}
.rp-aa .aiv-btn.go{background:#171614;border-color:#171614;color:#fff;}
.rp-aa .aiv-btn.go:hover{background:#000;color:#fff;}
.rp-aa .rp-w{background:#fff;border:.8px solid #EBEDF0;border-radius:6px;box-shadow:none;padding:14px 16px 16px;animation:none;}
.rp-aa .rp-w:hover{box-shadow:none;}
.rp-aa .rp-w::before{display:none;}
.rp-aa .rp-wic{display:none;}
.rp-aa .rp-src{display:none;}
.rp-aa .rp-aalogo{display:inline-flex;align-items:center;margin-right:2px;}
.rp-aa .rp-wh{margin-bottom:12px;align-items:center;}
.rp-aa .rp-wh h3{font-family:inherit;font-size:calc(14px * var(--t,1));font-weight:400;color:#555;letter-spacing:.01em;display:flex;align-items:center;gap:8px;}
.rp-aa .rp-wh p{display:none;}
.rp-aa .rp-wtot{margin-left:auto;font-weight:700;color:#555;font-size:calc(14px * var(--t,1));}
.rp-aa .rp-big{font-family:inherit;font-weight:700;color:#555;font-size:calc(34px * var(--s,1));letter-spacing:-.01em;}
.rp-aa .aiv-delta{background:none !important;padding:0;font-weight:600;font-size:calc(12.5px * var(--t,1)) !important;}
.rp-aa .aiv-delta.up{color:#2E8540;} .rp-aa .aiv-delta.down{color:#C0392B;} .rp-aa .aiv-delta.flat{color:#8A949C;}
.rp-aa .rp-kpis{gap:12px;}
.rp-aa .rp-kpi{border:.8px solid #EBEDF0;border-radius:6px;padding:12px 14px 14px;text-align:center;display:flex;flex-direction:column;align-items:center;background:#fff;}
.rp-aa .rp-kpi-h{align-self:stretch;}
.rp-aa .rp-kpi-l{font-size:calc(14px * var(--t,1));font-weight:400;letter-spacing:.01em;text-transform:none;color:#555;text-align:left;}
.rp-aa .rp-kpi-v{font-family:inherit;font-weight:700;color:#555;font-size:calc(40px * var(--s,1));line-height:1;margin:calc(16px * var(--s,1)) 0 8px;justify-content:center;flex-direction:column;align-items:center;gap:6px;}
.rp-aa .rp-kpi-n{color:#8A949C;font-size:calc(12px * var(--t,1));}
.rp-aa .rp-kpi svg:not(.rp-gl){width:100%;}
.rp-aa .rp-legend{color:#55606A;}
.rp-aa .rp-legend i{border-radius:50%;}
.rp-aa .rp-legend b{color:#222A30;font-weight:600;}
.rp-aa .aiv-donut text:first-of-type{font-family:inherit !important;font-weight:700 !important;fill:#555 !important;}
.rp-aa .aiv-table{font-size:calc(13px * var(--t,1));}
.rp-aa .aiv-table th{text-transform:none;letter-spacing:0;font-weight:500;font-size:calc(12px * var(--t,1));color:#8A949C;border-bottom:.8px solid #EBEDF0;padding:0 10px 8px 0;}
.rp-aa .aiv-table td{border-bottom:.8px solid #F2F3F5;color:#222A30;padding:9px 10px 9px 0;}
.rp-aa .aiv-table td.num{font-weight:600;color:#555;}
.rp-aa .aiv-table tbody tr:hover td{background:#FAFAFA;}
.rp-aa .aiv-bar{height:10px;background:#E4E4E7;border-radius:999px;}
.rp-aa .aiv-bar i{background:#171614 !important;border-radius:999px;min-width:4px;}
.rp-aa .aiv-chart .gr{stroke:#F4F4F5;}
.rp-aa .aiv-chart .ax{fill:#666;}
.rp-aa .aiv-tip{background:#fff;color:#222A30;border:.8px solid #EBEDF0;box-shadow:0 6px 20px -8px rgba(0,0,0,.25);}
.rp-aa .aiv-tip b{color:#8A949C;}
.rp-aa .rp-kwc > div{border-radius:6px;border:.8px solid #EBEDF0;}
.rp-aa .rp-kwc .big{font-family:inherit;font-weight:700;color:#555;}
.rp-aa .rp-text{color:#55606A;}
.rp-aa .rp-text h2{font-family:inherit;color:#222A30;}
.rp-aa .rp-w.sec{background:#171614;border-color:#171614;padding:10px 16px;}
.rp-aa .rp-w.sec .rp-sec-t{color:#fff;font-family:inherit;font-weight:500;font-size:calc(28px * var(--s,1));}
.rp-aa .rp-w.sec .rp-sec-d{color:#C9CDD2;font-size:calc(13px * var(--t,1));}
.rp-aa .rp-w.sec .rp-wh{position:absolute;right:8px;top:8px;margin:0;}
.rp-aa .rp-w.sec .rp-drag{color:#fff;}
.rp-aa .aiv-pill{border-radius:4px;}
.rp-aa .rp-rank{border-radius:4px;}
.rp-aa .aiv-note{border-left-color:#171614;border-radius:6px;}
.rp-aa .rp-empty{border-radius:6px;}
.rp-aa .rp-ph{border-radius:6px;border-color:#171614;background:rgba(23,22,20,.04);}
.rp-aa .rp-chwrap .aia-toggles{margin:0 0 10px;}
.rp-aa .rp-ib{border-radius:5px;}
.rp-ib[data-wshare]{display:inline-flex;align-items:center;gap:4px;white-space:nowrap;}
.rp-bare .rp-grid{margin-top:0;}
.rp-fsroot .rp.rp-aa{min-height:100%;}
.rp-fsroot.rp-aaroot{background:#FDFDFD;}
/* AA period picker: calendar, label, caret; opens a list */
.rp-pp{position:relative;}
/* Client report header: white, roomy, logos well apart, tools on their own row. */
.rp-aa .rp-head.rp-aahead{display:block;background:#fff;border:.8px solid #EBEDF0;border-radius:10px;padding:28px 32px 0;margin-bottom:20px;}
.rp-aa .rp-aahead .rp-hrow{display:flex;justify-content:space-between;align-items:flex-end;gap:24px 32px;flex-wrap:wrap;padding-bottom:26px;}
.rp-aa .rp-aahead .rp-hl{min-width:0;flex:1 1 360px;}
.rp-aa .rp-aahead .rp-brand{gap:26px;margin-bottom:22px;}
.rp-aa .rp-aahead .rp-brand img{max-height:min(var(--logoh,40px),56px);max-width:200px;}
.rp-aa .rp-aahead .rp-brand .rp-x2{height:36px;width:1px;background:#E4E4E7;}
.rp-aa .rp-aahead .rp-title{font-size:26px;font-weight:600;letter-spacing:-.02em;line-height:1.2;color:#18181B;}
.rp-aa .rp-aahead .rp-sub{margin-top:8px;font-size:13px;color:#71717A;}
.rp-aa .rp-aahead .rp-hr{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.rp-aa .rp-aahead .rp-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;border-top:.8px solid #EBEDF0;margin:0 -32px;padding:12px 32px;background:#FAFAFA;border-radius:0 0 10px 10px;}
.rp-aa .rp-aahead .rp-tools .aiv-btn{font-size:12.5px;padding:6px 11px;background:#fff;}
.rp-aa .rp-aahead .rp-tools .aiv-btn.go{background:#171614;color:#fff;}
.rp-aa .rp-aahead .rp-tsp{flex:1;}
.rp-aa .rp-pdfbtn{padding:8px 14px;}
@media (max-width:760px){.rp-aa .rp-head.rp-aahead{padding:20px 18px 0;} .rp-aa .rp-aahead .rp-tools{margin:0 -18px;padding:10px 18px;} .rp-aa .rp-aahead .rp-title{font-size:21px;} .rp-aa .rp-aahead .rp-tsp{display:none;}}
/* While the PDF is drawn */
.rp-printing .rp-w{animation:none !important;transition:none !important;}
.rp-pdfnote{border:1px dashed #D4D4D8;border-radius:6px;padding:18px;text-align:center;color:#71717A;font-size:13px;margin-top:8px;}
/* Page performance */
.rp-pg-bar{display:flex;gap:10px 14px;align-items:center;flex-wrap:wrap;margin-bottom:10px;}
.rp-pg-search{flex:1 1 300px;display:flex;align-items:center;gap:8px;border:1px solid var(--line,#e4e9ed);border-radius:8px;padding:0 10px;background:#fff;color:var(--ink-3,#8b98a3);min-height:36px;}
.rp-pg-search:focus-within{border-color:var(--brand,#e87722);box-shadow:0 0 0 3px rgba(232,119,34,.15);}
.rp-pg-search input{flex:1;border:0;outline:0;background:transparent;font:inherit;font-size:13.5px;color:var(--ink,#1b222a);min-width:0;padding:8px 0;}
.rp-pg-filt{display:flex;gap:6px;flex-wrap:wrap;}
.rp-pg-sug{border:1px solid var(--line,#e4e9ed);border-radius:8px;background:#fff;box-shadow:0 8px 24px rgba(27,34,42,.10);max-height:290px;overflow-y:auto;margin:-4px 0 12px;}
.rp-pg-sug button{display:flex;width:100%;justify-content:space-between;gap:12px;align-items:center;text-align:left;border:0;background:none;padding:8px 12px;cursor:pointer;font:inherit;border-bottom:1px solid var(--line-2,#eef2f5);}
.rp-pg-sug button:last-child{border-bottom:0;}
.rp-pg-sug button:hover,.rp-pg-sug button.on{background:var(--brand-wash,#fdf1e6);}
.rp-pg-sl{min-width:0;display:flex;flex-direction:column;}
.rp-pg-sm{flex:none;font-size:12px;color:var(--ink-3,#8b98a3);white-space:nowrap;display:flex;gap:8px;align-items:center;}
.rp-pg-sm em{font-style:normal;font-size:10.5px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:#0f7a58;background:#e6f5ef;border-radius:4px;padding:1px 6px;}
.rp-pg-none{padding:12px;color:var(--ink-3,#8b98a3);font-size:13px;}
.rp-pg-path{font-family:var(--mono,monospace);font-size:12.5px;color:var(--ink,#1b222a);word-break:break-all;}
.rp-pg-title{display:block;font-size:11.5px;color:var(--ink-3,#8b98a3);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:520px;}
.rp-pg-detail{border:1px solid var(--line,#e4e9ed);border-radius:10px;padding:14px 16px;margin-bottom:14px;background:var(--card-2,#f7f9fa);}
.rp-pg-dh{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;}
.rp-pg-dt{flex:1;min-width:0;}
.rp-pg-dp{font-family:var(--mono,monospace);font-size:14px;font-weight:600;color:var(--ink,#1b222a);text-decoration:none;word-break:break-all;}
.rp-pg-dp:hover{color:var(--brand,#e87722);}
.rp-pg-badge{flex:none;font-size:11px;font-weight:600;border-radius:999px;padding:3px 9px;background:#e6f5ef;color:#0f7a58;margin-top:2px;}
.rp-pg-badge.warn{background:#fdf1e6;color:#b8570f;}
.rp-pg-detail .rp-kpis{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));}
.rp-pg-ch{margin-top:12px;min-height:60px;}
.rp-pg .aiv-table tbody tr{cursor:pointer;}
button.rp-kpi.on{border-color:var(--brand,#e87722);box-shadow:0 0 0 3px rgba(232,119,34,.14);}
.rp-kpi-n u{text-decoration:none;color:var(--brand-deep,#b8570f);font-weight:500;}
.aiv-btn.on{outline:2px solid var(--brand,#e87722);outline-offset:1px;}
.rp-pg-extra:empty{display:none;}
.rp-pg-panel{border:1px solid var(--line,#e4e9ed);border-radius:10px;background:#fff;padding:12px 14px;margin-top:12px;}
.rp-pg-ph{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px;}
.rp-pg-ph b{font-size:13.5px;color:var(--ink,#1b222a);}
.rp-pg-ph span{font-size:12px;color:var(--ink-3,#8b98a3);}
.rp-pg-seg{display:flex;gap:6px;}
.rp-pg-key{color:#b7791f;}
.rp-pg-more{margin-top:10px;font-size:12.5px;color:var(--ink-2,#57646f);}
.rp-pg-more summary{cursor:pointer;margin-bottom:6px;}
.rp-pg-from{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;color:var(--ink-3,#8b98a3);margin-bottom:8px;}
.rp-pg-from:empty{display:none;}
.rp-pg-from em{font-style:normal;background:var(--card-2,#f7f9fa);border:1px solid var(--line,#e4e9ed);border-radius:999px;padding:2px 9px;color:var(--ink-2,#57646f);}
.rp-pg-from em b{color:var(--ink,#1b222a);font-weight:600;margin-left:3px;}
/* Pathways */
.rp-pw-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px;}
.rp-pw-chs{display:flex;gap:6px;flex-wrap:wrap;}
.rp-pw-chs b{font-weight:600;margin-left:4px;opacity:.75;}
.rp-pw-kpis{display:flex;flex-wrap:wrap;gap:10px 0;align-items:center;border-top:1px solid var(--line-2,#eef2f5);border-bottom:1px solid var(--line-2,#eef2f5);padding:12px 0;margin-bottom:12px;}
.rp-pw-kpis>div{padding:0 22px;border-left:1px solid var(--line,#e4e9ed);display:flex;flex-direction:column;}
.rp-pw-kpis>div:first-child{padding-left:0;border-left:0;}
.rp-pw-kpis b{font-size:22px;font-weight:600;color:var(--ink,#1b222a);letter-spacing:-.01em;line-height:1.2;}
.rp-pw-kpis b.key{color:#b7791f;}
.rp-pw-kpis span{font-size:12px;color:var(--ink-3,#8b98a3);}
.rp-pw-kpis .aiv-btn{margin-left:auto;color:#855711;border-color:#f1dca4;background:#fff8e6;}
.rp-pw-split{display:flex;border:1px solid var(--line,#e4e9ed);border-radius:10px;overflow:hidden;background:#fff;}
.rp-pw-pick{flex:0 0 250px;width:250px;padding:12px 14px;border-right:1px solid var(--line,#e4e9ed);max-height:560px;overflow-y:auto;}
.rp-pw-ph{font-size:13px;font-weight:600;color:var(--ink,#1b222a);margin-bottom:8px;}
.rp-pw-pick input[type=search]{width:100%;box-sizing:border-box;height:32px;border:1px solid var(--line,#e4e9ed);border-radius:8px;padding:0 10px;font:inherit;font-size:13px;}
.rp-pw-acts{display:flex;gap:5px;margin:8px 0;}
.rp-pw-pk{display:flex;align-items:center;gap:7px;padding:5px 6px;margin:0 -6px;border-radius:6px;cursor:pointer;font-size:12.5px;color:var(--ink-2,#57646f);}
.rp-pw-pk:hover{background:var(--card-2,#f7f9fa);}
.rp-pw-pk.on{color:var(--ink,#1b222a);font-weight:500;}
.rp-pw-pk input{margin:0;accent-color:#14213d;flex:none;}
.rp-pw-pk>i{width:8px;height:8px;border-radius:50%;flex:none;}
.rp-pw-pk .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.rp-pw-pk .k{font-size:11px;font-weight:600;color:#b7791f;flex:none;}
.rp-pw-pk .bar{width:30px;height:4px;border-radius:2px;background:var(--line-2,#eef2f5);overflow:hidden;flex:none;}
.rp-pw-pk .bar i{display:block;height:4px;}
.rp-pw-pk .c{font-size:11.5px;color:var(--ink-3,#8b98a3);min-width:30px;text-align:right;flex:none;font-variant-numeric:tabular-nums;}
.rp-pw-main{flex:1;min-width:0;display:flex;flex-direction:column;}
.rp-pw-heads{height:32px;border-bottom:1px solid var(--line,#e4e9ed);overflow:hidden;position:relative;padding:0 16px;}
.rp-pw-heads span{position:absolute;bottom:8px;font-size:12px;font-weight:500;color:var(--ink-3,#8b98a3);white-space:nowrap;}
.rp-pw-heads em{font-style:normal;font-size:11px;opacity:.8;}
.rp-cat{width:min(1040px,100%);}
.rp-cat-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;}
.rp-cat-top .aiv-x{border:0;background:none;font-size:22px;cursor:pointer;}
.rp-cat-ctl{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:12px;}
.rp-cat-ctl input{flex:1;min-width:220px;padding:9px 12px;border:1px solid var(--a-line);border-radius:10px;font:inherit;background:var(--a-card);}
.rp-cat-lv{display:inline-flex;border:1px solid var(--a-line);border-radius:999px;overflow:hidden;background:var(--a-card);}
.rp-cat-lv button{border:0;background:none;padding:7px 12px;font:500 12.5px var(--ui,Inter,sans-serif);cursor:pointer;color:var(--a-ink2);}
.rp-cat-lv button.on{background:#171614;color:#fff;}
.rp-cat-tabs{display:flex;gap:4px;overflow-x:auto;margin:14px 0 4px;border-bottom:1px solid var(--a-line);scrollbar-width:thin;}
.rp-cat-tabs button{border:0;background:none;padding:9px 12px 10px;font:600 13px var(--ui,Inter,sans-serif);color:var(--a-ink3);cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;margin-bottom:-1px;}
.rp-cat-tabs button.on{color:var(--a-ink);border-bottom-color:var(--a-brand,#e87722);}
.rp-cat-tabs em{font-style:normal;font-weight:500;font-size:11px;background:var(--a-line,#eef2f5);border-radius:999px;padding:1px 7px;margin-left:4px;color:var(--a-ink2);}
.rp-cat .rp-cat-list{margin-top:12px;}
.rp-cat .rp-cat-i{flex-direction:column;align-items:stretch;justify-content:flex-start;gap:8px;position:relative;padding:12px 12px 10px;}
.rp-cat-h{display:flex;gap:10px;align-items:flex-start;min-width:0;}
.rp-cat-h strong{display:inline;margin-right:6px;}
.rp-cat-f{display:flex;align-items:center;gap:8px;margin-top:auto;}
.rp-cat-f > *{flex:none;} .rp-cat-f .rp-tsp{flex:1;}
.rp-lv{font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:999px;letter-spacing:.02em;}
.rp-lv.simple{background:#e6f5ee;color:#0f7a58;} .rp-lv.tech{background:#ece9fb;color:#5140b8;}
.rp-star{border:0;background:none;font-size:19px;line-height:1;cursor:pointer;color:#b9c1cb;padding:2px 2px 0;}
.rp-star:hover{color:#eda100;} .rp-star.on{color:#eda100;}
.rp-cat-empty{padding:40px 10px;text-align:center;color:var(--a-ink3);font-size:13.5px;line-height:1.7;}
.rp-in{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
.rp-in li{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;line-height:1.5;}
.rp-in li > i{flex:none;width:9px;height:9px;border-radius:50%;margin-top:6px;background:#9aa5b1;}
.rp-in li.rp-in-up > i{background:#0f7a58;} .rp-in li.rp-in-down > i{background:#e34948;}
.rp-wk{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;align-items:end;}
.rp-wk-c{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px;color:var(--a-ink3);}
.rp-wk-c b{font-size:11.5px;color:var(--a-ink2);} .rp-wk-c em{font-style:normal;}
.rp-wk-b{height:110px;width:100%;max-width:34px;background:var(--a-line,#eef2f5);border-radius:6px;display:flex;align-items:flex-end;overflow:hidden;}
.rp-wk-b i{display:block;width:100%;border-radius:6px 6px 0 0;opacity:.75;} .rp-wk-c.best .rp-wk-b i{opacity:1;} .rp-wk-c.best em{color:var(--a-ink);font-weight:700;}
.rp-goal{display:flex;gap:16px;align-items:center;} .rp-goal svg{flex:none;color:var(--a-ink,#1b222a);}
.rp-goal-m{font:600 15px var(--ui,Inter,sans-serif);}
.rp-grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px;}
.rp-grade > div{display:flex;gap:10px;align-items:center;border:1px solid var(--a-line);border-radius:12px;padding:10px;}
.rp-grade-l{flex:none;width:40px;height:40px;border-radius:10px;color:#fff;font:700 20px var(--ui,Inter,sans-serif);display:flex;align-items:center;justify-content:center;}
.rp-grade b{display:block;font-size:13px;} .rp-grade small{color:var(--a-ink3);font-size:11.5px;}
.rp-leads{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;}
.rp-lead{display:flex;gap:10px;text-align:left;border:1px solid var(--a-line);border-radius:12px;padding:11px 12px;background:var(--a-card,#fff);font:inherit;color:inherit;}
button.rp-lead{cursor:pointer;} button.rp-lead:hover{border-color:#b8c2cc;}
.rp-lead > i{flex:none;width:4px;border-radius:4px;}
.rp-lead b{display:block;font-size:13.5px;} .rp-lead small{display:block;color:var(--a-ink3);font-size:11.5px;margin:2px 0 6px;}
.rp-lead p{margin:0 0 6px;font-size:12.5px;color:var(--a-ink2);line-height:1.45;}
.rp-heat{display:grid;grid-template-columns:34px repeat(24,1fr);gap:3px;align-items:center;font-size:10.5px;color:var(--a-ink3);}
.rp-heat i{display:block;aspect-ratio:1;border-radius:3px;min-height:10px;} .rp-heat b{font-weight:600;} .rp-heat em{font-style:normal;text-align:center;}
.rp-gh-top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;}
.rp-gh-list{display:flex;flex-direction:column;gap:6px;}
.rp-gh-list button{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:1px solid var(--a-line);background:var(--a-card,#fff);border-radius:12px;padding:10px 12px;cursor:pointer;font:inherit;color:inherit;}
.rp-gh-list button:hover{border-color:#b8c2cc;background:var(--a-card2,#f7f9fa);}
.rp-gh-t{flex:1;min-width:0;font-weight:600;font-size:13.5px;} .rp-gh-t small{display:block;font-weight:400;font-size:12px;color:var(--a-ink3);margin-top:2px;line-height:1.4;}
.rp-gh-list b{font-size:16px;} .rp-gh-list em{font-style:normal;font-size:12px;color:var(--a-ink3);white-space:nowrap;}
.rp-gh-sev{flex:none;font:700 10.5px var(--ui,Inter,sans-serif);letter-spacing:.04em;text-transform:uppercase;padding:3px 8px;border-radius:999px;}
.rp-gh-sev.critical{background:#fdeaea;color:#c62828;} .rp-gh-sev.warning{background:#fff3dc;color:#9a6200;}
.rp-gh-ok{padding:14px 16px;border-radius:12px;background:#e6f5ee;color:#0f7a58;font-weight:600;font-size:13.5px;}
.rp-tpl-pill{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--a-line);background:var(--a-card,#fff);border-radius:999px;padding:2px 9px;font:500 11.5px var(--ui,Inter,sans-serif);color:var(--a-ink2);cursor:pointer;vertical-align:1px;}
.rp-tpl-pill:hover{border-color:#b8c2cc;}
.rp-tpl-now{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;margin-top:14px;padding:10px 14px;border-radius:12px;background:#fff7ef;border:1px solid #f5d6b8;font-size:13px;}
.rp-tpl-now em{font-style:normal;color:var(--a-ink3);margin-right:4px;}
.rp-tpl-on{display:inline-flex;align-items:center;gap:4px;font:600 11px var(--ui,Inter,sans-serif);padding:2px 8px;border-radius:999px;background:#e6f5ee;color:#0f7a58;}
.rp-tpl-on.ed{background:#fff3dc;color:#9a6200;}
.rp-cat-i.rp-tpl-act{border-color:#8fd3b6;box-shadow:0 0 0 2px #e6f5ee;}
.rp-who{position:relative;display:inline-block;margin:2px 0 6px;}
.rp-who-btn{display:inline-flex;align-items:center;gap:8px;padding:4px 12px 4px 4px;border:1px solid var(--a-line);border-radius:999px;background:var(--a-card,#fff);font:600 13px var(--ui,Inter,sans-serif);color:var(--a-ink);cursor:pointer;}
.rp-who-btn:hover{border-color:#b8c2cc;} .rp-who-btn svg{color:var(--a-ink3);}
.rp-av{flex:none;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;font-weight:700;letter-spacing:.02em;font-family:var(--ui,Inter,sans-serif);line-height:1;}
.rp-av.team{background:#171614;color:#fff;} .rp-av.add{width:26px;height:26px;background:var(--a-line,#eef2f5);color:var(--a-ink2);font-size:15px;}
.rp-who-menu{position:absolute;left:0;top:calc(100% + 6px);z-index:50;min-width:260px;padding:6px;border:1px solid var(--a-line);border-radius:14px;background:var(--a-card,#fff);box-shadow:0 18px 40px -16px rgba(20,26,33,.35);}
.rp-who-menu button{display:flex;align-items:center;gap:10px;width:100%;border:0;background:none;padding:7px 8px;border-radius:10px;text-align:left;font:600 13px var(--ui,Inter,sans-serif);color:var(--a-ink);cursor:pointer;}
.rp-who-menu button:hover{background:var(--a-card2,#f4f6fa);} .rp-who-menu button.on{background:#fff4ea;}
.rp-who-menu small{display:block;font-weight:400;font-size:11.5px;color:var(--a-ink3);margin-top:1px;}
.rp-who-lbl{font:600 10.5px var(--ui,Inter,sans-serif);letter-spacing:.07em;text-transform:uppercase;color:var(--a-ink3);padding:8px 8px 4px;}
.rp-who-sep{height:1px;background:var(--a-line);margin:6px 4px;}
.rp-fs-h{font:600 13px var(--ui,Inter,sans-serif);color:var(--a-ink,#1b222a);margin:0 0 8px;}
.rp-fs-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px;}
.rp-fs-bar input{min-width:220px;}
.rp-fs-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:1px;}
.rp-fs-sub{font-size:11.5px;color:var(--a-ink3,#8b98a3);margin-top:2px;}
.rp-fs-msg{display:block;max-width:340px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--a-ink2,#4b5560);}
.rp-fs-ch{display:inline-flex;align-items:center;gap:6px;}
.rp-fs-ch::before{content:'';width:8px;height:8px;border-radius:50%;background:var(--c);}
.rp-fx-top{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:16px;}
.rp-fx-search{flex:1 1 320px;display:flex;align-items:center;gap:8px;border:1px solid var(--a-line);border-radius:12px;padding:0 12px;background:var(--a-card);color:var(--a-ink3);transition:border-color .15s,box-shadow .15s;cursor:text;}
.rp-fx-search:focus-within{border-color:var(--a-deep,#2a78d6);box-shadow:0 0 0 3px rgba(42,120,214,.14);}
.rp-fx-search input{flex:1;border:0;outline:0;background:transparent;font:500 15px var(--ui,Inter,sans-serif);color:var(--a-ink);padding:11px 0;min-width:0;}
.rp-fx-search kbd{font:600 11px var(--ui,Inter,sans-serif);color:var(--a-ink3);border:1px solid var(--a-line);border-bottom-width:2px;border-radius:5px;padding:0 6px;}
.rp-fx-search:focus-within kbd{display:none;}
.rp-fx-tools{display:flex;gap:8px;align-items:center;}
.rp-fx-tools select{font:500 12.5px var(--ui,Inter,sans-serif);border:1px solid var(--a-line);border-radius:9px;padding:8px 10px;background:var(--a-card);color:var(--a-ink);}
.rp-fx-dims{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;}
.rp-fx-dim{position:relative;}
.rp-fx-dim > button{display:inline-flex;align-items:center;gap:6px;max-width:280px;font:500 13.5px var(--ui,Inter,sans-serif);border:1px solid var(--a-line);border-radius:999px;padding:7px 14px;background:var(--a-card);color:var(--a-ink2);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:background .15s,border-color .15s,color .15s;}
.rp-fx-dim > button:hover{background:var(--a-wash,#f4f6f8);}
.rp-fx-dim > button.on{background:var(--a-ink,#1b222a);border-color:var(--a-ink,#1b222a);color:#fff;}
.rp-fx-dim > button b{font-weight:600;overflow:hidden;text-overflow:ellipsis;}
.rp-fx-dim > button svg{flex:none;opacity:.7;}
.rp-fx-pop{position:absolute;z-index:60;top:calc(100% + 6px);left:0;width:290px;max-height:340px;display:flex;flex-direction:column;background:var(--a-card,#fff);border:1px solid var(--a-line);border-radius:12px;box-shadow:0 18px 40px -16px rgba(20,28,36,.38);padding:8px;animation:rpIn .16s ease both;}
.rp-fx-pop input{border:1px solid var(--a-line);border-radius:8px;padding:7px 9px;font:500 12.5px var(--ui,Inter,sans-serif);margin-bottom:6px;background:var(--a-card);color:var(--a-ink);outline:0;}
.rp-fx-opts{overflow:auto;}
.rp-fx-opt{display:grid;grid-template-columns:1fr auto;gap:3px 8px;width:100%;text-align:left;border:0;background:none;border-radius:8px;padding:7px 8px;cursor:pointer;font:500 12.5px var(--ui,Inter,sans-serif);color:var(--a-ink);}
.rp-fx-opt:hover,.rp-fx-opt.on{background:var(--a-wash,#f4f6f8);}
.rp-fx-opt em{font-style:normal;color:var(--a-ink3);font-variant-numeric:tabular-nums;}
.rp-fx-opt i{grid-column:1 / -1;height:3px;border-radius:2px;background:var(--a-line2,#eef1f4);overflow:hidden;}
.rp-fx-opt i::after{content:'';display:block;height:100%;width:var(--p);background:var(--c,#2a78d6);border-radius:2px;}
.rp-fx-chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:10px;min-height:26px;font-size:12.5px;color:var(--a-ink3);}
.rp-fx-chip{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 6px 4px 10px;background:var(--a-wash,#eef3f8);color:var(--a-ink);font:500 12px var(--ui,Inter,sans-serif);border:0;cursor:pointer;}
.rp-fx-chip span{color:var(--a-ink3);}
.rp-fx-chip b{display:inline-grid;place-items:center;width:16px;height:16px;border-radius:50%;background:rgba(127,127,127,.18);font-size:11px;line-height:1;}
.rp-fx-chip:hover b{background:rgba(127,127,127,.32);}
.rp-fx-clear{border:0;background:none;color:var(--a-deep,#2a78d6);font:600 12px var(--ui,Inter,sans-serif);cursor:pointer;padding:4px;}
.rp-fx-count{margin-left:auto;font-variant-numeric:tabular-nums;}
.rp-fx-split{display:flex;gap:20px;align-items:flex-start;margin-top:8px;flex-wrap:wrap;}
.rp-fx-side{flex:0 1 250px;min-width:220px;display:flex;flex-direction:column;gap:18px;overflow:auto;}
.rp-fx-side > div{flex:none;}
.rp-fx-list{flex:1 1 440px;min-width:0;display:flex;flex-direction:column;gap:8px;overflow:auto;padding:2px 4px 2px 2px;}
.rp-fx-bars{display:flex;flex-direction:column;gap:2px;}
.rp-fx-bars button{display:grid;grid-template-columns:1fr auto;gap:4px 8px;width:100%;border:0;background:none;padding:7px 8px;border-radius:8px;cursor:pointer;text-align:left;font:500 13.5px var(--ui,Inter,sans-serif);color:var(--a-ink);}
.rp-fx-bars button > span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.rp-fx-bars button:hover,.rp-fx-bars button.on{background:var(--a-wash,#f4f6f8);}
.rp-fx-bars button.on{box-shadow:inset 0 0 0 1px var(--a-line);}
.rp-fx-bars em{font-style:normal;color:var(--a-ink3);font-variant-numeric:tabular-nums;}
.rp-fx-bars i{grid-column:1 / -1;height:6px;border-radius:3px;background:var(--a-line2,#eef1f4);overflow:hidden;}
.rp-fx-bars i::after{content:'';display:block;height:100%;width:var(--p);background:var(--c);border-radius:3px;transition:width .3s;}
.rp-fx-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--c);margin-right:7px;vertical-align:1px;}
.rp-fx-card{display:flex;gap:14px;width:100%;text-align:left;border:1px solid var(--a-line);border-radius:14px;padding:15px 18px;background:var(--a-card);cursor:pointer;color:inherit;font:inherit;flex:none;transition:border-color .15s,box-shadow .15s,transform .15s;}
.rp-fx-card:hover{border-color:var(--a-ink3,#c3ccd3);box-shadow:0 8px 22px -14px rgba(20,28,36,.38);transform:translateY(-1px);}
.rp-fx-card:focus-visible{outline:2px solid var(--a-deep,#2a78d6);outline-offset:1px;}
.rp-fx-av{flex:none;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font:600 14.5px var(--ui,Inter,sans-serif);color:#fff;background:var(--c);letter-spacing:.02em;}
.rp-fx-av.lg{width:52px;height:52px;font-size:17px;}
.rp-fx-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;}
.rp-fx-l1{display:flex;align-items:baseline;gap:8px;min-width:0;}
.rp-fx-l1 b{font:600 15.5px var(--ui,Inter,sans-serif);color:var(--a-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.rp-fx-l1 span{color:var(--a-ink3);font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.rp-fx-l1 time{margin-left:auto;flex:none;color:var(--a-ink3);font-size:12px;font-variant-numeric:tabular-nums;}
.rp-fx-l2{color:var(--a-ink2);font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.rp-fx-msg{color:var(--a-ink2);font-size:14px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.rp-fx-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;}
.rp-fx-tags > span{display:inline-flex;align-items:center;gap:5px;font:500 12.5px var(--ui,Inter,sans-serif);color:var(--a-ink2);background:var(--a-wash,#f2f5f8);border-radius:6px;padding:2px 7px;max-width:100%;}
.rp-fx-tags > span > i{flex:none;width:7px;height:7px;border-radius:50%;background:var(--c);}
.rp-fx-hit{background:#ffe27a;color:#1b222a;border-radius:3px;padding:0 1px;}
.rp-fx-more{align-self:center;margin:6px 0 2px;}
.rp-fx-empty{padding:40px 16px;text-align:center;color:var(--a-ink3);border:1px dashed var(--a-line);border-radius:14px;font-size:13px;}
.rp-fx-empty b{display:block;color:var(--a-ink);font-size:14.5px;margin-bottom:4px;}
.rp-fx-share{display:flex;gap:10px;align-items:flex-start;margin-top:16px;padding:12px 14px;border-radius:12px;background:var(--a-wash,#f4f6f8);font-size:12.5px;line-height:1.5;color:var(--a-ink2);cursor:pointer;}
.rp-fx-share input{margin-top:3px;}
.rp-fx-share b{color:var(--a-ink);}
.rp-fx-dhead{display:flex;gap:14px;align-items:center;margin-bottom:12px;}
.rp-fx-dname{font:600 18px var(--display,Poppins,Inter,sans-serif);color:var(--a-ink);overflow-wrap:anywhere;}
.rp-fx-acts{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;}
.rp-fx-acts .aiv-btn{display:inline-flex;align-items:center;gap:6px;text-decoration:none;}
.rp-fx-others{display:flex;flex-direction:column;gap:8px;margin-top:8px;}
.rp-fx-others div{display:grid;grid-template-columns:1fr auto;gap:2px 10px;padding:8px 10px;border:1px solid var(--a-line);border-radius:10px;font-size:12.5px;}
.rp-fx-others span{color:var(--a-ink3);}
.rp-fx-others em{grid-column:1 / -1;font-style:normal;color:var(--a-ink2);}
@media (max-width:760px){.rp-fx-side{flex-basis:100%;}.rp-fx-l1 time{display:none;}.rp-fx-search{flex-basis:100%;}}
.rp-ps-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:14px 0 12px;}
.rp-ps-tabs{display:flex;gap:6px;flex-wrap:wrap;width:100%;}
.rp-ps-tab{border:1px solid var(--a-line);background:var(--a-card,#fff);border-radius:999px;padding:5px 12px;font:500 12.5px var(--ui,Inter,sans-serif);color:var(--a-ink2);cursor:pointer;display:inline-flex;gap:6px;align-items:center;}
.rp-ps-tab i{width:8px;height:8px;border-radius:50%;background:var(--c);}
.rp-ps-tab b{font-weight:600;color:var(--a-ink3);font-variant-numeric:tabular-nums;}
.rp-ps-tab.on{border-color:var(--c);color:var(--a-ink);box-shadow:inset 0 0 0 1px var(--c);}
.rp-ps-bar .rp-fx-search{flex:1;min-width:220px;}
.rp-ps-chk{display:inline-flex;gap:6px;align-items:center;font-size:12.5px;color:var(--a-ink2);cursor:pointer;}
.rp-ps-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:10px;overflow:auto;align-content:start;padding:2px;}
.rp-ps-grid .rp-fx-more,.rp-ps-grid .rp-fx-empty{grid-column:1 / -1;}
.rp-ps-meta{display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-size:12.5px;color:var(--a-ink3);margin-top:3px;}
.rp-ps-pill{display:inline-flex;align-items:center;gap:5px;font:600 11.5px var(--ui,Inter,sans-serif);color:var(--c);background:color-mix(in srgb,var(--c) 12%,transparent);border-radius:999px;padding:2px 8px;white-space:nowrap;}
.rp-ps-pill::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--c);}
.rp-ps-sts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:4px 0 14px;}
.rp-ps-st{text-align:left;border:1px solid var(--a-line);border-radius:12px;padding:9px 12px;background:var(--a-card,#fff);cursor:pointer;font:inherit;color:inherit;}
.rp-ps-st b{display:flex;align-items:center;gap:7px;font-size:13.5px;}
.rp-ps-st b::before{content:'';width:9px;height:9px;border-radius:50%;background:var(--c);}
.rp-ps-st small{display:block;color:var(--a-ink3);font-size:11.5px;margin-top:2px;}
.rp-ps-st.on{border-color:var(--c);box-shadow:inset 0 0 0 1px var(--c);background:color-mix(in srgb,var(--c) 7%,var(--a-card,#fff));}
.rp-ps-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px;margin-top:8px;}
.rp-ps-form label{display:flex;flex-direction:column;gap:4px;font-size:11.5px;color:var(--a-ink3);}
.rp-ps-form .full{grid-column:1 / -1;}
.rp-ps-form input,.rp-ps-form textarea,.rp-ps-form select{font:inherit;font-size:13px;color:var(--a-ink);border:1px solid var(--a-line);border-radius:8px;padding:7px 9px;background:var(--a-card,#fff);min-width:0;}
.rp-ps-form textarea{min-height:80px;resize:vertical;}
.rp-ps-subs{display:flex;flex-direction:column;gap:8px;margin-top:8px;}
.rp-ps-sub{display:grid;grid-template-columns:1fr auto;gap:2px 10px;padding:9px 11px;border:1px solid var(--a-line);border-radius:10px;font-size:12.5px;}
.rp-ps-sub > span{color:var(--a-ink3);}
.rp-ps-sub em{font-style:normal;color:var(--a-ink2);overflow-wrap:anywhere;}
.rp-ps-sa{display:flex;gap:4px;align-items:flex-end;justify-content:flex-end;}
.rp-ps-mini{border:0;background:none;color:var(--a-deep,#2a78d6);font:500 12px var(--ui,Inter,sans-serif);cursor:pointer;padding:2px 4px;}
.rp-ps-mini:hover{text-decoration:underline;}
.rp-ps-kv{display:grid;grid-template-columns:34% 1fr;gap:7px 10px;margin:8px 0 0;font-size:13px;}
.rp-ps-kv dt{color:var(--a-ink3);} .rp-ps-kv dd{margin:0;min-width:0;overflow-wrap:anywhere;}
.rp-ps-saved{color:#0f7a58;font:500 12px var(--ui,Inter,sans-serif);margin-left:8px;opacity:0;transition:opacity .2s;}
.rp-ps-saved.on{opacity:1;}
@media (max-width:760px){.rp-ps-form,.rp-ps-sts{grid-template-columns:1fr;}.rp-ps-grid{grid-template-columns:1fr;}}
.rp-pw-scroll{overflow:auto;padding:8px 16px 16px;max-height:600px;cursor:grab;}
.rp-pw-scroll.drag{cursor:grabbing;user-select:none;}
.rp-pw-scroll.drag *{cursor:grabbing !important;}
.rp-pw-node.again .rp-pw-nm{color:var(--ink-3,#8b98a3);}
.rp-pw-canvas{position:relative;}
.rp-pw-svg{position:absolute;left:0;top:0;pointer-events:none;}
.rp-pw-node{position:absolute;height:30px;display:flex;align-items:center;gap:7px;padding:0 10px 0 6px;box-sizing:border-box;border:1px solid var(--line,#e4e9ed);border-radius:999px;background:#fff;font-size:12.5px;color:var(--ink,#1b222a);box-shadow:inset 3px 0 0 var(--c);}
.rp-pw-node.can{border-color:#cbd2de;}
.rp-pw-node.open{background:var(--card-2,#f4f6fa);}
.rp-pw-node.root{font-weight:600;font-size:13px;box-shadow:inset 3px 0 0 #14213d;}
.rp-pw-all{width:100%;margin-top:8px;justify-content:center;}
.rp-pw-node.more.more-open{border-style:solid;color:var(--ink-2,#57646f);background:#fff;}
.rp-pw-node.end,.rp-pw-node.more{border-style:dashed;color:var(--ink-3,#8b98a3);background:transparent;box-shadow:none;}
.rp-pw-tog{flex:none;width:18px;height:18px;border-radius:50%;border:0;background:#14213d;color:#fff;font:600 13px/18px var(--ui,Inter,sans-serif);padding:0;cursor:pointer;text-align:center;}
.rp-pw-node.open .rp-pw-tog{background:#fff;color:#14213d;box-shadow:inset 0 0 0 1.3px #14213d;}
.rp-pw-dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--c);margin:0 5px;}
.rp-pw-nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.rp-pw-v{flex:none;font-size:11.5px;color:var(--ink-3,#8b98a3);font-variant-numeric:tabular-nums;font-weight:500;}
.rp-pw-star{flex:none;border:0;background:#fff8e6;color:#855711;border-radius:999px;padding:1px 7px;font:600 11px var(--ui,Inter,sans-serif);cursor:pointer;}
.rp-pw-star.hint{background:transparent;color:#b7791f;font-weight:500;}
.rp-pw-star:hover{background:#f1dca4;}
.rp-pw-keys{border:1px solid #f1dca4;background:#fffdf6;border-radius:10px;padding:12px 14px;margin-top:12px;}
.rp-pw-keys h4{margin:10px 0 6px;font-size:12.5px;font-weight:600;color:var(--ink-2,#57646f);}
.rp-pw-kh{display:flex;justify-content:space-between;align-items:center;gap:10px;}
.rp-pw-ev{font-family:var(--mono,monospace);font-size:11px;color:var(--ink-3,#8b98a3);}
@media (max-width:760px){.rp-pw-split{flex-direction:column;}.rp-pw-pick{width:auto;flex:none;border-right:0;border-bottom:1px solid var(--line,#e4e9ed);max-height:260px;}}
.rp-pp > button{display:inline-flex;align-items:center;gap:8px;border:1px solid #E4E4E7;background:#fff;border-radius:5px;padding:7px 12px;font:500 13px 'Geist','Helvetica Neue',Helvetica,Arial,sans-serif;color:#3F3F46;cursor:pointer;}
.rp-pp > button:hover{border-color:#171614;}
.rp-pp > button[disabled]{cursor:default;border-color:#E4E4E7;}
.rp-pp ul{position:absolute;right:0;top:calc(100% + 4px);min-width:190px;background:#fff;border:.8px solid #EBEDF0;border-radius:6px;box-shadow:0 12px 30px -12px rgba(0,0,0,.25);list-style:none;margin:0;padding:4px;z-index:50;}
.rp-pp li button{all:unset;display:block;box-sizing:border-box;width:100%;padding:8px 10px;border-radius:4px;font:500 13px 'Geist','Helvetica Neue',Helvetica,Arial,sans-serif;color:#3F3F46;cursor:pointer;}
.rp-pp li button:hover{background:#F4F4F5;}
.rp-pp li button.on{background:#171614;color:#fff;}
`;
  document.head.appendChild(st);
}

/* ==========================================================================
   DATA
   ctx.get(name) -> promise. Names: feed, g4, gsc, pages, pathway, jrn, kw, gbp.
   The tool and the public page each supply their own loaders.
   ========================================================================== */
/* AI model for the period, built once per board render. */
function aiModel(ctx, feed){
  ctx._m = ctx._m || {};
  const k = ctx.R.since + '|' + ctx.R.end;
  if (!ctx._m[k]) ctx._m[k] = U.model(feed, {since: ctx.R.since, end: ctx.R.end});
  return ctx._m[k];
}
/* GA4 report rows, split into the period and the one before it. */
function g4Split(ctx, g4){
  const R = ctx.R;
  const conv = (g4.conv || []), traffic = (g4.traffic || []);
  return {
    conv: conv.filter(r => r[0] >= R.since && r[0] <= R.end),
    convPrev: conv.filter(r => r[0] >= R.prevSince && r[0] <= R.prevEnd),
    traffic: traffic.filter(r => r[0] >= R.since && r[0] <= R.end),
    trafficPrev: traffic.filter(r => r[0] >= R.prevSince && r[0] <= R.prevEnd),
    hasPrev: (g4.range && g4.range.start <= R.prevSince) || traffic.some(r => r[0] < R.since)
  };
}
const group = (rows, keyFn, valIdx) => {
  const m = {};
  rows.forEach(r => { const k = keyFn(r); m[k] = (m[k] || 0) + (Number(r[valIdx]) || 0); });
  return Object.keys(m).map(k => ({k, n: m[k]})).sort((a, b) => b.n - a.n);
};

/* Keyword rankings from the client record. */
function kwRows(c){
  const out = [];
  ((c && c.keywords) || []).forEach(k => (k.locations || []).forEach(l => {
    const hist = (l.history || []).filter(h => h && h.checkedAt);
    out.push({kw: k.text, loc: l.label || '', rank: l.rank == null ? null : l.rank, prev: l.prevRank == null ? null : l.prevRank,
      at: l.checkedAt || 0, url: l.sourceUrl || '', hist: hist.slice(-24).map(h => [h.checkedAt, h.rank])});
  }));
  return out;
}
const rankTxt = r => r == null ? '—' : r === 0 ? 'Not in top 100' : '#' + r;
const rankMove = (r, p) => {
  if (r == null || p == null) return {cls: 'flat', txt: ''};
  const a = r === 0 ? 101 : r, b = p === 0 ? 101 : p;
  if (a === b) return {cls: 'flat', txt: '='};
  return a < b ? {cls: 'up', txt: '▲ ' + (b === 101 ? 'new' : (b - a))} : {cls: 'down', txt: '▼ ' + (a === 101 ? 'lost' : (a - b))};
};

/* GBP grids: the GBP tracker profiles matching this client, latest scan per keyword. */
function gbpSummary(gbps){
  return (gbps || []).map(g => ({name: g.name || g.bizName || 'Profile', biz: g.bizName || '',
    kws: (g.keywords || []).map(k => {
      const sc = (k.scans || []).slice().sort((a, b) => (a.ts || 0) - (b.ts || 0));
      const last = sc[sc.length - 1], prev = sc[sc.length - 2];
      const stat = s => {
        if (!s) return null;
        const pts = (s.points || []).filter(p => !p.error);
        const ranked = pts.filter(p => p.rank != null && p.rank > 0);
        const avg = ranked.length ? ranked.reduce((t, p) => t + p.rank, 0) / ranked.length : null;
        return {ts: s.ts, n: pts.length, found: ranked.length, top3: ranked.filter(p => p.rank <= 3).length, avg,
          grid: s.grid || Math.round(Math.sqrt(pts.length)) || 0,
          pts: (s.points || []).map(p => [p.row, p.col, p.rank == null || p.error ? null : p.rank])};
      };
      return {kw: k.text, last: stat(last), prev: stat(prev)};
    }).filter(k => k.last)})).filter(g => g.kws.length);
}

/* ==========================================================================
   DRILL-DOWNS (Team report only)
   ========================================================================== */
const DRILL = {};
/* Conversions: everything behind a conversions number, with filters. */
DRILL.conv = (ctx, f) => {
  f = f || {};
  ctx.get('g4').then(g4 => {
    const S = g4Split(ctx, g4);
    const title = f.ai ? 'Conversions from AI' : f.channel ? 'Conversions · ' + chName(f.channel) : f.event ? keLabel(f.event) : f.day ? 'Conversions · ' + prettyDate(f.day) : f.page ? 'Conversions · ' + pageKey(f.page) : 'All conversions';
    U.openDrawer(title + ' · ' + ctx.R.label.toLowerCase(), f.channel ? chColor(f.channel) : f.ai ? '#eb6834' : '#2a78d6', body => {
      const st = {ch: f.channel || (f.ai ? '__ai' : ''), ev: f.event || '', day: f.day || '', page: f.page ? pageKey(f.page) : ''};
      const chans = group(S.conv, r => r[1], 5).map(x => x.k);
      const evs = group(S.conv, r => r[3], 5).map(x => x.k);
      body.innerHTML = '<div data-stats></div>' +
        '<div class="aiv-card"><div class="aiv-filters" style="margin-bottom:0">' +
        '<select data-f="ch"><option value="">All channels</option><option value="__ai">All AI assistants</option>' + chans.map(c => '<option value="' + esc(c) + '">' + esc(chName(c)) + '</option>').join('') + '</select>' +
        '<select data-f="ev"><option value="">All conversion types</option>' + evs.map(e => '<option value="' + esc(e) + '">' + esc(keLabel(e)) + '</option>').join('') + '</select>' +
        (st.day ? '<button class="aiv-btn" type="button" data-clear-day>' + esc(prettyDate(st.day)) + ' ×</button>' : '') +
        (st.page ? '<button class="aiv-btn" type="button" data-clear-page>' + esc(st.page) + ' ×</button>' : '') +
        '</div></div>' +
        '<div class="aiv-card"><h3>By type</h3><div data-by-ev style="margin-top:8px"></div></div>' +
        '<div class="aiv-card"><h3>By channel</h3><div data-by-ch style="margin-top:8px"></div></div>' +
        '<div class="aiv-card"><h3>Every conversion, day by day</h3><p class="aiv-cap" style="margin-bottom:8px">One row per day, channel, source, type and landing page, as GA4 records it.</p><div data-list></div></div>';
      const sel = body.querySelectorAll('[data-f]');
      sel[0].value = st.ch; sel[1].value = st.ev;
      const draw = () => {
        const rows = S.conv.filter(r => (!st.ch || (st.ch === '__ai' ? isAi(r[1]) : r[1] === st.ch)) && (!st.ev || r[3] === st.ev) &&
          (!st.day || r[0] === st.day || (ctx.R.weekly && r[0] >= st.day && r[0] <= addDays(st.day, 6))) && (!st.page || pageKey(r[4]) === st.page));
        const tot = sum(rows, 5);
        const types = group(rows, r => r[3], 5), chs = group(rows, r => r[1], 5);
        body.querySelector('[data-stats]').innerHTML = statsRow([['Conversions', fmt(tot)], ['Types', fmt(types.length), types[0] ? esc(keLabel(types[0].k)) + ' leads' : ''],
          ['Channels', fmt(chs.length), chs[0] ? esc(chName(chs[0].k)) + ' leads' : ''], ['Landing pages', fmt(group(rows, r => pageKey(r[4]), 5).length)]]);
        const maxE = Math.max(1, ...types.map(x => x.n)), maxC = Math.max(1, ...chs.map(x => x.n));
        table(body.querySelector('[data-by-ev]'), types, [
          {key: 'k', label: 'Conversion', fmt: r => esc(keLabel(r.k)) + ' <span style="color:var(--a-ink3);font-size:11px">' + esc(r.k) + '</span>'},
          {key: 'n', label: 'Count', num: true, fmt: r => barCell(r.n, maxE, '#2a78d6')}], {sort: 'n', onRow: r => { st.ev = r.k; sel[1].value = r.k; draw(); }});
        table(body.querySelector('[data-by-ch]'), chs, [
          {key: 'k', label: 'Channel', fmt: r => chLabel(r.k)},
          {key: 'n', label: 'Count', num: true, fmt: r => barCell(r.n, maxC, chColor(r.k))}], {sort: 'n', onRow: r => { st.ch = r.k; sel[0].value = r.k; draw(); }});
        table(body.querySelector('[data-list]'), rows.map(r => ({d: r[0], ch: r[1], src: r[2], ev: r[3], pg: r[4], n: r[5]})), [
          {key: 'd', label: 'Date', fmt: r => esc(shortDate(r.d))},
          {key: 'ev', label: 'Conversion', fmt: r => esc(keLabel(r.ev))},
          {key: 'ch', label: 'Channel', fmt: r => chLabel(r.ch) + (r.src && r.src !== '(not set)' && r.src !== '(direct)' ? ' <span style="color:var(--a-ink3);font-size:11px">' + esc(r.src) + '</span>' : '')},
          {key: 'pg', label: 'Landing page', fmt: r => '<span class="aiv-page">' + esc(pageKey(r.pg)) + '</span>'},
          {key: 'n', label: 'Count', num: true}], {sort: 'd', empty: 'No conversions match.', maxH: 520});
      };
      sel[0].addEventListener('change', () => { st.ch = sel[0].value; draw(); });
      sel[1].addEventListener('change', () => { st.ev = sel[1].value; draw(); });
      const cd = body.querySelector('[data-clear-day]'); if (cd) cd.addEventListener('click', () => { st.day = ''; cd.remove(); draw(); });
      const cp = body.querySelector('[data-clear-page]'); if (cp) cp.addEventListener('click', () => { st.page = ''; cp.remove(); draw(); });
      draw();
    });
  });
};
/* Traffic for one channel. */
DRILL.channel = (ctx, ch) => {
  ctx.get('g4').then(g4 => {
    const S = g4Split(ctx, g4), B = buckets(ctx.R);
    const rows = S.traffic.filter(r => !ch || r[1] === ch), prev = S.trafficPrev.filter(r => !ch || r[1] === ch);
    const conv = S.conv.filter(r => !ch || r[1] === ch);
    U.openDrawer((ch ? chName(ch) : 'All traffic') + ' · ' + ctx.R.label.toLowerCase(), ch ? chColor(ch) : '#2a78d6', body => {
      const s = sum(rows, 2), e = sum(rows, 3), k = sum(rows, 5);
      const d = delta(s, sum(prev, 2), S.hasPrev);
      body.innerHTML = statsRow([['Sessions', fmt(s), d.txt ? esc(d.txt) + ' vs previous' : ''], ['Engaged', fmt(e), pctS(e, s) + ' engagement rate'],
        ['Users', fmt(sum(rows, 4))], ['Conversions', fmt(k), pctS(k, s) + ' of sessions']]) +
        '<div class="aiv-card"><h3>Sessions and conversions</h3><div class="aiv-chart" data-c style="margin-top:10px"></div></div>' +
        '<div class="aiv-card"><h3>Conversions</h3><p class="aiv-cap" style="margin-bottom:8px">Click one for every occurrence.</p><div data-ev></div></div>';
      const ss = B.zero(), ks = B.zero();
      rows.forEach(r => { const i = B.slot(r[0]); if (i != null){ ss[i] += r[2]; ks[i] += r[5]; } });
      lineChart(body.querySelector('[data-c]'), {labels: B.labels, weekly: ctx.R.weekly, height: 200,
        series: [{name: 'Sessions', color: ch ? chColor(ch) : '#2a78d6', values: ss, area: true}, {name: 'Conversions', color: '#26313c', values: ks, dash: true}],
        onClick: day => DRILL.conv(ctx, {channel: ch, day})});
      const evs = group(conv, r => r[3], 5), max = Math.max(1, ...evs.map(x => x.n));
      table(body.querySelector('[data-ev]'), evs, [{key: 'k', label: 'Conversion', fmt: r => esc(keLabel(r.k))}, {key: 'n', label: 'Count', num: true, fmt: r => barCell(r.n, max, ch ? chColor(ch) : '#2a78d6')}],
        {sort: 'n', empty: 'No conversions from this channel in the period.', onRow: r => DRILL.conv(ctx, {channel: ch, event: r.k})});
    });
  });
};
DRILL.kw = (ctx, r) => {
  U.openDrawer(r.kw + (r.loc ? ' · ' + r.loc : ''), KW_COL, body => {
    const m = rankMove(r.rank, r.prev);
    body.innerHTML = statsRow([['Position now', esc(rankTxt(r.rank)), m.txt && m.txt !== '=' ? esc(m.txt) + ' since last check' : ''], ['Previous', esc(rankTxt(r.prev))],
      ['Last checked', r.at ? esc(prettyDate(isoDay(new Date(r.at)))) : '—'], ['Ranking page', r.url ? linkTo('', r.url) : '—']]) +
      '<div class="aiv-card"><h3>Position over time</h3><p class="aiv-cap">Higher on the chart is better. Gaps are checks where the site was outside the top 100.</p><div class="aiv-chart" data-c style="margin-top:10px"></div></div>';
    const h = r.hist.filter(x => x[0]);
    const labels = h.map(x => isoDay(new Date(x[0])));
    /* Rank charted as 101 - rank so up means better. */
    lineChart(body.querySelector('[data-c]'), {labels, height: 200, label: 'position',
      series: [{name: 'Position (101 − rank)', color: KW_COL, values: h.map(x => x[1] > 0 ? 101 - x[1] : null), area: true}],
      empty: 'Only one check so far.'});
  });
};
DRILL.gscQuery = (ctx, q) => {
  U.openDrawer('“' + q[0] + '”', '#2a78d6', body => {
    body.innerHTML = statsRow([['Clicks', fmt(q[1])], ['Impressions', fmt(q[2])], ['CTR', esc(String(q[3])) + '%'], ['Avg position', esc(String(q[4]))]]) +
      '<div class="aiv-card"><h3>Page Google showed</h3><p class="aiv-cap">' + (q[5] ? linkTo('', q[5]) : 'Not recorded') + '</p></div>' +
      '<div class="aiv-note">Search Console numbers for ' + esc(ctx.gscRange || 'the period') + '. Position is the average for this query across all searches that showed the site.</div>';
  });
};

/* ==========================================================================
   WIDGET LIBRARY
   Each: {g: group, t: title, d: description, size, needs: [...], internal?,
          render(host, ctx, w, data)}   data = {feed, g4, gsc, jrn, kw, gbp} as needed
   ========================================================================== */
const W = {};
const G = {
  overview: 'Overview', insight: 'Insights & goals', conv: 'Conversions (GA4, every channel)', traffic: 'Traffic (GA4)', ai: 'AI assistants (GA4)',
  gai: 'Google AI search', bing: 'Copilot / Bing', llm: 'AI answers (prompt checks)', gsc: 'Search Console', kw: 'Keyword rankings',
  gbp: 'Google Business Profile', content: 'Text and embeds'
};
const kpiTile = (label, val, note, opts) => {
  opts = opts || {};
  const tag = opts.click ? 'button type="button"' : 'div';
  return '<' + tag + ' class="rp-kpi"' + (opts.click ? ' data-k="' + esc(opts.click) + '"' : '') + '><div class="rp-kpi-h"><div class="rp-kpi-l">' + esc(label) + '</div>' + (opts.icon || '') + '</div>' +
    '<div class="rp-kpi-v">' + val + (opts.d && opts.d.txt ? '<span class="aiv-delta ' + opts.d.cls + '" style="font-family:var(--ui,Inter,sans-serif)">' + esc(opts.d.txt) + '</span>' : '') + '</div>' +
    '<div class="rp-kpi-n">' + (note || '') + '</div>' + (opts.spark ? U.sparkline(opts.spark, opts.color || '#2a78d6') : '') + '</' + tag.split(' ')[0] + '>';
};
const bigNum = (val, d, note) => '<div class="rp-big">' + val + (d && d.txt ? '<span class="aiv-delta ' + d.cls + '" style="font:600 12px var(--ui,Inter,sans-serif)">' + esc(d.txt) + '</span>' : '') + '</div>' +
  (note ? '<div class="aiv-cap" style="margin-top:4px">' + note + '</div>' : '');
const legendRows = (items, total, opts) => '<div class="rp-legend">' + items.map(x =>
  '<' + (opts && opts.click ? 'button type="button" data-l="' + esc(x.k) + '"' : 'div') + '><i style="background:' + x.color + '"></i>' + (x.logo && BRAND[x.logo] ? logo(x.logo, 16) : '') + '<span>' + esc(x.label) + '</span><b>' + fmt(x.n) + '</b><em>' + pctS(x.n, total) + '</em></' + (opts && opts.click ? 'button' : 'div') + '>').join('') + '</div>';
/* AgencyAnalytics colours (client report): the first line black, then AA's chart palette. */
const AA_LINES = ['#171614', '#5CBAE6', '#B6D957', '#FAC364', '#8CD3FF', '#D998CB', '#9DA8B3', '#7FC8A9'];
const AA_DONUT = ['#5CBAE6', '#B6D957', '#FAC364', '#8CD3FF', '#D998CB', '#9DA8B3', '#7FC8A9', '#C3A6E6'];
/* Colour for the i-th slice / row of a breakdown: AA palette on the client report, the widget's own colour on the team report. */
const sc = (ctx, color, i) => ctx && ctx.aa ? (color === '#c3ccd3' ? '#E4E4E7' : AA_DONUT[i % AA_DONUT.length]) : color;

/* Line chart with tick boxes: every line can be switched off and on. What is
   ticked is kept on the widget (it.cfg.off), so a report opens the way it was
   left; on the shared page ticking only changes what that viewer sees.
   The chart fills the widget when the widget has a set height. */
const chart = (host, cfg, ctx, it) => {
  const fill = !!(ctx && it && ctx.fillOf && ctx.fillOf(it));
  const aa = !!(ctx && ctx.aa);
  const series = cfg.series.map((s, i) => aa ? Object.assign({}, s, {color: AA_LINES[i % AA_LINES.length], area: false, dash: false}) : s);
  const cf = it ? (it.cfg = it.cfg || {}) : {};
  const off = new Set(Array.isArray(cf.off) ? cf.off.filter(n => series.some(s => s.name === n)) : []);
  const many = series.length > 1;
  host.classList.add('rp-chwrap');
  host.classList.toggle('fill', fill);
  const legend = !many ? '' : aa
    ? '<div class="aia-toggles">' + series.map((s, i) => '<label class="aia-toggle" style="--c:' + s.color + '"><input type="checkbox" data-sx="' + i + '"' + (off.has(s.name) ? '' : ' checked') + '><i></i>' + esc(s.name) + '</label>').join('') + '</div>'
    : '<div class="aiv-chips" style="margin-top:8px">' + series.map((s, i) => '<button type="button" class="aiv-chip' + (off.has(s.name) ? ' off' : '') + '" data-sx="' + i + '" aria-pressed="' + (off.has(s.name) ? 'false' : 'true') + '" title="Show or hide this line"><i style="background:' + s.color + '"></i>' + esc(s.name) + '</button>').join('') + '</div>';
  host.innerHTML = (aa ? legend : '') + '<div class="aiv-chart"></div>' + (aa ? '' : legend) + (cfg.foot ? '<p class="aiv-foot">' + cfg.foot + '</p>' : '');
  const el = host.querySelector('.aiv-chart');
  /* Axis text follows the widget's text scale (--t), read at every redraw so a resize re-sizes it. */
  const tNow = () => { const w = el.closest('.rp-w.scaled'); return w ? parseFloat(w.style.getPropertyValue('--t')) || 1 : 1; };
  const draw = () => {
    const c = Object.assign({}, cfg, {series: series.filter(s => !off.has(s.name)), fill, height: cfg.height,
      empty: off.size && off.size === series.length ? 'Tick a line to show it.' : cfg.empty,
      grid: aa ? '#F4F4F5' : undefined, axis: aa ? '#666' : undefined, stroke: aa ? 2 : undefined});
    Object.defineProperty(c, 'fontSize', {get: () => { const t = tNow(); return aa ? Math.round(12 * t) : (t !== 1 ? Math.round(11 * t) : undefined); }});
    lineChart(el, c);
  };
  host.querySelectorAll('[data-sx]').forEach(b => {
    const flip = () => {
      const s = series[Number(b.dataset.sx)]; if (!s) return;
      if (off.has(s.name)) off.delete(s.name); else off.add(s.name);
      if (it){ if (off.size) cf.off = Array.from(off); else delete cf.off; if (ctx.saveItem) ctx.saveItem(it); }
      if (b.tagName === 'BUTTON'){ b.classList.toggle('off', off.has(s.name)); b.setAttribute('aria-pressed', off.has(s.name) ? 'false' : 'true'); }
      draw();
    };
    b.addEventListener(b.tagName === 'BUTTON' ? 'click' : 'change', flip);
  });
  draw();
};
/* Chart height when the widget's height follows its content (team report, untouched layout). */
const chH = (w, dflt, chrome) => w && w.h ? Math.max(120, w.h - 74 - (chrome || 0)) : dflt;
/* A widget body holding a fill-height chart lays out as a column so the chart can take what is left. */
const fillBody = (h, ctx, w) => { if (ctx && ctx.fillOf && ctx.fillOf(w)) h.classList.add('rp-fillbody'); };
const onClick = (host, sel, fn) => host.querySelectorAll(sel).forEach(el => el.addEventListener('click', () => fn(el)));

/* ---------- Overview ---------- */
W.headline = {g: 'overview', t: 'Headline numbers', d: 'Sessions, conversions, AI visits, Google clicks and keyword position side by side.', size: 'xl', needs: ['g4', 'feed', 'gsc', 'kw'], soft: true,
  render(h, ctx, w, D){
    const tiles = [];
    if (D.g4){
      const S = g4Split(ctx, D.g4), B = buckets(ctx.R), ss = B.zero(), ks = B.zero();
      S.traffic.forEach(r => { const i = B.slot(r[0]); if (i != null){ ss[i] += r[2]; ks[i] += r[5]; } });
      tiles.push(kpiTile('Sessions', fmt(sum(S.traffic, 2)), 'All channels', {d: delta(sum(S.traffic, 2), sum(S.trafficPrev, 2), S.hasPrev), spark: ss, click: ctx.drill && 'traffic', icon: logo('ga4', 18)}));
      tiles.push(kpiTile('Conversions', fmt(sum(S.conv, 5)), 'GA4 key events, every channel', {d: delta(sum(S.conv, 5), sum(S.convPrev, 5), S.hasPrev), spark: ks, color: '#0f7a58', click: ctx.drill && 'conv', icon: glyph('target', 18, '#0f7a58')}));
      const ai = S.conv.filter(r => isAi(r[1]));
      tiles.push(kpiTile('Conversions from AI', fmt(sum(ai, 5)), 'ChatGPT, Perplexity, Gemini…', {d: delta(sum(ai, 5), sum(S.convPrev.filter(r => isAi(r[1])), 5), S.hasPrev), click: ctx.drill && 'convai', icon: logoStack(AI_STACK.slice(0, 3), 16)}));
    }
    if (D.feed){
      const M = aiModel(ctx, D.feed);
      tiles.push(kpiTile('AI visits', fmt(M.ai.s), 'Visitors sent by AI assistants', {d: delta(M.ai.s, M.ai.ps, M.ai.hasPrev), spark: M.ai.series, color: '#eb6834', click: ctx.drill && 'ai', icon: logoStack(AI_STACK, 16)}));
    }
    if (D.gsc && D.gsc.totals){
      const t = D.gsc.totals, p = (D.gsc.previous || {}).totals;
      tiles.push(kpiTile('Google clicks', fmt(t.clicks), esc(D.gsc.range ? D.gsc.range.label : 'Search Console'), {d: p ? delta(t.clicks, p.clicks, true) : null, click: ctx.drill && 'gsc', icon: logo('gsc', 18)}));
    }
    if (D.kw){
      const ranked = D.kw.filter(r => r.rank > 0);
      const avg = ranked.length ? ranked.reduce((t, r) => t + r.rank, 0) / ranked.length : null;
      tiles.push(kpiTile('Keywords in top 10', fmt(ranked.filter(r => r.rank <= 10).length) + '<small style="font-size:14px;color:var(--a-ink3)"> / ' + D.kw.length + '</small>',
        avg ? 'Average position ' + avg.toFixed(1) : 'No positions yet', {click: ctx.drill && 'kw', icon: glyph('trophy', 18, '#6250d6')}));
    }
    h.innerHTML = tiles.length ? '<div class="rp-kpis">' + tiles.join('') + '</div>' : '<div class="rp-err">No data sources are connected for this client yet.</div>';
    onClick(h, '[data-k]', el => {
      const k = el.dataset.k;
      if (k === 'traffic') DRILL.channel(ctx, '');
      if (k === 'conv') DRILL.conv(ctx, {});
      if (k === 'convai') DRILL.conv(ctx, {ai: true});
      if (k === 'ai') U.openAllAi(aiModel(ctx, D.feed), ctx.domain, 'visits');
      if (k === 'gsc') ctx.scrollTo && ctx.scrollTo('gsc_queries');
      if (k === 'kw') ctx.scrollTo && ctx.scrollTo('kw_table');
    });
  }};

/* ---------- Conversions ---------- */
W.conv_kpi = {g: 'conv', t: 'Conversions', d: 'Total GA4 key events, every channel, with the change from the previous period.', size: 's', needs: ['g4'],
  render(h, ctx, w, D){
    const S = g4Split(ctx, D.g4), B = buckets(ctx.R), ks = B.zero();
    S.conv.forEach(r => { const i = B.slot(r[0]); if (i != null) ks[i] += r[5]; });
    const top = group(S.conv, r => r[3], 5)[0];
    h.innerHTML = '<div' + (ctx.drill ? ' role="button" tabindex="0" style="cursor:pointer" data-go' : '') + '>' +
      bigNum(fmt(sum(S.conv, 5)), delta(sum(S.conv, 5), sum(S.convPrev, 5), S.hasPrev), top ? 'Most: ' + esc(keLabel(top.k)) + ' (' + fmt(top.n) + ')' : 'None in this period') +
      '<div style="margin-top:8px">' + U.sparkline(ks, '#0f7a58') + '</div></div>';
    const s = h.querySelector('svg'); if (s){ s.style.width = '100%'; s.style.height = '34px'; }
    onClick(h, '[data-go]', () => DRILL.conv(ctx, {}));
  }};
W.conv_trend = {g: 'conv', t: 'Conversions over time', d: 'Daily or weekly conversions, split by the top channels. Click a day for what happened.', size: 'l', needs: ['g4'],
  render(h, ctx, w, D){
    const S = g4Split(ctx, D.g4), B = buckets(ctx.R);
    const chans = group(S.conv, r => r[1], 5).slice(0, 5).map(x => x.k);
    const series = [{name: 'All conversions', color: '#0f7a58', values: B.zero(), area: true}].concat(chans.map(c => ({name: chName(c), color: chColor(c), values: B.zero()})));
    S.conv.forEach(r => { const i = B.slot(r[0]); if (i == null) return; series[0].values[i] += r[5]; const j = chans.indexOf(r[1]); if (j > -1) series[j + 1].values[i] += r[5]; });
    fillBody(h, ctx, w);
    chart(h, {labels: B.labels, weekly: ctx.R.weekly, height: chH(w, 230, 70), series, empty: 'No conversions in this period.', onClick: ctx.drill ? day => DRILL.conv(ctx, {day}) : null}, ctx, w);
  }};
W.conv_by_channel = {g: 'conv', t: 'Conversions by channel', d: 'Where converting visitors came from, with AI assistants shown on their own.', size: 'm', needs: ['g4'],
  render(h, ctx, w, D){
    const S = g4Split(ctx, D.g4), tot = sum(S.conv, 5);
    const items = group(S.conv, r => r[1], 5).map(x => ({k: x.k, n: x.n, label: chName(x.k), color: chColor(x.k), logo: chLogo(x.k)}));
    if (!items.length){ h.innerHTML = '<div class="rp-err">No conversions in this period.</div>'; return; }
    const top = items.slice(0, 7), rest = items.slice(7);
    if (rest.length) top.push({k: '', n: rest.reduce((t, x) => t + x.n, 0), label: 'Other', color: '#c3ccd3'});
    top.forEach((x, i) => { x.color = sc(ctx, x.color, i); });
    h.innerHTML = '<div class="rp-donutrow">' + donut(top.map(x => ({key: x.k, label: x.label, n: x.n, color: x.color})), {sub: 'conversions'}) + legendRows(top, tot, {click: ctx.drill}) + '</div>';
    onClick(h, '[data-l]', el => DRILL.conv(ctx, {channel: el.dataset.l}));
  }};
W.conv_by_event = {g: 'conv', t: 'Conversions by type', d: 'Each kind of conversion (form, call, booking…) and how many.', size: 'm', needs: ['g4'],
  render(h, ctx, w, D){
    const S = g4Split(ctx, D.g4), cur = group(S.conv, r => r[3], 5), prev = group(S.convPrev, r => r[3], 5);
    const max = Math.max(1, ...cur.map(x => x.n));
    table(h, cur.map(x => Object.assign(x, {p: (prev.find(y => y.k === x.k) || {n: 0}).n})), [
      {key: 'k', label: 'Conversion', fmt: r => esc(keLabel(r.k)) + (ctx.internal ? ' <span style="color:var(--a-ink3);font-size:11px">' + esc(r.k) + '</span>' : '')},
      {key: 'n', label: 'Count', num: true, fmt: r => barCell(r.n, max, '#0f7a58')},
      {key: 'p', label: 'Change', num: true, fmt: r => { const d = delta(r.n, r.p, S.hasPrev); return d.txt ? '<span class="aiv-delta ' + d.cls + '">' + esc(d.txt) + '</span>' : '—'; }}
    ], {sort: 'n', empty: 'No conversions in this period.', onRow: ctx.drill ? r => DRILL.conv(ctx, {event: r.k}) : null});
  }};
W.conv_by_page = {g: 'conv', t: 'Pages that convert', d: 'Landing pages ranked by the conversions that started there.', size: 'l', needs: ['g4'],
  render(h, ctx, w, D){
    const S = g4Split(ctx, D.g4);
    const m = {};
    S.conv.forEach(r => { const k = pageKey(r[4]); const o = m[k] = m[k] || {k, n: 0, ev: {}}; o.n += r[5]; o.ev[r[3]] = (o.ev[r[3]] || 0) + r[5]; });
    const rows = Object.values(m).sort((a, b) => b.n - a.n), max = Math.max(1, ...rows.map(x => x.n));
    table(h, rows, [
      {key: 'k', label: 'Landing page', fmt: r => '<span class="aiv-page">' + esc(r.k) + '</span>'},
      {key: 'top', label: 'Mostly', fmt: r => esc(keLabel(Object.keys(r.ev).sort((a, b) => r.ev[b] - r.ev[a])[0])), sort: r => Object.keys(r.ev)[0]},
      {key: 'n', label: 'Conversions', num: true, fmt: r => barCell(r.n, max, '#0f7a58')}
    ], {sort: 'n', empty: 'No conversions in this period.', maxH: 380, onRow: ctx.drill ? r => DRILL.conv(ctx, {page: r.k}) : null});
  }};
W.conv_ai = {g: 'conv', t: 'Conversions from AI assistants', d: 'Conversions by visitors ChatGPT, Perplexity, Gemini and others sent, by assistant and type.', size: 'l', needs: ['g4'],
  render(h, ctx, w, D){
    const S = g4Split(ctx, D.g4), rows = S.conv.filter(r => isAi(r[1])), prev = S.convPrev.filter(r => isAi(r[1]));
    const tot = sum(rows, 5);
    if (!tot){ h.innerHTML = bigNum('0', null, 'No conversions from AI assistants in this period' + (sum(prev, 5) ? ' (' + fmt(sum(prev, 5)) + ' in the previous one).' : '.')); return; }
    const byA = group(rows, r => r[1], 5), byE = group(rows, r => r[3], 5);
    h.innerHTML = bigNum(fmt(tot), delta(tot, sum(prev, 5), S.hasPrev), pctS(tot, sum(S.conv, 5)) + ' of all conversions') +
      '<div class="aiv-grid2" style="margin-top:12px"><div>' + legendRows(byA.map((x, i) => ({k: x.k, n: x.n, label: x.k.slice(4), color: sc(ctx, chColor(x.k), i), logo: x.k.slice(4)})), tot, {click: ctx.drill}) + '</div>' +
      '<div class="rp-legend">' + byE.map(x => '<div><i style="background:' + (ctx.aa ? '#171614' : '#0f7a58') + '"></i><span>' + esc(keLabel(x.k)) + '</span><b>' + fmt(x.n) + '</b></div>').join('') + '</div></div>';
    onClick(h, '[data-l]', el => DRILL.conv(ctx, {channel: el.dataset.l}));
    if (ctx.drill){ h.querySelector('.rp-big').style.cursor = 'pointer'; h.querySelector('.rp-big').addEventListener('click', () => DRILL.conv(ctx, {ai: true})); }
  }};
W.conv_list = {g: 'conv', t: 'Conversion log', d: 'Every conversion in the period: date, type, channel, source and landing page.', size: 'xl', needs: ['g4'],
  render(h, ctx, w, D){
    const S = g4Split(ctx, D.g4);
    table(h, S.conv.map(r => ({d: r[0], ch: r[1], src: r[2], ev: r[3], pg: r[4], n: r[5]})), [
      {key: 'd', label: 'Date', fmt: r => esc(shortDate(r.d))},
      {key: 'ev', label: 'Conversion', fmt: r => esc(keLabel(r.ev))},
      {key: 'ch', label: 'Channel', fmt: r => chLabel(r.ch)},
      {key: 'src', label: 'Source', fmt: r => esc(r.src === '(direct)' ? 'Direct' : r.src)},
      {key: 'pg', label: 'Landing page', fmt: r => '<span class="aiv-page">' + esc(pageKey(r.pg)) + '</span>'},
      {key: 'n', label: 'Count', num: true}
    ], {sort: 'd', empty: 'No conversions in this period.', maxH: 420, onRow: ctx.drill ? r => DRILL.conv(ctx, {event: r.ev, channel: r.ch}) : null});
  }};

/* ---------- Form submissions (website forms, live and imported) ----------
   forms payload: rows [{t 'YYYY-MM-DDTHH:mm', form, page, channel, sm, campaign, land, origin 'live'|'import',
   and with the team key only: name, email, phone, company, message, fields {label: value}, ref, id}], first, details. */
const FS_CH = {'Organic Search': '#1baf7a', 'Paid Search': '#eda100', Direct: '#2a78d6', Referral: '#e87ba4', 'Organic Social': '#6250d6', 'Paid Social': '#e34948',
  Email: '#8a5a00', 'AI assistants': '#eb6834', 'Other campaign': '#0b8fa3', 'Not tracked yet': '#c3ccd3'};
const FS_FORM = ['#2a78d6', '#0f7a58', '#eda100', '#6250d6', '#e87ba4', '#0b8fa3'];
const fsChColor = c => FS_CH[c] || '#9aa5b1';
const fsDay = r => String(r.t || '').slice(0, 10);
const fsWhen = r => prettyDate(fsDay(r)) + (String(r.t || '').length > 10 ? ' · ' + String(r.t).slice(11, 16) : '');
function formsModel(ctx, F){
  const rows = (F && Array.isArray(F.rows) ? F.rows : []).filter(r => r && r.t), R = ctx.R;
  const cur = rows.filter(r => fsDay(r) >= R.since && fsDay(r) <= R.end), prev = rows.filter(r => fsDay(r) >= R.prevSince && fsDay(r) <= R.prevEnd);
  const count = (list, key) => { const m = {}; list.forEach(r => { const k = r[key] || '—'; m[k] = (m[k] || 0) + 1; }); return Object.keys(m).map(k => ({k, n: m[k]})).sort((a, b) => b.n - a.n); };
  const forms = count(rows, 'form').map(x => x.k);
  const live = rows.filter(r => r.origin === 'live').map(fsDay).sort();
  return {rows, cur, prev, count, forms, details: !!(F && F.details), first: (F && F.first) || '', liveSince: live[0] || '', hasPrev: !!(F && F.first && F.first <= R.prevEnd)};
}
/* One submission, every field. */
function fsOpen(ctx, r, M){
  const color = FS_FORM[Math.max(0, M.forms.indexOf(r.form)) % FS_FORM.length];
  U.openDrawer((r.name || r.form) + ' · ' + fsWhen(r), color, body => {
    const f = r.fields || {};
    const src = r.channel === 'Not tracked yet' && (r.origin === 'import' || r.origin === 'easyleads')
      ? '<p class="aiv-cap">' + (r.origin === 'easyleads' ? 'GoHighLevel didn’t record where this visitor came from.' : 'Sent before source tracking was added, so where this visitor came from isn’t known.') + '</p>'
      : '<table class="aiv-table"><tbody>' + [['Channel', esc(r.channel || '—')], ['Source / medium', esc(r.sm || '—')], ['Campaign', esc(r.campaign || '—')],
        ['First page they landed on', r.land ? '<span class="aiv-page">' + esc(r.land) + '</span>' : '—'], ['Came from', esc(r.ref || '—')]].map(x => '<tr><td style="width:38%;color:var(--a-ink3)">' + x[0] + '</td><td>' + x[1] + '</td></tr>').join('') + '</tbody></table>';
    body.innerHTML = statsRow([['Form', esc(r.form)], ['Sent', esc(fsWhen(r))], ['Page', r.page ? esc(r.page) : '—'], ['Channel', esc(r.channel || '—')]]) +
      '<div class="aiv-card"><h3>What they sent</h3><table class="aiv-table" style="margin-top:8px"><tbody>' +
      (Object.keys(f).length ? Object.keys(f).map(k => '<tr><td style="width:38%;color:var(--a-ink3);vertical-align:top">' + esc(k) + '</td><td style="white-space:pre-wrap">' +
        (/e-?mail/i.test(k) && /@/.test(f[k]) ? '<a href="mailto:' + esc(f[k]) + '">' + esc(f[k]) + '</a>' : /phone|tel/i.test(k) ? '<a href="tel:' + esc(String(f[k]).replace(/[^\d+]/g, '')) + '">' + esc(f[k]) + '</a>' : esc(f[k])) + '</td></tr>').join('')
        : '<tr><td>No fields were kept.</td></tr>') + '</tbody></table></div>' +
      '<div class="aiv-card"><h3>Where they came from</h3><div style="margin-top:8px">' + src + '</div></div>';
  });
}
W.forms = {g: 'conv', t: 'Form submissions', d: 'Every website form submission: how many, which form, where the visitor came from, and (team only) who sent it.', size: 'xl', needs: ['forms'],
  render(h, ctx, w, D){
    const M = formsModel(ctx, D.forms), EL = !!D.el;
    /* Forms are few a day, so long periods are grouped by month. */
    const monthly = ctx.R.days > 120;
    const B = monthly ? (() => { const labels = []; for (let d = ctx.R.since.slice(0, 8) + '01'; d <= ctx.R.end; d = isoDay(new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7), 1)))) labels.push(d);
      const idx = {}; labels.forEach((d, i) => { idx[d.slice(0, 7)] = i; }); return {labels, slot: d => idx[String(d).slice(0, 7)], zero: () => labels.map(() => 0)}; })() : buckets(ctx.R);
    const cf = w.cfg = w.cfg || {};
    let fForm = '', fCh = '', q = '';
    const tot = M.cur.length;
    const byForm = M.count(M.cur, 'form'), byCh = M.count(M.cur, 'channel'), prevForm = M.count(M.prev, 'form');
    const tiles = [kpiTile('Submissions', fmt(tot), esc(ctx.R.label || ''), {d: delta(tot, M.prev.length, M.hasPrev), icon: glyph('table', 18, '#0f7a58')})]
      .concat(M.forms.slice(0, 3).map((k, i) => { const n = (byForm.find(x => x.k === k) || {n: 0}).n, p = (prevForm.find(x => x.k === k) || {n: 0}).n;
        return kpiTile(k, fmt(n), 'form', {d: delta(n, p, M.hasPrev), click: 'f:' + k}); }));
    h.innerHTML = '<div class="rp-kpis">' + tiles.join('') + '</div>' +
      '<div data-ch style="margin-top:14px"></div>' +
      '<div class="aiv-grid2" style="margin-top:14px"><div><h4 class="rp-fs-h">By channel</h4><div data-bych></div></div><div><h4 class="rp-fs-h">Pages the forms were sent from</h4><div data-bypg></div></div></div>' +
      '<div style="margin-top:14px"><div class="aiv-filters rp-fs-bar"><h4 class="rp-fs-h" style="margin:0;flex:1">' + (M.details ? 'Every submission' : 'Submissions') + '</h4>' +
      (M.details ? '<input type="search" data-q placeholder="Find a name, email, company…" aria-label="Find a submission">' : '') +
      '<select data-ff aria-label="Form"><option value="">All forms</option>' + M.forms.map(k => '<option value="' + esc(k) + '">' + esc(k) + '</option>').join('') + '</select>' +
      '<select data-fc aria-label="Channel"><option value="">All channels</option>' + byCh.map(x => '<option value="' + esc(x.k) + '">' + esc(x.k) + '</option>').join('') + '</select></div><div data-list></div></div>' +
      '<p class="aiv-foot">' + (EL ? 'Easyleads (GoHighLevel) forms' : 'Website forms') + ', ' + esc(ctx.R.text || '') + '. ' + (M.first ? 'On file since ' + esc(prettyDate(M.first)) + '. ' : '') +
      (EL ? 'Read from GoHighLevel every hour: past submissions included. Channel and landing page come from what GoHighLevel recorded with each one; “Not tracked yet” means it recorded none.' : M.liveSince ? 'Channel and landing page are recorded for submissions from ' + esc(prettyDate(M.liveSince)) + ' on; older ones were imported from the website and show “Not tracked yet”.' : 'Older submissions were imported from the website; channel and landing page are recorded from now on.') +
      (M.details && ctx.drill ? ' Names, emails, phones and messages show on the team report only, unless the client report lets the client click into them.' : '') + '</p>';
    /* Over time, by form. */
    const series = [{name: 'All submissions', color: '#0f7a58', values: B.zero(), area: true}].concat(M.forms.slice(0, 4).map((k, i) => ({name: k, color: FS_FORM[i % FS_FORM.length], values: B.zero()})));
    M.cur.forEach(r => { const i = B.slot(fsDay(r)); if (i == null) return; series[0].values[i]++; const j = M.forms.indexOf(r.form); if (j > -1 && j < 4) series[j + 1].values[i]++; });
    chart(h.querySelector('[data-ch]'), {labels: B.labels, weekly: monthly || ctx.R.weekly, height: 210, series, empty: 'No form submissions in this period.'}, ctx, w);
    const tc = byCh.slice(0, 7).map((x, i) => ({k: x.k, n: x.n, label: x.k, color: sc(ctx, fsChColor(x.k), i)}));
    h.querySelector('[data-bych]').innerHTML = tc.length ? '<div class="rp-donutrow">' + donut(tc.map(x => ({key: x.k, label: x.label, n: x.n, color: x.color})), {sub: 'submissions'}) + legendRows(tc, tot, {click: true}) + '</div>' : '<div class="rp-err">No form submissions in this period.</div>';
    const pg = {}; M.cur.forEach(r => { const k = r.page || '—'; const o = pg[k] = pg[k] || {k, n: 0, land: {}}; o.n++; if (r.land) o.land[r.land] = (o.land[r.land] || 0) + 1; });
    const pgs = Object.values(pg).sort((a, b) => b.n - a.n), maxP = Math.max(1, ...pgs.map(x => x.n));
    table(h.querySelector('[data-bypg]'), pgs, [
      {key: 'k', label: 'Page', fmt: r => '<span class="aiv-page">' + esc(r.k) + '</span>'},
      {key: 'n', label: 'Submissions', num: true, fmt: r => barCell(r.n, maxP, '#0f7a58')}], {sort: 'n', empty: 'None in this period.', maxH: 240});
    const sF = h.querySelector('[data-ff]'), sC = h.querySelector('[data-fc]'), sQ = h.querySelector('[data-q]');
    const list = () => {
      const t = q.trim().toLowerCase();
      const rows = M.cur.filter(r => (!fForm || r.form === fForm) && (!fCh || r.channel === fCh) &&
        (!t || [r.name, r.email, r.phone, r.company, r.message, r.page].concat(Object.values(r.fields || {})).join(' ').toLowerCase().indexOf(t) > -1));
      const cols = [{key: 't', label: 'Sent', fmt: r => esc(fsWhen(r))}, {key: 'form', label: 'Form', fmt: r => '<i class="rp-fs-dot" style="background:' + FS_FORM[Math.max(0, M.forms.indexOf(r.form)) % FS_FORM.length] + '"></i>' + esc(r.form)}];
      if (M.details) cols.push({key: 'name', label: 'Name', fmt: r => esc(r.name || '—') + (r.company ? '<div class="rp-fs-sub">' + esc(r.company) + '</div>' : '')},
        {key: 'email', label: 'Contact', fmt: r => esc(r.email || '') + (r.phone ? '<div class="rp-fs-sub">' + esc(r.phone) + '</div>' : '')},
        {key: 'message', label: 'Message', fmt: r => '<span class="rp-fs-msg">' + esc(String(r.message || '').slice(0, 140)) + '</span>'});
      cols.push({key: 'channel', label: 'Channel', fmt: r => '<span class="rp-fs-ch" style="--c:' + fsChColor(r.channel) + '">' + esc(r.channel || '—') + '</span>' + (r.sm && r.channel !== 'Direct' ? '<div class="rp-fs-sub">' + esc(r.sm) + '</div>' : '')});
      if (!M.details) cols.push({key: 'page', label: 'Page', fmt: r => '<span class="aiv-page">' + esc(r.page || '—') + '</span>'});
      table(h.querySelector('[data-list]'), rows, cols, {sort: 't', empty: 'No submissions match.', maxH: chH(w, 460, 0) > 460 ? 640 : 460, onRow: M.details ? r => fsOpen(ctx, r, M) : null});
    };
    sF.addEventListener('change', () => { fForm = sF.value; list(); });
    sC.addEventListener('change', () => { fCh = sC.value; list(); });
    if (sQ) sQ.addEventListener('input', () => { q = sQ.value; list(); });
    onClick(h, '[data-k]', el => { const k = el.dataset.k; if (k.indexOf('f:') === 0){ fForm = fForm === k.slice(2) ? '' : k.slice(2); sF.value = fForm; list(); } });
    onClick(h, '[data-l]', el => { fCh = fCh === el.dataset.l ? '' : el.dataset.l; sC.value = fCh; list(); });
    list();
fxShareBox(h, ctx, w);
  }};

/* ---------- Traffic ---------- */
W.traffic_kpis = {g: 'traffic', t: 'Traffic summary', d: 'Sessions, users, engagement and conversion rate.', size: 'xl', needs: ['g4'],
  render(h, ctx, w, D){
    const S = g4Split(ctx, D.g4), t = S.traffic, p = S.trafficPrev;
    const s = sum(t, 2), e = sum(t, 3), k = sum(t, 5);
    h.innerHTML = '<div class="rp-kpis">' +
      kpiTile('Sessions', fmt(s), '', {d: delta(s, sum(p, 2), S.hasPrev), click: ctx.drill && 'all'}) +
      kpiTile('Users', fmt(sum(t, 4)), '', {d: delta(sum(t, 4), sum(p, 4), S.hasPrev)}) +
      kpiTile('Engagement rate', pctS(e, s), fmt(e) + ' engaged sessions', {}) +
      kpiTile('Conversion rate', pctS(k, s), fmt(k) + ' conversions', {click: ctx.drill && 'conv'}) + '</div>';
    onClick(h, '[data-k]', el => el.dataset.k === 'conv' ? DRILL.conv(ctx, {}) : DRILL.channel(ctx, ''));
  }};
W.traffic_trend = {g: 'traffic', t: 'Sessions by channel', d: 'Organic, direct, paid, referral and AI visits over time.', size: 'l', needs: ['g4'],
  render(h, ctx, w, D){
    const S = g4Split(ctx, D.g4), B = buckets(ctx.R);
    const chans = group(S.traffic, r => r[1], 2).slice(0, 6).map(x => x.k);
    const series = chans.map(c => ({name: chName(c), color: chColor(c), values: B.zero()}));
    S.traffic.forEach(r => { const i = B.slot(r[0]), j = chans.indexOf(r[1]); if (i != null && j > -1) series[j].values[i] += r[2]; });
    fillBody(h, ctx, w);
    chart(h, {labels: B.labels, weekly: ctx.R.weekly, height: chH(w, 230, 70), series, empty: 'No sessions recorded in this period.', onClick: ctx.drill ? () => DRILL.channel(ctx, '') : null}, ctx, w);
  }};
W.traffic_channels = {g: 'traffic', t: 'Channels table', d: 'Each channel’s sessions, engagement, conversions and conversion rate.', size: 'l', needs: ['g4'],
  render(h, ctx, w, D){
    const S = g4Split(ctx, D.g4), m = {};
    S.traffic.forEach(r => { const o = m[r[1]] = m[r[1]] || {k: r[1], s: 0, e: 0, k2: 0, p: 0}; o.s += r[2]; o.e += r[3]; o.k2 += r[5]; });
    S.trafficPrev.forEach(r => { const o = m[r[1]] = m[r[1]] || {k: r[1], s: 0, e: 0, k2: 0, p: 0}; o.p += r[2]; });
    const rows = Object.values(m).filter(x => x.s || x.p), max = Math.max(1, ...rows.map(x => x.s));
    table(h, rows, [
      {key: 'k', label: 'Channel', fmt: r => chLabel(r.k)},
      {key: 's', label: 'Sessions', num: true, fmt: r => barCell(r.s, max, chColor(r.k))},
      {key: 'p', label: 'Change', num: true, fmt: r => { const d = delta(r.s, r.p, S.hasPrev); return d.txt ? '<span class="aiv-delta ' + d.cls + '">' + esc(d.txt) + '</span>' : '—'; }},
      {key: 'e', label: 'Engaged', num: true, fmt: r => pctS(r.e, r.s)},
      {key: 'k2', label: 'Conversions', num: true, fmt: r => fmt(r.k2)},
      {key: 'cr', label: 'Conv. rate', num: true, fmt: r => pctS(r.k2, r.s), sort: r => pct(r.k2, r.s)}
    ], {sort: 's', empty: 'No sessions in this period.', onRow: ctx.drill ? r => DRILL.channel(ctx, r.k) : null});
  }};

/* ---------- Page performance (GA4, every page, with the sitemap) ----------
   pages: [[path, title, cur[7], prev[7]]], columns views, users, sessions
   (started on the page), engaged sessions, key events on the page, key events
   in visits that started there, engagement seconds. Sitemap pages with no
   visits are listed too, so every page can be searched and picked. */
const PGI = {v: 0, u: 1, s: 2, e: 3, k: 4, ek: 5, t: 6};
const PG0 = [0, 0, 0, 0, 0, 0, 0];
const pgDur = sec => { sec = Math.round(sec || 0); return !sec ? '—' : sec < 60 ? sec + 's' : Math.floor(sec / 60) + 'm ' + String(sec % 60).padStart(2, '0') + 's'; };
function pagesModel(P){
  P = P || {};
  const sm = new Set(Array.isArray(P.sitemap) ? P.sitemap : []);
  const arr = a => Array.isArray(a) && a.length === 7 ? a.map(v => Number(v) || 0) : PG0;
  const rows = (Array.isArray(P.pages) ? P.pages : []).filter(p => Array.isArray(p) && p[0]).map(p => ({k: String(p[0]), title: String(p[1] || ''), c: arr(p[2]), p: arr(p[3]), sm: sm.has(String(p[0]))}));
  const seen = new Set(rows.map(r => r.k));
  sm.forEach(k => { if (!seen.has(k)) rows.push({k, title: '', c: PG0, p: PG0, sm: true}); });
  rows.forEach(r => { r.s = r.c[PGI.s]; r.v = r.c[PGI.v]; r.u = r.c[PGI.u]; r.kk = r.c[PGI.k]; r.ps = r.p[PGI.s];
    r.t = r.u ? r.c[PGI.t] / r.u : 0; r.hay = (r.k + ' ' + r.title).toLowerCase(); });
  return {rows, hasSm: sm.size > 0, smCount: sm.size, from: String(P.sitemapFrom || ''), hasPrev: rows.some(r => r.p.some(Boolean))};
}
const pgPath = r => '<span class="rp-pg-path">' + esc(r.k) + '</span>' + (r.title ? '<span class="rp-pg-title">' + esc(r.title) + '</span>' : '');
W.ga4_pages = {g: 'traffic', t: 'Page performance', d: 'Sessions, views, users and key events for every page (GA4). Search any page, including sitemap pages with no visits yet.', size: 'xl', needs: ['pages'],
  render(h, ctx, w, D){
    const M = pagesModel(D.pages);
    const cf = w.cfg = w.cfg || {};
    const fixedH = !!(w.h || (ctx.fillOf && ctx.fillOf(w)));
    let q = '', filt = 'all', sel = M.rows.some(r => r.k === cf.page) ? cf.page : '', hi = -1;
    const FILTERS = [['all', 'All pages'], ['visited', 'With visits']].concat(M.hasSm ? [['nosm', 'Not in sitemap'], ['dead', 'Sitemap, no visits']] : []);
    h.innerHTML = '<div class="rp-pg">' +
      '<div class="rp-pg-bar"><label class="rp-pg-search">' + glyph('search', 15) +
        '<input type="search" data-q placeholder="Search a page' + (M.hasSm ? ' (every page in the sitemap is listed)' : '') + '…" autocomplete="off" spellcheck="false" aria-label="Search pages"></label>' +
        '<div class="rp-pg-filt">' + FILTERS.map(f => '<button type="button" class="aiv-chip' + (f[0] === filt ? '' : ' off') + '" data-f="' + f[0] + '">' + esc(f[1]) + '</button>').join('') + '</div></div>' +
      '<div class="rp-pg-sug" data-sug hidden role="listbox"></div>' +
      '<div data-sel></div><div data-tbl></div>' +
      '<p class="aiv-foot" data-foot></p></div>';
    const $ = s => h.querySelector(s);
    const inp = $('[data-q]'), sug = $('[data-sug]'), selBox = $('[data-sel]'), tbl = $('[data-tbl]');
    $('[data-foot]').innerHTML = 'GA4, ' + esc(ctx.R.text) + '. Sessions and engagement count visits that started on the page; views, users and key events count everything that happened on it.' +
      (M.hasSm ? ' Sitemap: ' + fmt(M.smCount) + ' pages' + (M.from ? ' (' + esc(shortUrl(M.from)) + ')' : '') + '.' : ' No XML sitemap was found for this site, so only pages with visits are listed.');

    const matches = () => {
      const t = q.trim().toLowerCase();
      return M.rows.filter(r => (!t || r.hay.indexOf(t) > -1) &&
        (filt === 'all' || (filt === 'visited' && (r.s || r.v)) || (filt === 'nosm' && !r.sm) || (filt === 'dead' && r.sm && !r.s && !r.v)));
    };
    const pick = k => {
      sel = k; hi = -1; sug.hidden = true;
      if (sel) cf.page = sel; else delete cf.page;
      if (ctx.saveItem) ctx.saveItem(w);
      drawSel();
      if (sel) h.closest('.rp-w') && h.closest('.rp-w').scrollIntoView({block: 'nearest', behavior: 'smooth'});
    };
    const drawSug = () => {
      const t = q.trim().toLowerCase();
      if (document.activeElement !== inp){ sug.hidden = true; return; }
      const list = M.rows.filter(r => !t || r.hay.indexOf(t) > -1).sort((a, b) => (b.s + b.v) - (a.s + a.v) || (a.k < b.k ? -1 : 1)).slice(0, 60);
      if (!list.length){ sug.innerHTML = '<div class="rp-pg-none">No page matches “' + esc(q) + '”.</div>'; sug.hidden = false; return; }
      sug.innerHTML = list.map((r, i) => '<button type="button" role="option" data-k="' + esc(r.k) + '" class="' + (i === hi ? 'on' : '') + '">' +
        '<span class="rp-pg-sl">' + pgPath(r) + '</span><span class="rp-pg-sm">' + (r.s || r.v ? fmt(r.s) + ' sessions · ' + fmt(r.v) + ' views' : 'no visits') + (r.sm ? '<em>sitemap</em>' : '') + '</span></button>').join('');
      sug.hidden = false;
      sug.querySelectorAll('button').forEach(b => b.addEventListener('mousedown', e => { e.preventDefault(); pick(b.dataset.k); inp.value = ''; q = ''; inp.blur(); drawTbl(); }));
    };
    const drawTbl = () => {
      const rows = matches();
      const max = Math.max(1, ...rows.map(r => r.s));
      table(tbl, rows, [
        {key: 'k', label: 'Page', fmt: pgPath, sort: r => r.k},
        {key: 's', label: 'Sessions', num: true, fmt: r => barCell(r.s, max, '#2a78d6')},
        {key: 'ps', label: 'Change', num: true, fmt: r => { const d = delta(r.s, r.ps, M.hasPrev); return d.txt ? '<span class="aiv-delta ' + d.cls + '">' + esc(d.txt) + '</span>' : '—'; }, sort: r => r.ps ? (r.s - r.ps) / r.ps : (r.s ? 9e9 : 0)},
        {key: 'v', label: 'Views', num: true, fmt: r => fmt(r.v)},
        {key: 'u', label: 'Users', num: true, fmt: r => fmt(r.u)},
        {key: 'kk', label: 'Key events', num: true, fmt: r => fmt(r.kk)},
        {key: 't', label: 'Avg. time', num: true, fmt: r => pgDur(r.t)}
      ], {sort: 's', limit: 500, maxH: fixedH ? 0 : 460,
        empty: q ? 'No page matches “' + q + '”.' : filt === 'dead' ? 'Every page in the sitemap had visits in this period.' : 'No pages recorded in this period.',
        onRow: r => pick(r.k)});
      if (fixedH) tbl.querySelectorAll('.aiv-scroll').forEach(x => { x.style.maxHeight = 'none'; });
      const n = rows.length;
      const cnt = h.querySelector('[data-f="' + filt + '"]');
      h.querySelectorAll('[data-f]').forEach(b => { b.title = b === cnt ? fmt(n) + ' pages' : ''; });
    };
    const drawSel = () => {
      const r = M.rows.find(x => x.k === sel);
      if (!r){ selBox.innerHTML = ''; return; }
      const c = r.c, p = r.p, d = (a, b) => delta(a, b, M.hasPrev);
      const href = 'https://' + ctx.domain + encodeURI(r.k === '/' ? '/' : r.k);
      selBox.innerHTML = '<div class="rp-pg-detail"><div class="rp-pg-dh"><div class="rp-pg-dt">' +
          '<a href="' + esc(href) + '" target="_blank" rel="noopener noreferrer" class="rp-pg-dp">' + esc(r.k) + ' ↗</a>' +
          (r.title ? '<div class="rp-pg-title">' + esc(r.title) + '</div>' : '') + '</div>' +
          (r.sm ? '<span class="rp-pg-badge">In sitemap</span>' : M.hasSm ? '<span class="rp-pg-badge warn">Not in sitemap</span>' : '') +
          '<button type="button" class="aiv-btn go" data-pw title="What visitors did after this page, and the key events they reached">' + glyph('path', 14) + 'Pathway</button>' +
          '<button type="button" class="aiv-btn" data-clear title="Back to every page">✕ Close</button></div>' +
        '<div class="rp-kpis">' +
          kpiTile('Sessions', fmt(c[PGI.s]), 'visits that started here', {d: d(c[PGI.s], p[PGI.s])}) +
          kpiTile('Views', fmt(c[PGI.v]), 'times the page was viewed', {d: d(c[PGI.v], p[PGI.v])}) +
          kpiTile('Users', fmt(c[PGI.u]), 'people who saw it', {d: d(c[PGI.u], p[PGI.u])}) +
          kpiTile('Key events', fmt(c[PGI.k]), 'on this page · ' + fmt(c[PGI.ek]) + ' in visits starting here · <u>see which</u>', {d: d(c[PGI.k], p[PGI.k]), click: 'keys'}) +
          kpiTile('Engagement rate', pctS(c[PGI.e], c[PGI.s]), fmt(c[PGI.e]) + ' engaged sessions', {}) +
          kpiTile('Avg. time on page', pgDur(r.t), 'engagement time per user', {}) +
        '</div><div class="rp-pg-extra" data-extra></div><div class="rp-pg-ch" data-ch>' + (ctx.loadPage ? '<div class="rp-load"><span class="aiv-spin"></span></div>' : '') + '</div></div>';
      selBox.querySelector('[data-clear]').addEventListener('click', () => pick(''));
      const ch = selBox.querySelector('[data-ch]'), extra = selBox.querySelector('[data-extra]');
      const want = sel;
      const pageP = ctx.loadPage ? ctx.loadPage(r.k) : Promise.reject(new Error('Day-by-day numbers need the live connection.'));
      let showing = '';
      const setBtn = () => { selBox.querySelectorAll('[data-k="keys"],[data-pw]').forEach(b => b.classList.toggle('on', (b.dataset.k || 'pw') === showing)); };
      /* Which key events (and other events) happened on this page. */
      selBox.querySelector('[data-k="keys"]').addEventListener('click', () => {
        if (showing === 'keys'){ showing = ''; extra.innerHTML = ''; setBtn(); return; }
        showing = 'keys'; setBtn();
        extra.innerHTML = '<div class="rp-load"><span class="aiv-spin"></span></div>';
        pageP.then(res => {
          if (want !== sel || showing !== 'keys') return;
          const ev = ((res && res.events) || []).filter(e => Array.isArray(e));
          const keys = ev.filter(e => e[2] > 0), other = ev.filter(e => !(e[2] > 0));
          const tr = (e, k) => '<tr><td>' + (k ? '<span class="rp-pg-key">★</span> ' : '') + esc(keLabel(e[0])) + ' <span class="rp-pw-ev">' + esc(e[0]) + '</span></td><td class="num">' + fmt(k ? e[2] : e[1]) + '</td></tr>';
          extra.innerHTML = '<div class="rp-pg-panel"><div class="rp-pg-ph"><b>What happened on this page</b><span>' + esc(ctx.R.text) + '</span></div>' +
            (keys.length ? '<table class="aiv-table"><thead><tr><th>Key event</th><th class="num">Times</th></tr></thead><tbody>' + keys.map(e => tr(e, true)).join('') + '</tbody></table>' : '<div class="aiv-empty">No key events fired on this page in this period.</div>') +
            (other.length ? '<details class="rp-pg-more"><summary>Other events on the page (' + other.length + ')</summary><table class="aiv-table"><tbody>' + other.map(e => tr(e, false)).join('') + '</tbody></table></details>' : '') + '</div>';
        }).catch(e => { if (showing === 'keys') extra.innerHTML = '<div class="rp-err">' + esc(e.message || String(e)) + '</div>'; });
      });
      /* Where visitors went after this page, step by step, with the key events they reached. */
      selBox.querySelector('[data-pw]').addEventListener('click', () => {
        if (showing === 'pw'){ showing = ''; extra.innerHTML = ''; setBtn(); return; }
        showing = 'pw'; setBtn();
        extra.innerHTML = '<div class="rp-load"><span class="aiv-spin"></span></div>';
        ctx.get('pathway').then(P => {
          if (want !== sel || showing !== 'pw') return;
          const PM = pathwayModel(P);
          const isLand = !!PM.land[r.k];
          let mode = 'page';
          const open = new Set();
          extra.innerHTML = '<div class="rp-pg-panel"><div class="rp-pg-ph"><b>Pathway from ' + esc(r.k) + '</b>' +
            (isLand ? '<span class="rp-pg-seg"><button type="button" class="aiv-chip" data-m="page">Everyone who viewed it</button><button type="button" class="aiv-chip off" data-m="land">Sessions that started here</button></span>' : '') + '</div>' +
            '<div class="rp-pg-from" data-from></div><div class="rp-pw-scroll" data-t></div><div data-pk></div>' +
            '<p class="aiv-foot">The first step is counted from page views whose previous page was this one; later steps (≈) are estimated. ★≈ on a page: key events from the visitors on that step, estimated. Click ★ for the list.</p></div>';
          const tbox = extra.querySelector('[data-t]'), kbox = extra.querySelector('[data-pk]');
          const from = (PM.inAll[r.k] || []).slice(0, 6);
          extra.querySelector('[data-from]').innerHTML = from.length ? '<span>Came from:</span> ' + from.map(f => '<em title="' + esc(f[0]) + '">' + esc(pwLabel(f[0])) + ' <b>' + fmt(f[1]) + '</b></em>').join('') : '';
          const onKeys = n => { kbox.innerHTML = '<div class="rp-pw-keys"><div class="rp-pw-kh"><b>' + esc(pwLabel(n.k)) + ' <span class="rp-pw-ev">' + esc(n.k) + '</span></b></div>' + pwKeysHtml(PM, n) + '</div>'; };
          const draw = () => {
            const root = mode === 'land'
              ? {k: r.k, v: PM.land[r.k].s, reached: PM.land[r.k].reached, depth: 1, mode: 'land', l: r.k, path: [r.k]}
              : {k: r.k, v: PM.views[r.k] || c[PGI.v] || 0, depth: 1, mode: 'page', path: [r.k]};
            open.add(r.k + '|' + (mode === 'land' ? r.k : ''));
            drawPathTree(tbox, ctx, PM, [root], {open, onToggle: draw, onKeys});
          };
          extra.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => {
            mode = b.dataset.m; open.clear(); kbox.innerHTML = '';
            extra.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('off', x !== b)); draw();
          }));
          draw();
        }).catch(e => { if (showing === 'pw') extra.innerHTML = '<div class="rp-err">The pathway couldn’t load: ' + esc(e.message || String(e)) + '</div>'; });
      });
      if (!ctx.loadPage){ ch.innerHTML = ''; return; }
      pageP.then(res => {
        if (want !== sel || !ch.isConnected) return;
        if (res && res.error) throw new Error(res.error);
        const B = buckets(ctx.R), mk = () => B.zero();
        const v = mk(), s = mk(), k = mk();
        ((res && res.series) || []).forEach(x => { const i = B.slot(x[0]); if (i == null) return; v[i] += Number(x[1]) || 0; s[i] += Number(x[3]) || 0; k[i] += Number(x[4]) || 0; });
        chart(ch, {labels: B.labels, weekly: ctx.R.weekly, height: 200, series: [
          {name: 'Views', color: '#2a78d6', values: v, area: true}, {name: 'Sessions', color: '#1baf7a', values: s}, {name: 'Key events', color: '#0f7a58', values: k, dash: true}],
          empty: 'No visits to this page in this period.'}, ctx, null);
      }).catch(e => { if (ch.isConnected) ch.innerHTML = '<div class="rp-err">The day-by-day chart couldn’t load: ' + esc(e.message || String(e)) + '</div>'; });
    };

    inp.addEventListener('input', () => { q = inp.value; hi = -1; drawSug(); drawTbl(); });
    inp.addEventListener('focus', drawSug);
    inp.addEventListener('blur', () => setTimeout(() => { sug.hidden = true; }, 120));
    inp.addEventListener('keydown', e => {
      const btns = sug.querySelectorAll('button');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); if (!btns.length) return; hi = (hi + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length; btns.forEach((b, i) => b.classList.toggle('on', i === hi)); btns[hi].scrollIntoView({block: 'nearest'}); }
      else if (e.key === 'Enter'){ e.preventDefault(); const b = btns[hi >= 0 ? hi : 0]; if (b){ pick(b.dataset.k); inp.value = ''; q = ''; inp.blur(); drawTbl(); } }
      else if (e.key === 'Escape'){ sug.hidden = true; }
    });
    h.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
      filt = b.dataset.f; h.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('off', x !== b)); drawTbl();
    }));
    drawSel(); drawTbl();
  }};

/* ---------- Pathways (GA4): where sessions start and where they go next ----------
   pathway payload: landings [[page, sessions, reached, keyEvents]], steps
   [[landing, from, to, views]] (moves inside sessions that started on landing),
   moves [[from, to, views]] (every session), views [[page, views]], keys
   [[page, event, count]], keyLand [[landing, event, sessions, count]].
   The step after a starting page (or after the page picked on Page
   performance) is counted; deeper steps are estimated from the moves out of
   each page, and show ≈. */
const PW_COLORS = ['#2a78d6', '#eda100', '#4a3aa7', '#e34948', '#1baf7a', '#e87ba4', '#0b8fa3', '#8a5a00'];
const pwGroup = {};
const pwColor = k => {
  if (k === '/') return '#2a78d6';
  const seg = (String(k).split('/')[1] || '').toLowerCase();
  if (/contact|quote|book|appointment|request|estimate|thank/.test(seg)) return '#e34948';
  if (/about|team|career|blog|news|resource|faq|project|portfolio|testimonial|review/.test(seg)) return '#4a3aa7';
  if (!(seg in pwGroup)) pwGroup[seg] = Object.keys(pwGroup).length;
  return [ '#eda100', '#1baf7a', '#0b8fa3', '#e87ba4', '#8a5a00', '#6250d6'][pwGroup[seg] % 6];
};
const pwLabel = k => {
  if (k === '/') return 'Homepage';
  const seg = String(k).split('/').filter(Boolean).pop() || k;
  let s = seg.replace(/\.(html?|php|aspx?)$/i, '').replace(/[-_+]+/g, ' ').trim();
  try { s = decodeURIComponent(s); }catch(e){}
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : k;
};
/* Key events that only record a page being seen ("about_page_visit", page_view, scroll…).
   Some GA4 setups mark these as key events; counted as conversions they make nearly every
   session "convert". Left out unless the widget is told to count them. */
const PW_MARKER = /(^|_)(page_?visit|page_?view|pageview|visit_page|scroll|session_start|first_visit|user_engagement)$|_page$|^page_|_visit$|^view_|_view$/i;
const PW_RESULT = /(^|_)(thank|thanks|thankyou|confirmation|confirmed|complete|completed|sent|submitted|received)(_|$)/i;
function pathwayModel(P, opt){
  P = P || {}; opt = opt || {};
  const A = a => Array.isArray(a) ? a.filter(Array.isArray) : [];
  const N = v => Number(v) || 0;
  const land = {}; A(P.landings).forEach(r => { land[String(r[0])] = {k: String(r[0]), s: N(r[1]), reached: N(r[2]), ke: N(r[3])}; });
  const steps = {}, inL = {};
  A(P.steps).forEach(r => {
    const l = String(r[0]), f = String(r[1]), t = String(r[2]), n = N(r[3]);
    ((steps[l] = steps[l] || {})[f] = steps[l][f] || []).push([t, n]);
    const m = inL[l] = inL[l] || {}; m[t] = (m[t] || 0) + n;
  });
  const moves = {}, inAll = {};
  A(P.moves).forEach(r => { const f = String(r[0]), t = String(r[1]), n = N(r[2]); (moves[f] = moves[f] || []).push([t, n]); (inAll[t] = inAll[t] || []).push([f, n]); });
  const views = {}; A(P.views).forEach(r => { views[String(r[0])] = N(r[1]); });
  const mk = Array.isArray(P.markers) ? new Set(P.markers.map(String)) : null;
  const isMarker = e => mk ? mk.has(String(e)) : !PW_RESULT.test(String(e)) && PW_MARKER.test(String(e));
  const hid = {}, real = r => { if (opt.all || !isMarker(r[1])) return true; hid[String(r[1])] = (hid[String(r[1])] || 0) + N(r[2]); return false; };
  const keys = {}; A(P.keys).filter(real).forEach(r => { (keys[String(r[0])] = keys[String(r[0])] || []).push([String(r[1]), N(r[2])]); });
  const keyLand = {}, keyTot = {};
  A(P.keyLand).filter(r => opt.all || !isMarker(r[1])).forEach(r => { (keyLand[String(r[0])] = keyLand[String(r[0])] || []).push([String(r[1]), N(r[2]), N(r[3])]); const o = keyTot[String(r[1])] = keyTot[String(r[1])] || [0, 0]; o[0] += N(r[2]); o[1] += N(r[3]); });
  const hidden = Object.keys(hid).map(k => [k, hid[k]]).sort((a, b) => b[1] - a[1]);
  /* "Reached" = distinct sessions with a key event. Without page-visit events it comes from the tracker's
     own count (landings[i][4], sessions with at least one real key event). Adding sessions up across
     events would count a session once per event, so an older payload falls back to the best single event
     (a floor, never more than the truth). */
  let reachedAll = N(P.reached);
  if (!opt.all){
    const exact = A(P.landings).some(r => r.length > 4);
    reachedAll = 0;
    Object.values(land).forEach(o => {
      const kl = keyLand[o.k] || [];
      o.reached = exact ? N((A(P.landings).find(r => String(r[0]) === o.k) || [])[4]) : Math.min(o.s, Math.max(0, ...kl.map(e => e[1])));
      o.ke = kl.reduce((t, e) => t + e[2], 0); reachedAll += o.reached;
    });
  }
  /* The page after a starting page: sessions from that start that fired a real key event on it (exact). */
  const stepKeys = {};
  if (!opt.all) A(P.stepKeys).forEach(r => { (stepKeys[String(r[0])] = stepKeys[String(r[0])] || {})[String(r[1])] = {s: N(r[2]), ev: A(r[3]).map(e => [String(e[0]), N(e[1]), N(e[2])])}; });
  const sortD = l => l.sort((a, b) => b[1] - a[1]);
  Object.values(steps).forEach(m => Object.values(m).forEach(sortD)); Object.values(moves).forEach(sortD); Object.values(inAll).forEach(sortD);
  const landings = A(P.landings).map(r => land[String(r[0])]);
  return {land, landings, steps, inL, moves, inAll, views, keys, keyLand, keyTot, stepKeys, hasStepKeys: Array.isArray(P.stepKeys), total: N(P.total), reached: reachedAll, hidden, allKeys: !!opt.all,
    channels: P.channels || null, channel: P.channel || 'all', thresholded: !!P.thresholded};
}
/* Next pages for a node. mode 'land': within sessions that started on node.l; mode 'page': every session. */
function pwKids(M, node){
  const MAXK = 10;
  let list = [], exact = node.depth <= 1, base = 0;
  if (node.mode === 'land'){
    const l = node.l, from = node.k;
    const raw = (M.steps[l] && M.steps[l][from]) || [];
    base = node.depth <= 1 ? node.v : (((M.inL[l] || {})[from] || 0) + (from === l ? (M.land[l] ? M.land[l].s : 0) : 0));
    if (raw.length && base) list = raw.map(r => [r[0], node.depth <= 1 ? Math.min(r[1], node.v) : node.v * r[1] / base]);
    else if (!raw.length && node.depth > 1){ const g = M.moves[from] || [], gv = M.views[from] || 0; if (gv) list = g.map(r => [r[0], node.v * r[1] / gv]); exact = false; }
  } else {
    const raw = M.moves[node.k] || [];
    base = node.depth <= 1 ? 0 : (M.views[node.k] || 0);
    list = node.depth <= 1 ? raw.map(r => [r[0], Math.min(r[1], node.v)]) : base ? raw.map(r => [r[0], node.v * r[1] / base]) : [];
  }
  const mg = {}; list.forEach(r => { mg[r[0]] = (mg[r[0]] || 0) + r[1]; });
  list = Object.keys(mg).map(k => [k, node.depth <= 1 ? Math.min(mg[k], node.v) : mg[k]]).sort((a, b) => b[1] - a[1]);
  /* Less than half a session rounds to 0: those flows count as "ended" and are not drawn, so the chart stops where visitors stop. */
  list = list.filter(r => r[1] >= 0.5 && r[0] !== node.k);
  const shown = list.slice(0, MAXK), rest = list.slice(MAXK);
  const stepK = (k) => exact && node.mode === 'land' && M.hasStepKeys && !M.allKeys ? ((M.stepKeys[node.l] || {})[k] || {s: 0, ev: []}) : null;
  const kids = shown.map(r => ({k: r[0], v: r[1], est: !exact, depth: node.depth + 1, mode: node.mode, l: node.l, path: node.path.concat(r[0]), step: stepK(r[0])}));
  /* Every other page is one click away: "N more pages" opens the full list. */
  if (rest.length){ const v = rest.reduce((t, r) => t + r[1], 0); kids.push({k: '', more: rest.length, v, est: !exact, depth: node.depth + 1, kind: 'more', l: node.l, mode: node.mode, path: node.path.concat('+more'),
    rest: rest.map(r => ({k: r[0], v: r[1], est: !exact, depth: node.depth + 1, mode: node.mode, l: node.l, path: node.path.concat(r[0]), step: stepK(r[0])}))}); }
  const went = list.reduce((t, r) => t + r[1], 0);
  const ended = node.v - went;
  if (ended >= 1 && node.v) kids.push({k: '', v: ended, est: !exact, depth: node.depth + 1, kind: 'end'});
  return kids;
}
const pwFmt = (v, est) => (est ? '≈' : '') + fmt(Math.round(v));
/* Draws the tree: roots (already built) in column 0; open nodes show their next step. */
function drawPathTree(host, ctx, M, roots, opts){
  opts = opts || {};
  const colW = 300, nodeW = 236, rowH = 40, padT = 14;
  const keyOf = n => n.path ? n.path.join('>') + '|' + (n.l || '') : '';
  const open = opts.open || new Set();
  const lay = [];
  let row = 0;
  const place = (n, col) => {
    n.col = col;
    n.again = !n.kind && !n.root && !!n.path && n.path.slice(0, -1).indexOf(n.k) > -1;
    const canOpen = n.kind === 'more' ? !!(n.rest && n.rest.length) : !n.kind && !n.again && n.depth < 12 && (n.root || Math.round(n.v) >= 1);
    n.canOpen = canOpen;
    if (canOpen && open.has(keyOf(n)) && !n.kids) n.kids = n.kind === 'more' ? n.rest : n.root && n.rootKids ? n.rootKids : pwKids(M, n);
    n.isOpen = canOpen && open.has(keyOf(n)) && n.kids && n.kids.length > 0;
    if (n.isOpen){
      const start = row;
      n.kids.forEach(k => place(k, col + 1));
      n.y = padT + ((start + row - 1) / 2) * rowH;
    } else { n.y = padT + row * rowH; row++; }
    lay.push(n);
  };
  roots.forEach(r => place(r, 0));
  const maxCol = Math.max(0, ...lay.map(n => n.col));
  const W = (maxCol + 1) * colW + 20, H = padT * 2 + Math.max(1, row) * rowH;
  const top = Math.max(1, ...roots.map(r => r.v));
  const sw = v => Math.max(1.5, Math.min(28, v / top * 28));
  let svg = '<svg class="rp-pw-svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Pathways">';
  lay.forEach(n => { if (!n.isOpen) return; n.kids.forEach(k => {
    const x1 = n.col * colW + nodeW, y1 = n.y + 15, x2 = k.col * colW, y2 = k.y + 15, mx = (x1 + x2) / 2;
    const c = k.kind === 'end' ? '#c3ccd3' : k.kind === 'more' ? '#d6dbe1' : pwColor(k.k);
    svg += '<path d="M' + x1 + ',' + y1 + ' C' + mx + ',' + y1 + ' ' + mx + ',' + y2 + ' ' + x2 + ',' + y2 + '" fill="none" stroke="' + c + '" stroke-opacity="' + (k.kind ? .5 : .38) + '" stroke-width="' + sw(k.v).toFixed(1) + '"' + (k.kind === 'end' ? ' stroke-dasharray="3 4"' : '') + '/>';
  }); });
  svg += '</svg>';
  let html = '<div class="rp-pw-canvas" style="width:' + W + 'px;height:' + H + 'px">' + svg;
  lay.forEach((n, i) => {
    const x = n.col * colW, kk = keyOf(n);
    const label = n.kind === 'end' ? 'Ended here' : n.kind === 'more' ? (n.isOpen ? 'All ' + n.more + ' other pages' : n.more + ' more pages: open the list') : n.label || pwLabel(n.k);
    const star = n.kind ? '' : n.reached != null ? (n.reached ? '<button type="button" class="rp-pw-star" data-ks="' + i + '" title="Sessions that started here and reached a key event">★' + fmt(n.reached) + '</button>' : '')
      : n.step ? (n.step.s ? '<button type="button" class="rp-pw-star" data-ks="' + i + '" title="Sessions that started on ' + esc(n.l) + ' and fired a key event on this page">★' + fmt(Math.min(n.step.s, Math.round(n.v) || n.step.s)) + '</button>' : '')
      : (pwEst(M, n) >= 0.5 ? '<button type="button" class="rp-pw-star hint" data-ks="' + i + '" title="About this many key events from the visitors on this path (the page’s key events per view × ' + fmt(Math.round(n.v)) + ' visits). Click for the list.">★≈' + fmt(Math.round(pwEst(M, n))) + '</button>' : '');
    html += '<div class="rp-pw-node' + (n.kind ? ' ' + n.kind : '') + (n.kind === 'more' && n.canOpen ? ' more-open' : '') + (n.isOpen ? ' open' : '') + (n.canOpen ? ' can' : '') + (n.root ? ' root' : '') + (n.again ? ' again' : '') + '" style="left:' + x + 'px;top:' + n.y + 'px;width:' + nodeW + 'px;--c:' + (n.kind ? '#aab2c0' : n.root && !n.k ? '#14213d' : pwColor(n.k)) + '" data-i="' + i + '"' +
      (n.k ? ' title="' + esc(n.k) + (n.again ? ' (already earlier on this path)' : '') + '"' : '') + '>' +
      (n.canOpen ? '<button type="button" class="rp-pw-tog" data-tog="' + esc(kk) + '" aria-label="' + (n.isOpen ? 'Close' : 'Open') + ' next step">' + (n.isOpen ? '−' : '+') + '</button>' : '<i class="rp-pw-dot"></i>') +
      '<span class="rp-pw-nm">' + esc(label) + '</span>' + star + '<span class="rp-pw-v">' + pwFmt(n.v, n.est) + '</span></div>';
  });
  html += '</div>';
  host.innerHTML = html;
  dragPan(host);
  host.querySelectorAll('[data-tog]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const k = b.dataset.tog;
    if (open.has(k)) open.delete(k); else open.add(k);
    (opts.onToggle || (() => drawPathTree(host, ctx, M, roots, Object.assign({}, opts, {open}))))(open);
  }));
  host.querySelectorAll('[data-ks]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); if (opts.onKeys) opts.onKeys(lay[Number(b.dataset.ks)]); }));
  return {open, cols: maxCol + 1};
}
/* Click and drag the chart to move it (mouse only; touch scrolls natively). A drag never counts as a click. */
function dragPan(el){
  if (!el || el.__pan) return;
  el.__pan = true;
  let sx = 0, sy = 0, sl = 0, st = 0, on = false, moved = false;
  el.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    if (!e.target.closest('button,input,a')) e.preventDefault(); /* no text selection while dragging */
    on = true; moved = false; sx = e.clientX; sy = e.clientY; sl = el.scrollLeft; st = el.scrollTop;
  });
  el.addEventListener('pointermove', e => {
    if (!on) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!moved && Math.abs(dx) + Math.abs(dy) < 5) return;
    if (!moved){ moved = true; el.classList.add('drag'); try { el.setPointerCapture(e.pointerId); }catch(x){} }
    el.scrollLeft = sl - dx; el.scrollTop = st - dy;
    e.preventDefault();
  });
  const stop = e => { if (!on) return; on = false; el.classList.remove('drag'); try { el.releasePointerCapture(e.pointerId); }catch(x){} };
  el.addEventListener('pointerup', stop); el.addEventListener('pointercancel', stop);
  el.addEventListener('click', e => { if (moved){ e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
}
/* Key events the visitors on one step of a path made on that page, estimated: the page's key events per
   view (everyone, this period) times the visits on this step. GA4 doesn't report events by path. */
const pwRate = (M, k) => { const v = M.views[k] || 0, f = M.keys[k] || []; return v ? f.reduce((t, e) => t + e[1], 0) / v : 0; };
const pwEst = (M, n) => n && n.k && !n.kind ? pwRate(M, n.k) * (Number(n.v) || 0) : 0;
/* Key events for one node: on this path (estimated), what fired on the page for everyone, and (for a starting page) what its sessions reached. */
function pwKeysHtml(M, n){
  const fired = M.keys[n.k] || [], reached = n.reached != null ? (M.keyLand[n.k] || []) : n.step ? n.step.ev : [];
  const hidNote = M.hidden && M.hidden.length && !M.allKeys ? '<p class="aiv-cap" style="margin-top:8px">Not counted: page-visit events marked as key events in GA4 (' + M.hidden.slice(0, 4).map(e => esc(e[0])).join(', ') + (M.hidden.length > 4 ? '…' : '') + '). They record a page being seen, not an action.</p>' : '';
  if (!fired.length && !reached.length) return '<div class="aiv-empty">No key events for this page in this period.</div>' + hidNote;
  const v = M.views[n.k] || 0;
  const row = (name, a, b) => '<tr><td>★ ' + esc(keLabel(name)) + ' <span class="rp-pw-ev">' + esc(name) + '</span></td><td class="num">' + a + '</td>' + (b != null ? '<td class="num">' + b + '</td>' : '') + '</tr>';
  let h = '';
  if (reached.length) h += '<h4>' + (n.step ? 'Sessions that started on ' + esc(n.l) + ' and fired a key event on ' + esc(n.k) : 'Sessions that started on ' + esc(n.k) + ' and reached a key event') + '</h4><div class="aiv-scroll" style="max-height:240px"><table class="aiv-table"><thead><tr><th>Key event</th><th class="num">Sessions</th><th class="num">Times</th></tr></thead><tbody>' +
    reached.map(r => row(r[0], fmt(r[1]), fmt(r[2]))).join('') + '</tbody></table></div>';
  if (fired.length && n.reached == null && !n.step && v) h += '<h4>From the ' + fmt(Math.round(n.v)) + ' visits on this path (estimated)</h4><div class="aiv-scroll" style="max-height:240px"><table class="aiv-table"><thead><tr><th>Key event</th><th class="num">About</th></tr></thead><tbody>' +
    fired.map(r => row(r[0], '≈' + fmt(Math.round(r[1] / v * n.v)))).join('') + '</tbody></table></div>';
  if (fired.length) h += '<h4>Everyone on ' + esc(n.k) + ' this period (' + fmt(v) + ' views)</h4><div class="aiv-scroll" style="max-height:240px"><table class="aiv-table"><thead><tr><th>Key event</th><th class="num">Times</th></tr></thead><tbody>' +
    fired.map(r => row(r[0], fmt(r[1]))).join('') + '</tbody></table></div>';
  return h + hidNote;
}
const PW_CH = [['all', 'All traffic'], ['organic', 'Organic'], ['paid', 'Paid'], ['direct', 'Direct'], ['referral', 'Referral'], ['other', 'Other']];
W.ga4_pathways = {g: 'traffic', t: 'Pathways', d: 'Where sessions start, where they go next and which key events they reach (GA4). Open any page for its next step.', size: 'xl', needs: ['pathway'],
  render(h, ctx, w, D){
    const cf = w.cfg = w.cfg || {};
    const mOpt = () => ({all: !!cf.allKeys});
    let ch = 'all', M = pathwayModel(D.pathway, mOpt()), q = '', allStarts = false, raw = D.pathway;
    let picked = Array.isArray(cf.starts) && cf.starts.length ? cf.starts.slice(0, 20) : null;
    const open = new Set();
    h.innerHTML = '<div class="rp-pw">' +
      '<div class="rp-pw-bar"><div class="rp-pw-chs" data-chs></div></div>' +
      '<div class="rp-pw-kpis" data-kpis></div>' +
      '<div class="rp-pw-split"><aside class="rp-pw-pick"><div class="rp-pw-ph">Starting pages</div><input type="search" data-q placeholder="Find a page…" aria-label="Find a starting page">' +
        '<div class="rp-pw-acts"><button type="button" class="aiv-chip" data-top="5">Top 5</button><button type="button" class="aiv-chip" data-top="10">Top 10</button><button type="button" class="aiv-chip off" data-top="0">Clear</button></div><div data-list></div></aside>' +
      '<div class="rp-pw-main"><div class="rp-pw-heads" data-heads></div><div class="rp-pw-scroll" data-tree></div></div></div>' +
      '<div data-keys></div><p class="aiv-foot" data-foot></p></div>';
    const $ = s => h.querySelector(s);
    const tree = $('[data-tree]'), keysBox = $('[data-keys]');
    const save = () => { if (picked) cf.starts = picked.slice(); else delete cf.starts; if (ctx.saveItem) ctx.saveItem(w); };
    const drawChs = () => {
      const C = M.channels;
      $('[data-chs]').innerHTML = PW_CH.map(c => '<button type="button" class="aiv-chip' + (c[0] === ch ? '' : ' off') + '" data-ch="' + c[0] + '"' + (C ? '' : ' disabled') + '>' + c[1] + (C ? ' <b>' + fmt(C[c[0]] || 0) + '</b>' : '') + '</button>').join('');
      $('[data-chs]').querySelectorAll('[data-ch]').forEach(b => b.addEventListener('click', () => {
        if (b.dataset.ch === ch) return;
        if (b.dataset.ch !== 'all' && !ctx.loadPathway){ return; }
        ch = b.dataset.ch; drawChs();
        tree.innerHTML = '<div class="rp-load"><span class="aiv-spin"></span></div>';
        (ch === 'all' ? Promise.resolve(D.pathway) : ctx.loadPathway(ch)).then(p => { raw = p; M = pathwayModel(p, mOpt()); M.channels = M.channels || pathwayModel(D.pathway).channels; drawAll(); })
          .catch(e => { tree.innerHTML = '<div class="rp-err">' + esc(e.message || String(e)) + '</div>'; });
      }));
    };
    const starts = () => (picked || M.landings.slice(0, 6).map(l => l.k)).filter(k => M.land[k]);
    const drawList = () => {
      const t = q.trim().toLowerCase(), sel = new Set(starts()), max = Math.max(1, ...M.landings.map(l => l.s));
      const list = M.landings.filter(l => !t || (l.k + ' ' + pwLabel(l.k)).toLowerCase().indexOf(t) > -1);
      const cap = t || allStarts ? list.length : 40;
      $('[data-list]').innerHTML = list.length ? list.slice(0, cap).map(l => '<label class="rp-pw-pk' + (sel.has(l.k) ? ' on' : '') + '" title="' + esc(l.k) + '"><input type="checkbox" data-pk="' + esc(l.k) + '"' + (sel.has(l.k) ? ' checked' : '') + '>' +
        '<i style="background:' + pwColor(l.k) + '"></i><span class="nm">' + esc(pwLabel(l.k)) + '</span>' + (l.reached ? '<span class="k">★' + fmt(l.reached) + '</span>' : '') +
        '<span class="bar"><i style="width:' + (l.s / max * 100).toFixed(1) + '%;background:' + pwColor(l.k) + '"></i></span><span class="c">' + fmt(l.s) + '</span></label>').join('') + (list.length > cap ? '<button type="button" class="aiv-btn rp-pw-all" data-allstarts>Show all ' + fmt(list.length) + ' starting pages</button>' : '') : '<div class="aiv-empty">No starting page matches.</div>';
      const asb = $('[data-allstarts]'); if (asb) asb.addEventListener('click', () => { allStarts = true; drawList(); });
      $('[data-list]').querySelectorAll('[data-pk]').forEach(cb => cb.addEventListener('change', () => {
        const cur = starts();
        picked = cb.checked ? cur.concat(cb.dataset.pk) : cur.filter(k => k !== cb.dataset.pk);
        save(); drawList(); drawTree();
      }));
    };
    const drawKpis = () => {
      const onChart = starts().reduce((t, k) => t + (M.land[k] ? M.land[k].s : 0), 0);
      $('[data-kpis]').innerHTML = '<div><b>' + fmt(M.total) + '</b><span>' + esc((PW_CH.find(c => c[0] === ch) || PW_CH[0])[1].toLowerCase()) + ' sessions</span></div>' +
        '<div><b class="key">★ ' + fmt(M.reached) + '</b><span>reached a key event (' + pctS(M.reached, M.total) + ')</span></div>' +
        '<div><b>' + fmt(M.landings.length) + (M.landings.length >= 1500 ? '+' : '') + '</b><span>pages sessions start on</span></div>' +
        '<div><b>' + pctS(onChart, M.total) + '</b><span>of sessions on the chart</span></div>' +
        '<span style="display:flex;flex-direction:column;gap:6px;align-items:flex-end"><button type="button" class="aiv-btn" data-allkeys>★ Key events</button>' +
        (M.hidden.length || M.allKeys ? '<button type="button" class="aiv-chip' + (M.allKeys ? '' : ' off') + '" data-pv title="GA4 has page-visit events marked as key events: ' + esc(M.hidden.concat([]).map(e => e[0]).slice(0, 6).join(', ')) + '">' +
          (M.allKeys ? '✓ Counting page-visit events' : 'Page-visit events not counted (' + fmt(M.hidden.reduce((t, e) => t + e[1], 0)) + ')') + '</button>' : '') + '</span>';
      $('[data-allkeys]').addEventListener('click', () => showAllKeys());
      const pv = $('[data-pv]');
      if (pv) pv.addEventListener('click', () => {
        if (cf.allKeys) delete cf.allKeys; else cf.allKeys = true;
        if (ctx.saveItem) ctx.saveItem(w);
        const chs = M.channels; M = pathwayModel(raw, mOpt()); M.channels = M.channels || chs; open.clear(); keysBox.innerHTML = ''; drawAll();
      });
    };
    const showAllKeys = () => {
      const rows = Object.keys(M.keyTot).map(k => [k, M.keyTot[k][0], M.keyTot[k][1]]).sort((a, b) => b[1] - a[1]);
      keysBox.innerHTML = '<div class="rp-pw-keys"><div class="rp-pw-kh"><b>Key events reached</b><button type="button" class="aiv-btn" data-kx>✕ Close</button></div>' +
        (rows.length ? '<div class="aiv-scroll" style="max-height:300px"><table class="aiv-table"><thead><tr><th>Key event</th><th class="num">Sessions</th><th class="num">Times</th><th>Started on (top)</th></tr></thead><tbody>' +
          rows.map(r => '<tr><td>★ ' + esc(keLabel(r[0])) + ' <span class="rp-pw-ev">' + esc(r[0]) + '</span></td><td class="num">' + fmt(r[1]) + '</td><td class="num">' + fmt(r[2]) + '</td><td>' +
            esc(Object.keys(M.keyLand).map(l => [l, (M.keyLand[l].find(x => x[0] === r[0]) || [0, 0])[1]]).filter(x => x[1]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => pwLabel(x[0]) + ' (' + fmt(x[1]) + ')').join(', ')) + '</td></tr>').join('') + '</tbody></table></div>'
          : '<div class="aiv-empty">No key events in this period.</div>') + '</div>';
      keysBox.querySelector('[data-kx]').addEventListener('click', () => { keysBox.innerHTML = ''; });
    };
    const showKeys = n => {
      keysBox.innerHTML = '<div class="rp-pw-keys"><div class="rp-pw-kh"><b>' + esc(n.kind ? '' : pwLabel(n.k)) + ' <span class="rp-pw-ev">' + esc(n.k) + '</span></b><button type="button" class="aiv-btn" data-kx>✕ Close</button></div>' + pwKeysHtml(M, n) + '</div>';
      keysBox.querySelector('[data-kx]').addEventListener('click', () => { keysBox.innerHTML = ''; });
      keysBox.scrollIntoView({block: 'nearest', behavior: 'smooth'});
    };
    const drawTree = () => {
      drawKpis();
      const ks = starts();
      if (!ks.length){ tree.innerHTML = '<div class="aiv-empty">Tick a starting page to see where its sessions went.</div>'; $('[data-heads]').innerHTML = ''; return; }
      const kids = ks.map(k => ({k, v: M.land[k].s, reached: M.land[k].reached, depth: 1, mode: 'land', l: k, path: [k]}));
      const root = {k: '', root: true, label: (PW_CH.find(c => c[0] === ch) || PW_CH[0])[1] + ' sessions', v: M.total, depth: 0, path: ['*'], rootKids: kids};
      if (!open.size){ open.add('*|'); ks.slice(0, 1).forEach(k => open.add(k + '|' + k)); }
      const r = drawPathTree(tree, ctx, M, [root], {open, onToggle: () => drawTree(), onKeys: showKeys});
      const heads = ['Sessions', 'Started on', 'Then went to', 'Then', 'Then', 'Then', 'Then', 'Then'];
      $('[data-heads]').innerHTML = '<div style="position:relative;height:100%;width:' + (r.cols * 300) + 'px">' + heads.slice(0, r.cols).map((t, i) => '<span style="left:' + (i * 300) + 'px">' + t + (i >= 3 ? ' <em>≈ estimated</em>' : '') + '</span>').join('') + '</div>';
    };
    const drawAll = () => { drawChs(); drawList(); drawTree(); };
    const sc = $('[data-tree]'), hd = $('[data-heads]');
    sc.addEventListener('scroll', () => { hd.scrollLeft = sc.scrollLeft; });
    $('[data-q]').addEventListener('input', e => { q = e.target.value; drawList(); });
    h.querySelectorAll('[data-top]').forEach(b => b.addEventListener('click', () => {
      const n = Number(b.dataset.top);
      picked = n ? M.landings.slice(0, n).map(l => l.k) : [];
      open.clear(); save(); drawList(); drawTree();
    }));
    $('[data-foot]').innerHTML = 'GA4, ' + esc(ctx.R.text) + '. Sessions are grouped by the page they started on. The next page after a starting page is counted from page views whose previous page was that page; steps after that (≈) are estimated from how visitors moved on from each page. ★ on a starting page counts its sessions that reached a key event, and ★ on the page after it counts the sessions from that start that fired a key event on that page (both exact, each session once); ★≈ on later steps estimates the key events from the visitors on that step (the page’s key events per view × their visits). Every page visited is included: each step lists its top pages, and “more pages” opens all the others.' +
      (M.thresholded ? ' Google Analytics hid some small numbers for privacy (thresholding).' : '');
    drawAll();
  }};

/* ---------- AI assistants ---------- */
W.ai_visits = {g: 'ai', t: 'AI visits', d: 'Visitors sent by AI assistants, over time.', size: 'l', needs: ['feed'],
  render(h, ctx, w, D){
    const M = aiModel(ctx, D.feed);
    fillBody(h, ctx, w);
    h.innerHTML = bigNum(fmt(M.ai.s), delta(M.ai.s, M.ai.ps, M.ai.hasPrev), fmt(M.ai.k) + ' key events from AI visitors') + '<div style="margin-top:10px"></div>';
    chart(h.lastChild, {labels: M.labels, weekly: M.weekly, height: chH(w, 190, 150), empty: 'No AI visits in this period.',
      series: [{name: 'AI visits', color: '#eb6834', values: M.ai.series, area: true}, {name: 'Key events', color: '#2a78d6', values: M.ai.keySeries, dash: true}],
      onClick: ctx.drill ? d => U.openDay(M, ctx.domain, d) : null}, ctx, w);
    if (ctx.drill){ const b = h.querySelector('.rp-big'); b.style.cursor = 'pointer'; b.addEventListener('click', () => U.openAllAi(M, ctx.domain, 'visits')); }
  }};
W.ai_assistants = {g: 'ai', t: 'Visits by assistant', d: 'ChatGPT, Perplexity, Gemini, Copilot, Claude… with visits and key events.', size: 'm', needs: ['feed'],
  render(h, ctx, w, D){
    const M = aiModel(ctx, D.feed), tot = M.ai.s;
    if (!M.plats.length){ h.innerHTML = '<div class="rp-err">No AI visits in this period.</div>'; return; }
    h.innerHTML = '<div class="rp-donutrow">' + donut(M.plats.map((p, i) => ({key: p.name, label: p.name, n: p.s, color: sc(ctx, pcol(p.name), i)})), {sub: 'AI visits'}) +
      legendRows(M.plats.map((p, i) => ({k: p.name, n: p.s, label: p.name + (p.k ? ' · ' + p.k + ' key ev.' : ''), color: sc(ctx, pcol(p.name), i), logo: p.name})), tot, {click: ctx.drill}) + '</div>';
    onClick(h, '[data-l]', el => U.openPlatform(M, ctx.domain, el.dataset.l));
  }};
W.ai_vs_channels = {g: 'ai', t: 'AI vs Organic vs Direct', d: 'AI visits next to Google organic and direct visits and Google AI impressions. Tick a line to show or hide it.', size: 'l', needs: ['feed'],
  render(h, ctx, w, D){
    const M = aiModel(ctx, D.feed);
    const series = [{name: 'AI', color: '#eb6834', values: M.ai.series, area: true}, {name: 'Organic Search', color: '#2a78d6', values: M.channels['Organic Search'].series, dash: true},
      {name: 'Direct', color: '#1baf7a', values: M.channels.Direct.series, dash: true}];
    /* Google AI impressions (AI Overviews and AI Mode, Search Console): Search Console runs a few days behind, so the line stops where its data does. */
    if (M.google.imported) series.push({name: 'Google AI impressions', color: '#6250d6', values: M.google.series});
    fillBody(h, ctx, w);
    chart(h, {labels: M.labels, weekly: M.weekly, height: chH(w, 220, 70), empty: 'Nothing recorded in this period yet.', series,
      foot: M.google.imported && M.google.latest ? 'Google AI impressions: Search Console data to ' + esc(shortDate(M.google.latest)) + '.' : ''}, ctx, w);
  }};
W.ai_keyevents = {g: 'ai', t: 'What AI visitors did', d: 'The key events AI visitors triggered, by type and assistant.', size: 'm', needs: ['feed'],
  render(h, ctx, w, D){
    const M = aiModel(ctx, D.feed), ev = keyEventsOf(M.keyEv.rows), max = Math.max(1, ...ev.map(x => x.n));
    table(h, ev, [
      {key: 'label', label: 'Key event', fmt: r => esc(r.label)},
      {key: 'from', label: 'From', fmt: r => logoStack(Object.keys(r.plats), 16), sort: r => Object.keys(r.plats)[0]},
      {key: 'n', label: 'Count', num: true, fmt: r => barCell(r.n, max, '#2a78d6')}
    ], {sort: 'n', empty: M.keyEv.known ? 'No key events from AI visitors in this period.' : 'Key event names aren’t coming through from the tracker yet.', onRow: ctx.drill ? () => U.openAllAi(M, ctx.domain, 'keys') : null});
  }};
W.ai_pages = {g: 'ai', t: 'Pages AI sends people to', d: 'Landing pages of AI visits, with Google AI impressions and citations.', size: 'l', needs: ['feed'],
  render(h, ctx, w, D){
    const M = aiModel(ctx, D.feed), rows = M.pages.filter(p => p.s || p.g), maxS = Math.max(1, ...rows.map(r => r.s));
    table(h, rows, [
      {key: 'key', label: 'Page', fmt: r => '<span class="aiv-page">' + esc(r.key) + '</span>'},
      {key: 's', label: 'AI visits', num: true, fmt: r => barCell(r.s, maxS, '#eb6834')},
      {key: 'k', label: 'Key events', num: true, fmt: r => fmt(r.k)},
      {key: 'g', label: 'Google AI impr.', num: true, fmt: r => M.google.imported ? fmt(r.g) : '—'}
    ], {sort: rows.some(p => p.s) ? 's' : 'g', empty: 'No pages recorded yet.', maxH: 380, onRow: ctx.drill ? r => U.openPage(M, ctx.domain, r) : null});
  }};
W.ai_journeys = {g: 'ai', t: 'AI visitor journeys', d: 'Each person an AI assistant sent, page by page. Internal only: never sent to a client.', size: 'xl', needs: ['feed'], internal: true,
  render(h, ctx, w, D){
    const M = aiModel(ctx, D.feed);
    M.loadJourneys = ctx.loadJourneys || null;
    if (!M.loadJourneys){ h.innerHTML = '<div class="rp-err">Journeys need the tracker connection.</div>'; return; }
    U.drawJourneys(h, M, ctx.domain, {});
  }};

/* ---------- Google AI search ---------- */
W.gai_impr = {g: 'gai', t: 'Google AI impressions', d: 'Times the site showed in AI Overviews and AI Mode (Search Console).', size: 'l', needs: ['feed'],
  render(h, ctx, w, D){
    const M = aiModel(ctx, D.feed);
    if (!M.google.imported){ h.innerHTML = '<div class="rp-err">Not imported yet. Needs Search Console access in the tracker.</div>'; return; }
    fillBody(h, ctx, w);
    h.innerHTML = bigNum(fmt(M.google.n), delta(M.google.n, M.google.prev, M.google.prev > 0), 'AI Overviews &amp; AI Mode · data to ' + esc(shortDate(M.google.latest))) + '<div style="margin-top:10px"></div>';
    chart(h.lastChild, {labels: M.labels, weekly: M.weekly, height: chH(w, 190, 150), series: [{name: 'Impressions', color: '#1baf7a', values: M.google.series, area: true}]}, ctx, w);
    if (ctx.drill){ const b = h.querySelector('.rp-big'); b.style.cursor = 'pointer'; b.addEventListener('click', () => U.openGoogle(M, ctx.domain)); }
  }};
W.gai_pages = {g: 'gai', t: 'Pages Google’s AI shows', d: 'Pages with the most AI Overview / AI Mode impressions.', size: 'm', needs: ['feed'],
  render(h, ctx, w, D){
    const M = aiModel(ctx, D.feed), m = {};
    M.google.pages.forEach(p => { const k = pageKey(p.u); m[k] = (m[k] || 0) + p.n; });
    const rows = Object.keys(m).map(k => ({k, n: m[k]})), max = Math.max(1, ...rows.map(r => r.n));
    table(h, rows, [{key: 'k', label: 'Page', fmt: r => '<span class="aiv-page">' + esc(r.k) + '</span>'}, {key: 'n', label: 'Impressions*', num: true, fmt: r => barCell(r.n, max, '#1baf7a')}],
      {sort: 'n', empty: 'No Google AI page data yet.', maxH: 340});
  }};
W.gai_organic = {g: 'gai', t: 'Google visits to AI-shown pages', d: 'Organic visits and key events on the pages Google’s AI showed (the closest view of AI Overview click-throughs).', size: 'm', needs: ['feed'],
  render(h, ctx, w, D){
    const M = aiModel(ctx, D.feed);
    if (!M.gorg.known){ h.innerHTML = '<div class="rp-err">Not available from the tracker yet.</div>'; return; }
    const ev = keyEventsOf(M.gorg.events);
    h.innerHTML = '<div class="rp-kpis">' + kpiTile('Visits', fmt(M.gorg.s), pctS(M.gorg.e, M.gorg.s) + ' engaged') + kpiTile('Key events', fmt(M.gorg.k), ev[0] ? esc(ev[0].label) + ' leads' : '') + '</div>';
  }};
W.aio = {g: 'gai', t: 'AI Overview citations', d: 'For each tracked keyword and location: did Google show an AI Overview, and did it cite the site?', size: 'l', needs: ['feed'],
  render(h, ctx, w, D){
    const M = aiModel(ctx, D.feed);
    if (ctx.drill){ U.drawAio(h, M, ctx.domain, false); return; }
    if (!M.aio.length){ h.innerHTML = '<div class="rp-err">No AI Overview checks yet.</div>'; return; }
    const lbl = {cited: ['Cited', 'aiv-yes'], named: ['Named', 'aiv-yes'], miss: ['Not mentioned', 'aiv-mid'], none: ['No Overview', 'aiv-no']};
    const cnt = {cited: 0, named: 0, miss: 0, none: 0}; M.aio.forEach(c => cnt[M.aioState(c)]++);
    const ac = [sc(ctx, '#1baf7a', 1), sc(ctx, '#2a78d6', 0), sc(ctx, '#eb6834', 2), sc(ctx, '#c3ccd3', 3)];
    if (ctx.aa) ac[3] = '#E4E4E7';
    h.innerHTML = '<div class="rp-donutrow">' + donut([{key: 'cited', label: 'Cited', n: cnt.cited, color: ac[0]}, {key: 'named', label: 'Named', n: cnt.named, color: ac[1]},
      {key: 'miss', label: 'Without the site', n: cnt.miss, color: ac[2]}, {key: 'none', label: 'No Overview', n: cnt.none, color: ac[3]}], {sub: 'searches'}) +
      legendRows([{n: cnt.cited, label: 'Cited the site', color: ac[0]}, {n: cnt.named, label: 'Named the business', color: ac[1]},
        {n: cnt.miss, label: 'Overview without the site', color: ac[2]}, {n: cnt.none, label: 'No AI Overview', color: ac[3]}], M.aio.length) + '</div><div data-t style="margin-top:10px"></div>';
    table(h.querySelector('[data-t]'), M.aio.map(c => ({k: c.k, loc: c.loc, st: M.aioState(c)})), [
      {key: 'k', label: 'Search', fmt: r => esc(r.k)}, {key: 'loc', label: 'Location', fmt: r => esc(r.loc)},
      {key: 'st', label: 'Result', fmt: r => '<span class="aiv-pill ' + lbl[r.st][1] + '">' + lbl[r.st][0] + '</span>'}], {sort: 'st', maxH: 300});
  }};

/* ---------- Copilot ---------- */
W.bing_cites = {g: 'bing', t: 'Copilot citations', d: 'Times Copilot cited the site (Bing Webmaster Tools).', size: 'm', needs: ['feed'],
  render(h, ctx, w, D){
    const M = aiModel(ctx, D.feed);
    if (!M.bing.imported){ h.innerHTML = '<div class="rp-err">Not imported yet. Needs Bing Webmaster Tools access.</div>'; return; }
    fillBody(h, ctx, w);
    h.innerHTML = bigNum(fmt(M.bing.n), delta(M.bing.n, M.bing.prev, M.bing.prev > 0), 'Data to ' + esc(shortDate(M.bing.latest))) + '<div style="margin-top:8px"></div>';
    chart(h.lastChild, {labels: M.labels, weekly: M.weekly, height: chH(w, 150, 150), series: [{name: 'Citations', color: '#eda100', values: M.bing.series, area: true}]}, ctx, w);
    if (ctx.drill){ const b = h.querySelector('.rp-big'); b.style.cursor = 'pointer'; b.addEventListener('click', () => U.openBing(M, ctx.domain)); }
  }};
W.bing_queries = {g: 'bing', t: 'Questions Copilot cited the site for', d: 'Grounding queries reported by Bing.', size: 'm', needs: ['feed'],
  render(h, ctx, w, D){
    const M = aiModel(ctx, D.feed), max = Math.max(1, ...M.bing.queries.map(q => q.n));
    table(h, M.bing.queries, [{key: 'q', label: 'Question', fmt: r => esc(r.q)}, {key: 'n', label: 'Citations', num: true, fmt: r => barCell(r.n, max, '#eda100')}],
      {sort: 'n', empty: 'No questions reported yet.', maxH: 320});
  }};

/* ---------- Prompt checks ---------- */
function llmLatest(feed){
  const all = (feed.llm && feed.llm.checks) || [];
  const m = {};
  all.forEach(c => { const k = c.p + '|' + c.q; if (!m[k] || c.d > m[k].d) m[k] = c; });
  return {all, latest: Object.values(m)};
}
W.llm_share = {g: 'llm', t: 'AI answer visibility', d: 'Share of tracked prompts where each assistant mentions or cites the business.', size: 'm', needs: ['feed'],
  render(h, ctx, w, D){
    const L = llmLatest(D.feed).latest;
    if (!L.length){ h.innerHTML = '<div class="rp-err">Prompt checks aren’t switched on for this client.</div>'; return; }
    const by = {};
    L.forEach(c => { const o = by[c.p] = by[c.p] || {p: c.p, n: 0, brand: 0, cited: 0}; o.n++; if (c.brand) o.brand++; if (c.cited) o.cited++; });
    const rows = Object.values(by);
    table(h, rows, [{key: 'p', label: 'Assistant', fmt: r => platLabel(r.p)},
      {key: 'brand', label: 'Mentions the business', num: true, fmt: r => barCell(r.brand, r.n, pcol(r.p)) + ' <span style="color:var(--a-ink3);font-size:11px">' + r.brand + '/' + r.n + '</span>', sort: r => pct(r.brand, r.n)},
      {key: 'cited', label: 'Links to the site', num: true, fmt: r => pctS(r.cited, r.n), sort: r => pct(r.cited, r.n)}], {sort: 'brand'});
  }};
W.llm_checks = {g: 'llm', t: 'Prompt check results', d: 'Each tracked question asked to each assistant: mentioned, linked, and which competitors appeared.', size: 'xl', needs: ['feed'],
  render(h, ctx, w, D){
    const L = llmLatest(D.feed).latest;
    if (!L.length){ h.innerHTML = '<div class="rp-err">Prompt checks aren’t switched on for this client.</div>'; return; }
    const yes = b => b ? '<span class="rp-chk">✓</span>' : '<span class="rp-x">—</span>';
    table(h, L.map(c => ({q: c.q, p: c.p, t: c.t || '', brand: !!c.brand, cited: !!c.cited, comp: (c.comp || []).slice(0, 4).join(', '), d: c.d})), [
      {key: 'q', label: 'Question', fmt: r => esc(r.q) + (r.t ? ' <span class="rp-pill">' + esc(r.t) + '</span>' : '')},
      {key: 'p', label: 'Assistant', fmt: r => platLabel(r.p)},
      {key: 'brand', label: 'Mentioned', fmt: r => yes(r.brand), sort: r => r.brand ? 1 : 0},
      {key: 'cited', label: 'Linked', fmt: r => yes(r.cited), sort: r => r.cited ? 1 : 0},
      {key: 'comp', label: 'Also named', fmt: r => '<span style="color:var(--a-ink2);font-size:12px">' + esc(r.comp || '—') + '</span>'},
      {key: 'd', label: 'Checked', fmt: r => esc(shortDate(r.d))}], {sort: 'brand', maxH: 420});
  }};

/* ---------- Search Console ---------- */
const gscLabel = D => D.gsc && D.gsc.range ? D.gsc.range.label || (prettyDate(D.gsc.range.start) + ' – ' + prettyDate(D.gsc.range.end)) : '';
W.gsc_kpis = {g: 'gsc', t: 'Google Search summary', d: 'Clicks, impressions, click-through rate and average position.', size: 'xl', needs: ['gsc'],
  render(h, ctx, w, D){
    const t = D.gsc.totals || {}, p = (D.gsc.previous || {}).totals || null;
    const dd = (a, b, inv) => { if (!p) return null; const d = delta(a, b, true); if (inv && d.txt){ d.cls = d.cls === 'up' ? 'down' : d.cls === 'down' ? 'up' : d.cls; } return d; };
    h.innerHTML = '<div class="rp-kpis">' + kpiTile('Clicks', fmt(t.clicks), esc(gscLabel(D)), {d: dd(t.clicks, p && p.clicks)}) + kpiTile('Impressions', fmtK(t.impressions), '', {d: dd(t.impressions, p && p.impressions)}) +
      kpiTile('Click-through rate', esc(String(t.ctr || 0)) + '%', '', {}) + kpiTile('Average position', esc(String(t.position || '—')), 'Lower is better', {d: dd(t.position, p && p.position, true)}) +
      kpiTile('Search queries', fmt(t.queries), 'Different searches that showed the site', {}) + '</div>';
  }};
W.gsc_trend = {g: 'gsc', t: 'Clicks and impressions by day', d: 'Search Console, day by day.', size: 'l', needs: ['gsc'],
  render(h, ctx, w, D){
    const rows = D.gsc.daily || [];

    const maxI = Math.max(1, ...rows.map(r => Number(r[2]) || 0)), maxC = Math.max(1, ...rows.map(r => Number(r[1]) || 0));
    /* Impressions scaled onto the clicks axis so both lines read; the tooltip shows the real numbers via the label. */
    fillBody(h, ctx, w);
    chart(h, {foot: esc(gscLabel(D)), labels: rows.map(r => r[0]), height: chH(w, 220, 90), series: [{name: 'Clicks', color: '#2a78d6', values: rows.map(r => Number(r[1]) || 0), area: true},
      {name: 'Impressions (scaled)', color: '#8795a1', values: rows.map(r => Math.round((Number(r[2]) || 0) / maxI * maxC * 10) / 10), dash: true}], empty: 'No Search Console data for this period.'}, ctx, w);
  }};
/* Google keeps rare searches private: they count in the site totals but never come back as query rows,
   so anything added up from D.gsc.queries falls short of the totals. The backend sends the gap as D.gsc.hidden. */
const gscHidden = D => { const x = (D.gsc && D.gsc.hidden) || {}; return {c: Number(x.clicks) || 0, i: Number(x.impressions) || 0}; };
const gscHiddenNote = D => { const x = gscHidden(D); return x.c || x.i ? '<p class="aiv-foot">Plus ' + fmt(x.c) + ' click' + (x.c === 1 ? '' : 's') + ' and ' + fmtK(x.i) + ' impressions from searches Google keeps private. They are in the site totals, but Google doesn’t say what was searched.</p>' : ''; };
/* Puts a note under a table that re-draws itself when sorted, so the note survives sorting. */
const withNote = (h, note) => { if (!note) return h; h.innerHTML = '<div data-t></div>' + note; return h.querySelector('[data-t]'); };
const gscTable = (h, ctx, rows, opts) => table(h, rows.map(q => ({q: q[0], c: Number(q[1]) || 0, i: Number(q[2]) || 0, ctr: Number(q[3]) || 0, pos: Number(q[4]) || 0, pg: q[5] || '', raw: q})), [
  {key: 'q', label: opts.first || 'Query', fmt: r => opts.page ? '<span class="aiv-page">' + esc(pageKey(r.q)) + '</span>' : esc(r.q)},
  {key: 'c', label: 'Clicks', num: true, fmt: r => fmt(r.c)}, {key: 'i', label: 'Impressions', num: true, fmt: r => fmt(r.i)},
  {key: 'ctr', label: 'CTR', num: true, fmt: r => r.ctr + '%'}, {key: 'pos', label: 'Position', num: true, fmt: r => r.pos.toFixed(1)}
], {sort: opts.sort || 'c', asc: !!opts.asc, empty: opts.empty || 'No data for this period.', maxH: 400, limit: opts.limit || 200,
  onRow: ctx.drill && !opts.page ? r => DRILL.gscQuery(ctx, r.raw) : null});
W.gsc_queries = {g: 'gsc', t: 'Top search queries', d: 'The searches that brought the most clicks.', size: 'l', needs: ['gsc'],
  render(h, ctx, w, D){ gscTable(withNote(h, gscHiddenNote(D)), ctx, D.gsc.queries || [], {}); }};
W.gsc_pages = {g: 'gsc', t: 'Top landing pages from Google', d: 'Pages with the most clicks from Google Search.', size: 'l', needs: ['gsc'],
  render(h, ctx, w, D){ gscTable(h, ctx, D.gsc.pages || [], {first: 'Page', page: true}); }};
W.gsc_almost = {g: 'gsc', t: 'Almost on top', d: 'Queries ranking 4–15 with real impressions: the quickest wins.', size: 'l', needs: ['gsc'],
  render(h, ctx, w, D){ gscTable(h, ctx, (D.gsc.queries || []).filter(q => q[4] >= 4 && q[4] <= 15 && q[2] >= 20), {sort: 'i', empty: 'No queries between positions 4 and 15 with enough impressions.'}); }};
W.gsc_lowctr = {g: 'gsc', t: 'Seen often, rarely clicked', d: 'High-impression queries on page one with a low click-through rate.', size: 'l', needs: ['gsc'],
  render(h, ctx, w, D){ gscTable(h, ctx, (D.gsc.queries || []).filter(q => q[4] <= 10 && q[2] >= 100 && q[3] < 2), {sort: 'i', empty: 'Nothing stands out in this period.'}); }};
W.gsc_devices = {g: 'gsc', t: 'Devices', d: 'Clicks from desktop, mobile and tablet.', size: 's', needs: ['gsc'],
  render(h, ctx, w, D){
    const rows = (D.gsc.devices || []).map(r => ({k: r[0], n: Number(r[1]) || 0})), tot = rows.reduce((t, r) => t + r.n, 0);
    const col = ctx.aa ? {DESKTOP: AA_DONUT[0], MOBILE: AA_DONUT[1], TABLET: AA_DONUT[2]} : {DESKTOP: '#2a78d6', MOBILE: '#eb6834', TABLET: '#1baf7a'};
    const nice = s => s.charAt(0) + s.slice(1).toLowerCase();
    h.innerHTML = '<div class="rp-donutrow" style="flex-direction:column;align-items:stretch"><div style="display:flex;justify-content:center">' + donut(rows.map(r => ({key: r.k, label: nice(r.k), n: r.n, color: col[r.k] || '#8795a1'})), {sub: 'clicks'}) + '</div>' +
      legendRows(rows.map(r => ({n: r.n, label: nice(r.k), color: col[r.k] || '#8795a1'})), tot) + '</div>';
  }};
W.gsc_countries = {g: 'gsc', t: 'Top countries', d: 'Clicks by country.', size: 's', needs: ['gsc'],
  render(h, ctx, w, D){
    const rows = (D.gsc.countries || []).slice(0, 8).map(r => ({k: String(r[0]).toUpperCase(), n: Number(r[1]) || 0})), max = Math.max(1, ...rows.map(r => r.n));
    table(h, rows, [{key: 'k', label: 'Country', fmt: r => esc(r.k)}, {key: 'n', label: 'Clicks', num: true, fmt: r => barCell(r.n, max, '#2a78d6')}], {sort: 'n'});
  }};

/* ---------- Search Console health (URL Inspection + Sitemaps) ----------
   gsch payload: pages [{url, verdict, coverage, indexing, robots, fetch, gcanon, ucanon, crawl, rich: [{type, items, issues: [[message, severity]]}], link}],
   sitemaps [{path, type, submitted, indexed, errors, warnings, read, pending}], checked, queued, total. */
const GH_WHY = [
  [/not found|404/i, 'These pages return “not found” (404) but are listed in the sitemap. Redirect them to a live page or take them out of the sitemap.'],
  [/soft 404/i, 'Google thinks these pages look empty or like an error page. Add real content, or return a proper 404/redirect.'],
  [/server error|5xx/i, 'The site returned a server error when Google tried to crawl. Check hosting and server logs.'],
  [/redirect error/i, 'Redirect loops or chains Google couldn’t follow. Point each URL straight to its final page.'],
  [/noindex/i, 'These pages carry a “noindex” tag yet sit in the sitemap. Remove the tag if they should rank, or drop them from the sitemap.'],
  [/blocked by robots|robots/i, 'robots.txt stops Google crawling these pages. Unblock them if they should appear in Google.'],
  [/unauthori|forbidden|401|403/i, 'Google was refused access (401/403). Make the pages public or remove them from the sitemap.'],
  [/crawled.*not indexed/i, 'Google crawled these pages but chose not to index them yet: usually thin, similar or low-value content. Improve the content and link to them from strong pages.'],
  [/discovered.*not indexed/i, 'Google knows these URLs but hasn’t crawled them yet. More internal links and a fresh sitemap help.'],
  [/duplicate|canonical/i, 'Google treats these as duplicates of another page and indexes that one instead. Check the canonical tags point where you want.'],
  [/page with redirect/i, 'The sitemap lists URLs that redirect. List the final URL instead.'],
  [/alternate page/i, 'Alternate versions (e.g. with a canonical to another page). Usually fine; keep them out of the sitemap.'],
  [/unknown to google/i, 'Google has never seen these URLs. Submit the sitemap and link to them from the site.'],
  [/could not inspect/i, 'Search Console couldn’t inspect these pages (often a page outside the verified property). They’ll be retried next time.']
];
const ghWhy = t => (GH_WHY.find(x => x[0].test(t)) || [0, ''])[1];
const GH_CRIT = /not found|404|server error|5xx|redirect error|blocked|noindex|unauthori|forbidden|401|403/i;
const ghFetch = {SOFT_404: 'Soft 404', NOT_FOUND: 'Not found (404)', ACCESS_DENIED: 'Access denied (401)', ACCESS_FORBIDDEN: 'Access forbidden (403)', SERVER_ERROR: 'Server error (5xx)',
  REDIRECT_ERROR: 'Redirect error', BLOCKED_ROBOTS_TXT: 'Blocked by robots.txt', BLOCKED_4XX: 'Blocked (4xx)', INTERNAL_CRAWL_ERROR: 'Google internal crawl error', INVALID_URL: 'Invalid URL'};
const ghRichName = t => String(t || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, ch => ch.toUpperCase()).replace(/^Breadcrumbs?$/, 'Breadcrumbs');
/* Every problem, grouped: one row per kind of issue with the pages it affects. */
function ghIssues(H){
  const g = {};
  const add = (sev, title, page, detail, why) => { const k = sev + '|' + title; const o = g[k] = g[k] || {sev, title, why: why || ghWhy(title), pages: []}; if (page) o.pages.push(Object.assign({detail}, page)); };
  (H.pages || []).forEach(p => {
    const cov = String(p.coverage || '');
    const indexed = p.verdict === 'PASS' || /indexed/i.test(cov) && !/not indexed/i.test(cov);
    if (p.verdict === 'ERROR') add('warning', 'Could not inspect', p, cov);
    else if (!indexed && cov) add(GH_CRIT.test(cov) ? 'critical' : 'warning', cov, p, p.indexing && p.indexing !== 'INDEXING_ALLOWED' && !/UNSPECIFIED/.test(p.indexing) ? p.indexing.replace(/_/g, ' ').toLowerCase() : '');
    if (p.robots === 'DISALLOWED' && !GH_CRIT.test(cov)) add('critical', 'Blocked by robots.txt', p, '');
    if (p.fetch && ghFetch[p.fetch] && !GH_CRIT.test(cov)) add('critical', ghFetch[p.fetch], p, '');
    if (indexed && p.gcanon && p.ucanon && p.gcanon !== p.ucanon) add('warning', 'Google chose a different canonical', p, 'Google: ' + pageKey(p.gcanon) + ' · page says: ' + pageKey(p.ucanon));
    (p.rich || []).forEach(r => (r.issues || []).forEach(i => add(/ERROR/i.test(i[1]) ? 'critical' : 'warning', ghRichName(r.type) + ': ' + i[0], p, '',
      ghRichName(r.type) + ' structured data on these pages has ' + (/ERROR/i.test(i[1]) ? 'an error, so Google can’t show it as a rich result.' : 'a warning: still eligible, but fixing it helps.'))));
  });
  (H.sitemaps || []).forEach(s => {
    if (s.errors) add('critical', 'Sitemap errors', {url: s.path, sm: true}, s.errors + ' error' + (s.errors > 1 ? 's' : ''), 'Search Console found errors reading this sitemap. Open it in Search Console → Sitemaps for the details.');
    if (s.warnings) add('warning', 'Sitemap warnings', {url: s.path, sm: true}, s.warnings + ' warning' + (s.warnings > 1 ? 's' : ''), 'Search Console has warnings for this sitemap (often URLs blocked by robots.txt or redirects).');
  });
  return Object.values(g).sort((a, b) => (a.sev === b.sev ? 0 : a.sev === 'critical' ? -1 : 1) || b.pages.length - a.pages.length);
}
function ghOpen(ctx, iss){
  U.openDrawer(iss.title + ' · ' + iss.pages.length + ((iss.pages[0] || {}).sm ? ' sitemap' : ' page') + (iss.pages.length === 1 ? '' : 's'), iss.sev === 'critical' ? '#e34948' : '#eda100', body => {
    body.innerHTML = '<div class="aiv-card"><span class="rp-gh-sev ' + iss.sev + '">' + (iss.sev === 'critical' ? 'Critical' : 'Non-critical') + '</span><p style="margin:10px 0 0;font-size:13.5px;line-height:1.55">' + esc(iss.why || 'See each page below.') + '</p></div>' +
      '<div class="aiv-card"><h3>Affected pages</h3><div data-l style="margin-top:8px"></div></div>';
    table(body.querySelector('[data-l]'), iss.pages, [
      {key: 'url', label: 'Page', fmt: r => '<span class="aiv-page">' + esc(/^https?:/.test(r.url) ? pageKey(r.url) : r.url) + '</span>' + (r.detail ? '<div class="rp-fs-sub">' + esc(r.detail) + '</div>' : '')},
      {key: 'crawl', label: 'Last crawled', fmt: r => r.crawl ? esc(shortDate(String(r.crawl).slice(0, 10))) : '—'},
      {key: 'link', label: '', fmt: r => r.link ? '<a href="' + esc(r.link) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">Open in Search Console ↗</a>' : (/^https?:/.test(r.url) ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">Open page ↗</a>' : '')}],
      {sort: 'url', asc: true, maxH: 560});
  });
}
W.gsc_health = {g: 'gsc', lvl: 'tech', t: 'Search Console health', d: 'Indexing problems, Breadcrumbs and other rich-result errors, and sitemap errors, split into critical and non-critical. Click any issue for the pages and what to do.', size: 'xl', needs: ['gsch'],
  render(h, ctx, w, D){
    const H = D.gsch || {}, P = H.pages || [], iss = ghIssues(H);
    const indexed = P.filter(p => p.verdict === 'PASS' || (/indexed/i.test(p.coverage) && !/not indexed/i.test(p.coverage))).length;
    const pagesWith = sev => new Set([].concat(...iss.filter(i => i.sev === sev).map(i => i.pages.filter(p => !p.sm).map(p => p.url)))).size;
    const rich = {};
    P.forEach(p => (p.rich || []).forEach(r => { const o = rich[r.type] = rich[r.type] || {k: ghRichName(r.type), pages: 0, err: 0, warn: 0};
      o.pages++; if ((r.issues || []).some(i => /ERROR/i.test(i[1]))) o.err++; else if ((r.issues || []).length) o.warn++; }));
    const bc = Object.values(rich).find(r => /breadcrumb/i.test(r.k));
    const crit = pagesWith('critical'), warn = pagesWith('warning');
    const can = !!ctx.gscHealthNow;
    h.innerHTML = '<div class="rp-gh-top"><div class="aiv-cap">' + (H.checked ? 'Last checked ' + esc(prettyDate(String(H.checked).slice(0, 10))) + ' · ' + fmt(P.length) + ' pages inspected through Search Console' : 'Not checked yet.') +
        (H.queued ? ' · <b>checking ' + fmt(H.queued) + ' more pages now</b> (refresh in a few minutes)' : '') + '</div>' +
        (can ? '<button type="button" class="aiv-btn" data-ghnow' + (H.queued ? ' disabled' : '') + '>' + (H.queued ? 'Checking…' : 'Check now') + '</button>' : '') + '</div>' +
      (P.length || (H.sitemaps || []).length ? '<div class="rp-kpis">' +
        kpiTile('Indexed', fmt(indexed) + '<small style="font-size:14px;color:var(--a-ink3)"> / ' + fmt(P.length) + '</small>', pctS(indexed, P.length) + ' of checked pages', {icon: glyph('search', 18, '#2a78d6')}) +
        kpiTile('Critical', '<span style="color:' + (crit ? '#e34948' : '#0f7a58') + '">' + fmt(crit) + '</span>', crit ? 'pages with problems that block Google' : 'nothing blocking Google', {}) +
        kpiTile('Non-critical', '<span style="color:' + (warn ? '#b07800' : '#0f7a58') + '">' + fmt(warn) + '</span>', 'pages worth improving', {}) +
        kpiTile('Breadcrumbs', bc ? fmt(bc.pages - bc.err - bc.warn) + '<small style="font-size:14px;color:var(--a-ink3)"> / ' + fmt(bc.pages) + '</small>' : '—', bc ? (bc.err ? bc.err + ' with errors' : bc.warn ? bc.warn + ' with warnings' : 'all valid') : 'none found on checked pages', {}) +
        kpiTile('Sitemaps', fmt((H.sitemaps || []).length), (H.sitemaps || []).reduce((t, s) => t + s.errors, 0) + ' errors · ' + (H.sitemaps || []).reduce((t, s) => t + s.warnings, 0) + ' warnings', {}) + '</div>' +
        '<h4 class="rp-fs-h" style="margin-top:16px">Issues</h4>' + (iss.length ? '<div class="rp-gh-list">' + iss.map((x, i) => '<button type="button" data-gi="' + i + '"><span class="rp-gh-sev ' + x.sev + '">' + (x.sev === 'critical' ? 'Critical' : 'Non-critical') + '</span>' +
          '<span class="rp-gh-t">' + esc(x.title) + '<small>' + esc(x.why) + '</small></span><b>' + fmt(x.pages.length) + '</b><em>' + ((x.pages[0] || {}).sm ? 'sitemap' : 'page') + (x.pages.length === 1 ? '' : 's') + ' ›</em></button>').join('') + '</div>'
          : '<div class="rp-gh-ok">✓ No issues found on the checked pages.</div>') +
        '<div class="aiv-grid2" style="margin-top:16px"><div><h4 class="rp-fs-h">Rich results found</h4><div data-rich></div></div><div><h4 class="rp-fs-h">Sitemaps</h4><div data-sm></div></div></div>'
        : '<div class="rp-gh-ok" style="background:var(--a-card2,#f4f6fa);color:var(--a-ink2)">' + (can ? 'Click <b>Check now</b> to inspect this site’s pages through Search Console. It takes a few minutes; ' : '') + 'results also refresh with the monthly run.</div>') +
      '<p class="aiv-foot">Search Console URL Inspection on the sitemap’s pages (up to 200, homepage and top-level pages first) plus Search Console’s sitemap report. Critical: Google can’t index the page or show its rich result. Non-critical: indexed or fixable without blocking Google.</p>';
    onClick(h, '[data-gi]', el => ghOpen(ctx, iss[Number(el.dataset.gi)]));
    const rb = h.querySelector('[data-rich]');
    if (rb) table(rb, Object.values(rich), [{key: 'k', label: 'Type', fmt: r => esc(r.k)}, {key: 'pages', label: 'Pages', num: true},
      {key: 'ok', label: 'Valid', num: true, sort: r => r.pages - r.err - r.warn, fmt: r => '<span style="color:#0f7a58">' + fmt(r.pages - r.err - r.warn) + '</span>'},
      {key: 'warn', label: 'Warnings', num: true, fmt: r => r.warn ? '<span style="color:#b07800">' + fmt(r.warn) + '</span>' : '0'}, {key: 'err', label: 'Errors', num: true, fmt: r => r.err ? '<span style="color:#e34948">' + fmt(r.err) + '</span>' : '0'}],
      {sort: 'pages', empty: 'No structured data (Breadcrumbs, FAQ, reviews…) found on the checked pages.'});
    const sb = h.querySelector('[data-sm]');
    if (sb) table(sb, H.sitemaps || [], [{key: 'path', label: 'Sitemap', fmt: r => '<span class="aiv-page">' + esc(pageKey(r.path)) + '</span>' + (r.pending ? '<div class="rp-fs-sub">Pending</div>' : '')},
      {key: 'submitted', label: 'URLs', num: true, fmt: r => fmt(r.submitted)}, {key: 'errors', label: 'Errors', num: true, fmt: r => r.errors ? '<span style="color:#e34948">' + fmt(r.errors) + '</span>' : '0'},
      {key: 'warnings', label: 'Warnings', num: true, fmt: r => r.warnings ? '<span style="color:#b07800">' + fmt(r.warnings) + '</span>' : '0'},
      {key: 'read', label: 'Last read', fmt: r => r.read ? esc(shortDate(String(r.read).slice(0, 10))) : '—'}], {sort: 'submitted', empty: 'No sitemaps submitted in Search Console.'});
    const nb = h.querySelector('[data-ghnow]');
    if (nb) nb.addEventListener('click', () => {
      nb.disabled = true; nb.textContent = 'Starting…';
      ctx.gscHealthNow().then(r => { if (r && r.error) throw new Error(r.error); nb.textContent = 'Checking…';
        h.querySelector('.rp-gh-top .aiv-cap').insertAdjacentHTML('beforeend', ' · <b>started: results fill in over the next few minutes</b>'); })
        .catch(e => { nb.disabled = false; nb.textContent = 'Check now'; h.querySelector('.rp-gh-top .aiv-cap').insertAdjacentHTML('beforeend', ' · <span style="color:#e34948">Couldn’t start the check: ' + esc(e.message || String(e)) + '</span>'); });
    });
  }};

/* ---------- Keyword rankings ---------- */
const rankCls = r => r == null ? 'out' : r === 0 ? 'out' : r <= 3 ? 't3' : r <= 10 ? 't10' : r <= 20 ? 't20' : r <= 50 ? 't50' : 't100';
const rankBadge = r => { r = r == null || r === '' || !isFinite(Number(r)) ? null : Number(r); return rankBadge_(r); };
const rankBadge_ = r => '<span class="rp-rank ' + rankCls(r) + '" title="' + esc(rankTxt(r)) + '">' + (r == null ? '—' : r === 0 ? '100+' : '#' + r) + '</span>';
const moveChip = (r, p) => { const m = rankMove(r, p); return m.txt && m.txt !== '=' ? '<span class="aiv-delta ' + m.cls + '">' + esc(m.txt) + '</span>' : '<span style="color:var(--a-ink3);font-size:11.5px">no change</span>'; };
/* Position history as a small line: higher is better, gaps where outside the top 100. */
const rankSpark = (hist, color) => {
  const v = (hist || []).filter(x => x[0]).map(x => x[1] > 0 ? 101 - x[1] : null);
  if (v.filter(x => x != null).length < 2) return '<svg class="sp" viewBox="0 0 100 30" preserveAspectRatio="none"></svg>';
  const n = v.length, pts = [];
  v.forEach((y, i) => { if (y != null) pts.push([i * 100 / (n - 1), 28 - (y / 100) * 26]); });
  const d = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('');
  return '<svg class="sp" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path d="' + d + 'L' + pts[pts.length - 1][0].toFixed(1) + ',30L' + pts[0][0].toFixed(1) + ',30Z" fill="' + color + '" opacity=".12"/>' +
    '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="1.8" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>';
};
const DIST = [['Top 3', x => x > 0 && x <= 3, '#0f7a58'], ['4–10', x => x >= 4 && x <= 10, '#1baf7a'], ['11–20', x => x >= 11 && x <= 20, '#2a78d6'], ['21–50', x => x >= 21 && x <= 50, '#eda100'],
  ['51–100', x => x >= 51, '#eb6834'], ['Not in top 100', x => x === 0, '#c3ccd3']];
const distOf = kw => DIST.map(z => ({label: z[0], n: kw.filter(r => r.rank != null && z[1](r.rank)).length, color: z[2]}));
W.kw_kpis = {g: 'kw', t: 'Ranking summary', d: 'Tracked keywords, top 3, top 10, and how many moved up or down.', size: 'xl', needs: ['kw'],
  render(h, ctx, w, D){
    const r = D.kw, ranked = r.filter(x => x.rank > 0);
    if (!r.length){ h.innerHTML = '<div class="rp-err">No keywords tracked for this client yet.</div>'; return; }
    const up = r.filter(x => rankMove(x.rank, x.prev).cls === 'up').length, down = r.filter(x => rankMove(x.rank, x.prev).cls === 'down').length;
    const avg = ranked.length ? (ranked.reduce((t, x) => t + x.rank, 0) / ranked.length).toFixed(1) : '—';
    const t3 = ranked.filter(x => x.rank <= 3).length, t10 = ranked.filter(x => x.rank <= 10).length;
    const dist = distOf(r), tot = dist.reduce((t, x) => t + x.n, 0) || 1;
    h.innerHTML = '<div class="rp-kpis">' + kpiTile('Tracked', fmt(r.length), 'keyword + location pairs', {icon: glyph('search', 18, '#6250d6')}) +
      kpiTile('In top 3', fmt(t3), pctS(t3, r.length) + ' of tracked', {icon: glyph('trophy', 18, '#0f7a58')}) +
      kpiTile('In top 10', fmt(t10), pctS(t10, r.length) + ' on page one', {icon: logo('google', 18)}) +
      kpiTile('Average position', avg, 'of the ' + ranked.length + ' ranking', {icon: glyph('bars', 18, '#2a78d6')}) +
      kpiTile('Moved up', '<span style="color:var(--a-good)">▲ ' + up + '</span>', 'since the previous check', {icon: glyph('up', 18, '#0f7a58')}) +
      kpiTile('Moved down', '<span style="color:#b5352a">▼ ' + down + '</span>', 'since the previous check', {}) + '</div>' +
      '<div class="rp-dist" role="img" aria-label="Position distribution">' + dist.filter(x => x.n).map(x => '<i style="width:' + (x.n / tot * 100) + '%;background:' + x.color + '" title="' + esc(x.label) + ': ' + x.n + '"></i>').join('') + '</div>' +
      '<div class="aiv-chips" style="margin-top:8px">' + dist.filter(x => x.n).map(x => '<span class="aiv-chip" style="cursor:default"><i style="background:' + x.color + '"></i>' + esc(x.label) + ' · ' + x.n + '</span>').join('') + '</div>';
  }};
W.kw_cards = {g: 'kw', t: 'Keyword scorecards', d: 'One card per keyword: position, change since the last check and the trend. Made for client reports.', size: 'xl', needs: ['kw'],
  render(h, ctx, w, D){
    const rows = D.kw.slice().sort((a, b) => (a.rank > 0 ? a.rank : 999) - (b.rank > 0 ? b.rank : 999));
    if (!rows.length){ h.innerHTML = '<div class="rp-err">No keywords tracked for this client yet.</div>'; return; }
    /* Each card opens that keyword's Google search in a new tab. The team
       report keeps the position history one click away on the card. */
    h.innerHTML = '<div class="rp-kwc">' + rows.map((r, i) => {
      const col = r.rank > 0 && r.rank <= 10 ? '#0f7a58' : r.rank > 0 && r.rank <= 20 ? '#2a78d6' : '#eb6834';
      const href = safeUrl(r.url);
      const inner = '<div class="r"><span class="big">' + (r.rank > 0 ? '#' + r.rank : '<span style="font-size:16px;color:var(--a-ink3)">100+</span>') + '</span>' + moveChip(r.rank, r.prev) + '</div>' +
        '<div class="k" title="' + esc(r.kw) + '">' + esc(r.kw) + '</div>' +
        (r.loc ? '<div class="l">' + glyph('pin', 12) + esc(r.loc) + '</div>' : '') + rankSpark(r.hist, col) +
        (href ? '<div class="go">View search ↗' + (ctx.drill ? '<button type="button" class="rp-ib" data-i="' + i + '" title="Position history">History</button>' : '') + '</div>'
          : (ctx.drill ? '<div class="go"><button type="button" class="rp-ib" data-i="' + i + '">History</button></div>' : ''));
      return href ? '<a class="rp-kwa" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer" title="Open this search on Google">' + inner + '</a>' : '<div>' + inner + '</div>';
    }).join('') + '</div>';
    h.querySelectorAll('[data-i]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); DRILL.kw(ctx, rows[Number(el.dataset.i)]); }));
  }};
W.kw_table = {g: 'kw', t: 'Keyword positions', d: 'Every tracked keyword and location with its position, change and trend.', size: 'xl', needs: ['kw'],
  render(h, ctx, w, D){
    table(h, D.kw, [
      {key: 'kw', label: 'Keyword', fmt: r => '<b style="font-weight:600">' + esc(r.kw) + '</b>'},
      {key: 'loc', label: 'Location', fmt: r => r.loc ? '<span class="rp-nm" style="color:var(--a-ink2)">' + glyph('pin', 13) + esc(r.loc) + '</span>' : '—'},
      {key: 'rank', label: 'Position', num: true, fmt: r => rankBadge(r.rank), sort: r => r.rank == null ? 999 : r.rank === 0 ? 101 : r.rank},
      {key: 'mv', label: 'Change', num: true, fmt: r => { const m = rankMove(r.rank, r.prev); return m.txt && m.txt !== '=' ? '<span class="aiv-delta ' + m.cls + '">' + esc(m.txt) + '</span>' : '<span style="color:var(--a-ink3)">—</span>'; },
        sort: r => (r.prev == null || r.rank == null) ? 0 : (r.prev === 0 ? 101 : r.prev) - (r.rank === 0 ? 101 : r.rank)},
      {key: 'tr', label: 'Trend', fmt: r => '<span style="display:inline-block;width:90px;height:24px;vertical-align:middle">' + rankSpark(r.hist, '#2a78d6').replace('class="sp"', 'class="sp" style="width:90px;height:24px;display:block"') + '</span>', sort: r => r.hist.length},
      {key: 'url', label: 'Search', fmt: r => safeUrl(r.url) ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">View on Google ↗</a>' : '—', sort: r => r.url ? 1 : 0},
      {key: 'at', label: 'Checked', fmt: r => r.at ? esc(shortDate(isoDay(new Date(r.at)))) : '—'}
    ], {sort: 'rank', asc: true, maxH: w.h ? 0 : 460, empty: 'No keywords tracked for this client yet.', onRow: ctx.drill ? r => DRILL.kw(ctx, r) : null});
  }};
W.kw_movers = {g: 'kw', t: 'Biggest movers', d: 'Keywords that moved most since the previous check, up and down.', size: 'l', needs: ['kw'],
  render(h, ctx, w, D){
    const mv = D.kw.filter(r => r.rank != null && r.prev != null && r.rank !== r.prev).map(r => Object.assign({}, r, {dlt: (r.prev === 0 ? 101 : r.prev) - (r.rank === 0 ? 101 : r.rank)}));
    const ups = mv.filter(r => r.dlt > 0).sort((a, b) => b.dlt - a.dlt).slice(0, 6), downs = mv.filter(r => r.dlt < 0).sort((a, b) => a.dlt - b.dlt).slice(0, 6);
    const list = (rs, cls) => rs.length ? rs.map(r => '<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid var(--a-line2);font-size:12.5px"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(r.kw) + ' <span style="color:var(--a-ink3)">' + esc(r.loc) + '</span></span><span style="white-space:nowrap;display:inline-flex;gap:6px;align-items:center">' + rankBadge(r.rank) + ' <span class="aiv-delta ' + cls + '">' + esc(rankMove(r.rank, r.prev).txt) + '</span></span></div>').join('') : '<div class="rp-err">None</div>';
    h.innerHTML = '<div class="aiv-grid2"><div><b style="font-size:12px;color:var(--a-good)">Up</b>' + list(ups, 'up') + '</div><div><b style="font-size:12px;color:#b5352a">Down</b>' + list(downs, 'down') + '</div></div>';
  }};
W.kw_dist = {g: 'kw', t: 'Position distribution', d: 'How many keywords sit in the top 3, 4–10, 11–20, 21–50 and beyond.', size: 'm', needs: ['kw'],
  render(h, ctx, w, D){
    const b = distOf(D.kw).map((x, i) => Object.assign(x, {color: ctx.aa && i < 5 ? AA_DONUT[i] : ctx.aa ? '#E4E4E7' : x.color}));
    const tot = b.reduce((t, x) => t + x.n, 0);
    h.innerHTML = '<div class="rp-donutrow">' + donut(b.map(x => ({key: x.label, label: x.label, n: x.n, color: x.color})), {sub: 'positions'}) + legendRows(b, tot) + '</div>';
  }};

/* ---------- GBP grids ---------- */
const heatCol = r => r == null ? '#c3ccd3' : r <= 3 ? '#0f7a58' : r <= 10 ? '#eda100' : r <= 20 ? '#eb6834' : '#b5352a';
W.gbp_grids = {g: 'gbp', t: 'Map pack grids', d: 'Latest Google Maps rank grid per keyword: average rank and share of points in the top 3.', size: 'xl', needs: ['gbp'],
  render(h, ctx, w, D){
    const S = D.gbp;
    if (!S.length){ h.innerHTML = '<div class="rp-err">No Google Business Profile scans found for this client in the GBP Tracker.</div>'; return; }
    h.innerHTML = S.map(g => '<div style="margin-bottom:10px"><b style="font-size:13px">' + esc(g.name) + '</b><div class="rp-gbp" style="margin-top:8px">' + g.kws.map(k => {
      const L = k.last, P = k.prev, n = L.grid || 1;
      const cells = []; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++){ const p = L.pts.find(x => x[0] === r && x[1] === c); cells.push(p ? p[2] : null); }
      const d = P && P.avg && L.avg ? Math.round((P.avg - L.avg) * 10) / 10 : 0;
      return '<div><div style="font-size:12.5px;font-weight:600;line-height:1.3">' + esc(k.kw) + '</div>' +
        '<div style="font-size:11.5px;color:var(--a-ink2);margin-top:3px">' + (L.avg ? 'Avg #' + L.avg.toFixed(1) : 'Not found') + ' · ' + pctS(L.top3, L.n) + ' top 3' +
        (d ? ' <span class="aiv-delta ' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '▲ ' : '▼ ') + Math.abs(d) + '</span>' : '') + '</div>' +
        '<div class="rp-heat" style="grid-template-columns:repeat(' + n + ',1fr)">' + cells.map(v => '<i style="background:' + heatCol(v) + '">' + (v == null ? '' : v > 20 ? '20+' : esc(String(v))) + '</i>').join('') + '</div>' +
        '<div style="font-size:10.5px;color:var(--a-ink3);margin-top:4px">' + esc(prettyDate(isoDay(new Date(L.ts || Date.now())))) + '</div></div>';
    }).join('') + '</div></div>').join('');
  }};

/* ---------- Text and embeds ---------- */
/* ==========================================================================
   MORE WIDGETS
   Built from the same data as the others (GA4, Search Console, pages, forms,
   keyword rankings, Maps grids, AI). lvl 'tech' marks the ones made for
   specialists; everything else is written for anyone to read.
   ========================================================================== */
const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const wdOf = d => (new Date(String(d).slice(0, 10) + 'T12:00:00Z').getUTCDay() + 6) % 7;
const upDown = (cur, prev, has, word) => {
  if (!has || (!cur && !prev)) return '';
  if (!prev) return 'new this period';
  const p = Math.round((cur - prev) / prev * 100);
  return p === 0 ? 'about the same as before' : (p > 0 ? 'up ' : 'down ') + Math.abs(p) + '% on the previous ' + (word || 'period');
};
const tone = (cur, prev, has) => !has || !prev ? 'flat' : cur > prev * 1.03 ? 'up' : cur < prev * 0.97 ? 'down' : 'flat';
const sentence = (cls, html) => '<li class="rp-in-' + cls + '"><i></i><span>' + html + '</span></li>';
/* Weekday bars, Monday first. */
const weekBars = (vals, color, unit) => {
  const max = Math.max(1, ...vals), best = vals.indexOf(Math.max(...vals));
  return '<div class="rp-wk">' + vals.map((v, i) => '<div class="rp-wk-c' + (i === best && v ? ' best' : '') + '"><b>' + fmt(Math.round(v)) + '</b><span class="rp-wk-b"><i style="height:' + (v / max * 100).toFixed(1) + '%;background:' + color + '"></i></span><em>' + WD[i] + '</em></div>').join('') + '</div>' +
    (vals.some(Boolean) ? '<p class="aiv-cap" style="margin-top:8px">Busiest day: <b>' + WD[best] + '</b> (' + fmt(Math.round(vals[best])) + ' ' + unit + ').</p>' : '');
};
/* The client's brand words: from the client name and the domain, plus any added on the widget. */
const brandWords = (ctx, w) => {
  const extra = String((w.cfg && w.cfg.brand) || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  /* The whole name ("mountain view precast") and the domain ("mountainviewprecast"): single words like "precast" would also match generic searches. */
  const dom = String(ctx.domain || '').split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const name = String(ctx.clientName || '').toLowerCase().replace(/\b(inc|ltd|llp|llc|corp|corporation|limited|the|co)\b\.?/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  return Array.from(new Set(extra.concat(dom.length > 3 ? [dom] : [], name.split(' ').length > 1 ? [name, name.replace(/ /g, '')] : name.length > 3 ? [name] : [])));
};

/* ---------- Insights & goals ---------- */
W.insight_summary = {g: 'insight', t: 'This period in plain English', d: 'A short written summary: visits, where they came from, leads, Google and rankings, compared with the period before.', size: 'l', needs: ['g4', 'gsc', 'kw', 'forms'], soft: true,
  render(h, ctx, w, D){
    const out = [];
    if (D.g4){
      const S = g4Split(ctx, D.g4), s = sum(S.traffic, 2), ps = sum(S.trafficPrev, 2), k = sum(S.conv, 5), pk = sum(S.convPrev, 5);
      out.push(sentence(tone(s, ps, S.hasPrev), '<b>' + fmt(s) + ' visits</b> to the website, ' + esc(upDown(s, ps, S.hasPrev) || 'for this period') + '.'));
      const top = group(S.traffic, r => r[1], 2)[0];
      if (top && s) out.push(sentence('flat', 'Most visitors came from <b>' + esc(chName(top.k)) + '</b> (' + pctS(top.n, s) + ' of visits).'));
      out.push(sentence(tone(k, pk, S.hasPrev), '<b>' + fmt(k) + ' conversions</b> (calls, forms, bookings and other key actions), ' + esc(upDown(k, pk, S.hasPrev) || 'this period') + '.'));
      const ai = sum(S.traffic.filter(r => isAi(r[1])), 2);
      if (ai) out.push(sentence('up', '<b>' + fmt(ai) + ' visits</b> came from AI assistants like ChatGPT and Perplexity.'));
    }
    if (D.forms){
      const M = formsModel(ctx, D.forms);
      if (M.cur.length || M.prev.length) out.push(sentence(tone(M.cur.length, M.prev.length, M.hasPrev), '<b>' + fmt(M.cur.length) + ' form submissions</b> came through the website' + (M.hasPrev ? ', ' + esc(upDown(M.cur.length, M.prev.length, true)) : '') + '.'));
    }
    if (D.gsc && D.gsc.totals){
      const t = D.gsc.totals, p = (D.gsc.previous || {}).totals;
      out.push(sentence(p ? tone(t.clicks, p.clicks, true) : 'flat', 'Google Search showed the site <b>' + fmtK(t.impressions) + ' times</b> and sent <b>' + fmt(t.clicks) + ' clicks</b>' + (p ? ', ' + esc(upDown(t.clicks, p.clicks, true)) : '') + '.'));
    }
    if (D.kw && D.kw.length){
      const r = D.kw.filter(x => x.rank > 0), t3 = r.filter(x => x.rank <= 3).length, t10 = r.filter(x => x.rank <= 10).length;
      const up = D.kw.filter(x => x.rank > 0 && x.prev > 0 && x.rank < x.prev).length, dn = D.kw.filter(x => x.rank > 0 && x.prev > 0 && x.rank > x.prev).length;
      out.push(sentence(up > dn ? 'up' : dn > up ? 'down' : 'flat', '<b>' + t3 + ' of ' + D.kw.length + '</b> tracked keywords are in Google’s top 3 and <b>' + t10 + '</b> on page one; ' + up + ' moved up and ' + dn + ' moved down at the last check.'));
    }
    h.innerHTML = out.length ? '<ul class="rp-in">' + out.join('') + '</ul><p class="aiv-foot">Written automatically from this report’s data, ' + esc(ctx.R.text || '') + '.</p>' : '<div class="rp-err">No data yet for this period.</div>';
  }};
W.insight_wins = {g: 'insight', t: 'Wins and watch-outs', d: 'What improved and what slipped since the previous period, across channels, pages, Google and keywords.', size: 'l', needs: ['g4', 'gsc', 'kw', 'pages'], soft: true,
  render(h, ctx, w, D){
    const wins = [], watch = [];
    const add = (cur, prev, html) => { if (cur > prev) wins.push([cur - prev, html]); else if (cur < prev) watch.push([prev - cur, html]); };
    if (D.g4){
      const S = g4Split(ctx, D.g4);
      if (S.hasPrev){
        const now = group(S.traffic, r => r[1], 2), before = group(S.trafficPrev, r => r[1], 2);
        const keys = new Set(now.map(x => x.k).concat(before.map(x => x.k)));
        keys.forEach(k => { const a = (now.find(x => x.k === k) || {n: 0}).n, b = (before.find(x => x.k === k) || {n: 0}).n;
          if (Math.abs(a - b) >= 5) add(a, b, '<b>' + esc(chName(k)) + '</b> visits ' + (a > b ? 'up' : 'down') + ' ' + fmt(Math.abs(a - b)) + ' (' + fmt(b) + ' → ' + fmt(a) + ')'); });
        const k = sum(S.conv, 5), pk = sum(S.convPrev, 5);
        if (k !== pk) add(k, pk, '<b>Conversions</b> ' + (k > pk ? 'up' : 'down') + ' from ' + fmt(pk) + ' to ' + fmt(k));
      }
    }
    if (D.pages){
      const P = pagesModel(D.pages);
      if (P.hasPrev) P.rows.filter(r => Math.abs(r.s - r.ps) >= 10).sort((a, b) => Math.abs(b.s - b.ps) - Math.abs(a.s - a.ps)).slice(0, 6)
        .forEach(r => add(r.s, r.ps, 'Page <span class="aiv-page">' + esc(r.k) + '</span> ' + fmt(r.ps) + ' → ' + fmt(r.s) + ' visits'));
    }
    if (D.gsc && D.gsc.totals && D.gsc.previous && D.gsc.previous.totals){
      const t = D.gsc.totals, p = D.gsc.previous.totals;
      add(t.clicks, p.clicks, '<b>Google clicks</b> ' + fmt(p.clicks) + ' → ' + fmt(t.clicks));
      if (t.position && p.position && Math.abs(t.position - p.position) >= 0.3) add(p.position, t.position, '<b>Average Google position</b> ' + p.position + ' → ' + t.position);
    }
    (D.kw || []).filter(r => r.rank > 0 && r.prev > 0 && r.rank !== r.prev).forEach(r => add(r.prev, r.rank, '“' + esc(r.kw) + '”' + (r.loc ? ' (' + esc(r.loc) + ')' : '') + ' #' + r.prev + ' → #' + r.rank));
    const col = (title, list, cls, emptyTxt) => '<div><h4 class="rp-fs-h">' + title + '</h4><ul class="rp-in">' + (list.length ? list.sort((a, b) => b[0] - a[0]).slice(0, 7).map(x => sentence(cls, x[1])).join('') : '<li class="aiv-cap">' + emptyTxt + '</li>') + '</ul></div>';
    h.innerHTML = '<div class="aiv-grid2">' + col('Wins', wins, 'up', 'Nothing clearly up yet.') + col('Watch-outs', watch, 'down', 'Nothing clearly down. Good.') + '</div>';
  }};
const GOAL_METRICS = {sessions: ['Visits', 'g4'], conversions: ['Conversions', 'g4'], leads: ['Form submissions', 'forms'], clicks: ['Google clicks', 'gsc']};
W.goal_tracker = {g: 'insight', t: 'Goal tracker', d: 'Set a target (visits, conversions, form submissions or Google clicks) and see progress and whether the period is on pace.', size: 'm', needs: ['g4', 'forms', 'gsc'], soft: true,
  render(h, ctx, w, D){
    const cf = w.cfg = w.cfg || {}, m = GOAL_METRICS[cf.metric] ? cf.metric : 'conversions', target = Number(cf.target) || 0;
    let cur = null;
    if (m === 'sessions' && D.g4) cur = sum(g4Split(ctx, D.g4).traffic, 2);
    if (m === 'conversions' && D.g4) cur = sum(g4Split(ctx, D.g4).conv, 5);
    if (m === 'leads' && D.forms) cur = formsModel(ctx, D.forms).cur.length;
    if (m === 'clicks' && D.gsc && D.gsc.totals) cur = Number(D.gsc.totals.clicks) || 0;
    const days = ctx.R.days || 30, today = isoDay(new Date()), elapsed = Math.max(1, Math.min(days, Math.round((Date.parse(today < ctx.R.end ? today : ctx.R.end) - Date.parse(ctx.R.since)) / 864e5) + 1));
    const pace = cur == null ? 0 : cur / elapsed * days, p = target ? Math.min(1, (cur || 0) / target) : 0;
    const R0 = 52, C = 2 * Math.PI * R0, col = !target ? '#8795a1' : pace >= target ? '#0f7a58' : pace >= target * 0.8 ? '#eda100' : '#e34948';
    h.innerHTML = '<div class="rp-goal"><svg viewBox="0 0 130 130" width="130" height="130"><circle cx="65" cy="65" r="' + R0 + '" fill="none" stroke="var(--a-line,#e4e9ed)" stroke-width="12"/>' +
      '<circle cx="65" cy="65" r="' + R0 + '" fill="none" stroke="' + col + '" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + (C * p).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 65 65)"/>' +
      '<text x="65" y="62" text-anchor="middle" font-size="24" font-weight="700" fill="currentColor">' + (cur == null ? '—' : fmt(cur)) + '</text><text x="65" y="82" text-anchor="middle" font-size="11" fill="#8b98a3">' + (target ? 'of ' + fmt(target) : 'no goal set') + '</text></svg>' +
      '<div><div class="rp-goal-m">' + esc(GOAL_METRICS[m][0]) + '</div>' +
      (cur == null ? '<p class="aiv-cap">No ' + esc(GOAL_METRICS[m][0].toLowerCase()) + ' data for this client yet.</p>'
        : target ? '<p style="margin:6px 0 0"><b style="color:' + col + '">' + (pace >= target ? 'On pace' : pace >= target * 0.8 ? 'Close' : 'Behind') + '</b>: about ' + fmt(Math.round(pace)) + ' by the end of the period (' + Math.round(pace / target * 100) + '% of the goal).</p>'
        : '<p class="aiv-cap" style="margin-top:6px">Set a goal to see progress and pace.</p>') +
      (ctx.saveItem ? '<button type="button" class="aiv-btn" data-goal style="margin-top:10px">' + (target ? 'Change goal' : 'Set a goal') + '</button>' : '') + '</div></div>';
    const b = h.querySelector('[data-goal]');
    if (b) b.addEventListener('click', () => {
      const pick = prompt('Which number? Type one of: sessions, conversions, leads, clicks', m);
      if (pick == null || !GOAL_METRICS[pick.trim().toLowerCase()]) return;
      const t = prompt('Goal for the period shown (' + (ctx.R.label || '') + '):', target || '');
      if (t == null || !(Number(t) > 0)) return;
      cf.metric = pick.trim().toLowerCase(); cf.target = Math.round(Number(t)); ctx.saveItem(w); W.goal_tracker.render(h, ctx, w, D);
    });
  }};
W.insight_scorecard = {g: 'insight', t: 'Report card', d: 'A grade for each area (visits, leads, Google, rankings, AI) from how it moved since the previous period.', size: 'l', needs: ['g4', 'gsc', 'kw', 'forms', 'feed'], soft: true,
  render(h, ctx, w, D){
    const grade = (cur, prev, has) => { if (!has || !prev) return cur ? ['B', 'Holding'] : ['–', 'Not enough data']; const p = (cur - prev) / prev;
      return p >= 0.2 ? ['A', 'Strong growth'] : p >= 0.05 ? ['B', 'Growing'] : p > -0.05 ? ['C', 'Steady'] : p > -0.2 ? ['D', 'Slipping'] : ['F', 'Dropping']; };
    const rows = [];
    if (D.g4){ const S = g4Split(ctx, D.g4); rows.push(['Website visits', grade(sum(S.traffic, 2), sum(S.trafficPrev, 2), S.hasPrev), fmt(sum(S.traffic, 2))]);
      rows.push(['Conversions', grade(sum(S.conv, 5), sum(S.convPrev, 5), S.hasPrev), fmt(sum(S.conv, 5))]); }
    if (D.forms){ const M = formsModel(ctx, D.forms); rows.push(['Form leads', grade(M.cur.length, M.prev.length, M.hasPrev), fmt(M.cur.length)]); }
    if (D.gsc && D.gsc.totals){ const t = D.gsc.totals, p = (D.gsc.previous || {}).totals; rows.push(['Google Search', grade(t.clicks, p && p.clicks, !!p), fmt(t.clicks) + ' clicks']); }
    if (D.kw && D.kw.length){ const r = D.kw.filter(x => x.rank > 0), t10 = r.filter(x => x.rank <= 10).length, share = t10 / D.kw.length;
      rows.push(['Keyword rankings', share >= 0.7 ? ['A', 'Mostly page one'] : share >= 0.5 ? ['B', 'Half on page one'] : share >= 0.3 ? ['C', 'Some on page one'] : ['D', 'Few on page one'], t10 + '/' + D.kw.length + ' top 10']); }
    if (D.feed){ const M = aiModel(ctx, D.feed); rows.push(['AI assistants', grade(M.ai.s, M.ai.ps, M.ai.hasPrev), fmt(M.ai.s) + ' visits']); }
    const col = g => ({A: '#0f7a58', B: '#1baf7a', C: '#eda100', D: '#e87a3a', F: '#e34948'}[g] || '#8795a1');
    h.innerHTML = rows.length ? '<div class="rp-grade">' + rows.map(r => '<div><span class="rp-grade-l" style="background:' + col(r[1][0]) + '">' + r[1][0] + '</span><div><b>' + esc(r[0]) + '</b><small>' + esc(r[1][1]) + ' · ' + esc(r[2]) + '</small></div></div>').join('') + '</div>' +
      '<p class="aiv-foot">A: up 20%+ · B: up 5–20% · C: within 5% · D: down 5–20% · F: down 20%+, versus the previous period.</p>' : '<div class="rp-err">No data yet for this period.</div>';
  }};
W.insight_compare = {g: 'insight', t: 'This period vs the last', d: 'Every headline number side by side with the period before and the change.', size: 'l', needs: ['g4', 'gsc', 'forms'], soft: true,
  render(h, ctx, w, D){
    const rows = [];
    const r = (k, a, b, has, fmtF, inv) => rows.push({k, a, b, has, f: fmtF || fmt, inv});
    if (D.g4){ const S = g4Split(ctx, D.g4), s = sum(S.traffic, 2), ps = sum(S.trafficPrev, 2);
      r('Visits', s, ps, S.hasPrev); r('Users', sum(S.traffic, 4), sum(S.trafficPrev, 4), S.hasPrev);
      r('Engagement rate', s ? sum(S.traffic, 3) / s * 100 : 0, ps ? sum(S.trafficPrev, 3) / ps * 100 : 0, S.hasPrev, v => v.toFixed(1) + '%');
      r('Conversions', sum(S.conv, 5), sum(S.convPrev, 5), S.hasPrev);
      r('Conversion rate', s ? sum(S.conv, 5) / s * 100 : 0, ps ? sum(S.convPrev, 5) / ps * 100 : 0, S.hasPrev, v => v.toFixed(2) + '%'); }
    if (D.forms){ const M = formsModel(ctx, D.forms); r('Form submissions', M.cur.length, M.prev.length, M.hasPrev); }
    if (D.gsc && D.gsc.totals){ const t = D.gsc.totals, p = (D.gsc.previous || {}).totals || {};
      r('Google clicks', Number(t.clicks) || 0, Number(p.clicks) || 0, !!(D.gsc.previous)); r('Google impressions', Number(t.impressions) || 0, Number(p.impressions) || 0, !!(D.gsc.previous), fmtK);
      r('Average position', Number(t.position) || 0, Number(p.position) || 0, !!(D.gsc.previous), v => v ? v.toFixed(1) : '—', true); }
    table(h, rows, [{key: 'k', label: 'Measure', fmt: x => esc(x.k)}, {key: 'b', label: 'Before', num: true, fmt: x => x.has ? esc(x.f(x.b)) : '—'},
      {key: 'a', label: 'Now', num: true, fmt: x => '<b>' + esc(x.f(x.a)) + '</b>'},
      {key: 'd', label: 'Change', num: true, sort: x => x.b ? (x.a - x.b) / x.b : 0, fmt: x => { const d = delta(x.a, x.b, x.has); if (x.inv && d.txt) d.cls = d.cls === 'up' ? 'down' : d.cls === 'down' ? 'up' : d.cls; return d.txt ? '<span class="aiv-delta ' + d.cls + '">' + esc(d.txt) + '</span>' : '—'; }}],
      {sort: 'k', asc: true, empty: 'No data for this period.'});
    const tb = h.querySelector('tbody'); if (tb){ const order = rows.map(x => x.k); Array.from(tb.children).sort((a, b) => order.indexOf(a.cells[0].textContent) - order.indexOf(b.cells[0].textContent)).forEach(tr => tb.appendChild(tr)); }
  }};
W.insight_forecast = {g: 'insight', t: 'Monthly pace', d: 'At the current pace, how many visits, conversions and leads a month looks like.', size: 'm', needs: ['g4', 'forms'], soft: true,
  render(h, ctx, w, D){
    const days = ctx.R.days || 30, k = 30 / days, tiles = [];
    if (D.g4){ const S = g4Split(ctx, D.g4); tiles.push(kpiTile('Visits a month', fmt(Math.round(sum(S.traffic, 2) * k)), 'at this pace', {})); tiles.push(kpiTile('Conversions a month', fmt(Math.round(sum(S.conv, 5) * k)), 'at this pace', {})); }
    if (D.forms){ const M = formsModel(ctx, D.forms); tiles.push(kpiTile('Leads a month', (M.cur.length * k).toFixed(M.cur.length * k < 10 ? 1 : 0), 'form submissions', {})); }
    h.innerHTML = tiles.length ? '<div class="rp-kpis">' + tiles.join('') + '</div><p class="aiv-foot">Based on ' + days + ' days (' + esc(ctx.R.text || '') + '), scaled to 30 days.</p>' : '<div class="rp-err">No data yet.</div>';
  }};
W.insight_weekday = {g: 'insight', t: 'Best days of the week', d: 'Visits and conversions by weekday: when people browse and when they act.', size: 'l', needs: ['g4'],
  render(h, ctx, w, D){
    const S = g4Split(ctx, D.g4), v = [0, 0, 0, 0, 0, 0, 0], c = [0, 0, 0, 0, 0, 0, 0];
    S.traffic.forEach(r => { v[wdOf(r[0])] += Number(r[2]) || 0; }); S.conv.forEach(r => { c[wdOf(r[0])] += Number(r[5]) || 0; });
    h.innerHTML = '<div class="aiv-grid2"><div><h4 class="rp-fs-h">Visits</h4>' + weekBars(v, '#2a78d6', 'visits') + '</div><div><h4 class="rp-fs-h">Conversions</h4>' + weekBars(c, '#0f7a58', 'conversions') + '</div></div>';
  }};

/* ---------- Google Analytics ---------- */
W.ga4_engagement = {g: 'traffic', lvl: 'tech', t: 'Engagement by channel', d: 'Engagement rate, sessions per user and conversion rate for each channel, against the site average.', size: 'l', needs: ['g4'],
  render(h, ctx, w, D){
    const S = g4Split(ctx, D.g4), m = {};
    S.traffic.forEach(r => { const o = m[r[1]] = m[r[1]] || {k: r[1], s: 0, e: 0, u: 0, c: 0}; o.s += +r[2] || 0; o.e += +r[3] || 0; o.u += +r[4] || 0; o.c += +r[5] || 0; });
    const rows = Object.values(m).filter(x => x.s), ts = sum(S.traffic, 2), avgE = ts ? sum(S.traffic, 3) / ts : 0;
    table(h, rows, [{key: 'k', label: 'Channel', fmt: r => chLabel(r.k)}, {key: 's', label: 'Sessions', num: true, fmt: r => fmt(r.s)},
      {key: 'er', label: 'Engaged', num: true, sort: r => r.e / r.s, fmt: r => '<span style="color:' + (r.e / r.s >= avgE ? '#0f7a58' : '#c0392b') + '">' + pctS(r.e, r.s) + '</span>'},
      {key: 'spu', label: 'Sessions / user', num: true, sort: r => r.u ? r.s / r.u : 0, fmt: r => r.u ? (r.s / r.u).toFixed(2) : '—'},
      {key: 'cr', label: 'Conv. rate', num: true, sort: r => r.c / r.s, fmt: r => pctS(r.c, r.s)}], {sort: 's', empty: 'No sessions in this period.'});
    h.insertAdjacentHTML('beforeend', '<p class="aiv-foot">Green: engagement above the site average (' + (avgE * 100).toFixed(1) + '%).</p>');
  }};
W.ga4_mix_shift = {g: 'traffic', lvl: 'tech', t: 'Channel mix shift', d: 'Each channel’s share of visits now vs the previous period, in percentage points.', size: 'm', needs: ['g4'],
  render(h, ctx, w, D){
    const S = g4Split(ctx, D.g4), a = sum(S.traffic, 2), b = sum(S.trafficPrev, 2);
    const now = group(S.traffic, r => r[1], 2), pre = group(S.trafficPrev, r => r[1], 2);
    const rows = Array.from(new Set(now.map(x => x.k).concat(pre.map(x => x.k)))).map(k => { const n = (now.find(x => x.k === k) || {n: 0}).n, p = (pre.find(x => x.k === k) || {n: 0}).n;
      return {k, sh: a ? n / a * 100 : 0, ps: b ? p / b * 100 : 0}; }).map(r => Object.assign(r, {d: r.sh - r.ps}));
    if (!S.hasPrev){ h.innerHTML = '<div class="rp-err">Needs the previous period to compare.</div>'; return; }
    table(h, rows, [{key: 'k', label: 'Channel', fmt: r => chLabel(r.k)}, {key: 'ps', label: 'Before', num: true, fmt: r => r.ps.toFixed(1) + '%'}, {key: 'sh', label: 'Now', num: true, fmt: r => r.sh.toFixed(1) + '%'},
      {key: 'd', label: 'Shift', num: true, fmt: r => '<span class="aiv-delta ' + (r.d > 0.2 ? 'up' : r.d < -0.2 ? 'down' : 'flat') + '">' + (r.d > 0 ? '+' : '') + r.d.toFixed(1) + ' pts</span>'}], {sort: 'sh'});
  }};
W.ga4_conv_rate = {g: 'traffic', lvl: 'tech', t: 'Conversion rate over time', d: 'Conversions per 100 sessions, day by day or week by week, overall and for organic search.', size: 'l', needs: ['g4'],
  render(h, ctx, w, D){
    const S = g4Split(ctx, D.g4), B = buckets(ctx.R), s = B.zero(), c = B.zero(), so = B.zero(), co = B.zero();
    S.traffic.forEach(r => { const i = B.slot(r[0]); if (i == null) return; s[i] += +r[2] || 0; if (r[1] === 'Organic Search') so[i] += +r[2] || 0; });
    S.conv.forEach(r => { const i = B.slot(r[0]); if (i == null) return; c[i] += +r[5] || 0; if (r[1] === 'Organic Search') co[i] += +r[5] || 0; });
    const rate = (k, n) => n.map((x, i) => x ? Math.round(k[i] / x * 1000) / 10 : 0);
    fillBody(h, ctx, w);
    chart(h, {labels: B.labels, weekly: ctx.R.weekly, height: chH(w, 220, 70), series: [{name: 'All traffic', color: '#0f7a58', values: rate(c, s), area: true}, {name: 'Organic search', color: '#1baf7a', values: rate(co, so), dash: true}],
      empty: 'No sessions in this period.', foot: 'Conversions per 100 sessions.'}, ctx, w);
  }};
W.ga4_lead_sources = {g: 'conv', t: 'Sources that bring conversions', d: 'The websites, search engines and campaigns behind each conversion, ranked.', size: 'm', needs: ['g4'],
  render(h, ctx, w, D){
    const S = g4Split(ctx, D.g4), rows = group(S.conv, r => (r[2] === '(direct)' ? 'Direct' : r[2] || '(not set)'), 5), max = Math.max(1, ...rows.map(x => x.n));
    table(h, rows, [{key: 'k', label: 'Source', fmt: r => esc(r.k)}, {key: 'n', label: 'Conversions', num: true, fmt: r => barCell(r.n, max, '#0f7a58')}], {sort: 'n', empty: 'No conversions in this period.', maxH: 320});
  }};
W.ga4_opportunity_pages = {g: 'traffic', lvl: 'tech', t: 'Busy pages that don’t convert', d: 'Pages people land on a lot whose visits rarely end in a key event: the first pages to improve.', size: 'l', needs: ['pages'],
  render(h, ctx, w, D){
    const P = pagesModel(D.pages), tot = P.rows.reduce((t, r) => t + r.s, 0), conv = P.rows.reduce((t, r) => t + r.c[PGI.ek], 0), avg = tot ? conv / tot : 0;
    const rows = P.rows.filter(r => r.s >= 20).map(r => ({k: r.k, title: r.title, s: r.s, ek: r.c[PGI.ek], cr: r.s ? r.c[PGI.ek] / r.s : 0})).filter(r => r.cr < avg * 0.6).map(r => Object.assign(r, {lost: Math.round(r.s * avg - r.ek)}));
    table(h, rows, [{key: 'k', label: 'Landing page', fmt: r => '<span class="aiv-page">' + esc(r.k) + '</span>'}, {key: 's', label: 'Sessions', num: true, fmt: r => fmt(r.s)},
      {key: 'cr', label: 'Conv. rate', num: true, fmt: r => (r.cr * 100).toFixed(1) + '%'}, {key: 'lost', label: 'Missed at site rate', num: true, fmt: r => '≈' + fmt(r.lost)}],
      {sort: 'lost', empty: 'No busy page converts well below the site average. Nice.', maxH: 360});
    h.insertAdjacentHTML('beforeend', '<p class="aiv-foot">Site average: ' + (avg * 100).toFixed(1) + '% of sessions reach a key event. “Missed” = conversions the page would have had at that rate.</p>');
  }};
W.ga4_rising_pages = {g: 'traffic', t: 'Rising and falling pages', d: 'The pages that gained and lost the most visits since the previous period.', size: 'l', needs: ['pages'],
  render(h, ctx, w, D){
    const P = pagesModel(D.pages);
    if (!P.hasPrev){ h.innerHTML = '<div class="rp-err">Needs the previous period to compare.</div>'; return; }
    const ch = P.rows.map(r => ({k: r.k, s: r.s, ps: r.ps, d: r.s - r.ps})).filter(r => r.d);
    const list = (rows, cls) => rows.length ? '<ul class="rp-in">' + rows.map(r => sentence(cls, '<span class="aiv-page">' + esc(r.k) + '</span> <b>' + (r.d > 0 ? '+' : '') + fmt(r.d) + '</b> <small style="color:var(--a-ink3)">(' + fmt(r.ps) + ' → ' + fmt(r.s) + ')</small>')).join('') + '</ul>' : '<p class="aiv-cap">None.</p>';
    h.innerHTML = '<div class="aiv-grid2"><div><h4 class="rp-fs-h">Rising</h4>' + list(ch.filter(r => r.d > 0).sort((a, b) => b.d - a.d).slice(0, 8), 'up') + '</div><div><h4 class="rp-fs-h">Falling</h4>' + list(ch.filter(r => r.d < 0).sort((a, b) => a.d - b.d).slice(0, 8), 'down') + '</div></div>';
  }};
W.ga4_engaging_pages = {g: 'traffic', t: 'Pages people read the longest', d: 'Average time people spend on each page (pages with at least 10 users).', size: 'm', needs: ['pages'],
  render(h, ctx, w, D){
    const P = pagesModel(D.pages), rows = P.rows.filter(r => r.u >= 10).sort((a, b) => b.t - a.t).slice(0, 15), max = Math.max(1, ...rows.map(r => r.t));
    table(h, rows, [{key: 'k', label: 'Page', fmt: r => '<span class="aiv-page">' + esc(r.k) + '</span>'}, {key: 't', label: 'Avg. time', num: true, fmt: r => barCell(Math.round(r.t), max, '#6250d6').replace('<span>' + fmt(Math.round(r.t)) + '</span>', '<span>' + pgDur(r.t) + '</span>')}], {sort: 't', empty: 'Not enough visits yet.', maxH: 340});
  }};
W.ga4_unvisited = {g: 'traffic', lvl: 'tech', t: 'Pages nobody visited', d: 'Pages in the sitemap with no sessions this period: candidates to improve, link to, merge or remove.', size: 'm', needs: ['pages'],
  render(h, ctx, w, D){
    const P = pagesModel(D.pages);
    if (!P.hasSm){ h.innerHTML = '<div class="rp-err">No sitemap found for this site.</div>'; return; }
    const rows = P.rows.filter(r => r.sm && !r.v);
    h.innerHTML = bigNum(fmt(rows.length), null, 'of ' + fmt(P.smCount) + ' sitemap pages had no visits') + '<div data-l style="margin-top:10px"></div>';
    table(h.querySelector('[data-l]'), rows.map(r => ({k: r.k})), [{key: 'k', label: 'Page', fmt: r => '<span class="aiv-page">' + esc(r.k) + '</span>'}], {sort: 'k', asc: true, maxH: 260, empty: 'Every sitemap page had visits.'});
  }};

/* ---------- Search Console ---------- */
W.gsc_ctr_curve = {g: 'gsc', lvl: 'tech', t: 'Click-through rate by position', d: 'Average CTR for queries at each Google position, against a typical benchmark. Gaps show where titles and snippets underperform.', size: 'l', needs: ['gsc'],
  render(h, ctx, w, D){
    const BM = [28, 15, 11, 8, 6.5, 5, 4, 3.2, 2.8, 2.5];
    const b = Array.from({length: 10}, () => ({c: 0, i: 0}));
    (D.gsc.queries || []).forEach(q => { const p = Math.round(Number(q[4]) || 0); if (p >= 1 && p <= 10){ b[p - 1].c += +q[1] || 0; b[p - 1].i += +q[2] || 0; } });
    const site = b.map(x => x.i ? Math.round(x.c / x.i * 1000) / 10 : 0);
    fillBody(h, ctx, w);
    chart(h, {labels: BM.map((x, i) => 'Pos ' + (i + 1)), height: chH(w, 220, 70), series: [{name: 'This site', color: '#2a78d6', values: site, area: true}, {name: 'Typical', color: '#8795a1', values: BM, dash: true}],
      empty: 'Not enough Search Console data.', foot: 'CTR % by rounded average position (page one), from the searches Google shows; private searches aren’t included. Typical curve: industry averages, rounded.'}, ctx, w);
  }};
W.gsc_brand = {g: 'gsc', lvl: 'tech', t: 'Branded vs non-branded searches', d: 'Clicks from people searching the business name vs everything else (new customers finding the site).', size: 'm', needs: ['gsc'],
  render(h, ctx, w, D){
    const words = brandWords(ctx, w), isB = q => words.some(b => String(q).toLowerCase().indexOf(b) > -1);
    let bc = 0, nc = 0, bi = 0, ni = 0;
    (D.gsc.queries || []).forEach(q => { if (isB(q[0])){ bc += +q[1] || 0; bi += +q[2] || 0; } else { nc += +q[1] || 0; ni += +q[2] || 0; } });
    const hid = gscHidden(D);
    const segs = [{key: 'b', label: 'Branded', n: bc, color: sc(ctx, '#6250d6', 0)}, {key: 'n', label: 'Non-branded', n: nc, color: sc(ctx, '#1baf7a', 1)}];
    if (hid.c || hid.i) segs.push({key: 'p', label: 'Private (not shown by Google)', n: hid.c, color: sc(ctx, '#c3ccd3', 2)});
    h.innerHTML = '<div class="rp-donutrow">' + donut(segs, {sub: 'clicks'}) + legendRows(segs.map(s => ({n: s.n, label: s.label, color: s.color})), bc + nc + hid.c) + '</div>' +
      '<p class="aiv-foot">Brand words: ' + esc(words.join(', ') || 'none found') + '. Impressions: ' + fmtK(bi) + ' branded, ' + fmtK(ni) + ' non-branded' + (hid.i ? ', ' + fmtK(hid.i) + ' private' : '') + '.' +
      (hid.c || hid.i ? ' Google doesn’t say what private searches were, so they can’t be split into branded or not.' : '') + (ctx.saveItem ? ' <a href="#" data-bw>Edit brand words</a>' : '') + '</p>';
    const a = h.querySelector('[data-bw]');
    if (a) a.addEventListener('click', e => { e.preventDefault(); const v = prompt('Extra brand words, comma-separated (the client name and domain are always used):', (w.cfg && w.cfg.brand) || ''); if (v == null) return; w.cfg = w.cfg || {}; w.cfg.brand = v; ctx.saveItem(w); W.gsc_brand.render(h, ctx, w, D); });
  }};
W.gsc_questions = {g: 'gsc', t: 'Questions people ask Google', d: 'Searches phrased as questions that showed the site: ready-made ideas for FAQs and blog posts.', size: 'l', needs: ['gsc'],
  render(h, ctx, w, D){
    const re = /^(who|what|whats|what's|when|where|why|how|can|could|do|does|is|are|should|will|which|best|cost of|price of)\b/i;
    gscTable(h, ctx, (D.gsc.queries || []).filter(q => re.test(String(q[0]).trim()) || /\?\s*$/.test(q[0])), {sort: 'i', empty: 'No question-style searches this period.'});
  }};
W.gsc_query_length = {g: 'gsc', lvl: 'tech', t: 'Short vs long searches', d: 'Clicks and impressions by number of words in the search: head terms vs long-tail.', size: 'm', needs: ['gsc'],
  render(h, ctx, w, D){
    const L = ['1 word', '2 words', '3 words', '4 words', '5+ words'], rows = L.map(k => ({k, c: 0, i: 0}));
    (D.gsc.queries || []).forEach(q => { const n = Math.min(5, String(q[0]).trim().split(/\s+/).length) - 1; rows[n].c += +q[1] || 0; rows[n].i += +q[2] || 0; });
    const hid = gscHidden(D);
    if (hid.c || hid.i) rows.push({k: 'Private searches', c: hid.c, i: hid.i});
    const max = Math.max(1, ...rows.map(r => r.c));
    table(h, rows, [{key: 'k', label: 'Search length', fmt: r => esc(r.k)}, {key: 'c', label: 'Clicks', num: true, fmt: r => barCell(r.c, max, '#2a78d6')}, {key: 'i', label: 'Impressions', num: true, fmt: r => fmtK(r.i)},
      {key: 'ctr', label: 'CTR', num: true, sort: r => r.i ? r.c / r.i : 0, fmt: r => pctS(r.c, r.i)}], {sort: 'k', asc: true});
  }};
W.gsc_zero_click = {g: 'gsc', lvl: 'tech', t: 'Seen but never clicked', d: 'Queries with real impressions and zero clicks: content gaps or titles that need work.', size: 'l', needs: ['gsc'],
  render(h, ctx, w, D){ gscTable(h, ctx, (D.gsc.queries || []).filter(q => (+q[1] || 0) === 0 && (+q[2] || 0) >= 30), {sort: 'i', empty: 'No query with 30+ impressions went unclicked.'}); }};
W.gsc_page_two = {g: 'gsc', lvl: 'tech', t: 'Stuck on page two', d: 'Queries at positions 11–30 with impressions: a content refresh or internal links could lift them to page one.', size: 'l', needs: ['gsc'],
  render(h, ctx, w, D){ gscTable(h, ctx, (D.gsc.queries || []).filter(q => q[4] > 10.5 && q[4] <= 30 && q[2] >= 10), {sort: 'i', empty: 'Nothing sitting on page two with impressions.'}); }};

/* ---------- Website forms ---------- */
/* Easyleads (GoHighLevel) forms: the same view as Form submissions, from GoHighLevel's own records. */
W.easyleads_forms = {g: 'conv', t: 'Easyleads form submissions', d: 'Every Easyleads (GoHighLevel) form submission, past ones included: how many, which form, where the visitor came from, and (team only) who sent it.', size: 'xl', needs: ['easyleads'],
  render(h, ctx, w, D){
    const F = D.easyleads || {};
    if (F.connected === false && !(F.rows || []).length){
      h.innerHTML = '<div class="rp-err">Easyleads isn’t connected for this client yet.' + (F.details ? ' In the AI Visibility Tracker sheet: AI Tracker menu › Connect Easyleads for a client.' : '') + '</div>';
      return;
    }
    W.forms.render(h, ctx, w, {forms: F, el: true});
  }};
/* ---------- Form inbox (website forms: WordPress, Concrete) ----------
One searchable inbox of every website form submission: find anyone by name, email,
company, province or city; filter by form, page, channel and any short answer the
forms ask (province, city, service…); open one for everything they sent.
Data: 'formsc' (the forms payload). The team report gets every detail. A client's
link gets names and contact details only when this widget was set to show them
(cfg.contacts, with the link's own secret cfg.cs registered on the tracker);
otherwise only the answers that say nothing about who sent it (facets). */
const FX_FACET = /province|provincia|state|region|city|town|ciudad|country|location|office|branch|service|product|interest|industry|department|hear about|how did you hear|budget|timeline|category|topic|reason/i;
const FX_PRIVATE = /name|e-?mail|correo|phone|tel[eé]fono|mobile|cell|company|empresa|address|direcci|postal|zip|message|comment|question|details/i;
const FX_PROV = {AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick', NL: 'Newfoundland and Labrador', NS: 'Nova Scotia', NT: 'Northwest Territories',
NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec', SK: 'Saskatchewan', YT: 'Yukon'};
const fxAttr = s => String(s).replace(/["\\]/g, '\\$&');
const fxSecretOk = s => /^[a-f0-9]{32}$/.test(String(s || ''));
/* Every widget that lists form submissions (website and Easyleads). */
const FX_TYPES = /^(forms|easyleads_forms|forms_[a-z_]+)$/;
/* Form widgets never get smaller than this on a report, older reports included: [height px, columns]. */
const FX_MIN = {forms: [1150, 12], easyleads_forms: [1150, 12], forms_inbox: [1180, 12], forms_latest: [600, 6], forms_kpi: [240, 3], forms_rate: [420, 4], forms_heatmap: [400, 6]};
/* The link secret when this report's form widgets let the client click into submissions. */
const fxSharedCs = items => { const it = (items || []).find(i => FX_TYPES.test(i.type) && i.cfg && i.cfg.contacts && fxSecretOk(i.cfg.cs)); return it ? it.cfg.cs : ''; };
/* The client report's one setting for all its form widgets: let the client click into submissions on their link
   (names, emails, phones, messages), the way the team report does. Off by default. */
function fxShareBox(host, ctx, w){
if (!(ctx.saveItem && ctx.internal && !ctx.drill && ctx.formsShare)) return;
const items = ctx.items || [w];
const box = document.createElement('label'); box.className = 'rp-fx-share';
box.innerHTML = '<input type="checkbox"' + (fxSharedCs(items) ? ' checked' : '') + '><span><b>Let the client click into form submissions on their link.</b> Off by default. When on, every form widget on this report’s link opens like it does on the team report: names, emails, phones and messages, searchable. Anyone with the link can see them. Applies to the link the next time the report is updated; turning it off stops it right away.</span>';
host.appendChild(box);
const sh = box.querySelector('input');
sh.addEventListener('change', () => {
const on = sh.checked, forms = items.filter(i => FX_TYPES.test(i.type));
if (on && !confirm('Let anyone with this client report’s link see who sent each form (names, emails, phones, messages)?')){ sh.checked = false; return; }
const old = Array.from(new Set(forms.map(i => i.cfg && i.cfg.cs).filter(fxSecretOk)));
const cs = on ? (fxSharedCs(items) || Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => ('0' + b.toString(16)).slice(-2)).join('')) : '';
sh.disabled = true;
Promise.all(on ? [ctx.formsShare(cs, true)] : old.map(s => ctx.formsShare(s, false))).then(() => {
forms.forEach(i => { i.cfg = i.cfg || {}; if (on){ i.cfg.contacts = true; i.cfg.cs = cs; } else { i.cfg.contacts = false; delete i.cfg.cs; } });
ctx.saveItem(w); sh.disabled = false;
document.querySelectorAll('.rp-fx-share input').forEach(x => { x.checked = on; });
}, err => { sh.checked = !on; sh.disabled = false; alert('Couldn’t change this on the tracker: ' + (err && err.message || err)); });
});
}
/* Provinces and cities merge across forms (and languages) into one filter each. */
const fxKey = k => { const s = String(k).replace(/[*:?\s]+$/, '').trim(); return /prov|state/i.test(s) ? 'Province' : /city|town|ciudad/i.test(s) ? 'City' : s.charAt(0).toUpperCase() + s.slice(1); };
const fxVal = (k, v) => {
v = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
if (!v) return '';
if (k === 'Province' && FX_PROV[v.toUpperCase()]) return FX_PROV[v.toUpperCase()];
if (v.length > 3 && (v === v.toLowerCase() || v === v.toUpperCase())) v = v.toLowerCase().replace(/(^|[\s-])(\S)/g, (m, a, b) => a + b.toUpperCase());
return v;
};
/* The non-personal answers of one submission: {Province: 'Alberta', City: 'Red Deer', …}. */
const fxFacetsOf = r => {
const src = r.facets || r.fields || {}, o = {};
Object.keys(src).forEach(k => { if (!FX_FACET.test(k) || FX_PRIVATE.test(k)) return; const key = fxKey(k), v = fxVal(key, src[k]); if (v && v.length <= 80 && !o[key]) o[key] = v; });
return o;
};
const fxInitials = s => { const p = String(s || '').replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).filter(Boolean);
return ((p[0] || '?').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase(); };
const FX_AV = ['#2a78d6', '#0f7a58', '#c96a00', '#6250d6', '#c2417a', '#0b8fa3', '#8a5a00', '#3d6b2f'];
const fxColor = s => { let n = 0; String(s || '').toLowerCase().split('').forEach(c => { n = (n * 31 + c.charCodeAt(0)) | 0; }); return FX_AV[Math.abs(n) % FX_AV.length]; };
/* Every search word highlighted in a piece of text (the result is escaped). */
const fxHl = (s, terms) => {
s = String(s == null ? '' : s);
if (!terms.length || !s) return esc(s);
const re = new RegExp('(' + terms.map(t => t.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
return s.split(re).map((p, i) => i % 2 ? '<mark class="rp-fx-hit">' + esc(p) + '</mark>' : esc(p)).join('');
};
const fxAgo = t => {
const d = new Date(String(t || '')); if (isNaN(d)) return '';
const days = Math.floor((Date.now() - d) / 864e5);
return days < 1 ? 'today' : days < 2 ? 'yesterday' : days < 7 ? days + ' days ago' : days < 60 ? Math.round(days / 7) + ' wk ago' : days < 730 ? Math.round(days / 30.4) + ' mo ago' : Math.round(days / 365) + ' yr ago';
};
/* The rows on screen as a spreadsheet file (Excel-safe: a cell can't start a formula). */
function fxCsv(rows, facets, det){
const cols = [['Sent', r => String(r.t || '').replace('T', ' ')], ['Form', r => r.form], ['Page', r => r.page]]
.concat(det ? [['Name', r => r.name], ['Email', r => r.email], ['Phone', r => r.phone], ['Company', r => r.company]] : [])
.concat(facets.map(k => [k, r => r._f[k]]))
.concat(det ? [['Message', r => r.message]] : []).concat([['Channel', r => r.channel], ['Source / medium', r => r.sm]]);
const q = v => { v = String(v == null ? '' : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
return '﻿' + [cols.map(c => q(c[0])).join(',')].concat(rows.map(r => cols.map(c => q(c[1](r))).join(','))).join('\r\n');
}
/* One submission, everything they sent, and anything else the same person sent. */
function fxOpen(ctx, r, all, terms){
const who = r.name || r.email || r.form, col = fxColor(r.email || r.name || r.form);
const mail = String(r.email || '').toLowerCase();
const others = mail ? all.filter(x => x !== r && String(x.email || '').toLowerCase() === mail).sort((a, b) => a.t < b.t ? 1 : -1) : [];
U.openDrawer(who + ' · ' + fsWhen(r), col, body => {
const f = r.fields && Object.keys(r.fields).length ? r.fields : r._f;
const act = [];
if (r.email) act.push('<a class="aiv-btn" href="mailto:' + esc(r.email) + '">' + glyph('chat', 14) + 'Email</a>');
if (r.phone) act.push('<a class="aiv-btn" href="tel:' + esc(String(r.phone).replace(/[^\d+]/g, '')) + '">Call ' + esc(r.phone) + '</a>');
if (r.email) act.push('<button class="aiv-btn" type="button" data-copy="' + esc(r.email) + '">Copy email</button>');
const src = r.channel === 'Not tracked yet' && (r.origin === 'import' || r.origin === 'easyleads')
? '<p class="aiv-cap">Sent before source tracking was added, so where this visitor came from isn’t known.</p>'
: '<table class="aiv-table"><tbody>' + [['Channel', esc(r.channel || '—')], ['Source / medium', esc(r.sm || '—')], ['Campaign', esc(r.campaign || '—')],
['First page they landed on', r.land ? '<span class="aiv-page">' + esc(r.land) + '</span>' : '—']].map(x => '<tr><td style="width:38%;color:var(--a-ink3)">' + x[0] + '</td><td>' + x[1] + '</td></tr>').join('') + '</tbody></table>';
const where = Object.keys(r._f).map(k => r._f[k]).slice(0, 2).join(', ');
body.innerHTML = '<div class="rp-fx-dhead"><span class="rp-fx-av lg" style="--c:' + col + '">' + esc(fxInitials(r.name || r.email || r.form)) + '</span><div style="min-width:0">' +
'<div class="rp-fx-dname">' + esc(who) + '</div><div class="aiv-cap">' + esc([r.company, where].filter(Boolean).join(' · ') || r.form) + '</div></div></div>' +
(act.length ? '<div class="rp-fx-acts">' + act.join('') + '</div>' : '') +
statsRow([['Form', esc(r.form)], ['Sent', esc(fsWhen(r))], ['Page', r.page ? esc(r.page) : '—'], ['Channel', esc(r.channel || '—')]]) +
'<div class="aiv-card"><h3>What they sent</h3><table class="aiv-table" style="margin-top:8px"><tbody>' +
(f && Object.keys(f).length ? Object.keys(f).map(k => '<tr><td style="width:38%;color:var(--a-ink3);vertical-align:top">' + esc(k) + '</td><td style="white-space:pre-wrap">' +
(/e-?mail/i.test(k) && /@/.test(f[k]) ? '<a href="mailto:' + esc(f[k]) + '">' + fxHl(f[k], terms) + '</a>' : fxHl(f[k], terms)) + '</td></tr>').join('')
: '<tr><td>No answers were kept.</td></tr>') + '</tbody></table></div>' +
(others.length ? '<div class="aiv-card"><h3>Also sent by ' + esc(r.name || r.email) + ' (' + fmt(others.length) + ')</h3><div class="rp-fx-others">' +
others.slice(0, 12).map(x => '<div><b>' + esc(x.form) + '</b><span>' + esc(fsWhen(x)) + '</span>' + (x.message ? '<em>' + esc(String(x.message).slice(0, 160)) + '</em>' : '') + '</div>').join('') + '</div></div>' : '') +
'<div class="aiv-card"><h3>Where they came from</h3><div style="margin-top:8px">' + src + '</div></div>';
body.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
const done = () => { b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy email'; }, 1600); };
try{ navigator.clipboard.writeText(b.dataset.copy).then(done, () => {}); }catch(e){}
}));
});
}
W.forms_inbox = {g: 'conv', t: 'Form inbox', d: 'Every website form submission (WordPress and Concrete sites) in one searchable inbox: find anyone by name, email, company, province or city, filter by form and page, and open what they sent.', size: 'xl', needs: ['formsc'],
render(h, ctx, w, D){
const F = D.formsc || {}, M = formsModel(ctx, F), det = !!M.details;
const cf = w.cfg = w.cfg || {};
M.rows.forEach(r => {
if (r._f) return;
r._f = fxFacetsOf(r);
r._q = [r.name, r.email, r.phone, r.company, r.message, r.page, r.form, r.channel].concat(Object.values(r.fields || {}), Object.values(r.facets || {}), Object.values(r._f))
.filter(Boolean).join(' \u0001 ').toLowerCase();
});
const cur = M.cur;
/* Short answers worth filtering by: on enough submissions, with not too many different values. Province first, then city. */
const fv = {};
cur.forEach(r => Object.keys(r._f).forEach(k => { const o = fv[k] = fv[k] || {}; o[r._f[k]] = (o[r._f[k]] || 0) + 1; }));
const cover = k => Object.values(fv[k]).reduce((t, n) => t + n, 0);
const rank = k => k === 'Province' ? 0 : k === 'City' ? 1 : 2;
const facets = Object.keys(fv).filter(k => cover(k) >= Math.max(2, cur.length * 0.15) && Object.keys(fv[k]).length <= 120)
.sort((a, b) => rank(a) - rank(b) || cover(b) - cover(a)).slice(0, 4);
const DIMS = [['form', 'Form']].concat(facets.map(k => ['f:' + k, k]), [['page', 'Page'], ['channel', 'Channel']]);
const valOf = (r, d) => d === 'form' ? r.form || '—' : d === 'page' ? r.page || '—' : d === 'channel' ? r.channel || '—' : r._f[d.slice(2)] || '';
const formCol = k => FS_FORM[Math.max(0, M.forms.indexOf(k)) % FS_FORM.length];
const dimCol = (d, v) => d === 'form' ? formCol(v) : d === 'channel' ? fsChColor(v) : '#0f7a58';
const sel = {};
let q = '', sort = 'new', shown = 30, open = '';

/* Headline numbers. */
const people = det ? new Set(cur.map(r => String(r.email || r.name || '').toLowerCase()).filter(Boolean)).size : 0;
const top0 = facets[0] ? Object.keys(fv[facets[0]]).sort((a, b) => fv[facets[0]][b] - fv[facets[0]][a])[0] : '';
const latest = cur.slice().sort((a, b) => a.t < b.t ? 1 : -1)[0];
const tiles = [kpiTile('Submissions', fmt(cur.length), esc(ctx.R.label || ''), {d: delta(cur.length, M.prev.length, M.hasPrev), icon: glyph('table', 18, '#0f7a58')}),
det ? kpiTile('People', fmt(people), people && people < cur.length ? fmt(cur.length - people) + ' sent more than once' : 'different senders', {icon: glyph('users', 18, '#2a78d6')})
: kpiTile('Forms', fmt(M.count(cur, 'form').length), 'sent at least once', {icon: glyph('page', 18, '#2a78d6')}),
top0 ? kpiTile('Top ' + facets[0].toLowerCase(), esc(top0), pctS(fv[facets[0]][top0], cur.length) + ' of submissions', {icon: glyph('pin', 18, '#c96a00'), click: 'fx||f:' + facets[0] + '||' + top0})
: kpiTile('Top form', esc((M.count(cur, 'form')[0] || {k: '—'}).k), 'most used', {icon: glyph('page', 18, '#c96a00')}),
kpiTile('Latest', latest ? esc(fxAgo(latest.t)) : '—', latest ? esc(fsWhen(latest)) : 'none in this period', {icon: glyph('cal', 18, '#6250d6')})];

h.innerHTML = '<div class="rp-fx">' +
'<div class="rp-kpis">' + tiles.join('') + '</div>' +
'<div class="rp-fx-top"><label class="rp-fx-search">' + glyph('search', 16) +
'<input type="search" data-q placeholder="' + (det ? 'Search names, emails, companies, provinces, messages…' : 'Search forms, pages, provinces, cities…') + '" aria-label="Search submissions" autocomplete="off"><kbd title="Press / to search">/</kbd></label>' +
'<div class="rp-fx-tools"><select data-sort aria-label="Sort"><option value="new">Newest first</option><option value="old">Oldest first</option>' + (det ? '<option value="name">Name A–Z</option>' : '') + '<option value="form">By form</option></select>' +
'<button class="aiv-btn" type="button" data-csv title="Download the submissions shown as a spreadsheet (CSV)">Export</button></div></div>' +
'<div class="rp-fx-dims">' + DIMS.map(d => '<div class="rp-fx-dim" data-dim="' + esc(d[0]) + '"><button type="button" aria-haspopup="listbox" aria-expanded="false"></button></div>').join('') + '</div>' +
'<div class="rp-fx-chips" data-chips></div>' +
'<div class="rp-fx-split"><div class="rp-fx-side" data-side></div><div class="rp-fx-list" data-list role="list" style="max-height:' + (w && w.h ? Math.max(320, w.h - 360) : 900) + 'px"></div></div>' +
'<p class="aiv-foot">Website forms (WordPress and Concrete), ' + esc(ctx.R.text || '') + '. ' + (M.first ? 'On file since ' + esc(prettyDate(M.first)) + '. ' : '') +
(M.liveSince ? 'Where each visitor came from is recorded from ' + esc(prettyDate(M.liveSince)) + ' on; older submissions were imported and show “Not tracked yet”. ' : '') +
(ctx.drill ? 'Names and contact details are for the team; a client’s link shows them only when “Let the client click into form submissions” is on in the client report.' : det ? 'Contact details are shared on this report by EDGE Marketing.' : 'Names and contact details aren’t shown on this report.') + '</p></div>';

const qEl = h.querySelector('[data-q]'), sortEl = h.querySelector('[data-sort]'), listEl = h.querySelector('[data-list]');
const terms = () => q.toLowerCase().split(/\s+/).map(t => t.trim()).filter(t => t.length > 0);
const match = (r, skip) => {
for (const d in sel){ if (d !== skip && sel[d] && valOf(r, d) !== sel[d]) return false; }
const t = terms();
return !t.length || t.every(x => r._q.indexOf(x) > -1);
};
const countFor = d => { const m = {}; cur.forEach(r => { if (!match(r, d)) return; const v = valOf(r, d); if (v) m[v] = (m[v] || 0) + 1; });
return Object.keys(m).map(k => ({k, n: m[k]})).sort((a, b) => b.n - a.n || (a.k < b.k ? -1 : 1)); };
const bars = (d, title, n) => {
const c = countFor(d).slice(0, n), max = Math.max(1, ...c.map(x => x.n));
return c.length ? '<div><h4 class="rp-fs-h">' + esc(title) + '</h4><div class="rp-fx-bars">' + c.map(x => '<button type="button" data-bar="' + esc(d) + '" data-v="' + esc(x.k) + '"' + (sel[d] === x.k ? ' class="on"' : '') + '>' +
'<span>' + (d === 'form' || d === 'channel' ? '<span class="rp-fx-dot" style="--c:' + dimCol(d, x.k) + '"></span>' : '') + esc(x.k) + '</span><em>' + fmt(x.n) + '</em><i style="--p:' + Math.round(x.n / max * 100) + '%;--c:' + dimCol(d, x.k) + '"></i></button>').join('') + '</div></div>' : '';
};
const card = (r, i, t) => {
const nm = det ? (r.name || r.email || 'No name given') : r.form;
const col = fxColor(det ? (r.email || r.name || r.form) : r.form);
const where = facets.map(k => r._f[k]).filter(Boolean).join(' · ');
const l2 = det ? [r.email, r.phone].filter(Boolean).map(v => fxHl(v, t)).join(' · ') : (r.page ? '<span class="aiv-page">' + fxHl(r.page, t) + '</span>' : '');
return '<button type="button" class="rp-fx-card" role="listitem" data-i="' + i + '"><span class="rp-fx-av" style="--c:' + col + '">' + esc(fxInitials(det ? (r.name || r.email) : r.form)) + '</span>' +
'<span class="rp-fx-main"><span class="rp-fx-l1"><b>' + fxHl(nm, t) + '</b>' + (det && r.company ? '<span>' + fxHl(r.company, t) + '</span>' : '') + '<time title="' + esc(fsWhen(r)) + '">' + esc(fsWhen(r)) + '</time></span>' +
(l2 ? '<span class="rp-fx-l2">' + l2 + '</span>' : '') +
(det && r.message ? '<span class="rp-fx-msg">' + fxHl(r.message, t) + '</span>' : '') +
'<span class="rp-fx-tags">' + (det ? '<span><i style="--c:' + formCol(r.form) + '"></i>' + fxHl(r.form, t) + '</span>' : '') +
(where ? '<span>' + glyph('pin', 12) + fxHl(where, t) + '</span>' : '') +
(r.channel && r.channel !== 'Not tracked yet' ? '<span><i style="--c:' + fsChColor(r.channel) + '"></i>' + esc(r.channel) + '</span>' : '') + '</span></span></button>';
};
let view = [];
const draw = () => {
const t = terms();
view = cur.filter(r => match(r));
const nm = r => String(r.name || r.email || '~').toLowerCase();
view.sort(sort === 'old' ? (a, b) => a.t < b.t ? -1 : 1 : sort === 'name' ? (a, b) => nm(a) < nm(b) ? -1 : nm(a) > nm(b) ? 1 : 0
: sort === 'form' ? (a, b) => a.form < b.form ? -1 : a.form > b.form ? 1 : a.t < b.t ? 1 : -1 : (a, b) => a.t < b.t ? 1 : -1);
/* Filter buttons show what's picked. */
DIMS.forEach(d => { const b = h.querySelector('.rp-fx-dim[data-dim="' + fxAttr(d[0]) + '"] > button');
b.className = sel[d[0]] ? 'on' : '';
b.innerHTML = esc(d[1]) + (sel[d[0]] ? ': <b>' + esc(sel[d[0]]) + '</b>' : '') + '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>'; });
const on = Object.keys(sel).filter(d => sel[d]);
h.querySelector('[data-chips]').innerHTML = on.map(d => '<button type="button" class="rp-fx-chip" data-unset="' + esc(d) + '"><span>' + esc((DIMS.find(x => x[0] === d) || [0, d])[1]) + '</span>' + esc(sel[d]) + '<b aria-label="Remove">×</b></button>').join('') +
(q.trim() ? '<button type="button" class="rp-fx-chip" data-unset="__q"><span>Search</span>“' + esc(q.trim()) + '”<b aria-label="Remove">×</b></button>' : '') +
(on.length + (q.trim() ? 1 : 0) > 1 ? '<button type="button" class="rp-fx-clear" data-clear>Clear all</button>' : '') +
'<span class="rp-fx-count">' + (view.length === cur.length ? fmt(cur.length) + ' submission' + (cur.length === 1 ? '' : 's') : fmt(view.length) + ' of ' + fmt(cur.length)) + '</span>';
h.querySelector('[data-side]').innerHTML = (facets[0] ? bars('f:' + facets[0], 'Where they’re from' + (facets[0] === 'Province' ? '' : ': ' + facets[0]), 8) : '') +
bars('form', 'Forms', 6) + (facets[1] ? bars('f:' + facets[1], facets[1], 6) : bars('page', 'Pages', 6));
listEl.innerHTML = view.length ? view.slice(0, shown).map((r, i) => card(r, i, t)).join('') +
(view.length > shown ? '<button type="button" class="aiv-btn rp-fx-more" data-more>Show ' + fmt(Math.min(30, view.length - shown)) + ' more · ' + fmt(view.length - shown) + ' left</button>' : '')
: '<div class="rp-fx-empty"><b>' + (cur.length ? 'Nothing matches' : 'No form submissions in this period') + '</b>' +
(cur.length ? 'Try another word, or clear a filter.' : M.first ? 'The first one on file is from ' + esc(prettyDate(M.first)) + '. Pick a longer period to see it.' : 'They’ll show here as soon as someone sends a form.') + '</div>';
};
/* A filter's menu: its values with counts (given the other filters), searchable when long. */
const closePop = () => { const p = h.querySelector('.rp-fx-pop'); if (p) p.remove(); h.querySelectorAll('.rp-fx-dim > button').forEach(b => b.setAttribute('aria-expanded', 'false')); open = ''; };
const openPop = d => {
closePop(); open = d;
const host = h.querySelector('.rp-fx-dim[data-dim="' + fxAttr(d) + '"]'), c = countFor(d), max = Math.max(1, ...c.map(x => x.n));
const pop = document.createElement('div'); pop.className = 'rp-fx-pop'; pop.setAttribute('role', 'listbox');
const opts = f => c.filter(x => !f || x.k.toLowerCase().indexOf(f) > -1).slice(0, 200).map(x => '<button type="button" class="rp-fx-opt' + (sel[d] === x.k ? ' on' : '') + '" role="option" data-v="' + esc(x.k) + '">' +
'<span>' + esc(x.k) + '</span><em>' + fmt(x.n) + '</em><i style="--p:' + Math.round(x.n / max * 100) + '%;--c:' + dimCol(d, x.k) + '"></i></button>').join('') || '<div class="aiv-cap" style="padding:8px">No values.</div>';
pop.innerHTML = (c.length > 8 ? '<input type="search" placeholder="Find…" aria-label="Find a value">' : '') + (sel[d] ? '<button type="button" class="rp-fx-opt" data-v="">Any ' + esc((DIMS.find(x => x[0] === d) || [0, ''])[1].toLowerCase()) + '</button>' : '') + '<div class="rp-fx-opts">' + opts('') + '</div>';
host.appendChild(pop); host.querySelector('button').setAttribute('aria-expanded', 'true');
const f = pop.querySelector('input'); if (f){ f.focus(); f.addEventListener('input', () => { pop.querySelector('.rp-fx-opts').innerHTML = opts(f.value.trim().toLowerCase()); }); }
pop.addEventListener('click', e => { const o = e.target.closest('[data-v]'); if (!o) return; sel[d] = o.dataset.v; shown = 30; closePop(); draw(); });
};
const root = h.querySelector('.rp-fx');
root.querySelectorAll('.rp-fx-dim > button').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const d = b.parentNode.dataset.dim; if (open === d) closePop(); else openPop(d); }));
/* Page-wide listeners (menu closing, the / key) are dropped when the widget redraws or leaves the page. */
if (h._fxOff) h._fxOff();
const outside = e => { if (!root.isConnected) return h._fxOff && h._fxOff(); if (open && !e.target.closest('.rp-fx-pop')) closePop(); };
const slash = e => { if (!root.isConnected) return h._fxOff && h._fxOff();
if (e.key !== '/' || /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '') || (document.activeElement || {}).isContentEditable) return;
const r = root.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
e.preventDefault(); qEl.focus(); };
document.addEventListener('click', outside);
document.addEventListener('keydown', slash);
h._fxOff = () => { document.removeEventListener('click', outside); document.removeEventListener('keydown', slash); h._fxOff = null; };
let tmr = 0;
qEl.addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(() => { q = qEl.value; shown = 30; draw(); }, 120); });
sortEl.addEventListener('change', () => { sort = sortEl.value; draw(); });
root.addEventListener('click', e => {
const t = e.target;
const set = (d, v) => { sel[d] = sel[d] === v ? '' : v; shown = 30; draw(); };
const bar = t.closest('[data-bar]'); if (bar) return set(bar.dataset.bar, bar.dataset.v);
const un = t.closest('[data-unset]'); if (un){ if (un.dataset.unset === '__q'){ q = ''; qEl.value = ''; } else sel[un.dataset.unset] = ''; shown = 30; return draw(); }
if (t.closest('[data-clear]')){ Object.keys(sel).forEach(k => { sel[k] = ''; }); q = ''; qEl.value = ''; shown = 30; return draw(); }
if (t.closest('[data-more]')){ shown += 30; return draw(); }
const k = t.closest('.rp-kpi[data-k]'); if (k && k.dataset.k.indexOf('fx||') === 0){ const p = k.dataset.k.split('||'); return set(p[1], p.slice(2).join('||')); }
const c = t.closest('.rp-fx-card'); if (c && view[Number(c.dataset.i)]) return fxOpen(ctx, view[Number(c.dataset.i)], M.rows, terms());
});
/* Keyboard: / to search, arrows between submissions, Escape closes a menu. */
root.addEventListener('keydown', e => {
if (e.key === 'Escape' && open){ closePop(); return; }
const c = e.target.closest && e.target.closest('.rp-fx-card');
if (c && (e.key === 'ArrowDown' || e.key === 'ArrowUp')){ e.preventDefault(); const n = e.key === 'ArrowDown' ? c.nextElementSibling : c.previousElementSibling; if (n && n.classList.contains('rp-fx-card')) n.focus(); }
if (e.key === 'ArrowDown' && e.target === qEl){ e.preventDefault(); const f = listEl.querySelector('.rp-fx-card'); if (f) f.focus(); }
});
h.querySelector('[data-csv]').addEventListener('click', () => {
const blob = new Blob([fxCsv(view, facets, det)], {type: 'text/csv;charset=utf-8'}), a = document.createElement('a');
a.href = URL.createObjectURL(blob); a.download = (ctx.domain || 'forms') + '-form-submissions-' + ctx.R.since + '-to-' + ctx.R.end + '.csv';
document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
});
draw();
fxShareBox(root, ctx, w);
/* On a fixed-height widget the list (and the side bars) take whatever height is left, so the whole inbox fits. */
if (w && w.h) requestAnimationFrame(() => {
const box = h.matches('[data-body]') ? h : (h.closest('[data-body]') || h), split = root.querySelector('.rp-fx-split');
const room = box.clientHeight - (root.offsetHeight - split.offsetHeight) - 10;
if (room > 220) [listEl, root.querySelector('[data-side]')].forEach(el => { el.style.maxHeight = room + 'px'; });
});
}};
W.forms_kpi = {g: 'conv', t: 'Leads', d: 'Website form submissions in the period, with the change and a sparkline.', size: 's', needs: ['forms'],
  render(h, ctx, w, D){
    const M = formsModel(ctx, D.forms), B = buckets(ctx.R), v = B.zero();
    M.cur.forEach(r => { const i = B.slot(fsDay(r)); if (i != null) v[i]++; });
    const top = M.count(M.cur, 'form')[0];
    h.innerHTML = bigNum(fmt(M.cur.length), delta(M.cur.length, M.prev.length, M.hasPrev), top ? 'Most: ' + esc(top.k) + ' (' + fmt(top.n) + ')' : 'None in this period') + '<div style="margin-top:8px">' + U.sparkline(v, '#0f7a58') + '</div>';
    const s = h.querySelector('svg'); if (s){ s.style.width = '100%'; s.style.height = '34px'; }
  }};
W.forms_latest = {g: 'conv', t: 'Latest leads', d: 'The most recent form submissions as cards. On the team report, click one for everything they sent.', size: 'l', needs: ['forms'],
  render(h, ctx, w, D){
    const M = formsModel(ctx, D.forms), rows = M.rows.slice().sort((a, b) => a.t < b.t ? 1 : -1).slice(0, 9);
    if (!rows.length){ h.innerHTML = '<div class="rp-err">No form submissions yet.</div>'; return; }
    h.innerHTML = '<div class="rp-leads">' + rows.map((r, i) => '<' + (M.details ? 'button type="button"' : 'div') + ' class="rp-lead" data-i="' + i + '"><i style="background:' + FS_FORM[Math.max(0, M.forms.indexOf(r.form)) % FS_FORM.length] + '"></i><div><b>' +
      esc(M.details ? (r.name || r.email || r.form) : r.form) + '</b><small>' + esc(fsWhen(r)) + (M.details && r.name ? ' · ' + esc(r.form) : '') + '</small>' +
      (M.details && r.message ? '<p>' + esc(String(r.message).slice(0, 110)) + '</p>' : '') + '<span class="rp-fs-ch" style="--c:' + fsChColor(r.channel) + '">' + esc(r.channel || '—') + '</span></div></' + (M.details ? 'button' : 'div') + '>').join('') + '</div>';
    if (M.details) onClick(h, '[data-i]', el => fsOpen(ctx, rows[Number(el.dataset.i)], M));
fxShareBox(h, ctx, w);
  }};
W.forms_rate = {g: 'conv', lvl: 'tech', t: 'Lead rate', d: 'Form submissions per 100 website visits, overall and by channel.', size: 'm', needs: ['forms', 'g4'],
  render(h, ctx, w, D){
    const M = formsModel(ctx, D.forms), S = g4Split(ctx, D.g4), s = sum(S.traffic, 2), ps = sum(S.trafficPrev, 2);
    const r = s ? M.cur.length / s * 100 : 0, pr = ps ? M.prev.length / ps * 100 : 0;
    const by = group(S.traffic, x => x[1], 2).map(x => ({k: x.k, s: x.n, f: M.cur.filter(y => y.channel === chName(x.k) || y.channel === x.k).length})).filter(x => x.f);
    h.innerHTML = bigNum(r.toFixed(2) + '%', delta(r, pr, M.hasPrev && S.hasPrev), fmt(M.cur.length) + ' leads from ' + fmt(s) + ' visits') + '<div data-l style="margin-top:10px"></div>';
    table(h.querySelector('[data-l]'), by, [{key: 'k', label: 'Channel', fmt: x => chLabel(x.k)}, {key: 'f', label: 'Leads', num: true}, {key: 'r', label: 'Lead rate', num: true, sort: x => x.f / x.s, fmt: x => pctS(x.f, x.s)}],
      {sort: 'f', empty: 'Channel splits appear once leads are tracked with their source.'});
  }};
W.forms_heatmap = {g: 'conv', t: 'When leads come in', d: 'Form submissions by weekday and hour: when to answer the phone and when to run ads.', size: 'l', needs: ['forms'],
  render(h, ctx, w, D){
    const M = formsModel(ctx, D.forms), g = Array.from({length: 7}, () => Array(24).fill(0));
    M.cur.forEach(r => { const t = String(r.t); if (t.length < 13) return; g[wdOf(t)][Number(t.slice(11, 13)) || 0]++; });
    const max = Math.max(1, ...g.map(r => Math.max(...r)));
    h.innerHTML = '<div class="rp-heat"><div></div>' + Array.from({length: 24}, (x, i) => '<em>' + (i % 3 === 0 ? (i === 0 ? '12a' : i < 12 ? i + 'a' : i === 12 ? '12p' : (i - 12) + 'p') : '') + '</em>').join('') +
      g.map((row, d) => '<b>' + WD[d] + '</b>' + row.map((v, hh) => '<i title="' + WD[d] + ' ' + hh + ':00 · ' + v + '" style="background:' + (v ? 'rgba(15,122,88,' + (0.18 + 0.82 * v / max).toFixed(2) + ')' : 'var(--a-line,#eef2f5)') + '"></i>').join('')).join('') + '</div>' +
      (M.cur.length ? '' : '<p class="aiv-cap">No submissions in this period.</p>');
  }};

/* ---------- Rankings & Maps ---------- */
W.kw_wins = {g: 'kw', t: 'Keyword wins', d: 'Keywords that just reached the top 3 or page one, or climbed 5+ places: worth celebrating with the client.', size: 'm', needs: ['kw'],
  render(h, ctx, w, D){
    const wins = (D.kw || []).filter(r => r.rank > 0 && (r.prev === 0 || r.prev == null ? r.rank <= 10 : (r.rank <= 3 && r.prev > 3) || (r.rank <= 10 && r.prev > 10) || r.prev - r.rank >= 5));
    h.innerHTML = wins.length ? '<ul class="rp-in">' + wins.sort((a, b) => a.rank - b.rank).map(r => sentence('up', '“' + esc(r.kw) + '”' + (r.loc ? ' <small>(' + esc(r.loc) + ')</small>' : '') + ' ' + (r.prev ? 'from #' + r.prev + ' ' : '') + 'to <b>#' + r.rank + '</b>' + (r.rank <= 3 ? ' 🏆' : ''))).join('') + '</ul>'
      : '<div class="rp-err">No new wins at the last check.</div>';
  }};
W.kw_close = {g: 'kw', lvl: 'tech', t: 'Keywords close to page one', d: 'Tracked keywords at positions 11–20: the ones a push could bring onto page one.', size: 'm', needs: ['kw'],
  render(h, ctx, w, D){
    const rows = (D.kw || []).filter(r => r.rank >= 11 && r.rank <= 20);
    table(h, rows, [{key: 'kw', label: 'Keyword', fmt: r => esc(r.kw) + (r.loc ? '<div class="rp-fs-sub">' + esc(r.loc) + '</div>' : '')}, {key: 'rank', label: 'Position', num: true, fmt: r => rankBadge(r.rank)},
      {key: 'url', label: 'Ranking page', fmt: r => r.url ? '<span class="aiv-page">' + esc(pageKey(r.url)) + '</span>' : '—'}], {sort: 'rank', asc: true, empty: 'No tracked keyword sits at 11–20 right now.', maxH: 320});
  }};
W.kw_pages = {g: 'kw', lvl: 'tech', t: 'Which page ranks for what', d: 'Tracked keywords grouped by the page Google ranks: spot pages doing all the work, and keywords split across pages.', size: 'l', needs: ['kw'],
  render(h, ctx, w, D){
    const m = {}, perKw = {};
    (D.kw || []).filter(r => r.url && r.rank > 0).forEach(r => { const p = pageKey(r.url); const o = m[p] = m[p] || {k: p, kws: new Set(), best: 999}; o.kws.add(r.kw); o.best = Math.min(o.best, r.rank); (perKw[r.kw] = perKw[r.kw] || new Set()).add(p); });
    const split = Object.keys(perKw).filter(k => perKw[k].size > 1);
    table(h, Object.values(m).map(o => ({k: o.k, n: o.kws.size, best: o.best, list: Array.from(o.kws).slice(0, 4).join(', ')})), [
      {key: 'k', label: 'Page', fmt: r => '<span class="aiv-page">' + esc(r.k) + '</span><div class="rp-fs-sub">' + esc(r.list) + '</div>'}, {key: 'n', label: 'Keywords', num: true}, {key: 'best', label: 'Best', num: true, fmt: r => rankBadge(r.best)}],
      {sort: 'n', empty: 'No ranking pages recorded yet.', maxH: 340});
    if (split.length) h.insertAdjacentHTML('beforeend', '<p class="aiv-foot"><b>' + split.length + '</b> keyword' + (split.length > 1 ? 's rank' : ' ranks') + ' with different pages in different locations: ' + esc(split.slice(0, 5).join(', ')) + (split.length > 5 ? '…' : '') + '. Possible cannibalisation.</p>');
  }};
W.gbp_glance = {g: 'gbp', t: 'Google Maps at a glance', d: 'For each Business Profile keyword: average Maps rank and share of the grid in the top 3, with the change since the scan before.', size: 'l', needs: ['gbp'],
  render(h, ctx, w, D){
    const rows = [];
    (D.gbp || []).forEach(g => g.kws.forEach(k => rows.push({k: k.kw, p: g.name, avg: k.last.avg, top: k.last.n ? k.last.top3 / k.last.n * 100 : 0, pt: k.prev && k.prev.n ? k.prev.top3 / k.prev.n * 100 : null, at: k.last.ts})));
    table(h, rows, [{key: 'k', label: 'Keyword', fmt: r => esc(r.k) + '<div class="rp-fs-sub">' + esc(r.p) + '</div>'}, {key: 'avg', label: 'Avg. rank', num: true, fmt: r => r.avg ? r.avg.toFixed(1) : '—'},
      {key: 'top', label: 'Grid in top 3', num: true, fmt: r => Math.round(r.top) + '%' + (r.pt != null && Math.round(r.top) !== Math.round(r.pt) ? ' <span class="aiv-delta ' + (r.top > r.pt ? 'up' : 'down') + '">' + (r.top > r.pt ? '+' : '') + Math.round(r.top - r.pt) + '</span>' : '')},
      {key: 'at', label: 'Scanned', fmt: r => r.at ? esc(shortDate(isoDay(new Date(r.at)))) : '—'}], {sort: 'top', empty: 'No Maps grid scans for this client yet.'});
  }};

/* ---------- AI ---------- */
W.ai_share = {g: 'ai', t: 'AI share of visits', d: 'What share of all website visits AI assistants sent, and how that is changing.', size: 's', needs: ['feed', 'g4'],
  render(h, ctx, w, D){
    const M = aiModel(ctx, D.feed), S = g4Split(ctx, D.g4), s = sum(S.traffic, 2), ps = sum(S.trafficPrev, 2);
    const sh = s ? M.ai.s / s * 100 : 0, psh = ps ? M.ai.ps / ps * 100 : 0;
    h.innerHTML = bigNum(sh.toFixed(sh < 1 ? 2 : 1) + '%', S.hasPrev && M.ai.hasPrev && psh ? delta(sh, psh, true) : null, fmt(M.ai.s) + ' AI visits of ' + fmt(s) + ' total') + '<div style="margin-top:8px">' + U.sparkline(M.ai.series, '#eb6834') + '</div>';
    const sv = h.querySelector('svg'); if (sv){ sv.style.width = '100%'; sv.style.height = '34px'; }
  }};

W.text = {g: 'content', t: 'Text / heading', d: 'A heading and a note: a summary, next steps, anything worth saying in words.', size: 'xl', needs: [], editable: true, plain: true,
  render(h, ctx, w){
    const c = w.cfg || {};
    if (!c.heading && !c.body){ h.innerHTML = '<div class="rp-err">Empty text block. ' + (ctx.editable ? 'Click “Edit” to write something.' : '') + '</div>'; return; }
    h.innerHTML = '<div class="rp-text">' + (c.heading ? '<h2>' + esc(c.heading) + '</h2>' : '') + esc(c.body || '') + '</div>';
  },
  form: w => '<label>Heading</label><input data-c="heading" value="' + esc((w.cfg || {}).heading || '') + '"><label>Text</label><textarea data-c="body">' + esc((w.cfg || {}).body || '') + '</textarea>'};
W.embed = {g: 'content', t: 'Embedded page', d: 'Any web page shown inside the report: a Looker Studio board, a GitHub Pages dashboard, a video…', size: 'xl', needs: [], editable: true,
  render(h, ctx, w){
    const c = w.cfg || {};
    const url = safeUrl(c.url);
    if (!url){ h.innerHTML = '<div class="rp-err">No page set. ' + (ctx.editable ? 'Click “Edit” and paste a link.' : '') + '</div>'; return; }
    const ht = Math.max(200, Math.min(2400, Number(c.height) || 600));
    h.innerHTML = '<iframe class="rp-frame" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-presentation" src="' + esc(url) + '" style="height:' + ht + 'px" loading="lazy" referrerpolicy="no-referrer" allowfullscreen title="' + esc(c.title || 'Embedded page') + '"></iframe>' +
      (ctx.internal ? '<p class="aiv-foot">' + esc(url) + ' · <a href="' + esc(url) + '" target="_blank" rel="noopener">open ↗</a>. Some sites refuse to be shown inside another page.</p>' : '');
  },
  form: w => '<label>Link</label><input data-c="url" placeholder="https://…" value="' + esc((w.cfg || {}).url || '') + '"><label>Height (pixels)</label><input data-c="height" type="number" min="200" max="2400" step="50" value="' + esc(String((w.cfg || {}).height || 600)) + '">'};
W.section = {g: 'content', t: 'Section header', d: 'A bold heading bar that starts a section (“On-page SEO”, “AI visibility”…), like AgencyAnalytics’ black headers.', size: 'l', needs: [], editable: true, plain: true, sec: true,
  render(h, ctx, w){
    const c = w.cfg || {};
    h.innerHTML = '<div class="rp-sec"><div class="rp-sec-t">' + esc(c.heading || (ctx.editable ? 'Section title' : '')) + '</div>' + (c.body ? '<div class="rp-sec-d">' + esc(c.body) + '</div>' : '') + '</div>';
  },
  form: w => '<label>Heading</label><input data-c="heading" value="' + esc((w.cfg || {}).heading || '') + '"><label>Description (optional, one line)</label><input data-c="body" value="' + esc((w.cfg || {}).body || '') + '">'};

/* ---------- Client personas (the people behind the form submissions) ----------
   One card per person: every website and Easyleads form they ever sent, linked
   to them by email, then phone, then full name; their stats (forms sent, first
   and last contact, channels, pages, location); and a status the team sets:
   Future client (a lead), Current client, Past client or Not a fit. People can
   be added by hand too (a referral, a phone call): their forms link to them as
   soon as they send one. Two people that are really one can be merged, and a
   form that isn't theirs can be unlinked. Team only (internal): never sent to
   a client report.
   Data: 'people' (every form on file, website and Easyleads, all time).
   Saved on the client record: c.personas = {v: 1, p: {key: record}}, a record
   being {aka: [identity keys], st, note, tags, value, start, end, name, email,
   phone, company, manual, rows: [linked row keys], unrows: [unlinked row keys], at}. */
const PS = {
  lead: {l: 'Future client', s: 'Lead or prospect, not a client yet', c: '#2a78d6'},
  current: {l: 'Current client', s: 'Working with them now', c: '#0f7a58'},
  past: {l: 'Past client', s: 'Worked with them before', c: '#c96a00'},
  lost: {l: 'Not a fit', s: 'Spam, wrong service or never answered', c: '#8795a1'}
};
const PS_KEYS = ['lead', 'current', 'past', 'lost'];
const psN = {
  email: s => { s = String(s || '').trim().toLowerCase(); return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) ? s : ''; },
  phone: s => { const d = String(s || '').replace(/\D/g, ''); return d.length >= 7 ? d.slice(-10) : ''; },
  name: s => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
};
const psPick = (r, re, bad) => { const f = r.fields || {}; for (const k of Object.keys(f)){ if (re.test(k) && !(bad && bad.test(k)) && f[k]) return String(f[k]).trim(); } return ''; };
/* Who sent a row: the named columns first, the form's own fields after. */
const psWho = r => r._w || (r._w = {
  name: String(r.name || [psPick(r, /first/i), psPick(r, /last|surname|apellido/i, /first/i)].filter(Boolean).join(' ') || psPick(r, /name|nombre/i, /company|business|empresa|user|file/i)).trim(),
  email: String(r.email || psPick(r, /e-?mail|correo/i)).trim(),
  phone: String(r.phone || psPick(r, /phone|tel|mobile|cell/i)).trim(),
  company: String(r.company || psPick(r, /company|business|empresa|organi[sz]ation/i)).trim()
});
const psRowKey = r => r.id ? (r._src || 'web') + ':' + r.id : (r._src || 'web') + '|' + r.t + '|' + (r.form || '') + '|' + (psN.email(psWho(r).email) || psN.phone(psWho(r).phone) || psN.name(psWho(r).name));
const psHash = s => { let a = 5381, b = 52711; for (let i = 0; i < s.length; i++){ const ch = s.charCodeAt(i); a = ((a * 33) ^ ch) | 0; b = ((b * 31) ^ ch) | 0; } return 'k' + (a >>> 0).toString(36) + (b >>> 0).toString(36); };
const psDays = (a, b) => (a && b) ? Math.round((Date.parse(b) - Date.parse(a)) / 864e5) : null;
/* The client record's personas, and a way to write them back (state syncs like everything else). */
function peopleStore(c){
  return {
    get: () => { const s = c.personas && typeof c.personas === 'object' ? c.personas : {v: 1, p: {}}; if (!s.p || typeof s.p !== 'object') s.p = {}; return s; },
    put: st => { c.personas = st; try{ if (typeof save === 'function') save(); }catch(e){ console.warn(e); } }
  };
}
/* Every row grouped into people. */
function peopleModel(ctx, F){
  const store = ctx.people ? ctx.people.get() : {v: 1, p: {}}, P = store.p, R = ctx.R;
  const rows = (F && Array.isArray(F.rows) ? F.rows : []).filter(r => r && r.t);
  const par = {};
  const add = k => { if (!(k in par)) par[k] = k; };
  const find = k => { add(k); let r = k; while (par[r] !== r) r = par[r]; while (par[k] !== r){ const n = par[k]; par[k] = r; k = n; } return r; };
  const join = (a, b) => { const x = find(a), y = find(b); if (x !== y) par[y] = x; };
  const un = {};
  Object.keys(P).forEach(k => { const rec = P[k] || {}; (rec.unrows || []).forEach(rk => { un[rk] = 1; }); });
  Object.keys(P).forEach(k => { const rec = P[k] || {}; add('@' + k); (rec.aka || []).forEach(a => join('@' + k, a)); (rec.rows || []).forEach(rk => { if (!un[rk]) join('@' + k, 'x:' + rk); }); });
  rows.forEach(r => {
    const w = psWho(r);
    r._k = r._k || psRowKey(r);
    r._f = r._f || fxFacetsOf(r);
    r._n = psN.name(w.name);
    r._un = !!un[r._k];
    const x = 'x:' + r._k; add(x);
    if (r._un) return;
    const e = psN.email(w.email), p = psN.phone(w.phone);
    if (e) join(x, 'e:' + e);
    if (p) join(x, 'p:' + p);
    if (!e && !p && r._n) join(x, 'n:' + r._n);
  });
  const G = {};
  const grp = g => G[g] || (G[g] = {rows: [], keys: new Set(), recs: new Set()});
  rows.forEach(r => grp(find('x:' + r._k)).rows.push(r));
  Object.keys(par).forEach(k => {
    const g = find(k);
    if (k[0] === '@') grp(g).recs.add(k.slice(1));
    else if (G[g] && k[1] === ':' && 'epn'.indexOf(k[0]) > -1) G[g].keys.add(k);
  });
  /* Name-only forms join the one person with that full name; so do a person's
     first forms when they were added by hand with just a name. */
  const strong = g => G[g].recs.size || Array.from(G[g].keys).some(k => k[0] !== 'n');
  const names = g => { const s = new Set(G[g].rows.filter(r => !r._un).map(r => r._n).filter(Boolean)); G[g].recs.forEach(k => { const n = psN.name((P[k] || {}).name); if (n) s.add(n); }); return s; };
  const merge = (from, into) => { G[into].rows.push(...G[from].rows); G[from].keys.forEach(k => G[into].keys.add(k)); G[from].recs.forEach(k => G[into].recs.add(k)); delete G[from]; };
  const byName = {};
  Object.keys(G).forEach(g => { if (strong(g)) names(g).forEach(n => { if (n.indexOf(' ') > 0) (byName[n] = byName[n] || new Set()).add(g); }); });
  Object.keys(G).forEach(g => {
    if (!G[g] || strong(g) || !G[g].rows.length || G[g].rows[0]._un) return;
    const hit = byName[G[g].rows[0]._n];
    if (hit && hit.size === 1){ const t = Array.from(hit)[0]; if (G[t] && t !== g) merge(g, t); }
  });
  const handOnly = {};
  Object.keys(G).forEach(g => { const x = G[g]; if (x.rows.length || x.recs.size !== 1) return; if (Array.from(x.keys).some(k => k[0] !== 'n')) return; const n = psN.name((P[Array.from(x.recs)[0]] || {}).name); if (n && n.indexOf(' ') > 0) (handOnly[n] = handOnly[n] || []).push(g); });
  Object.keys(G).forEach(g => {
    if (!G[g] || G[g].recs.size || !G[g].rows.length) return;
    const t = Array.from(names(g)).map(n => handOnly[n]).find(l => l && l.length === 1);
    if (t && G[t[0]]){ merge(t[0], g); }
  });
  const formsAll = M_count(rows, 'form');
  const list = Object.keys(G).map(g => {
    const x = G[g], recKey = Array.from(x.recs).sort()[0] || '', r0 = recKey ? (P[recKey] || {}) : {};
    const rs = x.rows.slice().sort((a, b) => a.t < b.t ? 1 : -1);
    const last = f => { for (const r of rs){ const v = psWho(r)[f]; if (v) return v; } return ''; };
    const keys = Array.from(x.keys);
    const idk = keys.find(k => k[0] === 'e') || keys.find(k => k[0] === 'p') || keys.find(k => k[0] === 'n') || ('x:' + (rs[0] ? rs[0]._k : g));
    const key = recKey || psHash(idk);
    const formN = {}, chN = {}, pgN = {}, loc = {};
    let inP = 0;
    rs.forEach(r => {
      const f = r.form || '—'; formN[f] = (formN[f] || 0) + 1;
      const c = r.channel || '—'; chN[c] = (chN[c] || 0) + 1;
      if (r.page) pgN[r.page] = (pgN[r.page] || 0) + 1;
      Object.keys(r._f || {}).forEach(k => { if (!loc[k]) loc[k] = r._f[k]; });
      const d = fsDay(r); if (d >= R.since && d <= R.end) inP++;
    });
    const top = o => Object.keys(o).sort((a, b) => o[b] - o[a]);
    const p = {key, rec: recKey ? r0 : null, keys, rows: rs,
      email: r0.email || last('email'), phone: r0.phone || last('phone'), company: r0.company || last('company'),
      st: PS[r0.st] ? r0.st : 'lead', tags: Array.isArray(r0.tags) ? r0.tags : [], note: r0.note || '', value: Number(r0.value) || 0,
      start: r0.start || '', end: r0.end || '', manual: !!r0.manual,
      n: rs.length, inP, first: rs.length ? fsDay(rs[rs.length - 1]) : (r0.added || ''), last: rs.length ? fsDay(rs[0]) : '',
      lastT: rs.length ? rs[0].t : (r0.at ? new Date(r0.at).toISOString().slice(0, 16) : ''),
      forms: top(formN), formN, chans: top(chN), chN, pages: top(pgN), pgN, loc,
      src: Array.from(new Set(rs.map(r => r._src === 'el' ? 'Easyleads' : 'Website')))};
    const bestName = () => { const m = {}; rs.forEach((r, i) => { const v = psWho(r).name; if (v){ m[v] = m[v] || {n: 0, i}; m[v].n++; } }); return Object.keys(m).sort((x, y) => m[y].n - m[x].n || m[x].i - m[y].i)[0] || ''; };
    p.name = r0.name || bestName() || p.email || p.phone || (rs[0] ? 'Unnamed · ' + (rs[0].form || 'form') : 'Unnamed');
    p._q = [p.name, p.email, p.phone, p.company, p.note, PS[p.st].l].concat(p.tags, p.forms, Object.values(loc), rs.map(r => r.message || ''), rs.map(r => Object.values(r.fields || {}).join(' ')))
      .filter(Boolean).join(' \u0001 ').toLowerCase();
    return p;
  });
  return {list, store, forms: formsAll};
}
const M_count = (rows, key) => { const m = {}; rows.forEach(r => { const k = r[key] || '—'; m[k] = (m[k] || 0) + 1; }); return Object.keys(m).sort((a, b) => m[b] - m[a]); };
/* Writes one person's record (status, notes, details), keeping every way to recognise them. */
function psSave(ctx, M, p, patch){
  const st = M.store, P = st.p;
  const rec = Object.assign({}, P[p.key] || {}, patch, {at: Date.now()});
  rec.aka = Array.from(new Set((rec.aka || []).concat(p.keys)));
  if (!rec.st) rec.st = p.st;
  P[p.key] = rec;
  ctx.people.put(st);
}
function psMerge(ctx, M, from, into){
  const P = M.store.p, a = P[from.key] || {}, b = Object.assign({}, P[into.key] || {});
  const moved = new Set(from.rows.map(r => r._k));
  b.aka = Array.from(new Set((b.aka || []).concat(into.keys, from.keys, a.aka || [])));
  b.rows = Array.from(new Set((b.rows || []).concat(a.rows || [], Array.from(moved))));
  Object.keys(P).forEach(k => { if (P[k] && P[k].unrows) P[k].unrows = P[k].unrows.filter(x => !moved.has(x)); });
  b.unrows = (b.unrows || []).filter(x => !moved.has(x));
  b.st = b.st || into.st || a.st;
  ['value', 'start', 'end', 'name', 'email', 'phone', 'company'].forEach(k => { if (!b[k] && a[k]) b[k] = a[k]; });
  b.tags = Array.from(new Set((b.tags || []).concat(a.tags || [])));
  if (a.note) b.note = b.note ? b.note + '\n\n' + a.note : a.note;
  b.at = Date.now();
  delete P[from.key];
  P[into.key] = b;
  ctx.people.put(M.store);
}
function psUnlink(ctx, M, p, r){
  const P = M.store.p;
  Object.keys(P).forEach(k => { if (P[k] && P[k].rows) P[k].rows = P[k].rows.filter(x => x !== r._k); });
  const rec = Object.assign({}, P[p.key] || {}), un = new Set(rec.unrows || []); un.add(r._k);
  rec.unrows = Array.from(un);
  /* The keys only this form carried stop pointing at this person. */
  const w = psWho(r), mine = ['e:' + psN.email(w.email), 'p:' + psN.phone(w.phone), 'n:' + psN.name(w.name)];
  const still = new Set(); p.rows.forEach(x => { if (x === r) return; const v = psWho(x); still.add('e:' + psN.email(v.email)); still.add('p:' + psN.phone(v.phone)); still.add('n:' + psN.name(v.name)); });
  rec.aka = (rec.aka || p.keys).filter(k => mine.indexOf(k) < 0 || still.has(k));
  rec.st = rec.st || p.st; rec.at = Date.now();
  P[p.key] = rec;
  ctx.people.put(M.store);
}
function psCsv(list){
  const cols = [['Name', p => p.name], ['Status', p => PS[p.st].l], ['Email', p => p.email], ['Phone', p => p.phone], ['Company', p => p.company],
    ['City', p => p.loc.City], ['Province', p => p.loc.Province], ['Forms sent', p => p.n], ['First contact', p => p.first], ['Last contact', p => p.last],
    ['Client since', p => p.start], ['Client until', p => p.end], ['Value', p => p.value || ''], ['Tags', p => p.tags.join(', ')],
    ['Forms', p => p.forms.join(', ')], ['Top channel', p => p.chans[0]], ['Source', p => p.src.join(', ')], ['Notes', p => p.note]];
  const q = v => { v = String(v == null ? '' : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  return '﻿' + [cols.map(c => q(c[0])).join(',')].concat(list.map(p => cols.map(c => q(c[1](p))).join(','))).join('\r\n');
}
const psDownload = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], {type: 'text/csv;charset=utf-8'})); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); };
/* One person: status, details, notes, stats and every form they sent. */
function psOpen(ctx, M0, p0, again){
  let M = M0, p = p0;
  const formCol = k => FS_FORM[Math.max(0, M.forms.indexOf(k)) % FS_FORM.length];
  U.openDrawer(p.name, fxColor(p.email || p.name), body => {
    const refresh = () => {
      M = again();
      const np = M.list.find(x => x.key === p.key) || M.list.find(x => x.keys.some(k => p.keys.indexOf(k) > -1));
      if (np) p = np;
      draw();
    };
    const draw = () => {
      const today = isoDay(new Date());
      const acts = [];
      if (p.email) acts.push('<a class="aiv-btn" href="mailto:' + esc(p.email) + '">' + glyph('chat', 14) + 'Email</a>');
      if (p.phone) acts.push('<a class="aiv-btn" href="tel:' + esc(String(p.phone).replace(/[^\d+]/g, '')) + '">Call ' + esc(p.phone) + '</a>');
      if (p.email) acts.push('<button class="aiv-btn" type="button" data-copy="' + esc(p.email) + '">Copy email</button>');
      const toClient = p.start && p.first ? psDays(p.first, p.start) : null;
      const asClient = p.start ? psDays(p.start, p.end || today) : null;
      const where = [p.company, p.loc.City, p.loc.Province].filter(Boolean).join(' · ');
      const others = M.list.filter(x => x.key !== p.key).sort((a, b) => a.name.localeCompare(b.name));
      const kv = (rows) => '<dl class="rp-ps-kv">' + rows.filter(x => x[1]).map(x => '<dt>' + esc(x[0]) + '</dt><dd>' + x[1] + '</dd>').join('') + '</dl>';
      const cnt = o => k => esc(k) + (o[k] > 1 ? ' <span style="color:var(--a-ink3)">×' + fmt(o[k]) + '</span>' : '');
      body.innerHTML = '<div class="rp-fx-dhead"><span class="rp-fx-av lg" style="--c:' + fxColor(p.email || p.name) + '">' + esc(fxInitials(p.name)) + '</span><div style="min-width:0">' +
        '<div class="rp-fx-dname">' + esc(p.name) + '</div><div class="aiv-cap">' + esc(where || p.email || p.phone || '') + ' <span class="rp-ps-pill" style="--c:' + PS[p.st].c + '">' + esc(PS[p.st].l) + '</span></div></div></div>' +
        (acts.length ? '<div class="rp-fx-acts">' + acts.join('') + '</div>' : '') +
        '<div class="rp-ps-sts" role="radiogroup" aria-label="Status">' + PS_KEYS.map(k => '<button type="button" role="radio" aria-checked="' + (p.st === k) + '" class="rp-ps-st' + (p.st === k ? ' on' : '') + '" data-st="' + k + '" style="--c:' + PS[k].c + '"><b>' + esc(PS[k].l) + '</b><small>' + esc(PS[k].s) + '</small></button>').join('') + '</div>' +
        statsRow([['Forms sent', fmt(p.n)], ['First contact', p.first ? esc(prettyDate(p.first)) : '—'], ['Last contact', p.lastT && p.n ? esc(fxAgo(p.lastT)) : '—'],
          [p.st === 'current' ? 'Client for' : p.st === 'past' ? 'Was a client for' : 'Became a client', p.st === 'current' || p.st === 'past' ? (asClient != null ? fmt(asClient) + ' days' : '—') : (toClient != null ? fmt(toClient) + ' days after first contact' : '—')]]) +
        '<div class="aiv-card"><h3>Client details <span class="rp-ps-saved" data-saved>Saved</span></h3><div class="rp-ps-form">' +
          '<label>Client since<input type="date" data-f="start" value="' + esc(p.start) + '"></label>' +
          '<label>Client until<input type="date" data-f="end" value="' + esc(p.end) + '"></label>' +
          '<label>Value ($)<input type="number" min="0" step="1" data-f="value" value="' + (p.value || '') + '" placeholder="Contract or lifetime value"></label>' +
          '<label>Tags<input data-f="tags" value="' + esc(p.tags.join(', ')) + '" placeholder="Comma-separated: roofing, referral"></label>' +
          '<label class="full">Notes<textarea data-f="note" placeholder="What they need, calls, quotes, follow-ups…">' + esc(p.note) + '</textarea></label></div></div>' +
        '<div class="aiv-card"><h3>Who they are</h3><div class="rp-ps-form">' +
          '<label>Name<input data-f="name" value="' + esc((p.rec && p.rec.name) || '') + '" placeholder="' + esc(p.name) + '"></label>' +
          '<label>Company<input data-f="company" value="' + esc((p.rec && p.rec.company) || '') + '" placeholder="' + esc(p.company || '') + '"></label>' +
          '<label>Email<input type="email" data-f="email" value="' + esc((p.rec && p.rec.email) || '') + '" placeholder="' + esc(p.email || '') + '"></label>' +
          '<label>Phone<input type="tel" data-f="phone" value="' + esc((p.rec && p.rec.phone) || '') + '" placeholder="' + esc(p.phone || '') + '"></label></div>' +
          '<p class="aiv-cap" style="margin-top:6px">Blank fields use what they wrote on their latest form. A new email or phone here also links their future forms.</p></div>' +
        '<div class="aiv-card"><h3>How they found the business</h3>' + kv([
          ['Channels', p.chans.filter(c => c !== '—').map(cnt(p.chN)).join(', ')],
          ['Forms', p.forms.map(f => '<i class="rp-fx-dot" style="--c:' + formCol(f) + '"></i>' + cnt(p.formN)(f)).join('<br>')],
          ['Pages', p.pages.slice(0, 5).map(x => '<span class="aiv-page">' + esc(x) + '</span>').join('<br>')],
          ['Location', [p.loc.City, p.loc.Province].filter(Boolean).map(esc).join(', ')],
          ['Other answers', Object.keys(p.loc).filter(k => k !== 'City' && k !== 'Province').map(k => esc(k) + ': ' + esc(p.loc[k])).join('<br>')],
          ['Sent through', esc(p.src.join(' and '))]]) + (p.n ? '' : '<p class="aiv-cap" style="margin-top:6px">No forms yet. Added by hand; their forms link here when they send one.</p>') + '</div>' +
        (p.n ? '<div class="aiv-card"><h3>Forms they sent (' + fmt(p.n) + ')</h3><div class="rp-ps-subs">' + p.rows.map((r, i) =>
          '<div class="rp-ps-sub"><b><i class="rp-fx-dot" style="--c:' + formCol(r.form) + '"></i>' + esc(r.form || 'Form') + '</b><span>' + esc(fsWhen(r)) + '</span>' +
          '<em>' + esc([r.channel && r.channel !== 'Not tracked yet' ? r.channel : '', r.page].filter(Boolean).join(' · ')) + (r.message ? '<br>' + esc(String(r.message).slice(0, 200)) : '') + '</em>' +
          '<span class="rp-ps-sa"><button type="button" class="rp-ps-mini" data-open="' + i + '">Open</button>' + (p.n > 1 ? '<button type="button" class="rp-ps-mini" data-unlink="' + i + '" title="This form was sent by someone else: give it its own card">Not them</button>' : '') + '</span></div>').join('') + '</div></div>' : '') +
        (others.length ? '<div class="aiv-card"><h3>Same person as someone else?</h3><div class="rp-ps-form"><label class="full">Merge this card into<select data-merge><option value="">Pick a person…</option>' +
          others.map(x => '<option value="' + esc(x.key) + '">' + esc(x.name + (x.email ? ' · ' + x.email : x.phone ? ' · ' + x.phone : '') + ' (' + x.n + ')') + '</option>').join('') + '</select></label></div>' +
          '<p class="aiv-cap" style="margin-top:6px">Their forms, notes and tags move over; the other card’s status wins when it has one.</p><button type="button" class="aiv-btn" data-domerge style="margin-top:8px" disabled>Merge</button></div>' : '') +
        (p.rec ? '<p style="margin-top:14px"><button type="button" class="rp-ps-mini" data-forget>' + (p.manual && !p.n ? 'Delete this person' : 'Clear status, notes and details') + '</button></p>' : '');
      const flash = () => { const s = body.querySelector('[data-saved]'); if (!s) return; s.classList.add('on'); clearTimeout(s._t); s._t = setTimeout(() => s.classList.remove('on'), 1400); };
      body.querySelectorAll('[data-st]').forEach(b => b.addEventListener('click', () => {
        const st = b.dataset.st, patch = {st};
        if (st === 'current' && !p.start) patch.start = today;
        if (st === 'current') patch.end = '';
        if (st === 'past' && !p.end) patch.end = today;
        psSave(ctx, M, p, patch); refresh();
      }));
      body.querySelectorAll('[data-f]').forEach(el => el.addEventListener('change', () => {
        const f = el.dataset.f; let v = el.value;
        if (f === 'value') v = Math.max(0, Math.round(Number(v) || 0));
        if (f === 'tags') v = Array.from(new Set(String(v).split(',').map(x => x.trim()).filter(Boolean)));
        const patch = {}; patch[f] = v;
        if (f === 'email' || f === 'phone'){ const k = f === 'email' ? (psN.email(v) ? 'e:' + psN.email(v) : '') : (psN.phone(v) ? 'p:' + psN.phone(v) : ''); if (k) patch.aka = Array.from(new Set(((p.rec && p.rec.aka) || []).concat(k))); }
        psSave(ctx, M, p, patch); flash();
        if (f !== 'note' && f !== 'tags') refresh(); else { M = again(); const np = M.list.find(x => x.key === p.key); if (np) p = np; }
      }));
      body.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => { try{ navigator.clipboard.writeText(b.dataset.copy).then(() => { b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy email'; }, 1600); }, () => {}); }catch(e){} }));
      body.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => fsOpen(ctx, p.rows[Number(b.dataset.open)], {forms: M.forms})));
      body.querySelectorAll('[data-unlink]').forEach(b => b.addEventListener('click', () => { psUnlink(ctx, M, p, p.rows[Number(b.dataset.unlink)]); refresh(); }));
      const ms = body.querySelector('[data-merge]'), mb = body.querySelector('[data-domerge]');
      if (ms) ms.addEventListener('change', () => { mb.disabled = !ms.value; });
      if (mb) mb.addEventListener('click', () => {
        const into = M.list.find(x => x.key === ms.value); if (!into) return;
        if (!confirm('Merge ' + p.name + ' into ' + into.name + '? Their forms, notes and tags move to ' + into.name + '’s card.')) return;
        psMerge(ctx, M, p, into); p = into; refresh();
      });
      const fg = body.querySelector('[data-forget]');
      if (fg) fg.addEventListener('click', () => {
        if (!confirm(p.manual && !p.n ? 'Delete ' + p.name + '?' : 'Clear ' + p.name + '’s status, notes and details? Their forms stay.')) return;
        delete M.store.p[p.key]; ctx.people.put(M.store); refresh();
      });
    };
    draw();
  });
}
/* A person who hasn't sent a form yet: a referral, a phone call, a client from before the website. */
function psAdd(ctx, M, again){
  U.openDrawer('Add a person', '#2a78d6', body => {
    body.innerHTML = '<p class="aiv-cap">Add anyone who isn’t on file from a form. When they send one with the same email, phone or full name, it links to them.</p>' +
      '<div class="rp-ps-form" style="margin-top:12px"><label>Name<input data-a="name" autocomplete="off"></label><label>Company<input data-a="company" autocomplete="off"></label>' +
      '<label>Email<input type="email" data-a="email" autocomplete="off"></label><label>Phone<input type="tel" data-a="phone" autocomplete="off"></label>' +
      '<label>Status<select data-a="st">' + PS_KEYS.map(k => '<option value="' + k + '">' + esc(PS[k].l) + '</option>').join('') + '</select></label>' +
      '<label>Client since<input type="date" data-a="start"></label>' +
      '<label class="full">Notes<textarea data-a="note"></textarea></label></div>' +
      '<p class="rp-err" data-msg style="display:none;margin-top:8px"></p>' +
      '<button type="button" class="aiv-btn" data-go style="margin-top:12px">Add person</button>';
    const val = k => body.querySelector('[data-a="' + k + '"]').value.trim();
    body.querySelector('[data-go]').addEventListener('click', () => {
      const name = val('name'), email = val('email'), phone = val('phone'), msg = body.querySelector('[data-msg]');
      if (!name && !psN.email(email) && !psN.phone(phone)){ msg.textContent = 'Give at least a name, an email or a phone number.'; msg.style.display = ''; return; }
      const e = psN.email(email), ph = psN.phone(phone), n = psN.name(name);
      const aka = [e ? 'e:' + e : '', ph ? 'p:' + ph : '', !e && !ph && n ? 'n:' + n : ''].filter(Boolean);
      const st = val('st');
      const rec = {manual: true, name, email, phone, company: val('company'), st, note: val('note'), start: val('start') || (st === 'current' ? isoDay(new Date()) : ''), added: isoDay(new Date()), aka, at: Date.now()};
      const key = 'm' + uid();
      M.store.p[key] = rec; ctx.people.put(M.store);
      const M2 = again(), p = M2.list.find(x => x.key === key) || M2.list.find(x => aka.some(k => x.keys.indexOf(k) > -1));
      if (p) psOpen(ctx, M2, p, again);
    });
  });
}
W.people = {g: 'conv', t: 'Client personas', d: 'One card per person behind the form submissions (website and Easyleads, all time): every form they sent linked to them, their stats, and whether they are a future, current or past client. Add people by hand too. Team only.', size: 'xl', needs: ['people'], internal: true,
  render(h, ctx, w, D){
    const F = D.people || {};
    if (!ctx.people){ h.innerHTML = '<div class="rp-err">Client personas only work on the team report.</div>'; return; }
    if (!F.details){ h.innerHTML = '<div class="rp-err">Client personas need names and contact details, which the tracker only gives the team key. Check the AI Visibility Tracker connection (AI Visibility tab, ⚙).</div>'; return; }
    const again = () => { W.people.render(h, ctx, w, D); return h._psM; };
    const M = peopleModel(ctx, F);
    h._psM = M;
    const cf = w.cfg = w.cfg || {};
    const R = ctx.R, all = M.list;
    let tab = PS[cf.tab] || cf.tab === 'all' ? cf.tab : 'all', sort = cf.sort || 'recent', q = h._psQ || '', onlyP = !!h._psP, shown = 48;
    const formCol = k => FS_FORM[Math.max(0, M.forms.indexOf(k)) % FS_FORM.length];
    const cnt = k => all.filter(p => p.st === k).length;
    const hasPrev = !!(F.first && F.first <= R.prevEnd);
    const newP = all.filter(p => p.first && p.first >= R.since && p.first <= R.end).length;
    const prevNew = all.filter(p => p.first && p.first >= R.prevSince && p.first <= R.prevEnd).length;
    const won = all.filter(p => p.st === 'current' || p.st === 'past');
    const real = all.filter(p => p.st !== 'lost').length;
    const ttc = won.map(p => psDays(p.first, p.start)).filter(x => x != null && x >= 0);
    const avg = ttc.length ? Math.round(ttc.reduce((a, b) => a + b, 0) / ttc.length) : null;
    const val = all.filter(p => p.st === 'current').reduce((t, p) => t + p.value, 0);
    const tiles = [
      kpiTile('People on file', fmt(all.length), fmt(all.filter(p => p.n > 1).length) + ' sent more than one form', {icon: glyph('users', 18, '#2a78d6')}),
      kpiTile('New people', fmt(newP), esc(R.label || ''), {d: delta(newP, prevNew, hasPrev), icon: glyph('up', 18, '#0f7a58')}),
      kpiTile('Future clients', fmt(cnt('lead')), 'leads not yet clients', {icon: glyph('target', 18, PS.lead.c), click: 'ps:lead'}),
      kpiTile('Current clients', fmt(cnt('current')), val ? '$' + fmt(val) + ' in value' : 'working with them now', {icon: glyph('trophy', 18, PS.current.c), click: 'ps:current'}),
      kpiTile('Past clients', fmt(cnt('past')), 'worked with before', {icon: glyph('cal', 18, PS.past.c), click: 'ps:past'}),
      kpiTile('Lead to client', real ? pctS(won.length, real) : '—', avg != null ? 'about ' + fmt(avg) + ' days from first form' : 'of people who weren’t “not a fit”', {icon: glyph('line', 18, '#6250d6')})];
    const tabs = [['all', 'Everyone', '#171614', all.length]].concat(PS_KEYS.map(k => [k, PS[k].l, PS[k].c, cnt(k)]));
    h.innerHTML = '<div class="rp-ps">' +
      '<div class="rp-kpis">' + tiles.join('') + '</div>' +
      '<div class="rp-ps-bar"><div class="rp-ps-tabs" role="tablist">' + tabs.map(t => '<button type="button" role="tab" class="rp-ps-tab" data-tab="' + t[0] + '" style="--c:' + t[2] + '"><i></i>' + esc(t[1]) + ' <b>' + fmt(t[3]) + '</b></button>').join('') + '</div>' +
      '<label class="rp-fx-search">' + glyph('search', 16) + '<input type="search" data-q placeholder="Search names, emails, phones, companies, forms, notes…" aria-label="Search people" autocomplete="off"></label>' +
      '<select data-sort aria-label="Sort"><option value="recent">Latest contact</option><option value="new">Newest people</option><option value="most">Most forms</option><option value="name">Name A–Z</option><option value="value">Highest value</option></select>' +
      '<label class="rp-ps-chk"><input type="checkbox" data-onlyp> Sent a form ' + esc((R.label || 'this period').toLowerCase()) + '</label>' +
      '<button class="aiv-btn" type="button" data-add>+ Add person</button><button class="aiv-btn" type="button" data-csv title="Download the people shown as a spreadsheet (CSV)">Export</button></div>' +
      '<div class="rp-ps-grid" data-list style="max-height:' + (w && w.h ? Math.max(320, w.h - 330) : 900) + 'px"></div>' +
      '<p class="aiv-foot">Every form on file, website' + ((F.rows || []).some(r => r._src === 'el') ? ' and Easyleads' : '') + (F.first ? ', since ' + esc(prettyDate(F.first)) : '') + '. Forms link to a person by email, then phone, then full name; merge or unlink from a person’s card. The period only changes “New people” and the “Sent a form” filter. Statuses, notes and values are saved on this client for the team and never go to a client report.</p></div>';
    const qEl = h.querySelector('[data-q]'), sEl = h.querySelector('[data-sort]'), pEl = h.querySelector('[data-onlyp]'), list = h.querySelector('[data-list]');
    qEl.value = q; sEl.value = sort; pEl.checked = onlyP;
    const terms = () => q.toLowerCase().split(/\s+/).filter(Boolean);
    const view = () => {
      const t = terms();
      const v = all.filter(p => (tab === 'all' || p.st === tab) && (!onlyP || p.inP) && (!t.length || t.every(x => p._q.indexOf(x) > -1)));
      const by = {recent: (a, b) => (a.lastT < b.lastT ? 1 : a.lastT > b.lastT ? -1 : 0), new: (a, b) => (a.first < b.first ? 1 : a.first > b.first ? -1 : 0),
        most: (a, b) => b.n - a.n || (a.lastT < b.lastT ? 1 : -1), name: (a, b) => a.name.localeCompare(b.name), value: (a, b) => b.value - a.value || b.n - a.n};
      return v.sort(by[sort] || by.recent);
    };
    const card = (p, i, t) => '<button type="button" class="rp-fx-card rp-ps-card" data-i="' + i + '">' +
      '<span class="rp-fx-av" style="--c:' + fxColor(p.email || p.name) + '">' + esc(fxInitials(p.name)) + '</span>' +
      '<span class="rp-fx-main"><span class="rp-fx-l1"><b>' + fxHl(p.name, t) + '</b><time>' + esc(p.n ? fxAgo(p.lastT) : 'no forms yet') + '</time></span>' +
      '<span class="rp-fx-l2">' + fxHl([p.company, p.loc.City, p.loc.Province].filter(Boolean).join(' · ') || p.email || p.phone || '—', t) + '</span>' +
      '<span class="rp-ps-meta"><span class="rp-ps-pill" style="--c:' + PS[p.st].c + '">' + esc(PS[p.st].l) + '</span><span>' + fmt(p.n) + ' form' + (p.n === 1 ? '' : 's') + '</span>' +
      (p.first ? '<span>since ' + esc(prettyDate(p.first)) + '</span>' : '') + (p.value ? '<span>$' + fmt(p.value) + '</span>' : '') + '</span>' +
      (p.forms.length || p.tags.length ? '<span class="rp-fx-tags">' + p.tags.slice(0, 3).map(x => '<span>#' + esc(x) + '</span>').join('') +
        p.forms.slice(0, 3).map(f => '<span style="--c:' + formCol(f) + '"><i></i>' + esc(f) + (p.formN[f] > 1 ? ' ×' + p.formN[f] : '') + '</span>').join('') + '</span>' : '') +
      '</span></button>';
    let cur = [];
    const draw = () => {
      h.querySelectorAll('[data-tab]').forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      cur = view();
      const t = terms();
      list.innerHTML = cur.length ? cur.slice(0, shown).map((p, i) => card(p, i, t)).join('') + (cur.length > shown ? '<button type="button" class="aiv-btn rp-fx-more" data-more>Show ' + fmt(Math.min(48, cur.length - shown)) + ' more of ' + fmt(cur.length - shown) + '</button>' : '')
        : '<div class="rp-fx-empty"><b>' + (all.length ? 'Nobody matches' : 'No one on file yet') + '</b>' + (all.length ? 'Try another search, status or the period filter.' : 'People appear here as forms come in, or add one by hand.') + '</div>';
      list.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => psOpen(ctx, h._psM, cur[Number(b.dataset.i)], again)));
      const mb = list.querySelector('[data-more]'); if (mb) mb.addEventListener('click', () => { shown += 48; draw(); });
    };
    const setTab = k => { tab = k; shown = 48; if (cf.tab !== k){ cf.tab = k; if (ctx.saveItem) ctx.saveItem(w); } draw(); };
    h.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
    onClick(h, '.rp-kpis [data-k]', el => { const k = el.dataset.k; if (k.indexOf('ps:') === 0) setTab(tab === k.slice(3) ? 'all' : k.slice(3)); });
    qEl.addEventListener('input', () => { q = h._psQ = qEl.value; shown = 48; draw(); });
    sEl.addEventListener('change', () => { sort = sEl.value; cf.sort = sort; if (ctx.saveItem) ctx.saveItem(w); draw(); });
    pEl.addEventListener('change', () => { onlyP = h._psP = pEl.checked; shown = 48; draw(); });
    h.querySelector('[data-add]').addEventListener('click', () => psAdd(ctx, h._psM, again));
    h.querySelector('[data-csv]').addEventListener('click', () => psDownload(((ctx.clientName || ctx.domain || 'client') + ' people').replace(/[^\w\- ]+/g, '').trim() + '.csv', psCsv(cur)));
    draw();
  }};

/* Height a widget gets when it is first placed on a free layout (px). */
const DEF_H = {headline: 250, conv_kpi: 230, traffic_kpis: 240, gsc_kpis: 240, kw_kpis: 320, gai_organic: 210, gsc_devices: 380, gsc_countries: 380,
  conv_list: 480, kw_table: 480, kw_cards: 440, llm_checks: 470, ai_journeys: 560, gbp_grids: 470, conv_by_page: 420, traffic_channels: 400,
  gsc_queries: 440, gsc_pages: 440, gsc_almost: 440, gsc_lowctr: 440, aio: 440, ai_pages: 420, gai_pages: 400, bing_queries: 380, llm_share: 340,
  kw_movers: 380, text: 170, section: 84, ga4_pages: 660, ga4_pathways: 780, forms: 1150,
  insight_summary: 330, insight_wins: 400, goal_tracker: 250, insight_scorecard: 380, insight_compare: 430, insight_forecast: 220, insight_weekday: 300, ga4_engagement: 420,
  ga4_mix_shift: 380, ga4_conv_rate: 330, ga4_lead_sources: 380, ga4_opportunity_pages: 440, ga4_rising_pages: 400, ga4_engaging_pages: 400, ga4_unvisited: 420,
  gsc_ctr_curve: 330, gsc_brand: 330, gsc_questions: 440, gsc_query_length: 330, gsc_zero_click: 440, gsc_page_two: 440, forms_kpi: 240, forms_latest: 600, forms_rate: 420,
  forms_heatmap: 400, gsc_health: 780, kw_wins: 330, kw_close: 380, kw_pages: 420, gbp_glance: 380, ai_share: 210, forms_inbox: 1180, easyleads_forms: 1150, people: 1100};
const defH = it => it.type === 'embed' ? Math.max(200, Math.min(2400, Number((it.cfg || {}).height) || 600)) + 70 : (DEF_H[it.type] || 360);

/* ---------- what each widget looks like: source marks, icon, accent ---------- */
const GMETA = {
  overview: {src: ['ga4', 'gsc', 'ChatGPT'], lbl: 'All sources', ic: 'bolt', tint: '#e87722'},
  insight: {src: [], lbl: 'Insights', ic: 'spark', tint: '#0f7a58'},
  conv: {src: ['ga4'], lbl: 'GA4', ic: 'target', tint: '#0f7a58'},
  traffic: {src: ['ga4'], lbl: 'GA4', ic: 'users', tint: '#2a78d6'},
  ai: {src: AI_STACK, lbl: 'AI assistants', ic: 'spark', tint: '#eb6834'},
  gai: {src: ['google'], lbl: 'Google AI', ic: 'spark', tint: '#1baf7a'},
  bing: {src: ['Copilot', 'bing'], lbl: 'Copilot · Bing', ic: 'chat', tint: '#d08c00'},
  llm: {src: ['ChatGPT', 'Gemini', 'Perplexity', 'Claude'], lbl: 'Prompt checks', ic: 'quote', tint: '#6250d6'},
  gsc: {src: ['gsc'], lbl: 'Search Console', ic: 'search', tint: '#2a78d6'},
  kw: {src: ['google'], lbl: 'Rankings', ic: 'trophy', tint: '#6250d6'},
  gbp: {src: ['gbp', 'maps'], lbl: 'Business Profile', ic: 'pin', tint: '#e34948'},
  content: {src: [], lbl: '', ic: 'text', tint: '#8795a1'}
};
const WIC = {gsc_health: 'flag', insight_summary: 'text', insight_wins: 'up', goal_tracker: 'target', insight_scorecard: 'trophy', insight_compare: 'bars', insight_forecast: 'line', insight_weekday: 'cal',
  ga4_engagement: 'users', ga4_mix_shift: 'donut', ga4_conv_rate: 'line', ga4_lead_sources: 'flag', ga4_opportunity_pages: 'target', ga4_rising_pages: 'up', ga4_engaging_pages: 'page', ga4_unvisited: 'page',
  gsc_ctr_curve: 'line', gsc_brand: 'donut', gsc_questions: 'chat', gsc_query_length: 'bars', gsc_zero_click: 'search', gsc_page_two: 'up',
  people: 'users', forms_kpi: 'table', forms_latest: 'users', forms_rate: 'target', forms_heatmap: 'cal', kw_wins: 'trophy', kw_close: 'up', kw_pages: 'page', gbp_glance: 'pin', ai_share: 'spark',
  forms: 'table', ga4_pages: 'page', ga4_pathways: 'path', conv_trend: 'line', conv_by_channel: 'donut', conv_by_event: 'bars', conv_by_page: 'page', conv_list: 'table', traffic_trend: 'line', traffic_channels: 'table',
  ai_visits: 'line', ai_assistants: 'donut', ai_vs_channels: 'line', ai_keyevents: 'flag', ai_pages: 'page', ai_journeys: 'path', gai_impr: 'line', gai_pages: 'page', gai_organic: 'users',
  aio: 'quote', llm_share: 'donut', llm_checks: 'table', gsc_trend: 'line', gsc_pages: 'page', gsc_almost: 'up', gsc_lowctr: 'target', gsc_devices: 'device', gsc_countries: 'globe',
  kw_cards: 'grid', kw_table: 'table', kw_movers: 'up', kw_dist: 'donut', gbp_grids: 'grid', embed: 'globe'};
const WSRC = {forms: [], people: [], forms_kpi: [], forms_latest: [], forms_heatmap: [], forms_rate: ['ga4'], ai_share: ['ChatGPT', 'ga4'], insight_summary: ['ga4', 'gsc', 'google'], insight_wins: ['ga4', 'gsc'], insight_scorecard: ['ga4', 'gsc', 'ChatGPT'], insight_compare: ['ga4', 'gsc'], insight_forecast: ['ga4'], insight_weekday: ['ga4'], goal_tracker: ['ga4', 'gsc'], conv_ai: ['ga4', 'ChatGPT', 'Perplexity'], ai_vs_channels: ['ChatGPT', 'google'], gai_organic: ['google', 'ga4'], aio: ['google'], kw_kpis: ['google'], embed: []};
const metaOf = type => {
  const def = W[type] || {}, g = GMETA[def.g] || GMETA.content;
  return {src: WSRC[type] || g.src, lbl: type === 'embed' ? '' : /^(forms|people)/.test(type) ? 'Website forms' : g.lbl, ic: WIC[type] || g.ic, tint: g.tint};
};
const wIcon = (type, sz) => { const m = metaOf(type); return '<span class="rp-wic" style="--tint:' + m.tint + '">' + glyph(m.ic, sz || 16) + '</span>'; };
const srcChip = type => { const m = metaOf(type); return m.src.length || m.lbl ? '<span class="rp-src" title="Data from ' + esc(m.lbl) + '">' + (m.src.length ? logoStack(m.src, 14) : '') + esc(m.lbl) + '</span>' : ''; };

/* Default Team report: every widget, grouped under section headers, most useful first.
   [type, size, cfg, cols]; a section is ['section', 'xl', {heading, body}]. Rows add up to 12 columns. */
const SEC = (heading, body) => ['section', 'xl', {heading, body}];
const TEAM_DEFAULT = [
  SEC('Overview', 'The period at a glance: visits, conversions, Google clicks, AI visits and rankings.'),
  ['headline', 'xl'],
  SEC('Conversions', 'Leads and key events from every channel: when they came in, where from, and which pages started them.'),
  ['conv_kpi', 's'], ['conv_trend', 'l', null, 9], ['conv_by_channel', 'l'], ['conv_by_event', 'l'], ['conv_by_page', 'l'], ['conv_ai', 'l'], ['conv_list', 'xl'],
  SEC('Website traffic', 'Visits from every channel, how engaged they were and how many converted (GA4).'),
  ['traffic_kpis', 'xl'], ['traffic_trend', 'l'], ['traffic_channels', 'l'],
  SEC('Pages & pathways', 'How every page performs, where visits start, where they go next and which key events they reach.'),
  ['ga4_pages', 'xl'], ['ga4_pathways', 'xl'],
  SEC('Google Search', 'Clicks, impressions and the searches that bring people in (Search Console).'),
  ['gsc_kpis', 'xl'], ['gsc_trend', 'l'], ['gsc_queries', 'l'], ['gsc_pages', 'l'], ['gsc_almost', 'l'], ['gsc_lowctr', 'l'], ['gsc_devices', 's'], ['gsc_countries', 's'],
  SEC('Keyword rankings', 'Where the tracked keywords rank on Google and how they moved since the last check.'),
  ['kw_kpis', 'xl'], ['kw_cards', 'xl'], ['kw_movers', 'l'], ['kw_dist', 'l'], ['kw_table', 'xl'],
  SEC('Google Maps', 'Map pack rank grids for the Google Business Profile, keyword by keyword.'),
  ['gbp_grids', 'xl'],
  SEC('AI assistants', 'Visitors sent by ChatGPT, Perplexity, Gemini, Copilot and others, and what they did on the site.'),
  ['ai_vs_channels', 'l'], ['ai_visits', 'l'], ['ai_assistants', 'l'], ['ai_keyevents', 'l'], ['ai_pages', 'xl'], ['ai_journeys', 'xl'],
  SEC('Google AI Overviews & AI Mode', 'How often Google’s AI shows the site, whether it cites it, and which pages it picks.'),
  ['gai_impr', 'l'], ['aio', 'l'], ['gai_pages', 'l'], ['gai_organic', 'l'],
  SEC('AI answers & citations', 'Whether ChatGPT, Perplexity, Gemini and Copilot mention or cite the business when asked.'),
  ['llm_share', 'l'], ['bing_cites', 'l'], ['llm_checks', 'xl'], ['bing_queries', 'xl']
];
/* The default team layout as widgets. Fixed ids ("d_<type>", sections "d_sec<n>") so a widget sent
   to the client report still points at its source afterwards. */
const teamDefaultItems = () => { let n = 0; return TEAM_DEFAULT.map(d => {
  const o = {id: d[0] === 'section' ? 'd_sec' + (++n) : 'd_' + d[0], type: d[0], size: d[1]};
  if (d[2]) o.cfg = JSON.parse(JSON.stringify(d[2]));
  if (d[3]) o.cols = d[3];
  return o;
}); };
const SIZE_COLS = {s: 3, m: 4, l: 6, xl: 12};
const SIZES = [['s', 'Quarter'], ['m', 'Third'], ['l', 'Half'], ['xl', 'Full width']];
const colsOf = it => Math.max(2, Math.min(12, Number(it.cols) || SIZE_COLS[it.size] || 6));
const newItem = (type, size, cfg) => ({id: uid(), type, size: size || (W[type] && W[type].size) || 'l', cfg: cfg || {}});
/* A widget's own layout fields, as saved and as copied to the client report. */
const layoutOf = it => { const o = {id: it.id, type: it.type, size: it.size}; if (it.cols) o.cols = it.cols; if (it.h) o.h = it.h;
  if (it.x != null && it.y != null && isFinite(it.x) && isFinite(it.y)){ o.x = it.x; o.y = it.y; } return o; };
/* A team widget copied to the client report: same size, placed at the end of the client layout (its own place there). */
const copyOf = it => { const o = layoutOf(it); delete o.x; delete o.y; return o; };

/* Accent colours offered in Branding. */
const ACCENTS = ['#e87722', '#2a78d6', '#0f7a58', '#6250d6', '#e34948', '#0b8fa3', '#1b222a'];
/* Report header: logos, then the title. brand = {logo, agency, accent, banner, logoH}; logos resolved by the caller. */
function brandHtml(o){
  const b = o.brand || {}, imgs = [];
  if (o.clientLogo) imgs.push('<img src="' + esc(o.clientLogo) + '" alt="' + esc(o.clientName || 'Client') + ' logo" referrerpolicy="no-referrer" onerror="this.remove()">');
  if (o.agencyLogo && b.agency !== false) imgs.push((imgs.length ? '<span class="rp-x2"></span>' : '') + '<img src="' + esc(o.agencyLogo) + '" alt="EDGE Marketing &amp; Design" onerror="this.remove()">');
  return imgs.length ? '<div class="rp-brand" style="--logoh:' + (Number(b.logoH) || 44) + 'px">' + imgs.join('') + '</div>' : '';
}

/* ---------- free layout ----------
   A widget on a free layout has a column (x, 0–11), a width in columns (cols),
   a top (y, px) and a height (h, px). Widgets never overlap: anything a moved
   or resized widget lands on is pushed down, and everything floats up to close
   gaps (the way AgencyAnalytics' dashboards behave). A layout that has never
   been moved keeps flowing like before; the first drag or resize turns it into
   a free layout that looks exactly the same at that moment. */
const GAP = 16, SNAP = 10;
const hasPos = it => it.x != null && it.y != null && isFinite(Number(it.x)) && isFinite(Number(it.y)) && Number(it.h) > 0;
function normPos(it){
  it.cols = Math.max(1, Math.min(12, Math.round(Number(it.cols) || SIZE_COLS[it.size] || 6)));
  it.h = Math.max(60, Math.min(4000, Math.round(Number(it.h) || defH(it))));
  if (FX_MIN[it.type]){ it.h = Math.max(it.h, FX_MIN[it.type][0]); it.cols = Math.max(it.cols, FX_MIN[it.type][1]); }
  if (hasPos(it)){ it.x = Math.max(0, Math.min(12 - it.cols, Math.round(Number(it.x)))); it.y = Math.max(0, Math.round(Number(it.y))); }
}
/* Widgets without a place yet go after the placed ones, left to right, row by row. */
function packNew(items){
  const placed = items.filter(hasPos), fresh = items.filter(it => !hasPos(it));
  if (!fresh.length) return;
  let y = placed.length ? Math.max(...placed.map(p => p.y + p.h)) + GAP : 0, cx = 0, rowH = 0;
  fresh.forEach(it => {
    if (cx + it.cols > 12){ y += rowH + GAP; cx = 0; rowH = 0; }
    it.x = cx; it.y = y; cx += it.cols; rowH = Math.max(rowH, it.h);
  });
}
const hOver = (a, b) => a.x < b.x + b.cols && b.x < a.x + a.cols;
/* Float everything up as far as it goes; `fixed` stays exactly where it is and pushes what it lands on down. */
function compact(items, fixed){
  const placed = fixed ? [fixed] : [];
  items.filter(i => i !== fixed).sort((a, b) => a.y - b.y || a.x - b.x).forEach(it => {
    let y = 0;
    placed.forEach(p => { if (hOver(p, it) && (p !== fixed || p.y <= it.y)) y = Math.max(y, p.y + p.h + GAP); });
    for (let guard = 0; guard < 500; guard++){
      const hit = placed.filter(p => hOver(p, it) && y < p.y + p.h + GAP && p.y < y + it.h + GAP);
      if (!hit.length) break;
      y = Math.max(...hit.map(p => p.y + p.h + GAP));
    }
    it.y = y;
    placed.push(it);
  });
}
const byPos = (a, b) => a.y - b.y || a.x - b.x;

/* ==========================================================================
   BOARD
   opts: {mode: 'team'|'client'|'public', title, sub, items, period, ctx, editable,
          onItems(items), onPeriod(p), pushed: Set(team ids in client), onPush(item),
          actionsHtml, topHtml, onAddFromTeam(), teamItems,
          periods: [keys shown in the switcher], showDates, lockNote,
          brand, clientLogo, agencyLogo, clientName, onBrand,
          free (layout is free), onFree(on), teamLink (url for teammates), aa (AgencyAnalytics look)}
   ========================================================================== */
function renderBoard(root, o){
  styles();
  const ctx = o.ctx;
  ctx.R = rangeOf(o.period);
  ctx._m = {};
  ctx.drill = o.mode === 'team';
  ctx.internal = o.mode !== 'public';
  ctx.editable = !!o.editable;
  const aa = o.aa != null ? !!o.aa : o.mode !== 'team';
  ctx.aa = aa;
  let free = aa || !!o.free;
  let editing = !!o.startEditing;
  const items = o.items;
  ctx.items = items;
  const brand = o.brand || {};
  const shown = PERIODS.filter(p => !o.periods || o.periods.indexOf(p[0]) > -1);
  const lbl = k => (PERIODS.find(x => x[0] === String(k)) || [0, ''])[1];
  let seg;
  if (aa){
    /* AgencyAnalytics' date button: calendar, period, caret; opens the allowed periods. */
    seg = '<div class="rp-pp" data-pp><button type="button"' + (shown.length > 1 ? '' : ' disabled') + ' aria-haspopup="listbox">' + glyph('cal', 15) + esc(ctx.R.label) + (shown.length > 1 ? '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>' : '') + '</button></div>';
  } else seg = shown.length > 1
    ? '<div class="aiv-seg" data-period>' + shown.map(p => '<button type="button" data-p="' + p[0] + '"' + (p[0] === String(o.period) ? ' class="on"' : '') + '>' + p[2] + '</button>').join('') + '</div>'
    : (o.lockNote ? '<span class="rp-lock" title="Reporting period">' + glyph('cal', 14) + esc(ctx.R.label) + '</span>' : '');
  const dates = o.showDates === false ? '' : esc(ctx.R.text);
  const sub = [dates, o.sub || ''].filter(Boolean).join(' · ');
  const fsOn = () => root.classList.contains('rp-fsroot');

  const editBtns = o.editable ? '<button class="aiv-btn" type="button" data-edit>' + (editing ? 'Done' : 'Customize') + '</button><button class="aiv-btn rp-edit-only" type="button" data-add>+ Add widget</button>' +
        (o.onBrand ? '<button class="aiv-btn rp-edit-only" type="button" data-brand style="display:inline-flex;align-items:center;gap:6px">' + glyph('brush', 14) + 'Branding</button>' : '') : '';
  const tlBtn = o.teamLink ? '<button class="aiv-btn" type="button" data-tlink title="A link teammates can open to land on this report in full screen">' + glyph('chat', 14) + 'Team link</button>' : '';
  const fsBtn = '<button class="aiv-btn rp-fsbtn" type="button" data-fs title="' + (fsOn() ? 'Leave full screen' : 'Show the report full screen') + '">' + fsIcon(fsOn()) + (fsOn() ? 'Exit full screen' : 'Full screen') + '</button>';
  const pdfBtn = aa ? '<button class="aiv-btn go rp-pdfbtn" type="button" data-pdf title="Download this report as a PDF">' + pdfIcon + 'Download PDF</button>' : '';
  /* Client report (AgencyAnalytics look): logos, title and dates on the left with room to breathe,
     the period and the PDF download on the right, and the team's tools on their own row below. */
  const head = o.bare ? '' : aa
    ? '<div class="rp-head rp-aahead"><div class="rp-hrow"><div class="rp-hl">' + brandHtml(o) + '<h2 class="rp-title">' + esc(o.title || '') + '</h2>' + (sub ? '<div class="rp-sub">' + sub + '</div>' : '') + '</div>' +
        '<div class="rp-hr">' + seg + (o.editable ? '' : fsBtn) + pdfBtn + '</div></div>' +
        (o.editable ? '<div class="rp-tools">' + editBtns + tlBtn + fsBtn + '<span class="rp-tsp"></span>' + (o.actionsHtml || '') + '</div>' : '') + '</div>'
    : '<div class="rp-head' + (brand.banner ? ' rp-banner' : '') + '"><div>' + brandHtml(o) + (o.whoHtml || '') + '<h2 class="rp-title">' + esc(o.title || '') + '</h2>' + (sub ? '<div class="rp-sub">' + sub + '</div>' : '') + '</div>' +
        '<div class="rp-bar">' + seg + editBtns + tlBtn + fsBtn + (o.actionsHtml || '') + '</div></div>';
  root.innerHTML = '<div class="aiv rp' + (aa ? ' rp-aa' : '') + (editing ? ' editing' : '') + '"' + (brand.accent && /^#[0-9a-f]{3,8}$/i.test(brand.accent) && !aa ? ' style="--a-brand:' + esc(brand.accent) + ';--a-deep:' + esc(brand.accent) + ';--a-wash:color-mix(in srgb,' + esc(brand.accent) + ' 10%,#fff)"' : '') + '>' +
    head + '<div data-panel></div>' + (o.topHtml || '') +
    '<div class="rp-grid' + (free ? ' free' : '') + '" data-grid></div></div>';
  const rp = root.querySelector('.rp'), grid = root.querySelector('[data-grid]');
  root.classList.toggle('rp-aaroot', aa);

  root.querySelectorAll('[data-period] button').forEach(b => b.addEventListener('click', () => o.onPeriod && o.onPeriod(b.dataset.p)));
  const pp = root.querySelector('[data-pp]');
  if (pp && shown.length > 1) pp.firstChild.addEventListener('click', e => {
    e.stopPropagation();
    const open = pp.querySelector('ul'); if (open){ open.remove(); return; }
    const ul = document.createElement('ul'); ul.setAttribute('role', 'listbox');
    ul.innerHTML = shown.map(p => '<li><button type="button" data-p="' + p[0] + '"' + (p[0] === String(o.period) ? ' class="on"' : '') + '>' + esc(p[1]) + '</button></li>').join('');
    pp.appendChild(ul);
    ul.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { ul.remove(); if (b.dataset.p !== String(o.period)) o.onPeriod && o.onPeriod(b.dataset.p); }));
    const away = ev => { if (!pp.contains(ev.target)){ ul.remove(); document.removeEventListener('click', away); } };
    setTimeout(() => document.addEventListener('click', away), 0);
  });
  const eb = root.querySelector('[data-edit]');
  if (eb) eb.addEventListener('click', () => { editing = !editing; rp.classList.toggle('editing', editing); eb.textContent = editing ? 'Done' : 'Customize'; o.onEditing && o.onEditing(editing); if (!editing){ root.querySelector('[data-panel]').innerHTML = ''; cancelPlacing(); } });
  const ab = root.querySelector('[data-add]');
  if (ab) ab.addEventListener('click', () => openCatalog(o, () => { drawAll(); }));
  const bb = root.querySelector('[data-brand]');
  if (bb) bb.addEventListener('click', () => brandPanel(root.querySelector('[data-panel]'), o));
  const tl = root.querySelector('[data-tlink]');
  if (tl) tl.addEventListener('click', () => linkPanel(root.querySelector('[data-panel]'), o.teamLink));
  const fsB = root.querySelector('[data-fs]');
  if (fsB) fsB.addEventListener('click', () => setFullscreen(root, !fsOn(), o.onFullscreen));
  const pdfB = root.querySelector('[data-pdf]');
  if (pdfB) pdfB.addEventListener('click', () => exportPdf(root, pdfB, (o.title || 'Report') + ' - ' + ctx.R.label));

  ctx.scrollTo = type => { const el = grid.querySelector('[data-type="' + type + '"]'); if (el) el.scrollIntoView({behavior: 'smooth', block: 'start'}); };
  ctx.fillOf = it => free || !!(it && it.h);
  const commit = () => { o.onItems && o.onItems(items); };
  /* A chart's ticked lines are saved with the widget (not on the public page). */
  ctx.saveItem = o.editable ? () => commit() : null;

  const elOf = it => grid.querySelector('.rp-w[data-id="' + cssEsc(it.id) + '"]');
  const mobile = () => window.matchMedia && window.matchMedia('(max-width:760px)').matches;
  function place(el, it){
    if (!el) return;
    el.style.setProperty('--x', it.x); el.style.setProperty('--c', it.cols); el.style.setProperty('--y', it.y); el.style.setProperty('--h', it.h);
  }
  const setGridH = () => { grid.style.height = items.length ? (Math.max(...items.map(i => i.y + i.h)) + 4) + 'px' : ''; };
  function layoutAll(){ items.forEach(it => place(elOf(it), it)); setGridH(); }
  function ensureLayout(){
    items.forEach(normPos);
    packNew(items);
    compact(items, null);
    items.sort(byPos);
  }

  function drawAll(){
    grid.innerHTML = '';
    grid.style.height = '';
    grid.classList.toggle('free', free);
    if (!items.length){
      grid.innerHTML = '<div class="rp-empty">' + (o.emptyHtml || '<h3>No widgets yet</h3>Click “Customize”, then “Add widget”.') + '</div>';
      const eh = grid.querySelector('[data-empty-add]'); if (eh) eh.addEventListener('click', () => openCatalog(o, () => drawAll()));
      return;
    }
    if (free) ensureLayout();
    items.forEach(it => grid.appendChild(drawWidget(it)));
    if (free) setGridH();
  }

  /* The first move or resize of a flowing layout: every widget keeps the place and size it has on screen. */
  function toFree(){
    if (free) return;
    const g = grid.getBoundingClientRect(), colW = (grid.clientWidth - GAP * 11) / 12;
    items.forEach(it => {
      const el = elOf(it); if (!el) return;
      const r = el.getBoundingClientRect();
      it.cols = colsOf(it);
      it.x = Math.max(0, Math.min(12 - it.cols, Math.round((r.left - g.left) / (colW + GAP))));
      it.y = Math.round(r.top - g.top);
      it.h = Math.round(r.height);
    });
    free = true;
    o.onFree && o.onFree(true);
    compact(items, null);
    items.sort(byPos);
    commit();
    drawAll();
  }

  /* Width in grid columns and an optional fixed height (flowing layout). */
  function applySize(el, it){
    const c = colsOf(it);
    el.style.setProperty('--c', c);
    el.classList.toggle('nar', c < 6);
    el.style.height = it.h && !free ? it.h + 'px' : '';
    el.classList.toggle('fixh', !!it.h);
  }

  /* Numbers, donuts, tables and chart text follow the widget's size once it has one. */
  function watchScale(el, it, def){
    if (!(free || it.h) || !window.ResizeObserver) return;
    el.classList.add('scaled');
    const baseW = {s: 300, m: 400, l: 600, xl: 1200}[def.size] || 600, baseH = defH(it);
    const set = () => {
      const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
      /* Headings and text never shrink below their normal size; they only grow. */
      const minS = it.type === 'section' || it.type === 'text' ? 1 : 0.72;
      const s = Math.max(minS, Math.min(2.6, Math.min(w / baseW, h / baseH)));
      const t = Math.max(0.86, Math.min(1.7, 1 + (s - 1) * 0.5));
      el.style.setProperty('--s', s.toFixed(3)); el.style.setProperty('--t', t.toFixed(3));
    };
    set();
    const ro = new ResizeObserver(() => { if (!el.isConnected){ ro.disconnect(); return; } set(); });
    ro.observe(el);
  }

  function drawWidget(it){
    const def = W[it.type];
    const el = document.createElement('section');
    const m = metaOf(it.type);
    el.className = 'rp-w ' + (it.size || 'l') + (def && def.plain && !(it.cfg && it.cfg.title) ? ' plain' : '') + (def && def.sec ? ' sec' : '');
    el.style.setProperty('--tint', m.tint);
    el.dataset.id = it.id; el.dataset.type = it.type;
    applySize(el, it);
    if (free) place(el, it);
    if (!def){ el.innerHTML = '<div class="rp-err">This widget type is no longer available.</div>'; return el; }
    const title = (it.cfg && it.cfg.title) || def.t;
    const pushed = o.pushed && o.pushed.has(it.id);
    const canPush = o.mode === 'team' && !def.internal;
    const sizeKey = it.cols && SIZE_COLS[it.size] !== it.cols ? '' : (it.size || 'l');
    const aaLogo = aa && m.src.length && BRAND[m.src[0]] ? '<span class="rp-aalogo">' + logo(m.src[0], 16) + '</span>' : '';
    el.innerHTML = '<div class="rp-wh"><div class="rp-wt">' + (def.plain && !(it.cfg && it.cfg.title) ? '' : wIcon(it.type)) + '<div style="min-width:0"><h3><span class="rp-drag" title="Drag to move, or click then click where it should go" aria-hidden="true">⠿</span>' + aaLogo + (def.sec && !(it.cfg && it.cfg.title) ? '' : esc(title)) + '</h3>' +
      (o.mode === 'team' && def.d && !def.plain ? '<p>' + esc(def.d) + '</p>' : '') + (def.plain ? '' : srcChip(it.type)) + '</div></div><div class="rp-acts">' +
      (o.onShareWidget && !def.internal && !def.sec ? '<button type="button" class="rp-ib" data-wshare title="A public link to just this widget, in the client-report look, for the period picked here">' + glyph('link', 12) + 'Share</button>' : '') +
      (canPush ? '<button type="button" class="rp-ib' + (pushed ? ' on' : '') + '" data-push title="' + (pushed ? 'Already in the client report: click to remove it there' : 'Add a copy to the client report') + '">' + (pushed ? '✓ In client report' : '→ Client report') + '</button>' : '') +
      (o.editable ? '<span class="rp-ib rp-edit-only"><select data-size aria-label="Width">' + (sizeKey ? '' : '<option value="" selected>' + colsOf(it) + ' of 12</option>') +
          SIZES.map(s => '<option value="' + s[0] + '"' + (s[0] === sizeKey ? ' selected' : '') + '>' + s[1] + '</option>').join('') + '</select></span>' +
        (free ? '<button type="button" class="rp-ib rp-edit-only" data-fit title="Make the height fit what the widget shows">Fit height</button>'
          : (it.h ? '<button type="button" class="rp-ib rp-edit-only" data-autoh title="Let the height follow the content again">Auto height</button>' : '') +
            '<button type="button" class="rp-ib rp-edit-only" data-up title="Move earlier">↑</button><button type="button" class="rp-ib rp-edit-only" data-down title="Move later">↓</button>') +
        '<button type="button" class="rp-ib rp-edit-only" data-cfg title="Rename' + (def.form ? ' or edit content' : '') + '">Edit</button>' +
        '<button type="button" class="rp-ib rp-edit-only" data-del title="Remove from this report">×</button>' : '') +
      '</div></div><div data-body><div class="rp-load"><span class="aiv-spin"></span></div></div>' +
      (o.editable ? '<div class="rp-rz e" data-rz="e" title="Drag to change the width"></div><div class="rp-rz s" data-rz="s" title="Drag to change the height (double-click: fit)"></div>' +
        '<div class="rp-rz se" data-rz="se" title="Drag to resize (double-click: fit height)">' + glyph('resize', 12) + '</div>' : '');
    const body = el.querySelector('[data-body]');
    watchScale(el, it, def);

    /* data */
    const needs = def.needs || [];
    Promise.all(needs.map(n => ctx.get(n).then(v => [n, v], e => [n, null, e]))).then(res => {
      if (!body.isConnected) return;
      const D = {}, errs = [];
      res.forEach(r => { D[r[0]] = r[1]; if (r[2]) errs.push(r[2]); });
      if (needs.length && !def.soft && errs.length){ body.innerHTML = '<div class="rp-err">' + esc(errs[0].message || String(errs[0])) + '</div>'; return; }
      if (needs.length && def.soft && errs.length === needs.length){ body.innerHTML = '<div class="rp-err">' + esc(errs[0].message || String(errs[0])) + '</div>'; return; }
      body.innerHTML = '';
      try{ def.render(body, ctx, it, D); }
      catch(err){ console.warn('widget', it.type, err); body.innerHTML = '<div class="rp-err">This widget couldn’t draw: ' + esc(err.message) + '</div>'; }
      if (it.h || free) body.querySelectorAll('.aiv-scroll').forEach(x => { x.style.maxHeight = 'none'; });
    });

    /* actions */
    const redraw = () => { const n = drawWidget(it); el.replaceWith(n); return n; };
    const pb = el.querySelector('[data-push]');
    if (pb) pb.addEventListener('click', () => { o.onPush && o.onPush(it); });
    const wsb = el.querySelector('[data-wshare]');
    if (wsb) wsb.addEventListener('click', () => o.onShareWidget(it));
    const sz = el.querySelector('[data-size]');
    if (sz) sz.addEventListener('change', () => {
      if (!sz.value) return;
      it.size = sz.value; it.cols = SIZE_COLS[sz.value];
      if (free){ it.x = Math.min(it.x, 12 - it.cols); compact(items, it); compact(items, null); items.sort(byPos); commit(); layoutAll(); redraw(); return; }
      commit(); redraw();
    });
    const ah = el.querySelector('[data-autoh]');
    if (ah) ah.addEventListener('click', () => { delete it.h; commit(); redraw(); });
    const fit = el.querySelector('[data-fit]');
    if (fit) fit.addEventListener('click', () => fitHeight(it));
    const mv = d => { const i = items.indexOf(it), j = i + d; if (j < 0 || j >= items.length) return; items.splice(i, 1); items.splice(j, 0, it); commit(); drawAll(); };
    const up = el.querySelector('[data-up]'), dn = el.querySelector('[data-down]');
    if (up) up.addEventListener('click', () => mv(-1));
    if (dn) dn.addEventListener('click', () => mv(1));
    const del = el.querySelector('[data-del]');
    if (del) del.addEventListener('click', () => {
      items.splice(items.indexOf(it), 1); commit(); el.remove();
      if (!items.length){ drawAll(); return; }
      if (free){ compact(items, null); items.sort(byPos); layoutAll(); commit(); }
    });
    const cf = el.querySelector('[data-cfg]');
    if (cf) cf.addEventListener('click', () => {
      const form = document.createElement('div');
      form.className = 'rp-form';
      form.innerHTML = '<label>Widget title</label><input data-c="title" value="' + esc((it.cfg && it.cfg.title) || def.t) + '">' + (def.form ? def.form(it) : '') +
        '<div style="display:flex;gap:8px;justify-content:flex-end"><button class="aiv-btn" type="button" data-x>Cancel</button><button class="aiv-btn go" type="button" data-ok>Save</button></div>';
      body.innerHTML = ''; body.classList.remove('rp-fillbody'); body.appendChild(form);
      form.querySelector('[data-x]').addEventListener('click', redraw);
      form.querySelector('[data-ok]').addEventListener('click', () => {
        it.cfg = it.cfg || {};
        form.querySelectorAll('[data-c]').forEach(f => { const k = f.dataset.c; let v = f.value.trim(); if (k === 'title' && v === def.t) v = ''; if (v) it.cfg[k] = v; else delete it.cfg[k]; });
        if (it.cfg.url){ let u = it.cfg.url; if (!/^https?:\/\//i.test(u)) u = 'https://' + u; it.cfg.url = safeUrl(u) ? u : ''; }
        commit(); redraw();
      });
    });

    /* resize with the mouse (edit mode): right edge = width, bottom edge = height, corner = both */
    el.querySelectorAll('[data-rz]').forEach(hd => {
      hd.addEventListener('dblclick', e => { e.preventDefault(); if (free) fitHeight(it); else if (it.h){ delete it.h; commit(); redraw(); } });
      hd.addEventListener('pointerdown', e => {
        if (!rp.classList.contains('editing') || e.button !== 0 || mobile()) return;
        e.preventDefault(); e.stopPropagation();
        if (!free) toFree();
        startResize(e, it, hd.dataset.rz);
      });
    });

    /* move (edit mode): drag the title bar, or click ⠿ and then click where it should go */
    const head = el.querySelector('.rp-wh');
    if (o.editable && head){
      head.addEventListener('pointerdown', e => {
        if (!rp.classList.contains('editing') || e.button !== 0 || mobile() || placing) return;
        if (e.target.closest('button,select,input,textarea,a,label')) return;
        e.preventDefault();
        const handle = !!e.target.closest('.rp-drag');
        if (!free) toFree();
        startMove(e, it, handle);
      });
    }
    return el;
  }

  /* Height that fits what the widget shows (charts take their usual height). */
  function fitHeight(it){
    const el = elOf(it); if (!el) return;
    const body = el.querySelector('[data-body]');
    let hh;
    if (body.querySelector('.rp-chwrap.fill')){
      const other = Array.from(body.children).filter(c => !c.classList.contains('rp-chwrap') && !c.querySelector('.rp-chwrap')).reduce((t, c) => t + c.offsetHeight, 0);
      hh = el.offsetHeight - body.clientHeight + other + 250;
    } else {
      body.querySelectorAll('.aiv-scroll').forEach(x => { x.style.maxHeight = 'none'; });
      hh = el.offsetHeight - body.clientHeight + body.scrollHeight + 4;
    }
    if (free){
      it.h = Math.max(80, Math.min(4000, Math.ceil(hh / SNAP) * SNAP));
      compact(items, it); compact(items, null); items.sort(byPos); layoutAll(); commit();
    }
  }

  /* Placeholder showing where a widget being moved will land. */
  const ghost = it => { const ph = document.createElement('div'); ph.className = 'rp-ph'; place(ph, it); grid.appendChild(ph); return ph; };
  let placing = null;
  function cancelPlacing(){ if (placing) placing.cancel(); }
  const scroller = () => root.classList.contains('rp-fsroot') ? root : null;
  const autoScroll = ev => {
    const sc = scroller(), top = sc ? sc.getBoundingClientRect().top : 0, bottom = sc ? sc.getBoundingClientRect().bottom : window.innerHeight;
    const d = ev.clientY < top + 70 ? -18 : ev.clientY > bottom - 70 ? 18 : 0;
    if (d){ if (sc) sc.scrollTop += d; else window.scrollBy(0, d); }
  };

  function startMove(e, it0, viaHandle){
    const it = items.find(x => x.id === it0.id) || it0;
    const el = elOf(it); if (!el) return;
    const snap = items.map(x => ({x: x.x, y: x.y}));
    const r0 = el.getBoundingClientRect();
    let offX = e.clientX - r0.left, offY = e.clientY - r0.top;
    const sx = e.clientX, sy = e.clientY;
    let moved = false, ph = null, tx = it.x, ty = it.y;
    const colW = () => (grid.clientWidth - GAP * 11) / 12;
    const follow = ev => {
      const g = grid.getBoundingClientRect();
      const left = ev.clientX - g.left - offX, top = ev.clientY - g.top - offY;
      el.style.left = left + 'px'; el.style.top = top + 'px';
      const nx = Math.max(0, Math.min(12 - it.cols, Math.round(left / (colW() + GAP)))), ny = Math.max(0, Math.round(top / SNAP) * SNAP);
      if (nx !== tx || ny !== ty){
        tx = nx; ty = ny;
        items.forEach((x, i) => { if (x !== it){ x.x = snap[i].x; x.y = snap[i].y; } });
        it.x = tx; it.y = ty;
        compact(items, it);
        items.forEach(x => { if (x !== it) place(elOf(x), x); });
        place(ph, it); setGridH();
      }
      autoScroll(ev);
    };
    const begin = () => { moved = true; el.classList.add('moving'); document.body.classList.add('rp-moving'); ph = ghost(it); };
    const finish = () => {
      el.classList.remove('moving', 'placing'); document.body.classList.remove('rp-moving');
      el.style.left = ''; el.style.top = '';
      if (ph) ph.remove();
      compact(items, null); items.sort(byPos); layoutAll(); commit();
    };
    const restore = () => {
      items.forEach((x, i) => { x.x = snap[i].x; x.y = snap[i].y; });
      el.classList.remove('moving', 'placing'); document.body.classList.remove('rp-moving');
      el.style.left = ''; el.style.top = ''; if (ph) ph.remove(); layoutAll();
    };
    const onMove = ev => {
      if (!moved){ if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return; begin(); }
      follow(ev);
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); document.removeEventListener('pointercancel', onUp);
      if (moved){ finish(); return; }
      if (viaHandle) pickUp();
    };
    document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp); document.addEventListener('pointercancel', onUp);

    /* Click ⠿ without dragging: the widget follows the pointer; the next click drops it there. */
    function pickUp(){
      const hint = document.createElement('div'); hint.className = 'rp-hint'; hint.textContent = 'Click where this widget should go · Esc cancels';
      document.body.appendChild(hint);
      offX = Math.min(offX, 40); offY = Math.min(offY, 24);
      begin(); el.classList.add('placing');
      const mv2 = ev => follow(ev);
      const swallow = ev => { ev.preventDefault(); ev.stopPropagation(); };
      const drop = ev => { ev.preventDefault(); ev.stopPropagation(); follow(ev); end(); finish(); document.addEventListener('click', swallow, {capture: true, once: true}); setTimeout(() => document.removeEventListener('click', swallow, true), 400); };
      const key = ev => { if (ev.key === 'Escape'){ end(); restore(); } };
      const end = () => { document.removeEventListener('pointermove', mv2); document.removeEventListener('pointerdown', drop, true); document.removeEventListener('keydown', key); hint.remove(); placing = null; };
      placing = {cancel: () => { end(); restore(); }};
      document.addEventListener('pointermove', mv2);
      setTimeout(() => document.addEventListener('pointerdown', drop, true), 0);
      document.addEventListener('keydown', key);
    }
  }

  function startResize(e, it0, dir){
    const it = items.find(x => x.id === it0.id) || it0;
    const el = elOf(it); if (!el) return;
    const snap = items.map(x => ({x: x.x, y: x.y}));
    const r0 = el.getBoundingClientRect(), colW = (grid.clientWidth - GAP * 11) / 12;
    const c0 = it.cols, h0 = it.h;
    let moved = false;
    const badge = document.createElement('div'); badge.className = 'rp-rzbadge'; el.appendChild(badge);
    const show = () => { badge.textContent = it.cols + ' of 12 wide · ' + it.h + 'px tall'; };
    el.classList.add('resizing'); document.body.classList.add('rp-resizing'); show();
    const move = ev => {
      moved = true;
      let c = it.cols, hh = it.h;
      if (dir !== 's') c = Math.max(1, Math.min(12 - it.x, Math.round((r0.width + (ev.clientX - e.clientX) + GAP) / (colW + GAP))));
      if (dir !== 'e') hh = Math.max(80, Math.min(4000, Math.round((r0.height + (ev.clientY - e.clientY)) / SNAP) * SNAP));
      if (c !== it.cols || hh !== it.h){
        it.cols = c; it.h = hh;
        items.forEach((x, i) => { if (x !== it){ x.x = snap[i].x; x.y = snap[i].y; } });
        compact(items, it);
        layoutAll();
        show();
      }
      autoScroll(ev);
    };
    const end = () => {
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', end);
      el.classList.remove('resizing'); document.body.classList.remove('rp-resizing'); badge.remove();
      if (!moved || (it.cols === c0 && it.h === h0)) return;
      const near = Object.keys(SIZE_COLS).find(k => SIZE_COLS[k] === it.cols);
      it.size = near || (it.cols <= 3 ? 's' : it.cols <= 4 ? 'm' : it.cols <= 8 ? 'l' : 'xl');
      compact(items, null); items.sort(byPos); layoutAll(); commit();
      const sel = el.querySelector('[data-size]');
      if (sel){ const k = SIZE_COLS[it.size] === it.cols ? it.size : ''; if (!k && !sel.querySelector('option[value=""]')) sel.insertAdjacentHTML('afterbegin', '<option value=""></option>'); const blank = sel.querySelector('option[value=""]'); if (blank) blank.textContent = it.cols + ' of 12'; sel.value = k; }
    };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  }

  /* Keep the free layout in step when the screen gets narrow or wide again (phone stacking). */
  drawAll();
  return {redraw: drawAll};
}

const cssEsc = s => (window.CSS && CSS.escape) ? CSS.escape(String(s)) : String(s).replace(/["\\]/g, '\\$&');
const pdfIcon = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>';
/* Libraries for the PDF, loaded only when someone asks for one (same pinned files as the tool). */
const PDF_LIBS = [
  ['https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H', () => window.html2canvas],
  ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk', () => window.jspdf && window.jspdf.jsPDF]
];
const loadLib = ([src, sri, ready]) => ready() ? Promise.resolve() : new Promise((res, rej) => {
  const sc = document.createElement('script'); sc.src = src; sc.integrity = sri; sc.crossOrigin = 'anonymous';
  sc.onload = () => res(); sc.onerror = () => rej(new Error('Couldn’t load the PDF maker. Check the connection and try again.'));
  document.head.appendChild(sc);
});
/* The PDF drawer only understands plain colours, so in its copy of the page
   every modern colour (color-mix, color(), oklch…) is turned into rgb first. */
function plainColours(doc){
  const cv = doc.createElement('canvas'); cv.width = cv.height = 1;
  const g = cv.getContext('2d', {willReadFrequently: true});
  const memo = {};
  const rgb = v => {
    if (memo[v]) return memo[v];
    let out = 'rgba(0,0,0,0)';
    try{ g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = v; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; out = 'rgba(' + d[0] + ',' + d[1] + ',' + d[2] + ',' + (d[3] / 255).toFixed(3) + ')'; }catch(e){}
    return memo[v] = out;
  };
  const odd = v => typeof v === 'string' && /color\(|color-mix|oklch|oklab|lab\(|lch\(/i.test(v);
  const props = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor', 'textDecorationColor', 'columnRuleColor', 'caretColor', 'fill', 'stroke'];
  const win = doc.defaultView;
  doc.querySelectorAll('*').forEach(el => {
    const cs = win.getComputedStyle(el);
    props.forEach(pr => { if (odd(cs[pr])) el.style[pr] = rgb(cs[pr]); });
    if (odd(cs.boxShadow)) el.style.boxShadow = 'none';
    if (odd(cs.backgroundImage)) el.style.backgroundImage = 'none';
  });
  /* Charts are drawn at the size they show on screen. */
  doc.querySelectorAll('svg').forEach(sv => { const r = sv.getBoundingClientRect(); if (r.width && r.height){ sv.setAttribute('width', r.width); sv.setAttribute('height', r.height); } });
}
/* The report as an A4 PDF: the page is drawn as it looks, then cut into pages
   between widgets (never through one) wherever the layout allows. Embedded
   web pages can't be drawn into a PDF, so they get a note pointing online. */
async function exportPdf(root, btn, name){
  const label = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<span class="aiv-spin"></span>Preparing PDF…';
  const rp = root.querySelector('.rp');
  const notes = [];
  try{
    await Promise.all(PDF_LIBS.map(loadLib));
    rp.classList.add('rp-printing');
    root.querySelectorAll('.rp-w[data-type="embed"] [data-body]').forEach(b => {
      const n = document.createElement('div'); n.className = 'rp-pdfnote';
      n.textContent = 'Interactive page: open the online report to view it.';
      b.appendChild(n); notes.push(n);
    });
    await new Promise(r => setTimeout(r, 250));
    const scale = 2, base = rp.getBoundingClientRect();
    const cuts = [];
    rp.querySelectorAll('.rp-grid > .rp-w, .rp-head').forEach(w => { const r = w.getBoundingClientRect(); cuts.push([(r.top - base.top) * scale, (r.bottom - base.top) * scale]); });
    const canvas = await window.html2canvas(rp, {scale, useCORS: true, backgroundColor: '#FDFDFD', logging: false, onclone: plainColours,
      ignoreElements: el => el.classList && (el.classList.contains('rp-tools') || el.classList.contains('rp-hr') || el.classList.contains('rp-rz') || el.classList.contains('rp-acts') || el.tagName === 'IFRAME')});
    const pdf = new window.jspdf.jsPDF({unit: 'mm', format: 'a4', orientation: 'portrait'});
    const M = 10, PW = 210 - M * 2, PH = 297 - M * 2 - 6;
    const k = PW / canvas.width, pageH = Math.floor(PH / k);
    const safe = y => cuts.every(c => !(c[0] < y - 2 && c[1] > y + 2));
    let y = 0, page = 0;
    while (y < canvas.height - 4){
      let end = Math.min(canvas.height, y + pageH);
      if (end < canvas.height && !safe(end)){
        const cands = cuts.flatMap(c => [c[0] - 8 * scale, c[1] + 2]).filter(v => v > y + pageH * 0.35 && v < end && safe(v));
        if (cands.length) end = Math.max(...cands);
      }
      const h = Math.max(1, Math.round(end - y));
      const slice = document.createElement('canvas'); slice.width = canvas.width; slice.height = h;
      const g2 = slice.getContext('2d'); g2.fillStyle = '#FDFDFD'; g2.fillRect(0, 0, slice.width, h);
      g2.drawImage(canvas, 0, Math.round(y), canvas.width, h, 0, 0, canvas.width, h);
      if (page) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', M, M, PW, h * k);
      page++;
      y = end;
    }
    const total = page;
    for (let i = 1; i <= total; i++){ pdf.setPage(i); pdf.setFontSize(8); pdf.setTextColor(140); pdf.text(name + '   ·   ' + i + ' / ' + total, 105, 297 - 6, {align: 'center'}); }
    pdf.save(String(name).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() + '.pdf');
  }catch(e){
    console.warn('pdf', e);
    alert(e && e.message ? e.message : 'The PDF couldn’t be made. Please try again.');
  }finally{
    notes.forEach(n => n.remove());
    rp.classList.remove('rp-printing');
    btn.disabled = false; btn.innerHTML = label;
  }
}
const fsIcon = on => '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
  (on ? 'M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6' : 'M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6') + '"/></svg>';
/* Full screen: the report covers the whole window (and the screen, where the browser allows it). Editing keeps working inside it. */
function setFullscreen(root, on, cb){
  root.classList.toggle('rp-fsroot', on);
  document.body.classList.toggle('rp-fs-on', on);
  const b = root.querySelector('[data-fs]');
  if (b){ b.innerHTML = fsIcon(on) + (on ? 'Exit full screen' : 'Full screen'); b.title = on ? 'Leave full screen' : 'Show the report full screen'; }
  try{
    if (on && document.fullscreenEnabled && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }catch(e){}
  if (on){
    const off = () => { if (!document.fullscreenElement){ document.removeEventListener('fullscreenchange', off); if (root.classList.contains('rp-fsroot') && root.__fsByApi) setFullscreen(root, false, cb); root.__fsByApi = false; } else root.__fsByApi = true; };
    root.__fsByApi = false;
    document.addEventListener('fullscreenchange', off);
  }
  cb && cb(on);
}
/* The teammates' link, ready to copy. */
function linkPanel(host, url){
  if (host.innerHTML){ host.innerHTML = ''; return; }
  host.innerHTML = '<div class="rp-share"><label class="aiv-cap"><b>Team link</b> · teammates who are signed in to the SEO tool land straight on this report, full screen.</label><input readonly value="' + esc(url) + '">' +
    '<div class="aiv-actions"><button class="aiv-btn go" type="button" data-copy>Copy link</button><a class="aiv-btn" href="' + esc(url) + '" target="_blank" rel="noopener">Open in a new tab</a><button class="aiv-btn" type="button" data-close>Close</button></div></div>';
  const b = host.querySelector('[data-copy]');
  b.addEventListener('click', () => (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => { b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy link'; }, 1400); }, () => host.querySelector('input').select()));
  host.querySelector('[data-close]').addEventListener('click', () => { host.innerHTML = ''; });
}

/* Branding: logos at the top, accent colour, header style. Saved through o.onBrand(brand). */
function brandPanel(host, o){
  if (host.innerHTML){ host.innerHTML = ''; return; }
  const b = Object.assign({logo: 'auto', agency: true, accent: '', banner: false, logoH: 44}, o.brand || {});
  const custom = b.logo && b.logo !== 'auto' && b.logo !== 'none' && b.logo !== 'site';
  host.innerHTML = '<div class="rp-panel"><h4>' + glyph('brush', 16) + 'Branding</h4>' +
    '<div class="row"><span class="lbl">Client logo</span>' +
      [['auto', 'From the client record'], ['site', 'Website icon'], ['custom', 'Upload or link'], ['none', 'None']].map(x =>
        '<label class="rp-chipx' + ((x[0] === 'custom' ? custom : b.logo === x[0]) ? ' on' : '') + '"><input type="radio" name="rpLogo" value="' + x[0] + '"' + ((x[0] === 'custom' ? custom : b.logo === x[0]) ? ' checked' : '') + '>' + x[1] + '</label>').join('') + '</div>' +
    '<div class="row" data-custom' + (custom ? '' : ' hidden') + '><input type="url" data-url placeholder="https://…/logo.png" value="' + esc(custom && !/^data:/.test(b.logo) ? b.logo : '') + '" style="flex:1;min-width:220px">' +
      '<label class="aiv-btn" style="cursor:pointer">Upload image<input type="file" accept="image/*" data-file hidden></label>' + (custom && /^data:/.test(b.logo) ? '<span class="aiv-cap">Uploaded image in use</span>' : '') + '</div>' +
    '<div class="row"><span class="lbl">Logo size</span><input type="range" min="28" max="80" step="2" value="' + (Number(b.logoH) || 44) + '" data-h style="width:180px"><span class="aiv-cap" data-hv>' + (Number(b.logoH) || 44) + 'px</span>' +
      '<label class="rp-chipx' + (b.agency !== false ? ' on' : '') + '" style="margin-left:12px"><input type="checkbox" data-agency' + (b.agency !== false ? ' checked' : '') + '>Show the EDGE logo</label></div>' +
    '<div class="row"><span class="lbl">Accent colour</span>' + ACCENTS.map(c => '<button type="button" class="rp-sw' + ((b.accent || '#e87722') === c ? ' on' : '') + '" data-acc="' + c + '" style="background:' + c + '" aria-label="' + c + '"></button>').join('') +
      '<input type="color" data-accx value="' + esc(b.accent || '#e87722') + '" title="Any colour" style="width:34px;height:28px;border:0;background:none;padding:0;cursor:pointer"></div>' +
    '<div class="row"><span class="lbl">Header</span><label class="rp-chipx' + (!b.banner ? ' on' : '') + '"><input type="radio" name="rpHead" value="0"' + (!b.banner ? ' checked' : '') + '>Plain</label>' +
      '<label class="rp-chipx' + (b.banner ? ' on' : '') + '"><input type="radio" name="rpHead" value="1"' + (b.banner ? ' checked' : '') + '>Banner in the accent colour</label></div>' +
    '<div class="row" style="justify-content:flex-end"><button class="aiv-btn" type="button" data-close>Close</button></div></div>';
  const P = host.firstChild;
  const save = () => o.onBrand && o.onBrand(Object.assign({}, b));
  P.querySelectorAll('input[name=rpLogo]').forEach(r => r.addEventListener('change', () => {
    if (r.value === 'custom'){ P.querySelector('[data-custom]').hidden = false; P.querySelectorAll('input[name=rpLogo]').forEach(x => x.parentNode.classList.toggle('on', x.checked)); return; }
    b.logo = r.value; save();
  }));
  const url = P.querySelector('[data-url]');
  url.addEventListener('change', () => { let u = url.value.trim(); if (!u) return; if (!/^https?:\/\//i.test(u)) u = 'https://' + u; if (!safeUrl(u)) return; b.logo = u; save(); });
  P.querySelector('[data-file]').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    shrinkImage(f, 480, 160).then(d => { b.logo = d; save(); }, err => alert(err.message));
  });
  const hr = P.querySelector('[data-h]');
  hr.addEventListener('input', () => { P.querySelector('[data-hv]').textContent = hr.value + 'px'; const bi = host.parentNode.querySelector('.rp-brand'); if (bi) bi.style.setProperty('--logoh', hr.value + 'px'); });
  hr.addEventListener('change', () => { b.logoH = Number(hr.value); save(); });
  P.querySelector('[data-agency]').addEventListener('change', e => { b.agency = e.target.checked; save(); });
  P.querySelectorAll('[data-acc]').forEach(x => x.addEventListener('click', () => { b.accent = x.dataset.acc === '#e87722' ? '' : x.dataset.acc; save(); }));
  P.querySelector('[data-accx]').addEventListener('change', e => { b.accent = e.target.value; save(); });
  P.querySelectorAll('input[name=rpHead]').forEach(r => r.addEventListener('change', () => { b.banner = r.value === '1'; save(); }));
  P.querySelector('[data-close]').addEventListener('click', () => { host.innerHTML = ''; });
}
/* An uploaded logo, scaled down so it stays small on the client record. */
function shrinkImage(file, maxW, maxH){
  return new Promise((res, rej) => {
    if (!/^image\//.test(file.type)) return rej(new Error('That file isn’t an image.'));
    const rd = new FileReader();
    rd.onerror = () => rej(new Error('Couldn’t read the file.'));
    rd.onload = () => {
      if (file.type === 'image/svg+xml' && rd.result.length < 60000) return res(rd.result);
      const im = new Image();
      im.onerror = () => rej(new Error('Couldn’t open the image.'));
      im.onload = () => {
        const k = Math.min(1, maxW / im.width, maxH / im.height);
        const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(im.width * k)); cv.height = Math.max(1, Math.round(im.height * k));
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        res(cv.toDataURL('image/png'));
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(file);
  });
}

/* Widget picker. Team: the whole library. Client: what the team report has (to copy over) plus text and embeds. */
/* Widget picker. Tabs: the viewer's starred widgets first ("Popular"), then one
   tab per data source, then insights, text and everything. Each card has a star
   in its bottom-right corner; stars belong to whoever's board this is (the team,
   or a member), through o.stars / o.onStar. A filter splits widgets written for
   anyone from the ones made for specialists. */
const TECH = new Set(['conv_list', 'traffic_channels', 'ga4_pages', 'ga4_pathways', 'ai_journeys', 'gai_organic', 'bing_queries', 'llm_checks', 'gsc_queries', 'gsc_pages',
  'gsc_almost', 'gsc_lowctr', 'gsc_countries', 'kw_table', 'kw_dist', 'embed']);
const lvlOf = k => (W[k] && (W[k].lvl === 'tech' || TECH.has(k))) ? 'tech' : 'simple';
const POPULAR = ['headline', 'insight_summary', 'conv_trend', 'forms', 'gsc_kpis', 'kw_cards', 'ai_visits', 'insight_wins'];
const CAT_TABS = [['star', '★ Popular'], ['ga4', 'Google Analytics'], ['gsc', 'Search Console'], ['forms', 'Website forms'], ['ai', 'AI visibility'],
  ['rank', 'Rankings & Maps'], ['insight', 'Insights & goals'], ['content', 'Text & layout'], ['all', 'All widgets']];
const catTabsOf = k => {
  const d = W[k], n = d.needs || [], t = new Set();
  if (d.g === 'insight' || d.g === 'overview'){ t.add('insight'); return t; }
  if (d.g === 'content'){ t.add('content'); return t; }
  if (n.some(x => x === 'g4' || x === 'pages' || x === 'pathway')) t.add('ga4');
  if (n.indexOf('gsc') > -1) t.add('gsc');
  if (n.indexOf('forms') > -1 || n.indexOf('formsc') > -1 || n.indexOf('easyleads') > -1 || n.indexOf('people') > -1) t.add('forms');
  if (n.indexOf('feed') > -1 || ['ai', 'gai', 'bing', 'llm'].indexOf(d.g) > -1) t.add('ai');
  if (n.indexOf('kw') > -1 || n.indexOf('gbp') > -1) t.add('rank');
  return t;
};
let catTab = (() => { try{ return localStorage.getItem('edge-cat-tab') || 'star'; }catch(e){ return 'star'; } })();
function openCatalog(o, done){
  const back = document.createElement('div');
  back.className = 'rp-cat-back';
  const inBoard = new Set(o.items.map(i => i.type));
  const all = Object.keys(W).filter(k => !(o.mode === 'client' && W[k].internal));
  const stars = () => new Set(Array.isArray(o.stars) ? o.stars : POPULAR);
  let tab = o.mode === 'client' && (o.teamItems || []).length ? 'team' : (CAT_TABS.some(t => t[0] === catTab) ? catTab : 'star'), q = '', lvl = 'all';
  const tabs = (o.mode === 'client' ? [['team', 'From the team report']] : []).concat(CAT_TABS);
  back.innerHTML = '<div class="rp-cat aiv" role="dialog" aria-modal="true" aria-label="Add widgets"><div class="rp-cat-top"><div><h2>Add widgets</h2><div class="aiv-cap">' +
    (o.who ? 'Adding to <b>' + esc(o.who) + '</b>’s dashboard. ' : '') + 'Star (☆) the ones you use most: they appear on <b>Popular</b>' + (o.who ? ' for ' + esc(o.who) : '') + '.</div></div>' +
    '<button class="aiv-x" type="button" aria-label="Close">×</button></div>' +
    '<div class="rp-cat-ctl"><input type="search" data-q placeholder="Search widgets: “leads”, “position”, “ChatGPT”…" aria-label="Search widgets">' +
    '<div class="rp-cat-lv" role="group" aria-label="Who it is for"><button type="button" data-lv="all" class="on">All</button><button type="button" data-lv="simple">For everyone</button><button type="button" data-lv="tech">For specialists</button></div></div>' +
    '<div class="rp-cat-tabs" role="tablist" data-tabs></div><div data-body></div></div>';
  document.body.appendChild(back);
  const $ = s => back.querySelector(s);
  const card = k => {
    const st = stars().has(k), m = metaOf(k), lv = lvlOf(k);
    return '<div class="rp-cat-i" data-card="' + k + '"><div class="rp-cat-h">' + wIcon(k, 17) + '<div><strong>' + esc(W[k].t) + '</strong>' + (inBoard.has(k) ? '<span class="rp-pill">on the report</span>' : '') +
      '<small>' + esc(W[k].d) + '</small></div></div><div class="rp-cat-f">' + (m.src.length ? logoStack(m.src, 14) : '') +
      '<span class="rp-lv ' + lv + '">' + (lv === 'tech' ? 'For specialists' : 'For everyone') + '</span><span class="rp-tsp"></span>' +
      '<button class="rp-ib go" type="button" data-type="' + k + '">Add</button>' +
      '<button class="rp-star' + (st ? ' on' : '') + '" type="button" data-star="' + k + '" aria-pressed="' + st + '" title="' + (st ? 'Unstar' : 'Star: show on Popular') + '">' + (st ? '★' : '☆') + '</button></div></div>';
  };
  const match = k => (lvl === 'all' || lvlOf(k) === lvl) && (!q || (W[k].t + ' ' + W[k].d + ' ' + (G[W[k].g] || '')).toLowerCase().indexOf(q) > -1);
  const listFor = t => all.filter(k => t === 'all' ? true : t === 'star' ? stars().has(k) : catTabsOf(k).has(t)).filter(match);
  const draw = () => {
    $('[data-tabs]').innerHTML = tabs.map(t => '<button type="button" role="tab" data-tab="' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + esc(t[1]) +
      (t[0] === 'team' ? '' : ' <em>' + listFor(t[0]).length + '</em>') + '</button>').join('');
    let html = '';
    if (tab === 'team'){
      const team = (o.teamItems || []).filter(t => W[t.type] && !W[t.type].internal && match(t.type));
      html = '<div class="rp-cat-list">' + (team.length ? team.map(t => { const has = o.items.some(x => x.from === t.id);
        return '<div class="rp-cat-i"><div class="rp-cat-h">' + wIcon(t.type, 17) + '<div><strong>' + esc((t.cfg && t.cfg.title) || W[t.type].t) + '</strong><small>' + esc(G[W[t.type].g]) + '</small></div></div>' +
          '<div class="rp-cat-f"><span class="rp-tsp"></span><button class="rp-ib' + (has ? ' on' : ' go') + '" type="button" data-team="' + esc(t.id) + '"' + (has ? ' disabled' : '') + '>' + (has ? 'Added' : 'Add') + '</button></div></div>'; }).join('')
        : '<div class="aiv-cap">Nothing matches.</div>') + '</div>';
    } else if (tab === 'all'){
      Object.keys(G).forEach(g => { const ks = listFor('all').filter(k => W[k].g === g); if (ks.length) html += '<div class="rp-cat-g"><b>' + esc(G[g]) + '</b><div class="rp-cat-list">' + ks.map(card).join('') + '</div></div>'; });
      if (!html) html = '<div class="aiv-cap" style="margin-top:14px">Nothing matches.</div>';
    } else {
      const ks = listFor(tab);
      html = ks.length ? '<div class="rp-cat-list">' + ks.map(card).join('') + '</div>'
        : '<div class="rp-cat-empty">' + (tab === 'star' && !q && lvl === 'all' ? '<b>No starred widgets yet.</b><br>Open any tab and click ☆ on a widget to keep it here.' : 'Nothing matches.') + '</div>';
    }
    $('[data-body]').innerHTML = html;
  };
  draw();
  const close = () => { back.remove(); done && done(); };
  back.addEventListener('click', e => {
    if (e.target === back) return close();
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('aiv-x')) return close();
    if (b.dataset.tab){ tab = b.dataset.tab; if (tab !== 'team'){ catTab = tab; try{ localStorage.setItem('edge-cat-tab', tab); }catch(err){} } draw(); return; }
    if (b.dataset.lv){ lvl = b.dataset.lv; back.querySelectorAll('[data-lv]').forEach(x => x.classList.toggle('on', x === b)); draw(); return; }
    if (b.dataset.star){
      const s = stars(), k = b.dataset.star, on = !s.has(k);
      if (on) s.add(k); else s.delete(k);
      o.stars = Array.from(s);
      if (o.onStar) o.onStar(o.stars);
      draw(); return;
    }
    if (b.dataset.type){
      const it = newItem(b.dataset.type);
      if (b.dataset.type === 'text' || b.dataset.type === 'embed') it.size = 'xl';
      o.items.push(it); inBoard.add(b.dataset.type); o.onItems && o.onItems(o.items);
      b.textContent = 'Added ✓'; b.classList.remove('go'); b.classList.add('on');
      return;
    }
    if (b.dataset.team){
      const t = (o.teamItems || []).find(x => x.id === b.dataset.team); if (!t) return;
      o.items.push(Object.assign(copyOf(t), {id: uid(), cfg: JSON.parse(JSON.stringify(t.cfg || {})), from: t.id}));
      o.onItems && o.onItems(o.items); b.textContent = 'Added ✓'; b.classList.remove('go'); b.classList.add('on'); b.disabled = true;
    }
  });
  $('[data-q]').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); draw(); });
  setTimeout(() => { const i = $('[data-q]'); if (i) i.focus(); }, 30);
  document.addEventListener('keydown', function esc_(e){ if (e.key === 'Escape'){ document.removeEventListener('keydown', esc_); if (back.isConnected) close(); } });
}

/* Public API: the client report page uses the same board. */
window.EdgeReports = {renderBoard, teamDefaultItems, rangeOf, kwRows, gbpSummary, W, PERIODS, CLIENT_PERIODS_DEFAULT, validPeriod, favUrl};

/* ==========================================================================
   SEO TOOL TABS
   ========================================================================== */
if (typeof state === 'undefined' || !document.getElementById('seoModes')) return;

const TABS = [['rteam', 'Team report', 'Everything tracked for this client, customizable, every number clickable'],
  ['rclient', 'Client report', 'What the client sees: widgets sent from the team report, plus text and embedded pages']];
let activeTab = null, loadedFor = null;
const dataCache = {};   /* per client domain: {feed, g4:{range: promise}, gsc:{range: promise}} */

function client(){ return (state.seoClients || []).find(c => c.id === state.activeSeoClientId) || null; }
/* A client's layouts. Nothing is written to the client record until someone
   changes a layout, so 40+ untouched clients don't each carry a copy of the
   default team report. Default widgets have fixed ids ("d_<type>"), so a
   widget sent to the client report still points at its source afterwards. */
const teamDefault = () => teamDefaultItems();
const liveR = {};
function reportsOf(c){
  const stored = c.reports || null;
  const r = liveR[c.id];
  if (r && r.src === stored) return r;
  return liveR[c.id] = {src: stored,
    team: stored && stored.team ? JSON.parse(JSON.stringify(stored.team)) : {period: '30', items: teamDefault()},
    client: stored && stored.client ? JSON.parse(JSON.stringify(stored.client)) : {period: 'lastMonth', items: []}};
}
/* Writes one layout back to the client record (cfg left out when empty). */
function persist(c, which){
  const R = reportsOf(c);
  const clean = b => Object.assign({}, b, {items: b.items.map(i => { const o = layoutOf(i); if (i.cfg && Object.keys(i.cfg).length) o.cfg = i.cfg; if (i.from) o.from = i.from; return o; })});
  const next = Object.assign({}, c.reports || {});
  (which ? [which] : ['team', 'client']).forEach(k => { next[k] = clean(R[k]); });
  c.reports = next; R.src = next;
  try{ if (typeof save === 'function') save(); }catch(e){ console.warn(e); }
}

function view(id){
  let v = document.getElementById('seoview-' + id);
  if (!v){
    const anchor = document.getElementById('seoview-ai') || document.getElementById('seoview-embed') || document.getElementById('seoview-keywords');
    if (!anchor) return null;
    v = document.createElement('div');
    v.className = 'seo-view'; v.id = 'seoview-' + id;
    anchor.parentNode.insertBefore(v, anchor.nextSibling);
  }
  return v;
}
function placeButtons(){
  const nav = document.getElementById('seoModes');
  if (!nav) return;
  let after = nav.querySelector('[data-seoview="ai"]') || nav.querySelector('[data-seoview="keywords"]');
  if (!after) return;
  TABS.forEach(([id, label, title]) => {
    let b = nav.querySelector('[data-seoview="' + id + '"]');
    if (!b){
      b = document.createElement('button');
      b.type = 'button'; b.className = 'seo-mode'; b.dataset.seoview = id; b.textContent = label; b.title = title;
    }
    if (after.nextSibling !== b) after.after(b);
    b.classList.toggle('on', activeTab === id);
    after = b;
  });
  if (activeTab) nav.querySelectorAll('.seo-mode').forEach(x => { if (x.dataset.seoview !== activeTab) x.classList.remove('on'); });
}
function show(id){
  activeTab = id;
  TABS.forEach(([t]) => { const v = view(t); if (v) v.classList.toggle('on', t === id); });
  if (!id) U.closeDrawer();
  placeButtons();
  if (id) draw();
}
document.addEventListener('click', e => {
  const btn = e.target.closest && e.target.closest('#seoModes .seo-mode, .seo-mode[data-seoview]');
  if (!btn || !btn.dataset.seoview) return;
  const id = btn.dataset.seoview;
  show(TABS.some(t => t[0] === id) ? id : null);
});
new MutationObserver(() => {
  placeButtons();
  const c = client();
  if (activeTab && (c ? c.id : null) !== loadedFor){ U.closeDrawer(); draw(); }
}).observe(document.getElementById('seoModes'), {childList: true});
/* The AI Visibility module adds its tab button after this file may have run. */
setTimeout(placeButtons, 0); setTimeout(placeButtons, 1500);

/* ---------- member dashboards ----------
   The Team report has a dropdown: the team report itself, then one personal
   dashboard per member (Peter Dewit…). A member's dashboard is one layout that
   follows them to every client: pick them on any client and their widgets draw
   that client's numbers. Each member keeps their own starred widgets.
   state.teamMembers holds the members ({id, name, items, period, free, stars,
   links: {clientId: public link id}}) and one '__team' record with the team
   report's stars. They sync like templates: one record each, by id. */
const saveState = () => { try{ if (typeof save === 'function') save(); }catch(e){ console.warn(e); } };
const allMem = () => Array.isArray(state.teamMembers) ? state.teamMembers : (state.teamMembers = []);
const members = () => allMem().filter(m => m && m.id && m.id !== '__team').sort((a, b) => String(a.name).localeCompare(String(b.name)));
const memberOf = id => members().find(m => m.id === id) || null;
function teamPrefs(){
  let t = allMem().find(m => m && m.id === '__team');
  if (!t){ t = {id: '__team', stars: POPULAR.slice()}; allMem().push(t); }
  if (!Array.isArray(t.stars)) t.stars = POPULAR.slice();
  return t;
}
let curWho = (() => { try{ return localStorage.getItem('edge-report-who') || ''; }catch(e){ return ''; } })();
function setWho(id){ curWho = id || ''; try{ localStorage.setItem('edge-report-who', curWho); }catch(e){} }
const cleanItems = items => items.map(i => { const o = layoutOf(i); if (i.cfg && Object.keys(i.cfg).length) o.cfg = i.cfg; if (i.from) o.from = i.from; return o; });
/* Working copies of member layouts, refreshed when a synced change arrives. */
const liveM = {};
function memItems(m){
  const L = liveM[m.id];
  if (L && L.src === m.items) return L.items;
  return (liveM[m.id] = {src: m.items, items: JSON.parse(JSON.stringify(Array.isArray(m.items) ? m.items : []))}).items;
}
function saveMember(m){ m.items = cleanItems(memItems(m)); liveM[m.id].src = m.items; saveState(); }
const firstName = m => String(m.name || '').trim().split(/\s+/)[0] || 'This member';
/* A member's round badge: initials on a colour picked from their name, so it never changes. */
const AV_COLORS = [['#e8f0fe', '#1a56c4'], ['#e6f5ee', '#0f7a58'], ['#fff1e6', '#b8570f'], ['#f3ecff', '#6a3fd1'], ['#ffe9ef', '#c2185b'], ['#e4f6f8', '#0b7a8a'], ['#fff6d6', '#8a6400'], ['#eef1f4', '#46535f']];
const initials = n => { const w = String(n || '').trim().split(/\s+/).filter(Boolean); return ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase(); };
function avatar(name, size){
  let h = 0; String(name || '').split('').forEach(ch => { h = (h * 31 + ch.charCodeAt(0)) >>> 0; });
  const c = AV_COLORS[h % AV_COLORS.length], z = size || 24;
  return '<span class="rp-av" style="width:' + z + 'px;height:' + z + 'px;font-size:' + Math.round(z * 0.42) + 'px;background:' + c[0] + ';color:' + c[1] + ';box-shadow:inset 0 0 0 1.5px ' + c[1] + '33" aria-hidden="true">' + esc(initials(name)) + '</span>';
}
const teamBadge = size => '<span class="rp-av team" style="width:' + (size || 24) + 'px;height:' + (size || 24) + 'px" aria-hidden="true">' + glyph('users', Math.round((size || 24) * 0.55)) + '</span>';
function whoHtml(){
  const ms = members(), cur = memberOf(curWho);
  return '<div class="rp-who" data-who><button type="button" class="rp-who-btn" data-who-btn aria-haspopup="menu" aria-expanded="false" title="The team report, or a teammate’s own dashboard">' +
    (cur ? avatar(cur.name, 26) : teamBadge(26)) + '<span>' + esc(cur ? cur.name : 'Team report') + '</span><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>' +
    '<div class="rp-who-menu" role="menu" hidden>' +
      '<button type="button" role="menuitem" data-wv=""' + (!cur ? ' class="on"' : '') + '>' + teamBadge(26) + '<span>Team report<small>Everything, for the whole team</small></span></button>' +
      (ms.length ? '<div class="rp-who-lbl">Personal dashboards</div>' + ms.map(m => '<button type="button" role="menuitem" data-wv="' + esc(m.id) + '"' + (cur && cur.id === m.id ? ' class="on"' : '') + '>' + avatar(m.name, 26) + '<span>' + esc(m.name) + '<small>' + ((m.items || []).length ? (m.items || []).length + ' widgets' : 'Empty dashboard') + '</small></span></button>').join('') : '') +
      '<div class="rp-who-sep"></div><button type="button" role="menuitem" data-wv="__add"><span class="rp-av add" aria-hidden="true">+</span><span>Add a member…</span></button>' +
      (ms.length ? '<button type="button" role="menuitem" data-wv="__manage"><span class="rp-av add" aria-hidden="true">' + glyph('users', 13) + '</span><span>Manage members…</span></button>' : '') +
    '</div></div>';
}
function addMember(){
  const name = (prompt('Teammate’s name (for example Peter Dewit):') || '').trim();
  if (!name) return null;
  const m = {id: 'mem_' + uid(), name: name.slice(0, 60), items: [], period: '30', stars: POPULAR.slice(), links: {}};
  allMem().push(m);
  try{ if (typeof untombstone === 'function') untombstone('teamMember', m.id); }catch(e){}
  saveState();
  toastMsg(name + ' added. Their dashboard starts empty: add the widgets they check most.');
  return m;
}
function wireWho(v, c){
  const box = v.querySelector('[data-who]');
  if (!box) return;
  const btn = box.querySelector('[data-who-btn]'), menu = box.querySelector('.rp-who-menu');
  const shut = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', away); document.removeEventListener('keydown', key); };
  const away = e => { if (!box.contains(e.target)) shut(); };
  const key = e => { if (e.key === 'Escape') shut(); };
  btn.addEventListener('click', e => { e.stopPropagation(); if (!menu.hidden) return shut(); menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); setTimeout(() => { document.addEventListener('click', away); document.addEventListener('keydown', key); }, 0); });
  menu.querySelectorAll('[data-wv]').forEach(b => b.addEventListener('click', () => {
    const val = b.dataset.wv; shut();
    if (val === '__add'){ const m = addMember(); if (m){ setWho(m.id); editingState.rteam = true; draw(); } return; }
    if (val === '__manage'){ manageMembers(c); return; }
    setWho(val); draw();
  }));
}
function manageMembers(c){
  U.openDrawer('Team members', '#171614', body => {
    const paint = () => {
      const ms = members();
      body.innerHTML = '<div class="aiv-card"><p class="aiv-cap" style="margin:0 0 10px">Each member has one dashboard that follows them to every client, and their own starred widgets. Removing a member deletes their dashboard; their public links stop working.</p>' +
        (ms.length ? '<table class="aiv-table"><tbody>' + ms.map(m => '<tr><td style="display:flex;gap:10px;align-items:center">' + avatar(m.name, 30) + '<div><b>' + esc(m.name) + '</b><div class="rp-fs-sub">' + (Array.isArray(m.items) ? m.items.length : 0) + ' widgets · ' + ((m.stars || []).length) + ' starred</div></div></td>' +
          '<td style="text-align:right;white-space:nowrap"><button class="aiv-btn" type="button" data-open="' + esc(m.id) + '">Open</button> <button class="aiv-btn" type="button" data-ren="' + esc(m.id) + '">Rename</button> <button class="aiv-btn" type="button" data-del="' + esc(m.id) + '">Remove</button></td></tr>').join('') + '</tbody></table>'
          : '<p>No members yet.</p>') +
        '<div class="aiv-actions" style="margin-top:12px"><button class="aiv-btn go" type="button" data-addm>+ Add a member</button></div></div>';
      body.querySelector('[data-addm]').addEventListener('click', () => { const m = addMember(); if (m) paint(); });
      body.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => { setWho(b.dataset.open); U.closeDrawer(); draw(); }));
      body.querySelectorAll('[data-ren]').forEach(b => b.addEventListener('click', () => {
        const m = memberOf(b.dataset.ren); if (!m) return;
        const n = (prompt('New name:', m.name) || '').trim(); if (!n) return;
        m.name = n.slice(0, 60); saveState(); paint(); draw();
      }));
      body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
        const m = memberOf(b.dataset.del); if (!m) return;
        if (!confirm('Remove ' + m.name + ' and their dashboard?\n\nTheir public dashboard links stop working. This can’t be undone.')) return;
        const ids = Object.values(m.links || {});
        if (typeof fbDb !== 'undefined' && fbDb) for (const id of ids){ try{ await fbDb.collection('publicViews').doc(id).delete(); }catch(e){ try{ await fbDb.collection('publicViews').doc(id).set({type: 'revoked', revokedAt: Date.now()}); }catch(err){} } }
        const i = allMem().indexOf(m); if (i > -1) allMem().splice(i, 1);
        try{ if (typeof tombstone === 'function') tombstone('teamMember', m.id); }catch(e){}
        delete liveM[m.id];
        if (curWho === m.id) setWho('');
        saveState(); paint(); draw();
      }));
    };
    paint();
  });
}
function pushToClient(c, it){
  const R = reportsOf(c);
  const ex = R.client.items.findIndex(x => x.from === it.id);
  if (ex > -1){ R.client.items.splice(ex, 1); toastMsg('Removed from the client report'); }
  else { R.client.items.push(Object.assign(copyOf(it), {id: uid(), cfg: JSON.parse(JSON.stringify(it.cfg || {})), from: it.id})); toastMsg('Added to the client report'); }
  persist(c, 'client'); autoPublish(c); draw();
}
const memberTeamUrl = (c, m) => teamUrl(c, 'rteam') + '/m/' + encodeURIComponent(m.id);
function drawMember(v, c, ctx, R, m){
  const items = memItems(m), per = validPeriod(m.period) ? m.period : '30';
  renderBoard(v, Object.assign({mode: 'team', title: m.name + ' — ' + (c.name || ctx.domain), sub: esc(ctx.domain) + ' · ' + esc(firstName(m)) + '’s dashboard · same layout on every client',
    items, period: per, ctx, whoHtml: whoHtml(), who: m.name,
    editable: true, startEditing: editingState.rteam, onEditing: e => { editingState.rteam = e; },
    free: !!m.free, onFree: on => { m.free = on; saveState(); }, teamLink: memberTeamUrl(c, m),
    stars: Array.isArray(m.stars) ? m.stars : POPULAR.slice(), onStar: st => { m.stars = st; saveState(); },
    pushed: new Set(R.client.items.map(x => x.from).filter(Boolean)),
    onItems: () => { saveMember(m); const L = (m.links || {})[c.id]; if (L){ clearTimeout(pubTimers['m' + m.id + c.id]); pubTimers['m' + m.id + c.id] = setTimeout(() => publishMember(c, m, L).catch(e => console.warn('member publish', e)), 2500); } },
    onPeriod: p => { m.period = p; saveState(); draw(); },
    onShareWidget: it => shareWidget(c, it, per),
    onPush: it => pushToClient(c, it),
    emptyHtml: '<h3>' + esc(firstName(m)) + '’s dashboard is empty</h3><div>Add the widgets ' + esc(firstName(m)) + ' checks most. The <b>★ Popular</b> tab lists their starred widgets.<br>This layout follows them to every client.</div>' +
      '<div style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="aiv-btn go" type="button" data-empty-add>+ Add widgets</button><button class="aiv-btn" type="button" data-mstars>Add all ' + esc(firstName(m)) + '’s starred widgets</button></div>',
    actionsHtml: '<button class="aiv-btn go" type="button" data-mshare title="Public link and team link to this dashboard">Share</button>' +
      '<button class="aiv-btn" type="button" data-mcopy title="Replace this dashboard with the team report’s widgets">Copy team layout</button>'}, logosFor(c, R.team)));
  wireWho(v, c);
  v.querySelector('[data-mshare]').addEventListener('click', () => shareMember(c, m));
  v.querySelector('[data-mcopy]').addEventListener('click', () => {
    if (items.length && !confirm('Replace ' + m.name + '’s dashboard with the team report’s widgets?')) return;
    m.items = cleanItems(R.team.items.map(i => Object.assign(copyOf(i), {id: uid(), cfg: JSON.parse(JSON.stringify(i.cfg || {}))})));
    m.free = !!R.team.free; delete liveM[m.id]; saveState(); draw();
  });
  const ms = v.querySelector('[data-mstars]');
  if (ms) ms.addEventListener('click', () => {
    const st = (Array.isArray(m.stars) ? m.stars : POPULAR).filter(k => W[k]);
    st.forEach(k => items.push(newItem(k)));
    saveMember(m); draw();
  });
}
/* Public link to a member's dashboard for this client (client-report look, no names or emails), plus the team link. */
const memLinkOf = (c, m) => { const L = m.links || {}; return L[c.id] && /^clientreport-[\w-]+$/.test(L[c.id]) ? L[c.id] : 'clientreport-' + c.id + '-m-' + String(m.id).replace(/[^\w-]/g, ''); };
async function publishMember(c, m, id){
  if (typeof fbDb === 'undefined' || !fbDb) throw new Error('Not connected to the cloud.');
  const per = validPeriod(m.period) ? m.period : '30';
  const items = memItems(m).filter(i => W[i.type] && !W[i.type].internal).map(i => Object.assign(copyOf(i), {cfg: JSON.parse(JSON.stringify(i.cfg || {}))}));
  const periods = Array.from(new Set([per].concat(CLIENT_PERIODS_DEFAULT)));
  const doc = await buildDoc(c, {items, period: per, periods, multi: true, title: m.name + ' — ' + (c.name || '')});
  await fbDb.collection('publicViews').doc(id).set(doc);
}
async function shareMember(c, m){
  U.openDrawer(m.name + '’s dashboard · share links', '#171614', async body => {
    const show = (id, note) => {
      const url = linkUrl(id), team = memberTeamUrl(c, m);
      body.innerHTML = '<div class="rp-share">' + (note ? '<p class="aiv-status" style="margin:0 0 10px">' + esc(note) + '</p>' : '') +
        '<h4 style="margin:0 0 4px;font-size:13.5px">Public link</h4><p class="aiv-cap" style="margin:0 0 8px">' + esc(m.name) + '’s widgets for <b>' + esc(c.name || '') + '</b> in the client-report look. Numbers stay live; names, emails and messages from forms never show.</p>' +
        '<input readonly data-f="l" value="' + esc(url) + '"><div class="aiv-actions"><button class="aiv-btn" type="button" data-copy="l">Copy link</button><a class="aiv-btn" href="' + esc(url) + '" target="_blank" rel="noopener">Open</a>' +
        '<button class="aiv-btn" type="button" data-new title="Make a new link and switch this one off for good">New link</button></div>' +
        '<h4 style="margin:18px 0 4px;font-size:13.5px">Team link (internal)</h4><p class="aiv-cap" style="margin:0 0 8px">Opens the tool (sign-in required) straight on ' + esc(firstName(m)) + '’s dashboard for this client, everything clickable.</p>' +
        '<input readonly data-f="t" value="' + esc(team) + '"><div class="aiv-actions"><button class="aiv-btn" type="button" data-copy="t">Copy team link</button><a class="aiv-btn" href="' + esc(team) + '" target="_blank" rel="noopener">Open</a></div></div>';
      body.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => { const t = b.dataset.copy === 'l' ? url : team;
        (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { const o = b.textContent; b.textContent = 'Copied'; setTimeout(() => { b.textContent = o; }, 1400); }, () => body.querySelector('[data-f="' + b.dataset.copy + '"]').select()); }));
      body.querySelector('[data-new]').addEventListener('click', async () => {
        if (!confirm('Make a new link for ' + m.name + '’s dashboard on ' + (c.name || 'this client') + '?\n\nThe current link stops working straight away for everyone who has it.')) return;
        body.innerHTML = '<div class="rp-share"><span><span class="aiv-spin"></span>Making a new link…</span></div>';
        const rnd = (crypto && crypto.getRandomValues) ? Array.from(crypto.getRandomValues(new Uint8Array(9)), b => b.toString(36).padStart(2, '0')).join('').slice(0, 14) : Math.random().toString(36).slice(2, 16);
        const newId = 'clientreport-' + c.id + '-m' + rnd;
        try{
          await publishMember(c, m, newId);
          let off = false;
          try{ await fbDb.collection('publicViews').doc(id).delete(); off = true; }catch(e){ try{ await fbDb.collection('publicViews').doc(id).set({type: 'revoked', revokedAt: Date.now()}); off = true; }catch(err){} }
          m.links = Object.assign({}, m.links || {}, {[c.id]: newId}); saveState();
          show(newId, off ? 'New link ready. The old link no longer works.' : 'New link ready, but the old link couldn’t be switched off. Try New link again.');
        }catch(err){ body.innerHTML = '<div class="rp-share"><span class="aiv-status err">Couldn’t make the new link: ' + esc(err.message || String(err)) + '</span></div>'; }
      });
    };
    body.innerHTML = '<div class="rp-share"><span><span class="aiv-spin"></span>Publishing ' + esc(firstName(m)) + '’s dashboard…</span></div>';
    const id = memLinkOf(c, m);
    try{ await publishMember(c, m, id); if (!(m.links || {})[c.id]){ m.links = Object.assign({}, m.links || {}, {[c.id]: id}); saveState(); } show(id); }
    catch(err){ body.innerHTML = '<div class="rp-share"><span class="aiv-status err">Couldn’t publish: ' + esc(err.message || String(err)) + '</span></div>'; }
  });
}

/* ---------- team links ----------
   index.html#/rteam/<client id> (or #/rclient/<client id>) opens the tool on
   that client's report in full screen. The tool's own sign-in still applies:
   the link waits until the person is signed in and the client list has loaded. */
/* #/rteam/<client>/w/<widget>/<period>: the team report showing that one widget (see draw). */
let focusW = null;
function teamUrl(c, tab){ return location.origin + location.pathname + '#/' + tab + '/' + encodeURIComponent(c.id); }
(function deepLink(){
  const m = location.hash.match(/^#\/(rteam|rclient)\/([^/?#]+)(?:\/(w|m)\/([^/?#]+)(?:\/([^/?#]+))?)?$/);
  if (!m) return;
  const tab = m[1], id = decodeURIComponent(m[2]);
  if (m[3] === 'w' && tab === 'rteam'){ const p = m[5] ? decodeURIComponent(m[5]) : ''; focusW = {cid: id, wid: decodeURIComponent(m[4]), period: validPeriod(p) ? p : ''}; }
  if (m[3] === 'm' && tab === 'rteam') setWho(decodeURIComponent(m[4]));
  const started = Date.now();
  const tryOpen = () => {
    const shell = document.getElementById('appShell');
    const ready = typeof state !== 'undefined' && state && Array.isArray(state.seoClients) && shell && !shell.classList.contains('hidden') && document.getElementById('seoModes');
    const c = ready ? state.seoClients.find(x => x && x.id === id) : null;
    if (!c){
      /* keep waiting through sign-in and the cloud load (up to 15 minutes) */
      if (Date.now() - started < 15 * 60 * 1000) setTimeout(tryOpen, 600);
      return;
    }
    state.activeSeoClientId = c.id;
    try{ if (window.EDGE && window.EDGE.go) window.EDGE.go('seo'); }catch(e){ console.warn(e); }
    setTimeout(() => {
      placeButtons();
      const v = view(tab);
      if (v) setFullscreen(v, true);
      /* the same as clicking the tab, so the tool hides its other views too */
      const b = document.querySelector('#seoModes [data-seoview="' + tab + '"]');
      if (b) b.click(); else show(tab);
      try{ history.replaceState(null, '', location.pathname + location.search); }catch(e){}
    }, 250);
  };
  setTimeout(tryOpen, 300);
})();

/* ---------- data loaders for one client ---------- */
function ctxFor(c){
  const domain = AIV.normDomain(c.website || '');
  const s = AIV.tracker ? AIV.tracker() : {};
  const dc = dataCache[domain] = dataCache[domain] || {g4: {}, gsc: {}, pages: {}, pg: {}, pw: {}, at: Date.now()};
  if (Date.now() - dc.at > 15 * 60 * 1000){ dataCache[domain] = {g4: {}, gsc: {}, pages: {}, pg: {}, pw: {}, at: Date.now()}; return ctxFor(c); }
  const ctx = {domain, clientName: c.name || ''};
  ctx.people = peopleStore(c);
  const noTracker = () => Promise.reject(new Error('Connect the AI Visibility Tracker first (AI Visibility tab, ⚙).'));
  const noSite = () => Promise.reject(new Error('Add this client’s website on the Dashboard tab first.'));
  ctx.get = name => {
    if (name === 'kw') return Promise.resolve(kwRows(c));
    if (name === 'gbp') return Promise.resolve(gbpSummary(gbpsFor(c)));
    if (domain.indexOf('.') < 0) return noSite();
    if (!s.url || !s.key) return noTracker();
    if (name === 'feed') return dc.feed || (dc.feed = AIV.getFeed(domain).catch(e => { dc.feed = null; throw e; }));
    const R = ctx.R;
    if (name === 'g4'){
      const k = R.prevSince + '|' + R.end;
      return dc.g4[k] || (dc.g4[k] = AIV.apiGet(s.url, {action: 'ga4report', domain, key: s.key, start: R.prevSince, end: R.end}).catch(e => { delete dc.g4[k]; throw e; }));
    }
    if (name === 'gsc'){
      const k = R.since + '|' + R.end;
      return dc.gsc[k] || (dc.gsc[k] = AIV.apiGet(s.url, {action: 'gscQueries', domain, key: s.key, start: R.since, end: R.end}).catch(e => { delete dc.gsc[k]; throw e; }));
    }
    if (name === 'pages'){
      const k = R.prevSince + '|' + R.since + '|' + R.end;
      return dc.pages[k] || (dc.pages[k] = AIV.apiGet(s.url, {action: 'pages', domain, key: s.key, start: R.prevSince, split: R.since, end: R.end})
        .then(r => { if (r && r.error) throw new Error(r.error); return r; }).catch(e => { delete dc.pages[k]; throw e; }));
    }
    if (name === 'pathway') return ctx.loadPathway('all');
    if (name === 'gsch') return dc.gsch || (dc.gsch = AIV.apiGet(s.url, {action: 'gscHealth', domain, key: s.key, start: R.since, end: R.end})
      .then(r => { if (r && r.error) throw new Error(r.error); return r; }).catch(e => { dc.gsch = null; throw e; }));
    if (name === 'forms'){
      const k = R.prevSince + '|' + R.end;
      dc.forms = dc.forms || {};
      return dc.forms[k] || (dc.forms[k] = AIV.apiGet(s.url, {action: 'forms', domain, key: s.key, start: R.prevSince, end: R.end})
        .then(r => { if (r && r.error) throw new Error(r.error); return r; }).catch(e => { delete dc.forms[k]; throw e; }));
    }
    if (name === 'easyleads'){
      const k = R.prevSince + '|' + R.end;
      dc.el = dc.el || {};
      return dc.el[k] || (dc.el[k] = AIV.apiGet(s.url, {action: 'forms', src: 'easyleads', domain, key: s.key, start: R.prevSince, end: R.end})
        .then(r => { if (r && r.error) throw new Error(r.error); return r; }).catch(e => { delete dc.el[k]; throw e; }));
    }
    /* Client personas: every form on file, website and Easyleads, all time (the period doesn't narrow it). */
    if (name === 'people'){
      if (dc.people) return dc.people;
      const end = isoDay(new Date()), one = src => AIV.apiGet(s.url, Object.assign({action: 'forms', domain, key: s.key, start: '2010-01-01', end}, src ? {src} : {}))
        .then(r => (r && !r.error ? r : null), () => null);
      return dc.people = Promise.all([one(''), one('easyleads')]).then(res => {
        const a = res[0], b = res[1];
        if (!a && !b){ dc.people = null; throw new Error('Couldn’t read the form submissions from the tracker.'); }
        const tag = (x, src) => (x && Array.isArray(x.rows) ? x.rows : []).filter(r => r && r.t).map(r => Object.assign({}, r, {_src: src}));
        return {rows: tag(a, 'web').concat(tag(b, 'el')), details: !!((a && a.details) || (b && b.details)), first: [a && a.first, b && b.first].filter(Boolean).sort()[0] || ''};
      });
    }
    /* Form inbox: the same forms payload (the team key sees every detail). */
if (name === 'formsc') return ctx.get('forms');
return Promise.reject(new Error('Unknown data source ' + name));
  };
  /* Pathways for one traffic type (all, organic, paid, direct, referral, other). */
  ctx.loadPathway = ch => {
    if (domain.indexOf('.') < 0) return noSite();
    if (!s.url || !s.key) return noTracker();
    const R = ctx.R, k = R.since + '|' + R.end + '|' + (ch || 'all');
    return dc.pw[k] || (dc.pw[k] = AIV.apiGet(s.url, {action: 'pathway', domain, key: s.key, start: R.since, end: R.end, channel: ch || 'all'}).catch(e => { delete dc.pw[k]; throw e; }));
  };
  /* One page, day by day (Page performance widget). */
  ctx.loadPage = path => {
    if (!s.url || !s.key || domain.indexOf('.') < 0) return Promise.reject(new Error('The tracker isn’t connected.'));
    const R = ctx.R, k = R.since + '|' + R.end + '|' + path;
    return dc.pg[k] || (dc.pg[k] = AIV.apiGet(s.url, {action: 'pages', domain, key: s.key, start: R.prevSince, split: R.since, end: R.end, path}).catch(e => { delete dc.pg[k]; throw e; }));
  };
  /* Form inbox: let one client report link see who sent each website form (registers or removes that link's secret on the tracker). */
ctx.formsShare = (secret, on) => (!s.url || !s.key || domain.indexOf('.') < 0) ? Promise.reject(new Error('The tracker isn’t connected.'))
: fetch(s.url, {method: 'POST', body: JSON.stringify({key: s.key, action: 'formsShare', domain, secret, on: !!on})}).then(r => r.json()).then(r => { if (r && r.error) throw new Error(r.error); return r; });
/* Search Console health: queue this client's pages for inspection now. */
  ctx.gscHealthNow = () => (!s.url || !s.key || domain.indexOf('.') < 0) ? Promise.reject(new Error('The tracker isn’t connected.'))
    : fetch(s.url, {method: 'POST', body: JSON.stringify({key: s.key, action: 'gscHealthNow', domain})}).then(r => r.json()).then(r => { dc.gsch = null; return r; });
  ctx.loadJourneys = (since, end) => AIV.apiGet(s.url, {action: 'journeys', domain, key: s.key, start: since, end});
  return ctx;
}
/* GBP Tracker profiles for this SEO client: same name, or a profile whose website is this domain. */
function gbpsFor(c){
  const nm = String(c.name || '').trim().toLowerCase(), dom = AIV.normDomain(c.website || '');
  const out = [];
  (state.clients || []).forEach(g => (g.gbps || []).forEach(p => {
    const same = String(g.name || '').trim().toLowerCase() === nm || (dom && AIV.normDomain(p.website || '') === dom);
    if (same) out.push(p);
  }));
  return out;
}

/* ---------- drawing ---------- */
const editingState = {rteam: false, rclient: false};
const panelOpen = {rteam: '', rclient: ''};
/* The client's own logo for a report header, and the agency logo. */
function logosFor(c, board){
  const lg = (board.brand && board.brand.logo) || 'auto';
  const dom = AIV.normDomain(c.website || ''), site = dom.indexOf('.') > -1 ? favUrl(dom, 128) : '';
  const cl = lg === 'auto' ? ((c.logoUrl || '').trim() || site) : lg === 'site' ? site : lg === 'none' ? '' : lg;
  return {clientLogo: cl, agencyLogo: window.EDGE_LOGO || '', clientName: c.name || dom};
}
/* Periods the client may switch between, and the one the report opens on. */
const clientPeriods = R => { const p = (R.client.periods || CLIENT_PERIODS_DEFAULT).filter(validPeriod); return p.length ? p : ['lastMonth']; };
const clientPeriod = R => { const ps = clientPeriods(R); return ps.indexOf(String(R.client.period)) > -1 ? String(R.client.period) : ps[0]; };
function periodNote(R){
  const ps = clientPeriods(R), lbl = k => (PERIODS.find(x => x[0] === k) || [0, k])[1];
  const first = lbl(clientPeriod(R));
  return ps.length > 1
    ? 'The client opens this report on <b>' + esc(first) + '</b> and can switch between: ' + ps.map(k => esc(lbl(k))).join(', ') + '. Change this under <b>Date ranges</b>.'
    : 'The period is locked to <b>' + esc(first) + '</b>: the client can’t change it. Change this under <b>Date ranges</b>.';
}
function datePanel(host, c, R){
  if (host.innerHTML){ host.innerHTML = ''; panelOpen.rclient = ''; return; }
  panelOpen.rclient = 'dates';
  const ps = clientPeriods(R), cur = clientPeriod(R);
  host.innerHTML = '<div class="rp-panel aiv"><h4>' + glyph('lock', 16) + 'Date ranges the client can use</h4>' +
    '<div class="aiv-cap">Only the periods ticked here appear on the shared report. Tick one to lock the report to that period.</div>' +
    '<div class="row"><span class="lbl">Client can switch between</span>' + PERIODS.map(p => '<label class="rp-chipx' + (ps.indexOf(p[0]) > -1 ? ' on' : '') + '"><input type="checkbox" value="' + p[0] + '"' + (ps.indexOf(p[0]) > -1 ? ' checked' : '') + '>' + esc(p[1]) + '</label>').join('') + '</div>' +
    '<div class="row"><span class="lbl">Opens on</span><select data-first>' + ps.map(k => '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + esc((PERIODS.find(x => x[0] === k) || [0, k])[1]) + '</option>').join('') + '</select>' +
      '<label class="rp-chipx' + (R.client.showDates !== false ? ' on' : '') + '" style="margin-left:12px"><input type="checkbox" data-dates' + (R.client.showDates !== false ? ' checked' : '') + '>Show the exact dates under the title</label></div>' +
    '<div class="row" style="justify-content:flex-end"><button class="aiv-btn" type="button" data-close>Close</button></div></div>';
  const P = host.firstChild;
  const done = () => { persist(c, 'client'); autoPublish(c); draw(); };
  P.querySelectorAll('input[type=checkbox][value]').forEach(cb => cb.addEventListener('change', () => {
    const next = Array.from(P.querySelectorAll('input[type=checkbox][value]:checked')).map(x => x.value);
    if (!next.length){ cb.checked = true; toastMsg('Keep at least one period'); return; }
    R.client.periods = PERIODS.map(x => x[0]).filter(k => next.indexOf(k) > -1);
    if (R.client.periods.indexOf(String(R.client.period)) < 0) R.client.period = R.client.periods[0];
    done();
  }));
  P.querySelector('[data-first]').addEventListener('change', e => { R.client.period = e.target.value; done(); });
  P.querySelector('[data-dates]').addEventListener('change', e => { if (e.target.checked) delete R.client.showDates; else R.client.showDates = false; done(); });
  P.querySelector('[data-close]').addEventListener('click', () => { host.innerHTML = ''; panelOpen.rclient = ''; });
}
function draw(){
  const id = activeTab, v = view(id), c = client();
  loadedFor = c ? c.id : null;
  if (!v) return;
  if (!c){ AIV.renderMessage(v, 'No client selected', 'Pick an SEO client on the left.'); return; }
  const R = reportsOf(c);
  const ctx = ctxFor(c);
  /* One widget from a teammate's widget link: just that widget, full width, everything clickable. */
  const fw = id === 'rteam' && focusW && focusW.cid === c.id ? R.team.items.find(x => x.id === focusW.wid) : null;
  if (id === 'rteam' && focusW && focusW.cid === c.id && !fw){ focusW = null; toastMsg('That widget is no longer on the team report.'); }
  if (fw){
    const def = W[fw.type];
    const per = focusW.period || (validPeriod(R.team.period) ? R.team.period : '30');
    const item = Object.assign({}, fw, {size: 'xl', cols: 12}); delete item.x; delete item.y; delete item.h;
    renderBoard(v, Object.assign({mode: 'team', title: (c.name || ctx.domain) + ' — ' + ((fw.cfg && fw.cfg.title) || (def ? def.t : 'Widget')), sub: esc(ctx.domain) + ' · one widget · internal',
      items: [item], period: per, ctx, editable: false,
      onPeriod: p => { focusW.period = p; draw(); },
      actionsHtml: '<button class="aiv-btn" type="button" data-fullteam>Show the whole team report</button>'}, logosFor(c, R.team)));
    v.querySelector('[data-fullteam]').addEventListener('click', () => { focusW = null; draw(); });
    return;
  }
  if (id === 'rteam' && curWho && !memberOf(curWho)) setWho('');
  if (id === 'rteam' && curWho){ drawMember(v, c, ctx, R, memberOf(curWho)); return; }
  if (id === 'rteam'){
    const clientFrom = new Set(R.client.items.map(x => x.from).filter(Boolean));
    renderBoard(v, Object.assign({mode: 'team', title: (c.name || ctx.domain) + ' — Team report', sub: esc(ctx.domain) + ' · internal · <button type="button" class="rp-tpl-pill" data-tplpill title="Open templates">' + glyph('grid', 12) + esc(tplLabel(tplStatus(R.team, 'team'))) + '</button>', items: R.team.items, period: validPeriod(R.team.period) ? R.team.period : '30', ctx,
      whoHtml: whoHtml(), stars: teamPrefs().stars, onStar: st => { teamPrefs().stars = st; saveState(); },
      editable: true, startEditing: editingState.rteam, onEditing: e => { editingState.rteam = e; },
      free: !!R.team.free, onFree: on => { R.team.free = on; }, teamLink: teamUrl(c, 'rteam'),
      pushed: clientFrom, brand: R.team.brand,
      onBrand: b => { R.team.brand = b; persist(c, 'team'); panelOpen.rteam = 'brand'; draw(); },
      onItems: () => persist(c, 'team'),
      onPeriod: p => { R.team.period = p; persist(c, 'team'); draw(); },
      onShareWidget: it => shareWidget(c, it, validPeriod(R.team.period) ? R.team.period : '30'),
      onPush: it => pushToClient(c, it),
      actionsHtml: '<button class="aiv-btn" type="button" data-tpl style="display:inline-flex;align-items:center;gap:6px" title="Save this layout as a template, or apply a template to many clients">' + glyph('grid', 14) + 'Templates</button>' + '<button class="aiv-btn" type="button" data-reset title="Put back the default set of widgets">Reset layout</button>'}, logosFor(c, R.team)));
    v.querySelector('[data-tpl]').addEventListener('click', () => openTemplates(c));
    v.querySelectorAll('[data-tplpill]').forEach(b => b.addEventListener('click', () => openTemplates(c)));
    wireWho(v, c);
    const rs = v.querySelector('[data-reset]');
    if (rs) rs.addEventListener('click', () => {
      if (!confirm('Put the team report back to the default widgets and layout? Your changes to this layout will be lost. The client report is not affected.')) return;
      R.team.items = teamDefault(); delete R.team.free; persist(c, 'team'); draw();
    });
    if (panelOpen.rteam === 'brand' && editingState.rteam){ const b = v.querySelector('[data-brand]'); if (b) b.click(); }
    panelOpen.rteam = '';
  } else {
    const pub = R.client.publishedAt;
    renderBoard(v, Object.assign({mode: 'client', title: R.client.title || ((c.name || ctx.domain) + ' — Report'), sub: pub ? 'Shared · updates automatically' : 'Not shared yet', items: R.client.items, period: clientPeriod(R), ctx,
      editable: true, startEditing: editingState.rclient, onEditing: e => { editingState.rclient = e; }, aa: true, teamLink: teamUrl(c, 'rclient'),
      teamItems: R.team.items, periods: clientPeriods(R), stars: teamPrefs().stars, onStar: st => { teamPrefs().stars = st; saveState(); }, showDates: R.client.showDates !== false, lockNote: true, brand: R.client.brand,
      onBrand: b => { R.client.brand = b; persist(c, 'client'); autoPublish(c); panelOpen.rclient = 'brand'; draw(); },
      emptyHtml: '<h3>This client report is empty</h3><div>Open the <b>Team report</b> and click <b>→ Client report</b> on any widget to send it here,<br>or add widgets, text and embedded pages here.</div>' +
        '<div style="margin-top:14px"><button class="aiv-btn go" type="button" data-empty-add>+ Add widgets</button></div>',
      onItems: () => { persist(c, 'client'); autoPublish(c); },
      onPeriod: p => { if (clientPeriods(R).indexOf(p) < 0) return; R.client.period = p; persist(c, 'client'); autoPublish(c); draw(); },
      actionsHtml: '<button class="aiv-btn" type="button" data-tpl style="display:inline-flex;align-items:center;gap:6px" title="Save this layout as a template, or apply a template to many clients">' + glyph('grid', 14) + 'Templates</button>' + '<button class="aiv-btn" type="button" data-dates style="display:inline-flex;align-items:center;gap:6px">' + glyph('cal', 14) + 'Date ranges</button>' +
        '<button class="aiv-btn" type="button" data-title>Rename</button>' +
        (pub ? '<button class="aiv-btn" type="button" data-regen title="Make a new link and switch the old one off">New link</button>' : '') +
        '<button class="aiv-btn go" type="button" data-share>' + (pub ? 'Share link' : 'Share report') + '</button>',
      topHtml: '<div data-sharebox></div><div data-datebox></div><div class="aiv-note"><button type="button" class="rp-tpl-pill" data-tplpill title="Open templates">' + glyph('grid', 12) + esc(tplLabel(tplStatus(R.client, 'client'))) + '</button> ' + periodNote(R) + ' Widgets here are copies: moving or resizing them doesn’t change the team report.</div>'}, logosFor(c, R.client)));
    v.querySelectorAll('[data-tplpill]').forEach(b => b.addEventListener('click', () => openTemplates(c)));
    v.querySelector('[data-share]').addEventListener('click', () => share(v, c));
    const rg = v.querySelector('[data-regen]');
    if (rg) rg.addEventListener('click', () => regenerate(v, c));
    v.querySelector('[data-tpl]').addEventListener('click', () => openTemplates(c));
    v.querySelector('[data-dates]').addEventListener('click', () => datePanel(v.querySelector('[data-datebox]'), c, R));
    v.querySelector('[data-title]').addEventListener('click', () => {
      const t = prompt('Report title the client sees:', R.client.title || ((c.name || ctx.domain) + ' — Report'));
      if (t == null) return; R.client.title = t.trim(); persist(c, 'client'); autoPublish(c); draw();
    });
    if (panelOpen.rclient === 'dates') { panelOpen.rclient = ''; datePanel(v.querySelector('[data-datebox]'), c, R); }
    else if (panelOpen.rclient === 'brand'){ panelOpen.rclient = ''; if (editingState.rclient){ const b = v.querySelector('[data-brand]'); if (b) b.click(); } }
  }
}

/* ==========================================================================
   REPORT TEMPLATES
   A template is a saved layout: the team report's widgets, the client
   report's widgets, or both, with their sizes, titles, text blocks, period
   settings and branding. Applying one to many clients gives each of them
   that layout; every widget then draws that client's own numbers.
   Templates live in state.reportTemplates and sync like everything else.
   ========================================================================== */
const STARTERS = [
  {id: 'starter_essentials', name: 'Client essentials (starter)', starter: true,
    client: {period: 'lastMonth', periods: ['30', 'lastMonth', '90', '365'], brand: {logo: 'auto', agency: true, banner: true},
      items: [['headline', 'xl'], ['conv_trend', 'l'], ['conv_by_channel', 'l'], ['kw_kpis', 'xl'], ['kw_cards', 'xl'], ['gsc_kpis', 'xl'], ['ai_assistants', 'l'], ['aio', 'l']]
        .map((d, i) => ({id: 's' + i, type: d[0], size: d[1]}))}},
  {id: 'starter_team', name: 'Full team report (starter)', starter: true,
    team: {period: '30', items: teamDefaultItems()}}
];
function tplList(){
  if (!Array.isArray(state.reportTemplates)) state.reportTemplates = [];
  state.reportTemplates = state.reportTemplates.filter(t => t && t.id);
  return state.reportTemplates;
}
const tplAll = () => tplList().concat(STARTERS);
const clone = o => JSON.parse(JSON.stringify(o));
/* Brand settings that make sense for every client: a client's own uploaded logo stays with that client. */
const tplBrand = b => { if (!b) return undefined; const o = clone(b); if (o.logo && ['auto', 'site', 'none'].indexOf(o.logo) < 0) o.logo = 'auto'; return o; };
const tplItems = items => items.map(i => { const o = layoutOf(i); if (i.cfg && Object.keys(i.cfg).length) o.cfg = clone(i.cfg); if (i.from) o.from = i.from; return o; });

/* Which template a client's report is on. Applying (or saving / updating from) a template stamps the
   report with the template and a fingerprint of the layout; if the layout still matches it is "active",
   if someone has changed it since it is "edited". Reports set up before stamps existed are matched by layout. */
const tplSig = items => (items || []).map(i => i.type + (i.cfg && i.cfg.title ? '~' + i.cfg.title : '')).join('|');
const tplStamp = (board, t) => { board.tpl = {id: t.id, name: t.name, sig: tplSig(board.items), at: Date.now()}; };
function tplStatus(board, which){
  if (!board) return null;
  const all = tplAll(), sig = tplSig(board.items);
  if (board.tpl && board.tpl.id){
    const t = all.find(x => x.id === board.tpl.id);
    if (t) return {t, edited: sig !== board.tpl.sig};
  }
  const m = sig && all.find(x => x[which] && tplSig(x[which].items) === sig);
  return m ? {t: m, edited: false} : null;
}
const tplLabel = st => st ? (st.edited ? 'Based on “' + st.t.name + '” (edited)' : 'Template: “' + st.t.name + '”') : 'Custom layout (no template)';
function tplFromClient(c, name, parts){
  const R = reportsOf(c), t = {id: 'tpl' + uid(), name, createdAt: Date.now(), updatedAt: Date.now()};
  if (parts.team){ t.team = {period: R.team.period, brand: tplBrand(R.team.brand), items: tplItems(R.team.items)}; if (R.team.free) t.team.free = true; }
  if (parts.client){
    const nm = c.name || '';
    t.client = {period: clientPeriod(R), periods: clientPeriods(R), showDates: R.client.showDates !== false, brand: tplBrand(R.client.brand), items: tplItems(R.client.items)};
    if (R.client.title) t.client.title = nm && R.client.title.indexOf(nm) > -1 ? R.client.title.split(nm).join('{client}') : R.client.title;
  }
  return t;
}

/* Gives one client the template's layout. Fresh widget ids per client; a client
   widget copied from a team widget keeps pointing at that client's copy of it. */
function tplApply(t, c, parts){
  const R = reportsOf(c), map = {};
  if (parts.team && t.team){
    R.team = {period: t.team.period || '30', items: t.team.items.map(i => { const n = Object.assign(clone(i), {id: i.id && /^d_/.test(i.id) ? i.id : uid()}); map[i.id] = n.id; return n; })};
    if (t.team.brand) R.team.brand = clone(t.team.brand);
    if (t.team.free) R.team.free = true;
    tplStamp(R.team, t);
  }
  if (parts.client && t.client){
    const keep = {publishedAt: R.client.publishedAt, shareId: R.client.shareId};
    if (!keep.shareId) delete keep.shareId;
    const teamByType = {}; R.team.items.forEach(x => { if (!teamByType[x.type]) teamByType[x.type] = x.id; });
    R.client = Object.assign(keep, {period: t.client.period || 'lastMonth', periods: clone(t.client.periods || CLIENT_PERIODS_DEFAULT),
      items: t.client.items.filter(i => W[i.type] && !W[i.type].internal).map(i => {
        const n = Object.assign(clone(i), {id: uid()});
        if (i.from) n.from = map[i.from] || teamByType[i.type] || undefined;
        if (!n.from) delete n.from;
        return n;
      })});
    if (t.client.showDates === false) R.client.showDates = false;
    if (t.client.brand) R.client.brand = clone(t.client.brand);
    if (t.client.title) R.client.title = t.client.title.split('{client}').join(c.name || '');
    if (!keep.publishedAt) delete R.client.publishedAt;
    tplStamp(R.client, t);
  }
  persist(c);
}

/* Republishes shared client reports one at a time, so applying a template to
   forty clients doesn't fire forty data pulls at once. */
const pubQueue = [];
let pubBusy = false;
function queuePublish(c){
  if (!reportsOf(c).client.publishedAt || pubQueue.indexOf(c) > -1) return;
  pubQueue.push(c);
  if (pubBusy) return;
  pubBusy = true;
  (async () => {
    while (pubQueue.length){
      const x = pubQueue.shift();
      try{ await publish(x); }catch(e){ console.warn('template publish', x.name, e); }
    }
    pubBusy = false;
  })();
}

const tplSummary = t => [t.team ? t.team.items.length + ' team widget' + (t.team.items.length === 1 ? '' : 's') : '', t.client ? t.client.items.length + ' client widget' + (t.client.items.length === 1 ? '' : 's') : '']
  .filter(Boolean).join(' · ');

function openTemplates(c, startOn){
  const draw_ = draw;
  const back = document.createElement('div');
  back.className = 'rp-cat-back';
  document.body.appendChild(back);
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const head = (title, sub) => '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><h2 style="display:flex;align-items:center;gap:8px">' + glyph('grid', 18) + esc(title) + '</h2><div class="aiv-cap">' + sub + '</div></div>' +
    '<button class="aiv-x" type="button" aria-label="Close" style="border:0;background:none;font-size:22px;cursor:pointer">×</button></div>';
  const wire = () => back.querySelector('.aiv-x').addEventListener('click', close);

  function home(){
    const list = tplAll(), RR = reportsOf(c), stT = tplStatus(RR.team, 'team'), stC = tplStatus(RR.client, 'client');
    const badge = (t, which, st) => st && st.t.id === t.id ? '<span class="rp-tpl-on' + (st.edited ? ' ed' : '') + '">' + (st.edited ? '◐ ' : '● ') + (which === 'team' ? 'Team report' : 'Client report') + (st.edited ? ' · edited' : ' · active') + '</span>' : '';
    back.innerHTML = '<div class="rp-cat aiv" role="dialog" aria-modal="true" aria-label="Report templates">' + head('Report templates', 'Save a layout once, then give it to as many clients as you like. Each client’s widgets show that client’s own data.') +
      '<div class="rp-panel" style="margin:16px 0 0"><h4>' + glyph('page', 16) + 'Save ' + esc(c.name || 'this client') + '’s layout as a template</h4>' +
      '<div class="row"><input type="text" data-name placeholder="Template name, e.g. Monthly SEO + AI" style="flex:1;min-width:220px">' +
      '<label class="rp-chipx on"><input type="checkbox" data-p="team" checked>Team report</label><label class="rp-chipx on"><input type="checkbox" data-p="client" checked>Client report</label>' +
      '<button class="aiv-btn go" type="button" data-save>Save template</button></div>' +
      '<div class="aiv-cap">Saves widgets, sizes, titles, text blocks, the client’s allowed date ranges and branding. A logo uploaded for one client isn’t copied; each client shows its own.</div></div>' +
      '<div class="rp-tpl-now"><span><b>' + esc(c.name || 'This client') + '</b> now uses:</span><span><em>Team report</em> ' + esc(tplLabel(stT)) + '</span><span><em>Client report</em> ' + esc(tplLabel(stC)) + '</span></div>' +
      '<div class="rp-cat-g"><b>Saved templates</b><div class="rp-cat-list">' + list.map(t => '<div class="rp-cat-i' + ((stT && stT.t.id === t.id) || (stC && stC.t.id === t.id) ? ' rp-tpl-act' : '') + '"><div style="min-width:0"><strong>' + esc(t.name) + '</strong>' +
        (badge(t, 'team', stT) || badge(t, 'client', stC) ? '<div style="display:flex;gap:4px;flex-wrap:wrap;margin:4px 0 2px">' + badge(t, 'team', stT) + badge(t, 'client', stC) + '</div>' : '') + '<small>' + esc(tplSummary(t)) +
        (t.updatedAt ? ' · saved ' + esc(new Date(t.updatedAt).toLocaleDateString('en-CA', {month: 'short', day: 'numeric'})) : '') + '</small>' +
        '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px"><button class="rp-ib go" type="button" data-apply="' + esc(t.id) + '">Apply to clients…</button>' +
        (t.starter ? '' : '<button class="rp-ib" type="button" data-update="' + esc(t.id) + '" title="Replace this template with ' + esc(c.name || 'this client') + '’s current layout">Update from this client</button>' +
          '<button class="rp-ib" type="button" data-rename="' + esc(t.id) + '">Rename</button><button class="rp-ib" type="button" data-del="' + esc(t.id) + '" title="Delete template">×</button>') +
        '</div></div></div>').join('') + '</div></div></div>';
    wire();
    back.querySelectorAll('.rp-chipx input').forEach(x => x.addEventListener('change', () => x.parentNode.classList.toggle('on', x.checked)));
    back.querySelector('[data-save]').addEventListener('click', () => {
      const name = back.querySelector('[data-name]').value.trim();
      const parts = {team: back.querySelector('[data-p=team]').checked, client: back.querySelector('[data-p=client]').checked};
      if (!name){ back.querySelector('[data-name]').focus(); return; }
      if (!parts.team && !parts.client){ toastMsg('Tick the team report, the client report or both'); return; }
      const t = tplFromClient(c, name, parts);
      tplList().push(t);
      const RR = reportsOf(c); if (parts.team) tplStamp(RR.team, t); if (parts.client) tplStamp(RR.client, t); persist(c);
      save(); toastMsg('Template “' + name + '” saved'); home(); draw_();
    });
    back.querySelectorAll('[data-apply]').forEach(b => b.addEventListener('click', () => apply(tplAll().find(t => t.id === b.dataset.apply))));
    back.querySelectorAll('[data-update]').forEach(b => b.addEventListener('click', () => {
      const t = tplList().find(x => x.id === b.dataset.update); if (!t) return;
      if (!confirm('Replace “' + t.name + '” with ' + (c.name || 'this client') + '’s current layout?')) return;
      const n = tplFromClient(c, t.name, {team: !!t.team, client: !!t.client});
      Object.assign(t, {team: n.team, client: n.client, updatedAt: Date.now()}); if (!n.team) delete t.team; if (!n.client) delete t.client;
      const RR = reportsOf(c); if (t.team) tplStamp(RR.team, t); if (t.client) tplStamp(RR.client, t); persist(c);
      save(); toastMsg('Template updated'); home(); draw_();
    }));
    back.querySelectorAll('[data-rename]').forEach(b => b.addEventListener('click', () => {
      const t = tplList().find(x => x.id === b.dataset.rename); if (!t) return;
      const n = prompt('Template name:', t.name); if (!n || !n.trim()) return;
      t.name = n.trim(); t.updatedAt = Date.now(); save(); home();
    }));
    back.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      const t = tplList().find(x => x.id === b.dataset.del); if (!t) return;
      if (!confirm('Delete the template “' + t.name + '”? Reports already made from it stay as they are.')) return;
      try{ if (typeof tombstone === 'function') tombstone('rptTpl', t.id); }catch(e){}
      state.reportTemplates = tplList().filter(x => x.id !== t.id); save(); home();
    }));
  }

  function apply(t){
    if (!t) return;
    const all = (state.seoClients || []).filter(Boolean).slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    const folders = {}; (state.seoFolders || []).forEach(f => { if (f) folders[f.id] = f.name; });
    const picked = new Set([c.id]);
    back.innerHTML = '<div class="rp-cat aiv" role="dialog" aria-modal="true" aria-label="Apply template">' + head('Apply “' + t.name + '”', esc(tplSummary(t)) + '. Each client gets this layout filled with its own data.') +
      '<div class="rp-panel" style="margin:16px 0 0"><div class="row"><span class="lbl">Replace</span>' +
      (t.team ? '<label class="rp-chipx on"><input type="checkbox" data-p="team" checked>Team report</label>' : '') +
      (t.client ? '<label class="rp-chipx on"><input type="checkbox" data-p="client" checked>Client report</label>' : '') + '</div>' +
      '<div class="row"><span class="lbl">Clients</span><input type="text" data-q placeholder="Find a client" style="flex:1;min-width:200px">' +
      '<button class="aiv-btn" type="button" data-all>Select all shown</button><button class="aiv-btn" type="button" data-none>Clear</button></div>' +
      '<div data-list style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:6px;max-height:340px;overflow:auto;padding:2px"></div>' +
      '<div class="aiv-cap">This replaces the chosen reports’ current layout for each selected client. Shared client links keep working and update to the new layout.</div>' +
      '<div class="row" style="justify-content:space-between"><button class="aiv-btn" type="button" data-back>← Templates</button><button class="aiv-btn go" type="button" data-go></button></div></div></div>';
    wire();
    const listEl = back.querySelector('[data-list]'), q = back.querySelector('[data-q]'), go = back.querySelector('[data-go]');
    const shown = () => { const s = q.value.trim().toLowerCase(); return all.filter(x => !s || String(x.name || '').toLowerCase().indexOf(s) > -1 || String(folders[x.folderId] || '').toLowerCase().indexOf(s) > -1); };
    const count = () => { go.textContent = 'Apply to ' + picked.size + ' client' + (picked.size === 1 ? '' : 's'); go.disabled = !picked.size; };
    const draw = () => {
      listEl.innerHTML = shown().map(x => '<label class="rp-chipx' + (picked.has(x.id) ? ' on' : '') + '" style="border-radius:10px;justify-content:flex-start;overflow:hidden">' +
        '<input type="checkbox" value="' + esc(x.id) + '"' + (picked.has(x.id) ? ' checked' : '') + '><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(x.name || x.website || 'Client') + '</span>' +
        (x.folderId && folders[x.folderId] ? '<span class="rp-pill" style="margin-left:auto">' + esc(folders[x.folderId]) + '</span>' : '') + '</label>').join('') || '<div class="aiv-cap">No clients match.</div>';
      listEl.querySelectorAll('input').forEach(i => i.addEventListener('change', () => { if (i.checked) picked.add(i.value); else picked.delete(i.value); i.parentNode.classList.toggle('on', i.checked); count(); }));
      count();
    };
    q.addEventListener('input', draw);
    back.querySelectorAll('.rp-panel > .row:first-child input').forEach(x => x.addEventListener('change', () => x.parentNode.classList.toggle('on', x.checked)));
    back.querySelector('[data-all]').addEventListener('click', () => { shown().forEach(x => picked.add(x.id)); draw(); });
    back.querySelector('[data-none]').addEventListener('click', () => { picked.clear(); draw(); });
    back.querySelector('[data-back]').addEventListener('click', home);
    go.addEventListener('click', () => {
      const tp = back.querySelector('[data-p=team]'), cp = back.querySelector('[data-p=client]');
      const parts = {team: !!(tp && tp.checked), client: !!(cp && cp.checked)};
      if (!parts.team && !parts.client){ toastMsg('Tick the team report, the client report or both'); return; }
      const targets = all.filter(x => picked.has(x.id));
      const what = [parts.team ? 'team report' : '', parts.client ? 'client report' : ''].filter(Boolean).join(' and ');
      if (!confirm('Replace the ' + what + ' layout for ' + targets.length + ' client' + (targets.length === 1 ? '' : 's') + ' with “' + t.name + '”?')) return;
      let shared = 0;
      targets.forEach(x => { tplApply(t, x, parts); if (parts.client && reportsOf(x).client.publishedAt){ shared++; queuePublish(x); } });
      save(); close(); draw_();
      toastMsg('“' + t.name + '” applied to ' + targets.length + ' client' + (targets.length === 1 ? '' : 's') + (shared ? ' · updating ' + shared + ' shared link' + (shared === 1 ? '' : 's') + ' in the background' : ''));
    });
    draw();
  }
  if (startOn) apply(tplAll().find(t => t.id === startOn)); else home();
}

function toastMsg(m){ try{ if (typeof toast === 'function') toast(m); }catch(e){} }

/* ---------- publishing the client report ---------- */
/* The shared link's id. A regenerated link gets a fresh random id (and the old one is shut off);
   reports shared before this keep their original id. */
const reportId = c => { const R = reportsOf(c); return R.client.shareId && /^clientreport-[\w-]+$/.test(R.client.shareId) ? R.client.shareId : 'clientreport-' + c.id; };
const reportUrl = c => location.origin + location.pathname.replace(/[^\/]*$/, '') + 'client-report.html?r=' + encodeURIComponent(reportId(c));
const embedCode = url => '<iframe src="' + url + '" style="width:100%;height:2200px;border:0" loading="lazy" title="Report"></iframe>';

/* What the public page needs to draw at once: the layout and a copy of the data. Live numbers follow via the token. */
/* over = {items, period, title}: a one-widget page (Share link on a team widget) instead of the client report. */
async function buildDoc(c, over){
  const R = reportsOf(c), ctx = ctxFor(c);
  const period = over ? over.period : clientPeriod(R), items = over ? over.items : R.client.items;
  ctx.R = rangeOf(period);
  const need = new Set(); items.forEach(it => ((W[it.type] && W[it.type].needs) || []).forEach(n => need.add(n)));
  const s = AIV.tracker();
  const doc = {type: 'clientreport', clientName: c.name || ctx.domain, domain: ctx.domain, title: over ? over.title : R.client.title || ((c.name || ctx.domain) + ' — Report'),
    period, periods: over ? (over.periods || [period]) : clientPeriods(R), showDates: R.client.showDates !== false,
    layout: JSON.stringify(items.map(i => Object.assign(layoutOf(i), {cfg: i.cfg || {}}))), updatedAt: Date.now(),
    feedUrl: s.url || ''};
  /* Branding travels with the report; keyword and map grids are stored on their own so they show even when the data copy is too big to keep. */
  const lg = logosFor(c, R.client), br = R.client.brand || {};
  doc.brand = JSON.stringify({agency: br.agency !== false, accent: br.accent || '', banner: !!br.banner, logoH: Number(br.logoH) || 44});
  if (lg.clientLogo && lg.clientLogo.length < 200000) doc.clientLogo = lg.clientLogo;
  if (br.agency !== false && lg.agencyLogo && lg.agencyLogo.length < 200000) doc.agencyLogo = lg.agencyLogo;
  const token = await AIV.tokenFor(ctx.domain).catch(() => null);
  if (token) doc.token = token;
  if (over && !over.multi) doc.single = true;
  const snap = {at: Date.now(), period};
  const get = n => ctx.get(n).then(v => v, () => null);
  if (need.has('feed')) snap.feed = await get('feed');
  if (need.has('g4')) snap.g4 = await get('g4');
  /* Rows left out of the stored copy are added to the private gap, so the query widgets still add up to the totals. */
  const trimGsc = (g, n) => { const all = (g.queries || []).slice().sort((a, b) => b[2] - a[2]), cut = all.slice(n), h = g.hidden || {};
    return Object.assign({}, g, {queries: all.slice(0, n), hidden: {clicks: (Number(h.clicks) || 0) + sum(cut, 1), impressions: (Number(h.impressions) || 0) + sum(cut, 2)}}); };
  if (need.has('gsc')){ const g = await get('gsc'); if (g){ snap.gsc = Object.assign(trimGsc(g, 400), {pages: (g.pages || []).slice(0, 60)}); } }
  if (need.has('pathway')){ const g = await get('pathway'); if (g && !g.error) snap.pathway = g; }
  if (need.has('gsch')){ const g = await get('gsch'); if (g && !g.error) snap.gsch = Object.assign({}, g, {pages: (g.pages || []).slice(0, 250)}); }
  /* A shared copy never carries who sent a form: counts, forms, pages and channels only. */
  if (need.has('forms')){ const g = await get('forms'); if (g && !g.error) snap.forms = {first: g.first, details: false,
    rows: (g.rows || []).map(r => ({t: r.t, form: r.form, page: r.page, channel: r.channel, sm: r.sm, campaign: r.campaign, land: r.land, origin: r.origin}))}; }
  if (need.has('easyleads')){ const g = await get('easyleads'); if (g && !g.error) snap.easyleads = {first: g.first, details: false, connected: g.connected,
    rows: (g.rows || []).map(r => ({t: r.t, form: r.form, page: r.page, channel: r.channel, sm: r.sm, campaign: r.campaign, land: r.land, origin: r.origin}))}; }
  /* When the client report lets the client click into form submissions, its stored copy keeps who sent each form too; otherwise the safe copy (plus, for the Form inbox, the non-personal answers: province, city, service…). */
const fxFull = !!fxSharedCs(items);
const fxPerson = r => ({t: r.t, form: r.form, page: r.page, channel: r.channel, sm: r.sm, campaign: r.campaign, land: r.land, origin: r.origin, name: r.name, email: r.email, phone: r.phone, company: r.company, message: r.message, fields: r.fields});
if (fxFull && snap.forms){ const g = await get('forms'); if (g && !g.error) snap.forms = {first: g.first, details: true, rows: (g.rows || []).map(fxPerson)}; }
if (fxFull && snap.easyleads){ const g = await get('easyleads'); if (g && !g.error) snap.easyleads = Object.assign({}, snap.easyleads, {details: true, rows: (g.rows || []).map(fxPerson)}); }
if (need.has('formsc')){ const g = await get('formsc'); if (g && !g.error){
const full = fxFull;
snap.formsc = {first: g.first, details: full, rows: (g.rows || []).map(r => full ? {t: r.t, form: r.form, page: r.page, channel: r.channel, sm: r.sm, campaign: r.campaign, land: r.land, origin: r.origin,
name: r.name, email: r.email, phone: r.phone, company: r.company, message: r.message, fields: r.fields}
: {t: r.t, form: r.form, page: r.page, channel: r.channel, sm: r.sm, campaign: r.campaign, land: r.land, origin: r.origin, facets: r.facets || fxFacetsOf(r)})}; } }
if (need.has('pages')){ const g = await get('pages'); if (g && !g.error) snap.pages = Object.assign({}, g, {pages: (g.pages || []).slice(0, 400), sitemap: (g.sitemap || []).slice(0, 2000)}); }
  if (need.has('kw')) doc.kw = JSON.stringify(kwRows(c));
  if (need.has('gbp')) doc.gbp = JSON.stringify(gbpSummary(gbpsFor(c)));
  /* Firestore keeps up to 1 MB per document: the data copy gets what the rest leaves. */
  const room = 960000 - ['kw', 'gbp', 'clientLogo', 'agencyLogo', 'layout', 'brand'].reduce((t, k) => t + String(doc[k] || '').length, 0);
  let str = JSON.stringify(snap);
  if (str.length > room && snap.feed){ delete snap.feed.channels; str = JSON.stringify(snap); }
  if (str.length > room && snap.gsc){ snap.gsc = trimGsc(snap.gsc, 100); str = JSON.stringify(snap); }
  if (str.length > room && snap.pathway){ snap.pathway = Object.assign({}, snap.pathway, {moves: snap.pathway.moves.slice(0, 800), steps: snap.pathway.steps.slice(0, 1500), views: snap.pathway.views.slice(0, 600)}); str = JSON.stringify(snap); }
  if (str.length > room && snap.pages){ snap.pages.pages = snap.pages.pages.slice(0, 100); snap.pages.sitemap = []; str = JSON.stringify(snap); }
  ['formsc', 'forms', 'easyleads'].forEach(k => { if (str.length > room && snap[k] && snap[k].details){ snap[k] = Object.assign({}, snap[k], {rows: snap[k].rows.map(r => Object.assign({}, r, {fields: undefined, message: r.message ? String(r.message).slice(0, 240) : r.message}))}); str = JSON.stringify(snap); } });
if (str.length <= room) doc.snap = str;
  return doc;
}
async function publish(c){
  if (typeof fbDb === 'undefined' || !fbDb) throw new Error('Not connected to the cloud.');
  const doc = await buildDoc(c);
  await fbDb.collection('publicViews').doc(reportId(c)).set(doc);
  const R = reportsOf(c); R.client.publishedAt = Date.now(); persist(c, 'client');
}
/* A public link to one team widget: the client-report look, that widget alone at full width,
   for the period picked on the team report. One link per widget and period; sharing again
   refreshes it. Numbers stay live through the report's read-only token. */
const widgetLinkId = (c, it, period) => 'clientreport-' + c.id + '-w-' + String(it.id).replace(/[^\w-]/g, '') + '-' + String(period).replace(/[^\w-]/g, '');
/* The link a widget + period is shared under: a regenerated one if there is one, else the first (fixed) id. */
const widgetLinkOf = (c, it, period) => { const L = reportsOf(c).team.wlinks || {}, k = it.id + '|' + period; return L[k] && /^clientreport-[\w-]+$/.test(L[k]) ? L[k] : widgetLinkId(c, it, period); };
const linkUrl = id => location.origin + location.pathname.replace(/[^\/]*$/, '') + 'client-report.html?r=' + encodeURIComponent(id);
/* Internal link to one widget: opens the tool (sign-in required) on just that widget, fully clickable. */
const widgetTeamUrl = (c, it, period) => teamUrl(c, 'rteam') + '/w/' + encodeURIComponent(it.id) + '/' + encodeURIComponent(period);
async function publishWidget(c, it, period, id){
  if (typeof fbDb === 'undefined' || !fbDb) throw new Error('Not connected to the cloud.');
  const def = W[it.type], title = ((it.cfg && it.cfg.title) || def.t);
  const item = Object.assign(copyOf(it), {id: 'w1', size: 'xl', cols: 12, cfg: JSON.parse(JSON.stringify(it.cfg || {}))});
  delete item.h;
  const doc = await buildDoc(c, {items: [item], period, title: title + ' — ' + (c.name || '')});
  await fbDb.collection('publicViews').doc(id).set(doc);
}
async function shareWidget(c, it, period){
  const def = W[it.type];
  if (!def || def.internal) return;
  const PR = rangeOf(period), title = ((it.cfg && it.cfg.title) || def.t);
  const copyBtns = (body, map) => body.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
    const t = map[b.dataset.copy];
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { const o = b.textContent; b.textContent = 'Copied'; setTimeout(() => { b.textContent = o; }, 1400); },
      () => { const f = body.querySelector('[data-f="' + b.dataset.copy + '"]'); if (f) f.select(); });
  }));
  U.openDrawer(title + ' · share links', '#171614', async body => {
    const show = (id, note) => {
      const url = linkUrl(id), team = widgetTeamUrl(c, it, period);
      const embed = '<iframe src="' + url + '" style="width:100%;height:900px;border:0" loading="lazy" title="' + title.replace(/"/g, '') + '"></iframe>';
      body.innerHTML = '<div class="rp-share">' + (note ? '<p class="aiv-status" style="margin:0 0 10px">' + esc(note) + '</p>' : '') +
        '<h4 style="margin:0 0 4px;font-size:13.5px">Client link (public)</h4>' +
        '<p class="aiv-cap" style="margin:0 0 8px">Anyone with this link sees <b>' + esc(title) + '</b> on its own, in the client-report look, for <b>' + esc(PR.label || period) + '</b> (' + esc(PR.text) + '). Numbers stay up to date.</p>' +
        '<input readonly data-f="l" value="' + esc(url) + '">' +
        '<label class="aiv-cap"><b>Embed code</b></label><textarea readonly rows="2" data-f="e">' + esc(embed) + '</textarea>' +
        '<div class="aiv-actions"><button class="aiv-btn" type="button" data-copy="l">Copy link</button><button class="aiv-btn" type="button" data-copy="e">Copy embed code</button>' +
        '<a class="aiv-btn" href="' + esc(url) + '" target="_blank" rel="noopener">Open</a>' +
        '<button class="aiv-btn" type="button" data-new title="Make a new link and switch this one off for good">New link</button></div>' +
        '<h4 style="margin:18px 0 4px;font-size:13.5px">Team link (internal)</h4>' +
        '<p class="aiv-cap" style="margin:0 0 8px">For teammates: opens the tool (sign-in required) on this widget alone, full width, with everything clickable: drill-downs, pages, pathways.</p>' +
        '<input readonly data-f="t" value="' + esc(team) + '">' +
        '<div class="aiv-actions"><button class="aiv-btn" type="button" data-copy="t">Copy team link</button><a class="aiv-btn" href="' + esc(team) + '" target="_blank" rel="noopener">Open</a></div></div>';
      copyBtns(body, {l: url, e: embed, t: team});
      body.querySelectorAll('input[readonly]').forEach(i => i.addEventListener('focus', () => i.select()));
      body.querySelector('[data-new]').addEventListener('click', () => regenWidget(id));
    };
    /* A new link: publish under a fresh id first, then switch the old one off (deleted, or a "revoked" marker). */
    const regenWidget = async oldId => {
      if (!confirm('Make a new link for this widget?\n\nThe current link stops working straight away for everyone who has it (including any embed). You will need to send the new link.')) return;
      body.innerHTML = '<div class="rp-share"><span><span class="aiv-spin"></span>Making a new link…</span></div>';
      const rnd = (crypto && crypto.getRandomValues) ? Array.from(crypto.getRandomValues(new Uint8Array(9)), b => b.toString(36).padStart(2, '0')).join('').slice(0, 14) : Math.random().toString(36).slice(2, 16);
      const newId = 'clientreport-' + c.id + '-w' + rnd;
      try{
        await publishWidget(c, it, period, newId);
        let off = false;
        try{ await fbDb.collection('publicViews').doc(oldId).delete(); off = true; }catch(e){ console.warn('delete old widget link', e); }
        if (!off){ try{ await fbDb.collection('publicViews').doc(oldId).set({type: 'revoked', revokedAt: Date.now()}); off = true; }catch(e){ console.warn('revoke old widget link', e); } }
        const R = reportsOf(c);
        R.team.wlinks = Object.assign({}, R.team.wlinks || {}, {[it.id + '|' + period]: newId});
        persist(c, 'team');
        show(newId, off ? 'New link ready. The old link no longer works.' : 'New link ready, but the old link couldn’t be switched off. Try New link again.');
      }catch(err){
        body.innerHTML = '<div class="rp-share"><span class="aiv-status err">Couldn’t make the new link: ' + esc(err.message || String(err)) + '</span></div>';
      }
    };
    body.innerHTML = '<div class="rp-share"><span><span class="aiv-spin"></span>Publishing this widget…</span></div>';
    const id = widgetLinkOf(c, it, period);
    try{ await publishWidget(c, it, period, id); show(id); }
    catch(err){ body.innerHTML = '<div class="rp-share"><span class="aiv-status err">Couldn’t publish: ' + esc(err.message || String(err)) + '</span></div>'; }
  });
}
const pubTimers = {};
function autoPublish(c){
  const R = reportsOf(c);
  if (!R.client.publishedAt) return;
  clearTimeout(pubTimers[c.id]);
  pubTimers[c.id] = setTimeout(() => publish(c).catch(e => console.warn('client report publish', e)), 2500);
}
/* A new link: the report is published under a fresh id and the old link is
   switched off for good (its document is deleted, or emptied to a "revoked"
   marker if deleting isn't allowed). Anyone holding the old link sees
   "no longer available"; the new link is shown ready to copy. */
async function regenerate(v, c){
  if (!confirm('Make a new link for this report?\n\nThe current link stops working straight away, for everyone who has it (including any AgencyAnalytics embed). You\u2019ll need to send the new link to the client.')) return;
  if (typeof fbDb === 'undefined' || !fbDb){ toastMsg('Not connected to the cloud.'); return; }
  const R = reportsOf(c);
  const oldId = reportId(c);
  const rnd = (crypto && crypto.getRandomValues) ? Array.from(crypto.getRandomValues(new Uint8Array(9)), b => b.toString(36).padStart(2, '0')).join('').slice(0, 14) : Math.random().toString(36).slice(2, 16);
  R.client.shareId = 'clientreport-' + c.id + '-' + rnd;
  persist(c, 'client');
  try{
    /* The new link must be live before the old one is switched off. */
    await publish(c);
    let off = false;
    try{ await fbDb.collection('publicViews').doc(oldId).delete(); off = true; }catch(e){ console.warn('delete old link', e); }
    if (!off){ try{ await fbDb.collection('publicViews').doc(oldId).set({type: 'revoked', revokedAt: Date.now()}); off = true; }catch(e){ console.warn('revoke old link', e); } }
    toastMsg(off ? 'New link ready. The old link no longer works.' : 'New link ready, but the old link couldn\u2019t be switched off. Try again.');
    await share(v, c);
  }catch(e){
    /* Nothing was switched off: go back to the link that still works. */
    if (oldId === 'clientreport-' + c.id) delete R.client.shareId; else R.client.shareId = oldId;
    persist(c, 'client');
    toastMsg('Couldn\u2019t make the new link: ' + (e.message || e));
  }
}
async function share(v, c){
  const box = v.querySelector('[data-sharebox]');
  box.innerHTML = '<div class="rp-share"><span><span class="aiv-spin"></span>Publishing…</span></div>';
  try{
    await publish(c);
    const url = reportUrl(c);
    box.innerHTML = '<div class="rp-share"><label class="aiv-cap"><b>Report link</b></label><input readonly value="' + esc(url) + '">' +
      '<label class="aiv-cap"><b>Embed code</b> (AgencyAnalytics, a website…)</label><textarea readonly rows="2">' + esc(embedCode(url)) + '</textarea>' +
      '<div class="aiv-actions"><button class="aiv-btn" type="button" data-copy="l">Copy link</button><button class="aiv-btn" type="button" data-copy="e">Copy embed code</button>' +
      '<a class="aiv-btn" href="' + esc(url) + '" target="_blank" rel="noopener">Open</a><span class="aiv-status">Changes you make here update the shared report automatically.</span></div></div>';
    box.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
      const t = b.dataset.copy === 'l' ? url : embedCode(url);
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { const o = b.textContent; b.textContent = 'Copied'; setTimeout(() => { b.textContent = o; }, 1400); },
        () => box.querySelector(b.dataset.copy === 'l' ? 'input' : 'textarea').select());
    }));
    const sub = v.querySelector('.rp-sub'); if (sub && !/Shared/.test(sub.textContent)) sub.textContent = sub.textContent.replace('Not shared yet', 'Shared · updates automatically');
  }catch(err){
    box.innerHTML = '<div class="rp-share"><span class="aiv-status err">Couldn’t publish: ' + esc(err.message) + '</span></div>';
  }
}

})();
