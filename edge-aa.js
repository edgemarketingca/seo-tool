/* ==========================================================================
   EDGE AA: the Reporting section's report editor, set up the way
   AgencyAnalytics' report editor is.

     Top bar      report name · client · Design | Shares · Schedule · Share · close
     Tool bar     Live data · undo / redo · Page Setup · date range · Preview · Auto saved
     Pages        the report's pages (cover and every page title), drag to reorder, + Add
     Canvas       the report on a sheet: logo and client/month at the top, each page title
                  centred with a rule under it, a + on every edge to insert a widget there
     Library      search, Metrics / KPIs / Tables, connected sources, a preview pane with
                  the description, data assets and visualizations (also used for "+ Add
                  widget" on the Team report)

   Nothing about the saved report changes: the same widgets (reports.js), the same layout
   (a page is a page-title widget and what follows it), the same share link.
   Paid ads and social widgets read the Google Ads section's data (edge-os.js channels).
   ========================================================================== */
(function () {
'use strict';
if (typeof state === 'undefined' || !document.getElementById('appShell')) return;
const RA = () => window.EdgeReportsApp;
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const RM = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const FX = () => window.EDGE_FX || {toast(){}, done(){}, flash(){}};
const SVG = p => '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
const I = {
  back: SVG('<path d="M15 18l-6-6 6-6"/>'), x: SVG('<path d="M6 6l12 12M18 6 6 18"/>'), plus: SVG('<path d="M12 5v14M5 12h14"/>'),
  undo: SVG('<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'), redo: SVG('<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>'),
  grid: SVG('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
  cal: SVG('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'), play: SVG('<path d="M7 5v14l11-7z"/>'),
  cloud: SVG('<path d="M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1 0 9H7z"/><path d="m9.5 13.5 2 2 3.5-3.5"/>'),
  share: SVG('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>'),
  sched: SVG('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M12 14v3l2 1"/>'),
  drag: '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>',
  dots: SVG('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'),
  search: SVG('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  metrics: SVG('<path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>'), text: '<b style="font:600 15px Georgia,serif;letter-spacing:-.02em">Aa</b>',
  image: SVG('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>'),
  eye: SVG('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  minus: SVG('<path d="M5 12h14"/>'), expand: SVG('<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>'), copy: SVG('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>')
};
const VIZ = {
  stat: '<b style="font:600 14px Inter,sans-serif">#</b>', column: SVG('<path d="M4 20h16"/><path d="M7 17v-6M11 17V7M15 17v-8M19 17v-4"/>'), line: SVG('<path d="M3 17l5-5 4 3 8-8"/>'),
  spark: SVG('<path d="M3 14c3 0 3-6 6-6s3 8 6 8 3-6 6-6"/>'), pie: SVG('<circle cx="12" cy="12" r="8"/><path d="M12 4v8l6 5"/>'), donut: SVG('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>'),
  map: SVG('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'), area: SVG('<path d="M3 18 8 11l4 3 8-7v11z"/>'),
  bar: SVG('<path d="M4 6h10M4 12h16M4 18h7"/>'), table: SVG('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 10v10"/>')
};

/* ---------- where each widget's data comes from (the library's "sources") ---------- */
const SOURCES = [
  {k: 'ga4', l: 'Google Analytics', logo: 'ga4', groups: ['traffic', 'conv', 'ai', 'overview'], assets: ['Conversions', 'Events', 'Pages', 'Traffic']},
  {k: 'gsc', l: 'Google Search Console', logo: 'gsc', groups: ['gsc', 'gai'], assets: ['Queries', 'Pages', 'Devices', 'AI impressions']},
  {k: 'kw', l: 'Rank Tracker', logo: 'google', groups: ['kw', 'rank'], assets: ['Keywords', 'Positions', 'Movers']},
  {k: 'gbp', l: 'Google Business Profile', logo: 'gbp', groups: ['gbp'], assets: ['Map grids', 'Calls', 'Directions']},
  {k: 'gads', l: 'Google Ads', logo: 'gads', re: /^(gads_|google_ads__)/, chan: 'google_ads', assets: ['Campaigns', 'Clicks', 'Conversions', 'Cost']},
  {k: 'meta', l: 'Meta Ads (Facebook & Instagram)', logo: 'facebook', re: /^(meta_|meta_ads__)/, chan: 'meta_ads', assets: ['Campaigns', 'Reach', 'Results', 'Amount spent']},
  {k: 'facebook', l: 'Facebook', logo: 'facebook', re: /^facebook__/, chan: 'facebook', assets: ['Followers', 'Reach', 'Engagement', 'Posts']},
  {k: 'instagram', l: 'Instagram', logo: 'instagram', re: /^instagram__/, chan: 'instagram', assets: ['Followers', 'Reach', 'Profile visits', 'Posts']},
  {k: 'linkedin', l: 'LinkedIn', logo: 'linkedin', re: /^linkedin__/, chan: 'linkedin', assets: ['Followers', 'Impressions', 'Clicks', 'Posts']},
  {k: 'social', l: 'Social Media (all networks)', logo: 'instagram', re: /^social_/, chan: ['facebook', 'instagram', 'linkedin'], assets: ['Followers', 'Reach', 'Engagement', 'Posts']},
  {k: 'forms', l: 'Website forms & Easyleads', logo: '', re: /^(forms|el_|easyleads|people)/, assets: ['Submissions', 'Sources', 'Locations']},
  {k: 'aiv', l: 'AI Visibility', logo: 'ChatGPT', groups: ['llm', 'bing'], assets: ['Prompts', 'Mentions', 'Citations']},
  {k: 'insight', l: 'Insights & goals', logo: '', groups: ['insight'], assets: ['Goals', 'Summary']}
];
const TEXT_TYPES = ['section', 'text', 'cover', 'insight_summary'];
const MEDIA_TYPES = ['embed', 'image', 'video'];
const sourceOf = k => { const W = RA().W, g = (W[k] || {}).g; return SOURCES.find(s => s.re && s.re.test(k)) || SOURCES.find(s => (s.groups || []).indexOf(g) > -1) || null; };
const kindOf = k => /kpis?$|_kpi$|headline|glance|at_a_glance|^gads_kpis|^meta_kpis/.test(k) ? 'kpis' : /table|campaigns|queries|pages$|posts|latest|inbox|history|catalog|list|movers|gaps|competitors/.test(k) ? 'tables' : 'metrics';
const vizOf = k => kindOf(k) === 'kpis' ? 'stat' : kindOf(k) === 'tables' ? 'table' : /trend|growth|visits|monthly|over|_line|history/.test(k) ? 'line' : /by_|channels|devices|assistants|dist|share|donut/.test(k) ? 'donut' : /grid|map|location/.test(k) ? 'map' : /bars|forms$|_rate/.test(k) ? 'column' : 'stat';
const VIZ_ALL = ['stat', 'column', 'line', 'spark', 'pie', 'donut', 'map', 'area', 'bar', 'table'];
const chanOf = c => { try{ return window.EDGE_OS && EDGE_OS.channels ? EDGE_OS.channels.forClient(c) : {}; }catch(e){ return {}; } };
const connected = (s, c) => { if (!s || !s.chan) return true; const ch = chanOf(c); return [].concat(s.chan).some(x => ch[x]); };
const srcLogo = (s, sz) => s && s.logo ? RA().logo(s.logo, sz || 14) : '<span class="aab-srcdot"></span>';

/* ======================================================================
   WIDGET LIBRARY (AgencyAnalytics' insert popover)
   opts: {items, mode, client, anchor (element to sit next to), onPick(type)}
   ====================================================================== */
let pickerEl = null;
function closePicker(){ if (pickerEl){ pickerEl.remove(); pickerEl = null; document.removeEventListener('mousedown', awayPicker, true); } }
function awayPicker(e){ if (pickerEl && !pickerEl.contains(e.target)) closePicker(); }
function openPicker(opts){
  closePicker();
  const W = RA().W, c = opts.client;
  const all = Object.keys(W).filter(k => !(opts.mode !== 'team' && W[k].internal));
  let rail = 'metrics', tab = 'metrics', src = '', q = '', hover = '';
  const el = document.createElement('div'); el.className = 'aab-pick'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Add a widget');
  el.innerHTML = '<div class="aab-pick-s">' + I.search + '<input type="search" placeholder="Search, or type / to filter" aria-label="Search widgets"><button type="button" class="aab-ib" data-x aria-label="Close">' + I.x + '</button></div>' +
    '<div class="aab-pick-b"><div class="aab-pick-r"><button type="button" data-rail="metrics" title="Data" class="on">' + I.metrics + '</button><button type="button" data-rail="text" title="Text">' + I.text + '</button><button type="button" data-rail="media" title="Images and embeds">' + I.image + '</button><span style="flex:1"></span><button type="button" data-tpl title="Templates">' + I.plus + '</button></div>' +
    '<div class="aab-pick-l"><div data-head></div><div class="aab-pick-list" data-list></div></div><div class="aab-pick-p" data-prev></div></div>';
  document.body.appendChild(el); pickerEl = el;
  const listFor = () => {
    let ks = rail === 'text' ? all.filter(k => TEXT_TYPES.indexOf(k) > -1 || (W[k].g === 'content' && MEDIA_TYPES.indexOf(k) < 0 && TEXT_TYPES.indexOf(k) < 0 && !/embed|image|video/.test(k)))
      : rail === 'media' ? all.filter(k => MEDIA_TYPES.indexOf(k) > -1 || /embed|image|video/.test(k))
      : all.filter(k => W[k].g !== 'content' && TEXT_TYPES.indexOf(k) < 0);
    if (rail === 'metrics'){
      if (!q) ks = ks.filter(k => kindOf(k) === tab);
      if (src === 'custom') ks = [];
      else if (src) ks = ks.filter(k => (sourceOf(k) || {}).k === src);
    }
    if (q) ks = ks.filter(k => (W[k].t + ' ' + (W[k].d || '') + ' ' + ((sourceOf(k) || {}).l || '')).toLowerCase().indexOf(q) > -1);
    return ks.sort((a, b) => String(W[a].t).localeCompare(String(W[b].t)));
  };
  const head = () => {
    const h = el.querySelector('[data-head]');
    if (rail !== 'metrics'){ h.innerHTML = '<div class="aab-pick-h2">' + (rail === 'text' ? 'Text' : 'Images and embeds') + '</div>'; return; }
    const conn = SOURCES.filter(s => connected(s, c)), not = SOURCES.filter(s => !connected(s, c));
    h.innerHTML = '<div class="aab-sel"><select data-src aria-label="Source"><option value="">Connected sources</option><option value="custom">Custom</option>' +
      '<optgroup label="Connected">' + conn.map(s => '<option value="' + s.k + '"' + (src === s.k ? ' selected' : '') + '>' + esc(s.l) + '</option>').join('') + '</optgroup>' +
      (not.length ? '<optgroup label="Not connected">' + not.map(s => '<option value="' + s.k + '"' + (src === s.k ? ' selected' : '') + '>' + esc(s.l) + '</option>').join('') + '</optgroup>' : '') + '</select></div>' +
      '<div class="aab-tabs3">' + [['metrics', 'Metrics'], ['kpis', 'KPIs'], ['tables', 'Tables']].map(t => '<button type="button" data-tab="' + t[0] + '"' + (tab === t[0] ? ' class="on"' : '') + '>' + t[1] + '</button>').join('') + '</div>';
    h.querySelector('[data-src]').addEventListener('change', e => { src = e.target.value; list(); });
    h.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; head(); list(); }));
  };
  const list = () => {
    const ks = listFor(), L = el.querySelector('[data-list]');
    L.innerHTML = ks.length ? ks.map(k => { const s = sourceOf(k), off = s && !connected(s, c);
      return '<button type="button" class="aab-pi' + (off ? ' off' : '') + '" data-k="' + k + '">' + (rail === 'metrics' ? srcLogo(s, 14) : '<span class="aab-vz">' + VIZ[vizOf(k)] + '</span>') + '<span>' + esc(W[k].t) + '</span></button>'; }).join('')
      : '<div class="aab-pick-none">' + (src === 'custom' ? 'Custom metrics aren’t set up yet.' : 'Nothing matches.') + '</div>';
    L.querySelectorAll('[data-k]').forEach(b => {
      b.addEventListener('mouseenter', () => { hover = b.dataset.k; prev(); });
      b.addEventListener('focus', () => { hover = b.dataset.k; prev(); });
      b.addEventListener('click', () => pick(b.dataset.k, b));
    });
    if (!hover || ks.indexOf(hover) < 0){ hover = ''; prev(); }
  };
  const prev = () => {
    const P = el.querySelector('[data-prev]');
    if (!hover){ P.innerHTML = '<div class="aab-pick-hint">' + I.eye + '<span>Hover an item to preview it</span></div>'; return; }
    const d = W[hover], s = sourceOf(hover), off = s && !connected(s, c), vz = vizOf(hover);
    P.innerHTML = '<div class="aab-pp-h">' + (s ? srcLogo(s, 22) : '<span class="aab-vz">' + VIZ[vz] + '</span>') + '<div><b>' + esc(s ? s.l : 'Text and media') + '</b><small>' + esc(d.t) + '</small></div></div>' +
      '<div class="aab-pp-l">Description</div><p>' + esc(d.d || '') + '</p>' +
      (s ? '<div class="aab-pp-l">Data assets <span title="The kinds of data this source provides">ⓘ</span></div><div class="aab-chips">' + s.assets.map(a => '<span>' + esc(a) + '</span>').join('') + '</div>' : '') +
      '<div class="aab-pp-l">Visualizations</div><div class="aab-viz">' + VIZ_ALL.map(v => '<span class="' + (v === vz ? 'on' : '') + '" title="' + v + '">' + VIZ[v] + '</span>').join('') + '</div>' +
      (off ? '<div class="aab-pp-off">Not connected for this client yet. It fills in once the account is linked in Google Ads (Paid Social / Social).</div>' : '');
  };
  const pick = (k, b) => { closePicker(); opts.onPick(k, b); };
  el.querySelectorAll('[data-rail]').forEach(b => b.addEventListener('click', () => { rail = b.dataset.rail; el.querySelectorAll('[data-rail]').forEach(x => x.classList.toggle('on', x === b)); head(); list(); }));
  el.querySelector('[data-x]').addEventListener('click', closePicker);
  el.querySelector('[data-tpl]').addEventListener('click', () => { closePicker(); if (opts.onTemplates) opts.onTemplates(); });
  const inp = el.querySelector('input');
  inp.addEventListener('input', () => { q = inp.value.trim().toLowerCase().replace(/^\//, ''); list(); });
  el.addEventListener('keydown', e => { if (e.key === 'Escape'){ e.stopPropagation(); closePicker(); } });
  head(); list();
  /* Sit next to whatever opened it, inside the window. */
  const r = opts.anchor && opts.anchor.getBoundingClientRect ? opts.anchor.getBoundingClientRect() : {left: innerWidth / 2 - 280, top: 120, bottom: 120, right: innerWidth / 2};
  const w = Math.min(580, innerWidth - 24), h = 420;
  let left = Math.max(12, Math.min(innerWidth - w - 12, r.left - w / 2 + (r.right - r.left) / 2));
  let top = r.bottom + 8; if (top + h > innerHeight - 12) top = Math.max(12, r.top - h - 8);
  el.style.left = left + 'px'; el.style.top = top + 'px'; el.style.width = w + 'px';
  setTimeout(() => { try{ inp.focus({preventScroll: true}); }catch(e){} document.addEventListener('mousedown', awayPicker, true); }, 30);
}
/* reports.js calls this for "+ Add widget" on any report (openCatalog). */
window.EDGE_widgetPicker = {
  open(o, done){
    const btn = document.activeElement && document.activeElement.closest ? document.activeElement.closest('button') : null;
    openPicker({items: o.items, mode: o.mode, client: currentClient(), anchor: btn, onPick: k => {
      const A = RA(); o.items.push(A.newItem(k)); if (o.onItems) o.onItems(o.items); if (done) done();
      FX().toast('Added: ' + A.W[k].t, 'add');
    }});
  },
  close: closePicker
};
const currentClient = () => (state.seoClients || []).find(c => c.id === state.activeSeoClientId) || null;

/* ======================================================================
   THE EDITOR
   ====================================================================== */
const PAGE_TPL = [
  ['Blank page', []],
  ['Website Traffic', [['aa_users', 's', 4], ['aa_source_donut', 'l', 8], ['aa_users_line', 'l', 8], ['aa_source_bars', 's', 4]]],
  ['Website Events', [['aa_events', 's', 4], ['aa_events_donut', 'l', 8], ['aa_events_line', 'xl', 12]]],
  ['SEO Score', [['kw_public', 'xl']]],
  ['AI Traffic', [['aivr_kpi-visits', 's', 4], ['aivr_kpi-conv', 's', 4], ['aivr_kpi-gimpr', 's', 4], ['aivr_conv-types', 'xl'], ['aivr_visits-3m', 'xl'], ['aivr_pages', 'xl']]],
  ['Google Business Profile', [['gbp_glance', 'xl'], ['gbp_grids', 'xl']]],
  ['Search Console', [['gsc_kpis', 'xl'], ['gsc_queries', 'l', 6], ['gsc_pages', 'l', 6]]]
];
/* Paid and social pages come from the report's own channel pages (Google Ads, Meta Ads, Facebook, Instagram, LinkedIn). */
(() => { const add = () => { const RA = window.EdgeReportsApp; if (!RA || !RA.CH_PAGES){ setTimeout(add, 400); return; } const P = RA.CH_PAGES();
  Object.keys(P).forEach(src => { if (PAGE_TPL.some(t => t[0] === P[src][0])) return; PAGE_TPL.push([P[src][0], P[src][1].map(([t, c]) => [t, c === 12 ? 'xl' : c >= 8 ? 'l' : 's', c])]); }); }; add(); })();
const ED = {v: null, c: null, ctx: null, R: null, undo: [], redo: [], tab: 'design', preview: false, zoom: 1, saving: 0, lastSaved: 0};

const D = () => ED.mode === 'team' ? ED.R.team : ED.R.client;
const periodsOf = () => { const A = RA(); return ED.mode === 'team' ? A.PERIODS.map(p => String(p[0])).filter(p => A.validPeriod(p)) : A.clientPeriods(ED.R); };
const TEAM = () => ED.mode === 'team';
function draw(v, c, ctx, R, mode){
  const A = RA(); if (!A) return;
  mode = mode || 'client';
  const same = ED.c && ED.c.id === c.id && ED.mode === mode;
  Object.assign(ED, {v, c, ctx, R, mode});
  if (TEAM()) ED.tab = 'design';
  if (!same){ ED.undo = []; ED.redo = []; ED.preview = false; ED.tab = 'design'; }
  document.body.classList.add('aab-on');
  const L = A.logosFor(c, D()), periods = periodsOf();
  const per = periods.indexOf(String(D().period)) > -1 ? String(D().period) : (TEAM() && periods.indexOf('30') > -1 ? '30' : periods[0]);
  const plabel = k => (A.PERIODS.find(p => p[0] === String(k)) || [0, k])[1];
  const title = TEAM() ? c.name + ' — Team report' : (D().title || (c.name + ' — Report'));
  v.innerHTML = '<div class="aab' + (ED.preview ? ' preview' : '') + (TEAM() ? ' team' : ' client') + '">' +
    '<div class="aab-top"><div class="aab-tl"><span class="aab-name" contenteditable="true" spellcheck="false" data-title title="Rename the report">' + esc(title) + '</span>' +
      '<span class="aab-client">' + (L.clientLogo ? '<img alt="" src="' + esc(L.clientLogo) + '" onerror="this.remove()">' : '') + esc(c.name) + '<em' + (TEAM() ? ' class="team"' : '') + '>' + (TEAM() ? 'Team · internal' : 'Client') + '</em></span></div>' +
      (TEAM() ? '<div class="aab-tc"><button type="button" class="on">Design</button></div>' : '<div class="aab-tc"><button type="button" data-tab="design" class="' + (ED.tab === 'design' ? 'on' : '') + '">Design</button><button type="button" data-tab="shares" class="' + (ED.tab === 'shares' ? 'on' : '') + '">Shares</button></div>') +
      '<div class="aab-tr">' + (TEAM() ? '<button type="button" class="aab-b" data-reset>Reset layout</button><button type="button" class="aab-b dark" data-tlink>' + I.share + 'Copy team link</button>' : '<button type="button" class="aab-b" data-sched>' + I.sched + 'Schedule</button><button type="button" class="aab-b dark" data-share>' + I.share + 'Share</button>') + '</div></div>' +
    '<div class="aab-bar"><span class="aab-live"><i></i>Live data</span><button type="button" class="aab-ib" data-undo title="Undo (Ctrl+Z)"' + (ED.undo.length ? '' : ' disabled') + '>' + I.undo + '</button><button type="button" class="aab-ib" data-redo title="Redo"' + (ED.redo.length ? '' : ' disabled') + '>' + I.redo + '</button>' +
      '<span style="flex:1"></span><button type="button" class="aab-b ghost" data-setup>' + I.grid + 'Page Setup</button><button type="button" class="aab-b ghost" data-tpls>' + I.copy + 'Templates</button>' +
      '<div class="aab-dd"><button type="button" class="aab-b ghost" data-per>' + I.cal + esc(plabel(per)) + ' <span class="car">▾</span></button></div>' +
      '<button type="button" class="aab-b ghost" data-prev>' + I.play + (ED.preview ? 'Edit' : 'Preview') + '</button><span class="aab-saved" data-saved>' + I.cloud + 'Auto saved</span></div>' +
    '<div class="aab-body" data-design' + (ED.tab === 'design' ? '' : ' hidden') + '><aside class="aab-pages"><div class="aab-ph"><b>Pages</b><button type="button" class="aab-b small" data-addpage>' + I.plus + 'Add</button></div><div class="aab-pl" data-pages></div></aside>' +
      '<div class="aab-canvas" data-canvas><div class="aab-panel" data-panel></div><div class="aab-sheet" data-sheet style="--z:' + ED.zoom + '"><div class="aab-shead">' + (L.agencyLogo ? '<img alt="EDGE" src="' + esc(L.agencyLogo) + '" onerror="this.remove()">' : '<b>EDGE</b>') +
        '<div><div>' + esc(c.name) + '</div><div data-month></div></div></div><div data-board></div></div></div></div>' +
    '<div class="aab-shares" data-shares' + (ED.tab === 'shares' ? '' : ' hidden') + '></div>' +
    '<div class="aab-zoom"><button type="button" class="aab-ib" data-z="-">' + I.minus + '</button><span data-zl>' + Math.round(ED.zoom * 100) + '%</span><button type="button" class="aab-ib" data-z="+">' + I.plus + '</button><button type="button" class="aab-ib" data-z="fit" title="Fit">' + I.expand + '</button></div>' +
  '</div>';
  v.querySelector('[data-month]').textContent = monthLabel(A.rangeOf(per));
  board(per);
  wire(per, periods, plabel);
  if (ED.tab === 'shares') shares();
}
const monthLabel = R => { try{ const d = new Date(String(R.end).slice(0, 10) + 'T12:00:00'); return d.toLocaleDateString('en-CA', {month: 'long', year: 'numeric'}); }catch(e){ return ''; } };

function persistDoc(A){ if (TEAM()) A.persistTeam(ED.c); else A.persistClient(ED.c); }
function snapshot(){ return JSON.stringify(D().items); }
function remember(){ ED.undo.push(ED._last || snapshot()); if (ED.undo.length > 60) ED.undo.shift(); ED.redo = []; }
function saved(){
  const A = RA(); persistDoc(A);
  const s = ED.v && ED.v.querySelector('[data-saved]');
  if (s){ s.classList.add('busy'); s.innerHTML = I.cloud + 'Saving…'; clearTimeout(ED._st); ED._st = setTimeout(() => { if (s.isConnected){ s.classList.remove('busy'); s.innerHTML = I.cloud + 'Auto saved'; } }, 700); }
  const u = ED.v && ED.v.querySelector('[data-undo]'), r = ED.v && ED.v.querySelector('[data-redo]');
  if (u) u.disabled = !ED.undo.length; if (r) r.disabled = !ED.redo.length;
}

function board(per){
  const A = RA(), host = ED.v.querySelector('[data-board]'), R = ED.R, c = ED.c;
  const L = A.logosFor(c, D());
  ED._last = snapshot();
  const team = TEAM();
  A.renderBoard(host, Object.assign({mode: ED.mode, aa: true, bare: true, title: D().title, items: D().items, period: per, ctx: ED.ctx,
    editable: !ED.preview, startEditing: !ED.preview, periods: periodsOf(), showDates: false, brand: D().brand, clientName: c.name,
    pushed: team ? new Set(R.client.items.map(x => x.from).filter(Boolean)) : undefined,
    onPush: team && A.pushToClient ? it => A.pushToClient(c, it) : undefined,
    onShareWidget: team && A.shareWidget ? it => A.shareWidget(c, it, per) : undefined,
    emptyHtml: '<h3>Start your ' + (team ? 'team ' : '') + 'report</h3><div>Add a page from the left, use the ' + (team ? 'standard team layout' : 'monthly template') + ', or insert a single widget.</div><div style="margin-top:14px;display:flex;gap:8px;justify-content:center"><button class="aiv-btn go" type="button" data-aab-tpl>' + (team ? 'Use the standard layout' : 'Use the monthly template') + '</button><button class="aiv-btn" type="button" data-aab-ins>+ Add a widget</button></div>',
    autoFit: true, onAutoFit: () => { ED.fitOnce = false; persistDoc(A); ED._last = snapshot(); },
    onDeleted: t => FX().toast(t + ' removed', 'del', {label: 'Undo', key: 'Ctrl+Z', fn: () => undo(-1)}),
    onItems: () => { remember(); ED._last = snapshot(); saved(); pages(); },
    onPeriod: () => {}}, L));
  const t = host.querySelector('[data-aab-tpl]'); if (t) t.addEventListener('click', e => { remember(); if (TEAM()){ R.team.items = A.teamDefault(); delete R.team.free; persistDoc(A); redrawBoard(); FX().done(e.target, 'Standard team layout added'); } else if (window.EDGE_OS && EDGE_OS.reporting) { ED.fitOnce = true; EDGE_OS.reporting.buildTemplate(c, true); draw(ED.v, c, ED.ctx, A.reportsOf(c), 'client'); } });
  const ins = host.querySelector('[data-aab-ins]'); if (ins) ins.addEventListener('click', e => insertAt(null, e.currentTarget));
  pages();
  handles();
}

/* Pages: the cover and every page title, in the order they appear. */
function pageList(){
  const items = D().items.filter(it => it && it.y != null).slice().sort((a, b) => a.y - b.y || a.x - b.x);
  const out = []; let cur = null;
  items.forEach(it => {
    if (it.type === 'section' || it.type === 'cover'){
      cur = {anchor: it, label: it.type === 'cover' ? 'Cover Page' : ((it.cfg || {}).heading || (it.cfg || {}).title || 'Untitled page'), items: [it]};
      out.push(cur);
    } else {
      if (!cur){ cur = {anchor: null, label: 'Page 1', items: []}; out.push(cur); }
      cur.items.push(it);
    }
  });
  out.forEach(p => { p.top = Math.min.apply(null, p.items.map(i => i.y)); p.bottom = Math.max.apply(null, p.items.map(i => i.y + i.h)); });
  return out;
}
function pages(){
  const host = ED.v && ED.v.querySelector('[data-pages]'); if (!host) return;
  const P = pageList();
  host.innerHTML = P.length ? P.map((p, i) => '<div class="aab-pg" draggable="true" data-i="' + i + '"><span class="aab-grip">' + I.drag + '</span><button type="button" class="aab-pgn" data-go="' + i + '">' + esc(p.label) + '</button>' +
    (p.anchor ? '<button type="button" class="aab-ib tiny" data-pm="' + i + '" title="Page options">' + I.dots + '</button>' : '') + '</div>').join('') : '<div class="aab-pg-none">No pages yet</div>';
  host.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
    const p = P[+b.dataset.go], el = p.anchor ? ED.v.querySelector('.rp-w[data-id="' + p.anchor.id + '"]') : ED.v.querySelector('[data-sheet]');
    host.querySelectorAll('.aab-pg').forEach(x => x.classList.toggle('on', x === b.parentNode));
    if (el){ el.scrollIntoView({behavior: RM() ? 'auto' : 'smooth', block: 'start'}); FX().flash(el); }
  }));
  host.querySelectorAll('[data-pm]').forEach(b => b.addEventListener('click', e => pageMenu(P[+b.dataset.pm], e.currentTarget)));
  /* Drag a page to move it and everything on it. */
  let from = -1;
  host.querySelectorAll('.aab-pg').forEach(row => {
    row.addEventListener('dragstart', e => { from = +row.dataset.i; row.classList.add('drag'); try{ e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(from)); }catch(err){} });
    row.addEventListener('dragend', () => row.classList.remove('drag'));
    row.addEventListener('dragover', e => { e.preventDefault(); row.classList.add('over'); });
    row.addEventListener('dragleave', () => row.classList.remove('over'));
    row.addEventListener('drop', e => { e.preventDefault(); row.classList.remove('over'); const to = +row.dataset.i; if (from < 0 || from === to) return; movePage(P, from, to); });
  });
}
function restack(P){
  const GAP = RA().GAP || 16; let y = 0;
  P.forEach(p => { const d = y - p.top; p.items.forEach(it => { it.y += d; }); y = p.bottom + d + GAP; });
}
function movePage(P, from, to){
  remember();
  const m = P.splice(from, 1)[0]; P.splice(to, 0, m);
  restack(P);
  D().items.sort((a, b) => a.y - b.y || a.x - b.x);
  saved(); redrawBoard();
  FX().toast('Moved “' + m.label + '”', 'ok');
}
function pageMenu(p, btn){
  closeMenus();
  const m = document.createElement('div'); m.className = 'aab-menu';
  m.innerHTML = '<button type="button" data-a="rename">Rename</button><button type="button" data-a="add">Add a widget to this page</button><button type="button" data-a="del" class="bad">Delete page</button>';
  document.body.appendChild(m);
  const r = btn.getBoundingClientRect(); m.style.left = r.left + 'px'; m.style.top = (r.bottom + 4) + 'px';
  m.addEventListener('click', e => {
    const a = (e.target.closest('[data-a]') || {}).dataset; if (!a) return; closeMenus();
    if (a.a === 'rename'){ const el = ED.v.querySelector('.rp-w[data-id="' + p.anchor.id + '"]'); const n = prompt('Page name', p.label); if (n == null || !n.trim()) return; remember(); p.anchor.cfg = Object.assign({}, p.anchor.cfg, p.anchor.type === 'cover' ? {heading: n.trim()} : {heading: n.trim()}); saved(); redrawBoard(); }
    if (a.a === 'add'){ const last = p.items.slice().sort((x, y) => (x.y + x.h) - (y.y + y.h)).pop(); insertAt(last, btn); }
    if (a.a === 'del'){
      if (!confirm('Delete the page “' + p.label + '” and the ' + (p.items.length - 1) + ' widget' + (p.items.length === 2 ? '' : 's') + ' on it? You can undo this.')) return;
      remember(); const gone = new Set(p.items.map(i => i.id));
      D().items = D().items.filter(i => !gone.has(i.id));
      restack(pageList()); saved(); redrawBoard(); FX().toast('Page deleted', 'del');
    }
  });
  setTimeout(() => document.addEventListener('mousedown', awayMenu, true), 0);
}
function closeMenus(){ document.querySelectorAll('.aab-menu').forEach(m => m.remove()); document.removeEventListener('mousedown', awayMenu, true); }
function awayMenu(e){ if (!e.target.closest('.aab-menu')) closeMenus(); }
function addPage(btn){
  closeMenus();
  const A = RA();
  const m = document.createElement('div'); m.className = 'aab-menu wide';
  m.innerHTML = '<div class="aab-menu-h">Add a page</div>' + PAGE_TPL.map((t, i) => { const ok = t[1].every(x => A.W[x[0]]); return ok ? '<button type="button" data-t="' + i + '">' + esc(t[0]) + (t[1].length ? '<small>' + t[1].length + ' widgets</small>' : '') + '</button>' : ''; }).join('');
  document.body.appendChild(m);
  const r = btn.getBoundingClientRect(); m.style.left = r.left + 'px'; m.style.top = (r.bottom + 4) + 'px';
  m.addEventListener('click', e => {
    const b = e.target.closest('[data-t]'); if (!b) return; closeMenus();
    const t = PAGE_TPL[+b.dataset.t], name = t[0] === 'Blank page' ? (prompt('Page name', 'New page') || '').trim() : t[0];
    if (!name) return;
    remember();
    const items = D().items, GAP = A.GAP || 16;
    let y = items.length ? Math.max.apply(null, items.map(i => (i.y || 0) + (i.h || 0))) + GAP : 0;
    const sec = A.newItem('section', 'xl', {heading: name}); Object.assign(sec, {x: 0, y, cols: 12, h: 70, __new: 1}); items.push(sec); y += 70 + GAP;
    let cx = 0, rowH = 0;
    t[1].forEach(d => { const it = A.newItem(d[0], d[1]); const cols = d[2] || A.SIZE_COLS[d[1]] || 6, h = A.defH(it);
      if (cx + cols > 12){ y += rowH + GAP; cx = 0; rowH = 0; }
      Object.assign(it, {x: cx, y, cols, h, __new: 1}); items.push(it); cx += cols; rowH = Math.max(rowH, h); });
    saved(); redrawBoard();
    setTimeout(() => { const el = ED.v.querySelector('.rp-w[data-id="' + sec.id + '"]'); if (el){ el.scrollIntoView({behavior: RM() ? 'auto' : 'smooth', block: 'start'}); FX().done(el, 'Page added: ' + name); } }, 120);
  });
  setTimeout(() => document.addEventListener('mousedown', awayMenu, true), 0);
}

/* The + on every widget's bottom edge: insert right below it. */
function handles(){
  const sheet = ED.v.querySelector('[data-sheet]'), grid = sheet.querySelector('[data-grid]');
  if (!grid || ED.preview) return;
  let plus = sheet.querySelector('.aab-plus');
  if (!plus){ plus = document.createElement('button'); plus.type = 'button'; plus.className = 'aab-plus'; plus.title = 'Insert a widget here'; plus.innerHTML = I.plus; sheet.appendChild(plus); }
  let target = null;
  grid.addEventListener('mousemove', e => {
    const w = e.target.closest('.rp-w'); if (!w || w === target) return;
    target = w;
    const sr = sheet.getBoundingClientRect(), r = w.getBoundingClientRect(), z = ED.zoom || 1;
    plus.style.left = ((r.left + r.width / 2 - sr.left) / z) + 'px'; plus.style.top = ((r.bottom - sr.top) / z + 8) + 'px';
    plus.classList.add('on');
  });
  sheet.addEventListener('mouseleave', () => { plus.classList.remove('on'); target = null; });
  plus.onclick = () => { if (!target) return; const it = D().items.find(i => i.id === target.dataset.id); insertAt(it, plus); };
}
function insertAt(after, anchor){
  openPicker({items: D().items, mode: ED.mode, client: ED.c, anchor, onTemplates: () => addPage(anchor), onPick: k => {
    const A = RA(); remember();
    const it = A.newItem(k), items = D().items, GAP = A.GAP || 16;
    const cols = A.SIZE_COLS[it.size] || 6, h = A.defH(it);
    const y = after ? after.y + after.h + 1 : (items.length ? Math.max.apply(null, items.map(i => (i.y || 0) + (i.h || 0))) + GAP : 0);
    Object.assign(it, {x: 0, y, cols, h, __new: 1});
    items.push(it);
    saved(); redrawBoard();
    setTimeout(() => { const el = ED.v.querySelector('.rp-w[data-id="' + it.id + '"]'); if (el){ el.scrollIntoView({behavior: RM() ? 'auto' : 'smooth', block: 'center'}); FX().done(el, 'Added: ' + A.W[k].t); } }, 150);
  }});
}
function redrawBoard(){ const periods = periodsOf(); const per = periods.indexOf(String(D().period)) > -1 ? String(D().period) : (TEAM() && periods.indexOf('30') > -1 ? '30' : periods[0]); board(per); }

function wire(per, periods, plabel){
  const v = ED.v, A = RA(), c = ED.c, R = ED.R;
  const tEl = v.querySelector('[data-title]');
  if (tEl){
    tEl.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); tEl.blur(); } });
    tEl.addEventListener('blur', () => { const t = tEl.textContent.trim(); if (t && t !== (D().title || '')){ D().title = t; saved(); FX().toast('Report renamed', 'ok'); } });
  }
  const re = (m) => draw(v, c, ED.ctx, R, ED.mode);
  v.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { ED.tab = b.dataset.tab; re(); }));
  const sch = v.querySelector('[data-sched]'); if (sch) sch.addEventListener('click', () => { if (window.EDGE_OS && EDGE_OS.reporting) EDGE_OS.reporting.drawer(c); });
  const sh = v.querySelector('[data-share]'); if (sh) sh.addEventListener('click', () => { ED.tab = 'shares'; re(); });
  const tl = v.querySelector('[data-tlink]'); if (tl) tl.addEventListener('click', async e => { const u = A.teamUrl ? A.teamUrl(c, 'rteam') : location.href; try{ await navigator.clipboard.writeText(u); }catch(err){} FX().done(e.currentTarget, 'Team link copied'); });
  const rs = v.querySelector('[data-reset]'); if (rs) rs.addEventListener('click', () => { if (!confirm('Put the team report back to the standard widgets and layout? You can undo this.')) return; remember(); R.team.items = A.teamDefault(); delete R.team.free; persistDoc(A); redrawBoard(); FX().toast('Team report reset', 'sync'); });
  v.querySelector('[data-undo]').addEventListener('click', () => undo(-1));
  v.querySelector('[data-redo]').addEventListener('click', () => undo(1));
  v.querySelector('[data-addpage]').addEventListener('click', e => addPage(e.currentTarget));
  v.querySelector('[data-tpls]').addEventListener('click', () => A.openTemplates(c));
  v.querySelector('[data-prev]').addEventListener('click', () => { ED.preview = !ED.preview; re(); });
  v.querySelector('[data-setup]').addEventListener('click', () => {
    const host = v.querySelector('[data-panel]');
    A.brandPanel(host, Object.assign({brand: D().brand, onBrand: b => { D().brand = b; saved(); re(); }}, A.logosFor(c, D())));
  });
  const pb = v.querySelector('[data-per]');
  pb.addEventListener('click', e => {
    e.stopPropagation(); closeMenus();
    const m = document.createElement('div'); m.className = 'aab-menu';
    m.innerHTML = periods.map(p => '<button type="button" data-p="' + p + '"' + (p === per ? ' class="on"' : '') + '>' + esc(plabel(p)) + '</button>').join('');
    document.body.appendChild(m); const r = pb.getBoundingClientRect(); m.style.left = r.left + 'px'; m.style.top = (r.bottom + 4) + 'px';
    m.addEventListener('click', ev => { const b = ev.target.closest('[data-p]'); if (!b) return; closeMenus(); D().period = b.dataset.p; saved(); re(); });
    setTimeout(() => document.addEventListener('mousedown', awayMenu, true), 0);
  });
  v.querySelectorAll('[data-z]').forEach(b => b.addEventListener('click', () => {
    const z = b.dataset.z; ED.zoom = z === 'fit' ? 1 : Math.max(0.5, Math.min(1.5, Math.round((ED.zoom + (z === '+' ? 0.1 : -0.1)) * 10) / 10));
    v.querySelector('[data-sheet]').style.setProperty('--z', ED.zoom); v.querySelector('[data-zl]').textContent = Math.round(ED.zoom * 100) + '%';
  }));
}
function undo(dir){
  const from = dir < 0 ? ED.undo : ED.redo, to = dir < 0 ? ED.redo : ED.undo;
  if (!from.length) return;
  to.push(snapshot());
  D().items = JSON.parse(from.pop());
  persistDoc(RA());
  redrawBoard(); saved();
  FX().toast(dir < 0 ? 'Undone' : 'Redone', 'sync');
}
document.addEventListener('keydown', e => {
  if (!ED.v || !ED.v.isConnected || !ED.v.offsetParent || !document.body.classList.contains('aab-on')) return;
  const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
  if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')){ e.preventDefault(); undo(e.shiftKey ? 1 : -1); }
});

