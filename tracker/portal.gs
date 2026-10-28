/* ==========================================================================
   EASYLEADS CLIENT PORTAL (portal/index.html)

   Client logins that EDGE creates and controls from the SEO tool. A client
   signs in with the email and password EDGE gave them and sees a read-only
   view of their Easyleads (GoHighLevel) sub-account: form submissions,
   calls, new contacts, pipeline and appointments. Nothing here can change
   anything in GoHighLevel: every call below is a GET (or a contacts search),
   made with the client's Private Integration Token, which never leaves this
   script.

   Accounts      Script Properties PU_<id> (JSON), PE_<email> -> id.
                 Passwords: salted, iterated HMAC-SHA256. Never stored or sent back.
   Sessions      <payload>.<HMAC>, signed with PORTAL_SECRET; 14 days; a password
                 reset or disabling the account ends every session at once.
   Dashboards    PL_<id>: each client's own dashboards and widgets (JSON, < 9 KB).
   GHL data      Uses the EL_<domain> connection made for the Easyleads form sync
                 (easyleads.gs). For calls, contacts, pipeline and appointments the
                 Private Integration needs these read-only scopes too:
                 View Conversation Messages, View Contacts, View Opportunities,
                 View Calendars, View Calendar Events.

   Wiring: in doPost, before the admin-key check:
     if (String(body.action || '').indexOf('portal') === 0) return json_(portalRoute_(body));
   ========================================================================== */

const PT_SESSION_DAYS_ = 14;
const PT_HASH_ROUNDS_ = 1200;
const PT_CACHE_SEC_ = 300;

