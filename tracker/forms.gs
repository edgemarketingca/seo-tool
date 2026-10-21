/* ==========================================================================
   FORM SUBMISSIONS (the "Form submissions" report widget)

   Website forms reach the tracker three ways:
   1. Live: a small script in each Concrete site's tracking codes posts every
      successful submission here (action 'form'). No key is needed, so each
      post is checked: the site must be a client, a few per hour at most,
      and sizes are capped.
   2. Old submissions: exported once from the site's dashboard and posted
      with a short-lived import key (action 'formsImport').

   3. Easyleads (GoHighLevel) forms: read from GoHighLevel's API (easyleads.gs),
      origin 'easyleads'.

   Everything lands on the "Form Submissions" tab, one row per submission.

   GET action=forms, domain, key|t, start, end[, src=site|easyleads|all]
   { rows: [{t, form, page, channel, sm, campaign, land, origin,
             (team key only:) name, email, phone, company, message, fields, ref, id}],
     first }   first = the oldest submission on file for the client
   Names, emails, phones and messages are only returned with the team key,
   never to a client report token.
   ========================================================================== */

const FS_TAB_ = 'Form Submissions';
const FS_HEAD_ = ['Domain', 'Received', 'Form', 'Page', 'Name', 'Email', 'Phone', 'Company', 'Message', 'Fields',
  'Channel', 'Source / medium', 'Campaign', 'Landing page', 'Referrer', 'Origin', 'Key'];
const FS_PER_HOUR_ = 30;

function fsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(FS_TAB_);
  if (!sh) {
    sh = ss.insertSheet(FS_TAB_);
    sh.getRange(1, 1, 1, FS_HEAD_.length).setValues([FS_HEAD_]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
function fsValues_() {
  const sh = fsSheet_();
  return sh.getLastRow() < 2 ? [] : sh.getRange(2, 1, sh.getLastRow() - 1, FS_HEAD_.length).getValues();
}

function fsPick_(f, re) {
  for (var k in f) if (re.test(k) && String(f[k]).trim()) return String(f[k]).trim();
  return '';
}
/* Name, email, phone, company and message, whatever each form calls them. */
function fsNorm_(f) {
  const first = fsPick_(f, /^first\s*name/i), last = fsPick_(f, /^last\s*name/i);
  return {
    name: fsPick_(f, /^(full\s*)?name$|your name|contact name|^name\b/i) || [first, last].filter(String).join(' '),
    email: fsPick_(f, /e-?mail/i),
    phone: fsPick_(f, /phone|^tel|mobile|cell/i),
    company: fsPick_(f, /company|business name|organi[sz]ation/i),
    message: fsPick_(f, /message|comment|question|details|additional|inquiry|enquiry|how can we help|scope of work/i)
  };
}
function fsHost_(u) {
  const m = /^https?:\/\/([^\/?#:]+)/i.exec(String(u || ''));
  return m ? m[1].toLowerCase().replace(/^www\./, '') : '';
}
/* Channel from the visitor's first visit: UTM tags, ad click ids and referrer. */
function fsChannel_(s) {
  const src = String(s.us || '').toLowerCase(), med = String(s.um || '').toLowerCase(), ref = fsHost_(s.ref);
  const both = src + ' ' + ref;
  if (s.gclid || s.msclkid || /^(cpc|ppc|paid|paidsearch|paid_search|sem)$/.test(med)) return 'Paid Search';
  if (/paid.?social|^(paid_?social|social_?paid)$/.test(med) || (s.fbclid && /cpc|paid/.test(med))) return 'Paid Social';
  if (/^e-?mail$/.test(med) || /newsletter|mailchimp/.test(src)) return 'Email';
  if (/chatgpt|openai|perplexity|gemini\.google|copilot|claude\.ai|bard\./.test(both)) return 'AI assistants';
  if (/social/.test(med) || s.fbclid || /facebook|instagram|linkedin|twitter|^x\.com|^t\.co$|tiktok|youtube|pinterest|reddit/.test(both)) return 'Organic Social';
  if (med === 'organic' || /(^|\.)(google|bing|yahoo|duckduckgo|ecosia|baidu|yandex)\./.test(ref)) return 'Organic Search';
  if (src) return med === 'referral' ? 'Referral' : 'Other campaign';
  if (ref) return 'Referral';
  return 'Direct';
}
/* Sheets reads text that starts with = + - or @ as a formula: a phone like "+1 403…" became #ERROR!.
   A leading apostrophe keeps it as text (the apostrophe itself isn't stored). Phones are always kept as text,
   so dashes, spaces and leading zeros survive. */
function fsText_(v) {
  v = String(v == null ? '' : v);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}
function fsRow_(domain, when, form, page, f, s, origin, id) {
  const n = fsNorm_(f), known = !!(s.us || s.ref || s.gclid || s.land), later = origin === 'import' || origin === 'easyleads';
  /* s.ch: a channel the source system already worked out (GoHighLevel's own source label). */
  const channel = s.ch && !s.us && !s.ref && !s.gclid ? s.ch : later && !known ? 'Not tracked yet' : fsChannel_(s);
  const sm = s.us ? s.us + ' / ' + (s.um || '(none)') : s.gclid ? 'google / cpc' : s.ref ? fsHost_(s.ref) + ' / referral' : s.ch ? s.ch : later && !known ? '' : '(direct) / (none)';
  return [domain, when, fsText_(form), fsText_(page), fsText_(n.name), fsText_(n.email), n.phone ? "'" + n.phone : '', fsText_(n.company), fsText_(n.message), JSON.stringify(f).slice(0, 45000),
    channel, fsText_(sm), fsText_(String(s.uc || '').slice(0, 200)), fsText_(String(s.land || '').slice(0, 300)), fsText_(String(s.ref || '').slice(0, 300)), origin,
    origin + ':' + domain + ':' + String(id || Utilities.getUuid()).slice(0, 80)];
}
function fsClean_(fields) {
  const f = {};
  Object.keys(fields || {}).slice(0, 60).forEach(function (k) {
    const v = fields[k] == null ? '' : String(fields[k]).slice(0, 4000);
    if (v.trim() && !/recaptcha|ccm_token|^_|password/i.test(k)) f[String(k).slice(0, 120)] = v;
  });
  return f;
}

/* POST {action:'form', domain, form, page, fields:{label: value}, src:{us, um, uc, gclid, fbclid, msclkid, ref, land}, id, hp} */
function formIntake_(b) {
  const domain = normDomain_(b.domain);
  if (!domain || !clients_().some(function (c) { return c.domain === domain; })) return { error: 'unknown site' };
  if (b.hp) return { ok: true };   /* honeypot field filled in: a bot */
  const cache = CacheService.getScriptCache(), rk = 'fsr:' + domain, n = Number(cache.get(rk) || 0);
  if (n >= FS_PER_HOUR_) return { error: 'busy' };
  cache.put(rk, String(n + 1), 3600);
  const f = fsClean_(b.fields);
  if (!Object.keys(f).length) return { error: 'empty' };
  const row = fsRow_(domain, new Date(), String(b.form || 'Website form').slice(0, 120), String(b.page || '').slice(0, 300), f, b.src || {}, 'live', b.id);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (!fsValues_().some(function (r) { return r[16] === row[16]; })) fsSheet_().appendRow(row);
  } finally { lock.releaseLock(); }
  return { ok: true };
}

/* An import key is the FORM_IMPORT script property: 'key|expiry in ms'. Set it for an hour, import, then it lapses. */
function fsImportOk_(k) {
  const v = String(PropertiesService.getScriptProperties().getProperty('FORM_IMPORT') || '').split('|');
  return !!k && v[0] === k && Date.now() < Number(v[1] || 0);
}
/* POST {action:'formsImport', importKey, domain, rows:[{id, form, date (ISO), page, fields}]} */
function formsImport_(b) {
  const domain = normDomain_(b.domain);
  if (!clients_().some(function (c) { return c.domain === domain; })) return { error: 'unknown site' };
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const have = {}, live = [];
    fsValues_().forEach(function (r) {
      have[r[16]] = 1;
      if (r[0] === domain && r[15] === 'live') live.push([String(r[5]).toLowerCase(), new Date(r[1]).getTime()]);
    });
    const add = [];
    var skipped = 0;
    (b.rows || []).forEach(function (x) {
      const when = new Date(x.date);
      const f = fsClean_(x.fields);
      if (isNaN(when) || !Object.keys(f).length) { skipped++; return; }
      const row = fsRow_(domain, when, String(x.form || 'Website form').slice(0, 120), String(x.page || '').slice(0, 300), f, x.src || {}, 'import', String(x.form) + ':' + x.id);
      /* Already captured live (same email within 15 minutes): keep the live row, it has the source. */
      const dup = row[5] && live.some(function (l) { return l[0] === String(row[5]).toLowerCase() && Math.abs(l[1] - when.getTime()) < 15 * 60 * 1000; });
      if (have[row[16]] || dup) { skipped++; return; }
      have[row[16]] = 1;
      add.push(row);
    });
    if (add.length) {
      const sh = fsSheet_();
      sh.getRange(sh.getLastRow() + 1, 1, add.length, FS_HEAD_.length).setValues(add);
    }
    log_('Form import', 'OK', domain + ': ' + add.length + ' added, ' + skipped + ' already there or empty');
    return { ok: true, added: add.length, skipped: skipped };
  } finally { lock.releaseLock(); }
}

/* src: 'site' (default: the website's own forms), 'easyleads' (GoHighLevel), or 'all'. */
function formsFor_(domain, start, end, admin, src) {
  src = src === 'easyleads' || src === 'all' ? src : 'site';
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const s = iso.test(start || '') ? start : '2000-01-01', e = iso.test(end || '') ? end : '2999-12-31';
  const tz = Session.getScriptTimeZone();
  const out = { domain: domain, range: { start: s, end: e }, details: !!admin, rows: [], first: '', src: src };
  if (src === 'easyleads') out.connected = typeof elConnected_ === 'function' && elConnected_(domain);
  fsValues_().forEach(function (r) {
    if (r[0] !== domain) return;
    if (src === 'site' && r[15] === 'easyleads') return;
    if (src === 'easyleads' && r[15] !== 'easyleads') return;
    const d = r[1] instanceof Date ? r[1] : new Date(r[1]);
    if (isNaN(d)) return;
    const day = Utilities.formatDate(d, tz, 'yyyy-MM-dd');
    if (!out.first || day < out.first) out.first = day;
    if (day < s || day > e) return;
    const o = { t: Utilities.formatDate(d, tz, "yyyy-MM-dd'T'HH:mm"), form: r[2], page: r[3], channel: r[10], sm: r[11], campaign: r[12], land: r[13], origin: r[15] };
    if (admin) {
      o.name = r[4]; o.email = r[5]; o.phone = r[6]; o.company = r[7]; o.message = r[8]; o.ref = r[14]; o.id = r[16];
      try { o.fields = JSON.parse(r[9] || '{}'); } catch (err) { o.fields = {}; }
    }
    out.rows.push(o);
  });
  out.rows.sort(function (a, b) { return a.t < b.t ? 1 : a.t > b.t ? -1 : 0; });
  return out;
}
