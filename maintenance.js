/* ==========================================================================
   WEB MAINTENANCE: the WordPress care desk.

   Every SEO client whose CMS says WordPress (or WP) is listed here, plus any
   site added by hand ("Add a site"); a site can also be taken out. Each site
   needs its maintenance once per calendar month:

     green   maintained this month (someone marked it done, with the date)
     red     not done yet this month: due, and counted in the bell

   Each month starts a fresh checklist (backups, updates, security, speed,
   forms, monitoring and renewals). Ticks are saved as you go, shared with the
   team, and kept with the month's entry when it's marked done. Paused clients
   are listed but never alert.

   The record lives on the SEO client itself (c.maint, c.maintOn), so the
   workspace's own sync stamps it and merges it between teammates like any
   other client edit.

     c.maintOn   true = added by hand, false = taken out, unset = follow the CMS
     c.maint     {last, by, cur: {month, done: [ids], who: {id: name}, note},
                  log: [{id, at, by, items: [ids], total, note, month}]}

   Alerts: a red count on the bell (and on the Web Maintenance tab) whenever a
   site is due, a "Website maintenance" section at the top of the bell's
   panel, a notice once a day while anything is due (and the moment a new
   month makes sites due), and a desktop notification when the tool is open
   in the background and notifications are allowed.
   ========================================================================== */
(function () {
'use strict';
if (typeof state === 'undefined') return;
if (typeof isPublicView === 'function' && isPublicView()) return;

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const note = (m, k) => { try{ toast(m, k); }catch(e){} };
const DAY = 864e5;

/* ---------- the monthly checklist ---------- */
const GROUPS = [
  {id: 'backup', label: 'Backups', icon: 'M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 7v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5', items: [
    ['b1', 'Full backup taken: files and database', 'Keep a copy off the server (cloud storage or a download), not only on the host.'],
    ['b2', 'Backup checked to restore', 'Restore it to staging, or at least open the archive and check the database is in it.']
  ]},
  {id: 'updates', label: 'Updates', icon: 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5', items: [
    ['u1', 'WordPress core updated', 'Dashboard → Updates. Take the backup first.'],
    ['u2', 'Plugins updated', 'Read the changelog on major versions; update one at a time on busy sites and check the site after each.'],
    ['u3', 'Theme and child theme updated', 'Premium themes may need their licence key to update.'],
    ['u4', 'Unused plugins and themes deleted', 'Deactivated plugins still carry risk. Keep one default theme as a fallback.'],
    ['u5', 'PHP version still supported', 'Tools → Site Health, or the hosting panel. Aim for PHP 8.1 or newer.']
  ]},
  {id: 'security', label: 'Security', icon: 'M12 3l8 3v6c0 5-3.4 8.5-8 9-4.6-.5-8-4-8-9V6z', items: [
    ['s1', 'Malware and vulnerability scan clean', 'Wordfence, Sucuri or the host’s scanner. Act on any plugin flagged as vulnerable.'],
    ['s2', 'Admin users reviewed', 'Remove old accounts, check nobody has more access than they need, two-factor on admins.'],
    ['s3', 'SSL certificate valid', 'More than 30 days left, and no “not secure” or mixed-content warnings.'],
    ['s4', 'Login protection and firewall on', 'Limited login attempts, firewall active, no unexpected failed-login spikes.']
  ]},
  {id: 'speed', label: 'Speed', icon: 'M13 2L4 14h7l-1 8 9-12h-7z', items: [
    ['p1', 'Speed checked (PageSpeed / Core Web Vitals)', 'Mobile and desktop. Compare with last month and look into any big drop.'],
    ['p2', 'Caching and image optimisation working', 'Cache plugin or host cache on and cleared after updates; new images compressed.'],
    ['p3', 'Database cleaned', 'Old revisions, spam and trashed comments, expired transients.']
  ]},
  {id: 'site', label: 'Site checks', icon: 'M4 5h16v11H4zM8 20h8M12 16v4', items: [
    ['f1', 'Every form tested', 'Send each form once and check the email arrives and the lead reaches the tool’s bell.'],
    ['f2', 'Broken links and 404s checked', 'Fix or redirect anything broken; check Search Console’s “Not found” list.'],
    ['f3', 'Key pages checked on mobile and desktop', 'Home, services, contact, and anything that changed after the updates.'],
    ['f4', 'Site Health and error log reviewed', 'Tools → Site Health in WordPress, and the PHP error log in the hosting panel.']
  ]},
  {id: 'monitor', label: 'Monitoring and renewals', icon: 'M3 12h4l3 8 4-16 3 8h4', items: [
    ['m1', 'Uptime reviewed', 'Any downtime this month? Note it and the cause.'],
    ['m2', 'Google Search Console checked', 'Indexing problems, security issues and manual actions.'],
    ['m3', 'Domain, hosting and licences not expiring', 'Look at renewal dates for the next 60 days, including premium plugin licences.'],
    ['m4', 'Comment and form spam cleared', 'Empty spam, and tighten anti-spam if a lot is getting through.']
  ]}
];
const ITEMS = [].concat(...GROUPS.map(g => g.items.map(i => i[0])));
const TOTAL = ITEMS.length;
const ITEM_LABEL = {}; GROUPS.forEach(g => g.items.forEach(i => { ITEM_LABEL[i[0]] = i[1]; }));

/* ---------- dates ---------- */
const ym = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const monthStart = (t = Date.now()) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
const monthEnd = (t = Date.now()) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() - 1; };
const monthName = (t = Date.now(), year) => new Date(t).toLocaleDateString(undefined, year ? {month: 'long', year: 'numeric'} : {month: 'long'});
const dShort = t => new Date(t).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
const dLong = t => new Date(t).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'});
const daysSince = t => Math.max(0, Math.floor((Date.now() - t) / DAY));
const isoDay = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

/* ---------- who ---------- */
function me(){
  try{ if (typeof presName === 'function'){ const n = presName(); if (n) return n; } }catch(e){}
  try{
    const u = fbAuth && fbAuth.currentUser, mail = (u && u.email) || '';
    const tm = (state.teamMembers || []).find(t => t && t.email && String(t.email).toLowerCase() === mail.toLowerCase());
    if (tm && tm.name) return tm.name;
    const n = mail.split('@')[0];
    return n ? n.charAt(0).toUpperCase() + n.slice(1) : 'Someone';
  }catch(e){ return 'Someone'; }
}

/* ---------- which sites ---------- */
const isWp = c => /wordpress|\bwp\b/i.test(String(c.cms || ''));
const inMaint = c => !!c && (c.maintOn === true || (c.maintOn !== false && isWp(c)));
const paused = c => /pause|inactive|archiv|former|lost|cancel/i.test(String(c.status || ''));
const sites = () => (state.seoClients || []).filter(inMaint).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
const M = c => { if (!c.maint || typeof c.maint !== 'object') c.maint = {}; return c.maint; };
/* This month's working checklist (a new month starts a clean one). */
function cur(c, write){
  const m = write ? M(c) : (c.maint || {}), k = ym(Date.now());
  if (m.cur && m.cur.month === k) return m.cur;
  if (!write) return {month: k, done: [], who: {}, note: ''};
  m.cur = {month: k, done: [], who: {}, note: ''};
  return m.cur;
}
function statusOf(c){
  const m = c.maint || {}, last = +m.last || 0, now = Date.now();
  const doneNow = last && ym(last) === ym(now);
  const p = paused(c);
  const k = cur(c, false), lg = (m.log || []).filter(e => ym(e.at) === ym(now)).sort((a, b) => (b.at || 0) - (a.at || 0))[0];
  const n = Math.max(k.done.filter(i => ITEMS.indexOf(i) > -1).length, lg && lg.items ? lg.items.length : 0);
  if (doneNow) return {key: 'ok', last, by: m.by || '', n, label: 'Maintained', line: 'Done ' + dShort(last) + (m.by ? ' by ' + m.by : '')};
  if (p) return {key: 'paused', last, by: m.by || '', n, label: 'Paused', line: 'Client paused · no reminders'};
  const due = monthStart(now), late = daysSince(due) + 1;
  return {key: 'due', last, by: m.by || '', n, late, label: 'Due', line: (n ? n + ' of ' + TOTAL + ' checked · ' : '') + (last ? 'last done ' + dShort(last) : 'never marked done')};
}
const dueSites = () => sites().filter(c => statusOf(c).key === 'due');