function ptProps_() { return PropertiesService.getScriptProperties(); }
function ptSecret_() {
  const p = ptProps_();
  var s = p.getProperty('PORTAL_SECRET');
  if (!s) { s = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); p.setProperty('PORTAL_SECRET', s); }
  return s;
}
function ptHex_(bytes) { return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join(''); }
function ptHmac_(msg, key) { return ptHex_(Utilities.computeHmacSha256Signature(String(msg), String(key))); }
function ptHash_(pw, salt) {
  var h = ptHmac_(pw, salt);
  for (var i = 0; i < PT_HASH_ROUNDS_; i++) h = ptHmac_(h + pw, salt);
  return h;
}
/* Same time whatever the input, so a wrong guess can't be timed character by character. */
function ptSame_(a, b) {
  a = String(a || ''); b = String(b || '');
  var d = a.length ^ b.length;
  for (var i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
function ptEmail_(e) { return String(e || '').trim().toLowerCase(); }
function ptUser_(id) {
  const v = id ? ptProps_().getProperty('PU_' + id) : null;
  try { return v ? JSON.parse(v) : null; } catch (e) { return null; }
}
function ptSaveUser_(u) { ptProps_().setProperty('PU_' + u.id, JSON.stringify(u)); }
function ptUsers_() {
  const all = ptProps_().getProperties();
  return Object.keys(all).filter(function (k) { return k.indexOf('PU_') === 0; })
    .map(function (k) { try { return JSON.parse(all[k]); } catch (e) { return null; } }).filter(Boolean);
}
function ptPublicUser_(u) {
  return { id: u.id, email: u.email, name: u.name || '', domains: u.domains || [], disabled: !!u.disabled,
    created: u.created || 0, lastLogin: u.lastLogin || 0, lastSeen: u.lastSeen || 0 };
}
function ptClientName_(domain) {
  const c = clients_().filter(function (x) { return x.domain === domain; })[0];
  return c ? c.name : domain;
}

/* ---------- sessions ---------- */
function ptB64_(s) { return Utilities.base64EncodeWebSafe(s).replace(/=+$/, ''); }
function ptUnB64_(s) { return Utilities.newBlob(Utilities.base64DecodeWebSafe(s + '==='.slice((s.length + 3) % 4))).getDataAsString(); }
function ptSign_(u, hours) {
  const payload = ptB64_(JSON.stringify({ u: u.id, v: u.pv || 1, x: Date.now() + (hours || PT_SESSION_DAYS_ * 24) * 3600000 }));
  return payload + '.' + ptHmac_(payload, ptSecret_());
}
function ptSession_(tok) {
  const parts = String(tok || '').split('.');
  if (parts.length !== 2 || !ptSame_(ptHmac_(parts[0], ptSecret_()), parts[1])) return null;
  var p; try { p = JSON.parse(ptUnB64_(parts[0])); } catch (e) { return null; }
  if (!p || !p.u || !(p.x > Date.now())) return null;
  const u = ptUser_(p.u);
  if (!u || u.disabled || (u.pv || 1) !== p.v) return null;
  return u;
}

/* At most 8 wrong passwords per email (and 60 sign-ins overall) every 15 minutes. */
function ptThrottle_(email) {
  const c = CacheService.getScriptCache();
  const k1 = 'ptl_' + ptHmac_(email, 'rl').slice(0, 24), k2 = 'ptl_all';
  const n1 = Number(c.get(k1) || 0), n2 = Number(c.get(k2) || 0);
  if (n1 >= 8 || n2 >= 60) return false;
  c.put(k2, String(n2 + 1), 900);
  return { fail: function () { c.put(k1, String(n1 + 1), 900); } };
}

/* ---------- router ---------- */
function portalRoute_(b) {
  const a = String(b.action || '');
  /* EDGE side: the admin key. */
  if (a.indexOf('portalAdmin') === 0) {
    if (!isAdmin_(b.key)) return { error: 'unauthorized' };
    return ptAdmin_(a, b);
  }
  if (a === 'portalLogin') return ptLogin_(b);
  const u = ptSession_(b.session);
  if (!u) return { error: 'signedout' };
  if (a === 'portalMe') return ptMe_(u);
  if (a === 'portalSaveLayout') return ptSaveLayout_(u, b.layout);
  if (a === 'portalData') {
    const d = normDomain_(b.domain);
    if ((u.domains || []).indexOf(d) < 0) return { error: 'unauthorized' };
    return ptData_(d, String(b.kind || ''), b.start, b.end);
  }
  return { error: 'unknown action' };
}

function ptLogin_(b) {
  const email = ptEmail_(b.email), pw = String(b.password || '');
  if (!email || !pw) return { error: 'Enter your email and password.' };
  const t = ptThrottle_(email);
  if (!t) return { error: 'Too many attempts. Wait 15 minutes and try again.' };
  const id = ptProps_().getProperty('PE_' + email);
  const u = ptUser_(id);
  /* Hash even when there's no such account, so the answer takes the same time. */
  const ok = u && !u.disabled && ptSame_(ptHash_(pw, u.salt), u.hash);
  if (!u) ptHash_(pw, 'nobody');
  if (!ok) { t.fail(); return { error: 'That email and password don’t match an account.' }; }
  u.lastLogin = Date.now(); ptSaveUser_(u);
  return { ok: true, session: ptSign_(u), me: ptMe_(u) };
}

function ptMe_(u) {
  var layout = null;
  try { layout = JSON.parse(ptProps_().getProperty('PL_' + u.id) || 'null'); } catch (e) {}
  return { ok: true, user: { name: u.name || '', email: u.email },
    clients: (u.domains || []).map(function (d) { return { domain: d, name: ptClientName_(d), connected: elConnected_(d) }; }),
    layout: layout };
}
function ptSaveLayout_(u, layout) {
  const s = JSON.stringify(layout || null);
  if (s.length > 8500) return { error: 'Too many widgets to save. Remove a few and try again.' };
  ptProps_().setProperty('PL_' + u.id, s);
  u.lastSeen = Date.now(); ptSaveUser_(u);
  return { ok: true };
}

/* ---------- EDGE admin ---------- */
function ptAdmin_(a, b) {
  const p = ptProps_();
  if (a === 'portalAdminList') {
    return { ok: true, users: ptUsers_().map(ptPublicUser_),
      clients: clients_().map(function (c) { return { domain: c.domain, name: c.name, connected: elConnected_(c.domain) }; }),
      scopes: (function () { try { return JSON.parse(p.getProperty('PORTAL_SCOPES') || 'null'); } catch (e) { return null; } })() };
  }
  if (a === 'portalAdminSave') {
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      const email = ptEmail_(b.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email.' };
      var u = b.id ? ptUser_(b.id) : null;
      const other = p.getProperty('PE_' + email);
      if (other && (!u || other !== u.id)) return { error: 'Another portal account already uses that email.' };
      if (!u) {
        if (!b.password) return { error: 'Set a password for the new account.' };
        u = { id: 'pu' + Utilities.getUuid().replace(/-/g, '').slice(0, 16), created: Date.now(), pv: 1 };
      }
      if (u.email && u.email !== email) p.deleteProperty('PE_' + u.email);
      u.email = email;
      u.name = String(b.name || '').slice(0, 80);
      u.domains = (Array.isArray(b.domains) ? b.domains : []).map(normDomain_).filter(String).slice(0, 25);
      u.disabled = !!b.disabled;
      if (b.password) {
        if (String(b.password).length < 12) return { error: 'Use a password of at least 12 characters.' };
        u.salt = Utilities.getUuid(); u.hash = ptHash_(String(b.password), u.salt); u.pv = (u.pv || 1) + 1;
      }
      if (b.signOut) u.pv = (u.pv || 1) + 1;
      ptSaveUser_(u); p.setProperty('PE_' + email, u.id);
      return { ok: true, user: ptPublicUser_(u) };
    } finally { lock.releaseLock(); }
  }
  if (a === 'portalAdminDelete') {
    const u = ptUser_(b.id); if (!u) return { error: 'No such account.' };
    p.deleteProperty('PU_' + u.id); p.deleteProperty('PE_' + u.email); p.deleteProperty('PL_' + u.id);
    return { ok: true };
  }
  /* "Re-check data access" in the Easyleads workspace. */
  if (a === 'portalAdminCheck') { portalCheckScopes(); return { ok: true }; }
  /* "Open as this client": a one-hour session so EDGE sees exactly what they see. */
  if (a === 'portalAdminSession') {
    const u = ptUser_(b.id); if (!u) return { error: 'No such account.' };
    return { ok: true, session: ptSign_(u, 1) };
  }
  return { error: 'unknown action' };
}

/* ---------- GoHighLevel, read only ---------- */
function ptGhl_(c, method, path, q, body, version) {
  const qs = Object.keys(q || {}).filter(function (k) { return q[k] != null && q[k] !== ''; })
    .map(function (k) { return k + '=' + encodeURIComponent(q[k]); }).join('&');
  for (var attempt = 0; attempt < 3; attempt++) {
    const opt = { method: method, muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + c.tok, Version: version || EL_VERSION_, Accept: 'application/json' } };
    if (body) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(body); }
    const res = UrlFetchApp.fetch(EL_API_ + path + (qs ? '?' + qs : ''), opt);
    const code = res.getResponseCode();
    var data = {}; try { data = JSON.parse(res.getContentText() || '{}'); } catch (e) {}
    if (code === 429 || code >= 500) { Utilities.sleep(1200 * (attempt + 1)); continue; }
    if (code === 401 || code === 403) { const e = new Error('scope'); e.scope = true; throw e; }
    if (code !== 200 && code !== 201) throw new Error('Easyleads answered ' + code + (data.message ? ': ' + data.message : ''));
    return data;
  }
  throw new Error('Easyleads is busy right now. Try again in a minute.');
}
const PT_SCOPE_ = { calls: 'View Conversation Messages', contacts: 'View Contacts', opps: 'View Opportunities', appts: 'View Calendars and View Calendar Events', forms: 'View Forms' };

