/* ==========================================================================
   CONNECTIONS — one card on each client's Dashboard (SEO Clients) that shows
   and sets up everything the tracker reads for that client:

     GA4               pick the property (likely match suggested, one click), saved to the tracker
     Search Console    status, and who to share the property with if it's missing
     Website forms     the snippet for this domain (copy, where to paste it, check the live
                       site), live / imported counts, and imports past submissions from
                       the WordPress / Concrete admin
     Easyleads         connect a GoHighLevel sub-account (old + new submissions)

   Every action runs on the EDGE loading stage (edge-ui.js) when it's there.
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
/* The loading stage and modal from edge-ui.js; plain fallbacks if it isn't loaded. */
const stage = (title, steps, work, done) => window.edgeStage ? window.edgeStage(title, steps, work, done) : work(() => {});
const burstAt = el => { try{ const r = el.getBoundingClientRect(); if (window.edgeBurst) window.edgeBurst(r.left + r.width / 2, r.top); }catch(e){} };
function modal(html, opts){
  if (window.edgeModal) return window.edgeModal(html, opts);
  const b = document.createElement('div'); b.style.cssText = 'position:fixed;inset:0;z-index:10040;background:rgba(0,0,0,.35);display:grid;place-items:center';
  b.innerHTML = '<div style="background:#fff;border-radius:16px;padding:20px;max-width:640px;width:90%">' + html + '</div>';
  document.body.appendChild(b); const close = () => b.remove(); b.querySelectorAll('[data-close]').forEach(x => x.addEventListener('click', close)); return {el: b, close};
}

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
/* The tracker pulls Easyleads every hour, so the next pull is about an hour after the last one. */
function nextPull(last, every){
  const t = last ? new Date(last).getTime() : 0;
  if (!t) return 'within the hour';
  const m = Math.round((t + (every || 60) * 60000 - Date.now()) / 60000);
  return m <= 1 ? 'any minute' : 'in ' + m + ' min';
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
    const r = await fetch('forms-snippet.html', {cache: 'no-cache'});
    if (!r.ok) throw new Error('Couldn’t load the snippet (HTTP ' + r.status + ').');
    snippetTpl = await r.text();
  }
  if (snippetTpl.indexOf("domain: 'example.com'") < 0) throw new Error('The snippet template changed; it has no example.com domain to replace.');
  return snippetTpl.replace("domain: 'example.com'", "domain: '" + domain + "'");
}

/* ---------- icons ---------- */
const PATH = {
  plug: 'M9 7V2M15 7V2M6 7h12v4a6 6 0 0 1-12 0V7zM12 17v5', chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3', form: 'M5 3h14v18H5zM9 8h6M9 12h6M9 16h4',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z', check: 'M20 6 9 17l-5-5', copy: 'M9 9h11v11H9zM5 15V4h11', redo: 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5',
  code: 'm8 7-5 5 5 5M16 7l5 5-5 5', up: 'M12 19V5M5 12l7-7 7 7', x: 'M18 6 6 18M6 6l12 12', wand: 'M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5',
  ai: 'M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9zM19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9zM5 15l.7 1.6L7.3 17.3l-1.6.7L5 19.6l-.7-1.6L2.7 17.3l1.6-.7z', eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  file: 'M14 3H6v18h12V7zM14 3v4h4', ext: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6'
};
const ic = (k, s) => '<svg viewBox="0 0 24 24" width="' + (s || 15) + '" height="' + (s || 15) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (PATH[k] || PATH.check) + '"/></svg>';

