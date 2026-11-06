/* ==========================================================================
   Report section menu: a right-side "On this page" list for the report tabs
   (AI Visibility, Team report, Client report). Click a section to jump to it;
   the section you are reading stays highlighted as you scroll.
   On wide screens it sits in the empty space right of the report. When there
   is no room, it becomes a "Sections" button at the bottom right.
   Reads the page only; it never changes the report itself.
   ========================================================================== */
(function () {
  'use strict';
  if (window.__edgeRnav) return; window.__edgeRnav = true;

  const VIEWS = {ai: 'AI visibility', rteam: 'Team report', rclient: 'Client report'};
  /* Widget type -> report group, from the widget library in reports.js. New types fall in with the section above them. */
  const GROUP = {"headline":"overview","conv_kpi":"conv","conv_trend":"conv","conv_by_channel":"conv","conv_by_event":"conv","conv_by_page":"conv","conv_ai":"conv","conv_list":"conv","forms":"conv","traffic_kpis":"traffic","traffic_trend":"traffic","traffic_channels":"traffic","ga4_pages":"traffic","ga4_pathways":"traffic","ai_visits":"ai","ai_assistants":"ai","ai_vs_channels":"ai","ai_keyevents":"ai","ai_pages":"ai","ai_journeys":"ai","gai_impr":"gai","gai_pages":"gai","gai_organic":"gai","aio":"gai","bing_cites":"bing","bing_queries":"bing","llm_share":"llm","llm_checks":"llm","gsc_kpis":"gsc","gsc_trend":"gsc","gsc_queries":"gsc","gsc_pages":"gsc","gsc_almost":"gsc","gsc_lowctr":"gsc","gsc_devices":"gsc","gsc_countries":"gsc","gsc_health":"gsc","kw_kpis":"kw","kw_cards":"kw","kw_table":"kw","kw_movers":"kw","kw_dist":"kw","gbp_grids":"gbp","insight_summary":"insight","insight_wins":"insight","goal_tracker":"insight","insight_scorecard":"insight","insight_compare":"insight","insight_forecast":"insight","insight_weekday":"insight","ga4_engagement":"traffic","ga4_mix_shift":"traffic","ga4_conv_rate":"traffic","ga4_lead_sources":"conv","ga4_opportunity_pages":"traffic","ga4_rising_pages":"traffic","ga4_engaging_pages":"traffic","ga4_unvisited":"traffic","gsc_ctr_curve":"gsc","gsc_brand":"gsc","gsc_questions":"gsc","gsc_query_length":"gsc","gsc_zero_click":"gsc","gsc_page_two":"gsc","easyleads_forms":"conv","el_kpi":"conv","el_channels":"conv","el_trend":"conv","el_forms":"conv","el_location":"conv","el_inbox":"conv","forms_inbox":"conv","forms_catalog":"conv","forms_kpi":"conv","forms_latest":"conv","forms_rate":"conv","forms_heatmap":"conv","kw_wins":"kw","kw_close":"kw","kw_pages":"kw","gbp_glance":"gbp","ai_share":"ai","people":"conv"};
  const GNAME = {overview: 'Overview', insight: 'Insights & goals', conv: 'Conversions', traffic: 'Traffic', ai: 'AI assistants', gai: 'Google AI search',
    bing: 'Copilot / Bing', llm: 'AI answers', gsc: 'Search Console', kw: 'Keyword rankings', gbp: 'Business Profile'};
  const FOLD_KEY = 'edgeRnavFold';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const clean = s => String(s || '').replace(/⠿/g, '').replace(/\s+/g, ' ').trim();
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- styles ---------- */
  const css = `
.rnav{position:fixed;z-index:550;width:236px;display:flex;flex-direction:column;font-family:var(--ui,Inter,system-ui,sans-serif);
  background:var(--a-card,#fff);border:1px solid var(--a-line,#e6e8eb);border-radius:16px;box-shadow:0 18px 40px -24px rgba(20,26,33,.35),0 2px 6px -3px rgba(20,26,33,.08);
  opacity:0;transform:translateX(8px);transition:opacity .22s ease,transform .22s ease;pointer-events:none;overflow:hidden;}
.rnav.show{opacity:1;transform:none;pointer-events:auto;}
.rnav-h{display:flex;align-items:center;gap:8px;padding:12px 12px 10px 14px;border-bottom:1px solid var(--a-line,#eef0f2);}
.rnav-h .t{flex:1;min-width:0;}
.rnav-h b{display:block;font-size:12.5px;font-weight:600;color:var(--a-ink,#171614);letter-spacing:-.005em;}
.rnav-h small{display:block;font-size:11px;color:var(--a-ink3,#8a9097);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;}
.rnav-ib{border:0;background:none;width:26px;height:26px;border-radius:8px;display:grid;place-items:center;cursor:pointer;color:var(--a-ink3,#8a9097);flex:none;}
.rnav-ib:hover{background:var(--a-card2,#f3f5f7);color:var(--a-ink,#171614);}
.rnav-prog{height:2px;background:var(--a-line,#eef0f2);}
.rnav-prog i{display:block;height:100%;width:0;background:var(--a-brand,#e87722);transition:width .12s linear;}
.rnav-list{overflow-y:auto;padding:8px 8px 10px;scrollbar-width:thin;overscroll-behavior:contain;}
.rnav-g{font-size:10.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--a-ink3,#8a9097);padding:12px 8px 5px;}
.rnav-g:first-child{padding-top:4px;}
.rnav-i{position:relative;display:block;width:100%;text-align:left;border:0;background:none;cursor:pointer;font:500 12.5px/1.35 var(--ui,Inter,system-ui,sans-serif);
  color:var(--a-ink2,#4a5058);padding:6px 8px 6px 16px;border-radius:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.rnav-i::before{content:"";position:absolute;left:7px;top:50%;width:4px;height:4px;margin-top:-2px;border-radius:50%;background:var(--a-line,#d5d9de);transition:all .18s ease;}
.rnav-i:hover{background:var(--a-card2,#f3f5f7);color:var(--a-ink,#171614);}
.rnav-i.on{background:rgba(232,119,34,.09);color:var(--a-ink,#171614);font-weight:600;}
.rnav-i.on::before{background:var(--a-brand,#e87722);height:14px;margin-top:-7px;border-radius:2px;left:6px;width:3px;}
.rnav-f{display:flex;gap:6px;padding:8px 10px 10px;border-top:1px solid var(--a-line,#eef0f2);}
.rnav-f button{flex:1;border:1px solid var(--a-line,#e6e8eb);background:var(--a-card,#fff);border-radius:9px;padding:6px 8px;font:500 12px var(--ui,Inter,sans-serif);color:var(--a-ink2,#4a5058);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:5px;}
.rnav-f button:hover{border-color:var(--a-ink3,#b9bec4);color:var(--a-ink,#171614);}
/* folded: a slim tab */
.rnav.fold{width:auto;border-radius:12px;}
.rnav.fold .rnav-list,.rnav.fold .rnav-f,.rnav.fold .rnav-prog,.rnav.fold .rnav-h small{display:none;}
.rnav.fold .rnav-h{border-bottom:0;padding:8px 8px 8px 12px;}
/* narrow screens: floating button + pop-up list */
.rnav.float{right:20px;bottom:20px;top:auto !important;left:auto !important;max-height:min(70vh,560px) !important;transform:translateY(10px) scale(.98);transform-origin:bottom right;}
.rnav.float.show{transform:none;}
.rnav-fab{position:fixed;right:20px;bottom:20px;z-index:550;display:none;align-items:center;gap:8px;border:0;cursor:pointer;
  background:#171614;color:#fff;font:600 12.5px var(--ui,Inter,sans-serif);padding:10px 14px 10px 12px;border-radius:999px;box-shadow:0 12px 28px -12px rgba(0,0,0,.5);}
.rnav-fab:hover{background:#2a2825;}
.rnav-fab.show{display:inline-flex;}
.rnav-fab em{font-style:normal;font-weight:500;opacity:.7;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
/* the section you jumped to glows briefly */
@keyframes rnavFlash{0%{box-shadow:0 0 0 0 rgba(232,119,34,0)}20%{box-shadow:0 0 0 3px rgba(232,119,34,.45)}100%{box-shadow:0 0 0 0 rgba(232,119,34,0)}}
.rnav-flash{animation:rnavFlash 1.4s ease-out;}
@media (prefers-reduced-motion:reduce){.rnav,.rnav-i::before,.rnav-prog i{transition:none;}.rnav-flash{animation:none;outline:2px solid rgba(232,119,34,.5);}}
@media print{.rnav,.rnav-fab{display:none !important;}}
`;
  const st = document.createElement('style'); st.id = 'rnavCss'; st.textContent = css; document.head.appendChild(st);

  const I = {
    list: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/></svg>',
    fold: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    open: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    up: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    down: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>'
  };

  const nav = document.createElement('nav');
  nav.className = 'rnav'; nav.setAttribute('aria-label', 'Report sections');
  const fab = document.createElement('button');
  fab.type = 'button'; fab.className = 'rnav-fab'; fab.setAttribute('aria-label', 'Jump to a report section');
  document.body.appendChild(nav); document.body.appendChild(fab);

  let items = [], sig = '', view = '', active = -1, floating = false, popOpen = false;
  let folded = false; try{ folded = localStorage.getItem(FOLD_KEY) === '1'; }catch(e){}

  /* ---------- what's on the page ---------- */
  function currentView(){
    if (typeof isPublicView !== 'undefined' && isPublicView) return null;
    const stage = document.getElementById('seoStage');
    if (!stage || !stage.offsetParent) return null;
    const on = document.querySelector('#seoModes .seo-mode.on');
    const key = on && on.dataset.seoview;
    if (!key || !VIEWS[key]) return null;
    const host = document.getElementById('seoview-' + key);
    if (!host || !host.offsetParent) return null;
    return {key, host};
  }
  const shown = el => el && el.offsetParent !== null && el.getBoundingClientRect().height > 0;

  function collect(v){
    const out = [];
    if (v.key === 'ai'){
      const head = v.host.querySelector('.aiv-head');
      if (shown(head)) out.push({el: head, label: 'Overview', group: ''});
      v.host.querySelectorAll('section.aiv-card').forEach(sec => {
        if (!shown(sec) || sec.closest('.aiv-drawer')) return;
        const h = sec.querySelector('h3'); const label = clean(h && h.textContent);
        if (label) out.push({el: sec, label, group: ''});
      });
      return out;
    }
    const ws = [...v.host.querySelectorAll('section.rp-w')].filter(w => shown(w) && !w.closest('.rp-cat-back'));
    /* Sort by where they sit on screen, so a freely arranged report reads top to bottom. */
    const pos = ws.map(w => ({w, r: w.getBoundingClientRect()}));
    pos.sort((a, b) => (Math.abs(a.r.top - b.r.top) < 8 ? a.r.left - b.r.left : a.r.top - b.r.top));
    const hasSec = pos.some(p => p.w.classList.contains('sec'));
    let group = '', lastG = '';
    pos.forEach(({w}) => {
      const type = w.dataset.type || '';
      if (w.classList.contains('sec')){
        group = clean(w.innerText).split('\n')[0].slice(0, 60) || 'Section';
        out.push({el: w, label: group, group, header: true});
        return;
      }
      let label = '';
      if (w.classList.contains('plain')){
        const h = w.querySelector('.rp-wb h1, .rp-wb h2, .rp-wb h3, h1, h2, h4');
        label = clean(h && h.textContent);
        if (!label) return;
      } else {
        const h = w.querySelector('.rp-wh h3') || w.querySelector('h3');
        label = clean(h && h.textContent);
      }
      if (!label) return;
      if (!hasSec){
        const g = GROUP[type];
        if (g && g !== lastG){ group = GNAME[g] || ''; lastG = g; }
      }
      out.push({el: w, label, group});
    });
    return out;
  }

  /* ---------- drawing ---------- */
  function headerBottom(){
    let b = 0;
    ['topNav'].forEach(id => { const e = document.getElementById(id); if (shown(e)) b = Math.max(b, e.getBoundingClientRect().bottom); });
    const tb = document.querySelector('#seoStage .topbar');
    if (shown(tb)) b = Math.max(b, tb.getBoundingClientRect().bottom);
    return Math.max(0, b);
  }

  function draw(v){
    const name = (() => { const h = v.host.querySelector('.aiv-title, .rp-title'); return clean(h && h.textContent).replace(/\s+—\s+.*$/, ''); })();
    let html = '<div class="rnav-h"><span style="color:var(--a-ink3,#8a9097);display:grid">' + I.list + '</span><div class="t"><b>On this page</b><small>' + esc(name ? name + ' · ' : '') + esc(VIEWS[v.key]) + '</small></div>' +
      '<button class="rnav-ib" type="button" data-rn-fold title="' + (floating ? 'Close' : folded ? 'Show sections' : 'Hide sections') + '" aria-label="' + (floating ? 'Close' : 'Fold') + '">' + (floating ? I.x : folded ? I.open : I.fold) + '</button></div>' +
      '<div class="rnav-prog"><i></i></div><div class="rnav-list" role="list">';
    let g = null;
    items.forEach((it, i) => {
      if (!it.header && it.group !== g && it.group){ html += '<div class="rnav-g">' + esc(it.group) + '</div>'; }
      g = it.group;
      if (it.header){ html += '<button class="rnav-g" type="button" data-rn="' + i + '" style="display:block;width:100%;text-align:left;border:0;background:none;cursor:pointer">' + esc(it.label) + '</button>'; return; }
      html += '<button class="rnav-i" type="button" role="listitem" data-rn="' + i + '" title="' + esc(it.label) + '">' + esc(it.label) + '</button>';
    });
    html += '</div><div class="rnav-f"><button type="button" data-rn-top>' + I.up + 'Top</button><button type="button" data-rn-end>' + I.down + 'Bottom</button></div>';
    nav.innerHTML = html;
    nav.classList.toggle('fold', folded && !floating);
    active = -1;
    spy(true);
  }

  function place(){
    const v = currentView();
    if (!v || !items.length){ nav.classList.remove('show'); fab.classList.remove('show'); popOpen = false; return; }
    const panels = v.host.closest('.panels') || v.host;
    const r = panels.getBoundingClientRect();
    const gutter = innerWidth - r.right;
    const wantFloat = gutter < 236 + 40;
    if (wantFloat !== floating){ floating = wantFloat; nav.classList.toggle('float', floating); draw(v); }
    const top = headerBottom() + 16;
    if (floating){
      nav.style.width = Math.min(300, innerWidth - 40) + 'px';
      nav.style.maxHeight = '';
      const listEl = nav.querySelector('.rnav-list'); if (listEl) listEl.style.maxHeight = 'calc(min(70vh,560px) - 110px)';
      nav.classList.toggle('show', popOpen);
      fab.classList.toggle('show', !popOpen);
    } else {
      fab.classList.remove('show'); popOpen = false;
      const w = Math.min(260, Math.max(200, gutter - 48));
      nav.style.width = folded ? '' : w + 'px';
      nav.style.left = folded ? '' : Math.round(r.right + Math.min(32, (gutter - w) / 2)) + 'px';
      nav.style.right = folded ? '20px' : '';
      nav.style.top = top + 'px';
      nav.style.maxHeight = (innerHeight - top - 20) + 'px';
      const listEl = nav.querySelector('.rnav-list'); if (listEl) listEl.style.maxHeight = '';
      nav.classList.add('show');
    }
  }

  /* ---------- which section is in view ---------- */
  let spyQueued = false;
  function spy(force){
    if (!items.length) return;
    const line = headerBottom() + Math.min(160, innerHeight * 0.22);
    let a = 0;
    for (let i = 0; i < items.length; i++){
      if (!items[i].el.isConnected) continue;
      if (items[i].el.getBoundingClientRect().top <= line) a = i; else break;
    }
    const se = document.scrollingElement || document.documentElement;
    const atEnd = se.scrollTop + innerHeight >= se.scrollHeight - 4;
    if (atEnd) a = items.length - 1;
    const prog = nav.querySelector('.rnav-prog i');
    if (prog){ const max = se.scrollHeight - innerHeight; prog.style.width = (max > 0 ? Math.min(100, se.scrollTop / max * 100) : 0).toFixed(1) + '%'; }
    if (a === active && !force) return;
    active = a;
    nav.querySelectorAll('[data-rn]').forEach(b => b.classList.toggle('on', +b.dataset.rn === a && b.classList.contains('rnav-i')));
    const on = nav.querySelector('.rnav-i.on'), list = nav.querySelector('.rnav-list');
    if (on && list){
      const lr = list.getBoundingClientRect(), br = on.getBoundingClientRect();
      if (br.top < lr.top + 8 || br.bottom > lr.bottom - 8) list.scrollTop += (br.top - lr.top) - lr.height / 2 + br.height / 2;
    }
    const cur = items[a];
    fab.innerHTML = I.list + 'Sections' + (cur ? '<em>· ' + esc(cur.label) + '</em>' : '');
  }
  addEventListener('scroll', () => { if (spyQueued) return; spyQueued = true; requestAnimationFrame(() => { spyQueued = false; spy(); }); }, {passive: true});
  addEventListener('resize', () => { place(); spy(true); });

  function go(i){
    const it = items[i]; if (!it || !it.el.isConnected) return;
    const y = it.el.getBoundingClientRect().top + (window.scrollY || 0) - headerBottom() - 14;
    window.scrollTo({top: Math.max(0, y), behavior: reduce() ? 'auto' : 'smooth'});
    it.el.classList.remove('rnav-flash'); void it.el.offsetWidth; it.el.classList.add('rnav-flash');
    setTimeout(() => it.el.classList.remove('rnav-flash'), 1500);
    if (floating){ popOpen = false; place(); }
  }

  nav.addEventListener('click', e => {
    const b = e.target.closest('[data-rn]');
    if (b){ go(+b.dataset.rn); return; }
    if (e.target.closest('[data-rn-top]')){ window.scrollTo({top: 0, behavior: reduce() ? 'auto' : 'smooth'}); return; }
    if (e.target.closest('[data-rn-end]')){ const se = document.scrollingElement || document.documentElement; window.scrollTo({top: se.scrollHeight, behavior: reduce() ? 'auto' : 'smooth'}); return; }
    if (e.target.closest('[data-rn-fold]')){
      if (floating){ popOpen = false; place(); return; }
      folded = !folded; try{ localStorage.setItem(FOLD_KEY, folded ? '1' : '0'); }catch(err){}
      const v = currentView(); if (v) draw(v); place();
    }
  });
  nav.addEventListener('click', e => { if (folded && !floating && e.target.closest('.rnav-h') && !e.target.closest('[data-rn-fold]')){ folded = false; try{ localStorage.setItem(FOLD_KEY, '0'); }catch(err){} const v = currentView(); if (v) draw(v); place(); } });
  fab.addEventListener('click', () => { popOpen = true; place(); spy(true); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && popOpen){ popOpen = false; place(); } });
  document.addEventListener('click', e => { if (popOpen && !nav.contains(e.target) && !fab.contains(e.target)){ popOpen = false; place(); } }, true);

  /* ---------- keep up with the page: client, tab and widget changes ---------- */
  function tick(){
    const v = currentView();
    if (!v){ if (items.length || sig){ items = []; sig = ''; view = ''; } place(); return; }
    const next = collect(v);
    const s = v.key + '|' + next.map(x => x.label + '/' + x.group).join('|');
    if (s !== sig || v.key !== view){
      const reset = v.key !== view;
      sig = s; view = v.key; items = next;
      if (reset) popOpen = false;
      if (items.length) draw(v);
    } else {
      /* Same sections, maybe re-rendered: keep the element references fresh. */
      items = next;
    }
    place();
  }
  setInterval(tick, 700);
  tick();
  window.EDGE_reportNav = {refresh: tick, go};
})();
