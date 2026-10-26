/* ==========================================================================
   EDGE FORM EXPORT — runs inside a client's WordPress or Concrete admin.

   Started from the "EDGE import" bookmark (made on the Connections card in
   the SEO tool). It reads every stored form submission the signed-in admin
   can see, using the site's own admin pages and API, and hands them back to
   the SEO tool window that opened this one (postMessage, to the tool's origin
   only). The tool then imports them into the tracker with the team key.
   Nothing is sent anywhere else; with no SEO tool window it offers a file
   for the Form submissions widget's Import box instead.

   WordPress: Ninja Forms, Gravity Forms (its REST API must be on),
              Elementor Pro form submissions.
   Concrete:  Express forms (v8/v9), the older Form block (5.6–8),
              and the Formidable package.
   ========================================================================== */
(function () {
'use strict';
var TOOL = 'https://seo.edgemarketing.ca';
if (window.__edgeExportOpen) { var o = document.getElementById('edgeExportBox'); if (o) o.style.display = 'block'; return; }
window.__edgeExportOpen = true;

var DOMAIN = location.hostname.toLowerCase().replace(/^www\./, '');
var out = [], notes = [], counts = {};

/* ---------- panel ---------- */
var box = document.createElement('div');
box.id = 'edgeExportBox';
box.setAttribute('style', 'position:fixed;top:16px;right:16px;z-index:2147483647;width:360px;max-width:calc(100vw - 32px);background:#fff;color:#1b222a;' +
  'border:1px solid #e4e9ed;border-radius:14px;box-shadow:0 18px 50px -12px rgba(20,28,36,.35);font:13px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;padding:16px 18px;text-align:left');
box.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><b style="font-size:14px;flex:1">EDGE form import · ' + esc(DOMAIN) + '</b>' +
  '<button type="button" data-x style="border:0;background:none;font-size:18px;cursor:pointer;color:#8b98a3;line-height:1">×</button></div>' +
  '<div data-st style="color:#57646f">Reading this site’s stored form submissions…</div><div data-list style="margin-top:8px"></div><div data-act style="margin-top:12px"></div>';
document.body.appendChild(box);
box.querySelector('[data-x]').onclick = function () { box.style.display = 'none'; };
var st = box.querySelector('[data-st]'), list = box.querySelector('[data-list]'), act = box.querySelector('[data-act]');
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
function line(t, err) { list.insertAdjacentHTML('beforeend', '<div style="color:' + (err ? '#b5352a' : '#57646f') + ';font-size:12px">' + esc(t) + '</div>'); }
function btn(label, primary) {
  var b = document.createElement('button'); b.type = 'button'; b.textContent = label;
  b.setAttribute('style', 'font:inherit;font-weight:600;border-radius:9px;padding:8px 12px;cursor:pointer;margin:0 6px 6px 0;' +
    (primary ? 'background:#e87722;color:#fff;border:1px solid #e87722' : 'background:#fff;color:#1b222a;border:1px solid #e4e9ed'));
  act.appendChild(b); return b;
}
function add(form, id, date, page, fields) {
  var f = {}; Object.keys(fields || {}).forEach(function (k) { var v = fields[k]; v = v == null ? '' : String(v).trim(); if (v) f[String(k).trim()] = v; });
  if (!Object.keys(f).length) return false;
  var when = new Date(date);
  out.push({id: String(id), form: form || 'Website form', date: isNaN(when) ? String(date) : when.toISOString(), page: page || '', fields: f});
  counts[form] = (counts[form] || 0) + 1;
  return true;
}
function pathOf(u) { try { return u ? new URL(u, location.origin).pathname : ''; } catch (e) { return ''; } }
function parseCSV(t) {
  t = String(t || '').replace(/^﻿/, '');
  var rows = [], row = [], f = '', q = false;
  for (var i = 0; i < t.length; i++) {
    var c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); f = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows;
}
function get(u, opt) { return fetch(u, Object.assign({cache: 'no-store', credentials: 'same-origin'}, opt || {})); }
function html(u) { return get(u).then(function (r) { return r.ok && !/\/login\b|wp-login\.php/.test(r.url) ? r.text() : ''; }); }
function dom(t) { return new DOMParser().parseFromString(t || '', 'text/html'); }

/* ---------- WordPress ---------- */
async function wordpress() {
  var root = (window.wpApiSettings && wpApiSettings.root) || (location.origin + '/wp-json/');
  var nonce = window.wpApiSettings && wpApiSettings.nonce;
  if (!nonce) { try { var r0 = await get('/wp-admin/admin-ajax.php?action=rest-nonce'); if (r0.ok) nonce = (await r0.text()).trim(); } catch (e) {} }
  if (!nonce || nonce === '0') throw new Error('Sign in to this site’s WordPress admin first, then click the bookmark again.');
  var H = {'X-WP-Nonce': nonce};
  var api = function (path) { return get(root + path.replace(/^\//, ''), {headers: H}).then(function (r) { return r.json().then(function (j) { return {ok: r.ok, status: r.status, j: j}; }, function () { return {ok: false, status: r.status, j: null}; }); }); };
  var idx = await api('');
  var ns = (idx.j && idx.j.namespaces) || [];
  var any = false;
  /* "2026-10-21 21:06:08" in the site's own timezone (from WordPress's settings) as an exact time. */
  var tzName = idx.j && idx.j.timezone_string, gmtOff = Number(idx.j && idx.j.gmt_offset) || 0;
  var siteTime = function (s) {
    s = String(s || '').replace(' ', 'T');
    var guess = new Date(s + 'Z');
    if (isNaN(guess)) return s;
    var off = gmtOff * 60;
    if (tzName) {
      try {
        var nm = new Intl.DateTimeFormat('en-US', {timeZone: tzName, timeZoneName: 'longOffset'}).formatToParts(guess).find(function (p) { return p.type === 'timeZoneName'; }).value;
        var mm = /GMT([+-])(\d{2}):?(\d{2})?/.exec(nm);
        off = mm ? (mm[1] === '-' ? -1 : 1) * (Number(mm[2]) * 60 + Number(mm[3] || 0)) : 0;
      } catch (e) {}
    }
    return new Date(guess.getTime() - off * 60000).toISOString();
  };

  /* Ninja Forms */
  if (ns.indexOf('ninja-forms-submissions') > -1) {
    any = true;
    var page = await html('/wp-admin/admin.php?page=nf-submissions');
    var m = /var nf_submissions\s*=\s*(\{[\s\S]*?\});\s*(?:\n|<\/script>)/.exec(page);
    var forms = [];
    try { var cfg = JSON.parse(m[1]); forms = Object.values(cfg.forms || {}).filter(function (f) { return f && (f.formID || f.id); }).map(function (f) { return {id: f.formID || f.id, name: f.formTitle || f.title || ('Form ' + (f.formID || f.id))}; }); } catch (e) {}
    if (!forms.length) line('Ninja Forms: couldn’t read the list of forms.', true);
    for (var i = 0; i < forms.length; i++) {
      var f = forms[i];
      var r = await api('ninja-forms-submissions/submissions/get?type=data&form_ids=' + f.id + '&page_size=5000&current_page=1&start_date=0&end_date=0&search_term=&status=completed');
      var arr = r.j && (Array.isArray(r.j.data) ? r.j.data : Object.values(r.j.data || {}));
      if (!r.ok || !arr) { line('Ninja Forms · ' + f.name + ': couldn’t read (' + r.status + ')', true); continue; }
      var n = 0;
      arr.forEach(function (s) {
        var fields = {}, pg = '';
        Object.values(s.submissionFieldCollection || {}).forEach(function (x) {
          if (!x || typeof x !== 'object') return;
          var v = Array.isArray(x.value) ? x.value.join(', ') : x.value;
          v = String(v == null ? '' : v).trim();
          if (x.type === 'submit' || !v) return;
          if (x.type === 'hidden') { if (/^https?:\/\//.test(v)) pg = pathOf(v); return; }
          var k = x.label || x.slug; fields[k] = fields[k] ? fields[k] + ', ' + v : v;
        });
        if (add(f.name, 'nf' + s.submissionRecordId, siteTime(s.timestamp), pg, fields)) n++;
      });
      line('Ninja Forms · ' + f.name + ': ' + n);
    }
  }

  /* Gravity Forms (REST API v2) */
  if (ns.indexOf('gf/v2') > -1) {
    any = true;
    var gf = await api('gf/v2/forms');
    if (!gf.ok) line('Gravity Forms: its REST API is off. Turn it on under Forms › Settings › REST API, then click the bookmark again.', true);
    else {
      var gforms = Object.values(gf.j || {});
      for (var g = 0; g < gforms.length; g++) {
        var form = gforms[g], labels = {};
        var fd = await api('gf/v2/forms/' + form.id);
        ((fd.j && fd.j.fields) || []).forEach(function (fl) {
          labels[String(fl.id)] = fl.label || fl.adminLabel || ('Field ' + fl.id);
          (fl.inputs || []).forEach(function (inp) { labels[String(inp.id)] = (fl.label ? fl.label + ' ' : '') + (inp.label || ''); });
        });
        var got = 0;
        for (var p = 1; p <= 200; p++) {
          var e = await api('gf/v2/entries?form_ids[0]=' + form.id + '&paging[page_size]=200&paging[current_page]=' + p);
          var ents = (e.j && e.j.entries) || [];
          ents.forEach(function (en) {
            var fields = {};
            Object.keys(en).forEach(function (k) { if (/^\d+(\.\d+)?$/.test(k) && labels[k] && String(en[k]).trim()) fields[labels[k]] = en[k]; });
            if (add(form.title || ('Form ' + form.id), 'gf' + en.id, String(en.date_created || '').replace(' ', 'T') + 'Z', pathOf(en.source_url), fields)) got++;
          });
          if (ents.length < 200) break;
        }
        line('Gravity Forms · ' + (form.title || form.id) + ': ' + got);
      }
    }
  }

  /* Elementor Pro form submissions */
  if (ns.indexOf('elementor/v1') > -1) {
    var first = await api('elementor/v1/form-submissions?per_page=100&page=1');
    if (first.ok && first.j && Array.isArray(first.j.data)) {
      any = true;
      var subs = first.j.data.slice(), pages = (first.j.meta && first.j.meta.pagination && first.j.meta.pagination.total_pages) || 1;
      for (var q = 2; q <= Math.min(pages, 100); q++) { var nx = await api('elementor/v1/form-submissions?per_page=100&page=' + q); subs = subs.concat((nx.j && nx.j.data) || []); }
      var en2 = 0;
      for (var s2 = 0; s2 < subs.length; s2++) {
        var one = await api('elementor/v1/form-submissions/' + subs[s2].id);
        var d = (one.j && one.j.data) || subs[s2];
        var fields2 = {};
        (d.values || []).forEach(function (v) { fields2[v.label || v.key] = v.value; });
        var fname = (d.form && d.form.name) || 'Elementor form';
        if (add(fname, 'el' + d.id, d.created_at_gmt ? d.created_at_gmt.replace(' ', 'T') + 'Z' : d.created_at, pathOf(d.referer), fields2)) en2++;
      }
      line('Elementor forms: ' + en2);
    }
  }

  if (!any) {
    var other = ns.filter(function (x) { return /form|frm|wpcf7|flamingo|fluent|forminator|wpforms|cf7/i.test(x); });
    line('No supported form storage found here.' + (other.length ? ' Seen: ' + other.join(', ') + '.' : ' Contact Form 7 and WPForms Lite don’t keep submissions, so there’s nothing to import from them.'), true);
  }
}

/* ---------- Concrete ---------- */
async function concrete() {
  var bases = location.pathname.indexOf('/index.php/') === 0 ? ['/index.php', ''] : ['', '/index.php'];
  var P = null, listHtml = '';
  for (var b = 0; b < bases.length && P === null; b++) {
    var t = await html(bases[b] + '/dashboard/reports/forms');
    if (t && /dashboard/i.test(t)) { P = bases[b]; listHtml = t; }
  }
  if (P === null) throw new Error('Sign in to this site’s Concrete dashboard first, then click the bookmark again.');
  var d = dom(listHtml);

  /* Express forms (Concrete 8 and 9) */
  var META = /^(publicIdentifier|id|dateCreated|dateModified|date created|date modified|site|authorName|author|ccm_token|express_form_id)$/i;
  var xf = Array.prototype.slice.call(d.querySelectorAll('[data-details-url], a[href*="/reports/forms/results/"], a[href*="/reports/forms/view/"]'))
    .map(function (e) { return {name: e.textContent.trim().replace(/\s+/g, ' '), url: e.getAttribute('data-details-url') || e.getAttribute('href')}; })
    .filter(function (x, i, a) { return x.url && x.name && a.findIndex(function (y) { return y.url === x.url; }) === i; });
  for (var i = 0; i < xf.length; i++) {
    var id = xf[i].url.split('?')[0].replace(/\/+$/, '').split('/').pop();
    var rows = parseCSV(await get(P + '/dashboard/reports/forms/csv_export/' + id).then(function (r) { return r.ok ? r.text() : ''; }));
    if (rows.length < 2) { if (!rows.length) line('Express · ' + xf[i].name + ': no export', true); else line('Express · ' + xf[i].name + ': 0'); continue; }
    var head = rows[0].map(function (h) { return h.trim(); });
    var iId = head.findIndex(function (h) { return /^(publicIdentifier|id)$/i.test(h); }), iDate = head.findIndex(function (h) { return /^(dateCreated|date created)$/i.test(h); });
    var n = 0;
    /* IDs match the earlier one-off exports (Oct 2026), so re-importing a site never duplicates it. */
    rows.slice(1).forEach(function (r) {
      var fields = {};
      head.forEach(function (h, j) { if (!META.test(h) && r[j]) fields[h] = r[j]; });
      if (add(xf[i].name, (iId > -1 && r[iId]) ? r[iId] : (id + '-' + n), iDate > -1 ? r[iDate] : '', '', fields)) n++;
    });
    line('Express · ' + xf[i].name + ': ' + n);
  }

  /* The older Form block (5.6, 5.7, 8): "View Responses" links with a qsid, exported as an HTML table */
  var legacyPages = [listHtml, await html(P + '/dashboard/reports/forms/legacy')];
  var seen = {};
  for (var lp = 0; lp < legacyPages.length; lp++) {
    var ld = dom(legacyPages[lp]);
    var links = Array.prototype.slice.call(ld.querySelectorAll('a[href*="qsid"]'));
    for (var l = 0; l < links.length; l++) {
      var qsid = null;
      try { qsid = new URL(links[l].getAttribute('href'), location.origin).searchParams.get('qsid'); } catch (e) {}
      if (!qsid || seen[qsid]) continue;
      seen[qsid] = 1;
      var tr0 = links[l].closest('tr');
      var fname = (tr0 && tr0.querySelector('td') ? tr0.querySelector('td').textContent.trim().replace(/\s+/g, ' ') : '') || 'Website form';
      var tx = await get(P + '/dashboard/reports/forms/excel/?qsid=' + qsid).then(function (r) { return r.ok ? r.text() : ''; });
      var trs = Array.prototype.slice.call(dom(tx).querySelectorAll('tr'));
      if (!trs.length) { line('Form block · ' + fname + ': no export', true); continue; }
      var hd = Array.prototype.slice.call(trs[0].querySelectorAll('td,th')).map(function (c) { return c.textContent.trim(); });
      var m2 = 0;
      /* Oldest first, as the earlier exports numbered them (the export lists newest first). */
      trs.slice(1).reverse().forEach(function (row, idx) {
        var cells = Array.prototype.slice.call(row.querySelectorAll('td,th')).map(function (c) { return c.textContent.trim(); });
        var fields = {};
        hd.forEach(function (h, j) { if (j > 1 && cells[j]) fields[h] = cells[j]; });
        var when = new Date(cells[0]);
        if (add(fname, qsid + '-' + (isNaN(when) ? cells[0] : when.getTime()) + '-' + idx, cells[0], '', fields)) m2++;
      });
      line('Form block · ' + fname + ': ' + m2);
    }
  }

  /* Formidable package */
  var fl = dom(await html(P + '/dashboard/formidable/results'));
  var FMETA = /^(ID|DateAdded|DateChanged|PageID|PageName|PageURL|UserID|UserName|UserEmail|IP|Device|Operating System|Browser|Resolution|Locale|Localization|Answered|Submitted)$/i;
  var ff = Array.prototype.slice.call(fl.querySelectorAll('a[href*="/formidable/results/"]'))
    .map(function (a) { return {id: (a.getAttribute('href').match(/\/results\/(\d+)\/?$/) || [])[1], name: a.textContent.trim().replace(/\s+/g, ' ')}; })
    .filter(function (x, i, a) { return x.id && x.name && a.findIndex(function (y) { return y.id === x.id; }) === i; });
  for (var k = 0; k < ff.length; k++) {
    var rws = parseCSV(await get(P + '/dashboard/formidable/results/export/' + ff[k].id).then(function (r) { return r.ok ? r.text() : ''; }));
    if (rws.length < 2) { line('Formidable · ' + ff[k].name + ': 0'); continue; }
    var h2 = rws[0].map(function (h) { return h.trim(); }), jId = h2.indexOf('ID'), jDate = h2.indexOf('DateAdded'), jUrl = h2.indexOf('PageURL');
    var c3 = 0;
    rws.slice(1).forEach(function (r) {
      var fields = {};
      h2.forEach(function (h, j) { if (!FMETA.test(h) && r[j]) fields[h] = r[j]; });
      if (add(ff[k].name, 'formidable' + ff[k].id + '-' + r[jId], r[jDate], pathOf(r[jUrl]), fields)) c3++;
    });
    line('Formidable · ' + ff[k].name + ': ' + c3);
  }
  if (!xf.length && !Object.keys(seen).length && !ff.length) line('No stored forms found in this dashboard.', true);
}

/* ---------- hand-off ---------- */
function finish() {
  var total = out.length;
  st.innerHTML = total ? '<b>' + total.toLocaleString() + '</b> submissions found' + (out.length ? ', oldest ' + esc(new Date(out.map(function (r) { return r.date; }).sort()[0]).toLocaleDateString()) : '') + '.'
    : 'Nothing to import from this site.';
  if (!total) return;
  var payload = {type: 'edge-forms-import', version: 1, domain: DOMAIN, collectedAt: new Date().toISOString(), rows: out};
  var opener = null;
  try { opener = window.opener && !window.opener.closed ? window.opener : null; } catch (e) {}
  if (opener) {
    var send = btn('Send to EDGE SEO tool', true);
    send.onclick = function () {
      send.disabled = true; send.textContent = 'Sending…';
      window.addEventListener('message', function onR(e) {
        if (e.origin !== TOOL || !e.data || e.data.type !== 'edge-forms-import-result' || e.data.domain !== DOMAIN) return;
        window.removeEventListener('message', onR);
        if (e.data.error) { send.disabled = false; send.textContent = 'Try again'; line(e.data.error, true); return; }
        act.innerHTML = '<div style="color:#0f7a58;font-weight:600">Done: ' + Number(e.data.added || 0).toLocaleString() + ' added, ' + Number(e.data.skipped || 0).toLocaleString() + ' already on file. You can close this window.</div>';
      });
      opener.postMessage(payload, TOOL);
      setTimeout(function () { if (send.textContent === 'Sending…') { send.disabled = false; send.textContent = 'Send again'; line('No answer from the SEO tool. Is the Connections card still open there?', true); } }, 120000);
    };
  }
  var dl = btn(opener ? 'Download file instead' : 'Download file for the SEO tool', !opener);
  dl.onclick = function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(payload)], {type: 'application/json'}));
    a.download = 'edge-forms-' + DOMAIN + '.json';
    document.body.appendChild(a); a.click(); a.remove();
  };
  if (!opener) line('Open this from the Connections card (Import past submissions) to send it straight in, or drop this file on the Form submissions widget’s Import box.');
}

(async function () {
  try {
    var isWp = /\/wp-admin\//.test(location.pathname) || !!window.wpApiSettings || !!document.querySelector('link[href*="wp-content"], script[src*="wp-includes"], #wpadminbar');
    var isCc = !isWp && (typeof window.CCM_DISPATCHER_FILENAME !== 'undefined' || typeof window.CCM_REL !== 'undefined' || /\/dashboard\//.test(location.pathname) || !!document.querySelector('script[src*="/concrete/"], link[href*="/concrete/"]'));
    if (isWp) await wordpress();
    else if (isCc) await concrete();
    else throw new Error('This doesn’t look like a WordPress or Concrete site. Open the site’s admin and click the bookmark there.');
    finish();
  } catch (err) {
    st.innerHTML = '<span style="color:#b5352a">' + esc(err.message) + '</span>';
  }
})();
})();
