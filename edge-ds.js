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
        os.go('seo', 'gbp'); setTimeout(() => GbpHome.open(u.gbp), 80); return;
      }
      os.go('seo', 'seo'); setTimeout(() => { SeoHome.open(c, 'dash'); }, 60);
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
    try{ const nc = (state.seoClients || []).find(x => x.name === d.name); if (nc && SeoHome.on()) SeoHome.open(nc, 'dash'); }catch(e){}
  },

  /* An existing client: link a Business Profile (round 3 brings the finder) */
  addGbp(c){
    const os = OS(); if (!os) return;
    enter('seo', null, () => { os.go('seo', 'gbp'); });
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


/* ==========================================================================
   UNIVERSES · one pillar at a time
     Home is the only place the four pillars sit side by side, in EDGE's own
     order (01 Strategy · 02 Website · 03 Marketing · 04 Measure). Opening one
     walks you through a doorway into that pillar's own world: its colour, its
     pattern, its badge in the top bar, and nothing from the other three except
     the Across EDGE dock, which keeps their numbers for the client in view and
     takes you there in one click.
   ========================================================================== */
const U = {
  seo:    {n: '01', w: 'Strategy',  name: 'SEO',             line: 'Rankings, local grids and live search', ic: 'seo'},
  maint:  {n: '02', w: 'Website',   name: 'Web Maintenance', line: 'Every site, cared for every month',     ic: 'maint'},
  ads:    {n: '03', w: 'Marketing', name: 'Google Ads',      line: 'Spend and results, read monthly',      ic: 'ads'},
  report: {n: '04', w: 'Measure',   name: 'Reporting',       line: 'The client report, sent for you',      ic: 'report'},
  serp:   {n: '05', w: 'Search',    name: 'Live SERP',       line: 'Google, exactly as that town sees it', ic: 'search'}
};
const ORDER = ['seo', 'maint', 'ads', 'report'];
const secRaw = () => { const b = document.body.classList; return ORDER.find(k => b.contains('os-sec-' + k)) || 'seo'; };
/* Live SERP lives under the SEO section in the app, but it is its own pillar here. */
const secNow = () => { const k = secRaw(); if (k === 'seo'){ try{ if (((window.EDGE && EDGE.current && EDGE.current()) || state.seoModule) === 'serp') return 'serp'; }catch(e){} } return k; };
const onHub = () => { const h = $('hubScreen'); return !!(h && (h.classList.contains('on') || getComputedStyle(h).display !== 'none')); };

/* --- the badge in the top bar: where you are --- */
function paintBadge(){
  const nav = $('topNav'); if (!nav) return;
  let b = $('euId');
  if (!b){
    b = document.createElement('div'); b.id = 'euId'; b.className = 'eu-id';
    const home = nav.querySelector('.tn-home');
    if (home && home.parentNode) home.parentNode.insertBefore(b, home.nextSibling); else nav.insertBefore(b, nav.firstChild);
    if (home && !home.dataset.eu){ home.dataset.eu = '1'; home.title = 'Back to the EDGE Workspace (Alt+H)'; [...home.childNodes].forEach(n => { if (n.nodeType === 3 && n.textContent.trim()) n.textContent = ''; }); home.insertAdjacentHTML('beforeend', '<span class="eu-home-l">Workspace</span>'); }
  }
  const k = secNow(), u = U[k];
  document.body.classList.toggle('eu-serp', k === 'serp' && !onHub());
  if (b.dataset.k === k) return;
  b.dataset.k = k;
  b.innerHTML = '<span class="eu-ic">' + ic(u.ic) + '</span><span class="eu-tx"><small>' + u.n + ' · ' + u.w + '</small><b>' + esc(u.name) + '</b></span>';
  if (!RM()){ b.classList.remove('eu-in'); void b.offsetWidth; b.classList.add('eu-in'); }
}

/* --- the doorway ---
   The tile grows (transform only, so it stays smooth) until it covers the
   screen; only then does the pillar open behind it, and once that has drawn
   the cover fades away. Nothing of the pillar shows before the cover is full. */
let entering = false;
function enter(k, from, open){
  const u = U[k];
  if (!u || entering){ if (open) open(); return; }
  if (RM()){ if (open) open(); return; }
  entering = true;
  const vw = innerWidth, vh = innerHeight;
  const r = from ? from.getBoundingClientRect() : {top: vh / 2 - 80, left: vw / 2 - 140, width: 280, height: 160};
  const d = document.createElement('div');
  d.className = 'eu-portal eu-' + k;
  d.innerHTML = '<div class="eu-portal-in"><span class="eu-portal-n">' + u.n + '</span><small>' + u.w + '</small><b>' + esc(u.name) + '</b><em>' + esc(u.line) + '</em><i class="eu-portal-bar"><i></i></i></div>';
  d.style.transform = 'translate(' + r.left + 'px,' + r.top + 'px) scale(' + (r.width / vw) + ',' + (r.height / vh) + ')';
  document.body.appendChild(d);
  void d.offsetWidth;
  d.classList.add('grow');
  d.style.transform = 'translate(0,0) scale(1,1)';
  let done = false;
  const covered = () => {
    if (done) return; done = true;
    d.classList.add('full');
    setTimeout(() => {
      try{ if (open) open(); }catch(e){}
      /* wait for the pillar to draw (two frames and a beat), then lift the cover */
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => {
        d.classList.add('gone');
        setTimeout(() => { d.remove(); entering = false; }, 520);
      }, 260)));
    }, 380);
  };
  d.addEventListener('transitionend', e => { if (e.propertyName === 'transform') covered(); });
  setTimeout(covered, 700);
}
const portal = (k, from) => enter(k, from, null);

/* --- the way back: the pillar eases away, the EDGE floor fades in, Home's doors rise --- */
function leave(){
  const go = () => { try{ EDGE_showHub(true); }catch(e){} };
  if (onHub()) return;
  if (RM() || entering){ go(); return; }
  entering = true;
  document.body.classList.add('eu-leaving');
  const d = document.createElement('div');
  d.className = 'eu-leave';
  d.innerHTML = '<div class="eu-leave-in"><span class="eu-leave-dots"><i></i><i></i><i></i><i></i><i></i></span><b>EDGE Workspace</b></div>';
  document.body.appendChild(d);
  void d.offsetWidth;
  d.classList.add('on');
  setTimeout(() => {
    go();
    document.body.classList.remove('eu-leaving');
    window.scrollTo(0, 0);
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => {
      d.classList.add('gone');
      setTimeout(() => { d.remove(); entering = false; }, 520);
    }, 140)));
  }, 380);
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('#tnHome, .tn-home');
  if (!b || onHub()) return;
  e.preventDefault(); e.stopImmediatePropagation();
  leave();
}, true);
document.addEventListener('keydown', e => {
  if (e.altKey && (e.key === 'h' || e.key === 'H') && !onHub() && document.body.classList.contains('os-on')){ e.preventDefault(); e.stopImmediatePropagation(); leave(); }
}, true);

/* Home tiles: the cover goes first, then the pillar opens behind it. */
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('#osHub [data-osgo]'); if (!t) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const k = t.dataset.osgo;
  enter(k, t.closest('.osh-t') || t, () => { try{ EDGE_showHub(false); }catch(err){} try{ if (k === 'serp') OS().go('seo', 'serp'); else OS().go(k); }catch(err){} });
}, true);


/* ==========================================================================
   SEO · clients on the main display
     Level 1  every SEO client as a card: logo, keywords, page one, last scan,
              what else EDGE runs for them; search, folders, New client, and the
              old rail tools under More.
     Level 2  one client, two tabs:
                Dashboard  what SEO needs for this client: each asset with its
                           status and a one-click add or connect, when data was
                           last pulled, the client details and the Connections
                           card (GA4 · Search Console · forms · Easyleads)
                SEO        the working tab: figures, keywords and AI visibility on
                           one page
   The client rail is gone; the app's own views do the work underneath.
   ========================================================================== */
const curMod = () => { try{ return (window.EDGE && EDGE.current && EDGE.current()) || state.seoModule; }catch(e){ return state.seoModule; } };
const fmtDate = ms => { if (!ms) return ''; const d = new Date(ms); return d.toLocaleDateString('en-CA', {month: 'short', day: 'numeric'}) + ', ' + d.toLocaleTimeString('en-CA', {hour: 'numeric', minute: '2-digit'}); };
const lastScan = c => { let m = 0; (c.keywords || []).forEach(k => (k.locations || []).forEach(l => { const t = l.checkedAt ? new Date(l.checkedAt).getTime() : 0; if (t > m) m = t; })); return m; };
const folderOf = c => (state.seoFolders || []).find(f => f && f.id === c.folderId) || null;

