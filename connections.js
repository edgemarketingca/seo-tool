/* ==========================================================================
   CONNECTIONS — one card on each client's Dashboard (SEO Clients) that shows
   and sets up everything the tracker reads for that client:

     GA4               pick the property (likely match suggested), saved to the tracker
     Search Console    status, and who to share the property with if it's missing
     Website forms     copy the snippet for this domain, check it's on the live site,
                       live / imported counts, and imports past
                  submissions from the WordPress / Concrete admin
     Easyleads         connect a GoHighLevel sub-account (old + new submissions)

   Talks to the AI Visibility Tracker with the team key saved on the AI
   Visibility tab (state.settings.aiTracker). Tracker side: tracker/connections.gs.
   ========================================================================== */
(function () {
'use strict';
if (typeof state === 'undefined' || !document.getElementById('seoModes')) return;

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const normDomain = v => String(v || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[\/?#:]/)[0];
const tracker = () => { const s = (state.settings && state.settings.aiTracker) || {}; return {url: s.url || '', key: s.key || ''}; };
const client = () => (state.seoClients || []).find(c => c.id === state.activeSeoClientId) || null;

/* ---------- tracker calls (same rules as ai-visibility.js) ---------- */
async function get(params){
  const s = tracker();
  const q = Object.assign({key: s.key}, params);
  const qs = Object.keys(q).filter(k => q[k] != null && q[k] !== '').map(k => encodeURIComponent(k) + '=' + encodeURIComponent(q[k])).join('&');
  const res = await fetch(s.url + (s.url.indexOf('?') > -1 ? '&' : '?') + qs, {redirect: 'follow'});
  if (!res.ok) throw new Error('The tracker answered with HTTP ' + res.status + '.');
  const json = await res.json().catch(() => { throw new Error('The tracker did not return data.'); });
  if (json && json.error) throw new Error(json.error === 'unauthorized' ? 'The tracker did not accept this key.' : json.error);
  return json;
}
async function post(body){
  const s = tracker();
  const res = await fetch(s.url, {method: 'POST', body: JSON.stringify(Object.assign({key: s.key}, body)), redirect: 'follow'});
  if (!res.ok) throw new Error('The tracker answered with HTTP ' + res.status + '.');
  const json = await res.json().catch(() => { throw new Error('The tracker did not return data.'); });
  if (json && json.error) throw new Error(json.error === 'unauthorized' ? 'The tracker did not accept this key.' : json.error);
  return json;
}

/* ---------- small helpers ---------- */
function ago(iso){
  if (!iso) return '';
  const t = new Date(iso.length === 16 ? iso + ':00' : iso).getTime();
  if (isNaN(t)) return '';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 2) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  if (h < 36) return h + ' h ago';
  const d = Math.round(h / 24);
  if (d < 45) return d + ' days ago';
  return new Date(t).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});
}
function day(iso){
  if (!iso) return '';
  const t = new Date(iso.length === 16 ? iso + ':00' : iso);
  return isNaN(t) ? '' : t.toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});
}
const fmt = n => Number(n || 0).toLocaleString();
async function copyText(text){
  try{ await navigator.clipboard.writeText(text); return true; }catch(e){}
  try{
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  }catch(e){ return false; }
}
let snippetTpl = null;
async function snippetFor(domain){
  if (!snippetTpl){
    const r = await fetch('tracker/site-forms-snippet.html', {cache: 'no-cache'});
    if (!r.ok) throw new Error('Couldn’t load the snippet (HTTP ' + r.status + ').');
    snippetTpl = await r.text();
  }
  if (snippetTpl.indexOf("domain: 'example.com'") < 0) throw new Error('The snippet template changed; it has no example.com domain to replace.');
  return snippetTpl.replace("domain: 'example.com'", "domain: '" + domain + "'");
}

