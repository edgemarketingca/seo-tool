/* ==========================================================================
   EDGE OS: one tool, four sections, everything connected.

     SEO               Clients · GBP Tracker · Live SERP (the three existing tools, one section).
                       The client list follows Robert's "SEO Clients" column on Baseboard:
                       a client taken off his board moves to Inactive / Archived, and back
                       again when the card returns.
     Google Ads        Read only. Every Google Ads account with its logo, the month's numbers,
                       campaigns and what needs attention; a Paid Social tab for Facebook and
                       Instagram ads. Data is read from the platforms' own dashboards in Chrome
                       (by Claude, monthly) and handed to EDGE_ingest(); nothing here can change
                       an ad account.
     Web Maintenance   The monthly WordPress care desk (maintenance.js): red until done, what got
                       done and by whom, and its reminders on the 1st. Its due count shows on the
                       section button, and "Add to Basecamp" turns the month's list into a task.
     Reporting         Two tabs only: Team report and Client report, both in the AgencyAnalytics editor
                       and embedded dashboards, plus a Reporting home with every client's report
                       status, the AgencyAnalytics-style monthly template, share links and the
                       monthly send schedule (sent by tracker/report-mailer.gs).

   The EDGE brain is the shared record behind all four: one client list (state.seoClients),
   channel accounts linked to those clients, and Basecamp tasks tied to a client and a section.
   Tasks go through the Baseboard extension (your own Basecamp login; no tokens here).

   Storage: client edits and settings ride the workspace's own sync (state, save()). Channel data
   is bigger, so it lives in its own Firestore documents: users/{uid}/edgeChannels/{source}_{id}.
   ========================================================================== */