/* ---------- logos (same as the SEO client list) ---------- */
function initials(name){
  const w = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '?';
  return w.length === 1 ? w[0].slice(0, 2).toUpperCase() : (w[0][0] + w[1][0]).toUpperCase();
}
const domainOf = c => { try{ return cleanDomain(c.website || ''); }catch(e){ return String(c.website || '').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]; } };
function logoUrl(c){
  const own = c && c.logoUrl && String(c.logoUrl).trim();
  if (own) return own;
  const d = domainOf(c);
  return d ? 'https://www.google.com/s2/favicons?sz=128&domain=' + encodeURIComponent(d) : '';
}
function logoInner(c){
  const u = logoUrl(c);
  return '<b class="seo-logo-ini">' + esc(initials(c.name)) + '</b>' +
    (u ? '<img class="seo-logo-img" src="' + esc(u) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onload="if(this.naturalWidth<17)this.remove();else this.style.opacity=1" onerror="this.remove()">' : '');
}
const logoHtml = (c, cls) => '<span class="seo-logo ' + (cls || '') + '">' + logoInner(c) + '</span>';

/* ---------- icons ---------- */
const svg = (d, cls) => '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';
const IC = {
  wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
  check: 'M20 6L9 17l-5-5',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  back: 'M11 5l-6 6 6 6M5 11h13',
  plus: 'M12 5v14M5 12h14',
  ext: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  undo: 'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  x: 'M18 6L6 18M6 6l12 12',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-3.5-3.5',
  pause: 'M9 5v14M15 5v14'
};

/* ---------- styles ---------- */
const css = `
.tn-mod .mt-nav-n{display:inline-grid;place-items:center;min-width:17px;height:17px;padding:0 5px;margin-left:2px;border-radius:9px;background:#e5484d;color:#fff;font:700 10px/1 var(--ui,Inter,sans-serif);box-shadow:0 0 0 2px rgba(0,0,0,.25);animation:mtPulse 2s ease-in-out infinite}
.tn-mod .mt-nav-ok{display:inline-block;width:7px;height:7px;margin-left:4px;border-radius:50%;background:#2ec27e;box-shadow:0 0 0 3px rgba(46,194,126,.18)}
@keyframes mtPulse{0%,100%{box-shadow:0 0 0 2px rgba(0,0,0,.25),0 0 0 0 rgba(229,72,77,.55)}50%{box-shadow:0 0 0 2px rgba(0,0,0,.25),0 0 0 6px rgba(229,72,77,0)}}

/* rail */
.mt-rail .mt-sum{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:4px 16px 12px}
.mt-rail .mt-sum div{border-radius:12px;padding:10px 12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07)}
.mt-rail .mt-sum b{display:block;font:700 20px/1.1 var(--display,Poppins,sans-serif);color:#fff}
.mt-rail .mt-sum span{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--console-ink-2,#94a3b1)}
.mt-rail .mt-sum .r b{color:#ff8b8f}.mt-rail .mt-sum .g b{color:#6fe0ae}
.mt-rail .mt-sum .r.on{background:rgba(229,72,77,.16);border-color:rgba(229,72,77,.35)}
.mt-rail .tree-row .mt-tl{position:relative;flex:0 0 auto;width:26px;height:26px;margin-right:2px;display:grid;place-items:center;border-radius:8px;background:#e7f2f3;color:#175260;font:700 10px/1 var(--display,Poppins,sans-serif);box-shadow:0 0 0 1px rgba(255,255,255,.12)}
.mt-rail .tree-row .mt-tl .seo-logo-img{padding:3px;border-radius:8px}
.mt-rail .tree-row .mt-dot{position:absolute;right:-3px;bottom:-3px;width:10px;height:10px;border-radius:50%;box-shadow:0 0 0 2px #134552;z-index:1}
.mt-dot.due{background:#ff5a5f}.mt-dot.ok{background:#2ec27e}.mt-dot.paused{background:#8a97a3}
.mt-rail .mt-tag{flex:none;font:700 10px/1 var(--ui,Inter,sans-serif);padding:4px 7px;border-radius:20px;letter-spacing:.02em}
.mt-tag.due{background:rgba(229,72,77,.2);color:#ff9a9d}.mt-tag.ok{background:rgba(46,194,126,.16);color:#7fe3b8}.mt-tag.paused{background:rgba(255,255,255,.07);color:#9aa8b4}
.mt-rail .tree-row.mt-row-due{background:linear-gradient(90deg,rgba(229,72,77,.13),transparent 70%)}
.mt-rail .tree-row.mt-row-due.on{background:linear-gradient(90deg,rgba(229,72,77,.28),rgba(229,72,77,.06))}
.mt-rail .mt-rail-sec{padding:12px 20px 6px;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--console-ink-2,#94a3b1);display:flex;justify-content:space-between}
.mt-rail .mt-ov{display:flex;align-items:center;gap:10px;margin:2px 10px 6px;padding:10px 12px;border-radius:12px;cursor:pointer;color:#eef3f7;font-size:13px;font-weight:600;transition:background .15s}
.mt-rail .mt-ov:hover{background:rgba(255,255,255,.06)}.mt-rail .mt-ov.on{background:rgba(255,255,255,.1)}
.mt-rail .mt-ov svg{width:16px;height:16px}
.mt-rail .rail-empty{margin:8px 14px}
.mt-rail .rail-search-box input{width:100%;box-sizing:border-box;background:#11161b;border:1px solid #2a6b79;color:#eef7f8;border-radius:11px;padding:9px 12px 9px 36px;font-family:var(--ui,Inter,sans-serif);font-size:12.5px;line-height:1.4;transition:border-color .18s,box-shadow .18s}
.mt-rail .rail-search-box input::placeholder{color:#6d7b89}
.mt-rail .rail-search-box input:focus{outline:none;border-color:var(--brand,#e87722);box-shadow:0 0 0 3px rgba(232,119,34,.18)}

/* stage */
.mt-stage{background:linear-gradient(180deg,#f3f6f8,#f3f6f8)}
.mt-stage.mt-red{background:radial-gradient(1200px 500px at 70% -10%,rgba(229,72,77,.10),transparent 60%),#fbf4f4}
.mt-stage.mt-green{background:radial-gradient(1200px 500px at 70% -10%,rgba(15,157,107,.08),transparent 60%),#f2f8f5}
.mt-stage .topbar .crumbs .c-main{font-weight:600}
.mt-tabs{display:flex;gap:4px;background:rgba(20,26,33,.05);padding:4px;border-radius:12px}
.mt-tabs button{border:0;background:transparent;padding:7px 13px;border-radius:9px;font:600 12.5px var(--ui,Inter,sans-serif);color:var(--ink-2,#57646f);cursor:pointer;display:flex;align-items:center;gap:6px}
.mt-tabs button.on{background:#fff;color:var(--ink,#1b222a);box-shadow:0 1px 3px rgba(20,26,33,.12)}
.mt-tabs button svg{width:14px;height:14px}
.mt-wrap{padding:28px 30px 48px;max-width:1500px;width:100%;display:flex;flex-direction:column;gap:22px}

.mt-hero{position:relative;overflow:hidden;border-radius:26px;padding:30px 32px;color:#fff;display:grid;grid-template-columns:1fr auto;gap:26px;align-items:center;box-shadow:0 30px 60px -34px rgba(20,26,33,.5)}
.mt-hero.red{background:radial-gradient(600px 300px at 90% 0%,rgba(255,255,255,.18),transparent 60%),linear-gradient(135deg,#e5484d 0%,#b8262c 60%,#8f1b20 100%)}
.mt-hero.green{background:radial-gradient(600px 300px at 90% 0%,rgba(255,255,255,.18),transparent 60%),linear-gradient(135deg,#1fb37b 0%,#0f7a58 60%,#0a5c43 100%)}
.mt-hero.grey{background:linear-gradient(135deg,#4b5865,#2f3a45)}
.mt-hero:after{content:"";position:absolute;right:-60px;bottom:-90px;width:320px;height:320px;border-radius:50%;border:42px solid rgba(255,255,255,.06)}
.mt-eyebrow{display:inline-flex;align-items:center;gap:8px;font:700 11px/1 var(--ui,Inter,sans-serif);letter-spacing:.12em;text-transform:uppercase;opacity:.85}
.mt-eyebrow svg{width:15px;height:15px}
.mt-hero h2{margin:12px 0 8px;font:600 clamp(24px,2.4vw,34px)/1.15 var(--display,Poppins,sans-serif);letter-spacing:-.02em}
.mt-hero p{margin:0;max-width:640px;font-size:14.5px;line-height:1.55;opacity:.92}
.mt-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.mt-chip{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:30px;background:rgba(255,255,255,.16);font-size:12.5px;font-weight:600;backdrop-filter:blur(6px)}
.mt-chip i{width:8px;height:8px;border-radius:50%;background:#fff}
.mt-ring{position:relative;width:150px;height:150px;flex:none;z-index:1}
.mt-ring svg{width:150px;height:150px;transform:rotate(-90deg)}
.mt-ring circle{fill:none;stroke-width:12}
.mt-ring .bg{stroke:rgba(255,255,255,.2)}.mt-ring .fg{stroke:#fff;stroke-linecap:round;transition:stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)}
.mt-ring div{position:absolute;inset:0;display:grid;place-items:center;text-align:center;line-height:1.1}
.mt-ring b{font:700 34px var(--display,Poppins,sans-serif)}.mt-ring small{display:block;font-size:11.5px;opacity:.85;margin-top:2px}

.mt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
.mt-card{position:relative;text-align:left;border-radius:20px;padding:18px 18px 16px;background:#fff;border:1px solid var(--line,#e4e9ed);cursor:pointer;font:inherit;color:inherit;display:flex;flex-direction:column;gap:12px;transition:transform .2s cubic-bezier(.2,.8,.2,1),box-shadow .2s;overflow:hidden}
.mt-card:hover{transform:translateY(-2px);box-shadow:0 18px 34px -22px rgba(20,26,33,.4)}
.mt-card:before{content:"";position:absolute;left:0;top:0;right:0;height:5px}
.mt-card.due{background:linear-gradient(180deg,#fff1f1,#fff 70%);border-color:#f6c5c7}
.mt-card.due:before{background:linear-gradient(90deg,#e5484d,#ff7b7f)}
.mt-card.ok{background:linear-gradient(180deg,#eefaf4,#fff 70%);border-color:#bfe8d4}
.mt-card.ok:before{background:linear-gradient(90deg,#0f9d6b,#3fcf93)}
.mt-card.paused{opacity:.72}.mt-card.paused:before{background:#c3ccd4}
.mt-ch{display:flex;align-items:center;gap:12px}
.mt-logo{width:46px;height:46px;flex:none;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,var(--brand-hi,#f79a3e),var(--brand-deep,#b8570f));color:#fff;font:600 16px var(--display,Poppins,sans-serif);box-shadow:0 8px 18px -10px rgba(20,26,33,.4)}
.mt-logo .seo-logo-img{padding:6px;border-radius:inherit}
.mt-cn{flex:1;min-width:0}.mt-cn b{display:block;font:600 15.5px/1.25 var(--display,Poppins,sans-serif);color:var(--ink,#1b222a);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mt-cn small{display:block;font-size:12px;color:var(--ink-3,#8b98a3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mt-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:30px;font:700 11.5px/1 var(--ui,Inter,sans-serif);white-space:nowrap}
.mt-pill svg{width:13px;height:13px}
.mt-pill.due{background:#e5484d;color:#fff;box-shadow:0 6px 14px -8px rgba(229,72,77,.9)}
.mt-pill.ok{background:#0f9d6b;color:#fff;box-shadow:0 6px 14px -8px rgba(15,157,107,.9)}
.mt-pill.paused{background:#eef1f4;color:#6b7884}
.mt-bar{height:7px;border-radius:7px;background:#eef1f4;overflow:hidden}
.mt-bar i{display:block;height:100%;border-radius:7px;transition:width .6s cubic-bezier(.2,.8,.2,1)}
.mt-card.due .mt-bar i{background:linear-gradient(90deg,#e5484d,#ff8a8d)}.mt-card.ok .mt-bar i{background:linear-gradient(90deg,#0f9d6b,#45d39a)}.mt-card.paused .mt-bar i{background:#b8c2cb}
.mt-cf{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:var(--ink-2,#57646f)}
.mt-cf em{font-style:normal;font-weight:700;color:var(--ink,#1b222a)}
.mt-go{display:inline-flex;align-items:center;gap:5px;font-weight:600;color:var(--ink,#1b222a)}.mt-go svg{width:14px;height:14px;transform:rotate(180deg)}

.mt-sec-h{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:4px 2px -6px}
.mt-sec-h h3{margin:0;font:600 17px var(--display,Poppins,sans-serif);color:var(--ink,#1b222a);letter-spacing:-.01em}
.mt-sec-h span{font-size:12.5px;color:var(--ink-3,#8b98a3)}
.mt-panel{background:#fff;border:1px solid var(--line,#e4e9ed);border-radius:22px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,26,33,.04)}
.mt-tl-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.mt-tl-list li{display:flex;gap:12px;align-items:flex-start;padding:11px 0;border-bottom:1px solid var(--line-2,#eef2f5)}
.mt-tl-list li:last-child{border-bottom:0}
.mt-tl-list .mt-tick{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#e6f5ef;color:#0f7a58}.mt-tl-list .mt-tick svg{width:15px;height:15px}
.mt-tl-list b{font-size:13.5px;color:var(--ink,#1b222a)}.mt-tl-list small{display:block;font-size:12px;color:var(--ink-3,#8b98a3);margin-top:2px}
.mt-tl-list p{margin:5px 0 0;font-size:12.5px;color:var(--ink-2,#57646f);white-space:pre-wrap}
.mt-empty{padding:26px;text-align:center;color:var(--ink-3,#8b98a3);font-size:13px}

/* one site */
.mt-site-h{position:relative;overflow:hidden;border-radius:26px;padding:26px 28px;color:#fff;display:flex;align-items:center;gap:20px;flex-wrap:wrap;box-shadow:0 30px 60px -34px rgba(20,26,33,.5)}
.mt-site-h.red{background:radial-gradient(500px 260px at 95% 0%,rgba(255,255,255,.2),transparent 60%),linear-gradient(135deg,#e5484d,#a92128)}
.mt-site-h.green{background:radial-gradient(500px 260px at 95% 0%,rgba(255,255,255,.2),transparent 60%),linear-gradient(135deg,#1fb37b,#0b6447)}
.mt-site-h.grey{background:linear-gradient(135deg,#55626e,#313c47)}
.mt-site-h .mt-logo{width:64px;height:64px;border-radius:18px;background:#fff;color:#175260;font-size:20px;box-shadow:0 12px 26px -12px rgba(0,0,0,.45)}
.mt-site-h .mt-logo .seo-logo-img{padding:8px}
.mt-site-t{flex:1;min-width:220px}
.mt-site-t h2{margin:0;font:600 26px/1.15 var(--display,Poppins,sans-serif);letter-spacing:-.02em}
.mt-site-t a{color:rgba(255,255,255,.9);font-size:13px;text-decoration:none;display:inline-flex;align-items:center;gap:5px}
.mt-site-t a:hover{text-decoration:underline}.mt-site-t a svg{width:13px;height:13px}
.mt-big{margin-top:12px;display:flex;align-items:center;gap:10px;font:600 15px/1.3 var(--ui,Inter,sans-serif)}
.mt-big span{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.22)}
.mt-big svg{width:17px;height:17px}
.mt-big small{display:block;font-weight:500;font-size:12.5px;opacity:.85}
.mt-acts{display:flex;flex-direction:column;align-items:flex-end;gap:8px;z-index:1}
.mt-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:14px;padding:12px 18px;font:700 14px var(--ui,Inter,sans-serif);cursor:pointer;transition:transform .15s,box-shadow .15s,background .15s}
.mt-btn svg{width:17px;height:17px}
.mt-btn.white{background:#fff;color:#1b222a;box-shadow:0 12px 26px -14px rgba(0,0,0,.6)}
.mt-btn.white:hover{transform:translateY(-1px);box-shadow:0 16px 30px -14px rgba(0,0,0,.65)}
.mt-btn.ghost{background:rgba(255,255,255,.14);color:#fff;padding:9px 14px;font-size:12.5px}
.mt-btn.ghost:hover{background:rgba(255,255,255,.24)}
.mt-btn.sm{padding:8px 12px;font-size:12.5px;border-radius:11px}
.mt-btn.line{background:#fff;border:1px solid var(--line,#e4e9ed);color:var(--ink,#1b222a)}
.mt-btn.line:hover{border-color:#c9d3db}
.mt-btn.red{background:#e5484d;color:#fff}.mt-btn.green{background:#0f9d6b;color:#fff}
.mt-cols{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(300px,1fr);gap:20px;align-items:start}
.mt-ck-h{display:flex;align-items:center;gap:16px;margin-bottom:6px}
.mt-mini{position:relative;width:64px;height:64px;flex:none}
.mt-mini svg{width:64px;height:64px;transform:rotate(-90deg)}
.mt-mini circle{fill:none;stroke-width:7}.mt-mini .bg{stroke:#eef1f4}.mt-mini .fg{stroke-linecap:round;transition:stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1)}
.mt-mini b{position:absolute;inset:0;display:grid;place-items:center;font:700 15px var(--display,Poppins,sans-serif);color:var(--ink,#1b222a)}
.mt-ck-h h3{margin:0;font:600 18px var(--display,Poppins,sans-serif);color:var(--ink,#1b222a)}
.mt-ck-h p{margin:3px 0 0;font-size:12.5px;color:var(--ink-3,#8b98a3)}
.mt-ck-h .grow{flex:1}
.mt-grp{margin-top:16px}
.mt-grp-h{display:flex;align-items:center;gap:9px;font:700 12px/1 var(--ui,Inter,sans-serif);letter-spacing:.07em;text-transform:uppercase;color:var(--ink-2,#57646f);margin:0 0 8px}
.mt-grp-h span{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:#f1f4f7;color:var(--ink-2,#57646f)}
.mt-grp-h span svg{width:14px;height:14px}
.mt-grp-h em{margin-left:auto;font-style:normal;letter-spacing:0;text-transform:none;font-weight:600;color:var(--ink-3,#8b98a3)}
.mt-grp-h em.all{color:#0f7a58}
.mt-item{display:flex;align-items:flex-start;gap:12px;padding:11px 12px;border-radius:14px;border:1px solid transparent;cursor:pointer;transition:background .15s,border-color .15s;user-select:none}
.mt-item:hover{background:#f7f9fb;border-color:var(--line-2,#eef2f5)}
.mt-item input{position:absolute;opacity:0;pointer-events:none}
.mt-box{flex:none;width:22px;height:22px;border-radius:7px;border:2px solid #c8d1da;display:grid;place-items:center;transition:all .18s cubic-bezier(.2,.8,.2,1);margin-top:1px;background:#fff}
.mt-box svg{width:13px;height:13px;color:#fff;stroke-width:3;opacity:0;transform:scale(.4);transition:all .2s cubic-bezier(.2,1.4,.4,1)}
.mt-item.on .mt-box{background:#0f9d6b;border-color:#0f9d6b}.mt-item.on .mt-box svg{opacity:1;transform:none}
.mt-it{flex:1;min-width:0}
.mt-it b{display:block;font-size:14px;font-weight:600;color:var(--ink,#1b222a);transition:color .15s}
.mt-it small{display:block;font-size:12.5px;line-height:1.45;color:var(--ink-3,#8b98a3);margin-top:2px}
.mt-item.on .mt-it b{color:var(--ink-2,#57646f);text-decoration:line-through;text-decoration-color:rgba(15,157,107,.6)}
.mt-who{flex:none;font-size:11px;color:#0f7a58;background:#e6f5ef;border-radius:20px;padding:3px 8px;margin-top:2px;white-space:nowrap}
.mt-ro .mt-item{cursor:default}.mt-ro .mt-item:hover{background:transparent;border-color:transparent}
.mt-note textarea{width:100%;min-height:110px;resize:vertical;border:1px solid var(--line,#e4e9ed);border-radius:14px;padding:12px 14px;font:inherit;font-size:13.5px;line-height:1.5;outline:none;transition:border-color .15s,box-shadow .15s;box-sizing:border-box}
.mt-note textarea:focus{border-color:#0f9d6b;box-shadow:0 0 0 4px rgba(15,157,107,.12)}
.mt-side{display:flex;flex-direction:column;gap:20px}
.mt-side h4{margin:0 0 10px;font:600 15px var(--display,Poppins,sans-serif);color:var(--ink,#1b222a);display:flex;align-items:center;justify-content:space-between}
.mt-side h4 small{font:500 12px var(--ui,Inter,sans-serif);color:var(--ink-3,#8b98a3)}
.mt-facts{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.mt-facts div{background:#f7f9fb;border-radius:14px;padding:12px}
.mt-facts span{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3,#8b98a3)}
.mt-facts b{display:block;margin-top:4px;font:600 15px var(--display,Poppins,sans-serif);color:var(--ink,#1b222a)}
.mt-facts b.r{color:#c53035}.mt-facts b.g{color:#0f7a58}
.mt-link{border:0;background:none;color:var(--ink-3,#8b98a3);font:600 12px var(--ui,Inter,sans-serif);cursor:pointer;padding:4px 0;display:inline-flex;align-items:center;gap:5px}
.mt-link:hover{color:#c53035}.mt-link svg{width:13px;height:13px}

/* mark-done sheet */
.mt-back{position:fixed;inset:0;z-index:10040;display:grid;place-items:center;background:rgba(20,26,33,.42);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);animation:mtIn .2s ease both}
.mt-sheet{width:min(460px,calc(100vw - 32px));background:#fff;border-radius:24px;padding:24px;box-shadow:0 40px 80px -30px rgba(20,26,33,.5);animation:mtUp .28s cubic-bezier(.2,.8,.2,1) both}
.mt-sheet h3{margin:0 0 4px;font:600 20px var(--display,Poppins,sans-serif);color:var(--ink,#1b222a)}
.mt-sheet p{margin:0 0 16px;font-size:13.5px;color:var(--ink-2,#57646f);line-height:1.5}
.mt-sheet label{display:block;font-size:12px;font-weight:700;color:var(--ink-2,#57646f);margin:12px 0 6px}
.mt-sheet input[type=date],.mt-sheet textarea,.mt-sheet .mt-srch{width:100%;box-sizing:border-box;border:1px solid var(--line,#e4e9ed);border-radius:12px;padding:10px 12px;font:inherit;font-size:14px;outline:none}
.mt-sheet textarea{min-height:80px;resize:vertical}
.mt-warn{display:flex;gap:9px;align-items:flex-start;padding:10px 12px;border-radius:12px;background:#fff6e6;color:#8a5a00;font-size:12.5px;line-height:1.45}
.mt-warn svg{width:16px;height:16px;flex:none;margin-top:1px}
.mt-sheet .mt-f{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}
.mt-pick{max-height:320px;overflow:auto;margin-top:10px;display:flex;flex-direction:column;gap:4px}
.mt-pick button{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:1px solid transparent;background:#f7f9fb;border-radius:12px;padding:8px 10px;cursor:pointer;font:inherit}
.mt-pick button:hover{border-color:#bfe8d4;background:#eefaf4}
.mt-pick .mt-logo{width:30px;height:30px;border-radius:9px;font-size:11px}
.mt-pick b{font-size:13.5px;color:var(--ink,#1b222a)}.mt-pick small{display:block;font-size:11.5px;color:var(--ink-3,#8b98a3)}
@keyframes mtIn{from{opacity:0}}@keyframes mtUp{from{opacity:0;transform:translateY(14px) scale(.98)}}
.mt-confetti{position:fixed;z-index:10060;pointer-events:none;width:8px;height:12px;border-radius:2px}

/* bell */
.tn-bell .mt-bell-n{position:absolute;top:-6px;left:-6px;min-width:17px;height:17px;padding:0 4px;border-radius:9px;background:#e5484d;color:#fff;font:700 10px/17px var(--ui,Inter,sans-serif);text-align:center;box-shadow:0 0 0 2px #14191f;z-index:2;animation:mtPulse 2s ease-in-out infinite}
.tn-bell.mt-alert{border-color:rgba(229,72,77,.55);color:#ffb3b5;background:rgba(229,72,77,.12)}
.mt-bsec{border-bottom:1px solid var(--line-2,#eef2f5);background:linear-gradient(180deg,#fff3f3,#fff)}
.mt-bsec.ok{background:linear-gradient(180deg,#f0faf5,#fff)}
.mt-bsec-h{display:flex;align-items:center;gap:8px;padding:11px 14px 6px;font:700 11px/1 var(--ui,Inter,sans-serif);letter-spacing:.08em;text-transform:uppercase;color:#c53035}
.mt-bsec.ok .mt-bsec-h{color:#0f7a58}
.mt-bsec-h svg{width:14px;height:14px}
.mt-bsec-h[data-fold]{cursor:pointer;user-select:none}
.mt-bsec-h .mt-bcount{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#e5484d;color:#fff;font-size:10.5px;letter-spacing:0}
.mt-fold{display:grid;place-items:center;width:22px;height:22px;border-radius:7px;color:var(--ink-3,#8b98a3);transition:background .15s}
.mt-bsec-h[data-fold]:hover .mt-fold{background:rgba(20,26,33,.06);color:var(--ink,#1b222a)}
.mt-car{width:14px;height:14px;transition:transform .28s cubic-bezier(.2,.8,.2,1)}
.mt-bsec.folded .mt-car{transform:rotate(-90deg)}
.mt-bbody{display:grid;grid-template-rows:1fr;transition:grid-template-rows .32s cubic-bezier(.2,.8,.2,1),opacity .25s}
.mt-binner{overflow:hidden;min-height:0}
.mt-bsec.folded .mt-bbody{grid-template-rows:0fr;opacity:0}
.mt-bsec.folded .mt-bsec-h{padding-bottom:11px}
.mt-brow{position:relative;transition:height .26s cubic-bezier(.2,.8,.2,1),opacity .2s,transform .26s,padding .26s}
.mt-brow.going{height:0!important;opacity:0;transform:translateX(24px);padding-top:0;padding-bottom:0;overflow:hidden}
.mt-bx{flex:none;width:22px;height:22px;border:0;border-radius:50%;background:transparent;color:var(--ink-3,#8b98a3);font-size:15px;line-height:1;cursor:pointer;opacity:0;transition:opacity .15s,background .15s,color .15s}
.mt-brow:hover .mt-bx,.mt-bx:focus-visible{opacity:1}
.mt-bx:hover{background:rgba(229,72,77,.12);color:#c53035}
.mt-bhid{display:flex;align-items:center;gap:8px;padding:6px 14px 10px;font-size:11.5px;color:var(--ink-3,#8b98a3)}
.mt-bhid button{margin-left:auto;border:0;background:none;font:600 11.5px var(--ui,Inter,sans-serif);color:#c53035;cursor:pointer}
.mt-pop{transition:opacity .25s,transform .25s cubic-bezier(.2,.8,.2,1)}
.mt-pop.out{opacity:0;transform:translateY(-8px) scale(.98)}
.mt-bsec-h button{margin-left:auto;border:0;background:none;font:600 11.5px var(--ui,Inter,sans-serif);letter-spacing:0;text-transform:none;color:var(--ink-2,#57646f);cursor:pointer}
.mt-bsec-h button:hover{color:var(--ink,#1b222a)}
.mt-brow{display:flex;align-items:center;gap:10px;padding:8px 14px;cursor:pointer;transition:background .12s}
.mt-brow:hover{background:rgba(229,72,77,.07)}
.mt-brow .mt-logo{width:32px;height:32px;border-radius:10px;font-size:11px;background:#fff;color:#175260;box-shadow:0 0 0 1px #f3d0d1}
.mt-brow .mt-logo .seo-logo-img{padding:4px}
.mt-brow div{flex:1;min-width:0}.mt-brow b{display:block;font-size:13px;color:var(--ink,#1b222a)}.mt-brow small{display:block;font-size:11.5px;color:var(--ink-3,#8b98a3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mt-brow em{flex:none;font-style:normal;font:700 10.5px/1 var(--ui,Inter,sans-serif);padding:5px 8px;border-radius:20px;background:#e5484d;color:#fff}
.mt-bok{display:flex;align-items:center;gap:8px;padding:2px 14px 11px;font-size:12.5px;color:#0f7a58}
.mt-bok svg{width:15px;height:15px}
.mt-pop{position:fixed;z-index:9650;width:330px;max-width:calc(100vw - 16px);border-radius:16px;padding:14px 38px 14px 14px;color:#fff;background:linear-gradient(135deg,#e5484d,#a92128);box-shadow:0 22px 44px -18px rgba(169,33,40,.75);cursor:pointer;display:flex;gap:12px;align-items:flex-start;animation:mtUp .35s cubic-bezier(.2,.8,.2,1) both}
.mt-pop .ic{flex:none;width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.2)}
.mt-pop .ic svg{width:19px;height:19px}
.mt-pop b{display:block;font:700 14px var(--display,Poppins,sans-serif)}
.mt-pop span{display:block;font-size:12.5px;line-height:1.45;opacity:.93;margin-top:2px}
.mt-pop button{position:absolute;top:8px;right:8px;border:0;background:rgba(255,255,255,.18);color:#fff;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:14px;line-height:1}

/* hub card */
.hub-card.mt-hub{grid-column:1/-1;flex-direction:row;align-items:center;gap:22px;flex-wrap:wrap}
.hub-card.mt-hub .mt-hub-t{flex:1;min-width:260px}
.hub-card.mt-hub.red{background:linear-gradient(135deg,rgba(229,72,77,.32),rgba(169,33,40,.18));border-color:rgba(255,120,124,.45)}
.hub-card.mt-hub.green{background:linear-gradient(135deg,rgba(31,179,123,.26),rgba(11,100,71,.14));border-color:rgba(111,224,174,.35)}
.hub-card.mt-hub .mt-hub-s{display:flex;gap:10px;flex-wrap:wrap}
.hub-card.mt-hub .mt-hub-s span{display:inline-flex;align-items:center;gap:7px;padding:8px 12px;border-radius:12px;background:rgba(0,0,0,.18);font-size:12.5px;font-weight:600;color:#fff}
.hub-card.mt-hub .mt-hub-s i{width:8px;height:8px;border-radius:50%}

@media(max-width:1100px){.mt-cols{grid-template-columns:1fr}.mt-hero{grid-template-columns:1fr}.mt-ring{justify-self:start}}
`;
const st = document.createElement('style'); st.id = 'mt-css'; st.textContent = css; document.head.appendChild(st);

/* ---------- view state (per browser, not shared) ---------- */
const VIEW_KEY = 'edgeMaintView';
let view = (() => { try{ return JSON.parse(localStorage.getItem(VIEW_KEY) || 'null') || {site: ''}; }catch(e){ return {site: ''}; } })();
const setView = v => { view = Object.assign(view, v); try{ localStorage.setItem(VIEW_KEY, JSON.stringify(view)); }catch(e){} };
let q = '', pop = null;

const visible = () => { const s = $('maintStage'); return !!(s && s.style.display !== 'none' && !document.body.classList.contains('hub-locked')); };
function commit(){ try{ save(); }catch(e){} if (pop) hidePop(); render(); paintAlerts(); }

/* ---------- rings ---------- */
function ring(done, total, size, stroke, color, cls){
  const r = (size - stroke) / 2, cf = 2 * Math.PI * r, off = cf * (1 - (total ? done / total : 0));
  return '<svg viewBox="0 0 ' + size + ' ' + size + '"><circle class="bg" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '"/>' +
    '<circle class="fg ' + (cls || '') + '" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-dasharray="' + cf.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"' + (color ? ' style="stroke:' + color + '"' : '') + '/></svg>';
}

/* ---------- rail ---------- */
function renderRail(){
  const rail = $('maintRail'); if (!rail) return;
  const list = sites(), due = list.filter(c => statusOf(c).key === 'due'), ok = list.filter(c => statusOf(c).key === 'ok');
  const filt = q ? list.filter(c => (String(c.name || '') + ' ' + String(c.website || '')).toLowerCase().indexOf(q) > -1) : list;
  const scroll = rail.querySelector('.rail-tree') ? rail.querySelector('.rail-tree').scrollTop : 0;
  const row = c => {
    const s = statusOf(c);
    return '<div class="tree-row' + (view.site === c.id ? ' on' : '') + (s.key === 'due' ? ' mt-row-due' : '') + '" data-site="' + esc(c.id) + '">' +
      '<span class="mt-tl seo-logo">' + logoInner(c) + '<span class="mt-dot ' + s.key + '"></span></span>' +
      '<span class="tree-name">' + esc(c.name || 'Untitled') + '</span>' +
      '<span class="mt-tag ' + s.key + '">' + (s.key === 'ok' ? dShort(s.last) : s.key === 'due' ? 'Due' : 'Paused') + '</span></div>';
  };
  rail.innerHTML =
    '<div class="rail-brand"><div class="rail-mark"><img id="maintBrandLogo" alt="EDGE Marketing &amp; Design"/></div><div><h1>Web Maintenance</h1><p>WordPress care</p></div></div>' +
    '<button class="rail-home" type="button" data-hub>' + svg(IC.back) + ' All apps <small>ALT+H</small></button>' +
    '<div class="mt-sum"><div class="r' + (due.length ? ' on' : '') + '"><b>' + due.length + '</b><span>Due</span></div><div class="g"><b>' + ok.length + '</b><span>Done in ' + esc(monthName().slice(0, 3)) + '</span></div></div>' +
    '<div class="mt-ov' + (!view.site ? ' on' : '') + '" data-ov>' + svg(IC.grid) + 'All websites</div>' +
    '<div class="rail-search"><div class="rail-search-box">' + svg(IC.search) + '<input type="text" data-q placeholder="Find a website" autocomplete="off" value="' + esc(q) + '"/></div></div>' +
    '<div class="rail-head"><span>Websites</span><div class="rail-head-acts"><button class="rail-add" type="button" data-add title="Add a website to maintenance">+</button></div></div>' +
    '<div class="rail-tree">' + (filt.length ? filt.map(row).join('') : '<div class="rail-empty"><b>' + (q ? 'No match' : 'No WordPress sites yet') + '</b>' + (q ? 'Try another name.' : 'SEO clients whose CMS is WordPress show up here on their own. Use + to add one by hand.') + '</div>') + '</div>' +
    '<div class="rail-foot"><div class="sync"><i></i><span>Shared with your team · saved with the workspace</span></div></div>';
  const lg = rail.querySelector('#maintBrandLogo'); if (lg && window.EDGE_LOGO) lg.src = window.EDGE_LOGO;
  const tree = rail.querySelector('.rail-tree'); if (tree) tree.scrollTop = scroll;
  rail.querySelector('[data-hub]').onclick = () => { if (window.EDGE) window.EDGE.hub(); };
  rail.querySelector('[data-ov]').onclick = () => { setView({site: ''}); render(); };
  rail.querySelector('[data-add]').onclick = addSite;
  const qi = rail.querySelector('[data-q]');
  qi.oninput = () => { q = qi.value.trim().toLowerCase(); const p = qi.selectionStart; renderRail(); const n = $('maintRail').querySelector('[data-q]'); n.focus(); try{ n.setSelectionRange(p, p); }catch(e){} };
  rail.querySelectorAll('[data-site]').forEach(r => r.onclick = () => { setView({site: r.dataset.site}); render(); });
}

/* ---------- stage ---------- */
function topbar(title, sub){
  return '<header class="topbar"><div class="crumbs"><span class="c-main">' + esc(title) + '</span>' + (sub ? '<span class="c-sep">›</span><span class="c-tag">' + esc(sub) + '</span>' : '') + '</div>' +
    '<nav class="mt-tabs"><button type="button" data-tab="ov" class="' + (!view.site ? 'on' : '') + '">' + svg(IC.grid) + 'Overview</button>' +
    (view.site ? '<button type="button" class="on">' + svg(IC.wrench) + 'Checklist</button>' : '') + '</nav></header>';
}
function renderStage(){
  const stg = $('maintStage'); if (!stg) return;
  const c = view.site && sites().find(x => x.id === view.site);
  if (view.site && !c) setView({site: ''});
  const keep = window.scrollY;
  if (c) renderSite(stg, c); else renderOverview(stg);
  stg.querySelectorAll('[data-tab="ov"]').forEach(b => b.onclick = () => { setView({site: ''}); render(); });
  if (keep) window.scrollTo(0, keep);
}

function renderOverview(stg){
  const list = sites(), act = list.filter(c => !paused(c)), due = list.filter(c => statusOf(c).key === 'due'), ok = act.filter(c => statusOf(c).key === 'ok');
  const now = Date.now(), left = Math.max(0, Math.ceil((monthEnd(now) - now) / DAY));
  const tone = !act.length ? 'grey' : due.length ? 'red' : 'green';
  stg.className = 'stage mt-stage ' + (tone === 'red' ? 'mt-red' : tone === 'green' ? 'mt-green' : '');
  const head = !list.length ? 'No WordPress websites yet'
    : due.length ? due.length + (due.length === 1 ? ' website still needs' : ' websites still need') + ' ' + monthName(now) + '’s maintenance'
    : act.length ? 'Every website is maintained for ' + monthName(now) : 'All websites are paused';
  const sub = !list.length ? 'SEO clients whose CMS is WordPress (or WP) appear here automatically. You can also add a site with the + in the list.'
    : due.length ? 'Due now: ' + due.map(c => c.name).slice(0, 4).join(', ') + (due.length > 4 ? ' and ' + (due.length - 4) + ' more' : '') + '. Open a site, work through its checklist and mark it done.'
    : 'Nice work. Everything resets on the 1st of next month, and anything not done turns red and rings the bell.';
  const cards = list.map(c => {
    const s = statusOf(c), pct = Math.round(s.n / TOTAL * 100);
    return '<button type="button" class="mt-card ' + s.key + '" data-site="' + esc(c.id) + '">' +
      '<div class="mt-ch">' + logoHtml(c, 'mt-logo') + '<div class="mt-cn"><b>' + esc(c.name || 'Untitled') + '</b><small>' + esc(domainOf(c) || 'No website set') + '</small></div>' +
      '<span class="mt-pill ' + s.key + '">' + svg(s.key === 'ok' ? IC.check : s.key === 'due' ? IC.alert : IC.pause) + (s.key === 'ok' ? 'Done' : s.key === 'due' ? 'Due · ' + s.late + (s.late === 1 ? ' day' : ' days') : 'Paused') + '</span></div>' +
      '<div><div class="mt-cf" style="margin-bottom:7px"><span>' + esc(monthName(now)) + ' checklist</span><em>' + s.n + ' / ' + TOTAL + '</em></div><div class="mt-bar"><i style="width:' + (s.key === 'ok' && !s.n ? 100 : pct) + '%"></i></div></div>' +
      '<div class="mt-cf"><span>' + esc(s.line) + '</span><span class="mt-go">Open' + svg(IC.back) + '</span></div></button>';
  }).join('');
  const log = [];
  list.forEach(c => ((c.maint && c.maint.log) || []).forEach(e => log.push({c, e})));
  log.sort((a, b) => (b.e.at || 0) - (a.e.at || 0));
  stg.innerHTML = topbar('Web Maintenance', monthName(now, true)) +
    '<div class="mt-wrap">' +
    '<section class="mt-hero ' + tone + '"><div style="position:relative;z-index:1">' +
      '<span class="mt-eyebrow">' + svg(IC.wrench) + 'Website maintenance · ' + esc(monthName(now, true)) + '</span>' +
      '<h2>' + esc(head) + '</h2><p>' + esc(sub) + '</p>' +
      '<div class="mt-chips"><span class="mt-chip"><i style="background:#ffb3b5"></i>' + due.length + ' due</span><span class="mt-chip"><i style="background:#8ff0c4"></i>' + ok.length + ' done</span>' +
      '<span class="mt-chip">' + svg(IC.clock, '') .replace('<svg', '<svg style="width:14px;height:14px"') + left + (left === 1 ? ' day' : ' days') + ' left in ' + esc(monthName(now)) + '</span></div></div>' +
      '<div class="mt-ring">' + ring(ok.length, act.length || 1, 150, 12) + '<div><span><b>' + ok.length + '/' + act.length + '</b><small>maintained</small></span></div></div>' +
    '</section>' +
    '<div class="mt-sec-h"><h3>Websites</h3><span>' + list.length + ' WordPress ' + (list.length === 1 ? 'site' : 'sites') + ' · red until this month’s maintenance is marked done</span></div>' +
    (list.length ? '<div class="mt-grid">' + cards + '</div>' : '<div class="mt-panel mt-empty">No WordPress websites yet. <button class="mt-btn sm line" type="button" data-add2 style="margin-left:8px">' + svg(IC.plus) + 'Add a website</button></div>') +
    '<div class="mt-sec-h"><h3>Recent maintenance</h3><span>Every site, newest first</span></div>' +
    '<div class="mt-panel">' + (log.length ? '<ul class="mt-tl-list">' + log.slice(0, 12).map(({c, e}) =>
      '<li><span class="mt-tick">' + svg(IC.check) + '</span><div style="flex:1;min-width:0"><b>' + esc(c.name) + ' · ' + esc(dLong(e.at)) + '</b><small>' + esc((e.by || 'Someone') + ' · ' + (e.items ? e.items.length : 0) + ' of ' + (e.total || TOTAL) + ' checks') + '</small>' + (e.note ? '<p>' + esc(e.note) + '</p>' : '') + '</div></li>').join('') + '</ul>'
      : '<div class="mt-empty">Nothing marked done yet. Finished maintenance shows up here with the date and who did it.</div>') + '</div>' +
    '</div>';
  stg.querySelectorAll('.mt-card').forEach(b => b.onclick = () => { setView({site: b.dataset.site}); render(); window.scrollTo(0, 0); });
  const a2 = stg.querySelector('[data-add2]'); if (a2) a2.onclick = addSite;
}

function renderSite(stg, c){
  const s = statusOf(c), m = c.maint || {}, k = cur(c, false), done = new Set(k.done), now = Date.now();
  const tone = s.key === 'due' ? 'red' : s.key === 'ok' ? 'green' : 'grey';
  stg.className = 'stage mt-stage ' + (tone === 'red' ? 'mt-red' : tone === 'green' ? 'mt-green' : '');
  const n = ITEMS.filter(i => done.has(i)).length;
  const site = domainOf(c);
  const big = s.key === 'due'
    ? '<div class="mt-big"><span>' + svg(IC.alert) + '</span><div>Maintenance due for ' + esc(monthName(now)) + '<small>Not done yet · due since ' + esc(dShort(monthStart(now))) + ' (' + s.late + (s.late === 1 ? ' day' : ' days') + ')' + (s.last ? ' · last done ' + esc(dShort(s.last)) : '') + '</small></div></div>'
    : s.key === 'ok'
      ? '<div class="mt-big"><span>' + svg(IC.check) + '</span><div>Maintained for ' + esc(monthName(now)) + '<small>Done ' + esc(dLong(s.last)) + (s.by ? ' by ' + esc(s.by) : '') + ' · next due ' + esc(dShort(monthEnd(now) + 1)) + '</small></div></div>'
      : '<div class="mt-big"><span>' + svg(IC.pause) + '</span><div>Client is paused<small>No reminders while paused' + (s.last ? ' · last done ' + esc(dShort(s.last)) : '') + '</small></div></div>';
  const groups = GROUPS.map(g => {
    const dn = g.items.filter(i => done.has(i[0])).length;
    return '<div class="mt-grp"><div class="mt-grp-h"><span>' + svg(g.icon) + '</span>' + esc(g.label) + '<em class="' + (dn === g.items.length ? 'all' : '') + '">' + dn + ' / ' + g.items.length + '</em></div>' +
      g.items.map(i => '<label class="mt-item' + (done.has(i[0]) ? ' on' : '') + '" data-i="' + i[0] + '"><input type="checkbox"' + (done.has(i[0]) ? ' checked' : '') + '><span class="mt-box">' + svg(IC.check) + '</span>' +
        '<span class="mt-it"><b>' + esc(i[1]) + '</b><small>' + esc(i[2]) + '</small></span>' + (done.has(i[0]) && k.who && k.who[i[0]] ? '<span class="mt-who">' + esc(k.who[i[0]]) + '</span>' : '') + '</label>').join('') + '</div>';
  }).join('');
  const log = (m.log || []).slice().sort((a, b) => (b.at || 0) - (a.at || 0));
  const color = tone === 'red' ? '#e5484d' : '#0f9d6b';
  stg.innerHTML = topbar('Web Maintenance', c.name || 'Website') +
    '<div class="mt-wrap">' +
    '<section class="mt-site-h ' + tone + '">' + logoHtml(c, 'mt-logo') +
      '<div class="mt-site-t"><h2>' + esc(c.name || 'Untitled') + '</h2>' + (site ? '<a href="https://' + esc(site) + '" target="_blank" rel="noopener">' + esc(site) + svg(IC.ext) + '</a>' : '') +
        (site ? ' &nbsp; <a href="https://' + esc(site) + '/wp-admin/" target="_blank" rel="noopener">WordPress admin' + svg(IC.ext) + '</a>' : '') + big + '</div>' +
      '<div class="mt-acts">' + (s.key === 'ok'
        ? '<button class="mt-btn white" type="button" data-done>' + svg(IC.check) + 'Log another visit</button><button class="mt-btn ghost" type="button" data-reopen>' + svg(IC.undo) + 'Reopen ' + esc(monthName(now)) + '</button>'
        : '<button class="mt-btn white" type="button" data-done>' + svg(IC.check) + 'Mark maintenance done</button><small style="opacity:.85;font-size:12px">' + n + ' of ' + TOTAL + ' checks ticked</small>') + '</div>' +
    '</section>' +
    '<div class="mt-cols">' +
      '<section class="mt-panel"><div class="mt-ck-h"><div class="mt-mini">' + ring(n, TOTAL, 64, 7, n === TOTAL ? '#0f9d6b' : color) + '<b>' + Math.round(n / TOTAL * 100) + '%</b></div>' +
        '<div class="grow"><h3>' + esc(monthName(now, true)) + ' checklist</h3><p>Tick each one as it’s done. Ticks save straight away and your team sees them. A new month starts a fresh list.</p></div>' +
        '<button class="mt-btn sm line" type="button" data-all>' + (n === TOTAL ? 'Clear all' : 'Tick all') + '</button></div>' + groups + '</section>' +
      '<aside class="mt-side">' +
        '<section class="mt-panel"><h4>At a glance</h4><div class="mt-facts">' +
          '<div><span>This month</span><b class="' + (s.key === 'due' ? 'r' : s.key === 'ok' ? 'g' : '') + '">' + (s.key === 'due' ? 'Due' : s.key === 'ok' ? 'Done' : 'Paused') + '</b></div>' +
          '<div><span>Last done</span><b>' + (s.last ? esc(dShort(s.last)) : '—') + '</b></div>' +
          '<div><span>Done by</span><b>' + esc(s.by || '—') + '</b></div>' +
          '<div><span>Next due</span><b>' + esc(s.key === 'ok' ? dShort(monthEnd(now) + 1) : 'Now') + '</b></div></div></section>' +
        '<section class="mt-panel mt-note"><h4>Notes for ' + esc(monthName(now)) + ' <small>saved with the visit</small></h4><textarea data-note placeholder="What was updated, anything that broke, anything to follow up next month…">' + esc(k.note || '') + '</textarea></section>' +
        '<section class="mt-panel"><h4>History <small>' + log.length + (log.length === 1 ? ' visit' : ' visits') + '</small></h4>' + (log.length ? '<ul class="mt-tl-list">' + log.slice(0, 18).map(e =>
          '<li><span class="mt-tick">' + svg(IC.check) + '</span><div style="flex:1;min-width:0"><b>' + esc(dLong(e.at)) + '</b><small>' + esc((e.by || 'Someone') + ' · ' + (e.items ? e.items.length : 0) + ' of ' + (e.total || TOTAL) + ' checks') + '</small>' + (e.note ? '<p>' + esc(e.note) + '</p>' : '') + '</div></li>').join('') + '</ul>'
          : '<div class="mt-empty" style="padding:14px">No visits logged yet.</div>') + '</section>' +
        '<button class="mt-link" type="button" data-remove>' + svg(IC.x) + 'Take ' + esc(c.name || 'this site') + ' out of Web Maintenance</button>' +
      '</aside></div></div>';

  stg.querySelectorAll('.mt-item').forEach(l => l.addEventListener('click', e => {
    e.preventDefault();
    const id = l.dataset.i, kk = cur(c, true), i = kk.done.indexOf(id);
    if (i > -1){ kk.done.splice(i, 1); if (kk.who) delete kk.who[id]; } else { kk.done.push(id); (kk.who = kk.who || {})[id] = me(); }
    commit();
  }));
  stg.querySelector('[data-all]').onclick = () => {
    const kk = cur(c, true), all = ITEMS.every(i => kk.done.indexOf(i) > -1);
    if (all){ kk.done = []; kk.who = {}; } else { const w = me(); kk.who = kk.who || {}; ITEMS.forEach(i => { if (kk.done.indexOf(i) < 0){ kk.done.push(i); kk.who[i] = w; } }); }
    commit();
  };
  const ta = stg.querySelector('[data-note]');
  let tt = 0;
  ta.oninput = () => { clearTimeout(tt); tt = setTimeout(() => { cur(c, true).note = ta.value.slice(0, 4000); try{ save(); }catch(e){} }, 600); };
  ta.onblur = () => { clearTimeout(tt); const kk = cur(c, true); if (kk.note !== ta.value){ kk.note = ta.value.slice(0, 4000); try{ save(); }catch(e){} } };
  stg.querySelector('[data-done]').onclick = () => markDone(c);
  const ro = stg.querySelector('[data-reopen]'); if (ro) ro.onclick = () => reopen(c);
  stg.querySelector('[data-remove]').onclick = () => {
    if (!confirm('Take ' + (c.name || 'this site') + ' out of Web Maintenance? Its history is kept, and you can add it back any time with +.')) return;
    c.maintOn = false; setView({site: ''}); commit(); note((c.name || 'Site') + ' taken out of Web Maintenance');
  };
}

/* ---------- mark done / reopen ---------- */
function sheet(html){
  const b = document.createElement('div'); b.className = 'mt-back';
  b.innerHTML = '<div class="mt-sheet" role="dialog" aria-modal="true">' + html + '</div>';
  document.body.appendChild(b);
  const close = () => { b.remove(); document.removeEventListener('keydown', k); };
  const k = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', k);
  b.addEventListener('mousedown', e => { if (e.target === b) close(); });
  b.querySelectorAll('[data-x]').forEach(x => x.onclick = close);
  return {el: b, close};
}
function markDone(c){
  const k = cur(c, false), n = ITEMS.filter(i => k.done.indexOf(i) > -1).length;
  const sh = sheet('<h3>Mark maintenance done</h3><p>' + esc(c.name || 'This site') + ' turns green for the month you pick and the visit is saved to its history with your name.</p>' +
    (n < TOTAL ? '<div class="mt-warn">' + svg(IC.alert) + '<span>' + n + ' of ' + TOTAL + ' checks are ticked. You can still mark it done; the unticked ones are saved as skipped.</span></div>' : '') +
    '<label>Date it was done</label><input type="date" data-d value="' + isoDay(Date.now()) + '" max="' + isoDay(Date.now()) + '">' +
    '<label>Note <span style="font-weight:500;color:#8b98a3">(optional)</span></label><textarea data-n placeholder="Anything worth remembering next month">' + esc(k.note || '') + '</textarea>' +
    '<div class="mt-f"><button class="mt-btn sm line" type="button" data-x>Cancel</button><button class="mt-btn sm green" type="button" data-ok>' + svg(IC.check) + 'Mark done</button></div>');
  sh.el.querySelector('[data-ok]').onclick = () => {
    const v = sh.el.querySelector('[data-d]').value;
    const parts = v.split('-').map(Number);
    let at = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2], 12).getTime() : Date.now();
    if (at > Date.now()) at = Date.now();
    const mm = M(c), kk = ym(at) === ym(Date.now()) ? cur(c, true) : {done: [], note: ''};
    const txt = sh.el.querySelector('[data-n]').value.trim().slice(0, 4000);
    if (ym(at) === ym(Date.now())) kk.note = txt;
    mm.log = Array.isArray(mm.log) ? mm.log : [];
    mm.log.push({id: 'mv' + Date.now().toString(36), at, month: ym(at), by: me(), items: kk.done.filter(i => ITEMS.indexOf(i) > -1), total: TOTAL, note: txt});
    mm.log.sort((a, b) => (b.at || 0) - (a.at || 0));
    if (mm.log.length > 36) mm.log.length = 36;
    if (!mm.last || at >= mm.last){ mm.last = at; mm.by = me(); }
    sh.close(); commit();
    const green = ym(at) === ym(Date.now());
    note(green ? (c.name || 'Site') + ' is maintained for ' + monthName() + ' ✓' : 'Visit saved for ' + dShort(at), 'ok');
    if (green) burst();
  };
}
function reopen(c){
  const mm = M(c), k = ym(Date.now());
  if (!confirm('Reopen ' + monthName() + ' for ' + (c.name || 'this site') + '? It turns red again until it’s marked done. The ticks stay.')) return;
  mm.log = (mm.log || []).filter(e => e.month !== k && ym(e.at) !== k);
  const prev = mm.log.slice().sort((a, b) => (b.at || 0) - (a.at || 0))[0];
  mm.last = prev ? prev.at : 0; mm.by = prev ? prev.by : '';
  commit(); note(monthName() + ' reopened for ' + (c.name || 'the site'));
}
function burst(){
  const btn = document.querySelector('.mt-site-h'); if (!btn) return;
  const r = btn.getBoundingClientRect(), cols = ['#0f9d6b', '#45d39a', '#ffd166', '#ffffff', '#1d7cf2'];
  for (let i = 0; i < 26; i++){
    const p = document.createElement('i'); p.className = 'mt-confetti';
    p.style.left = (r.right - 160) + 'px'; p.style.top = (r.top + 50) + 'px'; p.style.background = cols[i % cols.length];
    document.body.appendChild(p);
    const a = Math.random() * Math.PI - Math.PI, d = 80 + Math.random() * 140;
    p.animate([{transform: 'translate(0,0) rotate(0)', opacity: 1}, {transform: 'translate(' + Math.cos(a) * d + 'px,' + (Math.sin(a) * d + 160) + 'px) rotate(' + (Math.random() * 540) + 'deg)', opacity: 0}], {duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.8,.2,1)'}).onfinish = () => p.remove();
  }
}

/* ---------- add a site by hand ---------- */
function addSite(){
  const others = (state.seoClients || []).filter(c => !inMaint(c)).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  const sh = sheet('<h3>Add a website</h3><p>SEO clients marked WordPress in their CMS field are listed automatically. Pick any other client to add its website here.</p>' +
    '<input class="mt-srch" data-s placeholder="Find a client" autocomplete="off"><div class="mt-pick" data-l></div>' +
    '<div class="mt-f"><button class="mt-btn sm line" type="button" data-x>Close</button></div>');
  const L = sh.el.querySelector('[data-l]'), S = sh.el.querySelector('[data-s]');
  const paint = () => {
    const w = S.value.trim().toLowerCase(), list = others.filter(c => !w || (String(c.name || '') + ' ' + String(c.website || '')).toLowerCase().indexOf(w) > -1);
    L.innerHTML = list.length ? list.map(c => '<button type="button" data-c="' + esc(c.id) + '">' + logoHtml(c, 'mt-logo') + '<span><b>' + esc(c.name || 'Untitled') + '</b><small>' + esc((domainOf(c) || 'no website') + (c.cms ? ' · ' + c.cms : '')) + '</small></span></button>').join('')
      : '<div class="mt-empty" style="padding:14px">' + (others.length ? 'No client matches.' : 'Every SEO client is already in Web Maintenance.') + '</div>';
    L.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
      const c = (state.seoClients || []).find(x => x.id === b.dataset.c); if (!c) return;
      c.maintOn = true; sh.close(); setView({site: c.id}); commit(); note((c.name || 'Site') + ' added to Web Maintenance');
    });
  };
  S.oninput = paint; paint(); setTimeout(() => S.focus(), 40);
}