/* ---------- styles ---------- */
function injectStyles(){
  if ($('connStyles')) return;
  const st = document.createElement('style');
  st.id = 'connStyles';
  st.textContent = `
#seoConnCard .conn-intro{font-size:13px;color:var(--ink-2);margin:0 0 14px;line-height:1.55;}
#seoConnCard .seo-panel-h{gap:10px}
#seoConnCard .conn-prog{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:var(--ink-2);margin-left:auto}
#seoConnCard .conn-prog .bar{width:84px;height:6px;border-radius:6px;background:#eef1f4;overflow:hidden}
#seoConnCard .conn-prog .bar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,var(--brand-hi,#fb9f42),var(--brand,#ea7a20));transition:width .6s cubic-bezier(.2,.8,.2,1)}
#seoConnCard .conn-prog.all .bar i{background:linear-gradient(90deg,#22a06b,#0f7a58)}
#seoConnCard .conn-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;}
@media (max-width:900px){#seoConnCard .conn-grid{grid-template-columns:1fr;}}
#seoConnCard .conn-tile{position:relative;border:1px solid var(--line);border-radius:18px;padding:16px 16px 14px;background:#fff;min-width:0;box-shadow:0 1px 2px rgba(20,26,33,.03);transition:box-shadow .25s,border-color .25s,transform .25s;animation:connRise .5s cubic-bezier(.2,.8,.2,1) both}
#seoConnCard .conn-tile:nth-child(2){animation-delay:.05s}#seoConnCard .conn-tile:nth-child(3){animation-delay:.1s}#seoConnCard .conn-tile:nth-child(4){animation-delay:.15s}
#seoConnCard .conn-tile:hover{box-shadow:0 14px 30px -18px rgba(20,26,33,.28);border-color:#d9e0e6}
#seoConnCard .conn-tile.ok{background:linear-gradient(180deg,#fbfefc,#fff 60%)}
@keyframes connRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
#seoConnCard .conn-t{display:flex;align-items:center;gap:10px;font-weight:600;font-size:13.5px;color:var(--ink);margin-bottom:10px;}
#seoConnCard .conn-ic{flex:none;width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:#f3f5f8;color:#57646f}
#seoConnCard .conn-ic svg{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#seoConnCard .conn-tile.ok .conn-ic{background:#e7f6ef;color:#0f7a58}
#seoConnCard .conn-tile.warn .conn-ic{background:#fff4e5;color:#b8570f}
#seoConnCard .conn-pill{margin-left:auto;font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;background:#f1f2f5;color:#57646f;white-space:nowrap}
#seoConnCard .conn-tile.ok .conn-pill{background:#e7f6ef;color:#0f7a58}
#seoConnCard .conn-tile.warn .conn-pill{background:#fff4e5;color:#a54c07}
#seoConnCard .conn-pill.opt{background:transparent;color:var(--ink-3);border:1px dashed var(--line)}
#seoConnCard .conn-line{font-size:12.8px;color:var(--ink-2);line-height:1.55;overflow-wrap:anywhere;}
#seoConnCard .conn-line b{color:var(--ink);font-weight:600;}
#seoConnCard .conn-help{font-size:11.8px;color:var(--ink-3);line-height:1.55;margin-top:6px;overflow-wrap:anywhere;}
#seoConnCard .conn-help code{font-family:var(--mono);font-size:11px;background:var(--line-2);padding:1px 5px;border-radius:5px;}
#seoConnCard .conn-act{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px;}
#seoConnCard .conn-act .btn{margin:0;display:inline-flex;align-items:center;gap:6px;border-radius:10px}
#seoConnCard .conn-act .btn svg,#seoConnCard .seo-panel-h .btn svg{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#seoConnCard .conn-msg{font-size:12px;margin-top:10px;line-height:1.5;overflow-wrap:anywhere;padding:8px 11px;border-radius:10px;animation:connRise .35s ease both}
#seoConnCard .conn-msg.err{color:#b4282d;background:#fdf1f1}
#seoConnCard .conn-msg.ok{color:#0f6b4d;background:#ecf8f2}
#seoConnCard .conn-stats{display:flex;gap:8px;margin-top:10px}
#seoConnCard .conn-stats div{flex:1;background:#f7f9fb;border-radius:12px;padding:8px 10px}
#seoConnCard .conn-stats b{display:block;font:600 17px var(--display);color:var(--ink);letter-spacing:-.02em}
#seoConnCard .conn-stats span{font-size:11px;color:var(--ink-3)}
#seoConnCard .conn-sug{display:flex;align-items:center;gap:10px;width:100%;text-align:left;margin-top:8px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:#fff;cursor:pointer;font:inherit;transition:border-color .15s,box-shadow .15s,transform .15s}
#seoConnCard .conn-sug:hover{border-color:var(--brand);box-shadow:0 8px 18px -12px rgba(234,122,32,.6);transform:translateY(-1px)}
#seoConnCard .conn-sug b{display:block;font-size:12.8px;color:var(--ink)}#seoConnCard .conn-sug small{font-size:11.5px;color:var(--ink-3)}
#seoConnCard .conn-sug em{margin-left:auto;font-style:normal;font-size:11.5px;font-weight:700;color:var(--brand-deep,#a54c07)}
#seoConnCard .conn-el label{display:block;font-size:11px;font-weight:600;color:var(--ink-2);margin:8px 0 4px;}
#seoConnCard .conn-el input{width:100%;box-sizing:border-box;font:inherit;font-size:12.5px;padding:9px 11px;border:1px solid var(--line);border-radius:10px;background:#fbfcfd;color:var(--ink);}
#seoConnCard .conn-el input:focus{outline:0;border-color:var(--brand);box-shadow:0 0 0 3px rgba(234,122,32,.14);background:#fff}
#seoConnCard .conn-imp{margin-top:12px;padding-top:12px;border-top:1px dashed var(--line);}
#seoConnCard .conn-steps{margin:8px 0 0;padding-left:18px;font-size:12.5px;color:var(--ink-2);line-height:1.6;}
#seoConnCard .conn-steps li{margin:0 0 6px;}
#seoConnCard .conn-bm{display:inline-block;font-weight:600;font-size:12px;color:#fff;background:var(--brand);border-radius:8px;padding:3px 10px;text-decoration:none;cursor:grab;vertical-align:1px;}
#seoConnCard .conn-file{cursor:pointer;}
#seoConnCard .conn-tile.conn-wide{grid-column:1/-1}
#seoConnCard .conn-ai-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}
@media (max-width:1100px){#seoConnCard .conn-ai-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
#seoConnCard .conn-ai-src{position:relative;border-radius:14px;padding:12px 12px 11px;background:#f7f9fb;border:1px solid transparent;min-width:0;transition:transform .2s cubic-bezier(.2,.8,.2,1),box-shadow .2s}
#seoConnCard .conn-ai-src:hover{transform:translateY(-1px);box-shadow:0 10px 22px -16px rgba(20,26,33,.35)}
#seoConnCard .conn-ai-src.live{background:linear-gradient(180deg,#effaf5,#f8fcfa);border-color:#cdeedd}
#seoConnCard .conn-ai-src.stale{background:linear-gradient(180deg,#fff6ea,#fffbf5);border-color:#f6dcb6}
#seoConnCard .conn-ai-src.off.opt{background:#fff;border:1px dashed var(--line)}
#seoConnCard .conn-ai-h{display:flex;align-items:center;gap:8px;font-size:12.6px;color:var(--ink);line-height:1.3}
#seoConnCard .conn-ai-h b{font-weight:600}
#seoConnCard .conn-ai-h i{flex:none;width:9px;height:9px;border-radius:50%;background:#c3cbd3}
#seoConnCard .conn-ai-src.live .conn-ai-h i{background:#22a06b;box-shadow:0 0 0 0 rgba(34,160,107,.5);animation:connPulse 2s ease-in-out infinite}
#seoConnCard .conn-ai-src.stale .conn-ai-h i{background:#e08a1e}
@keyframes connPulse{50%{box-shadow:0 0 0 5px rgba(34,160,107,0)}}
#seoConnCard .conn-ai-st{margin-top:7px;font:700 12px var(--ui,Inter,sans-serif);color:#57646f;display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}
#seoConnCard .conn-ai-src.live .conn-ai-st{color:#0f7a58}#seoConnCard .conn-ai-src.stale .conn-ai-st{color:#a54c07}
#seoConnCard .conn-ai-st span{font-weight:500;font-size:11px;color:var(--ink-3)}
#seoConnCard .conn-ai-n{margin-top:5px;font-size:11.8px;color:var(--ink-2);line-height:1.45}
#seoConnCard .conn-ai-d{margin-top:4px;font-size:11px;color:var(--ink-3)}
#seoConnCard .conn-ai-src.stale .conn-ai-d{color:#a54c07;font-weight:600}
#seoConnCard .conn-ai-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
#seoConnCard .conn-ai-btn{display:inline-flex;align-items:center;gap:5px;font:600 11.5px var(--ui,Inter,sans-serif);padding:5px 9px;border-radius:8px;border:1px solid var(--line);background:#fff;color:var(--ink);cursor:pointer;text-decoration:none;transition:border-color .15s,background .15s}
#seoConnCard .conn-ai-btn:hover{border-color:#e87722;color:#b85a12}
#seoConnCard .conn-ai-btn.go{background:#171614;border-color:#171614;color:#fff}
#seoConnCard .conn-ai-btn.go:hover{background:#2a2825;color:#fff}
#seoConnCard .conn-ai-btn.arm{background:#fff3e6;border-color:#e87722;color:#b85a12}
#seoConnCard .conn-ai-btn[disabled]{opacity:.55;cursor:default}
#seoConnCard .conn-ai-btn .sp{width:10px;height:10px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:connSpin .7s linear infinite}
@keyframes connSpin{to{transform:rotate(360deg)}}
#seoConnCard .conn-ai-res{margin-top:8px;font-size:11.4px;line-height:1.45;color:#0f7a58;background:#fff;border-radius:8px;padding:6px 8px;border:1px solid #d7efe3}
#seoConnCard .conn-ai-res.err{color:#b4322a;border-color:#f3d0cc}
#seoConnCard .conn-ai-res.busy{color:var(--ink-2);border-color:var(--line)}
#seoConnCard .conn-sk{position:relative;overflow:hidden;background:#f1f3f6;border-radius:10px}
#seoConnCard .conn-sk:after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.8),transparent);animation:connShine 1.3s ease-in-out infinite}
@keyframes connShine{to{transform:translateX(100%)}}
.conn-snip pre{margin:0;max-height:220px;overflow:auto;background:#141a21;color:#e8edf2;border-radius:14px;padding:14px 16px;font:12px/1.55 var(--mono,ui-monospace,Menlo,monospace);white-space:pre-wrap;word-break:break-all}
.conn-snip .tabs{display:inline-flex;background:#f1f2f5;border-radius:11px;padding:3px;margin:16px 0 10px}
.conn-snip .tabs button{border:0;background:none;padding:6px 13px;border-radius:8px;font:inherit;font-size:12.5px;font-weight:600;color:#677083;cursor:pointer}
.conn-snip .tabs button.on{background:#fff;color:#141a21;box-shadow:0 1px 2px rgba(20,26,33,.1)}
.conn-snip ol{margin:0;padding-left:20px;font-size:13px;line-height:1.7;color:var(--ink-2)}
.conn-snip ol b{color:var(--ink)}
.conn-snip .res{margin-top:14px;padding:11px 14px;border-radius:12px;font-size:13px;line-height:1.5}
.conn-snip .res.ok{background:#ecf8f2;color:#0f6b4d}.conn-snip .res.err{background:#fdf1f1;color:#b4282d}
.conn-ga4 .q{position:relative;margin:4px 0 10px}
.conn-ga4 .q input{width:100%;box-sizing:border-box;height:42px;border:1px solid var(--line);border-radius:12px;padding:0 12px 0 36px;font:inherit;font-size:13.5px;background:#fbfcfd}
.conn-ga4 .q input:focus{outline:0;border-color:var(--brand);box-shadow:0 0 0 4px rgba(234,122,32,.14);background:#fff}
.conn-ga4 .q svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#9aa2b1;fill:none;stroke:currentColor;stroke-width:2}
.conn-ga4 .list{max-height:min(380px,55vh);overflow:auto;display:grid;gap:6px;padding:2px}
.conn-ga4 .p{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:#fff;cursor:pointer;font:inherit;transition:border-color .15s,box-shadow .15s}
.conn-ga4 .p:hover{border-color:#cfd7de;box-shadow:0 6px 14px -10px rgba(20,26,33,.3)}
.conn-ga4 .p.on{border-color:var(--brand);box-shadow:0 0 0 3px rgba(234,122,32,.16)}
.conn-ga4 .p b{display:block;font-size:13px;color:var(--ink)}.conn-ga4 .p small{display:block;font-size:11.5px;color:var(--ink-3);overflow-wrap:anywhere}
.conn-ga4 .p em{margin-left:auto;font-style:normal;font-size:11px;font-weight:700;color:#0f7a58;background:#e7f6ef;border-radius:99px;padding:2px 8px;white-space:nowrap}
.conn-ga4 .h{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin:8px 2px 2px}
`;
  document.head.appendChild(st);
}

function card(){
  let el = $('seoConnCard');
  if (el) return el;
  const anchor = $('seoMatchCard');
  if (!anchor || !anchor.parentNode) return null;
  injectStyles();
  el = document.createElement('section');
  el.className = 'card seo-panel';
  el.id = 'seoConnCard';
  el.innerHTML = '<header class="seo-panel-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + PATH.plug + '"/></svg><h3>Connections</h3>' +
    '<span class="conn-prog" id="seoConnProg" hidden><span class="bar"><i style="width:0"></i></span><span data-t></span></span>' +
    '<button class="btn btn-sm" type="button" data-conn-refresh title="Check every connection again">' + ic('redo', 13) + 'Refresh</button>' +
    '<span class="seo-panel-state" id="seoConnState">…</span></header>' +
    '<div class="seo-panel-body" id="seoConnBody"></div>';
  anchor.parentNode.insertBefore(el, anchor);
  el.querySelector('[data-conn-refresh]').addEventListener('click', () => {
    const c = client(); if (!c) return;
    const d = normDomain(c.website);
    stage('Checking ' + (c.name || d) + '’s connections', ['Waking the tracker', 'Reading GA4 and Search Console', 'Counting form submissions'], async go => { go(0); await load(c, true, go); }, 'Up to date').catch(() => {});
  });
  return el;
}

/* ---------- state ---------- */
const cache = {};          // domain -> {data, at}
let shownKey = null;       // client id | domain currently drawn
let ga4List = null;        // {properties, account}
const ui = {};             // per-domain UI state: {msg:{tile:{text,cls}}, busy:{tile:true}}
const U = d => (ui[d] = ui[d] || {msg: {}, busy: {}});

function setState(text, on){
  const t = $('seoConnState');
  if (!t) return;
  t.textContent = text;
  t.className = 'seo-panel-state' + (on ? ' on' : '');
}
function setProg(n, of){
  const p = $('seoConnProg'); if (!p) return;
  if (n == null){ p.hidden = true; return; }
  p.hidden = false; p.classList.toggle('all', n === of);
  p.querySelector('i').style.width = Math.round(n / of * 100) + '%';
  p.querySelector('[data-t]').textContent = n === of ? 'All connected' : n + ' of ' + of + ' connected';
}
function body(html){ const b = $('seoConnBody'); if (b) b.innerHTML = html; return b; }
const skeleton = () => '<div class="conn-grid">' + [0, 1, 2, 3].map(() => '<div class="conn-tile"><div style="display:flex;gap:10px;align-items:center"><div class="conn-sk" style="width:34px;height:34px;border-radius:11px"></div><div class="conn-sk" style="height:14px;width:45%"></div><div class="conn-sk" style="height:18px;width:60px;margin-left:auto;border-radius:99px"></div></div>' +
  '<div class="conn-sk" style="height:11px;width:90%;margin-top:14px"></div><div class="conn-sk" style="height:11px;width:70%;margin-top:8px"></div><div class="conn-sk" style="height:32px;width:120px;margin-top:14px"></div></div>').join('') + '</div>';