/* ---------- styles ---------- */
function injectStyles(){
  if ($('connStyles')) return;
  const st = document.createElement('style');
  st.id = 'connStyles';
  st.textContent = `
#seoConnCard .conn-intro{font-size:12.5px;color:var(--ink-2);margin:0 0 14px;line-height:1.55;}
#seoConnCard .conn-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
@media (max-width:900px){#seoConnCard .conn-grid{grid-template-columns:1fr;}}
#seoConnCard .conn-tile{border:1px solid var(--line);border-radius:12px;padding:14px 16px;background:#fff;min-width:0;}
#seoConnCard .conn-t{display:flex;align-items:center;gap:8px;font-weight:600;font-size:13px;color:var(--ink);margin-bottom:6px;}
#seoConnCard .conn-t .conn-opt{margin-left:auto;font-weight:500;font-size:10.5px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.08em;}
#seoConnCard .conn-dot{width:9px;height:9px;border-radius:50%;background:var(--line);flex:none;}
#seoConnCard .conn-dot.ok{background:var(--good);}
#seoConnCard .conn-dot.warn{background:#d98a1c;}
#seoConnCard .conn-line{font-size:12.5px;color:var(--ink-2);line-height:1.55;overflow-wrap:anywhere;}
#seoConnCard .conn-line b{color:var(--ink);font-weight:600;}
#seoConnCard .conn-help{font-size:11.5px;color:var(--ink-3);line-height:1.55;margin-top:6px;overflow-wrap:anywhere;}
#seoConnCard .conn-help code{font-family:var(--mono);font-size:11px;background:var(--line-2);padding:1px 5px;border-radius:5px;}
#seoConnCard .conn-act{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}
#seoConnCard .conn-msg{font-size:12px;margin-top:8px;line-height:1.5;overflow-wrap:anywhere;}
#seoConnCard .conn-msg.err{color:var(--alert);}
#seoConnCard .conn-msg.ok{color:var(--good);}
#seoConnCard .conn-pick{margin-top:10px;}
#seoConnCard .conn-pick input,#seoConnCard .conn-pick select,#seoConnCard .conn-el input{width:100%;box-sizing:border-box;font:inherit;font-size:12.5px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:#fff;color:var(--ink);}
#seoConnCard .conn-pick select{margin-top:6px;}
#seoConnCard .conn-el label{display:block;font-size:11px;font-weight:600;color:var(--ink-2);margin:8px 0 4px;}
#seoConnCard .conn-spin{display:inline-block;width:11px;height:11px;border:2px solid var(--line);border-top-color:var(--brand);border-radius:50%;animation:connspin .8s linear infinite;vertical-align:-1px;margin-right:6px;}
@keyframes connspin{to{transform:rotate(360deg)}}
#seoConnCard .seo-panel-h .btn{flex:none;}
#seoConnCard .conn-imp{margin-top:12px;padding-top:10px;border-top:1px dashed var(--line);}
#seoConnCard .conn-steps{margin:8px 0 0;padding-left:18px;font-size:12.5px;color:var(--ink-2);line-height:1.6;}
#seoConnCard .conn-steps li{margin:0 0 6px;}
#seoConnCard .conn-bm{display:inline-block;font-weight:600;font-size:12px;color:#fff;background:var(--brand);border-radius:8px;padding:3px 10px;text-decoration:none;cursor:grab;vertical-align:1px;}
#seoConnCard .conn-file{cursor:pointer;}
`;
  document.head.appendChild(st);
}

const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7V2M15 7V2"/><path d="M6 7h12v4a6 6 0 0 1-12 0V7z"/><path d="M12 17v5"/></svg>';

function card(){
  let el = $('seoConnCard');
  if (el) return el;
  const anchor = $('seoMatchCard');
  if (!anchor || !anchor.parentNode) return null;
  injectStyles();
  el = document.createElement('section');
  el.className = 'card seo-panel';
  el.id = 'seoConnCard';
  el.innerHTML = '<header class="seo-panel-h">' + ICON + '<h3>Connections</h3>' +
    '<button class="btn btn-sm" type="button" data-conn-refresh title="Check every connection again">Refresh</button>' +
    '<span class="seo-panel-state" id="seoConnState">…</span></header>' +
    '<div class="seo-panel-body" id="seoConnBody"></div>';
  anchor.parentNode.insertBefore(el, anchor);
  el.querySelector('[data-conn-refresh]').addEventListener('click', () => { const c = client(); if (c) load(c, true); });
  return el;
}

/* ---------- state ---------- */
const cache = {};          // domain -> {data, at}
let shownKey = null;       // client id | domain currently drawn
let ga4List = null;        // {properties, account}
const ui = {};             // per-domain UI state: {ga4Open, msg:{tile:{text,cls}}, busy:{tile:true}}
const U = d => (ui[d] = ui[d] || {msg: {}, busy: {}});

function setState(text, on){
  const t = $('seoConnState');
  if (!t) return;
  t.textContent = text;
  t.className = 'seo-panel-state' + (on ? ' on' : '');
}
function body(html){ const b = $('seoConnBody'); if (b) b.innerHTML = html; return b; }