/* ---------- top nav, hub ---------- */
function paintNav(){
  const b = document.querySelector('.tn-mod[data-module="maint"]'); if (!b) return;
  const n = dueSites().length;
  let el = b.querySelector('.mt-nav-n, .mt-nav-ok');
  const want = n ? 'mt-nav-n' : (sites().length ? 'mt-nav-ok' : '');
  if (!want){ if (el) el.remove(); return; }
  if (!el || !el.classList.contains(want)){ if (el) el.remove(); el = document.createElement('span'); el.className = want; b.appendChild(el); }
  el.textContent = n ? (n > 9 ? '9+' : String(n)) : '';
  b.title = n ? n + ' website' + (n === 1 ? '' : 's') + ' due for maintenance (Alt+M)' : 'Web Maintenance: all done this month (Alt+M)';
}
function paintHub(){
  const card = document.querySelector('.hub-card.mt-hub'); if (!card) return;
  const list = sites(), act = list.filter(c => !paused(c)), due = dueSites(), ok = act.filter(c => statusOf(c).key === 'ok');
  card.classList.toggle('red', !!due.length); card.classList.toggle('green', !due.length && !!act.length);
  const meta = $('hubMetaMaint');
  if (meta) meta.innerHTML = '<span><i style="background:#ff8b8f"></i>' + due.length + ' due</span><span><i style="background:#6fe0ae"></i>' + ok.length + ' done in ' + esc(monthName()) + '</span><span>' + list.length + ' WordPress ' + (list.length === 1 ? 'site' : 'sites') + '</span>';
  const sub = $('hubMaintSub');
  if (sub) sub.textContent = due.length ? due.length + (due.length === 1 ? ' website needs' : ' websites need') + ' this month’s maintenance' : act.length ? 'Every website is maintained for ' + monthName() : 'WordPress care, every month';
}

