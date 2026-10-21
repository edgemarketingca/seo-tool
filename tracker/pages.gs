/* ==========================================================================
   PAGE PERFORMANCE (the "Page performance" report widget)

   GET ?action=pages&domain=x&key=ADMIN|t=TOKEN&start=YYYY-MM-DD&end=YYYY-MM-DD&split=YYYY-MM-DD
     start..split-1 is the previous period, split..end the current one
     (one request covers both, the same range ga4report reads).
   {
     range: {start, split, end},
     cols:  ['views', 'users', 'sessions', 'engaged', 'keyEvents', 'entryKeyEvents', 'engSec'],
     pages: [[path, title, cur[7], prev[7]]]    GA4, one row per page path
     sitemap: [path, ...]                        every page in the site's XML sitemap(s)
     sitemapFrom: 'https://…/sitemap.xml' | ''
   }
     views, users, keyEvents, engSec   events on the page itself (pagePath)
     sessions, engaged, entryKeyEvents sessions that started on the page (landingPage)

   GET …&path=/some-page/   one page, day by day for the current period:
   { path, series: [[date, views, users, sessions, keyEvents]] }

   Aggregated numbers only, so a client report token may read it.
   GA4 results cached 30 minutes, the sitemap 6 hours.
   ========================================================================== */

const PG_MAX_ = 2000;

