/* ==========================================================================
   EDGE DESIGN SYSTEM · behaviour (pairs with the last section of edge.css)

     Clients board   Home gets the Easyleads "every client in one place" board:
                     one card per client with its logo, its status and the four
                     pillars it uses (SEO · Google Ads · Web Maintenance ·
                     Reporting), a search, and a sliding filter. A pillar on a card
                     opens that client in that pillar.
     New client      One guided setup for all four pillars, in three steps:
                       1. Client      name, website, lead, status, CMS
                       2. Services    pick what EDGE does for them, and fill in
                                      only what each one needs (keywords and
                                      markets, the Business Profile, the Google
                                      Ads account, maintenance, the report email)
                       3. Review      what will be created, then Create
                     It runs through the same loading screen and checks as before
                     (logo, tracker, GA4, Search Console, forms snippet: edge-ui.js)
                     and then sets up each pillar, ending on one summary.
                     The SEO client list's add buttons and Home open it.

   Writes only what a person would write by hand in the same screens: an SEO
   client, its keywords, a Business Profile client and its link, maintOn, an
   ad-account link and the client's report schedule.
   ========================================================================== */
(function(){
'use strict';
if (typeof state === 'undefined') return;

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const normDomain = v => String(v || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[\/?#:]/)[0];
const RM = () => { try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
const OS = () => window.EDGE_OS || null;
const SEO = () => (window.EDGE && window.EDGE.seo) || {};
const seoRender = () => { try{ SEO().renderTree(); }catch(e){} try{ SEO().renderAll(); }catch(e){} };
const UI = () => window.EDGE_UI || null;
const toastMsg = (m, k) => { try{ if (OS() && OS().fx) OS().fx.toast(m, k); else toast(m, k); }catch(e){} };
const lines = v => String(v || '').split(/[\n,;]+/).map(x => x.trim()).filter(Boolean);
const uniq = a => { const s = new Set(), out = []; a.forEach(x => { const k = x.toLowerCase(); if (!s.has(k)){ s.add(k); out.push(x); } }); return out; };
const emails = v => String(v || '').split(/[\s,;]+/).map(x => x.trim()).filter(x => /.+@.+\..+/.test(x));

/* the whole tool wears the design system */
const wear = () => { if (document.body && !document.body.classList.contains('eds')) document.body.classList.add('eds'); };
wear();
try{ new MutationObserver(wear).observe(document.body, {attributes: true, attributeFilter: ['class']}); }catch(e){}

/* ---------- icons ---------- */
const P = {
  plus: 'M12 5v14M5 12h14', search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3',
  seo: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3M8 11.5l2 2 4-4',
  gbp: 'M12 21s-7-5.33-7-11a7 7 0 0 1 14 0c0 5.67-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  ads: 'M3 11v2a2 2 0 0 0 2 2h1l4 4V5L6 9H5a2 2 0 0 0-2 2zM15 8a5 5 0 0 1 0 8M18 5a9 9 0 0 1 0 14',
  maint: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
  report: 'M3 3v18h18M7 15l4-4 3 3 5-6', user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  check: 'M20 6 9 17l-5-5', arrowR: 'M5 12h13M13 6l6 6-6 6', arrowL: 'M19 12H6M11 6l-6 6 6 6', globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  sparkle: 'M12 3l1.8 4.9L19 9.7l-4.9 1.8L12 16.4l-1.8-4.9L5.3 9.7l4.9-1.8z'
};
const ic = (k, cls) => '<svg class="' + (cls || 'eds-i') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (P[k] || P.check) + '"/></svg>';

/* Easyleads ripple on the new buttons (calm.js does the older ones) */
document.addEventListener('pointerdown', e => {
  const b = e.target.closest && e.target.closest('.eds-btn'); if (!b || RM()) return;
  const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height), rip = document.createElement('span');
  rip.className = 'eds-rip'; rip.style.cssText = 'position:absolute;border-radius:50%;pointer-events:none;width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px;background:' + (b.classList.contains('pri') || b.classList.contains('dark') ? 'rgba(255,255,255,.45)' : 'rgba(0,40,46,.08)') + ';transform:scale(0);animation:edsRip .6s cubic-bezier(.2,.8,.2,1)';
  b.appendChild(rip); setTimeout(() => rip.remove(), 650);
}, true);

/* ==========================================================================
   What each client uses (read only)
   ========================================================================== */
const PILLARS = [
  {k: 'seo', l: 'SEO', long: 'SEO rankings'},
  {k: 'ads', l: 'Ads', long: 'Google Ads'},
  {k: 'maint', l: 'Care', long: 'Web Maintenance'},
  {k: 'report', l: 'Reports', long: 'Reporting'}
];
const isArchived = c => { const f = (state.seoFolders || []).find(x => x && x.id === c.folderId); return !!(f && /inactive|archiv/i.test(f.name)); };
const isAdsOnly = c => { const f = (state.seoFolders || []).find(x => x && x.id === c.folderId); return !!(f && /ads only|paid only|google ads/i.test(f.name)); };
const logoOf = c => { if (c.logoUrl) return c.logoUrl; const d = normDomain(c.website); return d.indexOf('.') > -1 ? 'https://www.google.com/s2/favicons?sz=128&domain=' + encodeURIComponent(d) : ''; };
const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

function usage(c){
  const kws = c.keywords || [];
  let ranked = 0, top3 = 0, top10 = 0, locs = 0;
  kws.forEach(k => (k.locations || []).forEach(l => { locs++; if (l.rank > 0){ ranked++; if (l.rank <= 3) top3++; if (l.rank <= 10) top10++; } }));
  let gbp = null; try{ gbp = window.EDGE_gbpFor ? window.EDGE_gbpFor(c) : null; }catch(e){}
  let ads = []; try{ const ch = OS() && OS().channels; if (ch) ads = ch.list('google_ads').filter(a => { const l = ch.link(a); return l && l.id === c.id; }); }catch(e){}
  let maint = null; try{ const M = window.EDGE_maint; if (M && M.sites().indexOf(c) > -1) maint = M.statusOf(c).key; }catch(e){}
  let report = null; try{ const r = OS() && OS().reporting.cfg().clients[c.id]; if (r && r.on && (r.to || []).length) report = r; }catch(e){}
  return {kws: kws.length, locs, ranked, top3, top10, gbp, ads, maint, report,
    on: {seo: kws.length > 0 || !!gbp, ads: ads.length > 0, maint: !!maint, report: !!report}};
}

/* ==========================================================================
   Clients board (home)
   ========================================================================== */
const Board = {
  filter: 'all', q: '', sig: '',
  mount(){
    const hub = $('osHub'); if (!hub) return null;
    let b = $('edsBoard');
    if (!b){
      b = document.createElement('section'); b.id = 'edsBoard'; b.className = 'eds-home';
      hub.insertAdjacentElement('afterend', b);
      b.innerHTML =
        '<div class="eds-hrow"><div><div class="eds-eyebrow"><i></i>EDGE clients</div><h2>Every client, <span>one place.</span></h2>' +
        '<p>Add a client once and set up SEO, Google Ads, Web Maintenance and Reporting in the same flow. Open any pillar for that client from its card.</p></div>' +
        '<div class="eds-acts"><button type="button" class="eds-btn pri" data-new>' + ic('plus') + 'New client</button></div></div>' +
        '<div class="eds-bar"><label class="eds-search">' + ic('search') + '<input type="search" data-q placeholder="Find a client, website or project lead" autocomplete="off"></label>' +
        '<div class="eds-seg" data-seg><span class="pill"></span>' +
          [['all', 'All'], ['seo', 'SEO'], ['ads', 'Google Ads'], ['maint', 'Maintenance'], ['report', 'Reporting'], ['setup', 'Needs setup']].map(x => '<button type="button" data-f="' + x[0] + '"' + (x[0] === this.filter ? ' class="on"' : '') + '>' + x[1] + '</button>').join('') +
        '</div></div><div class="eds-grid" data-grid></div>';
      b.querySelector('[data-new]').addEventListener('click', () => Setup.open());
      b.querySelector('[data-q]').addEventListener('input', e => { this.q = e.target.value; this.paint(true); });
      b.querySelectorAll('[data-f]').forEach(x => x.addEventListener('click', () => { this.filter = x.dataset.f; b.querySelectorAll('[data-f]').forEach(y => y.classList.toggle('on', y === x)); this.pill(); this.paint(true); }));
      b.addEventListener('click', e => this.click(e));
      requestAnimationFrame(() => this.pill());
    }
    return b;
  },
  pill(){
    const b = $('edsBoard'); if (!b) return;
    const seg = b.querySelector('[data-seg]'), on = seg.querySelector('button.on'), p = seg.querySelector('.pill');
    if (on && p){ p.style.left = on.offsetLeft + 'px'; p.style.width = on.offsetWidth + 'px'; }
  },
  list(){
    const q = this.q.trim().toLowerCase();
    return (state.seoClients || []).filter(Boolean).filter(c => !isArchived(c)).map(c => ({c, u: usage(c)}))
      .filter(x => !q || [x.c.name, x.c.website, x.c.projectLead].some(v => String(v || '').toLowerCase().indexOf(q) > -1))
      .filter(x => this.filter === 'all' ? true : this.filter === 'setup' ? PILLARS.filter(p => x.u.on[p.k]).length < 2 || !x.c.website : x.u.on[this.filter])
      .sort((a, b) => String(a.c.name || '').localeCompare(String(b.c.name || '')));
  },
  card(x, i){
    const c = x.c, u = x.u, src = logoOf(c);
    const st = String(c.status || 'Active'), warnSt = /pause|onboard|inactive/i.test(st);
    const pl = p => {
      const on = u.on[p.k];
      const v = p.k === 'seo' ? (u.kws ? u.kws + '<small> kw</small>' : (u.gbp ? 'Map' : 'Off')) : p.k === 'ads' ? (u.ads.length ? u.ads.length + '<small> acct</small>' : 'Off') :
        p.k === 'maint' ? (u.maint === 'ok' ? 'Done' : u.maint === 'due' ? 'Due' : u.maint === 'paused' ? 'Paused' : 'Off') : (u.report ? 'Monthly' : 'Off');
      return '<span role="button" tabindex="0" class="eds-pl ' + p.k + (on ? '' : ' off') + '" data-go="' + p.k + '" title="' + esc((on ? 'Open ' : 'Set up ') + p.long + ' for ' + c.name) + '">' + esc(p.l) + '<b>' + v + '</b></span>';
    };
    const segs = Array.from({length: 8}, (_, k) => '<b' + (u.locs && k < Math.round(u.top10 / Math.max(1, u.locs) * 8) ? ' class="on"' : '') + '></b>').join('');
    return '<article class="eds-card" data-id="' + esc(c.id) + '" style="animation-delay:' + Math.min(i * 40, 400) + 'ms">' +
      '<div class="eds-plate"><div class="tl"><span class="eds-tag st' + (warnSt ? ' warn' : '') + '"><i></i>' + esc(st) + '</span></div>' +
        (src ? '<div class="eds-logo"><img alt="" src="' + esc(src) + '" referrerpolicy="no-referrer" onerror="this.parentNode.innerHTML=\'<span class=&quot;eds-ini&quot;>' + esc(initials(c.name)) + '</span>\'"></div>' : '<span class="eds-ini">' + esc(initials(c.name)) + '</span>') + '</div>' +
      '<div class="eds-body"><div class="eds-ch"><h3>' + esc(c.name || 'Untitled client') + '</h3><div class="dm">' + esc(normDomain(c.website) || 'No website yet') + (c.projectLead ? ' · ' + esc(c.projectLead) : '') + '</div></div>' +
        '<div class="eds-pillars">' + PILLARS.map(pl).join('') + '</div>' +
        '<div class="eds-health"><span class="segs">' + segs + '</span><span>' + (u.locs ? u.top10 + ' of ' + u.locs + ' on page one' + (u.top3 ? ' · ' + u.top3 + ' top 3' : '') : 'No rankings yet') + '</span></div></div></article>';
  },
  paint(force){
    if (!$('hubScreen') || !$('osHub')) return;
    const b = this.mount(); if (!b) return;
    const L = this.list();
    const sig = this.filter + '|' + this.q + '|' + L.map(x => x.c.id + ':' + x.c.name + ':' + x.c.logoUrl + ':' + x.c.status + ':' + JSON.stringify(x.u.on) + x.u.kws + x.u.top10 + x.u.maint).join(',');
    if (!force && sig === this.sig) return;
    this.sig = sig;
    const g = b.querySelector('[data-grid]');
    g.innerHTML = L.map((x, i) => this.card(x, i)).join('') +
      (this.filter === 'all' && !this.q ? '<button type="button" class="eds-add" data-new><span class="pl">' + ic('plus') + '</span>New client<small style="font-weight:500;color:var(--soft)">SEO · Ads · Maintenance · Reporting</small></button>' : '') +
      (!L.length && (this.q || this.filter !== 'all') ? '<div class="eds-empty">No clients match.</div>' : '');
    const add = g.querySelector('[data-new]'); if (add) add.addEventListener('click', () => Setup.open());
  },
  click(e){
    const card = e.target.closest('.eds-card'); if (!card) return;
    const c = (state.seoClients || []).find(x => x.id === card.dataset.id); if (!c) return;
    const p = e.target.closest('[data-go]');
    openClient(c, p ? p.dataset.go : 'seo');
  }
};

function openClient(c, pillar){
  const os = OS(); if (!os) return;
  const u = usage(c);
  try{
    if (pillar === 'seo'){
      state.activeSeoClientId = c.id;
      if (!u.kws && u.gbp){
        state.activeClientId = u.gbp.id; state.activeGbpId = (u.gbp.gbps[0] || {}).id; state.view = 'focus';
        os.go('seo', 'gbp'); setTimeout(() => { try{ renderAll(); }catch(e){} }, 60); return;
      }
      os.go('seo', 'seo'); setTimeout(() => { seoRender(); }, 60);
    } else if (pillar === 'ads'){
      if (!u.ads.length){ Setup.open({client: c, focus: 'ads'}); return; }
      os.go('ads');
    } else if (pillar === 'maint'){
      if (!u.maint){ Setup.open({client: c, focus: 'maint'}); return; }
      os.go('maint'); setTimeout(() => { try{ window.EDGE_maint.open(c); }catch(e){} }, 120);
    } else if (pillar === 'report'){
      state.activeSeoClientId = c.id;
      os.go('report'); setTimeout(() => { seoRender(); }, 120);
    }
  }catch(e){}
}

/* repaint when home opens and while it is open */
function watchHub(){
  const hs = $('hubScreen'); if (!hs) return;
  const tick = () => { if (hs.classList.contains('on') || getComputedStyle(hs).display !== 'none') Board.paint(false); };
  new MutationObserver(() => { Board.sig = ''; tick(); setTimeout(() => Board.pill(), 50); }).observe(hs, {attributes: true, attributeFilter: ['class', 'style']});
  setInterval(tick, 2500);
  tick();
}

/* ==========================================================================
   New client setup
   ========================================================================== */
const Setup = {
  open(opts){
    opts = opts || {};
    const existing = opts.client || null;
    if (existing) return this.addPillar(existing, opts.focus);
    const leads = Array.from(new Set((state.seoClients || []).map(c => c.projectLead).filter(Boolean))).sort();
    const regions = (typeof REGIONS !== 'undefined' ? REGIONS : [{label: 'Canada — English'}]);
    let adsAccts = [];
    try{ const ch = OS().channels; adsAccts = ch.list('google_ads').filter(a => !ch.link(a)).sort((a, b) => String(a.name).localeCompare(String(b.name))); }catch(e){}
    const rcfg = (() => { try{ return OS().reporting.cfg(); }catch(e){ return {day: 1, hour: 8}; } })();
    const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
    const pre = new Set(opts.pillars || ['seo', 'report']);
    const pick = (k, title, sub, icon) => '<button type="button" class="' + k + (pre.has(k) ? ' on' : '') + '" data-p="' + k + '"><span class="ti">' + ic(icon) + '</span><b>' + title + '</b><small>' + sub + '</small><span class="ck"></span></button>';
    const sec = (k, icon, title, body) => '<div class="eds-sec ' + k + '" data-sec="' + k + '"' + (pre.has(k) ? '' : ' hidden') + '><h4><span class="d">' + ic(icon) + '</span>' + title + '</h4>' + body + '</div>';

    const back = document.createElement('div'); back.className = 'eds-back';
    back.innerHTML = '<div class="eds-modal" role="dialog" aria-modal="true" aria-labelledby="edsSetupT">' +
      '<div class="eds-mh"><h2 id="edsSetupT">New client</h2><p>One setup for everything EDGE does for them. You can add or change any of it later.</p>' +
        '<div class="eds-steps">' + ['Client', 'Services', 'Review'].map((l, i) => '<button type="button" data-step="' + i + '"' + (i === 0 ? ' class="on"' : '') + '><span class="n">' + (i + 1) + '</span><span class="lb">' + l + '</span><span class="ln"></span></button>').join('') + '</div></div>' +
      '<form class="eds-mb" novalidate>' +
        /* 1 · client */
        '<div class="eds-pane" data-pane="0">' +
          '<div class="eds-row2"><div><label class="eds-f">Client name</label><input class="eds-in" name="name" placeholder="e.g. Black Rock Garage" autocomplete="off"></div>' +
          '<div><label class="eds-f">Website <small>example.com</small></label><input class="eds-in" name="site" placeholder="blackrockgarage.ca" autocomplete="off" inputmode="url"></div></div>' +
          '<div class="eds-row2"><div><label class="eds-f">Project lead <small>optional</small></label><input class="eds-in" name="lead" list="edsLeads" autocomplete="off"><datalist id="edsLeads">' + leads.map(l => '<option value="' + esc(l) + '">').join('') + '</datalist></div>' +
          '<div><label class="eds-f">Status</label><select class="eds-in" name="status"><option>Active</option><option>Onboarding</option><option>Paused</option></select></div></div>' +
          '<label class="eds-f">Website platform <small>WordPress sites join Web Maintenance on their own</small></label><select class="eds-in" name="cms"><option value="">Not sure, detect it from the site</option><option>WordPress</option><option>Shopify</option><option>Wix</option><option>Squarespace</option><option>Webflow</option><option>Other</option></select>' +
          '<div class="eds-note">The logo is found from the website, and Google Analytics, Search Console and the forms snippet are checked for you once the client is created.</div>' +
        '</div>' +
        /* 2 · services */
        '<div class="eds-pane" data-pane="1" hidden>' +
          '<div class="eds-pick" data-picks>' +
            pick('seo', 'SEO rankings', 'Keywords tracked on Google, by market and city', 'seo') +
            pick('gbp', 'Local map grid', 'Their Google Business Profile, ranked on a geo-grid', 'gbp') +
            pick('ads', 'Google Ads', 'Spend, results and alerts, read monthly', 'ads') +
            pick('maint', 'Web Maintenance', 'The monthly WordPress care checklist', 'maint') +
            pick('report', 'Monthly reporting', 'An emailed client report every month', 'report') +
          '</div>' +
          sec('seo', 'seo', 'SEO rankings',
            '<label class="eds-f">Keywords <small>one per line, or separated by commas</small></label><textarea class="eds-in" name="kws" placeholder="concrete contractor red deer&#10;driveway paving&#10;stamped concrete"></textarea>' +
            '<div class="eds-row3"><div><label class="eds-f">Cities <small>optional · each keyword is tracked in each city</small></label><input class="eds-in" name="locs" placeholder="Red Deer, Alberta; Calgary, Alberta" autocomplete="off"></div>' +
            '<div><label class="eds-f">Market</label><select class="eds-in" name="region">' + regions.map((r, i) => '<option value="' + i + '">' + esc(r.label) + '</option>').join('') + '</select></div></div>') +
          sec('gbp', 'gbp', 'Local map grid',
            '<div class="eds-row2"><div><label class="eds-f">Business name on Google <small>as it shows on Maps</small></label><input class="eds-in" name="biz" autocomplete="off"></div>' +
            '<div><label class="eds-f">Location name</label><input class="eds-in" name="gloc" value="Main location" autocomplete="off"></div></div>' +
            '<label class="eds-f">Google Maps link <small>optional · helps the scan recognise the listing</small></label><input class="eds-in" name="glink" placeholder="https://maps.google.com/…" autocomplete="off">' +
            '<button type="button" class="eds-tog on" data-tog="gkw"><i></i>Use the SEO keywords for the map grid too</button>' +
            '<div class="eds-note">The grid centre and size are set on the profile’s <b>Setup</b> tab, where you can search the address and see the grid on the map.</div>') +
          sec('ads', 'ads', 'Google Ads',
            (adsAccts.length ? '<label class="eds-f">Account <small>' + adsAccts.length + ' not linked to a client yet</small></label><select class="eds-in" name="adsAcct"><option value="">Match it automatically when the account is read</option>' + adsAccts.map(a => '<option value="' + esc(a.source + '|' + a.id) + '">' + esc(a.name || a.id) + (a.id ? ' · ' + esc(a.id) : '') + '</option>').join('') + '</select>' : '') +
            '<div class="eds-note">Google Ads is read only. Accounts are read from Google Ads each month and matched to the client by its name or website' + (adsAccts.length ? ', or link one now above.' : '. Every account is already linked, so this one will appear after the next monthly read.') + '</div>') +
          sec('maint', 'maint', 'Web Maintenance',
            '<div class="eds-note">The site joins the monthly care checklist and shows as <b>due</b> until this month’s maintenance is marked done. Reminders go out on the 1st.</div>') +
          sec('report', 'report', 'Monthly reporting',
            '<label class="eds-f">Send the report to <small>client emails, separated by commas</small></label><input class="eds-in" name="rto" placeholder="owner@client.ca" autocomplete="off" inputmode="email">' +
            '<label class="eds-f">CC <small>optional</small></label><input class="eds-in" name="rcc" autocomplete="off" inputmode="email">' +
            '<div class="eds-note">The report is built from the monthly template using the channels this client has, published, and emailed on the <b>' + ord(rcfg.day || 1) + '</b> of each month. Leave the email empty to build the report without sending it.</div>') +
        '</div>' +
        /* 3 · review */
        '<div class="eds-pane" data-pane="2" hidden><div class="eds-review" data-review></div></div>' +
        '<div class="eds-err" hidden></div>' +
      '</form>' +
      '<div class="eds-mf"><button type="button" class="eds-btn ghost" data-back>' + ic('arrowL') + 'Back</button><span class="sp"></span><small data-hint>Step 1 of 3</small><button type="button" class="eds-btn" data-cancel>Cancel</button><button type="button" class="eds-btn pri" data-next>Continue' + ic('arrowR') + '</button></div>' +
    '</div>';
    document.body.appendChild(back);

    const f = back.querySelector('form'), er = back.querySelector('.eds-err');
    let step = 0;
    const picked = () => new Set([...back.querySelectorAll('[data-picks] button.on')].map(b => b.dataset.p));
    const close = () => { back.style.transition = 'opacity .2s'; back.style.opacity = 0; setTimeout(() => back.remove(), 200); document.removeEventListener('keydown', key); };
    const key = e => { if (e.key === 'Escape') close(); if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON'){ e.preventDefault(); next(); } };
    document.addEventListener('keydown', key);
    back.addEventListener('mousedown', e => { if (e.target === back) close(); });
    back.querySelector('[data-cancel]').addEventListener('click', close);
    const fail = t => { er.hidden = false; er.textContent = t; return false; };

    /* pick a service: its section slides in */
    back.querySelectorAll('[data-picks] button').forEach(b => b.addEventListener('click', () => {
      b.classList.toggle('on');
      const s = back.querySelector('[data-sec="' + b.dataset.p + '"]'); if (s) s.hidden = !b.classList.contains('on');
      if (b.dataset.p === 'gbp' && b.classList.contains('on') && !f.biz.value) f.biz.value = f.name.value.trim();
    }));
    back.querySelectorAll('[data-tog]').forEach(t => t.addEventListener('click', () => t.classList.toggle('on')));
    f.cms.addEventListener('change', () => {
      const m = back.querySelector('[data-picks] .maint'), on = f.cms.value === 'WordPress';
      if (on && !m.classList.contains('on')) m.click();
    });

    const data = () => {
      const name = f.name.value.trim(), domain = normDomain(f.site.value);
      return {name, domain, site: domain ? 'https://' + domain : '', lead: f.lead.value.trim(), status: f.status.value, cms: f.cms.value,
        pillars: picked(), kws: uniq(lines(f.kws.value)), locs: uniq(String(f.locs.value || '').split(';').map(x => x.trim()).filter(Boolean)), region: +f.region.value || 0,
        biz: f.biz.value.trim() || name, gloc: f.gloc.value.trim() || 'Main location', glink: f.glink.value.trim(), gkw: back.querySelector('[data-tog="gkw"]').classList.contains('on'),
        adsAcct: f.adsAcct ? f.adsAcct.value : '', rto: emails(f.rto.value), rcc: emails(f.rcc.value)};
    };
    const valid = k => {
      er.hidden = true;
      const d = data();
      if (k === 0){
        if (!d.name) { f.name.focus(); return fail('Give the client a name.'); }
        if (f.site.value.trim() && d.domain.indexOf('.') < 0){ f.site.focus(); return fail('That website doesn’t look right. Use something like example.com.'); }
        const dup = d.domain && (state.seoClients || []).find(c => normDomain(c.website) === d.domain);
        if (dup) return fail(dup.name + ' already uses ' + d.domain + '. Open it from its card to add services.');
        const dn = (state.seoClients || []).find(c => String(c.name || '').trim().toLowerCase() === d.name.toLowerCase());
        if (dn) return fail('There is already a client called ' + dn.name + '.');
      }
      if (k === 1){
        if (!d.pillars.size) return fail('Pick at least one service.');
        if (d.pillars.has('report') && String(f.rto.value).trim() && !d.rto.length) return fail('The report email doesn’t look right.');
      }
      return true;
    };
    const review = () => {
      const d = data(), on = k => d.pillars.has(k);
      const rv = (k, icon, title, text, isOn) => '<div class="eds-rv ' + k + (isOn ? '' : ' off') + '"><span class="d">' + ic(icon) + '</span><div class="t"><b>' + title + '</b><small>' + text + '</small></div>' + (isOn ? '<span class="eds-tag st"><i></i>Set up</span>' : '<span class="eds-tag off"><i></i>Not now</span>') + '</div>';
      const R = regions[d.region] || {label: ''};
      back.querySelector('[data-review]').innerHTML =
        rv('', 'user', esc(d.name), esc(d.domain || 'No website yet') + ' · ' + esc(d.status) + (d.lead ? ' · ' + esc(d.lead) : '') + (d.cms ? ' · ' + esc(d.cms) : ''), true) +
        rv('seo', 'seo', 'SEO rankings', d.kws.length ? d.kws.length + ' keyword' + (d.kws.length === 1 ? '' : 's') + (d.locs.length ? ' × ' + d.locs.length + ' cit' + (d.locs.length === 1 ? 'y' : 'ies') : ' across ' + esc(R.label)) : 'The client, ready for keywords', on('seo')) +
        rv('gbp', 'gbp', 'Local map grid', esc(d.biz) + ' · ' + esc(d.gloc) + (d.gkw && d.kws.length ? ' · ' + d.kws.length + ' grid keywords' : ''), on('gbp')) +
        rv('ads', 'ads', 'Google Ads', d.adsAcct ? 'Linked to ' + esc((f.adsAcct.selectedOptions[0] || {}).textContent || '') : 'Matched when the account is read', on('ads')) +
        rv('maint', 'maint', 'Web Maintenance', 'Monthly care checklist, due until marked done', on('maint') || d.cms === 'WordPress') +
        rv('report', 'report', 'Monthly reporting', d.rto.length ? 'Emailed to ' + esc(d.rto.join(', ')) : 'Built and published, not emailed yet', on('report'));
    };
    const show = k => {
      step = k;
      back.querySelectorAll('[data-pane]').forEach(p => { p.hidden = +p.dataset.pane !== k; });
      back.querySelectorAll('[data-step]').forEach(b => { const i = +b.dataset.step; b.className = i < k ? 'ok' : i === k ? 'on' : ''; });
      back.querySelector('[data-back]').style.visibility = k ? 'visible' : 'hidden';
      back.querySelector('[data-hint]').textContent = 'Step ' + (k + 1) + ' of 3';
      back.querySelector('[data-next]').innerHTML = k === 2 ? ic('sparkle') + 'Create client' : 'Continue' + ic('arrowR');
      if (k === 2) review();
      if (k === 1 && !f.biz.value) f.biz.value = f.name.value.trim();
      back.querySelector('.eds-modal').scrollTop = 0;
      setTimeout(() => { const i = back.querySelector('[data-pane="' + k + '"] input,[data-pane="' + k + '"] textarea'); if (i && k === 0) i.focus(); }, 60);
    };
    const next = () => { if (step < 2){ if (valid(step)) show(step + 1); } else if (valid(0) && valid(1)){ const d = data(); close(); this.run(d); } };
    back.querySelector('[data-next]').addEventListener('click', next);
    back.querySelector('[data-back]').addEventListener('click', () => { er.hidden = true; if (step) show(step - 1); });
    back.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => { const k = +b.dataset.step; if (k < step) show(k); else if (k === step + 1 && valid(step)) show(k); }));
    if (opts.name) f.name.value = opts.name;
    show(0);
  },

  /* creates the client through edge-ui's setup, then each pillar */
  async run(d){
    const ui = UI(); if (!ui || !ui.runNewClient){ toastMsg('The setup could not start. Reload and try again.', 'del'); return; }
    const P = d.pillars, extra = [], done = {};
    if (P.has('seo') && d.kws.length) extra.push('Adding ' + d.kws.length + ' keyword' + (d.kws.length === 1 ? '' : 's'));
    if (P.has('gbp')) extra.push('Creating the Business Profile grid');
    if (P.has('ads')) extra.push('Linking Google Ads');
    if (P.has('maint') || d.cms === 'WordPress') extra.push('Adding Web Maintenance');
    if (P.has('report')) extra.push('Building the monthly report');
    await ui.runNewClient({
      name: d.name, site: d.site, domain: d.domain, lead: d.lead, status: d.status, cms: d.cms,
      maintOn: P.has('maint') ? true : undefined,
      extraSteps: extra,
      extra: async (go, c, R, first) => {
        let i = first;
        const step = () => go(i++);
        if (P.has('seo') && d.kws.length){
          step();
          d.kws.forEach(text => {
            let k = c.keywords.find(x => String(x.text).toLowerCase() === text.toLowerCase());
            if (!k){ k = {id: uid(), text, locations: []}; c.keywords.push(k); }
            d.locs.forEach(lbl => { if (!k.locations.some(l => String(l.label).toLowerCase() === lbl.toLowerCase())) k.locations.push(SEO().blankLocation(lbl, d.region)); });
          });
          done.seo = {kws: d.kws.length, locs: d.locs.length};
          try{ save(); }catch(e){} seoRender();
        }
        if (P.has('gbp')){
          step();
          const g = blankGbp(d.gloc);
          g.bizName = d.biz; g.website = d.site; g.gbpLink = d.glink;
          if (d.locs[0]) g.center.label = d.locs[0];
          if (d.gkw) g.keywords = d.kws.map(text => ({id: uid(), text, scans: []}));
          g.activeKeywordId = g.keywords[0] ? g.keywords[0].id : null;
          const gc = {id: uid(), name: d.name, gbps: [g], compareScans: []};
          state.clients.push(gc);
          try{ OS().setGbpLink(c, gc); }catch(e){}
          done.gbp = {gc, g};
          try{ save(); }catch(e){}
        }
        if (P.has('ads')){
          step();
          if (d.adsAcct){
            try{ const ch = OS().channels, a = ch.list(d.adsAcct.split('|')[0]).find(x => x.source + '|' + x.id === d.adsAcct); if (a){ ch.setLink(a, c.id); done.ads = a.name || a.id; } }catch(e){ R.errors.push('Google Ads: ' + e.message); }
          } else done.ads = '';
        }
        if (P.has('maint') || d.cms === 'WordPress' || /wordpress/i.test(c.cms || '')){
          step();
          if (P.has('maint')) c.maintOn = true;
          done.maint = (() => { try{ return window.EDGE_maint.sites().indexOf(c) > -1; }catch(e){ return P.has('maint'); } })();
          try{ save(); }catch(e){}
        }
        if (P.has('report')){
          step();
          const os = OS(), RA = window.EdgeReportsApp;
          done.report = {built: false, published: false, sent: false, to: d.rto};
          try{
            if (os && os.reporting){
              const n = os.reporting.cfg(); n.clients = Object.assign({}, n.clients); n.clients[c.id] = {on: d.rto.length > 0, to: d.rto, cc: d.rcc}; os.reporting.setCfg(n);
              if (os.reporting.buildTemplate(c, true)) done.report.built = true;
            }
            if (RA && RA.publish){ go(i - 1, 'Publishing the report…'); await RA.publish(c); done.report.published = true; }
            if (d.rto.length && os && os.mailer){ go(i - 1, 'Scheduling the email…'); try{ await os.mailer.push(); done.report.sent = true; }catch(e){ done.report.mailErr = e.message; } }
          }catch(e){ done.report.err = e.message; }
        }
        try{ save(); }catch(e){} seoRender();
        try{ if (OS() && OS().repaintHub) OS().repaintHub(); }catch(e){}
        Board.sig = '';
      },
      extraRows: (c, R, row) => {
        let out = '';
        if (done.seo) out += row('ok', 'search', 'SEO rankings', done.seo.kws + ' keyword' + (done.seo.kws === 1 ? '' : 's') + (done.seo.locs ? ' in ' + done.seo.locs + ' cit' + (done.seo.locs === 1 ? 'y' : 'ies') + '. Run the first scan from the Keywords tab.' : '. Add a city to each from the Keywords tab to start scanning.'), 'Added');
        if (done.gbp) out += row('ok', 'globe', 'Local map grid', esc(done.gbp.g.bizName) + ' · ' + esc(done.gbp.g.name) + '. Set the grid centre on its Setup tab, then run the scan.', 'Created');
        if ('ads' in done) out += row(done.ads ? 'ok' : 'warn', 'chart', 'Google Ads', done.ads ? 'Linked to <b>' + esc(done.ads) + '</b>.' : 'Matched by name or website when Google Ads is next read.', done.ads ? 'Linked' : 'Next read');
        if ('maint' in done) out += row(done.maint ? 'ok' : 'warn', 'check', 'Web Maintenance', done.maint ? 'On the monthly care checklist. Due until this month is marked done.' : 'Not on the checklist.', done.maint ? 'Added' : 'Off');
        if (done.report){ const r = done.report;
          out += row(r.err ? 'warn' : 'ok', 'mail', 'Monthly reporting', r.err ? esc(r.err) : (r.built ? 'Built from the monthly template' : 'Report ready') + (r.published ? ', published' : '') + (r.sent ? ' and emailed to ' + esc(r.to.join(', ')) + ' each month.' : r.to.length ? '. The email starts once the AI Visibility Tracker is connected.' : '. Add a client email in Reporting to send it.'), r.err ? 'Check' : r.sent ? 'Scheduled' : 'Ready'); }
        return out;
      }
    });
    Board.sig = ''; Board.paint(true);
  },

  /* An existing client: add one pillar from its card */
  addPillar(c, k){
    const ui = UI(); if (!ui) return;
    if (k === 'maint'){
      c.maintOn = true; try{ save(); }catch(e){}
      toastMsg(c.name + ' added to Web Maintenance', 'add');
      Board.sig = ''; Board.paint(true); openClient(c, 'maint'); return;
    }
    if (k === 'ads'){
      let accts = []; try{ const ch = OS().channels; accts = ch.list('google_ads').filter(a => !ch.link(a)); }catch(e){}
      const m = ui.modal('<h2>Google Ads for ' + esc(c.name) + '</h2><p class="s">Google Ads is read only. Link the account now, or it is matched by name or website when Google Ads is next read.</p>' +
        (accts.length ? '<label class="f">Account</label><select class="in" data-a>' + accts.map(a => '<option value="' + esc(a.id) + '">' + esc(a.name || a.id) + ' · ' + esc(a.id) + '</option>').join('') + '</select>' : '<div class="note">Every account that has been read is already linked to a client.</div>') +
        '<div class="mf"><button class="eui-btn" type="button" data-close>Close</button>' + (accts.length ? '<button class="eui-btn pri" type="button" data-ok>Link account</button>' : '<button class="eui-btn pri" type="button" data-open>Open Google Ads</button>') + '</div>');
      const ok = m.el.querySelector('[data-ok]'), op = m.el.querySelector('[data-open]');
      if (ok) ok.addEventListener('click', () => { const id = m.el.querySelector('[data-a]').value, a = accts.find(x => String(x.id) === id); if (a){ OS().channels.setLink(a, c.id); toastMsg('Linked ' + (a.name || a.id), 'add'); } m.close(); Board.sig = ''; Board.paint(true); });
      if (op) op.addEventListener('click', () => { m.close(); OS().go('ads'); });
    }
  }
};

/* ==========================================================================
   Every "add client" button opens the setup
   ========================================================================== */
function rebind(id, fn){
  const old = $(id); if (!old || old.dataset.eds) return;
  const nb = old.cloneNode(true); nb.dataset.eds = '1'; nb.dataset.eui = '1';
  old.parentNode.replaceChild(nb, old);
  nb.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); fn(); });
}
function hookAll(){
  rebind('seoAddClientBtn', () => Setup.open());
  rebind('seoEmptyAddBtn', () => Setup.open());
  /* The GBP Tracker's own "+" stays a quick name-only add for a profile-only client. */
}

/* Reporting home's "Add a client" card: the same setup, with reporting picked */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('.rh-card.add[data-add]'); if (!b) return;
  e.preventDefault(); e.stopImmediatePropagation(); Setup.open({pillars: ['report', 'seo']});
}, true);

window.EDGE_DS = {setup: o => Setup.open(o), board: Board, usage, openClient};

function boot(){
  wear(); hookAll(); watchHub();
  setInterval(hookAll, 3000);
  addEventListener('resize', () => Board.pill());
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else setTimeout(boot, 0);
})();
