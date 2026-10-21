/* ==========================================================================
   EASYLEADS FORM SUBMISSIONS (the "Easyleads form submissions" widget)

   Easyleads forms are GoHighLevel forms, often embedded on a Concrete or
   WordPress site in a frame the site script can't see. Their submissions are
   read straight from GoHighLevel's API with a Private Integration Token for
   the client's sub-account, so old, new and future submissions all land on
   the "Form Submissions" tab with origin 'easyleads'.

   Connect a client: AI Tracker menu > Connect Easyleads for a client
     (domain on the Clients tab, the sub-account's Location ID, and a Private
      Integration Token with "View Forms" and "View Custom Fields" scopes).
   The first pull brings in every past submission; syncEasyleads then runs
   every hour and adds anything new. Each client's token is kept in Script
   Properties (EL_<domain>), never on a sheet.
   ========================================================================== */

const EL_API_ = 'https://services.leadconnectorhq.com';
const EL_VERSION_ = '2021-07-28';
const EL_SINCE_ = '2016-01-01';

function elConf_(domain) {
  const v = PropertiesService.getScriptProperties().getProperty('EL_' + domain);
  if (!v) return null;
  try { const o = JSON.parse(v); return o && o.loc && o.tok ? o : null; } catch (e) { return null; }
}
function elConnected_(domain) { return !!elConf_(domain); }
function elDomains_() {
  const p = PropertiesService.getScriptProperties().getProperties();
  return Object.keys(p).filter(function (k) { return /^EL_[a-z0-9.-]+\.[a-z]{2,}$/i.test(k); })
    .map(function (k) { return k.slice(3); }).filter(elConnected_);
}

/* One GoHighLevel API call, with a short wait and retry when it says slow down. */
function elGet_(c, path, q) {
  const qs = Object.keys(q || {}).map(function (k) { return k + '=' + encodeURIComponent(q[k]); }).join('&');
  for (var attempt = 0; attempt < 4; attempt++) {
    const res = UrlFetchApp.fetch(EL_API_ + path + (qs ? '?' + qs : ''), {
      headers: { Authorization: 'Bearer ' + c.tok, Version: EL_VERSION_, Accept: 'application/json' }, muteHttpExceptions: true
    });
    const code = res.getResponseCode();
    var data = {};
    try { data = JSON.parse(res.getContentText() || '{}'); } catch (e) {}
    if (code === 429 || code >= 500) { Utilities.sleep(1500 * (attempt + 1)); continue; }
    if (code === 401 || code === 403) throw new Error('GoHighLevel refused the token (' + code + '). Check it is for this sub-account and has the View Forms scope.');
    if (code !== 200) throw new Error('GoHighLevel ' + code + ': ' + (data.message || data.error || 'no details'));
    return data;
  }
  throw new Error('GoHighLevel kept asking to slow down; try again in a few minutes.');
}