/* ---------- bell: count, panel section, notice, desktop notification ---------- */
const NOTE_KEY = 'edgeMaintNotified';
const signedIn = () => { try{ return !!(fbAuth && fbAuth.currentUser); }catch(e){ return false; } };
const inApp = () => {
  if (!signedIn()) return false;
  const b = document.body, sh = $('appShell');
  return !(b.classList.contains('hub-locked') || b.classList.contains('embed-mode') || (sh && sh.classList.contains('hidden')));
};
function openSite(id){
  document.querySelectorAll('.tn-bell-panel').forEach(p => { p.hidden = true; });
  setView({site: id || ''});
  if (window.EDGE) window.EDGE.go('maint'); else render();
}
function paintBell(){
  const bell = $('tnBell'); if (!bell) return;
  const n = dueSites().length;
  let el = bell.querySelector('.mt-bell-n');
  if (n){ if (!el){ el = document.createElement('span'); el.className = 'mt-bell-n'; bell.appendChild(el); } el.textContent = n > 9 ? '9+' : String(n); el.title = n + ' website' + (n === 1 ? '' : 's') + ' due for maintenance'; }
  else if (el) el.remove();
  bell.classList.toggle('mt-alert', !!n);
  const panel = document.querySelector('.tn-bell-panel.tn-bp-forms');
  if (panel && !panel.hidden) injectPanel(panel);
}
/* The bell's section can be collapsed (remembered in this browser) and each
   site can be cleared from the list like any other notification. A cleared
   site comes back the next day while it is still due, and the red count on
   the bell never drops until the maintenance is actually marked done. */