function ptRange_(start, end) {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  const now = Date.now(), day = 86400000;
  var s = re.test(start || '') ? Date.parse(start + 'T00:00:00Z') : now - 30 * day;
  var e = re.test(end || '') ? Date.parse(end + 'T23:59:59Z') : now;
  if (!(s <= e)) s = e - 30 * day;
  if (e - s > 400 * day) s = e - 400 * day;
  return { s: s, e: Math.min(e, now + day) };
}

function ptData_(domain, kind, start, end) {
  if (!PT_SCOPE_[kind]) return { error: 'unknown data' };
  const c = elConf_(domain);
  if (!c) return { error: 'notconnected' };
  const r = ptRange_(start, end);
  const ck = 'ptd_' + ptHmac_([domain, kind, r.s, r.e].join('|'), 'c').slice(0, 32);
  const cache = CacheService.getScriptCache();
  const hit = cache.get(ck);
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  var out;
  try {
    const rows = ({ forms: ptForms_, calls: ptCalls_, contacts: ptContacts_, opps: ptOpps_, appts: ptAppts_ })[kind](c, r);
    out = { ok: true, kind: kind, rows: rows.rows || rows, extra: rows.extra || null, at: Date.now() };
  } catch (e) {
    if (e.scope) return { error: 'scope', scope: PT_SCOPE_[kind] };
    return { error: e.message };
  }
  const s = JSON.stringify(out);
  if (s.length < 95000) cache.put(ck, s, PT_CACHE_SEC_);
  return out;
}