/* ---------- loading ---------- */
async function load(c, force){
  const domain = normDomain(c.website);
  shownKey = c.id + '|' + domain;
  const s = tracker();
  if (!s.url || !s.key){
    setState('Not set up');
    body('<p class="conn-intro">Connect the AI Visibility Tracker first: open the <b>AI Visibility</b> tab and click <b>⚙</b>. After that, every client’s connections show here.</p>');
    return;
  }
  if (domain.indexOf('.') < 0){
    setState('No website');
    body('<p class="conn-intro">Add this client’s website (click <b>Edit</b> above) and their GA4, Search Console and form connections will show here.</p>');
    return;
  }
  const hit = cache[domain];
  if (hit && !force){ draw(c, domain, hit.data); if (Date.now() - hit.at < 5 * 60 * 1000) return; }
  else if (!hit) { setState('Checking'); body('<p class="conn-intro"><span class="conn-spin"></span>Checking what’s connected for ' + esc(domain) + '… (the tracker can take up to half a minute to wake up)</p>'); }
  try{
    const data = await get({action: 'connections', domain});
    cache[domain] = {data, at: Date.now()};
    if (shownKey === c.id + '|' + domain) draw(c, domain, data);
  }catch(err){
    if (shownKey !== c.id + '|' + domain) return;
    if (hit) { U(domain).msg.top = {text: 'Couldn’t refresh: ' + err.message, cls: 'err'}; draw(c, domain, hit.data); return; }
    setState('Error');
    body('<p class="conn-intro conn-msg err">Couldn’t reach the tracker: ' + esc(err.message) + '</p>' +
      '<div class="conn-act"><button class="btn btn-sm" type="button" data-conn-retry>Try again</button></div>');
    const b = $('seoConnBody').querySelector('[data-conn-retry]');
    if (b) b.addEventListener('click', () => load(c, true));
  }
}

/* ---------- drawing ---------- */
function msgHtml(domain, tile){
  const m = U(domain).msg[tile];
  return m ? '<div class="conn-msg ' + (m.cls || '') + '">' + esc(m.text) + '</div>' : '';
}
function tile(title, dot, inner, opt){
  return '<div class="conn-tile"><div class="conn-t"><i class="conn-dot ' + (dot || '') + '"></i>' + esc(title) +
    (opt ? '<span class="conn-opt">' + esc(opt) + '</span>' : '') + '</div>' + inner + '</div>';
}
/* What the live site check saw beats the CMS field someone typed. */
const cmsKind = v => { v = String(v || '').toLowerCase(); return /wordpress|wp\b|^wp/.test(v) ? 'wp' : /concrete/.test(v) ? 'concrete' : ''; };
function cmsOf(c, data){
  return cmsKind(data.snippet && data.snippet.cms) || cmsKind(c.cms);
}