const SeoHome = {
  openId: (() => { try{ return sessionStorage.getItem('edsSeoOpen') || ''; }catch(e){ return ''; } })(),
  tab: (() => { try{ return sessionStorage.getItem('edsSeoTab') || 'dash'; }catch(e){ return 'dash'; } })(),
  q: '', folder: 'active', sig: '', aiLoaded: '',
  client(){ return (state.seoClients || []).find(c => c && c.id === this.openId) || null; },
  save(){ try{ sessionStorage.setItem('edsSeoOpen', this.openId || ''); sessionStorage.setItem('edsSeoTab', this.tab); }catch(e){} },
  on(){ return secNow() === 'seo' && curMod() === 'seo' && !onHub(); },
  open(c, tab){
    if (!c) return;
    this.openId = c.id; this.tab = tab || 'dash'; this.save();
    state.activeSeoClientId = c.id;
    seoRender();
    this.apply(true);
    window.scrollTo(0, 0);
  },
  close(){ this.openId = ''; this.save(); this.sig = ''; this.apply(true); window.scrollTo(0, 0); },
  setTab(t){ this.tab = t; this.save(); this.apply(true); window.scrollTo({top: 0, behavior: RM() ? 'auto' : 'smooth'}); },
  mode(m){ const b = document.querySelector('#seoModes .seo-mode[data-seoview="' + m + '"]'); if (b && !b.classList.contains('on')){ this.self = true; try{ b.click(); } finally { this.self = false; } } },
  /* put the app's own view under the tab (only when the tab is chosen, never on a tick) */
  syncMode(c){
    if (this.tab === 'seo'){
      if (this.aiLoaded !== c.id){ this.aiLoaded = c.id; this.mode('ai'); setTimeout(() => { if (this.tab === 'seo') this.mode('keywords'); }, 120); }
      else this.mode('keywords');
    } else if (this.tab === 'dash') this.mode('dashboard');
  },
  apply(force){
    const B = document.body.classList, on = this.on();
    const c = on ? this.client() : null;
    if (on && this.openId && !c){ this.openId = ''; this.save(); }
    B.toggle('eds-seo-grid', on && !c);
    B.toggle('eds-seo-client', on && !!c);
    B.toggle('eds-tab-dash', on && !!c && this.tab === 'dash');
    B.toggle('eds-tab-seo', on && !!c && this.tab === 'seo');
    B.toggle('eds-tab-other', on && !!c && this.tab === 'other');
    if (!on) return;
    if (!c){ this.paintGrid(force); return; }
    if (state.activeSeoClientId !== c.id){ state.activeSeoClientId = c.id; seoRender(); }
    if (force) this.syncMode(c);
    this.paintBar(c);
    if (this.tab === 'dash') this.paintAssets(c, force);
  },
  /* the tabs and the way back, in the stage's own top bar */
  paintBar(c){
    const top = document.querySelector('#seoStage .topbar'); if (!top) return;
    let t = $('edsSeoBar');
    if (!t || !top.contains(t)){
      if (t) t.remove();
      t = document.createElement('div'); t.id = 'edsSeoBar'; t.className = 'eds-sbar';
      top.insertBefore(t, top.firstChild);
      t.addEventListener('click', e => {
        if (e.target.closest('[data-back]')) return this.close();
        const b = e.target.closest('[data-t]'); if (b) this.setTab(b.dataset.t);
      });
    }
    const sig = c.id + this.tab + c.name;
    if (t.dataset.sig === sig) return;
    t.dataset.sig = sig;
    t.innerHTML = '<button type="button" class="eds-back-btn" data-back title="All SEO clients">' + ic('arrowL') + '<span>All clients</span></button>' +
      '<div class="eds-seg eds-tabs" data-seg><span class="pill"></span><button type="button" data-t="dash"' + (this.tab === 'dash' ? ' class="on"' : '') + '>Dashboard</button><button type="button" data-t="seo"' + (this.tab === 'seo' ? ' class="on"' : '') + '>SEO</button></div>';
    requestAnimationFrame(() => { const on = t.querySelector('[data-t].on'), p = t.querySelector('.pill'); if (on && p){ p.style.left = on.offsetLeft + 'px'; p.style.width = on.offsetWidth + 'px'; } });
  },
  /* Dashboard: what SEO needs for this client */
  paintAssets(c, force){
    const main = document.querySelector('#seoDashboardView .seo-dash-main'); if (!main) return;
    let a = $('edsAssets');
    if (!a || !main.contains(a)){
      if (a) a.remove();
      a = document.createElement('section'); a.id = 'edsAssets'; a.className = 'card seo-panel eds-assets';
      main.insertBefore(a, main.firstChild);
      a.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) this.act(b.dataset.act, this.client(), b); });
    }
    const u = usage(c), ls = lastScan(c), logoOk = !!c.logoUrl, site = normDomain(c.website);
    let adsN = 0; try{ adsN = u.ads.length; }catch(e){}
    const rows = [
      {k: 'site', ic: 'globe', t: 'Website', ok: site.indexOf('.') > 0, v: site || 'No website yet', a: site ? 'Edit' : 'Add website'},
      {k: 'logo', ic: 'sparkle', t: 'Logo', ok: logoOk, v: logoOk ? 'Their own logo is saved' : 'Using the website icon', a: logoOk ? 'Change' : 'Find their logo', warn: !logoOk},
      {k: 'kw', ic: 'seo', t: 'Keywords and locations', ok: u.kws > 0 && u.locs > 0, v: u.kws ? u.kws + ' keyword' + (u.kws === 1 ? '' : 's') + ' · ' + u.locs + ' location' + (u.locs === 1 ? '' : 's') + (u.locs ? '' : ' (add a city to start scanning)') : 'Nothing tracked yet', a: u.kws ? 'Add more' : 'Add keywords', warn: u.kws > 0 && !u.locs},
      {k: 'gbp', ic: 'gbp', t: 'Google Business Profile', ok: !!u.gbp, v: u.gbp ? (u.gbp.gbps || []).length + ' profile' + ((u.gbp.gbps || []).length === 1 ? '' : 's') + ' linked' : 'Not linked', a: u.gbp ? 'Open' : 'Add profile', opt: 1},
      {k: 'ads', ic: 'ads', t: 'Google Ads', ok: adsN > 0 || c.adsOn === true, v: adsN ? adsN + ' account' + (adsN === 1 ? '' : 's') + ' linked' : c.adsOn ? 'Runs ads · account matched on the next read' : 'Not running ads', a: adsN || c.adsOn ? 'Edit' : 'Set up', opt: 1},
      {k: 'maint', ic: 'maint', t: 'Web Maintenance', ok: !!u.maint, v: u.maint ? (u.maint === 'ok' ? 'Done this month' : u.maint === 'due' ? 'Due this month' : 'Paused') : 'Not on the care checklist', a: u.maint ? 'Open' : 'Add', opt: 1},
      {k: 'report', ic: 'report', t: 'Monthly report', ok: !!u.report, v: u.report ? 'Emailed to ' + (u.report.to || []).join(', ') : 'Not emailed yet', a: u.report ? 'Open' : 'Set up', opt: 1},
      (() => { const so = c.social || {}, n = SOC.filter(x => so[x[0]]); return {k: 'social', ic: 'globe', t: 'Social media', ok: n.length > 0, v: n.length ? n.map(x => x[1].split(' ')[0]).join(', ') + (so.chrome === false ? ' · Chrome reading off' : ' · Claude reads in Chrome') : 'No accounts added', a: n.length ? 'Edit' : 'Add accounts', opt: 1}; })()
    ];
    const need = rows.filter(r => !r.opt), done = need.filter(r => r.ok).length;
    const sig = JSON.stringify(rows) + ls;
    if (!force && a.dataset.sig === sig) return;
    a.dataset.sig = sig;
    a.innerHTML = '<div class="seo-panel-h"><h3>What SEO needs for ' + esc(c.name) + '</h3><span class="eds-prog' + (done === need.length ? ' all' : '') + '"><span class="bar"><i style="width:' + Math.round(done / need.length * 100) + '%"></i></span>' + done + ' of ' + need.length + ' ready</span></div>' +
      '<div class="eds-fresh"><span><i class="' + (ls ? 'ok' : '') + '"></i>Rankings last pulled <b>' + (ls ? esc(fmtDate(ls)) : 'never') + '</b></span><span><i class="ok"></i>Connections below are checked live with the tracker</span></div>' +
      '<div class="eds-arows">' + rows.map((r, i) => '<div class="eds-arow ' + (r.ok ? 'ok' : r.warn ? 'warn' : r.opt ? 'opt' : 'todo') + '" style="animation-delay:' + (i * 35) + 'ms"><span class="d">' + ic(r.ic) + '</span><div class="t"><b>' + r.t + (r.opt ? '<em>optional</em>' : '') + '</b><small>' + esc(r.v) + '</small></div><span class="st">' + (r.ok ? ic('check') + 'Ready' : r.warn ? 'Needs a look' : r.opt ? 'Off' : 'To do') + '</span><button type="button" class="eds-btn sm' + (r.ok ? '' : r.opt ? '' : ' pri') + '" data-act="' + r.k + '">' + esc(r.a) + '</button></div>').join('') + '</div>';
  },
  act(k, c, btn){
    if (!c) return;
    const ui = UI();
    if (k === 'site' || k === 'edit'){ const e = document.querySelector('#seoStage .seo-edit-btn, #seoDashEditBtn, [data-seoedit]'); if (e) e.click(); else toastMsg('Edit the website from the client details below'); return; }
    if (k === 'logo'){ if (ui && ui.findLogoFor) ui.findLogoFor(c); return; }
    if (k === 'kw'){ this.setTab('seo'); setTimeout(() => { const b = $('seoAddKwBtn') || document.querySelector('#seoKeywordsView [data-addkw], #seoKeywordsView .seo-add-kw'); if (b){ b.scrollIntoView({block: 'center', behavior: 'smooth'}); setTimeout(() => b.click(), 350); } }, 450); return; }
    if (k === 'gbp'){ const u = usage(c); if (u.gbp){ enter('seo', btn, () => { OS().go('seo', 'gbp'); setTimeout(() => GbpHome.open(u.gbp), 80); }); } else Finder.open(c); return; }
    if (k === 'social'){ Social.open(c); return; }
    if (k === 'ads'){ AdsSet.open(c); return; }
    if (k === 'maint'){ const u = usage(c); if (u.maint) enter('maint', btn, () => openClient(c, 'maint')); else { c.maintOn = true; try{ save(); }catch(e){} toastMsg(c.name + ' added to Web Maintenance', 'add'); this.apply(true); } return; }
    if (k === 'report'){ try{ OS().reporting.drawer(c); }catch(e){ enter('report', btn, () => openClient(c, 'report')); } return; }
  },
  /* Level 1: the clients */
  mountGrid(){
    const panels = document.querySelector('#seoStage .panels'); if (!panels) return null;
    let g = $('edsSeoHome');
    if (!g || !panels.contains(g)){
      if (g) g.remove();
      g = document.createElement('section'); g.id = 'edsSeoHome'; g.className = 'eds-uhome';
      panels.insertBefore(g, panels.firstChild);
      g.addEventListener('input', e => { if (e.target.matches('[data-q]')){ this.q = e.target.value; this.paintGrid(true, true); } });
      g.addEventListener('click', e => {
        const t = e.target;
        if (t.closest('[data-new]')) return Setup.open({pillars: ['seo']});
        const f = t.closest('[data-f]'); if (f){ this.folder = f.dataset.f; this.paintGrid(true, true); return; }
        if (t.closest('[data-more]')) return this.more(t.closest('[data-more]'));
        const cd = t.closest('.eds-scard'); if (cd){ const c = (state.seoClients || []).find(x => x.id === cd.dataset.id); if (c) this.open(c, 'dash'); }
      });
    }
    return g;
  },
  more(btn){
    const items = [['seoImportBtn', 'Import clients'], ['seoExportAllBtn', 'Export all (.xlsx)'], ['seoPublishAllBtn', 'Share all clients'], ['seoFormsSyncBtn', 'Forms sync'], ['euiLogosBtn', 'Find missing logos'], ['seoAddFolderBtn', 'New folder']].filter(x => $(x[0]));
    let m = $('edsMore'); if (m){ m.remove(); return; }
    m = document.createElement('div'); m.id = 'edsMore'; m.className = 'eds-menu';
    m.innerHTML = items.map(x => '<button type="button" data-id="' + x[0] + '">' + esc(x[1]) + '</button>').join('');
    document.body.appendChild(m);
    const r = btn.getBoundingClientRect(); m.style.top = (r.bottom + 6) + 'px'; m.style.left = Math.max(12, r.right - 220) + 'px';
    m.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (!b) return; m.remove(); const o = $(b.dataset.id); if (o) o.click(); });
    setTimeout(() => document.addEventListener('mousedown', function away(e){ if (!m.contains(e.target)){ m.remove(); document.removeEventListener('mousedown', away); } }), 0);
  },
  paintGrid(force, keepTop){
    const g = this.mountGrid(); if (!g) return;
    const all = (state.seoClients || []).filter(Boolean);
    const folders = (state.seoFolders || []).filter(Boolean);
    const inactive = c => isArchived(c);
    const q = this.q.trim().toLowerCase();
    let list = all.filter(c => this.folder === 'inactive' ? inactive(c) : !inactive(c));
    if (this.folder !== 'active' && this.folder !== 'inactive') list = list.filter(c => c.folderId === this.folder);
    if (q) list = list.filter(c => [c.name, c.website, c.projectLead].some(v => String(v || '').toLowerCase().indexOf(q) > -1));
    list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    const sig = this.folder + '|' + q + '|' + list.map(c => c.id + c.name + c.logoUrl + (c.keywords || []).length + lastScan(c) + c.status + c.folderId).join(',') + folders.length;
    if (!force && sig === this.sig) return;
    this.sig = sig;
    let tot = 0, p1 = 0, locs = 0;
    all.filter(c => !inactive(c)).forEach(c => { const u = usage(c); tot += u.kws; p1 += u.top10; locs += u.locs; });
    const chip = (k, l, n) => '<button type="button" data-f="' + esc(k) + '"' + (this.folder === k ? ' class="on"' : '') + '>' + esc(l) + (n != null ? '<i>' + n + '</i>' : '') + '</button>';
    const fchips = chip('active', 'All clients', all.filter(c => !inactive(c)).length) + folders.filter(f => !/inactive|archiv/i.test(f.name)).map(f => chip(f.id, f.name, all.filter(c => c.folderId === f.id).length)).join('') + chip('inactive', 'Inactive', all.filter(inactive).length);
    const card = (c, i) => {
      const u = usage(c), ls = lastScan(c), src = logoOf(c), st = String(c.status || 'Active');
      const pct = u.locs ? Math.round(u.top10 / u.locs * 100) : 0;
      const dot = (k, on, l) => '<span class="eds-mini ' + k + (on ? '' : ' off') + '" title="' + esc(l + (on ? '' : ': off')) + '">' + ic(k === 'gbp' ? 'gbp' : k) + '</span>';
      return '<article class="eds-scard" data-id="' + esc(c.id) + '" style="animation-delay:' + Math.min(i * 30, 360) + 'ms">' +
        '<div class="eds-sc-top"><span class="eds-lg">' + (src ? '<img alt="" src="' + esc(src) + '" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement(\'b\'),{textContent:\'' + esc(initials(c.name)) + '\'}))">' : '<b>' + esc(initials(c.name)) + '</b>') + '</span>' +
        '<div class="eds-sc-n"><h3>' + esc(c.name || 'Untitled') + '</h3><small>' + esc(normDomain(c.website) || 'No website yet') + (c.projectLead ? ' · ' + esc(c.projectLead) : '') + '</small></div>' +
        '<span class="eds-tag st' + (/pause|onboard|inactive/i.test(st) ? ' warn' : '') + '"><i></i>' + esc(st) + '</span></div>' +
        '<div class="eds-sc-fig"><div><b>' + u.kws + '</b><small>keywords</small></div><div><b>' + u.top10 + '<span>/' + u.locs + '</span></b><small>on page one</small></div><div><b>' + (u.top3 || 0) + '</b><small>top 3</small></div></div>' +
        '<div class="eds-sc-bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="eds-sc-foot"><span class="eds-sc-ls">' + (ls ? 'Pulled ' + esc(fmtDate(ls)) : 'Not scanned yet') + '</span><span class="eds-minis">' + dot('gbp', !!u.gbp, 'Business Profile') + dot('ads', u.ads.length > 0, 'Google Ads') + dot('maint', !!u.maint, 'Web Maintenance') + dot('report', !!u.report, 'Monthly report') + '</span></div></article>';
    };
    const top = keepTop && g.querySelector('[data-q]') === document.activeElement;
    g.innerHTML = '<div class="eds-uhero"><div><span class="eds-eyebrow"><i></i>01 · Strategy</span><h2>SEO clients</h2><p>Open a client to see what SEO needs for them and connect it, then work their keywords and AI visibility in one place.</p></div>' +
        '<div class="eds-ufig"><div><b>' + all.filter(c => !inactive(c)).length + '</b><small>clients</small></div><div><b>' + tot + '</b><small>keywords</small></div><div><b>' + p1 + '<span>/' + locs + '</span></b><small>on page one</small></div></div></div>' +
      '<div class="eds-bar"><label class="eds-search">' + ic('search') + '<input type="search" data-q placeholder="Find a client, website or project lead" value="' + esc(this.q) + '" autocomplete="off"></label>' +
        '<button type="button" class="eds-btn" data-more>More<svg class="eds-i" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button><button type="button" class="eds-btn pri" data-new>' + ic('plus') + 'New client</button></div>' +
      '<div class="eds-chips">' + fchips + '</div>' +
      '<div class="eds-sgrid">' + list.map(card).join('') + (this.folder === 'active' && !q ? '<button type="button" class="eds-add" data-new><span class="pl">' + ic('plus') + '</span>New client<small style="font-weight:500;color:var(--soft)">Keywords, Business Profile, connections</small></button>' : '') + (!list.length ? '<div class="eds-empty">No clients here.</div>' : '') + '</div>';
    if (top){ const i = g.querySelector('[data-q]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  }
};
/* Anything else that opens a client (the app's own list, its mode buttons, a link
   from another pillar) opens it here too, on the matching tab. */
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('#seoModes .seo-mode, #seoRail .tree-row, #seoRail .tree-kid');
  if (!t || SeoHome.self) return;
  setTimeout(() => {
    const id = state.activeSeoClientId; if (!id) return;
    const v = t.dataset && t.dataset.seoview;
    SeoHome.openId = id;
    if (v) SeoHome.tab = v === 'dashboard' ? 'dash' : (v === 'keywords' || v === 'ai') ? 'seo' : 'other';
    else if (SeoHome.tab === 'other') SeoHome.tab = 'dash';
    SeoHome.save(); SeoHome.apply(false);
  }, 0);
}, true);
/* coming in from Home always starts on the clients */
document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('#osHub [data-osgo="seo"]'); if (t){ SeoHome.openId = ''; SeoHome.save(); SeoHome.sig = ''; } }, true);
document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('.os-sub-b[data-sub="gbp"], [data-module="gbp"]'); if (t) setTimeout(() => GbpHome.showGrid(), 0); }, true);