/* Form names by id, and custom field labels by id and key (best effort: only used for nicer labels). */
function elFormNames_(c) {
  const out = {};
  try {
    for (var skip = 0; skip < 2000; skip += 50) {
      const d = elGet_(c, '/forms/', { locationId: c.loc, limit: 50, skip: skip });
      (d.forms || []).forEach(function (f) { out[f.id] = f.name; });
      if ((d.forms || []).length < 50) break;
    }
  } catch (e) {}
  return out;
}
function elFieldLabels_(c) {
  const out = {};
  try {
    const d = elGet_(c, '/locations/' + encodeURIComponent(c.loc) + '/customFields', {});
    (d.customFields || []).forEach(function (f) {
      if (f.id) out[f.id] = f.name;
      if (f.fieldKey) out[String(f.fieldKey).replace(/^contact\./, '')] = f.name;
    });
  } catch (e) {}
  return out;
}
function elLabel_(k) {
  const s = String(k).replace(/^contact\./, '').replace(/[_-]+/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : k;
}
function elPath_(u) {
  const m = /^https?:\/\/[^\/?#]+([^?#]*)/i.exec(String(u || ''));
  return m ? (m[1] || '/') : '';
}
function elParams_(u) {
  const out = {}, m = /\?([^#]*)/.exec(String(u || ''));
  if (m) m[1].split('&').forEach(function (p) { const i = p.indexOf('='); if (i > 0) { try { out[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1).replace(/\+/g, ' ')); } catch (e) {} } });
  return out;
}
/* GoHighLevel's own source labels, when the submission carries no UTM tags, ad click or referrer. */
const EL_CHANNELS_ = [
  [/paid\s*search|adwords|google\s*ads|ppc|cpc/i, 'Paid Search'], [/paid\s*social|facebook\s*ads|meta\s*ads|instagram\s*ads/i, 'Paid Social'],
  [/organic\s*search|seo|^google$|^bing$/i, 'Organic Search'], [/social/i, 'Organic Social'], [/e-?mail/i, 'Email'],
  [/referr/i, 'Referral'], [/direct/i, 'Direct']
];

/* One submission as a Form Submissions row. */
function elRow_(domain, s, forms, labels) {
  const o = s.others || {}, ev = (o.eventData && typeof o.eventData === 'object') ? o.eventData : {};
  const f = {};
  if (s.name) f['Name'] = s.name;
  if (s.email) f['Email'] = s.email;
  Object.keys(o).forEach(function (k) {
    if (/^(eventData|fieldsOriSequance|formId|location_?id|signatureHash|ip|timezone|sessionId|submissionId|sessionFingerprint|disqualified|spam)$/i.test(k) || /^__.*__$/.test(k)) return;
    var v = o[k];
    if (v == null || v === '') return;
    if (Array.isArray(v)) v = v.map(function (x) { return x && typeof x === 'object' ? (x.meta && x.meta.originalname) || x.name || x.url || '' : x; }).filter(String).join(', ');
    else if (typeof v === 'object') v = Object.keys(v).map(function (x) { const y = v[x]; return y && typeof y === 'object' ? (y.meta && y.meta.originalname) || y.name || y.url || '' : y; }).filter(String).join(', ');
    const label = labels[k] || elLabel_(k);
    if (/^(name|full name)$/i.test(label) && f['Name']) return;
    if (/^e-?mail$/i.test(label) && f['Email']) return;
    f[label] = String(v);
  });
  const pageUrl = ev.parentUrl || (ev.page && ev.page.url) || ev.url || ev.pageUrl || '';
  const up = Object.assign({}, elParams_(pageUrl), ev.url_params && typeof ev.url_params === 'object' ? ev.url_params : {});
  const src = {
    us: up.utm_source || '', um: up.utm_medium || '', uc: up.utm_campaign || '',
    gclid: up.gclid ? 1 : 0, msclkid: up.msclkid ? 1 : 0, fbclid: up.fbclid ? 1 : 0,
    ref: /^https?:/i.test(ev.referrer || '') && fsHost_(ev.referrer) !== fsHost_(pageUrl) ? String(ev.referrer).split('?')[0] : '',
    land: elPath_(pageUrl)
  };
  if (!src.us && !src.ref && !src.gclid && !src.fbclid && !src.msclkid) {
    const lab = String(ev.source || ev.medium || '');
    for (var i = 0; i < EL_CHANNELS_.length; i++) if (EL_CHANNELS_[i][0].test(lab)) { src.ch = EL_CHANNELS_[i][1]; break; }
  }
  const page = elPath_(pageUrl) || (ev.page && ev.page.title) || '';
  return fsRow_(domain, new Date(s.createdAt), String(forms[s.formId] || 'Easyleads form').slice(0, 120), String(page).slice(0, 300),
    fsClean_(f), src, 'easyleads', 'ghl:' + s.id);
}

/* Pulls a client's submissions (all of them the first time, the last few days after that) and adds new ones. */
function elSync_(domain, full) {
  const c = elConf_(domain);
  if (!c) return domain + ': not connected';
  const props = PropertiesService.getScriptProperties(), lk = 'ELS_' + domain, tz = Session.getScriptTimeZone();
  const last = Number(props.getProperty(lk) || 0);
  const fmt = function (d) { return Utilities.formatDate(d, tz, 'yyyy-MM-dd'); };
  const end = new Date(Date.now() + 864e5);
  var start = full || !last ? new Date(EL_SINCE_ + 'T12:00:00Z') : new Date(last - 3 * 864e5);
  const forms = elFormNames_(c), labels = elFieldLabels_(c), subs = [];
  /* A year at a time, so very old accounts don't hit a date-range limit. */
  while (start < end) {
    const stop = new Date(Math.min(end.getTime(), start.getTime() + 365 * 864e5));
    for (var page = 1; page <= 500; page++) {
      const d = elGet_(c, '/forms/submissions', { locationId: c.loc, page: page, limit: 100, startAt: fmt(start), endAt: fmt(stop) });
      const s = d.submissions || [];
      Array.prototype.push.apply(subs, s);
      if (s.length < 100 || !(d.meta && d.meta.nextPage)) break;
    }
    start = new Date(stop.getTime() + 864e5);
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  var added = 0;
  try {
    const have = {};
    fsValues_().forEach(function (r) { have[r[16]] = 1; });
    const add = [];
    subs.forEach(function (s) {
      if (!s || !s.id || !s.createdAt) return;
      const row = elRow_(domain, s, forms, labels);
      if (have[row[16]] || isNaN(row[1])) return;
      have[row[16]] = 1;
      add.push(row);
    });
    if (add.length) {
      const sh = fsSheet_();
      sh.getRange(sh.getLastRow() + 1, 1, add.length, FS_HEAD_.length).setValues(add);
    }
    added = add.length;
  } finally { lock.releaseLock(); }
  props.setProperty(lk, String(Date.now()));
  return domain + ': ' + subs.length + ' found, ' + added + ' new';
}

/* Hourly: every connected client. */
function syncEasyleads() {
  const done = [], failed = [];
  elDomains_().forEach(function (d) {
    if (Date.now() - START_MS > MAX_RUN_MS) return;
    try { done.push(elSync_(d, false)); } catch (e) { failed.push(d + ': ' + e.message); }
  });
  if (failed.length) log_('Easyleads sync', 'ERROR', failed.join('; '));
  return done.join('; ') || 'No Easyleads clients connected';
}
function elEnsureTrigger_() {
  if (!ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'syncEasyleads'; }))
    ScriptApp.newTrigger('syncEasyleads').timeBased().everyHours(1).create();
}

/* Menu: AI Tracker > Connect Easyleads for a client. The token is typed by the person, straight into Script Properties. */
function connectEasyleads() {
  const ui = SpreadsheetApp.getUi();
  const a = ui.prompt('Connect Easyleads (1 of 3)', 'Client website, as on the Clients tab (for example windowmasters.ca):', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  const domain = normDomain_(a.getResponseText());
  if (!clients_().some(function (c) { return c.domain === domain; })) { ui.alert(domain + ' is not on the Clients tab yet. Add it there first.'); return; }
  const b = ui.prompt('Connect Easyleads (2 of 3)', 'GoHighLevel Location ID for this sub-account\n(Settings > Business Profile > Location ID):', ui.ButtonSet.OK_CANCEL);
  if (b.getSelectedButton() !== ui.Button.OK) return;
  const t = ui.prompt('Connect Easyleads (3 of 3)', 'Private Integration Token for this sub-account\n(Settings > Private Integrations > Create new; scopes: View Forms, View Custom Fields):', ui.ButtonSet.OK_CANCEL);
  if (t.getSelectedButton() !== ui.Button.OK) return;
  const loc = b.getResponseText().trim(), tok = t.getResponseText().trim();
  if (!loc || !tok) { ui.alert('Both the Location ID and the token are needed.'); return; }
  PropertiesService.getScriptProperties().setProperty('EL_' + domain, JSON.stringify({ loc: loc, tok: tok }));
  elEnsureTrigger_();
  try {
    const r = elSync_(domain, true);
    log_('Easyleads connect', 'OK', r);
    ui.alert('Connected. ' + r + '. New submissions are added every hour.');
  } catch (e) {
    log_('Easyleads connect', 'ERROR', domain + ': ' + e.message);
    ui.alert('Saved, but the first pull failed: ' + e.message);
  }
}
/* Menu: pull every connected client again now (adds anything missing, never duplicates). */
function resyncEasyleads() {
  const out = elDomains_().map(function (d) { try { return elSync_(d, true); } catch (e) { return d + ': ' + e.message; } });
  log_('Easyleads resync', 'OK', out.join('; ') || 'No Easyleads clients connected');
  SpreadsheetApp.getActiveSpreadsheet().toast(out.join('\n') || 'No Easyleads clients connected', 'Easyleads', 10);
}
