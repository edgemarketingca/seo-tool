/* ==========================================================================
   CONNECTIONS (the "Connections" card on each client's Dashboard in the SEO tool)

   One place to see and set up everything the tracker reads for a client,
   so nobody has to edit the Clients tab or Script Properties by hand.

   GET  action=connections, domain, key        what is connected for one client
   GET  action=ga4Properties, key[, force=1]   every GA4 web stream this account can see
   POST {key, action:'setGa4', domain, property}         save (or clear) the GA4 property, pull GA4 now
   POST {key, action:'checkSnippet', domain}             load the live site and look for the forms snippet
   POST {key, action:'setEasyleads', domain, loc, tok}   connect Easyleads (GoHighLevel), first full pull

   All of these need the team key. Search Console needs nothing saved: the
   tracker uses whichever property for the domain is shared with its account.
   Wiring: two lines in Api.gs (connGet_ in doGet, connPost_ in doPost).
   ========================================================================== */

/* The Google account the tracker runs as: the one to share GA4 and Search Console with.
   Session can't always tell (it needs an extra permission), so a TRACKER_ACCOUNT
   script property can name it instead. */
function connAccount_() {
  var e = '';
  try { e = Session.getEffectiveUser().getEmail() || ''; } catch (err) {}
  return e || String(PropertiesService.getScriptProperties().getProperty('TRACKER_ACCOUNT') || '');
}

function connGet_(p, admin, domain) {
  if (!admin) return null;
  if (p.action === 'ga4Properties') return ga4Streams_(p.force === '1');
  if (p.action === 'connections') return domain ? connectionsFor_(domain) : { error: 'domain required' };
  return null;
}

function connPost_(body) {
  if (body.action === 'setGa4') return setGa4_(normDomain_(body.domain), body.property);
  if (body.action === 'checkSnippet') return checkSnippet_(normDomain_(body.domain));
  if (body.action === 'setEasyleads') return setEasyleads_(normDomain_(body.domain), body.loc, body.tok);
  return null;
}

/* Every GA4 property with a web stream, newest list cached for 6 hours. */
function ga4Streams_(force) {
  var ck = 'conn:ga4list';
  if (!force) { var hit = cacheGetBig_(ck); if (hit) return hit; }
  var list = [], token = null;
  do {
    var res = AnalyticsAdmin.AccountSummaries.list({ pageSize: 200, pageToken: token });
    (res.accountSummaries || []).forEach(function (acc) {
      (acc.propertySummaries || []).forEach(function (p) {
        var id = String(p.property || '').replace('properties/', '');
        var hosts = [];
        try {
          (AnalyticsAdmin.Properties.DataStreams.list(p.property, { pageSize: 50 }).dataStreams || []).forEach(function (s) {
            var h = s.webStreamData && normDomain_(s.webStreamData.defaultUri);
            if (h && hosts.indexOf(h) < 0) hosts.push(h);
          });
        } catch (e) { /* no access to this property's streams */ }
        list.push({ id: id, name: p.displayName || id, account: acc.displayName || '', hosts: hosts });
      });
    });
    token = res.nextPageToken;
  } while (token);
  list.sort(function (a, b) { return (a.account + a.name).toLowerCase() < (b.account + b.name).toLowerCase() ? -1 : 1; });
  var out = { properties: list, account: connAccount_(), at: new Date().toISOString() };
  cachePutBig_(ck, out, 6 * 3600);
  return out;
}

function connectionsFor_(domain) {
  var c = clients_().filter(function (x) { return x.domain === domain; })[0];
  var out = { domain: domain, known: !!c, account: connAccount_() };
  if (!c) return out;

  /* GA4: the saved property, its name, and likely matches when none is saved. */
  out.ga4 = { property: c.ga4 || '' };
  try {
    var props = ga4Streams_(false).properties || [];
    if (c.ga4) {
      var mine = props.filter(function (p) { return p.id === c.ga4; })[0];
      out.ga4.name = mine ? mine.name : '';
      out.ga4.hosts = mine ? mine.hosts : [];
      out.ga4.visible = !!mine;
    } else {
      out.ga4.suggest = props.filter(function (p) { return p.hosts.indexOf(domain) > -1; });
    }
  } catch (e) { out.ga4.error = e.message; }

  /* Search Console: whichever property for this domain is shared with the tracker. */
  try { out.gsc = { site: gscSiteFor_(domain) || '' }; } catch (e) { out.gsc = { site: '', error: e.message }; }

  /* Website forms (live snippet + imported) and Easyleads, from the Form Submissions tab. */
  var f = { live: 0, imported: 0, easyleads: 0, lastLive: '', lastAny: '', first: '' };
  var tz = Session.getScriptTimeZone();
  fsValues_().forEach(function (r) {
    if (r[0] !== domain) return;
    var d = r[1] instanceof Date ? r[1] : new Date(r[1]);
    if (isNaN(d)) return;
    var t = Utilities.formatDate(d, tz, "yyyy-MM-dd'T'HH:mm");
    if (r[15] === 'live') { f.live++; if (t > f.lastLive) f.lastLive = t; }
    else if (r[15] === 'import') f.imported++;
    else if (r[15] === 'easyleads') f.easyleads++;
    if (r[15] !== 'easyleads') { if (t > f.lastAny) f.lastAny = t; if (!f.first || t < f.first) f.first = t; }
  });
  out.forms = f;
  var props2 = PropertiesService.getScriptProperties();
  var snip = props2.getProperty('CONN_SNIPPET_' + domain);
  try { out.snippet = snip ? JSON.parse(snip) : null; } catch (e) { out.snippet = null; }

  var last = Number(props2.getProperty('ELS_' + domain) || 0);
  out.easyleads = { connected: elConnected_(domain), count: f.easyleads, lastSync: last ? new Date(last).toISOString() : '' };
  return out;
}

