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
const logoW = 'portal/img/easyleads-logo-white.png', logoD = 'portal/img/easyleads-logo.png';
const say = (m, k) => { try{ if (typeof toast === 'function') toast(m, k); }catch(e){} };
const IC = {
  arrow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
  swap: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>',
  link: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
  user: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>',
  eye: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  chat: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8M21 3v5h-5"/></svg>'
};

function styles(){
  if (document.getElementById('elwsStyles')) return;
  const st = document.createElement('style'); st.id = 'elwsStyles';
  st.textContent = `
.elws{position:fixed;inset:0;z-index:9000;overflow:auto;font-family:var(--ui,Inter,sans-serif);background:#f3f7fc;}
/* the screen itself is opaque from the first frame; only its content eases in */
.elws-ch,.elws-wrap{animation:elwsIn .45s cubic-bezier(.2,.8,.2,1) both;}
@keyframes elwsIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.elws-choose{background:radial-gradient(900px 520px at 8% -8%,rgba(232,119,34,.10),transparent 60%),radial-gradient(900px 560px at 100% 105%,rgba(29,124,242,.12),transparent 60%),linear-gradient(180deg,#fbfcfe,#f3f6fb);display:flex;align-items:center;justify-content:center;padding:48px 20px;color:#0d1726;}
.elws-ch{width:min(1040px,100%);}
.elws-hello{display:flex;align-items:center;gap:12px;margin-bottom:22px;}
.elws-hello img{height:26px;width:auto;}
.elws-hello .dot{width:4px;height:4px;border-radius:50%;background:#c3ccd8;}
.elws-hello span{font-size:13px;color:#6b7a90;}
.elws-ch h2{font:600 38px var(--display,Poppins,sans-serif);color:#0d1726;letter-spacing:-.025em;margin:0 0 8px;}
.elws-ch p.lead{color:#5b6b80;margin:0 0 34px;font-size:15px;}
.elws-cards{display:grid;grid-template-columns:1fr 1fr;gap:22px;}
@media(max-width:780px){.elws-cards{grid-template-columns:1fr}.elws-ch h2{font-size:30px}}
.elws-card{position:relative;text-align:left;border:1px solid #e3e9f1;border-radius:26px;padding:0;cursor:pointer;color:#0d1726;background:#fff;overflow:hidden;display:flex;flex-direction:column;font:inherit;
  box-shadow:0 1px 2px rgba(13,23,38,.04),0 18px 40px -30px rgba(13,23,38,.35);transition:transform .25s cubic-bezier(.2,.7,.2,1),box-shadow .25s,border-color .25s;}
.elws-card:hover,.elws-card:focus-visible{transform:translateY(-5px);box-shadow:0 2px 4px rgba(13,23,38,.04),0 34px 60px -32px rgba(13,23,38,.45);outline:none;}
.elws-card.edge:hover,.elws-card.edge:focus-visible{border-color:#f3c39a;} .elws-card.el:hover,.elws-card.el:focus-visible{border-color:#a9cdfa;}
.elws-card .hero{position:relative;height:150px;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.elws-card.edge .hero{background:radial-gradient(260px 160px at 85% 0%,rgba(232,119,34,.22),transparent 70%),linear-gradient(135deg,#fff7f0,#fdeee2);}
.elws-card.el .hero{background:radial-gradient(260px 160px at 85% 0%,rgba(29,124,242,.24),transparent 70%),linear-gradient(135deg,#f2f8ff,#e4efff);}
.elws-card .hero::after{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(13,23,38,.07) 1px,transparent 1px);background-size:14px 14px;mask-image:linear-gradient(180deg,#000,transparent);-webkit-mask-image:linear-gradient(180deg,#000,transparent);}
.elws-card .logo{position:relative;z-index:1;background:#fff;border-radius:18px;padding:16px 22px;box-shadow:0 12px 30px -18px rgba(13,23,38,.4);display:flex;align-items:center;}
.elws-card .logo img{height:34px;width:auto;display:block;}
.elws-card .bd{padding:24px 26px 24px;display:flex;flex-direction:column;flex:1;}
.elws-card h3{font:600 23px var(--display,Poppins,sans-serif);margin:0 0 8px;letter-spacing:-.01em;}
.elws-card p{color:#5b6b80;font-size:14px;line-height:1.6;margin:0;}
.elws-card ul{list-style:none;padding:0;margin:18px 0 22px;display:grid;gap:9px;flex:1;}
.elws-card li{display:flex;align-items:center;gap:10px;font-size:13.5px;color:#26354a;font-weight:500;}
.elws-card li i{width:22px;height:22px;border-radius:7px;display:grid;place-items:center;flex:none;}
.elws-card.edge li i{background:#fff1e5;color:#d96a15;} .elws-card.el li i{background:#e8f2ff;color:#1d7cf2;}
.elws-card .go{display:flex;align-items:center;justify-content:space-between;gap:10px;}
.elws-card .cta{display:inline-flex;gap:8px;align-items:center;font-weight:600;font-size:14px;color:#fff;border-radius:13px;padding:11px 16px;transition:gap .2s;}
.elws-card.edge .cta{background:linear-gradient(180deg,#f08a3a,#e87722);box-shadow:0 10px 20px -12px rgba(232,119,34,.9);}
.elws-card.el .cta{background:linear-gradient(180deg,#2b88f5,#1d7cf2);box-shadow:0 10px 20px -12px rgba(29,124,242,.9);}
.elws-card:hover .cta{gap:12px;}
.elws-card kbd{font:600 11.5px var(--ui,Inter,sans-serif);color:#6b7a90;background:#f3f6fa;border:1px solid #e3e9f1;border-bottom-width:2px;border-radius:7px;padding:3px 8px;}
.elws-foot{color:#8a98ab;font-size:12.5px;margin-top:24px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;}
.elws-foot kbd{font:600 11px var(--ui,Inter,sans-serif);background:#fff;border:1px solid #e3e9f1;border-bottom-width:2px;border-radius:6px;padding:1px 6px;color:#4a5a70;}

.elws-app{background:#f3f7fc;color:#0f172a;}
.elws-top{background:rgba(255,255,255,.85);backdrop-filter:saturate(1.6) blur(14px);-webkit-backdrop-filter:saturate(1.6) blur(14px);color:#0d1726;position:sticky;top:0;z-index:2;border-bottom:1px solid #e3ebf5;}
.elws-top-in{max-width:1280px;margin:0 auto;padding:12px 22px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.elws-top img{height:26px;}
.elws-top .sep{width:1px;height:26px;background:#e3ebf5;}
.elws-top .t{font:600 14px var(--display,Poppins,sans-serif);} .elws-top .t small{display:block;font:700 9.5px var(--ui,Inter,sans-serif);letter-spacing:.18em;text-transform:uppercase;color:#8a9bb0;}
.elws-top .grow{flex:1;}
.elws-btn{display:inline-flex;align-items:center;gap:7px;border:1px solid #d6e2f0;background:#fff;color:#0f172a;border-radius:10px;padding:8px 13px;font:600 13px var(--ui,Inter,sans-serif);cursor:pointer;white-space:nowrap;text-decoration:none;}
.elws-btn:hover{border-color:#1d94ff;color:#0b6fd6;}
.elws-btn.go{background:#1d94ff;border-color:#1d94ff;color:#fff;} .elws-btn.go:hover{background:#0b6fd6;color:#fff;}
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
.elws-pill.ok{background:#e3f6ee;color:#0f8a5f;} .elws-pill.no{background:#eef2f7;color:#6b7c8f;} .elws-pill.warn{background:#fff3e1;color:#b86a00;} .elws-pill.blue{background:#e6f2ff;color:#0b6fd6;} .elws-pill.site{background:#fff1e5;color:#c25e10;}
.elws-access{display:flex;gap:5px;flex-wrap:wrap;}
.elws-access span{font-size:11px;font-weight:600;border-radius:8px;padding:3px 7px;background:#f1f5fa;color:#8a9bb0;}
.elws-access span.y{background:#e6f2ff;color:#0b6fd6;}
.elws-logins{display:flex;flex-direction:column;gap:6px;}
.elws-login{display:flex;align-items:center;gap:8px;font-size:12.5px;background:#f7fafd;border:1px solid #edf2f8;border-radius:10px;padding:6px 8px;}
.elws-login .av{width:26px;height:26px;border-radius:50%;background:#1d94ff;color:#fff;display:grid;place-items:center;font:700 10.5px var(--ui,Inter,sans-serif);flex:none;}
.elws-login .who{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;} .elws-login .who small{color:#8a9bb0;}
.elws-login button{border:0;background:none;color:#0b6fd6;font:600 12px var(--ui,Inter,sans-serif);cursor:pointer;padding:2px 4px;}
.elws-c .acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:auto;}
.elws-rf{flex:none;width:30px;height:30px;border-radius:9px;border:1px solid #e3ebf5;background:#fff;color:#4c5d70;display:grid;place-items:center;cursor:pointer;transition:all .15s;}
.elws-rf:hover{border-color:#1d94ff;color:#0b6fd6;background:#f3f8ff;}
.elws-rf[disabled]{cursor:default;color:#1d94ff;} .elws-rf[disabled] svg{animation:elwbs .8s linear infinite;}
.elws-c.checking .elws-access{opacity:.45;transition:opacity .2s;}
.elws-botrow{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
.elws-bot{display:inline-flex;align-items:center;gap:7px;border:1px solid #e3ebf5;background:#f7fafd;border-radius:999px;padding:4px 11px 4px 5px;font:600 11.5px var(--ui,Inter,sans-serif);color:#6b7c8f;cursor:pointer;transition:all .15s;}
.elws-bot i{width:26px;height:16px;border-radius:999px;background:#d5dee9;position:relative;transition:background .2s;flex:none;}
.elws-bot i::after{content:"";position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2);transition:transform .2s;}
.elws-bot.on{background:#eef6ff;border-color:#bcdcff;color:#0b6fd6;}
.elws-bot.on i{background:#1d94ff;} .elws-bot.on i::after{transform:translateX(10px);}
.elws-chats{display:inline-flex;align-items:center;gap:5px;border:0;background:none;font:600 11.5px var(--ui,Inter,sans-serif);color:#0b6fd6;cursor:pointer;padding:4px 6px;border-radius:8px;}
.elws-chats:hover{background:#eef6ff;}
.elws-cback{position:fixed;inset:0;z-index:2147482000;background:rgba(10,25,48,.42);backdrop-filter:blur(3px);display:grid;place-items:center;padding:20px;}
.elws-cm{width:min(980px,100%);height:min(680px,calc(100vh - 40px));background:#fff;border-radius:20px;box-shadow:0 40px 90px -30px rgba(5,42,86,.5);display:flex;flex-direction:column;overflow:hidden;font-family:var(--ui,Inter,sans-serif);}
.elws-cm-h{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid #edf2f8;}
.elws-cm-h b{display:block;font-size:16px;color:#0f172a;} .elws-cm-h small{color:#8a9bb0;font-size:12.5px;}
.elws-cm-b{flex:1;display:flex;min-height:0;}
.elws-cm-b>.elws-empty{flex:1;}
.elws-cl{flex:0 0 300px;border-right:1px solid #edf2f8;overflow-y:auto;padding:8px;}
.elws-cl button{display:block;width:100%;text-align:left;border:0;background:none;border-radius:12px;padding:10px 12px;cursor:pointer;font:inherit;color:#0f172a;margin-bottom:2px;}
.elws-cl button:hover{background:#f5f8fc;} .elws-cl button.on{background:#eef6ff;}
.elws-cl b{display:block;font-size:13px;} .elws-cl b em{font-style:normal;font-size:10.5px;font-weight:700;color:#b86a00;background:#fff3e1;border-radius:999px;padding:1px 6px;margin-left:4px;}
.elws-cl span{display:block;font-size:12.5px;color:#4c5d70;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:2px 0;}
.elws-cl small{font-size:11.5px;color:#8a9bb0;}
.elws-ct{flex:1;overflow-y:auto;padding:16px 20px;background:#f8fafd;}
.elws-ctm{font-size:13px;margin-bottom:12px;color:#0f172a;} .elws-ctm span{color:#8a9bb0;font-size:12px;}
.elws-ct .q{margin:12px 0 6px auto;max-width:80%;width:fit-content;background:#1d94ff;color:#fff;border-radius:14px 14px 4px 14px;padding:9px 12px;font-size:13px;line-height:1.45;}
.elws-ct .q small{display:block;font-size:10.5px;opacity:.8;margin-bottom:2px;}
.elws-ct .a{max-width:85%;background:#fff;border:1px solid #e3ebf5;border-radius:14px 14px 14px 4px;padding:9px 12px;font-size:13px;line-height:1.5;color:#1f2d3d;}
@media (max-width:720px){.elws-cm-b{flex-direction:column}.elws-cl{flex:0 0 auto;max-height:200px;border-right:0;border-bottom:1px solid #edf2f8}}
.elws-rm{opacity:0;transition:opacity .15s,border-color .15s,color .15s,background .15s;}
.elws-c:hover .elws-rm,.elws-rm:focus-visible{opacity:1;}
.elws-rm:hover{border-color:#f0b4ac;color:#c0392b;background:#fdf1ef;}
@media (hover:none){.elws-rm{opacity:1;}}
.elws-empty{background:#fff;border:1.5px dashed #d6e2f0;border-radius:16px;padding:40px;text-align:center;color:#5b6b7c;}
.elws-note{background:#fff;border:1px solid #e3ebf5;border-left:3px solid #1d94ff;border-radius:12px;padding:12px 14px;font-size:12.5px;color:#4c5d70;line-height:1.55;margin-bottom:16px;}
.hub-switch{display:inline-flex;align-items:center;gap:6px;}
.elwb-back{position:fixed;inset:0;z-index:9500;background:rgba(13,23,38,.35);backdrop-filter:blur(2px);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto;font-family:var(--ui,Inter,sans-serif);}
.elwb{background:#fff;border-radius:22px;width:min(1180px,100%);padding:22px 24px;box-shadow:0 40px 80px -30px rgba(13,23,38,.45);color:#0d1726;}
.elwb-h{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;}
.elwb h2{font:600 20px var(--display,Poppins,sans-serif);margin:0 0 4px;} .elwb-h p{margin:0;color:#5b6b80;font-size:13px;line-height:1.55;max-width:760px;}
.elwb-x{border:0;background:#f3f6fa;border-radius:10px;width:34px;height:34px;font-size:22px;cursor:pointer;line-height:1;}
.elwb-t{margin-top:16px;border:1px solid #e6ebf2;border-radius:14px;overflow:auto;max-height:60vh;}
.elwb table{width:100%;border-collapse:collapse;font-size:13px;}
.elwb th{position:sticky;top:0;background:#f8fafd;text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8a98ab;padding:9px 10px;border-bottom:1px solid #e6ebf2;}
.elwb td{padding:8px 10px;border-bottom:1px solid #eff3f8;vertical-align:middle;}
.elwb td b{display:block;font-weight:600;} .elwb td small{color:#8a98ab;font-size:11.5px;}
.elwb td input[type=text],.elwb td input[type=email]{width:100%;min-width:170px;border:1px solid #e3e9f1;border-radius:9px;padding:7px 9px;font:500 13px var(--ui,Inter,sans-serif);}
.elwb td input:focus{outline:none;border-color:#1d7cf2;box-shadow:0 0 0 3px #e8f2ff;}
.elwb code{font:500 12px var(--mono,monospace);background:#f3f6fa;border-radius:7px;padding:4px 7px;white-space:nowrap;}
.elwb tr.off td{opacity:.45;}
.elwb-f{display:flex;align-items:center;gap:10px;margin-top:16px;flex-wrap:wrap;} .elwb-f .grow{flex:1;}
.elwb-prog{display:flex;align-items:center;gap:12px;font-size:12.5px;color:#4a5a70;min-width:300px;} .elwb-prog div{width:160px;height:7px;background:#eef2f7;border-radius:5px;overflow:hidden;} .elwb-prog i{display:block;height:100%;width:0;background:#1d7cf2;transition:width .3s;}
.elwb-spin{display:inline-block;width:14px;height:14px;border-radius:50%;border:2px solid rgba(29,124,242,.2);border-top-color:#1d7cf2;animation:elwbs .7s linear infinite;vertical-align:-2px;margin-right:6px;}
.elws-btn.go .elwb-spin{border-color:rgba(255,255,255,.35);border-top-color:#fff;}
@keyframes elwbs{to{transform:rotate(360deg)}}
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
  const user = (window.fbAuth && fbAuth.currentUser && fbAuth.currentUser.displayName) || '';
  const first = String(user).split(/\s/)[0];
  const hr = new Date().getHours(), greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const CK = '<i><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></i>';
  const li = a => '<ul>' + a.map(x => '<li>' + CK + esc(x) + '</li>').join('') + '</ul>';
  el.innerHTML = '<div class="elws-ch"><div class="elws-hello"><img src="' + esc(edgeLogo) + '" alt="EDGE"><span class="dot"></span><span>' + esc(greet + (first ? ', ' + first.charAt(0).toUpperCase() + first.slice(1) : '')) + '</span></div>' +
    '<h2>Where are we working today?</h2><p class="lead">Pick a workspace. Both use the same clients and the same cloud record, and you can switch any time.</p>' +
    '<div class="elws-cards">' +
    '<button class="elws-card edge" type="button" data-w="edge"><div class="hero"><div class="logo"><img src="' + esc(edgeLogo) + '" alt="EDGE"></div></div><div class="bd"><h3>EDGE</h3>' +
      '<p>The search console for the whole team.</p>' + li(['GBP rank grids and the GBP Tracker', 'Live SERP checks', 'SEO client reporting, team and client reports']) +
      '<div class="go"><span class="cta">Open EDGE ' + IC.arrow + '</span><kbd>E</kbd></div></div></button>' +
    '<button class="elws-card el" type="button" data-w="el"><div class="hero"><div class="logo"><img src="' + logoD + '" alt="Easyleads"></div></div><div class="bd"><h3>Easyleads client portal</h3>' +
      '<p>Every client’s Easyleads account in one place.</p>' + li(['Who’s connected and what their dashboard can show', 'Client logins only EDGE can create and control', 'Preview any client’s read-only dashboard']) +
      '<div class="go"><span class="cta">Open Easyleads ' + IC.arrow + '</span><kbd>L</kbd></div></div></button>' +
    '</div><div class="elws-foot"><span>Press <kbd>E</kbd> or <kbd>L</kbd> to jump in</span><span><kbd>Alt</kbd> + <kbd>H</kbd> opens the EDGE hub from anywhere</span></div></div>';
  document.body.appendChild(el);
  const pick = w => {
    ss.set(w); document.removeEventListener('keydown', key);
    const sp = window.edgeSplash;
    if (w === 'el'){ workspace(); el.remove(); chooserEl = null; return; }
    if (sp) sp.show({brand: 'edge', title: 'Opening EDGE', sub: 'Getting your clients, rank grids and reports ready'});
    el.remove(); chooserEl = null; onEdge();
    if (sp) sp.hide(700);
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
  const sp = window.edgeSplash;
  if (sp) sp.show({brand: 'easyleads', logo: logoD, title: 'Opening Easyleads', sub: 'Loading your clients, logins and data access'});
  if (wsEl) wsEl.remove();
  const el = wsEl = document.createElement('div');
  el.className = 'elws elws-app';
  const mail = (window.fbAuth && fbAuth.currentUser && fbAuth.currentUser.email) || '';
  el.innerHTML = '<header class="elws-top"><div class="elws-top-in"><img src="' + logoD + '" alt="Easyleads"><span class="sep"></span><div class="t">Client portal console<small>Run by EDGE Marketing</small></div><div class="grow"></div>' +
    '<span style="font-size:12px;color:#6b7a90">' + esc(mail) + '</span>' +
    '<button class="elws-btn" type="button" data-switch>' + IC.swap + 'Switch workspace</button><button class="elws-btn" type="button" data-signout>Sign out</button></div></header>' +
    '<main class="elws-wrap"><div class="elws-hero"><div><h1>Easyleads clients</h1><p>Connect a client’s Easyleads account once, then give them a login to their own read-only dashboard.</p></div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="elws-btn" type="button" data-copy>' + IC.link + 'Copy client login link</button><button class="elws-btn" type="button" data-check>' + IC.refresh + 'Re-check all clients</button>' +
    '<button class="elws-btn" type="button" data-bulk>' + IC.user + 'Bulk create logins</button><button class="elws-btn go" type="button" data-new>' + IC.user + 'New client login</button></div></div>' +
    '<div class="elws-stats" data-stats></div><div data-note></div>' +
    '<div class="elws-bar"><input type="search" data-q placeholder="Find a client by name or website"><div class="elws-seg" data-f>' +
    [['all', 'All'], ['conn', 'On Easyleads'], ['login', 'Has a login'], ['need', 'Needs access'], ['gone', 'Removed']].map((f, i) => '<button type="button" data-v="' + f[0] + '"' + (i ? '' : ' class="on"') + '>' + f[1] + '</button>').join('') + '</div></div>' +
    '<div class="elws-grid" data-grid><div class="elws-empty">Loading clients from the tracker…</div></div></main>';
  document.body.appendChild(el);
  document.body.classList.add('hub-locked');
  const $ = s => el.querySelector(s);
  let data = {users: [], clients: [], scopes: null}, filter = 'all';
  const checking = new Set();
  const markCard = (domain, on) => { const card = el.querySelector('[data-card="' + CSS.escape(domain) + '"]'); if (!card) return; card.classList.toggle('checking', on); const b = card.querySelector('[data-recheck]'); if (b) b.disabled = on; };
  const LBL = [['forms', 'Forms'], ['calls', 'Calls'], ['contacts', 'Contacts'], ['opps', 'Pipeline'], ['appts', 'Bookings'], ['emails', 'Email']];
  const access = d => { const r = data.scopes && data.scopes.d && data.scopes.d[d]; return r ? LBL.map(l => ({k: l[0], label: l[1], ok: typeof r[l[0]] === 'number', unk: r[l[0]] == null})).filter(x => !x.unk) : null; };
  const reload = async () => {
    try{ data = await PA.call('portalAdminList'); draw(); }
    catch(e){ $('[data-grid]').innerHTML = '<div class="elws-empty">' + esc(e.message) + '</div>'; }
  };
  function draw(){
    const live = data.clients.filter(c => !c.hidden), gone = data.clients.filter(c => c.hidden);
    const gb = el.querySelector('[data-f] [data-v="gone"]'); if (gb){ gb.style.display = gone.length || filter === 'gone' ? '' : 'none'; gb.textContent = 'Removed' + (gone.length ? ' · ' + gone.length : ''); }
    const conn = live.filter(c => c.connected);
    const usersOf = d => data.users.filter(u => (u.domains || []).indexOf(d) > -1);
    const needs = c => { const a = access(c.domain); return c.connected && a && a.some(x => !x.ok); };
    const week = Date.now() - 7 * 864e5;
    $('[data-stats]').innerHTML = [
      [conn.length, 'Connected to Easyleads'], [data.users.length, 'Client logins'],
      [data.users.filter(u => (u.lastLogin || 0) > week || (u.lastSeen || 0) > week).length, 'Active this week'],
      [conn.filter(needs).length, 'Need more data access']
    ].map(s => '<div class="elws-stat"><b>' + s[0] + '</b><span>' + s[1] + '</span></div>').join('');
    const botNote = !data.botReady && data.clients.some(c => c.bot) ? '<div class="elws-note"><b>The AI assistant is switched on but not connected yet.</b> In the tracker’s Apps Script project, open Project Settings → Script properties and add <b>OPENROUTER_KEY</b> with your OpenRouter key. Optional: <b>OPENROUTER_MODEL</b> (default openai/gpt-4o-mini).</div>' : '';
    $('[data-note]').innerHTML = botNote + (conn.filter(needs).length ? '<div class="elws-note"><b>Some dashboards can only show form submissions.</b> To show calls, contacts, pipeline and bookings too, open that client’s Easyleads sub-account → Settings → Private Integrations → <i>EDGE SEO tool</i> → Edit → Scopes, add View Conversation Messages, View Contacts, View Opportunities, View Calendars and View Calendar Events (all read-only), then click Update and <b>Re-check data access</b> here.</div>' : '');
    const q = $('[data-q]').value.trim().toLowerCase();
    const rows = (filter === 'gone' ? gone : live).slice().sort((a, b) => (b.connected - a.connected) || (usersOf(b.domain).length - usersOf(a.domain).length) || a.name.localeCompare(b.name))
      .filter(c => !q || (c.name + ' ' + c.domain).toLowerCase().indexOf(q) > -1)
      .filter(c => filter === 'all' || filter === 'gone' || (filter === 'conn' && c.connected) || (filter === 'login' && usersOf(c.domain).length) || (filter === 'need' && needs(c)));
    $('[data-grid]').innerHTML = rows.length ? rows.map(c => {
      const us = usersOf(c.domain), a = access(c.domain);
      return '<div class="elws-c" data-card="' + esc(c.domain) + '"><div class="h"><img src="https://www.google.com/s2/favicons?domain=' + encodeURIComponent(c.domain) + '&sz=64" alt="" onerror="this.style.visibility=\'hidden\'"><div><b title="' + esc(c.name) + '">' + esc(c.name) + '</b><small>' + esc(c.domain) + '</small></div>' +
        (c.connected ? '<span class="elws-pill ok">● Easyleads</span>' : '<span class="elws-pill site">● Website forms</span>') +
        (c.hidden ? '' : '<button class="elws-rf elws-rm" type="button" data-rm="' + esc(c.domain) + '" title="Remove ' + esc(c.name) + ' from this console" aria-label="Remove ' + esc(c.name) + '">' + IC.trash + '</button>') +
        '<button class="elws-rf" type="button" data-recheck="' + esc(c.domain) + '" title="Refresh this client: picks up a new Easyleads connection and re-checks what its dashboard can show" aria-label="Refresh ' + esc(c.name) + '">' + IC.refresh + '</button></div>' +
        (c.connected ? (a ? '<div class="elws-access" title="What this client’s dashboard can show">' + a.map(x => '<span class="' + (x.ok ? 'y' : '') + '">' + (x.ok ? '✓ ' : '✕ ') + x.label + '</span>').join('') + '</div>' : '<div class="elws-access"><span>Data access not checked yet</span></div>')
          : '<div class="elws-access"><span class="y">✓ Forms</span><span class="y">✓ Calls (GA4)</span><span>Leads from the website forms EDGE tracks</span></div>') +
        (c.hidden ? '' : '<div class="elws-botrow"><button type="button" class="elws-bot' + (c.bot ? ' on' : '') + '" data-bot="' + esc(c.domain) + '" role="switch" aria-checked="' + !!c.bot + '" title="A chat assistant on this client’s dashboard that answers questions about its numbers"><i></i>AI assistant ' + (c.bot ? 'on' : 'off') + '</button>' +
          (c.bot ? '<button type="button" class="elws-chats" data-chats="' + esc(c.domain) + '">' + IC.chat + 'Read chats</button>' : '') + '</div>') +
        '<div class="elws-logins">' + (us.length ? us.map(u => '<div class="elws-login"><span class="av">' + esc((u.name || u.email).slice(0, 2).toUpperCase()) + '</span><span class="who">' + esc(u.name || u.email) + ' <small>' + esc(u.email) + (u.disabled ? ' · disabled' : u.lastLogin ? '' : ' · not signed in yet') + '</small></span>' +
          '<button type="button" data-as="' + esc(u.id) + '" title="Open their dashboard as they see it">' + IC.eye + '</button><button type="button" data-edit="' + esc(u.id) + '">Edit</button></div>').join('') : '<div style="font-size:12px;color:#8a9bb0">No client login yet.</div>') + '</div>' +
        (c.hidden ? '<div class="acts"><button class="elws-btn go" type="button" data-restore="' + esc(c.domain) + '">' + IC.refresh + 'Put back in the console</button></div></div>' :
        '<div class="acts"><button class="elws-btn go" type="button" data-newfor="' + esc(c.domain) + '">' + IC.user + 'Create login</button>' +
        (us[0] ? '<button class="elws-btn" type="button" data-as="' + esc(us[0].id) + '" title="Opens their dashboard as they see it; arrange it there">' + IC.eye + 'Open &amp; arrange dashboard</button>' : '') + '</div></div>');
    }).join('') : '<div class="elws-empty">No clients match.</div>';
    el.querySelectorAll('[data-recheck]').forEach(b => b.addEventListener('click', () => recheck(b.dataset.recheck)));
    el.querySelectorAll('[data-bot]').forEach(b => b.addEventListener('click', () => toggleBot(b.dataset.bot)));
    el.querySelectorAll('[data-chats]').forEach(b => b.addEventListener('click', () => chats(b.dataset.chats)));
    el.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => removeClient(b.dataset.rm, true)));
    el.querySelectorAll('[data-restore]').forEach(b => b.addEventListener('click', () => removeClient(b.dataset.restore, false)));
    checking.forEach(d => markCard(d, true));
    el.querySelectorAll('[data-newfor]').forEach(b => b.addEventListener('click', () => PA.open({newFor: b.dataset.newfor, onClose: reload})));
    el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => PA.open({editId: b.dataset.edit, onClose: reload})));
    el.querySelectorAll('[data-as]').forEach(b => b.addEventListener('click', async () => {
      const w = window.open('about:blank', '_blank');
      try{ const j = await PA.call('portalAdminSession', {id: b.dataset.as}); if (w) w.location = PA.portalUrl() + '#s=' + encodeURIComponent(j.session); }
      catch(e){ if (w) w.close(); say(e.message, 'err'); }
    }));
  }
  /* One client at a time: re-reads its connection and what its dashboard can show, without waiting on everyone else. */
  async function recheck(domain, quiet){
    if (checking.has(domain)) return;
    checking.add(domain);
    const mark = on => markCard(domain, on);
    mark(true);
    const name = ((data.clients.find(c => c.domain === domain) || {}).name) || domain;
    try{
      await PA.call('portalAdminCheck', {domain});
      await reload();
      if (!quiet){
        const c = data.clients.find(x => x.domain === domain), a = access(domain);
        say(!c || !c.connected ? name + ' refreshed · website forms' : a ? name + ' refreshed · ' + a.filter(x => x.ok).length + ' of ' + a.length + ' data types on' : name + ' refreshed');
      }
    }catch(err){ if (!quiet) say(err.message, 'err'); }
    checking.delete(domain); mark(false);
  }
  /* The dashboard assistant: on or off per client. */
  async function toggleBot(domain){
    const c = data.clients.find(x => x.domain === domain); if (!c) return;
    const on = !c.bot;
    try{
      const j = await PA.call('portalAdminBot', {domain, on});
      c.bot = on; draw();
      say(on ? (j.ready ? 'AI assistant is on for ' + c.name : 'AI assistant switched on for ' + c.name + '. It answers once the OpenRouter key is added to the tracker.') : 'AI assistant is off for ' + c.name);
    }catch(err){ say(err.message, 'err'); }
  }
  /* What clients asked the assistant, conversation by conversation. */
  async function chats(domain){
    const c = data.clients.find(x => x.domain === domain) || {name: domain};
    const back = document.createElement('div');
    back.className = 'elws-cback';
    back.innerHTML = '<div class="elws-cm" role="dialog" aria-modal="true"><div class="elws-cm-h"><div><b>AI assistant chats</b><small>' + esc(c.name) + '</small></div><button type="button" class="elws-btn" data-x>Close</button></div><div class="elws-cm-b"><div class="elws-empty">Loading chats…</div></div></div>';
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back || e.target.closest('[data-x]')) close(); });
    try{
      const j = await PA.call('portalAdminChats', {domain});
      const by = {};
      (j.rows || []).forEach(r => { const k = (r.conv || '') + '|' + r.email; (by[k] = by[k] || []).push(r); });
      const convs = Object.values(by).map(rs => rs.sort((a, b) => a.t - b.t)).sort((a, b) => b[b.length - 1].t - a[a.length - 1].t);
      const body = back.querySelector('.elws-cm-b');
      if (!convs.length){ body.innerHTML = '<div class="elws-empty">No questions yet. Chats show here as soon as ' + esc(c.name) + ' uses the assistant.</div>'; return; }
      const when = t => new Date(t).toLocaleString('en-CA', {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});
      body.innerHTML = '<div class="elws-cl">' + convs.map((rs, i) => '<button type="button" data-cv="' + i + '"' + (i ? '' : ' class="on"') + '><b>' + esc(rs[0].name || rs[0].email) + (rs[0].as === 'EDGE' ? ' <em>EDGE preview</em>' : '') + '</b><span>' + esc(rs[0].q) + '</span><small>' + when(rs[rs.length - 1].t) + ' · ' + rs.length + ' question' + (rs.length === 1 ? '' : 's') + '</small></button>').join('') + '</div><div class="elws-ct" data-ct></div>';
      const show = i => {
        const rs = convs[i];
        body.querySelectorAll('[data-cv]').forEach(b => b.classList.toggle('on', Number(b.dataset.cv) === i));
        body.querySelector('[data-ct]').innerHTML = '<div class="elws-ctm"><b>' + esc(rs[0].name || rs[0].email) + '</b> <span>' + esc(rs[0].email) + ' · ' + esc(rs[0].period || '') + '</span></div>' +
          rs.map(r => '<div class="q"><small>' + when(r.t) + '</small>' + esc(r.q) + '</div><div class="a">' + esc(r.a).replace(/\n/g, '<br>') + '</div>').join('');
      };
      body.querySelectorAll('[data-cv]').forEach(b => b.addEventListener('click', () => show(Number(b.dataset.cv))));
      show(0);
    }catch(err){ back.querySelector('.elws-cm-b').innerHTML = '<div class="elws-empty">' + esc(err.message) + '</div>'; }
  }
  /* Remove a client from this console, or put it back. Its data, Easyleads connection and logins stay as they are. */
  async function removeClient(domain, hide){
    const c = data.clients.find(x => x.domain === domain) || {name: domain}, us = data.users.filter(u => (u.domains || []).indexOf(domain) > -1);
    if (hide && !confirm('Remove ' + c.name + ' from the Easyleads console?' + (us.length ? '\n\n' + us.length + ' login' + (us.length === 1 ? ' still has' : 's still have') + ' access to it; edit those logins to take it away.' : '') + '\n\nYou can put it back any time under Removed.')) return;
    const card = el.querySelector('[data-card="' + CSS.escape(domain) + '"]');
    if (card) card.animate([{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'scale(.97)'}], {duration: 180, easing: 'ease-out', fill: 'forwards'});
    try{
      await PA.call('portalAdminHideClient', {domain, hidden: hide});
      c.hidden = hide; draw();
      say(hide ? c.name + ' removed from the console' : c.name + ' is back in the console');
    }catch(err){ if (card) card.getAnimations().forEach(a => a.cancel()); say(err.message, 'err'); }
  }
  $('[data-q]').addEventListener('input', draw);
  el.querySelectorAll('[data-f] button').forEach(b => b.addEventListener('click', () => { filter = b.dataset.v; el.querySelectorAll('[data-f] button').forEach(x => x.classList.toggle('on', x === b)); draw(); }));
  $('[data-new]').addEventListener('click', () => PA.open({onClose: reload}));
  $('[data-bulk]').addEventListener('click', () => bulk(data, reload));
  $('[data-copy]').addEventListener('click', () => navigator.clipboard.writeText(PA.portalUrl()).then(() => say('Client login link copied')));
  $('[data-check]').addEventListener('click', async e => {
    const b = e.currentTarget; b.disabled = true; const t = b.innerHTML; b.innerHTML = IC.refresh + 'Checking every client… (about a minute)';
    try{ await PA.call('portalAdminCheck'); await reload(); say('Data access re-checked'); }
    catch(err){ say(err.message, 'err'); }
    b.disabled = false; b.innerHTML = t;
  });
  $('[data-signout]').addEventListener('click', () => { if (window.edgeSignOut) window.edgeSignOut.run(); });
  $('[data-switch]').addEventListener('click', () => {
    if (sp) sp.show({brand: 'edge', title: 'Switching workspace', sub: 'One moment'});
    chooser(() => window.EDGE_showHub && window.EDGE_showHub(true, true));
    el.remove(); wsEl = null;
    if (sp) sp.hide(450);
  });
  /* the console is revealed once its clients are in (never longer than 12 seconds) */
  let shown = false;
  const reveal = () => { if (!shown){ shown = true; if (sp) sp.hide(700); } };
  setTimeout(reveal, 12000);
  /* A client connected since the last check is checked on its own, so its card fills in by itself. */
  reload().then(() => { reveal(); data.clients.filter(c => c.connected && !c.hidden && !access(c.domain)).reduce((p, c) => p.then(() => recheck(c.domain, true)), Promise.resolve()); }, reveal);
}

/* ---------- bulk create: one login per connected client, in one go ---------- */
function bulk(data, done){
  const has = d => data.users.some(u => (u.domains || []).indexOf(d) > -1);
  const todo = data.clients.filter(c => c.connected && !has(c.domain)).sort((a, b) => a.name.localeCompare(b.name));
  const gen = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*?'; const r = new Uint32Array(18); crypto.getRandomValues(r); return Array.from(r, x => a[x % a.length]).join(''); };
  const rows = todo.map(c => ({c, on: true, name: c.name, email: '', pw: gen(), st: ''}));
  const b = document.createElement('div'); b.className = 'elwb-back';
  b.innerHTML = '<div class="elwb" role="dialog" aria-modal="true"><div class="elwb-h"><div><h2>Bulk create client logins</h2><p>One login per connected client that doesn’t have one yet. Enter each client’s email; a strong password is generated for each. Passwords are shown only here, so download the list before closing.</p></div><button class="elwb-x" type="button" data-x aria-label="Close">×</button></div>' +
    (rows.length ? '<div class="elwb-t"><table><thead><tr><th><input type="checkbox" data-all checked aria-label="Select all"></th><th>Business</th><th>Login name</th><th>Email (their username)</th><th>Password</th><th></th></tr></thead><tbody>' +
      rows.map((r, i) => '<tr data-i="' + i + '"><td><input type="checkbox" data-on checked></td><td><b>' + esc(r.c.name) + '</b><small>' + esc(r.c.domain) + '</small></td><td><input type="text" data-n value="' + esc(r.name) + '"></td><td><input type="email" data-e placeholder="name@' + esc(r.c.domain) + '" autocomplete="off"></td><td><code data-p>' + esc(r.pw) + '</code></td><td data-st></td></tr>').join('') + '</tbody></table></div>' +
      '<div class="elwb-f"><div class="elwb-prog" hidden><div><i></i></div><span></span></div><div class="grow"></div><button class="elws-btn" type="button" data-csv disabled>Download list (CSV)</button><button class="elws-btn go" type="button" data-go>Create logins</button></div>'
      : '<div class="elws-empty" style="margin:16px 0 4px">Every connected client already has a login.</div>') + '</div>';
  document.body.appendChild(b);
  const q = s => b.querySelector(s);
  let running = false, made = [];
  const close = () => { if (running) return; b.remove(); if (made.length) done(); };
  b.addEventListener('click', e => { if (e.target === b) close(); });
  q('[data-x]').addEventListener('click', close);
  if (!rows.length) return;
  b.querySelectorAll('tr[data-i]').forEach(tr => {
    const r = rows[Number(tr.dataset.i)];
    tr.querySelector('[data-on]').addEventListener('change', e => { r.on = e.target.checked; tr.classList.toggle('off', !r.on); });
    tr.querySelector('[data-n]').addEventListener('input', e => { r.name = e.target.value; });
    tr.querySelector('[data-e]').addEventListener('input', e => { r.email = e.target.value.trim(); });
  });
  q('[data-all]').addEventListener('change', e => b.querySelectorAll('[data-on]').forEach(x => { x.checked = e.target.checked; x.dispatchEvent(new Event('change')); }));
  const csvOut = () => {
    const link = PA.portalUrl();
    const lines = [['Business', 'Website', 'Login name', 'Email', 'Password', 'Login link']].concat(made.map(r => [r.c.name, r.c.domain, r.name, r.email, r.pw, link]));
    const s = lines.map(l => l.map(v => { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + s], {type: 'text/csv'})); a.download = 'easyleads-client-logins.csv'; document.body.appendChild(a); a.click(); a.remove();
  };
  q('[data-csv]').addEventListener('click', csvOut);
  q('[data-go]').addEventListener('click', async () => {
    const pick = rows.filter(r => r.on && r.st !== 'ok');
    if (!pick.length){ say('Select at least one client', 'err'); return; }
    const bad = pick.filter(r => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email));
    if (bad.length){ say('Add a valid email for ' + bad[0].c.name + (bad.length > 1 ? ' and ' + (bad.length - 1) + ' more' : ''), 'err'); const tr = b.querySelector('tr[data-i="' + rows.indexOf(bad[0]) + '"] [data-e]'); if (tr) tr.focus(); return; }
    running = true; const go = q('[data-go]'); go.disabled = true; go.innerHTML = '<span class="elwb-spin"></span>Creating…';
    b.querySelectorAll('input').forEach(x => { x.disabled = true; });
    const prog = q('.elwb-prog'); prog.hidden = false;
    let n = 0;
    for (const r of pick){
      const td = b.querySelector('tr[data-i="' + rows.indexOf(r) + '"] [data-st]');
      td.innerHTML = '<span class="elwb-spin"></span>';
      prog.querySelector('span').textContent = 'Creating ' + (n + 1) + ' of ' + pick.length + ': ' + r.c.name + '…';
      try{
        await PA.call('portalAdminSave', {name: r.name.trim() || r.c.name, email: r.email, password: r.pw, domains: [r.c.domain], disabled: false});
        r.st = 'ok'; made.push(r); td.innerHTML = '<span class="elws-pill ok">✓ Created</span>';
      }catch(e){ r.st = 'err'; td.innerHTML = '<span class="elws-pill warn" title="' + esc(e.message) + '">' + esc(e.message.slice(0, 40)) + '</span>'; }
      n++; prog.querySelector('i').style.width = (n / pick.length * 100) + '%';
    }
    running = false;
    prog.querySelector('span').textContent = made.length + ' login' + (made.length === 1 ? '' : 's') + ' created' + (pick.length - made.length ? ', ' + (pick.length - made.length) + ' failed' : '') + '. Download the list before closing.';
    const failed = rows.some(r => r.on && r.st === 'err');
    go.innerHTML = failed ? 'Retry failed' : 'All done ✓'; go.disabled = !failed;
    b.querySelectorAll('tr[data-i]').forEach(tr => { if (rows[Number(tr.dataset.i)].st === 'err') tr.querySelectorAll('input').forEach(x => { x.disabled = false; }); });
    q('[data-csv]').disabled = !made.length;
    if (made.length) csvOut();
  });
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
