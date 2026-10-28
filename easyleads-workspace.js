/* ==========================================================================
   WORKSPACE CHOOSER: EDGE or EASYLEADS
   After signing in, the team first picks a workspace:
     EDGE       the existing hub (GBP Tracker, Live SERP, SEO Clients)
     Easyleads  every client's Easyleads (GoHighLevel) connection and the
                client-portal logins EDGE controls: create, edit, disable,
                open a client's dashboard exactly as they see it.
   The choice is remembered for this browser tab only, so every new visit
   starts on the chooser. Alt+H still opens the EDGE hub; the hub and the
   Easyleads screen each have a "Switch workspace" button.
   ========================================================================== */
(function(){
'use strict';
const PA = window.EdgePortalAdmin;
if (!PA) return;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const KEY = 'edge-workspace-choice';
const ss = {get(){ try{ return sessionStorage.getItem(KEY) || ''; }catch(e){ return ''; } }, set(v){ try{ sessionStorage.setItem(KEY, v); }catch(e){} }};
const logoW = 'portal/img/easyleads-logo-white.png';
const say = (m, k) => { try{ if (typeof toast === 'function') toast(m, k); }catch(e){} };
const IC = {
  arrow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
  swap: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>',
  link: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
  user: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>',
  eye: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8M21 3v5h-5"/></svg>'
};

function styles(){
  if (document.getElementById('elwsStyles')) return;
  const st = document.createElement('style'); st.id = 'elwsStyles';
  st.textContent = `
.elws{position:fixed;inset:0;z-index:9000;overflow:auto;font-family:var(--ui,Inter,sans-serif);animation:elwsIn .35s ease;}
@keyframes elwsIn{from{opacity:0}to{opacity:1}}
.elws-choose{background:radial-gradient(1000px 520px at 15% -10%,rgba(232,119,34,.22),transparent 60%),radial-gradient(1000px 560px at 100% 110%,rgba(29,148,255,.28),transparent 60%),#10161d;display:flex;align-items:center;justify-content:center;padding:40px 18px;}
.elws-ch{width:min(980px,100%);}
.elws-ch h2{font:600 34px var(--display,Poppins,sans-serif);color:#fff;letter-spacing:-.02em;margin:10px 0 6px;}
.elws-ch p.lead{color:#9fb0c0;margin:0 0 30px;font-size:14.5px;}
.elws-eyebrow{color:#e8a35f;font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;}
.elws-cards{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
@media(max-width:760px){.elws-cards{grid-template-columns:1fr}}
.elws-card{position:relative;text-align:left;border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:28px 28px 24px;cursor:pointer;color:#fff;overflow:hidden;min-height:300px;display:flex;flex-direction:column;
  transition:transform .2s,box-shadow .2s,border-color .2s;font:inherit;}
.elws-card:hover,.elws-card:focus-visible{transform:translateY(-4px);box-shadow:0 30px 60px -28px rgba(0,0,0,.7);outline:none;}
.elws-card.edge{background:linear-gradient(160deg,#1d5a66,#10343d);} .elws-card.edge:hover{border-color:#e87722;}
.elws-card.el{background:linear-gradient(160deg,#0a3f7d,#052a56);} .elws-card.el:hover{border-color:#1d94ff;}
.elws-card .lg{height:44px;display:flex;align-items:center;margin-bottom:26px;}
.elws-card .lg img{height:34px;width:auto;}
.elws-card .lg .edgebox{background:#fff;border-radius:10px;padding:8px 12px;display:inline-flex;}
.elws-card .lg .edgebox img{height:22px;}
.elws-card h3{font:600 24px var(--display,Poppins,sans-serif);margin:0 0 8px;}
.elws-card p{color:rgba(255,255,255,.72);font-size:14px;line-height:1.55;margin:0;flex:1;}
.elws-card .tags{display:flex;gap:6px;flex-wrap:wrap;margin:18px 0;}
.elws-card .tags span{font:600 11px var(--mono,monospace);background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:4px 10px;}
.elws-card .go{display:inline-flex;gap:8px;align-items:center;font-weight:700;font-size:14px;}
.elws-card kbd{position:absolute;top:18px;right:18px;font:600 11px var(--mono,monospace);color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:2px 7px;}
.elws-card .glow{position:absolute;right:-60px;bottom:-60px;width:220px;height:220px;border-radius:50%;filter:blur(40px);opacity:.35;}
.elws-card.edge .glow{background:#e87722;} .elws-card.el .glow{background:#1d94ff;}
.elws-foot{color:#6f8193;font-size:12px;margin-top:22px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;}

.elws-app{background:#f3f7fc;color:#0f172a;}
.elws-top{background:#052a56;color:#fff;position:sticky;top:0;z-index:2;box-shadow:0 8px 24px -16px rgba(5,42,86,.8);}
.elws-top-in{max-width:1280px;margin:0 auto;padding:14px 22px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.elws-top img{height:28px;}
.elws-top .sep{width:1px;height:26px;background:rgba(255,255,255,.2);}
.elws-top .t{font:600 14px var(--display,Poppins,sans-serif);} .elws-top .t small{display:block;font:700 9.5px var(--ui,Inter,sans-serif);letter-spacing:.18em;text-transform:uppercase;color:#8fb7e6;}
.elws-top .grow{flex:1;}
.elws-btn{display:inline-flex;align-items:center;gap:7px;border:1px solid #d6e2f0;background:#fff;color:#0f172a;border-radius:10px;padding:8px 13px;font:600 13px var(--ui,Inter,sans-serif);cursor:pointer;white-space:nowrap;text-decoration:none;}
.elws-btn:hover{border-color:#1d94ff;color:#0b6fd6;}
.elws-btn.go{background:#1d94ff;border-color:#1d94ff;color:#fff;} .elws-btn.go:hover{background:#0b6fd6;color:#fff;}
.elws-top .elws-btn{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.2);color:#fff;} .elws-top .elws-btn:hover{background:rgba(255,255,255,.16);}
.elws-wrap{max-width:1280px;margin:0 auto;padding:26px 22px 60px;}
.elws-hero{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:20px;}
.elws-hero h1{font:600 28px var(--display,Poppins,sans-serif);margin:0;letter-spacing:-.02em;}
.elws-hero p{margin:4px 0 0;color:#5b6b7c;font-size:13.5px;}
.elws-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:20px;}
.elws-stat{background:#fff;border:1px solid #e3ebf5;border-radius:16px;padding:14px 16px;box-shadow:0 1px 2px rgba(5,42,86,.04);}
.elws-stat b{display:block;font:600 26px var(--display,Poppins,sans-serif);color:#052a56;}
.elws-stat span{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8a9bb0;}
.elws-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px;}
.elws-bar input{flex:1;min-width:220px;border:1px solid #d6e2f0;border-radius:11px;padding:10px 13px;font:500 13.5px var(--ui,Inter,sans-serif);background:#fff;}
.elws-seg{display:inline-flex;background:#e4ecf6;border-radius:11px;padding:3px;}
.elws-seg button{border:0;background:none;padding:7px 12px;border-radius:9px;font:600 12.5px var(--ui,Inter,sans-serif);color:#4c5d70;cursor:pointer;}
.elws-seg button.on{background:#fff;color:#052a56;box-shadow:0 1px 2px rgba(5,42,86,.12);}
.elws-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:14px;}
.elws-c{background:#fff;border:1px solid #e3ebf5;border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:12px;transition:box-shadow .2s,transform .2s;}
.elws-c:hover{box-shadow:0 16px 36px -22px rgba(5,42,86,.45);transform:translateY(-2px);}
.elws-c .h{display:flex;gap:12px;align-items:center;}
.elws-c .h img{width:40px;height:40px;border-radius:11px;border:1px solid #e3ebf5;background:#fff;object-fit:contain;padding:4px;flex:none;}
.elws-c .h div{min-width:0;flex:1;} .elws-c .h b{display:block;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;} .elws-c .h small{color:#8a9bb0;font-size:12px;}
.elws-pill{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;border-radius:20px;padding:3px 9px;white-space:nowrap;}
.elws-pill.ok{background:#e3f6ee;color:#0f8a5f;} .elws-pill.no{background:#eef2f7;color:#6b7c8f;} .elws-pill.warn{background:#fff3e1;color:#b86a00;} .elws-pill.blue{background:#e6f2ff;color:#0b6fd6;}
.elws-access{display:flex;gap:5px;flex-wrap:wrap;}
.elws-access span{font-size:11px;font-weight:600;border-radius:8px;padding:3px 7px;background:#f1f5fa;color:#8a9bb0;}
.elws-access span.y{background:#e6f2ff;color:#0b6fd6;}
.elws-logins{display:flex;flex-direction:column;gap:6px;}
.elws-login{display:flex;align-items:center;gap:8px;font-size:12.5px;background:#f7fafd;border:1px solid #edf2f8;border-radius:10px;padding:6px 8px;}
.elws-login .av{width:26px;height:26px;border-radius:50%;background:#1d94ff;color:#fff;display:grid;place-items:center;font:700 10.5px var(--ui,Inter,sans-serif);flex:none;}
.elws-login .who{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;} .elws-login .who small{color:#8a9bb0;}
.elws-login button{border:0;background:none;color:#0b6fd6;font:600 12px var(--ui,Inter,sans-serif);cursor:pointer;padding:2px 4px;}
.elws-c .acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:auto;}
.elws-empty{background:#fff;border:1.5px dashed #d6e2f0;border-radius:16px;padding:40px;text-align:center;color:#5b6b7c;}
.elws-note{background:#fff;border:1px solid #e3ebf5;border-left:3px solid #1d94ff;border-radius:12px;padding:12px 14px;font-size:12.5px;color:#4c5d70;line-height:1.55;margin-bottom:16px;}
.hub-switch{display:inline-flex;align-items:center;gap:6px;}
.elws-app ~ .pta-back .pta{--brand:#1d94ff;--brand-deep:#0b6fd6;--brand-wash:#e8f3ff;}
.elws-app ~ .pta-back .pta h2::before{content:"";display:inline-block;width:22px;height:22px;margin-right:8px;vertical-align:-4px;background:url(portal/img/easyleads-mark.png) center/contain no-repeat;}
`;
  document.head.appendChild(st);
}

/* ---------- chooser ---------- */
let chooserEl = null;
function chooser(onEdge){
  styles();
  if (chooserEl) chooserEl.remove();
  const el = chooserEl = document.createElement('div');
  el.className = 'elws elws-choose';
  const edgeLogo = window.EDGE_LOGO || '';
  el.innerHTML = '<div class="elws-ch"><span class="elws-eyebrow">Choose a workspace</span><h2>Where are we working today?</h2><p class="lead">Both use the same clients and the same cloud record.</p>' +
    '<div class="elws-cards">' +
    '<button class="elws-card edge" type="button" data-w="edge"><kbd>E</kbd><div class="lg"><span class="edgebox"><img src="' + esc(edgeLogo) + '" alt="EDGE"></span></div><h3>EDGE</h3>' +
      '<p>The search console: GBP rank grids, live SERP checks and SEO client reporting, with team and client reports.</p><div class="tags"><span>GBP Tracker</span><span>Live SERP</span><span>SEO Clients</span></div><span class="go">Open EDGE ' + IC.arrow + '</span><i class="glow"></i></button>' +
    '<button class="elws-card el" type="button" data-w="el"><kbd>L</kbd><div class="lg"><img src="' + logoW + '" alt="Easyleads"></div><h3>Easyleads client portal</h3>' +
      '<p>Every client’s Easyleads account in one place: who’s connected, what data their dashboard can show, and the client logins only EDGE can create and control.</p><div class="tags"><span>Client logins</span><span>Dashboards</span><span>Read-only</span></div><span class="go">Open Easyleads ' + IC.arrow + '</span><i class="glow"></i></button>' +
    '</div><div class="elws-foot"><span>Press <b>E</b> or <b>L</b> to jump in</span><span>Alt + H opens the EDGE hub from anywhere</span></div></div>';
  document.body.appendChild(el);
  const pick = w => {
    ss.set(w); el.remove(); chooserEl = null; document.removeEventListener('keydown', key);
    if (w === 'el') workspace(); else onEdge();
  };
  const key = e => { if (e.target.closest && e.target.closest('input,textarea')) return; const k = e.key.toLowerCase(); if (k === 'e') pick('edge'); if (k === 'l') pick('el'); };
  document.addEventListener('keydown', key);
  el.querySelectorAll('[data-w]').forEach(b => b.addEventListener('click', () => pick(b.dataset.w)));
  setTimeout(() => { const b = el.querySelector('[data-w]'); if (b) b.focus({preventScroll: true}); }, 50);
}

/* ---------- Easyleads workspace ---------- */
let wsEl = null;
function workspace(){
  styles();
  if (wsEl) wsEl.remove();
  const el = wsEl = document.createElement('div');
  el.className = 'elws elws-app';
  const mail = (window.fbAuth && fbAuth.currentUser && fbAuth.currentUser.email) || '';
  el.innerHTML = '<header class="elws-top"><div class="elws-top-in"><img src="' + logoW + '" alt="Easyleads"><span class="sep"></span><div class="t">Client portal console<small>Run by EDGE Marketing</small></div><div class="grow"></div>' +
    '<span style="font-size:12px;color:#8fb7e6">' + esc(mail) + '</span>' +
    '<button class="elws-btn" type="button" data-switch>' + IC.swap + 'Switch workspace</button></div></header>' +
    '<main class="elws-wrap"><div class="elws-hero"><div><h1>Easyleads clients</h1><p>Connect a client’s Easyleads account once, then give them a login to their own read-only dashboard.</p></div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="elws-btn" type="button" data-copy>' + IC.link + 'Copy client login link</button><button class="elws-btn" type="button" data-check>' + IC.refresh + 'Re-check data access</button>' +
    '<button class="elws-btn go" type="button" data-new>' + IC.user + 'New client login</button></div></div>' +
    '<div class="elws-stats" data-stats></div><div data-note></div>' +
    '<div class="elws-bar"><input type="search" data-q placeholder="Find a client by name or website"><div class="elws-seg" data-f>' +
    [['all', 'All'], ['conn', 'Connected'], ['login', 'Has a login'], ['need', 'Needs access']].map((f, i) => '<button type="button" data-v="' + f[0] + '"' + (i ? '' : ' class="on"') + '>' + f[1] + '</button>').join('') + '</div></div>' +
    '<div class="elws-grid" data-grid><div class="elws-empty">Loading clients from the tracker…</div></div></main>';
  document.body.appendChild(el);
  document.body.classList.add('hub-locked');
  const $ = s => el.querySelector(s);
  let data = {users: [], clients: [], scopes: null}, filter = 'all';
  const LBL = [['forms', 'Forms'], ['calls', 'Calls'], ['contacts', 'Contacts'], ['opps', 'Pipeline'], ['appts', 'Bookings']];
  const access = d => { const r = data.scopes && data.scopes.d && data.scopes.d[d]; return r ? LBL.map(l => ({k: l[0], label: l[1], ok: typeof r[l[0]] === 'number'})) : null; };
  const reload = async () => {
    try{ data = await PA.call('portalAdminList'); draw(); }
    catch(e){ $('[data-grid]').innerHTML = '<div class="elws-empty">' + esc(e.message) + '</div>'; }
  };
  function draw(){
    const conn = data.clients.filter(c => c.connected);
    const usersOf = d => data.users.filter(u => (u.domains || []).indexOf(d) > -1);
    const needs = c => { const a = access(c.domain); return c.connected && a && a.some(x => !x.ok); };
    const week = Date.now() - 7 * 864e5;
    $('[data-stats]').innerHTML = [
      [conn.length, 'Connected to Easyleads'], [data.users.length, 'Client logins'],
      [data.users.filter(u => (u.lastLogin || 0) > week || (u.lastSeen || 0) > week).length, 'Active this week'],
      [conn.filter(needs).length, 'Need more data access']
    ].map(s => '<div class="elws-stat"><b>' + s[0] + '</b><span>' + s[1] + '</span></div>').join('');
    $('[data-note]').innerHTML = conn.filter(needs).length ? '<div class="elws-note"><b>Some dashboards can only show form submissions.</b> To show calls, contacts, pipeline and bookings too, open that client’s Easyleads sub-account → Settings → Private Integrations → <i>EDGE SEO tool</i> → Edit → Scopes, add View Conversation Messages, View Contacts, View Opportunities, View Calendars and View Calendar Events (all read-only), then click Update and <b>Re-check data access</b> here.</div>' : '';
    const q = $('[data-q]').value.trim().toLowerCase();
    const rows = data.clients.slice().sort((a, b) => (b.connected - a.connected) || (usersOf(b.domain).length - usersOf(a.domain).length) || a.name.localeCompare(b.name))
      .filter(c => !q || (c.name + ' ' + c.domain).toLowerCase().indexOf(q) > -1)
      .filter(c => filter === 'all' || (filter === 'conn' && c.connected) || (filter === 'login' && usersOf(c.domain).length) || (filter === 'need' && needs(c)));
    $('[data-grid]').innerHTML = rows.length ? rows.map(c => {
      const us = usersOf(c.domain), a = access(c.domain);
      return '<div class="elws-c"><div class="h"><img src="https://www.google.com/s2/favicons?domain=' + encodeURIComponent(c.domain) + '&sz=64" alt="" onerror="this.style.visibility=\'hidden\'"><div><b title="' + esc(c.name) + '">' + esc(c.name) + '</b><small>' + esc(c.domain) + '</small></div>' +
        (c.connected ? '<span class="elws-pill ok">● Connected</span>' : '<span class="elws-pill no">Not connected</span>') + '</div>' +
        (c.connected ? (a ? '<div class="elws-access" title="What this client’s dashboard can show">' + a.map(x => '<span class="' + (x.ok ? 'y' : '') + '">' + (x.ok ? '✓ ' : '✕ ') + x.label + '</span>').join('') + '</div>' : '<div class="elws-access"><span>Data access not checked yet</span></div>')
          : '<div style="font-size:12px;color:#8a9bb0">Connect it in the tracker sheet: AI Tracker menu → Connect Easyleads for a client.</div>') +
        '<div class="elws-logins">' + (us.length ? us.map(u => '<div class="elws-login"><span class="av">' + esc((u.name || u.email).slice(0, 2).toUpperCase()) + '</span><span class="who">' + esc(u.name || u.email) + ' <small>' + esc(u.email) + (u.disabled ? ' · disabled' : u.lastLogin ? '' : ' · not signed in yet') + '</small></span>' +
          '<button type="button" data-as="' + esc(u.id) + '" title="Open their dashboard as they see it">' + IC.eye + '</button><button type="button" data-edit="' + esc(u.id) + '">Edit</button></div>').join('') : '<div style="font-size:12px;color:#8a9bb0">No client login yet.</div>') + '</div>' +
        '<div class="acts">' + (c.connected ? '<button class="elws-btn go" type="button" data-newfor="' + esc(c.domain) + '">' + IC.user + 'Create login</button>' : '') +
        (us[0] ? '<button class="elws-btn" type="button" data-as="' + esc(us[0].id) + '">' + IC.eye + 'View their dashboard</button>' : '') + '</div></div>';
    }).join('') : '<div class="elws-empty">No clients match.</div>';
    el.querySelectorAll('[data-newfor]').forEach(b => b.addEventListener('click', () => PA.open({newFor: b.dataset.newfor, onClose: reload})));
    el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => PA.open({editId: b.dataset.edit, onClose: reload})));
    el.querySelectorAll('[data-as]').forEach(b => b.addEventListener('click', async () => {
      const w = window.open('about:blank', '_blank');
      try{ const j = await PA.call('portalAdminSession', {id: b.dataset.as}); if (w) w.location = PA.portalUrl() + '#s=' + encodeURIComponent(j.session); }
      catch(e){ if (w) w.close(); say(e.message, 'err'); }
    }));
  }
  $('[data-q]').addEventListener('input', draw);
  el.querySelectorAll('[data-f] button').forEach(b => b.addEventListener('click', () => { filter = b.dataset.v; el.querySelectorAll('[data-f] button').forEach(x => x.classList.toggle('on', x === b)); draw(); }));
  $('[data-new]').addEventListener('click', () => PA.open({onClose: reload}));
  $('[data-copy]').addEventListener('click', () => navigator.clipboard.writeText(PA.portalUrl()).then(() => say('Client login link copied')));
  $('[data-check]').addEventListener('click', async e => {
    const b = e.currentTarget; b.disabled = true; const t = b.innerHTML; b.innerHTML = IC.refresh + 'Checking every client… (about a minute)';
    try{ await PA.call('portalAdminCheck'); await reload(); say('Data access re-checked'); }
    catch(err){ say(err.message, 'err'); }
    b.disabled = false; b.innerHTML = t;
  });
  $('[data-switch]').addEventListener('click', () => { el.remove(); wsEl = null; document.body.classList.remove('hub-locked'); chooser(() => window.EDGE_showHub && window.EDGE_showHub(true, true)); });
  reload();
}

/* The EDGE hub asks here first (see showHub in index.html). */
window.EL_WS = {
  /* true when the hub may open now; otherwise the chooser is shown and opens it after "EDGE". */
  gate(openHub){
    if (ss.get()) return true;
    chooser(openHub);
    return false;
  },
  chooser(openHub){ chooser(openHub); },
  workspace
};

/* "Switch workspace" on the EDGE hub. */
function hubButton(){
  const user = document.querySelector('#hubScreen .hub-user');
  if (!user || document.getElementById('hubSwitchWs')) return;
  const b = document.createElement('button');
  b.className = 'hub-ghost hub-switch'; b.id = 'hubSwitchWs'; b.type = 'button';
  b.innerHTML = IC.swap + 'Switch workspace';
  b.addEventListener('click', () => { if (window.EDGE_showHub) window.EDGE_showHub(false); chooser(() => window.EDGE_showHub && window.EDGE_showHub(true, true)); });
  user.insertBefore(b, user.firstChild);
}
hubButton();
})();
