/* ==========================================================================
   EDGE UI: the smooth layer on top of the SEO tool.

     edgeStage(title, steps, work, done)   the loading screen every action uses: the EDGE
                                           mark in a spinning ring, steps that tick off,
                                           a bar, a tick and a burst when it's done, a red
                                           cross and the reason when it isn't
     edgeModal(html, {wide})               one modal look for everything below
     New client                            name + website, then the logo is found, the
                                           client is added to the tracker, GA4 matched,
                                           Search Console checked and the site checked for
                                           the forms snippet; ends on a summary
     Logos                                 "Find automatically" next to the Logo URL field,
                                           and "Find missing logos" for every client
     Scan toolbar                          Run / Paste mode / Stop / Re-check in one row

   Talks to EDGE's own AI Visibility Tracker (state.settings.aiTracker), never to
   the Easyleads backend.
   ========================================================================== */
(function () {
'use strict';
if (typeof state === 'undefined') return;

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const normDomain = v => String(v || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[\/?#:]/)[0];
const fmt = n => Number(n || 0).toLocaleString();
const LOGO = () => window.EDGE_LOGO || '';
const note = (m, k) => { try{ toast(m, k); }catch(e){} };

/* ---------- styles ---------- */
const css = `
.eui-stage{position:fixed;inset:0;z-index:10050;display:grid;place-items:center;background:rgba(246,247,249,.72);-webkit-backdrop-filter:blur(10px) saturate(1.4);backdrop-filter:blur(10px) saturate(1.4);animation:euiFade .22s ease both}
.eui-stage.out{animation:euiFadeOut .32s ease both}
.eui-box{width:min(400px,calc(100vw - 32px));background:#fff;border-radius:26px;padding:30px 30px 24px;box-shadow:0 40px 80px -30px rgba(20,26,33,.35),0 0 0 1px rgba(20,26,33,.05);text-align:center;animation:euiRise .45s cubic-bezier(.2,.8,.2,1) both;font-family:var(--ui,Inter,sans-serif)}
.eui-orb{position:relative;width:96px;height:96px;margin:0 auto 16px}
.eui-orb svg.ring{position:absolute;inset:0;width:96px;height:96px;animation:euiSpin 1.1s linear infinite}
.eui-orb .halo{position:absolute;inset:10px;border-radius:50%;background:radial-gradient(closest-side,rgba(234,122,32,.18),rgba(234,122,32,0));animation:euiPulse 1.8s ease-in-out infinite}
.eui-orb img{position:absolute;inset:26px;width:44px;height:44px;object-fit:contain;transition:transform .35s cubic-bezier(.2,.8,.2,1),opacity .25s}
.eui-orb .tick{position:absolute;inset:0;display:grid;place-items:center;opacity:0;transform:scale(.6);transition:opacity .25s,transform .35s cubic-bezier(.2,1.4,.4,1)}
.eui-orb .tick i{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(180deg,#22a06b,#0f7a58);box-shadow:0 10px 24px -10px rgba(15,122,88,.7)}
.eui-orb .tick svg{width:28px;height:28px;fill:none;stroke:#fff;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:30;stroke-dashoffset:30;transition:stroke-dashoffset .4s .1s ease}
.eui-orb.done svg.ring{animation:none;opacity:0;transition:opacity .2s}
.eui-orb.done img{opacity:0;transform:scale(.6)}
.eui-orb.done .tick{opacity:1;transform:none}.eui-orb.done .tick svg{stroke-dashoffset:0}
.eui-orb.fail .tick i{background:linear-gradient(180deg,#e5484d,#c53035);box-shadow:0 10px 24px -10px rgba(197,48,53,.7)}
.eui-box h3{margin:0;font:600 18px/1.3 var(--display,Poppins,Inter,sans-serif);letter-spacing:-.015em;color:var(--ink,#141a21)}
.eui-box .sub{margin:6px 0 16px;font-size:13px;color:var(--ink-2,#57646f);min-height:18px;line-height:1.45;overflow-wrap:anywhere}
.eui-pb{height:6px;border-radius:6px;background:#f1f2f5;overflow:hidden;margin:0 0 16px}
.eui-pb i{display:block;height:100%;width:4%;border-radius:6px;background:linear-gradient(90deg,var(--brand-hi,#fb9f42),var(--brand,#ea7a20));transition:width .5s cubic-bezier(.2,.8,.2,1);position:relative;overflow:hidden}
.eui-pb i:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:euiShine 1.2s linear infinite}
.eui-box ul{list-style:none;margin:0;padding:0;text-align:left;display:grid;gap:8px}
.eui-box li{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--ink-3,#8593a1);transition:color .2s}
.eui-box li .s{flex:none;width:18px;height:18px;border-radius:50%;border:2px solid #e4e9ed;display:grid;place-items:center;transition:all .25s}
.eui-box li.on{color:var(--ink,#141a21);font-weight:500}
.eui-box li.on .s{border-color:var(--brand,#ea7a20);border-top-color:transparent;animation:euiSpin .8s linear infinite}
.eui-box li.ok{color:var(--ink-2,#57646f)}
.eui-box li.ok .s{border-color:#0f7a58;background:#0f7a58}
.eui-box li.ok .s:after{content:"";width:8px;height:4px;border:2px solid #fff;border-top:0;border-right:0;transform:rotate(-45deg) translate(1px,-1px)}
.eui-box li.skip{opacity:.55}.eui-box li.skip .s{border-style:dashed}
.eui-burst{position:fixed;z-index:10060;pointer-events:none;width:0;height:0}
.eui-burst i{position:absolute;width:8px;height:8px;border-radius:2px;animation:euiBurst .9s cubic-bezier(.2,.8,.2,1) forwards}
@keyframes euiBurst{0%{transform:translate(0,0) rotate(0);opacity:1}100%{transform:translate(var(--x),var(--y)) rotate(var(--r));opacity:0}}
@keyframes euiSpin{to{transform:rotate(360deg)}}
@keyframes euiPulse{0%,100%{transform:scale(.92);opacity:.7}50%{transform:scale(1.06);opacity:1}}
@keyframes euiShine{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
@keyframes euiFade{from{opacity:0}to{opacity:1}}@keyframes euiFadeOut{from{opacity:1}to{opacity:0}}
@keyframes euiRise{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
.eui-back{position:fixed;inset:0;z-index:10040;display:grid;place-items:center;padding:20px;background:rgba(20,26,33,.38);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);animation:euiFade .2s ease both;overflow:auto}
.eui-modal{width:min(520px,100%);max-height:calc(100vh - 40px);overflow:auto;background:#fff;border-radius:24px;padding:26px 26px 22px;box-shadow:0 40px 90px -30px rgba(20,26,33,.45);animation:euiRise .38s cubic-bezier(.2,.8,.2,1) both;font-family:var(--ui,Inter,sans-serif);color:var(--ink,#141a21);box-sizing:border-box}
.eui-modal.wide{width:min(720px,100%)}
.eui-modal h2{margin:0;font:600 20px/1.25 var(--display,Poppins,sans-serif);letter-spacing:-.02em}
.eui-modal .s{margin:6px 0 18px;font-size:13.5px;color:var(--ink-2,#57646f);line-height:1.5}
.eui-modal label.f{display:block;font-size:12px;font-weight:600;color:var(--ink-2,#57646f);margin:14px 0 6px}
.eui-modal label.f small{font-weight:500;color:var(--ink-3,#8593a1)}
.eui-modal .in{width:100%;box-sizing:border-box;height:44px;border:1px solid var(--line,#e4e9ed);border-radius:12px;padding:0 14px;font:inherit;font-size:14px;color:var(--ink,#141a21);background:#fbfcfd;transition:border-color .15s,box-shadow .15s,background .15s}
.eui-modal .in:focus{outline:0;border-color:var(--brand,#ea7a20);background:#fff;box-shadow:0 0 0 4px rgba(234,122,32,.14)}
.eui-modal .row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.eui-modal .mf{display:flex;justify-content:flex-end;gap:10px;margin-top:22px;flex-wrap:wrap}
.eui-modal .err{margin-top:12px;padding:10px 14px;border-radius:12px;background:#fdf1f1;border:1px solid #f5cfcf;color:#c0353a;font-size:13px}
.eui-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:40px;padding:0 16px;border-radius:12px;border:1px solid var(--line,#e4e9ed);background:#fff;font:inherit;font-weight:600;font-size:13.5px;color:var(--ink,#141a21);cursor:pointer;transition:transform .15s,box-shadow .2s,background .2s,border-color .2s;white-space:nowrap;text-decoration:none;margin:0}
.eui-btn:hover{border-color:#cfd7de;box-shadow:0 4px 12px -6px rgba(20,26,33,.2);transform:translateY(-1px)}
.eui-btn.pri{border:0;color:#fff;background:linear-gradient(180deg,var(--brand-hi,#fb9f42),var(--brand-lo,#d0620f));box-shadow:0 10px 22px -12px rgba(208,98,15,.9)}
.eui-btn.pri:hover{filter:brightness(1.05)}
.eui-btn.sm{height:34px;padding:0 12px;font-size:12.5px;border-radius:10px}
.eui-btn:disabled{opacity:.55;cursor:default;transform:none;box-shadow:none}
.eui-btn svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.eui-sum{display:grid;gap:10px;margin-top:4px}
.eui-sum .r{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--line,#e4e9ed);border-radius:16px;background:#fff}
.eui-sum .r .ic{flex:none;width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:#f3f5f8;color:#57646f}
.eui-sum .r .ic svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.eui-sum .r.ok .ic{background:#e7f6ef;color:#0f7a58}.eui-sum .r.warn .ic{background:#fff4e5;color:#b8570f}
.eui-sum .r .t{flex:1;min-width:0}.eui-sum .r .t > b{display:block;font-size:13.5px}.eui-sum .r .t small b{font-weight:600;color:var(--ink,#141a21)}.eui-sum .r .t small{display:block;color:var(--ink-2,#57646f);font-size:12.5px;line-height:1.45;overflow-wrap:anywhere}
.eui-sum .r .pill{font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;background:#f1f2f5;color:#57646f;white-space:nowrap}
.eui-sum .r.ok .pill{background:#e7f6ef;color:#0f7a58}.eui-sum .r.warn .pill{background:#fff4e5;color:#a54c07}
.eui-hero{display:flex;align-items:center;gap:16px;margin:2px 0 18px}
.eui-logo{flex:none;width:64px;height:64px;border-radius:18px;background:#fff;box-shadow:0 0 0 1px rgba(20,26,33,.08),0 8px 18px -10px rgba(20,26,33,.3);display:grid;place-items:center;overflow:hidden;font:700 20px var(--display,Poppins,sans-serif);color:var(--ink,#141a21)}
.eui-logo img{max-width:80%;max-height:80%;object-fit:contain}
.eui-pick{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-top:6px}
.eui-pick button{position:relative;height:92px;border:1px solid var(--line,#e4e9ed);border-radius:14px;background:#fff;cursor:pointer;display:grid;place-items:center;padding:10px;transition:border-color .15s,box-shadow .15s,transform .15s}
.eui-pick button:hover{transform:translateY(-1px);box-shadow:0 8px 18px -10px rgba(20,26,33,.3)}
.eui-pick button.on{border-color:var(--brand,#ea7a20);box-shadow:0 0 0 3px rgba(234,122,32,.18)}
.eui-pick button img{max-width:100%;max-height:52px;object-fit:contain}
.eui-pick button small{position:absolute;left:8px;right:8px;bottom:5px;font-size:10px;color:var(--ink-3,#8593a1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.eui-pick button.none{font-size:12px;color:var(--ink-2,#57646f);font-weight:600}
.eui-sk{position:relative;overflow:hidden;background:#f1f3f6;border-radius:12px}
.eui-sk:after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent);animation:euiShine 1.3s ease-in-out infinite}
.eui-logo-btn{margin-top:8px !important}
/* Scan toolbar: one tidy row */
.results > .runbar{display:flex !important;flex-direction:row !important;flex-wrap:wrap;align-items:center;justify-content:flex-start;gap:10px;padding:14px 16px !important}
.results > .runbar > .row{display:contents !important}
.results > .runbar .btn{margin:0 !important;width:auto !important;flex:none !important;height:40px;border-radius:12px;display:inline-flex;align-items:center;gap:8px;padding:0 16px}
.results > .runbar #autoScanBtn{padding:0 24px !important;font-size:14px;min-width:170px}
.results > .runbar #stopAutoBtn:disabled,.results > .runbar #retryFailedBtn:disabled{opacity:.45}
.results > .runbar .btn svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.results > .runbar .eui-sep{width:1px;height:24px;background:var(--line,#e4e9ed);margin:0 2px}
.results > .runbar .prog,.results > .runbar .status{flex-basis:100%;order:20}
.results > .runbar .status:empty{display:none}
`;
(function inject(){ if ($('euiStyles')) return; const st = document.createElement('style'); st.id = 'euiStyles'; st.textContent = css; document.head.appendChild(st); })();

/* ---------- icons ---------- */
const P = {
  check: 'M20 6 9 17l-5-5', plus: 'M12 5v14M5 12h14', globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2', search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3', code: 'm8 7-5 5 5 5M16 7l5 5-5 5',
  img: 'M3 5h18v14H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 19', play: 'M7 4v16l13-8z', stop: 'M6 6h12v12H6z',
  redo: 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5', paste: 'M9 4h6v3H9zM8 5H6v15h12V5h-2', copy: 'M9 9h11v11H9zM5 15V4h11', x: 'M18 6 6 18M6 6l12 12',
  link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1', mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  wand: 'M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5'
};
const ic = (k, s) => '<svg viewBox="0 0 24 24" width="' + (s || 16) + '" height="' + (s || 16) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (P[k] || P.check) + '"/></svg>';

/* ---------- the loading stage ---------- */
function burst(x, y){
  const b = document.createElement('div'); b.className = 'eui-burst'; b.style.left = x + 'px'; b.style.top = y + 'px';
  const cols = ['#ea7a20', '#fb9f42', '#141a21', '#0f7a58', '#ffd2a8', '#d0620f'];
  for (let i = 0; i < 26; i++){ const p = document.createElement('i'); const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 110;
    p.style.background = cols[i % cols.length]; p.style.setProperty('--x', Math.cos(a) * d + 'px'); p.style.setProperty('--y', Math.sin(a) * d + 'px'); p.style.setProperty('--r', (Math.random() * 540 - 270) + 'deg'); p.style.animationDelay = (Math.random() * .08) + 's'; b.appendChild(p); }
  document.body.appendChild(b); setTimeout(() => b.remove(), 1100);
}
/* work(go) runs while the steps tick. go(i, text) jumps to step i (and shows text under the
   title); go.skip(i) greys a step out. Without calls to go, steps advance on a timer. */
async function stage(title, steps, work, done){
  const st = document.createElement('div'); st.className = 'eui-stage';
  st.innerHTML = '<div class="eui-box" role="status" aria-live="polite"><div class="eui-orb"><div class="halo"></div>' +
    '<svg class="ring" viewBox="0 0 96 96"><defs><linearGradient id="euiG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ea7a20"/><stop offset=".65" stop-color="#fb9f42"/><stop offset="1" stop-color="#fb9f42" stop-opacity="0"/></linearGradient></defs><circle cx="48" cy="48" r="44" fill="none" stroke="#f3eee9" stroke-width="4"/><circle cx="48" cy="48" r="44" fill="none" stroke="url(#euiG)" stroke-width="4" stroke-linecap="round" stroke-dasharray="170 400"/></svg>' +
    '<img src="' + esc(LOGO()) + '" alt=""><div class="tick"><i><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></i></div></div>' +
    '<h3>' + esc(title) + '</h3><p class="sub">' + esc(steps[0] || '') + '</p><div class="eui-pb"><i></i></div><ul>' +
    steps.map(s => '<li><span class="s"></span><span>' + esc(s) + '</span></li>').join('') + '</ul></div>';
  document.body.appendChild(st);
  const lis = [...st.querySelectorAll('li')], bar = st.querySelector('.eui-pb i'), sub = st.querySelector('.sub'), orb = st.querySelector('.eui-orb');
  let i = 0, manual = false, running = true;
  const paint = () => { lis.forEach((li, k) => { if (li.classList.contains('skip')) return; li.className = k < i ? 'ok' : k === i ? 'on' : ''; }); bar.style.width = Math.min(94, Math.max(4, ((i + .5) / Math.max(1, steps.length)) * 100)) + '%'; };
  const go = (k, text) => { manual = true; i = Math.max(i, Math.min(k, steps.length - 1)); paint(); sub.textContent = text || (steps[i] ? steps[i] + '…' : ''); sub.style.color = ''; };
  go.text = t => { sub.textContent = t; };
  go.skip = k => { if (lis[k]) lis[k].className = 'skip'; };
  go.bar = f => { bar.style.width = Math.max(4, Math.min(96, f * 100)) + '%'; };
  paint(); sub.textContent = (steps[0] || '') + (steps[0] ? '…' : '');
  const timer = setInterval(() => { if (running && !manual && i < steps.length - 1){ i++; paint(); sub.textContent = steps[i] + '…'; } }, Math.max(700, 2600 / Math.max(1, steps.length)));
  const t0 = Date.now();
  try{
    const out = await work(go);
    running = false; clearInterval(timer);
    if (Date.now() - t0 < 900) await sleep(900 - (Date.now() - t0));
    i = steps.length; lis.forEach(li => { if (!li.classList.contains('skip')) li.className = 'ok'; }); bar.style.width = '100%';
    orb.classList.add('done'); sub.textContent = typeof done === 'function' ? done(out) : (done || 'Done');
    const r = orb.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2);
    await sleep(850);
    st.classList.add('out'); setTimeout(() => st.remove(), 330);
    return out;
  }catch(err){
    running = false; clearInterval(timer);
    orb.classList.add('done', 'fail');
    orb.querySelector('.tick i').innerHTML = '<svg viewBox="0 0 24 24" style="stroke-dashoffset:0"><path d="M7 7l10 10M17 7 7 17"/></svg>';
    sub.textContent = (err && err.message) || 'Something went wrong.'; sub.style.color = '#c0353a';
    lis.forEach(li => { if (li.classList.contains('on')) li.className = ''; });
    await sleep(1900);
    st.classList.add('out'); setTimeout(() => st.remove(), 330);
    throw err;
  }
}

/* ---------- modal ---------- */
function modal(html, opts){
  opts = opts || {};
  const b = document.createElement('div'); b.className = 'eui-back';
  b.innerHTML = '<div class="eui-modal' + (opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div>';
  document.body.appendChild(b);
  const close = () => { b.style.transition = 'opacity .18s'; b.style.opacity = 0; setTimeout(() => b.remove(), 180); document.removeEventListener('keydown', k); if (opts.onClose) opts.onClose(); };
  const k = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', k);
  b.addEventListener('mousedown', e => { if (e.target === b) close(); });
  b.querySelectorAll('[data-close]').forEach(x => x.addEventListener('click', close));
  setTimeout(() => { const f = b.querySelector('input:not([type=checkbox]):not([readonly]),textarea'); if (f) f.focus(); }, 60);
  return {el: b, close};
}

/* ---------- tracker ---------- */
const tracker = () => { const s = (state.settings && state.settings.aiTracker) || {}; return {url: s.url || '', key: s.key || ''}; };
const hasTracker = () => { const t = tracker(); return !!(t.url && t.key); };
async function tget(params){
  const s = tracker();
  const q = Object.assign({key: s.key}, params);
  const qs = Object.keys(q).filter(k => q[k] != null && q[k] !== '').map(k => encodeURIComponent(k) + '=' + encodeURIComponent(q[k])).join('&');
  const res = await fetch(s.url + (s.url.indexOf('?') > -1 ? '&' : '?') + qs, {redirect: 'follow'});
  if (!res.ok) throw new Error('The tracker answered with HTTP ' + res.status + '.');
  const j = await res.json().catch(() => { throw new Error('The tracker did not return data.'); });
  if (j && j.error) throw new Error(j.error === 'unauthorized' ? 'The tracker did not accept this key.' : j.error);
  return j;
}
async function tpost(body){
  const s = tracker();
  const res = await fetch(s.url, {method: 'POST', body: JSON.stringify(Object.assign({key: s.key}, body)), redirect: 'follow'});
  if (!res.ok) throw new Error('The tracker answered with HTTP ' + res.status + '.');
  const j = await res.json().catch(() => { throw new Error('The tracker did not return data.'); });
  if (j && j.error) throw new Error(j.error === 'unauthorized' ? 'The tracker did not accept this key.' : j.error);
  return j;
}
const trackerClient = c => ({
  id: c.id, name: c.name || '', website: c.website, status: c.status || '',
  keywords: (c.keywords || []).slice(0, 60).map(k => ({text: k.text || '', location: ((k.locations || [])[0] || {}).label || '',
    locations: (k.locations || []).slice(0, 5).map(l => ({label: l.label || '', lat: l.lat == null ? null : l.lat, lng: l.lng == null ? null : l.lng}))}))
});

/* ---------- logos ---------- */
const googleIcon = d => 'https://www.google.com/s2/favicons?sz=128&domain=' + encodeURIComponent(d);
/* {logo, icon, candidates[], cms, title}. Falls back to Google's icon service when the tracker
   can't help (not connected yet, or an older tracker without the logo finder). */
async function findLogo(domain){
  if (hasTracker()){
    try{
      const r = await tpost({action: 'logo', domain});
      if (r && r.ok) { if (!r.candidates) r.candidates = []; r.candidates.push({url: googleIcon(domain), why: 'Google icon'}); return r; }
    }catch(e){ /* fall through */ }
  }
  return {logo: '', icon: googleIcon(domain), candidates: [{url: googleIcon(domain), why: 'Google icon'}], cms: '', title: ''};
}
const refreshClientViews = c => {
  try{ if (typeof renderSeoProfileHead === 'function') renderSeoProfileHead(c); }catch(e){}
  try{ if (typeof renderSeoTree === 'function') renderSeoTree(); }catch(e){}
  try{ if (typeof renderSeoAll === 'function') renderSeoAll(); }catch(e){}
};
function setLogo(c, url){
  c.logoUrl = url || '';
  const inp = $('seoLogoUrl'); if (inp && typeof activeSeoClient === 'function' && activeSeoClient() === c) inp.value = c.logoUrl;
  try{ save(); }catch(e){}
  refreshClientViews(c);
}
/* A grid of what was found; clicking one saves it. */
function logoPicker(c, found){
  const cands = [], seen = {};
  (found.candidates || []).forEach(x => { if (x.url && !seen[x.url]){ seen[x.url] = 1; cands.push(x); } });
  const m = modal('<h2>Choose ' + esc(c.name || 'the client') + '’s logo</h2><p class="s">Found on ' + esc(normDomain(c.website)) + '. Pick the one that reads best; you can change it any time.</p>' +
    '<div class="eui-pick">' + cands.map((x, i) => '<button type="button" data-u="' + i + '"' + (x.url === c.logoUrl ? ' class="on"' : '') + '><img src="' + esc(x.url) + '" alt="" referrerpolicy="no-referrer" onerror="this.closest(\'button\').remove()"><small>' + esc(x.why || '') + '</small></button>').join('') +
    '<button type="button" class="none" data-u="-1">Use initials</button></div>' +
    '<div class="mf"><button class="eui-btn" type="button" data-close>Close</button></div>', {wide: true});
  m.el.querySelectorAll('[data-u]').forEach(b => b.addEventListener('click', () => {
    const k = Number(b.dataset.u); setLogo(c, k < 0 ? '' : cands[k].url); m.close(); note(k < 0 ? 'Showing initials' : 'Logo saved');
  }));
}
async function findLogoFor(c, quiet){
  const d = normDomain(c.website);
  if (d.indexOf('.') < 0){ note('Add the client’s website first', 'err'); return; }
  const r = await stage('Finding ' + (c.name || 'the') + '’s logo', ['Reading ' + d, 'Looking for the brand logo', 'Checking the images'], async go => {
    go(0); const x = await findLogo(d); go(2); return x;
  }, x => x.logo ? 'Found their logo' : 'Found their icon').catch(() => null);
  if (!r) return;
  if (!c.cms && r.cms){ c.cms = r.cms; const ci = $('seoCms'); if (ci) ci.value = r.cms; }
  if (quiet && (r.logo || r.icon)) { setLogo(c, r.logo || r.icon); return; }
  logoPicker(c, r);
}
/* Every client with a website and no logo yet. */
async function findMissingLogos(){
  const list = (state.seoClients || []).filter(c => !String(c.logoUrl || '').trim() && normDomain(c.website).indexOf('.') > 0);
  if (!list.length){ note('Every client with a website already has a logo'); return; }
  let found = 0;
  await stage('Finding ' + list.length + ' logo' + (list.length === 1 ? '' : 's'), ['Reading each website', 'Looking for the brand logos', 'Saving them'], async go => {
    for (let i = 0; i < list.length; i++){
      const c = list[i]; go(i < list.length / 2 ? 0 : 1, (i + 1) + ' of ' + list.length + ' · ' + (c.name || normDomain(c.website))); go.bar((i + .5) / list.length);
      try{ const r = await findLogo(normDomain(c.website)); const u = r.logo || (r.icon && r.icon.indexOf('google.com/s2') < 0 ? r.icon : ''); if (u){ c.logoUrl = u; found++; } if (!c.cms && r.cms) c.cms = r.cms; }catch(e){}
    }
    go(2); try{ save(); }catch(e){} refreshClientViews(typeof activeSeoClient === 'function' ? activeSeoClient() : null);
  }, () => found + ' logo' + (found === 1 ? '' : 's') + ' found').catch(() => {});
}

/* ---------- new client ---------- */
function leadsList(){ const s = new Set(); (state.seoClients || []).forEach(c => { if (c.projectLead) s.add(c.projectLead); }); return [...s].sort(); }
function newClient(){
  const m = modal('<h2>New client</h2><p class="s">Name and website are all it takes. The logo, Google Analytics, Search Console and the forms snippet are checked for you right after.</p><form novalidate>' +
    '<label class="f">Client name</label><input class="in" name="name" placeholder="e.g. Black Rock Garage" autocomplete="off">' +
    '<label class="f">Website</label><input class="in" name="site" placeholder="blackrockgarage.ca" autocomplete="off" inputmode="url">' +
    '<div class="row2"><div><label class="f">Project lead <small>optional</small></label><input class="in" name="lead" list="euiLeads" autocomplete="off"><datalist id="euiLeads">' + leadsList().map(l => '<option value="' + esc(l) + '">').join('') + '</datalist></div>' +
    '<div><label class="f">Status</label><select class="in" name="status"><option>Active</option><option>Onboarding</option><option>Paused</option></select></div></div>' +
    '<div class="err" hidden></div><div class="mf"><button type="button" class="eui-btn" data-close>Cancel</button><button class="eui-btn pri" type="submit">' + ic('plus') + 'Add client</button></div></form>');
  const f = m.el.querySelector('form'), er = m.el.querySelector('.err');
  const fail = t => { er.hidden = false; er.textContent = t; };
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const name = f.name.value.trim(), domain = normDomain(f.site.value), site = domain ? 'https://' + domain : '';
    if (!name) return fail('Give the client a name.');
    if (f.site.value.trim() && domain.indexOf('.') < 0) return fail('That website doesn’t look right. Use something like example.com.');
    const dup = domain && (state.seoClients || []).find(c => normDomain(c.website) === domain);
    if (dup) return fail(dup.name + ' already uses ' + domain + '.');
    m.close();
    await runNewClient({name, site, domain, lead: f.lead.value.trim(), status: f.status.value});
  });
}
async function runNewClient(o){
  const R = {logo: null, ga4: null, gsc: null, snippet: null, tracker: hasTracker(), conn: null, errors: []};
  let c = null;
  const steps = ['Creating ' + o.name, 'Finding their logo', 'Adding them to the tracker', 'Matching Google Analytics', 'Checking Search Console', 'Looking for the forms snippet'];
  try{
    await stage('Setting up ' + o.name, steps, async go => {
      go(0);
      try{ if (typeof ensureSeoState === 'function') ensureSeoState(); }catch(e){}
      c = blankSeoClient(o.name);
      c.website = o.site; c.projectLead = o.lead || ''; c.status = o.status || 'Active';
      state.seoClients.push(c); state.activeSeoClientId = c.id;
      save(); try{ renderSeoTree(); renderSeoAll(); }catch(e){}
      if (!o.domain){ [1, 2, 3, 4, 5].forEach(k => go.skip(k)); return; }
      go(1);
      try{ R.logo = await findLogo(o.domain); const u = R.logo.logo || R.logo.icon; if (u) c.logoUrl = u; if (R.logo.cms) c.cms = R.logo.cms; save(); refreshClientViews(c); }catch(e){ R.errors.push('logo: ' + e.message); }
      if (!R.tracker){ [2, 3, 4, 5].forEach(k => go.skip(k)); return; }
      go(2);
      try{ await tpost({action: 'register', clients: [trackerClient(c)], url: tracker().url}); }catch(e){ R.errors.push(e.message); [3, 4, 5].forEach(k => go.skip(k)); return; }
      go(3);
      try{
        R.conn = await tget({action: 'connections', domain: o.domain});
        const g = R.conn.ga4 || {};
        if (g.property) R.ga4 = {ok: true, name: g.name || g.property};
        else if ((g.suggest || []).length === 1){
          go(3, 'Connecting ' + g.suggest[0].name + '…');
          await tpost({action: 'setGa4', domain: o.domain, property: g.suggest[0].id});
          R.ga4 = {ok: true, auto: true, name: g.suggest[0].name, id: g.suggest[0].id};
        } else R.ga4 = {ok: false, n: (g.suggest || []).length};
      }catch(e){ R.ga4 = {ok: false, err: e.message}; }
      go(4);
      R.gsc = R.conn && R.conn.gsc ? R.conn.gsc : {site: ''};
      go(5);
      try{ R.snippet = await tpost({action: 'checkSnippet', domain: o.domain}); if (!c.cms && R.snippet.cms){ c.cms = R.snippet.cms; save(); } }catch(e){ R.snippet = {error: e.message}; }
      try{ if (window.EDGE_CONN && window.EDGE_CONN.forget) window.EDGE_CONN.forget(o.domain); }catch(e){}
    }, () => o.name + ' is ready');
  }catch(e){ if (!c) return; }
  if (c) summary(c, o, R);
}
function summary(c, o, R){
  const acct = (R.conn && R.conn.account) || 'the tracker’s Google account';
  const row = (cls, icon, title, text, pill, act) => '<div class="r ' + cls + '"><div class="ic">' + ic(icon, 18) + '</div><div class="t"><b>' + esc(title) + '</b><small>' + text + '</small></div>' + (act || '') + (pill ? '<span class="pill">' + esc(pill) + '</span>' : '') + '</div>';
  const logoUrl = c.logoUrl;
  let rows = '';
  rows += row(logoUrl ? 'ok' : 'warn', 'img', 'Logo', logoUrl ? (R.logo && R.logo.logo ? 'Their brand logo, from the website.' : 'Their website icon.') : 'No logo found on the site, so its website icon or initials show. Change it any time.', logoUrl ? 'Found' : 'Initials',
    o.domain ? '<button class="eui-btn sm" type="button" data-x="logo">Change</button>' : '');
  if (!o.domain){
    rows += row('warn', 'globe', 'Website', 'Add the website in Edit to connect Google Analytics, Search Console and forms.', 'Missing');
  } else if (!R.tracker){
    rows += row('warn', 'link', 'Tracker', 'Connect the AI Visibility Tracker (AI Visibility tab → ⚙) to check GA4, Search Console and forms.', 'Not set up');
  } else {
    const g = R.ga4 || {};
    rows += row(g.ok ? 'ok' : 'warn', 'chart', 'Google Analytics', g.ok ? (g.auto ? 'Matched and connected to <b>' + esc(g.name) + '</b>.' : 'Connected to <b>' + esc(g.name) + '</b>.') :
      g.n > 1 ? g.n + ' properties match ' + esc(o.domain) + '. Pick one on the Connections card.' : 'No GA4 property for ' + esc(o.domain) + ' is shared with <b>' + esc(acct) + '</b> yet.', g.ok ? 'Connected' : g.n > 1 ? 'Pick one' : 'Share it',
      g.ok ? '' : '<button class="eui-btn sm" type="button" data-x="acct">' + ic('copy') + 'Copy email</button>');
    const sc = R.gsc || {};
    rows += row(sc.site ? 'ok' : 'warn', 'search', 'Search Console', sc.site ? 'Reading <b>' + esc(sc.site) + '</b>.' : 'Share the property with <b>' + esc(acct) + '</b> (Settings → Users and permissions → Add user, Restricted).', sc.site ? 'Connected' : 'Share it',
      sc.site ? '' : '<button class="eui-btn sm" type="button" data-x="acct">' + ic('copy') + 'Copy email</button>');
    const sn = R.snippet || {};
    rows += row(sn.found ? 'ok' : 'warn', 'code', 'Website forms', sn.found ? 'The forms snippet is on the site, so new submissions come in on their own.' : sn.wrongDomain ? 'A snippet for another domain is on the site. Replace it with this client’s.' : 'Add the snippet once and every form submission comes in on its own.' + (sn.cms ? ' The site runs ' + esc(sn.cms) + '.' : ''), sn.found ? 'Live' : 'Add snippet',
      sn.found ? '' : '<button class="eui-btn sm pri" type="button" data-x="snippet">' + ic('code') + 'Get snippet</button>');
  }
  const m = modal('<div class="eui-hero"><div class="eui-logo">' + (logoUrl ? '<img src="' + esc(logoUrl) + '" alt="" referrerpolicy="no-referrer">' : esc((o.name.match(/\b\w/g) || ['?']).slice(0, 2).join('').toUpperCase())) + '</div>' +
    '<div><h2>' + esc(o.name) + ' is set up</h2><p class="s" style="margin:4px 0 0">' + esc(o.domain || 'No website yet') + '</p></div></div>' +
    '<div class="eui-sum">' + rows + '</div>' +
    (R.errors.length ? '<div class="err">' + esc(R.errors.join(' · ')) + '</div>' : '') +
    '<div class="mf"><button class="eui-btn pri" type="button" data-close>Open ' + esc(o.name) + '</button></div>', {wide: true, onClose: () => { try{ renderSeoAll(); }catch(e){} }});
  m.el.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', async () => {
    const x = b.dataset.x;
    if (x === 'logo') logoPicker(c, R.logo || await findLogo(o.domain));
    if (x === 'acct'){ try{ await navigator.clipboard.writeText(acct); b.innerHTML = ic('check') + 'Copied'; const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top); }catch(e){ note(acct); } }
    if (x === 'snippet' && window.EDGE_CONN && window.EDGE_CONN.snippetModal) window.EDGE_CONN.snippetModal(c);
  }));
}

