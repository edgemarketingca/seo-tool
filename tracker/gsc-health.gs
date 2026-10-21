/* ==========================================================================
   SEARCH CONSOLE HEALTH (the "Search Console health" report widget)

   Search Console's API has no "Page indexing" or "Enhancements" report, but
   its URL Inspection API checks one page at a time: indexed or not and why,
   robots and fetch problems, canonicals, and every rich result Google found
   (Breadcrumbs, FAQ, Review snippets…) with each issue marked ERROR or
   WARNING. The Sitemaps API adds errors and warnings per sitemap.

   startGscHealth_(domain?) queues each client's sitemap pages (up to
   GH_MAX_ pages, homepage and shallow pages first) and its sitemaps;
   continueGscHealth works through the queue a few hundred pages per run
   (Google allows 2,000 inspections a day per site) until it is done.
   It runs on the monthly job and from "Check now" on the widget.

   GET action=gscHealth, domain, key|t
   { pages: [{url, verdict, coverage, indexing, robots, fetch, gcanon, ucanon, crawl, rich: [{type, items, issues: [[message, severity]]}], link}],
     sitemaps: [{path, type, submitted, indexed, errors, warnings, read, pending}], checked, queued, total }
   ========================================================================== */

const GH_TAB_ = 'GSC Health', GH_Q_TAB_ = 'GSC Health Queue', GH_SM_TAB_ = 'GSC Sitemaps';
const GH_HEAD_ = ['Domain', 'Checked', 'URL', 'Verdict', 'Coverage', 'Indexing state', 'Robots', 'Page fetch', 'Google canonical', 'User canonical', 'Last crawl', 'Rich results', 'Inspection link'];
const GH_SM_HEAD_ = ['Domain', 'Checked', 'Sitemap', 'Type', 'Submitted', 'Indexed', 'Errors', 'Warnings', 'Last read', 'Pending'];
const GH_MAX_ = 200;

function ghTab_(name, head) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold'); sh.setFrozenRows(1); }
  return sh;
}
function ghRows_(name, head) {
  const sh = ghTab_(name, head);
  return sh.getLastRow() < 2 ? [] : sh.getRange(2, 1, sh.getLastRow() - 1, head.length).getValues();
}
/* Rewrites a tab without one domain's rows (and optionally with new rows added). */
function ghReplace_(name, head, domain, add) {
  const sh = ghTab_(name, head);
  const keep = ghRows_(name, head).filter(function (r) { return r[0] !== domain; }).concat(add || []);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, head.length).clearContent();
  if (keep.length) sh.getRange(2, 1, keep.length, head.length).setValues(keep);
}
function ghApi_(method, url, body) {
  const r = UrlFetchApp.fetch(url, { method: method, contentType: 'application/json', payload: body ? JSON.stringify(body) : undefined,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  const code = r.getResponseCode(), data = JSON.parse(r.getContentText() || '{}');
  if (code !== 200) { const e = new Error((data.error && data.error.message) || ('HTTP ' + code)); e.code = code; throw e; }
  return data;
}

/* Pages to check: the sitemap's pages, homepage and shallow pages first. */
function ghUrls_(domain) {
  const sm = sitemapFor_(domain);
  const m = /^(https?:\/\/[^\/]+)/i.exec(sm.from || '');
  const base = m ? m[1] : 'https://' + domain;
  const paths = (sm.paths || []).slice().sort(function (a, b) { return (a.split('/').length - b.split('/').length) || a.length - b.length; });
  if (paths.indexOf('/') < 0) paths.unshift('/');
  return paths.slice(0, GH_MAX_).map(function (p) { return base + p; });
}

function startGscHealth_(onlyDomain) {
  const list = clients_().filter(function (c) { return !onlyDomain || c.domain === onlyDomain; });
  const now = new Date(), done = [];
  var queued = 0;
  list.forEach(function (c) {
    var site = '';
    try { site = gscSiteFor_(c.domain); } catch (e) { site = ''; }
    if (!site) return;
    var sms = [];
    try {
      sms = (ghApi_('get', 'https://www.googleapis.com/webmasters/v3/sites/' + encodeURIComponent(site) + '/sitemaps').sitemap || []).map(function (x) {
        const ct = x.contents || [];
        return [c.domain, now, x.path, (x.isSitemapsIndex ? 'Index' : (ct[0] && ct[0].type) || 'Sitemap'), ct.reduce(function (t, y) { return t + (Number(y.submitted) || 0); }, 0),
          ct.reduce(function (t, y) { return t + (Number(y.indexed) || 0); }, 0), Number(x.errors) || 0, Number(x.warnings) || 0, x.lastDownloaded || '', x.isPending ? 'yes' : ''];
      });
    } catch (e) { sms = []; }
    ghReplace_(GH_SM_TAB_, GH_SM_HEAD_, c.domain, sms);
    const urls = ghUrls_(c.domain);
    ghReplace_(GH_Q_TAB_, ['Domain', 'URL', 'Site', 'Queued'], c.domain, urls.map(function (u) { return [c.domain, u, site, now]; }));
    queued += urls.length; done.push(c.domain + ' (' + urls.length + ')');
  });
  if (queued) { ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'continueGscHealth') ScriptApp.deleteTrigger(t); }); ScriptApp.newTrigger('continueGscHealth').timeBased().after(60 * 1000).create(); }
  return queued + ' pages queued for inspection: ' + done.join(', ');
}