/* ---------- loading ---------- */
async function load(c, force, go){
  const domain = normDomain(c.website);
  shownKey = c.id + '|' + domain;
  const s = tracker();
  if (!s.url || !s.key){
    setState('Not set up'); setProg(null);
    body('<p class="conn-intro">Connect the AI Visibility Tracker first: open the <b>AI Visibility</b> tab and click <b>⚙</b>. After that, every client’s connections show here.</p>');
    return;
  }
  if (domain.indexOf('.') < 0){
    setState('No website'); setProg(null);
    body('<p class="conn-intro">Add this client’s website (click <b>Edit</b> above) and their GA4, Search Console and form connections will show here.</p>');
    return;
  }
  const hit = cache[domain];
  if (hit && !force){ draw(c, domain, hit.data); if (Date.now() - hit.at < 5 * 60 * 1000) return; }
  else if (!hit) { setState('Checking'); setProg(null); body('<p class="conn-intro">Checking what’s connected for <b>' + esc(domain) + '</b>…</p>' + skeleton()); }
  try{
    if (go) go(1);
    const data = await get({action: 'connections', domain});
    if (go) go(2);
    cache[domain] = {data, at: Date.now()};
    if (shownKey === c.id + '|' + domain) draw(c, domain, data);
  }catch(err){
    if (go) throw err;
    if (shownKey !== c.id + '|' + domain) return;
    if (hit) { U(domain).msg.top = {text: 'Couldn’t refresh: ' + err.message, cls: 'err'}; draw(c, domain, hit.data); return; }
    setState('Error'); setProg(null);
    body('<p class="conn-intro conn-msg err">Couldn’t reach the tracker: ' + esc(err.message) + '</p>' +
      '<div class="conn-act"><button class="btn btn-sm" type="button" data-conn-retry>' + ic('redo', 13) + 'Try again</button></div>');
    const b = $('seoConnBody').querySelector('[data-conn-retry]');
    if (b) b.addEventListener('click', () => load(c, true));
  }
}

/* ---------- drawing ---------- */
function msgHtml(domain, tile){
  const m = U(domain).msg[tile];
  return m ? '<div class="conn-msg ' + (m.cls || '') + '">' + esc(m.text) + '</div>' : '';
}
function tile(title, icon, cls, pill, inner, opt){
  return '<div class="conn-tile ' + (cls || '') + '"><div class="conn-t"><span class="conn-ic">' + ic(icon, 17) + '</span>' + esc(title) +
    '<span class="conn-pill' + (opt ? ' opt' : '') + '">' + esc(pill) + '</span></div>' + inner + '</div>';
}
/* What the live site check saw beats the CMS field someone typed. */
const cmsKind = v => { v = String(v || '').toLowerCase(); return /wordpress|wp\b|^wp/.test(v) ? 'wp' : /concrete/.test(v) ? 'concrete' : ''; };
function cmsOf(c, data){
  return cmsKind(data.snippet && data.snippet.cms) || cmsKind(c.cms);
}

/* ---------- AI visibility: is AI data being collected for this client? ----------
   Read from the same feed the AI Visibility tab uses (window.AIVis), so it costs
   nothing extra when that tab was opened already. The tracker's own schedule:
     AI assistant visits   GA4, pulled automatically once a month (the 27th, 7am)
     AI Overview checks    the real results page for each tracked keyword, same run
     Google AI search      Search Console AI Overviews / AI Mode, monthly export or browser sync
     Copilot citations     Bing Webmaster Tools, monthly export or browser sync (optional)
   A source is "collecting" when it is connected and its newest data is as recent
   as that schedule allows; older than that means a run or an import was missed. */
const aiFeed = {};
const RUN_DAY = 27, RUN_GRACE = 3, EXPORT_DAYS = 45;
const daysOld = d => d ? Math.floor((Date.now() - new Date(String(d).slice(0, 10) + 'T12:00:00').getTime()) / 864e5) : null;
const dayD = d => { const t = new Date(String(d).slice(0, 10) + 'T12:00:00'); return isNaN(t) ? '' : t.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}); };
const isoD = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const maxDay = list => list.reduce((m, d) => (d && d > m ? d : m), '');
/* The tracker's latest monthly run that should have finished by now (a couple of days' grace), and the next one. */
function runDates(){
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  let last = new Date(y, m, RUN_DAY);
  if (now.getTime() < last.getTime() + RUN_GRACE * 864e5) last = new Date(y, m - 1, RUN_DAY);
  let next = new Date(y, m, RUN_DAY); if (next.getTime() <= now.getTime()) next = new Date(y, m + 1, RUN_DAY);
  return {last, next};
}
function aiLoad(c, domain, force){
  const a = aiFeed[domain] = aiFeed[domain] || {};
  if (a.busy || !window.AIVis || typeof window.AIVis.getFeed !== 'function') return;
  if (a.feed && !force && Date.now() - a.at < 10 * 60 * 1000) return;
  a.busy = true;
  window.AIVis.getFeed(domain, !!force)
    .then(f => { a.feed = f; a.at = Date.now(); a.err = null; }, e => { a.err = e.message; })
    .finally(() => { a.busy = false; redraw(c, domain); });
}
function aiState(domain){
  const a = aiFeed[domain] || {}, f = a.feed;
  if (!f) return {loading: !a.err && !!window.AIVis, err: a.err || (window.AIVis ? '' : 'The AI Visibility module didn’t load.')};
  const up = f.updated || {}, tr = f.tracking || {}, R = runDates();
  /* Monthly run: its data runs to the day before the run, so anything from (last run - 4 days) on means it ran. */
  const ranSince = last => !!last && last >= isoD(R.last.getTime() - 4 * 864e5);
  const exportOk = last => !!last && daysOld(last) <= EXPORT_DAYS;
  const ga4Rows = (f.ga4 && f.ga4.daily) || [], chRows = (f.channels && f.channels.daily) || [];
  const ga4Last = maxDay([up.ga4, chRows.length ? chRows[chRows.length - 1].d : '', ga4Rows.length ? ga4Rows[ga4Rows.length - 1].d : '']);
  const v30 = ga4Rows.filter(r => daysOld(r.d) <= 30).reduce((n, r) => n + (Number(r.s) || 0), 0);
  const gRows = (f.google && f.google.daily) || [], g30 = gRows.filter(r => daysOld(r.d) <= 30).reduce((n, r) => n + (Number(r.n) || 0), 0);
  const checks = (f.aio && f.aio.checks) || [], aioLast = maxDay(checks.map(x => x.d));
  const lastRun = checks.filter(x => x.d === aioLast), cited = lastRun.filter(x => x.cited).length, shown = lastRun.filter(x => x.shown).length;
  const bRows = (f.bing && f.bing.daily) || [], b30 = bRows.filter(r => daysOld(r.d) <= 30).reduce((n, r) => n + (Number(r.n || r.c) || 0), 0);
  const st = (on, fresh) => !on ? 'off' : fresh ? 'live' : 'stale';
  const nextRun = 'next pull ' + R.next.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
  const src = [
    {key: 'ga4', name: 'AI assistant visits', via: 'GA4 · monthly', state: st(!!tr.ga4, ranSince(ga4Last)), last: ga4Last, sched: nextRun,
      note: tr.ga4 ? fmt(v30) + ' AI visit' + (v30 === 1 ? '' : 's') + ' in the last 30 days' : 'Needs GA4 connected (tile above)',
      fix: 'The tracker’s monthly run on the ' + RUN_DAY + 'th didn’t bring in GA4 data. Use “Check again”, or run it from the tracker sheet.'},
    {key: 'google', name: 'Google AI Overviews & AI Mode', via: 'Search Console · monthly export', state: st(!!up.google, exportOk(up.google)), last: up.google, sched: 'next export due ' + (up.google ? new Date(new Date(up.google + 'T12:00:00').getTime() + 34 * 864e5).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'now'),
      note: up.google ? fmt(g30) + ' AI impressions in the last 30 days' : 'Not imported yet · needs a Search Console export or browser sync',
      fix: 'This comes from a monthly Search Console export or browser sync, and the last one is over ' + EXPORT_DAYS + ' days old.'},
    {key: 'aio', name: 'AI Overview checks', via: 'Tracked keywords · monthly', state: st(checks.length > 0, ranSince(aioLast)), last: aioLast, sched: nextRun,
      note: checks.length ? lastRun.length + ' searches checked · ' + shown + ' showed an Overview · ' + cited + ' cite the site' : 'Runs with the monthly update for keywords that have a location',
      fix: 'The last monthly run didn’t check this client’s keywords.'},
    {key: 'bing', name: 'Copilot citations', via: 'Bing Webmaster Tools · monthly export', state: st(!!up.bing, exportOk(up.bing)), last: up.bing, opt: true, sched: '',
      note: up.bing ? fmt(b30) + ' citations in the last 30 days' : 'Optional · needs the site in Bing Webmaster Tools and a monthly export',
      fix: 'The last Bing Webmaster Tools export is over ' + EXPORT_DAYS + ' days old.'}
  ];
  const core = src.filter(x => !x.opt), live = core.filter(x => x.state === 'live').length, on = core.filter(x => x.state !== 'off').length;
  return {src, live, on, total: core.length, ok: live === core.length, any: on > 0, at: a.at, generated: f.generatedAt, ga4: !!tr.ga4};
}
/* Buttons on each AI source card: connect it or pull its data now, for this client only.
   They run the tracker's per-client jobs (the same as AI Visibility → Run for this client). */
