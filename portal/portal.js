/* ==========================================================================
   EASYLEADS CLIENT DASHBOARD
   A read-only view of a client's Easyleads (GoHighLevel) account. Accounts are
   created by EDGE in the SEO tool; the data comes through the EDGE tracker
   (Apps Script, tracker/portal.gs), which holds the GoHighLevel token. Nothing
   here can change anything in GoHighLevel.
   ========================================================================== */
(function(){
'use strict';
const API = (window.PORTAL_CONFIG || {}).api || '';
const BRAND = (window.PORTAL_CONFIG || {}).brand || 'Easyleads';
const app = document.getElementById('app');
const SKEY = 'el_portal_session';
const LAYOUT_V = 3;
const ls = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} }
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fmt = n => (Number(n) || 0).toLocaleString('en-CA');
const money = n => (Number(n) || 0).toLocaleString('en-CA', {style: 'currency', currency: 'CAD', maximumFractionDigits: 0});
const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 + '%' : '—';
const day = 86400000;
const iso = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const fullDate = t => new Date(t).toLocaleString('en-CA', {month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'});
const when = t => {
  if (!t) return '';
  const d = Date.now() - t;
  if (d >= 0 && d < 60000) return 'just now';
  if (d >= 0 && d < 3600000) return Math.round(d / 60000) + ' min ago';
  if (d >= 0 && d < day && new Date(t).getDate() === new Date().getDate()) return 'today, ' + new Date(t).toLocaleTimeString('en-CA', {hour: 'numeric', minute: '2-digit'});
  return new Date(t).toLocaleString('en-CA', {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});
};
const relDay = t => { const a = new Date(); a.setHours(0, 0, 0, 0); const d = Math.floor((a.getTime() - new Date(t).setHours(0, 0, 0, 0)) / day); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 7 ? d + ' days ago' : new Date(t).toLocaleDateString('en-CA', {month: 'short', day: 'numeric'}); };
const dur = s => { s = Number(s) || 0; return s < 60 ? s + 's' : Math.floor(s / 60) + 'm ' + String(s % 60).padStart(2, '0') + 's'; };
const initials = s => String(s || '?').trim().replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '?';
const AV = ['#2563eb', '#7c3aed', '#0e9f6e', '#d97706', '#db2777', '#0891b2', '#4f46e5', '#b45309', '#059669', '#9333ea', '#0284c7', '#be123c'];
const hue = s => { let h = 0; String(s || '').split('').forEach(c => { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return AV[h % AV.length]; };
const uid = () => 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

/* ---------- icons ---------- */
const P = {
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
  form: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
  users: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  cal: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4',
  money: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  line: 'M3 3v18h18M7 15l4-4 3 3 6-7',
  bars: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  donut: 'M12 3a9 9 0 1 0 9 9h-9zM15 3.5A9 9 0 0 1 20.5 9H15z',
  funnel: 'M3 4h18l-7 9v6l-4 2v-8z',
  in: 'M17 7 7 17M7 8v9h9', out: 'M7 17 17 7M8 7h9v9', missed: 'M3 3l18 18M17 7 7 17',
  plus: 'M12 5v14M5 12h14', send: 'M4.5 12 20 4.5 15.5 20l-3.2-6.3zM12.3 13.7 20 4.5', x: 'M6 6l12 12M18 6 6 18', grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4', bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  source: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  pin: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  inbox: 'M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6H3v-6z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3',
  down: 'M6 9l6 6 6-6', dl: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  reply: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 6 6v4',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  book: 'M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3zM18 20a2 2 0 0 0 2-2V6',
  out2: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3',
  reset: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5', eye: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  move: 'M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3', size: 'M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6', check: 'M5 12l5 5 9-10', clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  chev: 'M9 6l6 6-6 6', chevl: 'M15 6l-6 6 6 6', spark: 'M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z'
};
const ic = (k, sz) => '<svg viewBox="0 0 24 24" width="' + (sz || 18) + '" height="' + (sz || 18) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (P[k] || P.grid) + '"/></svg>';

/* ---------- loading pieces ---------- */
const SK = {
  list: n => '<div class="list">' + Array.from({length: n || 5}, () => '<div class="sk-row"><div class="sk av"></div><div class="lines"><div class="sk l1"></div><div class="sk l2"></div></div></div>').join('') + '</div>',
  kpis: n => '<div class="sk-kpis">' + Array.from({length: n || 5}, () => '<div class="sk"></div>').join('') + '</div>',
  chart: () => '<div class="sk chart"></div><div style="display:flex;gap:12px;margin-top:12px"><div class="sk" style="height:10px;width:90px"></div><div class="sk" style="height:10px;width:70px"></div></div>',
  inbox: () => SK.kpis(4) + '<div class="sk" style="height:44px;margin:14px 0;border-radius:14px"></div><div class="ib-body"><div>' + SK.list(4) + '</div><div>' + Array.from({length: 3}, () => '<div class="sk" style="height:104px;border-radius:16px;margin-bottom:10px"></div>').join('') + '</div></div>',
  table: () => '<div class="sk" style="height:42px;border-radius:14px;margin-bottom:12px"></div>' + SK.list(7),
  note: () => '<div class="sk" style="height:12px;width:92%"></div><div class="sk" style="height:12px;width:80%;margin-top:9px"></div><div class="sk" style="height:12px;width:64%;margin-top:9px"></div>'
};
function veil(text){
  const v = document.createElement('div'); v.className = 'veil';
  v.innerHTML = '<div class="box"><span class="spin"></span><span>' + esc(text) + '</span></div>';
  document.body.appendChild(v);
  return {set(t){ v.querySelector('.box span:last-child').textContent = t; }, done(){ v.remove(); }};
}

/* ---------- API ---------- */
async function api(action, body){
  if (!API) throw new Error('This dashboard isn’t set up yet.');
  const res = await fetch(API, {method: 'POST', body: JSON.stringify(Object.assign({action}, body || {})), redirect: 'follow'});
  if (!res.ok) throw new Error('The server answered ' + res.status + '. Try again in a moment.');
  const j = await res.json();
  if (j && j.error === 'signedout' && action !== 'portalLogin'){ signOut(true); throw new Error('Please sign in again.'); }
  return j;
}

/* ---------- state & periods ---------- */
const S = {session: null, me: null, domain: '', period: '30', dash: 0, editing: false, cache: {}, layout: null, ui: {}};
const PERIODS = [['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['month', 'This month'], ['lastmonth', 'Last month']];
function range(p){
  p = p || S.period;
  const now = new Date(), end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (p === 'month') return {s: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), e: end.getTime()};
  if (p === 'lastmonth') return {s: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(), e: new Date(now.getFullYear(), now.getMonth(), 0).getTime()};
  const n = Number(p) || 30;
  return {s: end.getTime() - (n - 1) * day, e: end.getTime()};
}
/* The period before, the same length, to compare with. */
function prevRange(p){
  p = p || S.period;
  const r = range(p);
  if (p === 'month'){ const s = new Date(r.s); const ps = new Date(s.getFullYear(), s.getMonth() - 1, 1); const last = new Date(s.getFullYear(), s.getMonth(), 0); const e = new Date(ps.getFullYear(), ps.getMonth(), Math.min(new Date(r.e).getDate(), last.getDate())); return {s: ps.getTime(), e: e.getTime()}; }
  if (p === 'lastmonth'){ const s = new Date(r.s); return {s: new Date(s.getFullYear(), s.getMonth() - 1, 1).getTime(), e: new Date(s.getFullYear(), s.getMonth(), 0).getTime()}; }
  const len = r.e - r.s + day;
  return {s: r.s - len, e: r.s - day};
}
const inR = (x, r) => x.at >= r.s && x.at < r.e + day;
/* One request covers this period and the one before, so every widget can show the change. */
/* A small key-value store in IndexedDB. localStorage on this site is nearly full with the
   tool's own saved state (about 5 MB), so copies kept there never fit; IndexedDB has room. */
const kv = (() => {
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((res, rej) => { try{ const r = indexedDB.open('edge-cache', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }catch(e){ rej(e); } }).catch(() => null));
  const tx = (mode, fn) => db().then(d => d ? new Promise(res => { try{ const t = d.transaction('kv', mode), q = fn(t.objectStore('kv')); t.oncomplete = () => res(q ? q.result : undefined); t.onerror = t.onabort = () => res(undefined); }catch(e){ res(undefined); } }) : undefined);
  const each = (prefix, drop) => tx('readwrite', s => { const r = s.openCursor(); r.onsuccess = () => { const c = r.result; if (!c) return; if (String(c.key).indexOf(prefix) === 0 && drop(c.value)) c.delete(); c.continue(); }; return null; });
  return {
    get: k => tx('readonly', s => s.get(k)),
    set: (k, v) => tx('readwrite', s => { s.put(v, k); return null; }),
    del: k => tx('readwrite', s => { s.delete(k); return null; }),
    clear: prefix => each(prefix, () => true),
    prune: (prefix, age) => each(prefix, v => !v || !v.at || Date.now() - v.at > age)
  };
})();
/* This browser's last copy of each widget's data (per person, per business, per period).
   A widget draws from it straight away; the live answer is fetched behind it and the
   widget redraws only if something changed. Kept 4 days; signing out clears it. */
const LKEY = 'el_d1|';
const sigOf = j => { const s = JSON.stringify(Object.assign({}, j, {at: 0, stale: 0})); let h = 2166136261; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return s.length + ':' + (h >>> 0); };
setTimeout(() => kv.prune(LKEY, 4 * day), 8000);
const fresh = kind => { const domain = S.domain; setTimeout(() => { try{ window.dispatchEvent(new CustomEvent('el-fresh', {detail: {kind, domain}})); }catch(e){} }, 0); };
const shape = (kind, j, cur, prev) => { const all = j.rows || []; return {all, rows: kind === 'appts' ? all : all.filter(x => inR(x, cur)), prev: kind === 'appts' ? [] : all.filter(x => inR(x, prev)), extra: j.extra || null, at: j.at}; };
/* One request covers this period and the one before, so every widget can show the change. */
function get(kind, p){
  const cur = range(p), prev = kind === 'appts' ? cur : prevRange(p);
  const k = [S.domain, kind, iso(prev.s), iso(cur.e)].join('|');
  const c = S.cache[k];
  if (c && Date.now() - c.at < 4 * 60000) return c.p;
  const body = {session: S.session, domain: S.domain, kind, start: iso(prev.s), end: iso(cur.e)};
  const lk = LKEY + ((S.me && S.me.user && S.me.user.email) || '') + '|' + k;
  const check = j => { if (j.error){ const e = new Error(j.error); e.code = j.error; e.scope = j.scope; throw e; } return j; };
  const keep = j => { const sig = sigOf(j); kv.set(lk, {at: Date.now(), sig, j}); return sig; };
  /* The tracker may answer first with its last copy (stale); then it's asked for the live numbers. */
  const live = api('portalData', body).then(check).then(j => ({j, more: j.stale ? api('portalData', Object.assign({fresh: 1}, body)).then(check) : null}));
  live.catch(() => {});
  let shown = '';
  const swap = j => { const sig = keep(j); if (sig !== shown){ shown = sig; S.cache[k] = {at: Date.now(), p: Promise.resolve(shape(kind, j, cur, prev))}; fresh(kind); } };
  const pr = kv.get(lk).then(had => {
    const mine = had && had.j && had.sig && Date.now() - had.at < 4 * day ? had : null;
    if (mine){
      shown = mine.sig;
      live.then(x => { swap(x.j); if (x.more) x.more.then(swap).catch(() => {}); }).catch(() => {});
      return shape(kind, mine.j, cur, prev);
    }
    return live.then(x => { shown = keep(x.j); if (x.more) x.more.then(swap).catch(() => {}); return shape(kind, x.j, cur, prev); });
  });
  S.cache[k] = {at: Date.now(), p: pr};
  pr.catch(() => { if (S.cache[k] && S.cache[k].p === pr) delete S.cache[k]; });
  return pr;
}
function delta(a, b){
  if (!b && !a) return '<span class="delta flat">–</span>';
  if (!b) return '<span class="delta up">new</span>';
  const d = Math.round((a - b) / b * 100);
  if (!d) return '<span class="delta flat">0%</span>';
  return '<span class="delta ' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '▲ ' : '▼ ') + Math.abs(d) + '%</span>';
}

/* ---------- lead source (channel) and location ---------- */
const CH = [['Organic', '#16a37a', /^organic search$/i], ['Paid', '#eda100', /^paid/i], ['Direct', '#2a78d6', /^direct$/i], ['Social', '#d6409f', /social/i],
  ['Email', '#7c3aed', /^e-?mail$/i], ['Referral', '#e8590c', /^referral$/i], ['AI assistants', '#0891b2', /^ai/i], ['Website', '#0ea5e9', /^website$/i], ['Phone', '#0f9d6b', /phone/i]];
const chGroup = ch => { const s = String(ch || ''); if (!s || /not tracked|not recorded/i.test(s)) return 'Not recorded'; const g = CH.find(x => x[2].test(s)); return g ? g[0] : 'Other'; };
const chColor = k => (CH.find(x => x[0] === k) || [0, k === 'Not recorded' ? '#c3ccd3' : '#64748b'])[1];
const PROV = {AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick', NL: 'Newfoundland and Labrador', NS: 'Nova Scotia', NT: 'Northwest Territories', NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec', SK: 'Saskatchewan', YT: 'Yukon'};
const tidy = v => { v = String(v || '').trim().replace(/\s+/g, ' '); if (!v || v.length > 60) return ''; if (/^[A-Z]{2}$/.test(v) && PROV[v]) return PROV[v]; return v.split(' ').map(w => w.length > 2 && w === w.toUpperCase() ? cap(w.toLowerCase()) : cap(w)).join(' '); };
const fieldOf = (r, re) => { const f = (r.fields || []).find(x => re.test(x[0]) && String(x[1]).trim()); return f ? f[1] : ''; };
function cityOf(r){
  if (r._city != null) return r._city;
  let v = fieldOf(r, /^(city|town|location|office|branch|nearest (office|location|city|town)|closest (city|town|office)|preferred (office|location)|which (office|location)|service area)\b/i);
  if (!v){
    const p = String(r.page || '').split('?')[0].replace(/\/+$/, '').split('/').filter(Boolean);
    if (p.length >= 2 && /contact|location|office|branch|area|cit(y|ies)|service-area/i.test(p[p.length - 2])) v = p[p.length - 1].replace(/[-_]+/g, ' ');
  }
  if (!v && r.city) v = r.city;
  return (r._city = tidy(v));
}
function regionOf(r){
  let v = fieldOf(r, /^(province|state|region|province\/state|state\/province)\b/i) || r.state || '';
  v = tidy(v);
  return PROV[String(v).toUpperCase()] || v;
}
const pathOf = r => { const p = String(r.page || '').split('?')[0]; return p || ''; };

/* ---------- widgets ---------- */
const T = {forms: '#1d7cf2', calls: '#0f9d6b', contacts: '#7c3aed', opps: '#d97706', appts: '#db2777', mix: '#14b8a6', email: '#6d5cf6', loc: '#e8590c'};
const W = {
  kpis: {g: 'Overview', t: 'At a glance', d: 'Leads, calls, new contacts, bookings and pipeline, compared with the period before.', ic: 'bolt', tint: T.mix, c: 12, sk: 'kpis', needs: ['forms', 'calls', 'contacts', 'appts', 'opps'], soft: true, ds: 'Form leads and calls from your website, compared with the period before.', draw: drawKpis},
  inbox: {g: 'Leads', t: 'Lead inbox', d: 'Every form submission in one searchable inbox: filter by city, source, form and page.', ic: 'inbox', tint: '#0f7a58', c: 12, sk: 'inbox', needs: ['forms'], draw: drawInbox},
  trend: {g: 'Leads', t: 'Leads over time', d: 'Form submissions, calls and new contacts, day by day.', ic: 'line', tint: T.forms, c: 8, sk: 'chart', needs: ['forms', 'calls', 'contacts'], soft: true, ds: 'Form leads and calls from your website, day by day.', draw: drawTrend},
  sources: {g: 'Leads', t: 'Lead sources', d: 'Where your form leads came from: organic, paid, direct, social and more.', ic: 'donut', tint: '#16a37a', c: 4, sk: 'chart', needs: ['forms'], draw: drawSources},
  near_city: {g: 'Leads', t: 'Leads by nearest city', d: 'Each lead’s nearest city, and the channel it came through: organic, paid, direct and more.', ds: 'Each lead’s nearest city, and the channel it came through: organic, paid, direct and more.', ic: 'pin', tint: '#0b8fa3', c: 12, sk: 'list', needs: ['forms'], only: ['kcbdesignbuild.com'], draw: drawNearCity},
  locations: {g: 'Leads', t: 'Where leads come from', d: 'Leads by city and by province, with the change from the period before.', ic: 'pin', tint: T.loc, c: 6, sk: 'list', needs: ['forms', 'contacts'], soft: true, draw: drawLocations},
  forms_by: {g: 'Leads', t: 'Leads by form', d: 'Which forms bring in the most leads.', ic: 'bars', tint: T.forms, c: 6, sk: 'list', needs: ['forms'], draw: drawFormsBy},
  pages: {g: 'Leads', t: 'Top pages for leads', d: 'The pages people were on when they sent a form.', ic: 'book', tint: '#0891b2', c: 6, sk: 'list', needs: ['forms'], draw: drawPages},
  email: {g: 'Marketing', t: 'Email marketing', d: 'Campaigns that went out, how many were delivered, who replied, and the leads and pipeline that came from email.', ic: 'mail', tint: T.email, c: 12, sk: 'inbox', needs: ['emails', 'forms', 'contacts', 'opps'], soft: true, el: true, draw: drawEmail},
  calls_mix: {g: 'Calls', t: 'Calls answered vs missed', d: 'How many calls were answered, missed or went to voicemail.', ic: 'donut', tint: T.calls, c: 4, sk: 'chart', needs: ['calls'], draw: drawCallMix},
  calls_list: {g: 'Calls', t: 'Recent calls', d: 'Inbound and outbound calls with their status and length.', ic: 'phone', tint: T.calls, c: 6, sk: 'list', needs: ['calls'], draw: drawCalls},
  forms_list: {g: 'Leads', t: 'Latest form submissions', d: 'A compact list of the newest submissions.', ic: 'form', tint: T.forms, c: 6, sk: 'list', needs: ['forms'], draw: drawForms},
  contacts_list: {g: 'Contacts', t: 'New contacts', d: 'People added to your account in the period.', ic: 'users', tint: T.contacts, c: 6, sk: 'list', needs: ['contacts'], draw: drawContacts},
  people: {g: 'Contacts', t: 'Contact list', d: 'Your full contact list: search anyone by name, email, phone or company.', ic: 'users', tint: '#4f46e5', c: 12, sk: 'table', needs: [], el: true, draw: drawPeople},
  pipeline: {g: 'Sales', t: 'Pipeline by stage', d: 'Open opportunities in each stage, with their value.', ic: 'funnel', tint: T.opps, c: 6, sk: 'list', needs: ['opps'], draw: drawPipeline},
  opps_list: {g: 'Sales', t: 'Latest opportunities', d: 'New and updated deals, with value and status.', ic: 'money', tint: T.opps, c: 6, sk: 'list', needs: ['opps'], draw: drawOpps},
  appts: {g: 'Sales', t: 'Appointments', d: 'Upcoming bookings, and the ones in the period.', ic: 'cal', tint: T.appts, c: 6, sk: 'list', needs: ['appts'], draw: drawAppts},
  note: {g: 'Text', t: 'Heading & summary', d: 'A heading and a short write-up. Attach it to a widget and it explains that widget’s numbers in plain words.', ic: 'spark', tint: '#475569', c: 12, sk: 'note', needs: [], draw: drawNote}
};
/* Where this business's data comes from: its Easyleads account, or the EDGE tracker (website forms, phone taps). */
const SITE_K = {forms: 1, calls: 1};
const srcOf = () => ((S.me && S.me.clients.find(c => c.domain === S.domain)) || {}).source || 'easyleads';
const okFor = t => { const w = W[t]; if (!w) return false; if (w.only && w.only.indexOf(S.domain) < 0) return false; if (t === 'note' || srcOf() === 'easyleads') return true; if (w.el) return false; return w.soft ? w.needs.some(k => SITE_K[k]) : w.needs.every(k => SITE_K[k]); };
const needsOf = it => it.t === 'note' ? (it.about && W[it.about] && it.about !== 'note' ? W[it.about].needs : []) : W[it.t].needs;
/* Anything a business can't have yet is left out of its report entirely (it stays in the layout, so it shows up by itself once available). */
const visIt = it => it.t === 'note' ? (!it.about || okFor(it.about)) : okFor(it.t);
const visDash = d => d.items.some(it => it.t !== 'note' && visIt(it));
const arranging = () => !!(S.editing && canEdit());
const dashList = () => { const L = layout(); const v = arranging() ? L.dashes : L.dashes.filter(visDash); return v.length ? v : L.dashes.slice(0, 1); };
const curDash = () => { const L = layout(), v = dashList(), d = L.dashes[Math.min(S.dash, L.dashes.length - 1)]; return v.indexOf(d) >= 0 ? d : v[0]; };
const item = (t, c, x) => Object.assign({id: uid(), t, c: c || W[t].c}, x || {});
/* The standard dashboards. Every row fills the full width and the widgets side by side share one
   height, so the grid lines up; each tab opens with a heading and a plain-words summary of its
   numbers. Overview and Leads work for every business; Marketing and Sales need Easyleads. */
const DEFAULT_DASHES = src => {
  const H = 440;
  const base = [
    {id: 'd1', name: 'Overview', items: [
      item('note', 12, {title: 'Your business at a glance', about: 'kpis', text: 'The headline numbers for the period picked at the top, compared with the period before.'}),
      item('kpis'),
      item('trend', 8, {h: 420}), item('sources', 4, {h: 420}),
      item('locations', 6, {h: H}), item('forms_by', 6, {h: H}),
      item('forms_list', 6, {h: H}), item('calls_list', 6, {h: H})]},
    {id: 'd2', name: 'Leads', items: [
      item('note', 12, {title: 'Every lead in one place', about: 'inbox', text: 'Search and filter every form submission by city, source, form and page. Click a lead to see everything they sent.'}),
      item('inbox'),
      item('pages', 6, {h: H}), item('calls_mix', 6, {h: H})]}
  ];
  if ((src || srcOf()) === 'site') return base;
  return base.concat([
    {id: 'd3', name: 'Marketing', items: [
      item('note', 12, {title: 'Email marketing', about: 'email', text: 'Every campaign that went out, how many were delivered, who replied, and the leads and pipeline that came from email.'}),
      item('email'),
      item('contacts_list', 6, {h: 460}), item('sources', 6, {h: 460})]},
    {id: 'd4', name: 'Sales', items: [
      item('note', 12, {title: 'Sales pipeline', about: 'pipeline', text: 'Open deals by stage with their value, the newest opportunities, and the bookings coming up.'}),
      item('pipeline', 6, {h: 460}), item('opps_list', 6, {h: 460}),
      item('appts', 12),
      item('note', 12, {title: 'Your contacts', about: 'people', text: 'Everyone in your account. Search by name, email, phone or company.'}),
      item('people')]}
  ]);
};

function errHtml(e){
  if (e && e.code === 'scope') return '<div class="err">' + ic('lock', 22) + '<br><b>Not switched on yet</b><br>This needs “' + esc(e.scope) + '” access on your ' + esc(BRAND) + ' account. EDGE Marketing can turn it on for you.</div>';
  if (e && e.code === 'hidden') return '<div class="err">' + ic('lock', 22) + '<br><b>Hidden from this business</b><br>They don’t see this widget. It shows up for them by itself once it’s available.</div>';
  if (e && e.code === 'notavailable') return '<div class="err">' + ic('lock', 22) + '<br><b>Not available for this business</b><br>This widget needs an ' + esc(BRAND) + ' account. EDGE Marketing can tell you more.</div>';
  if (e && e.code === 'notconnected') return '<div class="err"><b>Your ' + esc(BRAND) + ' account isn’t connected yet.</b><br>EDGE Marketing will let you know when it’s ready.</div>';
  return '<div class="err">Couldn’t load this right now.<br><span style="font-size:12px">' + esc(e && e.message || e) + '</span></div>';
}
function rowHtml(o){
  return '<div class="row' + (o.cls ? ' ' + o.cls : '') + '" data-i="' + o.i + '">' + (o.icon ? '<div class="av" style="background:' + (o.bg || '#94a3b8') + '">' + o.icon + '</div>'
    : '<div class="av" style="background:' + hue(o.title) + '">' + esc(initials(o.title)) + '</div>') +
    '<div class="t"><b>' + esc(o.title) + '</b><small>' + o.sub + '</small></div><div class="r">' + (o.right || '') + '</div></div>';
}
function listWith(h, rows, toRow, onOpen, empty, n){
  let shown = n || 6;
  const draw = () => {
    if (!rows.length){ h.innerHTML = '<div class="empty">' + empty + '</div>'; return; }
    h.innerHTML = '<div class="list fade-in">' + rows.slice(0, shown).map((r, i) => rowHtml(Object.assign({i}, toRow(r)))).join('') + '</div>' +
      (rows.length > shown ? '<button class="more" type="button">Show more · ' + fmt(rows.length - shown) + ' left</button>' : '');
    h.querySelectorAll('.row').forEach(el => el.addEventListener('click', () => onOpen(rows[Number(el.dataset.i)])));
    const m = h.querySelector('.more'); if (m) m.addEventListener('click', () => { shown += 10; draw(); });
  };
  draw();
}
const callState = c => {
  if (c.tap) return {k: 'ok', label: c.ads ? 'From an ad' : 'Tapped to call', cls: c.ads ? 'warn' : 'blue'};
  const s = String(c.status || '').toLowerCase();
  if (/voicemail/.test(s)) return {k: 'vm', label: 'Voicemail', cls: 'warn'};
  if (/no-answer|busy|failed|cancel|missed/.test(s) || (c.dir === 'inbound' && !c.dur)) return {k: 'missed', label: 'Missed', cls: 'bad'};
  return {k: 'ok', label: c.dir === 'outbound' ? 'Outbound' : 'Answered', cls: 'good'};
};
const groupBy = (rows, f) => { const m = {}; rows.forEach(r => { const k = f(r); if (!k) return; m[k] = (m[k] || 0) + 1; }); return Object.keys(m).map(k => ({k, n: m[k]})).sort((a, b) => b.n - a.n); };
function ranked(h, items, color, opt){
  opt = opt || {};
  const max = Math.max(1, ...items.map(x => x.n)), tot = items.reduce((s, x) => s + x.n, 0) || 1;
  h.innerHTML = items.length ? '<div class="rank fade-in">' + items.map((x, i) => '<div class="it' + (opt.onClick ? ' click' : '') + '" data-i="' + i + '"' + (opt.onClick ? ' role="button" tabindex="0" title="See these leads"' : '') + '><span class="no">' + (i + 1) + '</span><div class="nm"><span title="' + esc(x.k) + '">' + esc(x.label || x.k) + '</span><div class="tr"><i style="width:' + Math.max(2, x.n / max * 100) + '%;background:' + (x.color || color) + '"></i></div></div>' +
    '<div class="vv">' + (opt.val ? opt.val(x) : fmt(x.n)) + '<small>' + (opt.sub ? opt.sub(x) : pct(x.n, tot)) + '</small></div></div>').join('') + '</div>'
    : '<div class="empty">' + (opt.empty || 'Nothing in this period.') + '</div>';
  if (opt.onClick) h.querySelectorAll('.it').forEach(el => { const go = () => opt.onClick(items[Number(el.dataset.i)]); el.addEventListener('click', go); el.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }); });
}
function spark(vals, color){
  if (!vals.some(Boolean)) return '<svg class="sp" viewBox="0 0 100 30" preserveAspectRatio="none"><line x1="0" y1="27" x2="100" y2="27" stroke="#eef2f7" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>';
  const max = Math.max(...vals), n = vals.length;
  const pts = vals.map((v, i) => [n === 1 ? 50 : i * 100 / (n - 1), 27 - v / max * 23]);
  const d = smooth(pts);
  const gid = 'g' + Math.random().toString(36).slice(2, 7);
  return '<svg class="sp" viewBox="0 0 100 30" preserveAspectRatio="none"><defs><linearGradient id="' + gid + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + color + '" stop-opacity=".22"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs><path d="' + d + 'L100,30L0,30Z" fill="url(#' + gid + ')"/><path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
}
/* A gentle curve through the points (monotone-ish Catmull-Rom). */
function smooth(pts){
  if (pts.length < 3) return pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('');
  let d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
  for (let i = 0; i < pts.length - 1; i++){
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2, t = .18;
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t], c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    const lo = Math.min(p1[1], p2[1]), hi = Math.max(p1[1], p2[1]);
    c1[1] = Math.max(lo, Math.min(hi, c1[1])); c2[1] = Math.max(lo, Math.min(hi, c2[1]));
    d += 'C' + c1[0].toFixed(1) + ',' + c1[1].toFixed(1) + ' ' + c2[0].toFixed(1) + ',' + c2[1].toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
  }
  return d;
}
function daySeries(rows, r){ const days = Math.round((r.e - r.s) / day) + 1, a = new Array(days).fill(0); (rows || []).forEach(x => { const i = Math.floor((x.at - r.s) / day); if (i >= 0 && i < days) a[i]++; }); return a; }
function lineChart(h, labels, series, height){
  const H = height || 230, W0 = 640, pad = {l: 34, r: 12, t: 14, b: 26};
  const max = Math.max(1, ...series.flatMap(s => s.values));
  const nice = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const x = i => pad.l + (labels.length === 1 ? (W0 - pad.l - pad.r) / 2 : i * (W0 - pad.l - pad.r) / (labels.length - 1));
  const y = v => pad.t + (1 - v / nice) * (H - pad.t - pad.b);
  let svg = '<svg viewBox="0 0 ' + W0 + ' ' + H + '" preserveAspectRatio="none" style="height:' + H + 'px"><defs>' + series.map((s, i) => '<linearGradient id="lg' + i + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + s.color + '" stop-opacity=".18"/><stop offset="1" stop-color="' + s.color + '" stop-opacity="0"/></linearGradient>').join('') + '</defs>';
  /* Axis labels are HTML on top of the chart, so they never stretch with it. */
  let axis = '';
  for (let g = 0; g <= 4; g++){ const v = nice * g / 4; svg += '<line x1="' + pad.l + '" x2="' + (W0 - pad.r) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="#eef2f7" vector-effect="non-scaling-stroke" ' + (g ? 'stroke-dasharray="3 4"' : '') + '/>';
    axis += '<span class="ay" style="top:' + (y(v) / H * 100) + '%">' + fmt(v) + '</span>'; }
  const step = Math.max(1, Math.ceil(labels.length / 7));
  labels.forEach((l, i) => { if (i % step === 0) axis += '<span class="ax' + (i === 0 ? ' first' : i === labels.length - 1 ? ' last' : '') + '" style="left:' + (x(i) / W0 * 100) + '%">' + esc(l) + '</span>'; });
  series.forEach((s, si) => {
    const d = smooth(s.values.map((v, i) => [x(i), y(v)]));
    if (si === 0) svg += '<path d="' + d + 'L' + x(labels.length - 1) + ',' + y(0) + 'L' + x(0) + ',' + y(0) + 'Z" fill="url(#lg' + si + ')"/>';
    svg += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>';
  });
  svg += '<line class="cur" y1="' + pad.t + '" y2="' + (H - pad.b) + '" stroke="#c9d4e3" stroke-dasharray="3 3" opacity="0"/>' + series.map((s, si) => '<circle class="dot' + si + '" r="4" fill="#fff" stroke="' + s.color + '" stroke-width="2.4" opacity="0"/>').join('') + '</svg>';
  h.innerHTML = '<div class="chart fade-in">' + svg + '<div class="axis">' + axis + '</div><div class="tip"></div></div><div class="chips">' + series.map(s => '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + ' · <b>' + fmt(s.values.reduce((a, b) => a + b, 0)) + '</b></span>').join('') + '</div>';
  const box = h.querySelector('.chart'), el = box.querySelector('svg'), tip = box.querySelector('.tip'), cur = el.querySelector('.cur');
  box.addEventListener('mousemove', e => {
    const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W0;
    let i = Math.round((px - pad.l) / ((W0 - pad.l - pad.r) / Math.max(1, labels.length - 1)));
    i = Math.max(0, Math.min(labels.length - 1, i));
    cur.setAttribute('x1', x(i)); cur.setAttribute('x2', x(i)); cur.setAttribute('opacity', 1);
    series.forEach((s, si) => { const c = el.querySelector('.dot' + si); c.setAttribute('cx', x(i)); c.setAttribute('cy', y(s.values[i])); c.setAttribute('opacity', 1); });
    tip.innerHTML = '<b>' + esc(labels[i]) + '</b><br>' + series.map(s => '<i style="background:' + s.color + '"></i>' + esc(s.name) + ': <b>' + s.values[i] + '</b>').join('<br>');
    tip.style.left = Math.max(70, Math.min(r.width - 70, x(i) / W0 * r.width)) + 'px'; tip.style.top = (y(Math.max(...series.map(s => s.values[i]))) / H * r.height) + 'px'; tip.style.opacity = 1;
  });
  box.addEventListener('mouseleave', () => { tip.style.opacity = 0; cur.setAttribute('opacity', 0); el.querySelectorAll('circle').forEach(c => c.setAttribute('opacity', 0)); });
}
function donut(segs, sub){
  const tot = segs.reduce((s, x) => s + x.n, 0) || 1; let a = -Math.PI / 2, d = '';
  segs.forEach(s => { if (!s.n) return; const gap = segs.filter(x => x.n).length > 1 ? .025 : 0; const b = a + s.n / tot * Math.PI * 2 - (s.n === tot ? 0.0001 : 0); const a1 = a + gap / 2, b1 = b - gap / 2; const big = b1 - a1 > Math.PI ? 1 : 0;
    const p = (r, t) => (75 + r * Math.cos(t)).toFixed(2) + ' ' + (75 + r * Math.sin(t)).toFixed(2);
    d += '<path d="M' + p(68, a1) + 'A68 68 0 ' + big + ' 1 ' + p(68, b1) + 'L' + p(48, b1) + 'A48 48 0 ' + big + ' 0 ' + p(48, a1) + 'Z" fill="' + s.color + '"><title>' + esc(s.label) + ': ' + s.n + '</title></path>'; a = b; });
  return '<svg class="donut" viewBox="0 0 150 150">' + (d || '<circle cx="75" cy="75" r="58" fill="none" stroke="#eef2f7" stroke-width="20"/>') +
    '<text x="75" y="77" text-anchor="middle" font-family="Poppins" font-weight="600" font-size="26" fill="#0d1726">' + fmt(segs.reduce((s, x) => s + x.n, 0)) + '</text><text x="75" y="96" text-anchor="middle" font-size="9.5" fill="#9aa8bb" letter-spacing="1.4">' + esc(sub) + '</text></svg>';
}
const legend = (segs, tot) => '<div class="legend">' + segs.filter(s => s.n || s.always).map(s => '<div><i style="background:' + s.color + '"></i><span>' + esc(s.label) + '</span><b>' + fmt(s.n) + '</b><em>' + pct(s.n, tot) + '</em></div>').join('') + '</div>';

/* ----- At a glance ----- */
function drawKpis(h, D){
  const r = range(), pr = prevRange();
  const tile = (key, label, val, d, note, icon, tint, sp) => '<button class="kpi" type="button" data-go="' + key + '" style="--t:' + tint + '"><div class="l">' + esc(label) + ic(icon, 16) + '</div><div class="v">' + val + (d || '') + '</div><div class="n">' + note + '</div>' + (sp || '') + '</button>';
  const t = [];
  if (D.forms) t.push(tile('inbox', 'Form leads', fmt(D.forms.rows.length), delta(D.forms.rows.length, D.forms.prev.length), 'vs ' + fmt(D.forms.prev.length) + ' the period before', 'form', T.forms, spark(daySeries(D.forms.rows, r), T.forms)));
  if (D.calls){ const taps = D.calls.rows.some(c => c.tap) || srcOf() === 'site', miss = D.calls.rows.filter(c => callState(c).k === 'missed').length; t.push(tile('calls_list', taps ? 'Calls from the website' : 'Calls', fmt(D.calls.rows.length), delta(D.calls.rows.length, D.calls.prev.length), taps ? 'taps on your phone number' : miss ? '<span style="color:var(--bad)">' + miss + ' missed</span>' : 'none missed', 'phone', T.calls, spark(daySeries(D.calls.rows, r), T.calls))); }
  if (D.contacts) t.push(tile('contacts_list', 'New contacts', fmt(D.contacts.rows.length), delta(D.contacts.rows.length, D.contacts.prev.length), 'added to your account', 'users', T.contacts, spark(daySeries(D.contacts.rows, r), T.contacts)));
  if (D.appts){ const up = D.appts.rows.filter(a => a.at >= Date.now()).length; t.push(tile('appts', 'Appointments', fmt(D.appts.rows.filter(a => inR(a, r)).length), '', up + ' upcoming', 'cal', T.appts, spark(daySeries(D.appts.rows, r), T.appts))); }
  if (D.opps){ const open = D.opps.rows.concat(D.opps.prev).filter(o => o.status === 'open'), won = D.opps.all.filter(o => o.status === 'won' && inR({at: o.upd || o.at}, r));
    t.push(tile('pipeline', 'Open pipeline', money(open.reduce((s, o) => s + o.value, 0)), '', open.length + ' open · ' + won.length + ' won · ' + money(won.reduce((s, o) => s + o.value, 0)), 'money', T.opps)); }
  void pr;
  h.innerHTML = t.length ? '<div class="kpis fade-in">' + t.join('') + '</div>' : '<div class="empty">Nothing to show yet.</div>';
  h.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => openList(b.dataset.go)));
}
/* ----- Lead inbox ----- */
/* Forms are named "site.com - Request a Quote": the site part is noise inside the client's own dashboard. */
const formLabel = f => String(f || 'Website form').replace(/^[a-z0-9.-]+\.[a-z]{2,}\s*[-–—:|]\s*/i, '') || String(f);
const IB_FACETS = [['form', 'Form', f => f.form], ['city', 'City', cityOf], ['source', 'Source', f => chGroup(f.channel)], ['page', 'Page', pathOf], ['mark', 'Status', f => markStatus(IB_M, f)]];
let IB_M = {};
/* KCB: every lead with its nearest city and the channel it came through. */
function drawNearCity(h, D, it){
  const st = S.ui[it.id] = S.ui[it.id] || {city: ''};
  const rows = D.forms.rows;
  if (!rows.length){ h.innerHTML = '<div class="empty">No leads in this period yet.</div>'; return; }
  const cityName = r => cityOf(r) || 'Not given';
  const cities = groupBy(rows, cityName), max = Math.max(...cities.map(c => c.n));
  const chans = [...new Set(rows.map(r => chGroup(r.channel)))].sort((a, b) => rows.filter(r => chGroup(r.channel) === b).length - rows.filter(r => chGroup(r.channel) === a).length);
  const paint = () => {
    const list = rows.filter(r => !st.city || cityName(r) === st.city).sort((a, b) => b.at - a.at);
    h.innerHTML = '<div class="nc fade-in"><div class="nc-cities">' + cities.slice(0, 12).map(c => {
      const mine = rows.filter(r => cityName(r) === c.k);
      const segs = chans.map(g => [g, mine.filter(r => chGroup(r.channel) === g).length]).filter(x => x[1]);
      return '<button type="button" class="nc-c' + (st.city === c.k ? ' on' : '') + (c.k === 'Not given' ? ' muted' : '') + '" data-city="' + esc(c.k) + '"><span class="nm">' + ic('pin', 13) + esc(c.k) + '</span>' +
        '<span class="bar" style="width:' + Math.max(8, c.n / max * 100) + '%">' + segs.map(x => '<i style="flex:' + x[1] + ';background:' + chColor(x[0]) + '" title="' + esc(x[0]) + ': ' + x[1] + '"></i>').join('') + '</span><b>' + c.n + '</b></button>';
    }).join('') + '</div>' +
      '<div class="nc-leg">' + chans.map(g => '<span><i style="background:' + chColor(g) + '"></i>' + esc(g) + '</span>').join('') + (st.city ? '<button type="button" data-all>Show every city</button>' : '') + '</div>' +
      '<div class="nc-tbl"><table><thead><tr><th>Lead</th><th>Nearest city</th><th>Came through</th><th>Received</th></tr></thead><tbody>' +
      list.slice(0, 80).map((r, i) => { const g = chGroup(r.channel); return '<tr data-i="' + i + '"><td><b>' + esc(r.name || r.email || r.phone || 'New submission') + '</b><small>' + esc(formLabel(r.form)) + '</small></td>' +
        '<td>' + (cityOf(r) ? esc(cityOf(r)) : '<span class="muted">Not given</span>') + '</td><td><span class="nc-ch" style="--c:' + chColor(g) + '"><i></i>' + esc(g === 'Not recorded' ? 'Not recorded' : g) + '</span>' + (r.channel && g !== r.channel && g !== 'Not recorded' ? '<small>' + esc(r.channel) + '</small>' : '') + '</td>' +
        '<td class="dt">' + esc(fullDate(r.at)) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    h.querySelectorAll('[data-city]').forEach(b => b.addEventListener('click', () => { st.city = st.city === b.dataset.city ? '' : b.dataset.city; paint(); }));
    const all = h.querySelector('[data-all]'); if (all) all.addEventListener('click', () => { st.city = ''; paint(); });
    h.querySelectorAll('tr[data-i]').forEach(tr => tr.addEventListener('click', () => openSubmission(list[Number(tr.dataset.i)])));
  };
  paint();
}
/* ----- lead marks: Done / Pending / Spam, one per person, kept on the tracker ----- */
const MARKS = {done: ['Done', '#0f9d6b', 'check'], pending: ['Pending', '#d9820b', 'clock'], spam: ['Spam', '#e0413a', 'x']};
const myMarkName = () => S.me && S.me.edge ? 'EDGE Marketing' : (S.me && S.me.user.name) || '';
function marksFor(domain){
  S.marks = S.marks || {};
  const c = S.marks[domain];
  if (c && Date.now() - c.at < 60000) return c.p;
  const p = api('portalMarks', {session: S.session, domain}).then(j => { if (j.error) throw new Error(j.error); return j.marks || {}; });
  S.marks[domain] = {at: Date.now(), p};
  p.catch(() => { delete S.marks[domain]; });
  return p;
}
const markStatus = (M, r) => { const l = (M && M[r.id]) || []; return l.length ? MARKS[l[l.length - 1].s][0] : 'Unmarked'; };
function marksHtml(list, id){
  const mine = myMarkName();
  return (list || []).map(m => '<span class="mk-chip' + (m.name === mine ? ' me' : '') + '" style="--c:' + MARKS[m.s][1] + '" title="' + esc(MARKS[m.s][0] + ' · ' + (m.name || m.by) + ' · ' + fullDate(m.t)) + '">' + ic(MARKS[m.s][2], 11) + MARKS[m.s][0] + '<em>' + esc(m.by) + '</em></span>').join('') +
    '<button type="button" class="mk-add" data-mk="' + esc(id) + '" title="Mark this lead" aria-label="Mark this lead">' + ((list || []).some(m => m.name === mine) ? ic('edit', 12) : ic('plus', 12) + '<span>Mark</span>') + '</button>';
}
function markMenu(btn, r, M, onDone){
  closePops();
  const mine = myMarkName(), cur = ((M[r.id] || []).find(m => m.name === mine) || {}).s;
  const m = document.createElement('div'); m.className = 'mk-menu'; m.dataset.pop = 1;
  m.innerHTML = '<div class="mk-h">Mark as</div>' + Object.keys(MARKS).map(k => '<button type="button" data-s="' + k + '" style="--c:' + MARKS[k][1] + '"' + (cur === k ? ' class="on"' : '') + '><i>' + ic(MARKS[k][2], 12) + '</i>' + MARKS[k][0] + (cur === k ? '<small>yours</small>' : '') + '</button>').join('') +
    (cur ? '<button type="button" data-s="none" class="clr">Remove my mark</button>' : '') + '<div class="mk-f">Others’ marks stay as they are.</div>';
  btn.parentNode.appendChild(m);
  m.addEventListener('click', e => e.stopPropagation());
  m.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', async () => {
    const s = b.dataset.s; closePops();
    const before = (M[r.id] || []).slice();
    const others = before.filter(x => x.name !== mine);
    M[r.id] = s === 'none' ? others : others.concat({s, by: S.me && S.me.edge ? 'EM' : initials(mine || S.me.user.email), name: mine, t: Date.now()});
    onDone();
    try{ const j = await api('portalMark', {session: S.session, domain: S.domain, id: r.id, s}); if (j.error) throw new Error(j.error); M[r.id] = j.marks || []; onDone(); }
    catch(e){ M[r.id] = before; onDone(); toast('Couldn’t save that mark: ' + e.message); }
  }));
}
function drawInbox(h, D, it){
  const st = S.ui[it.id] = S.ui[it.id] || {q: '', sort: 'new', f: {}};
  const rows = D.forms.rows, prev = D.forms.prev;
  const people = new Set(rows.map(r => (r.email || r.phone || r.name || r.id).toLowerCase())).size;
  const cities = groupBy(rows, cityOf), top = cities[0];
  const latest = rows[0];
  h.innerHTML = '<div class="fade-in"><div class="ib-stats">' +
    '<div class="ib-stat"><div class="l">Submissions' + ic('form', 16) + '</div><div class="v">' + fmt(rows.length) + delta(rows.length, prev.length) + '</div><div class="n">' + esc(PERIODS.find(p => p[0] === S.period)[1]) + ' · ' + fmt(prev.length) + ' before</div></div>' +
    '<div class="ib-stat"><div class="l">People' + ic('users', 16) + '</div><div class="v">' + fmt(people) + '</div><div class="n">different senders</div></div>' +
    '<div class="ib-stat"><div class="l">Top city' + ic('pin', 16) + '</div><div class="v" title="' + esc(top ? top.k : '') + '">' + esc(top ? top.k : '—') + '</div><div class="n">' + (top ? pct(top.n, rows.length) + ' of submissions' : 'no city given yet') + '</div></div>' +
    '<div class="ib-stat"><div class="l">Latest' + ic('cal', 16) + '</div><div class="v">' + esc(latest ? relDay(latest.at) : '—') + '</div><div class="n">' + esc(latest ? fullDate(latest.at) : 'no submissions yet') + '</div></div></div>' +
    '<div class="ib-tools"><label class="search">' + ic('search', 17) + '<input type="search" data-q placeholder="Search names, emails, companies, cities, messages…" value="' + esc(st.q) + '"><kbd>/</kbd></label>' +
    '<button class="btn" type="button" data-sort>' + (st.sort === 'new' ? 'Newest first' : 'Oldest first') + '</button><button class="btn" type="button" data-export>' + ic('dl', 15) + 'Export</button></div>' +
    '<div class="ib-filters" data-chips></div>' +
    '<div class="ib-body"><aside class="ib-side" data-side></aside><div><div class="ib-count" data-count></div><div class="ib-list" data-list></div></div></div></div>';
  const $ = s => h.querySelector(s);
  const match = (r, skip) => IB_FACETS.every(([k, , f]) => k === skip || !st.f[k] || f(r) === st.f[k]) &&
    (!st.q || [r.name, r.email, r.phone, r.company, r.message, r.form, cityOf(r), regionOf(r), r.page, (r.fields || []).map(x => x[1]).join(' ')].join(' ').toLowerCase().indexOf(st.q.toLowerCase()) > -1);
  const shownRows = () => rows.filter(r => match(r)).sort((a, b) => st.sort === 'new' ? b.at - a.at : a.at - b.at);
  let limit = 30, M = {};
  const paint = () => {
    IB_M = M;
    const list = shownRows();
    /* filter chips */
    $('[data-chips]').innerHTML = IB_FACETS.map(([k, label]) => '<div class="fchip"><button type="button" data-chip="' + k + '"' + (st.f[k] ? ' class="on"' : '') + '>' + esc(st.f[k] ? label + ': ' + (k === 'form' ? formLabel(st.f[k]) : st.f[k]) : label) + ic('down', 14) + '</button></div>').join('');
    $('[data-chips]').querySelectorAll('[data-chip]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); chipMenu(b); }));
    /* facets */
    $('[data-side]').innerHTML = [['mark', 'Status', 'check'], ['city', 'City', 'pin'], ['source', 'Source', 'source'], ['form', 'Form', 'form'], ['page', 'Page', 'book']].map(([k, title, icon]) => {
      const f = IB_FACETS.find(x => x[0] === k)[2];
      const all = groupBy(rows.filter(r => match(r, k)), f), g = all.slice(0, 6);
      if (!g.length) return '';
      const max = Math.max(...g.map(x => x.n)), tot = all.reduce((a, x) => a + x.n, 0);
      const col = x => k === 'mark' ? ((Object.values(MARKS).find(v => v[0] === x.k) || [0, '#94a3b8'])[1]) : k === 'source' ? chColor(x.k) : k === 'city' ? '#0f9d6b' : k === 'form' ? '#1d7cf2' : '#7c5cff';
      const lab = x => k === 'form' ? formLabel(x.k) : x.k;
      return '<section class="fs"><h5><span class="hi" style="--c:' + col(g[0]) + '">' + ic(icon, 13) + '</span>' + esc(title) + (all.length > 6 ? '<small>Top 6 of ' + all.length + '</small>' : '') + '</h5><div class="facet">' +
        g.map(x => '<button type="button" data-fk="' + k + '" data-fv="' + esc(x.k) + '" title="' + esc(x.k) + '"' + (st.f[k] === x.k ? ' class="on"' : '') + ' style="--c:' + col(x) + '">' +
          '<div class="fl"><span class="t">' + esc(lab(x)) + '</span><em>' + x.n + '<small>' + pct(x.n, tot) + '</small></em></div><div class="tr"><b style="width:' + Math.max(4, x.n / max * 100) + '%"></b></div></button>').join('') + '</div></section>';
    }).join('') || '<div class="foot-note">Filters appear here once leads come in.</div>';
    $('[data-side]').querySelectorAll('[data-fk]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.fk; st.f[k] = st.f[k] === b.dataset.fv ? '' : b.dataset.fv; limit = 30; paint(); }));
    const active = Object.values(st.f).some(Boolean) || st.q;
    $('[data-count]').innerHTML = '<span>' + fmt(list.length) + ' submission' + (list.length === 1 ? '' : 's') + (active ? ' match' : '') + '</span>' + (active ? '<button type="button" data-clear>Clear filters</button>' : '');
    const cl = $('[data-clear]'); if (cl) cl.addEventListener('click', () => { st.f = {}; st.q = ''; $('[data-q]').value = ''; paint(); });
    $('[data-list]').innerHTML = list.length ? list.slice(0, limit).map((r, i) => {
      const nm = r.name || r.email || r.phone || 'New submission', city = cityOf(r), g = chGroup(r.channel);
      return '<div class="ibrow"><button class="card" type="button" data-i="' + i + '"><div class="av" style="background:' + hue(nm) + '">' + esc(initials(nm)) + '</div><div class="cb"><div class="ch"><b>' + esc(nm) + '</b><time>' + esc(fullDate(r.at)) + '</time></div>' +
        '<div class="cc">' + esc([r.email, r.phone].filter(Boolean).join(' · ') || r.company || '—') + '</div>' + (r.message ? '<div class="cm">' + esc(r.message) + '</div>' : '') +
        '<div class="tags"><span class="tag" title="' + esc(r.form) + '"><i style="background:#1d7cf2"></i>' + esc(formLabel(r.form)) + '</span>' + (city ? '<span class="tag loc">' + ic('pin', 12) + esc(city) + '</span>' : '') +
        (g !== 'Not recorded' ? '<span class="tag"><i style="background:' + chColor(g) + '"></i>' + esc(r.channel) + '</span>' : '') + '</div></div></button>' +
        '<div class="mk" data-mki="' + i + '">' + marksHtml(M[r.id], r.id) + '</div></div>';
    }).join('') + (list.length > limit ? '<button class="more" type="button" data-more>Show more · ' + fmt(list.length - limit) + ' left</button>' : '')
      : '<div class="empty">' + (rows.length ? 'No submissions match these filters.' : 'No form submissions in this period yet.') + '</div>';
    $('[data-list]').querySelectorAll('.card').forEach(el => el.addEventListener('click', () => openSubmission(list[Number(el.dataset.i)])));
    $('[data-list]').querySelectorAll('[data-mki]').forEach(box => box.addEventListener('click', e => {
      const b = e.target.closest('[data-mk]'); if (!b) return;
      e.stopPropagation();
      const r = list[Number(box.dataset.mki)];
      markMenu(b, r, M, () => { box.innerHTML = marksHtml(M[r.id], r.id); });
    }));
    const mo = $('[data-more]'); if (mo) mo.addEventListener('click', () => { limit += 30; paint(); });
  };
  const chipMenu = b => {
    closePops();
    const k = b.dataset.chip, f = IB_FACETS.find(x => x[0] === k)[2];
    const g = groupBy(rows.filter(r => match(r, k)), f);
    const m = document.createElement('div'); m.className = 'fmenu'; m.dataset.pop = 1;
    m.innerHTML = '<button type="button" data-v=""' + (!st.f[k] ? ' class="on"' : '') + '><span>All</span><em>' + fmt(rows.filter(r => match(r, k)).length) + '</em></button>' + g.map(x => '<button type="button" data-v="' + esc(x.k) + '"' + (st.f[k] === x.k ? ' class="on"' : '') + ' title="' + esc(x.k) + '"><span>' + esc(k === 'form' ? formLabel(x.k) : x.k) + '</span><em>' + x.n + '</em></button>').join('');
    b.parentNode.appendChild(m);
    m.addEventListener('click', e => e.stopPropagation());
    m.querySelectorAll('[data-v]').forEach(x => x.addEventListener('click', () => { st.f[k] = x.dataset.v; closePops(); limit = 30; paint(); }));
  };
  let qT = null;
  $('[data-q]').addEventListener('input', e => { clearTimeout(qT); qT = setTimeout(() => { st.q = e.target.value.trim(); limit = 30; paint(); }, 140); });
  $('[data-sort]').addEventListener('click', e => { st.sort = st.sort === 'new' ? 'old' : 'new'; e.currentTarget.textContent = st.sort === 'new' ? 'Newest first' : 'Oldest first'; paint(); });
  $('[data-export]').addEventListener('click', () => csv('leads-' + S.domain + '-' + iso(Date.now()) + '.csv', [['Received', 'Name', 'Email', 'Phone', 'Company', 'City', 'Province', 'Source', 'Form', 'Page', 'Message', 'Marks']].concat(shownRows().map(r => [fullDate(r.at), r.name, r.email, r.phone, r.company, cityOf(r), regionOf(r), r.channel, r.form, r.page, r.message, (M[r.id] || []).map(m => MARKS[m.s][0] + ' (' + m.by + ')').join('; ')]))));
  paint();
  const dom = S.domain;
  marksFor(dom).then(m => { if (!h.isConnected || S.domain !== dom) return; M = m; paint(); }).catch(() => {});
}
function csv(name, rows){
  const s = rows.map(r => r.map(v => { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + s], {type: 'text/csv'})); a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
/* ----- trend, sources, locations ----- */
function drawTrend(h, D, it){
  const r = range(), days = Math.round((r.e - r.s) / day) + 1, labels = [];
  for (let i = 0; i < days; i++) labels.push(new Date(r.s + i * day).toLocaleDateString('en-CA', {month: 'short', day: 'numeric'}));
  const series = [];
  if (D.forms) series.push({name: 'Form leads', values: daySeries(D.forms.rows, r), color: T.forms});
  if (D.calls) series.push({name: 'Calls', values: daySeries(D.calls.rows, r), color: T.calls});
  if (D.contacts) series.push({name: 'New contacts', values: daySeries(D.contacts.rows, r), color: T.contacts});
  if (!series.length){ h.innerHTML = '<div class="empty">Nothing to show yet.</div>'; return; }
  lineChart(h, labels, series, 240);
}
function drawSources(h, D){
  const g = groupBy(D.forms.rows, f => chGroup(f.channel));
  const segs = g.map(x => ({label: x.k, n: x.n, color: chColor(x.k)}));
  if (!segs.length){ h.innerHTML = '<div class="empty">No leads in this period yet.</div>'; return; }
  h.innerHTML = '<div class="donutrow fade-in">' + donut(segs, 'LEADS') + legend(segs, D.forms.rows.length) + '</div>' +
    (g.some(x => x.k === 'Not recorded') ? '<div class="foot-note">“Not recorded” means the form didn’t pass on where the visitor came from.</div>' : '');
}
function drawLocations(h, D, it){
  const st = S.ui[it.id] = S.ui[it.id] || {by: 'city'};
  const src = D.forms ? D.forms : null, cts = D.contacts ? D.contacts : null;
  const paint = () => {
    const f = st.by === 'city' ? cityOf : regionOf;
    let cur = src ? src.rows : [], prv = src ? src.prev : [];
    /* No location on the forms: use the contacts' address instead. */
    if (!cur.some(f) && cts){ cur = cts.rows; prv = cts.prev; }
    const pm = {}; groupBy(prv, f).forEach(x => { pm[x.k] = x.n; });
    const items = groupBy(cur, f).slice(0, 10).map(x => Object.assign(x, {p: pm[x.k] || 0}));
    const unknown = cur.filter(r => !f(r)).length;
    h.innerHTML = '<div class="mini-seg"><button type="button" data-by="city"' + (st.by === 'city' ? ' class="on"' : '') + '>City</button><button type="button" data-by="region"' + (st.by === 'region' ? ' class="on"' : '') + '>Province / state</button></div><div data-r></div>' +
      (unknown && items.length ? '<div class="foot-note">' + fmt(unknown) + ' lead' + (unknown === 1 ? '' : 's') + ' didn’t say where they’re from.</div>' : '');
    const isForms = src && cur === src.rows;
    ranked(h.querySelector('[data-r]'), items, T.loc, {val: x => fmt(x.n) + ' ' + delta(x.n, x.p), sub: x => pct(x.n, cur.length) + ' of leads', empty: 'None of your leads said where they’re from in this period.',
      onClick: isForms ? x => leadsDrawer(x.k, 'Leads from ' + x.k, cur.filter(r => f(r) === x.k), 'pin') : null});
    h.querySelectorAll('[data-by]').forEach(b => b.addEventListener('click', () => { st.by = b.dataset.by; paint(); }));
  };
  paint();
}
function drawFormsBy(h, D){
  const pm = {}; groupBy(D.forms.prev, f => f.form).forEach(x => { pm[x.k] = x.n; });
  ranked(h, groupBy(D.forms.rows, f => f.form).slice(0, 10).map(x => Object.assign(x, {p: pm[x.k] || 0, label: formLabel(x.k)})), T.forms, {val: x => fmt(x.n) + ' ' + delta(x.n, x.p), empty: 'No form submissions in this period.',
    onClick: x => leadsDrawer(formLabel(x.k), 'Leads from this form', D.forms.rows.filter(f => f.form === x.k))});
}
function drawPages(h, D){
  ranked(h, groupBy(D.forms.rows, pathOf).slice(0, 10), '#0891b2', {empty: 'No pages recorded in this period.',
    onClick: x => leadsDrawer(x.k, 'Leads sent from this page', D.forms.rows.filter(f => pathOf(f) === x.k), 'book')});
}
/* Every lead behind a number: a side panel listing them, each one opens in full. */
function leadsDrawer(title, sub, rows, icon){
  rows = rows.slice().sort((a, b) => b.at - a.at);
  const b = drawer(title, [], '<div class="ld-sum"><b>' + fmt(rows.length) + '</b> lead' + (rows.length === 1 ? '' : 's') + ' in this period' +
    (rows.length ? ' · latest ' + esc(relDay(rows[0].at)) : '') + '</div><div data-ll></div>', {icon: icon || 'form', tint: T.forms, sub: esc(sub)});
  listWith(b.querySelector('[data-ll]'), rows, f => ({title: f.name || f.email || f.phone || 'New submission', sub: esc(formLabel(f.form)) + (cityOf(f) ? ' · ' + esc(cityOf(f)) : '') + (f.email ? ' · ' + esc(f.email) : ''), right: esc(when(f.at))}),
    openSubmission, 'No leads.', 12);
}
function drawForms(h, D){
  listWith(h, D.forms.rows, f => ({title: f.name || f.email || f.phone || 'New submission', sub: esc(f.form) + (cityOf(f) ? ' · ' + esc(cityOf(f)) : '') + (f.email ? ' · ' + esc(f.email) : ''), right: esc(when(f.at))}),
    openSubmission, 'No form submissions in this period.', 6);
}
/* ----- email marketing ----- */
const subjKey = t => String(t || '').replace(/^\s*((re|fw|fwd|aw|tr)\s*:\s*)+/i, '').replace(/\s+/g, ' ').trim().toLowerCase();
function drawEmail(h, D, it){
  if (!D.emails){ h.innerHTML = errHtml({code: 'scope', scope: 'View Conversation Messages'}); return; }
  const r = range(), pr = prevRange(), E = D.emails, cur = E.rows, prev = E.prev;
  const sent = cur.filter(m => m.dir === 'outbound'), psent = prev.filter(m => m.dir === 'outbound');
  const rep = cur.filter(m => m.dir === 'inbound'), prep = prev.filter(m => m.dir === 'inbound');
  const people = new Set(rep.map(m => m.contactId || m.from).filter(Boolean));
  const allC = (E.extra && E.extra.campaigns) || null;
  const camps = allC ? allC.filter(c => inR(c, r)) : [], pcamps = allC ? allC.filter(c => inR(c, pr)) : [];
  /* Replies to a campaign: an email back with the campaign's subject (Re: …). */
  const repBy = {}; rep.forEach(m => { const k = subjKey(m.subject); (repBy[k] = repBy[k] || []).push(m); });
  camps.forEach(c => { c.replies = (repBy[subjKey(c.subject)] || []).length; c.repliers = new Set((repBy[subjKey(c.subject)] || []).map(m => m.contactId || m.from)).size; });
  const sum = (a, k) => a.reduce((t, x) => t + (x[k] || 0), 0);
  const recips = sum(camps, 'total'), deliv = sum(camps, 'delivered'), failed = sum(camps, 'failed'), pdeliv = sum(pcamps, 'delivered');
  const isEmailCh = x => chGroup(x.channel) === 'Email' || /e-?mail|newsletter/i.test(x.source || '');
  const lf = D.forms ? D.forms.rows.filter(isEmailCh) : [], lfp = D.forms ? D.forms.prev.filter(isEmailCh) : [];
  const lc = D.contacts ? D.contacts.rows.filter(isEmailCh) : [], lcp = D.contacts ? D.contacts.prev.filter(isEmailCh) : [];
  const key = x => String(x.email || x.phone || x.name || x.id).toLowerCase();
  const leads = new Set(lf.map(key).concat(lc.map(key))).size, pleads = new Set(lfp.map(key).concat(lcp.map(key))).size;
  const ecIds = new Set((D.contacts ? D.contacts.all : []).filter(isEmailCh).map(c => c.id).concat(rep.map(m => m.contactId)));
  const opps = D.opps ? D.opps.all.filter(o => /e-?mail|newsletter|campaign/i.test(o.source || '') || ecIds.has(o.contactId)) : [];
  const oppsCur = opps.filter(o => inR(o, r)), won = opps.filter(o => o.status === 'won');
  const tile = (label, val, d, note, icon, tint) => '<div class="kpi" style="--t:' + tint + ';cursor:default"><div class="l">' + esc(label) + ic(icon, 16) + '</div><div class="v">' + val + (d || '') + '</div><div class="n">' + note + '</div></div>';
  const top = camps.slice().sort((a, b) => (b.replies - a.replies) || (b.delivered - a.delivered))[0];
  const sumTxt = (camps.length ? '<b>' + fmt(camps.length) + ' campaign' + (camps.length === 1 ? '' : 's') + '</b> went out this period to <b>' + fmt(recips) + ' recipients</b>, and <b>' + fmt(deliv) + ' were delivered</b> (' + pct(deliv, recips) + ')' + (failed ? ', ' + fmt(failed) + ' couldn’t be delivered' : '') + '. '
      : allC ? 'No email campaigns went out this period. ' : '') +
    '<b>' + fmt(rep.length) + ' repl' + (rep.length === 1 ? 'y' : 'ies') + '</b> came in from <b>' + fmt(people.size) + ' ' + (people.size === 1 ? 'person' : 'people') + '</b>' +
    (top && top.replies ? ', most of them to “' + esc(top.name) + '”' : '') + (leads ? ', and <b>' + fmt(leads) + ' new lead' + (leads === 1 ? '' : 's') + '</b> came from email' : '') +
    (oppsCur.length ? ', adding <b>' + money(oppsCur.reduce((s2, o) => s2 + o.value, 0)) + '</b> in new pipeline' : '') + '.';
  h.innerHTML = '<div class="fade-in"><div class="kpis">' +
    tile('Campaigns sent', fmt(camps.length), delta(camps.length, pcamps.length), fmt(recips) + ' recipients', 'mail', T.email) +
    tile('Delivered', fmt(deliv), delta(deliv, pdeliv), recips ? pct(deliv, recips) + ' delivered' + (failed ? ' · <span style="color:var(--bad)">' + fmt(failed) + ' failed</span>' : '') : 'no campaigns this period', 'in', '#0891b2') +
    tile('Replies', fmt(rep.length), delta(rep.length, prep.length), fmt(people.size) + ' ' + (people.size === 1 ? 'person' : 'people') + ' replied', 'reply', '#0f9d6b') +
    tile('Leads from email', fmt(leads), delta(leads, pleads), 'forms and new contacts from email', 'target', '#db2777') +
    (D.opps ? tile('Pipeline from email', money(opps.filter(o => o.status === 'open').reduce((s2, o) => s2 + o.value, 0)), '', oppsCur.length + ' new · ' + won.length + ' won · ' + money(won.reduce((s2, o) => s2 + o.value, 0)), 'money', T.opps) : '') +
    '</div><div class="em-sum"><div class="wic">' + ic('spark', 18) + '</div><div>' + sumTxt + '</div></div>' +
    '<div class="two"><div><div class="sec-h">Email activity <small>one-to-one emails sent and replies, by day</small></div><div data-chart></div></div><div>' +
    (allC ? '<div class="sec-h">Campaigns <small>' + fmt(camps.length) + ' this period · click one to see the email</small></div>' + (camps.length ? '<div class="tbl-wrap" style="max-height:340px"><table class="tbl clicky"><thead><tr><th>Campaign</th><th class="num">Recipients</th><th class="num">Delivered</th><th class="num">Replies</th></tr></thead><tbody>' +
      camps.map((c, i) => '<tr data-c="' + i + '" tabindex="0"><td><b class="cn" title="' + esc(c.name) + '">' + esc(c.name) + '</b><div class="muted" style="font-size:11.5px">' + esc(new Date(c.at).toLocaleDateString('en-CA', {month: 'short', day: 'numeric'})) + (c.subject ? ' · ' + esc(c.subject) : '') + '</div></td>' +
        '<td class="num">' + fmt(c.total) + '</td><td class="num">' + fmt(c.delivered) + '<div class="muted" style="font-size:11px">' + pct(c.delivered, c.total) + '</div></td><td class="num">' + (c.replies ? '<b>' + fmt(c.replies) + '</b>' : '0') + '</td></tr>').join('') + '</tbody></table></div>'
        : '<div class="empty">No campaigns went out in this period.</div>')
      : '<div class="empty">Campaigns aren’t switched on for this account yet.</div>') +
    '</div></div>' + (rep.length ? '<div class="sec-h" style="margin-top:18px">Latest replies <small>' + fmt(rep.length) + ' · click one to read it</small></div><div data-replies></div>' : '') +
    (E.extra && E.extra.truncated ? '<div class="foot-note">This period has a lot of email; the oldest messages may not be counted. Pick a shorter period for exact numbers.</div>' : '') +
    '<div class="foot-note">Delivered and failed are ' + esc(BRAND) + '’s own counts for each send. Opens and clicks aren’t shared by ' + esc(BRAND) + '’s API, so they aren’t shown rather than guessed.</div></div>';
  const days = Math.round((r.e - r.s) / day) + 1, labels = [];
  for (let i = 0; i < days; i++) labels.push(new Date(r.s + i * day).toLocaleDateString('en-CA', {month: 'short', day: 'numeric'}));
  lineChart(h.querySelector('[data-chart]'), labels, [{name: 'Sent', values: daySeries(sent, r), color: T.email}, {name: 'Replies', values: daySeries(rep, r), color: '#0f9d6b'}], 220);
  h.querySelectorAll('[data-c]').forEach(tr => { const go = () => openCampaign(camps[Number(tr.dataset.c)], repBy); tr.addEventListener('click', go); tr.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }); });
  const rh = h.querySelector('[data-replies]');
  if (rh) listWith(rh, rep, m => ({title: m.name || m.from || 'A contact', sub: esc(m.snip ? m.snip.split('\n')[0].slice(0, 140) : (m.subject || 'Email reply')), icon: ic('reply', 16), bg: '#0f9d6b', right: esc(when(m.at))}),
    openMessage, '', 5);
}
/* An email shown exactly as it looks, in a sealed frame (no scripts run). */
function emailFrame(host, html){
  const f = document.createElement('iframe');
  f.className = 'mailframe'; f.setAttribute('sandbox', 'allow-same-origin allow-popups allow-popups-to-escape-sandbox'); f.setAttribute('referrerpolicy', 'no-referrer'); f.title = 'Email';
  const full = /<(html|body)[\s>]/i.test(html);
  const base = '<base target="_blank"><style>html,body{margin:0}img{max-width:100%;height:auto}' + (full ? 'body{padding:0 4px}' : 'body{padding:22px 26px;font:15px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1b2533}blockquote{margin:12px 0;padding-left:12px;border-left:3px solid #dfe5ee;color:#6b7a90}') + '</style>';
  f.srcdoc = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + base) : base + html;
  host.innerHTML = ''; host.appendChild(f);
  const fit = () => { try{ const d = f.contentDocument; if (d && d.body) f.style.height = Math.max(240, Math.min(6000, d.documentElement.scrollHeight)) + 'px'; }catch(e){} };
  f.addEventListener('load', () => { fit(); setTimeout(fit, 400); setTimeout(fit, 1500); });
  return f;
}
function mailModal(title, sub, head){
  const b = document.createElement('div'); b.className = 'modal-back';
  b.innerHTML = '<div class="modal mailm" role="dialog" aria-modal="true"><div class="mm-top"><div class="wic" style="--t:' + T.email + '">' + ic('mail', 19) + '</div><div style="min-width:0;flex:1"><h2>' + esc(title) + '</h2><div class="mm-sub">' + sub + '</div></div>' +
    '<div class="seg sm" data-dev><button type="button" class="on" data-v="d">Desktop</button><button type="button" data-v="m">Phone</button></div><button class="iconbtn" type="button" data-x aria-label="Close">' + ic('x') + '</button></div>' +
    (head || '') + '<div class="mm-stage"><div class="mm-paper" data-paper><div class="mm-load"><span class="spin lg"></span><span>Loading the email…</span></div></div></div></div>';
  document.body.appendChild(b);
  const close = () => { b.remove(); document.removeEventListener('keydown', k); };
  const k = e => { if (e.key === 'Escape'){ const all = document.querySelectorAll('.drawer-back,.modal-back'); if (all[all.length - 1] === b) close(); } };
  document.addEventListener('keydown', k);
  b.addEventListener('click', e => { if (e.target === b) close(); });
  b.querySelector('[data-x]').addEventListener('click', close);
  b.querySelectorAll('[data-dev] button').forEach(x => x.addEventListener('click', () => { b.querySelectorAll('[data-dev] button').forEach(y => y.classList.toggle('on', y === x)); b.querySelector('[data-paper]').classList.toggle('phone', x.dataset.v === 'm'); }));
  return b;
}
async function openCampaign(c, repBy){
  const reps = (repBy && repBy[subjKey(c.subject)]) || [];
  const stat = (l, v, n) => '<div class="mm-stat"><b>' + v + '</b><span>' + esc(l) + '</span>' + (n ? '<small>' + n + '</small>' : '') + '</div>';
  const b = mailModal(c.name, esc((c.subject ? 'Subject: ' + c.subject + ' · ' : '') + fullDate(c.at)),
    '<div class="mm-stats">' + stat('Recipients', fmt(c.total)) + stat('Delivered', fmt(c.delivered), pct(c.delivered, c.total)) + stat('Couldn’t be delivered', fmt(c.failed), c.failed ? pct(c.failed, c.total) : '') +
    stat('Replies', fmt(reps.length), reps.length ? fmt(new Set(reps.map(m => m.contactId || m.from)).size) + ' people' : '') + '</div>' +
    (reps.length ? '<details class="mm-reps"><summary>Who replied (' + fmt(reps.length) + ')</summary><div data-reps></div></details>' : ''));
  const rr = b.querySelector('[data-reps]');
  if (rr) listWith(rr, reps, m => ({title: m.name || m.from || 'A contact', sub: esc((m.snip || m.subject || '').split('\n')[0].slice(0, 140)), icon: ic('reply', 16), bg: '#0f9d6b', right: esc(when(m.at))}), openMessage, '', 6);
  try{
    const j = await api('portalData', {session: S.session, domain: S.domain, kind: 'campaign', id: c.id});
    if (!b.isConnected) return;
    if (j.error) throw new Error(j.error);
    if (!j.html) throw new Error('This campaign’s email isn’t available to preview.');
    emailFrame(b.querySelector('[data-paper]'), j.html);
  }catch(e){ if (b.isConnected) b.querySelector('[data-paper]').innerHTML = errHtml(e); }
}
async function openMessage(m){
  const b = mailModal(m.subject || 'Email', esc((m.dir === 'inbound' ? 'From ' + (m.name ? m.name + ' · ' : '') + (m.from || '') : 'Sent') + ' · ' + fullDate(m.at)));
  b.querySelector('[data-dev]').style.display = 'none';
  try{
    const j = await api('portalData', {session: S.session, domain: S.domain, kind: 'message', id: m.id});
    if (!b.isConnected) return;
    if (j.error){ const e = new Error(j.error); e.code = j.error; e.scope = j.scope; throw e; }
    const x = j.message || {};
    b.querySelector('.mm-sub').textContent = [x.from ? 'From ' + x.from : '', x.to ? 'to ' + x.to : '', fullDate(x.at || m.at), x.attachments ? x.attachments + ' attachment' + (x.attachments === 1 ? '' : 's') : ''].filter(Boolean).join(' · ');
    if (j.html && /<[a-z][\s\S]*>/i.test(j.html)) emailFrame(b.querySelector('[data-paper]'), j.html);
    else b.querySelector('[data-paper]').innerHTML = '<div class="msgbox" style="margin:0">' + esc(j.html || m.snip || '(no text)') + '</div>';
  }catch(e){
    if (!b.isConnected) return;
    b.querySelector('[data-paper]').innerHTML = m.snip ? '<div class="msgbox" style="margin:0">' + esc(m.snip) + '</div>' : errHtml(e);
  }
}
/* ----- calls ----- */
function drawCallMix(h, D){
  if (D.calls.rows.some(x => x.tap)){
    const ads = D.calls.rows.filter(x => x.ads).length, segs2 = [{label: 'From the website', n: D.calls.rows.length - ads, color: T.calls, always: 1}, {label: 'From ads', n: ads, color: '#eda100', always: 1}];
    h.innerHTML = '<div class="donutrow fade-in">' + donut(segs2, 'CALL TAPS') + legend(segs2, D.calls.rows.length) + '</div><div class="foot-note">Taps on your phone number, recorded by Google Analytics. It can’t tell whether a call was answered.</div>';
    return;
  }
  const c = {ok: 0, missed: 0, vm: 0}; D.calls.rows.forEach(x => { c[callState(x).k]++; });
  const segs = [{label: 'Answered / outbound', n: c.ok, color: T.calls, always: 1}, {label: 'Missed', n: c.missed, color: '#e0413a', always: 1}, {label: 'Voicemail', n: c.vm, color: '#d9820b', always: 1}];
  h.innerHTML = '<div class="donutrow fade-in">' + donut(segs, 'CALLS') + legend(segs, D.calls.rows.length) + '</div>';
}
function drawCalls(h, D){
  listWith(h, D.calls.rows, c => { const st = callState(c);
    if (c.tap) return {title: c.ads ? 'Call from an ad' : 'Call from the website', sub: esc((c.page || '/') + ' · ' + chLabel(c.source)), icon: ic('phone', 16), bg: c.ads ? '#eda100' : T.calls,
      right: '<span class="pill ' + st.cls + '">' + st.label + '</span><br>' + esc(when(c.at))};
    return {title: c.name || (c.dir === 'outbound' ? c.to : c.from) || 'Unknown caller', sub: (c.dir === 'outbound' ? 'Outbound' : 'Inbound') + ' · ' + (c.dur ? dur(c.dur) : 'no answer'),
      icon: ic(st.k === 'missed' ? 'missed' : c.dir === 'outbound' ? 'out' : 'in', 16), bg: st.k === 'missed' ? '#e0413a' : st.k === 'vm' ? '#d9820b' : T.calls,
      right: '<span class="pill ' + st.cls + '">' + st.label + '</span><br>' + esc(when(c.at))}; }, openCall, 'No calls in this period.', 6);
}
/* ----- contacts ----- */
function drawContacts(h, D){
  listWith(h, D.contacts.rows, k => ({title: k.name, sub: [k.email, k.phone, [k.city, k.state].filter(Boolean).join(', ')].filter(Boolean).map(esc).join(' · ') || 'No contact details', right: (k.channel ? '<span class="pill blue">' + esc(k.channel) + '</span><br>' : '') + esc(when(k.at))}),
    openContact, 'No new contacts in this period.', 6);
}
function drawPeople(h, D, it){
  const st = S.ui[it.id] = S.ui[it.id] || {q: '', page: 1};
  h.innerHTML = '<div class="ib-tools"><label class="search">' + ic('search', 17) + '<input type="search" data-q placeholder="Search your contacts by name, email, phone or company…" value="' + esc(st.q) + '"></label><button class="btn" type="button" data-export>' + ic('dl', 15) + 'Export page</button></div><div data-t>' + SK.list(6) + '</div>';
  let rows = [], seq = 0;
  const load = async () => {
    const my = ++seq, t = h.querySelector('[data-t]');
    t.style.opacity = rows.length ? .55 : 1;
    try{
      const j = await api('portalData', {session: S.session, domain: S.domain, kind: 'people', page: st.page, q: st.q});
      if (my !== seq || !t.isConnected) return;
      if (j.error){ const e = new Error(j.error); e.code = j.error; e.scope = j.scope; throw e; }
      rows = j.rows || [];
      const tot = (j.extra && j.extra.total) || rows.length, from = (st.page - 1) * 100 + 1;
      t.style.opacity = 1;
      t.innerHTML = rows.length ? '<div class="tbl-wrap fade-in"><table class="tbl"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Location</th><th>Source</th><th>Tags</th><th class="num">Added</th></tr></thead><tbody>' +
        rows.map((k, i) => '<tr class="click" data-i="' + i + '"><td><div class="who"><div class="av" style="background:' + hue(k.name) + '">' + esc(initials(k.name)) + '</div><div style="min-width:0"><b>' + esc(k.name) + '</b>' + (k.company ? '<span class="muted" style="font-size:12px">' + esc(k.company) + '</span>' : '') + '</div></div></td>' +
          '<td>' + esc(k.email || '—') + '</td><td style="white-space:nowrap">' + esc(k.phone || '—') + '</td><td>' + esc([k.city, k.state].filter(Boolean).join(', ') || '—') + '</td><td>' + (k.channel ? '<span class="pill blue">' + esc(k.channel) + '</span>' : '<span class="muted">—</span>') + '</td>' +
          '<td>' + (k.tags || []).slice(0, 3).map(x => '<span class="pill" style="margin:1px">' + esc(x) + '</span>').join('') + ((k.tags || []).length > 3 ? '<span class="muted" style="font-size:11px"> +' + (k.tags.length - 3) + '</span>' : '') + '</td><td class="num muted">' + esc(relDay(k.at)) + '</td></tr>').join('') + '</tbody></table></div>' +
        '<div class="pager"><span>' + fmt(from) + '–' + fmt(from + rows.length - 1) + ' of ' + fmt(tot) + ' contact' + (tot === 1 ? '' : 's') + (st.q ? ' matching “' + esc(st.q) + '”' : '') + '</span><div><button class="btn sm" type="button" data-pg="-1"' + (st.page <= 1 ? ' disabled' : '') + '>' + ic('chevl', 14) + 'Previous</button><button class="btn sm" type="button" data-pg="1"' + (from + rows.length - 1 >= tot ? ' disabled' : '') + '>Next' + ic('chev', 14) + '</button></div></div>'
        : '<div class="empty">' + (st.q ? 'No contacts match “' + esc(st.q) + '”.' : 'No contacts yet.') + '</div>';
      t.querySelectorAll('tr[data-i]').forEach(tr => tr.addEventListener('click', () => openContact(rows[Number(tr.dataset.i)])));
      t.querySelectorAll('[data-pg]').forEach(b => b.addEventListener('click', () => { st.page = Math.max(1, st.page + Number(b.dataset.pg)); load(); h.scrollIntoView({behavior: 'smooth', block: 'start'}); }));
    }catch(e){ if (my === seq && t.isConnected){ t.style.opacity = 1; t.innerHTML = errHtml(e); } }
  };
  let qT = null;
  h.querySelector('[data-q]').addEventListener('input', e => { clearTimeout(qT); qT = setTimeout(() => { st.q = e.target.value.trim(); st.page = 1; load(); }, 400); });
  h.querySelector('[data-export]').addEventListener('click', () => csv('contacts-' + S.domain + '-p' + st.page + '.csv', [['Name', 'Company', 'Email', 'Phone', 'City', 'Province/state', 'Source', 'Tags', 'Added']].concat(rows.map(k => [k.name, k.company, k.email, k.phone, k.city, k.state, k.channel || k.source, (k.tags || []).join('; '), fullDate(k.at)]))));
  load();
}
/* ----- sales ----- */
function drawPipeline(h, D){
  const open = D.opps.all.filter(o => o.status === 'open'), m = {};
  open.forEach(o => { const k = o.stage || 'No stage'; m[k] = m[k] || {k, n: 0, v: 0, pos: o.stagePos}; m[k].n++; m[k].v += o.value; });
  const items = Object.values(m).sort((a, b) => a.pos - b.pos);
  if (!items.length){ h.innerHTML = '<div class="empty">No open opportunities.</div>'; return; }
  ranked(h, items, T.opps, {val: x => money(x.v), sub: x => x.n + ' open'});
}
function drawOpps(h, D){
  const rows = D.opps.all.slice().sort((a, b) => (b.upd || b.at) - (a.upd || a.at));
  listWith(h, rows, o => ({title: o.name, sub: esc([o.pipeline, o.stage].filter(Boolean).join(' › ')), icon: ic('money', 16), bg: T.opps,
    right: '<b style="color:var(--ink)">' + money(o.value) + '</b><br><span class="pill ' + (o.status === 'won' ? 'good' : o.status === 'lost' || o.status === 'abandoned' ? 'bad' : 'blue') + '">' + esc(o.status) + '</span>'}),
    o => drawer(o.name, [['Value', money(o.value)], ['Status', o.status], ['Pipeline', o.pipeline], ['Stage', o.stage], ['Contact', o.contact], ['Source', o.source], ['Created', fullDate(o.at)], ['Updated', o.upd ? fullDate(o.upd) : '']], null, {icon: 'money', tint: T.opps}),
    'No opportunities yet.', 6);
}
function drawAppts(h, D){
  const now = Date.now(), up = D.appts.rows.filter(a => a.at >= now), past = D.appts.rows.filter(a => a.at < now).reverse();
  listWith(h, up.concat(past), a => ({title: a.title, sub: esc(a.calendar) + ' · ' + esc(new Date(a.at).toLocaleString('en-CA', {weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})),
    icon: ic('cal', 16), bg: a.at >= now ? T.appts : '#94a3b8', right: '<span class="pill ' + (/cancel|no.?show/i.test(a.status) ? 'bad' : /confirm|show/i.test(a.status) ? 'good' : '') + '">' + esc(a.status || (a.at >= now ? 'upcoming' : 'done')) + '</span>'}),
    a => drawer(a.title, [['When', fullDate(a.at)], ['Calendar', a.calendar], ['Status', a.status]], null, {icon: 'cal', tint: T.appts}), 'No appointments.', 6);
}


