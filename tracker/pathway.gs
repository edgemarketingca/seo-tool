/* ==========================================================================
   PATHWAY STRUCTURE (the "Pathways" report widget and the Pathway button
   on Page performance)

   GET ?action=pathway&domain=x&key=ADMIN|t=TOKEN&start=YYYY-MM-DD&end=YYYY-MM-DD[&channel=organic|paid|direct|referral|other]
   {
     range: {start, end}, channel,
     channels: {all, organic, paid, direct, referral, other}   sessions per traffic type (always all traffic)
     total, reached                    sessions, and sessions that reached a key event
     landings: [[page, sessions, reached, keyEvents]]          every page sessions started on
     steps:    [[landing, from, to, views]]  page-to-page moves inside sessions that started on landing
     moves:    [[from, to, views]]           the same moves for every session (whatever page it started on)
     views:    [[page, views]]               page views per page
     keys:     [[page, event, count]]        key events and where they fired
     keyLand:  [[landing, event, sessions, count]]  key events reached by sessions that started on landing
   }
   A "move" is a page view whose referrer is another page of the same site,
   so the step after a starting page is counted exactly; deeper steps are
   estimated from the moves out of each page (GA4's API has no path report).
   Aggregated numbers only, so a client report token may read it.
   Every page and move is kept (no top-N cut), so every page visited is in the chart.
   Cached 30 minutes per client, range and traffic type.
   ========================================================================== */

const PW_CHANNELS_ = {
  organic: ['Organic Search', 'Organic Social', 'Organic Video', 'Organic Shopping'],
  paid: ['Paid Search', 'Paid Social', 'Paid Shopping', 'Paid Video', 'Paid Other', 'Display', 'Cross-network'],
  direct: ['Direct'],
  referral: ['Referral']
};