function draw(c, domain, data){
  const el = card();
  if (!el) return;
  const u = U(domain);
  const acct = data.account ? '<code>' + esc(data.account) + '</code>' : 'the tracker’s Google account';

  if (!data.known){
    setState('Not in tracker');
    body('<p class="conn-intro">' + esc(domain) + ' isn’t in the tracker yet. Add it, and the tracker will also try to match its GA4 property right away.</p>' +
      '<div class="conn-act"><button class="btn btn-sm btn-go" type="button" data-conn-add>' + (u.busy.add ? '<span class="conn-spin"></span>Adding…' : 'Add to tracker') + '</button></div>' +
      msgHtml(domain, 'add'));
    const b = $('seoConnBody').querySelector('[data-conn-add]');
    if (b) b.addEventListener('click', () => addToTracker(c, domain));
    return;
  }

  /* GA4 */
  const g = data.ga4 || {};
  let ga4Inner, ga4Dot;
  if (g.property){
    ga4Dot = g.visible === false ? 'warn' : 'ok';
    ga4Inner = '<div class="conn-line">' + (g.visible === false
      ? 'Property <b>' + esc(g.property) + '</b> is saved, but the tracker can’t see it any more.'
      : 'Connected to <b>' + esc(g.name || ('property ' + g.property)) + '</b> · ' + esc(g.property)) + '</div>' +
      (g.visible === false ? '<div class="conn-help">In GA4 → Admin → Property access management, add ' + acct + ' as a Viewer.</div>' : '') +
      (g.hosts && g.hosts.length && g.hosts.indexOf(domain) < 0 ? '<div class="conn-help">Its web stream is for ' + esc(g.hosts.join(', ')) + ', not ' + esc(domain) + '.</div>' : '');
  } else {
    ga4Dot = '';
    const sug = g.suggest || [];
    ga4Inner = '<div class="conn-line">Not connected yet.' + (sug.length ? ' Likely match:' : '') + '</div>' +
      (sug.length ? '<div class="conn-act">' + sug.slice(0, 3).map(p =>
        '<button class="btn btn-sm btn-go" type="button" data-conn-ga4set="' + esc(p.id) + '">Use ' + esc(p.name) + ' · ' + esc(p.id) + '</button>').join('') + '</div>' : '');
  }
  const ga4Busy = u.busy.ga4;
  ga4Inner += '<div class="conn-act">' +
    (u.ga4Open ? '' : '<button class="btn btn-sm" type="button" data-conn-ga4open>' + (g.property ? 'Change' : 'Pick a property') + '</button>') +
    (g.property ? '<button class="btn btn-sm" type="button" data-conn-ga4clear>Disconnect</button>' : '') +
    '</div>';
  if (u.ga4Open){
    ga4Inner += '<div class="conn-pick" data-conn-pick>' +
      (ga4List ? '<input type="text" placeholder="Search by name, website or ID" data-conn-ga4q/>' +
        '<select size="6" data-conn-ga4sel></select>' +
        '<div class="conn-act"><button class="btn btn-sm btn-go" type="button" data-conn-ga4save>Save</button>' +
        '<button class="btn btn-sm" type="button" data-conn-ga4cancel>Cancel</button>' +
        '<button class="btn btn-sm" type="button" data-conn-ga4reload title="Ask Google for the list again">Reload list</button></div>' +
        '<div class="conn-help">Not listed? In GA4 → Admin → Property access management, add ' + acct + ' as a Viewer, then Reload list.</div>'
        : '<div class="conn-line"><span class="conn-spin"></span>Loading GA4 properties…</div>') +
      '</div>';
  }
  if (ga4Busy) ga4Inner += '<div class="conn-line" style="margin-top:8px"><span class="conn-spin"></span>Saving and pulling GA4 data…</div>';
  ga4Inner += msgHtml(domain, 'ga4');

  /* Search Console */
  const sc = data.gsc || {};
  const gscInner = sc.site
    ? '<div class="conn-line">Connected to <b>' + esc(sc.site) + '</b></div><div class="conn-help">Nothing to save here: the tracker reads whichever property for this domain is shared with it.</div>'
    : '<div class="conn-line">' + (sc.error ? 'Couldn’t check: ' + esc(sc.error) : 'No Search Console property for ' + esc(domain) + ' is shared with the tracker yet.') + '</div>' +
      '<div class="conn-help">In Search Console, open the property for ' + esc(domain) + ' → Settings → Users and permissions → Add user: ' + acct + ', permission <b>Restricted</b>. Then press Check again.</div>' +
      '<div class="conn-act"><button class="btn btn-sm" type="button" data-conn-recheck>' + (u.busy.gsc ? '<span class="conn-spin"></span>Checking…' : 'Check again') + '</button></div>';

  /* Website forms */
  const f = data.forms || {}, sn = data.snippet;
  const cms = cmsOf(c, data);
  let snLine, snDot;
  if (sn && sn.found){ snDot = 'ok'; snLine = 'Tracking snippet is on the site <span class="conn-help" style="display:inline">(checked ' + esc(ago(sn.at)) + ')</span>'; }
  else if (sn && sn.wrongDomain){ snDot = 'warn'; snLine = 'A tracking snippet is on the site, but it’s set up for a different domain. Copy it again and replace the old one.'; }
  else if (sn){ snDot = f.live ? 'ok' : 'warn'; snLine = (f.live ? 'Submissions are arriving, though the snippet wasn’t found on the pages checked' : 'The tracking snippet isn’t on the site yet') + ' <span class="conn-help" style="display:inline">(checked ' + esc(ago(sn.at)) + ')</span>'; }
  else { snDot = f.live ? 'ok' : ''; snLine = f.live ? 'Submissions are arriving from the site.' : 'Not checked yet.'; }
  const where = cms === 'wp'
    ? 'WordPress: <b>WPCode</b> (Code Snippets) → Header &amp; Footer → <b>Footer</b>, paste, Save Changes. Clear the site cache if it has one.'
    : cms === 'concrete'
      ? 'Concrete: Dashboard → System &amp; Settings → SEO &amp; Statistics → <b>Tracking Codes</b> → Footer, paste, Save.'
      : 'WordPress: WPCode → Header &amp; Footer → Footer. Concrete: Dashboard → System &amp; Settings → SEO &amp; Statistics → Tracking Codes → Footer.';
  const formsInner = '<div class="conn-line">' + snLine + '</div>' +
    '<div class="conn-line" style="margin-top:4px"><b>' + fmt(f.live) + '</b> live · <b>' + fmt(f.imported) + '</b> imported' +
      (f.lastAny ? ' · latest ' + esc(day(f.lastAny)) : '') + '</div>' +
    '<div class="conn-act"><button class="btn btn-sm btn-go" type="button" data-conn-copy>' + (u.copied ? 'Copied ✓' : 'Copy snippet') + '</button>' +
    '<button class="btn btn-sm" type="button" data-conn-check>' + (u.busy.check ? '<span class="conn-spin"></span>Checking…' : 'Check site') + '</button></div>' +
    '<div class="conn-help">Paste it once — ' + where + '</div>' +
    (sn && sn.cms && cmsKind(c.cms) && cmsKind(c.cms) !== cmsKind(sn.cms)
      ? '<div class="conn-help">The site looks like <b>' + esc(sn.cms) + '</b>, but this client’s CMS field says “' + esc(c.cms) + '”.</div>' : '') +
    importHtml(domain, cms) +
    msgHtml(domain, 'forms');

  /* Easyleads */
  const el2 = data.easyleads || {};
  let elInner;
  if (el2.connected){
    elInner = '<div class="conn-line">Connected · <b>' + fmt(el2.count) + '</b> submissions' + (el2.lastSync ? ' · synced ' + esc(ago(el2.lastSync)) : '') + '</div>' +
      '<div class="conn-help">Every past submission was pulled in when it was connected; new ones are pulled every hour.</div>';
  } else if (u.elOpen){
    elInner = '<div class="conn-el">' +
      '<label>Location ID</label><input type="text" data-conn-elloc autocomplete="off" placeholder="GoHighLevel → Settings → Business Profile"/>' +
      '<label>Private Integration Token</label><input type="password" data-conn-eltok autocomplete="off" placeholder="Settings → Private Integrations → Create new"/>' +
      '<div class="conn-help">Create the token in that client’s sub-account with the <b>View Forms</b> and <b>View Custom Fields</b> scopes. Every past submission is pulled in the first time; that can take a minute.</div>' +
      '<div class="conn-act"><button class="btn btn-sm btn-go" type="button" data-conn-elsave>' + (u.busy.el ? '<span class="conn-spin"></span>Connecting…' : 'Connect') + '</button>' +
      '<button class="btn btn-sm" type="button" data-conn-elcancel>Cancel</button></div></div>';
  } else {
    elInner = '<div class="conn-line">Not connected. Only needed if this client’s forms are Easyleads (GoHighLevel) forms.</div>' +
      '<div class="conn-act"><button class="btn btn-sm" type="button" data-conn-elopen>Connect Easyleads</button></div>';
  }
  elInner += msgHtml(domain, 'el');

  const okCount = (g.property && g.visible !== false ? 1 : 0) + (sc.site ? 1 : 0) + ((sn && sn.found) || f.live ? 1 : 0);
  setState(okCount === 3 ? 'All set' : okCount + ' of 3', okCount === 3);

  body((u.msg.top ? '<div class="conn-msg ' + u.msg.top.cls + '" style="margin:0 0 10px">' + esc(u.msg.top.text) + '</div>' : '') +
    '<div class="conn-grid">' +
      tile('Google Analytics (GA4)', ga4Dot, ga4Inner) +
      tile('Search Console', sc.site ? 'ok' : '', gscInner) +
      tile('Website forms', snDot, formsInner) +
      tile('Easyleads forms', el2.connected ? 'ok' : '', elInner, 'optional') +
    '</div>');
  u.msg.top = null;
  wire(c, domain, data);
}