/* rails off where the main display has the clients */
function railState(){
  const k = secNow(), m = curMod(), B = document.body.classList;
  const off = !onHub() && ((k === 'seo' && (m === 'seo' || m === 'gbp')) || k === 'serp' || k === 'maint' || k === 'report');
  B.toggle('eds-norail', off);
  ['seo', 'gbp', 'serp', 'maint', 'ads'].forEach(x => B.toggle('eds-m-' + x, m === x));
}


/* ==========================================================================
   HOME · Live SERP joins as door 05
   ========================================================================== */
function paintSerpDoor(){
  const g = document.querySelector('#osHub .osh-grid'); if (!g || g.querySelector('.osh-t.serp')) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'osh-t serp'; b.dataset.osgo = 'serp';
  let n = 0; try{ n = (state.serpHistory || state.serpRecent || []).length; }catch(e){}
  b.innerHTML = '<span class="osh-k">5</span><div class="osh-th"><span class="osh-ic">' + ic('search') + '</span><div><small>Search</small><h3>Live SERP</h3></div></div>' +
    '<div class="osh-serp"><div class="eu-mini-serp"><i></i><i></i><i></i><span class="pin"></span></div><p>See Google exactly as someone in that town does: the local pack, the map and every result, from any address.</p></div>' +
    '<span class="osh-go">Open Live SERP <svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></span>';
  g.appendChild(b);
}