const AI_JOB_NAMES = {ga4: 'GA4 pull', ga4find: 'GA4 property lookup', imports: 'Import', aio: 'AI Overview checks'};
function aiActions(x, A, domain, c){
  const u = U(domain), r = u.airun || {};
  const busy = !!r.busy;
  const btn = (job, label, opts) => {
    opts = opts || {};
    const running = busy && r.job === job && r.key === x.key;
    const armed = !busy && r.arm === x.key + ':' + job;
    return '<button class="conn-ai-btn' + (opts.go ? ' go' : '') + (armed ? ' arm' : '') + '" type="button" data-conn-airun="' + job + '" data-key="' + x.key + '"' + (opts.cost ? ' data-cost' : '') +
      (opts.title ? ' title="' + esc(opts.title) + '"' : '') + (busy ? ' disabled' : '') + '>' +
      (running ? '<span class="sp"></span>Running…' : armed ? 'Uses DataforSEO credits · click again' : esc(label)) + '</button>';
  };
  const link = (href, label) => '<a class="conn-ai-btn" href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(label) + ' ↗</a>';
  const imp = 'Imports the Search Console and Bing exports in the tracker’s Drive import folder that have ' + domain + ' in the file name';
  let h = '';
  if (x.key === 'ga4') h = A.ga4 ? btn('ga4', 'Pull GA4 now', {go: x.state !== 'live'}) : btn('ga4find', 'Find GA4 property', {go: true, title: 'Match this website to its GA4 property'});
  else if (x.key === 'google') h = btn('imports', 'Import export', {go: x.state !== 'live', title: imp}) + link('https://search.google.com/search-console?resource_id=' + encodeURIComponent('sc-domain:' + domain), 'Search Console');
  else if (x.key === 'aio'){
    const withLoc = (c && c.keywords || []).filter(k => (k.locations || []).length).length;
    h = withLoc ? btn('aio', 'Run checks now', {go: x.state !== 'live', cost: true, title: withLoc + ' tracked keyword' + (withLoc === 1 ? '' : 's') + ' with a location'})
      : '<button class="conn-ai-btn go" type="button" data-conn-aikw>Add keyword locations</button>';
  }
  else if (x.key === 'bing') h = btn('imports', 'Import export', {title: imp}) + link('https://www.bing.com/webmasters/', 'Bing Webmaster Tools');
  const res = r.key === x.key && (r.busy || r.text) ? '<div class="conn-ai-res' + (r.busy ? ' busy' : r.cls === 'err' ? ' err' : '') + '">' + esc(r.busy ? 'Running ' + (AI_JOB_NAMES[r.job] || r.job).toLowerCase() + ' for ' + domain + (r.job === 'aio' ? '. This can take a couple of minutes.' : '…') : r.text) + '</div>' : '';
  return '<div class="conn-ai-acts">' + h + '</div>' + res;
}

function aiTile(domain, c){
  const A = aiState(domain);
  if (A.loading) return {cls: '', pill: 'Checking', ok: false, inner: '<div class="conn-line">Checking what AI data the tracker has for <b>' + esc(domain) + '</b>…</div><div class="conn-ai-grid">' + [0, 1, 2, 3].map(() => '<div class="conn-ai-src"><div class="conn-sk" style="height:12px;width:70%"></div><div class="conn-sk" style="height:10px;width:50%;margin-top:8px"></div></div>').join('') + '</div>'};
  if (!A.src) return {cls: 'warn', pill: 'Couldn’t check', ok: false, inner: '<div class="conn-line">Couldn’t read the AI data: ' + esc(A.err || 'unknown error') + '</div><div class="conn-act"><button class="btn btn-sm" type="button" data-conn-aicheck>' + ic('redo', 13) + 'Check again</button></div>'};
  const stale = A.src.filter(x => !x.opt && x.state === 'stale');
  const label = {live: 'Collecting', stale: 'No new data', off: 'Not connected'};
  const lastTxt = x => x.last ? (x.state === 'live' ? 'Data to ' + dayD(x.last) + (x.sched ? ' · ' + x.sched : '') : 'Last data ' + dayD(x.last) + ' · ' + daysOld(x.last) + ' days ago') : '';
  const line = A.ok ? 'AI data is being collected for <b>' + esc(domain) + '</b> and every source is up to date for its schedule' + (A.src.some(x => x.opt && x.state === 'off') ? ' (Copilot is optional and not connected).' : '.')
    : !A.any ? 'No AI data is being collected for <b>' + esc(domain) + '</b> yet.'
    : stale.length ? '<b>' + stale.length + (stale.length === 1 ? ' source is' : ' sources are') + ' behind schedule.</b> ' + esc(stale.map(x => x.fix).join(' '))
    : 'Some AI sources aren’t connected yet.';
  const inner = '<div class="conn-line">' + line + '</div>' +
    '<div class="conn-ai-grid">' + A.src.map(x => '<div class="conn-ai-src ' + x.state + (x.opt ? ' opt' : '') + '"><div class="conn-ai-h"><i></i><b>' + esc(x.name) + '</b></div>' +
      '<div class="conn-ai-st">' + esc(label[x.state]) + '<span>' + esc(x.via) + '</span></div>' +
      '<div class="conn-ai-n">' + esc(x.note) + '</div>' + (x.last ? '<div class="conn-ai-d">' + esc(lastTxt(x)) + '</div>' : '') + aiActions(x, A, domain, c) + '</div>').join('') + '</div>' +
    '<div class="conn-act"><button class="btn btn-sm" type="button" data-conn-aicheck>' + ic('redo', 13) + 'Check again</button>' +
      '<button class="btn btn-sm" type="button" data-conn-aiopen>' + ic('eye', 13) + 'Open AI Visibility</button>' +
      (A.at ? '<span class="conn-help" style="margin:0 0 0 auto;align-self:center">Checked ' + esc(ago(new Date(A.at).toISOString())) + '</span>' : '') + '</div>' + msgHtml(domain, 'ai');
  return {cls: A.ok ? 'ok' : A.any ? 'warn' : '', pill: A.ok ? 'Collecting' : A.any ? (stale.length ? 'Not updating' : A.live + ' of ' + A.total + ' collecting') : 'Not collecting', ok: A.ok, inner};
}

