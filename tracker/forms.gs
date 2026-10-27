/* ==========================================================================
   FORM SUBMISSIONS (the "Form submissions" report widget)

   Website forms reach the tracker three ways:
   1. Live: a small script in each Concrete site's tracking codes posts every
      successful submission here (action 'form'). No key is needed, so each
      post is checked: the site must be a client, a few per hour at most,
      and sizes are capped.
   2. Old submissions: exported once from the site's dashboard (edge-forms-import
      files) and posted from the SEO tool's Form submissions widget, "Import past
      submissions", with the team key (or a short-lived import key) (action 'formsImport').

   3. Easyleads (GoHighLevel) forms: read from GoHighLevel's API (easyleads.gs),
      origin 'easyleads'.

   Everything lands on the "Form Submissions" tab, one row per submission.

   GET action=forms, domain, key|t, start, end[, src=site|easyleads|all][, cs]
   { rows: [{t, form, page, channel, sm, campaign, land, origin,
             (team key only:) name, email, phone, company, message, fields, ref, id}],
     first }   first = the oldest submission on file for the client
   Names, emails, phones and messages are only returned with the team key, or to a
   client report link whose Form inbox was set to show them (cs: that link's secret,
   see formsShare_); never to a plain client report token. facets: the answers that
   say nothing about who sent the form (province, city, service…), for everyone.
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
    message: fsPick_(f, /message|comment|question|description|details|notes|additional|inquiry|enquiry|how can we help|tell us|scope of work/i)
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
    (b.rows || []).slice(0, 1000).forEach(function (x) {
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

/* A test send: the team's own address anywhere in it, an address at the client's own domain
   (except job applications), or a short "test" message. Returned as test: true; the report
   widgets leave these out unless a widget is set to show them. */
const FS_JOB_ = /career|\bjobs?\b|employment|resum[eé]|r[ée]sum[ée]|apply now|job application/i;
function fsIsTest_(domain, form, name, email, message, f) {
  f = f || {};
  const vals = [name, email, message].concat(Object.keys(f).map(function (k) { return f[k]; })).map(function (v) { return String(v == null ? '' : v); });
  if (vals.some(function (v) { return /@edgemarketing\.ca\b/i.test(v); })) return true;
  const em = String(email || '').toLowerCase().split('@')[1] || '', d = String(domain || '').toLowerCase().replace(/^www\./, '');
  if (em && d && (em === d || em.slice(-d.length - 1) === '.' + d) && !FS_JOB_.test(String(form || ''))) return true;
  const msg = String(message || fsPick_(f, /message|comment|question|description|details|notes|additional/i) || '').trim(), nm = String(name || '').trim();
  if (msg && msg.length <= 60 && /^(this is (just )?a |just a )?(test|testing)\b|^check\b/i.test(msg)) return true;
  return /\btest\b/i.test(nm) && msg.length <= 80;
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
    var fields = {};
    try { fields = JSON.parse(r[9] || '{}') || {}; } catch (err) { fields = {}; }
    const o = { t: Utilities.formatDate(d, tz, "yyyy-MM-dd'T'HH:mm"), form: r[2], page: r[3], channel: r[10], sm: r[11], campaign: r[12], land: r[13], origin: r[15], facets: fsFacets_(fields), test: fsIsTest_(domain, r[2], r[4], r[5], r[8], fields) };
    if (admin) {
      o.name = r[4]; o.email = r[5]; o.phone = r[6]; o.company = r[7]; o.message = r[8]; o.ref = r[14]; o.id = r[16];
      o.fields = fields;
    }
    out.rows.push(o);
  });
  out.rows.sort(function (a, b) { return a.t < b.t ? 1 : a.t > b.t ? -1 : 0; });
  return out;
}

/* Answers that say nothing about who sent a form (province, city, service, product…).
   Client reports get these with every submission, so they can filter and search by them. */