/* ----- heading & summary ----- */
/* Plain-words read of a widget's numbers: what changed, what stands out, what's next. */
const plural = (n, a, b) => fmt(n) + ' ' + (n === 1 ? a : (b || a + 's'));
const chg = (a, b) => { if (!b && !a) return 'the same as the period before'; if (!b) return 'up from none the period before'; const d = Math.round((a - b) / b * 100); return d === 0 ? 'level with the period before' : (d > 0 ? 'up ' : 'down ') + Math.abs(d) + '% from ' + fmt(b) + ' the period before'; };
function busiest(rows, r){ const a = daySeries(rows, r); let mi = -1, mx = 0; a.forEach((v, i) => { if (v > mx){ mx = v; mi = i; } }); return mi < 0 ? null : {n: mx, d: new Date(r.s + mi * day).toLocaleDateString('en-CA', {weekday: 'long', month: 'short', day: 'numeric'})}; }
function weekdayPeak(rows){ if (rows.length < 5) return ''; const c = [0, 0, 0, 0, 0, 0, 0]; rows.forEach(x => c[new Date(x.at).getDay()]++); const i = c.indexOf(Math.max(...c)); return ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'][i]; }
function sumForms(D, focus){
  const F = D.forms; if (!F) return [];
  const r = range(), rows = F.rows, out = [];
  out.push('<b>' + plural(rows.length, 'form lead') + '</b> came in, ' + chg(rows.length, F.prev.length) + '.');
  if (!rows.length) return out;
  const src = groupBy(rows, f => chGroup(f.channel)).filter(x => x.k !== 'Not recorded'), pg = groupBy(rows, pathOf), fm = groupBy(rows, f => f.form), ct = groupBy(rows, cityOf);
  if (focus !== 'pages' && src[0]) out.push('<b>' + esc(src[0].k) + '</b> brought the most, ' + pct(src[0].n, rows.length) + ' of them' + (src[1] ? ', then ' + esc(src[1].k) + ' (' + pct(src[1].n, rows.length) + ')' : '') + '.');
  if ((focus === 'pages' || focus === 'inbox') && pg[0]) out.push('The page that sends the most leads is <b>' + esc(pg[0].k) + '</b> (' + plural(pg[0].n, 'lead') + ')' + (pg[1] ? ', followed by ' + esc(pg[1].k) : '') + '.');
  if ((focus === 'forms_by' || focus === 'inbox' || focus === 'forms_list') && fm[0]) out.push('Most people used <b>' + esc(formLabel(fm[0].k)) + '</b> (' + pct(fm[0].n, rows.length) + ').');
  if ((focus === 'locations' || focus === 'inbox') && ct[0]) out.push('<b>' + esc(ct[0].k) + '</b> is where the most leads are from (' + plural(ct[0].n, 'lead') + ').');
  const b = busiest(rows, r), wd = weekdayPeak(rows);
  if (focus === 'trend' || focus === 'kpis' || focus === 'inbox'){ if (b && b.n > 1) out.push('The busiest day was <b>' + esc(b.d) + '</b> with ' + plural(b.n, 'lead') + (wd ? '; ' + wd + ' tend to be busiest' : '') + '.'); }
  return out;
}
const SUM = {
  kpis: D => { const o = sumForms(D, 'kpis').slice(0, 2);
    if (D.calls) o.push(D.calls.rows.some(c => c.tap) || srcOf() === 'site' ? '<b>' + plural(D.calls.rows.length, 'call') + '</b> started from your website, ' + chg(D.calls.rows.length, D.calls.prev.length) + '.'
      : '<b>' + plural(D.calls.rows.length, 'call') + '</b>, ' + chg(D.calls.rows.length, D.calls.prev.length) + (D.calls.rows.filter(c => callState(c).k === 'missed').length ? '; ' + D.calls.rows.filter(c => callState(c).k === 'missed').length + ' were missed' : '') + '.');
    if (D.contacts) o.push('<b>' + plural(D.contacts.rows.length, 'new contact') + '</b> were added.');
    if (D.opps){ const open = D.opps.all.filter(x => x.status === 'open'); o.push('<b>' + money(open.reduce((a, x) => a + x.value, 0)) + '</b> is open in your pipeline across ' + plural(open.length, 'deal') + '.'); }
    return o; },
  inbox: D => sumForms(D, 'inbox'), forms_list: D => sumForms(D, 'forms_list'), forms_by: D => sumForms(D, 'forms_by'), pages: D => sumForms(D, 'pages'),
  sources: D => sumForms(D, 'sources'), locations: D => sumForms(D, 'locations'), trend: D => sumForms(D, 'trend'),
  calls_list: D => SUM.calls_mix(D), calls_mix: D => { const c = D.calls; if (!c) return []; const rows = c.rows, o = ['<b>' + plural(rows.length, 'call') + '</b>, ' + chg(rows.length, c.prev.length) + '.'];
    if (rows.some(x => x.tap)){ const ads = rows.filter(x => x.ads).length; if (rows.length) o.push(ads ? pct(ads, rows.length) + ' came from ads, the rest from people browsing your site.' : 'All of them came from people browsing your site.'); const pg = groupBy(rows, x => x.page); if (pg[0]) o.push('Most calls start on <b>' + esc(pg[0].k || '/') + '</b>.'); return o; }
    const st = {ok: 0, missed: 0, vm: 0}; rows.forEach(x => st[callState(x).k]++); if (rows.length) o.push(pct(st.ok, rows.length) + ' were answered' + (st.missed ? ', ' + st.missed + ' missed' : '') + (st.vm ? ' and ' + st.vm + ' went to voicemail' : '') + '.');
    const wd = weekdayPeak(rows); if (wd) o.push(wd + ' are your busiest days for calls.'); return o; },
  contacts_list: D => { const c = D.contacts; if (!c) return []; const o = ['<b>' + plural(c.rows.length, 'new contact') + '</b>, ' + chg(c.rows.length, c.prev.length) + '.']; const g = groupBy(c.rows, k => k.channel).filter(x => x.k); if (g[0]) o.push('Most came through <b>' + esc(g[0].k) + '</b>.'); return o; },
  people: () => ['Your full contact list, searchable by name, email, phone or company.'],
  pipeline: D => { const p = D.opps; if (!p) return []; const open = p.all.filter(x => x.status === 'open'), won = p.all.filter(x => x.status === 'won' && inR({at: x.upd || x.at}, range()));
    const st = {}; open.forEach(x => { st[x.stage] = (st[x.stage] || 0) + x.value; }); const top = Object.keys(st).sort((a, b) => st[b] - st[a])[0];
    return ['<b>' + money(open.reduce((a, x) => a + x.value, 0)) + '</b> is open across ' + plural(open.length, 'deal') + '.', top ? 'The most value sits in <b>' + esc(top) + '</b> (' + money(st[top]) + ').' : '', won.length ? '<b>' + plural(won.length, 'deal') + ' won</b> this period, worth ' + money(won.reduce((a, x) => a + x.value, 0)) + '.' : 'No deals were marked won this period.'].filter(Boolean); },
  opps_list: D => SUM.pipeline(D),
  appts: D => { const a = D.appts; if (!a) return []; const now = Date.now(), up = a.rows.filter(x => x.at >= now), inP = a.rows.filter(x => inR(x, range()));
    return ['<b>' + plural(inP.length, 'appointment') + '</b> in this period.', up.length ? '<b>' + plural(up.length, 'upcoming booking') + '</b>; the next is ' + esc(new Date(up[0].at).toLocaleString('en-CA', {weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})) + '.' : 'Nothing booked ahead yet.']; },
  email: D => { const E = D.emails; if (!E) return []; const r = range(), c = ((E.extra && E.extra.campaigns) || []).filter(x => inR(x, r)), rep = E.rows.filter(m => m.dir === 'inbound');
    const tot = c.reduce((a, x) => a + x.total, 0), del = c.reduce((a, x) => a + x.delivered, 0);
    return [c.length ? '<b>' + plural(c.length, 'campaign') + '</b> reached <b>' + fmt(del) + '</b> of ' + fmt(tot) + ' recipients (' + pct(del, tot) + ' delivered).' : 'No campaigns went out this period.',
      '<b>' + plural(rep.length, 'reply', 'replies') + '</b> came back, ' + chg(rep.length, E.prev.filter(m => m.dir === 'inbound').length) + '.']; }
};
function drawNote(h, D, it){
  const about = it.about && W[it.about] && it.about !== 'note' ? it.about : '';
  const lines = about && SUM[about] ? SUM[about](D).filter(Boolean) : [];
  const text = String(it.text || '').trim();
  h.innerHTML = '<div class="note fade-in">' +
    (text ? '<p class="nt">' + esc(text).replace(/\n/g, '<br>') + '</p>' : '') +
    (lines.length ? '<div class="nsum"><div class="nsh">' + ic('spark', 14) + 'What the numbers say' + (about ? '<span>about “' + esc(W[about].t) + '” · ' + esc(rangeText()) + '</span>' : '') + '</div><ul>' + lines.map(l => '<li>' + l + '</li>').join('') + '</ul></div>' : '') +
    (!text && !lines.length ? '<div class="empty">' + (S.editing ? 'Click the pencil to write a note, or attach it to a widget for an automatic summary.' : 'Nothing here yet.') + '</div>' : '') + '</div>';
}
function noteEditor(it, dash, done){
  const b = document.createElement('div'); b.className = 'modal-back';
  const types = [...new Set(dash.items.map(x => x.t).filter(t => t !== 'note' && W[t]))];
  b.innerHTML = '<div class="modal" style="width:min(560px,100%)" role="dialog" aria-modal="true"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px"><div><h2>Heading &amp; summary</h2><div style="color:var(--ink-2);font-size:13px">A title for a section of the dashboard, with your own words and an automatic read of the numbers.</div></div><button class="iconbtn" type="button" data-x aria-label="Close">' + ic('x') + '</button></div>' +
    '<div class="ne"><label>Heading</label><input type="text" data-t maxlength="80" value="' + esc(it.title || '') + '" placeholder="e.g. How your leads are doing">' +
    '<label>Your note <small>optional</small></label><textarea data-n rows="4" maxlength="600" placeholder="Anything you want to say about this section">' + esc(it.text || '') + '</textarea>' +
    '<label>Explain the numbers of</label><select data-a><option value="">Nothing, just my note</option>' + types.map(t => '<option value="' + t + '"' + (it.about === t ? ' selected' : '') + '>' + esc(W[t].t) + '</option>').join('') + '</select>' +
    '<div class="ne-act"><button class="btn" type="button" data-x2>Cancel</button><button class="btn go" type="button" data-ok>Save</button></div></div></div>';
  document.body.appendChild(b);
  const close = () => b.remove();
  b.addEventListener('click', e => { if (e.target === b) close(); });
  b.querySelector('[data-x]').addEventListener('click', close); b.querySelector('[data-x2]').addEventListener('click', close);
  b.querySelector('[data-ok]').addEventListener('click', () => {
    it.title = b.querySelector('[data-t]').value.trim().slice(0, 80); it.text = b.querySelector('[data-n]').value.trim().slice(0, 600); it.about = b.querySelector('[data-a]').value;
    close(); saveLayout(); done();
  });
  setTimeout(() => b.querySelector('[data-t]').focus(), 30);
}

/* ---------- detail drawers ---------- */
function drawer(title, pairs, extra, o){
  o = o || {};
  const b = document.createElement('div'); b.className = 'drawer-back';
  b.innerHTML = '<div class="drawer" role="dialog" aria-modal="true"><div style="display:flex;justify-content:space-between;align-items:center"><span class="pill">' + ic('lock', 12) + ' Read only</span><button class="iconbtn" type="button" data-x aria-label="Close">' + ic('x') + '</button></div>' +
    '<div class="dh">' + (o.icon ? '<div class="av" style="background:' + (o.tint || T.email) + ';border-radius:16px">' + ic(o.icon, 22) + '</div>' : '<div class="av" style="background:' + hue(title) + '">' + esc(initials(title)) + '</div>') + '<div style="min-width:0"><h3>' + esc(title) + '</h3>' + (o.sub ? '<div class="dsub">' + o.sub + '</div>' : '') + '</div></div>' +
    (extra || '') + (pairs.length ? '<dl class="kv">' : '<dl class="kv" hidden>') + pairs.filter(p => p[1] != null && p[1] !== '').map(p => '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd>').join('') + '</dl></div>';
  document.body.appendChild(b);
  const close = () => { b.remove(); document.removeEventListener('keydown', k); };
  const k = e => { if (e.key === 'Escape'){ const all = document.querySelectorAll('.drawer-back,.modal-back'); if (all[all.length - 1] === b) close(); } };
  document.addEventListener('keydown', k);
  b.addEventListener('click', e => { if (e.target === b) close(); });
  b.querySelector('[data-x]').addEventListener('click', close);
  b.close = close;
  return b;
}
const openSubmission = f => drawer(f.name || f.email || 'Form submission',
  [['Received', fullDate(f.at)], ['Form', f.form], ['Email', f.email], ['Phone', f.phone], ['Company', f.company], ['City', cityOf(f)], ['Province / state', regionOf(f)], ['Source', f.channel], ['Page', f.page]]
    .concat((f.fields || []).filter(x => !/^(phone|company|message|comments?|questions?|city|town|province|state|region)$/i.test(x[0]) && x[1] !== f.message)),
  f.message ? '<div class="msgbox">' + esc(f.message) + '</div>' : '', {sub: esc([f.email, f.phone].filter(Boolean).join(' · '))});
const chLabel = sm => { const p = String(sm || '').split(' / '), s = p[0] || '', m = (p[1] || '').toLowerCase(); if (/cpc|ppc|paid/.test(m)) return 'Ads · ' + s; if (m === 'organic') return 'Organic · ' + s; if (s === '(direct)') return 'Direct'; if (m === 'referral') return 'Referral · ' + s; return sm || 'Not recorded'; };
const openCall = c => { if (c.tap){ drawer(c.ads ? 'Call from an ad' : 'Call from the website', [['When', fullDate(c.at)], ['Page', c.page || '/'], ['Came from', chLabel(c.source)], ['Source / medium', c.source]], '<div class="msgbox" style="white-space:normal">Someone tapped your phone number on your website. Google Analytics records the tap; it can’t tell whether the call was answered or who called.</div>', {icon: 'phone', tint: T.calls}); return; }
  const st = callState(c); drawer(c.name || 'Call', [['Status', st.label], ['Direction', c.dir], ['Length', c.dur ? dur(c.dur) : '—'], ['From', c.from], ['To', c.to], ['When', fullDate(c.at)]], null, {icon: 'phone', tint: st.k === 'missed' ? '#e0413a' : T.calls}); };
const openContact = k => drawer(k.name, [['Email', k.email], ['Phone', k.phone], ['Company', k.company], ['City', k.city], ['Province / state', k.state], ['Country', k.country], ['Source', k.channel || k.source], ['Tags', (k.tags || []).join(', ')], ['Added', fullDate(k.at)]], null, {sub: esc(k.email || k.phone || '')});
function openList(type){
  const el = document.querySelector('.w[data-t="' + type + '"]');
  if (el){ el.scrollIntoView({behavior: 'smooth', block: 'center'}); el.animate([{boxShadow: '0 0 0 3px #1d7cf2'}, {boxShadow: '0 0 0 0 transparent'}], {duration: 1400}); }
  else toast('Add the “' + W[type].t + '” widget to see the details.');
}

/* ---------- dashboards ---------- */
function layout(){
  if (!S.layout || !Array.isArray(S.layout.dashes) || !S.layout.dashes.length) S.layout = {v: LAYOUT_V, dashes: DEFAULT_DASHES()};
  if (S.layout.v === 2) S.layout.v = LAYOUT_V;   /* v3 only adds sizes and notes; nothing to migrate */
  /* Dashboards saved before the inbox, email and contact-list widgets: add them once. */
  if ((S.layout.v || 1) < LAYOUT_V){
    const L = S.layout, first = L.dashes[0];
    if (first && !first.items.some(i => i.t === 'inbox')) first.items.splice(Math.min(1, first.items.length), 0, item('inbox'));
    if (!L.dashes.some(d => d.items.some(i => i.t === 'email'))) { const mk = DEFAULT_DASHES().find(d => d.items.some(i => i.t === 'email')); if (mk) L.dashes.push(mk); }
    if (!L.dashes.some(d => d.items.some(i => i.t === 'people'))){ const sales = L.dashes.find(d => /sales/i.test(d.name)); if (sales) sales.items.push(item('people')); else L.dashes.push({id: uid(), name: 'Contacts', items: [item('people')]}); }
    L.v = LAYOUT_V; setTimeout(saveLayout, 0);
  }
  /* Widgets made for one client appear on their dashboard by themselves (hidden everywhere else). */
  Object.keys(W).filter(t => W[t].only && W[t].only.indexOf(S.domain) > -1).forEach(t => {
    const L = S.layout;
    if (L.dashes.some(d => d.items.some(i => i.t === t))) return;
    const first = L.dashes[0], at = first.items.findIndex(i => i.t === 'kpis');
    first.items.splice(at < 0 ? 0 : at + 1, 0, item(t));
  });
  return S.layout;
}
let saveT = null;
function saveLayout(){
  if (!canEdit()) return;
  ls.set('el_layout_' + (S.me && S.me.user.email), S.layout);
  clearTimeout(saveT);
  saveT = setTimeout(() => api('portalSaveLayout', {session: S.session, layout: S.layout}).then(j => { if (j.error) toast(j.error); }).catch(() => {}), 1200);
}
function header(me, c){
  return '<header class="top"><div class="top-in">' +
    '<div class="brandmark"><img src="img/easyleads-logo.png" alt="' + esc(BRAND) + '"></div><div class="sep hide-sm"></div>' +
    (me ? '<div class="client"><img alt="" src="https://www.google.com/s2/favicons?domain=' + encodeURIComponent(c.domain || '') + '&sz=64" onerror="this.style.visibility=\'hidden\'">' +
      (me.clients.length > 1 ? '<select data-client aria-label="Business">' + me.clients.map(x => '<option value="' + esc(x.domain) + '"' + (x.domain === S.domain ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select>' : '<b>' + esc(c.name || '') + '</b>') + '</div>' +
      (S.preview ? '<span class="pill warn hide-sm">' + ic('eye', 12) + ' Preview as client</span>' : '') : '<div class="sk" style="width:180px;height:38px;border-radius:14px"></div>') +
    '<div class="grow"></div>' +
    (me ? '<div class="seg hide-sm" data-period>' + PERIODS.map(p => '<button type="button" data-p="' + p[0] + '"' + (p[0] === S.period ? ' class="on"' : '') + '>' + p[1] + '</button>').join('') + '</div>' +
      '<div class="anchor"><button class="iconbtn" type="button" data-bell title="Form submissions" aria-label="Form submissions">' + ic('bell') + '<span class="spin" data-bells></span><span class="badge" data-bellc hidden></span></button></div>' +
      '<div class="anchor"><button class="iconbtn" type="button" data-phone title="Calls" aria-label="Calls">' + ic('phone') + '<span class="spin" data-phones></span><span class="badge" data-phonec hidden></span></button></div>' +
      '<div class="anchor"><button class="avatar" type="button" data-me aria-label="Account">' + esc(initials(me.user.name || me.user.email)) + '</button></div>'
      : '<div class="sk hide-sm" style="width:360px;height:38px;border-radius:13px"></div><div class="sk" style="width:40px;height:40px;border-radius:13px"></div><div class="sk" style="width:40px;height:40px;border-radius:13px"></div>') +
    '</div></header>';
}
/* The page while the account is loading: the real shape, shimmering. */
function renderShell(){
  app.innerHTML = header(null, {}) + '<main class="wrap"><div class="tabs"><div class="sk" style="width:96px;height:36px;border-radius:12px"></div><div class="sk" style="width:96px;height:36px;border-radius:12px"></div><div class="sk" style="width:80px;height:36px;border-radius:12px"></div></div>' +
    '<div class="bar"><div><div class="sk" style="width:220px;height:30px"></div><div class="sk" style="width:300px;height:12px;margin-top:10px"></div></div></div><div class="grid">' +
    [[12, 'kpis'], [8, 'chart'], [4, 'chart'], [12, 'inbox']].map(x => '<section class="w" style="--c:' + x[0] + '"><div class="wh"><div class="sk" style="width:38px;height:38px;border-radius:12px"></div><div style="flex:1"><div class="sk" style="width:160px;height:13px"></div><div class="sk" style="width:240px;height:10px;margin-top:7px"></div></div></div>' + SK[x[1]]() + '</section>').join('') + '</div></main>';
}
function renderApp(){
  const me = S.me, L = layout(), dash = curDash(), VD = dashList();
  const c = me.clients.find(x => x.domain === S.domain) || me.clients[0] || {};
  app.innerHTML = header(me, c) +
    '<main class="wrap' + (S.editing ? ' editing' : '') + '">' +
    '<div class="seg mob-period" data-period>' + PERIODS.map(p => '<button type="button" data-p="' + p[0] + '"' + (p[0] === S.period ? ' class="on"' : '') + '>' + p[1] + '</button>').join('') + '</div>' +
    (me.edge ? '<div class="edgebar">' + ic('edit', 15) + '<div class="eb-t"><b>You’re arranging this dashboard as EDGE.</b> Whatever you set here is exactly what ' + esc(me.user.name || me.user.email) + ' sees.</div>' +
      '<button class="btn eb-std" type="button" data-std title="Every new login, and any login without a dashboard of its own, starts with these dashboards and tabs">' + ic('grid', 14) + 'Make this the standard for new logins</button></div>' : '') +
    (VD.length > 1 || canEdit() ? '<div class="tabs" role="tablist">' + VD.map(d => { const hid = !visDash(d); return '<button class="tab' + (d === dash ? ' on' : '') + '" type="button" role="tab" data-dash="' + L.dashes.indexOf(d) + '"' + (hid ? ' style="opacity:.5" title="Hidden from this business until something on it is available"' : '') + '>' + esc(d.name) + (hid ? ' · hidden' : '') + '</button>'; }).join('') +
      (canEdit() ? '<button class="tab add" type="button" data-newdash>' + ic('plus', 14) + ' New dashboard</button>' : '') + '</div>' : '') +
    '<div class="bar"><div><h2>' + esc(dash.name) + '</h2><div class="sub">' + ic('cal', 13) + esc(rangeText()) + ' <span style="opacity:.5">·</span> <span class="ro">' + ic('lock', 12) + (srcOf() === 'site' ? 'Read-only view of your website leads' : 'Read-only view of your ' + esc(BRAND) + ' account') + '</span></div></div><div class="grow"></div>' +
      (S.editing ? '<button class="btn" type="button" data-addw>' + ic('plus', 15) + 'Add widget</button><button class="btn" type="button" data-addnote>' + ic('spark', 15) + 'Add heading</button><button class="btn" type="button" data-rename>' + ic('edit', 15) + 'Rename</button>' +
        (L.dashes.length > 1 ? '<button class="btn" type="button" data-deldash>Delete dashboard</button>' : '') : '') +
      (canEdit() ? '<button class="btn' + (S.editing ? ' go' : '') + '" type="button" data-edit>' + (S.editing ? ic('check', 15) + 'Done' : ic('grid', 15) + 'Customize') + '</button>' : '') + '</div>' +
      (S.editing ? '<div class="edithint">' + ic('grid', 14) + '<span>Drag a widget by its top bar to move it. Drag its edges or corner to make it wider, narrower, taller or shorter. Double-click the bottom edge to fit its content.</span></div>' : '') +
    '<div class="grid" data-grid></div></main>';
  wireTop(); drawGrid(dash);
  bellCheck();
  botMount();
}
const rangeText = () => { const r = range(); return new Date(r.s).toLocaleDateString('en-CA', {month: 'short', day: 'numeric', year: 'numeric'}) + ' – ' + new Date(r.e).toLocaleDateString('en-CA', {month: 'short', day: 'numeric', year: 'numeric'}); };

function wireTop(){
  const q = s => app.querySelector(s);
  app.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { S.period = b.dataset.p; ls.set('el_period', S.period); renderApp(); }));
  const cs = q('[data-client]'); if (cs) cs.addEventListener('change', () => { S.domain = cs.value; S.ui = {}; ls.set('el_domain', S.domain); renderApp(); });
  app.querySelectorAll('[data-dash]').forEach(b => b.addEventListener('click', () => { S.dash = Number(b.dataset.dash); renderApp(); }));
  const nd = q('[data-newdash]'); if (nd) nd.addEventListener('click', () => {
    const name = prompt('Name the new dashboard:', 'My dashboard'); if (!name || !name.trim()) return;
    layout().dashes.push({id: uid(), name: name.trim().slice(0, 40), items: [item('kpis')]});
    S.dash = layout().dashes.length - 1; S.editing = true; saveLayout(); renderApp();
  });
  const sd = q('[data-std]'); if (sd) sd.addEventListener('click', async () => {
    if (!confirm('Make these dashboards and tabs the standard for every new login?\n\nLogins that already have their own dashboard keep it.')) return;
    sd.disabled = true;
    try{ const j = await api('portalSaveDefaultLayout', {session: S.session, layout: layout()}); toast(j && j.ok ? 'Saved: new logins start with this dashboard' : (j && j.error) || 'Couldn’t save that.'); }
    catch(e){ toast(e.message); }
    sd.disabled = false;
  });
  const ed = q('[data-edit]'); if (ed) ed.addEventListener('click', () => { S.editing = !S.editing; renderApp(); });
  const an = q('[data-addnote]'); if (an) an.addEventListener('click', () => { const dd = curDash(); const n = item('note', 12, {title: 'Summary'}); dd.items.unshift(n); saveLayout(); renderApp(); noteEditor(n, dd, () => renderApp()); });
  const L = layout(), dash = curDash();
  const aw = q('[data-addw]'); if (aw) aw.addEventListener('click', () => catalog(dash));
  const rn = q('[data-rename]'); if (rn) rn.addEventListener('click', () => { const n = prompt('Dashboard name:', dash.name); if (n && n.trim()){ dash.name = n.trim().slice(0, 40); saveLayout(); renderApp(); } });
  const dd = q('[data-deldash]'); if (dd) dd.addEventListener('click', () => { if (!confirm('Delete the “' + dash.name + '” dashboard?')) return; L.dashes.splice(L.dashes.indexOf(dash), 1); S.dash = 0; saveLayout(); renderApp(); });
  q('[data-bell]').addEventListener('click', e => { e.stopPropagation(); feedPop('forms'); });
  q('[data-phone]').addEventListener('click', e => { e.stopPropagation(); feedPop('calls'); });
  q('[data-me]').addEventListener('click', e => { e.stopPropagation(); meMenu(); });
}
/* Wide or narrow layout inside a widget, from its own width; and its height in the masonry grid. */
const ROW = 1, GAP = 18;
const fitRow = el => { if (!el.isConnected) return; const h = el.getBoundingClientRect().height; el.style.gridRowEnd = 'span ' + Math.max(1, Math.ceil((h + GAP) / ROW)); };
const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(es => es.forEach(e => { const w = e.contentRect.width; e.target.classList.toggle('nar', w < 640); e.target.classList.toggle('mid', w >= 640 && w < 900); fitRow(e.target); })) : null;
const canEdit = () => !!(S.me && S.me.canEdit !== false);
const SIZES = {w: [[3, '¼'], [4, '⅓'], [6, '½'], [8, '⅔'], [9, '¾'], [12, 'Full']], h: [[0, 'Fit content'], [260, 'Compact'], [420, 'Medium'], [620, 'Tall'], [860, 'Extra tall']]};
const MINH = 160, MAXH = 1600;

function drawGrid(dash){
  const grid = app.querySelector('[data-grid]');
  grid.innerHTML = '';
  const shown = arranging() ? dash.items : dash.items.filter(visIt);
  if (!shown.length){ grid.innerHTML = '<div class="w" style="--c:12"><div class="empty">This dashboard is empty.' + (canEdit() ? ' Click <b>Customize</b>, then <b>Add widget</b>.' : '') + '</div></div>'; return; }
  shown.forEach(it => {
    const def = W[it.t]; if (!def) return;
    const el = document.createElement('section');
    const cols = Math.max(3, Math.min(12, it.c || def.c));
    el.className = 'w' + (it.t === 'note' ? ' w-note' : '') + (it.h ? ' fixed' : '');
    el.style.setProperty('--c', cols); el.style.setProperty('--t', def.tint); if (it.h) el.style.setProperty('--h', it.h + 'px');
    el.dataset.t = it.t; el.dataset.id = it.id;
    const title = it.t === 'note' ? (it.title || 'Summary') : (it.title || def.t), dsc = srcOf() === 'site' && def.ds ? def.ds : def.d;
    el.innerHTML = '<div class="wh" data-grip><div class="wic">' + ic(def.ic, 19) + '</div><div class="tt"><h3>' + esc(title) + '</h3>' + (it.t === 'note' ? '' : '<div class="d" title="' + esc(dsc) + '">' + esc(dsc) + '</div>') + '</div><div class="wtools">' +
      '<span class="grip" title="Drag to move">' + ic('move', 15) + '</span>' +
      (it.t === 'note' ? '<button class="tb" type="button" data-note title="Edit heading and summary">' + ic('edit', 13) + '</button>' : '<button class="tb" type="button" data-sum title="Add a heading and summary above this widget">' + ic('spark', 13) + '</button>') +
      '<button class="tb" type="button" data-size title="Size">' + ic('size', 13) + '<span>' + cols + '/12</span></button><button class="tb" type="button" data-del title="Remove">' + ic('x', 13) + '</button></div></div>' +
      '<div class="wbody" data-body><div class="wl">' + SK[def.sk || 'list']() + '<div class="wl-badge"><span class="wl-ring"><img src="img/easyleads-mark.png" alt=""></span><span class="wl-t">Loading ' + esc(String(title).toLowerCase()) + '</span></div></div></div>' +
      (canEdit() ? '<div class="rz rz-e" data-rz="e" title="Drag to change the width"></div><div class="rz rz-s" data-rz="s" title="Drag to change the height · double-click to fit"></div><div class="rz rz-se" data-rz="se" title="Drag to resize"></div>' : '');
    grid.appendChild(el);
    if (ro) ro.observe(el); else fitRow(el);
    const body = el.querySelector('[data-body]');
    const needs = needsOf(it);
    if (!visIt(it)){ body.innerHTML = errHtml({code: 'hidden'}); el.style.opacity = '.6'; }
    else { const load = () => Promise.all(needs.filter(k => srcOf() === 'easyleads' || SITE_K[k]).map(k => get(k).then(v => [k, v], e => [k, null, e]))).then(res => {
      if (!body.isConnected) return;
      const D = {}, errs = [];
      res.forEach(r => { if (r[1]) D[r[0]] = r[1]; else errs.push(r[2]); });
      const hard = it.t !== 'note' && needs.length && (errs.length === res.length || (!def.soft && errs.length));
      if (hard){ const ec = errs[0] && errs[0].code; if (!arranging() && (ec === 'scope' || ec === 'notavailable')){ if (ro) ro.unobserve(el); el.remove(); return; } body.innerHTML = errHtml(errs[0]); return; }
      try{ body.innerHTML = ''; def.draw(body, D, it); }catch(e){ console.warn(e); body.innerHTML = errHtml(e); }
      fitRow(el);
    }); load();
      /* Newer numbers for this widget arrived: draw them in place (not while arranging the dashboard). */
      const onFresh = e => { if (!body.isConnected){ window.removeEventListener('el-fresh', onFresh); return; } const x = e.detail || {}; if (x.domain === S.domain && needs.indexOf(x.kind) > -1 && !arranging()) load(); };
      window.addEventListener('el-fresh', onFresh);
    }
    if (!canEdit()) return;
    const setC = c => { it.c = Math.max(3, Math.min(12, c)); el.style.setProperty('--c', it.c); el.querySelector('[data-size] span').textContent = it.c + '/12'; saveLayout(); };
    const setH = h => { it.h = h ? Math.max(MINH, Math.min(MAXH, Math.round(h / 10) * 10)) : 0; el.classList.toggle('fixed', !!it.h); if (it.h) el.style.setProperty('--h', it.h + 'px'); else el.style.removeProperty('--h'); fitRow(el); saveLayout(); };
    el.querySelector('[data-del]').addEventListener('click', () => { el.animate([{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'scale(.96)'}], {duration: 160, easing: 'ease-out'}).onfinish = () => { dash.items.splice(dash.items.indexOf(it), 1); saveLayout(); drawGrid(dash); }; });
    el.querySelector('[data-size]').addEventListener('click', e => { e.stopPropagation(); sizeMenu(e.currentTarget, it, def, setC, setH, el); });
    const nb = el.querySelector('[data-note]'); if (nb) nb.addEventListener('click', () => noteEditor(it, dash, () => drawGrid(dash)));
    const sb = el.querySelector('[data-sum]'); if (sb) sb.addEventListener('click', () => { const n = item('note', 12, {title: def.t, about: it.t}); dash.items.splice(dash.items.indexOf(it), 0, n); saveLayout(); drawGrid(dash); noteEditor(n, dash, () => drawGrid(dash)); });
    /* resize: right edge = width, bottom edge = height, corner = both; snapped and shown live */
    el.querySelectorAll('[data-rz]').forEach(hd => {
      if (hd.dataset.rz === 's') hd.addEventListener('dblclick', () => setH(0));
      hd.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation(); hd.setPointerCapture(e.pointerId);
        const mode = hd.dataset.rz, r0 = el.getBoundingClientRect(), gw = grid.getBoundingClientRect().width, colW = (gw + GAP) / (getComputedStyle(grid).gridTemplateColumns.split(' ').length || 12);
        const c0 = it.c || def.c, h0 = r0.height;
        const badge = document.createElement('div'); badge.className = 'rzb'; el.appendChild(badge);
        const ghost = document.createElement('div'); ghost.className = 'rzghost'; el.appendChild(ghost);
        el.classList.add('resizing'); document.body.classList.add('resizing', 'cur-' + mode);
        let c = c0, h = it.h || 0;
        const show = () => { badge.innerHTML = '<b>' + c + '</b> of 12 wide' + (mode !== 'e' ? ' · <b>' + (h ? h + 'px' : 'fit') + '</b> tall' : ''); };
        const mv = ev => {
          if (mode !== 's'){ c = Math.max(3, Math.min(12, Math.round((r0.width + ev.clientX - e.clientX + GAP) / colW))); el.style.setProperty('--c', c); }
          if (mode !== 'e'){ h = Math.max(MINH, Math.min(MAXH, Math.round((h0 + ev.clientY - e.clientY) / 10) * 10)); el.classList.add('fixed'); el.style.setProperty('--h', h + 'px'); fitRow(el); }
          show();
        };
        const up = () => { hd.removeEventListener('pointermove', mv); hd.removeEventListener('pointerup', up); hd.removeEventListener('pointercancel', up); badge.remove(); ghost.remove(); el.classList.remove('resizing'); document.body.classList.remove('resizing', 'cur-' + mode);
          if (c !== c0) setC(c); if (mode !== 'e' && h !== (it.h || 0)) setH(h); };
        show(); hd.addEventListener('pointermove', mv); hd.addEventListener('pointerup', up); hd.addEventListener('pointercancel', up);
      });
    });
    /* move: pick a widget up by its top bar; the others glide out of the way */
    el.querySelector('[data-grip]').addEventListener('pointerdown', e => {
      if (!S.editing || e.button !== 0 || e.target.closest('button')) return;
      startMove(e, el, it, dash, grid);
    });
  });
}
/* FLIP: remember where every widget was, move things in the DOM, then animate each from old to new. */
function flip(grid, change){
  const els = [...grid.children], before = new Map(els.map(x => [x, x.getBoundingClientRect()]));
  change();
  els.forEach(x => { if (x.classList.contains('lifted')) return; const a = before.get(x), b = x.getBoundingClientRect(); if (!a) return; const dx = a.left - b.left, dy = a.top - b.top;
    if (dx || dy) x.animate([{transform: 'translate(' + dx + 'px,' + dy + 'px)'}, {transform: 'none'}], {duration: 240, easing: 'cubic-bezier(.2,.7,.2,1)'}); });
}
function startMove(e, el, it, dash, grid){
  const sx = e.clientX, sy = e.clientY, r0 = el.getBoundingClientRect();
  let started = false, ghost = null, raf = 0, lastY = sy, lastX = sx, hold = 0;
  const begin = () => {
    started = true;
    ghost = el.cloneNode(true); ghost.className += ' ghost'; ghost.style.width = r0.width + 'px'; ghost.style.height = Math.min(r0.height, 420) + 'px';
    ghost.style.left = r0.left + 'px'; ghost.style.top = r0.top + 'px'; document.body.appendChild(ghost);
    el.classList.add('placeholder'); document.body.classList.add('moving');
  };
  const scroll = () => { const m = 70, y = lastY; let d = 0; if (y < m) d = -Math.ceil((m - y) / 4); else if (y > innerHeight - m) d = Math.ceil((y - (innerHeight - m)) / 4); if (d){ scrollBy(0, d); place(lastX, lastY); } raf = requestAnimationFrame(scroll); };
  const place = (x, y) => {
    const t = document.elementFromPoint(x, y), over = t && t.closest('.grid > .w');
    if (!over || over === el || !grid.contains(over)) return;
    const rr = over.getBoundingClientRect(), after = (rr.width < grid.clientWidth * .9 && Math.abs(y - (rr.top + rr.height / 2)) < rr.height / 2) ? x > rr.left + rr.width / 2 : y > rr.top + rr.height / 2;
    const ref = after ? over.nextSibling : over;
    if (ref === el || ref === el.nextSibling && !after) return;
    if (Date.now() - hold < 180) return; hold = Date.now();
    flip(grid, () => grid.insertBefore(el, ref));
  };
  const mv = ev => {
    lastX = ev.clientX; lastY = ev.clientY;
    if (!started){ if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return; begin(); raf = requestAnimationFrame(scroll); }
    ghost.style.transform = 'translate(' + (ev.clientX - sx) + 'px,' + (ev.clientY - sy) + 'px) rotate(.6deg)';
    place(ev.clientX, ev.clientY);
  };
  const up = () => {
    document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); cancelAnimationFrame(raf);
    if (!started) return;
    const to = el.getBoundingClientRect();
    ghost.animate([{transform: ghost.style.transform, opacity: 1}, {transform: 'translate(' + (to.left - r0.left) + 'px,' + (to.top - r0.top) + 'px)', opacity: .2}], {duration: 200, easing: 'ease-out'}).onfinish = () => ghost.remove();
    el.classList.remove('placeholder'); document.body.classList.remove('moving');
    const order = [...grid.children].map(x => x.dataset.id);
    dash.items.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    saveLayout();
  };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
}
function sizeMenu(btn, it, def, setC, setH, el){
  closePops();
  const m = document.createElement('div'); m.className = 'menu sizem'; m.dataset.pop = 1;
  const c = it.c || def.c, h = it.h || 0;
  m.innerHTML = '<div class="sm-h">Width</div><div class="sm-row">' + SIZES.w.map(x => '<button type="button" data-c="' + x[0] + '"' + (x[0] === c ? ' class="on"' : '') + '><i style="--f:' + (x[0] / 12) + '"></i>' + x[1] + '</button>').join('') + '</div>' +
    '<div class="sm-h">Height</div><div class="sm-col">' + SIZES.h.map(x => '<button type="button" data-h="' + x[0] + '"' + (x[0] === h || (!h && !x[0]) ? ' class="on"' : '') + '>' + x[1] + (x[0] ? '<small>' + x[0] + 'px</small>' : '<small>grows with it</small>') + '</button>').join('') + '</div>' +
    '<div class="sm-tip">Or drag the widget’s edges for any size.</div>';
  btn.closest('.wtools').appendChild(m);
  m.addEventListener('click', e => e.stopPropagation());
  m.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => { setC(Number(b.dataset.c)); m.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x === b)); }));
  m.querySelectorAll('[data-h]').forEach(b => b.addEventListener('click', () => { setH(Number(b.dataset.h)); m.querySelectorAll('[data-h]').forEach(x => x.classList.toggle('on', x === b)); }));
}