function ptIso_(t) { return new Date(t).toISOString(); }
function ptDay_(t) { return Utilities.formatDate(new Date(t), 'UTC', 'yyyy-MM-dd'); }
function ptTime_(v) { const n = typeof v === 'number' ? v : Date.parse(v); return isFinite(n) ? n : 0; }

function ptForms_(c, r) {
  const names = elFormNames_(c), labels = elFieldLabels_(c), out = [];
  for (var page = 1; page <= 5; page++) {
    const d = ptGhl_(c, 'get', '/forms/submissions', { locationId: c.loc, page: page, limit: 100, startAt: ptDay_(r.s), endAt: ptDay_(r.e) });
    (d.submissions || []).forEach(function (s) {
      const o = s.others || {}, fields = [];
      Object.keys(o).forEach(function (k) {
        if (/^(eventData|fieldsOri|__|formId|location_id|submissionId|ip|signature|terms_and_conditions)/i.test(k)) return;
        var v = o[k];
        if (v == null || v === '') return;
        if (typeof v === 'object') return;
        if (['full_name', 'first_name', 'last_name', 'email', 'phone'].indexOf(k) > -1) return;
        fields.push([labels[k] || elLabel_(k), String(v).slice(0, 400)]);
      });
      out.push({ id: s.id, at: ptTime_(s.createdAt), form: names[s.formId] || 'Form', name: s.name || [o.first_name, o.last_name].filter(String).join(' '),
        email: s.email || o.email || '', phone: o.phone || '', page: elPath_((o.eventData && (o.eventData.url || o.eventData.page && o.eventData.page.url)) || ''), fields: fields.slice(0, 14) });
    });
    if ((d.submissions || []).length < 100) break;
  }
  return out.sort(function (a, b) { return b.at - a.at; });
}

function ptCalls_(c, r) {
  const out = []; var cursor = null;
  for (var page = 0; page < 6; page++) {
    const d = ptGhl_(c, 'get', '/conversations/messages/export', { locationId: c.loc, channel: 'Call', limit: 200, sortOrder: 'desc', cursor: cursor }, null, '2021-04-15');
    var older = false;
    (d.messages || []).forEach(function (m) {
      const t = ptTime_(m.dateAdded);
      if (t < r.s) { older = true; return; }
      if (t > r.e) return;
      const meta = m.meta || {}, call = meta.call || meta;
      out.push({ id: m.id, at: t, dir: m.direction || '', status: String(call.callStatus || call.status || m.status || ''), dur: Number(call.callDuration || call.duration || 0) || 0,
        contactId: m.contactId || '', from: m.from || '', to: m.to || '' });
    });
    cursor = d.nextCursor;
    if (older || !cursor) break;
  }
  /* Names for the latest callers (best effort, needs View Contacts). */
  const ids = []; out.forEach(function (x) { if (x.contactId && ids.indexOf(x.contactId) < 0 && ids.length < 25) ids.push(x.contactId); });
  const names = ptContactNames_(c, ids);
  out.forEach(function (x) { x.name = names[x.contactId] || ''; });
  return out;
}
function ptContactNames_(c, ids) {
  const out = {}, cache = CacheService.getScriptCache();
  ids.forEach(function (id) {
    const ck = 'ptcn_' + id, hit = cache.get(ck);
    if (hit != null) { out[id] = hit; return; }
    try {
      const d = ptGhl_(c, 'get', '/contacts/' + encodeURIComponent(id), {});
      const k = d.contact || {};
      out[id] = k.contactName || [k.firstName, k.lastName].filter(String).join(' ') || k.phone || '';
      cache.put(ck, out[id], 21600);
    } catch (e) { if (e.scope) return; }
  });
  return out;
}