function redraw(c, domain){ const h = cache[domain]; if (h && shownKey === c.id + '|' + domain) draw(c, domain, h.data); }

function wire(c, domain, data){
  const root = $('seoConnBody');
  if (!root) return;
  const u = U(domain);
  const on = (sel, fn) => { const b = root.querySelector(sel); if (b) b.addEventListener('click', fn); return b; };

  root.querySelectorAll('[data-conn-ga4set]').forEach(b => b.addEventListener('click', () => saveGa4(c, domain, b.getAttribute('data-conn-ga4set'))));
  on('[data-conn-ga4open]', async () => {
    u.ga4Open = true; u.msg.ga4 = null; redraw(c, domain);
    if (!ga4List) await loadGa4List(c, domain, false);
  });
  on('[data-conn-ga4cancel]', () => { u.ga4Open = false; redraw(c, domain); });
  on('[data-conn-ga4reload]', () => loadGa4List(c, domain, true));
  on('[data-conn-ga4clear]', () => { if (confirm('Disconnect GA4 for ' + domain + '? Its GA4 widgets will stop updating until a property is picked again.')) saveGa4(c, domain, ''); });
  const sel = root.querySelector('[data-conn-ga4sel]'), q = root.querySelector('[data-conn-ga4q]');
  if (sel && ga4List){
    const fill = () => {
      const term = (q && q.value || '').trim().toLowerCase();
      const props = (ga4List.properties || []).filter(p => !term || (p.name + ' ' + p.id + ' ' + p.account + ' ' + p.hosts.join(' ')).toLowerCase().indexOf(term) > -1);
      const cur = (data.ga4 || {}).property;
      sel.innerHTML = props.map(p => '<option value="' + esc(p.id) + '"' + (p.id === cur ? ' selected' : '') + '>' +
        esc(p.name + (p.hosts.length ? ' — ' + p.hosts.join(', ') : '') + ' · ' + p.id + (p.account ? ' (' + p.account + ')' : '')) + '</option>').join('') ||
        '<option disabled>No properties match</option>';
      if (!sel.value && props.length){ const best = props.find(p => p.hosts.indexOf(domain) > -1); if (best) sel.value = best.id; }
    };
    if (q && !q.value) q.value = '';
    fill();
    if (q) q.addEventListener('input', fill);
    on('[data-conn-ga4save]', () => { if (sel.value) saveGa4(c, domain, sel.value); });
    sel.addEventListener('dblclick', () => { if (sel.value) saveGa4(c, domain, sel.value); });
  }

  on('[data-conn-recheck]', async () => {
    u.busy.gsc = true; redraw(c, domain);
    await load(c, true);
    u.busy.gsc = false; redraw(c, domain);
  });

  on('[data-conn-copy]', async () => {
    u.msg.forms = null;
    try{
      const ok = await copyText(await snippetFor(domain));
      if (!ok) throw new Error('Your browser blocked the copy.');
      u.copied = true; redraw(c, domain);
      setTimeout(() => { u.copied = false; redraw(c, domain); }, 2500);
    }catch(err){ u.msg.forms = {text: err.message, cls: 'err'}; redraw(c, domain); }
  });
  on('[data-conn-check]', async () => {
    if (u.busy.check) return;
    u.busy.check = true; u.msg.forms = null; redraw(c, domain);
    try{
      const r = await post({action: 'checkSnippet', domain});
      const h = cache[domain];
      if (h){ h.data.snippet = r; }
      u.msg.forms = r.found ? {text: 'Found the snippet on ' + domain + '.', cls: 'ok'}
        : r.wrongDomain ? {text: 'There’s a snippet on the site, but for a different domain.', cls: 'err'}
        : {text: 'Didn’t find the snippet on ' + (r.checked && r.checked.length ? r.checked.join(', ') : domain) + '. If you just added it, clear the site’s cache and check again.', cls: 'err'};
    }catch(err){ u.msg.forms = {text: err.message, cls: 'err'}; }
    u.busy.check = false; redraw(c, domain);
  });

  wireImport(c, domain, root);

  on('[data-conn-elopen]', () => { u.elOpen = true; u.msg.el = null; redraw(c, domain); });
  on('[data-conn-elcancel]', () => { u.elOpen = false; u.msg.el = null; redraw(c, domain); });
  on('[data-conn-elsave]', async () => {
    if (u.busy.el) return;
    const loc = (root.querySelector('[data-conn-elloc]') || {}).value || '', tok = (root.querySelector('[data-conn-eltok]') || {}).value || '';
    if (!loc.trim() || !tok.trim()){ u.msg.el = {text: 'Both the Location ID and the token are needed.', cls: 'err'}; redraw(c, domain); return; }
    u.busy.el = true; u.msg.el = null;
    const b = root.querySelector('[data-conn-elsave]'); if (b){ b.disabled = true; b.innerHTML = '<span class="conn-spin"></span>Connecting…'; }
    try{
      const r = await post({action: 'setEasyleads', domain, loc: loc.trim(), tok: tok.trim()});
      u.elOpen = false; u.msg.el = {text: 'Connected. ' + (r.message || ''), cls: 'ok'};
      u.busy.el = false;
      await load(c, true);
      return;
    }catch(err){ u.msg.el = {text: err.message, cls: 'err'}; }
    u.busy.el = false; redraw(c, domain);
  });
}