function catalog(dash){
  const b = document.createElement('div'); b.className = 'modal-back';
  const has = new Set(dash.items.map(i => i.t));
  const groups = [...new Set(Object.values(W).map(w => w.g))];
  b.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px"><div><h2>Add widgets</h2><div style="color:var(--ink-2);font-size:13px">Pick what you want to see on “' + esc(dash.name) + '”. You can add the same widget to as many dashboards as you like.</div></div>' +
    '<button class="iconbtn" type="button" data-x aria-label="Close">' + ic('x') + '</button></div><div class="cat">' +
    groups.filter(g => Object.keys(W).some(k => W[k].g === g && okFor(k))).map(g => '<div class="grp">' + esc(g) + '</div>' + Object.keys(W).filter(k => W[k].g === g && okFor(k)).map(k => '<div class="it"><div class="wic" style="--t:' + W[k].tint + '">' + ic(W[k].ic, 19) + '</div><div><b>' + esc(W[k].t) + '</b><small>' + esc(W[k].d) + '</small></div>' +
      '<button class="btn sm' + (has.has(k) ? '' : ' go') + '" type="button" data-add="' + k + '">' + (has.has(k) ? 'Add again' : 'Add') + '</button></div>').join('')).join('') + '</div></div>';
  document.body.appendChild(b);
  const close = () => { b.remove(); renderApp(); };
  b.addEventListener('click', e => { if (e.target === b) close(); });
  b.querySelector('[data-x]').addEventListener('click', close);
  b.querySelectorAll('[data-add]').forEach(x => x.addEventListener('click', () => { dash.items.push(item(x.dataset.add)); saveLayout(); x.textContent = 'Added ✓'; x.classList.remove('go'); }));
}