(function () {
'use strict';
if (typeof state === 'undefined' || !document.getElementById('appShell')) return;
if (typeof isPublicView === 'function' && isPublicView()) return;

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const RM = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const num = v => Number(v) || 0;
const fmt = n => Math.round(num(n)).toLocaleString('en-CA');
const money = n => '$' + num(n).toLocaleString('en-CA', {minimumFractionDigits: 0, maximumFractionDigits: num(n) < 100 ? 2 : 0});
const moneyK = n => { n = num(n); return n >= 10000 ? '$' + (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '') + 'k' : money(n); };
const pct = (a, b) => b ? (a / b * 100) : 0;
const ym = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const prevYm = m => { const d = new Date(m + '-15T12:00:00'); d.setMonth(d.getMonth() - 1); return ym(d); };
const monthName = m => new Date(m + '-15T12:00:00').toLocaleDateString('en-CA', {month: 'long', year: 'numeric'});
const norm = s => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/\b(inc|ltd|llc|corp|co|the|and)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const normDomain = v => String(v || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[\/?#:]/)[0];
const me = () => { try{ return (fbAuth && fbAuth.currentUser && fbAuth.currentUser.email) || ''; }catch(e){ return ''; } };
const meName = () => { const m = me(); const tm = (state.teamMembers || []).find(t => t && t.email && String(t.email).toLowerCase() === m.toLowerCase()); return (tm && tm.name) || (m.split('@')[0] || 'Someone').replace(/^./, c => c.toUpperCase()); };
/* Reading never touches the workspace (an unsaved change there would look like a local edit to the sync). */
const settings = () => (state.settings && state.settings.edgeOs) || {};
/* Only writes when the value really changes: every save is a cloud write that could race a teammate's edit. */
const setSetting = (k, v) => { const cur = settings(); if (JSON.stringify(cur[k]) === JSON.stringify(v)) return; const s = Object.assign({}, cur); s[k] = v; state.settings = state.settings || {}; state.settings.edgeOs = s; try{ save(); }catch(e){} };
/* Where you are (section, sub-tool, report tab) is this browser's own business: kept locally, never synced. */
const localPref = (k, v) => { try{ if (v === undefined) return localStorage.getItem('osPref:' + k) || ''; localStorage.setItem('osPref:' + k, v); }catch(e){ return ''; } };
const seoApi = () => (window.EDGE && EDGE.seo) || {renderAll(){}, renderTree(){}, logo: () => ''};
const seoClients = () => (state.seoClients || []).filter(Boolean);
const seoOnly = () => seoClients().filter(c => !isAdsOnly(c));
const activeClient = () => seoClients().find(c => c.id === state.activeSeoClientId) || null;
const logoOf = c => { if (!c) return ''; if (c.logoUrl) return c.logoUrl; const d = normDomain(c.website); return d.indexOf('.') > -1 ? 'https://www.google.com/s2/favicons?sz=128&domain=' + encodeURIComponent(d) : ''; };
const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const logoHtml = (src, name) => src ? '<span class="os-logo"><img alt="" src="' + esc(src) + '" onerror="this.parentNode.classList.add(\'mono\');this.parentNode.textContent=\'' + esc(initials(name)) + '\'"></span>' : '<span class="os-logo mono">' + esc(initials(name)) + '</span>';
const ICON = {
  seo: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/><path d="M8 11.5l2 2 4-4"/></svg>',
  ads: '<svg viewBox="0 0 24 24"><path d="M3 11v2a2 2 0 0 0 2 2h1l4 4V5L6 9H5a2 2 0 0 0-2 2z"/><path d="M15 8a5 5 0 0 1 0 8M18 5a9 9 0 0 1 0 14"/></svg>',
  maint: '<svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/></svg>',
  report: '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/></svg>',
  clients: '<svg viewBox="0 0 24 24"><path d="M3 12h4l3 8 4-16 3 8h4"/></svg>',
  gbp: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-5.33-7-11a7 7 0 0 1 14 0c0 5.67-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  serp: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>',
  tasks: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="m8 12 2.5 2.5L16 9"/><path d="M8 2v4M16 2v4"/></svg>',
  sync: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  ext: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 7"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>'
};

/* ======================================================================
   EFFECTS: toast, confetti, flash, fade-out. Every one respects reduced motion.
   ====================================================================== */
const FX = {
  toast(msg, kind, act){
    let t = $('osToast');
    if (!t){ t = document.createElement('div'); t.id = 'osToast'; t.className = 'os-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    const ic = {del: ICON.trash, sync: ICON.sync, add: ICON.plus}[kind] || ICON.check;
    t.className = 'os-toast ' + (kind || '') + (act ? ' has-act' : '');
    t.innerHTML = '<i>' + ic + '</i><span>' + esc(msg) + '</span>' + (act ? '<button type="button" class="os-toast-act">' + esc(act.label) + (act.key ? '<kbd>' + esc(act.key) + '</kbd>' : '') + '</button>' : '');
    if (act){ const b = t.querySelector('.os-toast-act'); b.addEventListener('click', () => { t.classList.remove('on'); try{ act.fn(); }catch(e){} }); }
    requestAnimationFrame(() => t.classList.add('on'));
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), act ? 6500 : 2600);
  },
  confetti(x, y, n){
    if (RM()) return;
    const cols = ['#e87722', '#ff9a3d', '#12a36f', '#2a78d6', '#ffd23f', '#e0483c', '#7b61ff'];
    x = x == null ? innerWidth / 2 : x; y = y == null ? innerHeight / 3 : y;
    for (let i = 0; i < (n || 46); i++){
      const p = document.createElement('i'); p.className = 'os-conf';
      p.style.background = cols[i % cols.length]; p.style.left = x + 'px'; p.style.top = y + 'px';
      document.body.appendChild(p);
      const a = Math.random() * Math.PI * 2, v = 6 + Math.random() * 9, dx = Math.cos(a) * v * 22, dy = Math.sin(a) * v * 16 - 120, r = Math.random() * 720;
      p.animate([{transform: 'translate(0,0) rotate(0)', opacity: 1}, {transform: 'translate(' + dx + 'px,' + (dy + 260) + 'px) rotate(' + r + 'deg)', opacity: 0}],
        {duration: 1100 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.3,1)'}).onfinish = () => p.remove();
    }
  },
  at(el){ try{ const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }catch(e){ return [null, null]; } },
  done(el, msg){ const p = el ? FX.at(el) : [null, null]; FX.confetti(p[0], p[1], 40); if (msg) FX.toast(msg, 'ok'); },
  flash(el){ if (!el || RM()) return; el.classList.remove('os-flash'); void el.offsetWidth; el.classList.add('os-flash'); },
  out(el, then){ if (!el){ if (then) then(); return; } if (RM()){ el.remove(); if (then) then(); return; } el.classList.add('os-out'); setTimeout(() => { el.remove(); if (then) then(); }, 440); },
  shimmer(el, on){ if (el) el.classList.toggle('os-syncing', !!on); }
};
window.EDGE_FX = FX;

/* ======================================================================
   SECTIONS
   ====================================================================== */
const SECTIONS = [
  {k: 'seo', l: 'SEO', ic: ICON.seo, key: '1'},
  {k: 'ads', l: 'Google Ads', ic: ICON.ads, key: '2'},
  {k: 'maint', l: 'Web Maintenance', ic: ICON.maint, key: '3'},
  {k: 'report', l: 'Reporting', ic: ICON.report, key: '4'}
];
const SEO_SUBS = [{k: 'seo', l: 'Clients', ic: ICON.clients}, {k: 'gbp', l: 'GBP Tracker', ic: ICON.gbp}, {k: 'serp', l: 'Live SERP', ic: ICON.serp}];
let section = 'seo';
const renders = {};

/* Google Ads gets a stage of its own (full width, no rail). */
function ensureStage(){
  if ($('adsStage')) return;
  const st = document.createElement('main');
  st.className = 'stage os-stage'; st.id = 'adsStage'; st.style.display = 'none';
  const ref = $('maintStage') || $('seoStage');
  ref.parentNode.insertBefore(st, ref.nextSibling);
  const M = window.EDGE_MODULES || (typeof MODULES !== 'undefined' ? MODULES : null);
  if (M) M.ads = {rail: 'adsRail', stage: 'adsStage', label: 'Google Ads'};
}

function buildBar(){
  const nav = $('topNav'); if (!nav || $('osSecs')) return;
  document.body.classList.add('os-on');
  const secs = document.createElement('div'); secs.className = 'os-secs'; secs.id = 'osSecs'; secs.setAttribute('role', 'tablist');
  secs.innerHTML = '<span class="os-pill" aria-hidden="true"></span>' + SECTIONS.map(s =>
    '<button type="button" class="os-sec" role="tab" data-sec="' + s.k + '" title="' + esc(s.l) + ' (Alt+' + s.key + ')">' + s.ic + '<span class="l">' + esc(s.l) + '</span><span class="os-badge" data-badge="' + s.k + '"></span></button>').join('');
  const sub = document.createElement('div'); sub.className = 'os-sub'; sub.id = 'osSub';
  sub.innerHTML = SEO_SUBS.map(s => '<button type="button" class="os-sub-b" data-sub="' + s.k + '" title="' + esc(s.l) + '">' + s.ic + '<span class="l">' + esc(s.l) + '</span></button>').join('') +
    '<button type="button" class="os-sub-act" id="osBoardSync" title="Match the SEO client list to the SEO Clients column on Robert’s Baseboard">' + ICON.sync + '<span class="l">Robert’s board</span></button>';
  const grow = document.createElement('div'); grow.className = 'os-grow';
  const tasks = document.createElement('button'); tasks.type = 'button'; tasks.className = 'os-tasks-btn'; tasks.id = 'osTasksBtn';
  tasks.title = 'Your Basecamp tasks, through Baseboard (T)';
  tasks.innerHTML = ICON.tasks + '<span class="l">Tasks</span><span class="os-badge" id="osTasksBadge"></span>';
  const mods = $('tnMods');
  mods.parentNode.insertBefore(secs, mods.nextSibling);
  secs.parentNode.insertBefore(sub, secs.nextSibling);
  sub.parentNode.insertBefore(grow, sub.nextSibling);
  const right = nav.querySelector('.tn-right');
  if (right) right.insertBefore(tasks, right.firstChild); else nav.appendChild(tasks);
  secs.addEventListener('click', e => { const b = e.target.closest('.os-sec'); if (b) go(b.dataset.sec); });
  sub.addEventListener('click', e => { const b = e.target.closest('.os-sub-b'); if (b) go('seo', b.dataset.sub); });
  $('osBoardSync').addEventListener('click', () => Board.sync(true));
  tasks.addEventListener('click', () => Tasks.open());
  window.addEventListener('resize', movePill);
}
function movePill(){
  const secs = $('osSecs'); if (!secs) return;
  const on = secs.querySelector('.os-sec.on'), pill = secs.querySelector('.os-pill');
  if (!on || !pill) return;
  pill.style.left = on.offsetLeft + 'px'; pill.style.width = on.offsetWidth + 'px';
}
function paintBar(){
  document.querySelectorAll('.os-sec').forEach(b => { const on = b.dataset.sec === section; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
  const mod = (window.EDGE && EDGE.current && EDGE.current()) || state.seoModule;
  document.querySelectorAll('.os-sub-b').forEach(b => b.classList.toggle('on', b.dataset.sub === mod));
  ['seo', 'ads', 'maint', 'report'].forEach(k => document.body.classList.toggle('os-sec-' + k, k === section));
  if (section !== 'report'){ document.body.classList.remove('aab-on'); document.body.classList.remove('os-rhome'); }
  requestAnimationFrame(movePill);
}

let routing = false;
const origGo = window.EDGE && window.EDGE.go;
function go(sec, sub){
  const prevSection = section;
  section = SECTIONS.some(s => s.k === sec) ? sec : 'seo';
  localPref('section', section);
  routing = true;
  try{
    if (section === 'seo'){
      const m = sub || localPref('seoSub') || 'seo';
      if (sub) localPref('seoSub', sub);
      origGo.call(window.EDGE, ['seo', 'gbp', 'serp'].indexOf(m) > -1 ? m : 'seo');
    } else if (section === 'report'){
      origGo.call(window.EDGE, 'seo');
      Reporting.enter();
    } else {
      origGo.call(window.EDGE, section);
      /* Coming into Web Maintenance from elsewhere always starts on the overview. */
      if (section === 'maint' && (prevSection !== 'maint' || !sub) && window.EDGE_maint && EDGE_maint.home) EDGE_maint.home();
    }
  } finally { routing = false; }
  paintBar();
  const stage = section === 'ads' ? $('adsStage') : section === 'maint' ? $('maintStage') : null;
  if (stage && !RM()){ stage.classList.remove('os-enter'); void stage.offsetWidth; stage.classList.add('os-enter'); }
}
/* Older entry points (hub cards, Alt+1/2/3, "open in Live SERP" buttons) still call EDGE.go(module). */
function hookRouter(){
  if (!window.EDGE || !origGo) return;
  window.EDGE.go = function (m){
    if (!routing){
      if (m === 'ads' || m === 'maint') section = m;
      else if (['seo', 'gbp', 'serp'].indexOf(m) > -1){ section = 'seo'; localPref('seoSub', m); }
    }
    const r = origGo.call(window.EDGE, m);
    if (!routing){ document.body.classList.remove('os-report-mode'); paintBar(); }
    return r;
  };
  window.EDGE.section = go;
  window.EDGE.currentSection = () => section;
}

/* ======================================================================
   HOME: a command centre. A deep-teal hero with the month in four numbers, then
   the four pillars as a bento of different shapes, each in its own colour with
   a live miniature of what is inside.
   ====================================================================== */
const PILLAR = {seo: '#E87721', ads: '#004851', maint: '#5E7A70', report: '#6F6DB5'};
function seoStats(){
  const cs = seoOnly().filter(c => !isArchived(c));
  const d = {top3: 0, top10: 0, beyond: 0, none: 0}, moves = [];
  let kws = 0;
  cs.forEach(c => (c.keywords || []).forEach(k => {
    kws++;
    let best = null, prev = null;
    (k.locations || []).forEach(l => { if (l.rank != null && (best == null || l.rank < best)){ best = l.rank; prev = l.prevRank; } });
    if (best == null) d.none++; else if (best <= 3) d.top3++; else if (best <= 10) d.top10++; else d.beyond++;
    if (best != null && prev != null && prev !== best) moves.push({c, k: k.text || k.keyword || '', from: prev, to: best, gain: prev - best});
  }));
  moves.sort((x, y) => y.gain - x.gain);
  const seen = new Set(), best = moves.filter(m => m.gain > 0 && !seen.has(m.c.id) && seen.add(m.c.id));
  return {best,clients: cs.length, kws, d, up: moves.filter(m => m.gain > 0).slice(0, 3), upCount: moves.filter(m => m.gain > 0).length, downCount: moves.filter(m => m.gain < 0).length};
}
function adsStats(){
  const all = Channels.list('google_ads').concat(Channels.list('meta_ads'));
  const m = Channels.latestMonth('google_ads'), pm = prevYm(m);
  const sum = mm => all.reduce((t, a) => t + num(((a.months || {})[mm] || {}).spend), 0);
  const months = []; let x = m; for (let i = 0; i < 6; i++){ months.unshift(x); x = prevYm(x); }
  const logos = []; all.forEach(a => { const c = Channels.link(a); if (c && logoOf(c) && logos.length < 6 && !logos.some(l => l.id === c.id)) logos.push(c); });
  return {n: all.length, m, spend: sum(m), prev: sum(pm), series: months.map(sum), attn: all.filter(a => Attention.level(Attention.of(a)) === 'bad').length, logos};
}
function maintStats(){
  const api = window.EDGE_maint; if (!api || !api.sites) return {total: 0, done: 0, due: []};
  const st = api.sites().map(c => ({c, s: api.statusOf(c)})).filter(x => x.s.key !== 'paused');
  return {total: st.length, done: st.filter(x => x.s.key === 'ok').length, due: st.filter(x => x.s.key === 'due').map(x => x.c)};
}
function reportStats(){
  const cfg = Reporting.cfg(), now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + (now.getDate() > cfg.day || (now.getDate() === cfg.day && now.getHours() >= cfg.hour) ? 1 : 0), cfg.day, cfg.hour);
  const sched = seoClients().filter(c => cfg.clients[c.id] && cfg.clients[c.id].on && (cfg.clients[c.id].to || []).length);
  return {sched, days: Math.max(0, Math.ceil((next - now) / 864e5)), next};
}
const greetName = () => { try{ const n = localStorage.getItem('edge-presence-name'); if (n) return n.split(' ')[0]; }catch(e){} return meName().split(' ')[0]; };
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const count = (v, f) => '<b data-ct="' + num(v) + '"' + (f ? ' data-f="' + f + '"' : '') + '>' + (f === 'money' ? money(v) : fmt(v)) + '</b>';
function hubHtml(){
  const S = seoStats(), A = adsStats(), M = maintStats(), R = reportStats();
  const dTot = Math.max(1, S.d.top3 + S.d.top10 + S.d.beyond + S.d.none);
  const seg = (n, cls, l) => n ? '<i class="' + cls + '" style="flex:' + n + '" title="' + l + ': ' + n + '"></i>' : '';
  const mp = M.total ? M.done / M.total : 0, C = 2 * Math.PI * 46;
  const mx = Math.max.apply(null, A.series.concat([1]));
  const first = A.series.findIndex(v => v > 0);
  const bars = A.series.map((v, i) => ({v, i})).filter(x => first > -1 && x.i >= first).map((x, j, arr) => { const mm = prevYmN(A.m, 5 - x.i);
    return '<span class="osh-bar' + (j === arr.length - 1 ? ' now' : '') + '" title="' + esc(monthName(mm)) + ': ' + money(x.v) + '"><i style="height:' + Math.max(18, Math.round(x.v / mx * 100)) + '%;animation-delay:' + (j * 80) + 'ms"><em>' + esc(moneyK(x.v)) + '</em></i><small>' + esc(monthName(mm).slice(0, 3)) + '</small></span>'; }).join('');
  const dl = A.prev ? Math.round((A.spend - A.prev) / A.prev * 100) : null;
  const today = new Date().toLocaleDateString('en-CA', {weekday: 'long', month: 'long', day: 'numeric'});
  return '<div class="osh-hero"><div class="osh-orb a"></div><div class="osh-orb b"></div><div class="osh-hl"><span class="osh-eye">EDGE Workspace · ' + esc(today) + '</span>' +
      '<h1>' + esc(greeting()) + ', <em>' + esc(greetName()) + '</em>.</h1><p>Strategy, website, marketing and measure: the whole EDGE system, one shared record.</p></div>' +
      '<div class="osh-month"><div><small>SEO clients</small>' + count(S.clients) + '</div><div><small>Ad spend · ' + esc(monthName(A.m).split(' ')[0]) + '</small>' + count(A.spend, 'money') + '</div>' +
      '<div><small>Sites maintained</small><b>' + M.done + '<span>/' + M.total + '</span></b></div><div><small>Next reports in</small><b>' + R.days + '<span> day' + (R.days === 1 ? '' : 's') + '</span></b></div></div></div>' +
    '<div class="osh-grid">' +
      /* SEO: wide, warm, the ranking mix and who moved up */
      '<button type="button" class="osh-t seo" data-osgo="seo" style="--p:' + PILLAR.seo + '"><span class="osh-k">1</span><div class="osh-th"><span class="osh-ic">' + ICON.seo + '</span><div><small>Strategy &amp; search</small><h3>SEO</h3></div></div>' +
        '<div class="osh-seo"><div class="osh-big">' + count(S.kws) + '<span>keywords tracked across ' + S.clients + ' clients</span></div>' +
        '<div class="osh-mix">' + seg(S.d.top3, 'a', 'Top 3') + seg(S.d.top10, 'b', '4 to 10') + seg(S.d.beyond, 'c', '11+') + seg(S.d.none, 'd', 'Not ranking') + '</div>' +
        '<div class="osh-leg"><span><i class="a"></i>Top 3 <b>' + S.d.top3 + '</b></span><span><i class="b"></i>4–10 <b>' + S.d.top10 + '</b></span><span><i class="c"></i>11+ <b>' + S.d.beyond + '</b></span><span><i class="d"></i>Not yet <b>' + S.d.none + '</b></span></div>' +
        (S.best.length ? '<div class="osh-moves"><small>Climbing this month</small>' + S.best.slice(0, 3).map(m => '<span>' + logoHtml(logoOf(m.c), m.c.name) + '<em>' + esc(m.c.name) + (m.k ? '<i>' + esc(m.k) + '</i>' : '') + '</em><b>▲ ' + m.from + ' → ' + m.to + '</b></span>').join('') + '</div>' : '') + '</div>' +
        '<span class="osh-go">Open SEO <svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></span></button>' +
      /* Google Ads: deep teal, the spend by month */
      '<button type="button" class="osh-t ads" data-osgo="ads" style="--p:' + PILLAR.ads + '"><span class="osh-k">2</span><div class="osh-th"><span class="osh-ic">' + chIcon('google_ads', 26) + '</span><div><small>Marketing · read only</small><h3>Google Ads</h3></div></div>' +
        '<div class="osh-big">' + count(A.spend, 'money') + '<span class="osh-adsub">spent in ' + esc(monthName(A.m)) + (dl != null ? '<b class="osh-dl ' + (dl > 0 ? 'up' : dl < 0 ? 'down' : '') + '">' + (dl > 0 ? '▲' : dl < 0 ? '▼' : '') + ' ' + Math.abs(dl) + '% vs ' + esc(monthName(prevYm(A.m)).slice(0, 3)) + '</b>' : '') + '</span></div>' +
        '<div class="osh-bars">' + bars + '</div>' +
        '<div class="osh-foot">' + (A.logos.length ? '<span class="osh-stack">' + A.logos.map(c => logoHtml(logoOf(c), c.name)).join('') + '</span>' : '') + '<span>' + A.n + ' accounts</span>' + (A.attn ? '<span class="osh-warn">' + A.attn + ' need attention</span>' : '') + '</div>' +
        '<span class="osh-go">Open Google Ads <svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></span></button>' +
      /* Web Maintenance: sage, the month as a ring */
      '<button type="button" class="osh-t maint" data-osgo="maint" style="--p:' + PILLAR.maint + '"><span class="osh-k">3</span><div class="osh-th"><span class="osh-ic">' + ICON.maint + '</span><div><small>Website · every month</small><h3>Web Maintenance</h3></div></div>' +
        '<div class="osh-ringrow"><div class="osh-ring"><svg viewBox="0 0 110 110"><circle cx="55" cy="55" r="46" class="tr"/><circle cx="55" cy="55" r="46" class="fg" style="stroke-dasharray:' + C + ';--off:' + (C * (1 - mp)) + '"/></svg><b>' + Math.round(mp * 100) + '<span>%</span></b></div>' +
        '<div class="osh-due"><small>' + (M.due.length ? M.due.length + ' still to do in ' + esc(monthName(ym(Date.now())).split(' ')[0]) : 'Every site is done this month') + '</small>' + M.due.slice(0, 4).map(c => '<span>' + esc(c.name) + '</span>').join('') + (M.due.length > 4 ? '<span class="more">+' + (M.due.length - 4) + '</span>' : '') + '</div></div>' +
        '<span class="osh-go">Open Web Maintenance <svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></span></button>' +
      /* Reporting: lavender, the countdown and the stack of reports */
      '<button type="button" class="osh-t report" data-osgo="report" style="--p:' + PILLAR.report + '"><span class="osh-k">4</span><div class="osh-th"><span class="osh-ic">' + ICON.report + '</span><div><small>Measure · sent for you</small><h3>Reporting</h3></div></div>' +
        '<div class="osh-rep"><div class="osh-cal"><small>' + esc(R.next.toLocaleDateString('en-CA', {month: 'short'})) + '</small><b>' + R.next.getDate() + '</b><span>' + esc(fmtHour(Reporting.cfg().hour)) + '</span></div>' +
        '<div><div class="osh-big sm">' + count(R.sched.length) + '<span>client reports scheduled for the next send</span></div>' +
        '<div class="osh-sheets">' + (R.sched.length ? R.sched.slice(0, 5) : seoClients().slice(0, 3)).map((c, i) => '<span style="--i:' + i + '">' + logoHtml(logoOf(c), c.name) + '<i></i><i></i></span>').join('') + '</div></div></div>' +
        '<span class="osh-go">Open Reporting <svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></span></button>' +
    '</div><div class="osh-kbd"><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd> jump straight in · <kbd>Alt</kbd>+<kbd>H</kbd> comes back here · <kbd>T</kbd> opens your tasks</div>';
}
const prevYmN = (m, n) => { let x = m; for (let i = 0; i < n; i++) x = prevYm(x); return x; };
function buildHub(){
  const inner = document.querySelector('#hubScreen .hub-inner'); if (!inner || $('osHub')) return;
  document.body.classList.add('os-hub');
  const h = document.createElement('section'); h.id = 'osHub'; h.className = 'osh';
  const top = inner.querySelector('.hub-top');
  inner.insertBefore(h, top ? top.nextSibling : inner.firstChild);
  h.addEventListener('click', e => { const t = e.target.closest('[data-osgo]'); if (t){ try{ EDGE_showHub(false); }catch(err){} go(t.dataset.osgo); } });
  h.addEventListener('mousemove', e => { const t = e.target.closest('.osh-t'); if (!t) return; const r = t.getBoundingClientRect(); t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
  paintHub(true);
  /* Count up once each time home opens. */
  const hs = $('hubScreen'); if (hs) new MutationObserver(() => { if (hs.classList.contains('on')) paintHub(true); }).observe(hs, {attributes: true, attributeFilter: ['class']});
}
function paintHub(animate){
  const h = $('osHub'); if (!h) return;
  const html = hubHtml();
  if (!animate && h._html === html) return;
  h._html = html; h.innerHTML = html;
  if (!animate || RM()) return;
  h.querySelectorAll('[data-ct]').forEach(b => {
    const end = num(b.dataset.ct), f = b.dataset.f, t0 = performance.now(), dur = 900;
    if (end < 2) return;
    const step = now => { const p = Math.min(1, (now - t0) / dur), v = end * (1 - Math.pow(1 - p, 3)); b.textContent = f === 'money' ? money(v) : fmt(v); if (p < 1) requestAnimationFrame(step); else b.textContent = f === 'money' ? money(end) : fmt(end); };
    requestAnimationFrame(step);
  });
}
function paintHubMeta(){ paintHub(false); }

/* Keyboard: Alt+1..4 jump between sections, T opens Tasks. */
document.addEventListener('keydown', e => {
  const shell = $('appShell'); if (!shell || shell.classList.contains('hidden')) return;
  const t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  if (e.altKey && !e.ctrlKey && !e.metaKey){
    const s = SECTIONS.find(x => x.key === e.key);
    if (s){ e.preventDefault(); e.stopImmediatePropagation(); try{ EDGE_showHub(false); }catch(err){} go(s.k); return; }
  }
  if (e.key === 'Escape'){ if (Drawer.close()) e.stopPropagation(); return; }
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  const hub = $('hubScreen');
  if (hub && hub.classList.contains('on')){ const s = SECTIONS.find(x => x.key === e.key); if (s){ e.preventDefault(); e.stopImmediatePropagation(); EDGE_showHub(false); go(s.k); } return; }
  if ((e.key === 't' || e.key === 'T') && !document.querySelector('.os-drawer.on')){ e.preventDefault(); Tasks.open(); }
}, true);

/* ======================================================================
   DRAWER (one at a time)
   ====================================================================== */
const Drawer = {
  el: null, scrim: null,
  open(html, opts){
    opts = opts || {};
    this.close(true);
    const sc = document.createElement('div'); sc.className = 'os-scrim';
    const d = document.createElement('aside'); d.className = 'os-drawer' + (opts.wide ? ' wide' : ''); d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    d.innerHTML = html;
    document.body.appendChild(sc); document.body.appendChild(d);
    this.el = d; this.scrim = sc;
    requestAnimationFrame(() => { sc.classList.add('on'); d.classList.add('on'); });
    sc.addEventListener('click', () => this.close());
    d.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => this.close()));
    const f = d.querySelector('input,button.os-x'); if (f) setTimeout(() => { try{ f.focus({preventScroll: true}); }catch(e){} }, 80);
    return d;
  },
  close(instant){
    const d = this.el, sc = this.scrim; if (!d) return false;
    this.el = this.scrim = null;
    if (instant || RM()){ d.remove(); sc.remove(); return true; }
    d.classList.remove('on'); sc.classList.remove('on');
    setTimeout(() => { d.remove(); sc.remove(); }, 420);
    return true;
  }
};
const dHead = (title, sub) => '<div class="os-dh"><div style="flex:1;min-width:0"><h2>' + esc(title) + '</h2>' + (sub ? '<small>' + sub + '</small>' : '') + '</div><button type="button" class="os-x" data-close aria-label="Close">' + ICON.x + '</button></div>';

/* ======================================================================
   TIDYBOARD BRIDGE → Basecamp
   The Baseboard extension (v2.1+) answers messages from seo.edgemarketing.ca using the
   Basecamp login already in Chrome. Its id arrives with a hello the extension posts to this
   page; it can also be pasted once in Tasks → Settings.
   Messages: {action:'ping'|'me'|'myTodos'|'projects'|'createTodo'|'completeTodo'|'boardColumn'|'addToBoard', ...}
   ====================================================================== */
const Bridge = {
  id: '',
  hello: false,
  init(){
    this.id = settings().tidyboardId || '';
    window.addEventListener('message', e => {
      if (e.source !== window || !e.data || e.data.source !== 'tidyboard' || e.data.type !== 'hello') return;
      if (/^[a-p]{32}$/.test(String(e.data.id || ''))){ this.id = e.data.id; this.hello = true; if (settings().tidyboardId !== this.id) setSetting('tidyboardId', this.id); Tasks.refresh(); }
    });
    try{ window.postMessage({source: 'edge-os', type: 'hello?'}, location.origin); }catch(e){}
  },
  available(){ return !!(this.id && window.chrome && chrome.runtime && chrome.runtime.sendMessage); },
  call(action, payload){
    return new Promise((res, rej) => {
      if (!this.available()) return rej(new Error('Baseboard isn’t connected to this page yet.'));
      let done = false;
      const t = setTimeout(() => { if (!done){ done = true; rej(new Error('Baseboard didn’t answer. Is Chrome signed in to Basecamp?')); } }, 20000);
      try{
        chrome.runtime.sendMessage(this.id, Object.assign({edge: 1, action}, payload || {}), r => {
          if (done) return; done = true; clearTimeout(t);
          const le = chrome.runtime.lastError;
          if (le) return rej(new Error(le.message || 'Baseboard is not installed or not updated.'));
          if (!r || r.error) return rej(new Error((r && r.error) || 'No answer from Baseboard.'));
          res(r.data);
        });
      }catch(e){ done = true; clearTimeout(t); rej(e); }
    });
  }
};

/* ======================================================================
   TASKS: Basecamp to-dos assigned to you, in a drawer that knows which section and client you are on.
   ====================================================================== */
const Tasks = {
  list: [], projects: null, at: 0, err: '', seen: new Set(JSON.parse(localStorage.getItem('osTasksSeen') || '[]')),
  ctx(){
    const c = (section === 'seo' || section === 'report') ? activeClient() : null;
    return {section, client: c, label: (SECTIONS.find(s => s.k === section) || {}).l || ''};
  },
  async refresh(quiet){
    if (!Bridge.available()){ this.err = 'nobridge'; this.paintBadge(); return; }
    const btn = $('osTasksBtn'); FX.shimmer(btn, true);
    try{
      const rows = await Bridge.call('myTodos');
      const fresh = (rows || []).filter(t => !this.seen.has(String(t.id)));
      this.list = rows || []; this.at = Date.now(); this.err = '';
      if (fresh.length && this.at && !quiet){ btn.classList.remove('ping'); void btn.offsetWidth; btn.classList.add('ping'); if (this.loadedOnce) FX.toast(fresh.length === 1 ? 'New Basecamp task: ' + fresh[0].title : fresh.length + ' new Basecamp tasks', 'add'); }
      this.loadedOnce = true;
    }catch(e){ this.err = e.message; }
    FX.shimmer(btn, false);
    this.paintBadge();
    if (Drawer.el && Drawer.el.dataset.kind === 'tasks') this.paint();
  },
  paintBadge(){
    const b = $('osTasksBadge'); if (!b) return;
    const n = this.list.filter(t => !this.seen.has(String(t.id))).length;
    b.textContent = n ? String(n) : (this.list.length ? '' : '');
  },
  open(prefill){
    const x = this.ctx();
    const d = Drawer.open(dHead('Tasks', 'Basecamp to-dos assigned to you' + (x.client ? ' · ' + esc(x.client.name) : '')) +
      '<div class="os-db"><div class="os-tabs" style="margin-bottom:14px"><button type="button" class="os-tab on" data-tt="mine">Mine</button>' +
      (x.client ? '<button type="button" class="os-tab" data-tt="client">' + esc(x.client.name) + '</button>' : '') +
      '<button type="button" class="os-tab" data-tt="add">' + '+ New task</button><button type="button" class="os-tab" data-tt="set">Settings</button></div><div data-tbody></div></div>');
    d.dataset.kind = 'tasks';
    this.tab = prefill ? 'add' : 'mine'; this.prefill = prefill || null;
    d.querySelectorAll('[data-tt]').forEach(b => b.addEventListener('click', () => { this.tab = b.dataset.tt; this.paint(); }));
    this.paint();
    if (!this.at || Date.now() - this.at > 60000) this.refresh();
    /* Opening the drawer counts as seeing the new ones. */
    setTimeout(() => { this.list.forEach(t => this.seen.add(String(t.id))); try{ localStorage.setItem('osTasksSeen', JSON.stringify(Array.from(this.seen).slice(-800))); }catch(e){} this.paintBadge(); }, 2500);
  },
  paint(){
    const d = Drawer.el; if (!d || d.dataset.kind !== 'tasks') return;
    d.querySelectorAll('[data-tt]').forEach(b => b.classList.toggle('on', b.dataset.tt === this.tab));
    const body = d.querySelector('[data-tbody]');
    if (this.tab === 'set') return this.paintSettings(body);
    if (!Bridge.available() || this.err === 'nobridge') return this.paintSetup(body);
    if (this.tab === 'add') return this.paintAdd(body);
    const x = this.ctx();
    let rows = this.list.slice();
    if (this.tab === 'client' && x.client){ const n = norm(x.client.name); rows = rows.filter(t => norm(t.title + ' ' + (t.project || '') + ' ' + (t.list || '')).indexOf(n) > -1); }
    rows.sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1);
    const today = new Date().toISOString().slice(0, 10);
    body.innerHTML = (this.err ? '<div class="os-note warn" style="margin-bottom:10px">' + esc(this.err) + '</div>' : '') +
      (rows.length ? '<div class="os-tl">' + rows.map(t => '<div class="os-t' + (this.seen.has(String(t.id)) ? '' : ' new') + '" data-id="' + esc(t.id) + '">' +
        '<button type="button" class="os-chk" title="Complete in Basecamp" aria-label="Complete"></button><div class="os-t-b"><b>' + esc(t.title) + '</b><small>' +
        (t.project ? '<span>' + esc(t.project) + '</span>' : '') + (t.list ? '<span>· ' + esc(t.list) + '</span>' : '') +
        (t.due ? '<span class="' + (t.due < today ? 'late' : '') + '">· due ' + esc(new Date(t.due + 'T12:00:00').toLocaleDateString('en-CA', {month: 'short', day: 'numeric'})) + '</span>' : '') +
        (t.column ? '<span>· ' + esc(t.column) + '</span>' : '') + '</small></div>' +
        (t.url ? '<a class="os-t-open" href="' + esc(t.url) + '" target="_blank" rel="noopener" title="Open in Basecamp">' + ICON.ext + '</a>' : '') + '</div>').join('') + '</div>'
        : '<div class="os-empty" style="margin:10px 0;padding:30px 20px"><div class="ic">' + ICON.tasks + '</div><h3>' + (this.at ? 'All clear' : 'Loading your tasks…') + '</h3><p>' +
          (this.at ? (this.tab === 'client' ? 'No open tasks mention this client.' : 'Nothing assigned to you in Basecamp right now.') : 'Asking Basecamp through Baseboard.') + '</p></div>') +
      '<div style="margin-top:12px;display:flex;gap:8px;align-items:center"><button type="button" class="os-btn" data-tr>' + ICON.sync + 'Refresh</button><span class="os-sync-line"><i></i>' + (this.at ? 'Updated ' + new Date(this.at).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'}) : '') + '</span></div>';
    body.querySelector('[data-tr]').addEventListener('click', () => this.refresh());
    body.querySelectorAll('.os-chk').forEach(ch => ch.addEventListener('click', async () => {
      const row = ch.closest('.os-t'), id = row.dataset.id, t = this.list.find(x => String(x.id) === id);
      ch.classList.add('on'); FX.done(ch);
      try{
        await Bridge.call('completeTodo', {todoId: t.id, projectId: t.projectId});
        row.classList.add('done'); setTimeout(() => { this.list = this.list.filter(x => x !== t); this.paint(); this.paintBadge(); }, 360);
        FX.toast('Done in Basecamp: ' + t.title, 'ok');
      }catch(e){ ch.classList.remove('on'); FX.toast(e.message, 'del'); }
    }));
  },
  async paintAdd(body){
    const x = this.ctx(), p = this.prefill || {};
    body.innerHTML = '<div class="os-form"><label>Task</label><input class="os-in" data-f="title" maxlength="240" value="' + esc(p.title || (x.client ? x.client.name + ' — ' : '')) + '">' +
      '<label>Notes</label><textarea data-f="notes" placeholder="Optional">' + esc(p.notes || '') + '</textarea>' +
      '<div class="os-row"><div><label>Basecamp project</label><select class="os-sel" data-f="project"><option value="">Loading…</option></select></div><div><label>To-do list</label><select class="os-sel" data-f="list"></select></div></div>' +
      '<div class="os-row"><div><label>Due</label><input class="os-in" type="date" data-f="due" value="' + esc(p.due || '') + '"></div><div><label>Put on Baseboard</label><select class="os-sel" data-f="board"><option value="">My board, default column</option><option value="none">Don’t add to a board</option></select></div></div>' +
      '<div class="os-note">Assigned to you. Tagged <b>' + esc(x.label) + '</b>' + (x.client ? ' and <b>' + esc(x.client.name) + '</b>' : '') + ' so it shows up on this client in every section.</div>' +
      '<button type="button" class="os-btn go" data-add>' + ICON.plus + 'Add to Basecamp</button></div>';
    const ps = body.querySelector('[data-f="project"]'), ls = body.querySelector('[data-f="list"]');
    try{
      if (!this.projects) this.projects = await Bridge.call('projects');
      const want = x.client ? norm(x.client.name) : '';
      const last = settings().lastProject || '';
      ps.innerHTML = this.projects.map(pr => '<option value="' + esc(pr.id) + '">' + esc(pr.name) + '</option>').join('');
      const match = this.projects.find(pr => want && norm(pr.name).indexOf(want) > -1) || this.projects.find(pr => String(pr.id) === String(last));
      if (match) ps.value = match.id;
      const fillLists = () => { const pr = this.projects.find(q => String(q.id) === ps.value) || {lists: []}; ls.innerHTML = (pr.lists || []).map(l => '<option value="' + esc(l.id) + '">' + esc(l.name) + '</option>').join(''); };
      ps.addEventListener('change', fillLists); fillLists();
    }catch(e){ ps.innerHTML = '<option value="">' + esc(e.message) + '</option>'; }
    body.querySelector('[data-add]').addEventListener('click', async ev => {
      const btn = ev.currentTarget, get = k => (body.querySelector('[data-f="' + k + '"]') || {}).value || '';
      const title = get('title').trim(); if (!title){ FX.toast('Give the task a name first', 'del'); return; }
      if (!get('project') || !get('list')){ FX.toast('Pick a Basecamp project and list', 'del'); return; }
      btn.disabled = true; btn.innerHTML = 'Adding…';
      const tag = '[EDGE · ' + x.label + (x.client ? ' · ' + x.client.name : '') + ']';
      try{
        const t = await Bridge.call('createTodo', {projectId: get('project'), listId: get('list'), title, notes: (get('notes') ? get('notes') + '\n\n' : '') + tag, due: get('due') || null, assignMe: true, board: get('board') !== 'none'});
        setSetting('lastProject', get('project'));
        if (t) this.list.unshift(t);
        FX.done(btn, 'Added to Basecamp' + (get('board') !== 'none' ? ' and your Baseboard' : ''));
        this.prefill = null; this.tab = 'mine'; this.paint(); this.paintBadge();
      }catch(e){ btn.disabled = false; btn.innerHTML = ICON.plus + 'Add to Basecamp'; FX.toast(e.message, 'del'); }
    });
  },
  paintSetup(body){
    body.innerHTML = '<div class="os-empty" style="margin:6px 0 14px;padding:30px 22px"><div class="ic">' + ICON.tasks + '</div><h3>Connect Baseboard</h3>' +
      '<p>Tasks come from Basecamp through the Baseboard extension, using the Basecamp login already in this Chrome. No passwords or tokens are stored here.</p></div>' +
      '<div class="os-note"><b>Needs Baseboard 2.1 or newer.</b> That version adds a small, safe bridge: it only answers this site (seo.edgemarketing.ca), only reads your own to-dos, projects and boards, and only creates or completes a to-do when you click here. Once it’s installed, open any Basecamp page once, then come back. This page connects by itself.</div>' +
      '<div style="margin-top:12px"><button type="button" class="os-btn" data-tt2="set">Paste the extension ID instead</button></div>';
    body.querySelector('[data-tt2]').addEventListener('click', () => { this.tab = 'set'; this.paint(); });
  },
  paintSettings(body){
    body.innerHTML = '<div class="os-form"><label>Baseboard extension ID</label><input class="os-in" data-f="id" placeholder="32 letters, from chrome://extensions" value="' + esc(Bridge.id) + '">' +
      '<label>Robert’s board: person and column to follow for SEO clients</label><div class="os-row"><input class="os-in" data-f="person" value="' + esc(Board.person()) + '"><input class="os-in" data-f="col" value="' + esc(Board.column()) + '"></div>' +
      '<div class="os-note">The SEO client list follows the cards in that column. A client whose card leaves it moves to <b>Inactive / Archived</b>; when the card comes back, so do they.</div>' +
      '<button type="button" class="os-btn go" data-save>Save</button><span class="os-sync-line" style="margin-top:4px"><i style="background:' + (Bridge.available() ? 'var(--os-good)' : 'var(--os-warn)') + '"></i>' + (Bridge.available() ? 'Baseboard connected' + (Bridge.hello ? ' (it said hello)' : '') : 'Not connected yet') + '</span></div>';
    body.querySelector('[data-save]').addEventListener('click', ev => {
      const id = body.querySelector('[data-f="id"]').value.trim();
      if (id && !/^[a-p]{32}$/.test(id)){ FX.toast('That doesn’t look like an extension ID', 'del'); return; }
      Bridge.id = id; setSetting('tidyboardId', id);
      setSetting('boardPerson', body.querySelector('[data-f="person"]').value.trim() || 'Robert');
      setSetting('boardColumn', body.querySelector('[data-f="col"]').value.trim() || 'SEO Clients');
      FX.done(ev.currentTarget, 'Saved'); this.refresh();
    });
  }
};
window.EDGE_tasks = {open: p => Tasks.open(p), refresh: () => Tasks.refresh()};

/* ======================================================================
   ROBERT'S BOARD → SEO client list
   ====================================================================== */
const ARCH = 'Inactive / Archived';
/* Google Ads-only clients live in their own folder: shown in Google Ads and Reporting, never in SEO. */
const ADS_FOLDER = 'Google Ads clients';
const adsFolder = () => (state.seoFolders || []).find(f => f && f.name === ADS_FOLDER) || null;
const isAdsOnly = c => { const f = adsFolder(); return !!(f && c && c.folderId === f.id); };
const isArchived = c => { const f = (state.seoFolders || []).find(x => x && x.id === c.folderId); return !!(f && /inactive|archiv/i.test(f.name)); };
const Board = {
  person: () => settings().boardPerson || 'Robert',
  column: () => settings().boardColumn || 'SEO Clients',
  archFolder(){
    let f = (state.seoFolders || []).find(x => x && /inactive|archiv/i.test(x.name));
    if (!f){ f = {id: (typeof uid === 'function' ? uid() : 'f' + Date.now().toString(36)), name: ARCH, collapsed: true, sortOrder: 1e6}; state.seoFolders = (state.seoFolders || []).concat([f]); }
    return f;
  },
  match(cards, c){
    const n = norm(c.name), d = normDomain(c.website).split('.')[0];
    return cards.find(t => { const tn = norm(t.title); return tn && (tn === n || tn.indexOf(n) === 0 || n.indexOf(tn) === 0 || (d && d.length > 3 && tn.replace(/ /g, '').indexOf(d) > -1)); });
  },
  async sync(loud){
    const btn = $('osBoardSync');
    if (!Bridge.available()){ if (loud){ Tasks.open(); Tasks.tab = 'set'; Tasks.paint(); FX.toast('Connect Baseboard first', 'sync'); } return; }
    btn && btn.classList.add('spin');
    try{
      const cards = await Bridge.call('boardColumn', {person: this.person(), column: this.column()});
      if (!Array.isArray(cards)) throw new Error('Baseboard didn’t find that column.');
      if (!cards.length) throw new Error('The "' + this.column() + '" column on ' + this.person() + '’s board is empty. Nothing changed, to be safe.');
      const arch = this.archFolder(), moved = [], back = [];
      seoOnly().forEach(c => {
        const on = !!this.match(cards, c), parked = isArchived(c);
        if (!on && !parked){ c.boardPrevFolder = c.folderId || ''; c.boardPrevStatus = c.status || 'Active'; c.folderId = arch.id; c.status = 'Paused'; c.archivedAt = Date.now(); c.archivedBy = 'tidyboard'; moved.push(c.name); }
        else if (on && parked && c.archivedBy === 'tidyboard'){ c.folderId = c.boardPrevFolder || ''; c.status = c.boardPrevStatus || 'Active'; delete c.archivedAt; delete c.archivedBy; back.push(c.name); }
      });
      const missing = cards.filter(t => !seoOnly().some(c => this.match([t], c)));
      setSetting('boardSyncAt', Date.now());
      if (moved.length || back.length){ try{ save(); seoApi().renderAll(); }catch(e){} }
      if (loud || moved.length || back.length){
        const parts = [];
        if (moved.length) parts.push(moved.length + ' moved to Inactive / Archived');
        if (back.length) parts.push(back.length + ' back to active');
        FX.toast(parts.length ? 'Robert’s board: ' + parts.join(', ') : 'SEO clients match Robert’s board', moved.length ? 'sync' : 'ok');
        if (back.length) FX.confetti(null, 80, 30);
      }
      if (loud && missing.length) this.offerAdd(missing, moved, back);
    }catch(e){ if (loud) FX.toast(e.message, 'del'); }
    btn && btn.classList.remove('spin');
  },
  offerAdd(missing, moved, back){
    const d = Drawer.open(dHead('Robert’s board', 'Cards in "' + esc(this.column()) + '" with no SEO client yet') + '<div class="os-db">' +
      (moved.length ? '<div class="os-note" style="margin-bottom:10px"><b>Archived:</b> ' + esc(moved.join(', ')) + '</div>' : '') +
      (back.length ? '<div class="os-note" style="margin-bottom:10px"><b>Back to active:</b> ' + esc(back.join(', ')) + '</div>' : '') +
      '<div class="os-tl">' + missing.map((t, i) => '<div class="os-t"><div class="os-t-b"><b>' + esc(t.title) + '</b><small>On the board, not in the SEO list</small></div><button type="button" class="os-btn" data-addc="' + i + '">' + ICON.plus + 'Add client</button></div>').join('') + '</div></div>');
    d.querySelectorAll('[data-addc]').forEach(b => b.addEventListener('click', () => {
      const t = missing[+b.dataset.addc];
      Drawer.close();
      /* The guided "New client" flow (edge-ui.js) when it's there; otherwise the plain add. */
      try{ if (window.edgeNewClient) window.edgeNewClient(t.title); else { const btn = $('seoAddClientBtn') || $('seoEmptyAddBtn'); if (btn) btn.click(); } }catch(e){}
    }));
  }
};

/* ======================================================================
   CHANNELS: Google Ads, Meta Ads, Facebook, Instagram, LinkedIn (read only)
   ====================================================================== */
const SOURCES = {
  google_ads: {l: 'Google Ads', c: '#4285F4'}, meta_ads: {l: 'Meta Ads', c: '#1877F2'},
  facebook: {l: 'Facebook', c: '#1877F2'}, instagram: {l: 'Instagram', c: '#E1306C'}, linkedin: {l: 'LinkedIn', c: '#0A66C2'}
};
/* Channel icons: each platform's own site icon (as analytics tools show sources), with a coloured letter if it can't load. */
const CH_DOM = {google_ads: 'ads.google.com', meta_ads: 'facebook.com', facebook: 'facebook.com', instagram: 'instagram.com', linkedin: 'linkedin.com', google: 'google.com', gbp: 'business.google.com', ga4: 'analytics.google.com', gsc: 'search.google.com'};
const chIcon = (src, size, cls) => {
  size = size || 18; const S = SOURCES[src] || {l: src, c: '#8795a1'};
  const d = CH_DOM[src];
  return '<span class="os-chi' + (cls ? ' ' + cls : '') + '" title="' + esc(S.l) + '" style="width:' + size + 'px;height:' + size + 'px;--chc:' + S.c + '"><b style="font-size:' + Math.round(size * .55) + 'px">' + esc(String(S.l).charAt(0)) + '</b>' +
    (d ? '<img alt="" src="https://www.google.com/s2/favicons?domain=' + d + '&sz=64" width="' + size + '" height="' + size + '" referrerpolicy="no-referrer" onload="this.classList.add(\'ok\')" onerror="this.remove()">' : '') + '</span>';
};
const Channels = {
  map: {}, loaded: false, unsub: null,
  key: (src, id) => src + '_' + String(id).replace(/[^\w-]/g, ''),
  col(){ return (typeof fbDb !== 'undefined' && fbDb && typeof fbUid !== 'undefined' && fbUid) ? fbDb.collection('users').doc(fbUid).collection('edgeChannels') : null; },
  start(){
    try{ const cache = JSON.parse(localStorage.getItem('osChannels') || '{}'); if (cache && typeof cache === 'object') this.map = cache; }catch(e){}
    const tryCol = () => {
      const col = this.col(); if (!col){ setTimeout(tryCol, 1500); return; }
      if (this.unsub) return;
      this.unsub = col.onSnapshot(snap => {
        const m = {};
        snap.forEach(doc => { try{ const d = doc.data(); m[doc.id] = Object.assign(JSON.parse(d.payload || '{}'), {source: d.source, _at: d.at, _by: d.by}); }catch(e){} });
        const changed = JSON.stringify(Object.keys(m).map(k => [k, m[k]._at])) !== JSON.stringify(Object.keys(this.map).map(k => [k, this.map[k]._at]));
        this.map = m; this.loaded = true;
        try{ localStorage.setItem('osChannels', JSON.stringify(m).slice(0, 4e6)); }catch(e){}
        if (changed){ if (section === 'ads') Ads.render(); paintBadges(); }
      }, () => {});
    };
    tryCol();
  },
  list(src){ return Object.keys(this.map).map(k => this.map[k]).filter(a => a && a.source === src && !a.hidden); },
  link(a){
    const o = (settings().links || {})[this.key(a.source, a.id)];
    if (o === 'none') return null;
    if (o) return seoClients().find(c => c.id === o) || null;
    const n = norm(a.clientName || a.name), d = normDomain(a.website || '');
    return seoClients().find(c => (d && normDomain(c.website) === d)) || seoClients().find(c => norm(c.name) === n) ||
      seoClients().find(c => { const cn = norm(c.name); return cn.length > 3 && (n.indexOf(cn) > -1 || cn.indexOf(n) > -1); }) || null;
  },
  setLink(a, clientId){ const L = Object.assign({}, settings().links || {}); L[this.key(a.source, a.id)] = clientId || 'none'; setSetting('links', L); },
  forClient(c){
    const out = {};
    Object.keys(SOURCES).forEach(src => {
      const acc = this.list(src).filter(a => { const l = this.link(a); return l && l.id === c.id; });
      if (acc.length) out[src] = acc.map(a => ({id: a.id, name: a.name, currency: a.currency, months: a.months || {}, daily: (a.daily || []).slice(-400)}));
    });
    return out;
  },
  latestMonth(src){
    let m = '';
    this.list(src).forEach(a => Object.keys(a.months || {}).forEach(k => { if (k > m) m = k; }));
    return m || ym(Date.now());
  },
  async ingest(payload){
    if (!payload || !SOURCES[payload.source] || !Array.isArray(payload.accounts)) throw new Error('Expected {source, accounts:[...]}');
    const col = this.col(); if (!col) throw new Error('Not signed in to the cloud yet.');
    const by = payload.collectedBy || meName(), at = Date.now();
    let n = 0;
    for (const a of payload.accounts){
      if (!a || a.id == null || !a.name) continue;
      const key = this.key(payload.source, a.id), prev = this.map[key] || {};
      /* New months add to old ones; a month read again replaces itself. */
      const months = Object.assign({}, prev.months || {}, a.months || {});
      const daily = {}; (prev.daily || []).concat(a.daily || []).forEach(r => { if (Array.isArray(r) && r[0]) daily[r[0]] = r; });
      const rec = Object.assign({}, prev, a, {months, daily: Object.keys(daily).sort().slice(-500).map(k => daily[k]), source: payload.source});
      delete rec._at; delete rec._by;
      const str = JSON.stringify(rec);
      if (str.length > 900000) throw new Error(a.name + ' is too big to store; send fewer days.');
      await col.doc(key).set({source: payload.source, id: String(a.id), name: String(a.name).slice(0, 200), payload: str, at, by});
      this.map[key] = Object.assign(rec, {_at: at, _by: by});
      n++;
    }
    if (section === 'ads') Ads.render();
    paintBadges();
    FX.toast(n + ' ' + SOURCES[payload.source].l + ' account' + (n === 1 ? '' : 's') + ' synced', 'sync');
    return {ok: true, saved: n};
  }
};
/* An ad account with no client yet gets one in the Google Ads clients folder, then is linked to it. */
Channels.addAdsClient = function (a, logoUrl){
  const api = seoApi(); if (!api.blank) throw new Error('Client records are not ready yet.');
  let f = adsFolder();
  if (!f){ f = {id: (typeof uid === 'function' ? uid() : 'f' + Date.now().toString(36)), name: ADS_FOLDER, collapsed: false, sortOrder: 9e5}; state.seoFolders = (state.seoFolders || []).concat([f]); }
  const c = api.blank(a.clientName || a.name);
  c.folderId = f.id; c.notes = 'Google Ads client (account ' + a.id + ')';
  if (logoUrl) c.logoUrl = logoUrl;
  state.seoClients.push(c);
  this.setLink(a, c.id);
  try{ save(); }catch(e){}
  return c;
};
window.EDGE_channelsFor = c => Promise.resolve(c ? Channels.forClient(c) : {});
/* What Claude calls after reading a dashboard in Chrome. */
window.EDGE_ingest = p => Channels.ingest(p);

/* ---------- what needs attention (read only: these are flags for a person, never changes) ---------- */
const Attention = {
  of(a){
    const out = [], m = Channels.latestMonth(a.source), pm = prevYm(m), cur = (a.months || {})[m] || {}, prev = (a.months || {})[pm] || {};
    const c = Channels.link(a);
    (a.alerts || []).forEach(x => out.push({lvl: 'bad', t: String(x)}));
    if (/suspend|cancel|closed/i.test(a.status || '')) out.push({lvl: 'bad', t: 'Account ' + String(a.status).toLowerCase()});
    if (!num(cur.spend) && c && !isArchived(c) && !/pause/i.test(c.status || '')) out.push({lvl: 'warn', t: 'No spend in ' + monthName(m)});
    if (num(cur.spend) > 100 && !num(cur.conversions)) out.push({lvl: 'bad', t: money(cur.spend) + ' spent, no conversions'});
    if (num(cur.conversions) && num(prev.conversions)){
      const cpa = cur.spend / cur.conversions, pcpa = prev.spend / prev.conversions;
      if (pcpa && cpa > pcpa * 1.3) out.push({lvl: 'warn', t: 'Cost per conversion up ' + Math.round((cpa / pcpa - 1) * 100) + '% (' + money(cpa) + ')'});
    }
    if (num(prev.spend) > 50 && num(cur.spend) > num(prev.spend) * 1.4) out.push({lvl: 'warn', t: 'Spend up ' + Math.round((cur.spend / prev.spend - 1) * 100) + '% on last month'});
    if (num(cur.conversions) && num(prev.conversions) > 4 && cur.conversions < prev.conversions * 0.6) out.push({lvl: 'bad', t: 'Conversions down ' + Math.round((1 - cur.conversions / prev.conversions) * 100) + '%'});
    if (a.source === 'google_ads' && num(cur.impressions) > 1000 && pct(cur.clicks, cur.impressions) < 1.2) out.push({lvl: 'warn', t: 'Low CTR: ' + pct(cur.clicks, cur.impressions).toFixed(2) + '%'});
    if (a.budgetLimited) out.push({lvl: 'warn', t: 'Limited by budget'});
    return out;
  },
  level(list){ return list.some(x => x.lvl === 'bad') ? 'bad' : list.length ? 'warn' : ''; }
};

function paintBadges(){
  const set = (k, n, warn) => { const b = document.querySelector('[data-badge="' + k + '"]'); if (b){ b.textContent = n ? String(n) : ''; b.classList.toggle('warn', !!warn); } };
  const att = Channels.list('google_ads').concat(Channels.list('meta_ads')).filter(a => Attention.level(Attention.of(a)) === 'bad').length;
  set('ads', att);
  set('maint', window.EDGE_maint && EDGE_maint.due ? EDGE_maint.due().length : 0, true);
  try{ paintHubMeta(); }catch(e){}
}

/* ======================================================================
   GOOGLE ADS SECTION (and the Paid Social tab)
   ====================================================================== */
const spark = (vals, color) => {
  vals = (vals || []).map(num); if (vals.length < 2) return '';
  const mx = Math.max.apply(null, vals) || 1, w = 240, h = 34;
  const pts = vals.map((v, i) => (i / (vals.length - 1) * w).toFixed(1) + ',' + (h - 3 - v / mx * (h - 6)).toFixed(1));
  const id = 'g' + Math.random().toString(36).slice(2, 7);
  return '<svg class="os-spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + color + '" stop-opacity=".28"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
    '<path d="M0,' + h + ' L' + pts.join(' L') + ' L' + w + ',' + h + ' Z" fill="url(#' + id + ')"/><polyline points="' + pts.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
};
/* ---------- Social media (organic): Facebook, Instagram, LinkedIn, one card per client ---------- */
const SOC_SRC = ['facebook', 'instagram', 'linkedin'];
const Social = {
  render(st){
    const all = [].concat(...SOC_SRC.map(s => Channels.list(s).map(a => ({a, src: s, c: Channels.link(a)}))));
    const m = SOC_SRC.map(s => Channels.latestMonth(s)).filter(Boolean).sort().pop() || prevYm(ym(Date.now())), pm = prevYm(m);
    const byClient = {};
    all.forEach(r => { const k = r.c ? r.c.id : 'x-' + r.a.id; (byClient[k] = byClient[k] || {c: r.c, name: r.c ? r.c.name : r.a.name, nets: []}).nets.push(r); });
    const g = (r, mm, k) => num((((r.a.months || {})[mm]) || {})[k]);
    const tot = k => all.reduce((t, r) => t + g(r, m, k), 0), ptot = k => all.reduce((t, r) => t + g(r, pm, k), 0);
    const kpi = (l, k) => { const cur = tot(k), prev = ptot(k), d = prev ? Math.round((cur - prev) / prev * 100) : null;
      return '<div class="os-kpi"><small>' + esc(l) + '</small><b>' + count(cur) + '</b><div class="d ' + (d > 0 ? 'up' : d < 0 ? 'down' : '') + '">' + (d == null ? '&nbsp;' : (d > 0 ? '▲ ' : d < 0 ? '▼ ' : '') + Math.abs(d) + '% vs ' + esc(monthName(pm).split(' ')[0])) + '</div></div>'; };
    st.innerHTML = '<div class="os-head"><div><h1 class="os-h1ic"><span class="os-icpair">' + chIcon('facebook', 30, 'ring') + chIcon('instagram', 30, 'ring') + chIcon('linkedin', 30, 'ring') + '</span>Social media</h1><p>Facebook, Instagram and LinkedIn for every client: followers, reach, engagement and the best posts. Read from each network by Claude once a month, or typed in here.</p></div><span class="sp"></span>' +
      '<span class="os-chip ro">Read only</span><button type="button" class="os-btn os-entry-btn" data-entry>' + ICON.plus + 'Enter numbers</button>' +
      '<div class="os-tabs"><button type="button" class="os-tab" data-src="google_ads">' + chIcon('google_ads', 16) + 'Google Ads</button><button type="button" class="os-tab" data-src="meta_ads">' + chIcon('facebook', 16) + chIcon('instagram', 16) + 'Paid Social</button><button type="button" class="os-tab on" data-src="social">' + chIcon('instagram', 16) + chIcon('linkedin', 16) + 'Social media</button></div>' +
      '<span class="os-chip">' + esc(monthName(m)) + '</span></div>';
    if (!all.length){
      st.innerHTML += '<div class="os-empty"><div class="ic">' + chIcon('instagram', 40) + '</div><h3>No social media numbers yet</h3><p>Claude reads Facebook, Instagram and LinkedIn for every client once a month, or anyone can type a month in with <b>Enter numbers</b>. The numbers show here and in each client’s Team and Client reports.</p></div>';
      Ads.wire(st); return;
    }
    st.innerHTML += '<div class="os-kpis">' + kpi('Followers', 'followers') + kpi('New followers', 'newFollowers') + kpi('Reach', 'reach') + kpi('Impressions', 'impressions') + kpi('Engagements', 'engagement') + kpi('Posts', 'posts') + '</div>' +
      '<div class="os-h2">Clients <span class="n">' + Object.keys(byClient).length + '</span></div><div class="os-soc-grid">' +
      Object.keys(byClient).map((k, i) => { const B = byClient[k];
        return '<div class="os-soc" style="--d:' + (i * 40) + 'ms"><div class="os-soc-h">' + (B.c ? logoHtml(logoOf(B.c), B.c.name) : '<span class="os-logo mono">' + esc(initials(B.name)) + '</span>') + '<b>' + esc(B.name) + '</b>' + (B.c ? '<button type="button" class="os-btn sm" data-sentry="' + esc(B.c.id) + '">Edit numbers</button>' : '') + '</div>' +
          B.nets.map(r => { const f = g(r, m, 'followers'), pf = g(r, pm, 'followers'), rc = g(r, m, r.src === 'linkedin' ? 'impressions' : 'reach'), en = g(r, m, 'engagement');
            const hist = []; let x = m; for (let j = 0; j < 6; j++){ hist.unshift(g(r, x, 'followers')); x = prevYm(x); }
            const mx = Math.max(1, ...hist), mn = Math.min(...hist.filter(v => v > 0), mx);
            const sp = hist.map((v, j) => (j ? 'L' : 'M') + (j * 20) + ' ' + (v ? 28 - (v - mn) / Math.max(1, mx - mn) * 24 : 28).toFixed(1)).join(' ');
            return '<div class="os-soc-n">' + chIcon(r.src, 22) + '<div class="t"><small>' + esc(SOURCES[r.src].l) + '</small><b>' + count(f) + ' <em>followers</em></b>' + (pf ? '<i class="' + (f >= pf ? 'up' : 'down') + '">' + (f >= pf ? '+' : '') + count(f - pf) + '</i>' : '') + '</div>' +
              '<svg viewBox="0 0 100 30" class="os-soc-sp"><path d="' + sp + '" fill="none" stroke="' + SOURCES[r.src].c + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              '<div class="os-soc-m"><span><b>' + count(rc) + '</b>' + (r.src === 'linkedin' ? 'impressions' : 'reach') + '</span><span><b>' + count(en) + '</b>engagements</span></div></div>'; }).join('') + '</div>'; }).join('') + '</div>';
    Ads.wire(st);
    st.querySelectorAll('[data-sentry]').forEach(b => b.addEventListener('click', () => Entry.open({src: 'facebook', client: b.dataset.sentry})));
  }
};

/* ---------- Enter numbers: one client, one channel, one month, typed in by the team ----------
   Saved exactly like Claude's monthly read (EDGE_ingest), so every widget reads it the same way. */
const ENTRY_FIELDS = {
  google_ads: [['impressions', 'Impressions'], ['clicks', 'Clicks'], ['conversions', 'Conversions'], ['spend', 'Cost ($)'], ['phoneCalls', 'Phone calls']],
  meta_ads: [['spend', 'Amount spent ($)'], ['reach', 'Reach'], ['impressions', 'Impressions'], ['clicks', 'Link clicks'], ['conversions', 'Results']],
  facebook: [['followers', 'Page followers (end of month)'], ['newFollowers', 'New followers'], ['reach', 'Reach'], ['impressions', 'Impressions'], ['engagement', 'Engagements'], ['posts', 'Posts'], ['pageViews', 'Page visits'], ['videoViews', 'Video views']],
  instagram: [['followers', 'Followers (end of month)'], ['newFollowers', 'New followers'], ['reach', 'Reach'], ['impressions', 'Impressions'], ['engagement', 'Engagements'], ['posts', 'Posts'], ['profileViews', 'Profile visits'], ['websiteClicks', 'Website clicks']],
  linkedin: [['followers', 'Followers (end of month)'], ['newFollowers', 'New followers'], ['impressions', 'Impressions'], ['clicks', 'Clicks'], ['engagement', 'Engagements'], ['posts', 'Posts']]
};
const ENTRY_LISTS = {
  google_ads: [['campaigns', 'Campaigns', 'name, cost, clicks, impressions, conversions', ['name', 'spend', 'clicks', 'impressions', 'conversions']],
    ['conversionActions', 'Conversion actions', 'name, conversions', ['name', 'conversions']],
    ['keywords', 'Keywords', 'keyword, clicks, impressions, cost, conversions', ['keyword', 'clicks', 'impressions', 'spend', 'conversions']]],
  meta_ads: [['campaigns', 'Campaigns', 'name, spent, reach, link clicks, results', ['name', 'spend', 'reach', 'clicks', 'conversions']]],
  facebook: [['topPosts', 'Top posts', 'date | text | reach | engagements | link', ['date', 'text', 'reach', 'engagement', 'url']]],
  instagram: [['topPosts', 'Top posts', 'date | text | reach | engagements | link', ['date', 'text', 'reach', 'engagement', 'url']]],
  linkedin: [['topPosts', 'Top posts', 'date | text | impressions | engagements | link', ['date', 'text', 'impressions', 'engagement', 'url']]]
};
const Entry = {
  open(o){
    o = o || {};
    const clients = seoClients().filter(c => !isArchived(c)).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const st = {src: ENTRY_FIELDS[o.src] ? o.src : 'google_ads', cid: o.client || (activeClient() || {}).id || (clients[0] || {}).id, m: o.month || prevYm(ym(Date.now()))};
    const d = Drawer.open(dHead('Enter numbers', 'Typed numbers are saved exactly like Claude’s monthly read, and every report widget uses them.') + '<div class="os-db" data-eb></div>', {wide: true});
    const body = d.querySelector('[data-eb]');
    const acctOf = () => { const c = clients.find(x => x.id === st.cid); if (!c) return null; const have = (Channels.forClient(c)[st.src] || [])[0]; return {c, a: have ? Channels.list(st.src).find(x => String(x.id) === String(have.id)) : null}; };
    const paint = () => {
      const A = acctOf(), cur = A && A.a ? ((A.a.months || {})[st.m] || {}) : {};
      const listTxt = (k, fields, sep) => (cur[k] || []).map(r => fields.map(f => r[f] == null ? '' : r[f]).join(sep)).join('\n');
      body.innerHTML = '<div class="os-entry">' +
        '<div class="os-entry-row"><label>Client<select data-ec>' + clients.map(c => '<option value="' + esc(c.id) + '"' + (c.id === st.cid ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select></label>' +
        '<label>Month<input type="month" data-em value="' + esc(st.m) + '"></label></div>' +
        '<div class="os-entry-tabs">' + Object.keys(ENTRY_FIELDS).map(k => '<button type="button" data-es="' + k + '" class="' + (k === st.src ? 'on' : '') + '">' + chIcon(k, 16) + esc(SOURCES[k].l) + '</button>').join('') + '</div>' +
        (A && A.a ? '<div class="os-entry-note">Editing <b>' + esc(A.a.name) + '</b>' + (A.a._by ? ' · last saved by ' + esc(A.a._by) : '') + '. Blank fields keep what is there.</div>' : '<div class="os-entry-note">No ' + esc(SOURCES[st.src].l) + ' numbers for this client yet: saving starts them.</div>') +
        '<div class="os-entry-grid">' + ENTRY_FIELDS[st.src].map(([k, l]) => '<label>' + esc(l) + '<input type="number" step="any" min="0" data-ef="' + k + '" value="' + (cur[k] != null ? esc(cur[k]) : '') + '" placeholder="—"></label>').join('') + '</div>' +
        (ENTRY_LISTS[st.src] || []).map(([k, l, hint, fields]) => { const sep = k === 'topPosts' ? ' | ' : ', '; return '<label class="os-entry-list">' + esc(l) + ' <small>one per line: ' + esc(hint) + '</small><textarea rows="4" data-el="' + k + '" placeholder="' + esc(hint) + '">' + esc(listTxt(k, fields, sep)) + '</textarea></label>'; }).join('') +
        '<div class="os-entry-acts"><button type="button" class="os-btn" data-ex>Cancel</button><button type="button" class="os-btn go" data-eok>' + ICON.check + 'Save ' + esc(monthName(st.m)) + '</button></div></div>';
      body.querySelector('[data-ec]').addEventListener('change', e => { st.cid = e.target.value; paint(); });
      body.querySelector('[data-em]').addEventListener('change', e => { if (/^\d{4}-\d{2}$/.test(e.target.value)){ st.m = e.target.value; paint(); } });
      body.querySelectorAll('[data-es]').forEach(b => b.addEventListener('click', () => { st.src = b.dataset.es; paint(); }));
      body.querySelector('[data-ex]').addEventListener('click', () => Drawer.close());
      body.querySelector('[data-eok]').addEventListener('click', async e => {
        const btn = e.currentTarget, A2 = acctOf(); if (!A2) return;
        const month = Object.assign({}, cur);
        body.querySelectorAll('[data-ef]').forEach(i => { if (i.value !== '') month[i.dataset.ef] = Number(i.value); });
        (ENTRY_LISTS[st.src] || []).forEach(([k, , , fields]) => { const ta = body.querySelector('[data-el="' + k + '"]'); if (!ta) return;
          const sep = k === 'topPosts' ? '|' : ',';
          const rows = ta.value.split('\n').map(x => x.trim()).filter(Boolean).map(line => { const parts = line.split(sep).map(x => x.trim()); const r = {};
            fields.forEach((f, j) => { const v = parts[j]; if (v == null || v === '') return; r[f] = /^(name|keyword|text|date|url|term)$/.test(f) ? v.slice(0, 400) : Number(String(v).replace(/[$,%\s]/g, '')) || 0; }); return r; });
          month[k] = rows; });
        const id = A2.a ? A2.a.id : 'manual-' + A2.c.id;
        btn.disabled = true;
        try{
          await Channels.ingest({source: st.src, collectedBy: meName() + ' (typed in)', accounts: [{id, name: A2.a ? A2.a.name : A2.c.name, clientName: A2.c.name, months: {[st.m]: month}}]});
          if (!A2.a) Channels.setLink({source: st.src, id}, A2.c.id);
          try{ window.EdgeReportsApp && EdgeReportsApp.addChannelPages && EdgeReportsApp.addChannelPages(A2.c, [st.src]); }catch(err){}
          FX.done(btn, SOURCES[st.src].l + ' · ' + monthName(st.m) + ' saved for ' + A2.c.name);
          paint();
        }catch(err){ FX.toast('Couldn’t save: ' + err.message, 'del'); btn.disabled = false; }
      });
    };
    paint();
  }
};
window.EDGE_entry = o => Entry.open(o);
/* ---------- Charts for the Google Ads and Meta account drawer ---------- */
const AdViz = {
  spark(vals, col){
    const v = vals.length ? vals : [0], mx = Math.max(...v, 1), mn = Math.min(...v), W = 120, H = 34;
    const pts = v.map((x, i) => [v.length > 1 ? i / (v.length - 1) * W : W / 2, H - 4 - (mx === mn ? 0.5 : (x - mn) / (mx - mn)) * (H - 8)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    return '<svg class="adv-spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none"><path d="' + d + ' L' + W + ' ' + H + ' L0 ' + H + 'Z" fill="' + col + '" opacity=".12"/><path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
      '<circle cx="' + pts[pts.length - 1][0] + '" cy="' + pts[pts.length - 1][1] + '" r="3" fill="' + col + '"/></svg>';
  },
  hero(list, vs){
    return '<div class="adv-hero">' + list.map(([l, shown, v, p, hist, col, lowerBetter], i) => {
      const dl = p ? Math.round((v - p) / p * 100) : null, good = dl == null ? null : (lowerBetter ? dl <= 0 : dl >= 0);
      return '<div class="adv-k" style="--c:' + col + ';--d:' + (i * 60) + 'ms"><small>' + esc(l) + '</small><b>' + shown + '</b>' +
        '<span class="adv-dl ' + (dl == null ? '' : good ? 'up' : 'down') + '">' + (dl == null ? 'no earlier month' : (dl > 0 ? '▲ ' : dl < 0 ? '▼ ' : '') + Math.abs(dl) + '% vs ' + esc(vs)) + '</span>' + this.spark(hist, col) + '</div>';
    }).join('') + '</div>';
  },
  months(rows, isMoney, curM){
    if (!rows.length) return '<div class="adv-empty">No months yet.</div>';
    const W = 640, H = 220, P = 30, mx = Math.max(...rows.map(r => r[1]), 1), bw = (W - P * 2) / rows.length;
    const f = v => isMoney ? money(v) : fmt(Math.round(v * 100) / 100);
    const bars = rows.map((r, i) => { const h = r[1] / mx * (H - 60), x = P + i * bw + bw * 0.18, y = H - 28 - h, on = r[0] === curM;
      return '<g class="adv-bar' + (on ? ' on' : '') + '" data-tip="' + esc(monthName(r[0]) + ': ' + f(r[1])) + '"><rect x="' + x.toFixed(1) + '" y="' + (H - 28) + '" width="' + (bw * 0.64).toFixed(1) + '" height="0" rx="6" style="--y:' + y.toFixed(1) + 'px;--h:' + h.toFixed(1) + 'px;--i:' + i + '"/>' +
        '<text x="' + (x + bw * 0.32).toFixed(1) + '" y="' + (y - 8).toFixed(1) + '" class="v">' + esc(f(r[1])) + '</text><text x="' + (x + bw * 0.32).toFixed(1) + '" y="' + (H - 8) + '" class="m">' + esc(monthName(r[0]).slice(0, 3)) + '</text></g>'; }).join('');
    const pts = rows.map((r, i) => [P + i * bw + bw / 2, H - 28 - r[1] / mx * (H - 60)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="adv-msvg"><defs><linearGradient id="advg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#4285F4"/><stop offset="1" stop-color="#8AB4F8"/></linearGradient></defs>' +
      [0.25, 0.5, 0.75, 1].map(t => '<line x1="' + P + '" x2="' + (W - P) + '" y1="' + (H - 28 - t * (H - 60)).toFixed(1) + '" y2="' + (H - 28 - t * (H - 60)).toFixed(1) + '" class="g"/>').join('') +
      bars + '<path d="' + line + '" class="ln"/>' + pts.map(p => '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.5" class="dot"/>').join('') + '</svg>';
  },
  campaigns(camps){
    const tot = camps.reduce((t, c) => t + num(c.spend), 0) || 1, cols = ['#4285F4', '#34A853', '#FBBC04', '#EA4335', '#A142F4', '#24C1E0', '#F538A0', '#5F6368', '#FA7B17', '#1E8E3E'];
    let acc = 0; const R = 54, C = 2 * Math.PI * R;
    const ring = camps.map((c, i) => { const f = num(c.spend) / tot, seg = '<circle r="' + R + '" cx="70" cy="70" fill="none" stroke="' + cols[i % cols.length] + '" stroke-width="20" stroke-dasharray="' + (f * C).toFixed(2) + ' ' + C.toFixed(2) + '" stroke-dashoffset="' + (-acc * C).toFixed(2) + '" data-tip="' + esc(c.name + ': ' + money(c.spend) + ' (' + Math.round(f * 100) + '%)') + '" class="adv-seg-arc" style="--i:' + i + '"/>'; acc += f; return seg; }).join('');
    const mxc = Math.max(...camps.map(c => num(c.conversions)), 1);
    return '<div class="adv-camp"><div class="adv-donut"><svg viewBox="0 0 140 140"><g transform="rotate(-90 70 70)">' + ring + '</g></svg><div class="adv-donut-c"><b>' + money(tot) + '</b><small>spend</small></div></div>' +
      '<div class="adv-crows">' + camps.map((c, i) => { const cp = num(c.conversions) ? num(c.spend) / num(c.conversions) : 0;
        return '<div class="adv-crow" style="--i:' + i + '"><i style="background:' + cols[i % cols.length] + '"></i><div class="t"><b>' + esc(c.name) + '</b><div class="adv-cbar"><span style="width:' + (num(c.spend) / tot * 100).toFixed(1) + '%;background:' + cols[i % cols.length] + '"></span></div></div>' +
          '<div class="adv-cm"><span><b>' + money(c.spend) + '</b>spend</span><span><b>' + fmt(c.clicks) + '</b>clicks</span><span class="cv"><b>' + fmt(c.conversions) + '</b>conv.<em style="width:' + (num(c.conversions) / mxc * 100).toFixed(0) + '%"></em></span><span><b>' + (cp ? money(cp) : '—') + '</b>per conv.</span></div></div>'; }).join('') + '</div></div>';
  },
  bars(rows, col){
    const mx = Math.max(...rows.map(r => r[1]), 1);
    return '<div class="adv-bars">' + rows.slice(0, 10).map((r, i) => '<div class="adv-br" style="--i:' + i + '"><div class="l"><span>' + esc(r[0]) + '</span><em>' + esc(r[2]) + '</em></div><div class="b"><span style="width:' + (r[1] / mx * 100).toFixed(1) + '%;background:' + col + '"></span></div></div>').join('') + '</div>';
  },
  cloud(terms){
    const mx = Math.max(...terms.map(t => num(t.clicks)), 1);
    return '<div class="adv-cloud">' + terms.slice(0, 14).map((t, i) => { const w = num(t.clicks) / mx;
      return '<span style="--w:' + w.toFixed(2) + ';--i:' + i + '" data-tip="' + esc(t.term + ': ' + fmt(t.clicks) + ' clicks' + (num(t.conversions) ? ', ' + fmt(t.conversions) + ' conv.' : '')) + '">' + esc(t.term) + (num(t.conversions) ? '<i>' + fmt(t.conversions) + '</i>' : '') + '</span>'; }).join('') + '</div>';
  },
  /* Desk band: all accounts' spend and conversions by month, and where this month's money went. */
  desk(rows, accts, m, src){
    if (!accts.length) return '';
    const ms = []; let x = m; for (let i = 0; i < 6; i++){ ms.unshift(x); x = prevYm(x); }
    const sum = (mm, k) => accts.reduce((t, a) => t + num(((a.months || {})[mm] || {})[k]), 0);
    const sp = ms.map(mm => sum(mm, 'spend')), cv = ms.map(mm => sum(mm, 'conversions'));
    const W = 560, H = 210, P = 26, bw = (W - P * 2) / ms.length, mx = Math.max(...sp, 1), mc = Math.max(...cv, 1);
    const bars = ms.map((mm, i) => { const h = sp[i] / mx * (H - 64), bx = P + i * bw + bw * 0.2, y = H - 28 - h;
      return '<g class="adv-bar' + (mm === m ? ' on' : '') + '" data-tip="' + esc(monthName(mm) + ': ' + money(sp[i]) + ' spent · ' + fmt(Math.round(cv[i])) + ' ' + (src === 'google_ads' ? 'conversions' : 'results')) + '"><rect x="' + bx.toFixed(1) + '" y="' + (H - 28) + '" width="' + (bw * 0.6).toFixed(1) + '" height="0" rx="7" style="--y:' + y.toFixed(1) + 'px;--h:' + h.toFixed(1) + 'px;--i:' + i + '"/>' +
        '<text x="' + (bx + bw * 0.3).toFixed(1) + '" y="' + (H - 8) + '" class="m">' + esc(monthName(mm).slice(0, 3)) + '</text></g>'; }).join('');
    const pts = ms.map((mm, i) => [P + i * bw + bw / 2, H - 28 - cv[i] / mc * (H - 64)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const top = rows.slice().sort((a, b) => num(b.cur.spend) - num(a.cur.spend)).filter(r => num(r.cur.spend) > 0).slice(0, 8), tmx = Math.max(...top.map(r => num(r.cur.spend)), 1);
    const cols = ['#4285F4', '#34A853', '#FBBC04', '#EA4335', '#A142F4', '#24C1E0', '#F538A0', '#FA7B17'];
    return '<div class="adv-desk"><div class="adv-card"><div class="adv-ch"><b>Spend and ' + (src === 'google_ads' ? 'conversions' : 'results') + ', all accounts</b><span class="adv-sub">last 6 months</span><span class="adv-key"><i class="b"></i>Spend<i class="l"></i>' + (src === 'google_ads' ? 'Conversions' : 'Results') + '</span></div>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="adv-msvg"><defs><linearGradient id="advg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#4285F4"/><stop offset="1" stop-color="#8AB4F8"/></linearGradient></defs>' +
      [0.33, 0.66, 1].map(t => '<line x1="' + P + '" x2="' + (W - P) + '" y1="' + (H - 28 - t * (H - 64)).toFixed(1) + '" y2="' + (H - 28 - t * (H - 64)).toFixed(1) + '" class="g"/>').join('') + bars +
      '<path d="' + line + '" class="adv-cvl"/>' + pts.map((p, i) => '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4" class="adv-cvd" data-tip="' + esc(monthName(ms[i]) + ': ' + fmt(Math.round(cv[i])) + (src === 'google_ads' ? ' conversions' : ' results')) + '"/>').join('') + '</svg></div>' +
      '<div class="adv-card"><div class="adv-ch"><b>Where the money went</b><span class="adv-sub">' + esc(monthName(m)) + '</span></div><div class="adv-race">' +
      top.map((r, i) => '<button type="button" class="adv-rr" data-acct="' + esc(Channels.key(src, r.a.id)) + '" style="--i:' + i + '"><span class="n">' + esc(r.c ? r.c.name : r.a.name) + '</span><span class="b"><span style="width:' + (num(r.cur.spend) / tmx * 100).toFixed(1) + '%;background:' + cols[i % cols.length] + '"></span></span><span class="v">' + money(r.cur.spend) + '</span></button>').join('') +
      (top.length ? '' : '<div class="adv-empty">No spend this month.</div>') + '</div></div></div>';
  },
  wireTips(root){
    let tip = document.querySelector('.adv-tip');
    if (!tip){ tip = document.createElement('div'); tip.className = 'adv-tip'; document.body.appendChild(tip); }
    root.querySelectorAll('[data-tip]').forEach(el => {
      if (el._tw) return; el._tw = 1;
      el.addEventListener('mouseenter', () => { tip.textContent = el.dataset.tip; tip.classList.add('on'); });
      el.addEventListener('mousemove', e => { tip.style.left = e.clientX + 'px'; tip.style.top = (e.clientY - 12) + 'px'; });
      el.addEventListener('mouseleave', () => tip.classList.remove('on'));
    });
  }
};
const Ads = {
  tab: 'google_ads', filter: '', month: '',
  render(){
    ensureStage();
    const st = $('adsStage'); if (!st) return;
    if (this.tab === 'social'){ Social.render(st); return; }
    const src = this.tab, accts = Channels.list(src);
    const m = this.month && accts.some(a => (a.months || {})[this.month]) ? this.month : Channels.latestMonth(src), pm = prevYm(m);
    const months = Array.from(new Set([].concat.apply([], accts.map(a => Object.keys(a.months || {}))))).sort().reverse().slice(0, 13);
    const tot = (mm, k) => accts.reduce((t, a) => t + num(((a.months || {})[mm] || {})[k]), 0);
    const kpi = (l, cur, prev, f, lower) => { const d = prev ? Math.round((cur - prev) / prev * 100) : null, good = d == null ? '' : (lower ? d < 0 : d > 0) ? 'up' : d === 0 ? '' : 'down';
      return '<div class="os-kpi"><small>' + chIcon(src === 'google_ads' ? 'google_ads' : 'facebook', 14) + esc(l) + '</small><b>' + f(cur) + '</b><div class="d ' + good + '">' + (d == null ? '&nbsp;' : (d > 0 ? '▲ ' : d < 0 ? '▼ ' : '') + Math.abs(d) + '% vs ' + esc(monthName(pm).split(' ')[0])) + '</div></div>'; };
    const sp = tot(m, 'spend'), cl = tot(m, 'clicks'), im = tot(m, 'impressions'), cv = tot(m, 'conversions');
    const psp = tot(pm, 'spend'), pcl = tot(pm, 'clicks'), pim = tot(pm, 'impressions'), pcv = tot(pm, 'conversions');
    const last = accts.reduce((t, a) => Math.max(t, a._at || 0), 0), lastBy = (accts.find(a => a._at === last) || {})._by || '';
    const stale = last && Date.now() - last > 35 * 864e5;
    const rows = accts.map(a => ({a, att: Attention.of(a), c: Channels.link(a), cur: (a.months || {})[m] || {}}))
      .filter(r => !this.filter || norm(r.a.name + ' ' + (r.c ? r.c.name : '')).indexOf(norm(this.filter)) > -1)
      .sort((x, y) => (Attention.level(y.att) === 'bad') - (Attention.level(x.att) === 'bad') || num(y.cur.spend) - num(x.cur.spend));
    const attn = rows.filter(r => r.att.length);
    st.innerHTML = '<div class="os-head"><div><h1 class="os-h1ic">' + (src === 'google_ads' ? chIcon('google_ads', 34, 'ring') + 'Google Ads' : '<span class="os-icpair">' + chIcon('facebook', 30, 'ring') + chIcon('instagram', 30, 'ring') + '</span>Paid Social') + '</h1><p>' +
      (src === 'google_ads' ? 'Every Google Ads account, read only: the month’s numbers, campaigns and the accounts that need a look.' : 'Facebook and Instagram ads (Meta Ads Manager), read only.') + '</p></div><span class="sp"></span>' +
      '<span class="os-chip ro">Read only</span><button type="button" class="os-btn os-entry-btn" data-entry>' + ICON.plus + 'Enter numbers</button>' +
      '<div class="os-tabs"><button type="button" class="os-tab' + (src === 'google_ads' ? ' on' : '') + '" data-src="google_ads">' + chIcon('google_ads', 16) + 'Google Ads</button><button type="button" class="os-tab' + (src === 'meta_ads' ? ' on' : '') + '" data-src="meta_ads">' + chIcon('facebook', 16) + chIcon('instagram', 16) + 'Paid Social</button><button type="button" class="os-tab" data-src="social">' + chIcon('instagram', 16) + chIcon('linkedin', 16) + 'Social media</button></div>' +
      (months.length ? '<select class="os-sel" data-month>' + months.map(x => '<option value="' + x + '"' + (x === m ? ' selected' : '') + '>' + esc(monthName(x)) + '</option>').join('') + '</select>' : '') + '</div>';
    if (!accts.length){
      st.innerHTML += '<div class="os-empty"><div class="ic">' + ICON.ads + '</div><h3>No ' + (src === 'google_ads' ? 'Google Ads' : 'Meta Ads') + ' data yet</h3>' +
        '<p>This section never connects to an ad account directly and can’t change one. Once a month, Claude opens ' + (src === 'google_ads' ? 'Google Ads (every account under your manager account)' : 'Meta Ads Manager (every ad account the team can see)') + ' in Chrome, reads the numbers, campaigns and any warnings, and saves them here. Logos come from each client’s SEO record.</p>' +
        '<p style="margin-top:10px"><span class="os-sync-line stale"><i></i>Waiting for the first read</span></p></div>';
      this.wire(st); return;
    }
    st.innerHTML += '<div class="os-kpis">' + (src === 'google_ads'
      ? kpi('Spend', sp, psp, money) + kpi('Clicks', cl, pcl, fmt) + kpi('Impressions', im, pim, fmt) + kpi('CTR', pct(cl, im), pct(pcl, pim), v => v.toFixed(2) + '%') + kpi('Conversions', cv, pcv, v => (Math.round(v * 10) / 10).toLocaleString()) + kpi('Cost / conv.', cv ? sp / cv : 0, pcv ? psp / pcv : 0, money, true)
      : kpi('Amount spent', sp, psp, money) + kpi('Reach', tot(m, 'reach'), tot(pm, 'reach'), fmt) + kpi('Impressions', im, pim, fmt) + kpi('Link clicks', cl, pcl, fmt) + kpi('Results', cv, pcv, fmt) + kpi('Cost / result', cv ? sp / cv : 0, pcv ? psp / pcv : 0, money, true)) + '</div>' +
      AdViz.desk(rows, accts, m, src) +
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><input class="os-in" data-q placeholder="Find an account or client" value="' + esc(this.filter) + '" style="width:260px"><span class="os-grow"></span>' +
      '<span class="os-sync-line' + (stale ? ' stale' : '') + '"><i></i>Read from ' + (src === 'google_ads' ? 'Google Ads' : 'Ads Manager') + ' ' + (last ? new Date(last).toLocaleDateString('en-CA', {month: 'short', day: 'numeric'}) : '') + (lastBy ? ' by ' + esc(lastBy) : '') + (stale ? ' · due for a new read' : '') + '</span></div>' +
      (attn.length ? '<div class="os-h2">Needs attention <span class="n">' + attn.length + '</span></div><div class="os-attn">' + attn.slice(0, 9).map(r => '<div class="os-attn-c ' + (Attention.level(r.att) === 'bad' ? '' : 'warn') + '" data-acct="' + esc(Channels.key(src, r.a.id)) + '">' +
        logoHtml(r.c ? logoOf(r.c) : r.a.logo, r.a.name) + '<div style="min-width:0"><b>' + esc(r.c ? r.c.name : r.a.name) + '</b><ul>' + r.att.slice(0, 3).map(x => '<li>' + esc(x.t) + '</li>').join('') + '</ul></div></div>').join('') + '</div>' : '<div class="os-h2">Needs attention <span class="n">none this month 🎉</span></div>') +
      '<div class="os-h2">All accounts <span class="n">' + rows.length + '</span></div><div class="os-grid">' + rows.map((r, i) => {
        const a = r.a, cur = r.cur, lvl = Attention.level(r.att);
        const trend = Object.keys(a.months || {}).sort().slice(-8).map(k => num(a.months[k][src === 'google_ads' ? 'conversions' : 'spend']));
        return '<div class="os-acct" style="animation-delay:' + Math.min(i * 30, 600) + 'ms" data-acct="' + esc(Channels.key(src, a.id)) + '" tabindex="0">' +
          '<div class="os-acct-h"><span class="os-acct-lg">' + logoHtml(r.c ? logoOf(r.c) : a.logo, a.name) + chIcon(src === 'google_ads' ? 'google_ads' : 'facebook', 16, 'badge') + '</span>' + '<div class="os-acct-n"><b>' + esc(r.c ? r.c.name : a.name) + '</b><small>' + esc(src === 'google_ads' ? (a.id ? String(a.id).replace(/^(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3') : '') : a.name) + '</small></div><span class="os-dot ' + (lvl || (num(cur.spend) ? '' : 'off')) + '"></span></div>' +
          '<div class="os-acct-m"><div><small>Spend</small><b>' + money(cur.spend) + '</b></div><div><small>' + (src === 'google_ads' ? 'Conv.' : 'Results') + '</small><b>' + fmt(cur.conversions) + '</b></div><div><small>' + (src === 'google_ads' ? 'CPA' : 'CPR') + '</small><b>' + (num(cur.conversions) ? money(cur.spend / cur.conversions) : '—') + '</b></div></div>' +
          spark(trend, lvl === 'bad' ? '#e0483c' : '#e87722') +
          '<div class="os-acct-link">' + (r.c ? ICON.link.replace('<svg', '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"') + 'Linked to <b>' + esc(r.c.name) + '</b>' : '<span style="color:var(--os-warn)">Not linked to a client yet</span>') + '</div></div>';
      }).join('') + '</div>';
    this.wire(st);
  },
  wire(st){
    st.querySelectorAll('[data-src]').forEach(b => b.addEventListener('click', () => { this.tab = b.dataset.src; this.month = ''; this.render(); }));
    st.querySelectorAll('[data-entry]').forEach(b => b.addEventListener('click', () => Entry.open({src: this.tab === 'social' ? 'facebook' : this.tab})));
    const ms = st.querySelector('[data-month]'); if (ms) ms.addEventListener('change', () => { this.month = ms.value; this.render(); });
    const q = st.querySelector('[data-q]'); if (q) q.addEventListener('input', () => { this.filter = q.value; clearTimeout(this._q); this._q = setTimeout(() => { const pos = q.selectionStart; this.render(); const q2 = $('adsStage').querySelector('[data-q]'); if (q2){ q2.focus(); try{ q2.setSelectionRange(pos, pos); }catch(e){} } }, 180); });
    AdViz.wireTips(st);
    st.querySelectorAll('[data-acct]').forEach(el => { const open = () => this.detail(el.dataset.acct); el.addEventListener('click', open); el.addEventListener('keydown', e => { if (e.key === 'Enter') open(); }); });
  },
  detail(key){
    const a = Channels.map[key]; if (!a) return;
    const src = a.source, m = this.month || Channels.latestMonth(src), cur = (a.months || {})[m] || {}, c = Channels.link(a), att = Attention.of(a);
    const camps = (cur.campaigns || []).slice().sort((x, y) => num(y.spend) - num(x.spend));
    const months = Object.keys(a.months || {}).sort();
    const pm = prevYm(m), prev = (a.months || {})[pm] || {};
    const cpa = x => num(x.conversions) ? num(x.spend) / num(x.conversions) : 0;
    const resLbl = src === 'google_ads' ? 'Conversions' : 'Results';
    const d = Drawer.open(dHead(c ? c.name : a.name, esc(SOURCES[src].l) + ' · ' + esc(a.name) + (a.id ? ' · ' + esc(a.id) : '') + ' · read only') +
      '<div class="os-db adv">' +
      AdViz.hero([
        ['Spend', money(cur.spend), num(cur.spend), num(prev.spend), months.map(k => num(a.months[k].spend)), '#4285F4', false],
        [src === 'google_ads' ? 'Clicks' : 'Link clicks', fmt(cur.clicks), num(cur.clicks), num(prev.clicks), months.map(k => num(a.months[k].clicks)), '#34A853', false],
        [resLbl, fmt(cur.conversions), num(cur.conversions), num(prev.conversions), months.map(k => num(a.months[k].conversions)), '#FBBC04', false],
        ['Cost / ' + (src === 'google_ads' ? 'conv.' : 'result'), cpa(cur) ? money(cpa(cur)) : '—', cpa(cur), cpa(prev), months.map(k => cpa(a.months[k])), '#EA4335', true]
      ], monthName(pm).split(' ')[0]) +
      (att.length ? '<div class="adv-attn ' + (Attention.level(att) === 'bad' ? 'bad' : 'warn') + '"><div class="adv-attn-ic">!</div><div><b>Needs attention</b><div class="adv-attn-l">' + att.map(x => '<span>' + esc(x.t) + '</span>').join('') + '</div></div></div>' : '') +
      '<div class="adv-card"><div class="adv-ch"><b>Month by month</b><div class="adv-seg" data-mseg>' + [['spend', 'Spend'], ['clicks', 'Clicks'], ['conversions', resLbl], ['cpa', 'Cost / conv.'], ['impressions', 'Impr.']].map((x, i) => '<button type="button" data-k="' + x[0] + '"' + (i ? '' : ' class="on"') + '>' + x[1] + '</button>').join('') + '</div></div>' +
        '<div class="adv-mchart" data-mchart></div>' +
        '<details class="adv-tbl"><summary>Show the numbers</summary><table class="os-table"><thead><tr><th>Month</th><th class="n">Spend</th><th class="n">Clicks</th><th class="n">Impr.</th><th class="n">Conv.</th><th class="n">Cost / conv.</th></tr></thead><tbody>' +
        months.slice().reverse().map(k => { const x = a.months[k]; return '<tr><td>' + esc(monthName(k)) + '</td><td class="n">' + money(x.spend) + '</td><td class="n">' + fmt(x.clicks) + '</td><td class="n">' + fmt(x.impressions) + '</td><td class="n">' + fmt(x.conversions) + '</td><td class="n">' + (cpa(x) ? money(cpa(x)) : '—') + '</td></tr>'; }).join('') +
        '</tbody></table></details></div>' +
      (camps.length ? '<div class="adv-card"><div class="adv-ch"><b>Campaigns · ' + esc(monthName(m)) + '</b><span class="adv-n">' + camps.length + '</span></div>' + AdViz.campaigns(camps) + '</div>' : '<div class="adv-card adv-empty">No campaign detail for ' + esc(monthName(m)) + ' yet. Claude reads campaigns on the monthly run.</div>') +
      ((cur.conversionActions || []).length ? '<div class="adv-card"><div class="adv-ch"><b>What people did</b><span class="adv-sub">conversion actions</span></div>' + AdViz.bars((cur.conversionActions || []).map(x => [x.name, num(x.conversions), fmt(x.conversions)]), '#FBBC04') + '</div>' : '') +
      ((cur.keywords || []).length || (cur.searchTerms || []).length ? '<div class="adv-two">' +
        ((cur.keywords || []).length ? '<div class="adv-card"><div class="adv-ch"><b>Top keywords</b><span class="adv-sub">by clicks</span></div>' + AdViz.bars(cur.keywords.map(k => [k.keyword, num(k.clicks), fmt(k.clicks) + ' clicks' + (num(k.conversions) ? ' · ' + fmt(k.conversions) + ' conv.' : '')]), '#4285F4') + '</div>' : '') +
        ((cur.searchTerms || []).length ? '<div class="adv-card"><div class="adv-ch"><b>What people searched</b><span class="adv-sub">search terms</span></div>' + AdViz.cloud(cur.searchTerms) + '</div>' : '') + '</div>' : '') +
      '<div class="adv-card"><div class="adv-ch"><b>Client</b></div><div class="os-form"><select class="os-sel" data-link><option value="">Not linked</option>' + seoClients().slice().sort((x, y) => String(x.name).localeCompare(String(y.name))).map(s2 => '<option value="' + esc(s2.id) + '"' + (c && c.id === s2.id ? ' selected' : '') + '>' + esc(s2.name) + '</option>').join('') + '</select>' +
      '<div class="os-note">Linking puts this account’s numbers in the client’s reports and uses the client’s logo here.</div></div></div></div>' +
      '<div class="os-df"><button type="button" class="os-btn go" data-task>' + ICON.tasks + 'Add a task</button>' + (a.url ? '<a class="os-btn" href="' + esc(a.url) + '" target="_blank" rel="noopener">Open in ' + esc(SOURCES[src].l) + ' ' + ICON.ext + '</a>' : '') + '</div>', {wide: true});
    const mc = d.querySelector('[data-mchart]');
    const drawM = k => { mc.innerHTML = AdViz.months(months.map(mm => { const x = a.months[mm]; return [mm, k === 'cpa' ? cpa(x) : num(x[k])]; }), k === 'spend' || k === 'cpa', m); AdViz.wireTips(mc); };
    drawM('spend');
    d.querySelectorAll('[data-mseg] button').forEach(bt => bt.addEventListener('click', () => { d.querySelectorAll('[data-mseg] button').forEach(x => x.classList.toggle('on', x === bt)); drawM(bt.dataset.k); }));
    AdViz.wireTips(d);
    d.querySelector('[data-link]').addEventListener('change', e => { Channels.setLink(a, e.target.value); FX.toast(e.target.value ? 'Linked to ' + e.target.selectedOptions[0].text : 'Unlinked', e.target.value ? 'ok' : 'del'); this.render(); });
    d.querySelector('[data-task]').addEventListener('click', () => Tasks.open({title: (c ? c.name : a.name) + ' — Google Ads: ' + (att[0] ? att[0].t : 'review account'), notes: att.map(x => '• ' + x.t).join('\n')}));
  }
};
renders.ads = () => Ads.render();

/* ======================================================================
   REPORTING
   ====================================================================== */
/* EDGE's AgencyAnalytics template (Advance Construction & Demolition, October 2026), page for page:
   Cover · Website Traffic · Website Events · SEO Score · AI Traffic, then Google Business Profile and the
   paid and social pages for the channels a client actually has. */
const TEMPLATE = [
  {type: 'cover', size: 'xl', cols: 12, h: 560, cfg: {heading: 'Monthly marketing report'}},
  {type: 'section', size: 'xl', cols: 12, h: 70, cfg: {heading: 'Website Traffic'}},
  {type: 'aa_users', size: 's', cols: 4, h: 340}, {type: 'aa_source_donut', size: 'l', cols: 8, h: 340},
  {type: 'aa_users_line', size: 'l', cols: 8, h: 380}, {type: 'aa_source_bars', size: 's', cols: 4, h: 380},
  {type: 'section', size: 'xl', cols: 12, h: 70, cfg: {heading: 'Website Events'}},
  {type: 'aa_events', size: 's', cols: 4, h: 340}, {type: 'aa_events_donut', size: 'l', cols: 8, h: 340},
  {type: 'aa_events_line', size: 'xl', cols: 12, h: 360},
  {type: 'section', size: 'xl', cols: 12, h: 70, cfg: {heading: 'SEO Score'}},
  {type: 'kw_public', size: 'xl', cols: 12, h: 1300},
  {type: 'section', size: 'xl', cols: 12, h: 70, cfg: {heading: 'AI Traffic'}},
  {type: 'aivr_kpi-visits', size: 's', cols: 4, h: 360}, {type: 'aivr_kpi-conv', size: 's', cols: 4, h: 360}, {type: 'aivr_kpi-gimpr', size: 's', cols: 4, h: 360},
  {type: 'aivr_conv-types', size: 'xl', cols: 12}, {type: 'aivr_visits-3m', size: 'xl', cols: 12}, {type: 'aivr_pages', size: 'xl', cols: 12},
  {type: 'section', size: 'xl', cols: 12, h: 70, cfg: {heading: 'Google Business Profile'}, only: 'gbp'},
  {type: 'gbp_glance', size: 'l', cols: 12, only: 'gbp'}, {type: 'gbp_grids', size: 'xl', cols: 12, only: 'gbp'}
];
/* Reporting has no client list on the left: one client switcher in the header instead. */
/* Reporting opens on every client, with a card to add a new one. Picking a
   card opens that client's report; the bar at the top always shows who it is. */
const Home = {
  seg: 'all', q: '',
  on(){ return document.body.classList.contains('os-rhome'); },
  host(){
    const st = $('seoStage'); if (!st) return null;
    let h = $('osRHome');
    if (!h){ h = document.createElement('div'); h.id = 'osRHome'; const bar = st.querySelector(':scope > .topbar'); st.insertBefore(h, bar ? bar.nextSibling : st.firstChild); }
    return h;
  },
  button(){
    const bar = document.querySelector('#seoStage > .topbar'); if (!bar || bar.querySelector('.os-rhome-btn')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'os-rhome-btn'; b.title = 'Every client report';
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>All clients';
    b.addEventListener('click', () => { if (section === 'report') this.show(); });
    const pk = bar.querySelector('.os-rpick'); bar.insertBefore(b, pk ? pk : bar.firstChild);
  },
  show(){
    this.button();
    const h = this.host(); if (!h) return;
    document.body.classList.add('os-rhome');
    this.render();
    Picker.paint();
    try{ window.scrollTo({top: 0}); }catch(e){}
  },
  hide(){ if (!this.on()) return; document.body.classList.remove('os-rhome'); Picker.paint(); },
  render(){
    const h = this.host(); if (!h) return;
    const RA = window.EdgeReportsApp, cfg = Reporting.cfg();
    const all = Picker.list();
    const info = c => {
      const ch = Channels.forClient(c), pub = !!(RA && RA.isPublished(c)), sc = cfg.clients[c.id] || {};
      let n = 0; try{ n = RA ? RA.clientItems(c).length : 0; }catch(e){}
      return {c, ch, pub, mail: !!(sc.on && (sc.to || []).length), n, at: pub && RA.publishedAt ? RA.publishedAt(c) : 0};
    };
    const rows = all.map(info);
    const live = rows.filter(r => r.pub).length, mail = rows.filter(r => r.mail).length, built = rows.filter(r => r.n).length;
    const q = norm(this.q);
    const shown = rows.filter(r => (this.seg === 'all' || (this.seg === 'live' ? r.pub : !r.pub)) && (!q || norm(r.c.name).indexOf(q) > -1));
    const dom = u => String(u || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    h.innerHTML = '<section class="rh-hero"><div><span class="ey">Reporting · ' + esc(new Date().toLocaleDateString('en-CA', {month: 'long', year: 'numeric'})) + '</span><h1>Client reports</h1><p>Every client in one place. Open one to edit its pages, or add a new client and start from the monthly template.</p></div><span class="sp"></span>' +
      '<div class="rh-stats">' + [[all.length, 'clients'], [live, 'live links'], [built, 'reports built'], [mail, 'monthly emails']].map((x, i) => '<div style="--i:' + i + '"><b class="ew-count">' + x[0] + '</b><small>' + x[1] + '</small></div>').join('') + '</div></section>' +
      '<div class="rh-bar"><h2>All clients</h2><span class="n">' + shown.length + '</span><span class="sp"></span>' +
      '<div class="rh-seg">' + [['all', 'All'], ['live', 'Live link'], ['draft', 'Not shared']].map(x => '<button type="button" data-seg="' + x[0] + '"' + (this.seg === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>').join('') + '</div>' +
      '<label class="rh-q"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#a8a29e" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="search" placeholder="Find a client" data-rhq value="' + esc(this.q) + '"></label></div>' +
      '<div class="rh-grid">' +
        '<button type="button" class="rh-card add" data-add style="--i:0"><span class="plus"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span><b>Add a client</b><small>Starts a new client and opens their report</small></button>' +
        shown.map((r, i) => {
          const ic = ['google_ads', 'meta_ads', 'facebook', 'instagram', 'linkedin'].filter(k => r.ch[k]).map(k => chIcon(k, 16)).join('');
          const pct = Math.min(100, Math.round(r.n / 30 * 100));
          return '<button type="button" class="rh-card" data-cid="' + esc(r.c.id) + '" style="--i:' + (i + 1) + '">' +
            '<div class="h">' + logoHtml(logoOf(r.c), r.c.name) + '<div style="min-width:0"><b>' + esc(r.c.name) + '</b><small>' + esc(dom(r.c.website) || (isAdsOnly(r.c) ? 'Ads client' : 'No website on file')) + '</small></div></div>' +
            '<div class="chips">' + (r.pub ? '<span class="chip live"><i></i>Live link</span>' : '<span class="chip">Not shared yet</span>') + (r.mail ? '<span class="chip mail">Monthly email</span>' : '') + '</div>' +
            '<span class="rh-meter" title="' + r.n + ' widgets"><i style="--w:' + (r.n ? Math.max(pct, 8) : 0) + '%"></i></span>' +
            '<div class="f"><span>' + (r.n ? r.n + ' widgets' : 'No report yet') + (r.at ? ' · ' + esc(new Date(r.at).toLocaleDateString('en-CA', {month: 'short', day: 'numeric'})) : '') + '</span><span class="ic">' + ic + '</span><span class="go">Open <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg></span></div></button>';
        }).join('') + '</div>' +
      (shown.length ? '' : '<div class="rh-empty">No clients match.</div>');
    h.querySelectorAll('[data-cid]').forEach(b => b.addEventListener('click', () => Picker.pick(b.dataset.cid)));
    h.querySelectorAll('[data-seg]').forEach(b => b.addEventListener('click', () => { this.seg = b.dataset.seg; this.render(); }));
    const qi = h.querySelector('[data-rhq]'); if (qi) qi.addEventListener('input', () => { this.q = qi.value; clearTimeout(this._q); this._q = setTimeout(() => { const pos = qi.selectionStart; this.render(); const q2 = h.querySelector('[data-rhq]'); if (q2){ q2.focus(); try{ q2.setSelectionRange(pos, pos); }catch(e){} } }, 140); });
    const add = h.querySelector('[data-add]'); if (add) add.addEventListener('click', () => this.add());
  },
  add(){
    const btn = $('seoAddClientBtn'); if (!btn) return;
    const before = new Set(seoClients().map(c => c.id));
    btn.click();
    let n = 0; const t = setInterval(() => {
      const fresh = seoClients().find(c => !before.has(c.id));
      if (fresh){ clearInterval(t); if (section === 'report') Picker.pick(fresh.id); FX.toast(fresh.name + ' added. Use the monthly template to start their report', 'ok'); }
      else if (++n > 240) clearInterval(t);
    }, 250);
  }
};

const Picker = {
  el: null, pop: null,
  list(){ return seoClients().filter(c => !isArchived(c)).sort((a, b) => String(a.name).localeCompare(String(b.name))); },
  mount(){
    const bar = document.querySelector('#seoStage > .topbar'); if (!bar) return;
    if (!this.el || !this.el.isConnected){
      const b = document.createElement('button'); b.type = 'button'; b.className = 'os-rpick'; b.setAttribute('aria-haspopup', 'listbox');
      bar.insertBefore(b, bar.firstChild); this.el = b;
      b.addEventListener('click', e => { e.stopPropagation(); this.pop ? this.close() : this.open(); });
      const cr = $('seoCrumbs'); if (cr) new MutationObserver(() => this.paint()).observe(cr, {childList: true, subtree: true, characterData: true});
    }
    this.paint();
  },
  paint(){
    if (!this.el) return;
    const c = activeClient(), ch = c ? Channels.forClient(c) : {};
    const icons = ['google_ads', 'meta_ads', 'facebook', 'instagram', 'linkedin'].filter(k => ch[k]).map(k => chIcon(k, 16)).join('');
    this.el.innerHTML = (c && !Home.on() ? logoHtml(logoOf(c), c.name) : '<span class="os-logo mono">?</span>') + '<span class="os-rpick-t"><small>Reporting for</small><b>' + esc(Home.on() ? 'All clients' : c ? c.name : 'Choose a client') + '</b></span>' +
      (icons ? '<span class="os-rpick-ch">' + icons + '</span>' : '') + '<svg class="car" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  },
  open(){
    this.close();
    const RA = window.EdgeReportsApp, cfg = Reporting.cfg(), cur = activeClient();
    const p = document.createElement('div'); p.className = 'os-rpop'; p.setAttribute('role', 'listbox');
    p.innerHTML = '<div class="os-rpop-s"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="search" placeholder="Find a client" data-q></div><div class="os-rpop-l">' +
      this.list().map(c => {
        const ch = Channels.forClient(c), pub = RA && RA.isPublished(c), sc = cfg.clients[c.id] || {};
        const ic = ['google_ads', 'meta_ads', 'facebook', 'instagram', 'linkedin'].filter(k => ch[k]).map(k => chIcon(k, 16)).join('');
        return '<button type="button" role="option" class="os-rpop-i' + (cur && cur.id === c.id ? ' on' : '') + '" data-cid="' + esc(c.id) + '" data-n="' + esc(norm(c.name)) + '">' + logoHtml(logoOf(c), c.name) +
          '<span class="t"><b>' + esc(c.name) + '</b><small>' + (pub ? '<i class="live"></i>Live link' : 'Not shared yet') + (sc.on && (sc.to || []).length ? ' · Monthly email' : '') + (isAdsOnly(c) ? ' · Ads client' : '') + '</small></span><span class="ic">' + ic + '</span></button>';
      }).join('') + '</div>';
    document.body.appendChild(p); this.pop = p;
    const r = this.el.getBoundingClientRect(); p.style.left = r.left + 'px'; p.style.top = (r.bottom + 8) + 'px';
    requestAnimationFrame(() => p.classList.add('on'));
    const q = p.querySelector('[data-q]'); setTimeout(() => q.focus(), 30);
    q.addEventListener('input', () => { const v = norm(q.value); p.querySelectorAll('.os-rpop-i').forEach(x => { x.style.display = !v || x.dataset.n.indexOf(v) > -1 ? '' : 'none'; }); });
    q.addEventListener('keydown', e => { if (e.key === 'Enter'){ const f = [...p.querySelectorAll('.os-rpop-i')].find(x => x.style.display !== 'none'); if (f) f.click(); } if (e.key === 'Escape') this.close(); });
    p.querySelectorAll('[data-cid]').forEach(b => b.addEventListener('click', () => this.pick(b.dataset.cid)));
    setTimeout(() => document.addEventListener('mousedown', this._away = e => { if (!p.contains(e.target) && !this.el.contains(e.target)) this.close(); }, true), 0);
  },
  close(){ if (this.pop){ this.pop.remove(); this.pop = null; } if (this._away){ document.removeEventListener('mousedown', this._away, true); this._away = null; } },
  pick(id){
    this.close();
    Home.hide();
    if (state.activeSeoClientId !== id){ state.activeSeoClientId = id; try{ save(); }catch(e){} try{ seoApi().renderTree(); }catch(e){} }
    this.paint();
    const want = localPref('reportTab') === 'rteam' ? 'rteam' : 'rclient';
    const b = document.querySelector('#seoModes [data-seoview="' + want + '"]'); if (b) b.click();
    try{ window.EdgeReportsApp && EdgeReportsApp.redraw(); }catch(e){}
  }
};
const Reporting = {
  cfg(){ const s = settings(); return Object.assign({day: 1, hour: 8, from: 'EDGE Marketing & Design', replyTo: '', clients: {}, log: []}, s.reports || {}); },
  setCfg(c){ setSetting('reports', c); },
  scheduledCount(){ const c = this.cfg().clients || {}; return Object.keys(c).filter(k => c[k] && c[k].on && (c[k].to || []).length).length; },
  enter(){
    Picker.mount();
    Home.show();
    let want = localPref('reportTab'); if (!/^(rteam|rclient)$/.test(want || '')) want = 'rclient';
    setTimeout(() => {
      const b = document.querySelector('#seoModes [data-seoview="' + want + '"]') || document.querySelector('#seoModes [data-seoview="rclient"]');
      if (b) b.click();
    }, 40);
  },
  ensureTab(){},
  show(){},
  /* The monthly template, built from the channels this client actually has. */
  buildTemplate(c, quiet){
    const RA = window.EdgeReportsApp; if (!RA || !c) return 0;
    if (!quiet && RA.clientItems(c).length && !confirm('Replace ' + c.name + '’s client report with the monthly template? Widgets you added by hand will be replaced.')) return 0;
    const ch = Channels.forClient(c), social = !!(ch.facebook || ch.instagram || ch.linkedin);
    const hasGbp = !!gbpFor(c);
    const items = TEMPLATE.filter(t => !t.only || (t.only === 'social' ? social : t.only === 'gbp' ? hasGbp : ch[t.only])).filter(t => RA.W[t.type]).map(t => { const o = Object.assign({}, t); delete o.only; return o; });
    /* Paid and social pages for the channels this client has (numbers read by Claude or typed in). */
    const P = RA.CH_PAGES ? RA.CH_PAGES() : {};
    ['google_ads', 'meta_ads', 'facebook', 'instagram', 'linkedin'].forEach(src => { if (!ch[src] || !P[src]) return;
      items.push({type: 'section', size: 'xl', cols: 12, h: 70, cfg: {heading: P[src][0]}});
      P[src][1].forEach(([t, cols]) => { if (RA.W[t]) items.push({type: t, size: cols === 12 ? 'xl' : cols >= 8 ? 'l' : 's', cols}); }); });
    try{ window.EDGE_aaBuilder && EDGE_aaBuilder.fitNext(); }catch(e){}
    RA.applyClient(c, items, c.name + ' — Monthly report');
    return items.length;
  },
  /* Schedule: the client's monthly email and the sending rules, in a drawer over the editor. */
  drawer(c){
    c = c || activeClient(); if (!c) return;
    const d = Drawer.open(dHead('Monthly email', esc(c.name) + ' · sent from your own Gmail on the ' + ordinal(this.cfg().day) + ' of each month') + '<div class="os-db" data-schedhost></div>', {wide: true});
    this._host = d.querySelector('[data-schedhost]');
    this.render();
  },
  render(){
    const v = this._host && this._host.isConnected ? this._host : null; if (!v) return;
    const cfg = this.cfg(), cs = seoClients().filter(c => !isArchived(c)).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const c = activeClient(), RA = window.EdgeReportsApp;
    const cc = c ? (cfg.clients[c.id] || {on: false, to: []}) : null;
    const nextSend = (() => { const n = new Date(); const d = new Date(n.getFullYear(), n.getMonth() + (n.getDate() > cfg.day || (n.getDate() === cfg.day && n.getHours() >= cfg.hour) ? 1 : 0), cfg.day, cfg.hour); return d; })();
    const ch = c ? Channels.forClient(c) : {};
    const hasItems = c && RA ? RA.clientItems(c).length : 0;
    const logRows = (cfg.log || []).filter(l => !c || l.clientId === c.id).slice(-8).reverse();
    v.innerHTML = '<div class="os-rh-top" style="margin-bottom:14px"><span class="os-chip">' + this.scheduledCount() + ' clients scheduled</span><span class="os-chip">Next send ' + esc(nextSend.toLocaleDateString('en-CA', {month: 'short', day: 'numeric'})) + ' · ' + fmtHour(cfg.hour) + '</span></div>' +
      (c ? '<div class="os-sched" id="osSched"><div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">' + logoHtml(logoOf(c), c.name) + '<div style="flex:1;min-width:0"><h3>' + esc(c.name) + '</h3><div style="color:var(--os-ink3);font-size:12.5px">' +
        (RA && RA.isPublished(c) ? 'Report link live · published ' + new Date(RA.publishedAt(c)).toLocaleDateString('en-CA', {month: 'short', day: 'numeric'}) : 'Not published yet') + '</div></div>' +
        '<button type="button" class="os-btn" data-tpl>' + (hasItems ? 'Rebuild' : 'Build') + ' monthly report</button><button type="button" class="os-btn" data-open>Open client report</button><button type="button" class="os-btn dark" data-pub>' + ICON.link + 'Publish &amp; copy link</button></div>' +
        '<div class="os-steps">' +
          step(hasItems, 'Monthly report', hasItems ? hasItems + ' widgets, AgencyAnalytics layout' : 'Build it from the template') +
          step(!!(ch.google_ads || ch.meta_ads), 'Paid ads', [ch.google_ads ? 'Google Ads' : '', ch.meta_ads ? 'Meta Ads' : ''].filter(Boolean).join(' + ') || 'No ad account linked') +
          step(!!(ch.facebook || ch.instagram || ch.linkedin), 'Social', ['facebook', 'instagram', 'linkedin'].filter(k => ch[k]).map(k => SOURCES[k].l).join(', ') || 'No social account linked') +
          step(cc && cc.on && (cc.to || []).length, 'Scheduled send', cc && cc.on && (cc.to || []).length ? 'To ' + cc.to.join(', ') : 'Off') + '</div>' +
        '<div class="os-row" style="margin-top:14px"><div class="os-form"><label>Send to (client emails, comma separated)</label><input class="os-in" data-to value="' + esc((cc.to || []).join(', ')) + '" placeholder="owner@client.ca"></div>' +
        '<div class="os-form"><label>Copy (team, optional)</label><input class="os-in" data-cc value="' + esc((cc.cc || []).join(', ')) + '" placeholder="robert@edgemarketing.ca"></div></div>' +
        '<div style="display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap"><label style="display:inline-flex;gap:8px;align-items:center;font:600 13px var(--ui,Inter,sans-serif)"><input type="checkbox" data-on' + (cc.on ? ' checked' : '') + '> Send this report on the ' + ordinal(cfg.day) + ' of every month</label><span class="os-grow"></span>' +
        '<button type="button" class="os-btn" data-test>' + ICON.mail + 'Send me a test</button><button type="button" class="os-btn go" data-savesched>Save</button></div>' +
        (logRows.length ? '<div class="os-h2">Sent</div><table class="os-table"><thead><tr><th>When</th><th>To</th><th>Status</th></tr></thead><tbody>' + logRows.map(l => '<tr><td>' + esc(new Date(l.at).toLocaleString('en-CA', {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})) + '</td><td>' + esc((l.to || []).join(', ')) + '</td><td>' + '<span class="os-tag ' + (l.ok ? 'ok' : 'bad') + '">' + esc(l.status || (l.ok ? 'Delivered' : 'Failed')) + '</span></td></tr>').join('') + '</tbody></table>' : '') +
        '</div>' : '') +
      '<div class="os-sched"><h3>How monthly sending stays safe</h3><div class="os-steps">' +
        '<div class="os-step"><b>Your own mailbox</b>Sent by Gmail from your Google Workspace account (tracker/report-mailer.gs), so SPF and DKIM for edgemarketing.ca already vouch for it.</div>' +
        '<div class="os-step"><b>Checked first</b>The data is refreshed and every report re-published before anything is sent; a client with missing data is held back and you are told.</div>' +
        '<div class="os-step"><b>Plain, personal email</b>One email per client with a short note and one link to the report. No attachments, trackers or link shorteners that spam filters dislike.</div>' +
        '<div class="os-step"><b>Bounces caught</b>Undelivered or bounced emails are found the same day and marked Failed here, with a task in Basecamp.</div></div>' +
        '<div class="os-row" style="margin-top:12px"><div class="os-form"><label>Send day and hour</label><div class="os-row"><select class="os-sel" data-day>' + [1, 2, 3, 4, 5].map(d => '<option' + (d === cfg.day ? ' selected' : '') + ' value="' + d + '">' + ordinal(d) + ' of the month</option>').join('') + '</select><select class="os-sel" data-hour>' + [7, 8, 9, 10, 11, 13, 14].map(h => '<option' + (h === cfg.hour ? ' selected' : '') + ' value="' + h + '">' + fmtHour(h) + '</option>').join('') + '</select></div></div>' +
        '<div class="os-form"><label>Reply-to</label><input class="os-in" data-reply value="' + esc(cfg.replyTo || '') + '" placeholder="robert@edgemarketing.ca"></div></div>' +
        '<div style="margin-top:10px"><button type="button" class="os-btn" data-saveglobal>Save sending settings</button></div></div>' +
      '';
    this.wire(v, c);
  },
  wire(v, c){
    const cfg = this.cfg(), RA = window.EdgeReportsApp;
    v.querySelectorAll('[data-cid]').forEach(el => el.addEventListener('click', () => {
      state.activeSeoClientId = el.dataset.cid; try{ save(); seoApi().renderTree(); }catch(e){}
      this.render(); const s = $('osSched'); if (s){ FX.flash(s); s.scrollIntoView({behavior: RM() ? 'auto' : 'smooth', block: 'start'}); }
    }));
    const rq = v.querySelector('[data-rq]'); if (rq) rq.addEventListener('input', () => { const q = norm(rq.value); v.querySelectorAll('.os-rc').forEach(x => { x.style.display = !q || x.dataset.name.indexOf(q) > -1 ? '' : 'none'; }); });
    const g = v.querySelector('[data-saveglobal]'); if (g) g.addEventListener('click', e => {
      const n = this.cfg(); n.day = +v.querySelector('[data-day]').value; n.hour = +v.querySelector('[data-hour]').value; n.replyTo = v.querySelector('[data-reply]').value.trim();
      this.setCfg(n); Mailer.push().then(() => FX.done(e.target, 'Sending settings saved'), err => FX.toast('Saved here. ' + err.message, 'sync')); this.render();
    });
    if (!c) return;
    const emails = s => String(s || '').split(/[,;\s]+/).map(x => x.trim()).filter(x => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(x));
    v.querySelector('[data-tpl]').addEventListener('click', e => {
      if (!RA) return FX.toast('Reports are still loading', 'sync');
      const n = this.buildTemplate(c); if (!n) return;
      FX.done(e.target, 'Monthly report built: ' + n + ' widgets'); this.render(); try{ RA.redraw(); }catch(err){}
    });
    v.querySelector('[data-open]').addEventListener('click', () => { Drawer.close(); localPref('reportTab', 'rclient'); const b = document.querySelector('#seoModes [data-seoview="rclient"]'); if (b) b.click(); });
    v.querySelector('[data-pub]').addEventListener('click', async e => {
      const btn = e.currentTarget; if (!RA) return;
      btn.disabled = true; btn.innerHTML = 'Publishing…'; FX.shimmer(btn, true);
      try{ const url = await RA.publish(c); try{ await navigator.clipboard.writeText(url); }catch(err){} FX.done(btn, 'Report link copied'); }
      catch(err){ FX.toast('Couldn’t publish: ' + err.message, 'del'); }
      FX.shimmer(btn, false); this.render();
    });
    const saveSched = () => { const n = this.cfg(); n.clients = Object.assign({}, n.clients); n.clients[c.id] = {on: v.querySelector('[data-on]').checked, to: emails(v.querySelector('[data-to]').value), cc: emails(v.querySelector('[data-cc]').value)}; this.setCfg(n); return n.clients[c.id]; };
    v.querySelector('[data-savesched]').addEventListener('click', async e => {
      const s = saveSched();
      if (s.on && !s.to.length){ FX.toast('Add at least one client email to schedule it', 'del'); return; }
      if (s.on && RA && !RA.isPublished(c)){ try{ await RA.publish(c); }catch(err){} }
      Mailer.push().then(() => FX.done(e.target, s.on ? 'Scheduled for the ' + ordinal(cfg.day) : 'Saved'), err => FX.toast('Saved here. The mailer will pick it up once connected: ' + err.message, 'sync'));
      this.render();
    });
    v.querySelector('[data-test]').addEventListener('click', async e => {
      saveSched(); const btn = e.currentTarget; btn.disabled = true;
      try{ if (RA && !RA.isPublished(c)) await RA.publish(c); await Mailer.test(c); FX.done(btn, 'Test sent to ' + me()); }
      catch(err){ FX.toast(err.message, 'del'); }
      btn.disabled = false;
    });
  }
};
/* Before the 1st: re-publish every scheduled client's report with fresh numbers (the mailer checks for it). */
Reporting.publishAll = async function (){
  const cfg = this.cfg(), RA = window.EdgeReportsApp, out = [];
  if (!RA) throw new Error('Reports not loaded');
  for (const c of seoClients()){
    const s = cfg.clients[c.id]; if (!s || !s.on || !(s.to || []).length) continue;
    try{ await RA.publish(c); out.push({name: c.name, ok: true}); }catch(e){ out.push({name: c.name, ok: false, error: e.message}); }
  }
  try{ await Mailer.push(); }catch(e){}
  return out;
};
const step = (ok, t, d) => '<div class="os-step' + (ok ? ' ok' : '') + '"><b>' + (ok ? '✓ ' : '') + esc(t) + '</b>' + esc(d) + '</div>';
const ordinal = n => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
const fmtHour = h => (h % 12 || 12) + (h < 12 ? ' AM' : ' PM');

/* The send itself runs in the tracker (Apps Script, your Workspace Gmail): tracker/report-mailer.gs. */
const Mailer = {
  tracker(){ const s = (state.settings && state.settings.aiTracker) || {}; return {url: s.url || '', key: s.key || ''}; },
  async post(body){
    const t = this.tracker(); if (!t.url || !t.key) throw new Error('Connect the AI Visibility Tracker first.');
    const r = await fetch(t.url, {method: 'POST', body: JSON.stringify(Object.assign({key: t.key}, body))}).then(x => x.json());
    if (r && r.error) throw new Error(r.error);
    return r;
  },
  push(){
    const cfg = Reporting.cfg(), RA = window.EdgeReportsApp;
    const list = seoClients().filter(c => cfg.clients[c.id] && cfg.clients[c.id].on && (cfg.clients[c.id].to || []).length)
      .map(c => ({id: c.id, name: c.name, to: cfg.clients[c.id].to, cc: cfg.clients[c.id].cc || [], url: RA ? RA.url(c) : ''}));
    return this.post({action: 'reportSchedule', day: cfg.day, hour: cfg.hour, from: cfg.from, replyTo: cfg.replyTo, team: me(), clients: list});
  },
  test(c){ const RA = window.EdgeReportsApp; return this.post({action: 'reportTest', to: me(), name: c.name, url: RA ? RA.url(c) : ''}); },
  async pullLog(){
    try{
      const r = await this.post({action: 'reportLog'});
      if (r && Array.isArray(r.log)){ const n = Reporting.cfg(), next = r.log.slice(-300); if (JSON.stringify(n.log || []) !== JSON.stringify(next)){ n.log = next; Reporting.setCfg(n); } }
    }catch(e){}
  }
};

/* Reporting tab clicks: our Overview tab, and remembering which report tab was last open. */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('#seoModes .seo-mode');
  if (!b) return;
  const id = b.dataset.seoview;
  if (section === 'report' && /^(rteam|rclient)$/.test(id || '')) localPref('reportTab', id);
}, true);

/* ======================================================================
   ONE CLIENT LIST: GBP Tracker shows the same clients as SEO, in the same order,
   with the same logos. Each SEO client opens its Business Profiles; one without a
   profile yet gets "Add a profile". Profiles not tied to an SEO client sit under
   "Other profiles" at the bottom, so nothing is ever hidden.
   ====================================================================== */
const gbpLinks = () => settings().gbpLinks || {};
/* One Business Profile per SEO client, and that profile is what the client's reports show.
   An explicit link (settings.gbpLinks) always wins; otherwise the same name or website, but never a
   profile already linked to another client. Matches found that way are written down (lockGbpLinks). */
function gbpFor(sc){
  if (!sc) return null;
  const L = gbpLinks(), id = L[sc.id];
  if (id === 'none') return null;
  if (id){ const g = (state.clients || []).find(x => x.id === id); if (g) return g; }
  const taken = new Set(Object.keys(L).filter(k => k !== sc.id && L[k] && L[k] !== 'none').map(k => L[k]));
  const pool = (state.clients || []).filter(g => !taken.has(g.id));
  const n = norm(sc.name), dom = String(sc.website || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  const domOf = u => String(u || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  return pool.find(g => norm(g.name) === n) ||
    (dom ? pool.find(g => (g.gbps || []).some(p => domOf(p.website) === dom)) : null) ||
    pool.find(g => { const gn = norm(g.name); return gn.length > 3 && n.length > 3 && (gn.indexOf(n) === 0 || n.indexOf(gn) === 0); }) || null;
}
const gbpOwner = gc => gc ? seoOnly().filter(c => !isArchived(c)).find(sc => { const g = gbpFor(sc); return g && g.id === gc.id; }) || null : null;
function setGbpLink(sc, gc){
  const L = Object.assign({}, gbpLinks());
  Object.keys(L).forEach(k => { if (gc && L[k] === gc.id && k !== (sc && sc.id)) delete L[k]; });
  if (sc) L[sc.id] = gc ? gc.id : 'none';
  setSetting('gbpLinks', L);
}
function lockGbpLinks(){
  if (typeof state === 'undefined' || !(state.clients || []).length || !seoClients().length) return;
  const L = Object.assign({}, gbpLinks()); let changed = false;
  seoOnly().filter(c => !isArchived(c)).forEach(sc => { if (L[sc.id]) return; const g = gbpFor(sc); if (g){ L[sc.id] = g.id; changed = true; } });
  if (changed) setSetting('gbpLinks', L);
}
window.EDGE_gbpFor = sc => gbpFor(sc);

/* GBP Tracker: a visual header for the open profile: who it belongs to, how it ranks, every keyword's grid. */
const GbpHero = {
  t: 0,
  soon(){ clearTimeout(this.t); this.t = setTimeout(() => this.render(), 160); },
  cur(){
    const gc = (state.clients || []).find(x => x.id === state.activeClientId); if (!gc) return {};
    const g = (gc.gbps || []).find(p => p.id === state.activeGbpId) || (gc.gbps || [])[0];
    return {gc, g};
  },
  render(){
    const fv = $('focusView'), tabs = $('gbpTabs');
    let host = $('osGbpHero');
    if (!fv || !tabs || fv.style.display === 'none' || typeof scanStatsOf !== 'function'){ if (host) host.remove(); return; }
    const {gc, g} = this.cur(); if (!g){ if (host) host.remove(); return; }
    if (!host){ host = document.createElement('section'); host.id = 'osGbpHero'; host.className = 'os-gh'; }
    if (host.nextSibling !== tabs) fv.insertBefore(host, tabs);
    const owner = gbpOwner(gc);
    const kws = (g.keywords || []).map(k => { const sc = k.scans || [], last = sc[sc.length - 1], prev = sc[sc.length - 2];
      return {k, last, st: last ? scanStatsOf(last) : null, pv: prev ? scanStatsOf(prev) : null}; });
    const scanned = kws.filter(x => x.st && x.st.read);
    const read = scanned.reduce((t, x) => t + x.st.read, 0), top3 = scanned.reduce((t, x) => t + x.st.top3, 0), found = scanned.reduce((t, x) => t + x.st.found, 0);
    const avgs = scanned.filter(x => x.st.avg != null).map(x => x.st.avg);
    const avg = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;
    const lastTs = Math.max(0, ...scanned.map(x => x.last.ts || 0));
    const rc = r => r == null ? '#D8DEE2' : r <= 3 ? '#12A36F' : r <= 10 ? '#F5A524' : r <= 20 ? '#F07A3C' : '#E5484D';
    const mini = (scan) => {
      const pts = (scan && scan.points) || []; if (!pts.length) return '<div class="os-gh-nogrid">Not scanned yet</div>';
      const n = (scan.grid && scan.grid.rows) || (typeof scan.grid === 'number' ? scan.grid : 0) || Math.round(Math.sqrt(pts.length)) || 5, cell = 100 / n;
      return '<svg viewBox="0 0 100 100" class="os-gh-grid" aria-hidden="true">' + pts.map(p => { const r = p.error || !(p.rank > 0) ? null : p.rank;
        return '<rect x="' + (p.col * cell + 1.2).toFixed(2) + '" y="' + (p.row * cell + 1.2).toFixed(2) + '" width="' + (cell - 2.4).toFixed(2) + '" height="' + (cell - 2.4).toFixed(2) + '" rx="' + (cell * .28).toFixed(2) + '" fill="' + rc(r) + '"' + (r != null && r <= 3 ? '' : ' opacity="' + (r == null ? .7 : .92) + '"') + '/>'; }).join('') + '</svg>';
    };
    const opts = seoOnly().filter(c => !isArchived(c)).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const kpi = (v, l, sub) => '<div class="os-gh-k"><b>' + v + '</b><small>' + l + '</small>' + (sub ? '<em>' + sub + '</em>' : '') + '</div>';
    host.innerHTML =
      '<div class="os-gh-top"><span class="os-gh-orb"></span>' +
        '<div class="os-gh-id">' + (owner ? logoHtml(logoOf(owner), owner.name) : '<span class="os-logo mono">' + esc(initials(gc.name)) + '</span>') +
          '<div><small>Google Business Profile</small><h2>' + esc(g.bizName || gc.name) + '</h2><span class="os-gh-loc">' + esc(g.name || 'Main location') + (g.website ? ' · ' + esc(String(g.website).replace(/^https?:\/\//, '').replace(/\/$/, '')) : '') + '</span></div></div>' +
        '<label class="os-gh-link' + (owner ? ' ok' : '') + '"><span>' + (owner ? 'Feeds the reports of' : 'Not linked to an SEO client') + '</span><select data-owner aria-label="SEO client this profile belongs to"><option value="">' + (owner ? 'Unlink' : 'Choose the SEO client…') + '</option>' +
          opts.map(c => '<option value="' + esc(c.id) + '"' + (owner && owner.id === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select></label>' +
      '</div>' +
      '<div class="os-gh-kpis">' +
        kpi(avg == null ? '—' : (avg < 10 ? avg.toFixed(1) : Math.round(avg)), 'average Maps position', scanned.length ? 'across ' + scanned.length + ' keyword' + (scanned.length === 1 ? '' : 's') : 'scan to see') +
        kpi(read ? Math.round(top3 / read * 100) + '<i>%</i>' : '—', 'of the grid in the top 3', read ? top3 + ' of ' + read + ' points' : '') +
        kpi(read ? Math.round(found / read * 100) + '<i>%</i>' : '—', 'of the grid where it shows', read ? found + ' of ' + read + ' points' : '') +
        kpi(lastTs ? esc(new Date(lastTs).toLocaleDateString('en-CA', {month: 'short', day: 'numeric'})) : '—', 'last scan', (g.keywords || []).length + ' keyword' + ((g.keywords || []).length === 1 ? '' : 's') + ' tracked') +
      '</div>' +
      (kws.length ? '<div class="os-gh-kws">' + kws.map((x, i) => {
        const st = x.st, d = st && x.pv && x.pv.read && st.read ? Math.round((st.top3 / st.read - x.pv.top3 / x.pv.read) * 100) : null;
        return '<button type="button" class="os-gh-kw' + (x.k.id === g.activeKeywordId ? ' on' : '') + '" data-kw="' + esc(x.k.id) + '" style="--d:' + (i * 50) + 'ms">' + mini(x.last) +
          '<span class="t"><b>' + esc(x.k.text) + '</b><small>' + (st ? (st.avg == null ? 'Not found on the map' : 'Avg #' + (st.avg < 10 ? st.avg.toFixed(1) : Math.round(st.avg)) + ' · top 3 at ' + st.top3 + '/' + st.read) : 'Not scanned yet') + '</small></span>' +
          (d ? '<em class="' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '▲' : '▼') + Math.abs(d) + '%</em>' : '') + '</button>';
      }).join('') + '</div>' : '') +
      '<div class="os-gh-leg"><span><i style="background:#12A36F"></i>1–3</span><span><i style="background:#F5A524"></i>4–10</span><span><i style="background:#F07A3C"></i>11–20</span><span><i style="background:#E5484D"></i>20+</span><span><i style="background:#D8DEE2"></i>Not found</span></div>';
    host.querySelectorAll('[data-kw]').forEach(b => b.addEventListener('click', () => { try{ selectKeyword(b.dataset.kw); }catch(e){} }));
    host.querySelector('[data-owner]').addEventListener('change', e => {
      const id = e.target.value, sc = seoClients().find(c => c.id === id) || null;
      if (sc) setGbpLink(sc, gc); else if (owner) setGbpLink(owner, null);
      FX.toast(sc ? g.bizName ? (g.bizName + ' now feeds ' + sc.name + '’s reports') : ('Linked to ' + sc.name) : 'Profile unlinked', 'ok');
      try{ unifyGbpTree(); }catch(err){} this.render();
    });
  },
  init(){
    const st = $('gbpStage'); if (!st || this.mo) return;
    this.mo = new MutationObserver(ms => { if (ms.every(m => { const h = $('osGbpHero'); return h && (h === m.target || h.contains(m.target)); })) return; this.soon(); });
    this.mo.observe(st, {childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class']});
    this.soon();
  }
};
function unifyGbpTree(){
  const tree = $('clientTree'); if (!tree) return;
  const filter = (($('clientSearch') || {}).value || '').toLowerCase().trim();
  const shown = (state.clients || []).filter(c => !filter || c.name.toLowerCase().includes(filter) || (c.gbps || []).some(g => ((g.name || '') + ' ' + (g.bizName || '')).toLowerCase().includes(filter)));
  const wraps = Array.from(tree.querySelectorAll(':scope > .tree-client'));
  if (wraps.length !== shown.length) return;
  const byId = {}; shown.forEach((c, i) => { byId[c.id] = wraps[i]; wraps[i].dataset.gid = c.id; });
  const used = new Set();
  const frag = document.createDocumentFragment();
  seoOnly().filter(c => !isArchived(c)).forEach(sc => {
    const g = gbpFor(sc);
    if (g && byId[g.id] && !used.has(g.id)){
      used.add(g.id);
      const w = byId[g.id], row = w.querySelector('.tree-row');
      if (row && !row.querySelector('.os-glogo') && !!seoApi().logo){ const lg = document.createElement('span'); lg.className = 'seo-tree-logo seo-logo os-glogo'; lg.innerHTML = seoApi().logo(sc); row.insertBefore(lg, row.querySelector('.tree-name')); }
      frag.appendChild(w);
    } else if (!g && (!filter || String(sc.name).toLowerCase().includes(filter))){
      const w = document.createElement('div'); w.className = 'tree-client os-nogbp';
      w.innerHTML = '<div class="tree-row"><span class="seo-tree-logo seo-logo os-glogo">' + seoApi().logo(sc) + '</span><span class="tree-name">' + esc(sc.name) + '</span><button type="button" class="os-gadd" title="Add a Business Profile for ' + esc(sc.name) + '">+ Profile</button></div>';
      w.querySelector('.tree-row').addEventListener('click', () => addGbpFor(sc));
      frag.appendChild(w);
    }
  });
  const rest = shown.filter(c => !used.has(c.id));
  tree.innerHTML = '';
  tree.appendChild(frag);
  if (rest.length){
    const h = document.createElement('div'); h.className = 'os-gother'; h.innerHTML = '<span>Other profiles</span><em>' + rest.length + '</em>';
    tree.appendChild(h);
    rest.forEach(c => tree.appendChild(byId[c.id]));
  }
}
async function addGbpFor(sc){
  if (!confirm('Add a Google Business Profile for ' + sc.name + '?')) return;
  const g = blankGbp('Main location');
  const c = {id: uid(), name: sc.name, gbps: [g], compareScans: []};
  state.clients.push(c);
  const L = Object.assign({}, gbpLinks()); L[sc.id] = c.id; setSetting('gbpLinks', L);
  state.activeClientId = c.id; state.activeGbpId = g.id; state.view = 'focus';
  save(); renderAll();
  try{ openStep(1); }catch(e){}
  FX.toast('Profile added for ' + sc.name + ': fill in its details', 'add');
}
function hookGbpTree(){
  if (typeof renderTree !== 'function' || window.__osTree) return;
  window.__osTree = true;
  const orig = renderTree;
  window.renderTree = function (){ const r = orig.apply(this, arguments); try{ unifyGbpTree(); }catch(e){ console.warn('unify', e); } return r; };
  const cs = $('clientSearch'); if (cs) cs.addEventListener('input', () => { try{ unifyGbpTree(); }catch(e){} });
  try{ unifyGbpTree(); }catch(e){}
}

/* Live SERP has no side menu: its two views are the tabs at the top, and recent searches
   sit under the search form, readable. */
function serpLayout(){
  const rec = $('serpRecents'), view = $('view-checker'); if (!rec || !view || $('osSerpRecent')) return;
  const card = document.createElement('div'); card.id = 'osSerpRecent'; card.className = 'os-serp-recent';
  card.innerHTML = '<div class="os-serp-rh"><b>Recent searches</b><span class="os-grow"></span></div>';
  const clr = $('serpClearRecents'); if (clr){ clr.className = 'os-serp-clear'; clr.textContent = 'Clear'; card.firstChild.appendChild(clr); }
  card.appendChild(rec);
  (view.querySelector('.tool-wrap') || view).appendChild(card);
}

/* ======================================================================
   BOOT
   ====================================================================== */
/* Every client report's AI section becomes that client's AI Visibility tab widgets (once per report). */
const AiSweep = {
  done: false,
  async run(){
    const RA = window.EdgeReportsApp;
    if (this.done || !RA || !RA.migrateAI || !window.AIReport2 || typeof state === 'undefined' || !(state.seoClients || []).length) return;
    if (typeof fbDb === 'undefined' || !fbDb) return;
    this.done = true;
    (state.seoClients || []).forEach(c => { try{ if (c && c.reports && c.reports.client && !c.reports.client.kwp && RA.migrateKw) RA.migrateKw(c); }catch(e){ console.warn('keyword widget', c && c.name, e); } });
    /* Paid and social: the team report gets every page once; a client report gets a channel's page when that channel has numbers. */
    (state.seoClients || []).forEach(c => { try{
      if (RA.addTeamChannelPages && c.reports && c.reports.team) RA.addTeamChannelPages(c);
      const ch = Channels.forClient(c), have = Object.keys(ch).filter(k => (ch[k] || []).some(a => Object.keys(a.months || {}).length));
      if (have.length && RA.addChannelPages) RA.addChannelPages(c, have);
    }catch(e){ console.warn('channel pages', c && c.name, e); } });
    const todo = (state.seoClients || []).filter(c => c && c.reports && c.reports.client && (c.reports.client.items || []).length && !c.reports.client.aiv2);
    let n = 0;
    for (const c of todo){
      let layout = null;
      try{ const d = await fbDb.collection('publicViews').doc('aireport-' + c.id).get(); if (d.exists) layout = (d.data() || {}).layout || null; }catch(e){}
      try{ if (RA.migrateAI(c, layout)) n++; }catch(e){ console.warn('AI section', c.name, e); }
      await new Promise(r => setTimeout(r, 400));
    }
    if (n){ try{ RA.redraw(); }catch(e){} FX.toast('AI Visibility widgets added to ' + n + ' client report' + (n === 1 ? '' : 's'), 'ok'); }
  }
};

function boot(){
  ensureStage();
  buildBar();
  buildHub();
  hookRouter();
  Bridge.init();
  Channels.start();
  [6000, 15000, 40000].forEach(t => setTimeout(() => AiSweep.run(), t));
  hookGbpTree();
  GbpHero.init();
  [5000, 20000].forEach(t => setTimeout(lockGbpLinks, t));
  serpLayout();
  /* Land where you left off: the section, and in SEO the sub-tool. */
  section = localPref('section') || (['gbp', 'serp', 'seo'].indexOf(state.seoModule) > -1 ? 'seo' : state.seoModule === 'maint' ? 'maint' : 'seo');
  paintBar(); paintBadges();
  /* Watch which module the app shows, so the bar follows whatever opened it. */
  const obs = new MutationObserver(() => paintBar());
  document.querySelectorAll('.tn-mod').forEach(b => obs.observe(b, {attributes: true, attributeFilter: ['class']}));
  setTimeout(() => { Tasks.refresh(true); Mailer.pullLog(); }, 4000);
  setInterval(() => Tasks.refresh(), 2 * 60 * 1000);
  /* Robert's board: once a day, quietly. */
  setTimeout(() => { if (Date.now() - (settings().boardSyncAt || 0) > 20 * 3600 * 1000) Board.sync(false); }, 9000);
  setInterval(paintBadges, 60 * 1000);
  /* Home is the first thing you see after signing in. */
  const shell = $('appShell'), login = $('loginScreen');
  const land = () => {
    if (!shell || shell.classList.contains('hidden')) return;
    let done = ''; try{ done = sessionStorage.getItem('osLanded') || ''; }catch(e){}
    if (done) return;
    try{ sessionStorage.setItem('osLanded', '1'); }catch(e){}
    try{ EDGE_showHub(true); }catch(e){}
  };
  if (shell){ new MutationObserver(land).observe(shell, {attributes: true, attributeFilter: ['class']}); setTimeout(land, 300); }
  if (login) new MutationObserver(() => { if (login.offsetParent !== null || getComputedStyle(login).display !== 'none'){ try{ sessionStorage.removeItem('osLanded'); }catch(e){} } }).observe(login, {attributes: true, attributeFilter: ['class', 'style']});
  const tree = $('seoClientTree');
  const markAds = () => { tree.querySelectorAll('.rail-folder').forEach(w => { const n = w.querySelector('.folder-name'); w.classList.toggle('os-adsfolder', !!(n && n.textContent === ADS_FOLDER)); }); };
  if (tree){ new MutationObserver(markAds).observe(tree, {childList: true}); markAds(); }
}
window.EDGE_OS = {renders, go: (s, sub) => go(s, sub), section: () => section, fx: FX, channels: Channels, attention: Attention, board: Board, tasks: Tasks, reporting: Reporting, template: TEMPLATE};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