async function loadGa4List(c, domain, force){
  const u = U(domain);
  if (force){ ga4List = null; redraw(c, domain); }
  try{ ga4List = await get(force ? {action: 'ga4Properties', force: '1'} : {action: 'ga4Properties'}); }
  catch(err){ u.ga4Open = false; u.msg.ga4 = {text: 'Couldn’t load GA4 properties: ' + err.message, cls: 'err'}; }
  redraw(c, domain);
}

async function saveGa4(c, domain, id){
  const u = U(domain);
  if (u.busy.ga4) return;
  u.busy.ga4 = true; u.msg.ga4 = null; u.ga4Open = false; redraw(c, domain);
  try{
    const r = await post({action: 'setGa4', domain, property: id});
    u.msg.ga4 = {text: id ? 'Saved. ' + (r.message || '') : 'GA4 disconnected.', cls: 'ok'};
    u.busy.ga4 = false;
    await load(c, true);
    return;
  }catch(err){ u.msg.ga4 = {text: err.message, cls: 'err'}; }
  u.busy.ga4 = false; redraw(c, domain);
}

async function addToTracker(c, domain){
  const u = U(domain);
  if (u.busy.add) return;
  u.busy.add = true; u.msg.add = null; redraw(c, domain);
  try{
    const one = {
      id: c.id, name: c.name || '', website: c.website, status: c.status || '',
      keywords: (c.keywords || []).slice(0, 60).map(k => ({text: k.text || '', location: ((k.locations || [])[0] || {}).label || '',
        locations: (k.locations || []).slice(0, 5).map(l => ({label: l.label || '', lat: l.lat == null ? null : l.lat, lng: l.lng == null ? null : l.lng}))}))
    };
    await post({action: 'register', clients: [one], url: tracker().url});
    u.busy.add = false;
    await load(c, true);
    return;
  }catch(err){ u.msg.add = {text: err.message, cls: 'err'}; }
  u.busy.add = false;
  const h = cache[domain]; if (h) draw(c, domain, h.data);
}

