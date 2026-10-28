/* ==========================================================================
PHONE CALLS IN THE BELL (SEO tool, top right)

Every client with a GA4 property on the Clients tab is checked for
click-to-call events: any GA4 event whose name contains "call", "phone" or
"tel" (click_to_call, phone_click, tel_link_click and the like). Each one is
listed in the bell with a phone icon, next to the form submissions, and
counts as a lead for "Slow this week".

Website or ads: a call is marked as an ads call when the visit that led to it
came from paid traffic (medium cpc / ppc / paid…), otherwise as a website call.
Calls placed straight from a Google Ads call button never reach the website,
so GA4 can't see them and they aren't listed.

GA4 reports events a few minutes to a few hours late, so a call shows up in
the bell later than a form does, and its time is the minute GA4 recorded.

Setup (one time, in the tracker's Apps Script project):
1. Add this file (+ → Script, name it calls). It uses the "Google Analytics
   Data API" advanced service the tracker already has.
2. Use the updated formsRecent_() in forms.gs (it merges these rows in and
   sends the bell the list of clients it can hear from).
3. Run setupCallsInBell once from the editor. It reads every client and sets up a
   15-minute trigger that keeps the list fresh from then on.

Rows are kept on the "Phone Calls" tab (last 14 days); the clients whose
GA4 has had a call event in the last 90 days are kept in the CALLS_TRACKED
script property.
========================================================================== */

const CALL_TAB_ = 'Phone Calls';
const CALL_HEAD_ = ['Id', 'Domain', 'Client', 'Time', 'Event', 'Source / medium', 'Page', 'Ads'];
const CALL_EVENT_RE_ = '.*(call|phone|tel_|tel:|_tel|click_to_tel|clicktotel).*';
const CALL_DAYS_ = 14;

function callsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CALL_TAB_);
  if (!sh) {
    sh = ss.insertSheet(CALL_TAB_);
    sh.getRange(1, 1, 1, CALL_HEAD_.length).setValues([CALL_HEAD_]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function callIsAds_(source, medium) {
  return /^(cpc|ppc|paid|paidsearch|paid_search|paid-search|sem|display|paid_social|paidsocial|cpm)$/i.test(String(medium || '')) ||
    /google ads|adwords/i.test(String(source || ''));
}

/* One client's call events: date+minute × event × source × medium × page, last 90 days.
   Returns {rows: [...], any: true if there was any call event at all}. */
function callsFetch_(c) {
  const res = AnalyticsData.Properties.runReport({
    dateRanges: [{ startDate: '90daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'dateHourMinute' }, { name: 'eventName' }, { name: 'sessionSource' }, { name: 'sessionMedium' }, { name: 'pagePath' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: { filter: { fieldName: 'eventName',
      stringFilter: { matchType: 'FULL_REGEXP', value: CALL_EVENT_RE_, caseSensitive: false } } },
    orderBys: [{ dimension: { dimensionName: 'dateHourMinute' }, desc: true }],
    limit: 1000
  }, 'properties/' + String(c.ga4).replace(/\D/g, ''));
  const tz = (res.metadata && res.metadata.timeZone) || Session.getScriptTimeZone();
  const cutoff = Date.now() - CALL_DAYS_ * 24 * 3600 * 1000;
  const out = [];
  (res.rows || []).forEach(function (r) {
    const d = r.dimensionValues.map(function (v) { return v.value; });
    const n = Math.min(20, Math.round(Number(r.metricValues[0].value) || 0));
    if (!n) return;
    var when;
    try { when = Utilities.parseDate(d[0], tz, 'yyyyMMddHHmm'); } catch (e) { return; }
    if (!when || isNaN(when.getTime()) || when.getTime() < cutoff) return;
    const src = d[2] || '(direct)', med = d[3] || '(none)';
    for (var i = 0; i < n; i++) {
      out.push(['call:' + c.domain + ':' + d[0] + ':' + d[1] + ':' + src + '/' + med + ':' + d[4] + ':' + i,
        c.domain, c.name, when.getTime(), d[1], src + ' / ' + med, d[4] || '', callIsAds_(src, med) ? 'yes' : '']);
    }
  });
  return { rows: out, any: (res.rows || []).length > 0 };
}

/* Run every 15 minutes through syncPhoneCalls (set up the first time it runs). */
function callsSync_() {
  const rows = [], tracked = [];
  var failed = 0;
  clients_().forEach(function (c) {
    if (!c.ga4) return;
    try {
      const r = callsFetch_(c);
      if (r.any) tracked.push(c.domain);
      r.rows.forEach(function (x) { rows.push(x); });
    } catch (e) { failed++; console.warn('Calls ' + c.domain + ': ' + e.message); }
  });
  rows.sort(function (a, b) { return b[3] - a[3]; });
  const keep = rows.slice(0, 300);
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const sh = callsSheet_();
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, CALL_HEAD_.length).clearContent();
    if (keep.length) sh.getRange(2, 1, keep.length, CALL_HEAD_.length).setValues(keep);
    PropertiesService.getScriptProperties().setProperty('CALLS_TRACKED', JSON.stringify(tracked));
  } finally { lock.releaseLock(); }
  CacheService.getScriptCache().remove('fsRecent');
  callsEnsureTrigger_();
  return keep.length + ' call(s) in the last ' + CALL_DAYS_ + ' days from ' + tracked.length + ' client(s) with call tracking' +
    (failed ? '; ' + failed + ' GA4 propert' + (failed === 1 ? 'y' : 'ies') + ' couldn’t be read' : '') + '.';
}

function callsEnsureTrigger_() {
  const has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'syncPhoneCalls'; });
  if (!has) ScriptApp.newTrigger('syncPhoneCalls').timeBased().everyMinutes(15).create();
}

/* What formsRecent_ adds to the bell: the stored call rows, shaped like form
   rows (origin 'call'), and the domains whose GA4 has call events. */
function callsRecent_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CALL_TAB_);
  const rows = [];
  if (sh && sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, CALL_HEAD_.length).getValues().forEach(function (r) {
      if (!r[0]) return;
      rows.push({ id: String(r[0]), domain: r[1], client: r[2], ms: Number(r[3]), form: 'Phone call', name: '',
        origin: 'call', event: String(r[4] || ''), src: String(r[5] || ''), page: String(r[6] || ''), ads: r[7] === 'yes', test: false });
    });
  }
  var tracked = [];
  try { tracked = JSON.parse(PropertiesService.getScriptProperties().getProperty('CALLS_TRACKED') || '[]') || []; } catch (e) { tracked = []; }
  return { rows: rows, tracked: tracked };
}

/* Run this once by hand (select it in the toolbar and press Run): it fills the
   Phone Calls tab and sets up the 15-minute trigger. */
function setupCallsInBell() {
  Logger.log(callsSync_());
}

/* The 15-minute trigger's handler (trigger handlers can't end in _). */
function syncPhoneCalls() {
  callsSync_();
}