/* ---------- bell (forms) and phone (calls) ---------- */
const seenKey = k => 'el_seen_' + k + '_' + S.domain;
const feed = {forms: null, calls: null};
function bellCheck(){
  ['forms', 'calls'].forEach(k => {
    const spin = app.querySelector(k === 'forms' ? '[data-bells]' : '[data-phones]');
    feed[k] = get(k, '30').then(j => {
      const seen = ls.get(seenKey(k), 0);
      const rows = k === 'calls' ? j.rows.filter(c => c.dir !== 'outbound') : j.rows;
      const n = rows.filter(x => x.at > seen).length;
      const b = app.querySelector(k === 'forms' ? '[data-bellc]' : '[data-phonec]');
      if (!seen) ls.set(seenKey(k), Date.now());
      if (b && seen){ b.hidden = !n; b.textContent = n > 99 ? '99+' : n; if (n) b.parentNode.classList.add('ring'); }
      return j;
    }).finally(() => { if (spin) spin.remove(); });
    feed[k].catch(() => {});
  });
}
async function feedPop(k){
  closePops();
  const anchor = app.querySelector(k === 'forms' ? '[data-bell]' : '[data-phone]').parentNode;
  const pop = document.createElement('div'); pop.className = 'pop'; pop.dataset.pop = 1;
  pop.innerHTML = '<h4>' + (k === 'forms' ? 'Form submissions' : 'Calls') + '<button class="tb" type="button" data-read>Mark all read</button></h4><div class="list">' + SK.list(4) + '</div><div class="pfoot">Last 30 days</div>';
  anchor.appendChild(pop);
  pop.addEventListener('click', e => e.stopPropagation());
  const seen = ls.get(seenKey(k), 0);
  try{
    const j = await (feed[k] || get(k, '30'));
    if (!pop.isConnected) return;
    const rows = j.rows.slice(0, 30), list = pop.querySelector('.list');
    list.innerHTML = rows.length ? rows.map((x, i) => {
      if (k === 'forms') return rowHtml({i, cls: x.at > seen ? 'new' : '', title: x.name || x.email || 'New submission', sub: esc(x.form) + (cityOf(x) ? ' · ' + esc(cityOf(x)) : ''), right: esc(when(x.at))});
      const st = callState(x);
      if (x.tap) return rowHtml({i, cls: x.at > seen ? 'new' : '', title: x.ads ? 'Call from an ad' : 'Call from the website', sub: esc(x.page || '/'), icon: ic('phone', 15), bg: x.ads ? '#eda100' : T.calls, right: esc(when(x.at))});
      return rowHtml({i, cls: x.at > seen && x.dir !== 'outbound' ? 'new' : '', title: x.name || (x.dir === 'outbound' ? x.to : x.from) || 'Unknown caller', sub: st.label + (x.dur ? ' · ' + dur(x.dur) : ''), icon: ic(st.k === 'missed' ? 'missed' : x.dir === 'outbound' ? 'out' : 'in', 15),
        bg: st.k === 'missed' ? '#e0413a' : st.k === 'vm' ? '#d9820b' : T.calls, right: esc(when(x.at))});
    }).join('') : '<div class="empty" style="margin:6px">' + (k === 'forms' ? 'No form submissions in the last 30 days.' : 'No calls in the last 30 days.') + '</div>';
    list.querySelectorAll('.row').forEach(el => el.addEventListener('click', () => (k === 'forms' ? openSubmission : openCall)(rows[Number(el.dataset.i)])));
  }catch(e){ if (pop.isConnected) pop.querySelector('.list').innerHTML = errHtml(e); }
  pop.querySelector('[data-read]').addEventListener('click', () => {
    ls.set(seenKey(k), Date.now()); closePops();
    const b = app.querySelector(k === 'forms' ? '[data-bellc]' : '[data-phonec]'); if (b){ b.hidden = true; b.parentNode.classList.remove('ring'); }
  });
}
function meMenu(){
  closePops();
  const m = document.createElement('div'); m.className = 'menu'; m.dataset.pop = 1;
  m.innerHTML = '<div class="who"><b>' + esc(S.me.user.name || 'Your account') + '</b>' + esc(S.me.user.email) + '</div>' +
    (canEdit() ? '<button type="button" data-reset>' + ic('reset', 16) + 'Reset dashboards to the default</button>' : '') + '<button type="button" data-out>' + ic('out2', 16) + (S.preview ? 'Close preview' : 'Sign out') + '</button>';
  app.querySelector('[data-me]').parentNode.appendChild(m);
  m.addEventListener('click', e => e.stopPropagation());
  m.querySelector('[data-out]').addEventListener('click', () => { closePops(); if (S.preview){ window.close(); signOut(); } else signOut(); });
  const rs = m.querySelector('[data-reset]'); if (rs) rs.addEventListener('click', () => { if (!confirm('Put the default dashboards back? Your own dashboards will be removed.')) return; S.layout = {v: LAYOUT_V, dashes: DEFAULT_DASHES()}; S.dash = 0; S.ui = {}; saveLayout(); renderApp(); });
}
function closePops(){ document.querySelectorAll('[data-pop]').forEach(x => x.remove()); }
document.addEventListener('click', closePops);
document.addEventListener('keydown', e => {
  if (e.key === '/' && !/input|textarea|select/i.test((document.activeElement || {}).tagName || '')){ const q = app.querySelector('.w [data-q]'); if (q){ e.preventDefault(); q.focus(); } }
});
function toast(m){ const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 3200); }