function draw(c, domain, data){
  const el = card();
  if (!el) return;
  const u = U(domain);
  const acct = data.account ? '<code>' + esc(data.account) + '</code>' : 'the tracker’s Google account';

  if (!data.known){
    setState('Not in tracker'); setProg(null);
    body('<p class="conn-intro"><b>' + esc(domain) + '</b> isn’t in the tracker yet. Add it, and the tracker will also try to match its GA4 property right away.</p>' +
      '<div class="conn-act"><button class="btn btn-sm btn-go" type="button" data-conn-add>' + ic('bolt', 13) + 'Add to tracker</button></div>' +
      msgHtml(domain, 'add'));
    const b = $('seoConnBody').querySelector('[data-conn-add]');
    if (b) b.addEventListener('click', () => addToTracker(c, domain));
    return;
  }

  /* GA4 */
  const g = data.ga4 || {};
  let ga4Inner, ga4Cls, ga4Pill;
  if (g.property){
    ga4Cls = g.visible === false ? 'warn' : 'ok'; ga4Pill = g.visible === false ? 'No access' : 'Connected';
    ga4Inner = '<div class="conn-line">' + (g.visible === false
      ? 'Property <b>' + esc(g.property) + '</b> is saved, but the tracker can’t see it any more.'
      : 'Reading <b>' + esc(g.name || ('property ' + g.property)) + '</b> · ' + esc(g.property)) + '</div>' +
      (g.visible === false ? '<div class="conn-help">In GA4 → Admin → Property access management, add ' + acct + ' as a Viewer.</div>' : '') +
      (g.hosts && g.hosts.length && g.hosts.indexOf(domain) < 0 ? '<div class="conn-help">Its web stream is for ' + esc(g.hosts.join(', ')) + ', not ' + esc(domain) + '.</div>' : '');
  } else {
    const sug = g.suggest || [];
    ga4Cls = sug.length ? 'warn' : ''; ga4Pill = sug.length ? (sug.length === 1 ? '1 match' : sug.length + ' matches') : 'Not connected';
    ga4Inner = '<div class="conn-line">' + (sug.length ? 'Found ' + (sug.length === 1 ? 'a property' : 'properties') + ' for ' + esc(domain) + '. One click connects it:' : 'Not connected yet.') + '</div>' +
      sug.slice(0, 3).map(p => '<button class="conn-sug" type="button" data-conn-ga4set="' + esc(p.id) + '"><span><b>' + esc(p.name) + '</b><small>' + esc(p.id) + (p.account ? ' · ' + esc(p.account) : '') + '</small></span><em>Connect</em></button>').join('') +
      (sug.length ? '' : '<div class="conn-help">Not listed? In GA4 → Admin → Property access management, add ' + acct + ' as a Viewer.</div>');
  }
  ga4Inner += '<div class="conn-act"><button class="btn btn-sm" type="button" data-conn-ga4open>' + ic('search', 13) + (g.property ? 'Change' : 'Pick a property') + '</button>' +
    (g.property ? '<button class="btn btn-sm" type="button" data-conn-ga4clear>Disconnect</button>' : '') + '</div>' + msgHtml(domain, 'ga4');

  /* Search Console */
  const sc = data.gsc || {};
  const gscInner = sc.site
    ? '<div class="conn-line">Reading <b>' + esc(sc.site) + '</b></div><div class="conn-help">Nothing to save here: the tracker reads whichever property for this domain is shared with it.</div>'
    : '<div class="conn-line">' + (sc.error ? 'Couldn’t check: ' + esc(sc.error) : 'No Search Console property for ' + esc(domain) + ' is shared with the tracker yet.') + '</div>' +
      '<div class="conn-help">In Search Console, open the property for ' + esc(domain) + ' → Settings → Users and permissions → Add user: ' + acct + ', permission <b>Restricted</b>. Then press Check again.</div>' +
      '<div class="conn-act"><button class="btn btn-sm" type="button" data-conn-recheck>' + ic('redo', 13) + 'Check again</button>' +
      (data.account ? '<button class="btn btn-sm" type="button" data-conn-copyacct>' + ic('copy', 13) + 'Copy email</button>' : '') + '</div>';

  /* Website forms */
  const f = data.forms || {}, sn = data.snippet;
  const cms = cmsOf(c, data);
  let snLine, snCls, snPill;
  if (sn && sn.found){ snCls = 'ok'; snPill = 'Live'; snLine = 'The forms snippet is on the site <span class="conn-help" style="display:inline">(checked ' + esc(ago(sn.at)) + ')</span>'; }
  else if (sn && sn.wrongDomain){ snCls = 'warn'; snPill = 'Wrong domain'; snLine = 'A snippet is on the site, but it’s set up for a different domain. Get it again and replace the old one.'; }
  else if (sn){ snCls = f.live ? 'ok' : 'warn'; snPill = f.live ? 'Receiving' : 'Not on site'; snLine = (f.live ? 'Submissions are arriving, though the snippet wasn’t found on the pages checked' : 'The forms snippet isn’t on the site yet') + ' <span class="conn-help" style="display:inline">(checked ' + esc(ago(sn.at)) + ')</span>'; }
  else { snCls = f.live ? 'ok' : ''; snPill = f.live ? 'Receiving' : 'Not checked'; snLine = f.live ? 'Submissions are arriving from the site.' : 'Not checked yet.'; }
  const formsInner = '<div class="conn-line">' + snLine + '</div>' +
    '<div class="conn-stats"><div><b>' + fmt(f.live) + '</b><span>live</span></div><div><b>' + fmt(f.imported) + '</b><span>imported</span></div><div><b>' + esc(f.lastAny ? day(f.lastAny) : '—') + '</b><span>latest</span></div></div>' +
    '<div class="conn-act"><button class="btn btn-sm btn-go" type="button" data-conn-copy>' + ic('code', 13) + 'Get snippet</button>' +
    '<button class="btn btn-sm" type="button" data-conn-check>' + ic('search', 13) + 'Check site</button></div>' +
    (sn && sn.cms && cmsKind(c.cms) && cmsKind(c.cms) !== cmsKind(sn.cms)
      ? '<div class="conn-help">The site looks like <b>' + esc(sn.cms) + '</b>, but this client’s CMS field says “' + esc(c.cms) + '”.</div>' : '') +
    importHtml(domain, cms) +
    msgHtml(domain, 'forms');

  /* Easyleads */
  const el2 = data.easyleads || {};
  let elInner;
  if (el2.connected){
    const er = u.elrun || {};
    elInner = '<div class="conn-line">Connected · <b>' + fmt(el2.count) + '</b> submissions</div>' +
      '<div class="conn-stats"><div><b>' + esc(el2.lastSync ? ago(el2.lastSync) : 'not yet') + '</b><span>last pull</span></div><div><b>' + esc(nextPull(el2.lastSync)) + '</b><span>next pull</span></div></div>' +
      '<div class="conn-act"><button class="btn btn-sm btn-go" type="button" data-conn-elpull' + (er.busy ? ' disabled' : '') + '>' + ic('redo', 13) + (er.busy ? 'Pulling…' : 'Pull now') + '</button>' +
      '<button class="btn btn-sm" type="button" data-conn-formsync>' + ic('form', 13) + 'All clients</button></div>' +
      (er.text ? '<div class="conn-help" style="color:' + (er.err ? '#b4322a' : '#0f7a58') + '">' + esc(er.text) + '</div>' : '') +
      '<div class="conn-help">New Easyleads submissions are pulled every hour. Website forms (WordPress, Concrete) arrive instantly through the snippet.</div>';
  } else if (u.elOpen){
    elInner = '<div class="conn-el">' +
      '<label>Location ID</label><input type="text" data-conn-elloc autocomplete="off" placeholder="GoHighLevel → Settings → Business Profile"/>' +
      '<label>Private Integration Token</label><input type="password" data-conn-eltok autocomplete="off" placeholder="Settings → Private Integrations → Create new"/>' +
      '<div class="conn-help">Create the token in that client’s sub-account with the <b>View Forms</b> and <b>View Custom Fields</b> scopes. Every past submission is pulled in the first time; that can take a minute.</div>' +
      '<div class="conn-act"><button class="btn btn-sm btn-go" type="button" data-conn-elsave>Connect</button>' +
      '<button class="btn btn-sm" type="button" data-conn-elcancel>Cancel</button></div></div>';
  } else {
    elInner = '<div class="conn-line">Not connected. Only needed if this client’s forms are Easyleads (GoHighLevel) forms.</div>' +
      '<div class="conn-act"><button class="btn btn-sm" type="button" data-conn-elopen>Connect Easyleads</button></div>';
  }
  elInner += msgHtml(domain, 'el');

  aiLoad(c, domain, false);
  const ai = aiTile(domain, c);
  const okCount = (g.property && g.visible !== false ? 1 : 0) + (sc.site ? 1 : 0) + ((sn && sn.found) || f.live ? 1 : 0) + (ai.ok ? 1 : 0);
  setState(okCount === 4 ? 'All set' : okCount + ' of 4', okCount === 4);
  setProg(okCount, 4);

  body((u.msg.top ? '<div class="conn-msg ' + u.msg.top.cls + '" style="margin:0 0 12px">' + esc(u.msg.top.text) + '</div>' : '') +
    '<div class="conn-grid">' +
      tile('Google Analytics (GA4)', 'chart', ga4Cls, ga4Pill, ga4Inner) +
      tile('Search Console', 'search', sc.site ? 'ok' : 'warn', sc.site ? 'Connected' : 'Share it', gscInner) +
      tile('Website forms', 'form', snCls, snPill, formsInner) +
      tile('Easyleads forms', 'bolt', el2.connected ? 'ok' : '', el2.connected ? 'Connected' : 'Optional', elInner, !el2.connected) +
      tile('AI visibility', 'ai', 'conn-wide ' + ai.cls, ai.pill, ai.inner) +
    '</div>');
  u.msg.top = null;
  wire(c, domain, data);
}

function redraw(c, domain){ const h = cache[domain]; if (h && shownKey === c.id + '|' + domain) draw(c, domain, h.data); }
async function refreshData(domain){ try{ cache[domain] = {data: await get({action: 'connections', domain}), at: Date.now()}; }catch(e){} }

function wire(c, domain, data){
  const root = $('seoConnBody');
  if (!root) return;
  const u = U(domain);
  const on = (sel, fn) => { const b = root.querySelector(sel); if (b) b.addEventListener('click', fn); return b; };

  root.querySelectorAll('[data-conn-ga4set]').forEach(b => b.addEventListener('click', () => saveGa4(c, domain, b.getAttribute('data-conn-ga4set'))));
  on('[data-conn-ga4open]', () => ga4Picker(c, domain, data));
  on('[data-conn-ga4clear]', () => { if (confirm('Disconnect GA4 for ' + domain + '? Its GA4 widgets will stop updating until a property is picked again.')) saveGa4(c, domain, ''); });

  on('[data-conn-recheck]', () => stage('Checking Search Console', ['Asking Search Console', 'Matching ' + domain], async go => { go(0); await load(c, true, go); }, () => ((cache[domain] || {}).data || {}).gsc && cache[domain].data.gsc.site ? 'Connected' : 'Not shared yet').catch(() => {}));
  on('[data-conn-copyacct]', async e => { const b = e.currentTarget; if (await copyText(data.account)){ b.innerHTML = ic('check', 13) + 'Copied'; burstAt(b); setTimeout(() => { b.innerHTML = ic('copy', 13) + 'Copy email'; }, 2200); } });

  on('[data-conn-copy]', () => snippetModal(c));
  on('[data-conn-check]', () => checkSite(c, domain).catch(() => {}));

  wireImport(c, domain, root);

  on('[data-conn-aiopen]', () => { const b = [...document.querySelectorAll('#seoModes button, #seoModes [role=tab]')].find(x => /ai visibility/i.test(x.textContent || '')); if (b) b.click(); });
  on('[data-conn-aicheck]', async e => {
    const b = e.currentTarget; b.disabled = true; b.innerHTML = ic('redo', 13) + 'Checking…';
    try{ await post({action: 'refresh', domain}); u.msg.ai = {text: 'Asked the tracker to pull the latest GA4 data, then re-read every AI source.', cls: 'ok'}; }
    catch(err){ u.msg.ai = {text: 'The GA4 refresh didn’t go through (' + err.message + '). Re-reading what the tracker already has.', cls: 'err'}; }
    const a = aiFeed[domain] = aiFeed[domain] || {}; a.feed = null; a.err = null; a.busy = false;
    redraw(c, domain); aiLoad(c, domain, true);
  });

  on('[data-conn-aikw]', () => { const b = document.querySelector('#seoModes [data-seoview="keywords"]'); if (b) b.click(); });
  root.querySelectorAll('[data-conn-airun]').forEach(b => b.addEventListener('click', async () => {
    const job = b.getAttribute('data-conn-airun'), key = b.getAttribute('data-key');
    const cur = u.airun || {};
    if (cur.busy) return;
    /* Jobs that spend DataforSEO credits take a second click. */
    if (b.hasAttribute('data-cost') && cur.arm !== key + ':' + job){
      const tag = key + ':' + job; u.airun = {arm: tag}; redraw(c, domain);
      setTimeout(() => { if (u.airun && u.airun.arm === tag){ u.airun = {}; redraw(c, domain); } }, 5000);
      return;
    }
    u.airun = {job, key, busy: true};
    redraw(c, domain);
    try{
      const res = await post({action: 'run', job, domain});
      const out = (res.results || {})[job] || 'Done';
      u.airun = {job, key, text: out, cls: /^Error|^No |^Skipped|isn.t|not /i.test(out) ? 'err' : 'ok'};
    }catch(err){
      u.airun = {job, key, cls: 'err', text: /unknown action/.test(err.message) ? 'The tracker needs its latest update for this.' : err.message};
    }
    const a = aiFeed[domain] = aiFeed[domain] || {}; a.busy = false;
    redraw(c, domain); aiLoad(c, domain, true);
  }));

  on('[data-conn-elopen]', () => { u.elOpen = true; u.msg.el = null; redraw(c, domain); });
  on('[data-conn-elcancel]', () => { u.elOpen = false; u.msg.el = null; redraw(c, domain); });
  on('[data-conn-formsync]', () => formsSyncPanel());
  on('[data-conn-elpull]', async () => {
    if ((u.elrun || {}).busy) return;
    u.elrun = {busy: true}; redraw(c, domain);
    try{
      const res = await post({action: 'run', job: 'easyleads', domain});
      u.elrun = {text: 'Pulled just now: ' + ((res.results || {}).easyleads || 'done'), err: false};
    }catch(err){ u.elrun = {text: /unknown action/.test(err.message) ? 'The tracker needs its latest update for this.' : err.message, err: true}; }
    await refreshData(domain); redraw(c, domain);
  });
  on('[data-conn-elsave]', async () => {
    const loc = ((root.querySelector('[data-conn-elloc]') || {}).value || '').trim(), tok = ((root.querySelector('[data-conn-eltok]') || {}).value || '').trim();
    if (!loc || !tok){ u.msg.el = {text: 'Both the Location ID and the token are needed.', cls: 'err'}; redraw(c, domain); return; }
    u.msg.el = null;
    try{
      const r = await stage('Connecting Easyleads', ['Checking the token', 'Saving the connection', 'Pulling every past submission'], async go => {
        go(0); const x = await post({action: 'setEasyleads', domain, loc, tok}); go(2); await refreshData(domain); return x;
      }, 'Easyleads connected');
      u.elOpen = false; u.msg.el = {text: 'Connected. ' + (r.message || ''), cls: 'ok'};
    }catch(err){ u.msg.el = {text: err.message, cls: 'err'}; }
    redraw(c, domain);
  });
}

