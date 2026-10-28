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
const ls = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} }
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fmt = n => (Number(n) || 0).toLocaleString('en-CA');
const money = n => (Number(n) || 0).toLocaleString('en-CA', {style: 'currency', currency: 'CAD', maximumFractionDigits: 0});
const day = 86400000;
const iso = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const when = t => {
  if (!t) return '';
  const d = Date.now() - t;
  if (d >= 0 && d < 60000) return 'just now';
  if (d >= 0 && d < 3600000) return Math.round(d / 60000) + ' min ago';
  if (d >= 0 && d < day && new Date(t).getDate() === new Date().getDate()) return 'today ' + new Date(t).toLocaleTimeString('en-CA', {hour: 'numeric', minute: '2-digit'});
  return new Date(t).toLocaleString('en-CA', {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});
};
const dur = s => { s = Number(s) || 0; return s < 60 ? s + 's' : Math.floor(s / 60) + 'm ' + String(s % 60).padStart(2, '0') + 's'; };
const initials = s => String(s || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase() || '?';
const hue = s => { let h = 0; String(s || '').split('').forEach(c => { h = (h * 31 + c.charCodeAt(0)) % 360; }); return 'hsl(' + h + ' 55% 52%)'; };
const uid = () => 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- icons (simple line icons) ---------- */
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
  in: 'M17 7 7 17M7 8v9h9', out: 'M7 17 17 7M8 7h9v9',
  missed: 'M3 3l18 18M17 7 7 17',
  plus: 'M12 5v14M5 12h14', x: 'M6 6l12 12M18 6 6 18', grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4', bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  source: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18'
};
const ic = (k, sz) => '<svg viewBox="0 0 24 24" width="' + (sz || 18) + '" height="' + (sz || 18) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (P[k] || P.grid) + '"/></svg>';

/* ---------- API ---------- */
async function api(action, body){
  if (!API) throw new Error('This dashboard isn’t set up yet.');
  const res = await fetch(API, {method: 'POST', body: JSON.stringify(Object.assign({action}, body || {})), redirect: 'follow'});
  if (!res.ok) throw new Error('The server answered ' + res.status + '. Try again in a moment.');
  const j = await res.json();
  if (j && j.error === 'signedout'){ signOut(true); throw new Error('Please sign in again.'); }
  return j;
}