/* ==========================================================================
   LIVE SERP · a pillar of its own, with a little life
     Find      a radar on the map while the place is looked up, a pin that drops
               when it lands
     Search    a "reading Google" panel while results load, a burst when in
   ========================================================================== */
const Serp = {
  busy: null,
  show(kind, text){
    this.hide(true);
    const d = document.createElement('div'); d.className = 'eu-serp-pop ' + kind;
    d.innerHTML = (kind === 'find' ? '<span class="eu-radar"><i></i><i></i><i></i><b></b></span>' : '<span class="eu-glass"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg></span>') +
      '<div><small>' + (kind === 'find' ? 'Location search' : 'Live search') + '</small><b>' + esc(text) + '</b><span class="eu-dots"><i></i><i></i><i></i></span></div>';
    document.body.appendChild(d);
    requestAnimationFrame(() => d.classList.add('on'));
    this.busy = d;
    clearTimeout(this.to); this.to = setTimeout(() => this.done(kind === 'find' ? 'Place set' : 'Results are in', true), kind === 'find' ? 5000 : 9000);
  },
  done(text, quiet){
    const d = this.busy; if (!d) return;
    clearTimeout(this.to);
    d.classList.add('ok');
    d.querySelector('b').textContent = text;
    const dots = d.querySelector('.eu-dots'); if (dots) dots.remove();
    if (!quiet && !RM()){ try{ const r = d.getBoundingClientRect(); const B = UI() && UI().burst; if (B) B(r.left + 30, r.top + 20); }catch(e){} }
    setTimeout(() => this.hide(), 1600);
  },
  hide(now){ const d = this.busy; if (!d) return; this.busy = null; if (now){ d.remove(); return; } d.classList.remove('on'); setTimeout(() => d.remove(), 400); },
  watch(){
    document.addEventListener('click', e => {
      if (secNow() !== 'serp') return;
      const f = e.target.closest && e.target.closest('[data-sv-find], #geocodeBtn');
      const g = e.target.closest && e.target.closest('[data-sv-go], #goBtn');
      if (f){
        const v = (document.querySelector('.sv-hero [data-in-loc]') || {}).value || 'that place';
        this.show('find', 'Finding ' + v.trim());
        const chip = () => (document.querySelector('.sv-hero') || {}).textContent || '';
        const before = chip(); let n = 0;
        const iv = setInterval(() => { n++; if (chip() !== before){ clearInterval(iv); this.done('Pinned: ' + v.trim()); const pin = document.querySelector('#serpStage .leaflet-marker-icon'); if (pin && !RM()){ pin.classList.remove('eu-drop'); void pin.offsetWidth; pin.classList.add('eu-drop'); } } else if (n > 40) clearInterval(iv); }, 120);
      }
      if (g){
        const q = (document.querySelector('.sv-hero [data-in-q], .sv-hero input[type=text], .sv-hero input:not([data-in-loc])') || {}).value || 'your search';
        this.show('search', 'Reading Google for “' + q.trim() + '”');
        const host = $('serpStage'); if (!host) return;
        let t = null;
        const mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => { mo.disconnect(); this.done('Results are in'); }, 700); });
        setTimeout(() => mo.observe(host, {childList: true, subtree: true}), 250);
        setTimeout(() => mo.disconnect(), 12000);
      }
    }, true);
  }
};
Serp.watch();

/* ==========================================================================
   GBP · clients first, then the profile
     Level 1  every client: has a Business Profile or not. "Add profile" asks for
              what the finder needs (name on Google, town, a Maps link if handy),
              digs it up, and celebrates when it lands.
     Level 2  the profile itself: keywords, locations, other profiles, scans.
   ========================================================================== */