/* ---------- sign in / out ---------- */
function renderLogin(msg){
  app.innerHTML = '<div class="login"><form class="login-card" novalidate><div class="brandmark"><img src="img/easyleads-logo.png" alt="' + esc(BRAND) + '"></div>' +
    '<h1>Welcome back</h1><p>Sign in to see your leads, calls and bookings.</p>' +
    '<div class="fld"><label for="em">Email</label><input id="em" type="email" autocomplete="username" required></div>' +
    '<div class="fld"><label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password" required></div>' +
    '<button class="btn go big" type="submit">Sign in</button><div class="msg' + (msg ? ' err' : '') + '" role="alert">' + esc(msg || '') + '</div>' +
    '<div class="foot">Need help or forgot your password? Contact EDGE Marketing.</div></form><div class="login-side">Powered by ' + esc(BRAND) + '</div></div>';
  const f = app.querySelector('form');
  let busy = false;
  f.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;
    const btn = f.querySelector('button[type=submit]'), m = f.querySelector('.msg');
    const em = f.querySelector('#em').value.trim(), pw = f.querySelector('#pw').value;
    if (!em || !pw){ m.textContent = 'Enter your email and password.'; m.className = 'msg err'; return; }
    busy = true; btn.disabled = true; m.textContent = ''; m.className = 'msg';
    const cover = document.createElement('div'); cover.className = 'cover'; cover.innerHTML = '<span class="spin lg"></span><span>Signing you in…</span>';
    f.appendChild(cover);
    try{
      const j = await api('portalLogin', {email: em, password: pw});
      if (j.error) throw new Error(j.error);
      cover.querySelector('span:last-child').textContent = 'Loading your dashboard…';
      startWith(j.session, j.me);
    }catch(err){ cover.remove(); m.textContent = err.message; m.className = 'msg err'; btn.disabled = false; busy = false; f.querySelector('#pw').select(); }
  });
  f.querySelector('#em').focus();
}
let signingOut = false;
function signOut(silent){
  if (signingOut) return;
  signingOut = true;
  if (BOT.el){ BOT.el.remove(); BOT.el = null; }
  ls.del(SKEY); ls.del('el_me'); kv.clear(LKEY); const was = S.session; S.session = null; S.me = null; S.cache = {}; S.ui = {};
  closePops();
  if (silent || !was){ renderLogin(silent ? 'Your session ended. Please sign in again.' : ''); signingOut = false; return; }
  const v = veil('Signing out…');
  setTimeout(() => { v.done(); renderLogin(''); signingOut = false; }, 650);
}
function startWith(session, me){
  S.session = session; S.me = me; if (!S.preview) ls.set('el_me', me);
  if (!S.preview) ls.set(SKEY, session);
  S.layout = me.layout || ls.get('el_layout_' + me.user.email, null);
  const d = ls.get('el_domain', '');
  S.domain = me.clients.some(c => c.domain === d) ? d : (me.clients[0] || {}).domain || '';
  S.period = ls.get('el_period', '30');
  if (!PERIODS.some(p => p[0] === S.period)) S.period = '30';
  if (!me.clients.length){ app.innerHTML = '<div class="login"><div class="login-card"><div class="brandmark"><img src="img/easyleads-logo.png" alt=""></div><h1>Almost there</h1><p>Your account isn’t linked to a business yet. EDGE Marketing will let you know when it’s ready.</p><button class="btn" type="button" id="out">Sign out</button></div></div>'; app.querySelector('#out').addEventListener('click', () => signOut()); return; }
  renderApp();
}
/* Fresh numbers every few minutes while the page is open. */
setInterval(() => { if (S.me && !document.hidden && !S.editing && !document.querySelector('.drawer-back,.modal-back,[data-pop]') && !(document.activeElement && /input/i.test(document.activeElement.tagName))){ S.cache = {}; renderApp(); } }, 5 * 60000);