function pagesFor_(domain, start, end, split, path) {
  const c = clients_().filter(function (x) { return x.domain === domain; })[0];
  if (!c) return { error: 'unknown client' };
  if (!c.ga4) return { error: 'GA4 is not matched for this client yet' };
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(end || '')) end = Utilities.formatDate(new Date(Date.now() - 86400000), 'UTC', 'yyyy-MM-dd');
  if (!iso.test(split || '')) split = Utilities.formatDate(new Date(Date.parse(end + 'T12:00:00Z') - 29 * 86400000), 'UTC', 'yyyy-MM-dd');
  if (!iso.test(start || '') || start >= split) start = Utilities.formatDate(new Date(Date.parse(split + 'T12:00:00Z') - 30 * 86400000), 'UTC', 'yyyy-MM-dd');
  if (split > end) split = end;
  const prevEnd = Utilities.formatDate(new Date(Date.parse(split + 'T12:00:00Z') - 86400000), 'UTC', 'yyyy-MM-dd');
  const prop = 'properties/' + c.ga4;
  const day = function (d) { return d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8); };
  const run = function (req, max) {
    const rows = [];
    var offset = 0;
    while (true) {
      const res = AnalyticsData.Properties.runReport(Object.assign({}, req, { limit: 10000, offset: offset }), prop);
      (res.rows || []).forEach(function (r) { rows.push([r.dimensionValues.map(function (v) { return v.value; }), r.metricValues.map(function (v) { return Number(v.value) || 0; })]); });
      offset += (res.rows || []).length;
      if (!(res.rows || []).length || offset >= (res.rowCount || 0) || offset >= (max || 50000)) break;
    }
    return rows;
  };

  /* One page, day by day. */
  if (path) {
    path = String(path).slice(0, 500);
    const pk = pgKey_(path);
    const sk = 'pgs2:' + domain + ':' + split + ':' + end + ':' + Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, pk));
    const sh = CacheService.getScriptCache().get(sk);
    if (sh) { try { return JSON.parse(sh); } catch (e) {} }
    const variants = pgVariants_(pk);
    const byDay = {};
    const slot = function (d) { return byDay[d] = byDay[d] || [d, 0, 0, 0, 0]; };
    run({ dateRanges: [{ startDate: split, endDate: end }], dimensions: [{ name: 'date' }, { name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }, { name: 'keyEvents' }],
      dimensionFilter: { filter: { fieldName: 'pagePath', inListFilter: { values: variants, caseSensitive: false } } } }, 5000)
      .forEach(function (r) { const o = slot(day(r[0][0])); o[1] += r[1][0]; o[2] += r[1][1]; o[4] += r[1][2]; });
    run({ dateRanges: [{ startDate: split, endDate: end }], dimensions: [{ name: 'date' }, { name: 'landingPage' }],
      metrics: [{ name: 'sessions' }],
      dimensionFilter: { filter: { fieldName: 'landingPage', inListFilter: { values: variants, caseSensitive: false } } } }, 5000)
      .forEach(function (r) { slot(day(r[0][0]))[3] += r[1][0]; });
    const series = Object.keys(byDay).sort().map(function (k) { return byDay[k].map(function (v, i) { return i ? Math.round(v) : v; }); });
    /* Every event on the page, key events marked, so the widget can say what they were. */
    const events = run({ dateRanges: [{ startDate: split, endDate: end }], dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }, { name: 'keyEvents' }],
      dimensionFilter: { filter: { fieldName: 'pagePath', inListFilter: { values: variants, caseSensitive: false } } },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }] }, 200)
      .map(function (r) { return [r[0][0], Math.round(r[1][0]), Math.round(r[1][1])]; });
    const one = { path: pk, range: { split: split, end: end }, series: series, events: events };
    try { CacheService.getScriptCache().put(sk, JSON.stringify(one), 1800); } catch (e) {}
    return one;
  }

  const ck = 'pg:' + domain + ':' + start + ':' + split + ':' + end;
  const hit = cacheGetBig_(ck);
  if (hit) return hit;

  const ranges = [{ startDate: split, endDate: end, name: 'cur' }, { startDate: start, endDate: prevEnd, name: 'prev' }];
  const m = {};
  const row = function (k) { return m[k] = m[k] || { title: '', cur: [0, 0, 0, 0, 0, 0, 0], prev: [0, 0, 0, 0, 0, 0, 0] }; };
  /* What happened on each page. */
  run({ dateRanges: ranges, dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }, { name: 'keyEvents' }, { name: 'userEngagementDuration' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }] }, 30000)
    .forEach(function (r) {
      const o = row(pgKey_(r[0][0])), b = r[0][2] === 'prev' ? o.prev : o.cur;
      if (!o.title && r[0][1] && r[0][1] !== '(not set)') o.title = r[0][1].slice(0, 140);
      b[0] += r[1][0]; b[1] += r[1][1]; b[4] += r[1][2]; b[6] += r[1][3];
    });
  /* Sessions that started on each page. */
  run({ dateRanges: ranges, dimensions: [{ name: 'landingPage' }],
    metrics: [{ name: 'sessions' }, { name: 'engagedSessions' }, { name: 'keyEvents' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }] }, 30000)
    .forEach(function (r) {
      if (!r[0][0] || r[0][0] === '(not set)') return;
      const o = row(pgKey_(r[0][0])), b = r[0][1] === 'prev' ? o.prev : o.cur;
      b[2] += r[1][0]; b[3] += r[1][1]; b[5] += r[1][2];
    });
  const pages = Object.keys(m).map(function (k) {
    const o = m[k], r = function (a) { return a.map(function (v) { return Math.round(v); }); };
    return [k, o.title, r(o.cur), r(o.prev)];
  }).sort(function (a, b) { return (b[2][0] + b[2][2]) - (a[2][0] + a[2][2]); }).slice(0, PG_MAX_);

  const sm = sitemapFor_(domain);
  const out = { domain: domain, range: { start: start, split: split, end: end },
    cols: ['views', 'users', 'sessions', 'engaged', 'keyEvents', 'entryKeyEvents', 'engSec'],
    pages: pages, sitemap: sm.paths, sitemapFrom: sm.from, generatedAt: new Date().toISOString() };
  cachePutBig_(ck, out, 1800);
  return out;
}

/* A page path as one key: no query string or #fragment, no trailing slash (except the home page), lower-case. */
function pgKey_(p) {
  var s = String(p || '').trim();
  s = s.replace(/^https?:\/\/[^\/]+/i, '').split('#')[0].split('?')[0];
  if (!s || s.charAt(0) !== '/') s = '/' + s;
  try { s = decodeURI(s); } catch (e) {}
  s = s.toLowerCase().replace(/\/{2,}/g, '/');
  if (s.length > 1) s = s.replace(/\/+$/, '');
  return s || '/';
}
/* The ways GA4 may have stored one path (with and without the trailing slash). */
function pgVariants_(k) {
  if (k === '/') return ['/', '/index.html', '/index.php'];
  return [k, k + '/', k + '/index.html'];
}