function pathwayFor_(domain, start, end, channel) {
  const c = clients_().filter(function (x) { return x.domain === domain; })[0];
  if (!c) return { error: 'unknown client' };
  if (!c.ga4) return { error: 'GA4 is not matched for this client yet' };
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  end = iso.test(end || '') ? end : 'yesterday';
  start = iso.test(start || '') ? start : '30daysAgo';
  channel = PW_CHANNELS_[channel] || channel === 'other' ? channel : 'all';
  const ck = 'pw4:' + domain + ':' + start + ':' + end + ':' + channel;
  const hit = cacheGetBig_(ck);
  if (hit) return hit;

  const prop = 'properties/' + c.ga4;
  const host = String(domain).replace(/^www\./, '').toLowerCase();
  const range = [{ startDate: start, endDate: end }];
  var all = [];
  Object.keys(PW_CHANNELS_).forEach(function (k) { all = all.concat(PW_CHANNELS_[k]); });
  const chFilter = channel === 'all' ? null : channel === 'other'
    ? { notExpression: { filter: { fieldName: 'sessionDefaultChannelGroup', inListFilter: { values: all } } } }
    : { filter: { fieldName: 'sessionDefaultChannelGroup', inListFilter: { values: PW_CHANNELS_[channel] } } };
  const withCh = function (f) {
    if (!chFilter) return f || undefined;
    if (!f) return chFilter;
    return { andGroup: { expressions: [chFilter, f] } };
  };
  const run = function (req, max) {
    const rows = [];
    var offset = 0, thresholded = false;
    while (true) {
      const res = AnalyticsData.Properties.runReport(Object.assign({}, req, { limit: 10000, offset: offset }), prop);
      if (res.metadata && res.metadata.subjectToThresholding) thresholded = true;
      (res.rows || []).forEach(function (r) { rows.push([r.dimensionValues.map(function (v) { return v.value; }), r.metricValues.map(function (v) { return Number(v.value) || 0; })]); });
      offset += (res.rows || []).length;
      if (!(res.rows || []).length || offset >= (res.rowCount || 0) || offset >= (max || 30000)) break;
    }
    rows.thresholded = thresholded;
    return rows;
  };
  /* A referrer on this site, as a page key; '' for an outside referrer or none. */
  const refKey = function (u) {
    const m = /^https?:\/\/([^\/?#:]+)/i.exec(String(u || ''));
    if (!m || m[1].toLowerCase().replace(/^www\./, '') !== host) return '';
    return pgKey_(u);
  };
  const out = { domain: domain, range: { start: start, end: end }, channel: channel, notes: [] };

  /* Sessions per traffic type, always for all traffic so the switches can show their counts. */
  const chs = { all: 0, organic: 0, paid: 0, direct: 0, referral: 0, other: 0 };
  run({ dateRanges: range, dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }] }, 200).forEach(function (r) {
    const g = r[0][0], n = r[1][0];
    chs.all += n;
    var b = 'other';
    Object.keys(PW_CHANNELS_).forEach(function (k) { if (PW_CHANNELS_[k].indexOf(g) > -1) b = k; });
    chs[b] += n;
  });
  out.channels = chs;

  /* 1. Starting pages, with the sessions that reached a key event. */
  const land = {};
  run({ dateRanges: range, dimensions: [{ name: 'landingPage' }], metrics: [{ name: 'sessions' }, { name: 'sessionKeyEventRate' }, { name: 'keyEvents' }],
    dimensionFilter: withCh(null), orderBys: [{ metric: { metricName: 'sessions' }, desc: true }] }, 5000).forEach(function (r) {
    if (!r[0][0] || r[0][0] === '(not set)') return;
    const k = pgKey_(r[0][0]), o = land[k] = land[k] || [k, 0, 0, 0];
    o[1] += r[1][0]; o[2] += r[1][0] * r[1][1]; o[3] += r[1][2];
  });
  const landings = Object.keys(land).map(function (k) { const o = land[k]; return [o[0], Math.round(o[1]), Math.round(o[2]), Math.round(o[3])]; })
    .sort(function (a, b) { return b[1] - a[1]; });
  out.total = landings.reduce(function (t, r) { return t + r[1]; }, 0);
  out.reached = landings.reduce(function (t, r) { return t + r[2]; }, 0);
  out.landings = landings.slice(0, 1500);
  const top = {};
  out.landings.forEach(function (r) { top[r[0]] = 1; });

  /* 2. Page-to-page moves, inside each starting page's sessions. */
  const st = {}, mv = {}, vw = {};
  const q2 = run({ dateRanges: range, dimensions: [{ name: 'landingPage' }, { name: 'pageReferrer' }, { name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }],
    dimensionFilter: withCh(null), orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }] }, 200000);
  if (q2.thresholded) out.thresholded = true;
  q2.forEach(function (r) {
    const n = r[1][0];
    if (!n) return;
    const to = pgKey_(r[0][2]), from = refKey(r[0][1]), l = r[0][0] && r[0][0] !== '(not set)' ? pgKey_(r[0][0]) : '';
    vw[to] = (vw[to] || 0) + n;
    if (!from || from === to) return;
    const mk = from + '\u0001' + to;
    mv[mk] = (mv[mk] || 0) + n;
    if (l && top[l]) { const sk = l + '\u0001' + mk; st[sk] = (st[sk] || 0) + n; }
  });
  out.steps = Object.keys(st).map(function (k) { const p = k.split('\u0001'); return [p[0], p[1], p[2], st[k]]; })
    .sort(function (a, b) { return b[3] - a[3]; }).slice(0, 60000);
  out.moves = Object.keys(mv).map(function (k) { const p = k.split('\u0001'); return [p[0], p[1], mv[k]]; })
    .sort(function (a, b) { return b[2] - a[2]; }).slice(0, 60000);
  out.views = Object.keys(vw).map(function (k) { return [k, vw[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 20000);

  /* 3. Key events: where they fired, and which starting pages' sessions reached them. */
  const kf = { filter: { fieldName: 'keyEvents', numericFilter: { operation: 'GREATER_THAN', value: { int64Value: '0' } } } };
  const kp = {};
  run({ dateRanges: range, dimensions: [{ name: 'pagePath' }, { name: 'eventName' }], metrics: [{ name: 'keyEvents' }],
    dimensionFilter: withCh(null), metricFilter: kf }, 50000).forEach(function (r) {
    const k = pgKey_(r[0][0]) + '\u0001' + r[0][1];
    kp[k] = (kp[k] || 0) + r[1][0];
  });
  out.keys = Object.keys(kp).map(function (k) { const p = k.split('\u0001'); return [p[0], p[1], Math.round(kp[k])]; })
    .sort(function (a, b) { return b[2] - a[2]; }).slice(0, 20000);
  const kl = {};
  run({ dateRanges: range, dimensions: [{ name: 'landingPage' }, { name: 'eventName' }], metrics: [{ name: 'sessions' }, { name: 'keyEvents' }],
    dimensionFilter: withCh(null), metricFilter: kf }, 50000).forEach(function (r) {
    if (!r[0][0] || r[0][0] === '(not set)') return;
    const k = pgKey_(r[0][0]) + '\u0001' + r[0][1], o = kl[k] = kl[k] || [0, 0];
    o[0] += r[1][0]; o[1] += r[1][1];
  });
  out.keyLand = Object.keys(kl).map(function (k) { const p = k.split('\u0001'); return [p[0], p[1], Math.round(kl[k][0]), Math.round(kl[k][1])]; })
    .sort(function (a, b) { return b[2] - a[2]; }).slice(0, 20000);

  /* 4. Real key events only, counted as distinct sessions.
     Many GA4 setups mark page visits as key events (home_page, about_page, featured_projects_page…).
     Counted as conversions they make almost every session "convert", so they are found and left out:
     by name, and by behaviour (an event that fires on about every view of one page is a page view).
     Then GA4 is asked for sessions with at least one real key event, which never counts a session twice. */
  const markers = pwMarkers_(out.keys, vw);
  out.markers = markers;
  const real = unique_(out.keys.map(function (r) { return r[1]; })).filter(function (e) { return markers.indexOf(e) < 0; });
  out.realKeys = real;
  out.reachedReal = 0;
  out.stepKeys = [];
  if (real.length) {
    const ef = { filter: { fieldName: 'eventName', inListFilter: { values: real } } };
    const lr = {};
    run({ dateRanges: range, dimensions: [{ name: 'landingPage' }], metrics: [{ name: 'sessions' }], dimensionFilter: withCh(ef) }, 5000).forEach(function (r) {
      if (!r[0][0] || r[0][0] === '(not set)') return;
      const k = pgKey_(r[0][0]); lr[k] = (lr[k] || 0) + r[1][0];
    });
    out.landings.forEach(function (r) { r[4] = Math.min(r[1], Math.round(lr[r[0]] || 0)); });
    out.reachedReal = out.landings.reduce(function (t, r) { return t + r[4]; }, 0);
    /* The page after a starting page: sessions that started there and fired a real key event on that page, and which ones. */
    const sk = {};
    run({ dateRanges: range, dimensions: [{ name: 'landingPage' }, { name: 'pagePath' }, { name: 'eventName' }], metrics: [{ name: 'sessions' }, { name: 'keyEvents' }],
      dimensionFilter: withCh(ef) }, 50000).forEach(function (r) {
      if (!r[0][0] || r[0][0] === '(not set)') return;
      const k = pgKey_(r[0][0]) + '\u0001' + pgKey_(r[0][1]) + '\u0001' + r[0][2], o = sk[k] = sk[k] || [0, 0];
      o[0] += r[1][0]; o[1] += r[1][1];
    });
    const ss = {};
    run({ dateRanges: range, dimensions: [{ name: 'landingPage' }, { name: 'pagePath' }], metrics: [{ name: 'sessions' }], dimensionFilter: withCh(ef) }, 50000).forEach(function (r) {
      if (!r[0][0] || r[0][0] === '(not set)') return;
      const k = pgKey_(r[0][0]) + '\u0001' + pgKey_(r[0][1]); ss[k] = (ss[k] || 0) + r[1][0];
    });
    /* [landing, page, sessions with a real key event on that page, [[event, sessions, times]]] */
    const byLp = {};
    Object.keys(sk).forEach(function (k) { const p = k.split('\u0001'), lp = p[0] + '\u0001' + p[1]; (byLp[lp] = byLp[lp] || []).push([p[2], Math.round(sk[k][0]), Math.round(sk[k][1])]); });
    out.stepKeys = Object.keys(byLp).map(function (lp) { const p = lp.split('\u0001'); return [p[0], p[1], Math.round(ss[lp] || 0), byLp[lp].sort(function (a, b) { return b[1] - a[1]; })]; })
      .sort(function (a, b) { return b[2] - a[2]; }).slice(0, 20000);
  } else out.landings.forEach(function (r) { r[4] = 0; });

  out.generatedAt = new Date().toISOString();
  cachePutBig_(ck, out, 1800);
  return out;
}

/* Key events that only record a page being seen. keys: [[page, event, count]], views: {page: views}.
   In order: a name saying something was done (thank-you, confirmation, form completed...) is a result;
   a page-visit name (*_page_visit, *_page...) is a page visit; an action name (clicks, submit, lead,
   call, purchase...) is a result. Anything else is decided by the data: an event named after the page
   it fires on, or firing on about every view of its pages, is a page visit. */
const PW_DONE_ = /(^|_)(thank|thanks|thankyou|confirmation|confirmed|complete|completed|sent|submitted|received)(_|$)/i;
const PW_MARKER_ = /(^|_)(page_?visit|page_?view|pageview|visit_page|scroll|session_start|first_visit|user_engagement)$|_page$|^page_|_visit$|^view_|_view$/i;
const PW_ACTION_ = /(^|_)(booked|purchase|purchased|success|order|ordered|click|clicks|tap|taps|submit|submission|lead|leads|call|calls|download|downloads|signup|sign_up|register|registration|cta|form|chat|checkout|add_to_cart|apply|application|subscribe|newsletter)(_|$)/i;
function pwWords_(s) {
  return String(s).toLowerCase().replace(/(_|^)(page_?visit|page_?view|page|visit|view)(_|$)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
}
function pwMarkers_(keys, views) {
  const ev = {};
  keys.forEach(function (r) { const o = ev[r[1]] = ev[r[1]] || { n: 0, pages: {} }; o.n += r[2]; o.pages[r[0]] = (o.pages[r[0]] || 0) + r[2]; });
  return Object.keys(ev).filter(function (e) {
    if (PW_DONE_.test(e)) return false;
    if (PW_MARKER_.test(e)) return true;
    if (PW_ACTION_.test(e)) return false;
    const o = ev[e], ps = Object.keys(o.pages).sort(function (a, b) { return o.pages[b] - o.pages[a]; }), top = ps[0];
    const sumV = ps.reduce(function (t, p) { return t + (views[p] || 0); }, 0), topV = views[top] || 0;
    if (/^(home|homepage|home_page|index|main)$/i.test(e) && ps.indexOf('/') > -1) return true;
    const w = pwWords_(e), segs = top.split('/').filter(Boolean).map(pwWords_).filter(function (x) { return x.length >= 3; });
    if (w.length >= 3 && segs.some(function (x) { return x.indexOf(w) > -1 || w.indexOf(x) > -1; }) && o.pages[top] >= 0.5 * topV) return true;
    return sumV >= 5 && o.n >= 0.6 * sumV;
  });
}

function testPathway() {
  const c = clients_().filter(function (x) { return x.ga4; })[0];
  const r = pathwayFor_(c.domain, '', '', 'all');
  if (r.error) { console.log(r.error); return; }
  console.log(c.domain + ': ' + r.total + ' sessions, ' + r.reached + ' reached a key event; ' + r.landings.length + ' starting pages, ' +
    r.steps.length + ' steps, ' + r.moves.length + ' moves, ' + r.keys.length + ' key event rows. Channels ' + JSON.stringify(r.channels) +
    '. Top: ' + JSON.stringify(r.landings.slice(0, 3)) + ' first steps: ' + JSON.stringify(r.steps.slice(0, 4)) + ' | size ' + JSON.stringify(r).length);
}
