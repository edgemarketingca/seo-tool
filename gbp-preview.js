/* ==========================================================================
   GBP · Preview results
     The map results one grid point saw, drawn the way Google Maps draws them:
     a search panel on the left with every listing in Google's order (the
     client's own listing marked with its position), and the map on the right
     with the whole grid on it. Click a listing for its place panel; click any
     other point on the map (or use the arrow keys) to see that point's list.
     Everything comes from what the scan saved, so opening it costs no search;
     every name, Website and Directions button is a real link, and "Open in
     Google Maps" opens the live search at exactly this point.
     Listing detail (rating, category, address, website, phone) is kept for the
     first 12 listings of the newest scan; older scans show what they kept.
   ========================================================================== */
(function(){
'use strict';
if (window.EDGE_gbpPreview) return;

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const RM = () => { try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
const A = 'target="_blank" rel="noopener noreferrer"';
const href = u => { u = String(u || ''); if (!u) return ''; return /^https?:\/\//i.test(u) ? u : 'https://' + u; };
const host = u => String(u || '').replace(/^[a-z]+:\/\//i, '').replace(/^www\./, '').split('/')[0];
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const fmtN = n => Number(n).toLocaleString('en-CA');
const when = ts => { try{ return new Date(ts).toLocaleDateString('en-CA', {month: 'short', day: 'numeric', year: 'numeric'}); }catch(e){ return ''; } };

const I = {
  x: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="m14.5 14.5 5.5 5.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="m12 17.3 6.2 3.7-1.6-7 5.4-4.7-7.1-.6L12 2 9.1 8.7 2 9.3l5.4 4.7-1.6 7z"/></svg>',
  web: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.9a15.7 15.7 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a8.2 8.2 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4H4.3zm.8 2h2.9c.3 1.3.8 2.5 1.4 3.6A8 8 0 0 1 5.1 16zM8 8H5.1a8 8 0 0 1 4.3-3.6C8.8 5.5 8.3 6.7 8 8zm4 12c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4zm.3 5.6c.6-1.1 1.1-2.3 1.4-3.6h2.9a8 8 0 0 1-4.3 3.6zm1.8-5.6a16.5 16.5 0 0 0 0-4h3.4a8.2 8.2 0 0 1 0 4h-3.4z"/></svg>',
  dir: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M21.7 11.3 12.7 2.3a1 1 0 0 0-1.4 0l-9 9a1 1 0 0 0 0 1.4l9 9a1 1 0 0 0 1.4 0l9-9a1 1 0 0 0 0-1.4zM14 14.5V12h-4v3H8v-4a1 1 0 0 1 1-1h5V7.5l3.5 3.5-3.5 3.5z"/></svg>',
  call: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M18 16.1c-.8 0-1.4.3-2 .8l-7.1-4.1a3 3 0 0 0 0-1.6L16 7.1A3 3 0 1 0 15 5c0 .3 0 .5.1.8L8 9.9a3 3 0 1 0 0 4.2l7.1 4.2-.1.7a3 3 0 1 0 3-2.9z"/></svg>',
  ext: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M14 3v2h3.6l-9.8 9.8 1.4 1.4L19 6.4V10h2V3h-7zm5 16H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7z"/></svg>',
  l: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4-4.6-4.6z"/></svg>',
  r: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M8.6 16.6 13.2 12 8.6 7.4 10 6l6 6-6 6z"/></svg>',
  me: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="currentColor"/></svg>'
};
const stars = v => { const n = Math.round(Number(v) * 2) / 2; let h = ''; for (let i = 1; i <= 5; i++) h += '<i class="' + (n >= i ? 'f' : n >= i - .5 ? 'h' : '') + '">' + I.star + '</i>'; return h; };
const rankCol = r => !r ? '#9aa0a6' : r <= 3 ? '#0f9d58' : r <= 10 ? '#f4b400' : r <= 20 ? '#f57c00' : '#db4437';

/* ---------- styles (own scope, so it looks the same everywhere) ---------- */
const CSS = `
.gm-back{position:fixed;inset:0;z-index:10060;background:rgba(32,33,36,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:grid;place-items:center;padding:18px;opacity:0;transition:opacity .25s ease;font-family:Roboto,Arial,sans-serif}
.gm-back.on{opacity:1}
.gm{position:relative;width:min(1400px,100%);height:min(880px,100%);background:#fff;border-radius:16px;overflow:hidden;display:grid;grid-template-columns:410px 1fr;box-shadow:0 30px 80px -20px rgba(0,0,0,.5);transform:translateY(14px) scale(.985);transition:transform .4s cubic-bezier(.2,.8,.2,1)}
.gm-back.on .gm{transform:none}
.gm *{box-sizing:border-box}
.gm a{color:inherit;text-decoration:none}
.gm-side{position:relative;display:flex;flex-direction:column;min-height:0;border-right:1px solid #e8eaed;background:#fff;z-index:2;box-shadow:2px 0 6px rgba(60,64,67,.12)}
.gm-top{padding:14px 14px 8px;flex:none}
.gm-box{display:flex;align-items:center;gap:6px;height:48px;border-radius:24px;padding:0 6px 0 16px;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.2),0 -1px 0 rgba(0,0,0,.02)}
.gm-box b{flex:1;min-width:0;font:400 15px Roboto,Arial,sans-serif;color:#202124;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gm-box .ic{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:#5f6368;flex:none;border:0;background:none;cursor:pointer}
.gm-box .ic:hover{background:#f1f3f4}
.gm-box .ic svg{width:20px;height:20px}
.gm-box .sep{width:1px;height:24px;background:#dadce0}
.gm-box .ic.go{color:#1a73e8}
.gm-chips{display:flex;gap:8px;overflow-x:auto;padding:12px 2px 4px;scrollbar-width:none}
.gm-chips button{flex:none;height:32px;padding:0 13px;border-radius:16px;border:1px solid #dadce0;background:#fff;font:500 13.5px Roboto,Arial,sans-serif;color:#3c4043;cursor:pointer;transition:background .15s,border-color .15s}
.gm-chips button:hover{background:#f8f9fa}
.gm-chips button.on{background:#e8f0fe;border-color:#e8f0fe;color:#1967d2}
.gm-where{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 18px 10px;font:400 13px Roboto,Arial,sans-serif;color:#70757a;border-bottom:1px solid #e8eaed;flex:none}
.gm-where b{color:#202124;font-weight:500}
.gm-list{flex:1;min-height:0;overflow-y:auto;scrollbar-width:thin}
.gm-h{padding:16px 24px 6px;font:500 20px Roboto,Arial,sans-serif;color:#202124}
.gm-it{position:relative;display:block;padding:14px 24px 16px;border-bottom:1px solid #e8eaed;cursor:pointer;animation:gmIn .35s cubic-bezier(.2,.8,.2,1) both;transition:background .12s}
.gm-it:hover{background:#f8f9fa}
.gm-it.me{background:#e8f0fe;box-shadow:inset 4px 0 0 #1a73e8}
.gm-it.me:hover{background:#dde8fd}
.gm-it .tag{display:inline-flex;align-items:center;gap:5px;font:500 12px Roboto,Arial,sans-serif;color:#1967d2;margin-bottom:6px}
.gm-it .tag svg{width:14px;height:14px}
.gm-it .n{display:flex;gap:10px;align-items:baseline;font:500 16px/1.3 Roboto,Arial,sans-serif;color:#202124}
.gm-it .n em{font-style:normal;flex:none;font:500 12px Roboto,Arial,sans-serif;color:#70757a;min-width:20px}
.gm-it .sp{display:inline-block;font:700 12px Roboto,Arial,sans-serif;color:#202124;margin-bottom:3px}
.gm-rt{display:flex;align-items:center;gap:5px;font:400 14px Roboto,Arial,sans-serif;color:#70757a;margin-top:3px;flex-wrap:wrap}
.gm-rt .v{color:#3c4043}
.gm-st{display:inline-flex;align-items:center;height:16px}
.gm-rt>span{display:inline-flex;align-items:center;height:18px;line-height:18px}
.gm-st i{width:14px;height:14px;color:#dadce0;display:block;margin:auto 0;flex:none}
.gm-st i.f{color:#fbbc04}
.gm-st i.h{color:#fbbc04;clip-path:inset(0 50% 0 0);position:relative}
.gm-st svg{width:14px;height:14px;display:block}
.gm-l2{font:400 14px Roboto,Arial,sans-serif;color:#70757a;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gm-acts{display:flex;gap:8px;margin-top:10px}
.gm-acts a{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 13px;border-radius:16px;border:1px solid #dadce0;font:500 13.5px Roboto,Arial,sans-serif;color:#1a73e8;background:#fff;transition:background .15s}
.gm-acts a:hover{background:#f6fafe}
.gm-acts svg{width:16px;height:16px}
.gm-none{padding:28px 24px;color:#70757a;font:400 14px/1.5 Roboto,Arial,sans-serif}
.gm-more{padding:16px 24px 22px;font:400 13px/1.5 Roboto,Arial,sans-serif;color:#70757a}
.gm-more a{color:#1a73e8}
/* place panel */
.gm-place{position:absolute;inset:0;background:#fff;z-index:3;display:flex;flex-direction:column;transform:translateX(-12px);opacity:0;transition:transform .3s cubic-bezier(.2,.8,.2,1),opacity .2s;pointer-events:none}
.gm-place.on{transform:none;opacity:1;pointer-events:auto}
.gm-ph{position:relative;height:150px;flex:none;background:linear-gradient(135deg,#e8f0fe,#f1f8e9);display:grid;place-items:center;overflow:hidden}
.gm-ph::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(26,115,232,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(26,115,232,.08) 1px,transparent 1px);background-size:22px 22px}
.gm-ph .big{position:relative;width:64px;height:64px;border-radius:50%;background:#fff;display:grid;place-items:center;font:500 26px Roboto,Arial,sans-serif;color:#1a73e8;box-shadow:0 4px 14px rgba(60,64,67,.25)}
.gm-ph .big img{width:70%;height:70%;object-fit:contain;border-radius:50%}
.gm-ph .bk{position:absolute;left:12px;top:12px;width:40px;height:40px;border-radius:50%;border:0;background:#fff;color:#3c4043;display:grid;place-items:center;cursor:pointer;box-shadow:0 1px 3px rgba(60,64,67,.3)}
.gm-ph .bk svg{width:20px;height:20px}
.gm-pb{padding:18px 24px 6px;overflow-y:auto;flex:1}
.gm-pb h2{margin:0;font:400 24px/1.25 Roboto,Arial,sans-serif;color:#202124}
.gm-pb .cat{font:400 14px Roboto,Arial,sans-serif;color:#70757a;margin-top:4px}
.gm-pb .pos{display:inline-flex;align-items:center;gap:8px;margin-top:12px;padding:6px 12px;border-radius:8px;font:500 13px Roboto,Arial,sans-serif;background:#f1f3f4;color:#202124}
.gm-pb .pos i{width:10px;height:10px;border-radius:50%}
.gm-circ{display:flex;justify-content:space-around;padding:16px 0;margin:14px -24px 0;border-top:1px solid #e8eaed;border-bottom:1px solid #e8eaed}
.gm-circ a,.gm-circ button{display:flex;flex-direction:column;align-items:center;gap:7px;font:500 12.5px Roboto,Arial,sans-serif;color:#1a73e8;border:0;background:none;cursor:pointer;min-width:64px}
.gm-circ span{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;border:1px solid #dadce0;transition:background .15s}
.gm-circ a:first-child span{background:#1a73e8;border-color:#1a73e8;color:#fff}
.gm-circ a:hover span,.gm-circ button:hover span{background:#e8f0fe}
.gm-circ a:first-child:hover span{background:#1765cc}
.gm-circ svg{width:18px;height:18px}
.gm-rows{padding:6px 0}
.gm-rows a,.gm-rows div{display:flex;align-items:center;gap:22px;padding:12px 0;font:400 14px Roboto,Arial,sans-serif;color:#3c4043}
.gm-rows a:hover{color:#1a73e8}
.gm-rows svg{width:20px;height:20px;color:#1a73e8;flex:none}
.gm-note{font:400 12.5px/1.5 Roboto,Arial,sans-serif;color:#70757a;padding:8px 0 18px}
/* map */
.gm-map{position:relative;overflow:hidden;background:#e5e3df;cursor:grab}
.gm-map.drag{cursor:grabbing}
.gm-tiles{position:absolute;left:50%;top:50%;width:0;height:0}
.gm-tiles img{position:absolute;width:256px;height:256px;user-select:none;-webkit-user-drag:none;pointer-events:none}
.gm-dot{position:absolute;transform:translate(-50%,-50%);width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font:700 11.5px Roboto,Arial,sans-serif;color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:pointer;transition:transform .2s cubic-bezier(.2,.8,.2,1),box-shadow .2s}
.gm-dot:hover{transform:translate(-50%,-50%) scale(1.15)}
.gm-dot.on{transform:translate(-50%,-50%) scale(1.3);box-shadow:0 0 0 4px rgba(26,115,232,.35),0 2px 8px rgba(0,0,0,.4);z-index:2}
.gm-dot.on::after{content:"";position:absolute;inset:-12px;border-radius:50%;border:2px solid rgba(26,115,232,.6);animation:gmPulse 1.8s ease-out infinite}
@keyframes gmPulse{from{transform:scale(.6);opacity:1}to{transform:scale(1.4);opacity:0}}
.gm-biz{position:absolute;transform:translate(-50%,-100%);color:#ea4335;width:34px;height:46px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));pointer-events:none;z-index:3}
.gm-biz svg{width:100%;height:100%}
.gm-mtop{position:absolute;left:16px;right:16px;top:16px;display:flex;align-items:center;gap:10px;z-index:4;pointer-events:none}
.gm-card{pointer-events:auto;display:flex;align-items:center;gap:12px;background:#fff;border-radius:8px;padding:8px 8px 8px 14px;box-shadow:0 1px 4px rgba(0,0,0,.3);font:400 13px Roboto,Arial,sans-serif;color:#3c4043}
.gm-card b{font-weight:500;color:#202124}
.gm-card .rk{display:inline-grid;place-items:center;min-width:26px;height:26px;padding:0 6px;border-radius:13px;font:700 12px Roboto,Arial,sans-serif;color:#fff}
.gm-nav{display:inline-flex;border-left:1px solid #e8eaed;padding-left:6px;gap:2px}
.gm-nav button{width:32px;height:32px;border-radius:50%;border:0;background:none;color:#5f6368;cursor:pointer;display:grid;place-items:center}
.gm-nav button:hover{background:#f1f3f4}
.gm-nav svg{width:20px;height:20px}
.gm-sp{flex:1}
.gm-open{pointer-events:auto;display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 16px;border-radius:20px;background:#fff;color:#1a73e8 !important;font:500 14px Roboto,Arial,sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.3)}
.gm-open:hover{background:#f6fafe}
.gm-open svg{width:18px;height:18px}
.gm-x{pointer-events:auto;width:40px;height:40px;border-radius:50%;border:0;background:#fff;color:#3c4043;display:grid;place-items:center;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.3)}
.gm-x svg{width:22px;height:22px}
.gm-leg{position:absolute;left:16px;bottom:16px;z-index:4;display:flex;gap:12px;background:#fff;border-radius:8px;padding:8px 12px;box-shadow:0 1px 4px rgba(0,0,0,.3);font:400 12px Roboto,Arial,sans-serif;color:#3c4043}
.gm-leg span{display:inline-flex;align-items:center;gap:5px}
.gm-leg i{width:10px;height:10px;border-radius:50%}
.gm-attr{position:absolute;right:6px;bottom:4px;z-index:4;font:400 10px Arial,sans-serif;color:#5f6368;background:rgba(255,255,255,.75);padding:1px 5px;border-radius:3px}
.gm-zoom{position:absolute;right:16px;bottom:30px;z-index:4;display:flex;flex-direction:column;background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.3);overflow:hidden}
.gm-zoom button{width:40px;height:40px;border:0;background:#fff;font:400 22px Roboto,Arial,sans-serif;color:#5f6368;cursor:pointer}
.gm-zoom button:hover{background:#f1f3f4}
.gm-zoom button+button{border-top:1px solid #e8eaed}
@keyframes gmIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (max-width:860px){.gm{grid-template-columns:1fr;grid-template-rows:42% 58%}.gm-side{order:2;border-right:0}.gm-mtop .gm-card .w{display:none}}
@media (prefers-reduced-motion:reduce){.gm-it,.gm-dot.on::after{animation:none}.gm-back,.gm,.gm-place{transition:none}}
`;
function styles(D){ if (D.getElementById('gmCss')) return; const st = D.createElement('style'); st.id = 'gmCss'; st.textContent = CSS; D.head.appendChild(st); }

/* ---------- map maths (Web Mercator, like the keyword preview) ---------- */
const TS = 256;
const wx = (lng, z) => (lng + 180) / 360 * TS * Math.pow(2, z);
const wy = (lat, z) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * TS * Math.pow(2, z); };

/* ---------- which listing is the client ---------- */
function isMe(name, i, p, biz){
  if (p.rank >= 1 && !p.matchedViaAd) return i === p.rank - 1;
  if (p.matched && norm(p.matched) === norm(name)) return true;
  return !!(biz && biz.name && norm(biz.name) === norm(name));
}

function open(scan, startIdx){
  if (!scan || !Array.isArray(scan.points) || !scan.points.length) return;
  const D = document;
  styles(D);
  const old = D.getElementById('gmPreview'); if (old) old.remove();
  const pts = scan.points, biz = scan.business || {};
  const L = biz.listing && biz.listing.lat != null ? biz.listing : null;
  let idx = Math.max(0, Math.min(pts.length - 1, Number(startIdx) || 0));
  let filter = '', placeOpen = -1;
  /* the map: fit the grid, then pan and zoom freely */
  const lats = pts.map(p => p.lat).concat(L ? [L.lat] : []), lngs = pts.map(p => p.lng).concat(L ? [L.lng] : []);
  const cLat = (Math.max(...lats) + Math.min(...lats)) / 2, cLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;
  const view = {lat: cLat, lng: cLng, z: 13, dx: 0, dy: 0};

  const back = D.createElement('div'); back.className = 'gm-back'; back.id = 'gmPreview';
  back.innerHTML = '<div class="gm" role="dialog" aria-modal="true" aria-label="Map results preview">' +
    '<aside class="gm-side"><div class="gm-top"><div class="gm-box"><b>' + esc(scan.keyword || '') + '</b><button type="button" class="ic go" title="Search this on Google Maps" data-live>' + I.search + '</button><span class="sep"></span><button type="button" class="ic" data-close title="Close (Esc)">' + I.x + '</button></div>' +
    '<div class="gm-chips" data-chips><button type="button" data-f="rated">' + 'Rated 4.5+' + '</button><button type="button" data-f="site">Has website</button><button type="button" data-f="reviews">100+ reviews</button></div></div>' +
    '<div class="gm-where" data-where></div><div class="gm-list" data-list></div><div class="gm-place" data-place></div></aside>' +
    '<section class="gm-map" data-map><div class="gm-tiles" data-tiles></div>' +
      '<div class="gm-mtop"><div class="gm-card" data-card></div><span class="gm-sp"></span><a class="gm-open" data-open ' + A + '>' + I.ext + 'Open in Google Maps</a><button type="button" class="gm-x" data-close title="Close (Esc)">' + I.x + '</button></div>' +
      '<div class="gm-leg"><span><i style="background:#0f9d58"></i>1–3</span><span><i style="background:#f4b400"></i>4–10</span><span><i style="background:#f57c00"></i>11–20</span><span><i style="background:#db4437"></i>20+</span><span><i style="background:#9aa0a6"></i>Not found</span></div>' +
      '<div class="gm-zoom"><button type="button" data-z="1" title="Zoom in">+</button><button type="button" data-z="-1" title="Zoom out">−</button></div>' +
      '<span class="gm-attr">Tiles © Esri</span></section></div>';
  D.body.appendChild(back);
  requestAnimationFrame(() => back.classList.add('on'));
  const $ = s => back.querySelector(s);
  const mapEl = $('[data-map]'), tilesEl = $('[data-tiles]');

  /* fit the grid on first draw */
  const fit = () => {
    const r = mapEl.getBoundingClientRect(), W = r.width - 120, H = r.height - 160;
    for (let z = 17; z >= 3; z--){ const w = Math.abs(wx(Math.max(...lngs), z) - wx(Math.min(...lngs), z)), h = Math.abs(wy(Math.min(...lats), z) - wy(Math.max(...lats), z)); if (w <= W && h <= H){ view.z = z; break; } }
    view.dx = 0; view.dy = 30;
  };

  const drawMap = () => {
    const r = mapEl.getBoundingClientRect(), z = view.z;
    const cx = wx(view.lng, z) - view.dx, cy = wy(view.lat, z) - view.dy, W = r.width, H = r.height, n = Math.pow(2, z);
    let h = '';
    for (let tx = Math.floor((cx - W / 2) / TS); tx <= Math.floor((cx + W / 2) / TS); tx++) for (let ty = Math.floor((cy - H / 2) / TS); ty <= Math.floor((cy + H / 2) / TS); ty++){
      if (ty < 0 || ty >= n) continue;
      const x = ((tx % n) + n) % n;
      h += '<img alt="" draggable="false" src="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/' + z + '/' + ty + '/' + x + '" style="left:' + (tx * TS - cx).toFixed(1) + 'px;top:' + (ty * TS - cy).toFixed(1) + 'px">';
    }
    h += pts.map((p, i) => '<span class="gm-dot' + (i === idx ? ' on' : '') + '" data-i="' + i + '" style="left:' + (wx(p.lng, z) - cx).toFixed(1) + 'px;top:' + (wy(p.lat, z) - cy).toFixed(1) + 'px;background:' + rankCol(p.rank) + '" title="' + esc(p.rank ? 'Position ' + p.rank + ' here' : 'Not found here') + '">' + (p.rank || '–') + '</span>').join('');
    if (L) h += '<span class="gm-biz" style="left:' + (wx(L.lng, z) - cx).toFixed(1) + 'px;top:' + (wy(L.lat, z) - cy).toFixed(1) + 'px" title="' + esc(biz.name || '') + '">' + I.pin + '</span>';
    tilesEl.innerHTML = h;
  };

  const listOf = p => {
    const names = Array.isArray(p.names) ? p.names : [], det = Array.isArray(p.det) ? p.det : [];
    const top = Array.isArray(p.top) ? p.top : [];
    return names.map((nm, i) => {
      let d = det[i] || null;
      if (!d && top[i]) d = [top[i].rating, top[i].reviews, top[i].category, null, null, null];
      const me = isMe(nm, i, p, biz);
      if (!d && me && p.self) d = [p.self.rating, p.self.reviews, p.self.category, p.self.address || null, p.self.website || null, p.self.phone || null];
      if (me && d && !d[4] && biz.website) d = d.slice(0, 4).concat([biz.website, d[5] || biz.phone || null]);
      return {i, nm, me, d, ad: false};
    });
  };
  const adsOf = p => (Array.isArray(p.adNames) ? p.adNames : []).slice(0, 3).map((nm, i) => ({i, nm, me: !!(biz.name && norm(biz.name) === norm(nm)), d: (p.adDet || [])[i] || null, ad: true}));
  const area = () => (scan.center && scan.center.label) || '';
  const placeUrl = (it, p) => it.me && (biz.cid || (L && L.cid)) ? 'https://maps.google.com/?cid=' + (biz.cid || L.cid) : 'https://www.google.com/maps/search/' + encodeURIComponent(it.nm) + '/@' + p.lat + ',' + p.lng + ',15z';
  const dirUrl = (it, p) => 'https://www.google.com/maps/dir/?api=1&origin=' + p.lat + ',' + p.lng + '&destination=' + encodeURIComponent(it.nm + (area() ? ' ' + area() : ''));

  const itemHtml = (it, p, k) => {
    const d = it.d || [], rt = d[0], rv = d[1], cat = d[2], ad = d[3], site = d[4], ph = d[5];
    return '<div class="gm-it' + (it.me ? ' me' : '') + '" data-k="' + (it.ad ? 'a' : 'o') + it.i + '" style="animation-delay:' + Math.min(k * 25, 300) + 'ms">' +
      (it.me ? '<div class="tag">' + I.star + 'Your client' + (it.ad ? ' · sponsored' : ' · position ' + (it.i + 1)) + '</div>' : '') +
      (it.ad ? '<span class="sp">Sponsored</span>' : '') +
      '<div class="n">' + (it.ad ? '' : '<em>' + (it.i + 1) + '.</em>') + '<span>' + esc(it.nm) + '</span></div>' +
      (rt != null ? '<div class="gm-rt"><span class="v">' + Number(rt).toFixed(1) + '</span><span class="gm-st">' + stars(rt) + '</span>' + (rv != null ? '<span>(' + fmtN(rv) + ')</span>' : '') + (cat ? '<span>·</span><span>' + esc(cat) + '</span>' : '') + '</div>'
                 : cat ? '<div class="gm-rt"><span>' + esc(cat) + '</span></div>' : '') +
      ((ad || ph) ? '<div class="gm-l2">' + esc([ad, ph].filter(Boolean).join(' · ')) + '</div>' : '') +
      '<div class="gm-acts">' + (site ? '<a ' + A + ' href="' + esc(href(site)) + '" data-stop>' + I.web + 'Website</a>' : '') + '<a ' + A + ' href="' + esc(dirUrl(it, p)) + '" data-stop>' + I.dir + 'Directions</a></div></div>';
  };

  const paintList = () => {
    const p = pts[idx];
    let items = listOf(p);
    const passes = it => { const d = it.d || []; if (filter === 'rated') return d[0] != null && d[0] >= 4.5; if (filter === 'site') return !!d[4]; if (filter === 'reviews') return d[1] != null && d[1] >= 100; return true; };
    const shown = items.filter(passes), ads = filter ? [] : adsOf(p);
    $('[data-where]').innerHTML = '<span>Searched from <b>point ' + (idx + 1) + ' of ' + pts.length + '</b>' + (p.row != null ? ' · row ' + (p.row + 1) + ', col ' + (p.col + 1) : '') + '</span><span>' + esc(when(scan.ts)) + '</span>';
    const L2 = $('[data-list]');
    if (p.error && !items.length){ L2.innerHTML = '<div class="gm-none">This point wasn’t read: ' + esc(p.error) + '</div>'; return; }
    if (!items.length){ L2.innerHTML = '<div class="gm-none">No listings were saved for this point.</div>'; return; }
    L2.innerHTML = '<div class="gm-h">Results</div>' + ads.map((it, k) => itemHtml(it, p, k)).join('') + shown.map((it, k) => itemHtml(it, p, k + ads.length)).join('') +
      (!shown.length ? '<div class="gm-none">No listings here match that filter.</div>' : '') +
      '<div class="gm-more">' + (p.rank ? esc(biz.name || 'Your client') + ' is <b>#' + p.rank + '</b> of ' + items.length + ' here.' : esc(biz.name || 'Your client') + ' wasn’t in the ' + items.length + ' listings read here.') +
      (Array.isArray(p.det) ? '' : ' Ratings and addresses show for the top listings; the next scan keeps them for every listing.') + ' <a ' + A + ' href="' + esc(p.mapsUrl || '#') + '">See it live on Google Maps</a></div>';
    L2.scrollTop = 0;
    const me = L2.querySelector('.gm-it.me');
    if (me && !filter) setTimeout(() => me.scrollIntoView({block: 'center', behavior: RM() ? 'auto' : 'smooth'}), 260);
  };
  const paintCard = () => {
    const p = pts[idx];
    $('[data-card]').innerHTML = '<span class="rk" style="background:' + rankCol(p.rank) + '">' + (p.rank || '–') + '</span><span class="w">' + (p.rank ? esc(biz.name || 'Your client') + ' is <b>#' + p.rank + '</b> here' : '<b>Not found</b> at this point') + '</span>' +
      '<span class="gm-nav"><button type="button" data-step="-1" title="Previous point (←)">' + I.l + '</button><button type="button" data-step="1" title="Next point (→)">' + I.r + '</button></span>';
    $('[data-open]').href = p.mapsUrl || ('https://www.google.com/maps/search/' + encodeURIComponent(scan.keyword || '') + '/@' + p.lat + ',' + p.lng + ',15z');
  };
  const placePanel = it => {
    const p = pts[idx], d = it.d || [], rt = d[0], rv = d[1], cat = d[2], ad = d[3], site = d[4], ph = d[5];
    const pos = it.ad ? 'Sponsored listing' : 'Position ' + (it.i + 1) + ' of ' + (p.names || []).length + ' at this point';
    const ini = String(it.nm || '?').trim().charAt(0).toUpperCase();
    const pl = $('[data-place]');
    pl.innerHTML = '<div class="gm-ph"><button type="button" class="bk" data-pback title="Back to results">' + I.back + '</button><span class="big">' + (site ? '<img alt="" src="https://www.google.com/s2/favicons?sz=128&domain=' + encodeURIComponent(host(site)) + '" onerror="this.replaceWith(document.createTextNode(\'' + esc(ini) + '\'))">' : esc(ini)) + '</span></div>' +
      '<div class="gm-pb"><h2>' + esc(it.nm) + '</h2>' +
        (rt != null ? '<div class="gm-rt"><span class="v">' + Number(rt).toFixed(1) + '</span><span class="gm-st">' + stars(rt) + '</span>' + (rv != null ? '<span>(' + fmtN(rv) + ')</span>' : '') + '</div>' : '') +
        (cat ? '<div class="cat">' + esc(cat) + '</div>' : '') +
        '<div class="pos"><i style="background:' + (it.ad ? '#202124' : rankCol(it.i + 1)) + '"></i>' + esc(pos) + (it.me ? ' · your client' : '') + '</div>' +
        '<div class="gm-circ"><a ' + A + ' href="' + esc(dirUrl(it, p)) + '"><span>' + I.dir + '</span>Directions</a>' +
          (site ? '<a ' + A + ' href="' + esc(href(site)) + '"><span>' + I.web + '</span>Website</a>' : '') +
          (ph ? '<a href="tel:' + esc(String(ph).replace(/[^\d+]/g, '')) + '"><span>' + I.call + '</span>Call</a>' : '') +
          '<a ' + A + ' href="' + esc(placeUrl(it, p)) + '"><span>' + I.pin + '</span>Maps</a>' +
          '<button type="button" data-copy><span>' + I.share + '</span>Share</button></div>' +
        '<div class="gm-rows">' + (ad ? '<div>' + I.pin + '<span>' + esc(ad) + '</span></div>' : '') +
          (site ? '<a ' + A + ' href="' + esc(href(site)) + '">' + I.web + '<span>' + esc(host(site)) + '</span></a>' : '') +
          (ph ? '<a href="tel:' + esc(String(ph).replace(/[^\d+]/g, '')) + '">' + I.call + '<span>' + esc(ph) + '</span></a>' : '') + '</div>' +
        '<div class="gm-note">As Google Maps listed it on ' + esc(when(scan.ts)) + ', searched from point ' + (idx + 1) + '. Open it on Maps for photos, hours and reviews.</div></div>';
    pl.classList.add('on');
    pl.querySelector('[data-pback]').addEventListener('click', () => { pl.classList.remove('on'); placeOpen = -1; });
    pl.querySelector('[data-copy]').addEventListener('click', async e => { const u = placeUrl(it, p); try{ await navigator.clipboard.writeText(u); }catch(err){} const b = e.currentTarget; b.lastChild.textContent = 'Copied'; setTimeout(() => { b.lastChild.textContent = 'Share'; }, 1400); });
  };
  const go = i => {
    idx = (i + pts.length) % pts.length; placeOpen = -1; $('[data-place]').classList.remove('on');
    paintList(); paintCard();
    tilesEl.querySelectorAll('.gm-dot').forEach(d => d.classList.toggle('on', +d.dataset.i === idx));
  };

  /* events */
  const close = () => { back.classList.remove('on'); setTimeout(() => back.remove(), 250); D.removeEventListener('keydown', key, true); removeEventListener('resize', drawMap); };
  const key = e => {
    if (e.key === 'Escape'){ e.stopPropagation(); if ($('[data-place]').classList.contains('on')){ $('[data-place]').classList.remove('on'); return; } close(); }
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')){ e.preventDefault(); go(idx + (e.key === 'ArrowRight' ? 1 : -1)); }
  };
  D.addEventListener('keydown', key, true);
  addEventListener('resize', drawMap);
  back.addEventListener('mousedown', e => { if (e.target === back) close(); });
  back.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  $('[data-live]').addEventListener('click', () => window.open($('[data-open]').href, '_blank', 'noopener'));
  $('[data-chips]').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; filter = filter === b.dataset.f ? '' : b.dataset.f; back.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('on', x.dataset.f === filter)); paintList(); });
  $('[data-list]').addEventListener('click', e => {
    if (e.target.closest('[data-stop]')) return;
    const c = e.target.closest('.gm-it'); if (!c) return;
    const k = c.dataset.k, p = pts[idx], it = k.charAt(0) === 'a' ? adsOf(p)[+k.slice(1)] : listOf(p)[+k.slice(1)];
    if (it){ placeOpen = it.i; placePanel(it); }
  });
  $('[data-card]').addEventListener('click', e => { const b = e.target.closest('[data-step]'); if (b) go(idx + Number(b.dataset.step)); });
  back.querySelectorAll('[data-z]').forEach(b => b.addEventListener('click', () => { const nz = Math.max(3, Math.min(18, view.z + Number(b.dataset.z))); if (nz === view.z) return; const k = Math.pow(2, nz - view.z); view.dx *= k; view.dy *= k; view.z = nz; drawMap(); }));
  /* drag to pan; a click on a dot switches the point */
  let drag = null;
  mapEl.addEventListener('pointerdown', e => { if (e.target.closest('.gm-mtop,.gm-zoom,.gm-leg')) return; drag = {x: e.clientX, y: e.clientY, dx: view.dx, dy: view.dy, moved: false, dot: e.target.closest('.gm-dot')}; mapEl.setPointerCapture(e.pointerId); });
  mapEl.addEventListener('pointermove', e => { if (!drag) return; const mx = e.clientX - drag.x, my = e.clientY - drag.y; if (Math.abs(mx) + Math.abs(my) > 4){ drag.moved = true; mapEl.classList.add('drag'); } if (drag.moved){ view.dx = drag.dx + mx; view.dy = drag.dy + my; drawMap(); } });
  mapEl.addEventListener('pointerup', () => { if (drag && !drag.moved && drag.dot) go(+drag.dot.dataset.i); drag = null; mapEl.classList.remove('drag'); });
  mapEl.addEventListener('wheel', e => { e.preventDefault(); const nz = Math.max(3, Math.min(18, view.z + (e.deltaY < 0 ? 1 : -1))); if (nz === view.z) return; const k = Math.pow(2, nz - view.z); view.dx *= k; view.dy *= k; view.z = nz; drawMap(); }, {passive: false});

  requestAnimationFrame(() => { fit(); drawMap(); go(idx); });
}

/* The results toolbar gets a Preview results button for the keyword in view. */
function toolbar(){
  try{
    if (typeof state === 'undefined' || typeof activeGbp !== 'function') return;
    const run = document.getElementById('autoScanBtn'); if (!run || !run.offsetParent) return;
    let b = document.getElementById('gmPreviewBtn');
    const g = activeGbp(); const k = g && (g.keywords || []).find(x => x.id === g.activeKeywordId);
    const sc = k && (k.scans || []).length ? k.scans[k.scans.length - 1] : null;
    if (!b){
      b = document.createElement('button'); b.type = 'button'; b.id = 'gmPreviewBtn'; b.className = 'btn';
      b.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" style="margin-right:6px;vertical-align:-3px"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>Preview results';
      b.title = 'The map results Google showed at each point of the latest scan';
      b.addEventListener('click', () => {
        const g2 = activeGbp(), k2 = g2 && (g2.keywords || []).find(x => x.id === g2.activeKeywordId), s2 = k2 && k2.scans[k2.scans.length - 1];
        if (!s2) return;
        /* start on the point nearest the middle of the grid */
        let best = 0, bd = Infinity; const c = s2.center || {};
        s2.points.forEach((p, i) => { const d = Math.pow(p.lat - (c.lat || 0), 2) + Math.pow(p.lng - (c.lng || 0), 2); if (d < bd){ bd = d; best = i; } });
        open(s2, best);
      });
      run.parentNode.appendChild(b);
    }
    b.disabled = !sc || !sc.points.some(p => Array.isArray(p.names) && p.names.length);
  }catch(e){}
}
setInterval(toolbar, 1500);

window.EDGE_gbpPreview = (scan, idx) => open(scan, idx);
})();