/* Inspects queued pages 10 at a time (each check takes Google several seconds) and saves after
   every batch, until the run's time is nearly up; the rest go on in the next run. */
function processGscHealth_() {
  const qsh = ghTab_(GH_Q_TAB_, ['Domain', 'URL', 'Site', 'Queued']);
  var q = qsh.getLastRow() < 2 ? [] : qsh.getRange(2, 1, qsh.getLastRow() - 1, 4).getValues();
  if (!q.length) return 'Nothing queued';
  const started = Date.now(), token = ScriptApp.getOAuthToken();
  var quota = false, done = 0;
  while (q.length && !quota && Date.now() - started < 3.5 * 60 * 1000) {
    const batch = q.slice(0, 10), rows = [], ok = {};
    const res = UrlFetchApp.fetchAll(batch.map(function (r) {
      return { url: 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', method: 'post', contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true,
        payload: JSON.stringify({ inspectionUrl: r[1], siteUrl: r[2], languageCode: 'en-US' }) };
    }));
    res.forEach(function (resp, i) {
      const d = batch[i][0], url = batch[i][1], code = resp.getResponseCode();
      var data = {}; try { data = JSON.parse(resp.getContentText() || '{}'); } catch (e) {}
      if (code === 429 || (code !== 200 && /quota/i.test((data.error && data.error.message) || ''))) { quota = true; return; }
      ok[i] = true;
      if (code !== 200) { rows.push([d, new Date(), url, 'ERROR', 'Could not inspect: ' + String((data.error && data.error.message) || ('HTTP ' + code)).slice(0, 200), '', '', '', '', '', '', '[]', '']); return; }
      const r = data.inspectionResult || {}, ix = r.indexStatusResult || {}, rr = r.richResultsResult || {};
      const rich = (rr.detectedItems || []).map(function (it) {
        const issues = [];
        (it.items || []).forEach(function (x) { (x.issues || []).forEach(function (s) { issues.push([s.issueMessage, s.severity]); }); });
        return { type: it.richResultType, items: (it.items || []).length, issues: issues };
      });
      rows.push([d, new Date(), url, ix.verdict || '', ix.coverageState || '', ix.indexingState || '', ix.robotsTxtState || '', ix.pageFetchState || '',
        ix.googleCanonical || '', ix.userCanonical || '', ix.lastCrawlTime || '', JSON.stringify(rich).slice(0, 40000), r.inspectionResultLink || '']);
    });
    /* Results replace each page's previous row. */
    if (rows.length) {
      const sh = ghTab_(GH_TAB_, GH_HEAD_), fresh = {};
      rows.forEach(function (r) { fresh[r[0] + '|' + r[2]] = r; });
      const keep = ghRows_(GH_TAB_, GH_HEAD_).filter(function (r) { return !fresh[r[0] + '|' + r[2]]; }).concat(rows);
      if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, GH_HEAD_.length).clearContent();
      sh.getRange(2, 1, keep.length, GH_HEAD_.length).setValues(keep);
    }
    /* Drop what was done from the queue. */
    q = batch.filter(function (r, i) { return !ok[i]; }).concat(q.slice(10));
    done += Object.keys(ok).length;
    if (qsh.getLastRow() > 1) qsh.getRange(2, 1, qsh.getLastRow() - 1, 4).clearContent();
    if (q.length) qsh.getRange(2, 1, q.length, 4).setValues(q);
    SpreadsheetApp.flush();
  }
  if (q.length) ScriptApp.newTrigger('continueGscHealth').timeBased().after((quota ? 60 : 1) * 60 * 1000).create();
  return done + ' pages inspected' + (q.length ? ', ' + q.length + ' left' + (quota ? ' (daily limit reached, continuing in an hour)' : ', continuing in a minute') : ', all done');
}
function continueGscHealth() { guarded_('continueGscHealth', 'GSC health (continued)', processGscHealth_); }

function gscHealthFor_(domain) {
  const pages = ghRows_(GH_TAB_, GH_HEAD_).filter(function (r) { return r[0] === domain; }).map(function (r) {
    var rich = []; try { rich = JSON.parse(r[11] || '[]'); } catch (e) {}
    return { url: r[2], verdict: r[3], coverage: r[4], indexing: r[5], robots: r[6], fetch: r[7], gcanon: r[8], ucanon: r[9], crawl: String(r[10] || ''), rich: rich, link: r[12],
      at: r[1] instanceof Date ? r[1].toISOString() : String(r[1]) };
  });
  const sitemaps = ghRows_(GH_SM_TAB_, GH_SM_HEAD_).filter(function (r) { return r[0] === domain; }).map(function (r) {
    return { path: r[2], type: r[3], submitted: Number(r[4]) || 0, indexed: Number(r[5]) || 0, errors: Number(r[6]) || 0, warnings: Number(r[7]) || 0, read: String(r[8] || ''), pending: r[9] === 'yes' };
  });
  const queued = ghRows_(GH_Q_TAB_, ['Domain', 'URL', 'Site', 'Queued']).filter(function (r) { return r[0] === domain; }).length;
  const checked = pages.reduce(function (m, p) { return p.at > m ? p.at : m; }, '');
  return { domain: domain, pages: pages, sitemaps: sitemaps, queued: queued, checked: checked, total: pages.length + queued };
}
