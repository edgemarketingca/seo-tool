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
  let data = {users: [], clients: []};
  const nameOf = d => (data.clients.find(c => c.domain === d) || {}).name || d;
  const okOf = d => (data.clients.find(c => c.domain === d) || {}).connected;
  /* What each business's Easyleads token can read, from the tracker's last check (portalCheckScopes). */
  const LBL = {calls: 'Calls', contacts: 'Contacts', opps: 'Pipeline', appts: 'Appointments', forms: 'Forms'};
  const missing = d => { const r = data.scopes && data.scopes.d && data.scopes.d[d]; return r ? Object.keys(LBL).filter(k => r[k] === 'scope').map(k => LBL[k]) : []; };

  async function load(){
    try{
      data = await call('portalAdminList'); list();
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
      (u.domains.length ? u.domains.map(d => '<span class="pta-chip ' + (okOf(d) ? 'ok' : 'no') + '" title="' + (okOf(d) ? 'Easyleads connected' : 'Easyleads not connected for this business yet') + '">' + esc(nameOf(d)) + '</span>').join('') : '<span class="pta-chip no">No business linked</span>') +
      u.domains.filter(d => missing(d).length).map(d => '<span class="pta-chip no" title="Add these read-only scopes to the Private Integration in this Easyleads sub-account">' + esc(nameOf(d)) + ' needs access to: ' + esc(missing(d).join(', ')) + '</span>').join('') +
      '</div></div><div class="pta-acts"><button class="pta-b" type="button" data-a="as">Open as client</button><button class="pta-b" type="button" data-a="edit">Edit</button>' +
      '<button class="pta-b" type="button" data-a="toggle">' + (u.disabled ? 'Enable' : 'Disable') + '</button><button class="pta-b bad" type="button" data-a="del">Delete</button></div></div>').join('');
    L.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => act(b.dataset.a, data.users.find(u => u.id === b.closest('[data-id]').dataset.id))));
  }
  async function act(a, u){
    if (!u) return;
    try{
      if (a === 'edit') return form(u);
      if (a === 'as'){
        const w = window.open('about:blank', '_blank');
        const j = await call('portalAdminSession', {id: u.id});
        if (w) w.location = portalUrl() + '#s=' + encodeURIComponent(j.session); else say('Allow pop-ups to open the client view', 'err');
        return;
      }
      if (a === 'toggle'){
        await call('portalAdminSave', {id: u.id, email: u.email, name: u.name, domains: u.domains, disabled: !u.disabled, signOut: !u.disabled});
        say(u.disabled ? 'Login enabled' : 'Login disabled: they’re signed out everywhere'); return load();
      }
      if (a === 'del'){
        if (!confirm('Delete the login for ' + (u.name || u.email) + '? They won’t be able to sign in again. Their Easyleads data isn’t touched.')) return;
        await call('portalAdminDelete', {id: u.id}); say('Login deleted'); return load();
      }
    }catch(e){ say(e.message, 'err'); }
  }
  function form(u, preset){
    u = u || null;
    const picked = new Set(u ? u.domains : (preset || []));
    const F = $('[data-form]');
    F.innerHTML = '<div class="pta-form"><b style="font-size:14px">' + (u ? 'Edit ' + esc(u.name || u.email) : 'New client login') + '</b>' +
      '<div class="pta-row"><div><label>Name</label><input type="text" data-n value="' + esc(u ? u.name : '') + '" placeholder="e.g. Robert at Black Rock Garage"></div>' +
      '<div><label>Email (their username)</label><input type="email" data-e value="' + esc(u ? u.email : '') + '" placeholder="name@business.com" autocomplete="off"></div></div>' +
      '<div><label>' + (u ? 'New password (leave blank to keep the current one)' : 'Password') + '</label><div class="pta-pw"><input type="text" data-p autocomplete="new-password" placeholder="At least 12 characters"><button class="pta-b" type="button" data-gen>Generate strong password</button><button class="pta-b" type="button" data-cp>Copy</button></div>' +
      (u ? '<label style="display:flex;gap:6px;align-items:center;text-transform:none;letter-spacing:0;font-size:12.5px;font-weight:600;color:var(--ink-2);margin-top:8px"><input type="checkbox" data-so> Sign them out of every device</label>' : '') + '</div>' +
      '<div><label>Businesses they can see</label><input type="text" data-q placeholder="Find a business" style="margin-bottom:8px"><div class="pta-biz" data-biz></div></div>' +
      '<div class="pta-note">The password is shown only here. Copy it and send it to the client separately from the link (for example the link by email and the password by text). It isn’t stored anywhere it can be read back.</div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end"><button class="pta-b" type="button" data-cancel>Cancel</button><button class="pta-b go" type="button" data-save>' + (u ? 'Save changes' : 'Create login') + '</button></div></div>';
    const biz = () => {
      const q = F.querySelector('[data-q]').value.trim().toLowerCase();
      const cs = data.clients.slice().sort((a, b) => (b.connected - a.connected) || a.name.localeCompare(b.name)).filter(c => !q || (c.name + ' ' + c.domain).toLowerCase().indexOf(q) > -1);
      F.querySelector('[data-biz]').innerHTML = cs.map(c => '<label class="' + (picked.has(c.domain) ? 'on' : '') + '"><input type="checkbox" value="' + esc(c.domain) + '"' + (picked.has(c.domain) ? ' checked' : '') + '><span title="' + esc(c.domain) + '">' + esc(c.name) + '</span>' +
        '<span class="pta-chip ' + (c.connected ? 'ok' : 'no') + '" style="flex:none;margin:0">' + (c.connected ? 'Easyleads' : 'not connected') + '</span></label>').join('');
      F.querySelectorAll('[data-biz] input').forEach(i => i.addEventListener('change', () => { if (i.checked) picked.add(i.value); else picked.delete(i.value); i.parentNode.classList.toggle('on', i.checked); }));
    };
    biz();
    F.querySelector('[data-q]').addEventListener('input', biz);
    F.querySelector('[data-gen]').addEventListener('click', () => { F.querySelector('[data-p]').value = genPassword(); });
    F.querySelector('[data-cp]').addEventListener('click', () => { const v = F.querySelector('[data-p]').value; if (v) navigator.clipboard.writeText(v).then(() => say('Password copied')); });
    F.querySelector('[data-cancel]').addEventListener('click', () => { F.innerHTML = ''; });
    F.querySelector('[data-save]').addEventListener('click', async ev => {
      const btn = ev.currentTarget, pw = F.querySelector('[data-p]').value;
      if (pw && pw.length < 12){ say('Use a password of at least 12 characters', 'err'); return; }
      if (!u && !pw){ say('Set a password, or click Generate', 'err'); return; }
      if (!picked.size && !confirm('No business is linked, so they’ll see nothing yet. Save anyway?')) return;
      btn.disabled = true; btn.textContent = 'Saving…';
      try{
        await call('portalAdminSave', {id: u && u.id, name: F.querySelector('[data-n]').value.trim(), email: F.querySelector('[data-e]').value.trim(),
          password: pw || undefined, domains: Array.from(picked), disabled: u ? u.disabled : false, signOut: !!(F.querySelector('[data-so]') && F.querySelector('[data-so]').checked)});
        say(u ? 'Login updated' : 'Login created. Send the link and password to the client.');
        F.innerHTML = ''; load();
      }catch(e){ say(e.message, 'err'); btn.disabled = false; btn.textContent = u ? 'Save changes' : 'Create login'; }
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