/* ---------- past submissions (WordPress / Concrete admin) ----------
   The "EDGE import" bookmark loads form-export.js inside the client's admin, in a
   window opened from this card. It reads every stored submission the signed-in
   admin can see and posts them back here (postMessage, checked against the
   client's domain). They go to the tracker with the team key, 500 at a time;
   submissions already on file are skipped. Easyleads needs none of this:
   connecting it pulls every past submission. */
const TOOL_ORIGIN = 'https://seo.edgemarketing.ca';
const BOOKMARK = "javascript:(function(){var s=document.createElement('script');s.src='" + TOOL_ORIGIN + "/form-export.js?v='+Date.now();document.body.appendChild(s);})();";
function adminLinks(domain, cms){
  const wp = {label: 'Open WordPress admin', url: 'https://' + domain + '/wp-admin/'};
  const cc = {label: 'Open Concrete dashboard', url: 'https://' + domain + '/index.php/dashboard'};
  return cms === 'wp' ? [wp] : cms === 'concrete' ? [cc] : [cc, wp];
}
function importHtml(domain, cms){
  const u = U(domain);
  let h = '<div class="conn-imp"><div class="conn-line"><b>Past submissions</b> · stored in the site’s ' +
    (cms === 'wp' ? 'WordPress admin' : cms === 'concrete' ? 'Concrete dashboard' : 'admin') + '</div>';
  if (u.busy.imp){
    h += '<div class="conn-line" style="margin-top:6px"><span class="conn-spin"></span>' + esc(u.impText || 'Importing…') + '</div>';
  } else if (!u.impOpen){
    h += '<div class="conn-act"><button class="btn btn-sm" type="button" data-conn-impopen>Import past submissions</button></div>';
  } else {
    h += '<ol class="conn-steps">' +
      '<li>Once per browser, drag this to your bookmarks bar: <a class="conn-bm" href="' + esc(BOOKMARK) + '" data-conn-bm title="Drag me to the bookmarks bar">EDGE import</a></li>' +
      '<li>' + adminLinks(domain, cms).map(a => '<button class="btn btn-sm btn-go" type="button" data-conn-impgo="' + esc(a.url) + '">' + esc(a.label) + '</button>').join(' ') +
      ' and sign in if it asks.</li>' +
      '<li>In that window, click the <b>EDGE import</b> bookmark, then <b>Send to EDGE SEO tool</b>. Keep this page open; the result shows here.</li>' +
      '</ol>' +
      '<div class="conn-help">Concrete: Express forms, the older Form block and Formidable. WordPress: Ninja Forms, Gravity Forms and Elementor Pro. Importing again is safe: submissions already on file are skipped.</div>' +
      '<div class="conn-act"><label class="btn btn-sm conn-file">Import a downloaded file<input type="file" accept=".json,application/json" data-conn-impfile hidden/></label>' +
      '<button class="btn btn-sm" type="button" data-conn-impcancel>Close</button></div>';
  }
  return h + msgHtml(domain, 'imp') + '</div>';
}