/* ---------- hooks into the page ---------- */
function rebind(id, fn){
  const old = $(id); if (!old || old.dataset.eui) return;
  const nb = old.cloneNode(true); nb.dataset.eui = '1';
  old.parentNode.replaceChild(nb, old);
  nb.addEventListener('click', e => { e.preventDefault(); fn(); });
}
function hookAdd(){
  if (typeof blankSeoClient !== 'function') return;
  rebind('seoAddClientBtn', newClient);
  rebind('seoEmptyAddBtn', newClient);
  /* "Find missing logos", next to the add button */
  const add = $('seoAddClientBtn');
  if (add && !$('euiLogosBtn')){
    const b = document.createElement('button'); b.type = 'button'; b.id = 'euiLogosBtn'; b.className = add.className; b.title = 'Find the logo of every client that has a website and no logo yet';
    b.innerHTML = ic('wand', 14) + (add.textContent.trim().length > 3 ? '<span>Logos</span>' : '');
    b.style.marginLeft = '6px';
    add.insertAdjacentElement('afterend', b);
    b.addEventListener('click', findMissingLogos);
  }
}
function hookLogoField(){
  const inp = $('seoLogoUrl'); if (!inp || $('euiFindLogo')) return;
  const b = document.createElement('button'); b.type = 'button'; b.id = 'euiFindLogo'; b.className = 'eui-btn sm eui-logo-btn'; b.innerHTML = ic('wand') + 'Find automatically';
  inp.insertAdjacentElement('afterend', b);
  b.addEventListener('click', () => { const c = typeof activeSeoClient === 'function' ? activeSeoClient() : null; if (c) findLogoFor(c, false); });
}
function hookRunbar(){
  const add = (id, k) => { const b = $(id); if (b && !b.querySelector('svg')) b.insertAdjacentHTML('afterbegin', ic(k)); };
  add('autoScanBtn', 'play'); add('buildBtn', 'paste'); add('stopAutoBtn', 'stop'); add('retryFailedBtn', 'redo');
  const stop = $('stopAutoBtn');
  if (stop && stop.parentNode && !stop.parentNode.querySelector('.eui-sep')){ /* keep Paste mode / Stop / Re-check in one tidy group */ }
}
function hookAll(){ try{ hookAdd(); }catch(e){} try{ hookLogoField(); }catch(e){} try{ hookRunbar(); }catch(e){} }
hookAll();
setTimeout(hookAll, 600);
setInterval(hookAll, 3000);

window.edgeStage = stage;
window.edgeModal = modal;
window.edgeBurst = burst;
window.EDGE_UI = {stage, modal, burst, findLogo, findLogoFor, logoPicker, findMissingLogos, newClient, ic};
})();