(async function boot(){
  /* "Open as client" from the EDGE tool passes a short session in the address. */
  const hash = new URLSearchParams(location.hash.slice(1));
  let session = ls.get(SKEY, null);
  /* A preview session is kept in this tab only, never saved in the browser. */
  if (hash.get('s')){ session = hash.get('s'); S.preview = true; history.replaceState(null, '', location.pathname); }
  if (!session){ renderLogin(); return; }
  /* Signed in before on this browser: open the dashboard straight away from what was kept,
     and check the session behind it (a revoked or expired one still signs out). */
  const kept = !S.preview && ls.get('el_me', null);
  if (kept && kept.user && Array.isArray(kept.clients)){
    /* Let the rest of this file finish loading first (the assistant below is used while drawing). */
    await null;
    startWith(session, kept);
    api('portalMe', {session}).then(j => { if (!j || j.error || S.session !== session) return; if (JSON.stringify(j) !== JSON.stringify(kept)) startWith(session, j); else ls.set('el_me', j); }).catch(() => {});
    return;
  }
  renderShell();
  try{
    const j = await api('portalMe', {session});
    if (j.error) throw new Error(j.error);
    S.session = session;
    startWith(session, j);
  }catch(e){ if (app.querySelector('form')) return; renderLogin(S.preview ? 'This preview link has expired. Open it again from the EDGE tool.' : ''); }
})();