/* Every page URL in the site's sitemap(s), as path keys. Follows sitemap
   indexes (WordPress, Yoast, Rank Math, Squarespace, Wix…) and the
   Sitemap: lines in robots.txt. Media and attachment sitemaps are skipped. */
function sitemapFor_(domain) {
  const ck = 'sm:' + domain;
  const hit = cacheGetBig_(ck);
  if (hit) return hit;
  const host = String(domain).replace(/^www\./, '');
  const fetch = function (url) {
    try {
      const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true, validateHttpsCertificates: true,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EDGE-SEO-Reporter/1.0)' } });
      if (r.getResponseCode() !== 200) return '';
      return r.getContentText().slice(0, 5000000);
    } catch (e) { return ''; }
  };
  const sameSite = function (u) { const m = /^https?:\/\/([^\/:]+)/i.exec(u); return !!m && m[1].toLowerCase().replace(/^www\./, '') === host; };
  const locs = function (xml) {
    const out = [], re = /<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)\s*(?:\]\]>)?\s*<\/loc>/gi;
    var x;
    while ((x = re.exec(xml))) out.push(x[1].replace(/&amp;/g, '&'));
    return out;
  };
  const skip = /(image|video|attachment|media|author|tag|category_?tag|post_tag|format)[-_]?sitemap|sitemap[-_]?(image|video|news|author|tag)/i;

  var queue = [], from = '';
  ['https://' + domain, 'https://www.' + host, 'https://' + host].filter(function (v, i, a) { return a.indexOf(v) === i; }).some(function (base) {
    const robots = fetch(base + '/robots.txt');
    const listed = (robots.match(/^\s*sitemap:\s*(\S+)/gim) || []).map(function (l) { return l.replace(/^\s*sitemap:\s*/i, '').trim(); }).filter(sameSite);
    queue = listed.length ? listed : [base + '/sitemap.xml', base + '/sitemap_index.xml', base + '/wp-sitemap.xml', base + '/sitemap-index.xml'];
    return listed.length > 0;
  });

  const seen = {}, pages = {};
  var fetched = 0;
  while (queue.length && fetched < 25 && Object.keys(pages).length < 5000) {
    const u = queue.shift();
    if (seen[u]) continue;
    seen[u] = 1;
    const xml = fetch(u);
    fetched++;
    if (!xml || !/<(urlset|sitemapindex)/i.test(xml)) continue;
    if (!from) from = u;
    if (/<sitemapindex/i.test(xml)) {
      locs(xml).filter(sameSite).forEach(function (s) { if (!skip.test(s) && !seen[s]) queue.push(s); });
    } else {
      locs(xml).filter(sameSite).forEach(function (p) {
        if (/\.(jpe?g|png|gif|webp|svg|pdf|mp4|zip|docx?|xlsx?)$/i.test(p)) return;
        pages[pgKey_(p)] = 1;
      });
    }
  }
  const out = { paths: Object.keys(pages).sort().slice(0, 5000), from: from, at: new Date().toISOString() };
  cachePutBig_(ck, out, 21600);
  return out;
}

function testPages() {
  const c = clients_().filter(function (x) { return x.ga4; })[0];
  const r = pagesFor_(c.domain, '', '', '', '');
  if (r.error) { console.log(r.error); return; }
  console.log(c.domain + ': ' + r.pages.length + ' pages, ' + r.sitemap.length + ' in sitemap (' + r.sitemapFrom + '). Top: ' + JSON.stringify(r.pages.slice(0, 3)) +
    ' | size ' + JSON.stringify(r).length);
  if (r.pages[0]) console.log(JSON.stringify(pagesFor_(c.domain, '', '', '', r.pages[0][0]).series.slice(0, 5)));
}