const parseMaps = u => {
  const s = String(u || ''); const m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || s.match(/[?&](?:q|ll|query)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  const nm = (s.match(/\/place\/([^/@?]+)/) || [])[1];
  return {lat: m ? +m[1] : null, lng: m ? +m[2] : null, name: nm ? decodeURIComponent(nm.replace(/\+/g, ' ')) : ''};
};
async function osmFind(q){
  const res = await fetch('https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&accept-language=en&limit=5&q=' + encodeURIComponent(q), {headers: {Accept: 'application/json'}});
  if (!res.ok) throw new Error('Lookup answered ' + res.status);
  const d = await res.json(); return Array.isArray(d) ? d : [];
}
const GbpHome = {
  grid: true, at: null, q: '', sig: '',
  on(){ return secNow() === 'seo' && curMod() === 'gbp' && !onHub(); },
  rows(){
    const out = [], seenG = new Set();
    (state.seoClients || []).filter(Boolean).filter(c => !isArchived(c)).forEach(c => { let g = null; try{ g = window.EDGE_gbpFor ? EDGE_gbpFor(c) : null; }catch(e){} if (g) seenG.add(g.id); out.push({c, g}); });
    (state.clients || []).filter(g => g && !seenG.has(g.id)).forEach(g => out.push({c: null, g}));
    return out;
  },
  apply(force){
    const on = this.on(), B = document.body.classList;
    /* the app opened a profile itself (a link, a scan, a test): step aside */
    const now = (state.activeGbpId || '') + '|' + (state.view || '');
    if (this.at == null) this.at = now;
    if (on && this.grid && now !== this.at && state.view === 'focus' && state.activeGbpId) this.grid = false;
    B.toggle('eds-gbp-grid', on && this.grid);
    B.toggle('eds-gbp-open', on && !this.grid);
    if (!on) return;
    if (this.grid){ this.paint(force); this.moveAdd(); }
    else this.paintBack();
  },
  showGrid(){ this.grid = true; if (state.view === 'focus') state.view = 'overview'; this.at = (state.activeGbpId || '') + '|' + (state.view || ''); this.sig = ''; this.apply(true); window.scrollTo(0, 0); },
  open(g){
    if (!g || !(g.gbps || []).length) return;
    state.activeClientId = g.id; state.activeGbpId = g.gbps[0].id; state.view = 'focus';
    try{ renderAll(); }catch(e){}
    this.grid = false; this.at = (state.activeGbpId || '') + '|' + (state.view || ''); this.apply(true); window.scrollTo(0, 0);
  },
  moveAdd(){
    const host = document.querySelector('#edsGbpHome [data-addslot]'), b = $('addClientBtn');
    if (host && b && b.parentNode !== host){ b.classList.add('eds-btn'); b.innerHTML = ic('plus') + 'Profile only'; b.title = 'A Business Profile with no SEO client'; host.appendChild(b); }
  },
  paintBack(){
    const top = document.querySelector('#gbpStage .topbar'); if (!top) return;
    let t = $('edsGbpBar');
    if (!t || !top.contains(t)){ if (t) t.remove(); t = document.createElement('div'); t.id = 'edsGbpBar'; t.className = 'eds-sbar'; top.insertBefore(t, top.firstChild); t.innerHTML = '<button type="button" class="eds-back-btn" data-back title="All clients">' + ic('arrowL') + '<span>All clients</span></button>'; t.querySelector('[data-back]').addEventListener('click', () => this.showGrid()); }
  },
  paint(force){
    const panels = document.querySelector('#gbpStage .panels') || $('gbpStage'); if (!panels) return;
    let h = $('edsGbpHome');
    if (!h || !panels.contains(h)){
      if (h) h.remove();
      h = document.createElement('section'); h.id = 'edsGbpHome'; h.className = 'eds-uhome';
      panels.insertBefore(h, panels.firstChild);
      h.addEventListener('input', e => { if (e.target.matches('[data-q]')){ this.q = e.target.value; this.paint(true); const i = h.querySelector('[data-q]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } });
      h.addEventListener('click', e => {
        const card = e.target.closest('.eds-gcard'); if (!card) return;
        const row = this.rows()[+card.dataset.i]; if (!row) return;
        if (e.target.closest('[data-find]')) return Finder.open(row.c);
        if (row.g) this.open(row.g); else Finder.open(row.c);
      });
    }
    const q = this.q.trim().toLowerCase();
    const all = this.rows(), list = all.map((r, i) => Object.assign({i}, r)).filter(r => !q || [(r.c || r.g).name, r.c && r.c.website].some(v => String(v || '').toLowerCase().indexOf(q) > -1));
    const withG = all.filter(r => r.g).length;
    const sig = q + '|' + list.map(r => (r.c ? r.c.id : '') + ':' + (r.g ? r.g.id + (r.g.gbps || []).length + (r.g.gbps || []).reduce((t, p) => t + (p.keywords || []).length, 0) : '-')).join(',');
    if (!force && sig === this.sig) return;
    this.sig = sig;
    const card = r => {
      const nm = (r.c || r.g).name || 'Untitled', src = r.c ? logoOf(r.c) : '';
      const profs = r.g ? (r.g.gbps || []) : [], kws = profs.reduce((t, p) => t + (p.keywords || []).length, 0);
      const scans = profs.reduce((t, p) => t + (p.keywords || []).reduce((u, k) => u + ((k.scans || []).length ? 1 : 0), 0), 0);
      return '<article class="eds-gcard' + (r.g ? ' has' : ' none') + '" data-i="' + r.i + '" style="animation-delay:' + Math.min(r.i * 30, 360) + 'ms">' +
        '<div class="eds-sc-top"><span class="eds-lg">' + (src ? '<img alt="" src="' + esc(src) + '" referrerpolicy="no-referrer">' : '<b>' + esc(initials(nm)) + '</b>') + '</span><div class="eds-sc-n"><h3>' + esc(nm) + '</h3><small>' + esc(r.c ? (normDomain(r.c.website) || 'No website yet') : 'Profile only, no SEO client') + '</small></div></div>' +
        (r.g ? '<div class="eds-gmap"><span class="pin"></span><div><b>' + esc((profs[0] && (profs[0].bizName || profs[0].name)) || nm) + '</b><small>' + profs.length + ' profile' + (profs.length === 1 ? '' : 's') + ' · ' + kws + ' keyword' + (kws === 1 ? '' : 's') + ' · ' + (scans ? scans + ' scanned' : 'not scanned yet') + '</small></div></div><div class="eds-sc-foot"><span class="eds-tag st"><i></i>Business Profile</span><span class="eds-open">Open ' + ic('arrowR') + '</span></div>'
             : '<div class="eds-gnone"><b>No Business Profile yet</b><small>Add it and the finder digs it up on Google Maps.</small></div><div class="eds-sc-foot"><span class="eds-tag off"><i></i>No profile</span><button type="button" class="eds-btn sm pri" data-find>' + ic('gbp') + 'Add profile</button></div>') +
        '</article>';
    };
    const keep = $('addClientBtn'); if (keep && h.contains(keep)) document.body.appendChild(keep);
    h.innerHTML = '<div class="eds-uhero"><div><span class="eds-eyebrow"><i></i>01 · Strategy · Local</span><h2>Business Profiles</h2><p>Every client, and whether they have a Google Business Profile. Add one and the finder digs it up; then add keywords, locations and more profiles inside it.</p></div>' +
        '<div class="eds-ufig"><div><b>' + withG + '</b><small>with a profile</small></div><div><b>' + (all.length - withG) + '</b><small>without</small></div></div></div>' +
      '<div class="eds-bar"><label class="eds-search">' + ic('search') + '<input type="search" data-q placeholder="Find a client or profile" value="' + esc(this.q) + '" autocomplete="off"></label><span data-addslot></span></div>' +
      '<div class="eds-sgrid">' + list.map(card).join('') + (!list.length ? '<div class="eds-empty">No clients match.</div>' : '') + '</div>';
  }
};

/* The finder: what it needs, a dig, and a landing */
const Finder = {
  open(c){
    const back = document.createElement('div'); back.className = 'eds-back';
    const nm = c ? c.name : '';
    back.innerHTML = '<div class="eds-modal eds-finder"><div class="eds-mh"><h2>Find ' + esc(nm || 'the') + '’s Business Profile</h2><p>Tell the finder what it needs. A Google Maps link is the surest; the name and town work too.</p></div>' +
      '<form class="eds-mb" novalidate><div class="eds-row2"><div><label class="eds-f">Name on Google</label><input class="eds-in" name="biz" value="' + esc(nm) + '" autocomplete="off"></div>' +
      '<div><label class="eds-f">Town or address</label><input class="eds-in" name="town" placeholder="Red Deer, Alberta" autocomplete="off"></div></div>' +
      '<label class="eds-f">Google Maps link <small>optional · open the profile on Maps and copy the address bar</small></label><input class="eds-in" name="link" placeholder="https://www.google.com/maps/place/…" autocomplete="off">' +
      '<label class="eds-f">Location name</label><input class="eds-in" name="loc" value="Main location" autocomplete="off">' +
      '<div class="eds-dig" hidden><div class="eds-dig-map"><span class="r"></span><span class="r"></span><span class="r"></span><span class="sweep"></span><span class="pin"></span></div><div class="eds-dig-t"><b data-dt>Digging…</b><ul data-steps></ul></div></div>' +
      '<div class="eds-err" hidden></div></form>' +
      '<div class="eds-mf"><button type="button" class="eds-btn" data-cancel>Cancel</button><span class="sp"></span><button type="button" class="eds-btn pri" data-go>' + ic('search') + 'Find the profile</button></div></div>';
    document.body.appendChild(back);
    const f = back.querySelector('form'), er = back.querySelector('.eds-err'), dig = back.querySelector('.eds-dig'), go = back.querySelector('[data-go]');
    const close = () => { back.style.opacity = 0; setTimeout(() => back.remove(), 200); };
    back.querySelector('[data-cancel]').addEventListener('click', close);
    back.addEventListener('mousedown', e => { if (e.target === back) close(); });
    setTimeout(() => f.town.focus(), 80);
    go.addEventListener('click', async () => {
      er.hidden = true;
      const biz = f.biz.value.trim(), town = f.town.value.trim(), link = f.link.value.trim(), loc = f.loc.value.trim() || 'Main location';
      if (!biz){ er.hidden = false; er.textContent = 'Add the name as it shows on Google.'; return; }
      if (!town && !link){ er.hidden = false; er.textContent = 'Add the town, or paste the Google Maps link.'; return; }
      dig.hidden = false; go.disabled = true; back.querySelector('.eds-modal').classList.add('digging');
      const steps = dig.querySelector('[data-steps]'), dt = dig.querySelector('[data-dt]');
      const step = (t, cls) => { const li = document.createElement('li'); li.className = cls || ''; li.textContent = t; steps.appendChild(li); return li; };
      const wait = ms => new Promise(r => setTimeout(r, RM() ? 0 : ms));
      let found = null, label = '', how = '';
      try{
        const m = parseMaps(link);
        let s1 = step('Reading the Maps link…'); await wait(500);
        if (m.lat != null){ found = {lat: m.lat, lng: m.lng}; how = 'from the Maps link'; s1.className = 'ok'; s1.textContent = 'Exact spot from the Maps link'; }
        else { s1.className = link ? 'skip' : 'skip'; s1.textContent = link ? 'The link had no coordinates, searching instead' : 'No Maps link, searching by name'; }
        if (!found){
          const s2 = step('Searching for ' + biz + (town ? ' in ' + town : '') + '…'); await wait(400);
          const hits = await osmFind(biz + (town ? ', ' + town : ''));
          const hit = hits.find(h => /amenity|shop|office|craft|healthcare|tourism|leisure|building/.test(h.class || '')) || hits[0];
          if (hit){ found = {lat: +hit.lat, lng: +hit.lon}; label = hit.display_name; how = 'on the map by name'; s2.className = 'ok'; s2.textContent = 'Found ' + biz + ' on the map'; }
          else { s2.className = 'skip'; s2.textContent = 'Not on the open map by name'; }
        }
        if (!found && town){
          const s3 = step('Centring on ' + town + '…'); await wait(300);
          const hits = await osmFind(town);
          if (hits[0]){ found = {lat: +hits[0].lat, lng: +hits[0].lon}; label = hits[0].display_name; how = 'on the town (set the exact spot on Setup)'; s3.className = 'ok'; s3.textContent = 'Centred on ' + town; }
          else s3.className = 'bad';
        }
        if (!found) throw new Error('The finder couldn’t place it. Paste the Google Maps link and try again.');
        const s4 = step('Creating the profile…'); await wait(300);
        const g = blankGbp(loc);
        g.bizName = biz; g.gbpLink = link; g.website = c && c.website ? c.website : '';
        g.center.lat = found.lat; g.center.lng = found.lng; g.center.label = label || town || biz;
        try{ g.keywords = ((c && c.keywords) || []).slice(0, 8).map(k => ({id: uid(), text: k.text, scans: []})); g.activeKeywordId = g.keywords[0] ? g.keywords[0].id : null; }catch(e){}
        let gc = c ? (window.EDGE_gbpFor ? EDGE_gbpFor(c) : null) : null;
        if (gc){ gc.gbps.push(g); }
        else { gc = {id: uid(), name: c ? c.name : biz, gbps: [g], compareScans: []}; state.clients.push(gc); if (c){ try{ OS().setGbpLink(c, gc); }catch(e){} } }
        try{ save(); renderAll(); }catch(e){}
        s4.className = 'ok'; s4.textContent = 'Profile created' + (g.keywords.length ? ' with ' + g.keywords.length + ' SEO keywords' : '');
        back.querySelector('.eds-modal').classList.remove('digging'); back.querySelector('.eds-modal').classList.add('landed');
        dt.textContent = 'Found it';
        if (!RM()){ try{ const r = dig.getBoundingClientRect(); const B = UI() && UI().burst; if (B) B(r.left + 70, r.top + 60); }catch(e){} }
        const mf = back.querySelector('.eds-mf');
        mf.innerHTML = '<small>Placed ' + esc(how) + '</small><span class="sp"></span><button type="button" class="eds-btn" data-x>Done</button><button type="button" class="eds-btn pri" data-open>Open the profile' + ic('arrowR') + '</button>';
        mf.querySelector('[data-x]').addEventListener('click', () => { close(); GbpHome.sig = ''; GbpHome.apply(true); });
        mf.querySelector('[data-open]').addEventListener('click', () => { close(); GbpHome.open(gc); });
      }catch(e){
        back.querySelector('.eds-modal').classList.remove('digging');
        er.hidden = false; er.textContent = e.message || 'The finder hit a problem. Try again.'; go.disabled = false;
      }
    });
  }
};

/* ==========================================================================
   REPORTING · each client card shows what it is linked to, and changes it
   ========================================================================== */
const RLinks = {
  paint(){
    if (secNow() !== 'report') return;
    document.querySelectorAll('.rh-card[data-cid]').forEach(card => {
      const c = (state.seoClients || []).find(x => x.id === card.dataset.cid); if (!c) return;
      const u = usage(c), so = c.social || {}, nSoc = ['facebook', 'instagram', 'linkedin', 'tiktok', 'youtube'].filter(k => so[k]).length;
      const sig = [u.kws, u.gbp && u.gbp.id, u.ads.length, nSoc, !!u.report].join('|');
      let row = card.querySelector('.eds-rlinks');
      if (row && row.dataset.sig === sig) return;
      if (!row){ row = document.createElement('div'); row.className = 'eds-rlinks'; card.appendChild(row); }
      row.dataset.sig = sig;
      const chip = (k, on, l, icn) => '<span role="button" tabindex="0" class="eds-rl ' + k + (on ? ' on' : '') + '" data-rl="' + k + '" title="' + esc((on ? 'Linked: ' : 'Not linked: ') + l + ' · click to change') + '">' + ic(icn) + '<em>' + esc(l) + '</em></span>';
      row.innerHTML = chip('seo', u.kws > 0, 'SEO', 'seo') + chip('gbp', !!u.gbp, 'Business Profile', 'gbp') + chip('ads', u.ads.length > 0, 'Google Ads', 'ads') + chip('social', nSoc > 0, 'Social', 'globe');
    });
  },
  menu(c, k, el){
    let m = $('edsRlMenu'); if (m) m.remove();
    m = document.createElement('div'); m.id = 'edsRlMenu'; m.className = 'eds-menu eds-rlmenu';
    const u = usage(c);
    let html = '';
    if (k === 'seo') html = '<p>' + (u.kws ? u.kws + ' keywords feed the ranking widgets.' : 'No keywords yet.') + '</p><button type="button" data-a="seo">Open SEO for ' + esc(c.name) + '</button>';
    if (k === 'gbp'){
      const opts = (state.clients || []).filter(g => g && (!u.gbp || g.id !== u.gbp.id));
      html = (u.gbp ? '<p>Linked to <b>' + esc(u.gbp.name) + '</b>. Its maps feed the Business Profile widgets.</p><button type="button" class="bad" data-a="gbp-off">Break the link</button>' : '<p>No Business Profile linked.</p><button type="button" data-a="gbp-find">Find their profile</button>') +
        (opts.length ? '<label>Link to</label><select data-gsel><option value="">Choose a profile…</option>' + opts.map(g => '<option value="' + esc(g.id) + '">' + esc(g.name) + '</option>').join('') + '</select>' : '');
    }
    if (k === 'ads'){
      let free = []; try{ const ch = OS().channels; free = ch.list('google_ads').filter(a => !ch.link(a)); }catch(e){}
      html = (u.ads.length ? '<p>Linked accounts feed the paid ads widgets.</p>' + u.ads.map(a => '<button type="button" class="bad" data-a="ads-off" data-id="' + esc(a.id) + '">Break: ' + esc(a.name || a.id) + '</button>').join('') : '<p>No Google Ads account linked.</p>') +
        (free.length ? '<label>Link an account</label><select data-asel><option value="">Choose…</option>' + free.map(a => '<option value="' + esc(a.id) + '">' + esc(a.name || a.id) + '</option>').join('') + '</select>' : '');
    }
    if (k === 'social') html = '<p>Social accounts Claude can read in Chrome for the social widgets.</p><button type="button" data-a="social">Edit social accounts</button>';
    m.innerHTML = html;
    document.body.appendChild(m);
    const r = el.getBoundingClientRect(); m.style.top = (r.bottom + 6) + 'px'; m.style.left = Math.min(innerWidth - 300, Math.max(12, r.left)) + 'px';
    const done = t => { m.remove(); toastMsg(t, 'ok'); this.repaint(); };
    m.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'seo'){ m.remove(); enter('seo', el, () => openClient(c, 'seo')); }
      if (a === 'gbp-off'){ try{ OS().setGbpLink(c, null); }catch(err){} done('Business Profile unlinked from ' + c.name); }
      if (a === 'gbp-find'){ m.remove(); Finder.open(c); }
      if (a === 'ads-off'){ try{ const ch = OS().channels, acc = ch.list('google_ads').find(x => String(x.id) === b.dataset.id); if (acc) ch.setLink(acc, null); }catch(err){} done('Google Ads account unlinked'); }
      if (a === 'social'){ m.remove(); Social.open(c); }
    });
    m.addEventListener('change', e => {
      if (e.target.matches('[data-gsel]') && e.target.value){ const g = (state.clients || []).find(x => x.id === e.target.value); try{ OS().setGbpLink(c, g); }catch(err){} done('Linked ' + c.name + ' to ' + g.name); }
      if (e.target.matches('[data-asel]') && e.target.value){ try{ const ch = OS().channels, acc = ch.list('google_ads').find(x => String(x.id) === e.target.value); if (acc) ch.setLink(acc, c.id); }catch(err){} done('Google Ads account linked'); }
    });
    setTimeout(() => document.addEventListener('mousedown', function away(e){ if (!m.contains(e.target)){ m.remove(); document.removeEventListener('mousedown', away); } }), 0);
  },
  repaint(){ document.querySelectorAll('.eds-rlinks').forEach(r => { r.dataset.sig = ''; }); this.paint(); }
};
document.addEventListener('click', e => {
  const ch = e.target.closest && e.target.closest('.eds-rl'); if (!ch) return;
  e.preventDefault(); e.stopPropagation();
  const card = ch.closest('.rh-card'); const c = card && (state.seoClients || []).find(x => x.id === card.dataset.cid);
  if (c) RLinks.menu(c, ch.dataset.rl, ch);
}, true);

/* Reports keep themselves current: when a client's linked Business Profile has
   new scan results, a report that is already shared is republished on its own,
   so the client's link always has the latest maps. Nothing is emailed. */
const AutoPub = {
  sigs: {}, busy: false,
  sigOf(c){ let g = null; try{ g = window.EDGE_gbpFor ? EDGE_gbpFor(c) : null; }catch(e){} if (!g) return ''; return (g.gbps || []).map(p => (p.keywords || []).map(k => (k.scans || []).length + ':' + ((k.scans || []).slice(-1)[0] || {}).at).join(',')).join('|'); },
  async tick(){
    const RA = window.EdgeReportsApp; if (!RA || !RA.isPublished || !RA.publish || this.busy) return;
    for (const c of (state.seoClients || []).filter(Boolean)){
      let pub = false; try{ pub = RA.isPublished(c); }catch(e){}
      if (!pub) continue;
      const s = this.sigOf(c); if (!s) continue;
      if (this.sigs[c.id] == null){ this.sigs[c.id] = s; continue; }
      if (this.sigs[c.id] !== s){
        this.busy = true;
        try{ await RA.publish(c); this.sigs[c.id] = s; }catch(e){}
        this.busy = false;
      }
    }
  }
};
setTimeout(() => setInterval(() => AutoPub.tick(), 60 * 1000), 20000);

/* ==========================================================================
   SOCIAL · per client, the accounts Claude may read in Chrome
   ========================================================================== */
const SOC = [['facebook', 'Facebook page', 'facebook.com/yourpage'], ['instagram', 'Instagram', '@handle'], ['linkedin', 'LinkedIn page', 'linkedin.com/company/…'], ['tiktok', 'TikTok', '@handle'], ['youtube', 'YouTube channel', 'youtube.com/@channel']];
const Social = {
  open(c){
    const ui = UI(); if (!ui || !c) return;
    const so = c.social || {};
    const m = ui.modal('<h2>Social accounts for ' + esc(c.name) + '</h2><p class="s">Only add the ones EDGE looks after. Claude reads these in Chrome with the team’s permissions and saves the figures for the Paid social and Social media tabs and the report widgets.</p>' +
      SOC.map(x => '<label class="f">' + esc(x[1]) + '</label><input class="in" data-s="' + x[0] + '" placeholder="' + esc(x[2]) + '" value="' + esc(so[x[0]] || '') + '">').join('') +
      '<label class="f" style="display:flex;gap:8px;align-items:center;margin-top:14px"><input type="checkbox" data-chrome' + (so.chrome !== false ? ' checked' : '') + '> Claude may open and read these in Chrome for analysis</label>' +
      '<label class="f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-paid' + (c.paidSocialOn ? ' checked' : '') + '> They run paid social (Meta Ads)</label>' +
      '<div class="mf"><button class="eui-btn" type="button" data-close>Cancel</button><button class="eui-btn pri" type="button" data-ok>Save</button></div>');
    m.el.querySelector('[data-ok]').addEventListener('click', () => {
      const n = {}; SOC.forEach(x => { const v = m.el.querySelector('[data-s="' + x[0] + '"]').value.trim(); if (v) n[x[0]] = v; });
      n.chrome = m.el.querySelector('[data-chrome]').checked; n.updatedAt = Date.now();
      c.social = n; c.paidSocialOn = m.el.querySelector('[data-paid]').checked;
      try{ save(); }catch(e){}
      m.close(); toastMsg('Social accounts saved for ' + c.name, 'ok'); RLinks.repaint(); SeoHome.apply(true);
    });
  }
};
/* Ads: is this client running ads at all, and which account */
const AdsSet = {
  open(c){
    const ui = UI(); if (!ui || !c) return;
    let free = [], mine = []; try{ const ch = OS().channels; free = ch.list('google_ads').filter(a => !ch.link(a)); mine = ch.list('google_ads').filter(a => (ch.link(a) || {}).id === c.id); }catch(e){}
    const m = ui.modal('<h2>Google Ads for ' + esc(c.name) + '</h2><p class="s">Read only. Claude reads Google Ads in Chrome every month and saves the numbers, campaigns and warnings here.</p>' +
      '<label class="f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-on' + (c.adsOn !== false && (c.adsOn || mine.length) ? ' checked' : '') + '> ' + esc(c.name) + ' runs Google Ads</label>' +
      (mine.length ? '<div class="note">Linked: ' + mine.map(a => esc(a.name || a.id)).join(', ') + '</div>' : '') +
      (free.length ? '<label class="f">Link an account</label><select class="in" data-a><option value="">Match it automatically on the next read</option>' + free.map(a => '<option value="' + esc(a.id) + '">' + esc(a.name || a.id) + ' · ' + esc(a.id) + '</option>').join('') + '</select>' : '') +
      '<label class="f">Customer ID <small>optional · helps Claude find the account in Chrome</small></label><input class="in" data-cid placeholder="123-456-7890" value="' + esc(c.adsCustomerId || '') + '">' +
      '<div class="mf"><button class="eui-btn" type="button" data-close>Cancel</button><button class="eui-btn pri" type="button" data-ok>Save</button></div>');
    m.el.querySelector('[data-ok]').addEventListener('click', () => {
      c.adsOn = m.el.querySelector('[data-on]').checked; c.adsCustomerId = m.el.querySelector('[data-cid]').value.trim();
      const sel = m.el.querySelector('[data-a]'); if (sel && sel.value){ try{ const ch = OS().channels, a = free.find(x => String(x.id) === sel.value); if (a) ch.setLink(a, c.id); }catch(e){} }
      try{ save(); }catch(e){} m.close(); toastMsg('Google Ads saved for ' + c.name, 'ok'); SeoHome.apply(true); RLinks.repaint();
    });
  }
};
/* What Claude should read in Chrome, per client: the hand-off for the monthly analysis. */
function analysisTargets(){
  return (state.seoClients || []).filter(Boolean).filter(c => !isArchived(c)).map(c => {
    let ads = []; try{ const ch = OS().channels; ads = ch.list('google_ads').filter(a => (ch.link(a) || {}).id === c.id).map(a => ({id: a.id, name: a.name})); }catch(e){}
    const so = c.social || {};
    return {id: c.id, name: c.name, website: c.website || '', googleAds: {on: !!(c.adsOn || ads.length), customerId: c.adsCustomerId || '', accounts: ads}, paidSocial: {on: !!c.paidSocialOn},
      social: so.chrome === false ? {} : SOC.reduce((o, x) => { if (so[x[0]]) o[x[0]] = so[x[0]]; return o; }, {})};
  }).filter(t => t.googleAds.on || t.paidSocial.on || Object.keys(t.social).length);
}


/* ==========================================================================
   LOGOS · one size everywhere
     A logo saved with lots of empty space around it (Electrogas, for one) looks
     small next to the rest. Each logo image is measured once; the visible mark
     is scaled up to fill its frame the same way for every client. Logos whose
     server does not allow reading the pixels are left as they are.
   ========================================================================== */
const LogoFit = {
  cache: (() => { try{ return JSON.parse(localStorage.getItem('edsLogoFit') || '{}'); }catch(e){ return {}; } })(),
  busy: {},
  sel: '.eds-lg img, .eds-logo img, .os-logo img, .rh-card img, .mt-logo img, .tn-bell-av img, .seo-logo img, .tree-row img, .eds-ini img',
  persist(){ try{ localStorage.setItem('edsLogoFit', JSON.stringify(this.cache)); }catch(e){} },
  measure(src){
    if (this.busy[src] || this.cache[src] != null) return;
    if (/^data:image\/svg|\.svg(\?|$)/i.test(src)) { this.cache[src] = 1; return; }
    this.busy[src] = 1;
    const im = new Image(); im.crossOrigin = 'anonymous'; im.referrerPolicy = 'no-referrer';
    im.onload = () => {
      try{
        const W = Math.min(im.naturalWidth, 256), H = Math.round(im.naturalHeight * W / Math.max(1, im.naturalWidth));
        const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        const x = cv.getContext('2d'); x.drawImage(im, 0, 0, W, H);
        const d = x.getImageData(0, 0, W, H).data;
        let x0 = W, y0 = H, x1 = -1, y1 = -1;
        for (let y = 0; y < H; y++) for (let X = 0; X < W; X++){ const i = (y * W + X) * 4; if (d[i + 3] > 24 && !(d[i] > 244 && d[i + 1] > 244 && d[i + 2] > 244)){ if (X < x0) x0 = X; if (X > x1) x1 = X; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
        if (x1 < 0){ this.cache[src] = 1; }
        else {
          const fw = (x1 - x0 + 1) / W, fh = (y1 - y0 + 1) / H, f = Math.max(fw, fh);
          this.cache[src] = f < 0.88 ? Math.min(2.4, Math.round(0.94 / f * 100) / 100) + ',' + Math.round(((x0 + x1) / 2 / W - 0.5) * 1000) / 10 + ',' + Math.round(((y0 + y1) / 2 / H - 0.5) * 1000) / 10 : 1;
        }
      }catch(e){ this.cache[src] = 1; }
      delete this.busy[src]; this.persist(); this.apply();
    };
    im.onerror = () => { this.cache[src] = 1; delete this.busy[src]; this.persist(); };
    im.src = src;
  },
  apply(){
    document.querySelectorAll(this.sel).forEach(img => {
      const src = img.currentSrc || img.src; if (!src || /favicons|faviconV2/.test(src)) return;
      const v = this.cache[src];
      if (v == null){ this.measure(src); return; }
      if (img.dataset.fit === String(v)) return;
      img.dataset.fit = String(v);
      if (v === 1){ img.style.transform = ''; return; }
      const [k, cx, cy] = String(v).split(',').map(Number);
      img.style.transformOrigin = '50% 50%';
      img.style.transform = 'translate(' + (-cx * k) + '%,' + (-cy * k) + '%) scale(' + k + ')';
      const box = img.parentElement; if (box && getComputedStyle(box).overflow === 'visible') box.style.overflow = 'hidden';
    });
  }
};
setInterval(() => LogoFit.apply(), 1500);

/* --- Across EDGE: the other three pillars, for this client --- */
const moneyK = v => v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e4 ? '$' + Math.round(v / 1e3) + 'k' : v >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'k' : '$' + Math.round(v || 0);
const monthShort = ym => { try{ const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-CA', {month: 'short'}); }catch(e){ return ''; } };
function nextSend(){
  let day = 1, hour = 8; try{ const c = OS().reporting.cfg(); day = c.day || 1; hour = c.hour == null ? 8 : c.hour; }catch(e){}
  const now = new Date(); let d = new Date(now.getFullYear(), now.getMonth(), day, hour);
  if (d <= now) d = new Date(now.getFullYear(), now.getMonth() + 1, day, hour);
  return d.toLocaleDateString('en-CA', {month: 'short', day: 'numeric'});
}
function adsOf(c){
  let accts = []; try{ const ch = OS().channels; accts = ch.list('google_ads').filter(a => !c || (ch.link(a) || {}).id === c.id); }catch(e){}
  let ym = ''; accts.forEach(a => Object.keys(a.months || {}).forEach(k => { if (k > ym) ym = k; }));
  let spend = 0, conv = 0; accts.forEach(a => { const m = (a.months || {})[ym]; if (m){ spend += +m.spend || 0; conv += +m.conversions || 0; } });
  return {n: accts.length, ym, spend, conv};
}
function ctxClient(){
  const k = secNow();
  if (onHub()) return null;
  const mod = (window.EDGE && EDGE.current && EDGE.current()) || state.seoModule;
  const byId = id => (state.seoClients || []).find(c => c && c.id === id) || null;
  if (k === 'report') return document.body.classList.contains('os-rhome') ? null : byId(state.activeSeoClientId);
  if (k === 'seo' && mod === 'gbp'){
    try{ return (state.seoClients || []).find(c => { const g = window.EDGE_gbpFor && EDGE_gbpFor(c); return g && g.id === state.activeClientId; }) || null; }catch(e){ return null; }
  }
  if (k === 'seo' && mod === 'seo') return SeoHome.openId ? byId(SeoHome.openId) : null;
  return null;
}
function facts(c){
  const out = {};
  if (c){
    const u = usage(c), a = adsOf(c);
    out.seo = u.kws ? {v: u.top10 + '/' + u.locs, l: 'on page one'} : (u.gbp ? {v: 'Map grid', l: 'local only'} : {v: 'Off', l: 'not tracking', off: 1});
    out.maint = u.maint === 'ok' ? {v: 'Done', l: 'this month'} : u.maint === 'due' ? {v: 'Due', l: 'this month', warn: 1} : u.maint === 'paused' ? {v: 'Paused', l: 'maintenance'} : {v: 'Off', l: 'not on care', off: 1};
    out.ads = a.n ? {v: moneyK(a.spend), l: (a.ym ? monthShort(a.ym) + ' · ' : '') + a.conv + ' conv.'} : {v: 'Off', l: 'no account', off: 1};
    out.report = u.report ? {v: nextSend(), l: 'next send'} : {v: 'Off', l: 'not emailed', off: 1};
  } else {
    let kws = 0, top10 = 0, locs = 0;
    (state.seoClients || []).filter(Boolean).filter(x => !isArchived(x)).forEach(x => { const u = usage(x); kws += u.kws; top10 += u.top10; locs += u.locs; });
    let due = 0, tot = 0; try{ const M = window.EDGE_maint; M.sites().forEach(x => { tot++; if (M.statusOf(x).key === 'due') due++; }); }catch(e){}
    const a = adsOf(null);
    let rep = 0; try{ rep = Object.values(OS().reporting.cfg().clients || {}).filter(r => r && r.on && (r.to || []).length).length; }catch(e){}
    out.seo = {v: kws, l: top10 + ' on page one'};
    out.maint = tot ? (due ? {v: due + ' due', l: 'of ' + tot + ' sites', warn: 1} : {v: 'All done', l: tot + ' sites'}) : {v: '—', l: 'no sites', off: 1};
    out.ads = a.n ? {v: moneyK(a.spend), l: (a.ym ? monthShort(a.ym) + ' · ' : '') + a.n + ' accounts'} : {v: '—', l: 'no accounts yet', off: 1};
    out.report = {v: nextSend(), l: rep + ' report' + (rep === 1 ? '' : 's') + ' going out'};
  }
  return out;
}
const Dock = {
  sig: '', min: (() => { try{ return localStorage.getItem('euDockMin') === '1'; }catch(e){ return false; } })(),
  el(){
    let d = $('euDock');
    if (!d){
      d = document.createElement('nav'); d.id = 'euDock'; d.className = 'eu-dock'; d.setAttribute('aria-label', 'Across EDGE');
      document.body.appendChild(d);
      document.addEventListener('pointerdown', e => { if (!d.contains(e.target)) d.classList.remove('open'); });
      d.addEventListener('click', e => {
        if (e.target.closest('[data-min]')){ this.min = !this.min; try{ localStorage.setItem('euDockMin', this.min ? '1' : '0'); }catch(err){} this.sig = ''; this.paint(); return; }
        const b = e.target.closest('[data-to]'); if (!b) return;
        if (matchMedia('(hover: none)').matches && !d.classList.contains('open')){ d.classList.add('open'); return; }
        d.classList.remove('open');
        const k = b.dataset.to, c = (state.seoClients || []).find(x => x.id === b.dataset.c);
        enter(k, b, () => { if (c) openClient(c, k === 'seo' ? 'seo' : k); else if (OS()) OS().go(k); });
      });
    }
    return d;
  },
  paint(){
    const d = this.el(), here = secNow();
    if (onHub() || !document.body.classList.contains('os-on')){ d.classList.remove('on'); return; }
    const c = ctxClient(), f = facts(c);
    const sig = here + '|' + (c ? c.id : '') + '|' + this.min + '|' + JSON.stringify(f);
    d.classList.add('on');
    if (sig === this.sig) return;
    this.sig = sig;
    const chips = ORDER.filter(k => k !== here).map(k => { const u = U[k], x = f[k];
      return '<button type="button" class="eu-chip eu-' + k + (x.off ? ' off' : '') + (x.warn ? ' warn' : '') + '" data-to="' + k + '"' + (c ? ' data-c="' + esc(c.id) + '"' : '') + ' title="' + esc('Open ' + u.name + (c ? ' for ' + c.name : '')) + '">' +
        '<span class="eu-chip-ic">' + ic(u.ic) + '</span><span class="eu-chip-t"><small>' + u.n + ' ' + u.w + '</small><b>' + esc(String(x.v)) + '</b><em>' + esc(x.l) + '</em></span></button>'; }).join('');
    d.innerHTML = '<div class="eu-dock-h"><small>Across EDGE</small><b>' + esc(c ? c.name : 'All clients') + '</b></div><div class="eu-dock-row">' + chips + '</div>';
  }
};

/* the teal floor on Home ends halfway down the four doors */
function sizeHome(){
  const inner = document.querySelector('#hubScreen .hub-inner'), g = document.querySelector('#osHub .osh-grid');
  if (!inner || !g) return;
  const r = g.getBoundingClientRect(), ri = inner.getBoundingClientRect();
  const h = Math.round(r.top - ri.top + r.height * 0.5);
  if (h > 200 && inner._euh !== h){ inner._euh = h; inner.style.setProperty('--euh', h + 'px'); }
}
/* Counters that clear once opened: the number goes away until it changes. */
const Badges = {
  ids: {tnSlow: '.tn-bell-n', osTasksBtn: '#osTasksBadge'},
  seen: (() => { try{ return JSON.parse(localStorage.getItem('euBadgeSeen') || '{}'); }catch(e){ return {}; } })(),
  val(id){ const b = $(id); const n = b && b.querySelector(this.ids[id]); return n ? String(n.textContent || '').trim() : ''; },
  tick(){
    Object.keys(this.ids).forEach(id => {
      const b = $(id), n = b && b.querySelector(this.ids[id]); if (!n) return;
      const v = String(n.textContent || '').trim();
      n.classList.toggle('eu-quiet', !!v && this.seen[id] === v);
    });
  },
  open(id){ this.seen[id] = this.val(id); try{ localStorage.setItem('euBadgeSeen', JSON.stringify(this.seen)); }catch(e){} this.tick(); }
};
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('#tnSlow,#osTasksBtn'); if (b) setTimeout(() => Badges.open(b.id), 0);
}, true);

/* Report editor: the Pages list jumps straight to the page. */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('.aab-pages [data-go]'); if (!b) return;
  const B = window.EDGE_aaBuilder; if (!B || !B.pages) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const p = B.pages()[+b.dataset.go]; if (!p) return;
  const el = p.anchor ? document.querySelector('.rp-w[data-id="' + p.anchor.id + '"]') : document.querySelector('[data-sheet]');
  document.querySelectorAll('.aab-pages .aab-pg').forEach(x => x.classList.toggle('on', x === b.parentNode));
  if (!el) return;
  const top = [...document.querySelectorAll('.topnav,.aab-top,.aab-tools,.aab-bar,.aab-tb')].filter(x => { const cs = getComputedStyle(x); return cs.position === 'sticky' || cs.position === 'fixed'; }).reduce((m, x) => Math.max(m, x.getBoundingClientRect().bottom), 0);
  const y = Math.max(0, el.getBoundingClientRect().top + scrollY - top - 16);
  window.scrollTo({top: y, behavior: RM() ? 'auto' : 'smooth'});
  setTimeout(() => { if (Math.abs(scrollY - y) > 40) window.scrollTo(0, y); try{ (window.EDGE_FX || {}).flash && EDGE_FX.flash(el); }catch(err){} }, 900);
}, true);

function universeTick(){ paintBadge(); railState(); SeoHome.apply(false); GbpHome.apply(false); RLinks.paint(); Dock.paint(); Badges.tick(); if (onHub()){ paintSerpDoor(); sizeHome(); } }

window.EDGE_DS = {setup: o => Setup.open(o), board: Board, seo: SeoHome, gbp: GbpHome, finder: Finder, social: Social, ads: AdsSet, analysisTargets, usage, openClient, portal, enter, leave, dock: Dock};

function boot(){
  wear(); hookAll(); watchHub();
  document.body.classList.add('eu-on');
  universeTick();
  try{ new MutationObserver(() => universeTick()).observe(document.body, {attributes: true, attributeFilter: ['class']}); }catch(e){}
  try{ const hs = $('hubScreen'); if (hs) new MutationObserver(() => universeTick()).observe(hs, {attributes: true, attributeFilter: ['class', 'style']}); }catch(e){}
  setInterval(universeTick, 2000);
  setInterval(hookAll, 3000);
  addEventListener('resize', () => { Board.pill(); sizeHome(); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else setTimeout(boot, 0);
})();