/* GA4: a searchable list, matches for this domain first. */
async function ga4Picker(c, domain, data){
  const cur = (data.ga4 || {}).property;
  const m = modal('<div class="conn-ga4"><h2>Google Analytics for ' + esc(c.name || domain) + '</h2><p class="s">Every GA4 property the tracker can read. The ones whose website is ' + esc(domain) + ' are at the top.</p>' +
    '<div class="q">' + ic('search', 15) + '<input type="text" placeholder="Search by name, website or ID" data-q></div><div class="list" data-l>' +
    [0, 1, 2, 3].map(() => '<div class="conn-sk eui-sk" style="height:52px;border-radius:12px;background:#f1f3f6"></div>').join('') + '</div>' +
    '<div class="conn-help" style="font-size:12px;color:var(--ink-3);margin-top:10px" data-acct></div>' +
    '<div class="mf" style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px"><button class="eui-btn" type="button" data-reload>' + ic('redo', 14) + 'Reload list</button><button class="eui-btn" type="button" data-close>Cancel</button><button class="eui-btn pri" type="button" data-save disabled>Connect</button></div></div>', {wide: true});
  const L = m.el.querySelector('[data-l]'), Q = m.el.querySelector('[data-q]'), S = m.el.querySelector('[data-save]');
  let pick = cur || '';
  const fill = () => {
    if (!ga4List){ return; }
    const term = (Q.value || '').trim().toLowerCase();
    const props = (ga4List.properties || []).filter(p => !term || (p.name + ' ' + p.id + ' ' + p.account + ' ' + p.hosts.join(' ')).toLowerCase().indexOf(term) > -1);
    const mine = props.filter(p => p.hosts.indexOf(domain) > -1), rest = props.filter(p => p.hosts.indexOf(domain) < 0);
    const row = p => '<button type="button" class="p' + (p.id === pick ? ' on' : '') + '" data-id="' + esc(p.id) + '"><span><b>' + esc(p.name) + '</b><small>' + esc((p.hosts.length ? p.hosts.join(', ') + ' · ' : '') + p.id + (p.account ? ' · ' + p.account : '')) + '</small></span>' + (p.hosts.indexOf(domain) > -1 ? '<em>Matches</em>' : '') + '</button>';
    L.innerHTML = (mine.length ? '<div class="h">Matches ' + esc(domain) + '</div>' + mine.map(row).join('') : '') + (rest.length ? '<div class="h">' + (mine.length ? 'Other properties' : 'All properties') + '</div>' + rest.slice(0, 200).map(row).join('') : '') ||
      '<div class="conn-help" style="padding:16px;text-align:center">No properties match.</div>';
    L.querySelectorAll('[data-id]').forEach(b => {
      b.addEventListener('click', () => { pick = b.dataset.id; L.querySelectorAll('.p').forEach(x => x.classList.toggle('on', x === b)); S.disabled = !pick || pick === cur; });
      b.addEventListener('dblclick', () => { pick = b.dataset.id; S.click(); });
    });
    m.el.querySelector('[data-acct]').innerHTML = 'Not listed? In GA4 → Admin → Property access management, add <b>' + esc(ga4List.account || 'the tracker account') + '</b> as a Viewer, then Reload list.';
    if (!pick && mine.length === 1){ pick = mine[0].id; fill(); }
    S.disabled = !pick || pick === cur;
  };
  const loadList = async force => {
    try{ ga4List = await get(force ? {action: 'ga4Properties', force: '1'} : {action: 'ga4Properties'}); fill(); }
    catch(err){ L.innerHTML = '<div class="conn-msg err" style="color:#b4282d;background:#fdf1f1;padding:10px 12px;border-radius:10px">Couldn’t load GA4 properties: ' + esc(err.message) + '</div>'; }
  };
  Q.addEventListener('input', fill);
  m.el.querySelector('[data-reload]').addEventListener('click', () => { ga4List = null; L.innerHTML = [0, 1, 2].map(() => '<div class="eui-sk" style="height:52px;border-radius:12px;background:#f1f3f6"></div>').join(''); loadList(true); });
  S.addEventListener('click', () => { if (!pick) return; m.close(); saveGa4(c, domain, pick); });
  if (ga4List) fill(); else loadList(false);
}

async function saveGa4(c, domain, id){
  const u = U(domain);
  u.msg.ga4 = null;
  try{
    const r = await stage(id ? 'Connecting Google Analytics' : 'Disconnecting Google Analytics', id ? ['Saving the property', 'Pulling the first GA4 data', 'Refreshing the card'] : ['Removing the property', 'Refreshing the card'], async go => {
      go(0); const x = await post({action: 'setGa4', domain, property: id}); go(id ? 2 : 1); await refreshData(domain); return x;
    }, id ? 'Google Analytics connected' : 'Disconnected');
    u.msg.ga4 = {text: id ? 'Saved. ' + (r.message || '') : 'GA4 disconnected.', cls: 'ok'};
  }catch(err){ u.msg.ga4 = {text: err.message, cls: 'err'}; }
  redraw(c, domain);
}

async function addToTracker(c, domain){
  const u = U(domain);
  u.msg.add = null;
  try{
    await stage('Adding ' + (c.name || domain) + ' to the tracker', ['Adding the client', 'Matching GA4', 'Checking Search Console'], async go => {
      go(0);
      const one = {
        id: c.id, name: c.name || '', website: c.website, status: c.status || '',
        keywords: (c.keywords || []).slice(0, 60).map(k => ({text: k.text || '', location: ((k.locations || [])[0] || {}).label || '',
          locations: (k.locations || []).slice(0, 5).map(l => ({label: l.label || '', lat: l.lat == null ? null : l.lat, lng: l.lng == null ? null : l.lng}))}))
      };
      await post({action: 'register', clients: [one], url: tracker().url});
      go(1); await refreshData(domain); go(2);
    }, 'Added to the tracker');
  }catch(err){ u.msg.add = {text: err.message, cls: 'err'}; }
  const h = cache[domain]; if (h && shownKey === c.id + '|' + domain) draw(c, domain, h.data); else load(c, true);
}