const FS_FACET_ = /province|provincia|state|region|city|town|ciudad|country|location|office|branch|service|product|interest|industry|department|hear about|how did you hear|budget|timeline|category|topic|reason/i;
const FS_PRIVATE_ = /name|e-?mail|correo|phone|tel[eé]fono|mobile|cell|company|empresa|address|direcci|postal|zip|message|comment|question|details/i;
function fsFacets_(f) {
  const o = {};
  Object.keys(f || {}).forEach(function (k) {
    if (!FS_FACET_.test(k) || FS_PRIVATE_.test(k)) return;
    const v = String(f[k] == null ? '' : f[k]).trim();
    if (v && v.length <= 80) o[String(k).slice(0, 80)] = v;
  });
  return o;
}

/* FORM INBOX OPT-IN: a client report link that may see who sent each form.
   The team ticks "Show names and contact details" on that report's Form inbox; the
   SEO tool makes a random secret for the link and registers it here (POST formsShare,
   team key). The link then asks for forms with cs=<secret>. Only a SHA-256 of each
   secret is kept, per client, in the FORMS_SHARE script property. Unticking removes it. */
function fsHash_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s)).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
function fsShares_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('FORMS_SHARE') || '{}') || {}; } catch (e) { return {}; }
}
/* POST {action:'formsShare', key, domain, secret (32 hex), on} */
function formsShare_(domain, secret, on) {
  if (!domain || !/^[a-f0-9]{32}$/.test(String(secret || ''))) return { error: 'bad request' };
  if (!clients_().some(function (c) { return c.domain === domain; })) return { error: 'unknown site' };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const all = fsShares_(), h = fsHash_(secret);
    const list = (all[domain] || []).filter(function (x) { return x !== h; });
    if (on) list.push(h);
    if (list.length) all[domain] = list.slice(-50); else delete all[domain];
    PropertiesService.getScriptProperties().setProperty('FORMS_SHARE', JSON.stringify(all));
    log_('Form inbox sharing', 'OK', domain + ': contact details ' + (on ? 'on' : 'off') + ' for one report link (' + list.length + ' link(s) on)');
    return { ok: true, on: !!on };
  } finally { lock.releaseLock(); }
}
function formsShareOk_(domain, secret) {
  if (!/^[a-f0-9]{32}$/.test(String(secret || ''))) return false;
  return (fsShares_()[domain] || []).indexOf(fsHash_(secret)) > -1;
}

/* NOTIFICATION BELL (SEO tool, top right)
   GET action=formsRecent, key (team key only)
   Add this line to doGet in Code.gs, just above "if (!domain) return json_({ error: 'domain required' });":
     if (p.action === 'formsRecent' && admin) return json_(formsRecent_());
   The newest website and Easyleads submissions across every client, newest
   first, for the last two weeks (at most 100). Imported past submissions are
   left out. Cached for a minute, so several people with the tool open cost
   one sheet read a minute between them. */
function formsRecent_() {
  const cache = CacheService.getScriptCache(), ck = 'fsRecent';
  const hit = cache.get(ck);
  if (hit) { try { return { rows: JSON.parse(hit) }; } catch (e) {} }
  const names = {};
  clients_().forEach(function (c) { names[c.domain] = c.name; });
  const cutoff = Date.now() - 14 * 24 * 3600 * 1000;
  var rows = [];
  fsValues_().forEach(function (r) {
    if (r[15] === 'import') return;
    const d = r[1] instanceof Date ? r[1] : new Date(r[1]);
    if (isNaN(d) || d.getTime() < cutoff) return;
    var f = {};
    try { f = JSON.parse(r[9] || '{}') || {}; } catch (e) { f = {}; }
    rows.push({
      id: String(r[16] || (r[0] + ':' + d.getTime())),
      domain: r[0],
      client: names[r[0]] || r[0],
      ms: d.getTime(),
      form: String(r[2] || ''),
      name: String(r[4] || ''),
      origin: String(r[15] || ''),
      test: fsIsTest_(r[0], r[2], r[4], r[5], r[8], f)
    });
  });
  rows.sort(function (a, b) { return b.ms - a.ms; });
  rows = rows.slice(0, 100);
  try { cache.put(ck, JSON.stringify(rows), 60); } catch (e) {}
  return { rows: rows };
}