const HIDE_KEY = 'edgeMaintHidden', FOLD_KEY = 'edgeMaintFolded';
const hiddenIds = () => { try{ const v = JSON.parse(localStorage.getItem(HIDE_KEY) || 'null'); return v && v.day === isoDay(Date.now()) && Array.isArray(v.ids) ? v.ids : []; }catch(e){ return []; } };
const hideId = id => { const ids = hiddenIds(); if (ids.indexOf(id) < 0) ids.push(id); try{ localStorage.setItem(HIDE_KEY, JSON.stringify({day: isoDay(Date.now()), ids})); }catch(e){} };
const unhideAll = () => { try{ localStorage.removeItem(HIDE_KEY); }catch(e){} };
const folded = () => { try{ return localStorage.getItem(FOLD_KEY) === '1'; }catch(e){ return false; } };
function injectPanel(panel, force){
  const list = sites(), due = dueSites(), was = panel.querySelector('.mt-bsec');
  if (!list.length){ if (was) was.remove(); return; }
  const hid = hiddenIds(), shown = due.filter(c => hid.indexOf(c.id) < 0), nHid = due.length - shown.length, fold = folded();
  const caret = '<svg class="mt-car" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
  const html = due.length
    ? '<div class="mt-bsec-h" data-fold role="button" tabindex="0" aria-expanded="' + !fold + '">' + svg(IC.wrench) + 'Website maintenance due<b class="mt-bcount">' + due.length + '</b>' +
        '<button type="button" data-all>View all</button><span class="mt-fold" title="' + (fold ? 'Show' : 'Collapse') + '">' + caret + '</span></div>' +
      '<div class="mt-bbody"><div class="mt-binner">' +
        shown.map(c => { const s = statusOf(c); return '<div class="mt-brow" data-site="' + esc(c.id) + '">' + logoHtml(c, 'mt-logo') + '<div><b>' + esc(c.name) + '</b><small>' + esc('Not done for ' + monthName() + ' · ' + s.line) + '</small></div><em>' + s.late + 'd</em>' +
          '<button type="button" class="mt-bx" data-hide="' + esc(c.id) + '" title="Clear for today (it stays due and comes back tomorrow)" aria-label="Clear ' + esc(c.name) + '">×</button></div>'; }).join('') +
        (nHid ? '<div class="mt-bhid">' + nHid + (nHid === 1 ? ' site' : ' sites') + ' cleared for today · still due<button type="button" data-unhide>Show</button></div>' : '') +
      '</div></div>'
    : '<div class="mt-bsec-h" data-fold role="button" tabindex="0" aria-expanded="' + !fold + '">' + svg(IC.check) + 'Website maintenance<button type="button" data-all>Open</button><span class="mt-fold">' + caret + '</span></div>' +
      '<div class="mt-bbody"><div class="mt-binner"><div class="mt-bok">' + svg(IC.check) + 'Every WordPress site is maintained for ' + esc(monthName()) + '</div></div></div>';
  const sig = html.length + ':' + due.map(c => c.id).join(',') + ':' + hid.join(',') + ':' + fold;
  if (was && was.dataset.sig === sig && !force) return;
  const sec = document.createElement('div');
  sec.className = 'mt-bsec' + (due.length ? '' : ' ok') + (fold ? ' folded' : ''); sec.dataset.sig = sig; sec.innerHTML = html;
  sec.addEventListener('click', e => {
    const x = e.target.closest('[data-hide]');
    if (x){
      e.stopPropagation();
      const row = x.closest('.mt-brow');
      hideId(x.dataset.hide);
      row.style.height = row.offsetHeight + 'px'; void row.offsetHeight; row.classList.add('going');
      setTimeout(() => injectPanel(panel, true), 260);
      return;
    }
    if (e.target.closest('[data-unhide]')){ e.stopPropagation(); unhideAll(); injectPanel(panel, true); return; }
    if (e.target.closest('[data-all]')){ e.stopPropagation(); openSite(''); return; }
    const r = e.target.closest('[data-site]');
    if (r) return openSite(r.dataset.site);
    if (e.target.closest('[data-fold]')){
      const f = !sec.classList.contains('folded');
      try{ localStorage.setItem(FOLD_KEY, f ? '1' : '0'); }catch(err){}
      sec.classList.toggle('folded', f);
      sec.querySelector('[data-fold]').setAttribute('aria-expanded', String(!f));
      sec.dataset.sig = sec.dataset.sig.replace(/:(true|false)$/, ':' + f);
    }
  });
  sec.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-fold]')){ e.preventDefault(); e.target.click(); } });
  if (was) was.replaceWith(sec);
  else { const h = panel.querySelector('.tn-bell-h'); if (h) h.after(sec); else panel.prepend(sec); }
}
/* Whenever the bell's panel is drawn (it redraws itself), put the section back on top. */
let panelObs = null;
function watchPanel(){
  const panel = document.querySelector('.tn-bell-panel.tn-bp-forms');
  if (!panel || panelObs) return;
  panelObs = new MutationObserver(() => { if (!panel.hidden && !panel.querySelector('.mt-bsec')) injectPanel(panel); });
  panelObs.observe(panel, {childList: true, attributes: true, attributeFilter: ['hidden']});
  if (!panel.hidden) injectPanel(panel);
}
let popTimer = 0;
function hidePop(){
  if (!pop || pop.hidden) return;
  clearTimeout(popTimer);
  pop.classList.add('out');
  setTimeout(() => { if (pop && pop.classList.contains('out')){ pop.hidden = true; pop.classList.remove('out'); } }, 260);
}
function notifyDue(force){
  if (!inApp()) return;
  const due = dueSites(); if (!due.length) return;
  const today = isoDay(Date.now()), key = today + '|' + due.map(c => c.id).sort().join(',');
  let last = ''; try{ last = localStorage.getItem(NOTE_KEY) || ''; }catch(e){}
  const lastDay = last.split('|')[0], lastIds = (last.split('|')[1] || '').split(',').filter(Boolean);
  const newOnes = due.filter(c => lastIds.indexOf(c.id) < 0);
  if (!force && lastDay === today && !newOnes.length) return;
  try{ localStorage.setItem(NOTE_KEY, key); }catch(e){}
  const title = due.length === 1 ? 'Website maintenance due' : due.length + ' websites due for maintenance';
  const line = due.map(c => c.name).slice(0, 3).join(', ') + (due.length > 3 ? ' +' + (due.length - 3) : '') + ' · not done for ' + monthName() + ' yet';
  if (!pop){
    pop = document.createElement('div'); pop.className = 'mt-pop'; pop.setAttribute('role', 'alert');
    document.body.appendChild(pop);
    pop.addEventListener('click', e => { const x = !!e.target.closest('button'); hidePop(); if (!x) openSite(dueSites().length === 1 ? dueSites()[0].id : ''); });
    pop.addEventListener('mouseenter', () => clearTimeout(popTimer));
    pop.addEventListener('mouseleave', () => { clearTimeout(popTimer); popTimer = setTimeout(hidePop, 6000); });
  }
  pop.innerHTML = '<span class="ic">' + svg(IC.wrench) + '</span><div><b>' + esc(title) + '</b><span>' + esc(line) + '</span></div><button type="button" aria-label="Dismiss">×</button>';
  const bell = $('tnBell'), anchor = bell && !bell.hidden && bell.offsetWidth ? bell : document.querySelector('.tn-right');
  const r = anchor && anchor.offsetWidth ? anchor.getBoundingClientRect() : {bottom: 54, right: window.innerWidth - 16};
  pop.style.top = (r.bottom + 10) + 'px'; pop.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
  pop.classList.remove('out'); pop.hidden = false;
  if (bell){ bell.classList.remove('ring'); void bell.offsetWidth; bell.classList.add('ring'); }
  try{
    if (window.Notification && Notification.permission === 'granted'){
      const n = new Notification('🔧 ' + title, {body: line, tag: 'edge-maint-' + today, requireInteraction: true});
      n.onclick = () => { try{ window.focus(); }catch(e){} n.close(); openSite(due.length === 1 ? due[0].id : ''); };
    } else if (window.Notification && Notification.permission === 'default'){
      try{ Notification.requestPermission(); }catch(e){}
    }
  }catch(e){}
  clearTimeout(popTimer); popTimer = setTimeout(hidePop, 20000);
}
function paintAlerts(){ paintNav(); paintHub(); paintBell(); }

