/* Reads the result list of one Google Maps search, as Claude sees it in Chrome,
   in the shape EDGE_gbpRecord expects: {organic:[...], ads:[...]}.
   Scrolls the list until DEPTH places are loaded or Google says the list has
   ended. Sponsored places are kept apart and never counted as a position.
   Each place keeps its CID and place id (taken from its Maps link), so the
   tool can match the profile exactly rather than by name. */
(async (DEPTH) => {
  const T = e => (e && (e.innerText || e.textContent) || '').replace(/\s+/g, ' ').trim();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  if (location.pathname.startsWith('/sorry') || document.querySelector('#captcha-form, form[action*="sorry"]') || /unusual traffic/i.test(T(document.body).slice(0, 3000))) return {blocked: true};
  let feed = null;
  for (let i = 0; i < 30 && !(feed = document.querySelector('div[role="feed"]')); i++) await sleep(400);
  const cardsOf = () => feed ? [...feed.querySelectorAll('a.hfpxzc, a[href*="/maps/place/"]')].filter((a, i, all) => a.getAttribute('aria-label') && all.findIndex(b => b.href === a.href) === i) : [];
  /* A search that lands straight on one place has no list: that place is the only result. */
  if (!feed){
    const h = document.querySelector('h1');
    if (h && T(h)) return {organic: [{title: T(h)}], ads: [], single: true};
    return {organic: [], ads: [], empty: true};
  }
  const ended = () => /reached the end of the list|You've reached the end/i.test(T(feed).slice(-400));
  for (let i = 0; i < 25 && cardsOf().length < DEPTH + 3 && !ended(); i++){
    feed.scrollTop = feed.scrollHeight;
    await sleep(900 + Math.random() * 500);
  }
  const organic = [], ads = [];
  cardsOf().forEach(a => {
    const box = a.parentElement || a;
    const txt = T(box);
    const href = a.getAttribute('href') || '';
    const hx = /!1s0x[0-9a-f]+:0x([0-9a-f]+)/i.exec(href);
    let cid = null; try{ if (hx) cid = BigInt('0x' + hx[1]).toString(); }catch(e){}
    const pid = /!19s(ChIJ[^!?&]+)/.exec(href);
    const rt = box.querySelector('span[role="img"][aria-label]');
    const rm = rt ? /([\d.]+)\s*stars?\s*([\d,]+)?/i.exec(rt.getAttribute('aria-label')) : null;
    const web = box.querySelector('a[data-value="Website"], a[aria-label^="Visit"]');
    const ph = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/.exec(txt);
    const lines = [...box.querySelectorAll('.W4Efsd, .W4Efsd > span')].map(T).filter(Boolean);
    const meta = (lines.find(l => /·/.test(l) && !/stars?|reviews?/i.test(l)) || '').split('·').map(x => x.trim()).filter(Boolean);
    const item = {title: a.getAttribute('aria-label').trim(), cid, placeId: pid ? decodeURIComponent(pid[1]) : null,
      rating: rm ? parseFloat(rm[1]) : null, reviews: rm && rm[2] ? parseInt(rm[2].replace(/,/g, ''), 10) : null,
      website: web ? (() => { try{ const u = new URL(web.href); return u.origin + u.pathname; }catch(e){ return null; } })() : null,
      phone: ph ? ph[0] : null, category: meta[0] || null, address: meta.slice(1).join(' · ') || null};
    if (/\bSponsored\b/.test(txt)) ads.push(item); else organic.push(item);
  });
  return {organic: organic.slice(0, Math.max(DEPTH, 20)), ads: ads.slice(0, 10), ended: ended()};
})(DEPTH)