function wireImport(c, domain, root){
  const u = U(domain);
  const each = (sel, fn) => root.querySelectorAll(sel).forEach(b => b.addEventListener('click', e => fn(e, b)));
  each('[data-conn-impopen]', () => { u.impOpen = true; u.msg.imp = null; redraw(c, domain); });
  each('[data-conn-impcancel]', () => { u.impOpen = false; u.msg.imp = null; redraw(c, domain); });
  each('[data-conn-bm]', e => {
    e.preventDefault();
    u.msg.imp = {text: 'Drag the EDGE import button to your bookmarks bar rather than clicking it here. (No bookmarks bar? Ctrl+Shift+B on Windows, ⌘+Shift+B on Mac.)', cls: 'err'};
    redraw(c, domain);
  });
  each('[data-conn-impgo]', (e, b) => {
    u.msg.imp = null;
    /* Not noopener: the export in that window sends the submissions back through window.opener. */
    const w = window.open(b.getAttribute('data-conn-impgo'), 'edgeImport_' + domain.replace(/[^a-z0-9]/g, '_'));
    if (!w){ u.msg.imp = {text: 'Your browser blocked the new window. Allow pop-ups for this site and try again.', cls: 'err'}; redraw(c, domain); return; }
    try{ w.focus(); }catch(err){}
  });
  const file = root.querySelector('[data-conn-impfile]');
  if (file) file.addEventListener('change', async () => {
    const f = file.files && file.files[0];
    if (!f) return;
    let p = null;
    try{ p = JSON.parse(await f.text()); }catch(err){}
    if (!p || p.type !== 'edge-forms-import' || !Array.isArray(p.rows)){ u.msg.imp = {text: 'That file isn’t an EDGE form export.', cls: 'err'}; redraw(c, domain); return; }
    if (normDomain(p.domain) !== domain){ u.msg.imp = {text: 'That file is from ' + p.domain + ', not ' + domain + '.', cls: 'err'}; redraw(c, domain); return; }
    try{ await importRows(c, domain, p.rows); }catch(err){ /* shown on the card */ }
  });
}

async function importRows(c, domain, rows){
  const u = U(domain);
  if (u.busy.imp) throw new Error('An import for ' + domain + ' is already running.');
  u.busy.imp = true; u.msg.imp = null;
  let added = 0, skipped = 0;
  try{
    for (let i = 0; i < rows.length; i += 500){
      u.impText = 'Importing ' + fmt(Math.min(i + 500, rows.length)) + ' of ' + fmt(rows.length) + ' submissions…';
      redraw(c, domain);
      const r = await post({action: 'formsImport', domain, rows: rows.slice(i, i + 500)});
      added += Number(r.added || 0); skipped += Number(r.skipped || 0);
    }
    u.msg.imp = {text: 'Imported ' + fmt(added) + ' past submission' + (added === 1 ? '' : 's') +
      (skipped ? ' (' + fmt(skipped) + ' already on file or empty)' : '') + '.', cls: 'ok'};
    u.impOpen = false;
    return {added, skipped};
  }catch(err){
    u.msg.imp = {text: 'Import stopped' + (added ? ' after ' + fmt(added) + ' new' : '') + ': ' + err.message, cls: 'err'};
    throw err;
  }finally{
    u.busy.imp = false; u.impText = '';
    /* Refresh the counts without switching the card to this client if another one is open now. */
    try{ cache[domain] = {data: await get({action: 'connections', domain}), at: Date.now()}; }catch(err){}
    redraw(c, domain);
  }
}

/* The export window answers here. Only accepted from the client's own site, for that client. */
window.addEventListener('message', async e => {
  const d = e.data;
  if (!d || d.type !== 'edge-forms-import' || !Array.isArray(d.rows)) return;
  const reply = m => { try{ if (e.source) e.source.postMessage(Object.assign({type: 'edge-forms-import-result', domain: d.domain}, m), e.origin); }catch(err){} };
  const domain = normDomain(d.domain);
  if (!domain || normDomain(e.origin) !== domain) return reply({error: 'This window’s address doesn’t match ' + d.domain + '.'});
  const c = (state.seoClients || []).find(x => normDomain(x.website) === domain);
  if (!c) return reply({error: domain + ' isn’t one of the SEO tool’s clients. Check the client’s website address in the SEO tool.'});
  const t = tracker();
  if (!t.url || !t.key) return reply({error: 'The SEO tool isn’t connected to the tracker yet (AI Visibility tab → ⚙).'});
  try{ reply(await importRows(c, domain, d.rows)); }
  catch(err){ reply({error: err.message}); }
});

/* ---------- follow the selected client ---------- */
function tick(){
  const dash = $('seoDashboardView');
  if (!dash || dash.offsetParent === null) return;
  const c = client();
  if (!c) return;
  if (!card()) return;
  const key = c.id + '|' + normDomain(c.website);
  if (key !== shownKey) load(c, false);
}
setInterval(tick, 1500);
setTimeout(tick, 300);
})();