/* Saves the GA4 property on the Clients tab (column D), then pulls this client's GA4 now. */
function setGa4_(domain, property) {
  var id = String(property == null ? '' : property).replace(/^properties\//, '').trim();
  if (id && !/^\d{5,14}$/.test(id)) return { error: 'A GA4 property ID is a number, like 507762178.' };
  if (id) {
    try {
      var vis = (ga4Streams_(false).properties || []).some(function (p) { return p.id === id; });
      if (!vis) vis = (ga4Streams_(true).properties || []).some(function (p) { return p.id === id; });
      if (!vis) return { error: 'The tracker account (' + (connAccount_() || 'the tracker’s Google account') + ') can’t see GA4 property ' + id + '. Add it as a Viewer on that property in GA4 first.' };
    } catch (e) { /* listing failed: save anyway, the pull below will say if access is missing */ }
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var rows = values_('clients'), row = -1;
    for (var i = 0; i < rows.length; i++) if (normDomain_(rows[i][0]) === domain) { row = i; break; }
    if (row < 0) return { error: domain + ' is not in the tracker yet.' };
    tab_('clients').getRange(row + 2, 4).setValue(id);
  } finally { lock.releaseLock(); }
  CacheService.getScriptCache().remove('feed:' + domain);
  log_('Connections', 'OK', domain + ': GA4 property ' + (id || 'cleared'));
  var msg = '';
  if (id) { try { msg = pullGa4_(domain); } catch (e) { msg = 'Saved, but the first GA4 pull failed: ' + e.message; } }
  return { ok: true, property: id, message: msg };
}

/* Loads the client's home page and contact page and looks for the EDGE forms snippet. */
function checkSnippet_(domain) {
  if (!clients_().some(function (c) { return c.domain === domain; })) return { error: domain + ' is not in the tracker yet.' };
  var pages = ['https://' + domain + '/', 'https://' + domain + '/contact/', 'https://' + domain + '/contact-us/'];
  var found = false, cms = '', status = 0, checked = [];
  for (var i = 0; i < pages.length && !found; i++) {
    try {
      var r = UrlFetchApp.fetch(pages[i] + (pages[i].indexOf('?') > -1 ? '&' : '?') + 'edgecheck=' + Date.now(), {
        muteHttpExceptions: true, followRedirects: true,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EDGE-SEO-Reporter/1.0)', 'Cache-Control': 'no-cache' }
      });
      var code = r.getResponseCode();
      if (i === 0) status = code;
      if (code !== 200) continue;
      var html = r.getContentText().slice(0, 3000000);
      checked.push(pages[i]);
      if (!cms) cms = /wp-content|wp-includes|wp-json/i.test(html) ? 'WordPress'
        : /\/concrete\/|ccm_|CCM_DISPATCHER|concrete5|ConcreteCMS/i.test(html) ? 'Concrete' : '';
      if (/edge_form_src/.test(html) && html.indexOf("domain: '" + domain + "'") > -1) found = true;
      else if (/edge_form_src/.test(html)) { found = 'other'; }
    } catch (e) { if (i === 0) return { error: 'Couldn’t load ' + domain + ': ' + e.message }; }
  }
  var out = { found: found === true, wrongDomain: found === 'other', cms: cms, status: status, checked: checked, at: new Date().toISOString() };
  PropertiesService.getScriptProperties().setProperty('CONN_SNIPPET_' + domain, JSON.stringify(out));
  return out;
}

/* Same as the sheet menu's "Connect Easyleads for a client", from the SEO tool. */
function setEasyleads_(domain, loc, tok) {
  loc = String(loc || '').trim(); tok = String(tok || '').trim();
  if (!clients_().some(function (c) { return c.domain === domain; })) return { error: domain + ' is not in the tracker yet.' };
  if (!loc || !tok) return { error: 'Both the Location ID and the Private Integration Token are needed.' };
  if (!/^[A-Za-z0-9]{10,40}$/.test(loc)) return { error: 'That doesn’t look like a GoHighLevel Location ID.' };
  /* Try the token before saving it, so a typo doesn't get stored. */
  try { elGet_({ loc: loc, tok: tok }, '/forms/', { locationId: loc, limit: 1 }); }
  catch (e) { return { error: e.message }; }
  PropertiesService.getScriptProperties().setProperty('EL_' + domain, JSON.stringify({ loc: loc, tok: tok }));
  elEnsureTrigger_();
  try {
    var r = elSync_(domain, true);
    log_('Easyleads connect', 'OK', r + ' (from the SEO tool)');
    return { ok: true, message: r };
  } catch (e) {
    log_('Easyleads connect', 'ERROR', domain + ': ' + e.message);
    return { ok: true, message: 'Saved, but the first pull failed: ' + e.message };
  }
}
