/* Reads one Google results page as Claude sees it in Chrome and returns it in
   the shape EDGE_chromeRecord expects. Run in the Google tab; links are
   returned without their query strings. Best effort against Google's markup:
   it looks for structure (headings inside links, "Directions" buttons,
   section titles) rather than Google's changing class names.
   Pages of one search are added up in this tab's sessionStorage (page 1
   starts afresh). Pass the client's domain to learn whether it was found.
   To hand the result to the tool afterwards, run chrome-send.js. */
(async (site) => {
  const T = e => (e && (e.innerText || e.textContent) || '').replace(/\s+/g, ' ').trim();
  const clip = (t, n) => String(t || '').slice(0, n);
  const clean = h => { try{ const u = new URL(h, location.href); if (/(^|\.)google\./.test(u.hostname) && (u.pathname === '/url' || u.pathname === '/goto')){ const q = u.searchParams.get('q') || u.searchParams.get('url'); if (q) return clean(q); } return u.origin + u.pathname; }catch(e){ return ''; } };
  const isG = h => { try{ return /(^|\.)google\.|gstatic\.|youtube\.com\/results/.test(new URL(h).hostname); }catch(e){ return true; } };
  if (location.pathname.startsWith('/sorry') || document.querySelector('#captcha-form, form[action*="sorry"]') || /unusual traffic/i.test(T(document.body).slice(0, 2000))) return {blocked: true};
  /* Open the AI Overview fully and give it time to finish generating. */
  const headOf = txt => [...document.querySelectorAll('h1,h2,h3,div[role="heading"],span,div')].find(e => e.children.length <= 2 && T(e) === txt);
  let aiHead = headOf('AI Overview');
  if (aiHead){
    for (let i = 0; i < 16 && /Generating|Searching/i.test(T(aiHead.closest('[data-hveid]') || aiHead.parentElement).slice(0, 300)); i++) await new Promise(r => setTimeout(r, 500));
    let box = aiHead; for (let i = 0; i < 8 && box && T(box).length < 220; i++) box = box.parentElement;
    const more = box && [...box.querySelectorAll('div[role="button"],button,span')].find(b => /^Show more$/i.test(T(b)));
    if (more){ more.click(); await new Promise(r => setTimeout(r, 700)); }
  }
  const out = {organic: [], pack: [], paa: [], rel: [], ads: [], chips: []};
  const inside = (el, sel) => !!el.closest(sel);
  /* Sponsored results. */
  document.querySelectorAll('#tads [data-text-ad], #tads > div > div').forEach(ad => {
    if (out.ads.length >= 1) return;
    const a = ad.querySelector('a[href^="http"]'); const h = ad.querySelector('[role="heading"]'); if (!a || !h) return;
    const lines = [...ad.querySelectorAll('div')].map(T).filter(t => t.length > 60 && t.indexOf(T(h)) < 0).sort((x, y) => y.length - x.length);
    const links = [...ad.querySelectorAll('a[href^="http"]')].filter(l => l !== a && T(l) && T(l).length < 60).slice(0, 5).map(l => { const d = T(l.parentElement).replace(T(l), '').trim(); return [clip(T(l), 50), clip(d, 90), clean(l.href)]; });
    const site = T(ad.querySelector('span[class] > span, .x2VHCd, .OSrXXb')) || '';
    out.ads.push([clip(T(h), 90), clean(a.getAttribute('data-pcu') || a.href), clip(T(ad.querySelector('[role="text"], .x2VHCd')) || '', 70), clip(lines[0] || '', 220), clip(site, 40), links]);
  });
  /* AI Overview text and the sites it cited. */
  if (aiHead){
    let box = aiHead; for (let i = 0; i < 8 && box && T(box).length < 220; i++) box = box.parentElement;
    if (box){
      const refs = []; box.querySelectorAll('a[href^="http"]').forEach(a => { const u = clean(a.href); if (!u || isG(u) || refs.some(r => r[1] === u) || refs.length >= 8) return; const t = a.getAttribute('aria-label') || T(a); refs.push([clip(t, 80), u, clip(new URL(u).hostname.replace(/^www\./, ''), 40)]); });
      /* The answer only: source cards, buttons and icons are taken out of a
         copy before its text is read, so card titles don't pile into it. */
      const cl = box.cloneNode(true);
      cl.querySelectorAll('button, [role="button"], svg, img, style, script, [aria-hidden="true"]').forEach(n => n.remove());
      cl.querySelectorAll('a').forEach(n => { if (T(n).length > 45 || n.querySelector('div')) n.remove(); });
      const hold = document.createElement('div'); hold.style.cssText = 'position:fixed;left:-10000px;top:0;width:680px;'; hold.appendChild(cl); document.body.appendChild(hold);
      let txt = (cl.innerText || '').replace(/(^|\s)(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\s*\+\s*\d+(?=\s|$)/gim, '$1').replace(/^AI Overview\s*/i, '').replace(/\n(Show (more|less|all)|Dive deeper in AI Mode|AI responses may include mistakes\.?.*|Learn more)$/gim, '').replace(/\n{3,}/g, '\n\n').trim();
      hold.remove();
      out.ai = {t: clip(txt, 3200), r: refs, a: 1};
    }
  }
  /* Map pack: each place has a heading and usually a Directions button. */
  const seenPl = new Set();
  [...document.querySelectorAll('a, div[role="button"], span')].filter(e => /^Directions$/.test(T(e))).forEach(d => {
    let it = d; for (let i = 0; i < 8 && it && !it.querySelector('[role="heading"]'); i++) it = it.parentElement;
    const hd = it && it.querySelector('[role="heading"]'); if (!hd || seenPl.has(T(hd)) || out.pack.length >= 3) return; seenPl.add(T(hd));
    const web = [...it.querySelectorAll('a[href^="http"]')].find(a => /^Website$/.test(T(a)) || (!isG(a.href) && !/maps/.test(a.href)));
    const txt = T(it).replace(T(hd), '').replace(/Website|Directions/g, '').trim();
    const rm = /(\d\.\d)\s*\(([\d.,]+K?)\)/.exec(txt);
    const cidEl = it.querySelector('[data-cid]') || it.closest('[data-cid]');
    out.pack.push({title: clip(T(hd).replace(/\s*(My Ad Center)\s*/gi, ' ').trim() + (/My Ad Center|Sponsored/i.test(T(it)) ? ' Sponsored' : ''), 70), url: web ? clean(web.href) : '', desc: clip(txt.replace(rm ? rm[0] : '', '').replace(/\s*·\s*/g, ' · ').replace(/^[·\s]+/, ''), 140), rating: rm ? parseFloat(rm[1]) : null, votes: rm ? Math.round(parseFloat(rm[2].replace(/,/g, '')) * (/K/.test(rm[2]) ? 1000 : 1)) : null, cid: cidEl ? cidEl.getAttribute('data-cid') : ''});
  });
  /* Website results, in page order: a title heading inside a link to a site. */
  const seen = new Set(); let order = 0;
  document.querySelectorAll('#rso a h3, #rso h3 a, #botstuff a h3').forEach(h3 => {
    const a = h3.closest('a') || h3.querySelector('a'); if (!a) return;
    if (inside(h3, '#tads, #bottomads, [data-text-ad], g-section-with-header, [jsname="N760b"]') || (aiHead && aiHead.parentElement && inside(h3, '[data-hveid]') && h3.closest('[data-hveid]').contains(aiHead))) return;
    /* Google now links results through an opaque /goto token, so when the
       link itself is Google's, read the site from the address line under
       the title instead. */
    const card0 = h3.closest('.MjjYud, .g, [data-hveid]') || a.parentElement; let u = clean(a.href);
    if (isG(u)) { const ct = T(card0 && card0.querySelector('cite')); const m = /^((?:https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,})(.*)$/i.exec(ct); if (m) { const segs = m[2].split('\u203a').map(x => x.trim()).filter(x => x && x !== '...'); u = (/^https?:/.test(m[1]) ? m[1] : 'https://' + m[1]) + (segs.length ? '/' + segs.join('/') : ''); } }
    if (!u || isG(u) || seen.has(u)) return;
    if (h3.closest('[data-q], .related-question-pair')) return;
    seen.add(u);
    const card = h3.closest('.MjjYud, .g, [data-hveid]') || a.parentElement;
    const cite = card.querySelector('cite');
    const siteEl = card.querySelector('.VuuXrf') || (cite && cite.parentElement && cite.parentElement.previousElementSibling);
    const sn = card.querySelector('.VwiC3b, [data-sncf], .ITZIwc') || [...card.querySelectorAll('div,span')].filter(e => !e.contains(h3) && T(e).length > 60).sort((x, y) => T(y).length - T(x).length)[0];
    const hl = sn ? [...sn.querySelectorAll('em, b')].map(T).filter(Boolean).slice(0, 5) : [];
    let snip = T(sn), date = '';
    const dm = /^([A-Z][a-z]{2} \d{1,2}, \d{4}) — /.exec(snip); if (dm){ date = dm[1]; snip = snip.slice(dm[0].length); }
    const links = [...card.querySelectorAll('a[href^="http"]')].filter(l => l !== a && !l.querySelector('h3') && T(l) && T(l).length < 40 && !isG(l.href)).slice(0, 4).map(l => [clip(T(l), 40), clean(l.href)]);
    out.organic.push({pos: ++order, title: clip(T(h3), 90), url: u, snippet: clip(snip, 170), site: clip(T(siteEl), 40), crumb: clip(T(cite), 90), hl, date, links});
  });
  const query = (new URLSearchParams(location.search).get('q') || '').trim().toLowerCase();
  document.querySelectorAll('[data-q]').forEach(q => { const t = q.getAttribute('data-q'); if (t && t.trim().toLowerCase() !== query && out.paa.length < 4 && out.paa.indexOf(t) < 0) out.paa.push(clip(t, 90)); });
  const relHead = headOf('People also search for') || headOf('Related searches');
  if (relHead){ let box = relHead; for (let i = 0; i < 6 && box && box.querySelectorAll('a[href*="/search"]').length < 3; i++) box = box.parentElement; if (box) box.querySelectorAll('a[href*="/search"]').forEach(a => { const t = T(a); if (t && t.length < 80 && out.rel.length < 8 && out.rel.indexOf(t) < 0) out.rel.push(t); }); }
  const tabs = document.querySelector('[role="navigation"], #hdtb');
  document.querySelectorAll('g-scrolling-carousel a, [data-hveid] > div > a[aria-pressed]').forEach(a => { const t = T(a); if (t && t.length < 30 && out.chips.length < 5 && !(tabs && tabs.contains(a)) && out.chips.indexOf(t) < 0 && /^(Open now|Top rated|Online appointments|Price|Rating|Hours|[A-Z][a-z]+( [a-z]+)?)$/.test(t)) out.chips.push(t); });
  out.next = !!document.querySelector('#pnnext, a[aria-label="Next page"]');
  const pageNo = Math.floor((parseInt(new URLSearchParams(location.search).get('start') || '0', 10) || 0) / 10) + 1;
  let acc = null; try{ acc = JSON.parse(sessionStorage.getItem('edgeAcc') || 'null'); }catch(e){}
  if (pageNo === 1 || !acc || acc.q !== query){ acc = {q: query, organic: [], pack: out.pack, paa: out.paa, rel: out.rel, ads: out.ads, chips: out.chips, ai: out.ai || null, pages: 0}; }
  const base = acc.organic.length;
  out.organic.forEach(o => { if (!acc.organic.some(x => x.url === o.url)) acc.organic.push(Object.assign({}, o, {pos: base + o.pos, page: pageNo})); });
  acc.organic.forEach((o, i) => { o.pos = i + 1; });
  if (!acc.rel.length && out.rel.length) acc.rel = out.rel;
  acc.pages = pageNo; acc.exhausted = !out.next;
  try{ sessionStorage.setItem('edgeAcc', JSON.stringify(acc)); }catch(e){}
  const dom = String(site || '').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
  const hit = dom ? acc.organic.find(o => { try{ const h = new URL(o.url).hostname.replace(/^www\./, ''); return h === dom || h.endsWith('.' + dom); }catch(e){ return false; } }) : null;
  const inPack = dom ? acc.pack.findIndex(p => { try{ return p.url && new URL(p.url).hostname.replace(/^www\./, '').endsWith(dom); }catch(e){ return false; } }) + 1 : 0;
  return {page: pageNo, onPage: out.organic.length, total: acc.organic.length, found: hit ? hit.pos : 0, mapPack: inPack, next: out.next, ai: !!acc.ai, ads: acc.ads.length};
})(SITE)