/* ---------- the snippet: copy it, see where it goes, check the live site ---------- */
async function checkSite(c, domain){
  const r = await stage('Looking for the snippet on ' + domain, ['Loading the home page', 'Loading the contact page', 'Looking for the snippet'], async go => {
    go(0); const x = await post({action: 'checkSnippet', domain}); go(2);
    const h = cache[domain]; if (h) h.data.snippet = x;
    return x;
  }, x => x.found ? 'Snippet found' : x.wrongDomain ? 'Snippet for another domain' : 'Not found yet');
  const u = U(domain);
  u.msg.forms = r.found ? {text: 'Found the snippet on ' + domain + '.', cls: 'ok'}
    : r.wrongDomain ? {text: 'There’s a snippet on the site, but for a different domain.', cls: 'err'}
    : {text: 'Didn’t find the snippet on ' + (r.checked && r.checked.length ? r.checked.join(', ') : domain) + '. If you just added it, clear the site’s cache and check again.', cls: 'err'};
  if (!c.cms && r.cms){ c.cms = r.cms; try{ save(); }catch(e){} }
  redraw(c, domain);
  return r;
}
async function snippetModal(c){
  const domain = normDomain(c.website);
  if (domain.indexOf('.') < 0){ try{ toast('Add the client’s website first', 'err'); }catch(e){} return; }
  let code = '';
  try{ code = await snippetFor(domain); }catch(err){ try{ toast(err.message, 'err'); }catch(e){} return; }
  const data = (cache[domain] || {}).data || {};
  let cms = cmsOf(c, data) || 'wp';
  const steps = {
    wp: '<ol><li>Open <b>' + esc(domain) + '/wp-admin</b> and sign in.</li><li>Go to <b>Code Snippets → Header &amp; Footer</b> (the WPCode plugin).</li><li>Paste it into the <b>Footer</b> box and press <b>Save Changes</b>.</li><li>Clear the site cache if it has one, then press <b>Check the site</b> below.</li></ol>',
    concrete: '<ol><li>Open <b>' + esc(domain) + '/index.php/dashboard</b> and sign in.</li><li>Go to <b>System &amp; Settings → SEO &amp; Statistics → Tracking Codes</b>.</li><li>Paste it into the <b>Footer</b> box and press <b>Save</b>.</li><li>Clear the cache (System &amp; Settings → Optimization) and press <b>Check the site</b> below.</li></ol>',
    other: '<ol><li>Open the site’s settings for custom code.</li><li>Paste it just before the closing <b>&lt;/body&gt;</b> tag, on every page.</li><li>Publish, then press <b>Check the site</b> below.</li></ol>'
  };
  const m = modal('<div class="conn-snip"><h2>Forms snippet for ' + esc(c.name || domain) + '</h2><p class="s">Paste it once and every form on ' + esc(domain) + ' sends its submissions to EDGE: who sent it, the page, and where they came from.</p>' +
    '<pre data-code>' + esc(code) + '</pre>' +
    '<div class="mf" style="justify-content:flex-start;margin-top:12px"><button class="eui-btn pri" type="button" data-cp>' + ic('copy', 14) + 'Copy snippet</button></div>' +
    '<div class="tabs">' + [['wp', 'WordPress'], ['concrete', 'Concrete'], ['other', 'Other']].map(([k, l]) => '<button type="button" data-tab="' + k + '"' + (k === cms ? ' class="on"' : '') + '>' + l + '</button>').join('') + '</div>' +
    '<div data-steps>' + steps[cms] + '</div><div data-res></div>' +
    '<div class="mf"><button class="eui-btn" type="button" data-close>Close</button><button class="eui-btn" type="button" data-chk>' + ic('search', 14) + 'Check the site</button></div></div>', {wide: true});
  m.el.querySelector('[data-cp]').addEventListener('click', async e => {
    const b = e.currentTarget;
    if (await copyText(code)){ b.innerHTML = ic('check', 14) + 'Copied'; burstAt(b); setTimeout(() => { b.innerHTML = ic('copy', 14) + 'Copy snippet'; }, 2400); }
    else { try{ toast('Your browser blocked the copy. Select the code and copy it.', 'err'); }catch(err){} }
  });
  m.el.querySelectorAll('[data-tab]').forEach(t => t.addEventListener('click', () => { cms = t.dataset.tab; m.el.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x === t)); m.el.querySelector('[data-steps]').innerHTML = steps[cms]; }));
  m.el.querySelector('[data-chk]').addEventListener('click', async () => {
    const res = m.el.querySelector('[data-res]');
    try{
      const r = await checkSite(c, domain);
      res.innerHTML = '<div class="res ' + (r.found ? 'ok' : 'err') + '">' + (r.found ? 'The snippet is on ' + esc(domain) + '. New submissions will show up on their own.' : r.wrongDomain ? 'A snippet for a different domain is on the site. Replace it with this one.' : 'Not found yet. If you just pasted it, clear the site’s cache and check again.') + '</div>';
    }catch(err){ res.innerHTML = '<div class="res err">' + esc(err.message) + '</div>'; }
  });
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
  if (!u.impOpen){
    h += '<div class="conn-act"><button class="btn btn-sm" type="button" data-conn-impopen>' + ic('up', 13) + 'Import past submissions</button></div>';
  } else {
    h += '<ol class="conn-steps">' +
      '<li>Once per browser, drag this to your bookmarks bar: <a class="conn-bm" href="' + esc(BOOKMARK) + '" data-conn-bm title="Drag me to the bookmarks bar">EDGE import</a></li>' +
      '<li>' + adminLinks(domain, cms).map(a => '<button class="btn btn-sm btn-go" type="button" data-conn-impgo="' + esc(a.url) + '">' + ic('ext', 13) + esc(a.label) + '</button>').join(' ') +
      ' and sign in if it asks.</li>' +
      '<li>In that window, click the <b>EDGE import</b> bookmark, then <b>Send to EDGE SEO tool</b>. Keep this page open; the result shows here.</li>' +
      '</ol>' +
      '<div class="conn-help">Concrete: Express forms, the older Form block and Formidable. WordPress: Ninja Forms, Gravity Forms and Elementor Pro. Importing again is safe: submissions already on file are skipped.</div>' +
      '<div class="conn-act"><label class="btn btn-sm conn-file">' + ic('file', 13) + 'Import a downloaded file<input type="file" accept=".json,application/json" data-conn-impfile hidden/></label>' +
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
    await stage('Importing ' + fmt(rows.length) + ' past submission' + (rows.length === 1 ? '' : 's'), ['Reading the export', 'Sending them to the tracker', 'Skipping the ones already on file', 'Refreshing the counts'], async go => {
      go(0);
      for (let i = 0; i < rows.length; i += 500){
        go(1, 'Sending ' + fmt(Math.min(i + 500, rows.length)) + ' of ' + fmt(rows.length) + '…'); if (go.bar) go.bar(Math.min(i + 500, rows.length) / rows.length * .9);
        const r = await post({action: 'formsImport', domain, rows: rows.slice(i, i + 500)});
        added += Number(r.added || 0); skipped += Number(r.skipped || 0);
      }
      go(3); await refreshData(domain);
    }, () => fmt(added) + ' imported');
    u.msg.imp = {text: 'Imported ' + fmt(added) + ' past submission' + (added === 1 ? '' : 's') +
      (skipped ? ' (' + fmt(skipped) + ' already on file or empty)' : '') + '.', cls: 'ok'};
    u.impOpen = false;
    return {added, skipped};
  }catch(err){
    u.msg.imp = {text: 'Import stopped' + (added ? ' after ' + fmt(added) + ' new' : '') + ': ' + err.message, cls: 'err'};
    throw err;
  }finally{
    u.busy.imp = false;
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

/* ---------- Forms sync: every client at a glance ----------
   Website forms (WordPress, Concrete) arrive instantly through the snippet, so
   they show when the last one came in. Easyleads (GoHighLevel) forms are pulled
   every hour by the tracker: last pull, next pull, and a Pull now button. */
const FS_CSS = `
.eui-modal.wide:has(.fsy){width:min(1060px,94vw);max-width:min(1060px,94vw)}
.fsy{font-family:var(--ui,Inter,sans-serif);color:var(--ink,#171614);min-width:0}
.fsy-h{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px}
.fsy-h h2{margin:0;font:600 19px var(--display,Poppins,Inter,sans-serif);letter-spacing:-.01em}
.fsy-h p{margin:4px 0 0;font-size:12.5px;color:var(--ink-3,#8a9097);max-width:620px;line-height:1.5}
.fsy-x{border:0;background:none;font-size:22px;line-height:1;cursor:pointer;color:var(--ink-3,#8a9097)}
.fsy-top{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:4px 0 14px}
.fsy-k{background:#f7f9fb;border-radius:14px;padding:12px 14px}
.fsy-k b{display:block;font:700 20px var(--display,Poppins,Inter,sans-serif)}
.fsy-k span{font-size:11.5px;color:var(--ink-3,#8a9097)}
.fsy-k.go{background:linear-gradient(180deg,#effaf5,#f8fcfa)}
.fsy-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
.fsy-bar input{flex:1;min-width:200px;padding:8px 12px;border:1px solid var(--line,#e6e8eb);border-radius:10px;font:inherit;font-size:13px}
.fsy-seg{display:inline-flex;background:#f1f2f5;border-radius:10px;padding:3px}
.fsy-seg button{border:0;background:none;padding:6px 11px;border-radius:8px;font:600 12px var(--ui,Inter,sans-serif);color:#677083;cursor:pointer}
.fsy-seg button.on{background:#fff;color:var(--ink,#171614);box-shadow:0 1px 3px rgba(0,0,0,.08)}
.fsy-wrap{max-height:56vh;overflow:auto;border:1px solid var(--line,#e6e8eb);border-radius:14px}
.fsy table{width:100%;border-collapse:collapse;font-size:12.8px}
.fsy th{position:sticky;top:0;background:#fff;text-align:left;font:600 10.5px var(--ui,Inter,sans-serif);letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3,#8a9097);padding:10px 12px;border-bottom:1px solid var(--line,#e6e8eb);z-index:1}
.fsy td{padding:10px 12px;border-bottom:1px solid #f1f3f6;vertical-align:middle}
.fsy tr:last-child td{border-bottom:0}
.fsy td small{display:block;color:var(--ink-3,#8a9097);font-size:11.5px;margin-top:2px}
.fsy-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:#c3cbd3;vertical-align:middle}
.fsy-dot.ok{background:#22a06b}.fsy-dot.warn{background:#e08a1e}.fsy-dot.bad{background:#d64545}
.fsy-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line,#e6e8eb);background:#fff;border-radius:9px;padding:6px 10px;font:600 12px var(--ui,Inter,sans-serif);cursor:pointer;color:var(--ink,#171614)}
.fsy-btn:hover{border-color:#e87722;color:#b85a12}
.fsy-btn.go{background:#171614;border-color:#171614;color:#fff}
.fsy-btn[disabled]{opacity:.55;cursor:default}
.fsy-msg{font-size:12px;margin-top:8px;color:#0f7a58}.fsy-msg.err{color:#b4322a}
.fsy-foot{display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:11.5px;color:var(--ink-3,#8a9097)}
@media (max-width:760px){.fsy-top{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
let fsyOpen = null;
async function formsSyncPanel(){
  if (fsyOpen) return;
  if (!document.getElementById('fsyCss')){ const st = document.createElement('style'); st.id = 'fsyCss'; st.textContent = FS_CSS; document.head.appendChild(st); }
  const m = modal('<div class="fsy"><div class="fsy-h"><div><h2>Forms sync</h2><p>Website forms from WordPress and Concrete sites arrive the moment someone submits. Easyleads (GoHighLevel) forms are pulled by the tracker every hour; pull any client now if you’re waiting on a lead.</p></div><button class="fsy-x" type="button" data-close aria-label="Close">×</button></div><div data-fsy-body><div class="conn-line">Reading the tracker…</div></div></div>', {wide: true});
  fsyOpen = m;
  const root = m.el || document;
  const body = root.querySelector('[data-fsy-body]');
  let data = null, filter = 'all', q = '', busy = {}, msg = null, timer = null;
  const names = {}; (state.seoClients || []).forEach(c => { const d = normDomain(c.website); if (d) names[d] = {name: c.name, cms: c.cms || ''}; });
  const iso = ms => ms ? new Date(ms).toISOString() : '';
  const load = async () => {
    try{ data = await post({action: 'formsStatus'}); }
    catch(err){ body.innerHTML = '<div class="conn-line" style="color:#b4322a">Couldn’t read the tracker: ' + esc(/unknown action/.test(err.message) ? 'it needs its latest update.' : err.message) + '</div>'; return; }
    draw();
  };
  const draw = () => {
    if (!data || !body.isConnected) return;
    const every = data.every || 60;
    const rows = data.clients.filter(c => c.el || c.web || names[c.domain]).map(c => {
      const n = names[c.domain] || {};
      const webAge = c.web && c.web.last ? (Date.now() - c.web.last) / 864e5 : null;
      const elAge = c.el && c.el.last ? (Date.now() - c.el.last) / 60000 : null;
      return Object.assign({}, c, {label: n.name || c.name || c.domain, cms: n.cms, webAge, elAge,
        elState: !c.el ? '' : elAge == null ? 'warn' : elAge > every * 3 ? 'bad' : elAge > every * 1.5 ? 'warn' : 'ok'});
    }).filter(r => filter === 'all' || (filter === 'el' ? r.el : filter === 'web' ? r.web : !r.el && !r.web))
      .filter(r => !q || (r.label + ' ' + r.domain).toLowerCase().indexOf(q) > -1)
      .sort((a, b) => (b.el ? 1 : 0) - (a.el ? 1 : 0) || a.label.localeCompare(b.label));
    const all = data.clients, els = all.filter(c => c.el), lastAny = Math.max(0, ...els.map(c => c.el.last || 0));
    const stale = els.filter(c => !c.el.last || (Date.now() - c.el.last) / 60000 > every * 1.5).length;
    const web7 = all.filter(c => c.web && c.web.last && Date.now() - c.web.last < 7 * 864e5).length;
    body.innerHTML =
      '<div class="fsy-top">' +
        '<div class="fsy-k go"><b>' + esc(lastAny ? ago(iso(lastAny)) : '—') + '</b><span>Last Easyleads pull</span></div>' +
        '<div class="fsy-k"><b>' + esc(data.trigger ? nextPull(iso(lastAny), every) : 'Off') + '</b><span>' + (data.trigger ? 'Next pull (every ' + every + ' min)' : 'Hourly pull isn’t switched on') + '</span></div>' +
        '<div class="fsy-k"><b>' + els.length + (stale ? ' <span style="font-size:12px;color:#a54c07">· ' + stale + ' behind</span>' : '') + '</b><span>Easyleads clients</span></div>' +
        '<div class="fsy-k"><b>' + web7 + '</b><span>Sites with a form this week</span></div>' +
      '</div>' +
      '<div class="fsy-bar"><input type="search" placeholder="Find a client" value="' + esc(q) + '" data-fsy-q>' +
        '<div class="fsy-seg">' + [['all', 'All'], ['el', 'Easyleads'], ['web', 'Website forms'], ['none', 'Nothing yet']].map(x => '<button type="button" data-fsy-f="' + x[0] + '"' + (filter === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>').join('') + '</div>' +
        '<button class="fsy-btn go" type="button" data-fsy-all' + (busy.all ? ' disabled' : '') + '>' + (busy.all ? 'Pulling every client…' : 'Pull all Easyleads now') + '</button></div>' +
      (msg ? '<div class="fsy-msg' + (msg.err ? ' err' : '') + '">' + esc(msg.text) + '</div>' : '') +
      '<div class="fsy-wrap" style="margin-top:8px"><table><thead><tr><th>Client</th><th>Website forms</th><th>Easyleads last pull</th><th>Next pull</th><th>Last Easyleads lead</th><th></th></tr></thead><tbody>' +
      (rows.length ? rows.map(r => '<tr>' +
        '<td><b>' + esc(r.label) + '</b><small>' + esc(r.domain) + (r.cms ? ' · ' + esc(r.cms) : '') + '</small></td>' +
        '<td>' + (r.web ? '<span class="fsy-dot ' + (r.webAge < 30 ? 'ok' : 'warn') + '"></span>' + esc(ago(iso(r.web.last))) + '<small>' + fmt(r.web.n30) + ' in 30 days · instant</small>' : '<span style="color:var(--ink-3,#8a9097)">None received</span>') + '</td>' +
        '<td>' + (r.el ? '<span class="fsy-dot ' + r.elState + '"></span>' + esc(r.el.last ? ago(iso(r.el.last)) : 'not yet') : '<span style="color:var(--ink-3,#8a9097)">Not connected</span>') + '</td>' +
        '<td>' + (r.el ? esc(data.trigger ? nextPull(iso(r.el.last), every) : 'Off') : '') + '</td>' +
        '<td>' + (r.el && r.el.lead ? esc(ago(iso(r.el.lead.last))) + '<small>' + fmt(r.el.lead.n30) + ' in 30 days</small>' : r.el ? '<span style="color:var(--ink-3,#8a9097)">None yet</span>' : '') + '</td>' +
        '<td style="text-align:right">' + (r.el ? '<button class="fsy-btn" type="button" data-fsy-pull="' + esc(r.domain) + '"' + (busy[r.domain] || busy.all ? ' disabled' : '') + '>' + (busy[r.domain] ? 'Pulling…' : 'Pull now') + '</button>' : '') + '</td>' +
      '</tr>').join('') : '<tr><td colspan="6" style="color:var(--ink-3,#8a9097)">No clients match.</td></tr>') +
      '</tbody></table></div>' +
      '<div class="fsy-foot"><span>Read ' + esc(ago(iso(data.now))) + ' · refreshes every 30 seconds while open</span><span>Green: pulled within the hour · amber: late · red: missed several pulls</span></div>';
    const qi = body.querySelector('[data-fsy-q]');
    qi.addEventListener('input', () => { q = qi.value.trim().toLowerCase(); const pos = qi.selectionStart; draw(); const n = body.querySelector('[data-fsy-q]'); n.focus(); try{ n.setSelectionRange(pos, pos); }catch(e){} });
    body.querySelectorAll('[data-fsy-f]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.fsyF; draw(); }));
    body.querySelector('[data-fsy-all]').addEventListener('click', async () => {
      if (busy.all) return;
      busy.all = true; msg = null; draw();
      try{ const r = await post({action: 'formsPullAll'}); data = r.status || data; msg = {text: 'Pulled every Easyleads client just now.'}; }
      catch(err){ msg = {text: err.message, err: true}; }
      busy.all = false; draw();
    });
    body.querySelectorAll('[data-fsy-pull]').forEach(b => b.addEventListener('click', async () => {
      const d = b.dataset.fsyPull; if (busy[d] || busy.all) return;
      busy[d] = true; msg = null; draw();
      try{ const r = await post({action: 'run', job: 'easyleads', domain: d}); msg = {text: (names[d] && names[d].name || d) + ': ' + ((r.results || {}).easyleads || 'pulled')}; }
      catch(err){ msg = {text: err.message, err: true}; }
      busy[d] = false;
      try{ data = await post({action: 'formsStatus'}); }catch(e){}
      draw();
    }));
  };
  await load();
  timer = setInterval(() => { if (!body.isConnected){ clearInterval(timer); fsyOpen = null; return; } if (!Object.keys(busy).some(k => busy[k])) load(); }, 30000);
  const closeWatch = setInterval(() => { if (!body.isConnected){ clearInterval(closeWatch); clearInterval(timer); fsyOpen = null; } }, 1000);
}
/* A "Forms sync" button in the SEO Clients rail, next to Share all clients. */
function addRailButton(){
  const share = document.getElementById('seoPublishAllBtn');
  if (!share || document.getElementById('seoFormsSyncBtn')) return;
  const b = document.createElement('button');
  b.className = 'mini-btn'; b.id = 'seoFormsSyncBtn'; b.type = 'button'; b.textContent = 'Forms sync';
  b.title = 'When each client’s forms last came in, when Easyleads is pulled next, and Pull now';
  b.addEventListener('click', () => formsSyncPanel());
  share.insertAdjacentElement('afterend', b);
}
setInterval(addRailButton, 2000); setTimeout(addRailButton, 500);

window.EDGE_CONN = {
  formsSync: () => formsSyncPanel(),
  snippetModal,
  checkSite: c => checkSite(c, normDomain(c.website)),
  forget: domain => { delete cache[normDomain(domain)]; shownKey = null; }
};
})();