/* ---------- state ---------- */
const S = {session: null, me: null, domain: '', period: '30', dash: 0, editing: false, cache: {}, layout: null};
const PERIODS = [['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['month', 'This month'], ['lastmonth', 'Last month']];
function range(p){
  const now = new Date(), end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (p === 'month') return {s: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), e: end.getTime()};
  if (p === 'lastmonth') return {s: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(), e: new Date(now.getFullYear(), now.getMonth(), 0).getTime()};
  const n = Number(p) || 30;
  return {s: end.getTime() - (n - 1) * day, e: end.getTime()};
}
function get(kind, p){
  const r = range(p || S.period), k = [S.domain, kind, iso(r.s), iso(r.e)].join('|');
  const c = S.cache[k];
  if (c && Date.now() - c.at < 4 * 60000) return c.p;
  const pr = api('portalData', {session: S.session, domain: S.domain, kind, start: iso(r.s), end: iso(r.e)}).then(j => {
    if (j.error){ const e = new Error(j.error); e.code = j.error; e.scope = j.scope; throw e; }
    return j;
  });
  S.cache[k] = {at: Date.now(), p: pr};
  pr.catch(() => { delete S.cache[k]; });
  return pr;
}
const inRange = (rows, p) => { const r = range(p || S.period); return rows.filter(x => x.at >= r.s && x.at < r.e + day); };

/* ---------- widgets ---------- */
const T = {forms: '#1d94ff', calls: '#0f9d6b', contacts: '#7c3aed', opps: '#d97706', appts: '#db2777', mix: '#14b8a6'};
const W = {
  kpis: {t: 'At a glance', d: 'Form submissions, calls, new contacts, appointments and pipeline value for the period.', ic: 'bolt', tint: T.mix, c: 12, needs: ['forms', 'calls', 'contacts', 'appts', 'opps'], soft: true, draw: drawKpis},
  trend: {t: 'Leads over time', d: 'Form submissions and calls, day by day.', ic: 'line', tint: T.forms, c: 8, needs: ['forms', 'calls'], soft: true, draw: drawTrend},
  calls_mix: {t: 'Calls answered vs missed', d: 'How many calls were answered, missed or went to voicemail.', ic: 'donut', tint: T.calls, c: 4, needs: ['calls'], draw: drawCallMix},
  forms_list: {t: 'Latest form submissions', d: 'Every submission, newest first. Click one to see all the answers.', ic: 'form', tint: T.forms, c: 6, needs: ['forms'], draw: drawForms},
  calls_list: {t: 'Recent calls', d: 'Inbound and outbound calls with their status and length.', ic: 'phone', tint: T.calls, c: 6, needs: ['calls'], draw: drawCalls},
  forms_by: {t: 'Submissions by form', d: 'Which forms bring in the most leads.', ic: 'bars', tint: T.forms, c: 6, needs: ['forms'], draw: drawFormsBy},
  contacts_list: {t: 'New contacts', d: 'People added to your account in the period.', ic: 'users', tint: T.contacts, c: 6, needs: ['contacts'], draw: drawContacts},
  contacts_src: {t: 'Where leads come from', d: 'New contacts by source.', ic: 'source', tint: T.contacts, c: 6, needs: ['contacts'], draw: drawSources},
  pipeline: {t: 'Pipeline by stage', d: 'Open opportunities in each stage, with their value.', ic: 'funnel', tint: T.opps, c: 6, needs: ['opps'], draw: drawPipeline},
  opps_list: {t: 'Latest opportunities', d: 'New and updated deals, with value and status.', ic: 'money', tint: T.opps, c: 6, needs: ['opps'], draw: drawOpps},
  appts: {t: 'Appointments', d: 'Upcoming bookings, and the ones in the period.', ic: 'cal', tint: T.appts, c: 6, needs: ['appts'], draw: drawAppts}
};
const DEFAULT_DASHES = () => [
  {id: 'd1', name: 'Overview', items: ['kpis', 'trend', 'calls_mix', 'forms_list', 'calls_list', 'forms_by', 'appts'].map(t => ({id: uid(), t, c: W[t].c}))},
  {id: 'd2', name: 'Sales', items: ['pipeline', 'opps_list', 'contacts_src', 'contacts_list'].map(t => ({id: uid(), t, c: W[t].c}))}
];

function errHtml(e){
  if (e && e.code === 'scope') return '<div class="err">' + ic('lock', 22) + '<br><b>Not switched on yet.</b><br>This needs “' + esc(e.scope) + '” access on your account. Ask EDGE to enable it.</div>';
  if (e && e.code === 'notconnected') return '<div class="err"><b>Your Easyleads account isn’t connected yet.</b><br>EDGE will let you know when it’s ready.</div>';
  return '<div class="err">Couldn’t load this right now.<br><span style="font-size:12px">' + esc(e && e.message || e) + '</span></div>';
}
function rowHtml(o){
  return '<div class="row" data-i="' + o.i + '">' + (o.icon ? '<div class="av" style="background:' + (o.bg || '#94a3b8') + '">' + o.icon + '</div>'
    : '<div class="av" style="background:' + hue(o.title) + '">' + esc(initials(o.title)) + '</div>') +
    '<div class="t"><b>' + esc(o.title) + '</b><small>' + o.sub + '</small></div><div class="r">' + (o.right || '') + '</div></div>';
}
function listWith(h, rows, toRow, onOpen, empty, n){
  let shown = n || 6;
  const draw = () => {
    if (!rows.length){ h.innerHTML = '<div class="empty">' + empty + '</div>'; return; }
    h.innerHTML = '<div class="list">' + rows.slice(0, shown).map((r, i) => rowHtml(Object.assign({i}, toRow(r)))).join('') + '</div>' +
      (rows.length > shown ? '<button class="more" type="button">Show more (' + (rows.length - shown) + ')</button>' : '');
    h.querySelectorAll('.row').forEach(el => el.addEventListener('click', () => onOpen(rows[Number(el.dataset.i)])));
    const m = h.querySelector('.more'); if (m) m.addEventListener('click', () => { shown += 10; draw(); });
  };
  draw();
}
const callState = c => {
  const s = String(c.status || '').toLowerCase();
  if (/voicemail/.test(s)) return {k: 'vm', label: 'Voicemail', cls: 'warn'};
  if (/no-answer|busy|failed|cancel|missed/.test(s) || (c.dir === 'inbound' && !c.dur)) return {k: 'missed', label: 'Missed', cls: 'bad'};
  return {k: 'ok', label: c.dir === 'outbound' ? 'Outbound' : 'Answered', cls: 'good'};
};

function drawKpis(h, D){
  const tile = (key, label, val, note, icon, tint, spark) => '<button class="kpi" type="button" data-go="' + key + '" style="--t:' + tint + '"><div class="l">' + esc(label) + ic(icon, 16) + '</div><div class="v">' + val + '</div><div class="n">' + note + '</div>' + (spark || '') + '</button>';
  const r = range(), days = Math.round((r.e - r.s) / day) + 1;
  const series = rows => { const a = new Array(days).fill(0); (rows || []).forEach(x => { const i = Math.floor((x.at - r.s) / day); if (i >= 0 && i < days) a[i]++; }); return a; };
  const t = [];
  if (D.forms) t.push(tile('forms_list', 'Form submissions', fmt(D.forms.rows.length), 'in the period', 'form', T.forms, spark(series(D.forms.rows), T.forms)));
  if (D.calls){ const miss = D.calls.rows.filter(c => callState(c).k === 'missed').length; t.push(tile('calls_list', 'Calls', fmt(D.calls.rows.length), miss ? '<span style="color:var(--bad)">' + miss + ' missed</span>' : 'none missed', 'phone', T.calls, spark(series(D.calls.rows), T.calls))); }
  if (D.contacts) t.push(tile('contacts_list', 'New contacts', fmt(D.contacts.rows.length), 'added to your account', 'users', T.contacts, spark(series(D.contacts.rows), T.contacts)));
  if (D.appts){ const up = D.appts.rows.filter(a => a.at >= Date.now()).length; t.push(tile('appts', 'Appointments', fmt(inRange(D.appts.rows).length), up + ' upcoming', 'cal', T.appts)); }
  if (D.opps){ const open = D.opps.rows.filter(o => o.status === 'open'), won = inRange(D.opps.rows.filter(o => o.status === 'won').map(o => Object.assign({}, o, {at: o.upd || o.at})));
    t.push(tile('pipeline', 'Open pipeline', money(open.reduce((s, o) => s + o.value, 0)), open.length + ' open · ' + won.length + ' won', 'money', T.opps)); }
  h.innerHTML = t.length ? '<div class="kpis">' + t.join('') + '</div>' : '<div class="empty">Nothing to show yet.</div>';
  h.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => openList(b.dataset.go)));
}
function spark(vals, color){
  if (!vals.some(Boolean)) return '<svg class="sp" viewBox="0 0 100 30" preserveAspectRatio="none"></svg>';
  const max = Math.max(...vals), n = vals.length;
  const pts = vals.map((v, i) => [n === 1 ? 50 : i * 100 / (n - 1), 28 - v / max * 25]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('');
  return '<svg class="sp" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="' + d + 'L100,30L0,30Z" fill="' + color + '" opacity=".1"/><path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="1.8" vector-effect="non-scaling-stroke"/></svg>';
}
function lineChart(h, labels, series, height){
  const H = height || 220, W0 = 600, pad = {l: 30, r: 10, t: 12, b: 24};
  const max = Math.max(1, ...series.flatMap(s => s.values));
  const nice = Math.ceil(max / 4) * 4 || 4;
  const x = i => pad.l + (labels.length === 1 ? (W0 - pad.l - pad.r) / 2 : i * (W0 - pad.l - pad.r) / (labels.length - 1));
  const y = v => pad.t + (1 - v / nice) * (H - pad.t - pad.b);
  let svg = '<svg viewBox="0 0 ' + W0 + ' ' + H + '" preserveAspectRatio="none" style="height:' + H + 'px">';
  for (let g = 0; g <= 4; g++){ const v = nice * g / 4; svg += '<line x1="' + pad.l + '" x2="' + (W0 - pad.r) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="#eef1f6"/><text x="' + (pad.l - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end" font-size="10" fill="#94a3b8">' + v + '</text>'; }
  const step = Math.max(1, Math.ceil(labels.length / 7));
  labels.forEach((l, i) => { if (i % step === 0) svg += '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10" fill="#94a3b8">' + esc(l) + '</text>'; });
  series.forEach(s => {
    const pts = s.values.map((v, i) => [x(i), y(v)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('');
    svg += '<path d="' + d + 'L' + x(labels.length - 1) + ',' + y(0) + 'L' + x(0) + ',' + y(0) + 'Z" fill="' + s.color + '" opacity=".08"/><path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2.2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>';
  });
  svg += '<line class="cur" y1="' + pad.t + '" y2="' + (H - pad.b) + '" stroke="#cbd5e1" stroke-dasharray="3 3" opacity="0"/></svg>';
  h.innerHTML = '<div class="chart">' + svg + '<div class="tip"></div></div><div class="chips">' + series.map(s => '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + ' · ' + fmt(s.values.reduce((a, b) => a + b, 0)) + '</span>').join('') + '</div>';
  const box = h.querySelector('.chart'), el = box.querySelector('svg'), tip = box.querySelector('.tip'), cur = el.querySelector('.cur');
  box.addEventListener('mousemove', e => {
    const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W0;
    let i = Math.round((px - pad.l) / ((W0 - pad.l - pad.r) / Math.max(1, labels.length - 1)));
    i = Math.max(0, Math.min(labels.length - 1, i));
    cur.setAttribute('x1', x(i)); cur.setAttribute('x2', x(i)); cur.setAttribute('opacity', 1);
    tip.innerHTML = '<b>' + esc(labels[i]) + '</b><br>' + series.map(s => esc(s.name) + ': ' + s.values[i]).join('<br>');
    tip.style.left = (x(i) / W0 * r.width) + 'px'; tip.style.top = (e.clientY - r.top) + 'px'; tip.style.opacity = 1;
  });
  box.addEventListener('mouseleave', () => { tip.style.opacity = 0; cur.setAttribute('opacity', 0); });
}
function drawTrend(h, D, it){
  const r = range(), days = Math.round((r.e - r.s) / day) + 1, labels = [], idx = {};
  for (let i = 0; i < days; i++){ const t = r.s + i * day; labels.push(new Date(t).toLocaleDateString('en-CA', {month: 'short', day: 'numeric'})); }
  const s = (name, rows, color) => { const v = new Array(days).fill(0); (rows || []).forEach(x => { const i = Math.floor((x.at - r.s) / day); if (i >= 0 && i < days) v[i]++; }); return {name, values: v, color}; };
  const series = [];
  if (D.forms) series.push(s('Form submissions', D.forms.rows, T.forms));
  if (D.calls) series.push(s('Calls', D.calls.rows, T.calls));
  if (!series.length){ h.innerHTML = '<div class="empty">Nothing to show yet.</div>'; return; }
  lineChart(h, labels, series, it.h ? Math.max(140, it.h - 110) : 220);
}
function donut(segs, sub){
  const tot = segs.reduce((s, x) => s + x.n, 0) || 1; let a = -Math.PI / 2, d = '';
  segs.forEach(s => { if (!s.n) return; const b = a + s.n / tot * Math.PI * 2 - (s.n === tot ? 0.0001 : 0); const big = b - a > Math.PI ? 1 : 0;
    const p = (r, t) => (68 + r * Math.cos(t)).toFixed(2) + ' ' + (68 + r * Math.sin(t)).toFixed(2);
    d += '<path d="M' + p(62, a) + 'A62 62 0 ' + big + ' 1 ' + p(62, b) + 'L' + p(40, b) + 'A40 40 0 ' + big + ' 0 ' + p(40, a) + 'Z" fill="' + s.color + '"/>'; a = b; });
  return '<svg class="donut" viewBox="0 0 136 136">' + (d || '<circle cx="68" cy="68" r="51" fill="none" stroke="#eef1f6" stroke-width="22"/>') +
    '<text x="68" y="70" text-anchor="middle" font-family="Poppins" font-weight="600" font-size="24" fill="#0f172a">' + fmt(segs.reduce((s, x) => s + x.n, 0)) + '</text><text x="68" y="88" text-anchor="middle" font-size="10" fill="#94a3b8" letter-spacing="1">' + esc(sub) + '</text></svg>';
}
function drawCallMix(h, D){
  const c = {ok: 0, missed: 0, vm: 0}; D.calls.rows.forEach(x => { c[callState(x).k]++; });
  const segs = [{label: 'Answered / outbound', n: c.ok, color: T.calls}, {label: 'Missed', n: c.missed, color: '#dc2626'}, {label: 'Voicemail', n: c.vm, color: '#d97706'}];
  h.innerHTML = '<div class="donutrow">' + donut(segs, 'CALLS') + '<div class="legend">' + segs.map(s => '<div><i style="background:' + s.color + '"></i><span>' + s.label + '</span><b>' + s.n + '</b></div>').join('') + '</div></div>';
}
function drawForms(h, D, it){
  listWith(h, D.forms.rows, f => ({title: f.name || f.email || f.phone || 'New submission', sub: esc(f.form) + (f.email ? ' · ' + esc(f.email) : f.phone ? ' · ' + esc(f.phone) : ''), right: esc(when(f.at))}),
    openSubmission, 'No form submissions in this period.', it.h ? 30 : 6);
}
function drawCalls(h, D, it){
  listWith(h, D.calls.rows, c => { const st = callState(c);
    return {title: c.name || (c.dir === 'outbound' ? c.to : c.from) || 'Unknown caller', sub: (c.dir === 'outbound' ? 'Outbound' : 'Inbound') + ' · ' + (c.dur ? dur(c.dur) : 'no answer'),
      icon: ic(st.k === 'missed' ? 'missed' : c.dir === 'outbound' ? 'out' : 'in', 16), bg: st.k === 'missed' ? '#dc2626' : st.k === 'vm' ? '#d97706' : T.calls,
      right: '<span class="pill ' + st.cls + '">' + st.label + '</span><br>' + esc(when(c.at))}; }, openCall, 'No calls in this period.', it.h ? 30 : 6);
}
function bars(h, items, color, fmtV){
  const max = Math.max(1, ...items.map(x => x.n));
  h.innerHTML = items.length ? '<div class="bars">' + items.map(x => '<div class="b"><span title="' + esc(x.k) + '">' + esc(x.k) + '</span><i style="width:' + Math.max(2, x.n / max * 100) + '%;background:' + (x.color || color) + '"></i><em>' + (fmtV ? fmtV(x) : fmt(x.n)) + '</em></div>').join('') + '</div>'
    : '<div class="empty">Nothing in this period.</div>';
}
const groupBy = (rows, f) => { const m = {}; rows.forEach(r => { const k = f(r) || 'Other'; m[k] = (m[k] || 0) + 1; }); return Object.keys(m).map(k => ({k, n: m[k]})).sort((a, b) => b.n - a.n); };
function drawFormsBy(h, D){ bars(h, groupBy(D.forms.rows, f => f.form).slice(0, 10), T.forms); }
function drawContacts(h, D, it){
  listWith(h, D.contacts.rows, k => ({title: k.name, sub: [k.email, k.phone].filter(Boolean).map(esc).join(' · ') || 'No contact details', right: (k.source ? '<span class="pill blue">' + esc(k.source) + '</span><br>' : '') + esc(when(k.at))}),
    openContact, 'No new contacts in this period.', it.h ? 30 : 6);
}
function drawSources(h, D){ bars(h, groupBy(D.contacts.rows, k => k.source ? k.source.charAt(0).toUpperCase() + k.source.slice(1) : 'Not recorded').slice(0, 10), T.contacts); }
function drawPipeline(h, D){
  const open = D.opps.rows.filter(o => o.status === 'open'), m = {};
  open.forEach(o => { const k = o.stage || 'No stage'; m[k] = m[k] || {k, n: 0, v: 0, pos: o.stagePos}; m[k].n++; m[k].v += o.value; });
  const items = Object.values(m).sort((a, b) => a.pos - b.pos);
  if (!items.length){ h.innerHTML = '<div class="empty">No open opportunities.</div>'; return; }
  bars(h, items, T.opps, x => x.n + ' · ' + money(x.v));
}
function drawOpps(h, D, it){
  const rows = D.opps.rows.slice().sort((a, b) => (b.upd || b.at) - (a.upd || a.at));
  listWith(h, rows, o => ({title: o.name, sub: esc([o.pipeline, o.stage].filter(Boolean).join(' › ')), icon: ic('money', 16), bg: T.opps,
    right: '<b style="color:var(--ink)">' + money(o.value) + '</b><br><span class="pill ' + (o.status === 'won' ? 'good' : o.status === 'lost' || o.status === 'abandoned' ? 'bad' : 'blue') + '">' + esc(o.status) + '</span>'}),
    o => drawer(o.name, [['Value', money(o.value)], ['Status', o.status], ['Pipeline', o.pipeline], ['Stage', o.stage], ['Contact', o.contact], ['Created', when(o.at)], ['Updated', when(o.upd)]]),
    'No opportunities yet.', it.h ? 30 : 6);
}
function drawAppts(h, D, it){
  const now = Date.now(), up = D.appts.rows.filter(a => a.at >= now), past = D.appts.rows.filter(a => a.at < now).reverse();
  const rows = up.concat(past);
  listWith(h, rows, a => ({title: a.title, sub: esc(a.calendar) + ' · ' + esc(new Date(a.at).toLocaleString('en-CA', {weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})),
    icon: ic('cal', 16), bg: a.at >= now ? T.appts : '#94a3b8', right: '<span class="pill ' + (/cancel|no.?show/i.test(a.status) ? 'bad' : /confirm|show/i.test(a.status) ? 'good' : '') + '">' + esc(a.status || (a.at >= now ? 'upcoming' : 'done')) + '</span>'}),
    a => drawer(a.title, [['When', new Date(a.at).toLocaleString('en-CA')], ['Calendar', a.calendar], ['Status', a.status]]), 'No appointments.', it.h ? 30 : 6);
}

/* ---------- detail drawers ---------- */
function drawer(title, pairs, extra){
  const b = document.createElement('div'); b.className = 'drawer-back';
  b.innerHTML = '<div class="drawer" role="dialog" aria-modal="true"><div style="display:flex;justify-content:space-between;align-items:center"><span class="ro">' + ic('lock', 13) + 'Read only</span><button class="iconbtn" type="button" data-x aria-label="Close">' + ic('x') + '</button></div>' +
    '<h3>' + esc(title) + '</h3>' + (extra || '') + '<dl class="kv">' + pairs.filter(p => p[1] != null && p[1] !== '').map(p => '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd>').join('') + '</dl></div>';
  document.body.appendChild(b);
  const close = () => { b.remove(); document.removeEventListener('keydown', k); };
  const k = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', k);
  b.addEventListener('click', e => { if (e.target === b) close(); });
  b.querySelector('[data-x]').addEventListener('click', close);
}
const openSubmission = f => drawer(f.name || 'Form submission', [['Form', f.form], ['Received', new Date(f.at).toLocaleString('en-CA')], ['Email', f.email], ['Phone', f.phone], ['Page', f.page]].concat(f.fields || []));
const openCall = c => { const st = callState(c); drawer(c.name || 'Call', [['Status', st.label], ['Direction', c.dir], ['Length', c.dur ? dur(c.dur) : '—'], ['From', c.from], ['To', c.to], ['When', new Date(c.at).toLocaleString('en-CA')]]); };
const openContact = k => drawer(k.name, [['Email', k.email], ['Phone', k.phone], ['Source', k.source], ['Tags', (k.tags || []).join(', ')], ['Added', new Date(k.at).toLocaleString('en-CA')]]);
function openList(type){
  const el = document.querySelector('.w[data-t="' + type + '"]');
  if (el){ el.scrollIntoView({behavior: 'smooth', block: 'center'}); el.animate([{boxShadow: '0 0 0 3px var(--brand)'}, {boxShadow: 'none'}], {duration: 1400}); }
  else toast('Add the “' + W[type].t + '” widget to see the list.');
}

/* ---------- dashboards ---------- */
function layout(){
  if (!S.layout || !Array.isArray(S.layout.dashes) || !S.layout.dashes.length) S.layout = {dashes: DEFAULT_DASHES()};
  return S.layout;
}
let saveT = null;
function saveLayout(){
  ls.set('el_layout_' + (S.me && S.me.user.email), S.layout);
  clearTimeout(saveT);
  saveT = setTimeout(() => api('portalSaveLayout', {session: S.session, layout: S.layout}).then(j => { if (j.error) toast(j.error); }).catch(() => {}), 1200);
}

function renderApp(){
  const me = S.me, L = layout(), dash = L.dashes[Math.min(S.dash, L.dashes.length - 1)];
  const c = me.clients.find(x => x.domain === S.domain) || me.clients[0] || {};
  app.innerHTML = '<header class="top"><div class="top-in">' +
    '<div class="brandmark"><img src="img/easyleads-logo-white.png" alt="' + esc(BRAND) + '"></div><div class="sep hide-sm"></div>' +
    '<div class="client"><img alt="" src="https://www.google.com/s2/favicons?domain=' + encodeURIComponent(c.domain || '') + '&sz=64" onerror="this.remove()">' +
      (me.clients.length > 1 ? '<select data-client aria-label="Business">' + me.clients.map(x => '<option value="' + esc(x.domain) + '"' + (x.domain === S.domain ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select>' : '<b>' + esc(c.name || '') + '</b>') + '</div>' +
    '<div class="grow"></div>' +
    '<div class="seg hide-sm" data-period>' + PERIODS.map(p => '<button type="button" data-p="' + p[0] + '"' + (p[0] === S.period ? ' class="on"' : '') + '>' + p[1] + '</button>').join('') + '</div>' +
    '<div class="anchor"><button class="iconbtn" type="button" data-bell title="New form submissions" aria-label="Form submissions">' + ic('bell') + '<span class="badge" data-bellc hidden></span></button></div>' +
    '<div class="anchor"><button class="iconbtn" type="button" data-phone title="Calls" aria-label="Calls">' + ic('phone') + '<span class="badge" data-phonec hidden></span></button></div>' +
    '<div class="anchor"><button class="avatar" type="button" data-me aria-label="Account">' + esc(initials(me.user.name || me.user.email)) + '</button></div>' +
    '</div></header>' +
    '<main class="wrap' + (S.editing ? ' editing' : '') + '">' +
    '<div class="tabs" role="tablist">' + L.dashes.map((d, i) => '<button class="tab' + (d === dash ? ' on' : '') + '" type="button" role="tab" data-dash="' + i + '">' + esc(d.name) + '</button>').join('') +
      '<button class="tab add" type="button" data-newdash>' + ic('plus', 14) + ' New dashboard</button></div>' +
    '<div class="bar"><div><h2>' + esc(dash.name) + '</h2><div class="sub">' + esc(rangeText()) + ' · <span class="ro">' + ic('lock', 12) + 'read-only view of your ' + esc(BRAND) + ' account</span></div></div><div class="grow"></div>' +
      (S.editing ? '<button class="btn" type="button" data-addw>' + ic('plus', 15) + 'Add widget</button><button class="btn" type="button" data-rename>' + ic('edit', 15) + 'Rename</button>' +
        (L.dashes.length > 1 ? '<button class="btn" type="button" data-deldash>Delete dashboard</button>' : '') : '') +
      '<button class="btn' + (S.editing ? ' go' : '') + '" type="button" data-edit>' + (S.editing ? 'Done' : ic('grid', 15) + 'Customize') + '</button></div>' +
    '<div class="grid" data-grid></div></main>';
  wireTop(); drawGrid(dash);
  bellCheck();
}
const rangeText = () => { const r = range(); return new Date(r.s).toLocaleDateString('en-CA', {month: 'short', day: 'numeric', year: 'numeric'}) + ' – ' + new Date(r.e).toLocaleDateString('en-CA', {month: 'short', day: 'numeric', year: 'numeric'}); };

function wireTop(){
  const q = s => app.querySelector(s);
  app.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { S.period = b.dataset.p; ls.set('el_period', S.period); renderApp(); }));
  const cs = q('[data-client]'); if (cs) cs.addEventListener('change', () => { S.domain = cs.value; ls.set('el_domain', S.domain); renderApp(); });
  app.querySelectorAll('[data-dash]').forEach(b => b.addEventListener('click', () => { S.dash = Number(b.dataset.dash); renderApp(); }));
  q('[data-newdash]').addEventListener('click', () => {
    const name = prompt('Name the new dashboard:', 'My dashboard'); if (!name || !name.trim()) return;
    layout().dashes.push({id: uid(), name: name.trim().slice(0, 40), items: [{id: uid(), t: 'kpis', c: 12}]});
    S.dash = layout().dashes.length - 1; S.editing = true; saveLayout(); renderApp();
  });
  q('[data-edit]').addEventListener('click', () => { S.editing = !S.editing; renderApp(); });
  const L = layout(), dash = L.dashes[Math.min(S.dash, L.dashes.length - 1)];
  const aw = q('[data-addw]'); if (aw) aw.addEventListener('click', () => catalog(dash));
  const rn = q('[data-rename]'); if (rn) rn.addEventListener('click', () => { const n = prompt('Dashboard name:', dash.name); if (n && n.trim()){ dash.name = n.trim().slice(0, 40); saveLayout(); renderApp(); } });
  const dd = q('[data-deldash]'); if (dd) dd.addEventListener('click', () => { if (!confirm('Delete the “' + dash.name + '” dashboard?')) return; L.dashes.splice(L.dashes.indexOf(dash), 1); S.dash = 0; saveLayout(); renderApp(); });
  q('[data-bell]').addEventListener('click', e => { e.stopPropagation(); feedPop('forms'); });
  q('[data-phone]').addEventListener('click', e => { e.stopPropagation(); feedPop('calls'); });
  q('[data-me]').addEventListener('click', e => { e.stopPropagation(); meMenu(); });
}

function drawGrid(dash){
  const grid = app.querySelector('[data-grid]');
  grid.innerHTML = '';
  if (!dash.items.length){ grid.innerHTML = '<div class="w" style="--c:12"><div class="empty">This dashboard is empty. Click <b>Customize</b>, then <b>Add widget</b>.</div></div>'; return; }
  let dragId = null;
  dash.items.forEach(it => {
    const def = W[it.t]; if (!def) return;
    const el = document.createElement('section');
    const cols = Math.max(3, Math.min(12, it.c || def.c));
    el.className = 'w' + (cols < 6 ? ' nar' : ''); el.style.setProperty('--c', cols); el.style.setProperty('--t', def.tint); el.dataset.t = it.t;
    el.innerHTML = '<div class="wh"><div class="wic">' + ic(def.ic) + '</div><h3 title="' + esc(def.d) + '">' + esc(it.title || def.t) + '</h3><div class="wtools">' +
      '<button class="tb" type="button" data-w="-" title="Narrower">−</button><button class="tb" type="button" data-w="+" title="Wider">+</button><button class="tb" type="button" data-del title="Remove">×</button></div></div>' +
      '<div data-body><div class="load"></div></div><div class="rz" title="Drag to resize"></div>';
    grid.appendChild(el);
    const body = el.querySelector('[data-body]');
    Promise.all(def.needs.map(k => get(k).then(v => [k, v], e => [k, null, e]))).then(res => {
      if (!body.isConnected) return;
      const D = {}, errs = [];
      res.forEach(r => { if (r[1]) D[r[0]] = r[1]; else errs.push(r[2]); });
      if (errs.length && (!def.soft || errs.length === def.needs.length)){ body.innerHTML = errHtml(errs[0]); return; }
      try{ def.draw(body, D, it); }catch(e){ console.warn(e); body.innerHTML = errHtml(e); }
    });
    const setC = c => { it.c = Math.max(3, Math.min(12, c)); saveLayout(); el.style.setProperty('--c', it.c); el.classList.toggle('nar', it.c < 6); };
    el.querySelectorAll('[data-w]').forEach(b => b.addEventListener('click', () => setC((it.c || def.c) + (b.dataset.w === '+' ? 3 : -3))));
    el.querySelector('[data-del]').addEventListener('click', () => { dash.items.splice(dash.items.indexOf(it), 1); saveLayout(); drawGrid(dash); });
    /* resize by dragging the right edge */
    el.querySelector('.rz').addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      const r0 = el.getBoundingClientRect(), colW = (grid.clientWidth + 16) / 12, c0 = it.c || def.c;
      const badge = document.createElement('div'); badge.className = 'rzb'; el.appendChild(badge); document.body.classList.add('resizing');
      let c = c0;
      const mv = ev => { c = Math.max(3, Math.min(12, Math.round((r0.width + ev.clientX - e.clientX + 16) / colW))); el.style.setProperty('--c', c); badge.textContent = c + ' of 12 wide'; };
      const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); badge.remove(); document.body.classList.remove('resizing'); if (c !== c0) setC(c); };
      document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
    });
    /* reorder by dragging (customize mode) */
    el.draggable = S.editing;
    el.addEventListener('dragstart', e => { dragId = it.id; el.classList.add('dragging'); try{ e.dataTransfer.setData('text/plain', it.id); }catch(x){} });
    el.addEventListener('dragend', () => { el.classList.remove('dragging'); grid.querySelectorAll('.drop').forEach(x => x.classList.remove('drop')); });
    el.addEventListener('dragover', e => { if (!dragId || dragId === it.id) return; e.preventDefault(); grid.querySelectorAll('.drop').forEach(x => x.classList.remove('drop')); el.classList.add('drop'); });
    el.addEventListener('drop', e => { e.preventDefault(); const from = dash.items.findIndex(x => x.id === dragId); if (from < 0) return; const m = dash.items.splice(from, 1)[0]; dash.items.splice(dash.items.indexOf(it), 0, m); dragId = null; saveLayout(); drawGrid(dash); });
  });
}

function catalog(dash){
  const b = document.createElement('div'); b.className = 'modal-back';
  const has = new Set(dash.items.map(i => i.t));
  b.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><h2>Add widgets</h2><div class="sub" style="color:var(--ink-2);font-size:13px">Pick what you want to see on “' + esc(dash.name) + '”. You can add the same widget to as many dashboards as you like.</div></div>' +
    '<button class="iconbtn" type="button" data-x aria-label="Close">' + ic('x') + '</button></div><div class="cat">' +
    Object.keys(W).map(k => '<div class="it"><div class="wic" style="--t:' + W[k].tint + '">' + ic(W[k].ic) + '</div><div><b>' + esc(W[k].t) + '</b><small>' + esc(W[k].d) + '</small></div>' +
      '<button class="btn' + (has.has(k) ? '' : ' go') + '" type="button" data-add="' + k + '">' + (has.has(k) ? 'Add again' : 'Add') + '</button></div>').join('') + '</div></div>';
  document.body.appendChild(b);
  const close = () => { b.remove(); renderApp(); };
  b.addEventListener('click', e => { if (e.target === b) close(); });
  b.querySelector('[data-x]').addEventListener('click', close);
  b.querySelectorAll('[data-add]').forEach(x => x.addEventListener('click', () => { dash.items.push({id: uid(), t: x.dataset.add, c: W[x.dataset.add].c}); saveLayout(); x.textContent = 'Added ✓'; x.classList.remove('go'); }));
}

/* ---------- bell (forms) and phone (calls) ---------- */
const seenKey = k => 'el_seen_' + k + '_' + S.domain;
async function bellCheck(){
  for (const k of ['forms', 'calls']){
    try{
      const j = await get(k, '30');
      const seen = ls.get(seenKey(k), 0);
      const rows = k === 'calls' ? j.rows.filter(c => c.dir !== 'outbound') : j.rows;
      const n = rows.filter(x => x.at > seen).length;
      const b = app.querySelector(k === 'forms' ? '[data-bellc]' : '[data-phonec]');
      if (!b) continue;
      if (!seen){ ls.set(seenKey(k), Date.now()); b.hidden = true; continue; }
      b.hidden = !n; b.textContent = n > 99 ? '99+' : n;
      if (n) b.parentNode.classList.add('ring');
    }catch(e){}
  }
}
async function feedPop(k){
  closePops();
  const anchor = app.querySelector(k === 'forms' ? '[data-bell]' : '[data-phone]').parentNode;
  const pop = document.createElement('div'); pop.className = 'pop'; pop.dataset.pop = 1;
  pop.innerHTML = '<h4>' + (k === 'forms' ? 'Form submissions' : 'Calls') + '<button class="tb" type="button" data-read>Mark all read</button></h4><div class="list"><div class="load" style="margin:8px"></div></div>';
  anchor.appendChild(pop);
  pop.addEventListener('click', e => e.stopPropagation());
  const seen = ls.get(seenKey(k), 0);
  try{
    const j = await get(k, '30');
    const rows = j.rows.slice(0, 25), list = pop.querySelector('.list');
    list.innerHTML = rows.length ? rows.map((x, i) => {
      if (k === 'forms') return rowHtml({i, title: x.name || x.email || 'New submission', sub: esc(x.form), right: esc(when(x.at))}).replace('class="row"', 'class="row' + (x.at > seen ? ' new' : '') + '"');
      const st = callState(x);
      return rowHtml({i, title: x.name || (x.dir === 'outbound' ? x.to : x.from) || 'Unknown caller', sub: st.label + (x.dur ? ' · ' + dur(x.dur) : ''), icon: ic(st.k === 'missed' ? 'missed' : x.dir === 'outbound' ? 'out' : 'in', 15),
        bg: st.k === 'missed' ? '#dc2626' : st.k === 'vm' ? '#d97706' : T.calls, right: esc(when(x.at))}).replace('class="row"', 'class="row' + (x.at > seen && x.dir !== 'outbound' ? ' new' : '') + '"');
    }).join('') : '<div class="empty">Nothing in the last 30 days.</div>';
    list.querySelectorAll('.row').forEach(el => el.addEventListener('click', () => (k === 'forms' ? openSubmission : openCall)(rows[Number(el.dataset.i)])));
  }catch(e){ pop.querySelector('.list').innerHTML = errHtml(e); }
  pop.querySelector('[data-read]').addEventListener('click', () => { ls.set(seenKey(k), Date.now()); closePops(); bellCheck(); });
}
function meMenu(){
  closePops();
  const m = document.createElement('div'); m.className = 'menu'; m.dataset.pop = 1;
  m.innerHTML = '<div class="who"><b>' + esc(S.me.user.name || 'Your account') + '</b>' + esc(S.me.user.email) + '</div>' +
    '<button type="button" data-reset>Reset dashboards to the default</button><button type="button" data-out>Sign out</button>';
  app.querySelector('[data-me]').parentNode.appendChild(m);
  m.addEventListener('click', e => e.stopPropagation());
  m.querySelector('[data-out]').addEventListener('click', () => signOut());
  m.querySelector('[data-reset]').addEventListener('click', () => { if (!confirm('Put the default dashboards back? Your own dashboards will be removed.')) return; S.layout = {dashes: DEFAULT_DASHES()}; S.dash = 0; saveLayout(); renderApp(); });
}
function closePops(){ document.querySelectorAll('[data-pop]').forEach(x => x.remove()); }
document.addEventListener('click', closePops);
function toast(m){ const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 3200); }

/* ---------- sign in / out ---------- */
function renderLogin(msg){
  app.innerHTML = '<div class="login"><form class="login-card" novalidate><div class="brandmark"><img src="img/easyleads-logo.png" alt="' + esc(BRAND) + '"></div>' +
    '<h1>Welcome back</h1><p>Sign in to see your leads, calls and bookings. Your login was set up by EDGE Marketing.</p>' +
    '<div class="fld"><label for="em">Email</label><input id="em" type="email" autocomplete="username" required></div>' +
    '<div class="fld"><label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password" required></div>' +
    '<button class="btn go big" type="submit">Sign in</button><div class="msg' + (msg ? ' err' : '') + '" role="alert">' + esc(msg || '') + '</div>' +
    '<div class="foot">Need help or forgot your password? Contact EDGE Marketing.</div></form></div>';
  app.querySelector('.login').insertAdjacentHTML('beforeend', '<div class="login-side">Powered by ' + esc(BRAND) + ' · secure, read-only access</div>');
  const f = app.querySelector('form');
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = f.querySelector('button'), m = f.querySelector('.msg');
    btn.disabled = true; btn.textContent = 'Signing in…'; m.textContent = ''; m.className = 'msg';
    try{
      const j = await api('portalLogin', {email: f.querySelector('#em').value, password: f.querySelector('#pw').value});
      if (j.error) throw new Error(j.error);
      startWith(j.session, j.me);
    }catch(err){ m.textContent = err.message; m.className = 'msg err'; btn.disabled = false; btn.textContent = 'Sign in'; }
  });
  f.querySelector('#em').focus();
}
function signOut(silent){
  ls.del(SKEY); S.session = null; S.me = null; S.cache = {};
  renderLogin(silent ? 'Your session ended. Please sign in again.' : '');
}
function startWith(session, me){
  S.session = session; S.me = me;
  if (!S.preview) ls.set(SKEY, session);
  S.layout = me.layout || ls.get('el_layout_' + me.user.email, null);
  const d = ls.get('el_domain', '');
  S.domain = me.clients.some(c => c.domain === d) ? d : (me.clients[0] || {}).domain || '';
  S.period = ls.get('el_period', '30');
  if (!PERIODS.some(p => p[0] === S.period)) S.period = '30';
  if (!me.clients.length){ app.innerHTML = '<div class="login"><div class="login-card"><h1>Almost there</h1><p>Your account isn’t linked to a business yet. EDGE Marketing will let you know when it’s ready.</p><button class="btn" type="button" id="out">Sign out</button></div></div>'; app.querySelector('#out').addEventListener('click', () => signOut()); return; }
  renderApp();
}
/* Fresh numbers every few minutes while the page is open. */
setInterval(() => { if (S.me && !document.hidden && !S.editing && !document.querySelector('.drawer-back,.modal-back,[data-pop]')){ S.cache = {}; renderApp(); } }, 5 * 60000);

(async function boot(){
  /* "Open as client" from the EDGE tool passes a short session in the address. */
  const hash = new URLSearchParams(location.hash.slice(1));
  let session = ls.get(SKEY, null);
  /* A preview session is kept in this tab only, never saved in the browser. */
  if (hash.get('s')){ session = hash.get('s'); S.preview = true; history.replaceState(null, '', location.pathname); }
  if (!session){ renderLogin(); return; }
  app.innerHTML = '<div class="login"><div class="login-card"><div class="brandmark"><img src="img/easyleads-logo.png" alt="' + esc(BRAND) + '"></div><p style="margin-top:18px">Loading your dashboard…</p></div></div>';
  try{
    const j = await api('portalMe', {session});
    if (j.error) throw new Error(j.error);
    startWith(session, j);
  }catch(e){ if (app.querySelector('form')) return; renderLogin(S.preview ? 'This preview link has expired. Open it again from the EDGE tool.' : ''); }
})();
})();