/* Shares: the client link (unchanged), embed code, a new link, and when it next goes out. */
function shares(){
  const host = ED.v.querySelector('[data-shares]'), A = RA(), c = ED.c, pub = A.isPublished(c);
  host.innerHTML = '<div class="aab-sh"><h2>Shares</h2><p>The client sees this report at its own link. It updates by itself whenever the report changes.</p>' +
    '<div class="aab-sh-card"><div class="aab-sh-row"><div><b>Client link</b><small>' + (pub ? 'Live · last published ' + new Date(A.publishedAt(c)).toLocaleString('en-CA', {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}) : 'Not shared yet') + '</small></div>' +
      '<button type="button" class="aab-b dark" data-pub>' + I.share + (pub ? 'Update & copy link' : 'Share report') + '</button>' + (pub ? '<button type="button" class="aab-b" data-open>Open</button><button type="button" class="aab-b" data-new>New link</button>' : '') + '</div>' +
      '<div data-sharebox></div></div>' +
    '<div class="aab-sh-card"><div class="aab-sh-row"><div><b>Scheduled email</b><small>Sent on the 1st of each month from your own Gmail, once you switch it on.</small></div><button type="button" class="aab-b" data-sched2>' + I.sched + 'Schedule</button></div></div></div>';
  host.querySelector('[data-pub]').addEventListener('click', async e => { const b = e.currentTarget; b.disabled = true; try{ await A.share(host, c); try{ await navigator.clipboard.writeText(A.url(c)); }catch(err){} FX().done(b, 'Report link copied'); }catch(err){ FX().toast('Couldn’t share: ' + err.message, 'del'); } b.disabled = false; });
  const o = host.querySelector('[data-open]'); if (o) o.addEventListener('click', () => window.open(A.url(c), '_blank', 'noopener'));
  const n = host.querySelector('[data-new]'); if (n) n.addEventListener('click', () => A.regenerate(host, c));
  host.querySelector('[data-sched2]').addEventListener('click', () => ED.v.querySelector('[data-sched]').click());
}

/* Leaving the client report tab: put the page back to normal. */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('#seoModes .seo-mode');
  if (b && !/^(rclient|rteam)$/.test(b.dataset.seoview)) document.body.classList.remove('aab-on');
}, true);
window.EDGE_aaBuilder = {draw, openPicker, pages: () => pageList(), fitNext: () => { ED.fitOnce = true; }};
})();