/* ---------- render + live refresh ---------- */
function render(){
  if (visible()){ renderRail(); renderStage(); }
  paintAlerts();
}
/* Redraw when the data changes underneath (a teammate's save arriving, a new
   month starting, a client marked WordPress) - checked every few seconds. */
let lastSig = '';
function sig(){
  try{ return ym(Date.now()) + '|' + JSON.stringify(sites().map(c => [c.id, c.name, c.status, c.logoUrl, c.website, c.maint && c.maint.last, c.maint && c.maint.cur, (c.maint && c.maint.log || []).length])); }catch(e){ return String(Math.random()); }
}
function tick(){
  watchPanel();
  const s = sig();
  if (s !== lastSig){
    const monthFlip = lastSig && lastSig.slice(0, 7) !== s.slice(0, 7);
    lastSig = s;
    const ae = document.activeElement, typing = ae && visible() && $('maintStage').contains(ae) && ae.tagName === 'TEXTAREA';
    if (!typing) render(); else paintAlerts();
    if (monthFlip) notifyDue(true);
  } else paintAlerts();
}
setInterval(tick, 3000);
setInterval(() => notifyDue(false), 60 * 1000);
setTimeout(() => { tick(); notifyDue(false); }, 2500);
window.addEventListener('focus', () => setTimeout(tick, 200));

/* Alt+M from anywhere. */
document.addEventListener('keydown', e => {
  if (!e.altKey || e.ctrlKey || e.metaKey || String(e.key || '').toLowerCase() !== 'm') return;
  const sh = $('appShell'); if (!sh || sh.classList.contains('hidden') || document.body.classList.contains('embed-mode')) return;
  e.preventDefault(); if (window.EDGE) window.EDGE.go('maint');
});

window.EDGE_maint = {render, open: openSite, due: () => dueSites().map(c => c.name), notify: () => notifyDue(true)};
})();