function ptContacts_(c, r) {
  const out = [];
  for (var page = 1; page <= 5; page++) {
    const d = ptGhl_(c, 'post', '/contacts/search', null, {
      locationId: c.loc, page: page, pageLimit: 100,
      filters: [{ field: 'dateAdded', operator: 'range', value: { gte: ptIso_(r.s), lte: ptIso_(r.e) } }],
      sort: [{ field: 'dateAdded', direction: 'desc' }]
    });
    (d.contacts || []).forEach(function (k) {
      out.push({ id: k.id, at: ptTime_(k.dateAdded), name: k.contactName || [k.firstName, k.lastName].filter(String).join(' ') || k.email || k.phone || 'Contact',
        email: k.email || '', phone: k.phone || '', source: k.source || (k.attributionSource && (k.attributionSource.medium || k.attributionSource.utmSource)) || '', tags: (k.tags || []).slice(0, 6) });
    });
    if ((d.contacts || []).length < 100) break;
  }
  return out;
}

function ptOpps_(c, r) {
  const stages = {}, pipes = {};
  try {
    const p = ptGhl_(c, 'get', '/opportunities/pipelines', { locationId: c.loc });
    (p.pipelines || []).forEach(function (pl) { pipes[pl.id] = pl.name; (pl.stages || []).forEach(function (s, i) { stages[s.id] = { name: s.name, pos: i, pipe: pl.name }; }); });
  } catch (e) { if (e.scope) throw e; }
  const out = [];
  for (var page = 1; page <= 5; page++) {
    const d = ptGhl_(c, 'get', '/opportunities/search', { location_id: c.loc, limit: 100, page: page });
    var older = false;
    (d.opportunities || []).forEach(function (o) {
      const t = ptTime_(o.createdAt);
      const st = stages[o.pipelineStageId] || {};
      out.push({ id: o.id, at: t, upd: ptTime_(o.updatedAt || o.lastStatusChangeAt), name: o.name || (o.contact && o.contact.name) || 'Opportunity', value: Number(o.monetaryValue) || 0,
        status: o.status || 'open', stage: st.name || '', stagePos: st.pos || 0, pipeline: pipes[o.pipelineId] || st.pipe || '', contact: (o.contact && o.contact.name) || '' });
    });
    if ((d.opportunities || []).length < 100) break;
  }
  return { rows: out, extra: { pipelines: Object.keys(pipes).map(function (k) { return pipes[k]; }), stages: Object.keys(stages).map(function (k) { return stages[k]; }) } };
}

function ptAppts_(c, r) {
  const cals = ptGhl_(c, 'get', '/calendars/', { locationId: c.loc }, null, '2021-04-15').calendars || [];
  const out = [];
  /* Appointments in the period and the next 30 days, so "Upcoming" works too. */
  const end = Math.max(r.e, Date.now() + 30 * 86400000);
  cals.slice(0, 12).forEach(function (cal) {
    const d = ptGhl_(c, 'get', '/calendars/events', { locationId: c.loc, calendarId: cal.id, startTime: r.s, endTime: end }, null, '2021-04-15');
    (d.events || []).forEach(function (ev) {
      out.push({ id: ev.id, at: ptTime_(ev.startTime), title: ev.title || 'Appointment', status: ev.appointmentStatus || ev.status || '', calendar: cal.name || '' });
    });
  });
  return out.sort(function (a, b) { return a.at - b.at; });
}

/* Run from the editor (or a daily trigger): checks every Easyleads-connected
   client and records which parts of the portal its token can read, so the SEO
   tool can show "needs View Contacts" and so on next to each business. */
function portalCheckScopes() {
  const now = Date.now(), r = { s: now - 30 * 86400000, e: now }, out = {};
  elDomains_().forEach(function (d) {
    const c = elConf_(d), res = {};
    ['forms', 'calls', 'contacts', 'opps', 'appts'].forEach(function (k) {
      try {
        const x = ({ forms: ptForms_, calls: ptCalls_, contacts: ptContacts_, opps: ptOpps_, appts: ptAppts_ })[k](c, r);
        res[k] = (x.rows || x).length;
      } catch (e) { res[k] = e.scope ? 'scope' : 'error: ' + String(e.message).slice(0, 80); }
    });
    out[d] = res;
    console.log(d + ' ' + JSON.stringify(res));
  });
  ptProps_().setProperty('PORTAL_SCOPES', JSON.stringify({ at: now, d: out }));
  return out;
}
