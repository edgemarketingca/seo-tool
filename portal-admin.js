/* ==========================================================================
   CLIENT PORTAL ACCOUNTS (EDGE side)
   Creates and controls the logins clients use for the Easyleads dashboard
   (portal/). Only EDGE can create, change, disable or delete them; clients
   can't sign up or change their own password. Every action goes to the
   tracker with the admin key (tracker/portal.gs).
   ========================================================================== */
(function(){
'use strict';
const AIV = window.AIVis;
if (!AIV || !AIV.tracker || !document.getElementById('seoPublishAllBtn')) return;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const portalUrl = () => location.origin + location.pathname.replace(/[^\/]*$/, '') + 'portal/';
const say = (m, k) => { try{ if (typeof toast === 'function') toast(m, k); }catch(e){} };
/* A loading screen over the whole portal panel while a login is created, saved or removed:
   the steps tick through as the work goes, then a check mark once it's done. */
function busy(host, o){
  const el = document.createElement('div'); el.className = 'pta-busy';
  const steps = o.steps || [];
  el.innerHTML = '<div class="pta-busy-in"><div class="lg"><img src="portal/img/easyleads-mark.png" alt=""><span class="ck">\u2713</span></div><h3></h3><p></p>' +
    (steps.length ? '<ul class="pta-steps">' + steps.map(t => '<li><i></i><span></span></li>').join('') + '</ul>' : '') + '<div class="pta-bar"><i></i></div></div>';
  const set = (t, sub) => { el.querySelector('h3').textContent = t; el.querySelector('p').textContent = sub || ''; };
  set(o.title, o.sub);
  el.querySelectorAll('.pta-steps span').forEach((sp, i) => { sp.textContent = steps[i]; });
  host.appendChild(el);
  let cur = -1;
  const lis = el.querySelectorAll('.pta-steps li'), bar = el.querySelector('.pta-bar i');
  const step = i => { cur = i; lis.forEach((li, j) => { li.className = j < i ? 'ok' : j === i ? 'on' : ''; }); bar.style.width = Math.round(((i + .5) / Math.max(1, steps.length)) * 90) + '%'; };
  if (steps.length) step(0);
  /* the server does it all in one go, so the later steps follow on a gentle timer */
  const timers = steps.slice(1).map((_, i) => setTimeout(() => { if (cur < i + 1) step(i + 1); }, 700 * (i + 1)));
  return {
    done(t, sub){ timers.forEach(clearTimeout); lis.forEach(li => { li.className = 'ok'; }); bar.style.width = '100%'; el.classList.add('done'); set(t, sub);
      return new Promise(r => setTimeout(r, 1100)); },
    close(){ timers.forEach(clearTimeout); el.remove(); }
  };
}
async function call(action, body){
  const s = AIV.tracker() || {};
  if (!s.url || !s.key) throw new Error('Connect the AI Visibility Tracker first (AI Visibility tab, ⚙).');
  const res = await fetch(s.url, {method: 'POST', body: JSON.stringify(Object.assign({action, key: s.key}, body || {})), redirect: 'follow'});
  const j = await res.json();
  if (j.error) throw new Error(j.error === 'unauthorized' ? 'The tracker didn’t accept the key.' : j.error === 'unknown action' ? 'The tracker doesn’t have the portal update yet.' : j.error);
  return j;
}
/* A strong password: 18 characters from an unambiguous set, from the browser's secure random source. */
function genPassword(){
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*?';
  const r = new Uint32Array(18); crypto.getRandomValues(r);
  return Array.from(r, x => a[x % a.length]).join('');
}

function styles(){
  if (document.getElementById('ptaStyles')) return;
  const st = document.createElement('style'); st.id = 'ptaStyles';
  st.textContent = `
.pta-back{position:fixed;inset:0;background:rgba(20,26,33,.45);z-index:9998;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto;}
.pta{background:var(--card-2,#f7f9fa);border-radius:18px;width:min(980px,100%);padding:20px 22px 24px;box-shadow:0 30px 60px -20px rgba(0,0,0,.4);font-family:var(--ui,Inter,sans-serif);color:var(--ink,#1b222a);}
.pta h2{font:600 19px var(--display,Poppins,sans-serif);margin:0;}
.pta .cap{color:var(--ink-2,#57646f);font-size:12.5px;line-height:1.5;margin-top:4px;}
.pta-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;}
.pta-link{display:flex;gap:8px;align-items:center;background:#fff;border:1px solid var(--line,#e4e9ed);border-radius:12px;padding:10px 12px;margin:14px 0;flex-wrap:wrap;}
.pta-link code{font:500 12.5px var(--mono,monospace);flex:1;min-width:200px;word-break:break-all;}
.pta-b{font:600 12.5px var(--ui,Inter,sans-serif);border:1px solid var(--line,#e4e9ed);background:#fff;color:var(--ink,#1b222a);border-radius:9px;padding:7px 11px;cursor:pointer;white-space:nowrap;}
.pta-b:hover{border-color:var(--brand,#e87722);color:var(--brand-deep,#b8570f);}
.pta-b.go{background:var(--brand,#e87722);border-color:var(--brand,#e87722);color:#fff;}
.pta-b.bad{color:#b5352a;}
.pta-x{border:0;background:none;font-size:24px;cursor:pointer;line-height:1;}
.pta-list{display:grid;gap:10px;}
.pta-u{background:#fff;border:1px solid var(--line,#e4e9ed);border-radius:14px;padding:12px 14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;}
.pta-u.off{opacity:.6;}
.pta-av{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#1f6feb,#14b8a6);color:#fff;display:grid;place-items:center;font:700 13px var(--ui,Inter,sans-serif);flex:none;}
.pta-u .who{flex:1;min-width:200px;}
.pta-u .who b{display:block;font-size:14px;} .pta-u .who small{color:var(--ink-3,#8b98a3);font-size:12px;}
.pta-chip{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;border-radius:20px;padding:2px 8px;background:var(--line-2,#eef2f5);color:var(--ink-2,#57646f);margin:4px 4px 0 0;}
.pta-chip.ok{background:#e6f5ef;color:#0f7a58;} .pta-chip.no{background:#fdf1e6;color:#b8570f;} .pta-chip.off{background:#fdecea;color:#b5352a;}
.pta-acts{display:flex;gap:6px;flex-wrap:wrap;}
.pta-form{background:#fff;border:1px solid var(--line,#e4e9ed);border-radius:14px;padding:16px;margin-bottom:14px;display:grid;gap:12px;}
.pta-form label{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3,#8b98a3);display:block;margin-bottom:5px;}
.pta-form input[type=text],.pta-form input[type=email]{font:500 13.5px var(--ui,Inter,sans-serif);border:1px solid var(--line,#e4e9ed);border-radius:9px;padding:9px 11px;width:100%;box-sizing:border-box;}
.pta-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;} @media(max-width:700px){.pta-row{grid-template-columns:1fr;}}
.pta-pw{display:flex;gap:8px;} .pta-pw input{font-family:var(--mono,monospace) !important;}
.pta-biz{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px;max-height:240px;overflow:auto;padding:2px;}
.pta-biz label{display:flex;align-items:center;gap:8px;text-transform:none;letter-spacing:0;font-size:12.5px;font-weight:600;color:var(--ink,#1b222a);border:1px solid var(--line,#e4e9ed);border-radius:10px;padding:7px 9px;margin:0;cursor:pointer;}
.pta-biz label.on{border-color:var(--brand,#e87722);background:var(--brand-wash,#fdf1e6);}
.pta-biz span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.pta-note{font-size:12px;color:var(--ink-2,#57646f);background:#fffbe6;border:1px solid #f3e3a1;border-radius:10px;padding:9px 11px;line-height:1.5;}
.pta-form{position:relative;}
.pta-cover{position:absolute;inset:0;border-radius:14px;background:rgba(255,255,255,.9);backdrop-filter:blur(2px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;z-index:2;}
.pta-cover b{font-size:14.5px;} .pta-cover small{color:var(--ink-2,#57646f);font-size:12.5px;}
.pta-spin{width:30px;height:30px;border-radius:50%;border:3px solid rgba(29,124,242,.18);border-top-color:var(--brand,#1d7cf2);animation:ptas .7s linear infinite;margin-bottom:6px;}
.pta-ok{width:36px;height:36px;border-radius:50%;background:#e5f6ee;color:#0f9d6b;display:grid;place-items:center;font-weight:700;font-size:18px;margin-bottom:4px;}
@keyframes ptas{to{transform:rotate(360deg)}}
.pta{position:relative;}
.pta-err{display:none;font-size:12.5px;font-weight:600;color:#b5352a;background:#fdf1ef;border:1px solid #f6d5cf;border-radius:10px;padding:9px 11px;line-height:1.5;}
.pta-err.on{display:block;animation:ptaShake .35s;}
@keyframes ptaShake{20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}
.pta-pc{display:block;margin-top:6px;font-size:11.5px;color:var(--ink-3,#8b98a3);} .pta-pc.ok{color:#0f9d6b;} .pta-pc.bad{color:#b5352a;}
.pta-busy{position:absolute;inset:0;z-index:20;border-radius:18px;background:rgba(247,249,252,.94);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:flex-start;justify-content:center;padding-top:min(18vh,160px);animation:ptaFade .2s ease;}
@keyframes ptaFade{from{opacity:0}to{opacity:1}}
.pta-busy-in{display:flex;flex-direction:column;align-items:center;text-align:center;width:min(360px,90%);position:sticky;top:120px;}
.pta-busy .lg{position:relative;width:76px;height:76px;border-radius:50%;background:#fff;display:grid;place-items:center;box-shadow:0 26px 50px -26px rgba(13,23,38,.5);}
.pta-busy .lg img{width:40px;height:auto;}
.pta-busy .lg::before{content:"";position:absolute;inset:-7px;border-radius:50%;border:2.5px solid rgba(29,124,242,.14);border-top-color:#1d7cf2;animation:ptas .9s linear infinite;}
.pta-busy.done .lg::before{border-color:#0f9d6b;animation:none;}
.pta-busy.done .lg{background:#e9f8f1;}
.pta-busy .lg .ck{display:none;color:#0f9d6b;font-size:30px;font-weight:700;}
.pta-busy.done .lg img{display:none;} .pta-busy.done .lg .ck{display:block;animation:ptaPop .35s cubic-bezier(.2,1.6,.4,1);}
@keyframes ptaPop{from{transform:scale(.4);opacity:0}to{transform:none;opacity:1}}
.pta-busy h3{font:600 18px var(--display,Poppins,sans-serif);margin:22px 0 4px;letter-spacing:-.01em;}
.pta-busy p{margin:0;font-size:13px;color:var(--ink-2,#57646f);line-height:1.5;}
.pta-steps{list-style:none;padding:0;margin:18px 0 0;display:grid;gap:8px;width:100%;text-align:left;}
.pta-steps li{display:flex;align-items:center;gap:10px;font-size:13px;color:#93a1b5;background:#fff;border:1px solid #e9eef4;border-radius:12px;padding:9px 12px;transition:color .2s,border-color .2s;}
.pta-steps li i{width:18px;height:18px;border-radius:50%;border:2px solid #dbe3ec;flex:none;display:grid;place-items:center;font-style:normal;font-size:11px;font-weight:700;}
.pta-steps li.on{color:#0d1726;border-color:#cfe2fb;} .pta-steps li.on i{border-color:rgba(29,124,242,.2);border-top-color:#1d7cf2;animation:ptas .7s linear infinite;}
.pta-steps li.ok{color:#26354a;} .pta-steps li.ok i{border:0;background:#0f9d6b;color:#fff;animation:none;}
.pta-steps li.ok i::after{content:"\u2713";}
.pta-bar{margin-top:18px;width:100%;height:4px;border-radius:4px;background:#e6ecf3;overflow:hidden;}
.pta-bar i{display:block;height:100%;width:0;border-radius:4px;background:linear-gradient(90deg,#1d7cf2,#62b2ff);transition:width .5s ease;}
.pta-empty{background:#fff;border:1.5px dashed var(--line,#e4e9ed);border-radius:14px;padding:30px;text-align:center;color:var(--ink-2,#57646f);font-size:13px;}
`;
  document.head.appendChild(st);
}

function open(opts){
  opts = opts || {};
  styles();
  const back = document.createElement('div'); back.className = 'pta-back';
  back.innerHTML = '<div class="pta" role="dialog" aria-modal="true" aria-label="Client portal accounts"><div class="pta-top"><div><h2>Client portal (Easyleads)</h2>' +
    '<div class="cap">Logins your clients use to see their Easyleads leads, calls, pipeline and bookings, read only. Only EDGE can create, change or remove them.</div></div>' +
    '<button class="pta-x" type="button" aria-label="Close">×</button></div>' +
    '<div class="pta-link"><b style="font-size:12.5px">Client login link</b><code>' + esc(portalUrl()) + '</code><button class="pta-b" type="button" data-copy>Copy link</button><a class="pta-b" href="' + esc(portalUrl()) + '" target="_blank" rel="noopener">Open</a></div>' +
    '<div data-form></div><div style="display:flex;justify-content:space-between;align-items:center;margin:4px 0 10px"><b style="font-size:13px">Accounts</b><button class="pta-b go" type="button" data-new>+ New client login</button></div>' +
    '<div class="pta-list" data-list><div class="pta-empty">Loading…</div></div></div>';
  document.body.appendChild(back);
  const $ = s => back.querySelector(s);
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey); if (opts.onClose) opts.onClose(); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  $('.pta-x').addEventListener('click', close);
  $('[data-copy]').addEventListener('click', () => navigator.clipboard.writeText(portalUrl()).then(() => say('Link copied')));
  let data = {users: [], clients: []}, loaded = false, redrawBiz = null;
  const nameOf = d => (data.clients.find(c => c.domain === d) || {}).name || d;
  const okOf = d => (data.clients.find(c => c.domain === d) || {}).connected;
  /* What each business's Easyleads token can read, from the tracker's last check (portalCheckScopes). */
  const LBL = {calls: 'Calls', contacts: 'Contacts', opps: 'Pipeline', appts: 'Appointments', forms: 'Forms', emails: 'Email'};
  const missing = d => { const r = data.scopes && data.scopes.d && data.scopes.d[d]; return r ? Object.keys(LBL).filter(k => r[k] === 'scope').map(k => LBL[k]) : []; };

  async function load(){
    try{
      data = await call('portalAdminList'); loaded = true; list();
      if (redrawBiz) redrawBiz();
      if (opts.newFor){ const d = opts.newFor; opts.newFor = null; form(null, [d]); }
      if (opts.editId){ const u = data.users.find(x => x.id === opts.editId); opts.editId = null; if (u) form(u); }
    }
    catch(e){ $('[data-list]').innerHTML = '<div class="pta-empty">' + esc(e.message) + '</div>'; }
  }
  function list(){
    const L = $('[data-list]');
    if (!data.users.length){ L.innerHTML = '<div class="pta-empty">No client logins yet. Click <b>+ New client login</b>.</div>'; return; }
    L.innerHTML = data.users.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email)).map(u => '<div class="pta-u' + (u.disabled ? ' off' : '') + '" data-id="' + esc(u.id) + '">' +
      '<div class="pta-av">' + esc((u.name || u.email).slice(0, 2).toUpperCase()) + '</div><div class="who"><b>' + esc(u.name || u.email) + '</b><small>' + esc(u.email) + ' · ' +
      (u.lastLogin ? 'last signed in ' + esc(new Date(u.lastLogin).toLocaleDateString('en-CA', {month: 'short', day: 'numeric'})) : 'hasn’t signed in yet') + '</small><div>' +
      (u.disabled ? '<span class="pta-chip off">Disabled</span>' : '') +
      (u.domains.length ? u.domains.map(d => '<span class="pta-chip ' + (okOf(d) ? 'ok' : 'no') + '" title="' + (okOf(d) ? 'Data from Easyleads' : 'Data from the website forms EDGE tracks') + '">' + esc(nameOf(d)) + '</span>').join('') : '<span class="pta-chip no">No business linked</span>') +
      '<span class="pta-chip' + (u.locked ? '' : ' ok') + '" title="' + (u.locked ? 'Only EDGE arranges this dashboard' : 'They can arrange their own dashboard') + '">' + (u.locked ? '🔒 EDGE arranges their dashboard' : 'Can customize') + '</span>' +
      u.domains.filter(d => missing(d).length).map(d => '<span class="pta-chip no" title="Add these read-only scopes to the Private Integration in this Easyleads sub-account">' + esc(nameOf(d)) + ' needs access to: ' + esc(missing(d).join(', ')) + '</span>').join('') +
      '</div></div><div class="pta-acts"><button class="pta-b" type="button" data-a="as" title="Opens their dashboard as they see it. You can arrange it there.">Open &amp; arrange dashboard</button><button class="pta-b" type="button" data-a="edit">Edit</button>' +
      '<button class="pta-b" type="button" data-a="toggle">' + (u.disabled ? 'Enable' : 'Disable') + '</button><button class="pta-b bad" type="button" data-a="del">Delete</button></div></div>').join('');
    L.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => act(b.dataset.a, data.users.find(u => u.id === b.closest('[data-id]').dataset.id))));
  }
  async function act(a, u){
    if (!u) return;
    let cv = null;
    try{
      if (a === 'edit') return form(u);
      if (a === 'as'){
        const w = window.open('about:blank', '_blank');
        const j = await call('portalAdminSession', {id: u.id});
        if (w) w.location = portalUrl() + '#s=' + encodeURIComponent(j.session); else say('Allow pop-ups to open the client view', 'err');
        return;
      }
      if (a === 'toggle'){
        cv = busy(back.querySelector('.pta'), {title: u.disabled ? 'Turning the login back on' : 'Turning the login off', sub: u.name || u.email, steps: u.disabled ? ['Updating the account', 'Letting them sign in again'] : ['Updating the account', 'Signing them out everywhere']});
        await call('portalAdminSave', {id: u.id, email: u.email, name: u.name, domains: u.domains, disabled: !u.disabled, signOut: !u.disabled});
        await cv.done(u.disabled ? 'Login enabled' : 'Login disabled', u.disabled ? 'They can sign in again.' : 'They’re signed out on every device.'); cv.close();
        say(u.disabled ? 'Login enabled' : 'Login disabled: they’re signed out everywhere'); return load();
      }
      if (a === 'del'){
        if (!confirm('Delete the login for ' + (u.name || u.email) + '? They won’t be able to sign in again. Their Easyleads data isn’t touched.')) return;
        cv = busy(back.querySelector('.pta'), {title: 'Deleting the login', sub: u.name || u.email, steps: ['Signing them out everywhere', 'Removing the account']});
        await call('portalAdminDelete', {id: u.id});
        await cv.done('Login deleted', 'Their Easyleads data wasn’t touched.'); cv.close();
        say('Login deleted'); return load();
      }
    }catch(e){ if (cv) cv.close(); say(e.message, 'err'); }
  }
  function form(u, preset){
    u = u || null;
    const picked = new Set(u ? u.domains : (preset || []));
    const F = $('[data-form]');
    F.innerHTML = '<div class="pta-form"><b style="font-size:14px">' + (u ? 'Edit ' + esc(u.name || u.email) : 'New client login') + '</b>' +
      '<div class="pta-row"><div><label>Name</label><input type="text" data-n value="' + esc(u ? u.name : '') + '" placeholder="e.g. Robert at Black Rock Garage"></div>' +
      '<div><label>Email (their username)</label><input type="email" data-e value="' + esc(u ? u.email : '') + '" placeholder="name@business.com" autocomplete="off"></div></div>' +
      '<div><label>' + (u ? 'New password (leave blank to keep the current one)' : 'Password') + '</label><div class="pta-pw"><input type="text" data-p autocomplete="new-password" placeholder="At least 12 characters"><button class="pta-b" type="button" data-gen>Generate strong password</button><button class="pta-b" type="button" data-cp>Copy</button></div><small class="pta-pc" data-pc></small>' +
      (u ? '<label style="display:flex;gap:6px;align-items:center;text-transform:none;letter-spacing:0;font-size:12.5px;font-weight:600;color:var(--ink-2);margin-top:8px"><input type="checkbox" data-so> Sign them out of every device</label>' : '') + '</div>' +
      '<label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-size:13px;font-weight:600;color:var(--ink,#1b222a)"><input type="checkbox" data-cust' + ((u ? !u.locked : [...picked].some(d => okOf(d))) ? ' checked' : '') + '> Let them customize their own dashboard <span style="font-weight:500;color:var(--ink-3,#8b98a3)">(off: only EDGE arranges it, from “Open &amp; arrange dashboard”)</span></label>' +
      '<div><label>Businesses they can see</label><input type="text" data-q placeholder="Find a business" style="margin-bottom:8px"><div class="pta-biz" data-biz></div></div>' +
      '<div class="pta-note">The password is shown only here. Copy it and send it to the client separately from the link (for example the link by email and the password by text). It isn’t stored anywhere it can be read back.</div>' +
      '<div class="pta-err" data-err role="alert"></div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end"><button class="pta-b" type="button" data-cancel>Cancel</button><button class="pta-b go" type="button" data-save>' + (u ? 'Save changes' : 'Create login') + '</button></div></div>';
    const biz = () => {
      const q = F.querySelector('[data-q]').value.trim().toLowerCase();
      const cs = data.clients.slice().sort((a, b) => (b.connected - a.connected) || a.name.localeCompare(b.name)).filter(c => !q || (c.name + ' ' + c.domain).toLowerCase().indexOf(q) > -1);
      F.querySelector('[data-biz]').innerHTML = !loaded ? '<div style="font-size:12.5px;color:var(--ink-2,#57646f);padding:6px">Loading businesses\u2026</div>' : !cs.length ? '<div style="font-size:12.5px;color:var(--ink-2,#57646f);padding:6px">No businesses match.</div>' : cs.map(c => '<label class="' + (picked.has(c.domain) ? 'on' : '') + '"><input type="checkbox" value="' + esc(c.domain) + '"' + (picked.has(c.domain) ? ' checked' : '') + '><span title="' + esc(c.domain) + '">' + esc(c.name) + '</span>' +
        '<span class="pta-chip ' + (c.connected ? 'ok' : 'no') + '" style="flex:none;margin:0">' + (c.connected ? 'Easyleads' : 'Website forms') + '</span></label>').join('');
      F.querySelectorAll('[data-biz] input').forEach(i => i.addEventListener('change', () => { if (i.checked) picked.add(i.value); else picked.delete(i.value); i.parentNode.classList.toggle('on', i.checked); }));
    };
    biz(); redrawBiz = biz;
    const errEl = F.querySelector('[data-err]');
    const fail = m => { errEl.textContent = m; errEl.classList.remove('on'); void errEl.offsetWidth; errEl.classList.add('on'); errEl.scrollIntoView({behavior: 'smooth', block: 'nearest'}); };
    const pc = () => {
      const v = F.querySelector('[data-p]').value, el = F.querySelector('[data-pc]');
      if (!v){ el.textContent = u ? '' : 'At least 12 characters'; el.className = 'pta-pc'; return; }
      el.textContent = v.length >= 12 ? '\u2713 ' + v.length + ' characters' : v.length + ' of 12 characters minimum';
      el.className = 'pta-pc ' + (v.length >= 12 ? 'ok' : 'bad');
    };
    pc();
    F.querySelector('[data-p]').addEventListener('input', () => { pc(); errEl.classList.remove('on'); });
    F.querySelector('[data-q]').addEventListener('input', biz);
    F.querySelector('[data-gen]').addEventListener('click', () => { F.querySelector('[data-p]').value = genPassword(); pc(); errEl.classList.remove('on'); });
    F.querySelector('[data-cp]').addEventListener('click', () => { const v = F.querySelector('[data-p]').value; if (v) navigator.clipboard.writeText(v).then(() => say('Password copied')); });
    F.querySelector('[data-cancel]').addEventListener('click', () => { F.innerHTML = ''; redrawBiz = null; });
    F.querySelector('[data-save]').addEventListener('click', async ev => {
      const btn = ev.currentTarget, pw = F.querySelector('[data-p]').value;
      const em = F.querySelector('[data-e]').value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){ fail('Enter the client’s email address: it’s their username.'); return; }
      if (!u && !pw){ fail('Set a password, or click Generate strong password.'); return; }
      if (pw && pw.length < 12){ fail('The password needs at least 12 characters (this one has ' + pw.length + '). Add a few more, or click Generate strong password.'); return; }
      if (!picked.size && !confirm('No business is linked, so they’ll see nothing yet. Save anyway?')) return;
      errEl.classList.remove('on');
      btn.disabled = true; btn.textContent = u ? 'Saving…' : 'Creating…';
      const n = picked.size;
      const cover = busy(back.querySelector('.pta'), u
        ? {title: 'Saving changes', sub: u.name || u.email, steps: ['Checking the details', pw ? 'Securing the new password' : 'Keeping their password', 'Updating ' + n + ' business' + (n === 1 ? '' : 'es')]}
        : {title: 'Creating the login', sub: em, steps: ['Checking the details', 'Securing the password', 'Linking ' + n + ' business' + (n === 1 ? '' : 'es'), 'Getting their dashboard ready']});
      try{
        await call('portalAdminSave', {id: u && u.id, name: F.querySelector('[data-n]').value.trim(), email: F.querySelector('[data-e]').value.trim(),
          password: pw || undefined, domains: Array.from(picked), disabled: u ? u.disabled : false, signOut: !!(F.querySelector('[data-so]') && F.querySelector('[data-so]').checked), locked: !F.querySelector('[data-cust]').checked});
        await cover.done(u ? 'Changes saved' : 'Login created', u ? 'Their access is up to date.' : 'Send them the link, and the password separately.');
        cover.close();
        say(u ? 'Login updated' : 'Login created. Send the link and password to the client.');
        F.innerHTML = ''; redrawBiz = null; load();
      }catch(e){ cover.close(); fail(e.message); btn.disabled = false; btn.textContent = u ? 'Save changes' : 'Create login'; }
    });
    F.scrollIntoView({behavior: 'smooth', block: 'start'});
  }
  $('[data-new]').addEventListener('click', () => form(null));
  load();
}

/* A button in the SEO Clients sidebar, beside "Share all clients". */
function place(){
  const ref = document.getElementById('seoPublishAllBtn');
  if (!ref || document.getElementById('seoPortalBtn')) return;
  const row = document.createElement('div'); row.className = 'mini-row'; row.style.marginTop = '6px';
  row.innerHTML = '<button class="mini-btn" id="seoPortalBtn" type="button" title="Client logins for the Easyleads dashboard">Client portal logins</button>';
  ref.closest('.mini-row').after(row);
  row.querySelector('button').addEventListener('click', open);
}
place();
window.EdgePortalAdmin = {open, call, portalUrl, styles};
})();