/* ==========================================================================
   DASHBOARD ASSISTANT
   Shown only when EDGE has switched it on for this client. It answers from
   this dashboard's own data for the period on screen (the tracker does the
   reading and the asking), and nothing else. The EDGE team's faces take
   turns: a new one each time it opens and with every answer.
   ========================================================================== */
const BOT = {el: null, open: false, conv: {}, busy: false, face: Math.floor(Math.random() * 8), t: null, warm: {}, typing: null};
const botClient = () => { const c = S.me && S.me.clients.find(x => x.domain === S.domain); return c && c.bot ? c : null; };
const botTeam = () => (S.me && Array.isArray(S.me.team) ? S.me.team : []).filter(m => m && /^https:\/\//.test(m.img || ''));
const botNext = () => { const t = botTeam(); if (!t.length) return null; BOT.face = (BOT.face + 1) % t.length; return t[BOT.face]; };
const botFace = (m, cls) => m ? '<img class="' + (cls || '') + '" src="' + esc(m.img) + '" alt="' + esc(m.n) + '" title="' + esc(m.n + ', ' + m.r) + '" loading="lazy" referrerpolicy="no-referrer">' : '<span class="' + (cls || '') + ' bot-mono">' + ic('spark', 16) + '</span>';
const BOT_SUG = {easyleads: ['How many leads did I get?', 'Where are my leads coming from?', 'Any missed calls to follow up?', 'What’s in my pipeline?'],
  site: ['How many leads did I get?', 'Which pages bring in leads?', 'Which form is used most?', 'How many calls came from the website?']};
/* One conversation per business in this browser tab. The team member who answers is picked when the
   conversation starts and stays with it to the end; a new conversation brings the next person. */
function botConv(){
  const d = S.domain;
  if (!BOT.conv[d]){
    let saved = null;
    try{ saved = JSON.parse(sessionStorage.getItem('el_bot_' + d) || 'null'); }catch(e){}
    BOT.conv[d] = saved && Array.isArray(saved.msgs) ? saved : {id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), msgs: []};
  }
  const cv = BOT.conv[d];
  if (!cv.face || !cv.face.img){ const f = botNext(); if (f) cv.face = f; }
  return cv;
}
const botSave = () => { try{ sessionStorage.setItem('el_bot_' + S.domain, JSON.stringify(botConv())); }catch(e){} };
/* Light formatting for answers: paragraphs, bullets and bold, everything else as text. */
function botFormat(t){
  const lines = String(t || '').split(/\n/);
  let h = '', list = false;
  lines.forEach(l => {
    const b = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/.exec(l);
    const inl = x => esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*\*/g, '');
    if (b){ if (!list){ h += '<ul>'; list = true; } h += '<li>' + inl(b[1]) + '</li>'; return; }
    if (list){ h += '</ul>'; list = false; }
    if (l.trim()) h += '<p>' + inl(l.replace(/^#+\s*/, '')) + '</p>';
  });
  return h + (list ? '</ul>' : '');
}
/* The dates the widgets read (this period and the one before), so the assistant reuses their data. */
const botDates = () => { const r = range(); return {start: iso(r.s), end: iso(r.e), dstart: iso(prevRange().s)}; };
/* Ask the tracker to get this dashboard's data ready as soon as the assistant opens. */
function botWarm(){
  const c = botClient(); if (!c) return;
  const d = botDates(), k = S.domain + '|' + d.dstart + '|' + d.end;
  if (BOT.warm[k]) return;
  BOT.warm[k] = 1;
  api('portalChatWarm', Object.assign({session: S.session, domain: S.domain}, d)).catch(() => {});
}
function botHead(){
  if (!BOT.el) return;
  const c = botClient(), f = botConv().face;
  BOT.el.querySelector('[data-hav]').innerHTML = botFace(f, 'bot-hface');
  BOT.el.querySelector('[data-hname]').textContent = f ? f.n + ' from EDGE' : 'Ask about your dashboard';
  BOT.el.querySelector('[data-hrole]').textContent = 'AI assistant · ' + ((c && c.source) === 'site' ? 'your dashboard data' : 'your Easyleads data');
}
function botMount(){
  const c = botClient();
  if (!c){ if (BOT.el){ BOT.el.remove(); BOT.el = null; } clearInterval(BOT.t); return; }
  if (!BOT.el){
    const el = BOT.el = document.createElement('div');
    el.className = 'botw';
    el.innerHTML = '<button type="button" class="bot-fab" data-bopen aria-label="Ask about your dashboard"><span class="bot-faces" data-faces></span><span class="bot-fab-t"><b>Questions about your numbers?</b><small>Ask the EDGE team</small></span></button>' +
      '<aside class="bot" role="dialog" aria-label="Dashboard assistant" aria-hidden="true">' +
      '<header class="bot-h"><span class="bot-hav" data-hav></span><div class="bot-ht"><b data-hname>Ask about your dashboard</b><small data-hrole>AI assistant</small></div>' +
      '<button type="button" class="bot-x" data-bnew title="Start a new conversation">' + ic('plus', 15) + '</button><button type="button" class="bot-x" data-bclose aria-label="Close">' + ic('x', 16) + '</button></header>' +
      '<div class="bot-msgs" data-msgs></div>' +
      '<form class="bot-in" data-bform><textarea rows="1" data-bq maxlength="600" placeholder="Ask about your leads, calls, pipeline…"></textarea><button type="submit" class="bot-send" aria-label="Send">' + ic('send', 17) + '</button></form>' +
      '<div class="bot-foot" data-bfoot></div></aside>';
    document.body.appendChild(el);
    const q = s => el.querySelector(s);
    q('[data-bopen]').addEventListener('click', () => botOpen(true));
    q('[data-bclose]').addEventListener('click', () => botOpen(false));
    q('[data-bnew]').addEventListener('click', () => { botStopTyping(); BOT.conv[S.domain] = null; try{ sessionStorage.removeItem('el_bot_' + S.domain); }catch(e){} botHead(); botDraw(); });
    const ta = q('[data-bq]');
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(110, ta.scrollHeight) + 'px'; });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); botAsk(ta.value); } });
    q('[data-bform]').addEventListener('submit', e => { e.preventDefault(); botAsk(ta.value); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && BOT.open) botOpen(false); });
    /* the launcher's faces take turns */
    const spin = () => { const t = botTeam(), f = q('[data-faces]'); if (!f || !t.length) return; const i = BOT.face; f.innerHTML = [0, 1, 2].map(k => botFace(t[(i + k) % t.length], 'bf' + k)).join(''); BOT.face = (BOT.face + 1) % t.length; };
    spin(); clearInterval(BOT.t); BOT.t = setInterval(() => { if (!BOT.open) spin(); }, 3600);
  }
  botHead();
  botDraw();
}
function botOpen(on){
  if (!BOT.el) return;
  BOT.open = on;
  BOT.el.classList.toggle('open', on);
  BOT.el.querySelector('.bot').setAttribute('aria-hidden', on ? 'false' : 'true');
  if (on){ botWarm(); botHead(); botDraw(); setTimeout(() => { const t = BOT.el && BOT.el.querySelector('[data-bq]'); if (t) t.focus(); }, 220); }
}
function botDraw(){
  if (!BOT.el) return;
  const c = botClient(), cv = botConv(), box = BOT.el.querySelector('[data-msgs]'), who = cv.face;
  BOT.el.querySelector('[data-bfoot]').textContent = 'Answers use ' + (c ? c.name : 'this dashboard') + '’s data for ' + rangeText() + '. AI can make mistakes; EDGE can read these chats.';
  if (!cv.msgs.length){
    const sug = BOT_SUG[(c && c.source) === 'site' ? 'site' : 'easyleads'];
    box.innerHTML = '<div class="bot-hello">' +
      (who ? '<div class="bot-who">' + botFace(who, 'bot-who-img') + '<div><b>' + esc(who.n) + '</b><small>' + esc(who.r) + ' · EDGE Marketing</small></div><span class="bot-who-ai">AI</span></div>' : '<div class="bot-team">' + botTeam().slice(0, 5).map(m => botFace(m)).join('') + '</div>') +
      '<b class="bot-hi">Hi' + (S.me && S.me.user.name ? ' ' + esc(S.me.user.name.split(' ')[0]) : '') + ', what would you like to know?</b>' +
      '<p>Ask anything about the numbers on this dashboard. For anything else, the EDGE team is a message away.</p>' +
      '<div class="bot-sug">' + sug.map(s => '<button type="button" data-sug="' + esc(s) + '">' + esc(s) + '</button>').join('') + '</div></div>';
    box.querySelectorAll('[data-sug]').forEach(b => b.addEventListener('click', () => botAsk(b.dataset.sug)));
    return;
  }
  const ty = BOT.typing;
  box.innerHTML = cv.msgs.map((m, i) => {
    if (m.role === 'user') return '<div class="bm me"><div class="bb">' + esc(m.content) + '</div></div>';
    const live = ty && ty.i === i;
    return '<div class="bm"><span class="bav">' + botFace(m.face || who || null) + '</span><div class="bb' + (m.err ? ' err' : '') + '"' + (live ? ' data-typing' : '') + '>' +
      (live ? botFormat(m.content.slice(0, ty.n)) + '<span class="bcaret"></span>' : botFormat(m.content)) + '</div></div>';
  }).join('') +
    (BOT.busy ? '<div class="bm"><span class="bav">' + botFace(who || null) + '</span><div class="bb thinking"><span class="bt-name">' + esc(who ? who.n + ' is looking at your numbers' : 'Looking at your numbers') + '</span><span class="bt-dots"><i></i><i></i><i></i></span></div></div>' : '');
  box.scrollTop = box.scrollHeight;
}
/* The answer appears word by word, quickly (about a second whatever its length). */
function botStopTyping(){ if (BOT.typing){ clearInterval(BOT.typing.t); BOT.typing = null; } }
function botType(i){
  botStopTyping();
  const cv = botConv(), m = cv.msgs[i]; if (!m) return;
  const full = String(m.content || ''), step = Math.max(3, Math.ceil(full.length / 55));
  const ty = BOT.typing = {i, n: 0, t: 0};
  ty.t = setInterval(() => {
    let n = full.indexOf(' ', ty.n + step); ty.n = n < 0 ? full.length : n;
    const bb = BOT.el && BOT.el.querySelector('[data-typing]');
    const done = ty.n >= full.length;
    if (bb){ bb.innerHTML = botFormat(full.slice(0, ty.n)) + (done ? '' : '<span class="bcaret"></span>'); const box = BOT.el.querySelector('[data-msgs]'); box.scrollTop = box.scrollHeight; }
    if (done){ botStopTyping(); if (bb) bb.removeAttribute('data-typing'); }
  }, 18);
}
async function botAsk(text){
  text = String(text || '').trim();
  if (!text || BOT.busy || !BOT.el) return;
  if (BOT.typing){ botStopTyping(); botDraw(); }
  const ta = BOT.el.querySelector('[data-bq]'); ta.value = ''; ta.style.height = 'auto';
  const cv = botConv(), dom = S.domain, face = cv.face || null;
  cv.msgs.push({role: 'user', content: text.slice(0, 600)});
  BOT.busy = true; botDraw();
  const widgets = []; try{ layout().dashes.forEach(d => d.items.filter(visIt).forEach(it => { if (W[it.t] && it.t !== 'note') widgets.push(d.name + ': ' + (it.title || W[it.t].t)); })); }catch(e){}
  let reply;
  try{
    const j = await api('portalChat', Object.assign({session: S.session, domain: dom, conv: cv.id, widgets,
      messages: cv.msgs.filter(m => !m.err).slice(-10).map(m => ({role: m.role, content: m.content}))}, botDates()));
    reply = j && j.ok ? {role: 'assistant', content: j.answer} : {role: 'assistant', content: (j && j.error) || 'Something went wrong. Please try again.', err: true};
  }catch(e){ reply = {role: 'assistant', content: e.message || 'Something went wrong. Please try again.', err: true}; }
  reply.face = face;
  const conv = BOT.conv[dom] || cv;
  conv.msgs.push(reply);
  BOT.busy = false;
  botSave();
  if (S.domain !== dom || BOT.conv[dom] !== cv){ botDraw(); return; }
  if (!reply.err){ BOT.typing = {i: conv.msgs.length - 1, n: 0, t: 0}; botDraw(); botType(conv.msgs.length - 1); }
  else botDraw();
}
})();
